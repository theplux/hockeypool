'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { TeamRoster } from '@/lib/types';
import { createSlug } from '@/lib/utils';

interface TeamSelectorProps {
  teams: TeamRoster[];
  currentTeamName: string;
}

export default function TeamSelector({ teams, currentTeamName }: TeamSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sort teams by owner alphabetically (A-Z)
  const sortedTeams = [...teams].sort((a, b) => 
    a.owner.localeCompare(b.owner, undefined, { sensitivity: 'base' })
  );

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTeamName = e.target.value;
    if (selectedTeamName && selectedTeamName !== currentTeamName) {
      const slug = createSlug(selectedTeamName);
      // Preserve year query parameter when switching teams
      const year = searchParams.get('year');
      const url = year ? `/team/${slug}?year=${year}` : `/team/${slug}`;
      router.push(url);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="team-select" className="text-sm font-medium text-ice-200">
        Switch Team:
      </label>
      <select
        id="team-select"
        value={currentTeamName}
        onChange={handleTeamChange}
        className="block rounded-lg border border-ice-300/30 shadow-sm focus:border-ice-300/50 focus:ring-2 focus:ring-ice-300/50 sm:text-sm bg-ice-800/60 backdrop-blur-sm text-ice-50 px-3 py-2 transition-all min-w-[200px]"
      >
        {sortedTeams.map((team) => (
          <option key={team.teamName} value={team.teamName} className="bg-ice-800 text-ice-50">
            {team.teamName}
          </option>
        ))}
      </select>
    </div>
  );
}

