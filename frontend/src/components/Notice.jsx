export default function Notice({ kind = "error", children, onDismiss }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <p>{children}</p>
      {onDismiss && (
        <button type="button" className="notice-close" onClick={onDismiss} aria-label="Dismiss message">
          Dismiss
        </button>
      )}
    </div>
  );
}
