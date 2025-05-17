import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./AlbumsPage.css";
import { Loader } from "lucide-react";

const AlbumsPage = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [albumPreviews, setAlbumPreviews] = useState({});
  const [albumCovers, setAlbumCovers] = useState({});

  useEffect(() => {
    // Fetch albums from backend
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5002/albums");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setAlbums(data);

        // For each album, fetch a few images to create the collage preview and covers
        if (data && data.length > 0) {
          for (const album of data) {
            try {
              await fetchAlbumPreview(album.id);
              await fetchAlbumCover(album.id, album.cover_image);
            } catch (previewErr) {
              console.error(`Error with album ${album.id}:`, previewErr);
              // Continue with other albums even if one fails
            }
          }
        }

        setLoading(false);
      } catch (err) {
        setError(`Error loading albums: ${err.message}`);
        setLoading(false);
        console.error("Error fetching albums:", err);
      }
    };

    fetchAlbums();
  }, []);

  const fetchAlbumPreview = async (albumId) => {
    try {
      console.log(`Fetching preview for album ${albumId}`);
      const response = await fetch(`http://localhost:5002/albums/${albumId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Check if data and images exist before processing
      if (data && data.images && Array.isArray(data.images)) {
        // Get up to 4 images for the preview collage
        const previewImages = data.images.slice(0, 4).map((img) => ({
          id: img.id,
          filename: img.filename,
        }));

        setAlbumPreviews((prev) => ({
          ...prev,
          [albumId]: previewImages,
        }));
      } else {
        console.log(`No images found for album ${albumId}`);
        setAlbumPreviews((prev) => ({
          ...prev,
          [albumId]: [],
        }));
      }
    } catch (err) {
      console.error(`Error fetching preview for album ${albumId}:`, err);
      // Set empty array for this album to prevent continuous retries
      setAlbumPreviews((prev) => ({
        ...prev,
        [albumId]: [],
      }));
    }
  };

  const fetchAlbumCover = async (albumId, coverImageId) => {
    try {
      console.log(
        `Fetching cover for album ${albumId}, coverImageId: ${coverImageId}`
      );

      // If there's a coverImageId already stored in the album, use that
      if (coverImageId) {
        try {
          // Find the image in the database
          const response = await fetch(`http://localhost:5002/images`);
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const data = await response.json();
          if (data && data.images && Array.isArray(data.images)) {
            const coverImage = data.images.find(
              (img) => img.id === parseInt(coverImageId)
            );

            if (coverImage) {
              setAlbumCovers((prev) => ({
                ...prev,
                [albumId]: {
                  id: coverImage.id,
                  filename: coverImage.filename,
                },
              }));
              return; // Successfully found cover image, exit function
            }
          }
        } catch (err) {
          console.error(`Error fetching cover image ${coverImageId}:`, err);
          // Continue to try latest image as fallback
        }
      }

      // If no cover image or couldn't find it, fetch the latest image
      try {
        console.log(`Trying to fetch latest image for album ${albumId}`);
        const response = await fetch(
          `http://localhost:5002/albums/${albumId}/latest-image`
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`No latest image found for album ${albumId}`);
            return; // No images in album, this is expected sometimes
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.latestImage) {
          setAlbumCovers((prev) => ({
            ...prev,
            [albumId]: {
              id: data.latestImage.id,
              filename: data.latestImage.filename,
            },
          }));

          // Optionally update the album's cover_image in the database
          updateAlbumCover(albumId, data.latestImage.id);
        }
      } catch (err) {
        console.error(`Error fetching latest image for album ${albumId}:`, err);
      }
    } catch (err) {
      console.error(`Overall error fetching cover for album ${albumId}:`, err);
    }
  };

  const updateAlbumCover = async (albumId, imageId) => {
    try {
      const response = await fetch(
        `http://localhost:5002/albums/${albumId}/cover`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageId }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      console.log(
        `Successfully updated cover for album ${albumId} to image ${imageId}`
      );
    } catch (err) {
      console.error(`Error updating album cover:`, err);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="loading-spinner" />
        <p>Loading albums...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="albums-page">
      {albums.length > 0 ? (
        <div className="albums-grid">
          {albums.map((album) => (
            <div key={album.id} className="album-card">
              <Link to={`/albums/${album.id}`} className="album-link">
                {/* Cover Photo Display */}
                <div className="album-cover">
                  {albumCovers[album.id] ? (
                    <img
                      src={`http://localhost:5002/uploads/${
                        albumCovers[album.id].filename
                      }`}
                      alt={`${album.name} cover`}
                      className="cover-image"
                      onError={(e) => {
                        console.error(
                          `Error loading cover image for album ${album.id}`
                        );
                        e.target.src =
                          "https://via.placeholder.com/300x200?text=Image+Error";
                      }}
                    />
                  ) : albumPreviews[album.id] &&
                    albumPreviews[album.id].length > 0 ? (
                    // Fallback to first preview image if no cover
                    <img
                      src={`http://localhost:5002/uploads/${
                        albumPreviews[album.id][0].filename
                      }`}
                      alt={`${album.name} preview`}
                      className="cover-image"
                      onError={(e) => {
                        console.error(
                          `Error loading preview image for album ${album.id}`
                        );
                        e.target.src =
                          "https://via.placeholder.com/300x200?text=Image+Error";
                      }}
                    />
                  ) : (
                    <div className="no-cover">No Cover Image</div>
                  )}
                </div>

                <div className="album-info">
                  <h3>{album.name}</h3>
                  <p>{album.image_count} photos</p>
                  {album.description && (
                    <p className="album-description">{album.description}</p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-albums">
          <p>No albums found.</p>
          <p>
            Create a new album by searching for images and selecting "Create
            Album from Results"!
          </p>
          <Link to="/search" className="create-album-button">
            Go to Search
          </Link>
        </div>
      )}
    </div>
  );
};

export default AlbumsPage;
