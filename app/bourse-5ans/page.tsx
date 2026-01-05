import Bourse5AnsClient from '@/components/Bourse5AnsClient';
import { loadBourse5AnsData } from '@/lib/data-processor';

// Ensure this page always fetches fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBourse5AnsData() {
  return loadBourse5AnsData();
}

export default async function Bourse5AnsPage() {
  let entries;
  
  try {
    entries = await getBourse5AnsData();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load Bourse 5 ans data';
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
          Please ensure the CSV file &quot;Bourse 5 ans.csv&quot; is in the /data directory and try again.
        </p>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-ice-100 mb-4">No Data Found</h1>
        <p className="text-ice-300">
          The Bourse 5 ans data file was processed but no entries were found.
        </p>
      </div>
    );
  }

  return <Bourse5AnsClient entries={entries} />;
}

