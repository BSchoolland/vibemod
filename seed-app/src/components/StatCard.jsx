import { useState } from "react";

export default function StatCard({ label, value, detail, color, active, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`stat-card ${active ? "stat-card--active" : ""} ${hovered ? "stat-card--hovered" : ""}`}
      style={{ "--card-accent": color }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <div className="stat-card__accent" />
      <div className="stat-card__content">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {detail && <span className="stat-card__detail">{detail}</span>}
      </div>
    </div>
  );
}
