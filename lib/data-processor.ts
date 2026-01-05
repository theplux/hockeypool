import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { Player, TeamRoster, PoolData, ExtrapoolerStatus, Extrapooler, RookiePick, DraftPick, Bourse5AnsEntry, Trade } from './types';
import { CURRENT_SEASON_YEAR } from './constants';
import { fetchGoogleSheetAsCSV, fetchMultipleGoogleSheets, extractSpreadsheetId } from './google-sheets';

/**
 * Parse CSV file and transform into typed data structures
 */
export function parseCSV(csvContent: string): PoolData {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing errors:', parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  
  // Extract all available years from column headers
  // Handle formats like "2025", "2025 Salary", "2025-26 salary", "2025-26 Salary"
  const availableYears: number[] = [];
  const yearPattern = /^(\d{4})(?:-\d{2})?(?:\s+[Ss]alary)?$/i;
  
  // Get headers from first row or all rows
  const allKeys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => allKeys.add(key));
  });
  
  allKeys.forEach((key) => {
    const trimmed = key.trim();
    const match = trimmed.match(yearPattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (!availableYears.includes(year)) {
        availableYears.push(year);
      }
    }
  });
  
  availableYears.sort();
  
  // Ensure currentSeasonYear is always in availableYears
  if (!availableYears.includes(CURRENT_SEASON_YEAR)) {
    availableYears.push(CURRENT_SEASON_YEAR);
    availableYears.sort();
  }

  // Group players by team (use Owner as teamName if Team doesn't exist)
  const teamsMap = new Map<string, { owner: string; players: Player[] }>();

  rows.forEach((row) => {
    const owner = (row['Owner'] || row['owner'] || '').trim();
    const teamName = (row['Team'] || row['team'] || owner || '').trim(); // Use Owner if Team doesn't exist
    const playerName = (row['Player Name'] || row['player name'] || row['Player name'] || row['Player'] || row['player'] || '').trim();
    const nhlTeam = (row['NHL Team'] || row['nhl team'] || row['NHL team'] || row['NHL'] || row['nhl'] || '').trim();
    const positionStr = (row['Position'] || row['position'] || row['Pos'] || row['pos'] || '').trim();
    const isRookieStr = (row['Is Rookie'] || row['is rookie'] || row['Rookie'] || row['rookie'] || row['is rookie'] || '').toLowerCase().trim();
    const isRookie = isRookieStr === 'true' || isRookieStr === '1' || isRookieStr === 'yes';

    if (!teamName || !playerName) {
      return; // Skip invalid rows
    }

    // Parse positions (could be "C", "C/LW", "D", "G", etc.)
    const positions = positionStr
      .split(/[\/,]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Extract contract years and salaries
    const contractYears: Record<number, number | string> = {};
    
    // Find all salary columns that match the year pattern (case-insensitive)
    const rowKeys = Object.keys(row);
    const salaryColumnMap = new Map<number, string>(); // year -> column name
    
    rowKeys.forEach((key) => {
      const trimmed = key.trim();
      const match = trimmed.match(/^(\d{4})(?:-\d{2})?(?:\s+[Ss]alary)?$/i);
      if (match) {
        const year = parseInt(match[1], 10);
        if (availableYears.includes(year)) {
          salaryColumnMap.set(year, key);
        }
      }
    });
    
    availableYears.forEach((year) => {
      const columnName = salaryColumnMap.get(year);
      if (!columnName) return;
      
      const salaryStr = (row[columnName] || '').trim();
      
      if (!salaryStr) return;
      
      const upperSalaryStr = salaryStr.toUpperCase();
      
      // Handle UFA and RFA as string values
      if (upperSalaryStr === 'RFA' || upperSalaryStr === 'UFA') {
        contractYears[year] = upperSalaryStr;
      } else {
        // Handle salary values - might be in millions (e.g., "10.95" = $10,950,000)
        const cleaned = salaryStr.replace(/[^0-9.-]/g, '');
        let salary = parseFloat(cleaned);
        
        if (!isNaN(salary) && salary > 0) {
          // If the number is less than 1000, assume it's in millions
          if (salary < 1000) {
            salary = salary * 1000000;
          }
          contractYears[year] = salary;
        }
      }
    });

    const player: Player = {
      name: playerName,
      nhlTeam,
      positions: positions.length > 0 ? positions : ['Unknown'],
      contractYears,
      isRookie,
      teamName,
    };

    if (!teamsMap.has(teamName)) {
      teamsMap.set(teamName, { owner: owner || teamName, players: [] });
    }

    teamsMap.get(teamName)!.players.push(player);
  });

  // Convert map to array
  const teams: TeamRoster[] = Array.from(teamsMap.entries()).map(([teamName, data]) => ({
    teamName,
    owner: data.owner,
    players: data.players,
  }));

  const poolData: PoolData = {
    teams,
    currentSeasonYear: CURRENT_SEASON_YEAR,
    availableYears,
  };
  
  // Load and merge Extrapooler data
  const extrapoolerMap = loadExtrapoolerData();
  const poolDataWithExtrapoolers = mergeExtrapoolerData(poolData, extrapoolerMap);
  
  // Load and merge Rookie Picks data
  const rookiePicksMap = loadRookiePicksData();
  const poolDataWithRookiePicks = mergeRookiePicksData(poolDataWithExtrapoolers, rookiePicksMap);
  
  // Load and merge Draft Picks data
  const draftPicksMap = loadDraftPicksData();
  const poolDataWithDraftPicks = mergeDraftPicksData(poolDataWithRookiePicks, draftPicksMap);
  
  // Apply trades to reflect current roster state
  return applyTradesToPoolData(poolDataWithDraftPicks);
}

/**
 * Convert Excel sheet data to CSV-like rows
 * Handles format where first column is player names, and other columns are years
 */
function excelSheetToRows(worksheet: XLSX.WorkSheet): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Get headers from first row
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    const value = cell ? String(cell.v || '').trim() : '';
    headers[col] = value;
  }
  
  // Determine player name column (usually first column, but might have a header)
  const playerNameHeader = headers[0] || 'Player Name';
  
  // Get data rows (skip header row)
  for (let row = 1; row <= range.e.r; row++) {
    const rowData: Record<string, string> = {};
    let hasData = false;
    let playerName = '';
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      let value: string | number = '';
      
      if (cell) {
        // Handle different cell types
        if (cell.t === 'n') {
          value = cell.v; // Number
        } else {
          value = String(cell.v || '').trim(); // String
        }
      }
      
      if (col === range.s.c) {
        // First column is player name
        playerName = String(value);
        rowData['Player Name'] = playerName;
      } else {
        // Other columns are years
        const header = headers[col] || '';
        rowData[header] = String(value);
      }
      
      if (value !== '' && value !== null && value !== undefined) {
        hasData = true;
      }
    }
    
    if (hasData && playerName) {
      rows.push(rowData);
    }
  }
  
  return rows;
}

/**
 * Parse Excel sheet rows and extract players for a specific pooler/owner
 */
function parseExcelSheetForPooler(rows: Record<string, string>[], ownerName: string): Player[] {
  const players: Player[] = [];

  // Extract available years from headers
  const availableYears: number[] = [];
  // Handle formats like "2025-26", "2025", "2025 Salary"
  const yearPattern = /^(\d{4})(?:-\d{2})?(?:\s+Salary)?$/i;
  
  const allKeys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => allKeys.add(key));
  });
  
  allKeys.forEach((key) => {
    const trimmed = key.trim();
    const match = trimmed.match(yearPattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (!availableYears.includes(year)) {
        availableYears.push(year);
      }
    }
  });
  
  availableYears.sort();

  rows.forEach((row) => {
    // Try various column name variations
    const playerName = (
      row['Player Name'] || 
      row['player name'] || 
      row['Player'] || 
      row['player'] ||
      row['Name'] ||
      row['name'] ||
      ''
    ).trim();

    if (!playerName) {
      return; // Skip rows without player names
    }

    const nhlTeam = (
      row['NHL Team'] || 
      row['nhl team'] || 
      row['NHL'] || 
      row['nhl'] ||
      row['Team'] ||
      row['team'] ||
      ''
    ).trim();

    const positionStr = (
      row['Position'] || 
      row['position'] || 
      row['Pos'] || 
      row['pos'] ||
      ''
    ).trim();

    const isRookie = (
      row['Is Rookie'] || 
      row['is rookie'] || 
      row['Rookie'] || 
      row['rookie'] ||
      ''
    ).toLowerCase() === 'true' || 
    (row['Is Rookie'] || row['is rookie'] || row['Rookie'] || row['rookie'] || '') === '1';

    // Parse positions
    const positions = positionStr
      .split(/[\/,]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Extract contract years and salaries
    const contractYears: Record<number, number | string> = {};
    availableYears.forEach((year) => {
      // Try various year format keys: "2025", "2025-26", "2025 Salary", etc.
      const yearKey = year.toString();
      const yearRangeKey1 = `${year}-${(year + 1).toString().slice(-2)}`; // 2025-26
      const yearRangeKey2 = `${year}-${year + 1}`; // 2025-2026
      const yearSalaryKey = `${year} Salary`;
      
      // Check all possible keys
      const salaryValue = row[yearKey] || row[yearRangeKey1] || row[yearRangeKey2] || row[yearSalaryKey] || '';
      
      if (salaryValue !== '' && salaryValue !== null && salaryValue !== undefined) {
        const upperSalaryStr = typeof salaryValue === 'string' ? salaryValue.toUpperCase().trim() : '';
        
        // Handle UFA and RFA as string values
        if (upperSalaryStr === 'RFA' || upperSalaryStr === 'UFA') {
          contractYears[year] = upperSalaryStr;
        } else {
          let salary = 0;
          
          if (typeof salaryValue === 'number') {
            salary = salaryValue;
          } else if (typeof salaryValue === 'string') {
            // Handle strings - might be in millions (e.g., "10.95" = $10,950,000)
            const cleaned = salaryValue.replace(/[^0-9.-]/g, '');
            salary = parseFloat(cleaned);
            // If the number is less than 1000, assume it's in millions
            if (salary > 0 && salary < 1000) {
              salary = salary * 1000000;
            }
          }
          
          if (!isNaN(salary) && salary > 0) {
            contractYears[year] = salary;
          }
        }
      }
    });

    const player: Player = {
      name: playerName,
      nhlTeam: nhlTeam || 'Unknown',
      positions: positions.length > 0 ? positions : ['Unknown'],
      contractYears,
      isRookie,
      teamName: ownerName, // Use owner name as team name
    };

    players.push(player);
  });

  return players;
}

/**
 * Read and process Excel file from data directory
 * Reads sheets 2-21 (one per pooler) or specified sheet names
 */
export function processExcelFile(
  filename: string = 'POOL DEK.xlsx',
  sheetNames?: string[] | number[]
): PoolData {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  const sheetNamesList = workbook.SheetNames;

  // Determine which sheets to process (default: sheets 2-21, i.e., indices 1-20)
  let sheetsToProcess: string[] = [];
  
  if (sheetNames && Array.isArray(sheetNames)) {
    if (sheetNames.length > 0 && typeof sheetNames[0] === 'number') {
      // Sheet indices provided
      sheetsToProcess = (sheetNames as number[])
        .filter(idx => idx >= 1 && idx < sheetNamesList.length)
        .map(idx => sheetNamesList[idx]);
    } else {
      // Sheet names provided
      sheetsToProcess = (sheetNames as string[])
        .filter(name => sheetNamesList.includes(name));
    }
  } else {
    // Default: sheets 2-17 (indices 1-16) - exclude "Règlements" and "DRAFT"
    // Process pooler sheets only (usually up to "Bernard" at index 16)
    sheetsToProcess = sheetNamesList.slice(1, 17);
  }

  // Process each sheet
  const teams: TeamRoster[] = [];
  const allAvailableYears = new Set<number>();

  for (const sheetName of sheetsToProcess) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows = excelSheetToRows(worksheet);
    const players = parseExcelSheetForPooler(rows, sheetName);

    if (players.length > 0) {
      // Extract available years from players
      players.forEach((player) => {
        Object.keys(player.contractYears).forEach((year) => {
          allAvailableYears.add(parseInt(year, 10));
        });
      });

      teams.push({
        teamName: sheetName, // Use sheet name as team name
        owner: sheetName, // Use sheet name as owner name (pooler name)
        players,
      });
    }
  }

  const availableYears = Array.from(allAvailableYears).sort();

  const poolData: PoolData = {
    teams,
    currentSeasonYear: CURRENT_SEASON_YEAR,
    availableYears,
  };
  
  // Load and merge Extrapooler data
  const extrapoolerMap = loadExtrapoolerData();
  const poolDataWithExtrapoolers = mergeExtrapoolerData(poolData, extrapoolerMap);
  
  // Load and merge Rookie Picks data
  const rookiePicksMap = loadRookiePicksData();
  const poolDataWithRookiePicks = mergeRookiePicksData(poolDataWithExtrapoolers, rookiePicksMap);
  
  // Load and merge Draft Picks data
  const draftPicksMap = loadDraftPicksData();
  const poolDataWithDraftPicks = mergeDraftPicksData(poolDataWithRookiePicks, draftPicksMap);
  
  // Apply trades to reflect current roster state
  return applyTradesToPoolData(poolDataWithDraftPicks);
}

/**
 * Read CSV file from data directory and process it
 */
export function processCSVFile(filename: string = 'CurrentData.csv'): PoolData {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const poolData = parseCSV(csvContent);
  
  // Load and merge Extrapooler data
  const extrapoolerMap = loadExtrapoolerData();
  const poolDataWithExtrapoolers = mergeExtrapoolerData(poolData, extrapoolerMap);
  
  // Load and merge Rookie Picks data
  const rookiePicksMap = loadRookiePicksData();
  const poolDataWithRookiePicks = mergeRookiePicksData(poolDataWithExtrapoolers, rookiePicksMap);
  
  // Load and merge Draft Picks data
  const draftPicksMap = loadDraftPicksData();
  const poolDataWithDraftPicks = mergeDraftPicksData(poolDataWithRookiePicks, draftPicksMap);
  
  // Apply trades to reflect current roster state
  return applyTradesToPoolData(poolDataWithDraftPicks);
}

/**
 * Parse a single sheet's CSV content and extract players for a specific pooler/owner
 * The sheet name is used as the owner/team name
 */
function parseSheetForPooler(csvContent: string, ownerName: string): Player[] {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn(`CSV parsing errors for ${ownerName}:`, parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  const players: Player[] = [];

  // Extract available years from headers
  const availableYears: number[] = [];
  // Handle formats like "2025-26", "2025", "2025 Salary"
  const yearPattern = /^(\d{4})(?:-\d{2})?(?:\s+Salary)?$/i;
  
  const allKeys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => allKeys.add(key));
  });
  
  allKeys.forEach((key) => {
    const trimmed = key.trim();
    const match = trimmed.match(yearPattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (!availableYears.includes(year)) {
        availableYears.push(year);
      }
    }
  });
  
  availableYears.sort();

  rows.forEach((row) => {
    // Try various column name variations
    const playerName = (
      row['Player Name'] || 
      row['player name'] || 
      row['Player'] || 
      row['player'] ||
      row['Name'] ||
      row['name'] ||
      ''
    ).trim();

    if (!playerName) {
      return; // Skip rows without player names
    }

    const nhlTeam = (
      row['NHL Team'] || 
      row['nhl team'] || 
      row['NHL'] || 
      row['nhl'] ||
      row['Team'] ||
      row['team'] ||
      ''
    ).trim();

    const positionStr = (
      row['Position'] || 
      row['position'] || 
      row['Pos'] || 
      row['pos'] ||
      ''
    ).trim();

    const isRookie = (
      row['Is Rookie'] || 
      row['is rookie'] || 
      row['Rookie'] || 
      row['rookie'] ||
      ''
    ).toLowerCase() === 'true' || 
    (row['Is Rookie'] || row['is rookie'] || row['Rookie'] || row['rookie'] || '') === '1';

    // Parse positions
    const positions = positionStr
      .split(/[\/,]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Extract contract years and salaries
    const contractYears: Record<number, number | string> = {};
    availableYears.forEach((year) => {
      const yearKey = year.toString();
      const yearSalaryKey = `${year} Salary`;
      const salaryStr = (row[yearKey] || row[yearSalaryKey] || '').trim();
      
      if (!salaryStr) return;
      
      const upperSalaryStr = salaryStr.toUpperCase();
      
      // Handle UFA and RFA as string values
      if (upperSalaryStr === 'RFA' || upperSalaryStr === 'UFA') {
        contractYears[year] = upperSalaryStr;
      } else {
        const salary = parseFloat(salaryStr.replace(/[^0-9.-]/g, ''));
        if (!isNaN(salary) && salary > 0) {
          contractYears[year] = salary;
        }
      }
    });

    const player: Player = {
      name: playerName,
      nhlTeam: nhlTeam || 'Unknown',
      positions: positions.length > 0 ? positions : ['Unknown'],
      contractYears,
      isRookie,
      teamName: ownerName, // Use owner name as team name
    };

    players.push(player);
  });

  return players;
}

/**
 * Fetch and process data from Google Sheets
 * Supports multiple sheets (one per pooler/owner)
 */
export async function processGoogleSheet(
  spreadsheetUrl: string,
  sheetNames?: string | string[]
): Promise<PoolData> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL. Could not extract spreadsheet ID.');
  }

  // Determine which sheets to fetch
  let sheetsToFetch: string[];
  
  if (Array.isArray(sheetNames)) {
    sheetsToFetch = sheetNames;
  } else if (sheetNames) {
    sheetsToFetch = [sheetNames];
  } else {
    // Default: fetch sheets 2-21 (assuming sheet names are "2", "3", ..., "21")
    // If your sheets are named after poolers, specify GOOGLE_SHEET_NAMES in environment variables
    sheetsToFetch = Array.from({ length: 20 }, (_, i) => (i + 2).toString());
  }

  // Fetch all sheets
  const sheetDataMap = await fetchMultipleGoogleSheets(spreadsheetId, sheetsToFetch);
  
  // Process each sheet
  const teams: TeamRoster[] = [];
  const allAvailableYears = new Set<number>();

  for (const [sheetName, csvContent] of sheetDataMap.entries()) {
    if (!csvContent) continue;
    
    const players = parseSheetForPooler(csvContent, sheetName);
    
    if (players.length > 0) {
      // Extract available years from players
      players.forEach((player) => {
        Object.keys(player.contractYears).forEach((year) => {
          allAvailableYears.add(parseInt(year, 10));
        });
      });

      teams.push({
        teamName: sheetName, // Use sheet name as team name
        owner: sheetName, // Use sheet name as owner name (pooler name)
        players,
      });
    }
  }

  let availableYears = Array.from(allAvailableYears);
  
  // Ensure currentSeasonYear is always in availableYears
  if (!availableYears.includes(CURRENT_SEASON_YEAR)) {
    availableYears.push(CURRENT_SEASON_YEAR);
  }
  
  availableYears.sort();

  const poolData: PoolData = {
    teams,
    currentSeasonYear: CURRENT_SEASON_YEAR,
    availableYears,
  };
  
  // Load and merge Extrapooler data
  const extrapoolerMap = loadExtrapoolerData();
  const poolDataWithExtrapoolers = mergeExtrapoolerData(poolData, extrapoolerMap);
  
  // Load and merge Rookie Picks data
  const rookiePicksMap = loadRookiePicksData();
  const poolDataWithRookiePicks = mergeRookiePicksData(poolDataWithExtrapoolers, rookiePicksMap);
  
  // Load and merge Draft Picks data
  const draftPicksMap = loadDraftPicksData();
  const poolDataWithDraftPicks = mergeDraftPicksData(poolDataWithRookiePicks, draftPicksMap);
  
  // Apply trades to reflect current roster state
  return applyTradesToPoolData(poolDataWithDraftPicks);
}

/**
 * Parse Extrapooler CSV file and return a map of owner -> year -> Extrapooler[]
 * Supports both old format (3 columns) and new format (Count column)
 */
export function parseExtrapoolerCSV(csvContent: string): Map<string, Record<number, Extrapooler[]>> {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn('Extrapooler CSV parsing errors:', parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  const extrapoolerMap = new Map<string, Record<number, Extrapooler[]>>();

  rows.forEach((row) => {
    const owner = (row['Owner'] || row['owner'] || '').trim();
    const yearStr = (row['Year'] || row['year'] || '').trim();
    
    if (!owner || !yearStr) {
      return; // Skip invalid rows
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return; // Skip rows with invalid year
    }

    // Initialize owner/year entry if it doesn't exist
    if (!extrapoolerMap.has(owner)) {
      extrapoolerMap.set(owner, {});
    }
    if (!extrapoolerMap.get(owner)![year]) {
      extrapoolerMap.get(owner)![year] = [];
    }

    const extrapoolers = extrapoolerMap.get(owner)![year];

    // Check for Slot column (new format with explicit slots)
    const slotStr = (row['Slot'] || row['slot'] || '').trim();
    const originalOwnerStr = (row['Original Owner'] || row['original owner'] || row['OriginalOwner'] || row['originalOwner'] || owner).trim();
    const isUsedStr = (row['Used'] || row['used'] || row['Is Used'] || row['is used'] || 'false').trim().toLowerCase();
    const isUsed = isUsedStr === 'true' || isUsedStr === '1' || isUsedStr === 'used' || isUsedStr === 'yes';
    
    if (slotStr) {
      // New format: Explicit slot number
      const slot = parseInt(slotStr, 10);
      if (!isNaN(slot) && (slot === 1 || slot === 2 || slot === 3)) {
        // Check if this slot already exists, if so update it, otherwise add it
        const existingIndex = extrapoolers.findIndex(ep => ep.slot === slot);
        const newExtrapooler: Extrapooler = {
          slot: slot as 1 | 2 | 3,
          originalOwner: originalOwnerStr,
          isUsed: isUsed,
        };
        if (existingIndex >= 0) {
          extrapoolers[existingIndex] = newExtrapooler;
        } else {
          extrapoolers.push(newExtrapooler);
        }
      }
    } else {
      // Old format: 3 columns (backward compatibility) - these map to slots 1, 2, 3
      const ep1Str = (row['Extrapooler 1'] || row['extrapooler 1'] || row['Extrapooler1'] || row['extrapooler1'] || 'Available').trim().toLowerCase();
      const ep2Str = (row['Extrapooler 2'] || row['extrapooler 2'] || row['Extrapooler2'] || row['extrapooler2'] || 'Available').trim().toLowerCase();
      const ep3Str = (row['Extrapooler 3'] || row['extrapooler 3'] || row['Extrapooler3'] || row['extrapooler3'] || 'Available').trim().toLowerCase();
      
      // Convert old format to new format with slots
      const ep1Available = ep1Str === 'available' || ep1Str === 'true' || ep1Str === '1' || ep1Str === '';
      const ep2Available = ep2Str === 'available' || ep2Str === 'true' || ep2Str === '1' || ep2Str === '';
      const ep3Available = ep3Str === 'available' || ep3Str === 'true' || ep3Str === '1' || ep3Str === '';
      
      // Only add if not already present (old format processes all slots in one row)
      if (ep1Available && !extrapoolers.find(ep => ep.slot === 1)) {
        extrapoolers.push({ slot: 1, originalOwner: owner, isUsed: false });
      }
      if (ep2Available && !extrapoolers.find(ep => ep.slot === 2)) {
        extrapoolers.push({ slot: 2, originalOwner: owner, isUsed: false });
      }
      if (ep3Available && !extrapoolers.find(ep => ep.slot === 3)) {
        extrapoolers.push({ slot: 3, originalOwner: owner, isUsed: false });
      }
    }
  });

  return extrapoolerMap;
}

/**
 * Read Extrapooler CSV file from data directory
 */
export function loadExtrapoolerData(filename: string = 'extrapoolers.csv'): Map<string, Record<number, Extrapooler[]>> {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    // If file doesn't exist, return empty map (Extrapoolers are optional)
    return new Map();
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  return parseExtrapoolerCSV(csvContent);
}

/**
 * Merge Extrapooler data into PoolData
 */
export function mergeExtrapoolerData(
  poolData: PoolData,
  extrapoolerMap: Map<string, Record<number, Extrapooler[]>>
): PoolData {
  const teams = poolData.teams.map((team) => {
    const ownerExtrapoolers = extrapoolerMap.get(team.owner);
    if (ownerExtrapoolers) {
      return {
        ...team,
        extrapoolers: ownerExtrapoolers,
      };
    }
    return team;
  });

  // Add years from extrapoolers to availableYears if they're not already there
  const availableYearsSet = new Set(poolData.availableYears);
  extrapoolerMap.forEach((ownerExtrapoolers) => {
    Object.keys(ownerExtrapoolers).forEach((yearStr) => {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        availableYearsSet.add(year);
      }
    });
  });

  const availableYears = Array.from(availableYearsSet).sort();

  return {
    ...poolData,
    teams,
    availableYears,
  };
}

/**
 * Parse Rookie Picks CSV file and return a map of owner -> year -> RookiePick[]
 */
export function parseRookiePicksCSV(csvContent: string): Map<string, Record<number, RookiePick[]>> {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn('Rookie Picks CSV parsing errors:', parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  const rookiePicksMap = new Map<string, Record<number, RookiePick[]>>();

  rows.forEach((row) => {
    const owner = (row['Owner'] || row['owner'] || '').trim();
    const yearStr = (row['Year'] || row['year'] || '').trim();
    const roundStr = (row['Round'] || row['round'] || '').trim().toLowerCase();
    const originalOwner = (row['Original Owner'] || row['original owner'] || row['OriginalOwner'] || row['originalOwner'] || owner).trim();

    if (!owner || !yearStr || !roundStr) {
      return; // Skip invalid rows
    }

    // Skip rows where Original Owner is "Traded" - the owner doesn't have this pick anymore
    if (originalOwner.toLowerCase() === 'traded') {
      return; // Skip picks that have been traded away
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return; // Skip rows with invalid year
    }

    // Normalize round to '1st', '2nd', or '3rd'
    let round: '1st' | '2nd' | '3rd';
    if (roundStr === '1st' || roundStr === '1' || roundStr === 'first') {
      round = '1st';
    } else if (roundStr === '2nd' || roundStr === '2' || roundStr === 'second') {
      round = '2nd';
    } else if (roundStr === '3rd' || roundStr === '3' || roundStr === 'third') {
      round = '3rd';
    } else {
      return; // Skip rows with invalid round
    }

    const pick: RookiePick = {
      round,
      originalOwner,
    };

    if (!rookiePicksMap.has(owner)) {
      rookiePicksMap.set(owner, {});
    }

    const ownerPicks = rookiePicksMap.get(owner)!;
    if (!ownerPicks[year]) {
      ownerPicks[year] = [];
    }

    ownerPicks[year].push(pick);
  });

  return rookiePicksMap;
}

/**
 * Read Rookie Picks CSV file from data directory
 */
export function loadRookiePicksData(filename: string = 'rookie-picks.csv'): Map<string, Record<number, RookiePick[]>> {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    // If file doesn't exist, return empty map (Rookie Picks are optional)
    return new Map();
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  return parseRookiePicksCSV(csvContent);
}

/**
 * Merge Rookie Picks data into PoolData
 */
export function mergeRookiePicksData(
  poolData: PoolData,
  rookiePicksMap: Map<string, Record<number, RookiePick[]>>
): PoolData {
  const teams = poolData.teams.map((team) => {
    const ownerRookiePicks = rookiePicksMap.get(team.owner);
    if (ownerRookiePicks) {
      return {
        ...team,
        rookiePicks: ownerRookiePicks,
      };
    }
    return team;
  });

  // Add years from rookie picks to availableYears if they're not already there
  const availableYearsSet = new Set(poolData.availableYears);
  rookiePicksMap.forEach((ownerPicks) => {
    Object.keys(ownerPicks).forEach((yearStr) => {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        availableYearsSet.add(year);
      }
    });
  });

  const availableYears = Array.from(availableYearsSet).sort();

  return {
    ...poolData,
    teams,
    availableYears,
  };
}

/**
 * Parse Draft Picks CSV file and return a map of owner -> year -> DraftPick[]
 */
export function parseDraftPicksCSV(csvContent: string): Map<string, Record<number, DraftPick[]>> {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn('Draft Picks CSV parsing errors:', parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  const draftPicksMap = new Map<string, Record<number, DraftPick[]>>();

  rows.forEach((row) => {
    const owner = (row['Owner'] || row['owner'] || '').trim();
    const yearStr = (row['Year'] || row['year'] || '').trim();
    const roundStr = (row['Round'] || row['round'] || '').trim().toLowerCase();
    const originalOwner = (row['Original Owner'] || row['original owner'] || row['OriginalOwner'] || row['originalOwner'] || owner).trim();

    if (!owner || !yearStr || !roundStr) {
      return; // Skip invalid rows
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return; // Skip rows with invalid year
    }

    // Normalize round to '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', or '8th'
    let round: '1st' | '2nd' | '3rd' | '4th' | '5th' | '6th' | '7th' | '8th';
    if (roundStr === '1st' || roundStr === '1' || roundStr === 'first') {
      round = '1st';
    } else if (roundStr === '2nd' || roundStr === '2' || roundStr === 'second') {
      round = '2nd';
    } else if (roundStr === '3rd' || roundStr === '3' || roundStr === 'third') {
      round = '3rd';
    } else if (roundStr === '4th' || roundStr === '4' || roundStr === 'fourth') {
      round = '4th';
    } else if (roundStr === '5th' || roundStr === '5' || roundStr === 'fifth') {
      round = '5th';
    } else if (roundStr === '6th' || roundStr === '6' || roundStr === 'sixth') {
      round = '6th';
    } else if (roundStr === '7th' || roundStr === '7' || roundStr === 'seventh') {
      round = '7th';
    } else if (roundStr === '8th' || roundStr === '8' || roundStr === 'eighth') {
      round = '8th';
    } else {
      return; // Skip rows with invalid round
    }

    const pick: DraftPick = {
      round,
      originalOwner,
    };

    if (!draftPicksMap.has(owner)) {
      draftPicksMap.set(owner, {});
    }

    const ownerPicks = draftPicksMap.get(owner)!;
    if (!ownerPicks[year]) {
      ownerPicks[year] = [];
    }

    ownerPicks[year].push(pick);
  });

  return draftPicksMap;
}

/**
 * Read Draft Picks CSV file from data directory
 */
export function loadDraftPicksData(filename: string = 'draft-picks.csv'): Map<string, Record<number, DraftPick[]>> {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    // If file doesn't exist, return empty map (Draft Picks are optional)
    return new Map();
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  return parseDraftPicksCSV(csvContent);
}

/**
 * Merge Draft Picks data into PoolData
 */
export function mergeDraftPicksData(
  poolData: PoolData,
  draftPicksMap: Map<string, Record<number, DraftPick[]>>
): PoolData {
  const teams = poolData.teams.map((team) => {
    const ownerDraftPicks = draftPicksMap.get(team.owner);
    if (ownerDraftPicks) {
      return {
        ...team,
        draftPicks: ownerDraftPicks,
      };
    }
    return team;
  });

  // Add years from draft picks to availableYears if they're not already there
  const availableYearsSet = new Set(poolData.availableYears);
  draftPicksMap.forEach((ownerPicks) => {
    Object.keys(ownerPicks).forEach((yearStr) => {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        availableYearsSet.add(year);
      }
    });
  });

  const availableYears = Array.from(availableYearsSet).sort();

  return {
    ...poolData,
    teams,
    availableYears,
  };
}

/**
 * Save processed data to JSON file
 * Note: On Vercel/production, filesystem writes are not allowed, so this is a no-op
 */
export function saveProcessedData(data: PoolData, outputPath: string): void {
  // Skip file writes on Vercel (read-only filesystem)
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    // In production/Vercel, we can't write to the filesystem
    // The data is already being returned via the API, so caching to disk isn't necessary
    return;
  }
  
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    // Silently fail in production - file caching is optional
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to save processed data to cache:', error);
    }
  }
}

/**
 * Parse Bourse 5 ans CSV file and return leaderboard entries
 */
export function parseBourse5AnsCSV(csvContent: string): Bourse5AnsEntry[] {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn('Bourse 5 ans CSV parsing errors:', parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  const entries: Bourse5AnsEntry[] = [];

  rows.forEach((row) => {
    const owner = (row['Owner'] || row['owner'] || '').trim();
    if (!owner) {
      return; // Skip rows without owner
    }

    const yearPoints: Record<string, number> = {};
    let totalPoints = 0;

    // Get all column keys except 'Owner'
    const yearColumns = Object.keys(row).filter(key => key.toLowerCase() !== 'owner');
    
    yearColumns.forEach((columnName) => {
      const pointsStr = (row[columnName] || '').trim();
      if (pointsStr) {
        const points = parseFloat(pointsStr);
        if (!isNaN(points)) {
          yearPoints[columnName] = points;
          totalPoints += points;
        }
      }
    });

    entries.push({
      owner,
      totalPoints,
      yearPoints,
    });
  });

  // Sort by total points (descending)
  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  return entries;
}

/**
 * Read Bourse 5 ans CSV file from data directory and return leaderboard entries
 */
export function loadBourse5AnsData(filename: string = 'Bourse 5 ans.csv'): Bourse5AnsEntry[] {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  return parseBourse5AnsCSV(csvContent);
}

/**
 * Parse trades CSV content and return array of Trade objects
 */
export function parseTradesCSV(csvContent: string): Trade[] {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing errors:', parsed.errors);
  }

  const rows = parsed.data as Record<string, string>[];
  const trades: Trade[] = [];

  rows.forEach((row) => {
    const date = (row['Date'] || row['date'] || '').trim();
    const tradeId = (row['Trade ID'] || row['trade id'] || row['Trade ID'] || '').trim();
    const teamA = (row['Team A'] || row['team a'] || '').trim();
    const teamAAssets = (row['Team A Assets'] || row['team a assets'] || '').trim();
    const teamB = (row['Team B'] || row['team b'] || '').trim();
    const teamBAssets = (row['Team B Assets'] || row['team b assets'] || '').trim();

    if (!date || !tradeId || !teamA || !teamB) {
      return; // Skip invalid rows
    }

    trades.push({
      date,
      tradeId,
      teamA,
      teamAAssets,
      teamB,
      teamBAssets,
    });
  });

  // Sort by date (most recent first)
  trades.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Descending order (newest first)
  });

  return trades;
}

/**
 * Read trades CSV file from data directory and return array of trades
 */
export function loadTradesData(filename: string = 'trades.csv'): Trade[] {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  return parseTradesCSV(csvContent);
}

/**
 * Parse trade assets from a comma-separated string
 * Returns objects with type ('player' or 'draftPick') and details
 */
interface ParsedTradeAsset {
  type: 'player' | 'draftPick';
  playerName?: string;
  round?: '1st' | '2nd' | '3rd' | '4th' | '5th' | '6th' | '7th' | '8th';
  originalOwner?: string;
}

function parseTradeAssets(assetsStr: string): ParsedTradeAsset[] {
  const assets: ParsedTradeAsset[] = [];
  // Split by comma, but be careful with commas inside parentheses
  const parts = assetsStr.split(',').map(s => s.trim());
  
  for (const part of parts) {
    // Check if it's a draft pick (contains "draft pick" or round number + "th"/"st"/"nd"/"rd")
    const draftPickMatch = part.match(/(\d+)(?:st|nd|rd|th)\s+draft\s+pick\s*\(from\s+([^)]+)\)/i);
    if (draftPickMatch) {
      const roundNum = parseInt(draftPickMatch[1], 10);
      const originalOwner = draftPickMatch[2].trim();
      const roundMap: Record<number, '1st' | '2nd' | '3rd' | '4th' | '5th' | '6th' | '7th' | '8th'> = {
        1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th'
      };
      if (roundMap[roundNum]) {
        assets.push({
          type: 'draftPick',
          round: roundMap[roundNum],
          originalOwner,
        });
        continue;
      }
    }
    
    // Otherwise, treat as a player name
    if (part.length > 0) {
      assets.push({
        type: 'player',
        playerName: part,
      });
    }
  }
  
  return assets;
}

/**
 * Apply trades to PoolData
 * Moves players and draft picks between teams based on trades
 */
export function applyTradesToPoolData(poolData: PoolData): PoolData {
  let trades: Trade[];
  try {
    trades = loadTradesData();
  } catch (error) {
    // If trades file doesn't exist or can't be loaded, return data unchanged
    console.warn('Could not load trades data:', error);
    return poolData;
  }

  // Create a deep copy of the data to modify
  const updatedTeams = poolData.teams.map(team => ({
    ...team,
    players: [...team.players],
    draftPicks: team.draftPicks ? { ...team.draftPicks } : undefined,
  }));

  // Process each trade
  for (const trade of trades) {
    // Parse assets for both teams
    const teamAAssets = parseTradeAssets(trade.teamAAssets);
    const teamBAssets = parseTradeAssets(trade.teamBAssets);

    // Find team objects
    const teamA = updatedTeams.find(t => t.owner === trade.teamA);
    const teamB = updatedTeams.find(t => t.owner === trade.teamB);

    if (!teamA || !teamB) {
      console.warn(`Could not find teams for trade ${trade.tradeId}: ${trade.teamA} or ${trade.teamB}`);
      console.warn(`Available owners: ${updatedTeams.map(t => t.owner).join(', ')}`);
      continue;
    }
    

    // Helper function to match player names (handles variations like "Kyrou" matching "Kyrou, Jordan")
    const findPlayer = (players: Player[], searchName: string): number => {
      const searchLower = searchName.toLowerCase().trim();
      
      // First try exact match (case-insensitive)
      let index = players.findIndex(p => p.name.toLowerCase().trim() === searchLower);
      if (index !== -1) return index;
      
      // Try matching first word (e.g., "Kyrou" matches "Kyrou, Jordan")
      const searchFirstWord = searchLower.split(/[,\s]+/)[0];
      if (searchFirstWord.length > 0) {
        index = players.findIndex(p => {
          const playerNameLower = p.name.toLowerCase().trim();
          const playerFirstWord = playerNameLower.split(/[,\s]+/)[0];
          return playerFirstWord === searchFirstWord;
        });
        if (index !== -1) return index;
      }
      
      // Try matching last name (for cases like "Nico Hischier" vs "Hischier")
      const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
      if (searchWords.length > 0) {
        const searchLastWord = searchWords[searchWords.length - 1];
        index = players.findIndex(p => {
          const playerNameLower = p.name.toLowerCase().trim();
          const playerWords = playerNameLower.split(/[,\s]+/).filter(w => w.length > 0);
          // Check if last word matches
          if (playerWords.length > 0 && playerWords[playerWords.length - 1] === searchLastWord) {
            return true;
          }
          // Check if any word matches
          return playerWords.some(w => w === searchLastWord) || playerNameLower.includes(searchLastWord);
        });
        if (index !== -1) return index;
      }
      
      // Try partial match (contains the search name)
      index = players.findIndex(p => {
        const playerNameLower = p.name.toLowerCase().trim();
        return playerNameLower.includes(searchLower) || searchLower.includes(playerNameLower);
      });
      
      return index;
    };

    // Move players from Team A to Team B
    for (const asset of teamAAssets) {
      if (asset.type === 'player' && asset.playerName) {
        const playerIndex = findPlayer(teamA.players, asset.playerName);
        if (playerIndex !== -1) {
          const player = teamA.players[playerIndex];
          // Remove from Team A
          teamA.players.splice(playerIndex, 1);
          // Add to Team B with updated teamName
          teamB.players.push({
            ...player,
            teamName: teamB.teamName,
          });
        } else {
          console.warn(`Player "${asset.playerName}" not found in ${trade.teamA}'s roster for trade ${trade.tradeId}`);
        }
      }
    }

    // Move players from Team B to Team A
    for (const asset of teamBAssets) {
      if (asset.type === 'player' && asset.playerName) {
        const playerIndex = findPlayer(teamB.players, asset.playerName);
        if (playerIndex !== -1) {
          const player = teamB.players[playerIndex];
          // Remove from Team B
          teamB.players.splice(playerIndex, 1);
          // Add to Team A with updated teamName
          teamA.players.push({
            ...player,
            teamName: teamA.teamName,
          });
        } else {
          console.warn(`Player "${asset.playerName}" not found in ${trade.teamB}'s roster for trade ${trade.tradeId}`);
        }
      }
    }

    // Move draft picks from Team A to Team B
    for (const asset of teamAAssets) {
      if (asset.type === 'draftPick' && asset.round && asset.originalOwner) {
        // Find the pick in Team A's draft picks
        let found = false;
        if (teamA.draftPicks) {
          for (const year of Object.keys(teamA.draftPicks)) {
            const yearNum = parseInt(year, 10);
            const picks = teamA.draftPicks[yearNum];
            if (picks) {
              const pickIndex = picks.findIndex(
                p => p.round === asset.round && p.originalOwner === asset.originalOwner
              );
              if (pickIndex !== -1) {
                const pick = picks[pickIndex];
                // Remove from Team A
                picks.splice(pickIndex, 1);
                // Add to Team B
                if (!teamB.draftPicks) {
                  teamB.draftPicks = {};
                }
                if (!teamB.draftPicks[yearNum]) {
                  teamB.draftPicks[yearNum] = [];
                }
                teamB.draftPicks[yearNum].push(pick);
                found = true;
                break;
              }
            }
          }
        }
        if (!found) {
          console.warn(`Draft pick "${asset.round} (from ${asset.originalOwner})" not found in ${trade.teamA}'s draft picks`);
        }
      }
    }

    // Move draft picks from Team B to Team A
    for (const asset of teamBAssets) {
      if (asset.type === 'draftPick' && asset.round && asset.originalOwner) {
        // Find the pick in Team B's draft picks
        let found = false;
        if (teamB.draftPicks) {
          for (const year of Object.keys(teamB.draftPicks)) {
            const yearNum = parseInt(year, 10);
            const picks = teamB.draftPicks[yearNum];
            if (picks) {
              const pickIndex = picks.findIndex(
                p => p.round === asset.round && p.originalOwner === asset.originalOwner
              );
              if (pickIndex !== -1) {
                const pick = picks[pickIndex];
                // Remove from Team B
                picks.splice(pickIndex, 1);
                // Add to Team A
                if (!teamA.draftPicks) {
                  teamA.draftPicks = {};
                }
                if (!teamA.draftPicks[yearNum]) {
                  teamA.draftPicks[yearNum] = [];
                }
                teamA.draftPicks[yearNum].push(pick);
                found = true;
                break;
              }
            }
          }
        }
        if (!found) {
          console.warn(`Draft pick "${asset.round} (from ${asset.originalOwner})" not found in ${trade.teamB}'s draft picks`);
        }
      }
    }
  }

  return {
    ...poolData,
    teams: updatedTeams,
  };
}

