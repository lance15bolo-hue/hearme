import React from "react";

export default function Header({ handleLogout }) {
  return (
    <header className="header">
      <h1>HearMe Dashboard</h1>
      <button className="logout-btn" onClick={handleLogout}>
        🚪 Logout
      </button>
    </header>
  );
}