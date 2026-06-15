import { useState } from "react";
import { LuBriefcaseBusiness } from "react-icons/lu";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginCandidate, setStoredUser } from "../services/candidateApi";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const jobId = searchParams.get("jobId") || "";

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await loginCandidate({
        email: email.trim(),
        password,
      });

      setStoredUser({
        user: response.user,
        profile: response.profile,
      });

      if (token) {
        const query = new URLSearchParams();
        if (jobId) {
          query.set("jobId", jobId);
          query.set("applyJobId", jobId);
        }

        const queryString = query.toString();
        navigate(
          `/landing/${encodeURIComponent(token)}${queryString ? `?${queryString}` : ""}`,
          { replace: true },
        );
      } else {
        navigate("/candidate/dashboard", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] sm:p-10">
        <div className="mx-auto w-full text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Candidate Access
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            Sign in to Candidate Module
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="candidate@mavenjobs.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#163060] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3f7f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Continue to Candidate Dashboard"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-500">
            New candidate?{" "}
            <Link
              to={
                token
                  ? `/register?token=${encodeURIComponent(token)}${
                      jobId ? `&jobId=${encodeURIComponent(jobId)}` : ""
                    }`
                  : "/register"
              }
              className="font-semibold text-[#163060] hover:text-lime-600"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
