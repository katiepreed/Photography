import React, { useState } from "react";
import { X } from "lucide-react";
import "./AlbumCreationModal.css";

const AlbumCreationModal = ({ setShowModal, searchResults }) => {
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [albumError, setAlbumError] = useState("");
  const [albumSuccess, setAlbumSuccess] = useState("");

  const closeModal = () => {
    setShowModal(false);
    setAlbumName("");
    setAlbumDescription("");
    setAlbumError("");
    setAlbumSuccess("");
  };

  const submitAlbumCreation = async () => {
    if (!albumName.trim()) {
      setAlbumError("Album name is required");
      return;
    }

    setIsCreatingAlbum(true);
    setAlbumError("");

    try {
      // Get IDs of all images in search results
      const imageIds = searchResults.map((image) => image.id);

      const response = await fetch("http://localhost:5002/create-album", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: albumName,
          description: albumDescription,
          imageIds: imageIds,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlbumSuccess(
          `Album "${albumName}" created successfully with ${imageIds.length} photos!`
        );
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        setAlbumError(data.error || "Failed to create album");
      }
    } catch (error) {
      console.error("Error creating album:", error);
      setAlbumError("An error occurred while creating the album");
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Album</h3>
          <button className="close-button" onClick={closeModal}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {albumSuccess ? (
            <div className="success-message">{albumSuccess}</div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="album-name">Album Name *</label>
                <input
                  id="album-name"
                  type="text"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="Enter album name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="album-description">
                  Description (optional)
                </label>
                <textarea
                  id="album-description"
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  placeholder="Enter album description"
                  rows={3}
                />
              </div>
              {albumError && <div className="error-message">{albumError}</div>}
              <div className="form-info">
                This album will include all {searchResults.length} images from
                your search results.
              </div>
              <div className="modal-footer">
                <button
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={isCreatingAlbum}
                >
                  Cancel
                </button>
                <button
                  className="create-button"
                  onClick={submitAlbumCreation}
                  disabled={isCreatingAlbum}
                >
                  {isCreatingAlbum ? "Creating..." : "Create Album"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumCreationModal;
