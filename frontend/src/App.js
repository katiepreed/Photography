// App.js
import React, { useState, useEffect } from "react";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import AlbumsPage from "./pages/AlbumsPage";
import HomePage from "./pages/HomePage";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [shouldRefreshGallery, setShouldRefreshGallery] = useState(false);

  const handleFileUpload = (file) => {
    setUploadedFile(file);
  };

  const onImageSaved = () => {
    setShouldRefreshGallery((prev) => !prev); // Toggle the state to force a refresh
  };

  return (
    <Router>
      <div className="App">
        <NavBar onFileUpload={handleFileUpload} onImageSaved={onImageSaved} />
        <Routes>
          <Route
            path="/"
            element={<HomePage refreshTrigger={shouldRefreshGallery} />}
          />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/albums/:id" element={<AlbumDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
