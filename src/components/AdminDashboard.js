// src/components/AdminDashboard.js
import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import "./AdminDashboard.css";

export default function AdminDashboard({ user, addToast }) {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    todayPosts: 0,
    postsPerDay: {},
  });

  const [userSearch, setUserSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(collection(db, "users"));
      const usersData = uSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const pSnap = await getDocs(
        query(collection(db, "posts"), orderBy("createdAt", "desc"))
      );
      const postsData = pSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const tSnap = await getDocs(collection(db, "transcripts"));
      const transcriptsData = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setUsers(usersData);
      setPosts(postsData);
      setTranscripts(transcriptsData);

      const postsPerDay = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        postsPerDay[d.toISOString().split("T")[0]] = 0;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      postsData.forEach((p) => {
        if (p.createdAt?.toDate) {
          const date = p.createdAt.toDate().toISOString().split("T")[0];
          if (postsPerDay[date] !== undefined) postsPerDay[date]++;
        }
      });

      setStats({
        totalUsers: usersData.length,
        totalPosts: postsData.length,
        todayPosts: postsData.filter(
          (p) => p.createdAt?.toDate && p.createdAt.toDate() >= today
        ).length,
        postsPerDay,
      });
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to load admin data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      addToast && addToast("Post deleted", "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to delete post", "error");
    } finally {
      setBusy(false);
    }
  };

  const changeUserRole = async (uid, newRole) => {
    if (!window.confirm(`Set role to "${newRole}" for this user?`)) return;
    setBusy(true);
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u))
      );
      addToast && addToast(`User role updated to ${newRole}`, "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to update role", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <p>Loading user...</p>;

  if (user.role !== "admin")
    return (
      <section className="panel">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </section>
    );

  if (loading) return <p>Loading admin data...</p>;

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredPosts = posts.filter(
    (p) =>
      p.text?.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.name?.toLowerCase().includes(postSearch.toLowerCase())
  );

  const filteredTranscripts = transcripts.filter(
    (t) =>
      t.userId?.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.postId?.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  return (
    <section className="panel">
      <h2>🛠️ Admin Dashboard</h2>

      {/* EVERYTHING BELOW IS EXACTLY YOUR ORIGINAL CONTENT */}

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Total Posts</h3>
          <p>{stats.totalPosts}</p>
        </div>
        <div className="stat-card">
          <h3>New Posts Today</h3>
          <p>{stats.todayPosts}</p>
        </div>
      </div>
      {/* Posts Per Day Analytics */}
      <h3 style={{ marginTop: "30px" }}>📊 Posts (Last 7 Days)</h3>
          <div className="admin-stats">
            {Object.entries(stats.postsPerDay || {}).map(([date, count]) => (
          <div key={date} className="stat-card">
             <h4>{date}</h4>
              <p>{count}</p>
          </div>
                ))}
          </div>

      {/* Users Table */}
      <h3>👤 Users</h3>
      <input
        placeholder="Search users..."
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        className="search-input"
      />
      <div className="table-wrapper scrollable-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.displayName || "(no name)"}</td>
                <td>{u.role || "user"}</td>
                <td>
                  {u.role !== "admin" ? (
                    <button
                      className="btn small"
                      disabled={busy}
                      onClick={() => changeUserRole(u.id, "admin")}
                    >
                      Promote
                    </button>
                  ) : (
                    <button
                      className="btn small"
                      disabled={busy}
                      onClick={() => changeUserRole(u.id, "user")}
                    >
                      Demote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Posts Table */}
      <h3>📝 Posts</h3>
      <input
        placeholder="Search posts..."
        value={postSearch}
        onChange={(e) => setPostSearch(e.target.value)}
        className="search-input"
      />
      <div className="table-wrapper scrollable-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Text</th>
              <th>Likes</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td style={{ maxWidth: "400px", overflowWrap: "anywhere" }}>
                  {p.text}
                </td>
                <td>{p.likes || 0}</td>
                <td>
                  {p.createdAt?.toDate
                    ? p.createdAt.toDate().toLocaleString()
                    : "N/A"}
                </td>
                <td>
                  <button
                    className="btn danger"
                    disabled={busy}
                    onClick={() => handleDeletePost(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transcripts Table */}
      <h3>📝 Transcripts</h3>
      <input
        placeholder="Search transcripts..."
        value={transcriptSearch}
        onChange={(e) => setTranscriptSearch(e.target.value)}
        className="search-input"
      />
      <div className="table-wrapper scrollable-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Post ID</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {filteredTranscripts.map((t) => (
              <tr key={t.id}>
                <td>{t.userId}</td>
                <td>{t.postId}</td>
                <td style={{ maxWidth: "400px", overflowWrap: "anywhere" }}>
                  {t.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}