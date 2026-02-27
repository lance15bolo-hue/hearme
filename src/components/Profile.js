// src/components/Profile.js
import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { db } from "../firebase";

// --- OPTIONAL: tiny helper to compress very large images before saving ---
// This prevents huge base64 strings + slow UI when uploading high-res photos.
async function downscaleImageToBase64(file, maxSize = 520, quality = 0.82) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  // jpeg is usually smaller than png
  return canvas.toDataURL("image/jpeg", quality);
}

export default function Profile({ user, addToast }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!user) return;

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

  const handleSave = async () => {
    if (!user) return;
    if (!newName.trim()) {
      addToast && addToast("Display name cannot be empty", "error");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, { displayName: newName });

      // Update posts with your new name
      const postsSnap = await getDocs(collection(db, "posts"));
      const updates = postsSnap.docs
        .filter((d) => d.data().uid === user.uid)
        .map((d) => updateDoc(doc(db, "posts", d.id), { name: newName }));

      await Promise.all(updates);

      setProfile((p) => ({ ...p, displayName: newName }));
      setEditing(false);
      addToast && addToast("Display name updated", "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to update name", "error");
    }
  };

  const handleImageUpload = async (file) => {
    if (!user || !file) return;

    setUploading(true);
    try {
      // downscale so it won't lag + won't blow up UI
      const base64 = await downscaleImageToBase64(file);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoData: base64 });

      setProfile((p) => ({ ...p, photoData: base64 }));
      addToast && addToast("Profile picture updated", "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  if (!user || !profile) {
    return (
      <section className="panel">
        <h2>Profile</h2>
        <p>Loading...</p>
      </section>
    );
  }

  const displayAvatar =
    preview ||
    profile.photoData ||
    "https://via.placeholder.com/120?text=No+Photo";

  return (
    <section className="panel">
      <div className="profile-header">
        <div>
          <h2 style={{ margin: 0 }}>👤 My Profile</h2>
          <p className="profile-subtitle">Manage your name and profile photo.</p>
        </div>
        <div className="profile-pill">
          <span className="dot green" />
          <span>Active</span>
        </div>
      </div>

      <div className="profile-card interactive">
        {/* LEFT */}
        <div className="profile-left">
          <div className="avatar-wrap">
            <img
              src={displayAvatar}
              alt="avatar"
              className={`avatar ${uploading ? "uploading" : ""}`}
            />
            {uploading && <div className="avatar-badge">Uploading…</div>}
          </div>

          <label className="upload-label">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;

                // preview instantly
                const r = new FileReader();
                r.onload = () => setPreview(r.result);
                r.readAsDataURL(f);

                handleImageUpload(f);
              }}
            />
            <span className="btn upload-btn">
              {uploading ? "Uploading..." : "Upload picture"}
            </span>
          </label>

          <p className="profile-hint">
            Tip: Use a square photo for best results.
          </p>
        </div>

        {/* RIGHT */}
        <div className="profile-right">
          <div className="profile-field">
            <div className="profile-label">Display name</div>

            {editing ? (
              <div className="edit-row">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New display name"
                />

                <div className="edit-controls">
                  <button className="btn start" onClick={handleSave}>
                    Save
                  </button>
                  <button
                    className="btn clear"
                    onClick={() => {
                      setEditing(false);
                      setNewName(profile.displayName);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-value">{profile.displayName}</div>
                <button
                  className="btn clear"
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

          <div className="profile-field">
            <div className="profile-label">Email</div>
            <div className="profile-value muted">{profile.email}</div>
          </div>

          <div className="profile-mini-grid">
            <div className="profile-mini">
              <div className="mini-title">Security</div>
              <div className="mini-sub">Keep your password safe</div>
            </div>
            <div className="profile-mini">
              <div className="mini-title">Community</div>
              <div className="mini-sub">Your name shows on posts</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}