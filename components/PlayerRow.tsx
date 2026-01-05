import { Player } from '@/lib/types';
import { formatCurrency, getPlayerSalaryForYear, isStringSalary } from '@/lib/utils';

interface PlayerRowProps {
  player: Player;
  selectedYear: number;
}

export default function PlayerRow({ player, selectedYear }: PlayerRowProps) {
  const salary = getPlayerSalaryForYear(player.contractYears, selectedYear);
  const nextYearSalary = getPlayerSalaryForYear(player.contractYears, selectedYear + 1);
  const positions = player.positions.join('/');

  return (
    <tr className="hover:bg-ice-700/40 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-ice-50">
        {player.name}
        {player.isRookie && (
          <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
            R
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-ice-200">{player.teamName}</td>
      <td className="px-4 py-3 text-sm text-ice-200">{player.nhlTeam}</td>
      <td className="px-4 py-3 text-sm text-ice-300">{positions}</td>
      <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
        {isStringSalary(salary) ? (
          <span className="px-2 py-1 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
            {salary}
          </span>
        ) : (
          formatCurrency(salary)
        )}
      </td>
      <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
        {isStringSalary(nextYearSalary) ? (
          <span className="px-2 py-1 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
            {nextYearSalary}
          </span>
        ) : (
          formatCurrency(nextYearSalary)
        )}
      </td>
    </tr>
  );
}

