import { PoolData } from '@/lib/types';
import { formatCurrency, getPlayerSalaryForYear, getNumericSalary, formatYearRange } from '@/lib/utils';

interface SalaryCapSummaryProps {
  data: PoolData;
  selectedYear: number;
  filterByOwner?: string;
}

export default function SalaryCapSummary({ data, selectedYear, filterByOwner }: SalaryCapSummaryProps) {
  // Filter teams by owner if filterByOwner is provided
  const teamsToShow = filterByOwner 
    ? data.teams.filter((team) => team.owner === filterByOwner)
    : data.teams;

  const teamTotals = teamsToShow.map((team) => {
    const total = team.players.reduce((sum, player) => {
      return sum + getNumericSalary(getPlayerSalaryForYear(player.contractYears, selectedYear));
    }, 0);
    return {
      teamName: team.teamName,
      owner: team.owner,
      total,
    };
  });

  // Sort by total salary (descending)
  teamTotals.sort((a, b) => b.total - a.total);

  return (
    <div className="bg-ice-800/60 backdrop-blur-sm rounded-xl shadow-ice p-6 mb-8 border border-ice-300/20">
      <h2 className="text-2xl font-bold text-ice-100 mb-6 flex items-center gap-3">
        <span className="w-1 h-8 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
        Salary Cap Summary - {formatYearRange(selectedYear)} Season
      </h2>
      <div className="overflow-x-auto rounded-lg border border-ice-300/20">
        <table className="min-w-full divide-y divide-ice-300/20">
          <thead className="bg-ice-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                Total Payroll
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                CAP Salarial
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                Argent Disponible
              </th>
            </tr>
          </thead>
          <tbody className="bg-ice-800/30 divide-y divide-ice-300/10">
            {teamTotals.map((team) => (
              <tr key={team.teamName} className="hover:bg-ice-700/40 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-ice-50">{team.teamName}</td>
                <td className="px-4 py-3 text-sm text-ice-200">{team.owner}</td>
                <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
                  {formatCurrency(team.total)}
                </td>
                <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
                  {formatCurrency(95500000)}
                </td>
                <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
                  {formatCurrency(95500000 - team.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

