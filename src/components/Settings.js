// src/components/Settings.js
import React, { useEffect, useState } from "react";
import { FaCog, FaMoon, FaSun, FaPalette, FaShieldAlt, FaKey } from "react-icons/fa";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "asia-southeast1");
const reserveUsernameCall = httpsCallable(functions, "reserveUsername");
const claimUsernameCall = httpsCallable(functions, "claimUsername");
const releaseUsernameCall = httpsCallable(functions, "releaseUsernameReservation");
const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,20}$/;

export default function Settings({ theme, toggleTheme, user, addToast }) {
  const isDark = theme === "dark";
  const [emailVerified, setEmailVerified] = useState(Boolean(auth.currentUser?.emailVerified));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadUsername = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const profile = await getDoc(doc(db, "users", currentUser.uid));
        if (mounted && profile.exists()) {
          const savedUsername = profile.data().username || profile.data().usernameNormalized || "";
          setCurrentUsername(savedUsername);
          setNewUsername(savedUsername);
        }
      } catch (error) {
        console.error("Unable to load username:", error);
      }
    };
    loadUsername();
    const refreshVerificationStatus = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        await reload(currentUser);
        if (mounted) setEmailVerified(Boolean(currentUser.emailVerified));
      } catch (error) {
        console.error("Unable to refresh email verification status:", error);
      }
    };
    refreshVerificationStatus();
    return () => { mounted = false; };
  }, [user?.uid]);

  const handleSendVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      addToast?.("Please sign in again to verify your email.", "error");
      return;
    }

    setIsSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      addToast?.("Verification email sent. Check your inbox and spam folder.", "success");
    } catch (error) {
      console.error("Send verification email error:", error);
      const message = error.code === "auth/too-many-requests"
        ? "Too many requests. Please wait before trying again."
        : "Could not send the verification email. Please try again later.";
      addToast?.(message, "error");
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleSaveUsername = async (event) => {
    event.preventDefault();
    setUsernameError("");
    const normalizedUsername = newUsername.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameError("Username must be 3–20 characters and use only letters, numbers, dots, or underscores.");
      return;
    }
    if (currentUsername) {
      setUsernameError("A username is already assigned to this account. Username changes are not available yet.");
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUsernameError("Please sign in again before setting a username.");
      return;
    }

    setIsSavingUsername(true);
    let reservationToken = "";
    try {
      const reservation = await reserveUsernameCall({ username: normalizedUsername });
      reservationToken = reservation.data.reservationToken;
      await claimUsernameCall({ username: normalizedUsername, reservationToken });
      reservationToken = "";
      setCurrentUsername(normalizedUsername);
      addToast?.("Username saved. You can now sign in with this username or your email.", "success");
    } catch (error) {
      if (reservationToken) {
        try {
          await releaseUsernameCall({ username: normalizedUsername, reservationToken });
        } catch (releaseError) {
          console.warn("Username reservation will expire automatically:", releaseError);
        }
      }
      console.error("Save username failed:", error?.code || "unknown", error?.message || "No additional message");
      if (error.code === "functions/already-exists") {
        setUsernameError("That username is already taken. Please choose another one.");
      } else if (error.code === "functions/invalid-argument") {
        setUsernameError("Invalid username format. Use 3–20 characters: letters, numbers, dots (.), or underscores (_). Do not enter an email address.");
      } else if (error.code === "functions/failed-precondition") {
        setUsernameError("Your account could not be linked to this username. Sign out and sign in again, then retry. If it continues, share this error code with the administrator: functions/failed-precondition.");
      } else if (error.code === "functions/unauthenticated") {
        setUsernameError("Your session may have expired. Sign out and sign in again, then retry.");
      } else if (error.code === "functions/permission-denied") {
        setUsernameError("The server denied this request. Please contact the administrator to check the username setup.");
      } else if (error.code === "functions/unavailable" || error.code === "functions/deadline-exceeded") {
        setUsernameError("The username service is temporarily unavailable. Please try again in a moment.");
      } else {
        setUsernameError(`Could not save the username. Please try again. Error code: ${error?.code || "unknown"}.`);
      }
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Choose a new password different from your current password.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setPasswordError("Please sign in with your email and password again.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed successfully.");
      addToast?.("Password changed successfully.", "success");
    } catch (error) {
      console.error("Change password error:", error);
      switch (error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setPasswordError("Your current password is incorrect.");
          break;
        case "auth/weak-password":
          setPasswordError("Choose a stronger password with at least 6 characters.");
          break;
        case "auth/requires-recent-login":
          setPasswordError("For security, sign out and sign in again before changing your password.");
          break;
        case "auth/too-many-requests":
          setPasswordError("Too many attempts. Please wait before trying again.");
          break;
        default:
          setPasswordError("Could not change the password. Check your current password and try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="settings-page">
      <div className="settings-hero">
        <div>
          <span className="settings-pill"><FaCog /> Settings</span>
          <h1>Customize HearMe</h1>
          <p>Manage your display preferences and account security settings.</p>
        </div>
        <div className="settings-icon-large">{isDark ? <FaMoon /> : <FaSun />}</div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-icon">{isDark ? <FaMoon /> : <FaSun />}</div>
          <div className="settings-card-content">
            <h2>Appearance</h2>
            <p>Switch between light mode and dark mode.</p>
          </div>
          <button
            className={`theme-switch ${isDark ? "active" : ""}`}
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            type="button"
          ><span></span></button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon"><FaPalette /></div>
          <div className="settings-card-content">
            <h2>Current Theme</h2>
            <p>{isDark ? "Dark mode is currently enabled." : "Light mode is currently enabled."}</p>
          </div>
          <div className="theme-status-badge">{isDark ? "Dark" : "Light"}</div>
        </div>


        {user?.role !== "guest" && auth.currentUser && (
          <div className="settings-card security-settings-card">
            <div className="settings-card-icon"><FaShieldAlt /></div>
            <div className="settings-card-content security-settings-content">
              <h2>Username</h2>
              {currentUsername ? (
                <>
                  <p>Your username is <strong>{currentUsername}</strong>.</p>
                  <p>You can use this username or your email address to sign in.</p>
                </>
              ) : (
                <>
                  <p>Set a unique username so you can sign in with your username or email address.</p>
                  <form className="settings-password-form" onSubmit={handleSaveUsername}>
                    <label htmlFor="account-username">Username</label>
                    <p className="settings-field-hint">Use 3–20 characters: letters (A–Z), numbers (0–9), dots (.) or underscores (_). Do not enter your email address.</p>
                    <input
                      id="account-username"
                      type="text"
                      value={newUsername}
                      onChange={(event) => setNewUsername(event.target.value)}
                      minLength={3}
                      maxLength={20}
                      pattern="[A-Za-z0-9._]{3,20}"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                    />
                    {usernameError && <p className="settings-form-error" role="alert">{usernameError}</p>}
                    <button className="btn start settings-action-button" type="submit" disabled={isSavingUsername}>
                      {isSavingUsername ? "Saving..." : "Set username"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {user?.role !== "guest" && auth.currentUser && (
          <div className="settings-card security-settings-card">
            <div className="settings-card-icon"><FaShieldAlt /></div>
            <div className="settings-card-content security-settings-content">
              <h2>Email verification</h2>
              <p className="security-email">{user?.email || auth.currentUser.email || "Signed-in account"}</p>
              <p>
                {emailVerified
                  ? "Your email address is verified."
                  : "Your email address has not been verified yet."}
              </p>
              {!emailVerified && (
                <button
                  className="btn start settings-action-button"
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSendingVerification}
                >
                  {isSendingVerification ? "Sending..." : "Send verification email"}
                </button>
              )}
              <button
                className="btn clear settings-action-button secondary-action"
                type="button"
                onClick={async () => {
                  try {
                    await reload(auth.currentUser);
                    setEmailVerified(Boolean(auth.currentUser?.emailVerified));
                    addToast?.(auth.currentUser?.emailVerified ? "Email is verified." : "Email is not verified yet. Open the verification link first.", auth.currentUser?.emailVerified ? "success" : "info");
                  } catch (error) {
                    addToast?.("Could not refresh verification status.", "error");
                  }
                }}
              >
                Refresh status
              </button>
            </div>
            <span className={`security-status ${emailVerified ? "verified" : "unverified"}`}>
              {emailVerified ? "Verified" : "Unverified"}
            </span>
          </div>
        )}

        {user?.role !== "guest" && auth.currentUser && (
          <div className="settings-card password-settings-card">
            <div className="settings-card-icon"><FaKey /></div>
            <div className="settings-card-content security-settings-content">
              <h2>Change password</h2>
              <p>Confirm your current password before choosing a new one.</p>
              <form className="settings-password-form" onSubmit={handleChangePassword}>
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <label htmlFor="confirm-new-password">Confirm new password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                {passwordError && <p className="settings-form-error" role="alert">{passwordError}</p>}
                {passwordMessage && <p className="settings-form-success" role="status">{passwordMessage}</p>}
                <button className="btn start settings-action-button" type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
