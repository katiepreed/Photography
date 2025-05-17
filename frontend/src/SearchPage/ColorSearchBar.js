import React, { useState } from "react";
import "./ColorSearchBar.css";

const ColorSearchBar = ({ onColorChange }) => {
  const [selectedColor, setSelectedColor] = useState("#3B82F6"); // Default blue color
  const [isOpen, setIsOpen] = useState(false);

  const colors = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#8B5CF6", // Violet
    "#EC4899", // Pink
    "#000000", // Black
    "#FFFFFF", // White
  ];

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setIsOpen(false);

    // Notify parent component about color change
    if (onColorChange) {
      onColorChange(color);
    }
  };

  return (
    <div className="color-picker-container">
      <div className="colors">
        {colors.map((color) => (
          <button
            key={color}
            className="color-option"
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelect(color)}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>

      <input
        type="color"
        value={selectedColor}
        onChange={(e) => handleColorSelect(e.target.value)}
        className="custom-color-input"
        aria-label="Custom color"
      />
    </div>
  );
};

export default ColorSearchBar;
