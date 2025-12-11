import { useEffect, useState } from "react";
import { apiGet } from "/src/services/api";
import "./homepage.css";

export default function HomePage() {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await apiGet("/markets/top8/");
      console.log("TOP8:", data);

      if (Array.isArray(data)) {
        // Filter out EMPTY or broken coin objects
        setCoins(
          data
            .filter((c) => c && c.id && c.current_price != null)
            .map((c) => ({
              ...c,
              symbol: c.symbol ? c.symbol.toUpperCase() : "--",
              price: c.current_price ? c.current_price : 0,
              change: c.price_change_percentage_24h
                ? c.price_change_percentage_24h
                : 0,
            }))
        );
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-container">
      <div className="home-content">

        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-text">
            <h1 className="hero-title">Trade Crypto Anytime</h1>
            <p className="hero-subtitle">
              Buy and trade digital assets securely on a modern platform.
            </p>
          </div>
        </section>

        {/* TOP MARKETS */}
        <section className="markets">
          <h2 className="markets-title">Top Markets</h2>

          <div className="market-grid">
            {coins.length === 0 ? (
              <p style={{ color: "gray" }}>Loading...</p>
            ) : (
              coins.map((coin) => (
                <div className="market-card" key={coin.id}>
                  <span>{coin.symbol || "--"}</span>

                  <strong>${Number(coin.price).toLocaleString()}</strong>

                  <p className={coin.change >= 0 ? "green" : "red"}>
                    {coin.change.toFixed(2)}%
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