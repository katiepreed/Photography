// Gallery.js - Flexbox Version
import React, { useState, useEffect } from "react";
import "./Gallery.css"; // Import the CSS file

function Gallery() {
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

  // Function to determine image size class
  const getImageSizeClass = (index) => {
    // Create a varied pattern to make the collage more interesting
    if (index % 12 === 0) return "large"; // Every 12th image is large
    if (index % 8 === 3) return "tall"; // Every 8th image (starting at 3) is tall
    if (index % 6 === 2) return "wide"; // Every 6th image (starting at 2) is wide
    if (index % 5 === 1) return "medium"; // Every 5th image (starting at 1) is medium
    return ""; // Default size
  };

  if (loading) return <p>Loading saved images...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="Gallery">
      {images.length === 0 ? (
        <p className="no-images">No images have been uploaded.</p>
      ) : (
        <div className="flex-grid">
          {images.map((img, index) => (
            <div
              key={img.id}
              className={`saved-image ${getImageSizeClass(index)}`}
            >
              <div className="saved-image-inner">
                <img
                  src={`http://localhost:5002/uploads/${img.filename}`}
                  alt={img.caption}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={fetchSavedImages}>Refresh</button>
    </div>
  );
}

export default Gallery;
