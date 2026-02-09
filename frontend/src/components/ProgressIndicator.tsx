interface ProgressIndicatorProps {
  status: "idle" | "downloading" | "converting" | "complete" | "error";
  message?: string;
}

export function ProgressIndicator({ status, message }: ProgressIndicatorProps) {
  if (status === "idle") return null;

  const statusText: Record<string, string> = {
    downloading: "Downloading audio...",
    converting: "Converting to MP3...",
    complete: "Download complete!",
    error: message ?? "Something went wrong",
  };

  const isActive = status === "downloading" || status === "converting";
  const isError = status === "error";
  const isComplete = status === "complete";

  return (
    <div className={`progress ${isError ? "progress-error" : ""} ${isComplete ? "progress-complete" : ""}`}>
      {isActive && (
        <div className="spinner" />
      )}
      {isComplete && (
        <svg className="check-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {isError && (
        <svg className="error-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      <span className="progress-text">
        {statusText[status] ?? message ?? ""}
      </span>
    </div>
  );
}
