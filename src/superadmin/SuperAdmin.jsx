import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Database,
  Trash2,
  RefreshCcw,
  AlertTriangle,
  Activity,
  UserCheck,
  Lock,
  Bell,
  RefreshCw,
  Eraser
} from "lucide-react";
import {
  subscribeToShopSettings,
  resetAllTables,
  runDatabaseOrganize,
  purgeOldOrders,
  getAllUsers,
  updateUserRole,
  subscribeToAuditLogs,
  logAuditAction,
  updateSystemMaintenance,
  clearAuditLogs,
  purgeOrdersBeforeDate
} from "../lib/firestoreService";
import "./SuperAdmin.css";

const bellSound = new Audio("/bell-chime.mp3");
const playTestSound = () => {
  bellSound.currentTime = 0;
  bellSound.play().catch(e => console.log("Sound play failed", e));
};

const playTestNotification = () => {
  if (Notification.permission === "granted") {
    new Notification("Chiya Jivan Test", {
      body: "This is a test notification from the Super Admin Console.",
      icon: "/favicon.ico"
    });
  } else {
    alert("Notification permission is not granted. Please enable it in Settings.");
  }
};

export default function SuperAdmin() {
  const [shopSettings, setShopSettings] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("controls"); // controls, staff, audit
  const [showTestModal, setShowTestModal] = useState(false);
  const [purgeDate, setPurgeDate] = useState("");

  useEffect(() => {
    const unsubSettings = subscribeToShopSettings(setShopSettings);
    const unsubAudit = subscribeToAuditLogs(setAuditLogs);

    // Fetch users initially
    getAllUsers().then(setUsers);

    return () => {
      unsubSettings();
      unsubAudit();
    };
  }, []);

  const handleAction = async (item) => {
    setIsProcessing(true);
    try {
      const result = await item.action();
      const detail = typeof result === "number" ? `Success (${result} records affected)` : "Success";
      await logAuditAction(item.title, detail);
      setConfirmAction(null);
      if (typeof result === "number") {
        alert(`${item.title} completed. ${result} records removed.`);
      }
    } catch (err) {
      alert("Action failed!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleUpdate = async (uid, newRole) => {
    try {
      await updateUserRole(uid, newRole);
      await logAuditAction("Role Update", `Changed user ${uid} to ${newRole}`);
      // Refresh user list
      const updated = await getAllUsers();
      setUsers(updated);
    } catch (err) {
      alert("Failed to update role");
    }
  };

  const criticalActions = [
    {
      id: "maintenance",
      title: "Maintenance Mode",
      desc: "Take the entire site down for customers. Admin panels remain accessible.",
      icon: ShieldAlert,
      color: "#dc2626",
      status: shopSettings?.isSiteDown ? "Active" : "Inactive",
      action: () => updateSystemMaintenance(!shopSettings?.isSiteDown),
      btnText: shopSettings?.isSiteDown ? "Bring Site Back Online" : "Shutdown Site Now"
    },
    {
      id: "organize",
      title: "Organize Database",
      desc: "Re-sync all menu items and categories from the master seed file. This will restore default items.",
      icon: Database,
      color: "#AD4928",
      action: () => runDatabaseOrganize(),
      btnText: "Run DB Sync"
    },
    {
      id: "clear_logs",
      title: "Purge Old Orders",
      desc: "Delete orders older than 30 days to optimize database performance.",
      icon: Trash2,
      color: "#6b7280",
      action: () => purgeOldOrders(30),
      btnText: "Purge >30 Days"
    },
    {
      id: "clear_audit",
      title: "Clear Audit History",
      desc: "Wipe the system audit logs. Useful for clearing development history or keeping logs tidy.",
      icon: Eraser,
      color: "#9ca3af",
      action: () => clearAuditLogs(),
      btnText: "Wipe Audit Logs"
    },
    {
      id: "reset_tables",
      title: "Reset Occupancy",
      desc: "Instantly clear all 'Busy' table markers. Useful if table status gets stuck or for end-of-day resets.",
      icon: RefreshCw,
      color: "#10b981",
      action: () => resetAllTables(),
      btnText: "Clear All Tables"
    },
    {
      id: "test_features",
      title: "Test Features",
      desc: "Run diagnostics on system alert mechanisms to ensure staff stay informed.",
      icon: Bell,
      color: "#3b82f6",
      action: () => setShowTestModal(true),
      btnText: "Open Test Suite"
    },
    {
      id: "purge_by_date",
      title: "Custom Data Purge",
      desc: "Permanently delete all orders created on or before a specific date. Use with extreme caution.",
      icon: Trash2,
      color: "#ef4444",
      action: () => purgeOrdersBeforeDate(purgeDate),
      btnText: "Purge by Date",
      requiresDate: true
    }
  ];

  return (
    <div className="super-admin-container">
      <div className="super-header">
        <div className="flex items-center gap-4">
          <div className="super-icon-bg">
            <Lock size={24} className="text-white" />
          </div>
          <div>
            <h1 className="super-title">Super Admin Console</h1>
            <p className="super-subtitle">Restricted High-Level System Controls</p>
          </div>
        </div>
        <div className={`system-status ${shopSettings?.isSiteDown ? 'down' : 'up'}`}>
          <Activity size={16} />
          {shopSettings?.isSiteDown ? 'Site is Down' : 'System Healthy'}
        </div>
      </div>

      <div className="super-tabs">
        <button className={activeTab === 'controls' ? 'active' : ''} onClick={() => setActiveTab('controls')}>System Controls</button>
        <button className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Staff Management</button>
        <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>Audit Logs</button>
      </div>

      {activeTab === 'controls' && (
        <div className="super-grid">
          {criticalActions.map((item) => (
            <div key={item.id} className="super-card" style={{ borderLeft: `4px solid ${item.color}` }}>
              <div className="super-card-header">
                <item.icon size={24} style={{ color: item.color }} />
                {item.status && <span className={`super-status-badge ${item.status.toLowerCase()}`}>{item.status}</span>}
              </div>
              <h3 className="super-card-title">{item.title}</h3>
              <p className="super-card-desc">{item.desc}</p>

              {item.requiresDate && (
                <div className="purge-date-input-wrapper">
                  <label>Select Cutoff Date:</label>
                  <input 
                    type="date" 
                    className="purge-date-input"
                    value={purgeDate}
                    onChange={(e) => setPurgeDate(e.target.value)}
                  />
                </div>
              )}

              <button
                className="super-card-btn"
                style={{ background: item.color }}
                onClick={() => {
                  if (item.id === "test_features") {
                    setShowTestModal(true);
                  } else if (item.requiresDate && !purgeDate) {
                    alert("Please select a date first.");
                  } else {
                    setConfirmAction(item);
                  }
                }}
                disabled={isProcessing}
              >
                {item.btnText}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="staff-management-card">
          <div className="table-responsive">
            <table className="staff-table">
              <thead>
                <tr>
                  <th className="staff-member-header">Staff Member</th>
                  <th className="role-header">Current Role</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid}>
                    <td className="staff-email" data-label="Staff Member">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>
                          {u.displayName || "No Name Set"}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {u.email || u.uid}
                        </span>
                      </div>
                    </td>
                    <td data-label="Current Role">
                      <span className={`role-pill ${u.role || 'visitor'}`}>{u.role || 'visitor'}</span>
                    </td>
                    <td className="staff-actions" data-label="Update Role">
                      <select
                        value={u.role || 'visitor'}
                        onChange={(e) => handleRoleUpdate(u.uid, e.target.value)}
                        className="role-select"
                      >
                        <option value="visitor">Visitor</option>
                        <option value="waiter">Waiter</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="audit-logs-card">
          <div className="audit-list">
            {auditLogs.map(log => {
              // Try to find the user's display name from our users list
              // Check against UID, login email (if we ever save it), or the contactEmail set in profile
              const staffMember = users.find(u => {
                const logUserLower = log.user?.toLowerCase();
                return (
                  u.uid === log.user || 
                  u.email?.toLowerCase() === logUserLower || 
                  u.contactEmail?.toLowerCase() === logUserLower
                );
              });
              const displayName = staffMember?.displayName || log.user;

              return (
                <div key={log.id} className="audit-item">
                  <div className="audit-info">
                    <span className="audit-action">{log.action}</span>
                    <span className="audit-user">by {displayName}</span>
                  </div>
                  <div className="audit-detail">{log.detail}</div>
                  <div className="audit-time">{log.timestamp?.toDate().toLocaleString()}</div>
                </div>
              );
            })}
            {auditLogs.length === 0 && <p className="text-center py-8 text-gray-400">No recent activity logs.</p>}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="super-modal-overlay">
          <div className="super-modal">
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <h3>Are you absolutely sure?</h3>
            <p>You are about to perform: <strong>{confirmAction.title}</strong>. This action may affect live users.</p>
            <div className="super-modal-actions">
              <button className="super-modal-cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="super-modal-confirm"
                style={{ background: confirmAction.color }}
                onClick={() => handleAction(confirmAction)}
              >
                {isProcessing ? "Processing..." : "Yes, Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Test Modal */}
      {showTestModal && (
        <div className="super-modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="super-modal" onClick={(e) => e.stopPropagation()}>
            <div className="super-modal-icon-bg" style={{ background: '#eff6ff', color: '#3b82f6', margin: '0 auto 1.5rem auto' }}>
              <Bell size={32} />
            </div>
            <h3>System Test Suite</h3>
            <p>Select a feature below to run a real-time diagnostic test on the system alerts.</p>

            <div className="super-feature-grid">
              <button className="super-feature-btn" onClick={playTestSound}>
                <RefreshCcw size={14} className="mr-2 inline" /> Test Kitchen Bell
              </button>
              <button className="super-feature-btn" onClick={playTestNotification}>
                <Bell size={14} className="mr-2 inline" /> Test Browser Notif
              </button>
            </div>

            <div className="mt-8">
              <button className="super-modal-cancel" style={{ width: '100%' }} onClick={() => setShowTestModal(false)}>
                Close Test Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
