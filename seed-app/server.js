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

// --- Seed data generator ---

function generateSeedData() {
  const now = new Date();
  const channels = ["Organic", "Direct", "Referral", "Social", "Email"];

  // Generate 30 days of traffic data
  const traffic = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Base values with some weekly seasonality and upward trend
    const dayOfWeek = date.getDay();
    const weekendDip = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;
    const trendMultiplier = 1 + (30 - i) * 0.01;
    const base = Math.round(800 * weekendDip * trendMultiplier + (Math.random() - 0.5) * 200);

    traffic.push({
      date: dateStr,
      visitors: base,
      pageViews: Math.round(base * (2.2 + Math.random() * 0.6)),
      sessions: Math.round(base * (1.1 + Math.random() * 0.3)),
      bounceRate: Math.round((35 + Math.random() * 20) * 10) / 10,
    });
  }

  // Channel breakdown
  const channelData = channels.map((name) => {
    const visitors = Math.round(300 + Math.random() * 700);
    return {
      name,
      visitors,
      conversions: Math.round(visitors * (0.02 + Math.random() * 0.06)),
      revenue: Math.round(visitors * (1.5 + Math.random() * 3) * 100) / 100,
    };
  });

  // Top pages
  const pages = [
    { path: "/", title: "Home", views: 4521, avgTime: "2:34" },
    { path: "/pricing", title: "Pricing", views: 2103, avgTime: "3:12" },
    { path: "/features", title: "Features", views: 1847, avgTime: "1:58" },
    { path: "/blog/getting-started", title: "Getting Started Guide", views: 1392, avgTime: "4:45" },
    { path: "/docs", title: "Documentation", views: 1205, avgTime: "5:21" },
    { path: "/about", title: "About Us", views: 876, avgTime: "1:42" },
    { path: "/contact", title: "Contact", views: 654, avgTime: "1:15" },
    { path: "/blog/tips", title: "10 Pro Tips", views: 543, avgTime: "3:38" },
  ];

  // Summary stats
  const totalVisitors = traffic.reduce((sum, d) => sum + d.visitors, 0);
  const totalPageViews = traffic.reduce((sum, d) => sum + d.pageViews, 0);
  const avgBounce = Math.round((traffic.reduce((sum, d) => sum + d.bounceRate, 0) / traffic.length) * 10) / 10;
  const totalSessions = traffic.reduce((sum, d) => sum + d.sessions, 0);

  return {
    summary: {
      totalVisitors,
      totalPageViews,
      totalSessions,
      avgBounceRate: avgBounce,
      conversionRate: 3.2,
      avgSessionDuration: "2:47",
    },
    traffic,
    channels: channelData,
    pages,
  };
}

// --- Data helpers ---

function readData() {
  if (!existsSync(DATA_FILE)) {
    const seed = generateSeedData();
    writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
}

// --- API routes ---

// Get dashboard summary
app.get("/api/summary", (_req, res) => {
  const data = readData();
  res.json(data.summary);
});

// Get traffic data (with optional range)
app.get("/api/traffic", (req, res) => {
  const data = readData();
  const days = parseInt(req.query.days) || 30;
  const traffic = data.traffic.slice(-days);
  res.json(traffic);
});

// Get channel breakdown
app.get("/api/channels", (_req, res) => {
  const data = readData();
  res.json(data.channels);
});

// Get top pages
app.get("/api/pages", (_req, res) => {
  const data = readData();
  res.json(data.pages);
});

// Regenerate data (useful for demo)
app.post("/api/refresh", (_req, res) => {
  const seed = generateSeedData();
  writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  res.json({ ok: true });
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
