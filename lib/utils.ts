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

