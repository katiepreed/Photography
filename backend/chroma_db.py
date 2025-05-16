"""
ChromaDB Integration for Vector Storage of Image Captions. 
This module provides functions to store and query image caption embeddings using ChromaDB
"""

import chromadb
import numpy as np
import os 
from pathlib import Path 

# Set up the ChromsDB client with persistent storage 
CHROMA_DB_PATH = "./chroma_db_data"
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

# Initialise the ChromaDB client 
client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

"""Get or create a collection"""
def get_or_create_collection(collection_name, metadata):
    # get existing collection
    try:
        collection = client.get_collection(name=collection_name)
    # create new collection if it doesn't exist 
    except:
        collection = client.create_collection(name=collection_name, metadata=metadata) 

    return collection

"""Get statistics about the collection"""
def get_collection_stats():
    collection_name = "image_captions"

    collection = get_or_create_collection(collection_name, {"hnsw:space":"cosine"}) # Use consine similarity 

    return {"count": collection.count(), "name": collection_name}

"""
Add a caption embedding to the ChromaDB collection

Arguments:

- image_id (int): image ID from SQLite database
- caption (str): image caption
- embedding (np.ndarray): vector embedding of caption
"""
def add_caption_embedding(image_id, caption, embedding, filename):

    collection = get_or_create_collection("image_captions", {"hnsw:space":"cosine"}) # Use consine similarity 

    metadata = {
        "caption": caption,
        "filename": filename,
    }

    # add or update the embedding in ChromaDB
    # convert numpy array to list for chromaDB
    collection.upsert(ids=[str(image_id)], embeddings=[embedding.tolist()], metadatas=[metadata])

    return True 

"""
Search for similar captions using a query embedding. 

Arguments:

- query_embedding (np.ndarray): The query vector embedding
- top_k (int): Maximum number of results to return
- threshold (float): Minimum similarity threshold 

Returns: a list of results with image IDs and similarity scores 
"""
def search_by_embedding(query_embedding, top_k=10, threshold=0.3):
    collection = get_or_create_collection("image_captions", {"hnsw:space":"cosine"}) # Use consine similarity 

    # search the collection 
    results = collection.query(query_embeddings=[query_embedding.tolist()], n_results=top_k, include=["metadatas", "distances"])

    processed_results=[]

    # process and format the results 
    if results["ids"] and len(results["ids"][0]) > 0:
        for i, img_id in enumerate(results["ids"][0]):
            # calculate the similarity score: 1 - distance for cosine 
            similarity = 1 - results["distances"][0][i]

            # skip results that are below the threshold 
            if similarity < threshold:
                continue 

            # Extract only the caption from metadata
            metadata = results["metadatas"][0][i]
            caption = metadata.get("caption", "No caption available")
            filename = metadata.get("filename", "unknown.jpg")

            processed_results.append({
                "id": int(img_id),
                "caption": caption,
                "filename": filename,  # Include filename in results
                "similarity": float(similarity)
            })

    return processed_results

"""Delete ab embedding from the colleciton by ID"""
def delete_embedding(img_id):
    collection = get_or_create_collection("image_captions", {"hnsw:space":"cosine"}) # Use consine similarity 
    collection.delete(ids=[str(img_id)])

    return True

