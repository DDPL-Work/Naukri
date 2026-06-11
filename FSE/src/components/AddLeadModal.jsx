import { useState, useEffect } from "react";
import {
  LuX,
  LuLoaderCircle,
  LuBuilding2,
  LuGlobe,
  LuUsers,
  LuMapPin,
  LuUserRound,
  LuPlus,
  LuTrash2,
  LuPhone,
  LuMail,
  LuFileText,
  LuTag,
  LuCalendarDays,
  LuChartNoAxesCombined,
} from "react-icons/lu";
import { createFseLead, fetchFseMeta } from "../api/fseApi";

const DEFAULT_BUSINESS_CATEGORY_OPTIONS = [
  "IT & Technology",
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Logistics",
  "Finance",
];

const DEFAULT_LEAD_SOURCE_OPTIONS = [
  "Cold Call",
  "Referral",
  "Field Visit",
  "Social Media",
  "Inbound Inquiry",
];

const PROJECTION_OPTIONS = ["WP > 50", "WP < 50", "MP < 50", "MP > 50"];

const STATE_OPTIONS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry"
];

const EMPLOYEE_COUNT_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+"
];

const createEmptyContact = () => ({
  fullName: "",
  phone: "",
  email: "",
  designation: "",
});

const initialForm = {
  companyName: "",
  businessCategory: "",
  leadSource: "",
  address: "",
  state: "",
  employeeCount: "",
  reference: "",
  sourcingDate: "",
  projection: "",
  clientType: "Standard",
  notes: "",
  nextFollowUpAt: "",
  contacts: [createEmptyContact()],
};

export default function AddLeadModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const [meta, setMeta] = useState({
    businessCategories: DEFAULT_BUSINESS_CATEGORY_OPTIONS,
    leadSources: DEFAULT_LEAD_SOURCE_OPTIONS,
  });
  const [form, setForm] = useState(initialForm);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setError("");
      setSaving(false);
      return;
    }

    let mounted = true;
    const loadMeta = async () => {
      try {
        setLoadingMeta(true);
        const data = await fetchFseMeta();
        if (mounted) {
          setMeta({
            businessCategories: data?.businessCategories?.length ? data.businessCategories : DEFAULT_BUSINESS_CATEGORY_OPTIONS,
            leadSources: data?.leadSources?.length ? data.leadSources : DEFAULT_LEAD_SOURCE_OPTIONS,
          });
        }
      } catch {
        if (mounted) {
          setMeta({
            businessCategories: DEFAULT_BUSINESS_CATEGORY_OPTIONS,
            leadSources: DEFAULT_LEAD_SOURCE_OPTIONS,
          });
        }
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    };
    loadMeta();
    return () => { mounted = false; };
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleContactChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const handleAddContact = () => {
    setForm((prev) => ({ ...prev, contacts: [...prev.contacts, createEmptyContact()] }));
  };

  const handleRemoveContact = (index) => {
    setForm((prev) => {
      if (prev.contacts.length === 1) return prev;
      return { ...prev, contacts: prev.contacts.filter((_, i) => i !== index) };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const sanitizedContacts = form.contacts.map((c) => ({
      fullName: c.fullName.trim(),
      phone: c.phone.trim(),
      email: c.email.trim().toLowerCase(),
      designation: c.designation?.trim() || "",
    }));

    if (!sanitizedContacts.length) {
      setError("Add at least one contact person.");
      return;
    }

    const uniquePhones = new Set();
    const uniqueEmails = new Set();

    for (const [idx, contact] of sanitizedContacts.entries()) {
      const num = idx + 1;
      if (!contact.fullName) {
        setError(`Contact ${num}: full name is required.`);
        return;
      }
      const digits = contact.phone.replace(/\D/g, "");
      if (digits.length < 10) {
        setError(`Contact ${num}: phone number must contain at least 10 digits.`);
        return;
      }
      if (uniquePhones.has(digits)) {
        setError(`Contact ${num}: this phone number is already added.`);
        return;
      }
      uniquePhones.add(digits);

      if (contact.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
          setError(`Contact ${num}: please enter a valid email address.`);
          return;
        }
        if (uniqueEmails.has(contact.email)) {
          setError(`Contact ${num}: this email address is already added.`);
          return;
        }
        uniqueEmails.add(contact.email);
      }
    }

    try {
      setSaving(true);
      const [primaryContact] = sanitizedContacts;
      const payload = {
        contactName: primaryContact.fullName,
        companyName: form.companyName.trim(),
        phone: primaryContact.phone,
        email: primaryContact.email,
        contacts: sanitizedContacts.map((c, i) => ({ ...c, isPrimary: i === 0 })),
        businessCategory: form.businessCategory,
        leadSource: form.leadSource,
        address: form.address.trim(),
        state: form.state,
        employeeCount: form.employeeCount,
        reference: form.reference.trim(),
        sourcingDate: form.sourcingDate || null,
        projection: form.projection || "",
        clientType: form.clientType || "Standard",
        notes: form.notes.trim(),
        nextFollowUpAt: form.nextFollowUpAt || null,
      };
      await createFseLead(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to save lead.");
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) {
      setForm(initialForm);
      setError("");
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        className="modal-content"
        style={{ maxWidth: "860px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="header-info">
            <h2>Add New Lead</h2>
            <p className="modal-subtitle">Fill in the details below to create and assign this lead.</p>
          </div>
          <button className="close-btn" onClick={close} disabled={saving}><LuX /></button>
        </header>

        <div className="modal-body" style={{ overflowY: "auto", padding: "8px 4px" }}>
          <form onSubmit={handleSubmit} className="add-lead-form">
            {loadingMeta ? (
              <div className="loading-block">
                <LuLoaderCircle className="spin" />
                Loading lead form...
              </div>
            ) : (
              <>
                {error ? <div className="status-banner">{error}</div> : null}

                <section className="lead-block company-block">
                  <div className="lead-block-header">
                    <span className="lead-block-icon"><LuBuilding2 /></span>
                    <h2>Company Information</h2>
                  </div>

                  <div className="lead-block-grid two-col">
                    <label className="form-field">
                      <span className="sr-only">Company Name</span>
                      <input
                        className="input add-lead-input"
                        name="companyName"
                        value={form.companyName}
                        onChange={handleChange}
                        placeholder="Company Name"
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span className="sr-only">Business Category</span>
                      <select
                        className="input add-lead-input add-lead-select"
                        name="businessCategory"
                        value={form.businessCategory}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled>Select Category…</option>
                        {(meta?.businessCategories || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="sr-only">State</span>
                      <div className="input-shell input-shell-left">
                        <LuGlobe className="input-icon" />
                        <select
                          className="input add-lead-input add-lead-select"
                          name="state"
                          value={form.state}
                          onChange={handleChange}
                          required
                        >
                          <option value="" disabled>Select State…</option>
                          {STATE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <label className="form-field">
                      <span className="sr-only">Employee Count</span>
                      <div className="input-shell input-shell-left">
                        <LuUsers className="input-icon" />
                        <select
                          className="input add-lead-input add-lead-select"
                          name="employeeCount"
                          value={form.employeeCount}
                          onChange={handleChange}
                          required
                        >
                          <option value="" disabled>Employee Count…</option>
                          {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>

                  <div className="lead-block-grid one-col" style={{ marginTop: "12px" }}>
                    <label className="form-field">
                      <span className="sr-only">Location / Address</span>
                      <div className="input-shell input-shell-left">
                        <LuMapPin className="input-icon" />
                        <input
                          className="input add-lead-input"
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          placeholder="Location / Address"
                          required
                        />
                      </div>
                    </label>
                  </div>
                </section>

                <section className="lead-block">
                  <div className="lead-block-header contact-block-header">
                    <div className="lead-block-title">
                      <span className="lead-block-icon"><LuUserRound /></span>
                      <h2>Contact Person(s)</h2>
                    </div>
                    <button type="button" className="button button-secondary add-contact-button" onClick={handleAddContact}>
                      <LuPlus /> Add Contact
                    </button>
                  </div>

                  <div className="contact-list">
                    {form.contacts.map((contact, index) => (
                      <article className="contact-card" key={`contact-${index}`}>
                        <div className="contact-card-header">
                          <h3>
                            {index === 0 ? "Primary Contact" : `Contact ${index + 1}`}
                            {index === 0 ? <span className="contact-primary-badge">Primary</span> : null}
                          </h3>
                          {form.contacts.length > 1 ? (
                            <button type="button" className="contact-remove-button" onClick={() => handleRemoveContact(index)}>
                              <LuTrash2 /> Remove
                            </button>
                          ) : null}
                        </div>

                        <div className="lead-block-grid two-col contact-grid">
                          <label className="form-field">
                            <span className="sr-only">Contact Full Name</span>
                            <input
                              className="input add-lead-input"
                              value={contact.fullName}
                              onChange={(e) => handleContactChange(index, "fullName", e.target.value)}
                              placeholder="Full Name"
                              required
                            />
                          </label>

                          <label className="form-field">
                            <span className="sr-only">Contact Phone Number</span>
                            <div className="input-shell input-shell-left">
                              <LuPhone className="input-icon" />
                              <input
                                className="input add-lead-input"
                                value={contact.phone}
                                onChange={(e) => handleContactChange(index, "phone", e.target.value)}
                                placeholder="Phone Number"
                                required
                              />
                            </div>
                          </label>
                        </div>

                        <div className="lead-block-grid two-col contact-grid" style={{ marginTop: "10px" }}>
                          <label className="form-field">
                            <span className="sr-only">Contact Email</span>
                            <div className="input-shell input-shell-left">
                              <LuMail className="input-icon" />
                              <input
                                className="input add-lead-input"
                                type="email"
                                value={contact.email}
                                onChange={(e) => handleContactChange(index, "email", e.target.value)}
                                placeholder="Email Address (optional)"
                              />
                            </div>
                          </label>

                          <label className="form-field">
                            <span className="sr-only">Contact Designation</span>
                            <input
                              className="input add-lead-input"
                              value={contact.designation || ""}
                              onChange={(e) => handleContactChange(index, "designation", e.target.value)}
                              placeholder="Designation (optional)"
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="lead-block">
                  <div className="lead-block-header">
                    <span className="lead-block-icon"><LuFileText /></span>
                    <h2>Lead Source</h2>
                  </div>

                  <div className="lead-block-grid two-col lead-source-grid">
                    <label className="form-field">
                      <span className="sr-only">Source</span>
                      <select
                        className="input add-lead-input add-lead-select"
                        name="leadSource"
                        value={form.leadSource}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled>Select Source…</option>
                        {(meta?.leadSources || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="sr-only">Reference</span>
                      <div className="input-shell input-shell-left">
                        <LuTag className="input-icon" />
                        <input
                          className="input add-lead-input"
                          name="reference"
                          value={form.reference}
                          onChange={handleChange}
                          placeholder="Reference / Referred By"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="lead-block-grid two-col lead-source-grid" style={{ marginTop: "12px" }}>
                    <label className="form-field">
                      <span className="sr-only">Sourcing Date</span>
                      <div className="input-shell input-shell-left">
                        <LuCalendarDays className="input-icon" />
                        <input
                          type="date"
                          className="input add-lead-input"
                          name="sourcingDate"
                          value={form.sourcingDate}
                          onChange={handleChange}
                        />
                      </div>
                    </label>

                    <label className="form-field">
                      <span className="sr-only">Client Type</span>
                      <div className="input-shell input-shell-left">
                        <LuTag className="input-icon" />
                        <select
                          className="input add-lead-input add-lead-select"
                          name="clientType"
                          value={form.clientType}
                          onChange={handleChange}
                          required
                        >
                          <option value="Standard">Standard</option>
                          <option value="Premium">Premium</option>
                        </select>
                      </div>
                    </label>
                  </div>

                  <div className="lead-block-grid one-col lead-source-grid" style={{ marginTop: "12px" }}>
                    <div className="fse-projection-block">
                      <div className="fse-projection-header">
                        <LuChartNoAxesCombined />
                        <span>Projection</span>
                        <span className="fse-projection-hint">Select a projection tier for this lead</span>
                      </div>
                      <div className="fse-projection-options" role="group" aria-label="Projection">
                        {PROJECTION_OPTIONS.map((opt) => (
                          <label key={opt} className={`fse-projection-chip${form.projection === opt ? " selected" : ""}`}>
                            <input
                              type="radio"
                              name="projection"
                              value={opt}
                              checked={form.projection === opt}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            {opt}
                          </label>
                        ))}
                        {form.projection ? (
                          <button
                            type="button"
                            className="fse-projection-clear"
                            onClick={() => setForm((prev) => ({ ...prev, projection: "" }))}
                            aria-label="Clear projection"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="lead-block">
                  <div className="lead-block-header">
                    <span className="lead-block-icon"><LuCalendarDays /></span>
                    <h2>Notes &amp; Follow-up</h2>
                  </div>

                  <div className="lead-block-grid one-col" style={{ marginTop: "4px" }}>
                    <label className="form-field">
                      <span className="sr-only">Notes</span>
                      <textarea
                        className="input add-lead-input textarea"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Any relevant notes about this lead…"
                        rows={3}
                      />
                    </label>

                    <label className="form-field">
                      <span className="sr-only">Next Follow-up Date</span>
                      <div className="input-shell input-shell-left">
                        <LuCalendarDays className="input-icon" />
                        <input
                          type="date"
                          className="input add-lead-input"
                          name="nextFollowUpAt"
                          value={form.nextFollowUpAt}
                          onChange={handleChange}
                        />
                      </div>
                    </label>
                  </div>
                </section>

                <div className="add-lead-actions">
                  <button type="button" className="cancel-inline" onClick={close} disabled={saving}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={saving}>
                    {saving ? <LuLoaderCircle className="spin" /> : null}
                    {saving ? "Submitting…" : "Submit Lead"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
