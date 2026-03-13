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
      <h2 className="logo">HearMe</h2>
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
