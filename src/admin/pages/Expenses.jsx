import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import { getExpenses, addExpense, deleteExpense, getOrdersByDateRange } from "../../lib/firestoreService";

export default function Expenses() {
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("today"); // today, week, month, all
  
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: "", note: "" });

  useEffect(() => {
    loadData();
  }, [filterPeriod]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on filter
      let startDate = null;
      const now = new Date();
      if (filterPeriod === "today") {
        startDate = new Date(now.setHours(0,0,0,0));
      } else if (filterPeriod === "week") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (filterPeriod === "month") {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      // We'll load all expenses and orders, and filter them locally for simplicity if the dataset is small,
      // but ideally this would use the firestore queries.
      const allOrders = await getOrdersByDateRange(startDate, new Date());
      const allExpenses = await getExpenses();

      // Filter local
      const filteredExpenses = allExpenses.filter(e => {
        if (!e.createdAt) return false;
        if (!startDate) return true;
        return e.createdAt.toDate() >= startDate;
      });

      setOrders(allOrders.filter(o => o.status === "Completed"));
      setExpenses(filteredExpenses);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.amount || isNaN(newExpense.amount)) return;

    try {
      await addExpense({
        amount: parseFloat(newExpense.amount),
        note: newExpense.note || "General Expense",
      });
      setNewExpense({ amount: "", note: "" });
      setIsAddingExpense(false);
      loadData();
    } catch (err) {
      console.error("Error adding expense:", err);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Delete this expense?")) {
      try {
        await deleteExpense(id);
        loadData();
      } catch (err) {
        console.error("Error deleting expense:", err);
      }
    }
  };

  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0) - (o.discountAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  // Group orders by payment method (account for discounts here too)
  const cashSales = orders.filter(o => o.paymentMethod === "Cash").reduce((sum, o) => sum + (o.total || 0) - (o.discountAmount || 0), 0);
  const onlineSales = orders.filter(o => o.paymentMethod === "Online").reduce((sum, o) => sum + (o.total || 0) - (o.discountAmount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#AD4928] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#3d2b1f" }}>Expenses & Sales</h1>
          <p style={{ color: "#6b7280", marginTop: 4 }}>Track your revenue and daily expenses.</p>
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          {["today", "week", "month", "all"].map(period => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: "bold",
                background: filterPeriod === period ? "#3d2b1f" : "#f3f4f6",
                color: filterPeriod === period ? "#fff" : "#4b5563",
                border: "none",
                cursor: "pointer",
                textTransform: "capitalize"
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 32 }}>
        <div style={{ background: "#fff", padding: 24, borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 13, color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Revenue</h3>
            <div style={{ background: "#ecfdf5", padding: 8, borderRadius: 10, color: "#059669" }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: "#3d2b1f" }}>Rs. {totalSales}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 13, color: "#9ca3af" }}>
            <span>Cash: <strong style={{color:"#6b7280"}}>Rs. {cashSales}</strong></span>
            <span>Online: <strong style={{color:"#6b7280"}}>Rs. {onlineSales}</strong></span>
          </div>
        </div>

        <div style={{ background: "#fff", padding: 24, borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 13, color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Expenses</h3>
            <div style={{ background: "#fef2f2", padding: 8, borderRadius: 10, color: "#ef4444" }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: "#3d2b1f" }}>Rs. {totalExpenses}</p>
          <p style={{ marginTop: 12, fontSize: 13, color: "#9ca3af" }}>{expenses.length} expense record{expenses.length !== 1 ? 's' : ''}</p>
        </div>

        <div style={{ background: "#fff", padding: 24, borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 13, color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}>Net Balance</h3>
            <div style={{ background: "#f5f3ff", padding: 8, borderRadius: 10, color: "#7c3aed" }}>
              <DollarSign size={20} />
            </div>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: netProfit >= 0 ? "#10b981" : "#ef4444" }}>
            {netProfit < 0 ? "-" : ""}Rs. {Math.abs(netProfit)}
          </p>
          <p style={{ marginTop: 12, fontSize: 13, color: "#9ca3af" }}>Profit margin tracked</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Expenses List */}
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: "bold", color: "#3d2b1f" }}>Logged Expenses</h3>
            <button
              onClick={() => setIsAddingExpense(!isAddingExpense)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "#AD4928", color: "#fff", fontSize: 13, fontWeight: "bold", border: "none", cursor: "pointer" }}
            >
              <Plus size={16} /> Add Expense
            </button>
          </div>

          {isAddingExpense && (
            <form onSubmit={handleAddExpense} style={{ padding: 24, background: "#fdfbf7", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                  style={{ width: 120, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                  required
                />
                <input
                  type="text"
                  placeholder="What was this for?"
                  value={newExpense.note}
                  onChange={e => setNewExpense({...newExpense, note: e.target.value})}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsAddingExpense(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "transparent", color: "#6b7280", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#3d2b1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>Save Expense</button>
              </div>
            </form>
          )}

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {expenses.length === 0 ? (
              <p style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>No expenses logged yet.</p>
            ) : (
              expenses.map(expense => (
                <div key={expense.id} style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: "bold", color: "#3d2b1f" }}>{expense.note}</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                      {expense.createdAt ? new Date(expense.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: "bold", color: "#ef4444" }}>-Rs. {expense.amount}</span>
                    <button onClick={() => handleDeleteExpense(expense.id)} style={{ padding: 6, color: "#ef4444", background: "#fef2f2", border: "none", borderRadius: 8, cursor: "pointer" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales List */}
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: 16, fontWeight: "bold", color: "#3d2b1f" }}>Recent Sales</h3>
          </div>
          
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {orders.length === 0 ? (
              <p style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>No sales in this period.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: "bold", color: "#3d2b1f" }}>Table {order.table}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>
                        {order.createdAt ? new Date(order.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 15, fontWeight: "bold", color: "#10b981" }}>+Rs. {order.total - (order.discountAmount || 0)}</p>
                      {order.discountAmount > 0 && (
                        <p style={{ fontSize: 11, color: "#ef4444", textDecoration: "line-through" }}>Rs. {order.total}</p>
                      )}
                      <p style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: order.paymentMethod === "Online" ? "#3b82f6" : "#6b7280", background: order.paymentMethod === "Online" ? "#eff6ff" : "#f3f4f6", display: "inline-block", padding: "2px 8px", borderRadius: 10, marginTop: 4 }}>
                        {order.paymentMethod || "Unknown"}
                      </p>
                    </div>
                  </div>
                  {order.paymentNote && (
                    <p style={{ fontSize: 13, color: "#6b7280", background: "#fdfbf7", padding: "8px 12px", borderRadius: 8, fontStyle: "italic" }}>
                      📝 {order.paymentNote}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
