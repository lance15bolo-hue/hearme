// src/components/Sidebar.js
import React from "react";
import {
  FaHome, FaMicrophone, FaHeadphones, FaHandPaper,
  FaComment, FaUser, FaWrench, FaCog, FaSun, FaMoon,
} from "react-icons/fa";
import HearMeLogo from "../assets/hearme_logo_4.png";

export default function Sidebar({ user, activePage, setActivePage, theme, toggleTheme }) {
  const menu = [
    { key: "dashboard", icon: <FaHome />,      label: "Dashboard" },
    { key: "captions",  icon: <FaMicrophone />, label: "Captioning" },
    { key: "recorder",  icon: <FaHeadphones />, label: "Recorder" },
    { key: "signbank",  icon: <FaHandPaper />,  label: "Sign Phrase Bank" },
    { key: "community", icon: <FaComment />,    label: "Community" },
    { key: "profile",   icon: <FaUser />,       label: "Profile" },
  ];

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";
  const displayName = user?.email?.split("@")[0] ?? "User";
  const role = user?.role ?? "user";

  return (
    <aside className="sidebar">

      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo-row">
         
          <span className="sidebar-brand-name">HearMe</span>
        </div>
        <p className="sidebar-tagline">
          Breaking Barriers.<br />
          <strong>Building Connections.</strong>
        </p>
      </div>

      {/* ── Nav label ── */}
      <div className="sidebar-nav-label">MAIN MENU</div>

      {/* ── Nav ── */}
      <ul className="sidebar-menu">
        {menu.map((m) => (
          <li
            key={m.key}
            className={activePage === m.key ? "active" : ""}
            onClick={() => setActivePage(m.key)}
          >
            {m.icon}
            <span>{m.label}</span>
          </li>
        ))}

        {user?.role === "admin" && (
          <li
            className={activePage === "admin" ? "active" : ""}
            onClick={() => setActivePage("admin")}
          >
            <FaWrench />
            <span>Admin</span>
          </li>
        )}

        <li
          className={activePage === "settings" ? "active" : ""}
          onClick={() => setActivePage("settings")}
        >
          <FaCog />
          <span>Settings</span>
        </li>
      </ul>

      {/* ── User card ── */}
      <div className="sidebar-user-card">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{displayName}</span>
          <span className="sidebar-user-status">
            <span className="sidebar-online-dot" />
            Online
          </span>
        </div>
        <span className={`sidebar-role-badge role-${role}`}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
      </div>

      {/* ── Theme toggle ── */}
      <button className="sidebar-theme-btn" onClick={toggleTheme}>
        {theme === "dark" ? <FaSun /> : <FaMoon />}
        {theme === "dark" ? "Light Mode" : "Light Mode"}
      </button>

      {/* ── Quote ── */}
      <div className="sidebar-quote">
        "Empowering every voice." 💚<br />Enriching every life."
      </div>

    </aside>
  );
}