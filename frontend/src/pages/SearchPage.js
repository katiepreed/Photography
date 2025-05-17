import React, { useState, useEffect } from "react";
import AlbumCreationModal from "../SearchPage/AlbumCreationModal";
import SearchBar from "../SearchPage/SearchBar";
import ColorSearchBar from "../SearchPage/ColorSearchBar";
import ImageSearchBar from "../SearchPage/ImageSearchBar";
import SearchTypeSelector from "../SearchPage/SearchTypeSelector";
import SearchResult from "../SearchPage/SearchResult";
import "./SearchPage.css";
import { Plus } from "lucide-react";

const SearchPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState("text");

  const handleCreateAlbum = () => {
    if (searchResults.length === 0) {
      alert("You need search results to create an album!");
      return;
    }
    setShowModal(true);
  };

  const handleSearch = async (term, results, loading) => {
    setSearchTerm(term);
    setSearchResults(results);
    setIsLoading(loading);
  };

  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    // Clear previous search results when changing search type
    setSearchResults([]);
    setSearchTerm("");
  };

  const renderSearchComponent = () => {
    switch (searchType) {
      case "text":
        return <SearchBar onSearch={handleSearch} />;
      case "image":
        return <ImageSearchBar onSearch={handleSearch} />;
      case "color":
        return <ColorSearchBar onSearch={handleSearch} />;
      default:
        return <SearchBar onSearch={handleSearch} />;
    }
  };

  return (
    <div className="search-page">
      <SearchTypeSelector onSearchTypeChange={handleSearchTypeChange} />

      {renderSearchComponent()}

      {searchResults.length > 0 && (
        <div className="search-actions">
          <button className="create-album-button" onClick={handleCreateAlbum}>
            <Plus size={16} />
            Create Album from Results
          </button>
        </div>
      )}

      <div className="search-results">
        {searchResults.length > 0 ? (
          searchResults.map((image) => (
            <SearchResult key={image.id} image={image} />
          ))
        ) : (
          <p className="no-results-message">
            {isLoading
              ? "Searching..."
              : searchTerm
              ? "No matching images found."
              : searchType === "text"
              ? "Enter a search term to find images."
              : searchType === "image"
              ? "Upload an image to find similar images."
              : "Select a color to find matching images."}
          </p>
        )}
      </div>

      {/* Album Creation Modal */}
      {showModal && (
        <AlbumCreationModal
          setShowModal={setShowModal}
          searchResults={searchResults}
        />
      )}
    </div>
  );
};

export default SearchPage;
