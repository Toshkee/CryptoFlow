import { useNavigate } from "react-router-dom";
import "./homepage.css";

export default function HomePage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    const token = localStorage.getItem("access");

    if (token) {
      // Logged in → go straight to trading
      navigate("/trade");
    } else {
      // Logged out → send to sign-up (change to "/signin" if you prefer)
      navigate("/signup");
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <section className="hero">
          {/* Small intro text */}
          <p className="hero-kicker">WELCOME TO CRYPTOFLOW</p>

          {/* Main headline */}
          <h1 className="hero-title">
            The World’s Premier <br /> Crypto Trading Platform
          </h1>

          {/* Subtext under title */}
          <p className="hero-subtitle">
            Buy, sell, and trade digital assets with lightning-fast execution,
            advanced tools, and industry-leading security.
          </p>

          {/* Smaller bullet-style info lines */}
          <div className="hero-secondary">
            <p>Trade BTC, ETH, SOL and 100+ crypto</p>
            <p>Institution-grade security &amp; cold storage</p>
            <p>Low fees and a blazing-fast trade engine</p>
          </div>

          {/* CTA Button */}
          <div className="hero-cta">
            <button className="hero-primary-btn" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>

          {/* Bonus line */}
          <p className="hero-bonus">
            Sign up today and get <strong>$10,000</strong> in virtual funds to
            practice trading.
          </p>
        </section>
      </div>
    </div>
  );
}