import { execFile } from "child_process";
import { mkdirSync, existsSync, unlinkSync, readFileSync, createReadStream } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import type { Config } from "../config";

export interface DownloadProgress {
  status: "downloading" | "converting" | "complete" | "error";
  percent?: number;
  title?: string;
  filePath?: string;
  error?: string;
}

/**
 * Downloads audio from a YouTube URL using yt-dlp.
 * Uses execFile (NOT exec) to prevent shell injection.
 * Returns the path to the downloaded MP3 file.
 */
export function downloadAudio(
  url: string,
  config: Config,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<{ filePath: string; title: string }> {
  return new Promise((resolve, reject) => {
    // Ensure temp directory exists
    if (!existsSync(config.tmpDir)) {
      mkdirSync(config.tmpDir, { recursive: true });
    }

    const fileId = uuidv4();
    const outputTemplate = join(config.tmpDir, `${fileId}.%(ext)s`);
    const titleFile = join(config.tmpDir, `${fileId}.title`);

    const args = [
      // Use Node.js as the JavaScript runtime for EJS challenge solving
      "--js-runtimes", "node",
      // Extract audio only
      "-x",
      // Convert to MP3
      "--audio-format", "mp3",
      // Best audio quality
      "--audio-quality", "0",
      // Embed metadata (title, artist, etc.)
      "--embed-metadata",
      // Embed thumbnail into the audio file
      "--embed-thumbnail",
      // Output file naming
      "-o", outputTemplate,
      // Write the title to a sidecar file (--print causes skip-download behavior)
      "--print-to-file", "%(title)s", titleFile,
      // Progress output for parsing
      "--newline",
      "--progress-template", "%(progress._percent_str)s",
      // Security: disable config files and external programs
      "--no-exec",
      "--ignore-config",
      // No playlist — only single video
      "--no-playlist",
      // The URL to download (last argument)
      url,
    ];

    onProgress?.({ status: "downloading" });

    let title = "Unknown";
    let stderrBuffer = "";

    const proc = execFile("yt-dlp", args, {
      timeout: 5 * 60 * 1000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    }, (error, stdout, stderr) => {
      if (error) {
        onProgress?.({ status: "error", error: error.message });
        // Clean up any partial files
        cleanupFiles(config.tmpDir, fileId);
        reject(new Error(`yt-dlp failed: ${error.message}\n${stderr}`));
        return;
      }

      // Read title from sidecar file
      if (existsSync(titleFile)) {
        try {
          title = readFileSync(titleFile, "utf-8").trim();
        } catch {
          // Best effort — fall back to "Unknown"
        }
        cleanupFile(titleFile);
      }

      const expectedPath = join(config.tmpDir, `${fileId}.mp3`);

      if (!existsSync(expectedPath)) {
        onProgress?.({ status: "error", error: "Output file not found" });
        reject(new Error("yt-dlp completed but output file not found"));
        return;
      }

      onProgress?.({ status: "complete", title, filePath: expectedPath });
      resolve({ filePath: expectedPath, title });
    });

    // Parse progress from stderr
    if (proc.stderr) {
      proc.stderr.on("data", (data: Buffer) => {
        stderrBuffer += data.toString();
        const percentMatch = data.toString().match(/([\d.]+)%/);
        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          onProgress?.({
            status: percent >= 100 ? "converting" : "downloading",
            percent: Math.min(percent, 100),
          });
        }
      });
    }
  });
}

/**
 * Clean up temp files for a given fileId.
 */
export function cleanupFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Best effort cleanup
  }
}

function cleanupFiles(tmpDir: string, fileId: string): void {
  // yt-dlp may create intermediate files with various extensions
  const extensions = ["mp3", "webm", "m4a", "part", "ytdl", "temp", "mp3.part", "title"];
  for (const ext of extensions) {
    cleanupFile(join(tmpDir, `${fileId}.${ext}`));
  }
}

/**
 * Create a read stream for the downloaded file.
 */
export function createFileStream(filePath: string) {
  return createReadStream(filePath);
}
