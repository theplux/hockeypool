'use client';

import { Bourse5AnsEntry } from '@/lib/types';

interface Bourse5AnsClientProps {
  entries: Bourse5AnsEntry[];
}

export default function Bourse5AnsClient({ entries }: Bourse5AnsClientProps) {
  // Extract all year column names from entries
  const yearColumns = entries.length > 0 
    ? Object.keys(entries[0].yearPoints).sort()
    : [];

  // Get the first place total points (highest total)
  const firstPlaceTotal = entries.length > 0 ? entries[0].totalPoints : 0;

  // Format points with thousands separator
  const formatPoints = (points: number) => {
    return points.toLocaleString('en-US');
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-ice-100 to-ice-300 bg-clip-text text-transparent mb-2">
        Bourse 5 ans
      </h1>
      <p className="text-theme-secondary mb-8">
        Classement basé sur le total des points cumulés sur une fenêtre de 5 ans
      </p>

      <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice overflow-hidden border border-ice-300/20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ice-300/20">
            <thead className="bg-ice-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                  Rang
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                  Propriétaire
                </th>
                {yearColumns.map((year) => (
                  <th
                    key={year}
                    className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider"
                  >
                    {year}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider bg-ice-900/80">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider bg-ice-900/80">
                  Diff
                </th>
              </tr>
            </thead>
            <tbody className="bg-ice-800/30 divide-y divide-ice-300/10">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={yearColumns.length + 4}
                    className="px-4 py-8 text-center text-ice-400"
                  >
                    Aucune donnée disponible
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  const diff = firstPlaceTotal - entry.totalPoints;
                  return (
                    <tr
                      key={entry.owner}
                      className="hover:bg-ice-700/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-bold text-ice-100">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ice-50">
                        {entry.owner}
                      </td>
                      {yearColumns.map((year) => (
                        <td
                          key={year}
                          className="px-4 py-3 text-sm text-ice-200 text-right"
                        >
                          {entry.yearPoints[year] !== undefined
                            ? formatPoints(entry.yearPoints[year])
                            : '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm font-bold text-ice-100 text-right bg-ice-900/40">
                        {formatPoints(entry.totalPoints)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ice-200 text-right bg-ice-900/40">
                        {diff === 0 ? '-' : formatPoints(diff)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {entries.length > 0 && (
          <div className="bg-ice-900/60 px-4 py-3 text-sm text-ice-300 border-t border-ice-300/20">
            Total de {entries.length} propriétaires
          </div>
        )}
      </div>
    </div>
  );
}

