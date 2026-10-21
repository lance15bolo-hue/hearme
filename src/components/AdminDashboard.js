// src/components/AdminDashboard.js
import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaWrench, FaChartBar, FaUsers, FaFileAlt } from "react-icons/fa";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fslPhrases } from "./fslPhrases";
import "./AdminDashboard.css";

const getDateObject = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLocalDateKey = (value) => {
  const date = getDateObject(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateTime = (value) => {
  const date = getDateObject(value);
  return date ? date.toLocaleString() : "N/A";
};

const isSameOrAfterToday = (value) => {
  const date = getDateObject(value);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today;
};

const sortByCreatedAtDescending = (items) => {
  return [...items].sort((a, b) => {
    const dateA = getDateObject(a.createdAt)?.getTime() || 0;
    const dateB = getDateObject(b.createdAt)?.getTime() || 0;
    return dateB - dateA;
  });
};

export default function AdminDashboard({ user, addToast }) {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dataError, setDataError] = useState("");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    todayPosts: 0,
    totalTranscripts: 0,
    totalLikes: 0,
    adminUsers: 0,
    regularUsers: 0,
    fslResources: 0,
    postsPerDay: {},
  });

  const [userSearch, setUserSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!user?.uid || user.role !== "admin") return;

    setLoading(true);
    setDataError("");

    try {
      /*
        IMPORTANT:
        HearMe saves transcript/session records in `academicSessions`.
        The old dashboard queried a non-existent `transcripts` collection,
        which could make the entire dashboard fail to load.

        The three reads are independent so one unavailable dataset does not
        blank the entire dashboard.
      */
      const results = await Promise.allSettled([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "posts")),
        getDocs(collection(db, "academicSessions")),
      ]);

      const [usersResult, postsResult, sessionsResult] = results;
      const errors = [];

      let usersData = [];
      let postsData = [];
      let transcriptsData = [];

      if (usersResult.status === "fulfilled") {
        usersData = usersResult.value.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
      } else {
        console.error("Failed to load users:", usersResult.reason);
        errors.push("users");
      }

      if (postsResult.status === "fulfilled") {
        postsData = postsResult.value.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        postsData = sortByCreatedAtDescending(postsData);
      } else {
        console.error("Failed to load posts:", postsResult.reason);
        errors.push("posts");
      }

      if (sessionsResult.status === "fulfilled") {
        transcriptsData = sessionsResult.value.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        transcriptsData = sortByCreatedAtDescending(transcriptsData);
      } else {
        console.error("Failed to load academic sessions:", sessionsResult.reason);
        errors.push("academic session history");
      }

      setUsers(usersData);
      setPosts(postsData);
      setTranscripts(transcriptsData);

      const postsPerDay = {};

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);
        const dateKey = getLocalDateKey(date);

        if (dateKey) {
          postsPerDay[dateKey] = 0;
        }
      }

      postsData.forEach((post) => {
        const dateKey = getLocalDateKey(post.createdAt);

        if (dateKey && postsPerDay[dateKey] !== undefined) {
          postsPerDay[dateKey] += 1;
        }
      });

      const totalLikes = postsData.reduce((sum, post) => {
        const likes = Number(post.likes);
        return sum + (Number.isFinite(likes) ? likes : 0);
      }, 0);

      const adminUsers = usersData.filter(
        (u) => String(u.role || "").toLowerCase() === "admin"
      ).length;

      const regularUsers = usersData.length - adminUsers;

      setStats({
        totalUsers: usersData.length,
        totalPosts: postsData.length,
        todayPosts: postsData.filter((p) => isSameOrAfterToday(p.createdAt))
          .length,
        totalTranscripts: transcriptsData.length,
        totalLikes,
        adminUsers,
        regularUsers,
        fslResources: Array.isArray(fslPhrases) ? fslPhrases.length : 0,
        postsPerDay,
      });

      if (errors.length > 0) {
        const message = `Some admin data could not be loaded: ${errors.join(", ")}.`;
        setDataError(message);
        addToast && addToast(message, "error");
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setDataError("Failed to load admin data. Please try again.");
      addToast && addToast("Failed to load admin data", "error");
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

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

      await loadData();
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

      await loadData();
    } catch (err) {
      console.error(err);
      addToast && addToast("Failed to update role", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <section className="panel">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </section>
    );
  }

  if (loading) return <p>Loading admin data...</p>;

  const filteredUsers = users.filter((u) => {
    const search = userSearch.toLowerCase();

    return (
      String(u.email || "").toLowerCase().includes(search) ||
      String(u.displayName || "").toLowerCase().includes(search) ||
      String(u.role || "").toLowerCase().includes(search)
    );
  });

  const filteredPosts = posts.filter((p) => {
    const search = postSearch.toLowerCase();

    return (
      String(p.text || "").toLowerCase().includes(search) ||
      String(p.name || "").toLowerCase().includes(search) ||
      String(p.uid || "").toLowerCase().includes(search)
    );
  });

  const filteredTranscripts = transcripts.filter((t) => {
    const search = transcriptSearch.toLowerCase();

    return (
      String(t.userId || "").toLowerCase().includes(search) ||
      String(t.subject || "").toLowerCase().includes(search) ||
      String(t.instructor || "").toLowerCase().includes(search) ||
      String(t.captions || "").toLowerCase().includes(search) ||
      String(t.translated || "").toLowerCase().includes(search) ||
      String(t.context || "").toLowerCase().includes(search)
    );
  });

  const overviewChartData = [
    {
      name: "Users",
      total: stats.totalUsers,
    },
    {
      name: "Posts",
      total: stats.totalPosts,
    },
    {
      name: "Today Posts",
      total: stats.todayPosts,
    },
    {
      name: "Sessions",
      total: stats.totalTranscripts,
    },
    {
      name: "FSL",
      total: stats.fslResources,
    },
    {
      name: "Likes",
      total: stats.totalLikes,
    },
  ];

  const postsLineChartData = Object.entries(stats.postsPerDay || {}).map(
    ([date, count]) => ({
      date,
      posts: count,
    })
  );

  const userRoleChartData = [
    {
      name: "Administrator accounts",
      value: stats.adminUsers,
    },
    {
      name: "Standard user accounts",
      value: stats.regularUsers,
    },
  ];

  const pieColors = ["#6366f1", "#22c55e"];

  return (
    <section className="panel">
      <h2>
        <FaWrench /> Admin Dashboard
      </h2>

      {dataError && (
        <div
          role="alert"
          style={{
            margin: "12px 0 18px",
            padding: "12px 14px",
            borderRadius: "12px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          {dataError}
        </div>
      )}

      {/* Stats Cards */}
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

        <div className="stat-card">
          <h3>Sessions / Transcripts</h3>
          <p>{stats.totalTranscripts}</p>
        </div>

        <div className="stat-card">
          <h3>FSL Resources</h3>
          <p>{stats.fslResources}</p>
        </div>
      </div>

      {/* Graph Section */}
      <h3 style={{ marginTop: "30px" }}>
        <FaChartBar /> Analytics Graphs
      </h3>

      <div className="admin-charts">
        <div className="chart-card">
          <h3>Admin Overview</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={overviewChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="total"
                name="Total"
                fill="#6366f1"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Posts Last 7 Days</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={postsLineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="posts"
                name="Posts"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card user-role-chart-card">
          <div className="chart-heading-group">
            <h3>User Account Distribution</h3>
            <p className="chart-description">
              Breakdown of registered accounts by assigned role.
            </p>
          </div>

          {stats.totalUsers === 0 ? (
            <div className="chart-empty-state" role="status">
              No user account data is available to display yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={userRoleChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={88}
                    innerRadius={48}
                    paddingAngle={3}
                    label={({ value, percent }) =>
                      `${value} (${(percent * 100).toFixed(1)}%)`
                    }
                    labelLine
                  >
                    {userRoleChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} account${Number(value) === 1 ? "" : "s"}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="role-breakdown-list">
                {userRoleChartData.map((entry, index) => {
                  const percentage = stats.totalUsers
                    ? ((entry.value / stats.totalUsers) * 100).toFixed(1)
                    : "0.0";

                  return (
                    <div className="role-breakdown-item" key={entry.name}>
                      <span
                        className="role-breakdown-dot"
                        style={{ backgroundColor: pieColors[index] }}
                        aria-hidden="true"
                      />
                      <span className="role-breakdown-label">{entry.name}</span>
                      <strong>{entry.value}</strong>
                      <span className="role-breakdown-percent">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Users Table */}
      <h3>
        <FaUsers /> Users
      </h3>

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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="4">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "N/A"}</td>
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
                        disabled={busy || u.id === user.uid}
                        onClick={() => changeUserRole(u.id, "user")}
                      >
                        {u.id === user.uid ? "Current Admin" : "Demote"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Posts Table */}
      <h3>
        <FaFileAlt /> Posts
      </h3>

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
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan="5">No posts found.</td>
              </tr>
            ) : (
              filteredPosts.map((p) => (
                <tr key={p.id}>
                  <td>{p.name || p.uid || "N/A"}</td>
                  <td style={{ maxWidth: "400px", overflowWrap: "anywhere" }}>
                    {p.text || ""}
                  </td>
                  <td>{p.likes || 0}</td>
                  <td>{formatDateTime(p.createdAt)}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Academic Sessions / Transcript Table */}
      <h3>
        <FaFileAlt /> Academic Sessions / Transcripts
      </h3>

      <input
        placeholder="Search sessions or transcripts..."
        value={transcriptSearch}
        onChange={(e) => setTranscriptSearch(e.target.value)}
        className="search-input"
      />

      <div className="table-wrapper scrollable-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Subject</th>
              <th>Instructor</th>
              <th>Session Date</th>
              <th>Captions</th>
              <th>Translation</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {filteredTranscripts.length === 0 ? (
              <tr>
                <td colSpan="8">No academic sessions found.</td>
              </tr>
            ) : (
              filteredTranscripts.map((t) => (
                <tr key={t.id}>
                  <td>{t.userId || "N/A"}</td>
                  <td>{t.subject || "N/A"}</td>
                  <td>{t.instructor || "N/A"}</td>
                  <td>{t.sessionDate || "N/A"}</td>
                  <td style={{ maxWidth: "400px", overflowWrap: "anywhere" }}>
                    {t.captions || ""}
                  </td>
                  <td style={{ maxWidth: "400px", overflowWrap: "anywhere" }}>
                    {t.translated || ""}
                  </td>
                  <td>{t.sessionStatus || "N/A"}</td>
                  <td>{formatDateTime(t.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
