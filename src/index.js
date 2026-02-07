// // src/index.js
// import 'dotenv/config' 
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

const container = document.getElementById("root");
createRoot(container).render(<App />);