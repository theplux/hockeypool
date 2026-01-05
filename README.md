# Hockey Pool Website

A public read-only website for displaying hockey pool data, built with Next.js 14, TypeScript, and TailwindCSS.

## Features

- **Home Page**: List of all teams/owners with quick search functionality
- **Team Pages**: Detailed roster view grouped by position (Forwards/Defense/Goalies/Rookies) with salary information
- **League View**: Comprehensive table of all players with filters (team, position, NHL team) and search
- **Salary Cap Summary**: Total payroll per team for selected year
- **Year Selector**: Switch between different seasons to view salary data
- **Mobile-Friendly**: Responsive design that works on all devices

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS
- PapaParse (CSV parsing)
- Deployed on Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository or navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Create your CSV file in the `/data` directory. Name it `pool-data.csv` (the system will use `sample-pool-data.csv` as a fallback).

### CSV Format Requirements

Your CSV file should have the following columns:

- **Team**: The pool team name
- **Owner**: The team owner's name
- **Player Name**: The player's full name
- **NHL Team**: The NHL team the player plays for
- **Position**: Player position(s), can be comma or slash separated (e.g., "C", "C/LW", "D", "G")
- **Year columns**: One column per year with salary data (e.g., "2025 Salary", "2026 Salary", "2027 Salary")
- **Is Rookie**: Boolean value (true/false or 1/0) indicating if the player is a rookie

Example CSV structure:
```csv
Team,Owner,Player Name,NHL Team,Position,2025 Salary,2026 Salary,2027 Salary,Is Rookie
Thunder,John Smith,Connor McDavid,Edmonton Oilers,C,8500000,8500000,8500000,False
```

**Note**: Column names are case-insensitive and flexible. The parser will recognize variations like:
- "Team" or "team"
- "Player Name", "player name", "Player", or "player"
- "NHL Team", "nhl team", "NHL", or "nhl"
- Year columns can be just the year number (e.g., "2025") or "2025 Salary"

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Replacing Sample Data

You have two options for using your own data:

### Option 1: Google Sheets Integration (Recommended)

For automatic updates when you edit your spreadsheet:

1. **Make your Google Sheet public:**
   - Open your Google Sheet
   - Click "Share" → "Change to anyone with the link"
   - Set permission to "Viewer"
   - Copy the sharing link

2. **Configure environment variables:**
   - Create a `.env.local` file in the project root
   - Add your Google Sheet URL:
     ```
     GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
     GOOGLE_SHEET_NAMES=Raphael,Rudy,Allaire,JS Sirois,Verret,Jeff,Doc !,Bureau,Guilou,Ludo,Frank Tremblay,Tomy Marchand,Dufour,Desbiens,P-O
     ```
   - Replace `YOUR_SPREADSHEET_ID` with the ID from your sheet URL
   - Replace the sheet names with the actual tab names from your spreadsheet (comma-separated)
   - **Note**: If `GOOGLE_SHEET_NAMES` is not specified, the system will try to fetch sheets 2-21 by default

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

The site will automatically fetch data from your Google Sheet and update when you make changes.

### Option 2: CSV File (Manual Entry - Recommended)

To use a CSV file for manual data entry:

1. Create or edit a CSV file named `pool-data.csv` in the `/data` directory
2. Ensure the CSV follows the format requirements below
3. Save the file
4. Restart the development server or refresh the browser

The data will be automatically processed and cached in `/public/data/pool-data.json`.

**Quick Start:**
- Copy `sample-pool-data.csv` to `pool-data.csv` as a template
- Edit `pool-data.csv` with your data
- Save and refresh the browser

## Deploying to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import your project in [Vercel](https://vercel.com)

3. Vercel will automatically detect Next.js and configure the build settings

4. Make sure your CSV file is included in the repository (in the `/data` directory)

5. Deploy!

The site will automatically rebuild when you push changes to your repository.

## Data Workflow

### With Google Sheets (Automatic Updates)

1. **Update Spreadsheet**: Make changes directly in your Google Sheet
2. **Automatic Sync**: The site will automatically fetch the latest data (cached for 1 hour)
3. **No Manual Steps**: Changes appear on the site within an hour, or you can trigger a rebuild

### With CSV Files (Manual Updates)

1. **Update Spreadsheet**: Make changes to your spreadsheet
2. **Export CSV**: Export the updated spreadsheet as CSV
3. **Replace File**: Place the new CSV in the `/data` directory
4. **Deploy/Refresh**: The site will automatically process the new data on the next build or API call

## Project Structure

```
PoolSite/
├── app/                    # Next.js App Router pages
│   ├── api/data/          # API route for processing CSV
│   ├── team/[slug]/       # Dynamic team pages
│   ├── league/            # League view page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/                # Reusable UI components
│   └── ...                # Feature components
├── lib/                   # Utility functions and types
│   ├── types.ts           # TypeScript type definitions
│   ├── data-processor.ts  # CSV parsing logic
│   └── utils.ts           # Helper functions
├── data/                  # CSV data files
└── public/data/           # Processed JSON cache
```

## License

MIT

