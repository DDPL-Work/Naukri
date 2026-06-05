import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { toast } from "sonner";
import { setStoredCrmSession } from "../api/leadApi";

const resolveRootApiBaseUrl = () => {
  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!configuredBaseUrl) {
    return "http://localhost:3000/api/v1";
  }

  const normalized = configuredBaseUrl.replace(/\/+$/, "");
  const match = normalized.match(/^(.*\/api\/v1)(?:\/.*)?$/i);
  return match ? match[1] : normalized;
};

const API_BASE = resolveRootApiBaseUrl();
async function loginZonalManager({ email, zone, password }) {
  const response = await fetch(`${API_BASE}/zonal-manager/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, zone, password }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Login failed");
  }

  return payload;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [zone, setZone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !zone.trim() || !password.trim()) {
      toast.error("Email, zone, and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await loginZonalManager({
        email: email.trim(),
        zone: zone.trim(),
        password,
      });

      setStoredCrmSession({ token: response.token, user: response.user });
      navigate("/", { replace: true });
    } catch (requestError) {
      toast.error(requestError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="login-shell login-shell-compact">
      <div className="login-card login-card-compact">
        <div className="login-form-wrap login-form-wrap-compact">
          <h1 className="login-panel-title">Zonal Manager Panel</h1>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label" htmlFor="zm-email">
                Email address
              </label>
              <input
                id="zm-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@mavenjobs.com"
                className="login-input"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="zm-zone">
                Zone
              </label>
              <select
                id="zm-zone"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                className="login-input"
                style={{ appearance: "auto" }}
              >
                <option value="" disabled>
                  Select a zone
                </option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="zm-password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="zm-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="login-input"
                  autoComplete="current-password"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
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

            <button type="submit" disabled={isSubmitting} className="login-btn">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
            <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.875rem", color: "#475569", fontWeight: "500" }}>
              Zonal Manager accounts are created by National Sales Head.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
