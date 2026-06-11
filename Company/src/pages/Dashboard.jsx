import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowRight,
  LuBellRing,
  LuBriefcaseBusiness,
  LuExternalLink,
  LuFileText,
  LuHeart,
  LuMapPin,
  LuQrCode,
  LuRepeat2,
  LuShieldAlert,
  LuUsers,
  LuChevronRight,
  LuSparkles,
} from "react-icons/lu";
import {
  createCompanyPackageChangeRequest,
  fetchCompanyDashboard,
  previewCompanyApplicationResume,
} from "../api/companyApi";

const APPLICATIONS_PER_PAGE = 5;

const fallbackPackageCards = [
  {
    key: "STANDARD",
    name: "Standard",
    posts: 5,
    description: "Starter package for focused hiring and foundational growth.",
  },
  {
    key: "PREMIUM",
    name: "Premium",
    posts: 10,
    description: "Balanced plan for companies managing active and recurring openings.",
  },
  {
    key: "ELITE",
    name: "Elite",
    posts: 20,
    description: "High-capacity package for scale hiring across teams and locations.",
  },
];

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getApplicationClass = (value = "") => {
  const normalized = String(value || "").toLowerCase();
  if (
    [
      "applied",
      "screening",
      "shortlisted",
      "interview",
      "offered",
      "hired",
      "rejected",
    ].includes(normalized)
  ) {
    return `app-status-${normalized}`;
  }
  return "app-status-default";
};

const getApprovalTone = (value = "") => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "approved") {
    return "is-success";
  }
  if (normalized === "rejected") {
    return "is-danger";
  }
  return "is-warning";
};

const formatPackageRequestStatus = (value = "") => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "APPROVED") {
    return "is-success";
  }
  if (normalized === "REJECTED" || normalized === "CANCELLED") {
    return "is-danger";
  }
  return "is-warning";
};

const toTitleCase = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [resumeBusyId, setResumeBusyId] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [applicationPage, setApplicationPage] = useState(1);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageTarget, setPackageTarget] = useState("");
  const [packageReason, setPackageReason] = useState("");
  const [packageActionError, setPackageActionError] = useState("");
  const [packageActionNote, setPackageActionNote] = useState("");
  const [isSubmittingPackageRequest, setIsSubmittingPackageRequest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchCompanyDashboard();
        if (isMounted) {
          setDashboard(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError?.response?.data?.message || "Unable to load dashboard");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

const company = dashboard?.company || {};
  const tracking = dashboard?.tracking || {};
  const packageChange = dashboard?.packageChange || {};
  const activePackageRequest = packageChange?.activeRequest || null;
  const followers = Array.isArray(dashboard?.followers) ? dashboard.followers : [];
  const packageCatalog = Array.isArray(dashboard?.packageCatalog) ? dashboard.packageCatalog : [];
  const packageCatalogForRequests = packageCatalog.length
    ? packageCatalog
    : fallbackPackageCards.map((item) => ({
        name: item.key,
        jobLimit: item.posts,
      }));

  const availablePackageTargets = useMemo(() => {
    const currentPackage = String(company.packageType || "").toUpperCase();
    return packageCatalogForRequests
      .filter((item) => String(item?.name || "").toUpperCase() !== currentPackage)
      .map((item) => ({
        value: String(item.name || "").toUpperCase(),
        label: `${String(item.name || "")
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase())} (${Number(item.jobLimit || 0)} posts)`,
      }));
  }, [company.packageType, packageCatalogForRequests]);

  const metrics = useMemo(
    () => [
      {
        label: "Applications",
        value: Number(tracking.totalApplications || 0),
        icon: LuUsers,
        tone: "lime",
      },
      {
        label: "Active jobs",
        value: Number(tracking.activeApprovedJobs || 0),
        icon: LuQrCode,
        tone: "emerald",
      },
      {
        label: "Followers",
        value: Number(tracking.followers || 0),
        icon: LuHeart,
        tone: "red",
      },
    ],
    [tracking],
  );

  const pendingJobs = useMemo(
    () => (dashboard?.jobs || []).filter((job) => job.approvalStatus === "PENDING").slice(0, 4),
    [dashboard],
  );

  const packageCards = useMemo(() => {
    const catalog = Array.isArray(dashboard?.packageCatalog) ? dashboard.packageCatalog : [];
    if (!catalog.length) {
      return fallbackPackageCards;
    }

    return catalog.map((pkg) => {
      const packageKey = String(pkg?.name || "STANDARD").toUpperCase();
      return {
        key: packageKey,
        name: toTitleCase(packageKey),
        posts: Number(pkg?.jobLimit || 0),
        description: String(pkg?.description || "").trim() || "Configured posting package.",
      };
    });
  }, [dashboard?.packageCatalog]);

  const recentJobs = useMemo(() => (dashboard?.jobs || []).slice(0, 6), [dashboard]);
  const allApplications = useMemo(() => dashboard?.applications || [], [dashboard]);

  const totalApplicationPages = useMemo(() => {
    if (!allApplications.length) {
      return 1;
    }

    return Math.ceil(allApplications.length / APPLICATIONS_PER_PAGE);
  }, [allApplications.length]);

  const pagedApplications = useMemo(() => {
    const startIndex = (applicationPage - 1) * APPLICATIONS_PER_PAGE;
    const endIndex = startIndex + APPLICATIONS_PER_PAGE;
    return allApplications.slice(startIndex, endIndex);
  }, [allApplications, applicationPage]);

  useEffect(() => {
    setApplicationPage((current) => {
      if (!allApplications.length) {
        return 1;
      }

      return Math.min(current, totalApplicationPages);
    });
  }, [allApplications.length, totalApplicationPages]);

  useEffect(() => {
    if (!availablePackageTargets.length) {
      setPackageTarget("");
      return;
    }

    setPackageTarget((current) => {
      if (current && availablePackageTargets.some((item) => item.value === current)) {
        return current;
      }
      return availablePackageTargets[0].value;
    });
  }, [availablePackageTargets]);

  const utilization = useMemo(() => {
    const active = Number(company.activeJobCount || 0);
    const limit = Number(company.jobLimit || 0);
    const safeLimit = limit > 0 ? limit : 1;
    return Math.min(100, Math.round((active / safeLimit) * 100));
  }, [company.activeJobCount, company.jobLimit]);

  const handleOpenResume = async (application) => {
    const applicationId = String(application?.id || "").trim();
    if (!applicationId) {
      return;
    }

    setResumeError("");
    setResumeBusyId(applicationId);

    try {
      const resumeBlob = await previewCompanyApplicationResume(applicationId);
      const blobUrl = window.URL.createObjectURL(resumeBlob);
      const openedWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 120000);
    } catch (requestError) {
      setResumeError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to open resume preview.",
      );
    } finally {
      setResumeBusyId("");
    }
  };

  const handleSubmitPackageChangeRequest = async (event) => {
    event.preventDefault();
    if (!packageTarget) {
      setPackageActionError("Please select a target package.");
      return;
    }

    setPackageActionError("");
    setPackageActionNote("");
    setIsSubmittingPackageRequest(true);

    try {
      const response = await createCompanyPackageChangeRequest({
        packageType: packageTarget,
        reason: packageReason,
      });
      setPackageActionNote(response?.message || "Package change request submitted.");
      setPackageReason("");
      setIsPackageModalOpen(false);

      const refreshed = await fetchCompanyDashboard();
      setDashboard(refreshed);
    } catch (requestError) {
      setPackageActionError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to submit package change request.",
      );
    } finally {
      setIsSubmittingPackageRequest(false);
    }
  };

  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="company-page-state">
        <div className="company-panel-card">
          <h2>Loading company dashboard...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-page-state">
        <div className="status-banner">{error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="company-page-state">
        <div className="company-panel-card">
          <h2>No dashboard data available.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="company-dashboard">
      <nav className="company-tabs-nav">
        <button
          className={`company-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Main Dashboard
        </button>
        <button
          className={`company-tab-btn ${activeTab === "hiring" ? "active" : ""}`}
          onClick={() => setActiveTab("hiring")}
        >
          CV History
        </button>
        <button
          className={`company-tab-btn ${activeTab === "packages" ? "active" : ""}`}
          onClick={() => setActiveTab("packages")}
        >
          Upgrade Package
        </button>
        <button
          className={`company-tab-btn ${activeTab === "followers" ? "active" : ""}`}
          onClick={() => setActiveTab("followers")}
        >
          Followers
        </button>
        </nav>

      {packageActionNote ? <div className="status-banner success-banner">{packageActionNote}</div> : null}
      {packageActionError ? <div className="status-banner">{packageActionError}</div> : null}

      {activeTab === "overview" && (
        <div className="company-stack-y company-fade-in company-overview-layout">
          <section className="company-metric-grid">
            {metrics.map((metric) => (
              <article key={metric.label} className="company-metric-card">
                <div className="company-metric-head">
                  <p>{metric.label}</p>
                  <span className={`company-metric-icon tone-${metric.tone || "blue"}`}>
                    <metric.icon size={20} />
                  </span>
                </div>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="company-main-grid company-main-grid-modern">
            <article className="company-panel-card">
              <div className="company-section-head">
                <h2 className="company-section-title">Approval and hiring signals</h2>
              </div>

              <div className="company-output-stack">
                <div className="company-output-card">
                  <div>
                    <p>Overflow requests</p>
                    <strong>{Number(tracking.packageOverflowRequests || 0)}</strong>
                  </div>
                  <span className="company-output-icon tone-blue">
                    <LuBellRing size={20} />
                  </span>
                </div>

                <div className="company-output-card">
                  <div>
                    <p>Total jobs posted</p>
                    <strong>{Number(tracking.totalJobs || 0)}</strong>
                  </div>
                  <span className="company-output-icon tone-emerald">
                    <LuShieldAlert size={20} />
                  </span>
                </div>
              </div>

              <div className="company-feed-list">
                {pendingJobs.length ? (
                  pendingJobs.map((job) => (
                    <div key={job.id} className="company-feed-item">
                      <div>
                        <p className="company-feed-title">{job.title || "-"}</p>
                        <p className="company-feed-copy">
                          <LuMapPin size={14} /> {job.location || "Location pending"}
                        </p>
                        <p className="company-feed-meta">
                          Updated {job.lastUpdated || "-"}
                          {job.requiresPackageOverride ? " | Package overflow request" : ""}
                        </p>
                      </div>
                      <span className="company-status-badge is-warning">
                        {job.approvalStatus || "PENDING"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="company-empty-copy">No pending approvals.</p>
                )}
              </div>
            </article>

            <article className="company-panel-card">
              <div className="company-section-head">
                <h2 className="company-section-title">Quick Actions</h2>
              </div>
              <div className="mt-6 flex flex-col gap-4">
                <Link
                  to="/create-job"
                  className="company-primary-btn w-full justify-center text-center"
                  style={{ padding: "14px" }}
                >
                  Post a New Role
                  <LuArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  className="company-secondary-btn w-full justify-center"
                  style={{ padding: "14px" }}
                  onClick={() => setIsPackageModalOpen(true)}
                  disabled={Boolean(activePackageRequest) || !availablePackageTargets.length}
                >
                  <LuRepeat2 size={18} />
                  Change Package
                </button>
              </div>
            </article>
          </section>
        </div>
      )}

      {activeTab === "hiring" && (
        <div className="company-stack-y company-fade-in">
          <section className="company-panel-card">
            <div className="company-section-head">
              <h2 className="company-section-title">Candidate application directory</h2>
            </div>
            {resumeError ? <div className="status-banner">{resumeError}</div> : null}
            <div className="company-jobs-table-wrap">
              <table className="company-jobs-table company-applications-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Applied role</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>Applied on</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedApplications.length ? (
                    pagedApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <p className="company-table-main">
                            {application.candidateName || "Candidate"}
                          </p>
                          <p className="company-table-sub">
                            {application.candidateCurrentTitle || "Role not set"}
                          </p>
                        </td>
                        <td>
                          <p className="company-table-main">
                            <LuFileText size={14} /> {application.jobTitle || "Job not found"}
                          </p>
                        </td>
                        <td>
                          <span
                            className={`company-application-chip ${getApplicationClass(
                              application.status,
                            )}`}
                          >
                            {application.status || "APPLIED"}
                          </span>
                        </td>
                        <td>
                          <p className="company-table-sub">{application.candidateEmail || "-"}</p>
                          <p className="company-table-sub">{application.candidatePhone || "-"}</p>
                        </td>
                        <td>{formatDate(application.appliedAt)}</td>
                        <td>
                          {application.resumeUrl || application.resumeFileName ? (
                            <button
                              type="button"
                              className="company-resume-link"
                              onClick={() => handleOpenResume(application)}
                              disabled={resumeBusyId === application.id}
                            >
                              {resumeBusyId === application.id ? "Opening..." : "Open resume"}
                              <LuExternalLink size={13} />
                            </button>
                          ) : (
                            <span className="company-table-sub">Not uploaded</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="company-empty-cell">
                        No applications received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {allApplications.length ? (
              <div className="company-pagination-row">
                <p className="company-pagination-meta">
                  Showing{" "}
                  <strong>
                    {(applicationPage - 1) * APPLICATIONS_PER_PAGE + 1}
                    {"-"}
                    {Math.min(applicationPage * APPLICATIONS_PER_PAGE, allApplications.length)}
                  </strong>{" "}
                  of <strong>{allApplications.length}</strong> candidates
                </p>
                <div className="company-pagination-controls">
                  <button
                    type="button"
                    className="company-page-btn"
                    onClick={() => setApplicationPage((current) => Math.max(1, current - 1))}
                    disabled={applicationPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalApplicationPages }, (_, index) => index + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`company-page-btn ${
                          applicationPage === pageNumber ? "active" : ""
                        }`}
                        onClick={() => setApplicationPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className="company-page-btn"
                    onClick={() =>
                      setApplicationPage((current) => Math.min(totalApplicationPages, current + 1))
                    }
                    disabled={applicationPage === totalApplicationPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="company-panel-card">
            <div className="company-section-head">
              <h2 className="company-section-title">Job Openings Overview</h2>
            </div>
            <div className="company-jobs-table-wrap">
              <table className="company-jobs-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Applicants</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.length ? (
                    recentJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <p className="company-table-main">{job.title || "Untitled job"}</p>
                          <p className="company-table-sub">
                            {job.department || "General"} | {job.location || "Location pending"}
                          </p>
                        </td>
                        <td>
                          <span
                            className={`company-status-badge ${getApprovalTone(
                              job.approvalStatus,
                            )}`}
                          >
                            {job.approvalStatus || "PENDING"}
                          </span>
                        </td>
                        <td>{Number(job.applicantCount || 0)}</td>
                        <td>{job.lastUpdated || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="company-empty-cell">
                        No jobs posted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === "packages" && (
        <div className="company-stack-y company-fade-in">
          <section className="company-main-grid company-main-grid-modern">
            <article className="company-panel-card">
              <div className="company-section-head">
                <h2 className="company-section-title">Packages Available</h2>
              </div>
              
              <div className="mt-6">
                {company.packageType?.toUpperCase() === 'ELITE' ? (
                  <div className="bg-highest-plan">
                    🎉 You are on the highest plan! Enjoy your scales.
                  </div>
                ) : (
                  <div className="company-stack-y-sm">
                    <p className="company-hero-side-label">Recommended Upgrades</p>
                    <div className="plan-upgrade-path">
                      <span className={`plan-badge plan-badge-${company.packageType?.toLowerCase()}`}>
                        {company.packageType}
                      </span>
                      <LuChevronRight className="upgrade-arrow" />
                      {company.packageType?.toUpperCase() === 'STANDARD' ? (
                        <>
                          <span className="plan-badge plan-badge-premium">PREMIUM</span>
                          <LuChevronRight className="upgrade-arrow" />
                          <span className="plan-badge plan-badge-elite">ELITE</span>
                        </>
                      ) : (
                        <span className="plan-badge plan-badge-elite">ELITE</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="company-package-grid company-package-grid-modern mt-8">
                {packageCards.map((item) => {
                  const isActive = String(company.packageType || "").toUpperCase() === item.key;
                  return (
                    <div
                      key={item.name}
                      className={`company-package-card ${
                        isActive ? "company-package-card-active" : ""
                      }`}
                      style={isActive ? { borderColor: item.key === 'ELITE' ? '#ddd6fe' : item.key === 'PREMIUM' ? '#bfdbfe' : '#fef08a', borderWidth: '2px' } : {}}
                    >
                      <div className="company-package-top">
                        <span className={`plan-badge plan-badge-${item.key.toLowerCase()}`}>{item.name}</span>
                        <span className="company-badge">{item.posts} posts</span>
                      </div>
                      <p>{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="company-panel-card">
              <div className="company-section-head">
                <h2 className="company-section-title">Current Utilization</h2>
              </div>
              <div className="mt-8">
                <p className="company-hero-side-label">SLOT USAGE</p>
                <p className="company-hero-side-value">
                  {Number(company.activeJobCount || 0)} / {Number(company.jobLimit || 0)} jobs
                </p>
                <div className="company-progress-track">
                  <span className="company-progress-fill" style={{ width: `${utilization}%` }} />
                </div>
                <p className="company-hero-side-note mt-4">
                  {Number(company.remainingSlots || 0)} posting slots available
                </p>
                {activePackageRequest && (
                  <div
                    className="mt-6"
                    style={{
                      borderRadius: "16px",
                      border: "1px solid #fde68a",
                      backgroundColor: "#fffbeb",
                      padding: "16px",
                    }}
                  >
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "#92400e" }}>
                      Request in Review
                    </p>
                    <p style={{ fontSize: "12px", color: "#b45309", marginTop: "4px" }}>
                      Target: {activePackageRequest.requestedPackageType}
                    </p>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="company-panel-card company-package-request-card">
            <div className="company-section-head">
              <h2 className="company-section-title">Package change workflow</h2>
            </div>
            <div className="mt-6">
              {activePackageRequest ? (
                <div className="company-request-row">
                  <div>
                    <p className="company-table-main">
                      {activePackageRequest.currentPackageType} {"->"}
                      {activePackageRequest.requestedPackageType}
                    </p>
                    <p className="company-table-sub">
                      {activePackageRequest.currentJobLimit} {"->"}
                      {activePackageRequest.requestedJobLimit} postings
                    </p>
                    <p className="company-table-sub">
                      Requested on {formatDate(activePackageRequest.createdAt)} | Effective{" "}
                      {formatDate(activePackageRequest.effectiveAt)}
                    </p>
                    {activePackageRequest.reason ? (
                      <p className="company-table-sub">Reason: {activePackageRequest.reason}</p>
                    ) : null}
                  </div>
                  <span
                    className={`company-status-badge ${formatPackageRequestStatus(
                      activePackageRequest.status,
                    )}`}
                  >
                    {activePackageRequest.status}
                  </span>
                </div>
              ) : (
                <p className="company-empty-copy">
                  No active package-change request. Use the "Change Package" button in the Overview tab or Profile to submit a new request.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "followers" && (
        <div className="company-stack-y company-fade-in">
          <section className="company-panel-card">
            <div className="company-section-head">
              <h2 className="company-section-title">Company Followers</h2>
            </div>
            {followers.length ? (
              <div className="company-jobs-table-wrap">
                <table className="company-jobs-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Current Role</th>
                      <th>Location</th>
                      <th>Followed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followers.map((follower) => (
                      <tr key={follower.candidateId}>
                        <td>
                          <p className="company-table-main">{follower.candidateName}</p>
                        </td>
                        <td>
                          <p className="company-table-sub">{follower.candidateEmail || "-"}</p>
                        </td>
                        <td>
                          <p className="company-table-sub">{follower.candidatePhone || "-"}</p>
                        </td>
                        <td>
                          <p className="company-table-sub">{follower.candidateCurrentTitle || "-"}</p>
                        </td>
                        <td>
                          <p className="company-table-sub">
                            {follower.candidateCity && follower.candidateState
                              ? `${follower.candidateCity}, ${follower.candidateState}`
                              : follower.candidateCity || follower.candidateState || "-"}
                          </p>
                        </td>
                        <td>
                          <p className="company-table-sub">{follower.lastUpdated || "-"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="company-empty-copy">No followers yet. Candidates will appear here when they follow your company.</p>
            )}
          </section>
        </div>
      )}

      {isPackageModalOpen ? (
        <div className="company-modal-backdrop">
          <div className="company-modal-card">
            <div className="company-modal-head">
              <div>
                <p className="company-section-eyebrow">Client request</p>
                <h3>Request package change</h3>
              </div>
              <button
                type="button"
                className="company-secondary-btn"
                onClick={() => setIsPackageModalOpen(false)}
              >
                Close
              </button>
            </div>
            <form className="company-form-grid" onSubmit={handleSubmitPackageChangeRequest}>
              <label className="company-field">
                <span>Current package</span>
                <input
                  value={`${company.packageType || "STANDARD"} (${Number(
                    company.jobLimit || 0,
                  )} posts)`}
                  disabled
                />
              </label>

              <label className="company-field">
                <span>Target package *</span>
                <select
                  required
                  value={packageTarget}
                  onChange={(event) => setPackageTarget(event.target.value)}
                >
                  {availablePackageTargets.length ? (
                    availablePackageTargets.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No package option available</option>
                  )}
                </select>
              </label>

              <label className="company-field">
                <span>Business reason</span>
                <textarea
                  rows={4}
                  maxLength={1200}
                  value={packageReason}
                  onChange={(event) => setPackageReason(event.target.value)}
                  placeholder="Mention hiring volume, campaign growth, seasonality, or expected job count changes."
                />
              </label>

              <div className="company-form-actions">
                <button
                  type="button"
                  className="company-secondary-btn"
                  onClick={() => setIsPackageModalOpen(false)}
                  disabled={isSubmittingPackageRequest}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="company-primary-btn"
                  disabled={isSubmittingPackageRequest || !availablePackageTargets.length}
                >
                  {isSubmittingPackageRequest ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
