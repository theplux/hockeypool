'use client';

import { useState, useMemo } from 'react';
import { PoolData, Player } from '@/lib/types';
import FilterBar from './ui/FilterBar';
import SearchInput from './ui/SearchInput';
import YearSelector from './ui/YearSelector';
import PlayerRow from './PlayerRow';
import { formatCurrency, getPlayerSalaryForYear, formatYearRange } from '@/lib/utils';

interface LeaguePageClientProps {
  data: PoolData;
}

export default function LeaguePageClient({ data }: LeaguePageClientProps) {
  // Ensure selected year is in available years, default to currentSeasonYear if available, otherwise first available year
  const initialYear = data.availableYears.includes(data.currentSeasonYear) 
    ? data.currentSeasonYear 
    : (data.availableYears[0] || data.currentSeasonYear);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedNhlTeam, setSelectedNhlTeam] = useState('');
  const [showRookies, setShowRookies] = useState(false); // Show only rookies when checked
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });

  // Get all unique values for filters
  const allTeams = useMemo(
    () => Array.from(new Set(data.teams.map((t) => t.teamName))).sort(),
    [data.teams]
  );

  const allPositions = useMemo(() => {
    const positions = new Set<string>();
    data.teams.forEach((team) => {
      team.players.forEach((player) => {
        player.positions.forEach((pos) => positions.add(pos));
      });
    });
    return Array.from(positions).sort();
  }, [data.teams]);

  const allNhlTeams = useMemo(() => {
    const nhlTeams = new Set<string>();
    data.teams.forEach((team) => {
      team.players.forEach((player) => {
        if (player.nhlTeam) nhlTeams.add(player.nhlTeam);
      });
    });
    return Array.from(nhlTeams).sort();
  }, [data.teams]);

  // Flatten all players
  const allPlayers = useMemo(() => {
    return data.teams.flatMap((team) => team.players);
  }, [data.teams]);

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = allPlayers.filter((player) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!player.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Team filter
      if (selectedTeam && player.teamName !== selectedTeam) {
        return false;
      }

      // Position filter
      if (selectedPosition && !player.positions.includes(selectedPosition)) {
        return false;
      }

      // NHL team filter
      if (selectedNhlTeam && player.nhlTeam !== selectedNhlTeam) {
        return false;
      }

      // Rookie filter - if checked, show ONLY rookies; if unchecked, show ONLY non-rookies
      if (showRookies && !player.isRookie) {
        return false;
      }
      if (!showRookies && player.isRookie) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'team':
          aValue = a.teamName;
          bValue = b.teamName;
          break;
        case 'nhlTeam':
          aValue = a.nhlTeam;
          bValue = b.nhlTeam;
          break;
        case 'salary':
          aValue = getPlayerSalaryForYear(a.contractYears, selectedYear);
          bValue = getPlayerSalaryForYear(b.contractYears, selectedYear);
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      // Handle mixed types (string UFA/RFA vs numbers)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'string') {
        // String values (UFA/RFA) sort after numbers
        return sortConfig.direction === 'asc' ? 1 : -1;
      } else if (typeof bValue === 'string') {
        // String values (UFA/RFA) sort after numbers
        return sortConfig.direction === 'asc' ? -1 : 1;
      } else {
        return sortConfig.direction === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [
    allPlayers,
    searchQuery,
    selectedTeam,
    selectedPosition,
    selectedNhlTeam,
    showRookies,
    sortConfig,
    selectedYear,
  ]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div>
      <h1 className="text-4xl font-bold bg-gradient-to-r from-ice-100 to-ice-300 bg-clip-text text-transparent mb-8">League View</h1>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput placeholder="Search players..." onSearch={setSearchQuery} />
        </div>
        <YearSelector
          years={data.availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          currentSeasonYear={data.currentSeasonYear}
        />
      </div>

      <div className="mb-6">
        <FilterBar
          teams={allTeams}
          positions={allPositions}
          nhlTeams={allNhlTeams}
          selectedTeam={selectedTeam}
          selectedPosition={selectedPosition}
          selectedNhlTeam={selectedNhlTeam}
          onTeamChange={setSelectedTeam}
          onPositionChange={setSelectedPosition}
          onNhlTeamChange={setSelectedNhlTeam}
        />
        <div className="mt-4 flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRookies}
              onChange={(e) => setShowRookies(e.target.checked)}
              className="w-4 h-4 rounded border-ice-300/30 bg-ice-800/60 text-ice-300 focus:ring-2 focus:ring-ice-300/50 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm font-medium text-ice-200">Show Rookies</span>
          </label>
        </div>
      </div>

      <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice overflow-hidden border border-ice-300/20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ice-300/20">
            <thead className="bg-ice-900/60">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider cursor-pointer hover:bg-ice-800/60 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Player{' '}
                  {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider cursor-pointer hover:bg-ice-800/60 transition-colors"
                  onClick={() => handleSort('team')}
                >
                  Pool Team{' '}
                  {sortConfig.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider cursor-pointer hover:bg-ice-800/60 transition-colors"
                  onClick={() => handleSort('nhlTeam')}
                >
                  NHL Team{' '}
                  {sortConfig.key === 'nhlTeam' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                  Position
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider cursor-pointer hover:bg-ice-800/60 transition-colors"
                  onClick={() => handleSort('salary')}
                >
                  {formatYearRange(selectedYear)} Salary{' '}
                  {sortConfig.key === 'salary' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                  {formatYearRange(selectedYear + 1)} Salary
                </th>
              </tr>
            </thead>
            <tbody className="bg-ice-800/30 divide-y divide-ice-300/10">
              {filteredAndSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ice-400">
                    No players found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedPlayers.map((player) => (
                  <PlayerRow key={`${player.teamName}-${player.name}`} player={player} selectedYear={selectedYear} />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-ice-900/60 px-4 py-3 text-sm text-ice-300 border-t border-ice-300/20">
          Showing {filteredAndSortedPlayers.length} of {allPlayers.length} players
        </div>
      </div>
    </div>
  );
}

