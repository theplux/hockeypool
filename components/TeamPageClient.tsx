'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TeamRoster, PoolData, Player } from '@/lib/types';
import RosterSection from './RosterSection';
import YearSelector from './ui/YearSelector';
import TeamSelector from './ui/TeamSelector';
import SalaryCapSummary from './SalaryCapSummary';
import ExtrapoolerDisplay from './ExtrapoolerDisplay';
import RookiePicksDisplay from './RookiePicksDisplay';
import DraftPicksDisplay from './DraftPicksDisplay';
import Link from 'next/link';

interface TeamPageClientProps {
  team: TeamRoster;
  data: PoolData;
}

export default function TeamPageClient({ team, data }: TeamPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get year from URL query params, or use default
  const yearFromUrl = useMemo(() => {
    const yearParam = searchParams.get('year');
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year) && data.availableYears.includes(year)) {
        return year;
      }
    }
    // Default to currentSeasonYear if available, otherwise first available year
    return data.availableYears.includes(data.currentSeasonYear) 
      ? data.currentSeasonYear 
      : (data.availableYears[0] || data.currentSeasonYear);
  }, [searchParams, data.availableYears, data.currentSeasonYear]);

  const [selectedYear, setSelectedYear] = useState(yearFromUrl);

  // Sync state with URL when URL changes
  useEffect(() => {
    setSelectedYear(yearFromUrl);
  }, [yearFromUrl]);

  // Initialize URL with default year if not present (only on mount)
  useEffect(() => {
    const yearParam = searchParams.get('year');
    if (!yearParam) {
      const defaultYear = data.availableYears.includes(data.currentSeasonYear) 
        ? data.currentSeasonYear 
        : (data.availableYears[0] || data.currentSeasonYear);
      const params = new URLSearchParams(searchParams.toString());
      params.set('year', defaultYear.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update URL when year changes
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', year.toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Group players by position
  const forwards = useMemo(
    () =>
      team.players.filter(
        (p) =>
          !p.isRookie &&
          (p.positions.includes('C') ||
            p.positions.includes('LW') ||
            p.positions.includes('RW') ||
            p.positions.includes('F'))
      ),
    [team.players]
  );

  const defense = useMemo(
    () =>
      team.players.filter(
        (p) => !p.isRookie && (p.positions.includes('D') || p.positions.includes('D/F'))
      ),
    [team.players]
  );

  const goalies = useMemo(
    () => team.players.filter((p) => !p.isRookie && p.positions.includes('G')),
    [team.players]
  );

  const rookies = useMemo(() => team.players.filter((p) => p.isRookie), [team.players]);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/"
          className="text-ice-300 hover:text-ice-100 text-sm font-medium mb-4 inline-flex items-center gap-2 transition-colors"
        >
          <span>←</span> Back to Teams
        </Link>
      </div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-ice-100 to-ice-300 bg-clip-text text-transparent">{team.owner}</h1>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col gap-3 sm:flex-row sm:items-center">
          <TeamSelector teams={data.teams} currentTeamName={team.teamName} />
          <YearSelector
            years={data.availableYears}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            currentSeasonYear={data.currentSeasonYear}
          />
        </div>
      </div>

      <SalaryCapSummary data={data} selectedYear={selectedYear} filterByOwner={team.owner} />

      <ExtrapoolerDisplay team={team} selectedYear={selectedYear} />

      <RookiePicksDisplay team={team} selectedYear={selectedYear} />

      <DraftPicksDisplay team={team} selectedYear={selectedYear} />

      <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 border border-ice-300/20">
        <h2 className="text-2xl font-bold text-ice-100 mb-6 flex items-center gap-3">
          <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
          Roster
        </h2>
        <RosterSection title="Forwards" players={forwards} selectedYear={selectedYear} />
        <RosterSection title="Defense" players={defense} selectedYear={selectedYear} />
        <RosterSection title="Goalies" players={goalies} selectedYear={selectedYear} />
        <RosterSection title="Rookies" players={rookies} selectedYear={selectedYear} />
      </div>
    </div>
  );
}

