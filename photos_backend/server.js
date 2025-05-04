// Backend server code (e.g., server.js)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

// Add this line to your server.js file, after the app creation
// and before the routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set up SQLite database
const db = new sqlite3.Database("./images.db", (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      caption TEXT,
      dominant_color TEXT,
      color_palette TEXT,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// New endpoint to save images
app.post("/save-image", upload.single("image"), (req, res) => {
  const { caption } = req.body;
  const dominantColor = JSON.parse(req.body.dominantColor);
  const colorPalette = JSON.parse(req.body.colorPalette);

  const filename = req.file.filename;

  const sql = `INSERT INTO images (filename, caption, dominant_color, color_palette) 
               VALUES (?, ?, ?, ?)`;

  db.run(
    sql,
    [
      filename,
      caption,
      JSON.stringify(dominantColor),
      JSON.stringify(colorPalette),
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({
        success: true,
        id: this.lastID,
        filename: filename,
      });
    }
  );
});

// Add endpoint to retrieve saved images
app.get("/images", (req, res) => {
  const sql = `SELECT * FROM images ORDER BY upload_date DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ images: rows });
  });
});

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
