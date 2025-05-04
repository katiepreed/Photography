// components/AlbumsPage.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const AlbumsPage = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch albums from your backend
    const fetchAlbums = async () => {
      try {
        const response = await fetch("http://localhost:5002/albums");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setAlbums(data);
        setLoading(false);
      } catch (err) {
        setError(`Error loading albums: ${err.message}`);
        setLoading(false);
        console.error("Error fetching albums:", err);
      }
    };

    fetchAlbums();
  }, []);

  if (loading) {
    return <div>Loading albums...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="albums-page">
      <h2>Photo Albums</h2>

      {albums.length > 0 ? (
        <div className="albums-grid">
          {albums.map((album) => (
            <div key={album.id} className="album-card">
              {album.coverImage && (
                <img
                  src={`http://localhost:5002/images/${album.coverImage}`}
                  alt={`${album.name} cover`}
                />
              )}
              <h3>{album.name}</h3>
              <p>{album.imageCount} photos</p>
              {/* You can add a link to view the album */}
              <Link to={`/albums/${album.id}`}>View Album</Link>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p>No albums found.</p>
          <button>Create New Album</button>
        </div>
      )}
    </div>
  );
};

export default AlbumsPage;
