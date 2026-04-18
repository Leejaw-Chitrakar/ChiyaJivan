import { useState, useEffect } from "react";
import {
  Save,
  RefreshCcw,
  Quote,
  MapPin,
  Clock,
  Mail,
  Phone,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { getSocialContent, saveSocialContent } from "../../lib/firestoreService";
import "../styles/SocialManager.css";

export default function SocialManager() {
  const [formData, setFormData] = useState({
    quote: "A cup of tea is an excuse for a shared silence.",
    story:
      "Sourced from the highlands of Ilam — every cup is a quiet ceremony, balanced and rooted in tradition. We've been serving the community since 2012.",
    weekdays: "Sun – Fri: 8 AM – 8 PM",
    weekend: "Saturday: 9 AM – 9 PM",
    address: "Thamel, Kathmandu, Nepal",
    phone: "+977 1-4XXXXXX",
    email: "hello@chiyajivan.com",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastPublished, setLastPublished] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getSocialContent();
        if (data) {
          setFormData({
            quote: data.quote || "",
            story: data.story || "",
            weekdays: data.weekdays || "",
            weekend: data.weekend || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
          });
          if (data.updatedAt) {
            setLastPublished(data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt));
          }
        }
      } catch (err) {
        console.error("Failed to load social content", err);
      }
    }
    loadData();
  }, []);

  const set = (field) => (e) => {
    setSaved(false);
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSocialContent(formData);
      setSaved(true);
      setLastPublished(new Date());
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save content", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getRelativeTime = (date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  return (
    <div className="social-container">
      {/* Header */}
      <div className="social-header">
        <h1>Social & Info Manager</h1>
        <p>
          Update your brand story, homepage content, and business details.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="social-layout">
          {/* ── LEFT: Content ── */}
          <div className="social-column-left">
            {/* Homepage Content */}
            <div className="social-card">
              <div className="social-card-header">
                <div className="social-card-icon primary">
                  <Quote size={20} />
                </div>
                <div>
                  <h2 className="social-card-title">
                    Homepage Content
                  </h2>
                  <p className="social-card-desc">
                    Shown on your public landing page
                  </p>
                </div>
              </div>

              <div className="social-field">
                <label className="social-field-label">
                  Daily Ritual Quote
                </label>
                <textarea
                  rows={2}
                  value={formData.quote}
                  onChange={set("quote")}
                  className="social-input social-textarea"
                  placeholder="Your inspirational quote..."
                />
                <p className="social-field-helper">
                  This quote appears in the "Daily Ritual" section of the
                  landing page.
                </p>
              </div>

              <div className="social-field">
                <label className="social-field-label">
                  Our Chiya Story
                </label>
                <textarea
                  rows={5}
                  value={formData.story}
                  onChange={set("story")}
                  className="social-input social-textarea"
                  placeholder="Tell your brand story..."
                />
                <p className="social-field-helper">
                  Keep it under 250 characters for the best visual balance.
                </p>
              </div>
            </div>

            {/* Business Hours */}
            <div className="social-card">
              <div className="social-card-header">
                <div className="social-card-icon blue">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="social-card-title">
                    Business Hours
                  </h2>
                  <p className="social-card-desc">
                    Displayed in the footer and info section
                  </p>
                </div>
              </div>
              <div className="social-grid-2">
                <div className="social-field">
                  <label className="social-field-label">
                    Weekdays
                  </label>
                  <input
                    type="text"
                    value={formData.weekdays}
                    onChange={set("weekdays")}
                    className="social-input"
                  />
                </div>
                <div className="social-field">
                  <label className="social-field-label">
                    Weekends
                  </label>
                  <input
                    type="text"
                    value={formData.weekend}
                    onChange={set("weekend")}
                    className="social-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Contact + Publish ── */}
          <div className="social-column-right">
            {/* Contact Info */}
            <div className="social-card">
              <div className="social-card-header">
                <div className="social-card-icon emerald">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="social-card-title">
                    Contact Details
                  </h2>
                  <p className="social-card-desc">
                    Visible on landing page footer
                  </p>
                </div>
              </div>
              <div className="social-field" style={{ gap: '1.25rem' }}>
                {[
                  {
                    field: "address",
                    label: "Address",
                    icon: MapPin,
                    placeholder: "Shop address...",
                  },
                  {
                    field: "phone",
                    label: "Phone",
                    icon: Phone,
                    placeholder: "+977 ...",
                  },
                  {
                    field: "email",
                    label: "Email",
                    icon: Mail,
                    placeholder: "hello@...",
                  },
                ].map(({ field, label, icon: Icon, placeholder }) => (
                  <div key={field} className="social-field" style={{ gap: '0.5rem' }}>
                    <label className="social-field-label">
                      <Icon size={13} /> {label}
                    </label>
                    <input
                      type="text"
                      value={formData[field]}
                      onChange={set(field)}
                      className="social-input"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Publish Card */}
            <div className="social-publish-card">
              <div className="social-publish-content">
                <div className="social-card-header">
                  <div className="social-card-icon primary" style={{ padding: '0.5rem' }}>
                    <Sparkles size={20} />
                  </div>
                  <h3 className="social-card-title" style={{ fontSize: '1.125rem' }}>
                    Publish Changes
                  </h3>
                </div>
                <p className="social-field-helper">
                  Saving will update your live landing page content instantly.
                </p>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="social-publish-btn"
                >
                  {isSaving ? (
                    <>
                      <RefreshCcw size={18} className="animate-spin" />{" "}
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 size={18} /> Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Publish Live
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSaved(false)}
                  className="social-discard-btn"
                >
                  Discard Changes
                </button>
              </div>

              <div className="social-publish-footer">
                <p className="social-publish-time">
                  Last Published: {getRelativeTime(lastPublished)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
