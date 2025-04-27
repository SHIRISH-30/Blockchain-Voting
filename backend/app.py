import cv2
import os
import mysql.connector
from flask import Flask, jsonify, request, render_template
from deepface import DeepFace
import speech_recognition as sr
from flask_cors import CORS
import time
import base64
from ultralytics import YOLO
from flask_jwt_extended import JWTManager, create_access_token
from datetime import timedelta
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import smtplib
from PIL import Image, ImageDraw, ImageFont
import io
from reportlab.pdfgen import canvas
from io import BytesIO
import datetime
import uuid
from email.mime.application import MIMEApplication
from flask import Flask, request, jsonify 
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, Frame, Spacer
from reportlab.lib.enums import TA_CENTER
from scipy.spatial.distance import cosine

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)


# Configure JWT
app.config["JWT_SECRET_KEY"] = os.getenv("ACCESS_TOKEN_SECRET")  # Same as Node.js
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=10)  # 10-minute expiry
jwt = JWTManager(app)

# Configure CORS
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:3000"],  # Allow requests from React frontend
    methods=["GET", "POST", "PUT", "DELETE"],  # Allowed HTTP methods
    allow_headers=["Content-Type", "Authorization"],  # Allowed headers
)



# Folder to store captured images
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Function to retrieve user image from database
def get_user_image(user_id):
    try:
        conn = mysql.connector.connect(
            host="localhost", user="root", password="P@p310303", database="bbvs"
        )
        cursor = conn.cursor()
        query = "SELECT image FROM user WHERE id = %s"
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        conn.close()

        if result:
            image_data = result[0]
            image_path = f"temp_images/{user_id}_image.jpg"
            os.makedirs("temp_images", exist_ok=True)  # Create directory if not exists
            with open(image_path, "wb") as file:
                file.write(image_data)
            return image_path
        else:
            return None
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return None

# Face recognition API (using DeepFace)
@app.route("/start-face-recognition", methods=["POST"])
def start_face_recognition():
    user_id = request.json.get("userId")
    print(f"📸 Starting face recognition for User ID: {user_id}")

    # Retrieve stored reference image
    reference_img_path = get_user_image(user_id)
    if not reference_img_path:
        return jsonify({"error": "No reference image found"}), 404

    # Open camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Failed to access camera"}), 500

    time.sleep(2)  # Warm-up time for camera initialization
    reference_img = cv2.imread(reference_img_path)
    face_match = False

    # Function to check face match dynamically
    def check_face(frame):
        nonlocal face_match
        try:
            result = DeepFace.verify(
                frame, reference_img.copy(), model_name="Facenet", distance_metric="cosine"
            )

            # Using dynamic threshold based on distance for more security
            distance = result["distance"]
            threshold = max(0.25, min(0.6, distance * 1.2))

            print(f"🔍 Distance: {distance}, Adaptive Threshold: {threshold}")

            if result["verified"] and distance < threshold:
                print("✅ Face Matched!")
                face_match = True
        except ValueError:
            pass

    counter = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if counter % 10 == 0:
            check_face(frame.copy())  # Process every 10th frame
        if face_match:
            break
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
        counter += 1

    cap.release()
    cv2.destroyAllWindows()
    return jsonify({"verified": face_match}), 200 if face_match else 401

# Speech recognition API
@app.route("/start-recording", methods=["GET"])
def start_recording():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("\n🎙️ Adjusting for background noise... Please wait...")
        recognizer.adjust_for_ambient_noise(source, duration=2)
        print("✅ Ready! Speak now...")

        try:
            audio_data = recognizer.listen(source, timeout=5, phrase_time_limit=3)
            print("🎧 Captured audio, processing...")
        except sr.WaitTimeoutError:
            print("⏳ No speech detected, please try again.")
            return jsonify({"error": "No speech detected. Please try again."}), 400

    try:
        text = recognizer.recognize_google(audio_data).strip().lower()
        print(f"✅ Recognized speech: {text}")
        return jsonify({"text": text}), 200
    except sr.UnknownValueError:
        print("❌ Could not understand the audio. Asking user to try again.")
        return jsonify({"error": "Could not understand the audio. Please try again."}), 400
    except sr.RequestError:
        print("⚠️ Speech recognition service unavailable.")
        return jsonify({"error": "Speech recognition service unavailable."}), 500


# Capture image for hand gesture detection
@app.route("/capture", methods=["POST"])
def capture_image():
    data = request.json.get("image")
    if not data:
        return jsonify({"message": "No image data received"}), 400

    # Decode base64 image
    image_data = base64.b64decode(data.split(",")[1])
    image_path = os.path.join(UPLOAD_FOLDER, "captured_image.jpg")

    with open(image_path, "wb") as img_file:
        img_file.write(image_data)

    return jsonify({"message": "Image captured successfully"})

# Detect hand gesture
@app.route("/detect", methods=["POST"])
def detect_gesture():
    image_path = os.path.join(UPLOAD_FOLDER, "captured_image.jpg")
    if not os.path.exists(image_path):
        return jsonify({"message": "No captured image found. Capture an image first."}), 400

    # Load YOLO model and detect gestures
    yolo = YOLO("D:/MajorProjects/MJRPJR/runs/detect/train3/weights/best.pt")
    results = yolo.predict(image_path, save=True, show=False)

    # Define class labels mapping
    class_labels = {0: "One", 1: "Two", 2: "Three"}

    # Extract detected labels
    detected_label = "Unknown"
    detected_number = 0  # Default value if no gesture is detected

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])  # Get class ID
            detected_label = class_labels.get(class_id, "Unknown")  # Map to label name
            detected_number = class_id + 1  # Convert class ID to number (1, 2, 3)
            break  # Take first detection

    num = sum(len(r.boxes.conf) for r in results)
    print(f"Detected hand gestures: {num}")

    if num == 0:
        return jsonify({"message": "No hand gesture detected. Try again.", "number": 0})

    # Return the detected number (1, 2, or 3)
    return jsonify({
        "message": f"Detected {num} gesture(s).",
        "number": detected_number  # Sending only the detected number to React (e.g., for polls)
    })

# Face Login API
@app.route("/face-login", methods=["POST"])
def face_login():
    # Get image from request
    data = request.json
    if not data or "image" not in data:
        return jsonify({"error": "No image data received"}), 400

    try:
        # Decode base64 image
        image_data = base64.b64decode(data["image"].split(",")[1])
    except Exception as e:
        return jsonify({"error": "Invalid image data"}), 400

    # Save temporary image
    temp_dir = "temp_face_login"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, "captured.jpg")

    with open(temp_path, "wb") as f:
        f.write(image_data)

    # Load captured image
    try:
        captured_img = cv2.imread(temp_path)
        if captured_img is None:
            raise ValueError("Invalid image")
    except Exception as e:
        return jsonify({"error": "Failed to process image"}), 400

    # Get all users from database
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="P@p310303",
            database="bbvs"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT id, image, email, name, admin, is_blind, is_disabled FROM user")
        users = cursor.fetchall()
        conn.close()
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({"error": "Database error"}), 500

    # Compare with all users
    matched_user = None
    for user in users:
        user_id, user_image, email, name, admin, is_blind, is_disabled = user 

        # Skip users without images
        if not user_image:
            print(f"⚠️ Skipping user {user_id} - no image found")
            continue

        # Save user image to temp file
        user_temp_path = os.path.join(temp_dir, f"user_{user_id}.jpg")
        with open(user_temp_path, "wb") as f:
            f.write(user_image)

        # Verify face
        try:
            result = DeepFace.verify(
                captured_img,
                user_temp_path,
                model_name="Facenet",
                distance_metric="cosine",
                enforce_detection=False
            )

            if result["verified"]:
                matched_user = {
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "admin": admin,
                    "is_blind": is_blind,
                    "is_disabled": is_disabled
                }
                break
        except Exception as e:
            print(f"Verification error for user {user_id}: {str(e)}")
        finally:
            os.remove(user_temp_path)

    # Cleanup
    os.remove(temp_path)

    if not matched_user:
        return jsonify({"error": "No matching user found"}), 401

    # Create JWT token with the same claims as login.ts
    access_token = create_access_token(
        identity=matched_user,
        expires_delta=timedelta(minutes=10)  # 10-minute expiry
    )

    return jsonify({
        "user": matched_user,
        "accessToken": access_token
    }), 200

#Details route
from flask import Flask, request, jsonify
import mysql.connector

@app.route('/details', methods=['POST'])
def get_user_details():
    data = request.json
    user_id = data.get('id')
    name = data.get('name')

    if not user_id or not name:
        return jsonify({'error': 'Missing user ID or name'}), 400

    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="P@p310303",
            database="bbvs"
        )
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT id, name, citizenshipNumber, email, admin, verified, is_blind, is_disabled
            FROM user WHERE id = %s AND name = %s
        """
        cursor.execute(query, (user_id, name))
        user_details = cursor.fetchone()
        cursor.close()
        conn.close()

        if user_details:
            return jsonify({'user_details': user_details}), 200
        else:
            return jsonify({'error': 'User not found'}), 404

    except mysql.connector.Error as err:
        return jsonify({'error': f'Database error: {err}'}), 500


@app.route('/mail', methods=['POST'])
def send_certificate_email():
    try:
        user_id = request.json.get('id')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        # Database connection
        try:
            conn = mysql.connector.connect(
                host="localhost",
                user="root",
                password="P@p310303",
                database="bbvs"
            )
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT name, email FROM user WHERE id = %s", (user_id,))
            user = cursor.fetchone()
        except mysql.connector.Error as err:
            return jsonify({"error": f"Database error: {err}"}), 500
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Generate PDF certificate
        try:
            buffer = BytesIO()
            # Using landscape letter size (11×8.5 inches)
            width, height = landscape(letter)
            c = canvas.Canvas(buffer, pagesize=landscape(letter))
            
            # Set background color for entire page (very light blue)
            c.setFillColor(colors.Color(0.95, 0.98, 1.0))
            c.rect(0, 0, width, height, fill=1, stroke=0)
            
            # Primary border - thick dark blue 
            c.setStrokeColor(colors.Color(0.0, 0.11, 0.66))  # Navy blue
            c.setLineWidth(8)
            border_margin = 0.5*inch
            c.roundRect(border_margin, border_margin, 
                        width - 2*border_margin, height - 2*border_margin, 
                        0.2*inch, stroke=1, fill=0)
            
            # Secondary inner border - thin gold
            c.setStrokeColor(colors.Color(0.85, 0.65, 0.12))  # Gold
            c.setLineWidth(1)
            inner_margin = 0.7*inch
            c.roundRect(inner_margin, inner_margin, 
                        width - 2*inner_margin, height - 2*inner_margin, 
                        0.15*inch, stroke=1, fill=0)
            
            # Add certificate corners - decorative X marks
            c.setStrokeColor(colors.Color(0.0, 0.11, 0.66))  # Navy blue
            c.setLineWidth(1.5)
            corner_size = 0.25*inch
            
            # Top-left
            c.line(border_margin + 0.1*inch, height - border_margin - 0.1*inch, 
                   border_margin + corner_size, height - border_margin - corner_size)
            c.line(border_margin + 0.1*inch, height - border_margin - corner_size, 
                   border_margin + corner_size, height - border_margin - 0.1*inch)
            
            # Top-right
            c.line(width - border_margin - 0.1*inch, height - border_margin - 0.1*inch, 
                   width - border_margin - corner_size, height - border_margin - corner_size)
            c.line(width - border_margin - 0.1*inch, height - border_margin - corner_size, 
                   width - border_margin - corner_size, height - border_margin - 0.1*inch)
            
            # Bottom-left (omitted to avoid overdoing it)
            
            # Bottom-right (omitted to avoid overdoing it)
            
            # Header - CERTIFICATE OF PARTICIPATION
            c.setFillColor(colors.Color(0.0, 0.11, 0.66))  # Navy blue
            c.setFont("Helvetica-Bold", 38)
            c.drawCentredString(width/2, height - 2.3*inch, "CERTIFICATE OF PARTICIPATION")
            
            # Decorative line under header
            c.setStrokeColor(colors.Color(0.85, 0.65, 0.12))  # Gold
            c.setLineWidth(2)
            c.line(width/2 - 3.5*inch, height - 2.5*inch, width/2 + 3.5*inch, height - 2.5*inch)
            
            # Main content area - light blue rectangle
            content_top = height - 2.7*inch
            content_height = 4.2*inch
            content_width = 8*inch
            
            c.setFillColor(colors.Color(0.85, 0.93, 0.97))  # Light blue
            c.roundRect(width/2 - content_width/2, content_top - content_height, 
                       content_width, content_height, 0.1*inch, fill=1, stroke=0)
            
            # Add text content using formatted paragraphs
            styles = getSampleStyleSheet()
            
            # "This Certificate is Awarded To" text
            award_style = ParagraphStyle(
                'AwardStyle',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=18,
                alignment=TA_CENTER,
                textColor=colors.black,
                leading=22
            )
            
            # Name style
            name_style = ParagraphStyle(
                'NameStyle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=42,
                alignment=TA_CENTER,
                textColor=colors.Color(0.0, 0.11, 0.66),  # Navy blue
                leading=50
            )
            
            # Regular text style
            text_style = ParagraphStyle(
                'TextStyle',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=18,
                alignment=TA_CENTER,
                textColor=colors.black,
                leading=24
            )
            
            # Position text elements
            frame = Frame(
                width/2 - 3.5*inch,  # x
                content_top - content_height + 0.5*inch,  # y
                7*inch,  # width
                content_height - 1*inch,  # height
                showBoundary=0
            )
            
            content = [
                Paragraph("This Certificate is Awarded To", award_style),
                Spacer(1, 0.2*inch),
                Paragraph(user['name'], name_style),
                Spacer(1, 0.3*inch),
                Paragraph("in recognition of your active participation in", text_style),
                Spacer(1, 0.1*inch),
                Paragraph("Our Voting Process", text_style),
                Spacer(1, 0.3*inch),
                Paragraph(f"Date: {datetime.datetime.now().strftime('%B %d, %Y')}", text_style)
            ]
            
            frame.addFromList(content, c)
            
            # Add verification ID at bottom
            cert_id = uuid.uuid4().hex[:8].upper()
            c.setFont("Helvetica-Oblique", 14)
            c.setFillColor(colors.Color(0.0, 0.11, 0.66))  # Navy blue
            c.drawCentredString(width/2, 1.2*inch, f"Verified Certificate ID: {cert_id}")
            
            c.save()
            buffer.seek(0)
        except Exception as e:
            app.logger.error(f"PDF generation error: {str(e)}")
            return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500

        # Send email with certificate
        try:
            msg = MIMEMultipart()
            msg['From'] = os.getenv("EMAIL_ADDRESS")
            msg['To'] = user['email']
            msg['Subject'] = "Your Voting Participation Certificate"
            
            body = f"""<html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #001aad; margin-bottom: 5px;">Your Certificate of Participation</h1>
                        <div style="border-bottom: 2px solid #daa520; width: 100px; margin: 0 auto;"></div>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Dear <strong>{user['name']}</strong>,</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Thank you for participating in our democratic voting process. 
                    Your engagement helps strengthen our community and ensures that every voice is heard.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Attached to this email is your official Certificate of Participation 
                    as recognition of your civic responsibility.</p>
                    
                    <div style="background-color: #f5f8fa; border-left: 4px solid #001aad; padding: 15px; margin: 25px 0;">
                        <p style="color: #555; font-style: italic; margin: 0;">
                        "The vote is the most powerful instrument ever devised by man for breaking down injustice and 
                        destroying the terrible walls which imprison men because they are different from other men."
                        </p>
                        <p style="color: #001aad; margin: 10px 0 0; text-align: right;">- Lyndon B. Johnson</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Thank you for being an active participant in our democracy.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Best regards,<br>
                    <strong>The Electoral Committee</strong></p>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>Certificate ID: <span style="font-family: monospace;">{cert_id}</span></p>
                    </div>
                </body>
            </html>"""
            
            msg.attach(MIMEText(body, 'html'))
            
            # Attach the PDF
            pdf = MIMEApplication(buffer.read(), _subtype='pdf')
            pdf.add_header('Content-Disposition', 'attachment', 
                          filename=f"Voting_Certificate_{user['name'].replace(' ', '_')}.pdf")
            msg.attach(pdf)
            
            # Send email
            with smtplib.SMTP(os.getenv("SMTP_SERVER"), os.getenv("SMTP_PORT")) as server:
                server.starttls()
                server.login(os.getenv("EMAIL_ADDRESS"), os.getenv("EMAIL_PASSWORD"))
                server.sendmail(
                    os.getenv("EMAIL_ADDRESS"),
                    user['email'],
                    msg.as_string()
                )
            
            return jsonify({
                "message": "Certificate sent successfully",
                "certificate_id": cert_id
            }), 200
        
        except Exception as e:
            app.logger.error(f"Email sending error: {str(e)}")
            return jsonify({"error": f"Email failed: {str(e)}"}), 500

    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# Home route
@app.route("/")
def index():
    return render_template("indexs.html")

# Run the app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True,use_reloader=False)