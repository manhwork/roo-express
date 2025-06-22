const express = require("express");
const { Pool } = require("pg");
const morgan = require("morgan");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const port = 3000;

app.use(morgan("dev"));
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders: "Content-Type, Authorization",
    })
);

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

// ===== USERS CRUD (có phân trang) =====
app.get("/users", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            "SELECT * FROM Users ORDER BY UserID LIMIT $1 OFFSET $2",
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Users");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
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
        // Emit dữ liệu realtime
        emitDashboardData();
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
        // Emit dữ liệu realtime
        emitDashboardData();
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
        // Emit dữ liệu realtime
        emitDashboardData();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== CONTENT CRUD (có phân trang) =====
app.get("/contents", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            "SELECT * FROM Content ORDER BY ContentID LIMIT $1 OFFSET $2",
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Content");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
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
        // Emit dữ liệu realtime
        emitDashboardData();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/contents/:id", async (req, res) => {
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
            `UPDATE Content SET
                Title=$1,
                OriginalTitle=$2,
                Description=$3,
                Type=$4,
                ReleaseDate=$5,
                IMDBRating=$6,
                PosterURL=$7,
                Status=$8,
                Country=$9,
                Language=$10
            WHERE ContentID=$11 RETURNING *`,
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
                req.params.id,
            ]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Content not found" });
        res.json(result.rows[0]);
        // Emit dữ liệu realtime
        emitDashboardData();
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
        // Emit dữ liệu realtime
        emitDashboardData();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ACTORS CRUD (có phân trang) =====
app.get("/actors", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            "SELECT * FROM Actors ORDER BY ActorID LIMIT $1 OFFSET $2",
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Actors");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
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
        const { Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL } =
            req.body;
        const result = await db.query(
            "UPDATE Actors SET Name=$1, OriginalName=$2, Bio=$3, BirthDate=$4, Nationality=$5, PhotoURL=$6 WHERE ActorID=$7 RETURNING *",
            [
                Name,
                OriginalName,
                Bio,
                BirthDate,
                Nationality,
                PhotoURL,
                req.params.id,
            ]
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

// ===== DIRECTORS CRUD (có phân trang) =====
app.get("/directors", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            "SELECT * FROM Directors ORDER BY DirectorID LIMIT $1 OFFSET $2",
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Directors");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
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
        const { Name, OriginalName, Bio, BirthDate, Nationality, PhotoURL } =
            req.body;
        const result = await db.query(
            "UPDATE Directors SET Name=$1, OriginalName=$2, Bio=$3, BirthDate=$4, Nationality=$5, PhotoURL=$6 WHERE DirectorID=$7 RETURNING *",
            [
                Name,
                OriginalName,
                Bio,
                BirthDate,
                Nationality,
                PhotoURL,
                req.params.id,
            ]
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
        const { SeasonNumber, Title, PosterURL, ReleaseDate, EpisodeCount } =
            req.body;
        const result = await db.query(
            "UPDATE Seasons SET SeasonNumber=$1, Title=$2, PosterURL=$3, ReleaseDate=$4, EpisodeCount=$5 WHERE SeasonID=$6 AND ContentID=$7 RETURNING *",
            [
                SeasonNumber,
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
            EpisodeNumber, // <-- phải có trường này
            Title,
            Description,
            Duration,
            VideoURL,
            ThumbnailURL,
            ReleaseDate,
            ViewCount,
        } = req.body;
        const result = await db.query(
            `UPDATE Episodes SET
                EpisodeNumber=$1,
                Title=$2,
                Description=$3,
                Duration=$4,
                VideoURL=$5,
                ThumbnailURL=$6,
                ReleaseDate=$7,
                ViewCount=$8
            WHERE EpisodeID=$9 AND SeasonID=$10 RETURNING *`,
            [
                EpisodeNumber,
                Title,
                Description,
                Duration,
                VideoURL,
                ThumbnailURL,
                ReleaseDate,
                ViewCount,
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

// ===== GENRES CRUD (có phân trang) =====
app.get("/genres", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            "SELECT * FROM Genres ORDER BY GenreID LIMIT $1 OFFSET $2",
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Genres");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/genres/:id", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Genres WHERE GenreID = $1",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Genre not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/genres", async (req, res) => {
    try {
        const { GenreName, Description } = req.body;
        const result = await db.query(
            "INSERT INTO Genres (GenreName, Description) VALUES ($1, $2) RETURNING *",
            [GenreName, Description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/genres/:id", async (req, res) => {
    try {
        const { GenreName, Description } = req.body;
        const result = await db.query(
            "UPDATE Genres SET GenreName=$1, Description=$2 WHERE GenreID=$3 RETURNING *",
            [GenreName, Description, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Genre not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/genres/:id", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM Genres WHERE GenreID=$1 RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Genre not found" });
        res.json({ message: "Genre deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lấy toàn bộ reviews (có phân trang)
app.get("/reviews", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            `SELECT r.*, u.Username, u.Avatar, c.Title AS ContentTitle
             FROM Reviews r
             JOIN Users u ON r.UserID = u.UserID
             JOIN Content c ON r.ContentID = c.ContentID
             ORDER BY r.ReviewDate DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Reviews");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lấy toàn bộ comments (có phân trang)
app.get("/comments", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const data = await db.query(
            `SELECT c.*, u.Username, u.Avatar, ct.Title AS ContentTitle
             FROM Comments c
             JOIN Users u ON c.UserID = u.UserID
             JOIN Content ct ON c.ContentID = ct.ContentID
             ORDER BY c.CommentDate DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        const total = await db.query("SELECT COUNT(*) FROM Comments");
        res.json({
            data: data.rows,
            total: parseInt(total.rows[0].count),
            page,
            limit,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================== DASHBOARD & BIỂU ĐỒ (DW) ==================

// Tổng số phim (movie + episode)
app.get("/dw/summary/contents", async (req, res) => {
    try {
        const result = await db.query("SELECT COUNT(*) FROM Content  ");
        res.json({
            totalMovies: parseInt(result.rows[0].count),
            totalEpisodes: 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tổng số user hoạt động
app.get("/dw/summary/users", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT COUNT(*) FROM Users WHERE IsActive = TRUE"
        );
        console.log(result.rows);
        res.json({ totalUsers: parseInt(result.rows[0].count) });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Tổng lượt xem
app.get("/dw/summary/views", async (req, res) => {
    try {
        const result = await dw.query(
            "SELECT SUM(ViewCount) as totalViews FROM FactContentViews"
        );
        res.json({ totalViews: parseInt(result.rows[0].totalviews) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lượt xem theo tháng
app.get("/dw/views/month", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.Month, dd.Year, SUM(fcv.ViewCount) as views
            FROM FactContentViews fcv
            JOIN DimDate dd ON fcv.DateKey = dd.DateKey
            GROUP BY dd.Year, dd.Month
            ORDER BY dd.Year, dd.Month
        `);

        console.log(result.rows);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lượt xem theo ngày (30 ngày gần nhất)
app.get("/dw/views/day", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.Date, SUM(fcv.ViewCount) as views
            FROM FactContentViews fcv
            JOIN DimDate dd ON fcv.DateKey = dd.DateKey
            GROUP BY dd.Date
            ORDER BY dd.Date DESC
            LIMIT 30
        `);
        res.json(result.rows.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lượt xem theo năm
app.get("/dw/views/year", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.Year, SUM(fcv.ViewCount) as views
            FROM FactContentViews fcv
            JOIN DimDate dd ON fcv.DateKey = dd.DateKey
            GROUP BY dd.Year
            ORDER BY dd.Year
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lượt xem theo thể loại
app.get("/dw/views/genre", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dg.GenreName, SUM(fcp.TotalViews) as views
            FROM FactContentPerformance fcp
            JOIN DimGenre dg ON fcp.GenreKey = dg.GenreKey
            GROUP BY dg.GenreName
            ORDER BY views DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Top phim được xem nhiều nhất
app.get("/dw/top-content/views", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dc.Title, SUM(fcp.TotalViews) as views
            FROM FactContentPerformance fcp
            JOIN DimContent dc ON fcp.ContentKey = dc.ContentKey
            WHERE dc.IsCurrent = TRUE
            GROUP BY dc.Title
            ORDER BY views DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Top phim có điểm đánh giá cao nhất
app.get("/dw/top-content/rating", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dc.Title, AVG(fcp.AverageRating) as rating
            FROM FactContentPerformance fcp
            JOIN DimContent dc ON fcp.ContentKey = dc.ContentKey
            WHERE dc.IsCurrent = TRUE
            GROUP BY dc.Title
            ORDER BY rating DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Top user xem nhiều nhất
app.get("/dw/top-users", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT du.Username, SUM(fcv.ViewCount) as views
            FROM FactContentViews fcv
            JOIN DimUser du ON fcv.UserKey = du.UserKey
            GROUP BY du.Username
            ORDER BY views DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Điểm đánh giá trung bình theo tháng
app.get("/dw/ratings/month", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.Month, dd.Year, AVG(fcp.AverageRating) as avg_rating
            FROM FactContentPerformance fcp
            JOIN DimDate dd ON fcp.DateKey = dd.DateKey
            GROUP BY dd.Year, dd.Month
            ORDER BY dd.Year, dd.Month
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Phổ điểm đánh giá
app.get("/dw/ratings/distribution", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT ROUND(AverageRating) as rating_bin, COUNT(*) as count
            FROM FactContentPerformance
            GROUP BY rating_bin
            ORDER BY rating_bin
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Phân loại tương tác
app.get("/dw/engagement/type", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT EngagementType, COUNT(*) as count
            FROM FactUserEngagement
            GROUP BY EngagementType
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tổng số lượt like/comment theo ngày
app.get("/dw/engagement/timeline", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.Date, 
                SUM(CASE WHEN EngagementType = 'Like' THEN 1 ELSE 0 END) as likes,
                SUM(CASE WHEN EngagementType = 'Comment' THEN 1 ELSE 0 END) as comments,
                SUM(CASE WHEN EngagementType = 'Review' THEN 1 ELSE 0 END) as reviews
            FROM FactUserEngagement fue
            JOIN DimDate dd ON fue.DateKey = dd.DateKey
            GROUP BY dd.Date
            ORDER BY dd.Date
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Phân bổ thiết bị
app.get("/dw/device/distribution", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT DeviceType, COUNT(*) as count
            FROM DimDevice
            GROUP BY DeviceType
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Phân bố người dùng theo tỉnh thành
app.get("/dw/user/location", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT City, COUNT(*) as user_count
            FROM DimLocation
            GROUP BY City
            ORDER BY user_count DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hành vi người dùng theo thời gian trong ngày
app.get("/dw/user/activity-heatmap", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.DayName, dt.Hour, SUM(fua.ActivityCount) as activity
            FROM FactUserActivity fua
            JOIN DimDate dd ON fua.DateKey = dd.DateKey
            JOIN DimTime dt ON fua.TimeKey = dt.TimeKey
            GROUP BY dd.DayName, dt.Hour
            ORDER BY dd.DayName, dt.Hour
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Top nội dung được yêu thích nhiều nhất (theo lượt thích)
app.get("/dw/top-content/likes", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dc.Title, SUM(fue.LikeCount) as likes
            FROM FactUserEngagement fue
            JOIN DimContent dc ON fue.ContentKey = dc.ContentKey
            WHERE fue.EngagementType = 'Like'
            GROUP BY dc.Title
            ORDER BY likes DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/dw/top-countries", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dc.Country, SUM(fcp.TotalViews) as views
            FROM FactContentPerformance fcp
            JOIN DimContent dc ON fcp.ContentKey = dc.ContentKey
            WHERE dc.Country IS NOT NULL
            GROUP BY dc.Country
            ORDER BY views DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/dw/avg-watchtime-user", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT du.Username, ROUND(AVG(fcv.DurationWatched)/60) as avg_minutes
            FROM FactContentViews fcv
            JOIN DimUser du ON fcv.UserKey = du.UserKey
            GROUP BY du.Username
            ORDER BY avg_minutes DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lượt xem theo mùa
app.get("/dw/views/season", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT dd.Quarter as season, dd.Year, SUM(fcv.ViewCount) as views
            FROM FactContentViews fcv
            JOIN DimDate dd ON fcv.DateKey = dd.DateKey
            GROUP BY dd.Year, dd.Quarter
            ORDER BY dd.Year, dd.Quarter
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/dw/popular-browsers", async (req, res) => {
    try {
        const result = await dw.query(`
            SELECT Browser, COUNT(*) as count
            FROM DimDevice
            WHERE Browser IS NOT NULL
            GROUP BY Browser
            ORDER BY count DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== TEST ENDPOINT FOR REALTIME =====
app.post("/test/realtime", async (req, res) => {
    try {
        // Simulate data change
        console.log("Test realtime update triggered");
        await emitDashboardData();
        res.json({ message: "Realtime update triggered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== SOCKET.IO REALTIME FUNCTIONS =====
let isEmittingData = false; // Flag để tránh trùng lặp request
let emitTimeout = null; // Timeout để debounce

// Hàm emit dữ liệu dashboard realtime
async function emitDashboardData() {
    // Nếu đang emit thì bỏ qua
    if (isEmittingData) {
        console.log("Dashboard data emission already in progress, skipping...");
        return;
    }

    // Clear timeout cũ nếu có
    if (emitTimeout) {
        clearTimeout(emitTimeout);
    }

    // Debounce: đợi 1 giây trước khi thực hiện
    emitTimeout = setTimeout(async () => {
        try {
            isEmittingData = true;
            console.log("Starting dashboard data emission...");

            const [
                monthlyViewsRes,
                last30DaysViewsRes,
                topMoviesRes,
                topRatedMoviesRes,
                topLikedMoviesRes,
                genreViewsRes,
                ratingStatsRes,
                topUsersRes,
                avgWatchtimeRes,
                engagementTypeRes,
                deviceTypeRes,
                browsersRes,
                timelineRes,
                heatmapRes,
                topCountriesRes,
                userLocationRes,
                summaryContentsRes,
                summaryUsersRes,
                summaryViewsRes,
            ] = await Promise.all([
                dw.query(`
                    SELECT dd.Month, dd.Year, SUM(fcv.ViewCount) as views
                    FROM FactContentViews fcv
                    JOIN DimDate dd ON fcv.DateKey = dd.DateKey
                    GROUP BY dd.Year, dd.Month
                    ORDER BY dd.Year, dd.Month
                `),
                dw.query(`
                    SELECT dd.Date, SUM(fcv.ViewCount) as views
                    FROM FactContentViews fcv
                    JOIN DimDate dd ON fcv.DateKey = dd.DateKey
                    GROUP BY dd.Date
                    ORDER BY dd.Date DESC
                    LIMIT 30
                `),
                dw.query(`
                    SELECT dc.Title, SUM(fcp.TotalViews) as views
                    FROM FactContentPerformance fcp
                    JOIN DimContent dc ON fcp.ContentKey = dc.ContentKey
                    WHERE dc.IsCurrent = TRUE
                    GROUP BY dc.Title
                    ORDER BY views DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT dc.Title, AVG(fcp.AverageRating) as rating
                    FROM FactContentPerformance fcp
                    JOIN DimContent dc ON fcp.ContentKey = dc.ContentKey
                    WHERE dc.IsCurrent = TRUE
                    GROUP BY dc.Title
                    ORDER BY rating DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT dc.Title, SUM(fue.LikeCount) as likes
                    FROM FactUserEngagement fue
                    JOIN DimContent dc ON fue.ContentKey = dc.ContentKey
                    WHERE fue.EngagementType = 'Like'
                    GROUP BY dc.Title
                    ORDER BY likes DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT dg.GenreName, SUM(fcp.TotalViews) as views
                    FROM FactContentPerformance fcp
                    JOIN DimGenre dg ON fcp.GenreKey = dg.GenreKey
                    GROUP BY dg.GenreName
                    ORDER BY views DESC
                `),
                dw.query(`
                    SELECT ROUND(AverageRating) as rating_bin, COUNT(*) as count
                    FROM FactContentPerformance
                    GROUP BY rating_bin
                    ORDER BY rating_bin
                `),
                dw.query(`
                    SELECT du.Username, SUM(fcv.ViewCount) as views
                    FROM FactContentViews fcv
                    JOIN DimUser du ON fcv.UserKey = du.UserKey
                    GROUP BY du.Username
                    ORDER BY views DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT du.Username, ROUND(AVG(fcv.DurationWatched)/60) as avg_minutes
                    FROM FactContentViews fcv
                    JOIN DimUser du ON fcv.UserKey = du.UserKey
                    GROUP BY du.Username
                    ORDER BY avg_minutes DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT EngagementType, COUNT(*) as count
                    FROM FactUserEngagement
                    GROUP BY EngagementType
                `),
                dw.query(`
                    SELECT DeviceType, COUNT(*) as count
                    FROM DimDevice
                    GROUP BY DeviceType
                `),
                dw.query(`
                    SELECT Browser, COUNT(*) as count
                    FROM DimDevice
                    WHERE Browser IS NOT NULL
                    GROUP BY Browser
                    ORDER BY count DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT dd.Date, 
                        SUM(CASE WHEN EngagementType = 'Like' THEN 1 ELSE 0 END) as likes,
                        SUM(CASE WHEN EngagementType = 'Comment' THEN 1 ELSE 0 END) as comments,
                        SUM(CASE WHEN EngagementType = 'Review' THEN 1 ELSE 0 END) as reviews
                    FROM FactUserEngagement fue
                    JOIN DimDate dd ON fue.DateKey = dd.DateKey
                    GROUP BY dd.Date
                    ORDER BY dd.Date
                `),
                dw.query(`
                    SELECT dd.DayName, dt.Hour, SUM(fua.ActivityCount) as activity
                    FROM FactUserActivity fua
                    JOIN DimDate dd ON fua.DateKey = dd.DateKey
                    JOIN DimTime dt ON fua.TimeKey = dt.TimeKey
                    GROUP BY dd.DayName, dt.Hour
                    ORDER BY dd.DayName, dt.Hour
                `),
                dw.query(`
                    SELECT dc.Country, SUM(fcp.TotalViews) as views
                    FROM FactContentPerformance fcp
                    JOIN DimContent dc ON fcp.ContentKey = dc.ContentKey
                    WHERE dc.Country IS NOT NULL
                    GROUP BY dc.Country
                    ORDER BY views DESC
                    LIMIT 10
                `),
                dw.query(`
                    SELECT City, COUNT(*) as user_count
                    FROM DimLocation
                    GROUP BY City
                    ORDER BY user_count DESC
                `),
                db.query("SELECT COUNT(*) FROM Content"),
                db.query("SELECT COUNT(*) FROM Users WHERE IsActive = TRUE"),
                dw.query(
                    "SELECT SUM(ViewCount) as totalViews FROM FactContentViews"
                ),
            ]);

            const dashboardData = {
                monthlyViews: monthlyViewsRes.rows,
                last30DaysViews: last30DaysViewsRes.rows.reverse(),
                topMovies: topMoviesRes.rows,
                topRatedMovies: topRatedMoviesRes.rows,
                topLikedMovies: topLikedMoviesRes.rows,
                genreViews: genreViewsRes.rows,
                ratingStats: ratingStatsRes.rows,
                topUsers: topUsersRes.rows,
                avgWatchtime: avgWatchtimeRes.rows,
                engagementType: engagementTypeRes.rows,
                deviceType: deviceTypeRes.rows,
                browsers: browsersRes.rows,
                timeline: timelineRes.rows,
                heatmap: heatmapRes.rows,
                topCountries: topCountriesRes.rows,
                userLocation: userLocationRes.rows,
                summary: {
                    totalMovies: parseInt(summaryContentsRes.rows[0].count),
                    totalUsers: parseInt(summaryUsersRes.rows[0].count),
                    totalViews: parseInt(
                        summaryViewsRes.rows[0].totalviews || 0
                    ),
                },
            };

            io.emit("dashboard:update", dashboardData);
            console.log("Dashboard data emission completed successfully");
        } catch (error) {
            console.error("Error emitting dashboard data:", error);
        } finally {
            isEmittingData = false;
        }
    }, 1000); // Debounce 1 giây
}

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Emit dữ liệu ban đầu khi client kết nối
    emitDashboardData();

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });

    // Client có thể request dữ liệu mới
    socket.on("dashboard:request-update", () => {
        console.log(`Client ${socket.id} requested dashboard update`);
        emitDashboardData();
    });

    // Thêm event để client có thể kiểm tra trạng thái server
    socket.on("dashboard:status", () => {
        socket.emit("dashboard:status", {
            isEmittingData,
            connectedClients: io.engine.clientsCount,
            timestamp: new Date().toISOString(),
        });
    });
});

server.listen(port, () => {
    console.log(`App running on port ${port}.`);
});
