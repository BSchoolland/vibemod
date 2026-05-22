import { useState } from "react";

export default function PagesTable({ data }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const sorted = [...data].sort((a, b) => b.views - a.views);

  const maxViews = Math.max(...data.map((p) => p.views));

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2 className="chart-card__title">Top Pages</h2>
      </div>
      <div className="pages-table">
        <div className="pages-table__header-row">
          <span className="pages-table__col pages-table__col--page">Page</span>
          <span className="pages-table__col pages-table__col--views">Views</span>
          <span className="pages-table__col pages-table__col--bar" />
        </div>
        {sorted.map((page) => {
          const pct = (page.views / maxViews) * 100;
          const isExpanded = expandedRow === page.path;
          return (
            <div key={page.path}>
              <div
                className={`pages-table__row ${isExpanded ? "pages-table__row--expanded" : ""}`}
                onClick={() => setExpandedRow(isExpanded ? null : page.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setExpandedRow(isExpanded ? null : page.path);
                  }
                }}
              >
                <span className="pages-table__col pages-table__col--page">
                  <span className="pages-table__title">{page.title}</span>
                  <span className="pages-table__path">{page.path}</span>
                </span>
                <span className="pages-table__col pages-table__col--views">
                  {page.views.toLocaleString()}
                </span>
                <span className="pages-table__col pages-table__col--bar">
                  <span className="pages-table__bar">
                    <span
                      className="pages-table__bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </span>
              </div>
              <div className={`pages-table__detail ${isExpanded ? "pages-table__detail--open" : ""}`}>
                <div className="pages-table__detail-inner">
                  <span>Avg. time on page: <strong>{page.avgTime}</strong></span>
                  <span>Path: <strong>{page.path}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
