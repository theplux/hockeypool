'use client';

interface FilterBarProps {
  teams: string[];
  positions: string[];
  nhlTeams: string[];
  selectedTeam: string;
  selectedPosition: string;
  selectedNhlTeam: string;
  onTeamChange: (team: string) => void;
  onPositionChange: (position: string) => void;
  onNhlTeamChange: (nhlTeam: string) => void;
}

export default function FilterBar({
  teams,
  positions,
  nhlTeams,
  selectedTeam,
  selectedPosition,
  selectedNhlTeam,
  onTeamChange,
  onPositionChange,
  onNhlTeamChange,
}: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div>
        <label htmlFor="team-filter" className="block text-sm font-medium text-ice-200 mb-2">
          Pool Team
        </label>
        <select
          id="team-filter"
          value={selectedTeam}
          onChange={(e) => onTeamChange(e.target.value)}
          className="block w-full rounded-lg border border-ice-300/30 shadow-sm focus:border-ice-300/50 focus:ring-2 focus:ring-ice-300/50 sm:text-sm bg-ice-800/60 backdrop-blur-sm text-ice-50 px-3 py-2 transition-all"
        >
          <option value="" className="bg-ice-800 text-ice-50">All Teams</option>
          {teams.map((team) => (
            <option key={team} value={team} className="bg-ice-800 text-ice-50">
              {team}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="position-filter" className="block text-sm font-medium text-ice-200 mb-2">
          Position
        </label>
        <select
          id="position-filter"
          value={selectedPosition}
          onChange={(e) => onPositionChange(e.target.value)}
          className="block w-full rounded-lg border border-ice-300/30 shadow-sm focus:border-ice-300/50 focus:ring-2 focus:ring-ice-300/50 sm:text-sm bg-ice-800/60 backdrop-blur-sm text-ice-50 px-3 py-2 transition-all"
        >
          <option value="" className="bg-ice-800 text-ice-50">All Positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos} className="bg-ice-800 text-ice-50">
              {pos}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="nhl-team-filter" className="block text-sm font-medium text-ice-200 mb-2">
          NHL Team
        </label>
        <select
          id="nhl-team-filter"
          value={selectedNhlTeam}
          onChange={(e) => onNhlTeamChange(e.target.value)}
          className="block w-full rounded-lg border border-ice-300/30 shadow-sm focus:border-ice-300/50 focus:ring-2 focus:ring-ice-300/50 sm:text-sm bg-ice-800/60 backdrop-blur-sm text-ice-50 px-3 py-2 transition-all"
        >
          <option value="" className="bg-ice-800 text-ice-50">All NHL Teams</option>
          {nhlTeams.map((team) => (
            <option key={team} value={team} className="bg-ice-800 text-ice-50">
              {team}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

