# CryptoFlow — Definitive Upgrade Roadmap

> Lead architect's synthesis of 5 codebase audits + 5 research reports into one opinionated plan. The goal is not "more features" — it is to make this the project a recruiter opens, watches work for 30 seconds, and screenshots.

---

## 1. Verdict

CryptoFlow is genuinely above the bootcamp median: it has a non-trivial domain (leveraged-futures simulation with real PnL/liquidation math), a browser-direct Binance WebSocket feed, a live candlestick chart, a real order book, and skeleton loaders — the skeleton of a real exchange is here. But it currently reads, unmistakably, as a class project: a "gamer RGB" neon-green-on-pure-black look with three conflicting CSS variable files and four different greens, a Trade page with zero responsive handling and zero motion, and a backend that would not survive a serious code review. The two issues that are outright **disqualifying for a "trading platform" on a CV** are financial-correctness bugs: every money endpoint trusts a client-supplied `price` (infinite-money exploit) and mutates wallet balances with non-atomic read-modify-write (double-spend under concurrency). On top of that sit committed live API secrets, `DEBUG=True` defaults, an insecure `SECRET_KEY` fallback, and SQLite on Heroku's ephemeral disk that silently wipes all data on restart. The gap to "impressive" is real but eminently closable — the raw material is strong, and almost every fix below doubles as a great interview story.

---

## 2. The Vision

**CryptoFlow should become a server-authoritative, real-time leveraged-futures *simulator* that looks and behaves like Hyperliquid/Bybit** — a restrained dark trading terminal where prices stream live and flash on tick, the order book renders as a depth-shaded ladder, positions and PnL are pushed from the server (not polled), a background engine actually enforces liquidations, and every balance mutation is concurrency-safe and price-authoritative. The narrative pivots away from "crypto" toward the genuinely hard engineering it forced: real-time WebSocket fan-in, server-settled financial math, and DB-level concurrency control. It stays a **Vite SPA + Django REST monolith** — no Next.js, no microservices — because that is the correct, defensible scope, and "considered and rejected for scope" reads as senior judgment.

### Target stack

**Frontend**
- **Vite 7 + React 19 SPA** — keep it; auth-gated realtime app with zero SEO surface is exactly Vite's sweet spot. Do *not* migrate to Next.js.
- **TypeScript (incremental)** — highest recruiter-signal-per-hour; type the money paths and WS payloads first. `@types/react` already installed.
- **Tailwind CSS v4 + shadcn/ui (Radix)** — one OKLCH token system; deletes 3 conflicting CSS files and both modal systems.
- **TanStack Query** — kills axios/fetch/`setInterval` sprawl; wire WS ticks via `setQueryData`.
- **Zustand** — the *small* amount of true client state only (selected symbol, leverage, theme, modals).
- **lightweight-charts v5** — keep it; it's literally what Binance/Coinbase use. Add **Recharts** only for portfolio/PnL analytics.
- **react-hook-form + zod** — shared schemas validate forms *and* API responses at runtime.
- **Motion (`motion/react`)** + **@number-flow/react** — price-flash and animated number transitions. The single biggest "wow" lever.
- **sonner** + **lucide-react** + **TanStack Table** — toasts, icons, sortable/virtualized grids.

**Backend**
- **Django 5 + DRF** with **ModelSerializers + ViewSets** replacing every hand-built dict.
- **A service layer** (`futures/services.py`, `markets/services.py`) — business rules out of views, finally testable.
- **`transaction.atomic()` + `select_for_update()` + DB CHECK constraints** — the headline backend fix.
- **drf-spectacular** — live Swagger UI at `/api/docs/`; instant credibility.
- **DRF throttling** (Anon + Scoped) backed by Redis.

**Realtime**
- **Browser → Binance WS** stays in the client for marks/orderbook/klines (smart, keep it).
- **Django Channels 4 (ASGI/Daphne) + channels-redis** pushes *user state* (wallet, positions, PnL deltas, fills) per-user. Hybrid push, bounded scope.

**Infra**
- **Managed Postgres (Neon)** via `dj-database-url` — fixes the catastrophic data-loss-on-restart and makes row locks real.
- **Redis (one instance)** — channel layer + shared cache + throttle counters + Celery broker. Four upgrades, one dependency.
- **Celery + django-celery-beat** — the liquidation/order engine.
- **Render** (web ASGI + Celery worker + beat via `render.yaml`) — modern, runs the 3 processes a realtime app needs; better-looking than Heroku for 2026.
- **GitHub Actions CI + Sentry + django-environ** — proof artifacts and production hygiene.

---

## 3. Visual Redesign Direction

**Aesthetic:** a restrained, dense **"trading-terminal"** dark UI (Hyperliquid / Bybit lineage) — flat, high-contrast, gradient-free in data regions, ONE vivid accent. Reserve subtle glass + a bento grid for the homepage/portfolio overview *only*; keep the live Trade screen flat where clarity wins. Kill every `0 0 15px` solid neon glow — use glow sparingly, only on the primary CTA and focus ring.

### Color system (one token file, replace all three `:root` blocks)

Depth is signaled by **lighter surfaces + 1px hairline borders**, never by `#000` or heavy shadows.

```
/* Neutrals — near-black, never pure black */
--bg:         #0A0B0D   /* app background */
--surface-1:  #111317   /* cards, panels */
--surface-2:  #181B20   /* elevated / hover */
--surface-3:  #1F232A   /* popovers, modals */
--border:     #24272E
--hairline:   rgba(255,255,255,0.06)

/* Text */
--text:       #E6E8EB
--muted:      #8B919A
--faint:      #5B616B

/* Semantic — ONLY for price/PnL/sides, never decorative */
--up:         #2EBD85   --up-bg:   rgba(46,189,133,0.12)
--down:       #F6465D   --down-bg: rgba(246,70,93,0.12)

/* ONE accent — primary actions & active states only */
--accent:     #16E1A3   /* electric mint; violet #7C5CFF as alt */
```

Replace the four greens (`#00ff94`, `#00ff9c`, `#00ff8c`, `#00ff99`) and the dozen ad-hoc near-blacks with the above. Retheme `lightweight-charts` `layout.background` to `--surface-1` so the chart stops floating as a darker rectangle. **Accessibility rule (non-negotiable):** never rely on color alone — pair every up/down value with an arrow glyph + sign, and use the real minus sign U+2212. Add a global `:focus-visible` ring on `--accent`.

### Typography

- **UI:** Inter (or keep Outfit, already loaded — it's clean). Geometric grotesk.
- **Numbers/prices/order book:** **JetBrains Mono** or **Geist Mono** for a Bloomberg-terminal feel.
- **The one-line, highest-ROI win:** `font-variant-numeric: tabular-nums` (`'tnum' 1, 'lnum' 1`) on *every* numeric display so digits stop jumping on live ticks. Always render trailing zeros (`54.00`, not `54`) and format via `Intl.NumberFormat`.
- One real type scale; stop the per-page 3.8/2.7/2.1rem improvisation.

### Spacing / density

- Trading tables on a ~24px row rhythm, all numeric columns **right-aligned**.
- One layout token for navbar clearance (currently hand-tuned 110/120/140px per page — pick one).
- Cards: `--surface-1/2` + 1px hairline + 12–14px radius, **no heavy shadow**.

### Motion philosophy

Fast and functional, **120–220ms** — communicate live state, never distract. Price-tick flash (green/red background pulse → fade) and animated number rolls via `@number-flow/react` on live price, PnL, and balance. A pulsing "live" dot on the WS connection (and a "reconnecting" badge so the UI never silently lies). Wrap all of it in `prefers-reduced-motion` guards. **This single change is the biggest wow-per-hour lever in the whole project.**

### Key component patterns

- **Trade screen → canonical 3-column canvas** via CSS grid-template-areas: watchlist left, chart + order book center, order-entry + positions/wallet right. Breakpoints: 3-col desktop → 2-col tablet → single-column mobile with a bottom tab bar (Chart / Book / Trade). Use container queries so panels reflow by available width. (Today `trade.css` has *zero* `@media` queries — it overflows on tablet.)
- **Order book → depth-shaded ladder:** translucent cumulative-size bars behind each row (width = running total / max), a centered prominent spread/mark-price row between asks and bids, right-aligned `Intl.NumberFormat` sizes, color only the price column, stable price-level keys (not array index). This converts a debug table into something recognizably exchange-grade.
- **Market table:** zebra-free, hairline separators, sticky header, hover-row highlight, tabular numbers, optional live `!miniTicker@arr` stream so prices animate instead of being a static snapshot. Build on TanStack Table.
- **Cards / KPI tiles:** bento grid + *subtle* glass on homepage/portfolio (portfolio value, 24h PnL, top movers) — and nowhere near the dense Trade screen.
- **Modals:** one Radix/shadcn Dialog replaces both SweetAlert *and* the hand-rolled `.modal` divs for deposit/withdraw/sell/convert.
- **Loader:** retheme the off-brand sky-blue (`#0ea5e9`) spinner to `--accent`. Replace the `vite.svg` favicon with a CryptoFlow mark + real `<title>`/OG image.

---

## 4. Critical Fixes (Do First)

These are the bugs that make a hiring manager close the tab. None are optional.

1. **Compute all trade prices server-side — never trust client `price`.** `buy`/`sell`/`convert`/`open_position`/`close_position` all read `request.data['price']`; a user buys at `0.00001` and sells at `9999999` to mint unlimited balance. Fetch the authoritative price server-side (Binance fapi / CoinGecko, with a staleness/slippage band) and ignore any client-supplied price. **Single highest-impact fix.**
2. **Make every wallet mutation atomic + row-locked.** Wrap each money op in `transaction.atomic()` and re-read with `FuturesWallet.objects.select_for_update().get(...)` (and the `SpotAsset`) inside the block. `@atomic` alone is insufficient under READ COMMITTED. Add DB `CheckConstraint(balance >= 0)` as a second line of defense. *Note: this only does anything on Postgres — SQLite takes a whole-DB lock and `select_for_update` is a no-op.*
3. **Clamp settlement + enforce liquidation.** `close_position` credits `margin + pnl` with no `max(0, ...)`, so a wallet can go negative; `liquidation_price` is computed and stored but **nothing ever acts on it**. Clamp the credit and (Phase 2) add the engine that auto-closes crossed positions.
4. **Purge committed secrets and rotate every key.** `backend/.env` (live Cloudinary, Binance, CoinGecko keys) and `db.sqlite3` are tracked with **no `.gitignore`**. Add `.gitignore`, `git rm --cached`, scrub history with `git-filter-repo`/BFG, then **rotate all four credentials** (they're permanently in history) and move config to env.
5. **Migrate SQLite → managed Postgres (Neon).** Heroku's ephemeral filesystem wipes the committed DB on every restart — demo accounts and positions silently vanish. `dj-database-url` + `DATABASE_URL`; `psycopg2` is already installed. Prerequisite for fix #2 to mean anything.
6. **Fail-closed settings.** `DEBUG` default → `False`; `SECRET_KEY` required from env (raise `ImproperlyConfigured` if missing, drop the committed `django-insecure-...` fallback); add `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER`. Run `manage.py check --deploy` in CI.
7. **Enforce password strength + add auth throttling.** `SignupSerializer` bypasses `AUTH_PASSWORD_VALIDATORS` (and `change_password` only checks `len < 6`) — call `validate_password()`. Add DRF throttling (Anon/User + a Scoped throttle on login/signup and the CoinGecko-proxy market endpoints, which are currently open and unthrottled).
8. **Move JWT off `localStorage`.** It's XSS-exfiltratable, amplified by a 7-day refresh token. Move to `Secure`/`httpOnly`/`SameSite` cookies (dj-rest-auth or a small custom view) and add a CSP. *(Can land early Phase 2 if it slows you down now.)*
9. **Add a timeout to the in-request Binance call** in `close_position` (currently no timeout + bare `except`) so a hanging upstream can't starve a gunicorn worker.

---

## 5. Phased Roadmap

### Phase 0 — Foundation (do before any feature work)
- Purge secrets, add `.gitignore`, scrub history, rotate keys. **[H · S]** — `git-filter-repo`, `django-environ`
- Postgres on Neon via `dj-database-url`; stop committing `db.sqlite3`. **[H · M]** — `dj-database-url`, `psycopg2`
- Fail-closed settings (`DEBUG`, `SECRET_KEY`, secure cookies, HSTS) + `check --deploy`. **[H · S]** — `django-environ`
- **Atomic + locked wallet mutations** with `transaction.atomic` + `select_for_update` + CHECK constraints. **[H · M]**
- **Server-side price authority** across all trade endpoints. **[H · M]**
- Clamp settlement so wallets can't go negative. **[H · S]**
- Password validators + DRF throttling (Anon/Scoped, Redis-backed). **[H · S]** — DRF throttling
- Install Tailwind v4 + shadcn/ui; collapse 3 CSS files + `App.css` into one OKLCH/CSS-variable token system. **[H · L]** — `tailwindcss@4`, `shadcn/ui`, `cva`, `tailwind-merge`
- Stand up TypeScript incrementally (`allowJs`, `tsc --noEmit` in CI, `moduleResolution: bundler`); type `api.js` + WS payloads first. **[H · L]** — TypeScript, zod
- Tooling: ruff (backend), Prettier + `eslint-plugin-jsx-a11y` (frontend), pre-commit/husky + lint-staged. **[M · M]**

### Phase 1 — Visual redesign of core screens
- Reskin to the exchange palette; delete the four greens + neon glows; retheme `lightweight-charts` background. **[H · M]**
- `tabular-nums` everywhere + mono numeric font + `Intl.NumberFormat` + U+2212. **[H · S]**
- Rebuild Trade as a responsive 3-column CSS grid (desktop → tablet → mobile bottom-tab). **[H · L]** — Tailwind container queries
- Rebuild the order book as a depth-shaded ladder with centered spread row. **[H · M]**
- Add live motion: price-tick flash + animated numbers + pulsing live dot. **[H · M]** — `motion/react`, `@number-flow/react`
- One Radix/shadcn Dialog for all modals; replace SweetAlert + hand-rolled `.modal`. **[M · L]** — `@radix-ui/react-dialog`
- Accessibility pass: `<button>` rows, `:focus-visible` ring, `aria-live` price ticker, keyboard nav, `prefers-reduced-motion`. **[M · L]**
- Unify loaders/skeletons/empty states; retheme spinner; replace toasts. **[M · M]** — `sonner`, `react-loading-skeleton`, `lucide-react`
- Branding: custom favicon, `<title>`, OG image, navbar wordmark. **[M · S]**

### Phase 2 — Realtime + backend architecture
- DRF ModelSerializers + ViewSets + a service layer; consistent error envelope + custom exception handler. **[H · L]** — `rest_framework.serializers`, `viewsets`
- Consolidate to ONE wallet domain; delete dead `wallet`/`trading`/`users` apps and `views_profile.py`; collapse the 3 racing `post_save` signal handlers into one idempotent `get_or_create` (fixes non-deterministic starting balance). **[H · M]**
- Redis as the keystone: shared cache (replace per-worker `LocMemCache`), throttle backend, channel layer, Celery broker. **[H · S]** — `django-redis`, `channels-redis`
- **Django Channels** push for wallet/positions/PnL/fills; delete the 1.5s `setInterval`. Keep browser→Binance WS for market data. **[H · L]** — `channels`, `daphne`
- TanStack Query on the client; WS ticks via `setQueryData` (not `invalidateQueries`); `refetchIntervalInBackground: false`. **[H · M]** — `@tanstack/react-query`
- Resilient Binance socket: reconnect + backoff + heartbeat + visibility-aware resume + staleness watchdog, in a `useBinanceStream` hook; subscribe `@kline_<interval>` for live candles. **[H · M]** — `partysocket`
- Fix chart lifecycle: create once, `setData` on interval change, `ResizeObserver`, AbortController stale-symbol guard, lightweight-charts v5. **[M · M]**
- Decouple high-freq ticks from React with Zustand + RAF batching; memoize `PriceTicker`/`OrderBook`/`PositionsList`. **[H · M]** — `zustand`
- drf-spectacular Swagger UI at `/api/docs/` + pagination + django-filter. **[H · M]** — `drf-spectacular`, `django-filter`
- Move JWT to `httpOnly` cookies + CSP. **[M · L]** — `dj-rest-auth`, `django-csp`

### Phase 3 — Killer features (pick from §7)
- Celery + celery-beat **liquidation engine**: periodic mark fetch → auto-close crossed positions under atomic+locked writes → `group_send` over Channels. **[H · L]** — `celery`, `django-celery-beat`
- **Conditional-order engine** (TP/SL, limit, stop, OCO) on the same worker + state machine. **[H · L]**
- **Portfolio analytics + equity curve** (Sharpe, max drawdown, win-rate, profit factor, expectancy) + trade journal. **[H · M]** — Recharts, pandas/NumPy
- Server-side **price alerts + watchlist** reusing the trigger worker + push channel. **[M · M]**
- (Stretch) **Grounded AI copilot**: RAG over crypto-news RSS + tool-use on the user's live positions, streamed. **[H · M]** — Anthropic Messages API, pgvector

### Phase 4 — Presentation / CV polish
- **Bulletproof demo:** Postgres + auto-seeded `demo@cryptoflow` guest account (funded wallet + open positions) + "Try the demo, no signup" button + UptimeRobot keep-warm ping. **[H · M]**
- **Rewrite README** as a recruiter funnel: one-line pitch ("real-time leveraged-futures *simulator*, paper money"), hero GIF of the Trade page, live-demo link + creds, badges, Mermaid architecture diagram, Quick Start, env table, simulated-trading disclaimer, MIT license. Rename `readMe.md` → `README.md`. **[H · M]**
- **`DECISIONS.md` case study:** why browser-direct WS but server-authoritative balances; why the poll→push migration; and the money shot — *"I found a read-modify-write race that allowed double-spend; here's the repro and the `select_for_update` fix."* **[H · M]**
- **Tests:** pytest-django + factory_boy on PnL/liquidation math + a `test_concurrent_close_does_not_double_spend` concurrency test + a test asserting client prices are ignored; Vitest + RTL + MSW on the trade panel/order book. **[H · L]**
- **GitHub Actions CI:** lint → backend pytest (Postgres service) → frontend vitest + build → coverage upload → `check --deploy`. Badges in README. **[H · M]**
- Sentry on Django + React; `/api/health/` endpoint. **[M · S]**
- Containerize (Dockerfile + `docker-compose` web/db/redis) + Makefile for one-command local dev. **[M · M]**
- Conventional Commits going forward; custom domain (`cryptoflow.app`) on the demo. **[L · S]**

---

## 6. Top 5 Highest-Leverage Moves (ranked)

1. **Live motion on the data — price-flash + animated numbers + tabular-nums + retheme to the exchange palette.** This is the biggest perceived-quality jump per hour. A "live" app that updates statically feels dead; a flashing, rolling, tabular-aligned terminal feels real instantly. ~2–3 days transforms the first impression. *(`motion/react`, `@number-flow/react`, CSS tokens.)*
2. **Fix the financial-correctness bugs AND write them up.** Server-side price authority + `transaction.atomic`/`select_for_update` + clamp settlement. This closes the infinite-money and double-spend holes *and* gives you the single best interview story in the whole project — finding and fixing a concurrency bug in your own financial code. Undocumented; it's luck. In `DECISIONS.md`; it's seniority.
3. **One design-token system + responsive 3-column Trade grid.** Delete the three conflicting `:root` files and the per-page CSS chaos, then make the centerpiece screen actually work on tablet/mobile. Fixes the most visible "bootcamp" tells in one sweep.
4. **Bulletproof demo + recruiter-funnel README (with hero GIF + architecture diagram + DECISIONS.md).** 84% of employers want a working demo; the README is the 30-second funnel. A seeded guest account on durable Postgres + a GIF that shows a leveraged position opening and PnL flashing is what converts "skim" into "interview."
5. **Replace 1.5s polling with Django Channels push (keep browser→Binance WS).** The single most legible *architecture* upgrade — "WebSockets/Channels over polling" reads as direct system-design maturity, and the story is clean because only the server side is missing. Pairs perfectly with the liquidation engine as one "real-time systems" narrative.

---

## 7. Killer Feature Picks

Build 3, maybe 4 — **depth over breadth**. Each must be written up in `DECISIONS.md` to count.

1. **Server-side liquidation engine (Celery beat + Channels).** Turns a stored-but-ignored `liquidation_price` field into a real feature: a periodic task fetches marks, finds crossed positions, auto-closes them under atomic+locked writes, and pushes the result over Channels. Signals: background-task architecture, distributed state, financial correctness, and a server-*authoritative* risk engine rather than client-only PnL math. The strongest "systems" story in the project, and it directly completes the futures-sim premise.

2. **Conditional-order engine: TP/SL + limit/stop + OCO.** Orders rest untriggered; a worker compares live mark to trigger prices and transitions through a `untriggered → triggered → filled` state machine; OCO links a TP and SL so one cancels the other. This is what makes it read like a *real exchange*. Signals: async processing, state machines, idempotency, and DB concurrency control — and it reuses the same `select_for_update` pattern that fixes the wallet race. Build it right after #1; they share the worker.

3. **Portfolio analytics + equity curve + trade journal.** Highest wow-per-effort *visual*: a small closed-trades table feeds an institutional-looking dashboard — equity curve, max drawdown (running peak), Sharpe, win-rate, profit factor, expectancy, average winner/loser. Every serious journaling product converges on exactly this metric set, so it signals real domain literacy, and Recharts makes it look polished fast. The journal (filters, tags, per-trade MFE/MAE) provides the data and the "full user lifecycle" product story.

4. *(Stretch, only if the above are solid)* **Grounded AI market-insight copilot (Claude API).** The biggest 2026 recruiter "wow" — but only the grounded version counts: RAG over real crypto-news RSS + tool-use/function-calling to read the user's live positions and PnL, then *stream* an "explain my risk and what today's news means for my exposure" narrative. Signals: retrieval, agentic tool-use, streaming UX, and prompt/cost discipline. A shallow "ask ChatGPT" wrapper reads as a gimmick — do the tool-use version or skip it. Label it clearly as informational, not financial advice.

---

*Bottom line: the domain is strong and the realtime instinct (browser-direct Binance WS) is genuinely smart. Spend Phase 0 making it correct and safe, Phase 1 making it look like a product, Phase 2 making it architecturally legible, and Phases 3–4 giving recruiters something to watch and read. The same work that makes it impressive also makes it true.*