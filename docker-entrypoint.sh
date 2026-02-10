#!/bin/sh
set -u

# Initial yt-dlp update attempt
echo "Updating yt-dlp..."
pip3 install --break-system-packages --no-cache-dir -U "yt-dlp[default]" || echo "yt-dlp update failed, continuing"

# Auto-update via cron (default: enabled)
AUTO_UPDATE="${YTDLP_AUTO_UPDATE:-true}"

if [ "$AUTO_UPDATE" = "true" ]; then
  UPDATE_INTERVAL="${YTDLP_UPDATE_INTERVAL:-6h}"
  
  # Convert interval to cron schedule
  case "$UPDATE_INTERVAL" in
    1h)  CRON_SCHEDULE="0 * * * *" ;;
    6h)  CRON_SCHEDULE="0 */6 * * *" ;;
    12h) CRON_SCHEDULE="0 */12 * * *" ;;
    24h) CRON_SCHEDULE="0 0 * * *" ;;
    *)   CRON_SCHEDULE="0 */6 * * *" ;;
  esac
  
  # Create cron job
  CRON_JOB="$CRON_SCHEDULE pip3 install --break-system-packages --no-cache-dir -U \"yt-dlp[default]\" > /proc/1/fd/1 2> /proc/1/fd/2"
  echo "$CRON_JOB" | crontab -
  
  # Start cron daemon
  echo "Starting cron daemon for yt-dlp auto-updates (interval: $UPDATE_INTERVAL)"
  cron
fi

# Drop privileges and start application
exec gosu ytdweb "$@"
