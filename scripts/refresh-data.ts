import { processCSVFile, saveProcessedData } from '../lib/data-processor';
import path from 'path';

/**
 * Script to refresh the processed data from CurrentData.csv
 * This regenerates the pool-data.json file in public/data/
 */
async function refreshData() {
  try {
    console.log('Processing CurrentData.csv...');
    const data = processCSVFile('CurrentData.csv');
    
    const outputPath = path.join(process.cwd(), 'public', 'data', 'pool-data.json');
    console.log(`Saving processed data to ${outputPath}...`);
    saveProcessedData(data, outputPath);
    
    console.log('✅ Data refreshed successfully!');
    console.log(`   - Teams processed: ${data.teams.length}`);
    console.log(`   - Available years: ${data.availableYears.join(', ')}`);
  } catch (error) {
    console.error('❌ Error refreshing data:', error);
    process.exit(1);
  }
}

refreshData();


