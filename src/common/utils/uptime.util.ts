/**
 * Utility function to calculate uptime in a human-readable format
 * @param startTime - Start time as Date object or timestamp in milliseconds
 * @returns Formatted uptime string (e.g., "2d 3h 45m 12s")
 */
export function calculateUptime(startTime: Date | number): string {
  const startMs =
    typeof startTime === 'number' ? startTime : startTime.getTime();
  const now = new Date();
  const diffMs = now.getTime() - startMs;

  const totalSeconds = Math.floor(diffMs / 1000);

  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);

  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);

  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const uptime =
    [
      days > 0 ? `${days}d` : '',
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      seconds > 0 ? `${seconds}s` : '',
    ]
      .filter(Boolean)
      .join(' ') || '0s';

  return uptime;
}

/**
 * Utility function to calculate uptime in milliseconds
 * @param startTime - Start time as Date object or timestamp in milliseconds
 * @returns Uptime in milliseconds
 */
export function calculateUptimeMs(startTime: Date | number): number {
  const startMs =
    typeof startTime === 'number' ? startTime : startTime.getTime();
  return Date.now() - startMs;
}
