// src/App.jsx
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar";
import Footer from "./components/footer";

import HomePage from "./pages/homepage.jsx";
import Markets from "./pages/markets/markets.jsx";
import Trade from "./pages/trade/trade.jsx";
import Profile from "./pages/profile/profile.jsx";
import SignIn from "./pages/auth/signin.jsx";
import SignUp from "./pages/auth/signup.jsx";
import Wallet from "./pages/wallet/wallet.jsx";
import "chartjs-adapter-date-fns";

import CoinDetail from "./pages/coinDetails.jsx";
import "./styles/variables.css";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/markets" element={<Markets />} />
        <Route
          path="/coin/:coin_id"
          element={<CoinDetail key={window.location.pathname} />}
        />
        <Route path="/trade" element={<Trade />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>

      <Footer />
    </>
  );
}

