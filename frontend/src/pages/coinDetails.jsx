import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../services/api.js";
import "./coinDetails.css";

export default function CoinDetails() {
  const { coin_id } = useParams();

  const [info, setInfo] = useState(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet(`/markets/${coin_id}/`);

        if (data.error) {
          setError(data.error);
          return;
        }

        setInfo(data.info);
        setChart(data.chart);
      } catch (err) {
        setError("Failed to fetch coin data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [coin_id]);

  if (loading)
    return <div className="coin-loading-page">Loading...</div>;

  if (error || !info)
    return <div className="coin-loading-page">{error || "Coin not found."}</div>;

  const price = info.market_data?.current_price?.usd;
  const change24h = info.market_data?.price_change_percentage_24h;
  const marketCap = info.market_data?.market_cap?.usd;
  const totalVolume = info.market_data?.total_volume?.usd;
  const supply = info.market_data?.circulating_supply;
  const maxSupply = info.market_data?.max_supply;

  const spark = chart?.prices?.map((p) => p[1]) || [];

  return (
    <div className="coinpage-container">
      
      {/* HEADER SECTION */}
      <div className="coinpage-header">
        <img src={info.image?.large} alt={info.name} className="coinpage-icon" />

        <div>
          <h1 className="coinpage-title">
            {info.name}{" "}
            <span className="coinpage-symbol">
              ({info.symbol.toUpperCase()})
            </span>
          </h1>

          <div className="coinpage-price">
            ${price?.toLocaleString()}
          </div>

          <div className={`coinpage-change ${change24h >= 0 ? "green" : "red"}`}>
            {change24h?.toFixed(2)}% (24h)
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="coinpage-chart-card">
        <h2>24h Chart</h2>

        {spark.length > 10 ? (
          <svg width="100%" height="260">
            <polyline
              fill="none"
              stroke={spark.at(-1) > spark[0] ? "#00ff99" : "#ff4d4d"}
              strokeWidth="3"
              points={spark
                .map((p, i) => {
                  const max = Math.max(...spark);
                  const min = Math.min(...spark);
                  const x = (i / (spark.length - 1)) * 900;
                  const y = 260 - ((p - min) / (max - min)) * 260;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        ) : (
          <p>No chart data</p>
        )}
      </div>

      {/* STATS GRID */}
      <div className="coinpage-stats-grid">
        <div className="stat-card">
          <h4>Market Cap</h4>
          <p>${marketCap?.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h4>24h Volume</h4>
          <p>${totalVolume?.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h4>Circulating Supply</h4>
          <p>{supply?.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h4>Max Supply</h4>
          <p>{maxSupply ? maxSupply.toLocaleString() : "∞"}</p>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="coinpage-description">
        <h2>About {info.name}</h2>
        <p>
          {info.description?.en?.slice(0, 2000) ||
            "No description available."}
        </p>
      </div>
    </div>
  );
}