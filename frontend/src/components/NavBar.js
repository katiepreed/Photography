// NavBar.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import ColorThief from "colorthief";

const NavBar = ({ onFileUpload, onImageSaved }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const extractColors = (imgElement) => {
    try {
      const colorThief = new ColorThief();

      // Get dominant color
      const dominant = colorThief.getColor(imgElement);

      // Get color palette (8 colors)
      const palette = colorThief.getPalette(imgElement, 8);

      return { dominantColor: dominant, colorPalette: palette };
    } catch (err) {
      console.error("Error extracting colors:", err);
      return { dominantColor: null, colorPalette: [] };
    }
  };

  const saveEmbedding = async (imageId, caption, filename) => {
    const embeddingData = {
      image_id: imageId,
      caption: caption,
      filename: filename,
    };

    try {
      const saveCaptionResponse = await fetch(
        "http://localhost:5001/save-embedding",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(embeddingData),
        }
      );

      if (!saveCaptionResponse.ok) {
        throw new Error(`HTTP error! Status: ${saveCaptionResponse.status}`);
      }

      return true; // Indicate success
    } catch (err) {
      console.error("Error saving embedding:", err);
      return false; // Indicate failure
    }
  };

  const generateCaption = async (selectedFile) => {
    try {
      // Generate a caption using Gemini
      const formData = new FormData();
      formData.append("image", selectedFile);

      // Use the Gemini captioning endpoint to create caption
      const captionResponse = await fetch(
        "http://localhost:5001/generate-caption",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!captionResponse.ok) {
        throw new Error(`HTTP error! Status: ${captionResponse.status}`);
      }

      const captionData = await captionResponse.json();
      return captionData.caption;
    } catch (err) {
      console.error("Error generating Caption:", err);
      throw err; // Re-throw the error so the caller knows something went wrong
    }
  };

  const saveImage = async (selectedFile, caption) => {
    try {
      // Create a temporary image to extract colors
      const img = new Image();
      img.crossOrigin = "Anonymous";

      // Wait for the image to load before extracting colors
      const colorData = await new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(selectedFile);
        img.onload = () => {
          const colors = extractColors(img);
          URL.revokeObjectURL(objectUrl);
          resolve(colors);
        };
        img.src = objectUrl;
      });

      // Save the image to the database with both caption types
      const saveFormData = new FormData();
      saveFormData.append("image", selectedFile);
      saveFormData.append("caption", caption);
      saveFormData.append(
        "dominantColor",
        JSON.stringify(colorData.dominantColor)
      );
      saveFormData.append(
        "colorPalette",
        JSON.stringify(colorData.colorPalette)
      );

      const saveResponse = await fetch("http://localhost:5002/save-image", {
        method: "POST",
        body: saveFormData,
      });

      if (!saveResponse.ok) {
        throw new Error(
          `HTTP error saving image! Status: ${saveResponse.status}`
        );
      }

      return saveResponse;
    } catch (err) {
      console.error("Error Saving Image:", err);
      throw err; // Re-throw the error
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setLoading(true);
      setError(null);

      try {
        // First, pass the file to the parent component for preview
        onFileUpload(selectedFile);

        // Generate caption and check if we got a valid response
        const caption = await generateCaption(selectedFile);
        if (!caption) {
          throw new Error("Failed to generate caption");
        }

        // Save image and check if we got a valid response
        const saveResponse = await saveImage(selectedFile, caption);
        if (!saveResponse || !saveResponse.ok) {
          throw new Error("Failed to save image");
        }

        // Parse the response
        const saveResponseData = await saveResponse.json();

        console.log(saveResponseData.filename);

        // Check if we have the required data before proceeding
        if (saveResponseData?.success && saveResponseData?.id) {
          const embeddingSuccess = await saveEmbedding(
            saveResponseData.id,
            caption,
            saveResponseData.filename
          );
          if (!embeddingSuccess) {
            console.warn(
              "Failed to save embedding, but image was saved successfully"
            );
          }
        } else {
          throw new Error("Invalid response from image save operation");
        }

        // Notify parent component that image was saved
        if (onImageSaved) {
          onImageSaved();
        }
      } catch (err) {
        setError(`Error processing image: ${err.message}`);
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      <div className="navbar">
        <Link style={{ textDecoration: "none" }} to="/" className="header">
          KATIE REED
        </Link>

        <div className="mini-nav">
          <Link
            className="nav-bar-option"
            style={{ textDecoration: "none" }}
            to="/search"
          >
            Search
          </Link>
          <Link
            className="nav-bar-option"
            style={{ textDecoration: "none" }}
            to="/albums"
          >
            Albums
          </Link>
          <div>
            <label htmlFor="nav-file-input" className={`nav-bar-option`}>
              {loading ? "Processing..." : "Upload Photo"}
            </label>
            <input
              type="file"
              id="nav-file-input"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={loading}
            />
          </div>
        </div>
      </div>
      <div className="divider" />
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default NavBar;
