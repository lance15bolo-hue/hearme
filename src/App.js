import React, { useEffect, useState, useCallback } from "react";
import "./App.css";

import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { RecordingProvider } from "./context/RecordingContext";

import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Header from "./components/Header";
import DashboardHome from "./components/DashboardHome";
import CaptioningPanel from "./components/CaptioningPanel";
import SignPhraseBank from "./components/SignPhraseBank";
import Community from "./components/Community";
import Profile from "./components/Profile";
import AdminDashboard from "./components/AdminDashboard";
import LoginScreen from "./components/LoginScreen";
import ToastContainer from "./components/ToastContainer";
import LoadingScreen from "./components/LoadingScreen";
import LandingPage from "./components/LandingPage";
import History from "./components/History";
import HistoryDetails from "./components/HistoryDetails";
import ConfirmDialog from "./components/ConfirmDialog";


function App() {

  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [returnToGuest, setReturnToGuest] = useState(false);

  const [activePage, setActivePage] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("hearme-theme") || "light"
  );


  const addToast = useCallback(
    (msg, type = "info", ttl = 3500) => {

      const id = Date.now() + Math.random();

      setToasts((prev) => [
        ...prev,
        {
          id,
          msg,
          type
        }
      ]);


      setTimeout(() => {

        setToasts((prev) =>
          prev.filter((item) => item.id !== id)
        );

      }, ttl);

    },
    []
  );


  useEffect(() => {

    const fallback = setTimeout(() => {
      setLoading(false);
    }, 8000);



    const unsub = onAuthStateChanged(
      auth,
      async (u) => {

        clearTimeout(fallback);


        if (u) {

          try {

            const docRef = doc(
              db,
              "users",
              u.uid
            );


            const snap = await Promise.race([
              getDoc(docRef),

              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "Firestore timeout"
                      )
                    ),
                  5000
                )
              )
            ]);



            setUser({

              uid: u.uid,

              email: u.email,

              displayName:
                snap.exists()
                  ? snap.data().displayName || null
                  : null,

              role:
                snap.exists()
                  ? snap.data().role || "user"
                  : "user"

            });



          } catch (err) {


            console.warn(
              "Firestore fetch failed:",
              err.message
            );


            setUser({

              uid: u.uid,

              email: u.email,

              displayName: null,

              role: "user"

            });


          }


        } else {

          setUser(null);

        }


        setLoading(false);


      }
    );



    return () => {

      clearTimeout(fallback);

      unsub();

    };


  }, []);



  useEffect(() => {

    localStorage.setItem(
      "hearme-theme",
      theme
    );

  }, [theme]);



  const toggleTheme = () => {

    setTheme((prev) =>
      prev === "dark"
        ? "light"
        : "dark"
    );

  };



  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);

    try {
      await signOut(auth);
      setGuestMode(false);
      setReturnToGuest(false);
      setAuthMode(null);

      // Always start authenticated sessions from the Dashboard after logout.
      // This prevents the previous page (for example, History) from remaining active.
      setActivePage("dashboard");
      setSelectedHistory(null);

      addToast("Logged out", "info");
    } catch (error) {
      addToast("Unable to log out. Please try again.", "error");
    }
  };



  const handleGuestLogin = () => {

    setGuestMode(true);

    setActivePage("captions");

    addToast(
      "Entered as Guest User",
      "info"
    );

  };



  const activeUser = user || {

    uid: null,

    email:
      "guest@hearme.local",

    displayName:
      "Guest User",

    role:
      "guest"

  };



  if (loading) {

    return <LoadingScreen />;

  }



  if (!user && !guestMode) {

    return authMode ? (

    <LoginScreen
  initialMode={authMode}
  addToast={addToast}
  onBack={() => {

    setAuthMode(null);

    if (returnToGuest) {
      setGuestMode(true);
      setActivePage("captions");
    }

  }}
/>

    ) : (

      <LandingPage

        onLogin={() =>
          setAuthMode("login")
        }

        onSignUp={() =>
          setAuthMode("signup")
        }

        onGuest={
          handleGuestLogin
        }

      />

    );

  }




  const renderPage = () => {

    const guestAllowedPages = [
  "captions",
  "signbank",
  "profile",
  "settings"
];


if (
  activeUser.role === "guest" &&
  !guestAllowedPages.includes(activePage)
) {

  setActivePage("captions");

  return (
    <CaptioningPanel
      user={activeUser}
      addToast={addToast}
      theme={theme}
      onLoginRequest={() => {
        setReturnToGuest(true);
        setGuestMode(false);
        setAuthMode("login");
      }}
    />
  );

}


    switch(activePage) {


      case "dashboard":

        return (
          <DashboardHome
            setActivePage={setActivePage}
          />
        );



      case "captions":

        return (

          <CaptioningPanel

  user={activeUser}

  addToast={addToast}

  theme={theme}

  onLoginRequest={() => {
  setReturnToGuest(true);
  setGuestMode(false);
  setAuthMode("login");
}}

/>

        );



    case "history":

return (
  <History
    user={activeUser}
    setActivePage={setActivePage}
    setSelectedHistory={setSelectedHistory}
  />
);


case "historyDetails":

return (

  <HistoryDetails
    session={selectedHistory}
    setActivePage={setActivePage}
  />

);



      case "signbank":

        return (

          <SignPhraseBank

            user={activeUser}

            addToast={addToast}

          />

        );



      case "community":

        return (

          <Community

            user={activeUser}

            addToast={addToast}

          />

        );



      case "profile":

        return (

          <Profile

            user={activeUser}

            addToast={addToast}

          />

        );



      case "admin":


        return user?.role === "admin" ? (

          <AdminDashboard

            user={activeUser}

            addToast={addToast}

            theme={theme}

          />

        ) : (

          <section className="panel">

            <h2>
              Access Denied
            </h2>

            <p>
              You do not have permission to view this page.
            </p>

          </section>

        );



      case "settings":

        return (

          <Settings
            theme={theme}
            toggleTheme={toggleTheme}
            user={activeUser}
            addToast={addToast}
          />

        );



      default:

        return (

          <DashboardHome
            setActivePage={setActivePage}
          />

        );


    }

  };



  return (

    <RecordingProvider>

    <div
      className={
        `app-root ${
          theme === "dark"
            ? "dark-mode"
            : ""
        }`
      }
    >
    


      <Sidebar

        user={activeUser}

        activePage={activePage}

        setActivePage={setActivePage}

        theme={theme}

        toggleTheme={toggleTheme}

      />



      <div className="main-area">


        <Header

          handleLogout={handleLogout}

        />



        <div className="content-wrapper">


          <main className="page-content">

            {renderPage()}

          </main>


        </div>


      </div>



      <ToastContainer
        toasts={toasts}
      />

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out of HearMe?"
        message="Are you sure you want to log out? Any work already saved will remain available when you sign in again."
        confirmLabel="Yes, log out"
        cancelLabel="Stay logged in"
        variant="danger"
        icon="logout"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />


    </div>

    </RecordingProvider>
  );

}





export default App;