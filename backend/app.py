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
            host="localhost", user="root", password="Shirish@30", database="bbvs"
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
    yolo = YOLO("C:\\Users\\Shirish Shetty\\OneDrive\\Desktop\\Hand gestures\\Hand-Gesture-Voting\\weights\\best.pt")
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
            password="Shirish@30",
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

# Home route
@app.route("/")
def index():
    return render_template("indexs.html")

# Run the app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
