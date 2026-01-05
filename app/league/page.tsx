import LeaguePageClient from '@/components/LeaguePageClient';
import { PoolData } from '@/lib/types';

async function getPoolData(): Promise<PoolData> {
  try {
    // Try to read from cached JSON first
    const fs = await import('fs');
    const path = await import('path');
    const cachedPath = path.join(process.cwd(), 'public', 'data', 'pool-data.json');
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
    const pathModule = await import('path');
    let data: PoolData;
    
    if (googleSheetUrl) {
      // Fetch from Google Sheets
      // If sheetNames not specified, will default to sheets 2-21
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

export default async function LeaguePage() {
  let data: PoolData;
  
  try {
    data = await getPoolData();
  } catch (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Data</h1>
        <p className="text-gray-600">
          {error instanceof Error ? error.message : 'Failed to load pool data'}
        </p>
      </div>
    );
  }

  return <LeaguePageClient data={data} />;
}

