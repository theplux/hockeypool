'use client';

import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ice-gradient text-theme-primary">
        <div className="text-center py-12 px-4">
          <h1 className="text-2xl font-bold text-ice-100 mb-4">Something went wrong!</h1>
          <div className="bg-ice-800/60 rounded-lg p-4 mb-4 max-w-2xl mx-auto border border-ice-300/20">
            <p className="text-ice-200 font-medium mb-2">Error Details:</p>
            <p className="text-ice-300 text-sm font-mono break-words">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="mt-4 px-6 py-3 bg-ice-300/20 text-ice-100 rounded-lg hover:bg-ice-300/30 border border-ice-300/30 transition-all font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}



