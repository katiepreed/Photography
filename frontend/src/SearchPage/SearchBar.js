import React, { useState } from "react";
import { Search } from "lucide-react";
import "./SearchBar.css";

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchTerm.trim()) return;

    setIsLoading(true);
    // Notify parent component that search is loading
    onSearch(searchTerm, [], true);

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
        const results = data.results || [];
        // Pass results up to parent component
        onSearch(searchTerm, results, false);
        console.log("Search results:", results);
      } else {
        console.error("Error response:", await response.text());
        // Clear results on error, stop loading
        onSearch(searchTerm, [], false);
      }
    } catch (error) {
      console.error("Error searching images:", error);
      // Clear results on error, stop loading
      onSearch(searchTerm, [], false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};

export default SearchBar;
