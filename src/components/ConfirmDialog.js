import React, { useEffect } from "react";
import { FaExclamationCircle, FaSignOutAlt, FaBullhorn } from "react-icons/fa";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  icon = "warning",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const Icon = icon === "logout" ? FaSignOutAlt : icon === "update" ? FaBullhorn : FaExclamationCircle;

  return (
    <div
      className="hm-confirm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <section
        className="hm-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hm-confirm-title"
        aria-describedby="hm-confirm-message"
      >
        <div className={`hm-confirm-icon ${variant === "danger" ? "is-danger" : ""}`}>
          <Icon aria-hidden="true" />
        </div>

        <div className="hm-confirm-copy">
          <span className="hm-confirm-eyebrow">HEARME CONFIRMATION</span>
          <h2 id="hm-confirm-title">{title}</h2>
          <p id="hm-confirm-message">{message}</p>
        </div>

        <div className="hm-confirm-actions">
          <button type="button" className="hm-confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`hm-confirm-accept ${variant === "danger" ? "is-danger" : ""}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
