import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Database, 
  Trash2, 
  RefreshCcw, 
  AlertTriangle, 
  Activity,
  UserCheck,
  Lock
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
  updateSystemMaintenance
} from "../lib/firestoreService";
import "./SuperAdmin.css";

export default function SuperAdmin() {
  const [shopSettings, setShopSettings] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("controls"); // controls, staff, audit

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
      await item.action();
      await logAuditAction(item.title, "Success");
      setConfirmAction(null);
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
              <button 
                className="super-card-btn"
                style={{ background: item.color }}
                onClick={() => setConfirmAction(item)}
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
                  <th>User Email</th>
                  <th>Current Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid}>
                    <td className="staff-email">{u.email || u.uid}</td>
                    <td>
                      <span className={`role-pill ${u.role || 'visitor'}`}>{u.role || 'visitor'}</span>
                    </td>
                    <td className="staff-actions">
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
            {auditLogs.map(log => (
              <div key={log.id} className="audit-item">
                <div className="audit-info">
                  <span className="audit-action">{log.action}</span>
                  <span className="audit-user">by {log.user}</span>
                </div>
                <div className="audit-detail">{log.detail}</div>
                <div className="audit-time">{log.timestamp?.toDate().toLocaleString()}</div>
              </div>
            ))}
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
    </div>
  );
}
