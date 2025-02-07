from flask import Flask, jsonify
import speech_recognition as sr
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "http://localhost:3000"}})

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

@app.route('/detect', methods=['GET'])
def detect_disabled_person():
    print("🦽 Disabled person detected")  # Log the detection
    return jsonify({"message": "Disabled person detected"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
