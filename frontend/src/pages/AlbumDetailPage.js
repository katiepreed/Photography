import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader } from "lucide-react";
import "./AlbumDetailPage.css";

const AlbumDetailPage = () => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching details for album ${id}`);

        const response = await fetch(`http://localhost:5002/albums/${id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.album) {
          throw new Error("Album data is missing");
        }

        console.log("Received album data:", data);
        setAlbum(data.album);

        // Make sure images exist before setting them
        if (data.images && Array.isArray(data.images)) {
          setImages(data.images);
        } else {
          setImages([]);
          console.warn("No images found in album or invalid images format");
        }
      } catch (err) {
        console.error("Error fetching album details:", err);
        setError(`Failed to load album: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAlbumDetails();
    } else {
      setError("Album ID is missing");
      setLoading(false);
    }
  }, [id]);

  const openImageModal = (image) => {
    setSelectedImage(image);
    document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = "auto"; // Restore scrolling
  };

  // Error if the id is not provided
  if (!id) {
    return (
      <div className="error-container">
        <p className="error-message">No album ID provided</p>
        <Link to="/albums" className="back-button">
          <ArrowLeft size={16} />
          Back to Albums
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="loading-spinner" />
        <p>Loading album...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <Link to="/albums" className="back-button">
          <ArrowLeft size={16} />
          Back to Albums
        </Link>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="error-container">
        <p className="error-message">Album not found</p>
        <Link to="/albums" className="back-button">
          <ArrowLeft size={16} />
          Back to Albums
        </Link>
      </div>
    );
  }

  return (
    <div className="album-detail-page">
      <div className="album-header">
        <Link to="/albums" className="back-link">
          <ArrowLeft size={18} />
          <span>Back to Albums</span>
        </Link>

        <div className="album-title-section">
          <h1>{album.name}</h1>
          {album.description && (
            <p className="album-description">{album.description}</p>
          )}
          <p className="image-count">{images.length} photos</p>
        </div>
      </div>

      {images.length > 0 ? (
        <div className="album-images-grid">
          {images.map((image) => (
            <div
              key={image.id}
              className="album-image-item"
              onClick={() => openImageModal(image)}
            >
              <img
                src={`http://localhost:5002/uploads/${image.filename}`}
                alt={image.caption || "Album image"}
                onError={(e) => {
                  console.error(`Error loading image ${image.id}`);
                  e.target.src =
                    "https://via.placeholder.com/300x200?text=Image+Error";
                }}
              />
              <div className="image-overlay">
                <div className="image-caption-preview">
                  {image.caption && image.caption.slice(0, 60)}
                  {image.caption && image.caption.length > 60 && "..."}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-images-message">
          <p>This album doesn't have any images yet.</p>
        </div>
      )}

      {selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-button" onClick={closeImageModal}>
              ×
            </button>
            <div className="modal-image-container">
              <img
                src={`http://localhost:5002/uploads/${selectedImage.filename}`}
                alt={selectedImage.caption || "Selected image"}
                onError={(e) => {
                  console.error(
                    `Error loading modal image ${selectedImage.id}`
                  );
                  e.target.src =
                    "https://via.placeholder.com/600x400?text=Image+Error";
                }}
                width="500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumDetailPage;
