// components/SearchPage.js
import React, { useState, useEffect } from "react";
import "./SearchPage.css";
// Import search icon
import { Search } from "lucide-react";

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if embeddings have been generated
    const checkEmbeddingsStatus = async () => {
      try {
        const response = await fetch("http://localhost:5003/embeddings-status");
        const data = await response.json();
        if (!data.initialized) {
          // Show a notification that embeddings are being generated
          alert(
            "Initializing image embeddings for faster search. This may take a moment."
          );

          // Trigger the process to generate embeddings for all images
          await fetch("http://localhost:5003/process-all-images");
        }
      } catch (error) {
        console.error("Error checking embeddings status:", error);
      }
    };

    checkEmbeddingsStatus();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      // Call the semantic-search endpoint with a POST request
      const response = await fetch("http://localhost:5003/multimodal-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchTerm }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        console.log("Search results:", data.results);
      } else {
        console.error("Error response:", await response.text());
      }
    } catch (error) {
      console.error("Error searching images:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-page">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            className="search-bar"
            type="text"
            placeholder="Search for images semantically..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="submit"
            className="search-icon-button"
            disabled={isLoading}
          >
            {isLoading ? <div className="spinner"></div> : <Search size={20} />}
          </button>
        </div>
      </form>

      <div className="search-results">
        {searchResults.length > 0 ? (
          searchResults.map((image) => (
            <div key={image.id} className="search-result-item">
              <img
                src={`http://localhost:5002/uploads/${image.filename}`}
                alt={image.caption}
              />
              <p>{image.caption}</p>
              <p>Similarity: {(image.similarity * 100).toFixed(1)}%</p>
            </div>
          ))
        ) : (
          <p>{isLoading ? "Searching..." : "No search results to display."}</p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
