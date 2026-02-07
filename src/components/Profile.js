// src/components/Profile.js
import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection
} from "firebase/firestore";
import { db } from "../firebase";

export default function Profile({ user, addToast }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  // ==============================
  // Load Profile (Wait for User)
  // ==============================
  useEffect(() => {
    if (!user) return; // ✅ wait until logged in

    const fetchProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.email.split("@")[0],
            createdAt: new Date(),
          });

          const newSnap = await getDoc(userRef);
          setProfile(newSnap.data());
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      }
    };

    fetchProfile();
  }, [user]);

  // ==============================
  // Save Name
  // ==============================
  const handleSave = async () => {
    if (!user) return; // ✅ safety
    if (!newName.trim()) {
      addToast && addToast("Display name cannot be empty", "error");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        displayName: newName,
      });

      // Update posts
      const postsSnap = await getDocs(collection(db, "posts"));

      const updates = postsSnap.docs
        .filter((d) => d.data().uid === user.uid)
        .map((d) =>
          updateDoc(doc(db, "posts", d.id), {
            name: newName,
          })
        );

      await Promise.all(updates);

      setProfile((p) => ({
        ...p,
        displayName: newName,
      }));

      setEditing(false);

      addToast && addToast("Display name updated", "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to update name", "error");
    }
  };

  // ==============================
  // Upload Image
  // ==============================
  const handleImageUpload = async (e) => {
    if (!user) return; // ✅ safety

    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result;

      try {
        const userRef = doc(db, "users", user.uid);

        await updateDoc(userRef, {
          photoData: base64,
        });

        setProfile((p) => ({
          ...p,
          photoData: base64,
        }));

        addToast && addToast("Profile picture updated", "success");
      } catch (err) {
        console.error(err);
        addToast && addToast("Upload failed", "error");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // ==============================
  // Loading State
  // ==============================
  if (!user || !profile) {
    return (
      <section className="panel">
        <h2>Profile</h2>
        <p>Loading...</p>
      </section>
    );
  }

  // ==============================
  // UI
  // ==============================
  return (
    <section className="panel">
      <h2>👤 My Profile</h2>

      <div className="profile-card interactive">

        {/* LEFT SIDE */}
        <div className="profile-left">
          <div className="avatar-wrap">
            <img
              src={
                preview
                  ? preview
                  : profile.photoData
                  ? profile.photoData
                  : "https://via.placeholder.com/120?text=No+Photo"
              }
              alt="avatar"
              className={`avatar ${uploading ? "uploading" : ""}`}
            />
          </div>

          <label className="upload-label">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files[0];
                if (!f) return;

                const r = new FileReader();
                r.onload = () => setPreview(r.result);
                r.readAsDataURL(f);

                handleImageUpload(e);
              }}
            />

            <span className="btn upload-btn">
              {uploading ? "Uploading..." : "Upload picture"}
            </span>
          </label>
        </div>

        {/* RIGHT SIDE */}
        <div className="profile-right">
          <p>
            <strong>Display Name:</strong>
          </p>

          {editing ? (
            <div className="edit-row">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New display name"
              />

              <div>
                <button className="btn save" onClick={handleSave}>
                  Save
                </button>

                <button
                  className="btn cancel"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="large">{profile.displayName}</p>

              <p>
                <strong>Email:</strong> {profile.email}
              </p>

              <button
                className="btn edit"
                onClick={() => {
                  setEditing(true);
                  setNewName(profile.displayName);
                }}
              >
                Edit name
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
