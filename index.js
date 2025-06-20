const express = require("express");
const { Pool } = require("pg");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(morgan("dev"));
app.use(cors());

// Cấu hình pool cho database 1
const db = new Pool({
    user: process.env.DB1_USER,
    host: process.env.DB1_HOST,
    database: process.env.DB1_NAME,
    password: process.env.DB1_PASSWORD,
    port: process.env.DB1_PORT,
});

// Cấu hình pool cho database 2
const dw = new Pool({
    user: process.env.DB2_USER,
    host: process.env.DB2_HOST,
    database: process.env.DB2_NAME,
    password: process.env.DB2_PASSWORD,
    port: process.env.DB2_PORT,
});

db.connect()
    .then(() => console.log("Connected to db"))
    .catch((err) => console.error("Connection error to db:", err));

dw.connect()
    .then(() => console.log("Connected to dw"))
    .catch((err) => console.error("Connection error to dw:", err));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ info: "Express + 2 Postgres Databases" });
});

// ===== USERS CRUD =====
app.get("/users", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Users");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/users/:id", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Users WHERE UserID = $1", [
            req.params.id,
        ]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/users", async (req, res) => {
    try {
        const { Username, Password, Email, FullName, Avatar } = req.body;
        const result = await db.query(
            "INSERT INTO Users (Username, Password, Email, FullName, Avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [Username, Password, Email, FullName, Avatar]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/users/:id", async (req, res) => {
    try {
        const { FullName, Avatar, IsActive, IsAdmin } = req.body;
        const result = await db.query(
            "UPDATE Users SET FullName=$1, Avatar=$2, IsActive=$3, IsAdmin=$4 WHERE UserID=$5 RETURNING *",
            [FullName, Avatar, IsActive, IsAdmin, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/users/:id", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Users WHERE UserID=$1 RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "User not found" });
        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== CONTENT CRUD =====
app.get("/contents", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Content");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/contents/:id", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Content WHERE ContentID = $1",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Content not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/contents", async (req, res) => {
    try {
        const {
            Title,
            OriginalTitle,
            Description,
            Type,
            ReleaseDate,
            IMDBRating,
            PosterURL,
            Status,
            Country,
            Language,
        } = req.body;
        const result = await db.query(
            "INSERT INTO Content (Title, OriginalTitle, Description, Type, ReleaseDate, IMDBRating, PosterURL, Status, Country, Language) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
            [
                Title,
                OriginalTitle,
                Description,
                Type,
                ReleaseDate,
                IMDBRating,
                PosterURL,
                Status,
                Country,
                Language,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/contents/:id", async (req, res) => {
    try {
        const { Title, Description, Status } = req.body;
        const result = await db.query(
            "UPDATE Content SET Title=$1, Description=$2, Status=$3 WHERE ContentID=$4 RETURNING *",
            [Title, Description, Status, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Content not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/contents/:id", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Content WHERE ContentID=$1 RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Content not found" });
        res.json({ message: "Content deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ACTORS CRUD =====
app.get("/actors", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Actors");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/actors/:id", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Actors WHERE ActorID = $1",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Actor not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/actors", async (req, res) => {
    try {
        const { Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL } =
            req.body;
        const result = await db.query(
            "INSERT INTO Actors (Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            [Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/actors/:id", async (req, res) => {
    try {
        const { Name, Bio, Nationality } = req.body;
        const result = await db.query(
            "UPDATE Actors SET Name=$1, Bio=$2, Nationality=$3 WHERE ActorID=$4 RETURNING *",
            [Name, Bio, Nationality, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Actor not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/actors/:id", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Actors WHERE ActorID=$1 RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Actor not found" });
        res.json({ message: "Actor deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== DIRECTORS CRUD =====
app.get("/directors", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Directors");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/directors/:id", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Directors WHERE DirectorID = $1",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Director not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/directors", async (req, res) => {
    try {
        const { Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL } =
            req.body;
        const result = await db.query(
            "INSERT INTO Directors (Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            [Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/directors/:id", async (req, res) => {
    try {
        const { Name, Bio, Nationality } = req.body;
        const result = await db.query(
            "UPDATE Directors SET Name=$1, Bio=$2, Nationality=$3 WHERE DirectorID=$4 RETURNING *",
            [Name, Bio, Nationality, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Director not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/directors/:id", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Directors WHERE DirectorID=$1 RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Director not found" });
        res.json({ message: "Director deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== SEASONS CRUD (chỉ cho film type 'tvshow') =====
app.get("/contents/:contentId/seasons", async (req, res) => {
    try {
        // Kiểm tra content có phải tvshow không
        const content = await db.query(
            "SELECT * FROM Content WHERE ContentID=$1 AND Type='tvshow'",
            [req.params.contentId]
        );
        if (content.rows.length === 0)
            return res.status(404).json({ error: "TV Show not found" });

        const result = await db.query(
            "SELECT * FROM Seasons WHERE ContentID=$1",
            [req.params.contentId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/contents/:contentId/seasons/:seasonId", async (req, res) => {
    try {
        const season = await db.query(
            "SELECT * FROM Seasons WHERE SeasonID=$1 AND ContentID=$2",
            [req.params.seasonId, req.params.contentId]
        );
        if (season.rows.length === 0)
            return res.status(404).json({ error: "Season not found" });
        res.json(season.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/contents/:contentId/seasons", async (req, res) => {
    try {
        const content = await db.query(
            "SELECT * FROM Content WHERE ContentID=$1 AND Type='tvshow'",
            [req.params.contentId]
        );
        if (content.rows.length === 0)
            return res.status(404).json({ error: "TV Show not found" });

        const { SeasonNumber, Title, PosterURL, ReleaseDate, EpisodeCount } =
            req.body;
        const result = await db.query(
            "INSERT INTO Seasons (ContentID, SeasonNumber, Title, PosterURL, ReleaseDate, EpisodeCount) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            [
                req.params.contentId,
                SeasonNumber,
                Title,
                PosterURL,
                ReleaseDate,
                EpisodeCount,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/contents/:contentId/seasons/:seasonId", async (req, res) => {
    try {
        const { Title, PosterURL, ReleaseDate, EpisodeCount } = req.body;
        const result = await db.query(
            "UPDATE Seasons SET Title=$1, PosterURL=$2, ReleaseDate=$3, EpisodeCount=$4 WHERE SeasonID=$5 AND ContentID=$6 RETURNING *",
            [
                Title,
                PosterURL,
                ReleaseDate,
                EpisodeCount,
                req.params.seasonId,
                req.params.contentId,
            ]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Season not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/contents/:contentId/seasons/:seasonId", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Seasons WHERE SeasonID=$1 AND ContentID=$2 RETURNING *",
            [req.params.seasonId, req.params.contentId]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Season not found" });
        res.json({ message: "Season deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== EPISODES CRUD (theo season) =====
app.get("/seasons/:seasonId/episodes", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Episodes WHERE SeasonID=$1",
            [req.params.seasonId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/seasons/:seasonId/episodes/:episodeId", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Episodes WHERE EpisodeID=$1 AND SeasonID=$2",
            [req.params.episodeId, req.params.seasonId]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Episode not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/seasons/:seasonId/episodes", async (req, res) => {
    try {
        const {
            EpisodeNumber,
            Title,
            Description,
            Duration,
            VideoURL,
            ThumbnailURL,
            ReleaseDate,
        } = req.body;
        const result = await db.query(
            "INSERT INTO Episodes (SeasonID, EpisodeNumber, Title, Description, Duration, VideoURL, ThumbnailURL, ReleaseDate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
            [
                req.params.seasonId,
                EpisodeNumber,
                Title,
                Description,
                Duration,
                VideoURL,
                ThumbnailURL,
                ReleaseDate,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/seasons/:seasonId/episodes/:episodeId", async (req, res) => {
    try {
        const {
            Title,
            Description,
            Duration,
            VideoURL,
            ThumbnailURL,
            ReleaseDate,
        } = req.body;
        const result = await db.query(
            "UPDATE Episodes SET Title=$1, Description=$2, Duration=$3, VideoURL=$4, ThumbnailURL=$5, ReleaseDate=$6 WHERE EpisodeID=$7 AND SeasonID=$8 RETURNING *",
            [
                Title,
                Description,
                Duration,
                VideoURL,
                ThumbnailURL,
                ReleaseDate,
                req.params.episodeId,
                req.params.seasonId,
            ]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Episode not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/seasons/:seasonId/episodes/:episodeId", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Episodes WHERE EpisodeID=$1 AND SeasonID=$2 RETURNING *",
            [req.params.episodeId, req.params.seasonId]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Episode not found" });
        res.json({ message: "Episode deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});
