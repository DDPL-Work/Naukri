import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuLock, LuMail } from "react-icons/lu";
import { loginCompany, setStoredCompanySession } from "../api/companyApi";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      const response = await loginCompany(payload);
      setStoredCompanySession({
        token: response.token,
        user: response.user,
        company: response.company,
      });

      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="company-login-shell">
      <div className="company-login-card">
        <section className="company-login-form-wrap">
          <div className="company-login-panel">
            <h1>Company Panel</h1>

            {error ? <div className="status-banner">{error}</div> : null}

            <form className="company-form-grid" onSubmit={handleSubmit}>
              <label className="company-field">
                <span>Email</span>
                <div className="company-input-wrap">
                  <LuMail size={16} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="client@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="company-field">
                <span>Password</span>
                <div className="company-input-wrap">
                  <LuLock size={16} />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              <button
                type="submit"
                className="company-primary-btn company-login-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
