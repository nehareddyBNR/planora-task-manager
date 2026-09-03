const express = require("express");

const Task = require("../models/Task");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* ================= CREATE TASK ================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, deadline, difficulty, priority } = req.body;

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const task = new Task({
      userId: req.user.id,
      title,
      description,
      deadline,
      difficulty,
      priority,
      status: "pending",
    });

    await task.save();

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to create task" });
  }
});

/* ================= GET TASKS ================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { userId: req.user.id };

    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

/* ================= COMPLETE TASK ================= */
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: "completed" },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task" });
  }
});

/* ================= DELETE TASK ================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

module.exports = router;