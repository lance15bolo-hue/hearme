// src/components/Sidebar.js
import React from "react";
import { FaHome, FaMicrophone, FaHeadphones, FaHandPaper, FaComment, FaUser, FaWrench } from 'react-icons/fa';

export default function Sidebar({ user, activePage, setActivePage }) {
  const menu = [
    { key: "dashboard", icon: <FaHome />, label: "Dashboard" },
    { key: "captions", icon: <FaMicrophone />, label: "Captioning" },
    { key: "recorder", icon: <FaHeadphones />, label: "Recorder" },
    { key: "signbank", icon: <FaHandPaper />, label: "Sign Phrase Bank" },
    { key: "community", icon: <FaComment />, label: "Community" },
    { key: "profile", icon: <FaUser />, label: "Profile" },
  ];

  return (
    <aside className="sidebar">
      <h2
  className="logo"
  style={{
    fontSize: "3.2rem",
    fontWeight: "1000",
    letterSpacing: "1.2px",
    margin: "12px 0 20px",
    textAlign: "center",
    color: "#fff",
    textShadow: "0 6px 18px rgba(0,0,0,0.35)"
  }}
>
  HearMe
</h2>
      <ul>
        {menu.map((m) => (
          <li
            key={m.key}
            className={activePage === m.key ? "active" : ""}
            onClick={() => setActivePage(m.key)}
          >
            {m.icon} {m.label}
          </li>
        ))}

        {user?.role === "admin" && (
          <li
            className={activePage === "admin" ? "active" : ""}
            onClick={() => setActivePage("admin")}
          >
            <FaWrench /> Admin
          </li>
        )}
      </ul>
    </aside>
  );
}
