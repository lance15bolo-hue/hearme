import React, { useEffect, useRef, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import ConfirmDialog from "./ConfirmDialog";
import "./History.css";

const PAGE_SIZE = 10;
function sessionTime(session) {
  const value = session.sessionDate || session.createdAt;
  const date = value?.toDate ? value.toDate() : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
function formatDate(session) {
  const time = sessionTime(session);
  return time ? new Date(time).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";
}

export default function History({ user, setActivePage, setSelectedHistory }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deleteLock = useRef(false);
  const uid = user?.uid;
  const isGuest = user?.role === "guest";

  useEffect(() => {
    setSessions([]);
    setPending(null);
    setError("");
    setNotice("");
    setSearch("");
    setPage(1);
    if (!uid || isGuest) { setLoading(false); return undefined; }
    setLoading(true);
    const q = query(collection(db, "academicSessions"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
        .sort((a, b) => sessionTime(b) - sessionTime(a)));
      setError("");
      setLoading(false);
    }, () => {
      setSessions([]);
      setError("Unable to load session history. Check your connection and try reopening History.");
      setLoading(false);
    });
  }, [uid, isGuest]);

  const filtered = sessions.filter((session) =>
    [session.subject, session.instructor, session.context, formatDate(session)]
      .some((value) => String(value || "").toLowerCase().includes(search.trim().toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const deleteSession = async () => {
    if (deleteLock.current || !pending || !uid || isGuest || pending.userId !== uid) return;
    deleteLock.current = true;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await deleteDoc(doc(db, "academicSessions", pending.id));
      setNotice("Session deleted successfully.");
      setPending(null);
    } catch (err) {
      setError("Could not delete this session. Check your connection and permissions, then try again.");
      setPending(null);
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  };

  return (
    <section className="history-container">
      <header className="history-heading">
        <div><h2>Academic Session History</h2><p>Review and manage your saved sessions.</p></div>
        <span className="history-count">{sessions.length} saved</span>
      </header>
      {notice && <p className="history-notice" role="status">{notice}</p>}
      {error && <p className="history-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading sessions...</p> : <>
        <label className="history-search" htmlFor="history-search">Search sessions
          <input id="history-search" type="search" value={search} placeholder="Subject, instructor, context, or date"
            onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
        {!sessions.length ? <div className="history-empty"><h3>{error ? "History unavailable" : "No Sessions Found"}</h3>
          <p>{error ? "Reopen History to try loading your sessions again." : isGuest || !uid ? "Sign in to access saved session history." : "Saved academic sessions will appear here."}</p></div>
        : !filtered.length ? <p role="status">No sessions match your search.</p>
        : <>
          <div className="history-table-scroll" role="region" aria-label="Saved academic sessions" tabIndex={0}>
            <table className="history-table">
              <caption className="history-sr-only">Your saved academic sessions, newest session date first</caption>
              <thead><tr>{["Subject", "Instructor", "Date", "Context", "Actions"].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
              <tbody>{visible.map((session) => <tr key={session.id}>
                <td>{session.subject || "Untitled Session"}</td><td>{session.instructor || "N/A"}</td>
                <td>{formatDate(session)}</td><td>{session.context || "N/A"}</td>
                <td><div className="history-actions">
                  <button type="button" className="history-view-btn" disabled={deleting} onClick={() => {
                    setSelectedHistory(session); setActivePage("historyDetails");
                  }} aria-label={`View ${session.subject || "session"}`}>View Session</button>
                  <button type="button" className="history-delete-btn" disabled={deleting} onClick={() => setPending(session)}
                    aria-label={`Delete ${session.subject || "session"}`}>Delete</button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <nav className="history-pagination" aria-label="History pages">
            <span>{filtered.length} result{filtered.length === 1 ? "" : "s"} · Page {currentPage} of {pages}</span>
            <div><button type="button" disabled={currentPage === 1 || deleting} onClick={() => setPage(currentPage - 1)}>Previous</button>
              <button type="button" disabled={currentPage === pages || deleting} onClick={() => setPage(currentPage + 1)}>Next</button></div>
          </nav>
        </>}
      </>}
      <ConfirmDialog open={Boolean(pending)} title="Delete this saved session?"
        message={`“${pending?.subject || "Untitled Session"}” and its saved transcript, translation, FSL timeline, and response snapshot will be permanently deleted. Its recording will be removed if no other saved session uses it. Download anything you need first.`}
        confirmLabel={deleting ? "Deleting..." : "Delete session"} cancelLabel="Keep session" variant="danger"
        onCancel={() => { if (!deleteLock.current) setPending(null); }} onConfirm={deleteSession} />
    </section>
  );
}
