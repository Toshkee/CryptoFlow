## 🚀 CryptoFlow — Real-Time Futures Trading Platform

CryptoFlow is a full-stack cryptocurrency futures trading platform designed with real-time market data, live orderbooks, candlestick charts, simulated futures accounts, trade execution, and user authentication.

It integrates directly with Binance Futures WebSocket streams to deliver accurate market information.



## 🌐 Live Features

📈 Real-Time Trading Chart
	•	Candlestick chart powered by lightweight-charts
	•	Live updates through Binance kline WebSocket streams
	•	Timeframes supported: 1m · 5m · 15m · 1h · 4h · 1d

🧩 Live Order Book
	•	Depth20 snapshot streamed from Binance every 100ms
	•	Auto-sorted bids/asks
	•	Color-coded buy/sell levels

⚡ Live Price Feed
	•	Mark price updated via Binance WebSocket
	•	Automatically adjusts your trade panel

🔥 Perpetual Futures Trading
	•	Open Long/Short positions
	•	Customizable leverage (1×–125×)
	•	Margin-based USDT futures
	•	Trades sent to a Django backend simulation engine

👤 Authentication + User Wallet
	•	JWT-based login/signup
	•	Each user gets a virtual Futures Wallet
	•	Wallet balance updates after opening positions

🖥️ Modern UI
	•	Mobile-friendly
	•	Dark mode by default
	•	Smooth neon-green exchange-style styling
	•	Professional trading layout (sidebar + chart + orderbook)



## 🛠️ Tech Stack

Frontend
	•	React (Vite)
	•	Lightweight-Charts
	•	WebSockets
	•	CSS3 with Neon-Dark UI theme

Backend
	•	Django REST Framework
	•	Django Auth + JWT
	•	Custom Futures Engine
	•	Position tracking, margin checks, PnL simulation

External Data
	•	Binance Futures APIs
	•	WebSockets: mark price, depth20

   
## 🎮 How to Use

1️⃣ Signup/Login
2️⃣ Select trading pair from sidebar
3️⃣ Watch real-time candles & orderbook update
4️⃣ Enter margin + leverage
5️⃣ Click Buy or Sell
6️⃣ See wallet and open positions update



🧭 Future Improvements
	•	Full cross & isolated margin support
	•	Real liquidation engine
	•	Take Profit / Stop Loss orders
	•	Trade history UI
	•	Portfolio charts
	•	Copy-trading mode
	•	More WebSocket optimizations

