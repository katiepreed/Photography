import React from "react";

function CaptionAnalysis({ caption, subject }) {
  return (
    <div>
      <p>
        <strong>Caption:</strong> {caption}
      </p>
      {subject && (
        <p>
          <strong>Subject:</strong> {subject}
        </p>
      )}
    </div>
  );
}

export default CaptionAnalysis;
