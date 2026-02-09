import { useState, useCallback } from "react";
import { ProgressIndicator } from "./ProgressIndicator";

type DownloadStatus = "idle" | "downloading" | "converting" | "complete" | "error";

export function DownloadForm() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleDownload = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setStatus("downloading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(data.error ?? "Download failed");
      }

      setStatus("converting");

      // Get filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition");
      let filename = "download.mp3";
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) {
          filename = match[1];
        }
      }

      // Stream the response as a blob and trigger browser download
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setStatus("complete");
      setUrl("");

      // Reset status after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setErrorMessage(message);
      setStatus("error");

      // Reset error after 5 seconds
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 5000);
    }
  }, [url]);

  const isProcessing = status === "downloading" || status === "converting";

  return (
    <div className="download-container">
      <h1 className="app-title">YTD-Web</h1>
      <p className="app-subtitle">Paste a YouTube link and download the music</p>

      <div className="input-row">
        <input
          type="url"
          className="url-input"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isProcessing) handleDownload();
          }}
          disabled={isProcessing}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={!url.trim() || isProcessing}
          type="button"
        >
          {isProcessing ? (
            <div className="btn-spinner" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </button>
      </div>

      <ProgressIndicator status={status} message={errorMessage} />
    </div>
  );
}
