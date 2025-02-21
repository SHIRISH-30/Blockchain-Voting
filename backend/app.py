import cv2
import os
import mysql.connector
from flask import Flask, jsonify, request
from deepface import DeepFace
import speech_recognition as sr
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "http://localhost:3000"}})

#  Fetch user image from MySQL database # SQL se lee 
def get_user_image(user_id):
    try:
        conn = mysql.connector.connect(host="localhost", user="root", password="Shirish@30", database="bbvs")
        cursor = conn.cursor()
        query = "SELECT image FROM user WHERE id = %s"
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        conn.close()

        if result:
            image_data = result[0]
            image_path = f"temp_images/{user_id}_image.jpg"
            os.makedirs("temp_images", exist_ok=True)  # Create directory if not exists
            with open(image_path, 'wb') as file:
                file.write(image_data)
            return image_path
        else:
            return None
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return None

#  Face recognition API   BHUT MEHNAT LAG GAYI HAHA
@app.route('/start-face-recognition', methods=['POST'])
def start_face_recognition():
    user_id = request.json.get("userId")
    print(f"📸 Starting face recognition for User ID: {user_id}")

    reference_img_path = get_user_image(user_id)
    if not reference_img_path:
        return jsonify({"error": "No reference image found"}), 404

    # ✅ Open Camera Instantly   //GPT LOGIC 
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Failed to access camera"}), 500

    time.sleep(2)  # Warm-up time for camera initialization
    reference_img = cv2.imread(reference_img_path)
    face_match = False
    #masterpeice by me
    def check_face(frame):
        nonlocal face_match
        try:
            result = DeepFace.verify(frame, reference_img.copy())['verified']
            if result:
                face_match = True
        except ValueError:
            pass

    counter = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if counter % 10 == 0:
            check_face(frame.copy())
        if face_match:
            break
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        counter += 1

    cap.release()
    cv2.destroyAllWindows()
    return jsonify({"verified": face_match}), 200 if face_match else 401

# ✅ Speech recognition API
@app.route('/start-recording', methods=['GET'])
def start_recording():
    recognizer = sr.Recognizer()
    
    # List available microphones
    print("Available Microphones:", sr.Microphone.list_microphone_names())

    with sr.Microphone() as source:
        print("\n🎙️ Adjusting for background noise... Please wait...")
        recognizer.adjust_for_ambient_noise(source, duration=2)  # Reduce noise
        print("✅ Ready! Speak now...")

        try:
            audio_data = recognizer.listen(source, timeout=5, phrase_time_limit=3)  # Limit capture time
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

# ✅ Dummy endpoint for disabled person detection
@app.route('/detect', methods=['GET'])
def detect_disabled_person():
    print("🦽 Disabled person detected")  # Log the detection
    return jsonify({"message": "Disabled person detected"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
