import { useState } from "react";
import {
  LuArrowRight,
  LuBuilding2,
  LuCircleCheck,
  LuSend,
  LuShieldCheck,
  LuUserRound,
  LuX,
} from "react-icons/lu";

  const STEPS = [
  { icon: LuUserRound, label: "Initiate Transfer" },
  { icon: LuShieldCheck, label: "State Review" },
  { icon: LuCircleCheck, label: "Onboarding" },
];

export default function TransferLeadModal({
  isOpen,
  lead,
  candidate,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  const [tnc, setTnc] = useState("");

  if (!isOpen || !lead || !candidate) return null;

  const initials = (candidate.fullName || "SM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="modal-overlay transfer-modal-overlay" onClick={onClose}>
      <div
        className="modal-content transfer-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Branded Header ─────────────────────────────── */}
        <header className="transfer-header">
          <div className="transfer-header-bg">
            <div className="transfer-header-orb transfer-header-orb--1" />
            <div className="transfer-header-orb transfer-header-orb--2" />
          </div>

          <div className="transfer-header-inner">
            <button
              className="transfer-close-btn"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
            >
              <LuX size={18} />
            </button>

            <div className="transfer-header-top">
              <div className="transfer-icon-ring">
                <div className="transfer-icon-ring-bg" />
                <LuSend size={22} className="transfer-header-icon" />
              </div>

              <div className="transfer-title-group">
                <span className="transfer-eyebrow">Transfer Workflow</span>
                <h2 className="transfer-heading">Transfer Lead</h2>
                <p className="transfer-subheading">
                  Assign <strong>{lead.companyName}</strong> to a State Manager for onboarding.
                </p>
              </div>
            </div>

            {/* Stepped progress indicator */}
            <div className="transfer-steps">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div className={`transfer-step${idx === 0 ? " transfer-step--active" : ""}`} key={step.label}>
                    <div className="transfer-step-dot">
                      <StepIcon size={14} />
                    </div>
                    <span className="transfer-step-label">{step.label}</span>
                    {idx < STEPS.length - 1 && <div className="transfer-step-connector" />}
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="transfer-body">
          {/* SM Candidate Card */}
          <section className="transfer-section">
            <div className="transfer-card transfer-candidate-card">
              <div className="transfer-candidate-avatar">{initials}</div>
              <div className="transfer-candidate-meta">
                <span className="transfer-field-label">Receiving Manager</span>
                <strong className="transfer-candidate-name">{candidate.fullName}</strong>
                <span className="transfer-candidate-region">
                  <LuBuilding2 size={13} />
                  {candidate.territory} Zone &middot; {candidate.state}
                </span>
              </div>
              <div className="transfer-candidate-badge">
                <LuCircleCheck size={14} />
                <span>Verified SM</span>
              </div>
            </div>
          </section>

          {/* Lead Summary */}
          <section className="transfer-section">
            <div className="transfer-card transfer-lead-summary">
              <div className="transfer-lead-summary-head">
                <span className="transfer-field-label">Lead Summary</span>
                <span className="transfer-lead-id">#{lead._id || lead.id}</span>
              </div>
              <div className="transfer-lead-chips">
                <span className="transfer-chip">{lead.status || "ASSIGNED"}</span>
                {lead.businessCategory && (
                  <span className="transfer-chip transfer-chip--muted">{lead.businessCategory}</span>
                )}
                {lead.leadSource && (
                  <span className="transfer-chip transfer-chip--muted">{lead.leadSource}</span>
                )}
              </div>
            </div>
          </section>

          {/* TNC Section */}
          <section className="transfer-section transfer-section--last">
            <div className="transfer-card">
              <div className="transfer-field-header">
                <div className="transfer-field-title">
                  <LuFileText className="transfer-field-title-icon" />
                  <div>
                    <span className="transfer-field-label">Onboarding Terms &amp; Conditions</span>
                    <p className="transfer-field-hint">
                      Specify package details, special conditions, and notes that the State Manager will review.
                    </p>
                  </div>
                </div>
              </div>

              <textarea
                className="transfer-textarea"
                placeholder="E.g. Premium onboarding package · 90-day onboarding window · Dedicated onboarding coordinator assigned…"
                value={tnc}
                onChange={(e) => setTnc(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </section>
        </div>

        {/* ── Footer / CTA ───────────────────────────────── */}
        <footer className="transfer-footer">
          <div className="transfer-footer-actions">
            <button
              className="transfer-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              className="transfer-btn-primary"
              onClick={() => onConfirm(tnc)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="transfer-spinner" />
                  Transferring…
                </>
              ) : (
                <>
                  <LuSend size={16} />
                  Confirm &amp; Transfer
                  <LuArrowRight size={16} className="transfer-btn-arrow" />
                </>
              )}
            </button>
          </div>

          <p className="transfer-footer-disclaimer">
            This action will move the lead to the State Manager. The manager will be notified and can approve or reject within 48 hours.
          </p>
        </footer>
      </div>
    </div>
  );
}

function LuFileText(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
