import React, { useState } from "react";

import {
  FaHome,
  FaMicrophone,
  FaHeadphones,
  FaHandPaper,
  FaComment,
  FaUser,
  FaWrench,
  FaCog,
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import "./SidebarMobile.css";

export default function Sidebar({
  user,
  activePage,
  setActivePage,
  theme,
  toggleTheme,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const menu = [
    {
      key: "dashboard",
      icon: <FaHome />,
      label: "Dashboard",
    },
    {
      key: "captions",
      icon: <FaMicrophone />,
      label: "Captioning",
    },
    {
      key: "recorder",
      icon: <FaHeadphones />,
      label: "Recorder",
    },
    {
      key: "signbank",
      icon: <FaHandPaper />,
      label: "Sign Phrase Bank",
    },
    {
      key: "community",
      icon: <FaComment />,
      label: "Community",
    },
    {
      key: "profile",
      icon: <FaUser />,
      label: "Profile",
    },
  ];

  const initials =
    user?.email?.[0]?.toUpperCase() ??
    "U";

  const displayName =
    user?.email?.split("@")[0] ??
    "User";

  const role =
    user?.role ?? "user";

  const handlePageChange = (
    page
  ) => {
    setActivePage(page);

    setMobileMenuOpen(false);
  };

  return (
    <aside
      className={
        mobileMenuOpen
          ? "sidebar mobile-menu-open"
          : "sidebar"
      }
    >
      {/* MOBILE HEADER */}
      <div className="sidebar-mobile-header">

        <div className="sidebar-mobile-brand">
          HearMe
        </div>

        <button
          type="button"
          className="sidebar-mobile-toggle"
          onClick={() =>
            setMobileMenuOpen(
              (previous) => !previous
            )
          }
          aria-label={
            mobileMenuOpen
              ? "Close menu"
              : "Open menu"
          }
        >
          {mobileMenuOpen ? (
            <FaTimes />
          ) : (
            <FaBars />
          )}
        </button>

      </div>

      {/* COLLAPSIBLE CONTENT */}
      <div className="sidebar-mobile-content">

        {/* BRAND */}
        <div className="sidebar-brand">

          <div className="sidebar-brand-logo-row">

            <span className="sidebar-brand-name">
              HearMe
            </span>

          </div>

          <p className="sidebar-tagline">
            Breaking Barriers.
            <br />

            <strong>
              Building Connections.
            </strong>
          </p>

        </div>

        {/* NAV LABEL */}
        <div className="sidebar-nav-label">
          MAIN MENU
        </div>

        {/* NAVIGATION */}
        <ul className="sidebar-menu">

          {menu.map((item) => (
            <li
              key={item.key}
              className={
                activePage ===
                item.key
                  ? "active"
                  : ""
              }
              onClick={() =>
                handlePageChange(
                  item.key
                )
              }
            >
              {item.icon}

              <span>
                {item.label}
              </span>
            </li>
          ))}

          {user?.role ===
            "admin" && (
            <li
              className={
                activePage ===
                "admin"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handlePageChange(
                  "admin"
                )
              }
            >
              <FaWrench />

              <span>
                Admin
              </span>
            </li>
          )}

          <li
            className={
              activePage ===
              "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              handlePageChange(
                "settings"
              )
            }
          >
            <FaCog />

            <span>
              Settings
            </span>
          </li>

        </ul>

        {/* USER CARD */}
        <div className="sidebar-user-card">

          <div className="sidebar-user-avatar">
            {initials}
          </div>

          <div className="sidebar-user-info">

            <span className="sidebar-user-name">
              {displayName}
            </span>

            <span className="sidebar-user-status">

              <span className="sidebar-online-dot" />

              Online

            </span>

          </div>

          <span
            className={`sidebar-role-badge role-${role}`}
          >
            {role
              .charAt(0)
              .toUpperCase() +
              role.slice(1)}
          </span>

        </div>

        {/* THEME */}
        <button
          className="sidebar-theme-btn"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <FaSun />
          ) : (
            <FaMoon />
          )}

          {theme === "dark"
            ? "Light Mode"
            : "Dark Mode"}
        </button>

        {/* QUOTE */}
        <div className="sidebar-quote">
          "Empowering every voice." 💚
          <br />
          Enriching every life.
        </div>

      </div>
    </aside>
  );
}