# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Cache is a single-file personal wealth ledger (`cache.html`). It tracks net worth across asset and liability categories with AES-256-GCM encryption and local-only data storage. No build system — open the file directly in a browser.

## Running

```bash
# Open in browser (no build step needed)
xdg-open cache.html
# or just double-click the file
```

There are no tests, no linter, no npm, no build pipeline.

## Architecture

Everything lives in `cache.html` (~2000 lines). The file is organized into roughly these sections:

| Lines | Purpose |
|-------|---------|
| 1–329 | CSS — dark theme, grid layout, animations |
| 330–703 | HTML — all UI markup |
| 720–1014 | Encryption/lock — AES-256-GCM, PBKDF2, session management |
| 1034–1077 | Category config — metadata and account type options per category |
| 1102–1164 | BTC price fetching — CoinGecko / Coinbase APIs |
| 1166–1400+ | Row CRUD and DOM rendering |
| 1700–1900+ | Calculations (`recalc`, interest) and Chart.js integration |
| 1929–1976 | Save / load / export / import |

### Data model

In-memory global `data` object keyed by category:

```javascript
data = {
  "real-estate": [], "stocks": [], "bitcoin": [], "business": [],
  "retirement": [], "cash": [], "other-asset": [],         // assets
  "mortgage": [], "auto-loan": [], "credit": [], "student": [],
  "btc-loan": [], "other-liab": []                         // liabilities
}
```

Each entry (row) has: `id`, `name`, `value`, `accountType`, `institution`, `loginUrl`, `address`, `interestRate`, `originationDate`, `collateralSats`.

Bitcoin values are stored as **satoshis** (`collateralSats`, `value` for bitcoin entries). `satsToUSD(sats)` converts using the live BTC price.

### Persistence and encryption

- `cache-v1-enc` (localStorage) — AES-256-GCM ciphertext of JSON
- `cache-v1-meta` (localStorage) — PBKDF2 salt (not secret)
- Legacy `life-sheet-v1-*` localStorage keys are auto-migrated to `cache-v1-*` on first load
- Password is never stored; `sessionKey` holds the derived CryptoKey in memory only
- 15-minute idle auto-lock clears `sessionKey` and wipes data from memory

### Edit → save flow

1. Field change → `updateField(cat, id, field, val)` updates `data[cat]`
2. `recalc()` recomputes all totals and redraws the UI
3. `markChanged()` shows the unsaved-changes dot
4. "Save" button → encrypts and writes to localStorage

### External requests

Only one: BTC/USD price from CoinGecko (fallback: Coinbase). All financial data stays on-device.
