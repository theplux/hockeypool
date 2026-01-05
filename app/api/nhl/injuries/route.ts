import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// ESPN NHL injuries page URL (try .com first, fallback to .in)
const ESPN_INJURIES_URL = 'https://www.espn.com/nhl/injuries';
const ESPN_INJURIES_URL_ALT = 'https://www.espn.in/nhl/injuries';
// Cache duration: 1 hour in milliseconds
const CACHE_DURATION = 60 * 60 * 1000;
// Request timeout: 15 seconds
const REQUEST_TIMEOUT = 15000;

// In-memory cache
let cachedData: {
  scrapedAt: string;
  count: number;
  items: Array<{
    team: string;
    name: string;
    position: string;
    estReturn: string;
    date: string;
    status: string;
    comment: string;
    playerUrl?: string;
  }>;
} | null = null;
let lastFetchTime = 0;

// Browser-like headers to avoid bot detection
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

// Expected column headers to identify injury tables
const EXPECTED_HEADERS = ['NAME', 'POS', 'EST. RETURN', 'DATE', 'STATUS', 'COMMENT'];

/**
 * Normalize header text for comparison (case-insensitive, trim whitespace)
 */
function normalizeHeader(header: string): string {
  return header.trim().toUpperCase();
}

/**
 * Check if a table contains the expected injury headers
 */
function hasExpectedHeaders(headers: string[]): boolean {
  const normalizedHeaders = headers.map(normalizeHeader);
  return EXPECTED_HEADERS.every(expected => 
    normalizedHeaders.some(actual => actual.includes(expected) || expected.includes(actual))
  );
}

/**
 * Map table headers to field indices
 */
function mapHeadersToIndices(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map(normalizeHeader);
  
  EXPECTED_HEADERS.forEach(expected => {
    const index = normalizedHeaders.findIndex(h => 
      h.includes(expected) || expected.includes(h)
    );
    if (index !== -1) {
      mapping[expected] = index;
    }
  });
  
  return mapping;
}

/**
 * Extract player URL from a cell that might contain a link
 */
function extractPlayerUrl($: cheerio.CheerioAPI, cell: cheerio.Element): string | undefined {
  const link = $(cell).find('a').attr('href');
  if (link) {
    // Handle both relative and absolute URLs
    if (link.startsWith('http')) {
      return link;
    }
    if (link.startsWith('/')) {
      return `https://www.espn.in${link}`;
    }
    return `https://www.espn.in/${link}`;
  }
  return undefined;
}

/**
 * Scrape injuries from ESPN NHL injuries page
 */
async function scrapeInjuries(): Promise<{
  scrapedAt: string;
  count: number;
  items: Array<{
    team: string;
    name: string;
    position: string;
    estReturn: string;
    date: string;
    status: string;
    comment: string;
    playerUrl?: string;
  }>;
}> {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    // Fetch the page with browser-like headers (try .com first)
    let response = await fetch(ESPN_INJURIES_URL, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
    });

    // If .com fails, try .in domain
    if (!response.ok && response.status === 404) {
      console.log('ESPN.com URL failed, trying ESPN.in...');
      response = await fetch(ESPN_INJURIES_URL_ALT, {
        headers: FETCH_HEADERS,
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or very short HTML response');
    }

    const $ = cheerio.load(html);
    
    // Debug: Log table count
    const tableCount = $('table').length;
    console.log(`Found ${tableCount} tables on ESPN page`);
    const injuries: Array<{
      team: string;
      name: string;
      position: string;
      estReturn: string;
      date: string;
      status: string;
      comment: string;
      playerUrl?: string;
    }> = [];

    // ESPN often uses specific class names for injury tables
    // Try finding tables with common ESPN injury table classes first
    const injuryTables = $('table[class*="Table"], table[class*="injuries"], table[class*="Injuries"], table, .Table, .Table__TBODY');
    
    // If no tables found, try finding by data attributes or wrapper classes
    if (injuryTables.length === 0) {
      // ESPN might use div-based tables or React components
      const divTables = $('[class*="injuries"], [class*="Injuries"], [data-testid*="injuries"]');
      if (divTables.length > 0) {
        console.log('Found div-based injury containers, processing...');
      }
    }

    // Find all tables on the page (including those with ESPN classes)
    const tablesToProcess = injuryTables.length > 0 ? injuryTables : $('table');
    
    // Global team tracker (gets reset per table via tableTeam)
    let currentTeam = '';
    
    tablesToProcess.each((_, table) => {
      const $table = $(table);
      
      // Reset team for each table to ensure proper team detection
      let tableTeam = '';
      
      const headers: string[] = [];

      // Extract column headers from thead or first row
      // ESPN might use different structures, so try multiple selectors
      const headerSelectors = [
        'thead tr th',
        'thead tr td',
        'tbody tr:first-child th',
        'tbody tr:first-child td',
        'tr:first-child th',
        'tr:first-child td',
        '.Table__TH',
        '[class*="Table__TH"]'
      ];
      
      headerSelectors.forEach(selector => {
        $table.find(selector).each((_, cell) => {
          const headerText = $(cell).text().trim();
          if (headerText && !headers.includes(headerText)) {
            headers.push(headerText);
          }
        });
      });

      // Check if this is an injury table by looking for expected headers
      // Also check if table is inside an injury-related container
      const isInjuryTable = headers.length > 0 && hasExpectedHeaders(headers);
      const $parent = $table.parent();
      const hasInjuryContext = $parent.find('[class*="injuries"], [class*="Injuries"], h2, h3').length > 0;
      
      // Also check if we're in a team section
      // Try multiple approaches to find team name for THIS table
      // 1. Check previous sibling headings (most common ESPN pattern)
      const teamHeaders = $table.prevAll('h2, h3, h4, h5, [class*="team"], [class*="Team"]').first();
      if (teamHeaders.length > 0) {
        const teamText = teamHeaders.text().trim();
        // Filter out headers that are actually column headers
        // Check if it contains multiple column header keywords (likely a header row)
        const headerCount = EXPECTED_HEADERS.filter(h => teamText.toUpperCase().includes(h)).length;
        const isNotHeader = headerCount < 2; // If it contains 2+ header keywords, it's likely a header row
        const hasNoSpacesInWords = !teamText.includes('  '); // Team names usually don't have multiple spaces
        const reasonableLength = teamText.length >= 3 && teamText.length <= 40; // Team names are typically short
        
        if (teamText && isNotHeader && hasNoSpacesInWords && reasonableLength) {
          tableTeam = teamText;
        }
      }
      
      // 2. Check parent containers for team info
      if (!tableTeam) {
        const parentWithTeam = $table.parents('[class*="team"], [class*="Team"], [class*="injuries"], [class*="Injuries"]').first();
        if (parentWithTeam.length > 0) {
          const teamFromParent = parentWithTeam.find('h2, h3, h4, [class*="team"]').first();
          if (teamFromParent.length > 0) {
            const teamText = teamFromParent.text().trim();
            const headerCount = EXPECTED_HEADERS.filter(h => teamText.toUpperCase().includes(h)).length;
            if (teamText && teamText.length >= 3 && teamText.length <= 40 && headerCount < 2) {
              tableTeam = teamText;
            }
          }
        }
      }
      
      // 3. Check for team name in table caption or first row with colspan
      if (!tableTeam) {
        const caption = $table.find('caption').text().trim();
        const headerCount = EXPECTED_HEADERS.filter(h => caption.toUpperCase().includes(h)).length;
        if (caption && caption.length >= 3 && caption.length <= 40 && headerCount < 2) {
          tableTeam = caption;
        }
      }
      
      // Use the table's team for this table's injuries
      currentTeam = tableTeam;

      if (isInjuryTable || hasInjuryContext) {
        const headerMapping = isInjuryTable ? mapHeadersToIndices(headers) : {};

        // Process each row in the table body
        // Try multiple selectors for rows, but only process each row once
        const rowSelectors = [
          'tbody tr',
          'tr',
          '.Table__TR',
          '[class*="Table__TR"]'
        ];
        
        // Track processed row elements to avoid duplicates across selectors
        const processedRowElements = new Set<cheerio.Element>();
        
        // Find all unique rows using the first selector that returns results
        let rowsToProcess: cheerio.Element[] = [];
        for (const selector of rowSelectors) {
          const foundRows = $table.find(selector).toArray();
          if (foundRows.length > 0) {
            rowsToProcess = foundRows;
            break; // Use the first selector that finds rows
          }
        }
        
        // Process each row only once
        rowsToProcess.forEach((row) => {
          if (processedRowElements.has(row)) {
            return; // Skip if already processed
          }
          processedRowElements.add(row);
          const $row = $(row);
          // Try multiple cell selectors
          let cells = $row.find('td, th, .Table__TD, [class*="Table__TD"]').toArray();
          if (cells.length === 0) {
            cells = $row.children().toArray();
          }

          if (cells.length === 0) return;

          // Check if this is a team header row (usually has fewer cells or different styling)
          // Team names are often in the first cell and span multiple columns
          const firstCellText = $(cells[0]).text().trim();
          const headerCount = EXPECTED_HEADERS.filter(h => firstCellText.toUpperCase().includes(h)).length;
          const isHeaderRow = headerCount >= 2;
          
          // If the row has only one cell or the first cell looks like a team name
          // (contains team-related keywords or is much longer, but NOT a header row)
          if (!isHeaderRow && (cells.length === 1 || (firstCellText && !headerMapping['POS'] && !headerMapping['NAME']))) {
            // This might be a team header - update team for this table
            if (firstCellText && firstCellText.length >= 3 && firstCellText.length <= 40 && !firstCellText.match(/^\d+$/)) {
              tableTeam = firstCellText;
              currentTeam = firstCellText; // Also update global for consistency
            }
            return;
          }
          
          // Skip header rows
          if (isHeaderRow) {
            return;
          }

          // Extract data from cells based on header mapping
          // If no header mapping, assume standard order: NAME, POS, EST. RETURN, DATE, STATUS, COMMENT
          let nameIndex = headerMapping['NAME'];
          let posIndex = headerMapping['POS'];
          let estReturnIndex = headerMapping['EST. RETURN'];
          let dateIndex = headerMapping['DATE'];
          let statusIndex = headerMapping['STATUS'];
          let commentIndex = headerMapping['COMMENT'];

          // Fallback: if no header mapping, assume standard column order
          if (nameIndex === undefined || posIndex === undefined) {
            if (cells.length >= 2) {
              // Assume first column is name, second is position
              nameIndex = 0;
              posIndex = 1;
              estReturnIndex = cells.length > 2 ? 2 : undefined;
              dateIndex = cells.length > 3 ? 3 : undefined;
              statusIndex = cells.length > 4 ? 4 : undefined;
              commentIndex = cells.length > 5 ? 5 : undefined;
            } else {
              return; // Skip rows without enough cells
            }
          }

          const name = nameIndex !== undefined && nameIndex < cells.length ? $(cells[nameIndex]).text().trim() : '';
          const position = posIndex !== undefined && posIndex < cells.length ? $(cells[posIndex]).text().trim() : '';
          const estReturn = estReturnIndex !== undefined && estReturnIndex < cells.length 
            ? $(cells[estReturnIndex]).text().trim() 
            : '';
          const date = dateIndex !== undefined && dateIndex < cells.length 
            ? $(cells[dateIndex]).text().trim() 
            : '';
          const status = statusIndex !== undefined && statusIndex < cells.length 
            ? $(cells[statusIndex]).text().trim() 
            : '';
          const comment = commentIndex !== undefined && commentIndex < cells.length 
            ? $(cells[commentIndex]).text().trim() 
            : '';

          // Extract player URL if available
          const playerUrl = nameIndex !== undefined && nameIndex < cells.length 
            ? extractPlayerUrl($, cells[nameIndex]) 
            : undefined;

          // Only add if we have at least a name and position
          // Also check that name doesn't look like a header row
          const isNameValid = name && name.length > 1 && !EXPECTED_HEADERS.some(h => name.toUpperCase().includes(h));
          const isPositionValid = position && position.length <= 3 && position.length > 0;
          
          if (isNameValid && isPositionValid) {
            // Use tableTeam for this table, fallback to currentTeam if tableTeam not found yet
            const teamForInjury = tableTeam || currentTeam;
            if (!teamForInjury) {
              // Check if this row might be a team header
              // Don't treat header rows as team names
              const headerCount = EXPECTED_HEADERS.filter(h => name.toUpperCase().includes(h)).length;
              const isHeaderRow = headerCount >= 2;
              
              if (!isHeaderRow && (cells.length === 1 || (!position.match(/^[CDGLRW]+$/i) && name.length > 5 && name.length <= 40))) {
                tableTeam = name;
                currentTeam = name;
                return; // Don't add as injury, it's a team name
              } else {
                // Skip this injury if we can't determine team - we'll try again in the alternative approach
                return;
              }
            }
            
            injuries.push({
              team: teamForInjury,
              name,
              position,
              estReturn,
              date,
              status,
              comment,
              playerUrl,
            });
          } else if (name && name.length > 3 && !isPositionValid && 
                     !EXPECTED_HEADERS.some(h => name.toUpperCase().includes(h))) {
            // This might be a team name row
            tableTeam = name;
            currentTeam = name;
          }
        });
      } else {
        // Try to find team names in non-table elements near tables
        // Some ESPN pages have team names as headings above tables
        const $prevSibling = $table.prev();
        const prevText = $prevSibling.text().trim();
        // Filter out column headers
        const headerCount = EXPECTED_HEADERS.filter(h => prevText.toUpperCase().includes(h)).length;
        const isNotHeader = headerCount < 2;
        if (prevText && prevText.length >= 3 && prevText.length <= 40 && isNotHeader) {
          currentTeam = prevText;
        }
      }
    });

    // Alternative approach: Look for team sections if tables don't contain team info
    // ESPN often structures pages with team sections containing injury tables
    if (injuries.length === 0) {
      // Try to find team names in headings before tables
      $('h2, h3, h4, [class*="team"], [class*="Team"]').each((_, element) => {
        const text = $(element).text().trim();
        // Check if this looks like a team name (not a column header)
        const headerCount = EXPECTED_HEADERS.filter(h => text.toUpperCase().includes(h)).length;
        const isNotHeader = headerCount < 2;
        const reasonableLength = text.length >= 3 && text.length <= 40;
        const noMultipleSpaces = !text.includes('  ') && !text.includes('\n');
        
        if (text && isNotHeader && reasonableLength && noMultipleSpaces) {
          const nextTable = $(element).nextAll('table').first();
          if (nextTable.length > 0) {
            currentTeam = text;
            // Try to re-process tables with the team name
            nextTable.find('tbody tr, tr').each((_, row) => {
              const $row = $(row);
              const cells = $row.find('td, th, .Table__TD').toArray();
              if (cells.length >= 2) {
                const name = $(cells[0]).text().trim();
                const position = $(cells[1]).text().trim();
                if (name && position && name.length > 2 && position.length <= 3) {
                  const estReturn = cells[2] ? $(cells[2]).text().trim() : '';
                  const date = cells[3] ? $(cells[3]).text().trim() : '';
                  const status = cells[4] ? $(cells[4]).text().trim() : '';
                  const comment = cells[5] ? $(cells[5]).text().trim() : '';
                  const playerUrl = extractPlayerUrl($, cells[0]);
                  
                  injuries.push({
                    team: currentTeam,
                    name,
                    position,
                    estReturn,
                    date,
                    status,
                    comment,
                    playerUrl,
                  });
                }
              }
            });
          }
        }
      });
    }
    
    // Last resort: Try to extract from script tags (ESPN sometimes embeds data in JSON)
    if (injuries.length === 0) {
      $('script[type="application/json"], script[type="application/ld+json"]').each((_, script) => {
        try {
          const jsonText = $(script).html();
          if (jsonText) {
            const data = JSON.parse(jsonText);
            // Try to extract injury data from JSON structure
            if (Array.isArray(data) || (data && typeof data === 'object')) {
              // ESPN might structure data differently in JSON
              // This is a fallback that may need adjustment based on actual ESPN structure
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      });
    }

    // Remove duplicates based on team, name, position, date, status, and comment
    // Create a unique key for each injury - use a more comprehensive key to catch duplicates
    const uniqueInjuriesMap = new Map<string, typeof injuries[0]>();
    
    injuries.forEach(injury => {
      // Normalize values for comparison (trim, lowercase, remove extra spaces)
      const normalize = (str: string) => (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Create a unique key: team + name + position + date + status + first 50 chars of comment
      const commentKey = normalize(injury.comment).substring(0, 50);
      const uniqueKey = [
        normalize(injury.team),
        normalize(injury.name),
        normalize(injury.position),
        normalize(injury.date),
        normalize(injury.status),
        commentKey
      ].join('|');
      
      // Only add if we haven't seen this exact injury before
      if (!uniqueInjuriesMap.has(uniqueKey)) {
        uniqueInjuriesMap.set(uniqueKey, injury);
      } else {
        // Log duplicate for debugging
        console.log(`Duplicate injury found: ${injury.name} (${injury.team})`);
      }
    });
    
    // Convert map back to array
    const uniqueInjuries = Array.from(uniqueInjuriesMap.values());

    // Debug: Log what we found
    console.log(`Scraped ${injuries.length} injuries from ESPN, ${uniqueInjuries.length} unique after deduplication`);
    if (uniqueInjuries.length === 0) {
      console.log('No injuries found. This might indicate the page structure has changed.');
    }

    return {
      scrapedAt: new Date().toISOString(),
      count: uniqueInjuries.length,
      items: uniqueInjuries,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout: ESPN page took too long to respond');
    }
    throw error;
  }
}

/**
 * GET handler for /api/nhl/injuries
 * Returns cached data if available, otherwise scrapes fresh data
 */
export const runtime = 'nodejs'; // Use Node.js runtime (not Edge)

export async function GET(request: NextRequest) {
  const currentTime = Date.now();
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh && cachedData && currentTime - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    // Scrape fresh data
    const data = await scrapeInjuries();

    // Update cache
    cachedData = data;
    lastFetchTime = currentTime;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error scraping NHL injuries:', error);

    // If we have cached data, return it even if stale
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
          'X-Cache': 'STALE',
        },
      });
    }

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch injuries data',
        message: error instanceof Error ? error.message : 'Unknown error',
        scrapedAt: new Date().toISOString(),
        count: 0,
        items: [],
      },
      { status: 500 }
    );
  }
}
