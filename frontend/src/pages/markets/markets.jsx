// src/pages/markets/Markets.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "/src/services/api.js";
import "./markets.css";

export default function MarketsPage() {
  const navigate = useNavigate();

  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("market_cap");
  const [category, setCategory] = useState("all");
  const [showFavOnly, setShowFavOnly] = useState(false);

  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const [favorites, setFavorites] = useState(
    () => JSON.parse(localStorage.getItem("favorites")) || []
  );

  const toggleFavorite = (id) => {
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];

    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  // -----------------------------
  // CATEGORIES
  // -----------------------------
  const categoryRules = {
    L1: ["bitcoin", "ethereum", "solana", "avalanche-2"],
    L2: ["arbitrum", "optimism", "immutable", "base"],
    DeFi: ["uniswap", "aave", "curve-dao-token"],
    AI: ["fetch-ai", "singularitynet"],
    Meme: ["dogecoin", "shiba-inu", "pepe"],
    Gaming: ["gala", "axie-infinity"],
    RWA: ["chainlink"],
    Stablecoins: ["tether", "usd-coin", "dai"],
    Infra: ["filecoin", "render-token"],
  };

  const curatedCategories = [
    "all",
    "favorites",
    "L1",
    "L2",
    "DeFi",
    "AI",
    "Meme",
    "Gaming",
    "RWA",
    "Stablecoins",
    "Infra",
  ];

  const detectCategory = (id) => {
    for (const cat in categoryRules) {
      if (categoryRules[cat].includes(id)) return cat;
    }
    return "Other";
  };

  // -----------------------------
  // LOAD DATA
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      const data = await apiGet("/markets/top100/");

      console.log("TOP100 DATA:", data);

      if (Array.isArray(data)) {
        setCoins(
          data.map((c) => ({
            ...c,
            curated_category: detectCategory(c.id),
          }))
        );
      }

      setLoading(false);
    };

    load();
  }, []);

  // -----------------------------
  // FILTER + SORT
  // -----------------------------
  const filteredCoins = coins
    .filter((coin) => {
      if (showFavOnly && !favorites.includes(coin.id)) return false;
      if (category !== "all" && category !== "favorites") {
        if (coin.curated_category !== category) return false;
      }
      return (
        coin.name.toLowerCase().includes(search.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.current_price - b.current_price;
        case "price_desc":
          return b.current_price - a.current_price;
        case "change_asc":
          return a.price_change_percentage_24h - b.price_change_percentage_24h;
        case "change_desc":
          return b.price_change_percentage_24h - a.price_change_percentage_24h;
        case "alpha":
          return a.name.localeCompare(b.name);
        default:
          return b.market_cap - a.market_cap;
      }
    });

  const paginated = filteredCoins.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const renderSparkline = (spark) => {
    if (!spark || spark.length < 2)
      return <div style={{ opacity: 0.3 }}>No chart</div>;

    const min = Math.min(...spark);
    const max = Math.max(...spark);

    return (
      <svg width="110" height="35">
        <polyline
          fill="none"
          stroke={spark.at(-1) > spark[0] ? "#00ff99" : "#ff4444"}
          strokeWidth="2"
          points={spark
            .map((p, i) => {
              const x = (i / (spark.length - 1)) * 110;
              const y = 35 - ((p - min) / (max - min || 1)) * 35;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      </svg>
    );
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="markets-page">
      <h1 className="markets-header">Markets</h1>

      {/* CATEGORY TABS */}
      <div className="markets-tabs">
        {curatedCategories.map((cat) => (
          <button
            key={cat}
            className={`tab-btn ${
              (cat === "favorites" && showFavOnly) ||
              (cat !== "favorites" && category === cat)
                ? "active"
                : ""
            }`}
            onClick={() => {
              if (cat === "favorites") {
                setShowFavOnly(true);
                setCategory("all");
              } else {
                setShowFavOnly(false);
                setCategory(cat);
              }
              setPage(1);
            }}
          >
            {cat === "favorites" ? "★ Favorites" : cat}
          </button>
        ))}
      </div>

      {/* SEARCH + SORT */}
      <div className="markets-controls">
        <input
          type="text"
          placeholder="Search asset…"
          className="markets-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="markets-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="market_cap">Market Cap</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="change_asc">24h Change ↑</option>
          <option value="change_desc">24h Change ↓</option>
          <option value="alpha">A → Z</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="markets-table">
        <div className="markets-row header">
          <div>Asset</div>
          <div>Price</div>
          <div>7D</div>
          <div>24h</div>
          <div>Fav</div>
        </div>

        {!loading &&
          paginated.map((coin) => (
            <div
              key={coin.id}
              className="markets-row"
              onClick={() => navigate(`/coin/${coin.id}`)}
            >
              <div className="market-asset">
                <img src={coin.image} alt={coin.symbol} />
                <div>
                  <div className="asset-symbol">{coin.symbol.toUpperCase()}</div>
                  <div className="asset-category">{coin.curated_category}</div>
                </div>
              </div>

              <div>${coin.current_price.toLocaleString()}</div>

              <div>{renderSparkline(coin.sparkline_in_7d?.price)}</div>

              <div
                className={
                  coin.price_change_percentage_24h >= 0 ? "green" : "red"
                }
              >
                {coin.price_change_percentage_24h.toFixed(2)}%
              </div>

              <div
                className={`fav-star ${
                  favorites.includes(coin.id) ? "filled" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(coin.id);
                }}
              >
                {favorites.includes(coin.id) ? "★" : "☆"}
              </div>
            </div>
          ))}
      </div>

      {/* PAGINATION */}
      <div className="pagination-controls">
        <button
          className="page-btn"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Prev
        </button>

        <span className="page-info">
          Page {page}
        </span>

        <button
          className="page-btn"
          onClick={() => setPage(page + 1)}
          disabled={page * PER_PAGE >= filteredCoins.length}
        >
          Next
        </button>
      </div>
    </div>
  );
}