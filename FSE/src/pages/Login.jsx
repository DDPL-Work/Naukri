import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { loginFSE, setStoredCrmSession } from "../api/fseApi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [zone, setZone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginFSE({ email: email.trim(), zone, password });
      setStoredCrmSession({ token: response.token, user: response.user });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell login-shell-compact">
      <div className="login-card login-card-compact">
        <div className="login-form-wrap login-form-wrap-compact">
          <h1 className="login-panel-title">FSE Panel</h1>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="fse-email">Email</label>
              <input
                id="fse-email"
                className="login-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@mavenjobs.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="fse-zone">Zone</label>
              <select
                id="fse-zone"
                className="login-input"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                style={{ appearance: "auto" }}
                required
              >
                <option value="">Select a zone</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="fse-password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="fse-password"
                  className="login-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ paddingRight: "40px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            {error ? <div className="login-error">{error}</div> : null}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
