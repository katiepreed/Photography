// SavedImages.js
import React, { useState, useEffect } from "react";

function SavedImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSavedImages();
  }, []);

  const fetchSavedImages = async () => {
    try {
      const response = await fetch("http://localhost:5002/images");

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setImages(data.images);
    } catch (err) {
      setError(`Error fetching images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading saved images...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="saved-images">
      <h2>Saved Images</h2>
      {images.length === 0 ? (
        <p>No saved images found.</p>
      ) : (
        <div className="image-grid">
          {images.map((img) => (
            <div key={img.id} className="saved-image-card">
              <img
                src={`http://localhost:5002/uploads/${img.filename}`}
                alt={img.caption}
              />
              <p>{img.caption}</p>
              <div className="color-preview">
                {JSON.parse(img.dominant_color) && (
                  <div
                    className="dominant-color-preview"
                    style={{
                      backgroundColor: `rgb(${JSON.parse(
                        img.dominant_color
                      ).join(",")})`,
                    }}
                  ></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={fetchSavedImages}>Refresh</button>
    </div>
  );
}

export default SavedImages;
