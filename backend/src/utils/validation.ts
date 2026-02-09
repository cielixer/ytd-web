const ALLOWED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
];

/**
 * Validates that a string is a legitimate YouTube URL.
 * Returns the sanitized URL string or null if invalid.
 */
export function validateYouTubeUrl(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Only allow http and https protocols
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  // Check against allowed hostnames
  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.includes(hostname)) {
    return null;
  }

  // For youtube.com, require a video ID in the URL
  if (hostname.endsWith("youtube.com")) {
    const videoId = url.searchParams.get("v");
    if (!videoId && !url.pathname.startsWith("/shorts/") && !url.pathname.startsWith("/live/")) {
      return null;
    }
  }

  // For youtu.be, require a path (the video ID)
  if (hostname.endsWith("youtu.be")) {
    if (!url.pathname || url.pathname === "/") {
      return null;
    }
  }

  return url.toString();
}
