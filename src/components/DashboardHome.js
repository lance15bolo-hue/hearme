import React, { useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneAlt,
  FaComment,
  FaHandPaper,
  FaSignLanguage,
  FaArrowRight,
  FaBullhorn,
  FaRocket,
  FaUsers,
  FaClock,
} from "react-icons/fa";

export default function DashboardHome({ setActivePage, onNavigate }) {
  const [showUpdate, setShowUpdate] = useState(true);

  const navigate = (page) => {
    if (typeof setActivePage === "function") {
      setActivePage(page);
    } else if (typeof onNavigate === "function") {
      onNavigate(page);
    } else {
      console.log("Navigate to", page);
    }
  };

  const features = [
    {
      title: "Captions",
      text: "Convert speech to text instantly and translate it in real-time.",
      icon: <FaMicrophone />,
      page: "captions",
    },
    {
      title: "Recorder",
      text: "Record and download your meeting or class sessions effortlessly.",
      icon: <FaMicrophoneAlt />,
      page: "recorder",
    },
    {
      title: "Sign Bank",
      text: "Access basic sign language phrases for better inclusion.",
      icon: <FaSignLanguage />,
      page: "signbank",
    },
    {
      title: "Community",
      text: "Join discussions and connect with others using HearMe.",
      icon: <FaComment />,
      page: "community",
    },
  ];

  return (
    <section className="dashboard-redesign">
      <div className="dashboard-hero">
        <div>
          <span className="hero-pill">
            <FaRocket /> HearMe Dashboard
          </span>

          <h1>Welcome back 👋</h1>

          <p>
            Explore real-time captions, recordings, sign language support, and
            community features in one clean workspace.
          </p>

          <div className="hero-actions">
            <button onClick={() => navigate("captions")}>
              Start Captioning
            </button>

            <button
              className="secondary"
              onClick={() => navigate("recorder")}
            >
              Open Recorder
            </button>
          </div>
        </div>

        <div className="hero-summary">
          <div>
            <FaMicrophone />
            <strong>Live Captions</strong>
            <span>Ready to use</span>
          </div>

          <div>
            <FaMicrophoneAlt />
            <strong>Recorder</strong>
            <span>Audio download available</span>
          </div>

          <div>
            <FaUsers />
            <strong>Community</strong>
            <span>Connect with users</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-new">
        <div className="quick-card">
          <div className="section-heading">
            <h2>Quick Access</h2>
            <p>Choose a feature and continue your HearMe workflow.</p>
          </div>

          <div className="feature-grid-new">
            {features.map((item) => (
              <button
                key={item.title}
                className="feature-tile"
                onClick={() => navigate(item.page)}
              >
                <span className="feature-tile-icon">{item.icon}</span>

                <span className="feature-tile-content">
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>

                <FaArrowRight className="tile-arrow" />
              </button>
            ))}
          </div>
        </div>

        <aside className="side-column">
          {showUpdate && (
            <div className="update-card-new">
              <div className="update-icon-new">
                <FaBullhorn />
              </div>

              <div>
                <h3>Major Update</h3>
                <p>
                  Community features are coming next week. Check the forum for a
                  preview.
                </p>
              </div>

              <button onClick={() => setShowUpdate(false)}>Dismiss</button>
            </div>
          )}

          <div className="coming-card-new">
            <h3>
              <FaClock /> What's coming
            </h3>

            <ul>
              <li>New community discussion threads</li>
              <li>Image sharing in posts</li>
              <li>Notifications for replies</li>
              <li>Better user profiles</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}