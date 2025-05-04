import React, { useState, useRef, useEffect } from "react";
import CaptionAnalysis from "../utils/CaptionAnalysis";
import ColorThief from "colorthief";

function ImageUploader({ uploadedFile }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [subject, setSubject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dominantColor, setDominantColor] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const imageRef = useRef(null);

  // Process the file when it's uploaded from NavBar
  useEffect(() => {
    if (uploadedFile) {
      setFile(uploadedFile);
      const previewUrl = URL.createObjectURL(uploadedFile);
      setPreview(previewUrl);
      setCaption("");
      setSubject("");
      setDominantColor(null);
      setColorPalette([]);
      setSaveSuccess(false);
    }
  }, [uploadedFile]);

  // Extract colors when image loads
  useEffect(() => {
    if (preview && imageRef.current && imageRef.current.complete) {
      extractColors();
    }
  }, [preview]);

  const extractColors = () => {
    try {
      const colorThief = new ColorThief();

      // Get dominant color
      const dominant = colorThief.getColor(imageRef.current);
      setDominantColor(dominant);

      // Get color palette (8 colors)
      const palette = colorThief.getPalette(imageRef.current, 8);
      setColorPalette(palette);
    } catch (err) {
      console.error("Error extracting colors:", err);
      setError("Could not extract colors from this image");
    }
  };

  // RGB to hex conversion for display
  const rgbToHex = (r, g, b) => {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("http://localhost:5001/generate-caption", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      setCaption(data.caption);
      setSubject(data.has_person);
    } catch (err) {
      setError(`Error generating caption: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // New function to save the image to the database
  const saveImageToDatabase = async () => {
    if (!file || !caption) {
      setError("Please upload an image and generate a caption first");
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("caption", caption);
      formData.append("dominantColor", JSON.stringify(dominantColor));
      formData.append("colorPalette", JSON.stringify(colorPalette));

      const response = await fetch("http://localhost:5002/save-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      setSaveSuccess(true);
    } catch (err) {
      setError(`Error saving image: ${err.message}`);
      setSaveSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-uploader">
      <h2>Image Caption Generator</h2>

      {preview && (
        <div className="preview-container">
          <img
            ref={imageRef}
            src={preview}
            alt="Preview"
            className="image-preview"
            onLoad={extractColors}
            crossOrigin="anonymous"
          />

          {/* Color scheme display */}
          {dominantColor && (
            <div className="color-info">
              <h3>Color Scheme</h3>
              <div className="dominant-color">
                <div
                  className="color-swatch"
                  style={{
                    backgroundColor: `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`,
                  }}
                ></div>
                <span>
                  Dominant:{" "}
                  {rgbToHex(
                    dominantColor[0],
                    dominantColor[1],
                    dominantColor[2]
                  )}
                </span>
              </div>

              {colorPalette.length > 0 && (
                <div className="color-palette">
                  <h4>Palette:</h4>
                  <div className="palette-container">
                    {colorPalette.map((color, index) => (
                      <div key={index} className="palette-color">
                        <div
                          className="color-swatch"
                          style={{
                            backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                          }}
                        ></div>
                        <span>{rgbToHex(color[0], color[1], color[2])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="action-buttons">
        {preview && (
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={!file || loading}
              className="generate-button"
            >
              {loading ? "Generating..." : "Generate Caption"}
            </button>
          </form>
        )}

        {/* New Save to Database button */}
        {caption && (
          <button
            onClick={saveImageToDatabase}
            disabled={loading || !caption}
            className="save-button"
          >
            {loading ? "Saving..." : "Save to Database"}
          </button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
      {saveSuccess && (
        <p className="success-message">Image saved successfully!</p>
      )}

      {caption && (
        <CaptionAnalysis caption={caption} subject={subject.toString()} />
      )}
    </div>
  );
}

export default ImageUploader;
