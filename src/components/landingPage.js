import React, { useEffect } from "react";
import "./LandingPage.css";

export default function LandingPage({ onLogin, onSignUp }) {
  const scrollToHowItWorks = () => {
    const section = document.getElementById("how-it-works");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        document.body.classList.add("scrolled");
      } else {
        document.body.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.classList.remove("scrolled");
    };
  }, []);

  return (
    <div className="landing">
      <div className="landing-hud top-right" aria-hidden="true">
        <svg viewBox="0 0 520 140" fill="none">
          <path
            d="M40 30H220M220 30C240 30 250 20 270 20H340M340 20H500"
            stroke="rgba(81, 220, 255, 0.65)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M410 20h60"
            stroke="rgba(80, 220, 255, 0.35)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="12 14"
          />
          <path
            d="M260 22l10 18h-20l10-18Z"
            fill="rgba(80, 220, 255, 0.55)"
          />
        </svg>
      </div>

      <div className="landing-hud bottom-left" aria-hidden="true">
        <svg viewBox="0 0 560 160" fill="none">
          <path
            d="M30 120H210M210 120C240 120 250 100 280 100H420"
            stroke="rgba(80, 220, 255, 0.55)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M40 140h120"
            stroke="rgba(80, 220, 255, 0.35)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="14 16"
          />
        </svg>
      </div>

      <img
        src="/logohearme.png"
        alt=""
        className="landing-logo-bg"
        aria-hidden="true"
      />

      <section className="landing-inner hero-section">
        <div className="landing-left">
          <span className="landing-badge">Inclusive Communication Platform</span>

          <h1>Communicate without barriers</h1>

          <p className="landing-subtext">
            HearMe helps hearing and non-hearing individuals connect through
            accessible communication tools such as speech-to-text,
            text-to-speech, and real-time messaging support.
          </p>

          <div className="landing-cta">
            <button className="btn start" onClick={onSignUp}>
              Get Started
            </button>

            <button className="btn clear" onClick={onLogin}>
              Login
            </button>

            <button className="btn learn-more" onClick={scrollToHowItWorks}>
              Learn More
            </button>
          </div>

          <div
            className="scroll-indicator"
            onClick={scrollToHowItWorks}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                scrollToHowItWorks();
              }
            }}
          >
            <span>Scroll down to learn more about HearMe</span>
            <div className="scroll-arrow">↓</div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="section-header">
          <span className="section-tag">How It Works</span>
          <h2>Simple, accessible, and built for real conversations</h2>
          <p>
            HearMe makes communication easier by turning speech and text into
            formats that both hearing and non-hearing users can understand.
          </p>
        </div>

        <div className="feature-grid three-cols">
          <div className="feature-card">
            <div className="feature-number">1</div>
            <h3>Speak or Type</h3>
            <p>
              Start the conversation using your voice or keyboard, depending on
              what feels most comfortable.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-number">2</div>
            <h3>Convert Instantly</h3>
            <p>
              HearMe transforms messages into accessible formats like readable
              text or spoken output in real time.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-number">3</div>
            <h3>Connect Better</h3>
            <p>
              Reduce misunderstandings and create smoother conversations for
              everyone involved.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-header">
          <span className="section-tag">Features</span>
          <h2>Key features designed for accessibility</h2>
          <p>
            HearMe focuses on practical tools that support more inclusive and
            effective communication.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>Speech-to-Text</h3>
            <p>Convert spoken words into readable text instantly.</p>
          </div>

          <div className="feature-card">
            <h3>Text-to-Speech</h3>
            <p>Turn typed messages into voice for easier communication.</p>
          </div>

          <div className="feature-card">
            <h3>Accessible Messaging</h3>
            <p>
              Support clear conversations with communication-friendly tools.
            </p>
          </div>

          <div className="feature-card">
            <h3>User-Friendly Interface</h3>
            <p>
              A simple and intuitive design for users of different needs and
              backgrounds.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-header">
          <span className="section-tag">Who It's For</span>
          <h2>Made for individuals, families, and communities</h2>
          <p>
            HearMe is designed to support communication across different types
            of users and environments.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>Deaf and Non-Hearing Users</h3>
            <p>
              Access communication tools that make everyday interactions more
              convenient and inclusive.
            </p>
          </div>

          <div className="feature-card">
            <h3>Hearing Individuals</h3>
            <p>
              Communicate more effectively with non-hearing users in daily
              conversations.
            </p>
          </div>

          <div className="feature-card">
            <h3>Families and Friends</h3>
            <p>
              Build stronger connections through better and more accessible
              interaction.
            </p>
          </div>

          <div className="feature-card">
            <h3>Schools and Communities</h3>
            <p>
              Encourage accessibility in classrooms, organizations, and public
              spaces.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-header">
          <span className="section-tag">Why HearMe</span>
          <h2>Accessibility first, simplicity always</h2>
          <p>
            HearMe is more than just a tool. It is a platform built to make
            communication more inclusive, practical, and easy to use.
          </p>
        </div>

        <div className="feature-grid three-cols">
          <div className="feature-card">
            <h3>Inclusive by Design</h3>
            <p>
              Built with accessibility as a priority, not as an afterthought.
            </p>
          </div>

          <div className="feature-card">
            <h3>Simple and Practical</h3>
            <p>
              Designed for real-life conversations, whether at home, in school,
              or in the community.
            </p>
          </div>

          <div className="feature-card">
            <h3>Real-Time Support</h3>
            <p>
              Helps reduce delays and confusion by making communication faster
              and clearer.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section faq-section">
        <div className="section-header">
          <span className="section-tag">FAQ</span>
          <h2>Frequently asked questions</h2>
          <p>
            Here are some quick answers that may help users understand HearMe
            better.
          </p>
        </div>

        <div className="faq-list">
          <div className="faq-item">
            <h3>Do I need an account to use HearMe?</h3>
            <p>
              Creating an account gives you access to the full experience and
              personalized features.
            </p>
          </div>

          <div className="faq-item">
            <h3>Who can use HearMe?</h3>
            <p>
              HearMe is designed for both hearing and non-hearing individuals
              who want more accessible communication.
            </p>
          </div>

          <div className="faq-item">
            <h3>Can I use HearMe on mobile devices?</h3>
            <p>
              Yes, HearMe can be used across devices for more flexible and
              convenient communication.
            </p>
          </div>

          <div className="faq-item">
            <h3>What does Get Started do?</h3>
            <p>
              Get Started is intended for new users and should take them to the
              sign-up or account creation flow.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section final-cta">
        <div className="final-cta-box">
          <span className="section-tag">Start Now</span>
          <h2>Start communicating with fewer barriers today</h2>
          <p>
            Join HearMe and experience a more accessible way to connect with
            others.
          </p>

          <div className="landing-cta">
            <button className="btn start" onClick={onSignUp}>
              Create Account
            </button>
            <button className="btn clear" onClick={onLogin}>
              Login
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}