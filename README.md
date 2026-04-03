# Cache

Personal wealth ledger. Track net worth across asset and liability categories with AES-256-GCM encryption and local-only data storage.

Single HTML file. No build system, no dependencies, no server. Open it in a browser.

## Features

- 13 asset & liability categories: real estate, stocks, Bitcoin, retirement, cash, mortgages, auto loans, credit, student loans, BTC-backed loans, and more
- AES-256-GCM encryption with PBKDF2-derived keys; data encrypted at rest in localStorage
- Auto-lock: 15-minute idle timeout clears the session key and wipes data from memory
- Live BTC price from CoinGecko (fallback: Coinbase); Bitcoin values stored in satoshis
- BTC-backed loan tracking with LTV alerts, collateral aggregation, and auto-calculated outstanding balances
- Real estate valuations via RentCast AVM integration
- Multi-currency support: USD, EUR, GBP, CAD, AUD, CHF, JPY with live exchange rates
- Net worth chart via Chart.js (assets vs. liabilities)
- Bookmarklet to auto-scrape account balances from financial institution websites
- PWA install for standalone app experience on desktop and mobile
- Dark and light themes
- Mobile-friendly responsive layout
- Guided onboarding tour for first-time users
- JSON export and import for backup and restore

## Getting started

```bash
# Clone and open
git clone https://github.com/peerloomllc/cache.git
cd cache
xdg-open cache.html    # Linux
open cache.html         # macOS
start cache.html        # Windows
```

Or just double-click `cache.html`. No install required.

On first launch, set a password. This derives your encryption key. You can change your password later in Settings, but there is no reset or recovery if you forget it.

## How it works

All data stays on your device. The only network requests are:

| Request | Purpose |
|---------|---------|
| CoinGecko / Coinbase API | BTC/USD price |
| frankfurter.app | Currency exchange rates |
| RentCast API | Property valuations (requires your own API key) |

### Data storage

- `cache-v1-enc` in localStorage: AES-256-GCM ciphertext of your data
- `cache-v1-meta` in localStorage: PBKDF2 salt (not secret)

The password is never stored. The derived `CryptoKey` is held in memory only and cleared on lock or idle timeout.

### Architecture

Everything lives in one file (`cache.html`, ~3000 lines):

| Section | Purpose |
|---------|---------|
| CSS | Dark/light themes, grid layout, animations |
| HTML | All UI markup |
| JS: Encryption | AES-256-GCM, PBKDF2, session management |
| JS: Categories | Metadata and account type options per category |
| JS: BTC price | CoinGecko / Coinbase API calls |
| JS: Row CRUD | Entry management and DOM rendering |
| JS: Calculations | Totals, interest, Chart.js integration |
| JS: Persistence | Save, load, export, import |

## Security model

- AES-256-GCM with PBKDF2-derived keys (310,000 iterations, SHA-256)
- No plaintext ever hits disk; data is encrypted before writing to localStorage
- 15-minute idle auto-lock destroys the in-memory key
- No server, no cookies, no analytics, no telemetry

## License

Copyright PeerLoom LLC. All rights reserved.
