<div align="center">

# ⚡ CryptoFlow

### A real-time, server-authoritative crypto **futures & spot trading simulator**

Live Binance order books, a streaming trades tape and candlesticks · leverage up to 125× · paper money · zero risk.

[**Live demo**](https://cryptofloww.netlify.app) · `demo / demodemo123`  ·  [Engineering decisions →](./docs/DECISIONS.md)

![React](https://img.shields.io/badge/React_19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-38BDF8?logo=tailwindcss&logoColor=white)
![Django](https://img.shields.io/badge/Django_5-092E20?logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-A30000?logo=django&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

</div>

> _Replace this line with a hero GIF of the Trade terminal — a leveraged position opening and the PnL flashing live._

---

## What it is

CryptoFlow is a full-stack trading terminal that streams **live market data** straight from Binance and lets you trade **perpetual futures** and **spot** with simulated money. The frontend feels like a real exchange (Hyperliquid/Bybit lineage); the backend is a **server-authoritative engine** where every price is settled server-side and every balance mutation is concurrency-safe.

It started as a coding-bootcamp project and was rebuilt into a production-grade portfolio piece. The interesting engineering isn't "crypto" — it's **real-time WebSocket fan-in, server-settled financial math, and DB-level concurrency control**.

## Highlights

- 📈 **Live trading terminal** — TradingView `lightweight-charts` candles, a depth-shaded order-book ladder, a **live trades tape** (Book / Trades tabs), and a mark price that **flashes and rolls on every tick** (`@number-flow/react`).
- 🔌 **Direct Binance WebSocket feeds** — mark price (`@ticker`), depth-20 (`@depth20@100ms`), live klines and the trades tape (`@aggTrade`) over a single multiplexed socket, with auto-reconnect, backoff, and a staleness watchdog so the UI never silently lies.
- ⚙️ **Server-authoritative engine** — leverage 1–125×, long/short, PnL & liquidation math computed **server-side**; client-supplied prices are ignored by design.
- 🔒 **Concurrency-safe money** — every wallet mutation (open/close, buy/sell/convert, spot↔futures transfer) runs in `transaction.atomic()` + `select_for_update()` with DB `CHECK (balance >= 0)` constraints, so balances can't be double-spent or driven negative.
- 💼 **Spot + portfolio** — buy / sell / **convert into any listed coin**, move cash **between your spot and futures wallets**, and watch a **live-valued** portfolio with an allocation donut. Holdings are priced off the same live stream, not a stale snapshot.
- 🪙 **Coin logos everywhere** — one `CoinIcon` resolves a logo from just a ticker (CoinGecko → CDN → CDN → tinted initials), so a broken image never shows.
- 🎨 **One design system** — Tailwind v4 token system, a Radix/shadcn-style UI kit, tabular-figure pricing, OS reduced-motion support, and a layout responsive down to mobile.

## Why Binance **spot** streams (not USDⓈ-M futures)?

Binance's futures streaming host (`fstream.binance.com`) is **geo-restricted in many regions** — the socket opens but no data is ever pushed, which silently freezes a live UI. The spot streaming host (`stream.binance.com`) is broadly reachable. A perpetual's **mark price tracks the spot index** anyway, so CryptoFlow streams Binance **spot** in the browser *and* settles futures positions against the **same** Binance spot price server-side — which means live unrealized PnL and realized PnL on close always agree.

## Tech stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · Radix UI · TanStack Query · Zustand · `motion` + `@number-flow/react` · lightweight-charts · Recharts · partysocket (reconnecting WS) · react-hook-form + Zod · sonner |
| **Backend** | Django 5 · Django REST Framework · SimpleJWT · `transaction.atomic` + `select_for_update` · drf-spectacular (OpenAPI) · DRF throttling |
| **Data** | Binance **Spot** (WebSocket + REST) · CoinGecko |
| **Infra** | PostgreSQL · WhiteNoise · gunicorn · `dj-database-url` · Cloudinary (profile pictures) |

## Architecture

```mermaid
flowchart LR
    subgraph Browser["React SPA · Vite + TypeScript"]
        UI["Trade terminal"]
        Q["TanStack Query + Zustand"]
    end
    UI -- "live mark / depth / klines / trades (WebSocket)" --> BWS[("Binance Spot WS")]
    Q -- "REST + JWT" --> API["Django REST API"]
    API -- "authoritative price = spot index (server-side)" --> BR[("Binance Spot REST")]
    API -- "spot prices / listings" --> CG[("CoinGecko")]
    API --> DB[("PostgreSQL")]
```

Market data streams **browser → Binance** directly (low latency, no backend fan-out cost). Anything that touches **money** — opening/closing positions, wallet balances, transfers, settlement — goes through the Django API, which fetches its **own** authoritative price (the Binance spot index, briefly cached) and writes under a row lock.

## API surface

JWT-authenticated REST under `/api`. Interactive Swagger UI at **`/api/docs/`** (schema at `/api/schema/`).

| Area | Routes |
|---|---|
| **Auth** (`/api/accounts/`) | `token/`, `token/refresh/`, `signup/`, `login/`, `logout/`, `me/`, `profile/update/`, `change-password/`, `upload-picture/` |
| **Futures** (`/api/futures/`) | `open/`, `close/<id>/`, `positions/`, `wallet/`, `transfer/` (spot↔futures) |
| **Spot** (`/api/markets/`) | `wallet/`, `wallet/deposit/`, `wallet/withdraw/`, `wallet/buy/`, `wallet/sell/`, `wallet/convert/`, `convert-preview/`, `top100/`, `top8/`, `<coin_id>/` |

## Quick start

**Prerequisites:** Python 3.12+, Node 20+.

```bash
# 1. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r ../requirements.txt
cp .env.example .env        # then fill in the values
python manage.py migrate
python manage.py seed_demo  # creates the demo account + sample positions
python manage.py runserver

# 2. Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_BASE=http://127.0.0.1:8000/api
npm run dev                 # http://localhost:5173
```

Open <http://localhost:5173> and click **“Try the live demo”** (`demo / demodemo123`), or sign up for a fresh $10,000 paper account.

## Environment

See [`backend/.env.example`](./backend/.env.example) and [`frontend/.env.example`](./frontend/.env.example). Key variables:

| Variable | Where | Notes |
|---|---|---|
| `DEBUG` | backend | `True` for local dev; defaults to `False` (fail-closed) in prod. |
| `SECRET_KEY` | backend | Required when `DEBUG=False`. |
| `DATABASE_URL` | backend | Postgres in prod (via `dj-database-url`); falls back to local SQLite when unset. |
| `COINGECKO_API_KEY` | backend | Spot prices / market listings. |
| `CLOUDINARY_*` | backend | Optional — profile-picture uploads. |
| `DEPLOYED_FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` | backend | Allowed CORS origins in prod. |
| `VITE_API_BASE` | frontend | Base URL of the API. |

## Tests

```bash
cd backend && pytest        # incl. a concurrency test proving the wallet can't be double-spent,
                            # plus transfer/convert conservation and server-side-price settlement
cd frontend && npm test     # vitest: formatting + component unit tests
```

## Disclaimer

CryptoFlow is a **paper-trading simulator for educational purposes**. No real funds are involved and nothing here is financial advice.

## License

[MIT](./LICENSE) © Pavle Tosic
