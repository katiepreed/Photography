import React, { useState, useRef } from "react";
import { Upload, Search } from "lucide-react";
import "./ImageSearchBar.css";

const ImageSearchBar = ({ onSearch }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleImageSearch = async (e) => {
    e.preventDefault();

    if (!selectedImage) return;

    setIsLoading(true);
    // Notify parent component that search is loading
    onSearch("Image search", [], true);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      // Call the image-search endpoint
      const response = await fetch("http://localhost:5001/image-search", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        // Pass results up to parent component
        onSearch("Image search", results, false);
        console.log("Image search results:", results);
      } else {
        console.error("Error response:", await response.text());
        // Clear results on error, stop loading
        onSearch("Image search", [], false);
      }
    } catch (error) {
      console.error("Error searching by image:", error);
      // Clear results on error, stop loading
      onSearch("Image search", [], false);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current.click();
  };

  return (
    <form onSubmit={handleImageSearch} className="search-form">
      <div className="image-search-container">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="file-input"
        />

        {previewUrl ? (
          <div className="image-preview-container">
            <div className="preview-and-buttons">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="image-preview"
                onClick={triggerFilePicker}
              />
              <button
                type="button"
                className="search-image-button"
                onClick={triggerFilePicker}
              >
                Find Similar Images
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="search-upload-button "
            onClick={triggerFilePicker}
          >
            <Upload size={20} />
            <span>Upload image</span>
          </button>
        )}
      </div>
    </form>
  );
};

export default ImageSearchBar;
