import React from "react";
import "./SearchResult.css";

const SearchResult = ({ image }) => {
  return (
    <div className="search-result-item">
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
  );
};

export default SearchResult;
