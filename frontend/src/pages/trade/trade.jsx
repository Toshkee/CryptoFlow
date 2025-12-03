import "./trade.css";

export default function Trade() {
  return (
    <div className="trade-page">

      <aside className="markets-sidebar">
        <h2>Markets</h2>

        <div className="market-item">
          <span>BTC/USDT</span>
          <span>$43,200</span>
        </div>

        <div className="market-item">
          <span>ETH/USDT</span>
          <span>$2,430</span>
        </div>

        <div className="market-item">
          <span>SOL/USDT</span>
          <span>$104.33</span>
        </div>

        <div className="market-item">
          <span>XRP/USDT</span>
          <span>$0.58</span>
        </div>

      </aside>

      
      <div className="trade-center">

        {/* Chart container */}
        <div className="chart-box">
          <h3>BTC/USDT</h3>
          <div className="chart-placeholder">
            <span>Chart Coming Soon</span>
          </div>
        </div>

        {/* Right Panel */}
        <div className="trade-right">

          {/* ORDERBOOK */}
          <div className="orderbook-box">
            <h3>Order Book</h3>

            <div className="orderbook-row red">
              <span>43,215</span>
              <span>0.41 BTC</span>
            </div>
            <div className="orderbook-row red">
              <span>43,210</span>
              <span>0.12 BTC</span>
            </div>
            <div className="orderbook-row green">
              <span>43,205</span>
              <span>0.25 BTC</span>
            </div>
            <div className="orderbook-row green">
              <span>43,202</span>
              <span>0.38 BTC</span>
            </div>

          </div>

          
          <div className="trades-box">
            <h3>Recent Trades</h3>

            <div className="trade-feed green">
              <span>+ 43,201</span>
              <span>0.041 BTC</span>
            </div>

            <div className="trade-feed red">
              <span>- 43,198</span>
              <span>0.083 BTC</span>
            </div>

            <div className="trade-feed green">
              <span>+ 43,203</span>
              <span>0.013 BTC</span>
            </div>

          </div>

        </div>

        
        <div className="trade-panel">

          <div className="bs-toggle">
            <button className="buy-btn">Buy</button>
            <button className="sell-btn">Sell</button>
          </div>

          <div className="trade-input-box">
            <label>Price</label>
            <input type="number" placeholder="Market" />
          </div>

          <div className="trade-input-box">
            <label>Amount</label>
            <input type="number" placeholder="0.0" />
          </div>

          <button className="confirm-btn">Confirm Order</button>

        </div>
      </div>

    </div>
  );
}