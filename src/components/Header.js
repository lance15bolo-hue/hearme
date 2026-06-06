import React from "react";

export default function Header({ handleLogout }) {
  return (
    <header className="header" style={{ justifyContent: "flex-end" }}>
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
}