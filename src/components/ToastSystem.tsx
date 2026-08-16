"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster, resolveValue } from "react-hot-toast";
import type { Toast } from "react-hot-toast";

// --- Standard toast ----------------------------------------------------------

// Tokens only, and no ornament: a toast is a cream card, not a heritage surface,
// so it carries no gradient and no marigold (§04 / R7).
const toastContainerStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  padding: "var(--space-4)",
  color: "var(--text-primary)",
  backgroundColor: "var(--surface-paper)",
  border: "1px solid var(--line-structure)",
  borderRadius: "var(--radius-12)",
  boxShadow: "var(--shadow-frame)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  minWidth: "300px",
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
      {/* One glyph, three inks — ✧ is the system's "detail" mark (green when it
          confirms). No emoji and no other dingbats (§04). The message states the
          outcome, so the glyph stays decorative. */}
      {t.type !== "blank" && (
        <span
          aria-hidden="true"
          style={{
            color:
              t.type === "success"
                ? "var(--chip-write-fg)"
                : t.type === "error"
                  ? "var(--color-red)"
                  : "var(--text-meta)",
            fontSize: "var(--font-size-lg)",
          }}
        >
          ✧
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

// --- Save toast (Spec 13) — bottom-centre, one at a time, 12s with Undo -------

export interface SaveToastRequest {
  primary: string;
  consequence?: string;
  onUndo?: () => void | Promise<void>;
  /** Amber glyph for a warning/conflict rather than a green save-confirm. */
  warn?: boolean;
}

type SaveListener = (r: SaveToastRequest | null) => void;
const saveListeners = new Set<SaveListener>();

/** Show the save toast. A new one replaces the current — they never stack. */
export function showSaveToast(req: SaveToastRequest) {
  saveListeners.forEach((l) => l(req));
}

const SaveToastHost: React.FC = () => {
  const [req, setReq] = useState<SaveToastRequest | null>(null);
  useEffect(() => {
    const l: SaveListener = (r) => setReq(r);
    saveListeners.add(l);
    return () => {
      saveListeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (!req) return undefined;
    // 12s while an Undo is offered (Spec 13), 3.5s for a plain confirm.
    const ms = req.onUndo ? 12000 : 3500;
    const id = setTimeout(() => setReq(null), ms);
    return () => clearTimeout(id);
  }, [req]);
  if (!req) return null;

  return (
    <div className="toast-viewport">
      <div className={`toast${req.warn ? " toast--warn" : ""}`} role="status" aria-live="polite">
        <span className="toast-glyph" aria-hidden="true">
          ✧
        </span>
        <div className="toast-body">
          <span className="toast-primary">{req.primary}</span>
          {req.consequence && <span className="toast-consequence">{req.consequence}</span>}
        </div>
        {req.onUndo && (
          <button
            type="button"
            className="toast-action"
            onClick={async () => {
              const undo = req.onUndo;
              setReq(null);
              await undo?.();
              showSaveToast({ primary: "Put back the way it was" });
            }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
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
      <SaveToastHost />
    </>
  );
};

export const useToast = () => {
  return {
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    loading: (msg: string) => toast.loading(msg),
    dismiss: (toastId?: string) => toast.dismiss(toastId),

    confirm: (message: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => {
      requestConfirm({ message, onConfirm, ...(onCancel ? { onCancel } : {}) });
    },
  };
};
