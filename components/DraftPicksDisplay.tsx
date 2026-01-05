'use client';

import { TeamRoster, DraftPick } from '@/lib/types';
import { formatYearRange } from '@/lib/utils';

interface DraftPicksDisplayProps {
  team: TeamRoster;
  selectedYear: number;
}

export default function DraftPicksDisplay({ team, selectedYear }: DraftPicksDisplayProps) {
  // Debug: Check if draft picks exist at all
  if (!team.draftPicks) {
    return null; // No draft picks data at all
  }
  
  // Check if there are picks for the selected year
  if (!team.draftPicks[selectedYear]) {
    // Check if there are any draft picks for other years
    const hasAnyDraftPicks = Object.keys(team.draftPicks).length > 0;
    if (hasAnyDraftPicks) {
      // Show a message that picks exist but not for this year
      const availableYears = Object.keys(team.draftPicks).map(y => parseInt(y, 10)).sort();
      return (
        <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 border border-ice-300/20 mb-6">
          <h2 className="text-2xl font-bold text-ice-100 mb-2 flex items-center gap-3">
            <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
            Draft Picks ({formatYearRange(selectedYear)})
          </h2>
          <p className="text-ice-300 text-sm">
            No draft picks for {formatYearRange(selectedYear)}. Available years: {availableYears.map(y => formatYearRange(y)).join(', ')}
          </p>
        </div>
      );
    }
    return null; // No draft picks at all
  }

  const picks: DraftPick[] = team.draftPicks[selectedYear];
  
  // Group picks by round
  const picksByRound = {
    '1st': picks.filter(p => p.round === '1st'),
    '2nd': picks.filter(p => p.round === '2nd'),
    '3rd': picks.filter(p => p.round === '3rd'),
    '4th': picks.filter(p => p.round === '4th'),
    '5th': picks.filter(p => p.round === '5th'),
    '6th': picks.filter(p => p.round === '6th'),
    '7th': picks.filter(p => p.round === '7th'),
    '8th': picks.filter(p => p.round === '8th'),
  };

  const totalPicks = picks.length;

  return (
    <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 border border-ice-300/20 mb-6">
      <h2 className="text-2xl font-bold text-ice-100 mb-6 flex items-center gap-3">
        <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
        Draft Picks ({formatYearRange(selectedYear)})
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'] as const).map((round) => {
          const roundPicks = picksByRound[round];
          const count = roundPicks.length;
          
          return (
            <div
              key={round}
              className={`p-4 rounded-lg border-2 ${
                count > 0
                  ? 'bg-ice-700/40 border-ice-300/40'
                  : 'bg-ice-900/60 border-ice-500/30 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-ice-100">{round} Round</span>
                {count > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                    {count} {count === 1 ? 'pick' : 'picks'}
                  </span>
                )}
              </div>
              {count > 0 ? (
                <div className="space-y-2">
                  {roundPicks.map((pick, index) => (
                    <div
                      key={index}
                      className="text-sm text-ice-200 bg-ice-800/40 rounded p-2"
                    >
                      {pick.originalOwner !== team.owner ? (
                        <span>
                          <span className="font-medium text-ice-100">{pick.originalOwner}&apos;s</span>
                          <span className="text-ice-400 text-xs ml-1">(traded)</span>
                        </span>
                      ) : (
                        <span className="text-ice-300">Own pick</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-ice-400 italic">No picks</div>
              )}
            </div>
          );
        })}
      </div>
      {totalPicks > 0 && (
        <div className="mt-4 pt-4 border-t border-ice-300/20">
          <p className="text-sm text-ice-300">
            Total: <span className="font-semibold text-ice-100">{totalPicks}</span> draft {totalPicks === 1 ? 'pick' : 'picks'}
          </p>
        </div>
      )}
    </div>
  );
}

