/**
 * Type definitions for the hockey pool data structure
 */

export interface ContractYearSalary {
  year: number;
  salary: number;
}

export interface Player {
  name: string;
  nhlTeam: string;
  positions: string[]; // e.g., ["C", "LW"] or ["D"] or ["G"]
  contractYears: Record<number, number | string>; // Map of year -> salary (or "UFA"/"RFA")
  isRookie: boolean;
  teamName: string; // The pool team this player belongs to
}

export interface Extrapooler {
  slot: 1 | 2 | 3; // Which extrapooler slot (1, 2, or 3)
  originalOwner: string; // The original owner (to track traded extrapoolers)
  isUsed?: boolean; // Optional: true if used, false/undefined if available
}

// Legacy interface for backward compatibility
export interface ExtrapoolerStatus {
  extrapooler1: boolean; // true if available, false if used
  extrapooler2: boolean;
  extrapooler3: boolean;
}

export interface RookiePick {
  round: '1st' | '2nd' | '3rd';
  originalOwner: string; // The original owner (to track traded picks)
}

export interface DraftPick {
  round: '1st' | '2nd' | '3rd' | '4th' | '5th' | '6th' | '7th' | '8th';
  originalOwner: string; // The original owner (to track traded picks)
}

export interface TeamRoster {
  teamName: string;
  owner: string;
  players: Player[];
  extrapoolers?: Record<number, Extrapooler[]>; // Map of year -> Array of extrapoolers (tradeable)
  extrapoolerStatus?: Record<number, ExtrapoolerStatus>; // Legacy: Map of year -> Extrapooler status (for backward compatibility)
  rookiePicks?: Record<number, RookiePick[]>; // Map of year -> Array of rookie picks
  draftPicks?: Record<number, DraftPick[]>; // Map of year -> Array of draft picks (8 rounds)
}

export interface PoolData {
  teams: TeamRoster[];
  currentSeasonYear: number;
  availableYears: number[]; // All years that have salary data
}

export interface Bourse5AnsEntry {
  owner: string;
  totalPoints: number;
  yearPoints: Record<string, number>; // Map of year label -> points
}

export interface Trade {
  date: string;
  tradeId: string;
  teamA: string;
  teamAAssets: string; // Comma-separated list of assets
  teamB: string;
  teamBAssets: string; // Comma-separated list of assets
}

