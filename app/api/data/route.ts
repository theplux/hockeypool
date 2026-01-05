import { NextResponse } from 'next/server';
import { processCSVFile, processGoogleSheet, saveProcessedData } from '@/lib/data-processor';
import path from 'path';

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic'; // This route uses request parameters

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const googleSheetUrl = searchParams.get('googleSheet');
    const sheetName = searchParams.get('sheetName') || undefined;
    
    let data;
    
    if (googleSheetUrl) {
      // Fetch from Google Sheets
      data = await processGoogleSheet(googleSheetUrl, sheetName);
    } else {
      // Use local CSV file
      data = processCSVFile('CurrentData.csv');
    }
    
    // Save to public/data for caching
    const outputPath = path.join(process.cwd(), 'public', 'data', 'pool-data.json');
    saveProcessedData(data, outputPath);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error processing data:', error);
    return NextResponse.json(
      { error: 'Failed to process data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

