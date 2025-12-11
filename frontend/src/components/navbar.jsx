// src/components/Navbar.jsx
import "./navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-content">

        {/* LOGO */}
        <div className="nav-logo">
          <Link to="/">CryptoFlow</Link>
        </div>

        {/* HAMBURGER (MOBILE) */}
        <div
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span><span></span><span></span>
        </div>

        {/* NAV LINKS */}
        <div className={`nav-links ${menuOpen ? "show" : ""}`}>
          {user && <Link to="/" className={isActive("/")}>Home</Link>}
          {user && <Link to="/markets" className={isActive("/markets")}>Markets</Link>}
          {user && <Link to="/wallet" className={isActive("/wallet")}>Wallet</Link>}
          {user && <Link to="/trade" className={isActive("/trade")}>Trade</Link>}
          {user && <Link to="/profile" className={isActive("/profile")}>Profile</Link>}
        </div>

        {/* AUTH */}
        {!user ? (
          <div className="nav-auth-buttons">
            <Link to="/signin" className="nav-btn">Sign In</Link>
            <Link to="/signup" className="nav-btn-outline">Sign Up</Link>
          </div>
        ) : (
          <div className="nav-user">
            <Link to="/profile">
              <img
                src={user.profile_picture || "/default-avatar.png"}
                alt="avatar"
                className="nav-avatar"
              />
            </Link>

            <button className="nav-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}

      </div>
    </nav>
  );
}