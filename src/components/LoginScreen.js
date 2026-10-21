import React, { useState } from "react";
import { auth, db } from "../firebase";
import "../App.css";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import logo from "../assets/logohearme.png";

const functions = getFunctions(undefined, "asia-southeast1");
const reserveUsernameCall = httpsCallable(functions, "reserveUsername");
const claimUsernameCall = httpsCallable(functions, "claimUsername");
const releaseUsernameCall = httpsCallable(functions, "releaseUsernameReservation");
const usernameLoginCall = httpsCallable(functions, "signInWithUsername");
const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,20}$/;

export default function LoginScreen({ initialMode = "login", onBack, addToast }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSignup, setIsSignup] = useState(initialMode === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetMessages = () => {
    setError("");
    setNotice("");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setError("Enter the email address associated with your account.");
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("If an account is registered with this email, a password reset link has been sent. Please check your inbox and spam folder.");
    } catch (err) {
      if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait before trying again.");
      } else {
        setError("We couldn't send the reset email right now. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (isForgotPassword) {
      await handlePasswordReset(e);
      return;
    }

    setIsSubmitting(true);
    let reservationToken = "";
    let accountCreated = false;

    try {
      const normalizedEmail = email.trim();

      if (isSignup) {
        const normalizedUsername = username.trim().toLowerCase();
        if (!USERNAME_PATTERN.test(username.trim())) {
          setError("Username must be 3–20 characters and use only letters, numbers, dots, or underscores.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        // Reserve the username before creating the account to avoid a race
        // where two people register the same username at the same time.
        const reservation = await reserveUsernameCall({ username: normalizedUsername });
        reservationToken = reservation.data.reservationToken;

        const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        accountCreated = true;

        await setDoc(doc(db, "users", userCred.user.uid), {
          email: normalizedEmail,
          createdAt: serverTimestamp(),
          role: "student",
          displayName: normalizedUsername,
        });

        await claimUsernameCall({ username: normalizedUsername, reservationToken });
        reservationToken = "";

        try {
          await sendEmailVerification(userCred.user);
          addToast?.("Account created. A verification email was sent; you can check its status in Settings.", "success", 6000);
        } catch (verificationError) {
          console.error("Email verification could not be sent:", verificationError);
          addToast?.("Account created, but the verification email could not be sent. You can try again from Settings.", "error", 6500);
        }
      } else if (normalizedEmail.includes("@")) {
        // Existing email/password sign-in remains unchanged.
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        const result = await usernameLoginCall({ username: normalizedEmail, password });
        await signInWithCustomToken(auth, result.data.customToken);
      }
    } catch (err) {
      if (reservationToken) {
        try {
          await releaseUsernameCall({ username: username.trim().toLowerCase(), reservationToken });
        } catch (releaseError) {
          console.warn("Username reservation will expire automatically:", releaseError);
        }
      }

      let message = "Something went wrong. Please try again.";
      if (err.code === "auth/invalid-email") message = "Please enter a valid email address.";
      else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "functions/unauthenticated") message = "Incorrect username/email or password.";
      else if (err.code === "auth/email-already-in-use") message = "This email is already registered. You can sign in using your email.";
      else if (err.code === "auth/weak-password") message = "Password should be at least 6 characters.";
      else if (err.code === "auth/too-many-requests" || err.code === "functions/resource-exhausted") message = "Too many attempts. Please wait before trying again.";
      else if (err.code === "functions/already-exists") message = "That username is already taken. Please choose another one.";
      else if (err.code === "functions/invalid-argument") message = "Enter a valid username (3–20 letters, numbers, dots, or underscores).";
      else if (accountCreated) message = "Your account was created, but username setup did not finish. Sign in with your email and contact the administrator to complete username setup.";
      else if (err.code === "auth/network-request-failed" || err.code === "functions/unavailable") message = "Network or service error. Check your connection and try again.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode) => {
    resetMessages();
    setIsForgotPassword(nextMode === "forgot");
    if (nextMode === "signup") setIsSignup(true);
    if (nextMode === "login") setIsSignup(false);
  };

  return (
    <div className="login-page">
      <button className="back-button" onClick={onBack} type="button">← Back</button>
      <div className="login-card">
        <img src={logo} alt="HearMe Logo" className="login-logo" />
        <h2>{isForgotPassword ? "Reset Your Password" : isSignup ? "Create an Account" : "Welcome to HearMe"}</h2>
        <p className="auth-description">
          {isForgotPassword
            ? "Enter your registered email and we'll send you a password reset link."
            : isSignup
              ? "Create your HearMe account using your email and a unique username."
              : "Sign in using your username or email address."}
        </p>

        <form onSubmit={isForgotPassword ? handlePasswordReset : handleSubmit}>
          {isSignup && !isForgotPassword && (
            <input
              type="text"
              placeholder="Choose a username"
              aria-label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9._]{3,20}"
              title="Use 3–20 letters, numbers, dots, or underscores."
              required
            />
          )}
          <input
            type={isForgotPassword || isSignup ? "email" : "text"}
            placeholder={isForgotPassword ? "Email" : isSignup ? "Email address" : "Username or email"}
            aria-label={isForgotPassword ? "Email" : isSignup ? "Email address" : "Username or email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={isForgotPassword ? "email" : isSignup ? "email" : "username"}
            required
          />
          {!isForgotPassword && (
            <input
              type="password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          )}
          {isSignup && !isForgotPassword && (
            <input
              type="password"
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button type="submit" className="btn start full" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isForgotPassword ? "Send Reset Link" : isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        {!isForgotPassword && !isSignup && (
          <button className="auth-text-button" type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>
        )}
        <p className="auth-switch-row">
          {isForgotPassword ? "Remembered your password?" : isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button className="auth-text-button inline" type="button" onClick={() => switchMode(isForgotPassword || isSignup ? "login" : "signup")}>
            {isForgotPassword || isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
