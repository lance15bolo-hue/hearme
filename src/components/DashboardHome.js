import React, { useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneAlt,
  FaComment,
  FaHandPaper,
  FaSignLanguage,
  FaChevronRight,
} from "react-icons/fa";

export default function DashboardHome({ onNavigate }) {
  const [showBanner, setShowBanner] = useState(true);

  const navigate = (page) => {
    if (typeof onNavigate === "function") onNavigate(page);
    else console.log("Navigate to", page);
  };

  return (
    <div className="dashboard-stack">
      <section className="panel dashboard-home hero-panel">
        <h2>
          Welcome back <FaHandPaper />
        </h2>

        <p>
          Explore features like real-time captions, recordings, sign language,
          and our community! Connect, share, and grow with other HearMe users.
        </p>

        <div className="cards">
          <div
            className="card clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate("captions")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("captions");
            }}
          >
            <h3>
              <FaMicrophone /> Captions
              <FaChevronRight className="card-arrow" />
            </h3>
            <p>Convert speech to text instantly and translate it in real-time.</p>
          </div>

          <div
            className="card clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate("recorder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("recorder");
            }}
          >
            <h3>
              <FaMicrophoneAlt /> Recorder
              <FaChevronRight className="card-arrow" />
            </h3>
            <p>Record and download your meeting or class sessions effortlessly.</p>
          </div>

          <div
            className="card clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate("signbank")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("signbank");
            }}
          >
            <h3>
              <FaSignLanguage /> Sign Bank
              <FaChevronRight className="card-arrow" />
            </h3>
            <p>Access basic sign language phrases for better inclusion.</p>
          </div>

          <div
            className="card clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate("community")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("community");
            }}
          >
            <h3>
              <FaComment /> Community
              <FaChevronRight className="card-arrow" />
            </h3>
            <p>Join discussions and connect with others using HearMe!</p>
          </div>
        </div>
      </section>

            {showBanner && (
        <div
          style={{
            width: "100%",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
            padding: "20px 24px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #dff6df, #d6f2d7)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.12)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0b2561",
                color: "#fff",
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              📢
            </div>

            <p
              style={{
                margin: 0,
                color: "#0b2561",
                fontSize: "16px",
                fontWeight: 600,
                lineHeight: 1.45,
              }}
            >
              🎉 <strong>Update:</strong> Major community features coming next
              week! Check the forum for a preview.
            </p>
          </div>

          <button
            onClick={() => setShowBanner(false)}
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "none",
              padding: "10px 16px",
              borderRadius: "18px",
              fontWeight: 700,
              color: "#64748b",
              cursor: "pointer",
              boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {showBanner && (
  <div style={{ marginTop: "16px" }}>
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        borderRadius: "20px",
        padding: "18px 20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: "1px solid rgba(15,23,42,0.06)",
      }}
    >
      <h3 style={{ margin: "0 0 8px", color: "#0b2561" }}>
        What’s coming 👇
      </h3>

      <ul style={{ margin: 0, paddingLeft: "18px", color: "#475569" }}>
        <li>💬 New community discussion threads</li>
        <li>📸 Image sharing in posts</li>
        <li>🔔 Notifications for replies</li>
        <li>👥 Better user profiles</li>
      </ul>
    </div>
  </div>
)}
    </div>
  );
}