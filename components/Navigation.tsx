'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { TeamRoster } from '@/lib/types';
import { createSlug } from '@/lib/utils';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teams, setTeams] = useState<TeamRoster[]>([]);
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch teams data from the public JSON file
    const fetchTeams = async () => {
      try {
        const response = await fetch('/data/pool-data.json');
        if (response.ok) {
          const data = await response.json();
          if (data.teams) {
            // Sort teams by owner name alphabetically
            const sortedTeams = [...data.teams].sort((a, b) => 
              a.owner.localeCompare(b.owner)
            );
            setTeams(sortedTeams);
          }
        }
      } catch (error) {
        console.error('Error loading teams data:', error);
      }
    };

    fetchTeams();
  }, []);

  return (
    <nav className="nav-bg backdrop-blur-sm border-b shadow-ice sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center px-2 py-2 text-2xl font-bold logo-gradient transition-all">
              🏒 Hockey Pool
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
              <div 
                className="relative inline-flex items-center"
                onMouseEnter={() => setTeamsDropdownOpen(true)}
                onMouseLeave={() => setTeamsDropdownOpen(false)}
              >
                <Link
                  href="/"
                  className="border-transparent text-theme-secondary hover:border-ice-300 dark:hover:border-ice-300 hover:text-theme-primary inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Teams
                </Link>
                {teamsDropdownOpen && teams.length > 0 && (
                  <div className="absolute top-full left-0 pt-1 w-64 z-50">
                    <div className="rounded-lg shadow-ice backdrop-blur-md border py-2" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                      <div className="max-h-96 overflow-y-auto">
                        {teams.map((team) => {
                          const slug = createSlug(team.teamName);
                          return (
                            <Link
                              key={team.teamName}
                              href={`/team/${slug}`}
                              className="dropdown-item block px-4 py-2.5 text-sm text-theme-secondary hover:text-theme-primary transition-colors border-b last:border-b-0"
                              style={{ borderColor: 'var(--card-border)' }}
                            >
                              <div className="font-medium text-theme-primary transition-colors">{team.teamName}</div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Link
                href="/league"
                className="border-transparent text-theme-secondary hover:border-ice-300 dark:hover:border-ice-300 hover:text-theme-primary inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                League View
              </Link>
              <Link
                href="/echanges"
                className="border-transparent text-theme-secondary hover:border-ice-300 dark:hover:border-ice-300 hover:text-theme-primary inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Échanges
              </Link>
              <Link
                href="/bourse-5ans"
                className="border-transparent text-theme-secondary hover:border-ice-300 dark:hover:border-ice-300 hover:text-theme-primary inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Bourse 5ans
              </Link>
              <Link
                href="/regles"
                className="border-transparent text-theme-secondary hover:border-ice-300 dark:hover:border-ice-300 hover:text-theme-primary inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Règles
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-ice-800/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ice-300"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-ice-300/20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-theme-secondary hover:bg-ice-800/60 hover:text-theme-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Teams
            </Link>
            <Link
              href="/league"
              onClick={() => setMobileMenuOpen(false)}
              className="text-theme-secondary hover:bg-ice-800/60 hover:text-theme-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              League View
            </Link>
            <Link
              href="/echanges"
              onClick={() => setMobileMenuOpen(false)}
              className="text-theme-secondary hover:bg-ice-800/60 hover:text-theme-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Échanges
            </Link>
            <Link
              href="/bourse-5ans"
              onClick={() => setMobileMenuOpen(false)}
              className="text-theme-secondary hover:bg-ice-800/60 hover:text-theme-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Bourse 5ans
            </Link>
            <Link
              href="/regles"
              onClick={() => setMobileMenuOpen(false)}
              className="text-theme-secondary hover:bg-ice-800/60 hover:text-theme-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Règles
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}



