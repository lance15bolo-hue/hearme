import React from "react";
import {
  FaMicrophone,
  FaHistory,
  FaComment,
  FaSignLanguage,
  FaArrowRight,
  FaRocket,
} from "react-icons/fa";

export default function DashboardHome({ setActivePage, onNavigate }) {
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
      title: "Session History",
      text: "Review and manage your saved academic sessions.",
      icon: <FaHistory />,
      page: "history",
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
    <section className="dashboard-redesign dashboard-focused">
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
              onClick={() => navigate("signbank")}
            >
              Open Sign Phrase Bank
            </button>
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

      </div>
    </section>
  );
}