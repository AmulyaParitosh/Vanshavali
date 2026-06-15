"use client";

import React from "react";
import toast, { Toaster, resolveValue } from "react-hot-toast";
import type { Toast } from "react-hot-toast";

// --- Types ---
type ConfirmToastOptions =
  | {
      message: string;
      onConfirm: () => void;
      onCancel?: () => void;
      confirmText?: string;
      cancelText?: string;
    }
  | {
      message: string;
      onConfirm: () => void;
      onCancel: undefined;
      confirmText?: string;
      cancelText?: string;
    };

// --- Custom Styles (Inline to work with easy integration, using CSS vars) ---
const toastContainerStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  padding: "16px",
  color: "var(--color-text)",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  border: "2px solid var(--color-primary)",
  borderRadius: "var(--border-radius-lg)",
  boxShadow: "0 4px 12px var(--color-shadow)",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: "300px",
  borderImage: "linear-gradient(to right, var(--color-primary), var(--color-secondary)) 1",
};

const confirmContainerStyle: React.CSSProperties = {
  ...toastContainerStyle,
  flexDirection: "column",
  alignItems: "stretch",
  padding: "20px",
  border: "2px solid var(--color-primary)", // Solid border for confirm
  borderImage: "none",
};

// --- Custom Components ---

const CustomToast = ({ t }: { t: Toast }) => {
  // role="alert" + assertive announces immediately for errors; "status" +
  // polite waits for the user to finish whatever they're doing for everything
  // else. Following ARIA Authoring Practices.
  const isError = t.type === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      style={{
        ...toastContainerStyle,
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Icon based on type — aria-hidden so screen readers don't announce
       * "check mark" before the message text. */}
      {t.type === "success" && (
        <span aria-hidden="true" style={{ color: "var(--color-success)", fontSize: "1.5em" }}>
          ✔
        </span>
      )}
      {t.type === "error" && (
        <span aria-hidden="true" style={{ color: "var(--color-danger)", fontSize: "1.5em" }}>
          ✖
        </span>
      )}
      {t.type === "loading" && (
        <span aria-hidden="true" style={{ color: "var(--color-warning)", fontSize: "1.5em" }}>
          ⏳
        </span>
      )}

      <div style={{ flex: 1 }}>{resolveValue(t.message, t)}</div>

      {/* Close Button */}
      {t.type !== "loading" && (
        <button
          onClick={() => toast.dismiss(t.id)}
          aria-label="Dismiss notification"
          title="Dismiss"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-light)",
            cursor: "pointer",
            fontSize: "1.2em",
            padding: "0 4px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

const ConfirmToast = ({ t, options }: { t: Toast; options: ConfirmToastOptions }) => {
  return (
    <div
      style={{
        ...confirmContainerStyle,
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? "scale(1)" : "scale(0.9)",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ fontSize: "1.1em", marginBottom: "16px", textAlign: "center" }}>
        {options.message}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
        <button
          className="btn btn-primary"
          onClick={async () => {
            try {
              await options.onConfirm();
              toast.dismiss(t.id);
            } catch (error) {
              console.error("Confirmation action failed:", error);
              // Error is expected to be handled by the caller or displayed via toast.error
              // We don't dismiss the toast here if it fails, or we do?
              // Usually we dismiss it because the action was TRIED.
              toast.dismiss(t.id);
            }
          }}
          style={{ padding: "8px 16px", fontSize: "0.9em" }}
        >
          {options.confirmText || "Yes"}
        </button>
        <button
          className="btn back-button"
          onClick={() => {
            if (options.onCancel) options.onCancel();
            toast.dismiss(t.id);
          }}
          style={{ padding: "8px 16px", fontSize: "0.9em" }}
        >
          {options.cancelText || "No"}
        </button>
      </div>
    </div>
  );
};

// --- Toast System Component ---

export const ToastSystem = () => {
  return (
    <Toaster position="top-right" toastOptions={{ duration: 4000 }}>
      {(t) => (
        // If it's a custom 'confirm' toast, render that, otherwise standard
        // We'll use a specific ID prefix or strict checking if needed,
        // but react-hot-toast allows passing generic components or custom rendering.
        // For simplicity here, we check if the message is an object with specific props,
        // OR we can rely on a custom trigger.
        // BETTER APPROACH: We use `toast.custom` for confirmation, so we don't need logic here
        // for it unless we want global styles override.
        // Let's just use the CustomToast for standard messages.
        // To avoid conflict with `toast.custom`, we check if it's a standard type.
        <CustomToast t={t} />
      )}
    </Toaster>
  );
};

// --- Hook ---

export const useToast = () => {
  return {
    show: (msg: string) => toast(msg),
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    loading: (msg: string) => toast.loading(msg),
    dismiss: (toastId?: string) => toast.dismiss(toastId),

    confirm: (message: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => {
      toast.custom(
        (t) => (
          <ConfirmToast t={t} options={{ message, onConfirm, ...(onCancel && { onCancel }) }} />
        ),
        { duration: Infinity, id: "confirm-toast" } // Infinity so it doesn't auto-close
      );
    },
  };
};
