require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

/* ================= ROOT / HEALTH ROUTES ================= */

app.get("/", (req, res) => {
  res.send("Smart Task Manager Backend Running Successfully 🚀");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend API Working Successfully 🚀" });
});

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

/* ================= 404 HANDLER ================= */

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ================= CENTRALIZED ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("MongoDB Connected ✅");
  })
  .catch((err) => {
    console.error("MongoDB error ❌", err.message);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});