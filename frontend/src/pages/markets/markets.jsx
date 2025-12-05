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

  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem("favorites")) || [];
  });

  const toggleFavorite = (id) => {
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];

    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };


  const categoryRules = {
    L1: [
      "bitcoin", "ethereum", "solana", "avalanche-2", "cardano", "polkadot",
      "near", "internet-computer", "cosmos", "algorand"
    ],
    L2: ["arbitrum", "optimism", "immutable", "base", "mantle"],
    DeFi: [
      "uniswap", "aave", "curve-dao-token", "maker", "compound-governance-token",
      "pancakeswap-token", "lido-dao"
    ],
    AI: ["fetch-ai", "singularitynet", "ocean-protocol", "injective-protocol"],
    Meme: ["dogecoin", "shiba-inu", "pepe", "bonk", "floki"],
    Gaming: ["the-sandbox", "decentraland", "axie-infinity", "gala"],
    RWA: ["chainlink", "centrifuge", "pendle"],
    Stablecoins: ["tether", "usd-coin", "dai", "binance-usd"],
    Infra: ["chainlink", "the-graph", "filecoin", "render-token"]
  };

  const curatedCategories = [
    "all", "favorites", "L1", "L2", "DeFi", "AI",
    "Meme", "Gaming", "RWA", "Stablecoins", "Infra"
  ];

  const detectCategory = (id) => {
    for (const cat in categoryRules) {
      if (categoryRules[cat].includes(id)) return cat;
    }
    return "Other";
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet("/markets/top100/"); // 
        const withCategories = data.map((c) => ({
          ...c,
          curated_category: detectCategory(c.id),
        }));

        setCoins(withCategories);
      } catch (err) {
        console.error("Markets error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);


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
        case "price_asc": return a.current_price - b.current_price;
        case "price_desc": return b.current_price - a.current_price;
        case "change_asc": return a.price_change_percentage_24h - b.price_change_percentage_24h;
        case "change_desc": return b.price_change_percentage_24h - a.price_change_percentage_24h;
        case "alpha": return a.name.localeCompare(b.name);
        default: return b.market_cap - a.market_cap;
      }
    });

  const totalPages = Math.ceil(filteredCoins.length / PER_PAGE);
  const paginated = filteredCoins.slice((page - 1) * PER_PAGE, page * PER_PAGE);

 
  useEffect(() => {
    const rows = document.querySelectorAll(".markets-row");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("show-row");
        });
      },
      { threshold: 0.2 }
    );
    rows.forEach((r) => observer.observe(r));
    return () => observer.disconnect();
  }, [paginated]);

  
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

      {/* SEARCH / SORT */}
      <div className="markets-controls">
        <input
          type="text"
          className="markets-search"
          placeholder="Search asset..."
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

        {loading &&
          [...Array(12)].map((_, i) => (
            <div key={i} className="markets-row">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ))}

        {!loading &&
          paginated.map((coin) => {
            const spark = coin.sparkline_in_7d?.price;

            return (
              <div
                key={coin.id}
                className="markets-row"
                onClick={() => navigate(`/coin/${coin.id}`)}
              >
                <div className="market-asset">
                  <img src={coin.image} alt={coin.symbol} />
                  <div className="asset-info">
                    <span className="asset-symbol">
                      {coin.symbol.toUpperCase()}
                    </span>
                    <span className="asset-category">
                      {coin.curated_category}
                    </span>
                  </div>
                </div>

                <div>${coin.current_price.toLocaleString()}</div>

                {/* SAFE SPARKLINE */}
                <div>
                  {spark ? (
                    <svg width="110" height="35">
                      <polyline
                        fill="none"
                        stroke={
                          spark.at(-1) - spark[0] > 0
                            ? "#00ff99"
                            : "#ff4444"
                        }
                        strokeWidth="2"
                        points={spark
                          .map((p, i) => {
                            const max = Math.max(...spark);
                            const min = Math.min(...spark);
                            const x =
                              (i / (spark.length - 1)) * 110;
                            const y =
                              35 - ((p - min) / (max - min)) * 35;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                    </svg>
                  ) : (
                    <div style={{ opacity: 0.3 }}>No chart</div>
                  )}
                </div>

                <div
                  className={
                    coin.price_change_percentage_24h >= 0
                      ? "green"
                      : "red"
                  }
                >
                  {coin.price_change_percentage_24h?.toFixed(2)}%
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
            );
          })}
      </div>

      {/* PAGINATION */}
      <div className="pagination-controls">
        <button
          className="page-btn"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>

        <span className="page-info">
          Page {page} / {totalPages}
        </span>

        <button
          className="page-btn"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}