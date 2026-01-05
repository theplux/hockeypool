import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="text-6xl font-bold bg-gradient-to-r from-ice-300 to-ice-100 bg-clip-text text-transparent mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-ice-200 mb-4">Page Not Found</h2>
      <p className="text-ice-300 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="inline-block px-6 py-3 bg-ice-300/20 text-ice-100 rounded-lg hover:bg-ice-300/30 border border-ice-300/30 transition-all font-medium"
      >
        Return to Home
      </Link>
    </div>
  );
}

