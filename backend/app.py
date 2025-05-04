from flask import Flask, request, jsonify
from transformers import BlipProcessor, BlipForConditionalGeneration
from transformers import DetrImageProcessor, DetrForObjectDetection
from PIL import Image
from flask_cors import CORS
import torch
import io

"""
# Import the semantic search functionality
from semantic_search import setup_semantic_search_route, get_embedding
"""

app = Flask(__name__)

# Configure CORS to allow requests from all origins
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Load image captioning model
processor_caption = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model_caption = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

# Load object detection model
processor_detection = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50", revision="no_timm")
model_detection = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50", revision="no_timm")

@app.route("/generate-caption", methods=["POST"])
def generate_caption():
    file = request.files["image"]
    image = Image.open(file.stream).convert("RGB")
    
    # generate caption for image 
    caption = generate_caption_for_image(image)

    # Detect if a person is in the image
    has_person = detect_person(image)
    
    return jsonify({
        "caption": caption,
        "has_person": has_person
    })

def generate_caption_for_image(image):
    # Generate caption
    inputs_caption = processor_caption(image, return_tensors="pt")
    out = model_caption.generate(**inputs_caption)
    return processor_caption.decode(out[0], skip_special_tokens=True)

def detect_person(image):
    # Process image for object detection
    inputs = processor_detection(images=image, return_tensors="pt")
    outputs = model_detection(**inputs)
    
    # Convert outputs to COCO API
    target_sizes = torch.tensor([image.size[::-1]])
    results = processor_detection.post_process_object_detection(
        outputs, target_sizes=target_sizes, threshold=0.7
    )[0]
    
    # DETR model uses COCO classes where 'person' is class 1
    for label in results["labels"]:
        if label == 1:  # 1 is the label for 'person' in COCO dataset
            return True
    
    return False

# Add semantic search route to our app
# setup_semantic_search_route(app)

if __name__ == "__main__":
    # Run Flask on port 5001
    app.run(debug=True, host='0.0.0.0', port=5001)