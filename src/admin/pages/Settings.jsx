import { useState, useEffect } from 'react';
import { Shield, Bell, User, Clock, Wallet, ChevronRight, X, Save } from 'lucide-react';
import { getShopSettings, saveShopSettings } from '../../lib/firestoreService';
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

export default function Settings() {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [openTime, setOpenTime] = useState('07:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const data = await getShopSettings();
      if (data) {
        if (data.autoScheduleEnabled !== undefined) setScheduleEnabled(data.autoScheduleEnabled);
        if (data.openTime) setOpenTime(data.openTime);
        if (data.closeTime) setCloseTime(data.closeTime);
      }
    }
    loadSettings();
  }, []);

  const handleOpenSection = (name) => {
    if (name === 'Auto-Status Schedule') {
      setShowScheduleModal(true);
    } else {
      alert(`Settings for "${name}" are coming soon.`);
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

      {/* Danger Zone */}
      <div className="settings-danger-card">
        <h3 className="settings-danger-title">Danger Zone</h3>
        <p className="settings-danger-desc">These actions are irreversible. Please proceed with caution.</p>
        <button className="settings-danger-btn">
          Reset All Settings
        </button>
      </div>

      {/* Version info */}
      <div className="settings-version">
        <p>Chiya Jivan Admin · Version 2.4.0 · Stable</p>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#3d2b1f]">Auto-Status Schedule</h2>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSaving}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Enable Auto-Schedule</h3>
                  <p className="text-xs text-gray-500 mt-1">Automatically open and close shop.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className="relative transition-colors duration-300"
                  style={{
                    width: 52, height: 28, borderRadius: 14,
                    background: scheduleEnabled ? '#10b981' : '#d1d5db',
                  }}
                  disabled={isSaving}
                >
                  <div className="absolute bg-white shadow-lg transition-all duration-300" style={{
                    width: 22, height: 22, borderRadius: 11, top: 3,
                    transform: scheduleEnabled ? 'translateX(27px)' : 'translateX(3px)',
                  }} />
                </button>
              </div>

              <div className="space-y-4" style={{ opacity: scheduleEnabled ? 1 : 0.5, pointerEvents: scheduleEnabled ? 'auto' : 'none' }}>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Open Time</label>
                  <input 
                    type="time" 
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#AD4928] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Close Time</label>
                  <input 
                    type="time" 
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#AD4928] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={saveSchedule}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#AD4928] hover:bg-[#8B3A20] text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
