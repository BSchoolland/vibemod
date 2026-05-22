import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import StatCard from "./components/StatCard.jsx";
import TrafficChart from "./components/TrafficChart.jsx";
import ChannelChart from "./components/ChannelChart.jsx";
import PagesTable from "./components/PagesTable.jsx";

const PAGE_TITLES = {
  overview: "Overview",
  traffic: "Traffic",
  channels: "Channels",
  pages: "Top Pages",
};

function formatNumber(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default function App() {
  const [activePage, setActivePage] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [channels, setChannels] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [summaryRes, trafficRes, channelsRes, pagesRes] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/traffic"),
        fetch("/api/channels"),
        fetch("/api/pages"),
      ]);
      setSummary(await summaryRes.json());
      setTraffic(await trafficRes.json());
      setChannels(await channelsRes.json());
      setPages(await pagesRes.json());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await fetch("/api/refresh", { method: "POST" });
    await fetchAll();
  }

  useEffect(() => {
    fetchAll();
  }, []);

  function handleStatClick(metric) {
    setActiveMetric(activeMetric === metric ? null : metric);
  }

  if (loading || !summary) {
    return (
      <div className="layout">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <div className="main">
          <Header title="Dashboard" onRefresh={handleRefresh} />
          <div className="main__content">
            <div className="loading-state">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      key: "visitors",
      label: "Total Visitors",
      value: formatNumber(summary.totalVisitors),
      detail: "Last 30 days",
      color: "#6366f1",
    },
    {
      key: "pageViews",
      label: "Page Views",
      value: formatNumber(summary.totalPageViews),
      detail: "Last 30 days",
      color: "#06b6d4",
    },
    {
      key: "sessions",
      label: "Sessions",
      value: formatNumber(summary.totalSessions),
      detail: `Avg. ${summary.avgSessionDuration}`,
      color: "#f59e0b",
    },
    {
      key: "bounceRate",
      label: "Bounce Rate",
      value: `${summary.avgBounceRate}%`,
      detail: `${summary.conversionRate}% conversion`,
      color: "#ef4444",
    },
  ];

  const showStats = activePage === "overview" || activePage === "traffic";
  const showTraffic = activePage === "overview" || activePage === "traffic";
  const showChannels = activePage === "overview" || activePage === "channels";
  const showPages = activePage === "overview" || activePage === "pages";

  return (
    <div className="layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="main">
        <Header title={PAGE_TITLES[activePage]} onRefresh={handleRefresh} />
        <div className="main__content">
          {showStats && (
            <div className="stat-grid">
              {stats.map((s) => (
                <StatCard
                  key={s.key}
                  label={s.label}
                  value={s.value}
                  detail={s.detail}
                  color={s.color}
                  active={activeMetric === s.key}
                  onClick={() => handleStatClick(s.key)}
                />
              ))}
            </div>
          )}

          {showTraffic && (
            <TrafficChart data={traffic} activeMetric={activeMetric} />
          )}

          <div className={`charts-row ${showChannels && showPages ? "" : "charts-row--single"}`}>
            {showChannels && <ChannelChart data={channels} />}
            {showPages && <PagesTable data={pages} />}
          </div>
        </div>
      </div>
    </div>
  );
}
