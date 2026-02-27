import React from "react";

export default function DashboardHome() {
  return (
    <section className="panel dashboard-home hero-panel">
      <h2>Welcome back 👋</h2>
      <p>
        Explore features like real-time captions, recordings, sign language, and
        our community! Connect, share, and grow with other HearMe users.
      </p>

      <div className="cards">
        <div className="card">
          <h3>🎤 Captions</h3>
          <p>Convert speech to text instantly and translate it in real-time.</p>
        </div>

        <div className="card">
          <h3>🎙️ Recorder</h3>
          <p>Record and download your meeting or class sessions effortlessly.</p>
        </div>

        <div className="card">
          <h3>🤟 Sign Bank</h3>
          <p>Access basic sign language phrases for better inclusion.</p>
        </div>

        <div className="card">
          <h3>💬 Community</h3>
          <p>Join discussions and connect with others using HearMe!</p>
        </div>
      </div>
    </section>
  );
}