import RulesPDFViewer from '@/components/RulesPDFViewer';

export default function ReglesPage() {
  const pdfPath = '/rules/POOL DEK - Règles 2025.pdf';

  return (
    <div className="w-full max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-ice-100 to-ice-300 bg-clip-text text-transparent mb-8">
        Règles du Pool
      </h1>
      
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-theme-secondary">
          Consultez les règles complètes du pool ci-dessous
        </p>
        <a
          href={pdfPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border button-theme transition-all font-medium text-sm hover:shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ouvrir dans un nouvel onglet
        </a>
      </div>
      
      <RulesPDFViewer />
    </div>
  );
}

