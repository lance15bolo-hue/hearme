// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

const container = document.getElementById("root");
createRoot(container).render(<App />);