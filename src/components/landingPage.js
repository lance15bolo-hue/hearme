import React from "react";

export default function LandingPage({ onLogin }) {
  return (
    <div className="landing">
      {/* HUD lines (optional) */}
      <div className="landing-hud top-right" aria-hidden="true">
        <svg viewBox="0 0 520 140" fill="none">
          <path
            d="M40 30H220M220 30C240 30 250 20 270 20H340M340 20H500"
            stroke="rgba(80, 220, 255, 0.65)"
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

      {/* BIG LOGO behind text (put your image in public/logo.png) */}
      <img
        src="/logohearme.png"
        alt=""
        className="landing-logo-bg"
        aria-hidden="true"
      />

      <div className="landing-inner single">
        <div className="landing-left">
          <h1>What is HearMe?</h1>
          <p>
            HearMe is an assistive communication platform that bridges the gap
            between hearing and non-hearing individuals using technology.
          </p>

          <div className="landing-cta">
            <button className="btn start" onClick={onLogin}>
              Get started
            </button>
            <button className="btn clear" onClick={onLogin}>
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}