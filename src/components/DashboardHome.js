import React from "react";
import { FaMicrophone, FaMicrophoneAlt, FaComment, FaHandPaper, FaSignLanguage, FaChevronRight } from 'react-icons/fa';

export default function DashboardHome({ onNavigate }) {

  const navigate = (page) => {
    if (typeof onNavigate === 'function') onNavigate(page);
    else console.log('Navigate to', page);
  };
  return (
    <section className="panel dashboard-home hero-panel">
      <h2>Welcome back <FaHandPaper /></h2>
      <p>
        Explore features like real-time captions, recordings, sign language, and
        our community! Connect, share, and grow with other HearMe users.
      </p>

      <div className="cards">
        <div
          className="card clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('CaptioningPanel.js')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('CaptioningPanel.js'); }}
          style={{ cursor: 'pointer' }}
        >
          <h3><FaMicrophone /> Captions <FaChevronRight style={{ float: 'right' }} /></h3>
          <p>Convert speech to text instantly and translate it in real-time.</p>
        </div>

        <div
          className="card clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('recorder')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('recorder'); }}
          style={{ cursor: 'pointer' }}
        >
          <h3><FaMicrophoneAlt /> Recorder <FaChevronRight style={{ float: 'right' }} /></h3>
          <p>Record and download your meeting or class sessions effortlessly.</p>
        </div>

        <div
          className="card clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('signbank')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('signbank'); }}
          style={{ cursor: 'pointer' }}
        >
          <h3><FaSignLanguage /> Sign Bank <FaChevronRight style={{ float: 'right' }} /></h3>
          <p>Access basic sign language phrases for better inclusion.</p>
        </div>

        <div
          className="card clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('community')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('community'); }}
          style={{ cursor: 'pointer' }}
        >
          <h3><FaComment /> Community <FaChevronRight style={{ float: 'right' }} /></h3>
          <p>Join discussions and connect with others using HearMe!</p>
        </div>
      </div>
    </section>
  );
}