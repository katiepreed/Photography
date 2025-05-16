// components/SearchPage.js
import React, { useState, useEffect } from "react";
import "./SearchPage.css";
// Import search icon
import { Search } from "lucide-react";

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchTerm.trim()) return;

    setIsLoading(true);

    try {
      // Call the semantic-search endpoint with the selected caption type
      const response = await fetch("http://localhost:5001/semantic-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchTerm,
        }),
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
              <div className="caption-container">
                <p className="caption-text">{image.caption}</p>
                <p className="similarity-score">
                  Similarity: {(image.similarity * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-results-message">
            {isLoading
              ? "Searching..."
              : searchTerm
              ? "No matching images found."
              : "Enter a search term to find images."}
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
