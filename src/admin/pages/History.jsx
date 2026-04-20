import { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Coffee,
} from "lucide-react";
import {
  getOrdersByDateRange,
  subscribeToShopSettings,
} from "../../lib/firestoreService";
import "../styles/History.css";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [tableNames, setTableNames] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("today"); // today, yesterday, 7days, all
  const [stats, setStats] = useState({
    revenue: 0,
    count: 0,
    avg: 0,
    items: 0,
  });

  const exportToCSV = () => {
    if (orders.length === 0) return;

    const headers = ["Date,Table,Items,Total,Status\n"];
    const rows = orders.map((o) => {
      const date = o.createdAt?.toDate().toLocaleDateString() || "";
      const items = (o.itemsSummary || "").replace(/,/g, " | ");
      return `${date},${o.table},${items},${o.total},${o.status}`;
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chiya_jivan_history_${filterType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.table?.toString().includes(searchTerm) ||
      o.itemsSummary?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    fetchData();

    // Subscribe to shop settings for table names
    const unsub = subscribeToShopSettings((settings) => {
      if (settings && settings.tableNames) {
        setTableNames(settings.tableNames);
      }
    });
    return () => unsub();
  }, [filterType]);

  const fetchData = async () => {
    setLoading(true);
    let start = new Date();
    let end = new Date();

    if (filterType === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (filterType === "yesterday") {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (filterType === "7days") {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start = null;
      end = null;
    }

    const data = await getOrdersByDateRange(start, end);
    const completedOrders = data.filter(
      (o) => o.status === "Completed" || o.status === "Served",
    );

    // Calculate stats
    const revenue = completedOrders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0,
    );
    const count = completedOrders.length;
    const avg = count > 0 ? Math.round(revenue / count) : 0;
    const items = completedOrders.reduce((sum, o) => {
      // Assuming items is an array or string summary
      return sum + (o.items?.length || 0);
    }, 0);

    setOrders(data);
    setStats({ revenue, count, avg, items });
    setLoading(false);
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const date = ts.toDate();
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="history-container">
      {/* ── Header ── */}
      <div className="history-header">
        <p className="font-bold uppercase tracking-widest text-[#AD4928] text-[10px] mb-1">
          Performance Archive
        </p>
        <h1 className="history-title">Sales History</h1>
      </div>
      {/* ── Filters & Export ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="filter-bar no-scrollbar">
          <button
            onClick={() => setFilterType("today")}
            className={`filter-btn ${filterType === "today" ? "filter-btn-active" : "filter-btn-inactive"}`}
          >
            Today
          </button>
          <button
            onClick={() => setFilterType("yesterday")}
            className={`filter-btn ${filterType === "yesterday" ? "filter-btn-active" : "filter-btn-inactive"}`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setFilterType("7days")}
            className={`filter-btn ${filterType === "7days" ? "filter-btn-active" : "filter-btn-inactive"}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setFilterType("all")}
            className={`filter-btn ${filterType === "all" ? "filter-btn-active" : "filter-btn-inactive"}`}
          >
            All Time
          </button>
        </div>

        <button
          onClick={exportToCSV}
          className="history-export-btn active:scale-95 transition-all"
        >
          <Download size={18} />
          Export Detailed CSV
        </button>
      </div>

      {/* ── Stats Highlights ── */}
      <div className="history-summary-grid">
        <div className="history-card card-revenue">
          <div className="card-icon bg-emerald-50 text-emerald-600">
            <IndianRupee size={22} />
          </div>
          <div className="card-body">
            <p className="card-label">Total Revenue</p>
            <p className="card-value">Rs. {stats.revenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="history-card card-orders">
          <div className="card-icon bg-blue-50 text-blue-600">
            <ShoppingBag size={22} />
          </div>
          <div className="card-body">
            <p className="card-label">Total Orders</p>
            <p className="card-value">{stats.count}</p>
          </div>
        </div>

        <div className="history-card card-items">
          <div className="card-icon bg-orange-50 text-orange-600">
            <TrendingUp size={22} />
          </div>
          <div className="card-body">
            <p className="card-label">Avg. Value</p>
            <p className="card-value">Rs. {stats.avg}</p>
          </div>
        </div>

        <div className="history-card card-growth">
          <div className="card-icon bg-purple-50 text-purple-600">
            <Coffee size={22} />
          </div>
          <div className="card-body">
            <p className="card-label">Items Sold</p>
            <p className="card-value">{stats.items}</p>
          </div>
        </div>
      </div>

      {/* ── Order List ── */}
      <div className="history-list-section">
        <div className="list-header gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#AD4928] rounded-full"></div>
            <h3 className="font-bold text-[#3D2B1F] text-xl">
              Order History Logs
            </h3>
          </div>
          <div className="relative flex-1 max-w-lg">
            <Search
              className="absolute text-gray-400"
              size={20}
              style={{
                left: "18px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              placeholder="Search table number or item names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-6 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#AD4928]/5 focus:border-[#AD4928]/30 transition-all text-base shadow-sm"
              style={{ paddingLeft: "52px" }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#AD4928] border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-4">📜</p>
            <p className="font-bold text-gray-800">No records found</p>
            <p className="text-gray-400 text-sm mt-1">
              Adjust your filters to see more orders.
            </p>
          </div>
        ) : (
          <>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Table</th>
                  <th>Items Summary</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium">
                      {formatDate(order.createdAt)}
                    </td>
                    <td>
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">
                        {order.tableName ||
                          tableNames[order.table] ||
                          `Table ${order.table}`}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-gray-500">
                      {order.itemsSummary || "—"}
                    </td>
                    <td className="font-bold text-[#3D2B1F]">
                      Rs. {order.total}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${order.status === "Completed" || order.status === "Served" ? "status-completed" : "status-pending"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="mobile-history-list">
              {filteredOrders.map((order) => (
                <div key={order.id} className="mobile-history-card">
                  <div className="mobile-row">
                    <span className="font-bold text-[#AD4928]">
                      {order.tableName ||
                        tableNames[order.table] ||
                        `Table ${order.table}`}
                    </span>
                    <span
                      className={`status-badge ${order.status === "Completed" || order.status === "Served" ? "status-completed" : "status-pending"}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#9CA3AF] text-xs">
                    <Clock size={12} /> {formatDate(order.createdAt)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {order.itemsSummary || "—"}
                  </p>
                  <div className="mobile-row border-t border-gray-100 pt-3 mt-1">
                    <span className="mobile-label">Total Amount</span>
                    <span className="font-bold text-lg text-[#3D2B1F]">
                      Rs. {order.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
