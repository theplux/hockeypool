import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Create a URL-friendly slug from a string
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get total salary for a player in a specific year
 * Returns the salary as a number, or the string value (UFA/RFA) if present
 */
export function getPlayerSalaryForYear(
  contractYears: Record<number, number | string>,
  year: number
): number | string {
  return contractYears[year] || 0;
}

/**
 * Check if a salary value is a string (UFA/RFA)
 */
export function isStringSalary(value: number | string): value is string {
  return typeof value === 'string';
}

/**
 * Get numeric salary value, returning 0 for string values (UFA/RFA)
 */
export function getNumericSalary(value: number | string): number {
  return typeof value === 'number' ? value : 0;
}

/**
 * Format a year as "2025-26" format
 */
export function formatYearRange(year: number): string {
  const nextYear = (year + 1).toString().slice(-2);
  return `${year}-${nextYear}`;
}

/**
 * Normalize a player name to handle both "First Last" and "Last, First" formats
 * Returns an array of possible normalized formats for comparison
 */
export function normalizePlayerName(name: string): string[] {
  const trimmed = name.trim();
  const normalized = trimmed.toLowerCase();
  
  // If name contains a comma, it's likely in "Last, First" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 2) {
      // Convert "Last, First" to "First Last"
      const firstLast = `${parts[1]} ${parts[0]}`.toLowerCase();
      return [normalized, firstLast];
    }
  }
  
  // If name doesn't contain a comma, try converting to "Last, First" format
  // Split by space and assume last word is last name, rest is first name
  const spaceParts = trimmed.split(/\s+/).filter(p => p.length > 0);
  if (spaceParts.length >= 2) {
    const lastPart = spaceParts[spaceParts.length - 1];
    const firstParts = spaceParts.slice(0, -1);
    const lastFirst = `${lastPart}, ${firstParts.join(' ')}`.toLowerCase();
    return [normalized, lastFirst];
  }
  
  return [normalized];
}

/**
 * Check if a player name matches any injury name
 */
export function isPlayerInjured(
  playerName: string,
  injuryNames: string[]
): boolean {
  const playerNameVariants = normalizePlayerName(playerName);
  
  return injuryNames.some(injuryName => {
    const injuryNameVariants = normalizePlayerName(injuryName);
    return playerNameVariants.some(playerVariant =>
      injuryNameVariants.some(injuryVariant => playerVariant === injuryVariant)
    );
  });
}

