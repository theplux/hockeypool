import Link from 'next/link';
import { TeamRoster } from '@/lib/types';
import { createSlug } from '@/lib/utils';

interface TeamCardProps {
  team: TeamRoster;
}

export default function TeamCard({ team }: TeamCardProps) {
  const slug = createSlug(team.teamName);
  const playerCount = team.players.length;

  return (
    <Link href={`/team/${slug}`}>
      <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice hover:bg-ice-800/90 transition-all p-6 border border-ice-300/20 hover:border-ice-300/60 group team-card">
        <h3 className="text-xl font-bold text-ice-100 mb-2 group-hover:text-ice-50 transition-colors">{team.owner}</h3>
        <p className="text-sm text-ice-400">{playerCount} players</p>
      </div>
    </Link>
  );
}

