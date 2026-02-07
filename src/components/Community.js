// src/components/Community.js
import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  orderBy,
  query,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Community({ user, addToast }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = await Promise.all(snap.docs.map(async (d) => {
        const p = { id: d.id, ...d.data() };
        try {
          const uref = doc(db, "users", p.uid);
          const usnap = await getDoc(uref);
          p.avatar = usnap.exists() ? usnap.data().photoData || null : null;
        } catch {
          p.avatar = null;
        }
        return p;
      }));
      setPosts(docs);
    }, (err) => {
      console.error(err);
      addToast && addToast("Failed to load posts", "error");
    });
    return () => unsub();
  }, [addToast]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const uref = doc(db, "users", user.uid);
      const usnap = await getDoc(uref);
      const ud = usnap.exists() ? usnap.data() : {};
      const postDoc = {
        uid: user.uid,
        name: ud.displayName || user.email.split("@")[0],
        text: newPost.trim(),
        likes: 0,
        createdAt: serverTimestamp(),
      };
      const optimistic = { id: "temp-" + Date.now(), ...postDoc, avatar: ud.photoData || null };
      setPosts((ps) => [optimistic, ...ps]);
      setNewPost("");
      if (textareaRef.current) textareaRef.current.style.height = "50px";
      await addDoc(collection(db, "posts"), postDoc);
      addToast && addToast("Posted!", "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to post", "error");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post) => {
    setPosts((ps) => ps.map((p) => (p.id === post.id ? { ...p, _pulsing: true } : p)));
    setTimeout(() => setPosts((ps) => ps.map((p) => (p.id === post.id ? { ...p, _pulsing: false } : p))), 400);
    try {
      const pRef = doc(db, "posts", post.id);
      const snap = await getDoc(pRef);
      const current = snap.exists() ? snap.data().likes || 0 : 0;
      await updateDoc(pRef, { likes: current + 1 });
    } catch (err) {
      console.error("like error", err);
      addToast && addToast("Failed to like", "error");
    }
  };

  return (
    <section className="panel community-panel">
      <h2>💬 Community</h2>

      <form onSubmit={handlePost} className="post-form" aria-label="Create a post">
        <textarea
          ref={textareaRef}
          className="post-textarea"
          placeholder="Share something with the community..."
          value={newPost}
          onChange={(e) => { setNewPost(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; }}
          rows={1}
          disabled={posting}
        />
        <div className="post-controls">
          <button type="submit" className="btn post-btn" disabled={posting || !newPost.trim()}>
            {posting ? "Posting..." : "📤 Post"}
          </button>
        </div>
      </form>

      <div className="posts-grid">
        {posts.map((post) => (
          <article key={post.id} className={`post-card ${post._pulsing ? "pulse" : ""}`}>
            <header className="post-card-header">
              <img src={post.avatar ? post.avatar : "https://via.placeholder.com/48?text=👤"} alt={post.name} className="post-avatar" />
              <div>
                <div className="post-name">{post.name}</div>
                <div className="post-meta">{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : ""}</div>
              </div>
            </header>

            <div className="post-body">{post.text}</div>

            <footer className="post-card-footer">
              <button className="like-button" onClick={() => handleLike(post)} aria-label="Like post">
                <span className="heart">❤️</span>
                <span className="like-count">{post.likes || 0}</span>
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}