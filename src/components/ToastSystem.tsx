"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster, resolveValue } from "react-hot-toast";
import type { Toast } from "react-hot-toast";

// --- Standard toast ----------------------------------------------------------

const toastContainerStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  padding: "var(--space-4)",
  color: "var(--color-text)",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  border: "2px solid var(--color-primary-500)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-md)",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: "300px",
  borderImage: "linear-gradient(to right, var(--color-primary-500), var(--color-secondary-500)) 1",
};

const CustomToast = ({ t }: { t: Toast }) => {
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

// --- Confirm dialog (real <dialog>) ------------------------------------------

interface ConfirmRequest {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Global pub/sub for confirm requests so `useToast().confirm()` (callable from
 * anywhere) can drive a single `<ConfirmDialog>` instance mounted next to
 * the `<Toaster>` in `ToastSystem`.
 */
type Listener = (req: ConfirmRequest | null) => void;
const confirmListeners = new Set<Listener>();
let pendingConfirm: ConfirmRequest | null = null;

function requestConfirm(req: ConfirmRequest) {
  pendingConfirm = req;
  confirmListeners.forEach((l) => l(req));
}

function clearConfirm() {
  pendingConfirm = null;
  confirmListeners.forEach((l) => l(null));
}

const ConfirmDialog: React.FC = () => {
  const [request, setRequest] = useState<ConfirmRequest | null>(pendingConfirm);
  const [isProcessing, setIsProcessing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const listener: Listener = (req) => setRequest(req);
    confirmListeners.add(listener);
    return () => {
      confirmListeners.delete(listener);
    };
  }, []);

  // Open / close the native <dialog> imperatively when the request changes.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (request && !el.open) {
      el.showModal();
      // Focus the safer button (cancel) by default — Enter accepts is too easy.
      setTimeout(() => cancelButtonRef.current?.focus(), 0);
    } else if (!request && el.open) {
      el.close();
    }
  }, [request]);

  const handleCancel = useCallback(() => {
    if (isProcessing) return;
    if (request?.onCancel) request.onCancel();
    clearConfirm();
  }, [request, isProcessing]);

  const handleConfirm = useCallback(async () => {
    if (!request || isProcessing) return;
    setIsProcessing(true);
    try {
      await request.onConfirm();
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsProcessing(false);
      clearConfirm();
    }
  }, [request, isProcessing]);

  if (!request) {
    return (
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-dialog-message" />
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-message"
      onCancel={(e) => {
        // Native <dialog> fires `cancel` on Escape — translate to our handler.
        e.preventDefault();
        handleCancel();
      }}
    >
      <p id="confirm-dialog-message" className="confirm-dialog-message">
        {request.message}
      </p>
      <div className="confirm-dialog-actions">
        <button
          ref={cancelButtonRef}
          type="button"
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={isProcessing}
        >
          {request.cancelText || "Cancel"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? "Working..." : request.confirmText || "Confirm"}
        </button>
      </div>
    </dialog>
  );
};

// --- Public surface ----------------------------------------------------------

export const ToastSystem = () => {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }}>
        {(t) => <CustomToast t={t} />}
      </Toaster>
      <ConfirmDialog />
    </>
  );
};

export const useToast = () => {
  return {
    show: (msg: string) => toast(msg),
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    loading: (msg: string) => toast.loading(msg),
    dismiss: (toastId?: string) => toast.dismiss(toastId),

    confirm: (message: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => {
      requestConfirm({ message, onConfirm, ...(onCancel ? { onCancel } : {}) });
    },
  };
};
