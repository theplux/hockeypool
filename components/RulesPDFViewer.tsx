'use client';

import { useState, useEffect } from 'react';

export default function RulesPDFViewer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // PDF path - browser will handle URL encoding automatically
  const pdfPath = '/rules/POOL DEK - Règles 2025.pdf';

  useEffect(() => {
    // Set a timeout to hide loading after a reasonable time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] min-h-[600px] bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice overflow-hidden border border-ice-300/20">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ice-800/60 z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-ice-300 mb-4"></div>
            <p className="text-theme-secondary">Chargement du PDF...</p>
          </div>
        </div>
      )}
      
      {error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <p className="text-theme-secondary mb-4">
              Impossible de charger le PDF. Veuillez vérifier que le fichier existe.
            </p>
            <a
              href={pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-lg border button-theme transition-all font-medium"
            >
              Ouvrir le PDF dans un nouvel onglet
            </a>
          </div>
        </div>
      ) : (
        <>
          <iframe
            src={`${pdfPath}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0"
            title="Règles du Pool - PDF"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            style={{ minHeight: '600px' }}
          />
          {/* Fallback for browsers that don't support PDF inline viewing */}
          <div className="absolute bottom-4 right-4 z-20">
            <a
              href={pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ice-800/90 hover:bg-ice-700/90 border border-ice-300/30 text-theme-secondary hover:text-theme-primary transition-all text-sm font-medium shadow-lg"
              title="Ouvrir dans un nouvel onglet"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

