import { useState, useEffect } from 'react';
import { Shield, Bell, User, Clock, Wallet, ChevronRight, X, Save, Mail, CreditCard } from 'lucide-react';
import { getShopSettings, saveShopSettings, getAdminProfile, saveAdminProfile } from '../../lib/firestoreService';
import '../styles/Settings.css';

const sections = [
  { 
    name: 'Profile Settings', 
    desc: 'Update your display name and contact email.', 
    icon: User,
    iconClass: 'icon-blue',
  },
  { 
    name: 'Login & Security', 
    desc: 'Change your admin password and security preferences.', 
    icon: Shield,
    iconClass: 'icon-red',
  },
  { 
    name: 'Notifications', 
    desc: 'Manage alerts for new orders and low stock.',
    icon: Bell,
    iconClass: 'icon-amber',
  },
  { 
    name: 'Shop Preferences', 
    desc: 'Set currency, tax rates, and rounding rules.',
    icon: Wallet,
    iconClass: 'icon-emerald',
  },
  { 
    name: 'Auto-Status Schedule', 
    desc: 'Schedule automatic open/close times for your shop.',
    icon: Clock,
    iconClass: 'icon-violet',
  },
];

export default function Settings({ userRole }) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') === 'true';
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [openTime, setOpenTime] = useState('07:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [tableCount, setTableCount] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [isSiteDown, setIsSiteDown] = useState(false);

  // Profile fields
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const data = await getShopSettings();
      if (data) {
        if (data.autoScheduleEnabled !== undefined) setScheduleEnabled(data.autoScheduleEnabled);
        if (data.openTime) setOpenTime(data.openTime);
        if (data.closeTime) setCloseTime(data.closeTime); // Bug fix: was setOpenTime twice in original
        if (data.tableCount) setTableCount(data.tableCount);
        if (data.isSiteDown !== undefined) setIsSiteDown(data.isSiteDown);
      }

      // Load profile
      const profile = await getAdminProfile();
      if (profile) {
        setAdminDisplayName(profile.displayName || '');
        setAdminEmail(profile.contactEmail || '');
      }
    }
    loadSettings();
  }, []);

  const handleOpenSection = (name) => {
    if (name === 'Auto-Status Schedule') {
      setShowScheduleModal(true);
    } else if (name === 'Shop Preferences') {
      setShowShopModal(true);
    } else if (name === 'Profile Settings') {
      setShowProfileModal(true);
    } else if (name === 'Notifications') {
      setShowNotificationsModal(true);
    } else {
      alert(`Settings for "${name}" are coming soon.`);
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
      } else {
        alert('Browser notification permission is required to enable alerts.');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
    }
  };


  const saveSchedule = async () => {
    setIsSaving(true);
    await saveShopSettings({
      autoScheduleEnabled: scheduleEnabled,
      openTime,
      closeTime
    });
    setIsSaving(false);
    setShowScheduleModal(false);
  };

  const saveShopPrefs = async () => {
    setIsSaving(true);
    await saveShopSettings({
      tableCount
    });
    setIsSaving(false);
    setShowShopModal(false);
  };

  const saveProfile = async () => {
    setIsSaving(true);
    await saveAdminProfile({
      displayName: adminDisplayName,
      contactEmail: adminEmail
    });
    setIsSaving(false);
    setShowProfileModal(false);
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your admin preferences and account security.</p>
      </div>

      {/* Settings List */}
      <div className="settings-list">
        {sections.map((section) => (
          <button
            key={section.name}
            onClick={() => handleOpenSection(section.name)}
            className="settings-item"
          >
            <div className={`settings-item-icon ${section.iconClass}`}>
              <section.icon size={24} />
            </div>
            <div className="settings-item-content">
              <h3 className="settings-item-title">{section.name}</h3>
              <p className="settings-item-desc">{section.desc}</p>
            </div>
            <div className="settings-item-arrow">
              <ChevronRight size={22} />
            </div>
          </button>
        ))}
      </div>

      {/* Version info */}
      <div className="settings-version">
        <p>Chiya Jivan Admin · Version 2.4.0 · Stable</p>
      </div>

      {showScheduleModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            {/* Header */}
            <div className="settings-modal-header">
              <div className="settings-modal-header-left">
                <div className="settings-modal-icon">
                  <Clock size={20} strokeWidth={2.5} />
                </div>
                <h2>Auto-Status Schedule</h2>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="settings-modal-close"
                disabled={isSaving}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="settings-modal-body">
              {/* Toggle Section */}
              <div className="settings-modal-toggle-card">
                <div>
                  <h3>Enable Auto-Schedule</h3>
                  <p>Automatically open and close shop.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className={`settings-toggle ${scheduleEnabled ? 'active' : 'inactive'}`}
                  disabled={isSaving}
                >
                  <div className="settings-toggle-thumb" />
                </button>
              </div>

              {/* Time Inputs */}
              <div className={`settings-modal-times ${scheduleEnabled ? 'active' : 'disabled'}`}>
                <div className="settings-modal-times-card">
                  <div className="settings-time-group">
                    <label>Open Time</label>
                    <div className="settings-time-input-wrap">
                      <input 
                        type="time" 
                        value={openTime}
                        onChange={(e) => setOpenTime(e.target.value)}
                        className="settings-time-input"
                      />
                      <div className="settings-time-icon">
                        <Clock size={18} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                  <div className="settings-time-group">
                    <label>Close Time</label>
                    <div className="settings-time-input-wrap">
                      <input 
                        type="time" 
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="settings-time-input"
                      />
                      <div className="settings-time-icon">
                        <Clock size={18} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="settings-modal-footer">
              <button
                onClick={saveSchedule}
                disabled={isSaving}
                className="settings-modal-save"
              >
                <Save size={20} strokeWidth={2.5} />
                {isSaving ? 'Saving Changes...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showShopModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            <div className="settings-modal-header">
              <div className="settings-modal-header-left">
                <div className="settings-modal-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <Wallet size={20} strokeWidth={2.5} />
                </div>
                <h2>Shop Preferences</h2>
              </div>
              <button 
                onClick={() => setShowShopModal(false)}
                className="settings-modal-close"
                disabled={isSaving}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="settings-modal-body">
              <div className="settings-modal-times-card">
                <div className="settings-time-group">
                  <label>Number of Tables</label>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem 0' }}>Sets how many QR codes are generated and tracked.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      onClick={() => setTableCount(Math.max(1, tableCount - 1))}
                      style={{ width: '48px', height: '48px', borderRadius: '0.75rem', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '1.25rem', color: '#4b5563', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={tableCount}
                      onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                      style={{ width: '80px', textAlign: 'center', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', outline: 'none' }}
                    />
                    <button
                      onClick={() => setTableCount(Math.min(100, tableCount + 1))}
                      style={{ width: '48px', height: '48px', borderRadius: '0.75rem', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '1.25rem', color: '#4b5563', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                onClick={saveShopPrefs}
                disabled={isSaving}
                className="settings-modal-save"
              >
                <Save size={20} strokeWidth={2.5} />
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotificationsModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            <div className="settings-modal-header">
              <div className="settings-modal-header-left">
                <div className="settings-modal-icon" style={{ backgroundColor: '#fff7ed', color: '#f59e0b' }}>
                  <Bell size={20} strokeWidth={2.5} />
                </div>
                <h2>Notification Settings</h2>
              </div>
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="settings-modal-close"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="settings-modal-body">
              <div className="settings-modal-toggle-card">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {notificationsEnabled ? '🔔' : '🔕'} Browser Notifications
                  </h3>
                  <p>Get instant alerts when new orders arrive.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleNotifications}
                  className={`settings-toggle ${notificationsEnabled ? 'active' : 'inactive'}`}
                >
                  <div className="settings-toggle-thumb" />
                </button>
              </div>
              
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.5' }}>
                  <strong>Note:</strong> These alerts depend on your browser settings. If you don't receive alerts, please check if notifications are blocked for this site in your browser's address bar.
                </p>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="settings-modal-save"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            <div className="settings-modal-header">
              <div className="settings-modal-header-left">
                <div className="settings-modal-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                  <User size={20} strokeWidth={2.5} />
                </div>
                <h2>Profile Settings</h2>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="settings-modal-close"
                disabled={isSaving}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="settings-modal-body">
              <div className="settings-modal-times-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="settings-time-group">
                  <label>Display Name</label>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>How your name appears in the dashboard and notifications.</p>
                  <div className="settings-time-input-wrap">
                    <input 
                      type="text" 
                      value={adminDisplayName}
                      onChange={(e) => setAdminDisplayName(e.target.value)}
                      placeholder="e.g. Leejaw Chitrakar"
                      className="settings-time-input"
                      style={{ paddingLeft: '2.75rem' }}
                    />
                    <div className="settings-time-icon">
                      <User size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="settings-time-group">
                  <label>Contact Email</label>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>Used for system updates and account-related alerts.</p>
                  <div className="settings-time-input-wrap">
                    <input 
                      type="email" 
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="settings-time-input"
                      style={{ paddingLeft: '2.75rem' }}
                    />
                    <div className="settings-time-icon">
                      <Mail size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="settings-modal-save"
              >
                <Save size={20} strokeWidth={2.5} />
                {isSaving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
