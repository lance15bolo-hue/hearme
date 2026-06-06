import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
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
import LandingPage from "./components/LandingPage";

function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("hearme-theme") || "light"
  );

  const addToast = useCallback((msg, type = "info", ttl = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  }, []);

  useEffect(() => {
    // Safety fallback — if loading never resolves, force it off after 8s
    const fallback = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(fallback);

      if (u) {
        try {
          // Race Firestore getDoc against a 5s timeout
          const docRef = doc(db, "users", u.uid);
          const snap = await Promise.race([
            getDoc(docRef),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Firestore timeout")), 5000)
            ),
          ]);

          setUser({
            uid: u.uid,
            email: u.email,
            displayName: snap.exists() ? snap.data().displayName || null : null,
            role: snap.exists() ? snap.data().role || "user" : "user",
          });
        } catch (err) {
          console.warn("Firestore fetch failed, using defaults:", err.message);
          setUser({
            uid: u.uid,
            email: u.email,
            displayName: null,
            role: "user",
          });
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(fallback);
      unsub();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("hearme-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const handleLogout = async () => {
    await signOut(auth);
    setAuthMode(null);
    addToast("Logged out", "info");
  };

  if (loading) return <LoadingScreen />;

  if (!user) {
    return authMode ? (
      <LoginScreen initialMode={authMode} />
    ) : (
      <LandingPage
        onLogin={() => setAuthMode("login")}
        onSignUp={() => setAuthMode("signup")}
      />
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardHome setActivePage={setActivePage} />;

      case "captions":
        return <CaptioningPanel user={user} addToast={addToast} theme={theme} />;

      case "recorder":
        return <Recorder user={user} addToast={addToast} />;

      case "signbank":
        return <SignPhraseBank user={user} addToast={addToast} />;

      case "community":
        return <Community user={user} addToast={addToast} />;

      case "profile":
        return <Profile user={user} addToast={addToast} />;

      case "admin":
        return user?.role === "admin" ? (
          <AdminDashboard user={user} addToast={addToast} theme={theme} />
        ) : (
          <section className="panel">
            <h2>Access Denied</h2>
            <p>You do not have permission to view this page.</p>
          </section>
        );

      case "settings":
        return <Settings theme={theme} toggleTheme={toggleTheme} />;

      default:
        return <DashboardHome setActivePage={setActivePage} />;
    }
  };

  return (
    <div className={`app-root ${theme === "dark" ? "dark-mode" : ""}`}>
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className="main-area">
        <Header handleLogout={handleLogout} />
        <div className="content-wrapper">
          <main className="page-content">{renderPage()}</main>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;