from flask import Flask, request, jsonify
from PIL import Image
from flask_cors import CORS
import io
import google.generativeai as genai
import numpy as np
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F
import requests
import os

app = Flask(__name__)

# Configure CORS to allow requests from all origins
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Load model for semantic search
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyDXt_YIMOB5oC3jv4KgkBZYVYFY4-nqidc"

def setup_gemini_model():
    """Initialize the Gemini 2.0 Flash model for the best free tier performance"""
    return genai.GenerativeModel('gemini-2.0-flash')

@app.route("/generate-caption", methods=["POST"])
def generate_caption():
    """Generate a detailed caption using Gemini 2.0 Flash"""
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured"}), 500
        
    # Check if an image was provided
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files["image"]
    image = Image.open(file.stream).convert("RGB")
    
    # Get custom prompt if provided
    prompt = request.form.get("prompt")
    
    # Generate detailed caption using Gemini
    caption = generate_gemini_caption(image, prompt)
    
    # Check if caption generation was successful
    if caption.startswith("Error generating caption"):
        return jsonify({"error": caption}), 500
    
    return jsonify({
        "caption": caption
    })

def generate_gemini_caption(image, prompt=None):
    """Generate detailed caption using Gemini 2.0 Flash"""
    try:
        model = setup_gemini_model()
        
        # Default prompt for captioning if none provided
        if not prompt:
            prompt = """
            Generate a detailed descriptive caption for this image. 
            Include information about:
            - Main subjects and their attributes (colors, actions, positions)
            - Background elements and setting
            - Mood or atmosphere of the image
            - Any notable objects or features
            Provide a comprehensive description in 2-3 sentences.
            """
        
        # Convert PIL image to format Gemini expects
        image_bytes = io.BytesIO()
        image.save(image_bytes, format='JPEG')
        image_bytes.seek(0)
        image_data = image_bytes.getvalue()
        
        # Generate caption with Gemini
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        
        return response.text
    except Exception as e:
        print(f"Error generating Gemini caption: {e}")
        return f"Error generating caption: {str(e)}"

def mean_pooling(model_output, attention_mask):
    """Mean pooling to get sentence embeddings"""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def get_embedding(text):
    """Get embedding for a text using sentence-transformers model"""
    encoded_input = tokenizer(text, padding=True, truncation=True, return_tensors='pt')
    with torch.no_grad():
        model_output = model(**encoded_input)
    
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    return F.normalize(sentence_embeddings, p=2, dim=1).numpy()[0]

def semantic_similarity(query_embedding, text_embedding):
    """Calculate cosine similarity between two embeddings"""
    return np.dot(query_embedding, text_embedding)

# This route should be added to your existing Flask app

@app.route("/semantic-search", methods=["POST"])
def semantic_search():
    data = request.json
    query = data.get("query", "")
    
    if not query:
        return jsonify({"error": "No search query provided"}), 400
    
    # Get query embedding
    query_embedding = get_embedding(query)
    
    try:
        # Get images from your Node.js server
        response = requests.get("http://localhost:5002/images")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch images"}), 500
        
        images = response.json()["images"]
        
        # Calculate similarity and rank images
        results = []
        for img in images:
            if img["caption"]:
                caption_embedding = get_embedding(img["caption"])
                similarity = semantic_similarity(query_embedding, caption_embedding)
                results.append({
                    "id": img["id"],
                    "filename": img["filename"],
                    "caption": img["caption"],
                    "similarity": float(similarity)
                })
        
        # Sort by similarity (highest first)
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Filter to results with reasonable similarity (threshold can be adjusted)
        filtered_results = [img for img in results if img["similarity"] > 0.3]
        
        return jsonify({"results": filtered_results})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run Flask on port 5001
    app.run(debug=True, host='0.0.0.0', port=5001)