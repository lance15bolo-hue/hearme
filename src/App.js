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

  // Toast system
  const addToast = useCallback((msg, type = "info", ttl = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  // Auth listener + fetch role
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
            // create minimal profile if missing (safe)
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

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen addToast={addToast} />;

  const handleLogout = async () => {
    await signOut(auth);
    addToast("Logged out", "info");
  };

  return (
    <div className="app-root">
      <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} />
      <div className="main-area">
        <Header handleLogout={handleLogout} />
        <main className="page-content">
          {activePage === "dashboard" && <DashboardHome />}
          {activePage === "captions" && <CaptioningPanel />}
          {activePage === "recorder" && <Recorder />}
          {activePage === "signbank" && <SignPhraseBank />}
          {activePage === "community" && <Community user={user} addToast={addToast} />}
          {activePage === "profile" && <Profile user={user} addToast={addToast} />}
          {user?.role === "admin" && activePage === "admin" && (
            <AdminDashboard user={user} addToast={addToast} />
          )}
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
