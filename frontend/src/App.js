// App.js
import React, { useState } from "react";
import NavBar from "./components/NavBar";
import ImageUploader from "./components/ImageUploader";
import SavedImages from "./components/SavedImages";
import Gallery from "./components/Gallery";
import "./App.css";

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentView, setCurrentView] = useState("uploader"); // 'uploader' or 'saved'

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setCurrentView("uploader");
  };

  return (
    <div className="App">
      <NavBar onFileUpload={handleFileUpload} />
      <Gallery />
      <div className="view-selector">
        <button
          className={currentView === "uploader" ? "active" : ""}
          onClick={() => setCurrentView("uploader")}
        >
          Upload New
        </button>
        <button
          className={currentView === "saved" ? "active" : ""}
          onClick={() => setCurrentView("saved")}
        >
          View Saved
        </button>
      </div>

      {currentView === "uploader" ? (
        <ImageUploader uploadedFile={uploadedFile} />
      ) : (
        <SavedImages />
      )}
    </div>
  );
}

export default App;
