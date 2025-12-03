import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../../services/api";
import { useAuth } from "../../authContext";
import "./auth.css";

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: ""
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const res = await apiPost("/accounts/login/", form);

    if (res.error) {
      setError(res.error);
      return;
    }

    login(
      { username: res.username, email: res.email },
      res.access,
      res.refresh
    );

    navigate("/");
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Welcome back, trader.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />

          <input
            className="auth-input"
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />

          <button className="auth-btn" type="submit">
            Sign In
          </button>
        </form>

        <p className="auth-switch">
          Don’t have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}