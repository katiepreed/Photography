import React from "react";

const NavBar = ({ onFileUpload }) => {
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div>
      <div className="navbar">
        <h1>KATIE REED</h1>
        <div>
          <label htmlFor="nav-file-input" className="upload-button">
            Upload Photo
          </label>
          <input
            type="file"
            id="nav-file-input"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>
      <div className="divider" />
    </div>
  );
};

export default NavBar;
