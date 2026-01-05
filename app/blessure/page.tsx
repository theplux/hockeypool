'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PoolData } from '@/lib/types';

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

interface InjuriesData {
  scrapedAt: string;
  count: number;
  items: Injury[];
}

export default function BlessurePage() {
  const [injuriesData, setInjuriesData] = useState<InjuriesData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedOwner, setSelectedOwner] = useState<string>('');

  useEffect(() => {
    async function fetchInjuries() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/nhl/injuries');
        
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }
        
        const data: InjuriesData = await response.json();
        setInjuriesData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching injuries:', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchPoolData() {
      try {
        const response = await fetch('/api/data');
        
        if (!response.ok) {
          throw new Error(`Error fetching pool data: ${response.statusText}`);
        }
        
        const data: PoolData = await response.json();
        setPoolData(data);
      } catch (err) {
        console.error('Error fetching pool data:', err);
        // Don't set error state for pool data - it's optional
      }
    }

    fetchInjuries();
    fetchPoolData();
  }, []);

  // Scroll to selected team when selection changes
  useEffect(() => {
    if (selectedTeam && injuriesData) {
      // Create a slug-safe ID for team sections (must match getTeamId function)
      const teamId = `team-${selectedTeam.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`;
      const element = document.getElementById(teamId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedTeam, injuriesData]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-ice-300"></div>
        <p className="mt-4 text-theme-secondary">Chargement des blessures NHL...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-ice-100 mb-4">Erreur de chargement des blessures</h1>
        <div className="bg-ice-800/60 rounded-lg p-4 mb-4 max-w-2xl mx-auto border border-ice-300/20">
          <p className="text-ice-200 font-medium mb-2">Détails de l'erreur:</p>
          <p className="text-ice-300 text-sm font-mono break-words">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-ice-700 hover:bg-ice-600 text-ice-100 rounded-lg transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!injuriesData || injuriesData.items.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-ice-100 mb-4">Blessures NHL</h1>
        <p className="text-ice-300">Aucune donnée de blessure disponible pour le moment.</p>
        {injuriesData && (
          <p className="text-sm text-ice-400 mt-2">
            Dernière mise à jour: {new Date(injuriesData.scrapedAt).toLocaleString('fr-CA')}
          </p>
        )}
      </div>
    );
  }

  // Normalize a player name to handle both "First Last" and "Last, First" formats
  // Returns an array of possible normalized formats for comparison
  const normalizePlayerName = (name: string): string[] => {
    const trimmed = name.trim();
    const normalized = trimmed.toLowerCase();
    
    // If name contains a comma, it's likely in "Last, First" format
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length === 2) {
        // Convert "Last, First" to "First Last"
        const firstLast = `${parts[1]} ${parts[0]}`.toLowerCase();
        return [normalized, firstLast];
      }
    }
    
    // If name doesn't contain a comma, try converting to "Last, First" format
    // Split by space and assume last word is last name, rest is first name
    const spaceParts = trimmed.split(/\s+/).filter(p => p.length > 0);
    if (spaceParts.length >= 2) {
      const lastPart = spaceParts[spaceParts.length - 1];
      const firstParts = spaceParts.slice(0, -1);
      const lastFirst = `${lastPart}, ${firstParts.join(' ')}`.toLowerCase();
      return [normalized, lastFirst];
    }
    
    return [normalized];
  };

  // Find the owner for a given player name
  const findOwnerForPlayer = (playerName: string): string | null => {
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
  };

  // Filter injuries by owner if selected
  const injuriesFilteredByOwner = selectedOwner
    ? injuriesData.items.filter(injury => {
        const owner = findOwnerForPlayer(injury.name);
        return owner === selectedOwner;
      })
    : injuriesData.items;

  // Group filtered injuries by team
  const injuriesByTeamFiltered = injuriesFilteredByOwner.reduce<Record<string, Injury[]>>((acc, injury) => {
    const team = (injury.team && injury.team.trim()) || 'Équipe inconnue';
    if (!acc[team]) {
      acc[team] = [];
    }
    acc[team].push(injury);
    return acc;
  }, {});

  // Sort teams alphabetically, but put "Équipe inconnue" at the end
  const sortedTeamsFiltered = Object.keys(injuriesByTeamFiltered).sort((a, b) => {
    if (a === 'Équipe inconnue') return 1;
    if (b === 'Équipe inconnue') return -1;
    return a.localeCompare(b, 'fr', { sensitivity: 'base' });
  });

  // Filter teams based on selection
  const filteredTeams = selectedTeam 
    ? sortedTeamsFiltered.filter(team => team === selectedTeam)
    : sortedTeamsFiltered;

  // Create a slug-safe ID for team sections
  const getTeamId = (teamName: string) => {
    return `team-${teamName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`;
  };

  // Calculate owner injury counts (only owners with at least one injury)
  const ownerInjuryCounts = injuriesData.items.reduce<Record<string, number>>((acc, injury) => {
    const owner = findOwnerForPlayer(injury.name);
    if (owner) {
      acc[owner] = (acc[owner] || 0) + 1;
    }
    return acc;
  }, {});

  // Get sorted list of owners with injuries
  const ownersWithInjuries = Object.keys(ownerInjuryCounts).sort((a, b) => 
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-ice-100 to-ice-300 bg-clip-text text-transparent mb-2">
          Blessures NHL
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-ice-400">
          <p>
            Total des blessures: <span className="font-semibold text-ice-300">{injuriesData.count}</span>
          </p>
          <p>
            Dernière mise à jour: <span className="font-semibold text-ice-300">
              {new Date(injuriesData.scrapedAt).toLocaleString('fr-CA')}
            </span>
          </p>
        </div>
        
        {/* Team and Owner Selector Dropdowns */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="team-select" className="block text-sm font-medium text-ice-300 mb-2">
              Filtrer par équipe:
            </label>
            <select
              id="team-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full sm:w-auto min-w-[250px] px-4 py-2 bg-ice-800/60 border border-ice-300/20 rounded-lg text-ice-100 focus:outline-none focus:ring-2 focus:ring-ice-300/50 focus:border-ice-300/50 transition-colors"
            >
              <option value="">Toutes les équipes</option>
              {sortedTeamsFiltered.map((team) => (
                <option key={team} value={team}>
                  {team} ({injuriesByTeamFiltered[team].length} {injuriesByTeamFiltered[team].length === 1 ? 'blessure' : 'blessures'})
                </option>
              ))}
            </select>
            {selectedTeam && (
              <button
                onClick={() => setSelectedTeam('')}
                className="ml-2 px-3 py-2 text-sm bg-ice-700 hover:bg-ice-600 text-ice-100 rounded-lg transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
          
          {ownersWithInjuries.length > 0 && (
            <div className="flex-1">
              <label htmlFor="owner-select" className="block text-sm font-medium text-ice-300 mb-2">
                Filtrer par propriétaire:
              </label>
              <select
                id="owner-select"
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full sm:w-auto min-w-[250px] px-4 py-2 bg-ice-800/60 border border-ice-300/20 rounded-lg text-ice-100 focus:outline-none focus:ring-2 focus:ring-ice-300/50 focus:border-ice-300/50 transition-colors"
              >
                <option value="">Tous les propriétaires</option>
                {ownersWithInjuries.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner} ({ownerInjuryCounts[owner]})
                  </option>
                ))}
              </select>
              {selectedOwner && (
                <button
                  onClick={() => setSelectedOwner('')}
                  className="ml-2 px-3 py-2 text-sm bg-ice-700 hover:bg-ice-600 text-ice-100 rounded-lg transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {filteredTeams.map((team) => {
          const injuries = injuriesByTeamFiltered[team];
          return (
            <div
              key={team}
              id={getTeamId(team)}
              className="bg-ice-800/60 rounded-lg p-6 border border-ice-300/20 shadow-ice scroll-mt-20"
            >
              <h2 className="text-2xl font-bold text-ice-100 mb-4 pb-2 border-b border-ice-300/20">
                {team}
                <span className="ml-3 text-lg font-normal text-ice-400">
                  ({injuries.length} {injuries.length === 1 ? 'blessure' : 'blessures'})
                </span>
              </h2>
              
              <div className="space-y-3">
                {injuries.map((injury, index) => (
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
                        {(() => {
                          const owner = findOwnerForPlayer(injury.name);
                          return owner ? (
                            <p className="text-sm text-ice-300 mt-1">
                              Owner: <span className="font-medium text-ice-200">{owner}</span>
                            </p>
                          ) : null;
                        })()}
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
                          <span className="text-ice-400">Retour estimé: </span>
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
        })}
      </div>

      {injuriesData.count > 0 && (
        <div className="mt-8 text-center text-sm text-ice-400">
          <p>
            Données provenant de{' '}
            <a
              href="https://www.espn.in/nhl/injuries"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ice-300 hover:text-ice-200 underline"
            >
              ESPN NHL Injuries
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
