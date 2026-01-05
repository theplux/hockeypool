'use client';

import { TeamRoster, Extrapooler, ExtrapoolerStatus } from '@/lib/types';
import { formatYearRange } from '@/lib/utils';

interface ExtrapoolerDisplayProps {
  team: TeamRoster;
  selectedYear: number;
}

// Helper function to convert old format to new format
function convertExtrapoolerData(data: Extrapooler[] | ExtrapoolerStatus | undefined, teamOwner: string): Extrapooler[] {
  if (!data) {
    return [];
  }
  
  // If it's already an array, return it
  if (Array.isArray(data)) {
    return data;
  }
  
  // Convert old format (ExtrapoolerStatus) to new format (Extrapooler[])
  const status = data as ExtrapoolerStatus;
  const extrapoolers: Extrapooler[] = [];
  
  if (status.extrapooler1) extrapoolers.push({ slot: 1, originalOwner: teamOwner, isUsed: false });
  if (status.extrapooler2) extrapoolers.push({ slot: 2, originalOwner: teamOwner, isUsed: false });
  if (status.extrapooler3) extrapoolers.push({ slot: 3, originalOwner: teamOwner, isUsed: false });
  
  return extrapoolers;
}

export default function ExtrapoolerDisplay({ team, selectedYear }: ExtrapoolerDisplayProps) {
  if (!team.extrapoolers || !team.extrapoolers[selectedYear]) {
    return null; // No Extrapooler data for this year
  }

  // Handle both old and new formats
  const extrapoolers: Extrapooler[] = convertExtrapoolerData(team.extrapoolers[selectedYear], team.owner);
  const availableExtrapoolers = extrapoolers.filter(ep => !ep.isUsed);
  const usedExtrapoolers = extrapoolers.filter(ep => ep.isUsed);
  const totalCount = extrapoolers.length;
  const availableCount = availableExtrapoolers.length;
  const usedCount = usedExtrapoolers.length;

  // Group by original owner to show traded extrapoolers
  const byOriginalOwner = new Map<string, Extrapooler[]>();
  extrapoolers.forEach(ep => {
    if (!byOriginalOwner.has(ep.originalOwner)) {
      byOriginalOwner.set(ep.originalOwner, []);
    }
    byOriginalOwner.get(ep.originalOwner)!.push(ep);
  });

  return (
    <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 border border-ice-300/20 mb-6">
      <h2 className="text-2xl font-bold text-ice-100 mb-6 flex items-center gap-3">
        <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
        Extrapoolers ({formatYearRange(selectedYear)})
      </h2>
      
      {totalCount > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Show slots 1, 2, 3 */}
            {([1, 2, 3] as const).map((slot) => {
              const slotExtrapooler = extrapoolers.find(ep => ep.slot === slot);
              const isAvailable = slotExtrapooler && !slotExtrapooler.isUsed;
              const isTraded = slotExtrapooler && slotExtrapooler.originalOwner !== team.owner;
              
              return (
                <div
                  key={slot}
                  className={`p-4 rounded-lg border-2 ${
                    slotExtrapooler && !slotExtrapooler.isUsed
                      ? 'bg-ice-700/40 border-ice-300/40'
                      : 'bg-ice-900/60 border-ice-500/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-ice-100">
                      Extrapooler {slot}
                    </span>
                    {slotExtrapooler ? (
                      isAvailable ? (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30 rounded">
                          Available
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 rounded">
                          Used
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded">
                        Not owned
                      </span>
                    )}
                  </div>
                  {slotExtrapooler && (
                    <div className="text-sm text-ice-300 mt-2">
                      {isTraded && (
                        <span className="text-ice-400 text-xs">
                          From {slotExtrapooler.originalOwner} (traded)
                        </span>
                      )}
                      {!isTraded && (
                        <span className="text-ice-300 text-xs">Own extrapooler</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-ice-300/20">
            <p className="text-sm text-ice-300">
              Total: <span className="font-semibold text-ice-100">{totalCount}</span> extrapooler{totalCount === 1 ? '' : 's'} 
              {' '}(<span className="text-green-300">{availableCount}</span> available,{' '}
              <span className="text-red-300">{usedCount}</span> used)
            </p>
          </div>
        </>
      ) : (
        <p className="text-ice-300 text-sm">No extrapoolers for this year</p>
      )}
    </div>
  );
}

