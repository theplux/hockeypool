import TradesClient from '@/components/TradesClient';
import { loadTradesData } from '@/lib/data-processor';
import { PoolData } from '@/lib/types';
import { createSlug } from '@/lib/utils';

// Ensure this page always fetches fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getTradesData() {
  return loadTradesData();
}

async function getPoolData(): Promise<PoolData> {
  const fs = await import('fs');
  const pathModule = await import('path');
  
  try {
    // Try to read from cached JSON first
    const cachedPath = pathModule.join(process.cwd(), 'public', 'data', 'pool-data.json');
    if (fs.existsSync(cachedPath)) {
      const fileContents = fs.readFileSync(cachedPath, 'utf-8');
      if (fileContents && fileContents.trim()) {
        try {
          return JSON.parse(fileContents);
        } catch (parseError) {
          console.warn('Cached JSON file is corrupted, regenerating...', parseError);
          // Continue to regenerate
        }
      }
    }
    
    // Check if Google Sheets URL is configured
    const googleSheetUrl = process.env.GOOGLE_SHEET_URL;
    const sheetNames = process.env.GOOGLE_SHEET_NAMES 
      ? process.env.GOOGLE_SHEET_NAMES.split(',').map(s => s.trim())
      : undefined;
    
    const { processCSVFile, processExcelFile, processGoogleSheet, saveProcessedData } = await import('@/lib/data-processor');
    let data: PoolData;
    
    if (googleSheetUrl) {
      // Fetch from Google Sheets
      data = await processGoogleSheet(googleSheetUrl, sheetNames);
    } else {
      // Use CSV file (manual data entry)
      const currentDataPath = pathModule.join(process.cwd(), 'data', 'CurrentData.csv');
      const csvPath = pathModule.join(process.cwd(), 'data', 'pool-data.csv');
      const sampleCsvPath = pathModule.join(process.cwd(), 'data', 'sample-pool-data.csv');
      
      if (fs.existsSync(currentDataPath)) {
        data = processCSVFile('CurrentData.csv');
      } else if (fs.existsSync(csvPath)) {
        data = processCSVFile('pool-data.csv');
      } else if (fs.existsSync(sampleCsvPath)) {
        data = processCSVFile('sample-pool-data.csv');
      } else {
        throw new Error('No CSV file found. Please add CurrentData.csv to the /data directory. See README.md for the required format.');
      }
    }
    
    saveProcessedData(data, cachedPath);
    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

export default async function EchangesPage() {
  let trades;
  let poolData: PoolData | null = null;
  
  try {
    trades = await getTradesData();
    // Try to load pool data to get owner -> slug mapping
    try {
      poolData = await getPoolData();
    } catch (error) {
      console.warn('Could not load pool data for owner mapping:', error);
      // Continue without pool data - we'll use owner name as fallback
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load trades data';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-ice-100 mb-4">Error Loading Data</h1>
        <div className="bg-ice-800/60 rounded-lg p-4 mb-4 max-w-2xl mx-auto border border-ice-300/20">
          <p className="text-ice-200 font-medium mb-2">Error Details:</p>
          <p className="text-ice-300 text-sm font-mono break-words">{errorMessage}</p>
          {errorStack && (
            <details className="mt-4">
              <summary className="text-ice-300 text-sm cursor-pointer">Stack Trace</summary>
              <pre className="text-ice-400 text-xs mt-2 overflow-auto text-left">{errorStack}</pre>
            </details>
          )}
        </div>
        <p className="text-sm text-ice-400 mt-4">
          Please ensure the CSV file &quot;trades.csv&quot; is in the /data directory and try again.
        </p>
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-ice-100 mb-4">No Trades Found</h1>
        <p className="text-ice-300">
          The trades data file was processed but no trades were found.
        </p>
      </div>
    );
  }

  // Create a map of owner name -> team slug (as plain object for serialization)
  const ownerSlugMap: Record<string, string> = {};
  if (poolData) {
    poolData.teams.forEach(team => {
      // Map both owner and teamName to slug (in case they differ)
      const slug = createSlug(team.teamName);
      ownerSlugMap[team.owner] = slug;
      ownerSlugMap[team.teamName] = slug;
    });
  }

  return <TradesClient trades={trades} ownerSlugMap={ownerSlugMap} />;
}
