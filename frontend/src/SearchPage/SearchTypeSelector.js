import React, { useState } from "react";
import { Search, Image, Palette } from "lucide-react";
import "./SearchTypeSelector.css";

const SearchTypeSelector = ({ onSearchTypeChange }) => {
  const [activeType, setActiveType] = useState("text");

  const handleTypeChange = (type) => {
    setActiveType(type);
    onSearchTypeChange(type);
  };

  return (
    <div className="pill-menu">
      <button
        className={`pill-button ${activeType === "text" ? "active" : ""}`}
        onClick={() => handleTypeChange("text")}
        title="Search by text"
      >
        <Search size={20} />
        <span>Text</span>
      </button>

      <button
        className={`pill-button ${activeType === "image" ? "active" : ""}`}
        onClick={() => handleTypeChange("image")}
        title="Search by image"
      >
        <Image size={20} />
        <span>Image</span>
      </button>

      <button
        className={`pill-button ${activeType === "color" ? "active" : ""}`}
        onClick={() => handleTypeChange("color")}
        title="Search by color"
      >
        <Palette size={20} />
        <span>Color</span>
      </button>
    </div>
  );
};

export default SearchTypeSelector;
