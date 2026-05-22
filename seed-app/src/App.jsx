import { useState, useEffect } from "react";

const API_BASE = "/api/habits";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function calculateStreak(completions) {
  if (!completions || completions.length === 0) return 0;

  const sorted = [...completions].sort().reverse();
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday to be active
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i - 1]);
    const prev = new Date(sorted[i]);
    const diffDays = (current - prev) / 86400000;
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHabits();
  }, []);

  async function fetchHabits() {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setHabits(data);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addHabit(e) {
    e.preventDefault();
    if (!newHabit.trim()) return;

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHabit }),
      });
      const habit = await res.json();
      setHabits([...habits, habit]);
      setNewHabit("");
    } catch (err) {
      console.error("Failed to add habit:", err);
    }
  }

  async function toggleHabit(id) {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: getToday() }),
      });
      const updated = await res.json();
      setHabits(habits.map((h) => (h.id === id ? updated : h)));
    } catch (err) {
      console.error("Failed to toggle habit:", err);
    }
  }

  async function deleteHabit(id) {
    try {
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      setHabits(habits.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete habit:", err);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <h1>Habit Tracker</h1>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  const today = getToday();

  return (
    <div className="app">
      <h1>Habit Tracker</h1>

      <form className="add-form" onSubmit={addHabit}>
        <input
          type="text"
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="Add a new habit..."
        />
        <button type="submit">Add</button>
      </form>

      {habits.length === 0 ? (
        <p className="empty-state">
          No habits yet. Add one above to get started!
        </p>
      ) : (
        <ul className="habit-list">
          {habits.map((habit) => {
            const isCompletedToday = habit.completions.includes(today);
            const streak = calculateStreak(habit.completions);

            return (
              <li key={habit.id} className="habit-item">
                <div
                  className={`habit-checkbox ${isCompletedToday ? "checked" : ""}`}
                  onClick={() => toggleHabit(habit.id)}
                  role="checkbox"
                  aria-checked={isCompletedToday}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleHabit(habit.id);
                  }}
                />
                <div className="habit-info">
                  <div className={`habit-name ${isCompletedToday ? "completed" : ""}`}>
                    {habit.name}
                  </div>
                  <div className={`habit-streak ${streak > 0 ? "active" : ""}`}>
                    {streak > 0 ? `${streak} day streak` : "No streak"}
                  </div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => deleteHabit(habit.id)}
                  title="Delete habit"
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
