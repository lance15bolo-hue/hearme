// src/components/Settings.js
import React from "react";
import { FaCog, FaMoon, FaSun, FaPalette } from "react-icons/fa";

export default function Settings({ theme, toggleTheme }) {
  const isDark = theme === "dark";

  return (
    <section className="settings-page">
      <div className="settings-hero">
        <div>
          <span className="settings-pill">
            <FaCog /> Settings
          </span>

          <h1>Customize HearMe</h1>

          <p>
            Manage your display preference and personalize how your dashboard
            looks while using HearMe.
          </p>
        </div>

        <div className="settings-icon-large">
          {isDark ? <FaMoon /> : <FaSun />}
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-icon">
            {isDark ? <FaMoon /> : <FaSun />}
          </div>

          <div className="settings-card-content">
            <h2>Appearance</h2>
            <p>Switch between light mode and dark mode.</p>
          </div>

          <button
            className={`theme-switch ${isDark ? "active" : ""}`}
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            <span></span>
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon">
            <FaPalette />
          </div>

          <div className="settings-card-content">
            <h2>Current Theme</h2>
            <p>{isDark ? "Dark mode is currently enabled." : "Light mode is currently enabled."}</p>
          </div>

          <div className="theme-status-badge">
            {isDark ? "Dark" : "Light"}
          </div>
        </div>
      </div>
    </section>
  );
}