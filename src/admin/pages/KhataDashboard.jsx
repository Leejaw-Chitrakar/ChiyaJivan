import { useState, useEffect } from "react";
import {
  BookOpen,
  AlertCircle,
  Search,
  IndianRupee,
  CheckCircle2,
  X,
  Clock,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import {
  subscribeToKhataDebtors,
  settleKhataPayment,
  getTotalMarketExposure,
  subscribeToKhataAudit,
} from "../../lib/firestoreService";
import { auth } from "../../lib/firebase";
import "../styles/KhataDashboard.css";

const HIGH_DEBT_THRESHOLD = 500;

function formatDate(ts) {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function KhataDashboard({ userRole }) {
  const [debtors, setDebtors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [settleTarget, setSettleTarget] = useState(null); // { customerName, customerPhone, totalDebt }
  const [settleAmount, setSettleAmount] = useState("");
  const [isSettling, setIsSettling] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [totalExposure, setTotalExposure] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const unsub = subscribeToKhataDebtors((data) => {
      setDebtors(data);
      // Calculate exposure from data to avoid extra call
      const total = data.reduce((sum, d) => sum + d.totalDebt, 0);
      setTotalExposure(total);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userRole === "superadmin") {
      const unsub = subscribeToKhataAudit(setAuditLogs);
      return () => unsub();
    }
  }, [userRole]);

  const filteredDebtors = debtors.filter(
    (d) =>
      d.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerPhone?.includes(searchTerm)
  );

  const handleOpenSettle = (debtor) => {
    setSettleTarget(debtor);
    setSettleAmount("");
    setSettleSuccess(false);
  };

  const handleSettleSubmit = async () => {
    if (!settleTarget || !settleAmount || Number(settleAmount) <= 0) return;
    setIsSettling(true);
    try {
      await settleKhataPayment({
        customerPhone: settleTarget.customerPhone,
        customerName: settleTarget.customerName,
        settleAmount: Number(settleAmount),
        adminEmail: auth.currentUser?.email,
      });
      setSettleSuccess(true);
      setTimeout(() => {
        setSettleTarget(null);
        getTotalMarketExposure().then(setTotalExposure);
      }, 1800);
    } catch (err) {
      console.error("Settle failed:", err);
      alert("Failed to settle payment. Please try again.");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="khata-container">
      {/* Header */}
      <div className="khata-header">
        <p className="khata-eyebrow">Credit Ledger</p>
        <h1 className="khata-title">
          <BookOpen size={28} className="inline mr-2 text-[#AD4928]" />
          Digital Khata
        </h1>
        <p className="khata-subtitle">
          Track Khata records and settle payments for your customers.
        </p>
      </div>

      {/* Super Admin Market Exposure Card */}
      {userRole === "superadmin" && (
        <div className="khata-exposure-card">
          <div className="flex items-center gap-3">
            <div className="khata-exposure-icon">
              <Shield size={20} />
            </div>
            <div>
              <p className="khata-exposure-label">Total Market Exposure</p>
              <p className="khata-exposure-value">Rs. {totalExposure.toLocaleString()}</p>
            </div>
          </div>
          <p className="khata-exposure-desc">
            Total outstanding debt across all customers · Super Admin View
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="khata-stats-row">
        <div className="khata-stat-card">
          <IndianRupee size={18} className="text-[#AD4928]" />
          <div>
            <p className="khata-stat-label">Total Outstanding</p>
            <p className="khata-stat-value">
              Rs. {debtors.reduce((s, d) => s + d.totalDebt, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="khata-stat-card">
          <User size={18} className="text-blue-500" />
          <div>
            <p className="khata-stat-label">Customers with Dues</p>
            <p className="khata-stat-value">{debtors.length}</p>
          </div>
        </div>
        <div className="khata-stat-card">
          <AlertCircle size={18} className="text-orange-500" />
          <div>
            <p className="khata-stat-label">High Debt (&gt; Rs.{HIGH_DEBT_THRESHOLD})</p>
            <p className="khata-stat-value">
              {debtors.filter((d) => d.totalDebt > HIGH_DEBT_THRESHOLD).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="khata-list-section">
        {/* Search */}
        <div className="khata-list-header">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#AD4928] rounded-full" />
            <h3 className="font-bold text-[#3D2B1F] text-lg">Khata Records</h3>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute text-gray-400"
              style={{ left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="khata-search"
            />
          </div>
        </div>

        {loading ? (
          <div className="khata-empty">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#AD4928] border-t-transparent" />
          </div>
        ) : filteredDebtors.length === 0 ? (
          <div className="khata-empty">
            <p className="text-4xl mb-3">📒</p>
            <p className="font-bold text-gray-700">All Clear!</p>
            <p className="text-gray-400 text-sm mt-1">No Khata records found.</p>
          </div>
        ) : (
          <div className="khata-table-wrap">
            <table className="khata-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount Owed</th>
                  <th>Last Transaction</th>
                  <th>Entries</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebtors.map((debtor) => (
                  <>
                    <tr
                      key={debtor.key}
                      className={debtor.totalDebt > HIGH_DEBT_THRESHOLD ? "khata-high-debt" : ""}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="khata-avatar">
                            {(debtor.customerName || "G")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#3D2B1F] text-sm flex items-center gap-1">
                              {debtor.customerName || "Guest"}
                              {debtor.totalDebt > HIGH_DEBT_THRESHOLD && (
                                <AlertCircle size={13} className="text-orange-500" />
                              )}
                            </p>
                            {debtor.customerPhone && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone size={10} /> {debtor.customerPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="khata-amount">Rs. {debtor.totalDebt.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                          <Clock size={12} />
                          {formatDate(debtor.lastTransaction)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="khata-expand-btn"
                          onClick={() =>
                            setExpandedKey(expandedKey === debtor.key ? null : debtor.key)
                          }
                        >
                          {debtor.entries.length} orders
                          {expandedKey === debtor.key ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                      </td>
                      <td>
                        <button
                          className="khata-settle-btn"
                          onClick={() => handleOpenSettle(debtor)}
                        >
                          Settle Payment
                        </button>
                      </td>
                    </tr>
                    {expandedKey === debtor.key && (
                      <tr key={`${debtor.key}-expanded`} className="khata-expanded-row">
                        <td colSpan={5}>
                          <div className="khata-entries">
                            {debtor.entries.map((e) => (
                              <div key={e.id} className="khata-entry">
                                <span className="text-xs text-gray-500">{formatDate(e.createdAt)}</span>
                                <span className="text-xs font-bold text-[#3D2B1F]">
                                  Table {e.tableNum}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Bill: Rs.{e.orderTotal} · Paid: Rs.{e.cashReceived}
                                </span>
                                <span className="khata-entry-badge">Due: Rs.{e.balanceDue}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Super Admin Khata Audit Log */}
      {userRole === "superadmin" && auditLogs.length > 0 && (
        <div className="khata-list-section">
          <div className="khata-list-header">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-500 rounded-full" />
              <h3 className="font-bold text-[#3D2B1F] text-lg">Khata Audit Log</h3>
            </div>
          </div>
          <div className="khata-audit-list">
            {auditLogs.map((log) => (
              <div key={log.id} className="khata-audit-entry">
                <div
                  className={`khata-audit-dot ${
                    log.paymentStatus === "Paid" ? "dot-paid" : "dot-partial"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3D2B1F] truncate">
                    {log.customerName || "Guest"} — Table {log.tableNum}
                  </p>
                  <p className="text-xs text-gray-500">
                    Bill: Rs.{log.orderTotal} · Paid: Rs.{log.cashReceived} · Due:{" "}
                    <span className="text-[#AD4928] font-bold">Rs.{log.balanceDue}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">by {log.recordedBy}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {settleTarget && (
        <div className="khata-modal-overlay" onClick={() => setSettleTarget(null)}>
          <div className="khata-modal" onClick={(e) => e.stopPropagation()}>
            <div className="khata-modal-header">
              <h2 className="font-bold text-[#3D2B1F] text-lg">Settle Payment</h2>
              <button onClick={() => setSettleTarget(null)} className="khata-modal-close">
                <X size={18} />
              </button>
            </div>

            {settleSuccess ? (
              <div className="khata-modal-success">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-[#3D2B1F] text-lg">Payment Recorded!</p>
                <p className="text-gray-500 text-sm mt-1">Khata updated successfully.</p>
              </div>
            ) : (
              <div className="khata-modal-body">
                <div className="khata-modal-customer">
                  <div className="khata-avatar large">
                    {(settleTarget.customerName || "G")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#3D2B1F]">{settleTarget.customerName}</p>
                    {settleTarget.customerPhone && (
                      <p className="text-xs text-gray-400">{settleTarget.customerPhone}</p>
                    )}
                    <p className="text-sm text-[#AD4928] font-bold mt-1">
                      Khata Balance: Rs. {settleTarget.totalDebt.toLocaleString()}
                    </p>
                  </div>
                </div>

                <label className="khata-modal-label">Amount Received (Rs.)</label>
                <input
                  type="number"
                  className="khata-modal-input"
                  placeholder={`Max Rs. ${settleTarget.totalDebt}`}
                  value={settleAmount}
                  min={1}
                  max={settleTarget.totalDebt}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  autoFocus
                />

                {settleAmount && Number(settleAmount) > 0 && (
                  <div className="khata-modal-preview">
                    <div className="khata-preview-row">
                      <span>Current Khata</span>
                      <span>Rs. {settleTarget.totalDebt}</span>
                    </div>
                    <div className="khata-preview-row">
                      <span>Settling Now</span>
                      <span className="text-emerald-600 font-bold">− Rs. {settleAmount}</span>
                    </div>
                    <div className="khata-preview-row border-t pt-2 mt-1">
                      <span className="font-bold">Remaining Debt</span>
                      <span className="font-bold text-[#AD4928]">
                        Rs. {Math.max(0, settleTarget.totalDebt - Number(settleAmount)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setSettleAmount(String(settleTarget.totalDebt))}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 800,
                      background: "#fdf2ed",
                      color: "#AD4928",
                      border: "1.5px solid #fde3d5",
                      cursor: "pointer",
                    }}
                  >
                    Pay Full
                  </button>
                  <button
                    className="khata-settle-confirm-btn"
                    style={{ flex: 2 }}
                    onClick={handleSettleSubmit}
                    disabled={isSettling || !settleAmount || Number(settleAmount) <= 0}
                  >
                    {isSettling ? (
                      <span className="flex items-center gap-2 justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Processing…
                      </span>
                    ) : (
                      `Confirm · Rs. ${settleAmount || 0}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
