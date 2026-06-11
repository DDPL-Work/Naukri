import { useEffect, useState, useMemo } from "react";
import { 
  LuCalendar, 
  LuTrash2, 
  LuClock, 
  LuPlus, 
  LuInfo, 
  LuCalendarOff,
  LuChevronRight,
  LuFileText,
  LuCircleCheckBig,
  LuSun,
  LuMoon
} from "react-icons/lu";
import { fetchFseNonVisitDays, addFseNonVisitDay, deleteFseNonVisitDay } from "../api/fseApi";
import Swal from "sweetalert2";

const TYPE_OPTIONS = [
  { value: "FULL_DAY", label: "Full Day", Icon: LuSun },
  { value: "HALF_DAY", label: "Half Day", Icon: LuMoon },
];

export default function NonVisitDays() {
  const [success, setSuccess] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "FULL_DAY",
    remarks: "",
  });

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await fetchFseNonVisitDays();
      setEntries(data || []);
    } catch (err) {
      setError("Failed to load records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const fullDays = thisMonth.filter(e => e.type === "FULL_DAY").length;
    const halfDays = thisMonth.filter(e => e.type === "HALF_DAY").length;
    
    return {
      thisMonthTotal: fullDays + (halfDays * 0.5),
      thisMonthCount: thisMonth.length,
      allTimeCount: entries.length
    };
  }, [entries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await addFseNonVisitDay(form);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        type: "FULL_DAY",
        remarks: "",
      });
      loadEntries();
      
      Swal.fire({
        title: "Success!",
        text: "Your non-visit day has been recorded successfully.",
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
        borderRadius: "16px",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please check your input.");
      Swal.fire({
        title: "Record Failed",
        text: err?.response?.data?.message || "Something went wrong. Please check your input.",
        icon: "error",
        borderRadius: "16px",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Record?",
      text: "This action cannot be undone. Are you sure you want to remove this record?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      borderRadius: "16px",
    });

    if (result.isConfirmed) {
      try {
        await deleteFseNonVisitDay(id);
        Swal.fire({
          title: "Deleted!",
          text: "The record has been removed successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          borderRadius: "16px",
        });
        loadEntries();
      } catch (err) {
        Swal.fire({
          title: "Error!",
          text: "Failed to delete the record. Please try again.",
          icon: "error",
          borderRadius: "16px",
        });
      }
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="page-shell-inner non-visit-days-container">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <header className="nvd-header">
        <div className="nvd-header-left">
          <div className="nvd-brand-icon">
            <LuCalendarOff />
          </div>
          <div className="nvd-header-text">
            <h1>Attendance & Leave</h1>
            <p>Report your non-working days for accurate field tracking</p>
          </div>
        </div>
        
        <div className="nvd-stats-row">
          <div className="nvd-stat-mini">
            <span className="nvd-stat-label">THIS MONTH</span>
            <span className="nvd-stat-value">{stats.thisMonthTotal} <small>Days</small></span>
          </div>
          <div className="nvd-stat-mini">
            <span className="nvd-stat-label">TOTAL RECORDS</span>
            <span className="nvd-stat-value">{stats.allTimeCount}</span>
          </div>
        </div>
      </header>

      <div className="nvd-main-layout">
        {/* ── Left Column: Form ────────────────────────────────────── */}
        <aside className="nvd-form-sidebar">
          <div className="nvd-card nvd-entry-card">
            <div className="nvd-card-header">
              <div className="nvd-card-title">
                <LuPlus className="title-icon" />
                <span>New Record</span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="nvd-form">
              <div className="nvd-field">
                <label>Select Date</label>
                <div className="nvd-input-shell">
                  <LuCalendar className="nvd-input-icon" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="nvd-field">
                <label>Attendance Type</label>
                <div className="nvd-type-grid">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`nvd-type-toggle ${form.type === opt.value ? "is-selected" : ""}`}
                      onClick={() => setForm({ ...form, type: opt.value })}
                    >
                      <span className="type-emoji" style={{ display: 'flex' }}>
                        <opt.Icon size={20} />
                      </span>
                      <span className="type-label">{opt.label}</span>
                      {form.type === opt.value && <LuCircleCheckBig className="check-icon" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="nvd-field">
                <label>Reason / Remarks</label>
                <div className="nvd-input-shell nvd-textarea-shell">
                  <LuFileText className="nvd-input-icon" />
                  <textarea
                    placeholder="Provide a brief explanation for management..."
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="nvd-alert is-error">
                  <LuInfo className="alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="nvd-submit-btn" disabled={submitting}>
                {submitting ? "Processing..." : "Record Attendance"}
                <LuChevronRight className="btn-icon" />
              </button>
            </form>
          </div>
        </aside>

        {/* ── Right Column: History ────────────────────────────────── */}
        <main className="nvd-history-main">
          <div className="nvd-history-header">
            <h3>Recent Activity History</h3>
            <span className="history-count">{entries.length} Records</span>
          </div>

          <div className="nvd-entries-timeline">
            {loading ? (
              <div className="nvd-loader">
                <div className="spinner"></div>
                <p>Retrieving records...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="nvd-empty-state">
                <div className="empty-illustration">
                  <LuCalendarOff />
                </div>
                <h4>No records found</h4>
                <p>Your non-visit day history will appear here once you start logging entries.</p>
              </div>
            ) : (
              <div className="nvd-entries-grid">
                {entries.map((entry) => (
                  <div key={entry._id} className="nvd-record-item">
                    <div className="record-date-box">
                      <span className="date-day">{new Date(entry.date).getDate()}</span>
                      <span className="date-month">{new Date(entry.date).toLocaleString("en-IN", { month: "short" })}</span>
                    </div>
                    
                    <div className="record-content">
                      <div className="record-top">
                        <div className="record-meta">
                          <span className={`nvd-badge ${entry.type.toLowerCase()}`}>
                            {entry.type === "FULL_DAY" ? "Full Day" : "Half Day"}
                          </span>
                          <span className="record-year">{new Date(entry.date).getFullYear()}</span>
                        </div>
                        <button 
                          className="nvd-delete-btn" 
                          onClick={() => handleDelete(entry._id)}
                          title="Remove Record"
                        >
                          <LuTrash2 />
                        </button>
                      </div>
                      <p className="record-remarks">{entry.remarks}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
