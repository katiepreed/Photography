// Gallery.js - Flexbox Version
import React, { useState, useEffect } from "react";
import "./Gallery.css"; // Import the CSS file

function Gallery({ refreshTrigger }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSavedImages();
  }, [refreshTrigger]);

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
    if (index % 2 === 0) return "small"; // Every 8th image (starting at 3) is tall
    if (index % 3 === 0) return "medium"; // Every 12th image is large
    if (index % 9 === 0) return "large"; // Every 6th image (starting at 2) is wide
    if (index % 5 === 0) return "extra-large"; // Every 5th image (starting at 1) is medium
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
    </div>
  );
}

export default Gallery;
