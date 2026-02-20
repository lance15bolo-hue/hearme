// src/App.js
import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardHome from "./components/DashboardHome";
import CaptioningPanel from "./components/CaptioningPanel";
import Recorder from "./components/Recorder";
import SignPhraseBank from "./components/SignPhraseBank";
import Community from "./components/Community";
import Profile from "./components/Profile";
import AdminDashboard from "./components/AdminDashboard";
import LoginScreen from "./components/LoginScreen";
import ToastContainer from "./components/ToastContainer";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // Toast system
  // -----------------------------
  const addToast = useCallback((msg, type = "info", ttl = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  // -----------------------------
  // Auth listener + fetch role
  // -----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const docRef = doc(db, "users", u.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setUser({ uid: u.uid, email: u.email, role: data.role || "user" });
          } else {
            setUser({ uid: u.uid, email: u.email, role: "user" });
          }
        } catch (err) {
          console.error("Auth role fetch:", err);
          setUser({ uid: u.uid, email: u.email, role: "user" });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // -----------------------------
  // Logout handler
  // -----------------------------
  const handleLogout = async () => {
    await signOut(auth);
    addToast("Logged out", "info");
  };

  // -----------------------------
  // Loading & Login
  // -----------------------------
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen addToast={addToast} />;

  // -----------------------------
  // RBAC: admin-only pages
  // -----------------------------
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardHome />;
      case "captions":
        return <CaptioningPanel />;
      case "recorder":
        return <Recorder />;
      case "signbank":
        return <SignPhraseBank />;
      case "community":
        return <Community user={user} addToast={addToast} />;
      case "profile":
        return <Profile user={user} addToast={addToast} />;
      case "admin":
        return user?.role === "admin" ? (
          <AdminDashboard user={user} addToast={addToast} />
        ) : (
          <section className="panel">
            <h2>Access Denied</h2>
            <p>You do not have permission to view this page.</p>
          </section>
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="app-root">
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <div className="main-area">
        <Header handleLogout={handleLogout} />
        <main className="page-content">{renderPage()}</main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
