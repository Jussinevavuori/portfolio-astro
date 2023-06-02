/**
 * Format a project's timeline into one of the following
 * formats:
 *
 * (Empty)						No dates given
 * 1/2020 - Now				Only start date given
 * 2/2020							Only end date given or both dates in same month
 * 1/2020 - 2/2020		Both dates given
 */
export function formatTimeline(
  start: Date | undefined,
  end: Date | undefined
): string {
  // Assume yyyy-MM-dd format
  const format = (d: Date | undefined) => {
    if (!d) return "";
    const [yyyy, MM] = d.toISOString().split("-");
    return `${parseInt(MM)}/${yyyy}`;
  };

  // No dates given
  if (!start && !end) {
    return "";
  }

  // Only start date given
  if (!end && start) {
    return `${format(start)} - Now`;
  }

  // Only end date given
  if (!start && end) {
    return `${format(end)}`;
  }

  // Same month
  if (format(end) === format(start)) {
    return `${format(start)}`;
  }

  // Both given
  return `${format(start)} - ${format(end)}`;
}
