from flask import Flask, request, jsonify
from PIL import Image
from flask_cors import CORS
import io
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import chroma_db

app = Flask(__name__)

# Configure CORS to allow requests from all origins
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000"]}})

# Load model for semantic search
sentence_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Initialize the Gemini 2.0 Flash model for the best free tier performance
gemini_model = genai.GenerativeModel('gemini-2.0-flash')

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyDXt_YIMOB5oC3jv4KgkBZYVYFY4-nqidc"
genai.configure(api_key=GEMINI_API_KEY)

"""
Generate a detailed caption for an image using Google's Gemini 2.0 Flash model.

Args:
   
- image (PIL.Image): The input image to caption
- prompt (str, optional): Custom prompt to guide caption generation - If None, uses a default comprehensive prompt

Returns: Generated caption text describing the image
"""
def generate_gemini_caption(image, prompt=None):
    
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
    response = gemini_model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data} ])
    
    return response.text

"""
API endpoint to generate a caption for an uploaded image.

Expects:

- Form data with 'image' file
- Optional 'prompt' parameter to customize caption generation

Returns: JSON response with the generated caption
"""
@app.route("/generate-caption", methods=["POST"])
def generate_caption():
    file = request.files["image"]
    image = Image.open(file.stream).convert("RGB")
    
    # Get custom prompt if provided
    prompt = request.form.get("prompt")
    
    # Generate detailed caption using Gemini
    caption = generate_gemini_caption(image, prompt)
    
    return jsonify({ "caption": caption})

"""
API endpoint to save a caption embedding to ChromaDB for future search.

Expects JSON data with:

- image_id: Unique identifier for the image
- caption: Generated or user-provided caption text
- filename: Original image filename
- dominant_color: Main color of the image (optional)
- color_palette: Color palette extracted from image (optional)

Returns: JSON confirmation of successful storage
"""
@app.route("/save-embedding", methods=["POST"])
def save_embedding():
    data = request.json
    image_id = data.get("image_id")
    caption = data.get("caption")
    filename = data.get("filename") 

    # Generate the embedding for the caption
    embedding = sentence_model.encode(caption)

    chroma_db.add_caption_embedding(image_id, caption, embedding, filename)

    return jsonify({"success": True, "message": f"Embedding saved for image ID: {image_id}"})

"""
API endpoint for semantic search of stored images based on text query.

Expects JSON data with:
    - query: Text description to search for similar images

Returns:

- JSON with array of matching results, ordered by similarity
- Each result includes the image ID, caption, and metadata
    
Note:
    - Returns up to 20 most relevant results
    - Uses similarity threshold of 0.3 (higher is more strict)
"""
@app.route("/semantic-search", methods=["POST"])
def semantic_search():
    data = request.json
    query = data.get("query", "")

    query_embedding = sentence_model.encode(query)

    # Search chromaDB using the embedding
    results = chroma_db.search_by_embedding(query_embedding, top_k=20, threshold=0.3)
    
    return jsonify({"results": results})


if __name__ == "__main__":
    # Run Flask on port 5001
    app.run(debug=True, host='0.0.0.0', port=5001)