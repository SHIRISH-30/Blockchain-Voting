from flask import Flask, render_template, request, jsonify
import os
from ultralytics import YOLO
from PIL import Image
import base64
from io import BytesIO

app = Flask(__name__)

# Ensure 'uploads' directory exists
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('indexs.html')

@app.route('/capture', methods=['POST'])
def capture_image():
    data = request.json.get('image')
    
    if not data:
        return jsonify({"message": "No image data received"}), 400

    # Decode base64 image and save it to uploads folder
    image_data = base64.b64decode(data.split(',')[1])
    image_path = os.path.join(UPLOAD_FOLDER, 'captured_image.jpg')
    
    with open(image_path, "wb") as img_file:
        img_file.write(image_data)

    return jsonify({"message": "Image captured successfully", "file_path": image_path})

@app.route('/detect', methods=['POST'])
def detect_gesture():
    image_path = os.path.join(UPLOAD_FOLDER, 'captured_image.jpg')

    if not os.path.exists(image_path):
        return jsonify({"message": "No captured image found. Capture an image first."}), 400

    # Load YOLO model and detect gestures
    yolo = YOLO("C:\\Users\\Shirish Shetty\\OneDrive\\Desktop\\Hand gestures\\Hand-Gesture-Voting\\weights\\best.pt")
    results = yolo.predict(image_path, save=True, show=False)

    # Define class labels mapping
    class_labels = {0: "One", 1: "Two", 2: "Three"}

    # Extract detected labels
    detected_label = 0

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])  # Get class ID
            label = class_labels.get(class_id, "Unknown")  # Map to label name
            detected_label = label
    print(detected_label)

    num = sum(len(r.boxes.conf) for r in results)
    print(f"Detected hand gestures: {num}")

    if num == 0:
        return jsonify({"message": "No hand gesture detected. Try again.", "image": None})

    # Get latest processed image from YOLO's output folder
    folder_path = "runs/detect"
    file_list = sorted(
        [file for file in os.listdir(folder_path) if os.path.isdir(os.path.join(folder_path, file))], 
        key=lambda x: os.path.getctime(os.path.join(folder_path, x)), 
        reverse=True
    )

    if file_list:
        latest_file_path = os.path.join(folder_path, file_list[0])
        jpg_files = [os.path.join(latest_file_path, entry) for entry in os.listdir(latest_file_path) if entry.lower().endswith(".jpg")]

        if jpg_files:
            with open(jpg_files[0], "rb") as img_file:
                img_base64 = base64.b64encode(img_file.read()).decode('utf-8')

            return jsonify({"message": f"Detected {num} gesture(s).", "image": img_base64, "label" : detected_label})

    return jsonify({"message": "Error processing the image."})

if __name__ == '__main__':
    app.run(debug=True)
