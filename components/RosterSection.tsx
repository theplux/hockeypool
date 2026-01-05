import { Player } from '@/lib/types';
import { formatCurrency, getPlayerSalaryForYear, isStringSalary, formatYearRange } from '@/lib/utils';

interface RosterSectionProps {
  title: string;
  players: Player[];
  selectedYear: number;
}

export default function RosterSection({ title, players, selectedYear }: RosterSectionProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-ice-100 mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-gradient-to-b from-ice-300 to-ice-500 rounded-full"></span>
        {title}
        {title === 'Rookies' && (
          <span className="ml-2 px-2 py-1 text-sm font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
            {players.length}
          </span>
        )}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-ice-300/20 shadow-ice">
        <table className="min-w-full divide-y divide-ice-300/20 bg-ice-800/40 backdrop-blur-sm">
          <thead className="bg-ice-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                NHL Team
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ice-200 uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                {formatYearRange(selectedYear)} Salary
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                {formatYearRange(selectedYear + 1)} Salary
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ice-200 uppercase tracking-wider">
                {formatYearRange(selectedYear + 2)} Salary
              </th>
            </tr>
          </thead>
          <tbody className="bg-ice-800/30 divide-y divide-ice-300/10">
            {players.map((player) => (
              <tr key={player.name} className="hover:bg-ice-700/40 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-ice-50">
                  {player.name}
                  {player.isRookie && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
                      Rookie
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-ice-200">{player.nhlTeam}</td>
                <td className="px-4 py-3 text-sm text-ice-300">
                  {player.positions.join('/')}
                </td>
                <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
                  {(() => {
                    const salary = getPlayerSalaryForYear(player.contractYears, selectedYear);
                    return isStringSalary(salary) ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
                        {salary}
                      </span>
                    ) : (
                      formatCurrency(salary)
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
                  {(() => {
                    const nextYearSalary = getPlayerSalaryForYear(player.contractYears, selectedYear + 1);
                    return isStringSalary(nextYearSalary) ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
                        {nextYearSalary}
                      </span>
                    ) : (
                      formatCurrency(nextYearSalary)
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-ice-100 text-right font-medium">
                  {(() => {
                    const twoYearsSalary = getPlayerSalaryForYear(player.contractYears, selectedYear + 2);
                    return isStringSalary(twoYearsSalary) ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-ice-300/20 text-ice-200 border border-ice-300/30 rounded">
                        {twoYearsSalary}
                      </span>
                    ) : (
                      formatCurrency(twoYearsSalary)
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

