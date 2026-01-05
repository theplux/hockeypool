/**
 * Get the current season year
 * If month >= 7 (July), use next year as current season
 * Otherwise, use current year
 */
export function getCurrentSeasonYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  
  // If we're in July or later, the season is the next year
  if (month >= 7) {
    return year + 1;
  }
  return year;
}

// Current season is 2025-26 (starting year 2025)
export const CURRENT_SEASON_YEAR = 2025;

