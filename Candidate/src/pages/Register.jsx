import { useState } from "react";
import { LuUserRoundPlus } from "react-icons/lu";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerCandidate, setStoredUser, updateProfile } from "../services/candidateApi";

export default function Register() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const jobId = searchParams.get("jobId") || "";

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleResumeChange = (event) => {
    setResumeFile(event.target.files?.[0] || null);
  };

  const isValidPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.designation.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      alert("Name, designation, phone number, email, and password are required.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!isValidPhone(form.phone)) {
      alert("Enter a valid phone number with 10 to 15 digits.");
      return;
    }

    if (resumeFile) {
      if (resumeFile.type !== "application/pdf") {
        alert("Only PDF files are supported.");
        return;
      }

      if (resumeFile.size > 8 * 1024 * 1024) {
        alert("CV file size must be 8MB or less.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const designation = form.designation.trim();
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("designation", designation);
      payload.append("phone", form.phone.trim());
      payload.append("email", form.email.trim());
      payload.append("password", form.password);
      payload.append("qrToken", token);
      
      if (resumeFile) {
        payload.append("resume", resumeFile);
      }

      const response = await registerCandidate(payload);

      let syncedUser = response.user;
      let syncedProfile = response.profile;
      if (designation && !response.profile?.currentTitle) {
        try {
          const profileResponse = await updateProfile({ currentTitle: designation });
          syncedProfile = profileResponse.data || response.profile;
          syncedUser = {
            ...response.user,
            designation: response.user?.designation || designation,
          };
        } catch {
          syncedProfile = {
            ...response.profile,
            currentTitle: designation,
          };
          syncedUser = {
            ...response.user,
            designation: response.user?.designation || designation,
          };
        }
      }

      setStoredUser({
        user: syncedUser,
        profile: syncedProfile,
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
      alert(requestError.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.12)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden bg-[#163060] p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(163,230,53,0.2),_transparent_45%)]" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-lime-200">
              <LuUserRoundPlus size={14} />
              Candidate Onboarding
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight">
              Create your candidate profile once and apply faster across mapped jobs.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
              Build a secure candidate account, upload your latest resume, and
              track the entire hiring journey from a responsive web workspace.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Candidate Registration
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Register once to access QR-mapped jobs, application tracking, and
              profile history in one secure workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Your full name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Designation
                </label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={handleChange("designation")}
                  placeholder="e.g. Software Engineer"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  placeholder="+91 98765 43210"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="Create password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Upload CV
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeChange}
                  className="mt-2 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#163060] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1d3f7f] focus:border-[#163060] focus:bg-white"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Accepted format: PDF only. Max size 8MB.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  placeholder="Repeat password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#163060] focus:bg-white"
                />
              </div>



              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#163060] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3f7f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating account..." : "Create Candidate Account"}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-500">
              Already registered?{" "}
              <Link
                to={
                  token
                    ? `/login?token=${encodeURIComponent(token)}${
                        jobId ? `&jobId=${encodeURIComponent(jobId)}` : ""
                      }`
                    : "/login"
                }
                className="font-semibold text-[#163060] hover:text-lime-600"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
