'use client';

import { useState, useMemo } from 'react';
import TeamCard from './TeamCard';
import SearchInput from './ui/SearchInput';
import { PoolData } from '@/lib/types';

export default function TeamsListClient({ teams }: { teams: PoolData['teams'] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeams = useMemo(() => {
    let result = teams;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = teams.filter(
        (team) =>
          team.teamName.toLowerCase().includes(query) ||
          team.owner.toLowerCase().includes(query)
      );
    }
    
    // Sort teams by owner alphabetically (A-Z)
    return [...result].sort((a, b) => 
      a.owner.localeCompare(b.owner, undefined, { sensitivity: 'base' })
    );
  }, [teams, searchQuery]);

  return (
    <>
      <div className="mb-6">
        <SearchInput
          placeholder="Search teams or owners..."
          onSearch={setSearchQuery}
        />
      </div>
      {filteredTeams.length === 0 ? (
        <p className="text-center text-ice-400 py-8">No teams found matching your search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <TeamCard key={team.teamName} team={team} />
          ))}
        </div>
      )}
    </>
  );
}

