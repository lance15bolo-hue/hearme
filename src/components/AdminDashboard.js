// src/components/AdminDashboard.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function AdminDashboard({ user, addToast }) {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, todayPosts: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const uSnap = await getDocs(collection(db, "users"));
        const usersData = uSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const pSnap = await getDocs(pQuery);
        const postsData = pSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setUsers(usersData);
        setPosts(postsData);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        setStats({
          totalUsers: usersData.length,
          totalPosts: postsData.length,
          todayPosts: postsData.filter(p => p.createdAt?.toDate && p.createdAt.toDate() >= today).length
        });
      } catch (err) {
        console.error(err);
        addToast && addToast("Failed to load admin data", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [addToast]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setStats((s) => ({ ...s, totalPosts: Math.max(0, s.totalPosts - 1) }));
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
      setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u)));
      addToast && addToast(`User role updated to ${newRole}`, "success");
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to update role", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <section className="panel"><h2>Admin</h2><p>Loading admin data...</p></section>;

  return (
    <section className="panel admin-panel">
      <h2>🛠️ Admin Dashboard</h2>

      <div className="admin-stats">
        <div className="stat-card"><h3>Total Users</h3><p>{stats.totalUsers}</p></div>
        <div className="stat-card"><h3>Total Posts</h3><p>{stats.totalPosts}</p></div>
        <div className="stat-card"><h3>New Posts Today</h3><p>{stats.todayPosts}</p></div>
      </div>

      <h3>👤 Users</h3>
      <div className="table-container">
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.displayName}</td>
                <td>{u.role || "user"}</td>
                <td>
                  {u.role !== "admin" ? (
                    <button className="btn small" disabled={busy} onClick={() => changeUserRole(u.id, "admin")}>Promote to Admin</button>
                  ) : (
                    <button className="btn small" disabled={busy} onClick={() => changeUserRole(u.id, "user")}>Demote to User</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>📝 Posts</h3>
      <div className="table-container">
        <table className="admin-table">
          <thead><tr><th>User</th><th>Text</th><th>Likes</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td style={{ maxWidth: "420px", overflowWrap: "anywhere" }}>{p.text}</td>
                <td>{p.likes || 0}</td>
                <td>{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : "N/A"}</td>
                <td><button className="btn danger small" disabled={busy} onClick={() => handleDeletePost(p.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}