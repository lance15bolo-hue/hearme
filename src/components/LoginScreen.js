import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import logo from "../assets/LOGO_HearMe.png";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), {
          email,
          createdAt: serverTimestamp(),
          role: "student",
          displayName: email.split("@")[0],
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="HearMe Logo" className="login-logo" />
        <h2>{isSignup ? "Create an Account" : "Welcome to HearMe"}</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {isSignup && <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />}
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn start full">{isSignup ? "Sign Up" : "Login"}</button>
        </form>
        <p style={{ marginTop: "10px" }}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <span onClick={() => { setIsSignup(!isSignup); setError(""); }} style={{ color: "#007bff", cursor: "pointer" }}>
            {isSignup ? "Sign in" : "Create one"}
          </span>
        </p>
      </div>
    </div>
  );
}
