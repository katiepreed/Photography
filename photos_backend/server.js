// Backend server code (e.g., server.js)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
// find out what this does
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set up SQLite database
const db = new sqlite3.Database("./images.db", (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to the SQLite database.");

    // Create images table with albums field (JSON string of array)
    db.run(`CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      caption TEXT,
      dominant_color TEXT,
      color_palette TEXT,
      albums TEXT DEFAULT '[]',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create albums table
    db.run(`CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      cover_image TEXT,
      image_count INTEGER DEFAULT 0,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP
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

/*
This is Multer middleware that:

- Looks for a form field named "image" in the incoming request
- Processes the file upload from that field
- Stores the file according to your storage configuration
- Creates a file object on the request (req.file)
*/

// Endpoint to save images
app.post("/save-image", upload.single("image"), (req, res) => {
  const { caption } = req.body;
  const dominantColor = JSON.parse(req.body.dominantColor);
  const colorPalette = JSON.parse(req.body.colorPalette);
  const filename = req.file.filename;
  const albums = req.body.albums ? req.body.albums : "[]"; // Default to empty array if not provided

  const sql = `INSERT INTO images (filename, caption, dominant_color, color_palette, albums) 
               VALUES (?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [
      filename,
      caption,
      JSON.stringify(dominantColor),
      JSON.stringify(colorPalette),
      albums,
    ],

    async function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }

      const imageId = this.lastID;

      return res.json({
        success: true,
        id: imageId,
        filename: filename,
      });
    }
  );
});

// Endpoint to retrieve saved images
app.get("/images", (req, res) => {
  const sql = `SELECT * FROM images ORDER BY upload_date DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ images: rows });
  });
});

// Endpoint to get all albums
app.get("/albums", (req, res) => {
  const sql = `SELECT * FROM albums ORDER BY created_date DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Endpoint to get the most recently added image for an album
app.get("/albums/:id/latest-image", (req, res) => {
  const albumId = req.params.id;

  // Improved query with better JSON handling
  const sql = `
    SELECT * FROM images 
    WHERE JSON_EXTRACT(albums, '$') LIKE ? OR JSON_EXTRACT(albums, '$') LIKE ?
    ORDER BY upload_date DESC 
    LIMIT 1
  `;

  const searchPattern1 = `%${albumId}%`;
  const searchPattern2 = `%${albumId}]%`;

  db.get(sql, [searchPattern1, searchPattern2], (err, image) => {
    if (err) {
      console.error("Error fetching latest image:", err);
      return res.status(500).json({ error: err.message });
    }

    if (!image) {
      return res.status(404).json({ error: "No images found in this album" });
    }

    return res.json({ latestImage: image });
  });
});

// Endpoint to get a specific album with its images
app.get("/albums/:id", (req, res) => {
  const albumId = req.params.id;

  // First get the album details
  db.get(`SELECT * FROM albums WHERE id = ?`, [albumId], (err, album) => {
    if (err) {
      console.error("Error fetching album:", err);
      return res.status(500).json({ error: err.message });
    }

    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    // Now get all images in this album - fixed query to properly search JSON array
    // Using JSON functions more carefully to avoid SQL injection and properly parse JSON
    const sql = `SELECT * FROM images WHERE JSON_EXTRACT(albums, '$') LIKE ? OR JSON_EXTRACT(albums, '$') LIKE ?`;
    const searchPattern1 = `%${albumId}%`; // For when albumId is in the middle
    const searchPattern2 = `%${albumId}]%`; // For when albumId is at the end

    db.all(sql, [searchPattern1, searchPattern2], (err, images) => {
      if (err) {
        console.error("Error fetching album images:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({
        album: album,
        images: images,
      });
    });
  });
});

// Endpoint to create a new album from search results
app.post("/create-album", (req, res) => {
  const { name, description, imageIds, coverImageId } = req.body; // Add coverImageId to destructuring

  if (!name || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid input. Name and image IDs are required." });
  }

  // Start a transaction
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Use specified cover image if provided, otherwise use first image in array
    const coverImage = coverImageId || imageIds[0];

    // Create the new album
    db.run(
      `INSERT INTO albums (name, description, image_count, cover_image) VALUES (?, ?, ?, ?)`,
      [name, description || "", imageIds.length, coverImage],
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }

        const albumId = this.lastID;

        // For each image, update its albums array to include this album
        let completed = 0;
        imageIds.forEach((imageId) => {
          // First get the current albums array
          db.get(
            `SELECT albums FROM images WHERE id = ?`,
            [imageId],
            (err, row) => {
              if (err || !row) {
                console.error(`Error updating image ${imageId}:`, err);
                completed++;

                // If all images have been processed, commit or rollback
                if (completed === imageIds.length) {
                  if (completed < imageIds.length) {
                    db.run("ROLLBACK");
                    return res
                      .status(500)
                      .json({ error: "Failed to update all images" });
                  } else {
                    db.run("COMMIT");
                    return res.json({
                      success: true,
                      albumId: albumId,
                      message: "Album created successfully",
                    });
                  }
                }
                return;
              }

              // Parse the current albums array and add the new album ID
              let albums = [];
              try {
                albums = JSON.parse(row.albums || "[]");
              } catch (e) {
                albums = [];
              }

              if (!albums.includes(albumId)) {
                albums.push(albumId);
              }

              // Update the image with the new albums array
              db.run(
                `UPDATE images SET albums = ? WHERE id = ?`,
                [JSON.stringify(albums), imageId],
                function (err) {
                  completed++;

                  if (err) {
                    console.error(`Error updating image ${imageId}:`, err);
                  }

                  // If all images have been processed, commit
                  if (completed === imageIds.length) {
                    db.run("COMMIT");
                    return res.json({
                      success: true,
                      albumId: albumId,
                      message: "Album created successfully",
                    });
                  }
                }
              );
            }
          );
        });
      }
    );
  });
});
// Add an endpoint to update album cover
app.put("/albums/:id/cover", (req, res) => {
  const albumId = req.params.id;
  const { imageId } = req.body;

  if (!imageId) {
    return res.status(400).json({ error: "Image ID is required" });
  }

  const sql = `UPDATE albums SET cover_image = ? WHERE id = ?`;

  db.run(sql, [imageId, albumId], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    return res.json({
      success: true,
      message: "Album cover updated successfully",
    });
  });
});

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
