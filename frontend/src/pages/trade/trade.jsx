import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../services/api";
import { createChart } from "lightweight-charts";
import Swal from "sweetalert2";
import "./trade.css";

// Apply global dark SweetAlert theme
Swal.mixin({
  background: "#111",
  color: "#fff",
  confirmButtonColor: "#2ecc71",
  cancelButtonColor: "#e74c3c",
  buttonsStyling: true,
});

export default function Trade() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setIntervalValue] = useState("1m");
  const [side, setSide] = useState("BUY");
  const [margin, setMargin] = useState("");
  const [leverage, setLeverage] = useState(20);
  const [livePrice, setLivePrice] = useState(null);

  const [orderbook, setOrderbook] = useState({ asks: [], bids: [] });
  const [wallet, setWallet] = useState(null);
  const [positions, setPositions] = useState([]);

  const wsRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const candleSeries = useRef(null);

  const MARKETS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT",
    "DOTUSDT", "ATOMUSDT", "NEARUSDT", "FILUSDT"
  ];

  const loadWallet = async () => {
    const res = await apiGet("/futures/wallet/");
    if (!res.error) setWallet(res);
  };

  const loadPositions = async () => {
    const res = await apiGet("/futures/positions/");
    setPositions(Array.isArray(res) ? res : []);
  };

  useEffect(() => {
    loadWallet();
    loadPositions();
    const t = setInterval(() => {
      loadWallet();
      loadPositions();
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const createNewChart = () => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.remove();

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 420,
      layout: { background: { color: "#000" }, textColor: "#ccc" },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#00ff8c",
      downColor: "#ff4d4d",
      wickUpColor: "#00ff8c",
      wickDownColor: "#ff4d4d",
    });

    chartInstance.current = chart;
    candleSeries.current = series;
  };

  const loadCandles = async (sym, tf) => {
    const raw = await fetch(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${tf}&limit=300`
    ).then(r => r.json());

    candleSeries.current?.setData(
      raw.map(c => ({
        time: c[0] / 1000,
        open: +c[1],
        high: +c[2],
        low: +c[3],
        close: +c[4],
      }))
    );
  };

  const startLiveFeeds = (sym) => {
    const lower = sym.toLowerCase();
    const url = `wss://fstream.binance.com/stream?streams=${lower}@markPrice/${lower}@depth20@100ms`;

    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      let packet;
      try { packet = JSON.parse(msg.data); } catch { return; }

      const { stream, data } = packet;

      if (stream.includes("markPrice") && data?.p) {
        setLivePrice(+data.p);
      }
      if (stream.includes("depth20") && data?.a && data?.b) {
        setOrderbook({
          asks: data.a.slice(0, 10).map(([p, q]) => ({ price: +p, qty: +q })),
          bids: data.b.slice(0, 10).map(([p, q]) => ({ price: +p, qty: +q })),
        });
      }
    };
  };

  useEffect(() => {
    createNewChart();
    loadCandles(symbol, interval);
    startLiveFeeds(symbol);
    return () => wsRef.current?.close();
  }, [symbol, interval]);

  const submitOrder = async () => {
    if (!margin) {
      return Swal.fire("Error", "Enter a valid margin amount", "error");
    }

    const res = await apiPost("/futures/open/", {
      symbol, side, leverage, margin, price: livePrice
    });

    if (res.error) {
      Swal.fire("Order Failed", res.error, "error");
    } else {
      Swal.fire("Success", "Order opened!", "success");
      loadWallet();
      loadPositions();
      setMargin("");
    }
  };

  const closePosition = async (id) => {
    const res = await apiPost(`/futures/close/${id}/`, { price: livePrice });

    if (res.error) {
      Swal.fire("Error", res.error, "error");
    } else {
      Swal.fire("Closed", `PnL: ${Number(res.pnl).toFixed(2)} USDT`, "success");
      loadWallet();
      loadPositions();
    }
  };

  const calcPnL = (pos) => {
    if (!livePrice) return 0;
    const entry = Number(pos.entry_price);
    const amt = Number(pos.amount);
    return pos.side === "LONG"
      ? (livePrice - entry) * amt
      : (entry - livePrice) * amt;
  };

  return (
    <div className="trade-page">

      {/* LEFT SIDEBAR */}
      <aside className="markets-sidebar">
        <h2>Markets</h2>
        {MARKETS.map((m) => (
          <div
            key={m}
            className={`market-item ${symbol === m ? "active" : ""}`}
            onClick={() => setSymbol(m)}
          >
            {m}
          </div>
        ))}
      </aside>

      {/* CENTER SECTION */}
      <div className="trade-center">
        <div className="chart-box">
          <div className="chart-top">
            <h3>{symbol} Perpetual</h3>
            <select value={interval} onChange={(e) => setIntervalValue(e.target.value)}>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1D</option>
            </select>
          </div>

          <div ref={chartRef} className="chart-container"></div>
        </div>

        <div className="trade-bottom">
          <div className="orderbook-box">
            <h3>Order Book</h3>

            <h4>Asks</h4>
            {orderbook.asks.map((a, i) => (
              <div key={i} className="row red">
                <span>{Number(a.price).toFixed(2)}</span>
                <span>{a.qty}</span>
              </div>
            ))}

            <h4>Bids</h4>
            {orderbook.bids.map((b, i) => (
              <div key={i} className="row green">
                <span>{Number(b.price).toFixed(2)}</span>
                <span>{b.qty}</span>
              </div>
            ))}
          </div>

          {/* TRADE PANEL */}
          <div className="trade-panel">
            <h3>Trade</h3>

            <div className="bs-toggle">
              <button
                className={`trade-btn buy ${side === "BUY" ? "active" : ""}`}
                onClick={() => setSide("BUY")}
              >
                Buy
              </button>

              <button
                className={`trade-btn sell ${side === "SELL" ? "active" : ""}`}
                onClick={() => setSide("SELL")}
              >
                Sell
              </button>
            </div>

            <label>Live Price</label>
            <input readOnly value={livePrice ? Number(livePrice).toFixed(2) : "..."} />

            <label>Margin (USDT)</label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />

            <label>Leverage: {leverage}×</label>
            <input
              type="range"
              min="1"
              max="125"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="leverage-slider"
            />

            <button className="confirm-btn" onClick={submitOrder}>
              Confirm Order
            </button>
          </div>
        </div>
      </div>

      {/* WALLET PANEL */}
      <aside className="wallet-panel">
        <h2>Wallet</h2>
        <div className="wallet-balance">
          Balance:{" "}
          <strong>
            {wallet && wallet.balance
              ? Number(wallet.balance).toFixed(2)
              : "0.00"}
          </strong>
        </div>

        <h2 className="section-title">Open Positions</h2>

        {positions.length === 0 && <p>No open positions</p>}

        {positions.map((p) => {
          const pnl = calcPnL(p);
          return (
            <div key={p.id} className="pos-card">
              <div className="pos-header">
                <strong>{p.symbol}</strong>
                <span className={p.side === "LONG" ? "green" : "red"}>{p.side}</span>
              </div>

              <div className="pos-info">
                <div>Entry: {Number(p.entry_price).toFixed(2)}</div>
                <div>Contracts: {Number(p.amount).toFixed(4)}</div>
                <div>Liq: {Number(p.liquidation_price).toFixed(2)}</div>
              </div>

              <div className="pos-pnl" style={{ color: pnl >= 0 ? "#00ff8c" : "#ff4d4d" }}>
                PnL: {Number(pnl).toFixed(2)}
              </div>

              <button className="close-btn" onClick={() => closePosition(p.id)}>
                Close Position
              </button>
            </div>
          );
        })}
      </aside>

    </div>
  );
}