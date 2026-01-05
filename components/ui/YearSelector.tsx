'use client';

import { formatYearRange } from '@/lib/utils';

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  currentSeasonYear: number;
}

export default function YearSelector({
  years,
  selectedYear,
  onYearChange,
  currentSeasonYear,
}: YearSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="year-select" className="text-sm font-medium text-ice-200">
        Season:
      </label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
        className="block rounded-lg border border-ice-300/30 shadow-sm focus:border-ice-300/50 focus:ring-2 focus:ring-ice-300/50 sm:text-sm bg-ice-800/60 backdrop-blur-sm text-ice-50 px-3 py-2 transition-all"
      >
        {years.map((year) => (
          <option key={year} value={year} className="bg-ice-800 text-ice-50">
            {formatYearRange(year)} {year === currentSeasonYear ? '(Current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

