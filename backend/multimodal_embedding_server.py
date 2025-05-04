from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import numpy as np
import requests
from PIL import Image
import io
from transformers import CLIPProcessor, CLIPModel
import sqlite3

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Load CLIP model - this model can embed both images and text in the same vector space
model_name = "openai/clip-vit-base-patch32"
processor = CLIPProcessor.from_pretrained(model_name)
model = CLIPModel.from_pretrained(model_name)

def get_text_embedding(text):
    """Get embedding for text using CLIP"""
    inputs = processor(text=text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        text_features = model.get_text_features(**inputs)
    
    # Normalize the features
    text_embedding = text_features / text_features.norm(dim=1, keepdim=True)
    return text_embedding.numpy()[0]

def get_image_embedding(image):
    """Get embedding for image using CLIP"""
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        image_features = model.get_image_features(**inputs)
    
    # Normalize the features
    image_embedding = image_features / image_features.norm(dim=1, keepdim=True)
    return image_embedding.numpy()[0]

def semantic_similarity(embedding1, embedding2):
    """Calculate cosine similarity between two embeddings"""
    return np.dot(embedding1, embedding2)

def setup_db():
    """Set up a database to store image embeddings"""
    conn = sqlite3.connect('image_embeddings.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS image_embeddings (
        image_id INTEGER PRIMARY KEY,
        embedding BLOB,
        filename TEXT,
        FOREIGN KEY (image_id) REFERENCES images(id)
    )
    ''')
    conn.commit()
    conn.close()

@app.route("/embeddings-status", methods=["GET"])
def check_embeddings_status():
    """Check if embeddings have been generated for all images"""
    try:
        # Get all images from Node.js server
        response = requests.get("http://localhost:5002/images")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch images"}), 500
        
        images = response.json()["images"]
        
        # Connect to database
        conn = sqlite3.connect('image_embeddings.db')
        cursor = conn.cursor()
        
        # Count embeddings
        cursor.execute("SELECT COUNT(*) FROM image_embeddings")
        embedding_count = cursor.fetchone()[0]
        
        # Close connection
        conn.close()
        
        # Check if all images have embeddings
        initialized = embedding_count >= len(images)
        
        return jsonify({
            "initialized": initialized,
            "totalImages": len(images),
            "embeddingsGenerated": embedding_count
        })
    except Exception as e:
        return jsonify({"error": str(e), "initialized": False}), 500

@app.route("/generate-and-store-embedding", methods=["POST"])
def generate_and_store_embedding():
    """Generate embedding for an uploaded image and store it"""
    try:
        file = request.files["image"]
        image = Image.open(file.stream).convert("RGB")
        image_embedding = get_image_embedding(image)
        
        # Get the image_id from request (after saving to the main DB)
        image_id = request.form.get("image_id")
        filename = request.form.get("filename")
        
        # Store embedding in database
        conn = sqlite3.connect('image_embeddings.db')
        cursor = conn.cursor()
        # Store as binary blob
        embedding_bytes = image_embedding.tobytes()
        cursor.execute(
            "INSERT INTO image_embeddings (image_id, embedding, filename) VALUES (?, ?, ?)",
            (image_id, embedding_bytes, filename)
        )
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/multimodal-search", methods=["POST"])
def multimodal_search():
    """Search for images using text query"""
    data = request.json
    query = data.get("query", "")
    
    if not query:
        return jsonify({"error": "No search query provided"}), 400
    
    # Get query embedding
    query_embedding = get_text_embedding(query)
    
    try:
        # Get all image embeddings from database
        conn = sqlite3.connect('image_embeddings.db')
        cursor = conn.cursor()
        cursor.execute("SELECT image_id, embedding, filename FROM image_embeddings")
        embedding_rows = cursor.fetchall()
        conn.close()
        
        # Calculate similarity for each image
        results = []
        for image_id, embedding_bytes, filename in embedding_rows:
            # Convert bytes back to numpy array
            image_embedding = np.frombuffer(embedding_bytes, dtype=np.float32)
            
            similarity = semantic_similarity(query_embedding, image_embedding)
            
            # Add to results
            results.append({
                "id": image_id,
                "filename": filename,
                "similarity": float(similarity)
            })
        
        # For hybrid search, also get text-based results
        text_results = get_caption_based_results(query)
        
        # Combine results (you might want a more sophisticated merging strategy)
        all_results = results + text_results
        
        # Remove duplicates based on image_id
        unique_results = {}
        for result in all_results:
            if result["id"] not in unique_results or result["similarity"] > unique_results[result["id"]]["similarity"]:
                unique_results[result["id"]] = result
        
        final_results = list(unique_results.values())
        
        # Sort by similarity
        final_results.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Filter to results with reasonable similarity
        threshold = 0.2  # Lower threshold for multimodal search
        filtered_results = [img for img in final_results if img["similarity"] > threshold]
        
        return jsonify({"results": filtered_results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_caption_based_results(query):
    """Get search results based on captions (existing functionality)"""
    # This is your existing semantic search on captions
    try:
        # Get query embedding using your text model
        from semantic_search import get_embedding
        query_embedding = get_embedding(query).numpy()[0]
        
        # Get images from your Node.js server
        response = requests.get("http://localhost:5002/images")
        if response.status_code != 200:
            return []
        
        images = response.json()["images"]
        
        # Calculate similarity on captions
        results = []
        for img in images:
            if img["caption"]:
                caption_embedding = get_embedding(img["caption"]).numpy()[0]
                similarity = np.dot(query_embedding, caption_embedding)
                results.append({
                    "id": img["id"],
                    "filename": img["filename"],
                    "caption": img["caption"],
                    "similarity": float(similarity)
                })
        
        return results
    except Exception:
        # If there's an error, just return empty list
        return []

@app.route("/process-all-images", methods=["GET"])
def process_all_images():
    """Process all existing images in the database to generate embeddings"""
    try:
        # Get all images from Node.js server
        response = requests.get("http://localhost:5002/images")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch images"}), 500
        
        images = response.json()["images"]
        processed = 0
        
        # For each image, generate and store embedding
        for img in images:
            try:
                # Download image
                img_url = f"http://localhost:5002/uploads/{img['filename']}"
                img_response = requests.get(img_url)
                image = Image.open(io.BytesIO(img_response.content)).convert("RGB")
                
                # Generate embedding
                image_embedding = get_image_embedding(image)
                
                # Store in database
                conn = sqlite3.connect('image_embeddings.db')
                cursor = conn.cursor()
                embedding_bytes = image_embedding.tobytes()
                
                # Check if entry already exists
                cursor.execute("SELECT 1 FROM image_embeddings WHERE image_id = ?", (img["id"],))
                exists = cursor.fetchone()
                
                if exists:
                    cursor.execute(
                        "UPDATE image_embeddings SET embedding = ? WHERE image_id = ?",
                        (embedding_bytes, img["id"])
                    )
                else:
                    cursor.execute(
                        "INSERT INTO image_embeddings (image_id, embedding, filename) VALUES (?, ?, ?)",
                        (img["id"], embedding_bytes, img["filename"])
                    )
                
                conn.commit()
                conn.close()
                processed += 1
            except Exception as e:
                print(f"Error processing image {img['id']}: {str(e)}")
        
        return jsonify({"success": True, "processed": processed, "total": len(images)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Ensure database exists
    setup_db()
    # Run Flask on port 5003 (different from your other servers)
    app.run(debug=True, host='0.0.0.0', port=5003)