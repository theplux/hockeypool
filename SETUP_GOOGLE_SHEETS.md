# Google Sheets Setup Guide

## Quick Setup

1. **Make your Google Sheet public:**
   - Open your Google Sheet
   - Click "Share" → "Change to anyone with the link"
   - Set permission to "Viewer"
   - Copy the sharing link

2. **Create `.env.local` file:**
   ```bash
   GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1jCcFhlAHzTNf8j4zQYzn-MEsW_Sy1PkS/edit
   GOOGLE_SHEET_NAMES=Raphael,Rudy,Allaire,JS Sirois,Verret,Jeff,Doc !,Bureau,Guilou,Ludo,Frank Tremblay,Tomy Marchand,Dufour,Desbiens,P-O
   ```

3. **Find your sheet tab names:**
   - Open your Google Sheet
   - Look at the bottom tabs (Sheet1, Sheet2, etc. or pooler names)
   - Copy the exact names and add them to `GOOGLE_SHEET_NAMES` (comma-separated)
   - If your tabs are numbered (2, 3, 4...), you can omit `GOOGLE_SHEET_NAMES` and the system will try sheets 2-21 automatically

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Expected Data Format

Each sheet (pooler's roster) should have columns like:
- **Player Name** (or "Player", "Name")
- **NHL Team** (or "Team", "NHL")
- **Position** (or "Pos")
- **Year columns** (e.g., "2025", "2026", "2027" or "2025 Salary", "2026 Salary")
- **Is Rookie** (optional)

The parser is flexible and will recognize various column name formats.

## Troubleshooting

- **"Failed to fetch Google Sheet"**: Make sure the sheet is set to "Anyone with the link can view"
- **"No teams found"**: Check that your sheet tab names match what's in `GOOGLE_SHEET_NAMES`
- **Empty rosters**: Verify your sheet has player data and the column names are recognizable



