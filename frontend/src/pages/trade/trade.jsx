import { useEffect, useRef, useState } from "react";
import { apiPost } from "../../services/api";
import { createChart } from "lightweight-charts";
import "./trade.css";

export default function Trade() {
  // ----------------------------------
  // STATE
  // ----------------------------------
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setIntervalValue] = useState("1m");
  const [side, setSide] = useState("BUY");
  const [margin, setMargin] = useState("");
  const [leverage, setLeverage] = useState(20);
  const [livePrice, setLivePrice] = useState(null);

  const [orderbook, setOrderbook] = useState({
    asks: [],
    bids: [],
  });

  const wsRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const candleSeries = useRef(null);

  const MARKETS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT",
    "DOTUSDT", "ATOMUSDT", "NEARUSDT", "FILUSDT"
  ];

  // ----------------------------------
  // CREATE CHART
  // ----------------------------------
  const createNewChart = () => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.remove();
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 420,
      layout: {
        background: { color: "#0a0a0a" },
        textColor: "#d1d1d1"
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" }
      },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#00ff8c",
      downColor: "#ff4d4d",
      wickUpColor: "#00ff8c",
      wickDownColor: "#ff4d4d",
      borderUpColor: "#00ff8c",
      borderDownColor: "#ff4d4d"
    });

    chartInstance.current = chart;
    candleSeries.current = series;
  };

  // ----------------------------------
  // LOAD HISTORICAL CANDLES
  // ----------------------------------
  const loadCandles = async (sym, tf) => {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${tf}&limit=300`;
    const raw = await fetch(url).then((r) => r.json());

    const formatted = raw.map((c) => ({
      time: c[0] / 1000,
      open: +c[1],
      high: +c[2],
      low: +c[3],
      close: +c[4],
    }));

    candleSeries.current.setData(formatted);
  };

  // ----------------------------------
  // START WEBSOCKET
  // ----------------------------------
  const startLiveFeeds = (sym) => {
    const lower = sym.toLowerCase();
    const wsUrl =
      `wss://fstream.binance.com/stream?streams=` +
      `${lower}@markPrice/${lower}@depth20@100ms`;

    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log("WS Connected:", wsUrl);

    ws.onmessage = (msg) => {
      let packet;
      try {
        packet = JSON.parse(msg.data);
      } catch {
        return;
      }

      if (!packet || !packet.stream) return;

      const { stream, data } = packet;

      // ----- mark price -----
      if (stream.includes("markPrice") && data?.markPrice) {
        setLivePrice(parseFloat(data.markPrice));
      }

      // ----- depth update -----
      if (stream.includes("depth20") && data?.a && data?.b) {
        // a = asks | b = bids
        setOrderbook({
          asks: data.a.slice(0, 10).map(([p, q]) => ({
            price: parseFloat(p),
            qty: parseFloat(q)
          })),
          bids: data.b.slice(0, 10).map(([p, q]) => ({
            price: parseFloat(p),
            qty: parseFloat(q)
          }))
        });
      }
    };

    ws.onerror = () => console.warn("WS Error");
    ws.onclose = () => console.warn("WS Closed");
  };

  // ----------------------------------
  // RELOAD WHEN SYMBOL OR TF CHANGES
  // ----------------------------------
  useEffect(() => {
    createNewChart();
    loadCandles(symbol, interval);
    startLiveFeeds(symbol);

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [symbol, interval]);

  // ----------------------------------
  // SEND ORDER
  // ----------------------------------
  const submitOrder = async () => {
    try {
      const res = await apiPost("/futures/open/", {
        symbol,
        side,
        leverage,
        margin,
        price: livePrice
      });
      alert("Order Submitted:\n" + JSON.stringify(res, null, 2));
    } catch {
      alert("Order Failed");
    }
  };

  // ----------------------------------
  // UI
  // ----------------------------------
  return (
    <div className="trade-page">
      
      {/* SIDEBAR */}
      <aside className="markets-sidebar">
        <h2>Markets</h2>
        {MARKETS.map((m) => (
          <div
            key={m}
            onClick={() => setSymbol(m)}
            className={`market-item ${symbol === m ? "active" : ""}`}
          >
            {m}
          </div>
        ))}
      </aside>

      {/* CENTER */}
      <div className="trade-center">

        {/* CHART */}
        <div className="chart-box">
          <div className="chart-top">
            <h3>{symbol} Perpetual</h3>
            <select
              className="timeframe-select"
              value={interval}
              onChange={(e) => setIntervalValue(e.target.value)}
            >
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

        {/* BOTTOM SECTION */}
        <div className="trade-bottom">

          {/* ORDER BOOK */}
          <div className="orderbook-box">
            <h3>Order Book</h3>

            <h4>Asks</h4>
            {orderbook.asks.length === 0
              ? <p>Loading...</p>
              : orderbook.asks.map((row, i) => (
                  <div key={i} className="row red">
                    <span>{row.price.toFixed(2)}</span>
                    <span>{row.qty}</span>
                  </div>
                ))}

            <h4>Bids</h4>
            {orderbook.bids.length === 0
              ? <p>Loading...</p>
              : orderbook.bids.map((row, i) => (
                  <div key={i} className="row green">
                    <span>{row.price.toFixed(2)}</span>
                    <span>{row.qty}</span>
                  </div>
                ))}
          </div>

          {/* TRADE PANEL */}
          <div className="trade-panel">
            <h3>Trade</h3>

            <div className="bs-toggle">
              <button
                className={side === "BUY" ? "buy-btn active" : "buy-btn"}
                onClick={() => setSide("BUY")}
              >
                Buy
              </button>
              <button
                className={side === "SELL" ? "sell-btn active" : "sell-btn"}
                onClick={() => setSide("SELL")}
              >
                Sell
              </button>
            </div>

            <label>Live Price</label>
            <input readOnly value={livePrice?.toFixed(2) || "..."} />

            <label>Margin (USDT)</label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />

            <label>Leverage</label>
            <input
              type="number"
              min="1"
              max="125"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
            />

            <button className="confirm-btn" onClick={submitOrder}>
              Confirm Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}