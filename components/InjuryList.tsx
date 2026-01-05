import { PoolData } from '@/lib/types';
import { normalizePlayerName } from '@/lib/utils';

interface Injury {
  team: string;
  name: string;
  position: string;
  estReturn: string;
  date: string;
  status: string;
  comment: string;
  playerUrl?: string;
}

interface InjuryListProps {
  injuries: Injury[];
  owner: string;
  poolData: PoolData;
}

/**
 * Find the owner for a given player name by matching against pool data
 */
function findOwnerForPlayer(playerName: string, poolData: PoolData): string | null {
  if (!poolData || !poolData.teams) {
    return null;
  }

  // Get all possible normalized formats for the injury name
  const injuryNameVariants = normalizePlayerName(playerName);

  for (const team of poolData.teams) {
    const player = team.players.find((p) => {
      // Get all possible normalized formats for the pool player name
      const playerNameVariants = normalizePlayerName(p.name);
      
      // Check if any variant of the injury name matches any variant of the player name
      return injuryNameVariants.some(injuryVariant => 
        playerNameVariants.some(playerVariant => playerVariant === injuryVariant)
      );
    });
    
    if (player) {
      return team.owner;
    }
  }

  return null;
}

export default function InjuryList({ injuries, owner, poolData }: InjuryListProps) {
  // Filter injuries to only show those belonging to this owner
  const ownerInjuries = injuries.filter(injury => {
    const injuryOwner = findOwnerForPlayer(injury.name, poolData);
    return injuryOwner === owner;
  });

  if (ownerInjuries.length === 0) {
    return null;
  }

  return (
    <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 border border-ice-300/20 mt-6">
      <h2 className="text-2xl font-bold text-ice-100 mb-6 flex items-center gap-3">
        <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
        Injury List
        <span className="ml-2 text-lg font-normal text-ice-400">
          ({ownerInjuries.length} {ownerInjuries.length === 1 ? 'injury' : 'injuries'})
        </span>
      </h2>
      
      <div className="space-y-3">
        {ownerInjuries.map((injury, index) => (
          <div
            key={`${injury.name}-${index}`}
            className="bg-ice-900/40 rounded-lg p-4 border border-ice-300/10 hover:border-ice-300/30 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-ice-100 mb-1">
                  {injury.playerUrl ? (
                    <a
                      href={injury.playerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-ice-300 transition-colors underline decoration-ice-400/50 hover:decoration-ice-300"
                    >
                      {injury.name}
                    </a>
                  ) : (
                    injury.name
                  )}
                  <span className="ml-2 text-base font-normal text-ice-400">
                    ({injury.position})
                  </span>
                </h3>
                <p className="text-sm text-ice-300">
                  <span className="text-ice-400">NHL Team: </span>
                  <span className="font-medium text-ice-200">{injury.team}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {injury.status && (
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      injury.status.toLowerCase().includes('out')
                        ? 'bg-red-900/50 text-red-200 border border-red-700/50'
                        : injury.status.toLowerCase().includes('day')
                        ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-700/50'
                        : 'bg-ice-700/50 text-ice-200 border border-ice-600/50'
                    }`}
                  >
                    {injury.status}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {injury.date && (
                <div>
                  <span className="text-ice-400">Date: </span>
                  <span className="text-ice-200 font-medium">{injury.date}</span>
                </div>
              )}
              {injury.estReturn && (
                <div>
                  <span className="text-ice-400">Est. Return: </span>
                  <span className="text-ice-200 font-medium">{injury.estReturn}</span>
                </div>
              )}
            </div>

            {injury.comment && (
              <div className="mt-2 pt-2 border-t border-ice-300/10">
                <p className="text-sm text-ice-300 italic">{injury.comment}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

