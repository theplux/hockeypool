/**
 * Google Sheets API integration
 * Fetches data directly from a Google Sheet
 */

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName?: string; // Optional: specific sheet/tab name
  apiKey?: string; // Optional: if sheet is public, no API key needed
}

/**
 * Extract spreadsheet ID from a Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  // Handle various Google Sheets URL formats:
  // https://docs.google.com/spreadsheets/d/{ID}/edit
  // https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch CSV data from a public Google Sheet
 * For public sheets, we can use the CSV export URL
 */
export async function fetchGoogleSheetAsCSV(
  spreadsheetId: string,
  sheetName?: string
): Promise<string> {
  // Google Sheets CSV export URL format:
  // https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  
  if (sheetName) {
    url += `&sheet=${encodeURIComponent(sheetName)}`;
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    throw error;
  }
}

/**
 * Fetch multiple sheets from a Google Spreadsheet
 * Returns a map of sheet name to CSV content
 */
export async function fetchMultipleGoogleSheets(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string>> {
  const sheetData = new Map<string, string>();
  
  // Fetch all sheets in parallel
  const promises = sheetNames.map(async (sheetName) => {
    try {
      const csv = await fetchGoogleSheetAsCSV(spreadsheetId, sheetName);
      return { sheetName, csv };
    } catch (error) {
      console.error(`Error fetching sheet "${sheetName}":`, error);
      return { sheetName, csv: null };
    }
  });

  const results = await Promise.all(promises);
  
  results.forEach(({ sheetName, csv }) => {
    if (csv) {
      sheetData.set(sheetName, csv);
    }
  });

  return sheetData;
}

/**
 * Fetch data from Google Sheets using the API (requires API key)
 * This is for private sheets or when you need more control
 */
export async function fetchGoogleSheetWithAPI(
  spreadsheetId: string,
  apiKey: string,
  sheetName?: string
): Promise<string> {
  // Using Google Sheets API v4
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName || 'Sheet1'}?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert to CSV format
    if (data.values && Array.isArray(data.values)) {
      return data.values.map((row: any[]) => row.join(',')).join('\n');
    }

    throw new Error('Invalid response format from Google Sheets API');
  } catch (error) {
    console.error('Error fetching Google Sheet with API:', error);
    throw error;
  }
}

