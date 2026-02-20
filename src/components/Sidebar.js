// src/components/Sidebar.js
import React from "react";

export default function Sidebar({ user, activePage, setActivePage }) {
  const menu = [
    { key: "dashboard", label: "🏠 Dashboard" },
    { key: "captions", label: "🎤 Captioning" },
    { key: "recorder", label: "🎧 Recorder" },
    { key: "signbank", label: "✋ Sign Phrase Bank" },
    { key: "community", label: "💬 Community" },
    { key: "profile", label: "👤 Profile" },
  ];

  return (
    <aside className="sidebar">
      <h2 className="logo">HearMe</h2>
      <ul>
        {menu.map((m) => (
          <li
            key={m.key}
            className={activePage === m.key ? "active" : ""}
            onClick={() => setActivePage(m.key)}
          >
            {m.label}
          </li>
        ))}

        {user?.role === "admin" && (
          <li
            className={activePage === "admin" ? "active" : ""}
            onClick={() => setActivePage("admin")}
          >
            🛠️ Admin
          </li>
        )}
      </ul>
    </aside>
  );
}
