// frontend/src/pages/Wallet.jsx (or wherever it lives)
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "/src/services/api";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { alertError, alertSuccess } from "/src/utils/alert.js";
import "./wallet.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [assetValue, setAssetValue] = useState(0);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // deposit / withdraw
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // sell
  const [showSell, setShowSell] = useState(false);
  const [sellAsset, setSellAsset] = useState(null);
  const [sellAmount, setSellAmount] = useState("");

  // convert
  const [showConvert, setShowConvert] = useState(false);
  const [convertFrom, setConvertFrom] = useState(null);
  const [convertTo, setConvertTo] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [convertPreview, setConvertPreview] = useState(null);

  // ---------------- LOAD WALLET ----------------
  const loadWallet = async () => {
    const data = await apiGet("/markets/wallet/");

    if (!data.error) {
      setBalance(Number(data.balance) || 0);
      setAssetValue(Number(data.total_asset_value) || 0);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWallet();
  }, []);

  // ---------------- DEPOSIT ----------------
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(depositAmount)) return;

    const res = await apiPost("/markets/wallet/deposit/", {
      amount: depositAmount,
    });

    if (res.error) {
      alertError("Deposit failed", res.error);
      return;
    }

    alertSuccess("Deposit successful", `New balance: $${res.balance}`);
    setDepositAmount("");
    setShowDeposit(false);
    loadWallet();
  };

  // ---------------- WITHDRAW ----------------
  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount)) return;

    const res = await apiPost("/markets/wallet/withdraw/", {
      amount: withdrawAmount,
    });

    if (res.error) {
      alertError("Withdrawal failed", res.error);
      return;
    }

    alertSuccess("Withdrawal successful", `New balance: $${res.balance}`);
    setWithdrawAmount("");
    setShowWithdraw(false);
    loadWallet();
  };

  // ---------------- SELL ----------------
  const handleOpenSell = (asset) => {
    setSellAsset(asset);
    setSellAmount("");
    setShowSell(true);
  };

  const handleSell = async () => {
    if (!sellAsset || !sellAmount || isNaN(sellAmount)) return;

    const res = await apiPost("/markets/wallet/sell/", {
      coin_id: sellAsset.coin_id,
      amount: sellAmount,
      price: sellAsset.live_price, // backend uses this as USD price
    });

    if (res.error) {
      alertError("Sell Failed", res.error);
      return;
    }

    alertSuccess("Sale Complete", `Returned $${Number(res.returned).toFixed(2)}`);
    setShowSell(false);
    setSellAsset(null);
    setSellAmount("");
    loadWallet();
  };

  // ---------------- CONVERT PREVIEW ----------------
  const handleConvertPreview = async () => {
    if (!convertFrom || !convertTo || !convertAmount) return;

    const data = await apiGet(
      `/markets/convert-preview/?from=${convertFrom.coin_id}&to=${convertTo}&amount=${convertAmount}`
    );

    if (data.error) {
      alertError("Preview failed", data.error);
      return;
    }

    setConvertPreview(data);
  };

  // ---------------- CONVERT ----------------
  const handleConvert = async () => {
    if (!convertFrom || !convertTo || !convertAmount) return;

    const res = await apiPost("/markets/wallet/convert/", {
      from_coin: convertFrom.coin_id,
      to_coin: convertTo,
      amount: convertAmount,
    });

    if (res.error) {
      alertError("Conversion Failed", res.error);
      return;
    }

    alertSuccess("Conversion Complete", res.message || "Done");
    setShowConvert(false);
    setConvertFrom(null);
    setConvertTo("");
    setConvertAmount("");
    setConvertPreview(null);
    loadWallet();
  };

  // ---------------- CHART ----------------
  const pieData = {
    labels: assets.map((a) => a.symbol.toUpperCase()),
    datasets: [
      {
        data: assets.map((a) => Number(a.usd_value)),
        backgroundColor: [
          "#00ff9a",
          "#00c8ff",
          "#ff7b00",
          "#ff3c7b",
          "#9b59ff",
          "#ffe600",
        ],
        borderColor: "#0d0d0d",
        borderWidth: 2,
      },
    ],
  };

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className="wallet-container">
        <div className="wallet-content">
          <div className="wallet-skeleton-card shimmer" />
          <div className="wallet-skeleton-asset shimmer" />
          <div className="wallet-skeleton-asset shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <div className="wallet-content">
        {/* BALANCE CARD */}
        <div className="wallet-balance-card">
          <h2>Total Spot Balance</h2>
          <h1>${balance.toLocaleString()}</h1>

          <div className="wallet-asset-value">
            <p>Your crypto value:</p>
            <h3>${assetValue.toLocaleString()}</h3>
          </div>

          {assets.length > 0 && (
            <div className="wallet-chart-box">
              <Pie data={pieData} />
            </div>
          )}

          <div className="wallet-actions">
            <button
              className="wallet-btn-outline"
              onClick={() => setShowDeposit(true)}
            >
              Deposit
            </button>
            <button
              className="wallet-btn-outline"
              onClick={() => setShowWithdraw(true)}
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* ASSETS */}
        <h2>Your Assets</h2>

        {assets.length === 0 ? (
          <p className="wallet-no-assets">No assets yet.</p>
        ) : (
          <div className="asset-table">
            {assets.map((a) => (
              <div key={a.coin_id} className="asset-row">
                <div className="asset-left">
                  <div className="asset-icon">{a.symbol.toUpperCase()}</div>

                  <div className="asset-info">
                    <p>{a.symbol.toUpperCase()}</p>
                    <p>
                      {Number(a.amount).toLocaleString()}{" "}
                      {a.symbol.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="asset-right">
                  <p className="amount">
                    ${Number(a.usd_value).toLocaleString()}
                  </p>
                  <p className="avg-price">
                    Avg Price: ${Number(a.avg_price).toLocaleString()}
                  </p>

                  <div className="wallet-asset-buttons">
                    <button
                      className="sell-btn"
                      onClick={() => handleOpenSell(a)}
                    >
                      Sell
                    </button>
                    <button
                      className="convert-btn"
                      onClick={() => {
                        setConvertFrom(a);
                        setShowConvert(true);
                        setConvertTo("");
                        setConvertAmount("");
                        setConvertPreview(null);
                      }}
                    >
                      Convert
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------- DEPOSIT MODAL ------- */}
      {showDeposit && (
        <div className="modal-bg">
          <div className="modal">
            <h2>Deposit Funds</h2>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount"
            />
            <button className="modal-confirm" onClick={handleDeposit}>
              Confirm Deposit
            </button>
            <button
              className="modal-cancel"
              onClick={() => setShowDeposit(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ------- WITHDRAW MODAL ------- */}
      {showWithdraw && (
        <div className="modal-bg">
          <div className="modal">
            <h2>Withdraw Funds</h2>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount"
            />
            <button className="modal-confirm" onClick={handleWithdraw}>
              Confirm Withdrawal
            </button>
            <button
              className="modal-cancel"
              onClick={() => setShowWithdraw(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ------- SELL MODAL ------- */}
      {showSell && sellAsset && (
        <div className="modal-bg">
          <div className="modal">
            <h2>Sell {sellAsset.symbol.toUpperCase()}</h2>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="Amount of coin"
            />
            <button className="modal-confirm" onClick={handleSell}>
              Confirm Sale
            </button>
            <button
              className="modal-cancel"
              onClick={() => setShowSell(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ------- CONVERT MODAL ------- */}
      {showConvert && convertFrom && (
        <div className="modal-bg">
          <div className="modal">
            <h2>Convert {convertFrom.symbol.toUpperCase()}</h2>

            <select
              value={convertTo}
              onChange={(e) => {
                setConvertTo(e.target.value);
                setConvertPreview(null);
              }}
            >
              <option value="">Select coin</option>
              {assets.map((x) =>
                x.coin_id !== convertFrom.coin_id ? (
                  <option value={x.coin_id} key={x.coin_id}>
                    {x.symbol.toUpperCase()}
                  </option>
                ) : null
              )}
            </select>

            <input
              type="number"
              placeholder="Amount to convert"
              value={convertAmount}
              onChange={(e) => {
                setConvertAmount(e.target.value);
                setConvertPreview(null);
              }}
            />

            {convertAmount && convertTo && (
              <button
                className="wallet-btn-outline convert-preview-btn"
                onClick={handleConvertPreview}
              >
                Preview Conversion
              </button>
            )}

            {convertPreview && (
              <p className="convert-preview-text">
                {convertAmount} {convertFrom.symbol.toUpperCase()} ={" "}
                {Number(convertPreview.to_amount).toFixed(6)}{" "}
                {convertPreview.to_symbol.toUpperCase()}
              </p>
            )}

            <button className="modal-confirm" onClick={handleConvert}>
              Convert
            </button>
            <button
              className="modal-cancel"
              onClick={() => setShowConvert(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}