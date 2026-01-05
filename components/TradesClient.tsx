'use client';

import Link from 'next/link';
import { Trade } from '@/lib/types';
import { createSlug } from '@/lib/utils';

interface TradesClientProps {
  trades: Trade[];
  ownerSlugMap?: Record<string, string>;
}

export default function TradesClient({ trades, ownerSlugMap }: TradesClientProps) {
  // Format date to a readable format
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Return original if invalid
      }
      const formatted = date.toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      // Capitalize the first letter of the month name (e.g., "janvier" -> "Janvier")
      // Format is typically "3 janvier 2026", so we capitalize the month
      const datePart = formatted.replace(/(\d+)\s+([a-zàâäéèêëïîôùûüÿç]+)\s+(\d+)/, (match, day, month, year) => {
        return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
      });
      
      // Add time if available
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${datePart} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Split assets string into array for better display
  const parseAssets = (assetsStr: string): string[] => {
    return assetsStr.split(',').map(asset => asset.trim()).filter(asset => asset.length > 0);
  };

  // Get slug for an owner name
  const getOwnerSlug = (ownerName: string): string | null => {
    if (ownerSlugMap && ownerName in ownerSlugMap) {
      return ownerSlugMap[ownerName] || null;
    }
    // Fallback: create slug from owner name directly
    return createSlug(ownerName);
  };

  // Render owner name as link or plain text
  const renderOwnerName = (ownerName: string) => {
    const slug = getOwnerSlug(ownerName);
    if (slug) {
      return (
        <Link 
          href={`/team/${slug}`}
          className="text-lg font-bold text-ice-100 hover:text-ice-50 transition-colors underline decoration-ice-300/50 hover:decoration-ice-300 underline-offset-2"
        >
          {ownerName}
        </Link>
      );
    }
    return (
      <span className="text-lg font-bold text-ice-100">
        {ownerName}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-ice-100 to-ice-300 bg-clip-text text-transparent mb-2">
        Échanges
      </h1>
      <p className="text-theme-secondary mb-8">
        Historique de tous les échanges entre propriétaires
      </p>

      {trades.length === 0 ? (
        <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice border border-ice-300/20 p-8 text-center">
          <p className="text-ice-300">Aucun échange enregistré pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {trades.map((trade) => {
            const teamAAssets = parseAssets(trade.teamAAssets);
            const teamBAssets = parseAssets(trade.teamBAssets);
            const isExtrapooler = trade.teamB.toLowerCase() === 'extrapooler';

            return (
              <div
                key={trade.tradeId}
                className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice overflow-hidden border border-ice-300/20"
              >
                <div className="bg-ice-900/60 px-6 py-4 border-b border-ice-300/20">
                  <div className="flex items-center justify-between">
                    {isExtrapooler ? (
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                        Extrapooler
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                        Échange
                      </span>
                    )}
                    <span className="text-sm text-ice-300 ml-auto">
                      {formatDate(trade.date)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {isExtrapooler ? (
                    // Extrapooler transaction layout
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        {renderOwnerName(trade.teamA)}
                        <span className="text-sm text-ice-400">utilise:</span>
                        <span className="text-sm font-semibold text-ice-200 bg-ice-700/40 px-2 py-1 rounded">
                          {trade.teamBAssets}
                        </span>
                      </div>
                      <div className="bg-ice-700/20 dark:bg-ice-900/40 rounded-lg p-4 border border-ice-300/20 dark:border-ice-300/10">
                        <div className="space-y-2">
                          {teamAAssets.map((asset, index) => (
                            <div
                              key={index}
                              className="text-theme-primary flex items-start gap-2"
                            >
                              <span className="text-theme-tertiary mt-1">•</span>
                              <span>{asset}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Regular trade layout
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Team A */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          {renderOwnerName(trade.teamA)}
                          <span className="text-sm text-ice-400">reçoit:</span>
                        </div>
                        <div className="bg-ice-700/20 dark:bg-ice-900/40 rounded-lg p-4 border border-ice-300/20 dark:border-ice-300/10">
                          <ul className="space-y-2">
                            {teamBAssets.map((asset, index) => (
                              <li
                                key={index}
                                className="text-theme-primary flex items-start gap-2"
                              >
                                <span className="text-theme-tertiary mt-1">•</span>
                                <span>{asset}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Team B */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          {renderOwnerName(trade.teamB)}
                          <span className="text-sm text-ice-400">reçoit:</span>
                        </div>
                        <div className="bg-ice-700/20 dark:bg-ice-900/40 rounded-lg p-4 border border-ice-300/20 dark:border-ice-300/10">
                          <ul className="space-y-2">
                            {teamAAssets.map((asset, index) => (
                              <li
                                key={index}
                                className="text-theme-primary flex items-start gap-2"
                              >
                                <span className="text-theme-tertiary mt-1">•</span>
                                <span>{asset}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Exchange arrow on mobile (only for regular trades) */}
                  {!isExtrapooler && (
                    <div className="md:hidden flex items-center justify-center my-4">
                      <div className="text-ice-400 text-2xl">⇄</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {trades.length > 0 && (
        <div className="mt-6 text-center text-sm text-ice-400">
          Total de {trades.length} échange{trades.length > 1 ? 's' : ''} enregistré{trades.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

