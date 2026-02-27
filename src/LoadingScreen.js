// src/components/LoadingScreen.js
import React from "react";
import "./LoadingScreen.css";
import logo from "../assets/Logo_Hearme (2).png";

export default function LoadingScreen() {
  return (
    <div className="loading-wrapper">
      <div className="loading-logo-container">
        <img src={logo} alt="HearMe" className="loading-logo" />
        <div className="loading-ring" />
      </div>
      <div className="loading-dots">
        <span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span><span>.</span><span>.</span><span>.</span>
      </div>
    </div>
  );
}