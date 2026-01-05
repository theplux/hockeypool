'use client';

import { TeamRoster, RookiePick } from '@/lib/types';
import { formatYearRange } from '@/lib/utils';

interface RookiePicksDisplayProps {
  team: TeamRoster;
  selectedYear: number;
}

export default function RookiePicksDisplay({ team, selectedYear }: RookiePicksDisplayProps) {
  if (!team.rookiePicks || !team.rookiePicks[selectedYear]) {
    return null; // No Rookie Picks data for this year
  }

  const picks: RookiePick[] = team.rookiePicks[selectedYear];
  
  // Group picks by round
  const picksByRound = {
    '1st': picks.filter(p => p.round === '1st'),
    '2nd': picks.filter(p => p.round === '2nd'),
    '3rd': picks.filter(p => p.round === '3rd'),
  };

  const totalPicks = picks.length;

  return (
    <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 border border-ice-300/20 mb-6">
      <h2 className="text-2xl font-bold text-ice-100 mb-6 flex items-center gap-3">
        <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
        Rookie Draft Picks ({formatYearRange(selectedYear)})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['1st', '2nd', '3rd'] as const).map((round) => {
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
            Total: <span className="font-semibold text-ice-100">{totalPicks}</span> rookie draft {totalPicks === 1 ? 'pick' : 'picks'}
          </p>
        </div>
      )}
    </div>
  );
}

