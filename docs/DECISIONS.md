# Engineering decisions

A short tour of the non-obvious calls behind CryptoFlow — the kind of thing I'd
walk through in a code review. The recurring theme: **anything that touches money
must be authoritative and concurrency-safe on the server.**

---

## 1. The bug that mattered most: client-controlled prices + a double-spend race

The original endpoints settled trades against a price sent **by the client**:

```python
# before — every money endpoint trusted the request body
price = Decimal(request.data["price"])
qty = amount_usd / price
wallet.balance -= amount_usd
wallet.save()
```

Two independent, serious problems:

1. **Infinite-money exploit.** Nothing stopped a client from "buying" at `0.00001`
   and "selling" at `9_999_999`. The price was never verified against reality, so
   balance could be minted out of thin air. This affected `buy`, `sell`, `convert`,
   `open_position` **and** `close_position`.
2. **Double-spend race.** Balance was a read-modify-write (`balance -= x; save()`)
   with no locking. Two concurrent requests both read the old balance and both
   succeed — the classic lost-update race. On a "trading platform," that's
   disqualifying.

**The fix.**

- **Server-side price authority.** A dedicated [`markets/prices.py`](../backend/markets/prices.py)
  fetches the authoritative price (Binance for futures, CoinGecko for spot), caches
  it briefly, and **ignores any client-supplied price.** The client may still send
  one; the server never reads it.
- **Atomic, row-locked settlement.** Every wallet mutation now looks like:

  ```python
  with transaction.atomic():
      wallet = FuturesWallet.objects.select_for_update().get(user=user)
      # ... validate, mutate, save inside the lock
  ```

- **A second line of defence in the schema:** `CheckConstraint(condition=Q(balance__gte=0))`
  on both wallets, so even a logic bug can't drive a balance negative.
- **Settlement is clamped:** a losing position can never credit less than zero
  (`max(Decimal("0"), margin + pnl)`), so a liquidation caps loss at the margin
  posted — a wallet can't go negative.

You can watch it work — send a deliberately absurd price and the server prices it
correctly anyway:

```bash
# "buy" $500 of BTC claiming a price of $1 → you do NOT get 500 BTC
curl -X POST /api/markets/wallet/buy/ -d '{"coin_id":"bitcoin","amount":"500","price":"1"}'
# → 0.0085 BTC at the real ~$58,700 mark
```

> ⚠️ **Note on SQLite vs Postgres.** `select_for_update()` is a no-op on SQLite
> (it takes a whole-database lock instead of a row lock), so the locking only does
> real work on **Postgres**, which is why production runs Postgres via
> `dj-database-url`. The code is correct on both; only Postgres makes it *concurrent*.

---

## 2. Browser-direct market data, server-authoritative money

A deliberate split:

- **Market data** (mark price, depth-20 order book, klines) streams **browser →
  Binance WebSocket** directly. It's public, high-frequency, and identical for every
  user — proxying it through the backend would add latency and cost nothing but load.
- **Everything that changes state** (wallet, positions, settlement) goes through the
  Django API, which re-derives its own price. The client is never trusted for money.

This is the same boundary a real exchange draws between "market data" and "the
matching engine."

The browser socket is wrapped in a [`useBinanceStream`](../frontend/src/hooks/useBinanceStream.ts)
hook with reconnect + exponential backoff (`partysocket`) and an 8-second staleness
watchdog that flips a visible "reconnecting" indicator — so the UI never *looks*
live while quietly serving frozen data.

---

## 3. A non-deterministic starting balance (the triple-signal race)

New users sometimes started with **$0**, sometimes **$10,000**. The cause: **three**
`post_save(User)` signal handlers each created a wallet, one of them with
`FuturesWallet.objects.create(balance=0)` (non-idempotent), the others with
`get_or_create` (default `$10,000`). Depending on signal-registration order they
either collided on the unique `user_id` (an `IntegrityError` that broke signup
outright) or raced on the starting balance.

**Fix:** collapse to a **single idempotent creator** (`users.signals`, all
`get_or_create`) and make the rest no-ops. Wallet creation is now deterministic and
signup can't fail on a duplicate. See [`futures/signals.py`](../backend/futures/signals.py)
for the write-up left in the code.

---

## 4. Polling today, push tomorrow

The original frontend polled the backend for wallet + positions **every 1.5 s** with
`setInterval`. The rebuild moves all server state to **TanStack Query** with sane
intervals and mutation-driven invalidation — already far better, and live PnL is
computed client-side from the Binance mark, so the screen feels real-time without
hammering the API.

The next step (documented, not yet shipped) is **Django Channels** to *push* wallet,
position and fill updates per-user over a WebSocket and drop polling entirely. It's
scoped deliberately: only the server-state channel is missing — the market-data
socket already exists — so it's a clean, legible upgrade rather than a rewrite.

---

## 5. Fail-closed configuration

- `DEBUG` defaults to **`False`**; the hardcoded `django-insecure-…` `SECRET_KEY`
  fallback was removed (it raises `ImproperlyConfigured` in production).
- Production turns on `SECURE_SSL_REDIRECT`, HSTS, secure cookies and the proxy SSL
  header — all guarded so local `http` dev still works.
- DRF **throttling** (scoped on login/signup and the market proxies) and password
  validators on signup and password change.
- Secrets and `db.sqlite3` are out of version control; OpenAPI docs ship at
  `/api/docs/`.

---

## 6. Frontend: one source of truth, legible numbers

- **One Tailwind v4 token system** replaced *three conflicting* `:root` files (the
  old code defined four different greens). Depth comes from layered surfaces + 1px
  hairlines, not glow.
- **Every numeric readout uses `tabular-nums` + a mono font**, so digits don't dance
  as prices tick, and formatting goes through `Intl.NumberFormat` with the real
  Unicode minus (U+2212).
- **Accessibility:** up/down is never color-only — it always carries an arrow + sign;
  global `:focus-visible` rings; `prefers-reduced-motion` honored.
- **Code-split routes** keep the initial bundle ~135 KB gzip; the heavy chart libs
  load only on the screens that use them.

---

## 7. Considered and rejected

- **Next.js** — this is an auth-gated, client-heavy realtime app with no SEO surface.
  A Vite SPA is the right tool; SSR would add complexity for no benefit.
- **A separate realtime microservice** — the browser already talks to Binance
  directly, so the realtime fan-out problem mostly doesn't exist on my servers.
  A Django monolith + (planned) Channels is the correct scope.
