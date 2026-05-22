import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = join(__dirname, "data.json");

app.use(cors());
app.use(express.json());

// --- Data helpers ---

function readData() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ habits: [] }, null, 2));
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- API routes ---

// Get all habits
app.get("/api/habits", (_req, res) => {
  const data = readData();
  res.json(data.habits);
});

// Create a new habit
app.post("/api/habits", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Habit name is required" });
  }

  const data = readData();
  const habit = {
    id: Date.now().toString(),
    name: name.trim(),
    completions: [], // array of date strings like "2025-01-15"
    createdAt: new Date().toISOString(),
  };
  data.habits.push(habit);
  writeData(data);
  res.status(201).json(habit);
});

// Update a habit (toggle completion for a date)
app.put("/api/habits/:id", (req, res) => {
  const { id } = req.params;
  const { date } = req.body; // date string like "2025-01-15"

  const data = readData();
  const habit = data.habits.find((h) => h.id === id);
  if (!habit) {
    return res.status(404).json({ error: "Habit not found" });
  }

  const today = date || new Date().toISOString().split("T")[0];
  const index = habit.completions.indexOf(today);
  if (index === -1) {
    habit.completions.push(today);
  } else {
    habit.completions.splice(index, 1);
  }

  writeData(data);
  res.json(habit);
});

// Delete a habit
app.delete("/api/habits/:id", (req, res) => {
  const { id } = req.params;
  const data = readData();
  const index = data.habits.findIndex((h) => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Habit not found" });
  }
  data.habits.splice(index, 1);
  writeData(data);
  res.status(204).send();
});

// --- Serve frontend in production ---

if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
