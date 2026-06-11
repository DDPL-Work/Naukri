import { useEffect, useMemo, useState, useCallback } from "react";
import {
  LuBuilding2,
  LuListFilter,
  LuMapPin,
  LuSearch,
  LuStar,
  LuEye,
  LuMessageSquarePlus,
  LuTrash2,
  LuSend,
  LuPencil,
  LuLayoutGrid,
  LuCalendarCheck,
  LuTrendingUp,
  LuUsers,
  LuRefreshCw,
  LuShare2,
  LuChevronDown,
  LuChevronUp,
  LuFilter,
  LuPlus,
} from "react-icons/lu";
import AddLeadModal from "../components/AddLeadModal";
import LeadDetailModal from "../components/LeadDetailModal";
import LogActivityModal from "../components/LogActivityModal";
import ActionConfirmModal from "../components/ActionConfirmModal";
import EditLeadModal from "../components/EditLeadModal";
import TransferLeadModal from "../components/TransferLeadModal";
import {
  deleteFseLeadActivity,
  fetchFseLeads,
  fetchTransferCandidate,
  logFseLeadActivity,
  transferFseLeadToStateManager,
  updateFseLeadStatus,
} from "../api/fseApi";

const STATUS_OPTIONS = ["ASSIGNED", "CONTACTED", "FOLLOW_UP", "QUALIFIED", "CONVERTED", "LOST", "REJECTED"];

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "FOLLOW_UP", label: "Follow Up" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "CONVERTED", label: "Converted" },
];

const statusClassMap = {
  CONVERTED: "status-pill status-pill-approved",
  LOST: "status-pill status-pill-rejected",
  REJECTED: "status-pill status-pill-rejected",
  default: "status-pill status-pill-pending",
};

const formatLocation = (lead) => {
  if (lead.address && String(lead.address).trim().toLowerCase() !== "unknown") {
    return lead.address;
  }
  return [lead.city, lead.state].filter(Boolean).join(", ") || "-";
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function MyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const [clientType, setClientType] = useState("");
  const [projection, setProjection] = useState("");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [debouncedSubStatus, setDebouncedSubStatus] = useState("");

  const [selectedLead, setSelectedLead] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Transfer candidate fetch
  const [candidateSM, setCandidateSM] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fetchingCandidate, setFetchingCandidate] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedLocation(location);
      setDebouncedSubStatus(subStatus);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [search, location, subStatus]);

  const loadLeads = async (preserveLeadId = "") => {
    try {
      setLoading(true);
      const data = await fetchFseLeads({
        search: debouncedSearch,
        location: debouncedLocation,
        category,
        status,
        subStatus: debouncedSubStatus,
        clientType,
        projection,
        date,
        startDate,
        endDate,
        page: 1,
        limit: 100
      });
      const items = data?.items || [];
      setLeads(items);
      setError("");

      if (preserveLeadId) {
        const refreshed = items.find((lead) => lead.id === preserveLeadId);
        setSelectedLead(refreshed || null);
      }

      return items;
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load assigned leads.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    debouncedLocation,
    category,
    status,
    debouncedSubStatus,
    clientType,
    projection,
    date,
    startDate,
    endDate
  ]);

  const activeActivity = useMemo(() => {
    if (!selectedLead || editingActivityIndex === null) {
      return null;
    }
    return selectedLead.activities?.[editingActivityIndex] || null;
  }, [selectedLead, editingActivityIndex]);

  const getStatusClass = (leadStatus) => statusClassMap[leadStatus] || statusClassMap.default;

  const openLeadDetail = (lead) => {
    setSelectedLead(lead);
    setShowActivityModal(false);
    setEditingActivityIndex(null);
  };

  const openNewActivityModal = (lead) => {
    setSelectedLead(lead);
    setEditingActivityIndex(null);
    setShowActivityModal(true);
  };



  const handleActivitySubmit = async ({ outcome, notes, nextFollowUpAt }) => {
    if (!selectedLead) {
      return;
    }

    try {
      setActivitySubmitting(true);
      await logFseLeadActivity(selectedLead.id, {
        outcome,
        notes,
        nextFollowUpAt,
        activityIndex: editingActivityIndex === null ? undefined : editingActivityIndex,
      });
      setShowActivityModal(false);
      setEditingActivityIndex(null);
      await loadLeads(selectedLead.id);
    } catch (requestError) {
      alert(requestError?.response?.data?.message || "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  const handleDeleteActivity = async (index) => {
    if (!selectedLead) {
      return;
    }

    const confirmed = window.confirm("Delete this activity entry?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteFseLeadActivity(selectedLead.id, index);
      await loadLeads(selectedLead.id);
    } catch (requestError) {
      alert(requestError?.response?.data?.message || "Failed to delete activity.");
    }
  };

  const handleTransferToSM = async (lead) => {
    if (lead.status !== "CONVERTED") {
      alert("Only leads with status 'CONVERTED' can be transferred to the State Manager.");
      return;
    }

    try {
      setFetchingCandidate(true);
      const sm = await fetchTransferCandidate(lead.id);
      setCandidateSM(sm);
      setSelectedLead(lead);
      setShowTransferModal(true);
    } catch (requestError) {
      alert(requestError?.response?.data?.message || "Failed to find a State Manager for this lead.");
    } finally {
      setFetchingCandidate(false);
    }
  };

  const performTransfer = async (tnc) => {
    if (!selectedLead) return;

    try {
      setTransferring(true);
      await transferFseLeadToStateManager(selectedLead.id, tnc);
      alert("Lead transferred to State Manager successfully.");
      setShowTransferModal(false);
      setCandidateSM(null);
      await loadLeads(selectedLead.id);
    } catch (requestError) {
      alert(requestError?.response?.data?.message || "Failed to transfer lead.");
    } finally {
      setTransferring(false);
    }
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (location) count++;
    if (category) count++;
    if (status) count++;
    if (clientType) count++;
    if (projection) count++;
    if (date || (startDate && endDate)) count++;
    if (subStatus) count++;
    return count;
  }, [location, category, status, clientType, projection, date, startDate, endDate, subStatus]);

  return (
    <div className="my-leads-page">
      <header className="page-header-premium">
        <div className="header-left">
          <div className="breadcrumb">
            <span>Dashboard</span>
            <span className="separator">/</span>
            <span className="current">Lead Management</span>
          </div>
          <h1 className="page-title-premium">Lead Management</h1>
          <p className="page-subtitle">Manage your entire lead pipeline — create, view, edit, and transfer in one place.</p>
        </div>
        <div className="header-right">
          <button
            className="add-lead-header-btn"
            onClick={() => setShowAddModal(true)}
            title="Create new lead"
          >
            <LuPlus size={18} />
            <span>Add Lead</span>
          </button>
          <button className="refresh-btn" onClick={() => loadLeads()} title="Refresh Data">
            <LuRefreshCw className={loading ? "spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      <section className="my-leads-filters-container-premium">
        <div className="filter-main-row">
          <div className="search-box-premium">
            <LuSearch className="search-icon" />
            <input
              className="search-input-premium"
              placeholder="Search company, contact, or lead code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filter-actions-toolbar">
            <button 
              className={`advanced-toggle-btn ${showAdvanced ? 'active' : ''}`}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <LuFilter size={16} />
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
              {showAdvanced ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
            </button>
            
            <button className="reset-btn-premium" onClick={() => {
              setSearch(""); setLocation(""); setCategory(""); setStatus(""); setSubStatus("");
              setClientType(""); setProjection(""); setDate(""); setStartDate(""); setEndDate("");
            }}>
              Clear All
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="advanced-filters-panel animate-slide-down">
            <div className="filter-grid-layout">
              <div className="filter-control">
                <label>Geography</label>
                <div className="input-with-icon">
                  <LuMapPin className="field-icon" />
                  <input
                    placeholder="State or City..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-control">
                <label>Business Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="IT & Technology">IT & Technology</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="filter-control">
                <label>Pipeline Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="filter-control">
                <label>Client Segmentation</label>
                <select value={clientType} onChange={(e) => setClientType(e.target.value)}>
                  <option value="">All Tiers</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>

              <div className="filter-control">
                <label>Performance Projection</label>
                <select value={projection} onChange={(e) => setProjection(e.target.value)}>
                  <option value="">All Projections</option>
                  <option value="WP > 50">WP &gt; 50</option>
                  <option value="WP < 50">WP &lt; 50</option>
                  <option value="MP < 50">MP &lt; 50</option>
                  <option value="MP > 50">MP &gt; 50</option>
                </select>
              </div>

              <div className="filter-control">
                <label>Date Shortcut</label>
                <select value={date} onChange={(e) => setDate(e.target.value)}>
                  <option value="">Custom Selection</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>

              <div className="filter-control col-span-2">
                <label>Custom Date Range</label>
                <div className="date-range-inputs">
                  <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDate(""); }} />
                  <span className="range-sep">to</span>
                  <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDate(""); }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="my-leads-table-card-premium">
        <div className="table-wrap">
          <table className="my-leads-table grid-table">
            <thead>
              <tr className="header-level-1">
                <th colSpan="3">BASIC INFORMATION</th>
                <th colSpan="4">LATEST INTERACTION</th>
                <th rowSpan="2">ACTION</th>
              </tr>
              <tr className="header-level-2">
                <th>SOURCING DATE</th>
                <th>COMPANY & CATEGORY</th>
                <th>LOCATION & STATE</th>
                <th>FOLLOWUP DATE</th>
                <th>LATEST REMARKS</th>
                <th>NEXT FOLLOWUP</th>
                <th>STATUS & SUB-STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-cell">Loading assigned leads...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="empty-cell">{error}</td>
                </tr>
              ) : leads.length ? (
                leads.map((lead) => {
                  const latestActivity = lead.activities?.length
                    ? lead.activities[lead.activities.length - 1]
                    : null;

                  return (
                    <tr key={lead.id} className="grid-row">
                      <td className="text-center font-mono">
                        {lead.sourcingDate ? new Date(lead.sourcingDate).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit' }) : "-"}
                      </td>
                      <td>
                        <div className="company-info">
                          <div className="company-name-row">
                            <span className="name-text">{lead.companyName}</span>
                            {lead.clientType === "Premium" ? (
                              <LuStar size={14} fill="#3B82F6" stroke="#3B82F6" />
                            ) : (
                              <LuStar size={14} stroke="#3B82F6" />
                            )}
                          </div>
                          <span className="category-text">{lead.businessCategory}</span>
                        </div>
                      </td>
                      <td>
                        <div className="location-info">
                          <LuMapPin size={12} />
                          <span>{lead.city}, {lead.state}</span>
                        </div>
                      </td>
                      <td className="text-center italic">
                        {latestActivity ? new Date(latestActivity.date).toLocaleDateString("en-GB") : "-"}
                      </td>
                      <td className="remarks-cell">
                        <p className="remarks-text" title={latestActivity?.notes}>
                          {latestActivity?.notes || "-"}
                        </p>
                      </td>
                      <td className="text-center">
                        {latestActivity?.nextFollowUpAt ? (
                          <span className="next-follow-badge">
                            {new Date(latestActivity.nextFollowUpAt).toLocaleDateString("en-GB")}
                          </span>
                        ) : "-"}
                      </td>
                      <td>
                        <div className="status-info">
                          <span className="status-text">{lead.status}</span>
                          <span className="substatus-text">{latestActivity?.subStatus || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="grid-actions">
                          <button className="action-icon-btn btn-view" title="View" onClick={() => openLeadDetail(lead)}>
                            <LuEye size={16} />
                          </button>
                          <button className="action-icon-btn btn-activity" title="Log Activity" onClick={(e) => { e.stopPropagation(); openNewActivityModal(lead); }}>
                            <LuMessageSquarePlus size={16} />
                          </button>
                          <button className="action-icon-btn btn-edit-row" title="Edit" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowEditModal(true); }}>
                            <LuPencil size={16} />
                          </button>
                          <button 
                            className={`action-icon-btn btn-transfer-row ${lead.status !== "CONVERTED" ? 'disabled-action' : ''}`} 
                            title={lead.status === "CONVERTED" ? "Share with State Manager" : "Convert lead first to Share"} 
                            onClick={(e) => { e.stopPropagation(); handleTransferToSM(lead); }}
                          >
                            <LuShare2 size={16} />
                          </button>
                          <button className="action-icon-btn btn-delete-row" title="Delete" onClick={(e) => { e.stopPropagation(); /* handle delete */ }}>
                            <LuTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="empty-cell">No leads assigned yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedLead && !showActivityModal ? (
        <LeadDetailModal
          lead={selectedLead}
          activities={selectedLead.activities || []}
          onClose={() => setSelectedLead(null)}
          onLogActivity={(lead) => openNewActivityModal(lead)}
          onEditActivity={(index) => {
            setEditingActivityIndex(index);
            setShowActivityModal(true);
          }}
          onDeleteActivity={handleDeleteActivity}
          onEditLead={() => setShowEditModal(true)}
          onTransferToSM={handleTransferToSM}
        />
      ) : null}

      {showEditModal && selectedLead ? (
        <EditLeadModal
          lead={selectedLead}
          onClose={() => setShowEditModal(false)}
          onSave={() => loadLeads(selectedLead.id)}
        />
      ) : null}

      {showActivityModal && selectedLead ? (
        <LogActivityModal
          lead={selectedLead}
          initialData={activeActivity}
          isSubmitting={activitySubmitting}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivityIndex(null);
          }}
          onSubmit={handleActivitySubmit}
        />
      ) : null}



      <TransferLeadModal
        isOpen={showTransferModal}
        lead={selectedLead}
        candidate={candidateSM}
        isSubmitting={transferring}
        onClose={() => {
          setShowTransferModal(false);
          setCandidateSM(null);
        }}
        onConfirm={performTransfer}
      />

      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => loadLeads()}
      />
    </div>
  );
}
