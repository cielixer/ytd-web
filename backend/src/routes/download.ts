import { Router } from "express";
import { statSync } from "fs";
import type { Config } from "../config";
import { validateYouTubeUrl } from "../utils/validation";
import { downloadAudio, cleanupFile, createFileStream } from "../services/ytdlp";

export function createDownloadRouter(config: Config): Router {
  const router = Router();

  /**
   * POST /api/download
   * Download audio from a YouTube URL and stream the MP3 back.
   * Body: { url: "https://youtube.com/watch?v=..." }
   */
  router.post("/", async (req, res) => {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const validatedUrl = validateYouTubeUrl(url);
    if (!validatedUrl) {
      res.status(400).json({
        error: "Invalid YouTube URL. Only youtube.com and youtu.be links are accepted.",
      });
      return;
    }

    try {
      const { filePath, title } = await downloadAudio(validatedUrl, config);

      // Sanitize title for use in filename
      const safeTitle = title
        .replace(/[^a-zA-Z0-9\s\-_().]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        || "download";

      const stat = statSync(filePath);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", stat.size);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.mp3"`,
      );

      const stream = createFileStream(filePath);

      stream.pipe(res);

      stream.on("end", () => {
        cleanupFile(filePath);
      });

      stream.on("error", (err) => {
        cleanupFile(filePath);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream file" });
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      console.error("Download error:", message);

      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download audio. Please check the URL and try again." });
      }
    }
  });

  return router;
}
