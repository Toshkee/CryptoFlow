// src/pages/CoinDetails.jsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost } from "/src/services/api";
import { alertSuccess, alertError } from "/src/utils/alert.js";
import "./coinDetails.css";

export default function CoinDetails() {
  const { coin_id } = useParams();

  const [info, setInfo] = useState(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showBuy, setShowBuy] = useState(false);
  const [buyAmount, setBuyAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);

  const safe = (v, f = "--") => (v !== undefined && v !== null ? v : f);

  // LOAD DATA
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const wallet = await apiGet("/markets/wallet/");
        if (!wallet.error) {
          setWalletBalance(Number(wallet.balance) || 0);
        }

        const data = await apiGet(`/markets/${coin_id}/`, {
          signal: controller.signal,
        });

        if (!data || !data.info?.id) {
          setError("Coin data unavailable.");
          return;
        }

        setInfo(data.info);
        setChart(data.chart);
      } catch (err) {
        if (err.name !== "AbortError") setError("Failed to load coin data.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [coin_id]);

  // BUY HANDLER
  const handleBuy = async () => {
    if (!buyAmount || isNaN(buyAmount) || Number(buyAmount) <= 0) {
      alertError("Invalid amount", "Please enter a valid USD amount.");
      return;
    }

    const res = await apiPost("/markets/wallet/buy/", {
      coin_id,
      symbol: info.symbol.toLowerCase(),
      amount: buyAmount,
      price: info.market_data.current_price.usd,
    });

    if (res.error) {
      alertError("Purchase Failed", res.error);
      return;
    }

    alertSuccess(
      "Purchase Successful!",
      `You bought ${info.symbol.toUpperCase()} worth $${Number(buyAmount).toLocaleString()}`
    );

    setBuyAmount("");
    setShowBuy(false);

    const wallet = await apiGet("/markets/wallet/");
    if (!wallet.error) {
      setWalletBalance(Number(wallet.balance));
    }
  };

  // LOADING SKELETON
  if (loading)
    return (
      <div className="coinpage-container">
        <div className="skeleton header-skeleton shimmer"></div>
        <div className="skeleton chart-skeleton shimmer"></div>
        <div className="skeleton stats-skeleton shimmer"></div>
        <div className="skeleton desc-skeleton shimmer"></div>
      </div>
    );

  if (error || !info) return <div className="coin-loading-page">{error}</div>;

  const name = safe(info.name);
  const symbol = safe(info.symbol?.toUpperCase());
  const price = safe(info.market_data?.current_price?.usd, 0);
  const change24 = safe(info.market_data?.price_change_percentage_24h, 0);
  const marketCap = safe(info.market_data?.market_cap?.usd);
  const volume = safe(info.market_data?.total_volume?.usd);
  const supply = safe(info.market_data?.circulating_supply);
  const maxSupply = info.market_data?.max_supply;
  const spark = chart?.prices?.map((p) => p[1]) || [];

  return (
    <div className="coinpage-container">

      {/* HEADER */}
      <div className="coinpage-header">
        <img src={info.image.large} className="coinpage-icon" />

        <div>
          <h1 className="coinpage-title">
            {name} <span className="coinpage-symbol">({symbol})</span>
          </h1>

          <div className="coinpage-price">${Number(price).toLocaleString()}</div>

          <div className={`coinpage-change ${change24 >= 0 ? "green" : "red"}`}>
            {Number(change24).toFixed(2)}% (24h)
          </div>

          <button className="buy-btn" onClick={() => setShowBuy(true)}>
            Buy {symbol}
          </button>
        </div>
      </div>

      {/* CHART */}
      <div className="coinpage-chart-card">
        <h2>7-Day Chart</h2>
        {spark.length > 5 ? (
          <svg width="100%" height="260">
            <polyline
              fill="none"
              stroke={spark.at(-1) > spark[0] ? "#00ff99" : "#ff4d4d"}
              strokeWidth="3"
              points={(() => {
                const max = Math.max(...spark);
                const min = Math.min(...spark);
                return spark
                  .map((p, i) => {
                    const x = (i / (spark.length - 1)) * 900;
                    const y = 260 - ((p - min) / (max - min || 1)) * 260;
                    return `${x},${y}`;
                  })
                  .join(" ");
              })()}
            />
          </svg>
        ) : (
          <p>No chart data available.</p>
        )}
      </div>

      {/* STATS */}
      <div className="coinpage-stats-grid">
        <div className="stat-card">
          <h4>Market Cap</h4>
          <p>${Number(marketCap).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h4>24h Volume</h4>
          <p>${Number(volume).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h4>Circulating Supply</h4>
          <p>{Number(supply).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h4>Max Supply</h4>
          <p>{maxSupply ? Number(maxSupply).toLocaleString() : "∞"}</p>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="coinpage-description">
        <h2>About {name}</h2>
        <p>
          {info.description.en
            ? info.description.en.replace(/<[^>]+>/g, "").slice(0, 2000)
            : "No description available."}
        </p>
      </div>

      {/* BUY MODAL */}
      {showBuy && (
        <div className="modal-bg">
          <div className="modal">
            <h2>Buy {symbol}</h2>

            <p className="wallet-balance-text">
              Wallet Balance: ${walletBalance.toLocaleString()}
            </p>

            <p className="modal-price">
              Current Price: <strong>${price.toLocaleString()}</strong>
            </p>

            <input
              type="number"
              placeholder="Amount in USD"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
            />

            <button className="modal-confirm" onClick={handleBuy}>
              Confirm Buy
            </button>

            <button className="modal-cancel" onClick={() => setShowBuy(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}