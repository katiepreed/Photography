from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F
import requests
import numpy as np
from flask_cors import CORS

# This file should be integrated with your existing app.py
# Import this in your app.py and add the new route
app = Flask(__name__)

# Configure CORS to allow requests from all origins
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Load model for semantic search
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

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
def setup_semantic_search_route(app):
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