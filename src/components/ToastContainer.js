// src/components/ToastContainer.js
import React from "react";

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-root" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}