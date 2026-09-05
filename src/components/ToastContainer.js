// src/components/ToastContainer.js
import React from "react";

export default function ToastContainer({ toasts }) {
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: "110px",
right: "50%",
transform: "translateX(50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "320px",
        maxWidth: "calc(100vw - 40px)",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            background:
              t.type === "success"
                ? "#0F6E56"
                : "#E24B4A",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "14px",
            boxShadow:
              "0 10px 25px rgba(0,0,0,0.25)",
            animation:
              "toastSlideIn 0.25s ease-out",
          }}
        >
          {t.msg}
        </div>
      ))}

      <style>
        {`
          @keyframes toastSlideIn {
            from {
              opacity: 0;
              transform: translateY(-15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}