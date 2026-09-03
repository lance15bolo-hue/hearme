import React, { useState } from "react";

import {
  FaHome,
  FaMicrophone,
  FaHeadphones,
  FaHandPaper,
  FaComment,
  FaUser,
  FaHistory,
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


  const isGuest =
    user?.role === "guest";


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

    // Only logged-in users
    ...(!isGuest
      ? [
          {
            key: "profile",
            icon: <FaUser />,
            label: "Profile",
          },
          {
            key: "history",
            icon: <FaHistory />,
            label: "History",
          },
        ]
      : []),
  ];


  const initials =
    user?.displayName
      ? user.displayName[0].toUpperCase()
      : user?.email?.[0]?.toUpperCase() || "G";


  const displayName =
    user?.displayName ||
    (isGuest
      ? "Guest User"
      : user?.email?.split("@")[0] || "User");


  const role =
    user?.role || "user";


  const handlePageChange = (page) => {

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



      <div className="sidebar-mobile-content">


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



        <div className="sidebar-nav-label">
          MAIN MENU
        </div>



        <ul className="sidebar-menu">


          {menu.map((item) => (

            <li
              key={item.key}
              className={
                activePage === item.key
                  ? "active"
                  : ""
              }
              onClick={() =>
                handlePageChange(item.key)
              }
            >

              {item.icon}

              <span>
                {item.label}
              </span>

            </li>

          ))}



          {user?.role === "admin" && (

            <li
              className={
                activePage === "admin"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handlePageChange("admin")
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
              activePage === "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              handlePageChange("settings")
            }
          >

            <FaCog />

            <span>
              Settings
            </span>

          </li>


        </ul>




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

            {
              role
                .charAt(0)
                .toUpperCase() +
              role.slice(1)
            }

          </span>



        </div>




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



        <div className="sidebar-quote">

          "Empowering every voice." 💚
          <br />
          Enriching every life.

        </div>



      </div>


    </aside>
  );
}