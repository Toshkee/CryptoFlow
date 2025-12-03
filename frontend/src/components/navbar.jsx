// src/components/Navbar.jsx
import "./navbar.css";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../authContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <nav className="navbar">
      <div className="nav-content">
        
        <div className="nav-logo">
          <Link to="/">CryptoFlow</Link>
        </div>

        <div className="nav-links">
          <Link to="/markets" className={isActive("/markets")}>Markets</Link>

          {user && (
            <>
              <Link to="/" className={isActive("/")}>Home</Link>
              <Link to="/wallet" className={isActive("/wallet")}>Wallet</Link>
              <Link to="/trade" className={isActive("/trade")}>Trade</Link>
              <Link to="/profile" className={isActive("/profile")}>Profile</Link>
            </>
          )}
        </div>

        {!user ? (
          <div className="nav-auth-buttons">
            <Link to="/signin" className="nav-btn">Sign In</Link>
            <Link to="/signup" className="nav-btn-outline">Sign Up</Link>
          </div>
        ) : (
          <div className="nav-user">
            <Link to="/profile">
              <img
                key={user.profile_picture}
                src={user.profile_picture || "/default-avatar.png"}
                alt="avatar"
                className="nav-avatar"
              />
            </Link>

            <button
              className="nav-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}