import { useCallback, useEffect, useState } from "react";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBriefcaseBusiness,
  LuBuilding2,
  LuCalendarClock,
  LuMapPin,
  LuUsers,
} from "react-icons/lu";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PanelCard, PageState, SectionHeading } from "../components/Ui";
import { formatDate } from "../utils/formatters";
import {
  createApplication,
  getLandingData,
  getStoredUser,
} from "../services/candidateApi";

export default function LandingPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    error: "",
    payload: null,
  });
  const [applyState, setApplyState] = useState({
    loadingId: "",
    success: "",
    error: "",
  });
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [autoApplied, setAutoApplied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadLanding = async () => {
      try {
        const response = await getLandingData(token);

        if (isMounted) {
          setState({
            loading: false,
            error: "",
            payload: response.data,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            loading: false,
            error: error.message || "Unable to load landing data.",
            payload: null,
          });
        }
      }
    };

    loadLanding();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const jobs = Array.isArray(state.payload?.jobs) ? state.payload.jobs : [];
  const company = state.payload?.company;
  const hasSession = Boolean(getStoredUser());
  const focusedJobId = (searchParams.get("jobId") || "").trim();
  const autoApplyJobId = (searchParams.get("applyJobId") || "").trim();
  const visibleJobs = focusedJobId
    ? jobs.filter((job) => String(job.id) === focusedJobId)
    : jobs;

  const handleApply = useCallback(
    async (jobId, { auto = false } = {}) => {
      if (!jobId) return;

      if (!hasSession) {
        const query = new URLSearchParams();
        query.set("token", token);
        query.set("jobId", jobId);
        query.set("applyJobId", jobId);
        navigate(`/login?${query.toString()}`);
        return;
      }

      setApplyState({ loadingId: jobId, success: "", error: "" });

      try {
        await createApplication({
          jobId,
          qrToken: token,
        });

        setAppliedJobs((current) => {
          const next = new Set(current);
          next.add(jobId);
          return next;
        });
        setApplyState({
          loadingId: "",
          success: auto
            ? "Application submitted automatically after sign-in."
            : "Application submitted successfully.",
          error: "",
        });
      } catch (error) {
        setApplyState({
          loadingId: "",
          success: "",
          error: error.message || "Unable to submit application.",
        });
      }
    },
    [hasSession, navigate, token],
  );

  useEffect(() => {
    if (!hasSession || !autoApplyJobId || autoApplied || !jobs.length) {
      return;
    }

    if (!jobs.some((job) => String(job.id) === autoApplyJobId)) {
      return;
    }

    setAutoApplied(true);
    handleApply(autoApplyJobId, { auto: true });
  }, [autoApplyJobId, autoApplied, handleApply, hasSession, jobs]);

  if (state.loading) {
    return (
      <PageState
        title="Loading company jobs"
        description="Fetching the mapped company profile and active jobs from this QR code."
      />
    );
  }

  if (state.error || !state.payload) {
    return (
      <PageState
        title="QR landing unavailable"
        description={state.error || "This QR code is invalid or expired."}
        error
      />
    );
  }

  const continueToJobs = (jobId = "") => {
    const query = new URLSearchParams();
    query.set("token", token);
    if (jobId) query.set("jobId", jobId);

    navigate(
      hasSession
        ? `/candidate/jobs?${query.toString()}`
        : `/login?${query.toString()}`,
    );
  };

  const signIn = () => {
    const query = new URLSearchParams();
    query.set("token", token);
    if (focusedJobId) query.set("jobId", focusedJobId);
    navigate(`/login?${query.toString()}`);
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] bg-[#163060] text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-lime-200">
                <LuBadgeCheck size={14} />
                QR Mapped Hiring
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
                {company.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
                {company.tagline || company.about || "Explore currently mapped openings and continue your application journey."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2">
                  <LuBuilding2 size={16} />
                  {company.industry || "Hiring"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2">
                  <LuUsers size={16} />
                  {company.employeesCount || company.companySize || "Growing team"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2">
                  <LuMapPin size={16} />
                  {company.location?.city || company.headquarters || "India"}
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() =>
                    focusedJobId ? handleApply(focusedJobId) : continueToJobs()
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-300"
                >
                  {hasSession
                    ? focusedJobId
                      ? "Apply to this job"
                      : "Open mapped jobs"
                    : focusedJobId
                      ? "Sign in to apply"
                      : "Sign in to apply"}
                  <LuArrowRight size={16} />
                </button>
                <button
                  onClick={signIn}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-lime-300/30 hover:bg-lime-300/10"
                >
                  Sign in
                </button>
              </div>
            </div>

            <PanelCard className="border-white/10 bg-white/10 text-white shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-200">
                Why this QR matters
              </p>
              <div className="mt-5 space-y-4 text-sm leading-6 text-slate-100">
                <p>This QR is already mapped to active hiring demand from this company.</p>
                <p>Register once, upload your resume, and apply across similar openings without repeating details.</p>
                <p>Track status updates and candidate alerts from the same web workspace.</p>
              </div>
            </PanelCard>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <PanelCard>
            <SectionHeading
              eyebrow="Mapped Jobs"
              title="Open roles available from this company QR"
              description="Only active, approved openings connected to this QR are shown here."
            />

            {applyState.error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {applyState.error}
              </div>
            ) : null}
            {applyState.success ? (
              <div className="mt-4 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-medium text-lime-800">
                {applyState.success}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {visibleJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-lime-300 hover:bg-white hover:shadow-[0_20px_50px_rgba(132,204,22,0.12)]"
                >
                  <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <p className="flex items-center gap-2">
                      <LuMapPin size={16} />
                      {job.location || "Location shared after screening"}
                    </p>
                    <p className="flex items-center gap-2">
                      <LuBriefcaseBusiness size={16} />
                      {job.department || "General"} | {job.jobType || "Full time"}
                    </p>
                    <p className="flex items-center gap-2">
                      <LuCalendarClock size={16} />
                      {job.deadline ? `Apply by ${formatDate(job.deadline)}` : "Applications open"}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {job.description || "Role summary will be available after you enter the Candidate Module."}
                  </p>
                  <button
                    onClick={() => handleApply(String(job.id))}
                    disabled={
                      applyState.loadingId === String(job.id) ||
                      appliedJobs.has(String(job.id))
                    }
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#163060] transition hover:text-lime-600 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {appliedJobs.has(String(job.id))
                      ? "Applied"
                      : applyState.loadingId === String(job.id)
                        ? "Applying..."
                        : "Apply now"}
                    <LuArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          </PanelCard>

          <div className="space-y-6">
            <PanelCard>
              <SectionHeading
                eyebrow="About Company"
                title="Hiring context"
                description={company.about || "This company is actively using Maven Jobs for QR-led hiring."}
              />
            </PanelCard>

            <PanelCard>
              <SectionHeading
                eyebrow="Why Join"
                title="Candidate-ready experience"
                description="Responsive web journey designed for browser, Android, and iOS access."
              />
              <div className="mt-5 grid gap-3">
                {(company.whyJoinUs || []).slice(0, 4).map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 leading-6">{item.desc}</p>
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>
        </section>
      </div>
    </div>
  );
}
