import { useEffect, useState } from "react";
import axios from "axios";
import "./homepage.css";

export default function HomePage() {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(
          "https://api.coingecko.com/api/v3/coins/markets",
          {
            params: {
              vs_currency: "usd",
              ids:
                "bitcoin,ethereum,solana,ripple,cardano,binancecoin,polkadot,matic-network",
              order: "market_cap_desc",
              per_page: 8,
              sparkline: false,
            },
          }
        );

        if (Array.isArray(res.data)) {
          setCoins(res.data);
        }
      } catch (error) {
        console.error("CoinGecko error:", error);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);

  }, []);

  return (
    <div className="home-container">
      <div className="home-content">

        {/* HERO */}
        <section className="hero">
          <div className="hero-text">
            <h1 className="hero-title">Trade Crypto Anytime</h1>

            <p className="hero-subtitle">
              Buy and trade digital assets securely with a modern trading platform.
            </p>
          </div>
        </section>

        {/* MARKETS */}
        <section className="markets">
          <h2 className="markets-title">Top Markets</h2>

          <div className="market-grid">

          {coins.length === 0 ? (
  <p style={{ color: "gray" }}>Loading live prices...</p>
) : (
  coins.map((coin) => (
    <div className="market-card" key={coin.id}>
      <span>{coin.symbol?.toUpperCase()}</span>

      <strong>
        ${coin.current_price ? coin.current_price.toLocaleString() : "—"}
      </strong>

      <p
        className={
          coin.price_change_percentage_24h >= 0 ? "green" : "red"
        }
      >
        {coin.price_change_percentage_24h
          ? coin.price_change_percentage_24h.toFixed(2) + "%"
          : "—"}
      </p>
    </div>
  ))
)}

          </div>
        </section>

      </div>
    </div>
  );
}