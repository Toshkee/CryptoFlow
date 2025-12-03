import "./wallet.css";

export default function Wallet() {
  const portfolio = [
    { symbol: "BTC", name: "Bitcoin", amount: 0.54, price: 43200 },
    { symbol: "ETH", name: "Ethereum", amount: 1.8, price: 2430 },
    { symbol: "SOL", name: "Solana", amount: 12, price: 104.33 },
  ];

  const totalBalance = portfolio.reduce(
    (sum, coin) => sum + coin.amount * coin.price,
    0
  );

  return (
    <div className="wallet-container">
      <div className="wallet-content">

        {/* TOTAL BALANCE */}
        <div className="wallet-balance-card">
          <h2>Total Balance</h2>
          <h1>${totalBalance.toLocaleString()}</h1>

          <div className="wallet-actions">
            <button className="wallet-btn">Deposit</button>
            <button className="wallet-btn-outline">Withdraw</button>
          </div>
        </div>

        {/* ASSETS LIST */}
        <div className="wallet-assets">
          <h2>Your Assets</h2>

          <div className="asset-table">

            {portfolio.map((coin) => (
              <div className="asset-row" key={coin.symbol}>
                <div className="asset-left">
                  <div className="asset-icon">{coin.symbol}</div>
                  <div>
                    <p className="asset-name">{coin.name}</p>
                    <p className="asset-symbol">{coin.symbol}</p>
                  </div>
                </div>

                <div className="asset-right">
                  <p className="asset-amount">{coin.amount} {coin.symbol}</p>
                  <p className="asset-value">
                    ${(coin.amount * coin.price).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
}