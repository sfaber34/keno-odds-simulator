# Keno Odds Simulator

A web-based tool for analyzing keno payout tables using hypergeometric probability calculations. Built to help evaluate house edge and expected value across different payout configurations.

## Features

- **Hypergeometric probability analysis** — Calculates exact odds for each pick/hit combination
- **Multiple payout tables** — Load and compare different `.csv` payout configurations
- **House edge visualization** — Color-coded cards show profitable (green) vs unprofitable (red) pick levels
- **Detailed breakdowns** — View probability, odds, payout, and EV contribution for every outcome
- **Summary & detailed views** — Quick overview or deep-dive into specific pick levels

## Quick Start

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Payout File Format

Place `.csv` files in the `/payouts` directory. Format:

```csv
,0,1,2,3,4,5,6,7,8,9,10
1,,3.8,,,,,,,,,
2,,,15,,,,,,,,
3,,,2,65,,,,,,,
...
```

- **Row 1**: Header with hit counts (0-10)
- **Column 1**: Number of picks (1-10)
- **Values**: Payout multipliers (e.g., `3.8` = 3.8x bet returned)
- **Empty cells**: No payout for that combination

The dropdown automatically detects all `.csv` files in `/payouts`.

## How It Works

Keno odds are calculated using the **hypergeometric distribution**:

```
P(k hits | n picks) = C(20,k) × C(60,n-k) / C(80,n)
```

Where:
- **80** = Total numbers in pool
- **20** = Numbers drawn by house
- **60** = Numbers not drawn
- **n** = Numbers picked by player
- **k** = Number of hits (matches)

## Metrics Explained

| Metric | Description |
|--------|-------------|
| **House Edge** | Percentage the house keeps on average. Positive = house profit, negative = player profit |
| **RTP** | Return to Player — percentage returned to players over time (100% - House Edge) |
| **EV** | Expected Value — average return per $1 wagered |
| **Win Odds** | Combined probability of any payout occurring |

## CLI Mode

For terminal output instead of web UI:

```bash
npm run cli
```

## Project Structure

```
├── server.js              # Express-like HTTP server with payout API
├── index.js               # CLI version with console output
├── public/
│   └── index.html         # Single-page web application
├── payouts/
│   └── payouts_original.csv   # Default payout table
└── package.json
```

## License

MIT
