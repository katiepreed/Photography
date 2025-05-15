"""
Gemini 2.0 Flash Integration for Enhanced Image Captioning and Semantic Search
This module provides functions to:
1. Generate detailed image captions using Google's Gemini 2.0 Flash model (free tier)
2. Use these captions for semantic search with vector embeddings
"""

from flask import Flask, request, jsonify
import google.generativeai as genai
from PIL import Image
import io
import os
import base64

# Import your existing semantic search functionality
from semantic_search import get_embedding, semantic_similarity

# Configure the Gemini API with your key
# You should store this in an environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

def setup_gemini_model():
    """Initialize the Gemini 2.0 Flash model for image captioning"""
    # Using the 2.0 Flash model which has good image capabilities with higher free tier limits
    return genai.GenerativeModel('gemini-2.0-flash')

def generate_gemini_caption(image, prompt=None):
    """
    Generate a detailed caption for an image using Gemini 2.0 Flash
    
    Args:
        image (PIL.Image): The image to caption
        prompt (str, optional): Custom prompt to guide caption generation
        
    Returns:
        str: Detailed caption of the image
    """
    model = setup_gemini_model()
    
    # Default prompt for captioning
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
    
    try:
        # Prepare the image for Gemini
        # Convert PIL image to bytes for Gemini API
        image_bytes = io.BytesIO()
        image.save(image_bytes, format='JPEG')
        image_bytes.seek(0)
        image_data = image_bytes.getvalue()
        
        # Generate the content with Gemini
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        
        return response.text
    except Exception as e:
        print(f"Error generating Gemini caption: {e}")
        # Return a simple error message that can be handled
        return f"Error generating caption: {str(e)}"

def integrate_with_flask_app(app):
    """
    Add Gemini captioning and semantic search routes to a Flask app
    
    Args:
        app: Flask application instance
    """
    @app.route("/gemini-caption", methods=["POST"])
    def gemini_caption_route():
        # Check if image is provided
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400
            
        file = request.files["image"]
        image = Image.open(file.stream).convert("RGB")
        
        # Get custom prompt if provided in request
        prompt = request.form.get("prompt", None)
        
        # Generate caption using Gemini 2.0 Flash
        caption = generate_gemini_caption(image, prompt)
        
        # Check if caption generation failed
        if caption.startswith("Error generating caption"):
            return jsonify({"error": caption}), 500
        
        return jsonify({
            "caption": caption
        })
    
    @app.route("/semantic-search-with-gemini", methods=["POST"])
    def semantic_search_route():
        """Perform semantic search using Gemini-generated captions"""
        data = request.json
        query = data.get("query", "")
        
        if not query:
            return jsonify({"error": "No search query provided"}), 400
        
        # Get query embedding using your existing function
        query_embedding = get_embedding(query)
        
        try:
            # Get images from your Node.js server
            import requests
            response = requests.get("http://localhost:5002/images")
            if response.status_code != 200:
                return jsonify({"error": "Failed to fetch images"}), 500
            
            images = response.json()["images"]
            
            # Calculate similarity and rank images
            results = []
            for img in images:
                # Prefer Gemini captions if available, otherwise use BLIP
                caption = img.get("gemini_caption") or img.get("caption")
                
                if caption:
                    caption_embedding = get_embedding(caption)
                    similarity = semantic_similarity(query_embedding, caption_embedding)
                    results.append({
                        "id": img["id"],
                        "filename": img["filename"],
                        "caption": caption,
                        "similarity": float(similarity)
                    })
            
            # Sort by similarity (highest first)
            results.sort(key=lambda x: x["similarity"], reverse=True)
            
            # Filter to results with reasonable similarity
            filtered_results = [img for img in results if img["similarity"] > 0.3]
            
            return jsonify({"results": filtered_results})
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# Example usage:
# from gemini_integration import integrate_with_flask_app
# integrate_with_flask_app(app)