import React, { useState, useEffect } from "react";
import { Users, CreditCard, ShoppingBag, Settings, Check, X, ShieldAlert, Edit, Trash2, Shield, Search, RefreshCw, Ban, UserCheck, DollarSign, Plus, Bell } from "lucide-react";
import { User, Order, Payment, Service, SystemSettings } from "../types";

interface AdminDashboardProps {
  token: string;
  onRefreshUserBalance: () => void;
}

export default function AdminDashboard({ token, onRefreshUserBalance }: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<"users" | "payments" | "orders" | "services" | "settings">("users");

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    jazzcash_number: "03077321978",
    jazzcash_name: "Aijaz Ahmed",
    easypaisa_number: "03077321978",
    easypaisa_name: "Aijaz Ahmed",
    system_api_key: "",
    smm_api_url: ""
  });
  const [onlineUsers, setOnlineUsers] = useState<number>(1);
  const [pendingOrderCount, setPendingOrderCount] = useState<number>(0);
  const [lastSeenPendingOrderId, setLastSeenPendingOrderId] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(window.localStorage.getItem("admin_last_seen_order_id") || "0", 10) || 0;
  });
  const [latestOrderId, setLatestOrderId] = useState<number>(0);
  const [addingService, setAddingService] = useState<boolean>(false);
  const [newService, setNewService] = useState<{ name: string; category: string; price_per_k: string; min_qty: string; max_qty: string; upstream_service_id: string }>({
    name: "", category: "", price_per_k: "", min_qty: "100", max_qty: "10000", upstream_service_id: ""
  });

  // Search / Filters
  const [userSearch, setUserSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  
  // Modals / Selected Items for actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState("");
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "deduct">("add");
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Loading & Messages
  const [loading, setLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const clearMessages = () => {
    setAdminError("");
    setAdminSuccess("");
  };

  // --- API CALLS ---

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        setServices(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch("/api/stats/online");
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.onlineUsers || 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingOrderCount(data.pendingOrders || 0);
        setLatestOrderId(data.latestOrderId || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAllAdminData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchPayments(),
      fetchOrders(),
      fetchServices(),
      fetchSettings(),
      fetchOnlineUsers(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAllAdminData();
  }, [adminTab]);

  useEffect(() => {
    fetchOnlineUsers();
    const timer = setInterval(fetchOnlineUsers, 15000);
    return () => clearInterval(timer);
  }, []);

  // Poll admin notifications (pending orders) every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  // When admin actually views the Orders tab, mark the latest pending order as seen
  useEffect(() => {
    if (adminTab === "orders" && latestOrderId > lastSeenPendingOrderId) {
      setLastSeenPendingOrderId(latestOrderId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("admin_last_seen_order_id", String(latestOrderId));
      }
    }
  }, [adminTab, latestOrderId, lastSeenPendingOrderId]);

  const hasNewOrderNotification = latestOrderId > lastSeenPendingOrderId && pendingOrderCount > 0;

  // Handle Balance adjustment (Add or Deduct)
  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceAdjustment) return;
    clearMessages();

    const amountNum = parseFloat(balanceAdjustment);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAdminError("Please specify a valid positive numeric amount.");
      return;
    }

    const endpoint = adjustmentMode === "add" ? "/api/admin/users/add-balance" : "/api/admin/users/deduct-balance";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: amountNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust balance");

      setAdminSuccess(data.message);
      setBalanceAdjustment("");
      setSelectedUser(null);
      fetchUsers();
      onRefreshUserBalance(); // Refresh own balance if admin modified themselves
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Block/Unblock User
  const handleToggleBlock = async (user: User) => {
    clearMessages();
    const newBlockedState = user.is_blocked === 0;

    try {
      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          isBlocked: newBlockedState,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change user block status");

      setAdminSuccess(data.message);
      fetchUsers();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Remove User
  const handleRemoveUser = async (userId: number) => {
    if (!confirm("Are you sure you want to permanently delete this user? This removes all of their orders and payments history as well.")) return;
    clearMessages();

    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove user");

      setAdminSuccess(data.message);
      fetchUsers();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Approve Deposit Payment
  const handleApprovePayment = async (paymentId: number) => {
    clearMessages();
    try {
      const res = await fetch("/api/admin/payments/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve deposit");

      setAdminSuccess(data.message);
      fetchPayments();
      fetchUsers();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Reject Deposit Payment
  const handleRejectPayment = async (paymentId: number) => {
    clearMessages();
    try {
      const res = await fetch("/api/admin/payments/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject deposit");

      setAdminSuccess(data.message);
      fetchPayments();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Update Order Status
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    clearMessages();
    try {
      const res = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order status");

      setAdminSuccess(data.message);
      fetchOrders();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Cancel an order (refunds user via server)
  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Cancel this order and refund the user's balance?")) return;
    await handleUpdateOrderStatus(orderId, "Cancelled");
    onRefreshUserBalance();
  };

  // Handle Save Service Details / Price
  const handleUpdateServicePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    clearMessages();

    try {
      const res = await fetch("/api/admin/services/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: editingService.id,
          name: editingService.name,
          category: editingService.category,
          price_per_k: editingService.price_per_k,
          min_qty: editingService.min_qty,
          max_qty: editingService.max_qty,
          upstream_service_id: (editingService as any).upstream_service_id || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update service");

      setAdminSuccess(data.message);
      setEditingService(null);
      fetchServices();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      const res = await fetch("/api/admin/services/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newService),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add service");
      setAdminSuccess(data.message);
      setAddingService(false);
      setNewService({ name: "", category: "", price_per_k: "", min_qty: "100", max_qty: "10000", upstream_service_id: "" });
      fetchServices();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Delete Service
  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Delete this service permanently? Existing user orders that reference it will still show.")) return;
    clearMessages();
    try {
      const res = await fetch("/api/admin/services/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete service");
      setAdminSuccess(data.message);
      fetchServices();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Handle Update System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    try {
      const res = await fetch("/api/admin/settings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setAdminSuccess(data.message);
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Search filtration
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.mobile && u.mobile.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredOrders = orders.filter(o =>
    String(o.id).includes(orderSearch) ||
    o.link.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.user_name && o.user_name.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  return (
    <div id="admin-dashboard-wrapper" className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Admin Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-400" />
            KoSh Vote Software — Administrator Panel
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage user wallets, verify deposits, control order fulfilment, and edit service categories & prices — all manually, no third-party API.
          </p>
        </div>
        
        {/* Sync trigger button */}
        <button
          id="admin-sync-button"
          onClick={refreshAllAdminData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer font-medium text-xs self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Data Logs</span>
        </button>
      </div>

      {/* Admin Quick stats summaries */}
      <div id="admin-stats-bento" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        
        {/* Total Users */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-gray-500 font-mono font-bold">Total Clients</span>
            <strong className="text-2xl font-black text-white block mt-1">{users.length}</strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Total SMM Orders */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-gray-500 font-mono font-bold">Orders Logged</span>
            <strong className="text-2xl font-black text-white block mt-1">{orders.length}</strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Pending deposits count */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-gray-500 font-mono font-bold">Pending Deposits</span>
            <strong className="text-2xl font-black text-amber-400 block mt-1">
              {payments.filter(p => p.status === "Pending").length}
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Online Active check (Real-time monitoring) */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-gray-500 font-mono font-bold">Online Now</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <strong className="text-2xl font-black text-emerald-400 block mt-1">
              {onlineUsers} <span className="text-xs text-gray-500 font-bold font-sans">Active</span>
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* Total Client Funds */}
        <div className="glass p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-gray-500 font-mono font-bold">Clients Balance</span>
            <strong className="text-2xl font-black text-white block mt-1 font-mono">
              Rs. {users.reduce((acc, curr) => acc + curr.balance, 0).toFixed(0)}
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Admin Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4 mb-8">
        <button
          id="admin-tab-users"
          onClick={() => setAdminTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            adminTab === "users" ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-900/40 text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Panel ({users.length})</span>
        </button>

        <button
          id="admin-tab-payments"
          onClick={() => setAdminTab("payments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            adminTab === "payments" ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-900/40 text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pending Payments ({payments.filter(p => p.status === "Pending").length})</span>
        </button>

        <button
          id="admin-tab-orders"
          onClick={() => setAdminTab("orders")}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            adminTab === "orders" ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-900/40 text-slate-400 hover:text-white"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Orders ({orders.length})</span>
          {pendingOrderCount > 0 && (
            <span className={`ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${hasNewOrderNotification ? "bg-red-500 text-white animate-pulse" : "bg-amber-500/20 text-amber-300"}`}>
              <Bell className="w-2.5 h-2.5" />
              {pendingOrderCount} pending
            </span>
          )}
        </button>

        <button
          id="admin-tab-services"
          onClick={() => setAdminTab("services")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            adminTab === "services" ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-900/40 text-slate-400 hover:text-white"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Service Prices ({services.length})</span>
        </button>

        <button
          id="admin-tab-settings"
          onClick={() => setAdminTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            adminTab === "settings" ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-900/40 text-slate-400 hover:text-white"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>System Settings</span>
        </button>
      </div>

      {/* Message Notifications */}
      {adminError && (
        <div id="admin-error-banner" className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm max-w-3xl">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{adminError}</span>
        </div>
      )}

      {adminSuccess && (
        <div id="admin-success-banner" className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 text-sm max-w-3xl">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{adminSuccess}</span>
        </div>
      )}

      {/* --- ADMIN TAB: USER CONTROL PANEL --- */}
      {adminTab === "users" && (
        <div id="admin-users-panel" className="space-y-6">
          
          {/* Filters */}
          <div className="flex items-center gap-3 max-w-md bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              id="admin-user-search-input"
              type="text"
              placeholder="Search user by name or mobile..."
              className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-600 w-full"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {/* Users List */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                    <th className="py-3.5 px-4 font-normal">Client ID</th>
                    <th className="py-3.5 px-4 font-normal">Name</th>
                    <th className="py-3.5 px-4 font-normal">Mobile Number</th>
                    <th className="py-3.5 px-4 font-normal text-right">Balance</th>
                    <th className="py-3.5 px-4 font-normal text-center">Status</th>
                    <th className="py-3.5 px-4 font-normal">Last Online</th>
                    <th className="py-3.5 px-4 font-normal text-center">Control Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">#{u.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200">{u.name}</span>
                        {u.is_admin === 1 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{u.mobile || u.email}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">Rs. {u.balance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.is_blocked === 1
                            ? "bg-red-500/10 text-red-400 border border-red-500/25"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                        }`}>
                          {u.is_blocked === 1 ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {u.last_seen ? new Date(u.last_seen).toLocaleString() : "Never"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Add Balance CTA */}
                          <button
                            id={`add-balance-user-${u.id}`}
                            onClick={() => {
                              setSelectedUser(u);
                              setBalanceAdjustment("");
                            }}
                            className="px-2.5 py-1.5 rounded bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-semibold cursor-pointer"
                            title="Add/Deduct Balance"
                          >
                            Add Funds
                          </button>

                          {/* Block/Unblock CTA */}
                          {u.is_admin === 0 && (
                            <button
                              id={`block-user-${u.id}`}
                              onClick={() => handleToggleBlock(u)}
                              className={`p-1.5 rounded transition-all cursor-pointer border ${
                                u.is_blocked === 1
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                                  : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white"
                              }`}
                              title={u.is_blocked === 1 ? "Activate Client" : "Suspend Client"}
                            >
                              {u.is_blocked === 1 ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Delete CTA */}
                          {u.is_admin === 0 && (
                            <button
                              id={`delete-user-${u.id}`}
                              onClick={() => handleRemoveUser(u.id)}
                              className="p-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pop-up Overlay Modal: Add/Deduct Balance */}
          {selectedUser && (
            <div id="add-balance-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                <button
                  id="close-balance-modal"
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">Adjust Client Funds</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Managing wallet for <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.mobile || selectedUser.email}).
                  <br />
                  Current Balance: <strong className="text-emerald-400 font-mono text-xs">Rs. {selectedUser.balance.toFixed(2)}</strong>
                </p>

                {/* Switcher Mode Tab */}
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 mb-5">
                  <button
                    type="button"
                    onClick={() => setAdjustmentMode("add")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      adjustmentMode === "add"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Add Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentMode("deduct")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      adjustmentMode === "deduct"
                        ? "bg-rose-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Deduct Balance
                  </button>
                </div>

                <form onSubmit={handleAdjustBalanceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {adjustmentMode === "add" ? "Amount to Add (PKR)" : "Amount to Deduct (PKR)"}
                    </label>
                    <input
                      id="balance-adjustment-input"
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      placeholder="e.g. 500"
                      className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                      value={balanceAdjustment}
                      onChange={(e) => setBalanceAdjustment(e.target.value)}
                    />
                  </div>

                  <button
                    id="balance-adjustment-submit"
                    type="submit"
                    className={`w-full text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer ${
                      adjustmentMode === "add"
                        ? "bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20"
                        : "bg-rose-600 hover:bg-rose-500 hover:shadow-rose-500/20"
                    }`}
                  >
                    {adjustmentMode === "add" ? "Confirm Add Balance" : "Confirm Deduct Balance"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- ADMIN TAB: PENDING PAYMENTS (DEPOSITS RECONCILIATION) --- */}
      {adminTab === "payments" && (
        <div id="admin-payments-panel" className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            JazzCash Payment Deposits Verification Panel
          </h2>

          {payments.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl py-12 text-center text-slate-500 text-sm">
              No deposit receipts submitted in the database logs.
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                      <th className="py-3.5 px-4 font-normal">Payment ID</th>
                      <th className="py-3.5 px-4 font-normal">Client</th>
                      <th className="py-3.5 px-4 font-normal">Trx ID</th>
                      <th className="py-3.5 px-4 font-normal text-right">Amount</th>
                      <th className="py-3.5 px-4 font-normal text-center">Receipt Screenshot</th>
                      <th className="py-3.5 px-4 font-normal text-center">Status</th>
                      <th className="py-3.5 px-4 font-normal">Submitted Date</th>
                      <th className="py-3.5 px-4 font-normal text-center">Decisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-950/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">#{p.id}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200 block">{p.user_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{p.user_mobile || p.user_email}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-300 select-all">{p.trx_id}</td>
                        <td className="py-3 px-4 text-right font-mono text-white font-bold">Rs. {p.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          {p.screenshot ? (
                            <a
                              href={p.screenshot}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <img
                                src={p.screenshot}
                                alt="screenshot receipt thumbnail"
                                className="w-10 h-10 object-cover rounded-lg border border-slate-800 hover:scale-150 transition-all cursor-zoom-in"
                                referrerPolicy="no-referrer"
                              />
                            </a>
                          ) : (
                            <span className="text-slate-600">No image</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : p.status === "Rejected"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.status === "Pending" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`approve-payment-${p.id}`}
                                onClick={() => handleApprovePayment(p.id)}
                                className="p-1 px-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                id={`reject-payment-${p.id}`}
                                onClick={() => handleRejectPayment(p.id)}
                                className="p-1 px-2 rounded bg-red-600 text-white hover:bg-red-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- ADMIN TAB: AUTO ORDER MANAGER --- */}
      {adminTab === "orders" && (
        <div id="admin-orders-panel" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              Order Management
              {pendingOrderCount > 0 && (
                <span className="ml-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Bell className="w-3 h-3" /> {pendingOrderCount} new pending
                </span>
              )}
            </h2>

            {/* Filter Search */}
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                id="admin-order-search-input"
                type="text"
                placeholder="Search orders, target links, IDs..."
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-600 w-full"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            <button
              id="admin-orders-sync-btn"
              type="button"
              onClick={async () => {
                clearMessages();
                try {
                  const res = await fetch("/api/admin/orders/sync-status", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Sync failed");
                  setAdminSuccess(data.message);
                  fetchOrders();
                } catch (err: any) {
                  setAdminError(err.message);
                }
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync from Panel
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl py-12 text-center text-slate-500 text-sm">
              No orders registered in the system yet.
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                      <th className="py-3.5 px-4 font-normal">Order ID</th>
                      <th className="py-3.5 px-4 font-normal">Client</th>
                      <th className="py-3.5 px-4 font-normal">Service Catalog</th>
                      <th className="py-3.5 px-4 font-normal text-center">Vote Option</th>
                      <th className="py-3.5 px-4 font-normal">Target link</th>
                      <th className="py-3.5 px-4 font-normal text-right">Quantity</th>
                      <th className="py-3.5 px-4 font-normal text-right">Charge</th>
                      <th className="py-3.5 px-4 font-normal text-center">Order Status</th>
                      <th className="py-3.5 px-4 font-normal text-center">Action</th>
                      <th className="py-3.5 px-4 font-normal">Placed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-950/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">#{ord.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {ord.user_name}
                          <span className="text-[10px] text-slate-500 font-mono block font-normal">{ord.user_mobile || ord.user_email}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          <span className="font-semibold block">{ord.service_name}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ord.voting_option ? (
                            <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-mono font-bold text-xs">
                              {ord.voting_option}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono truncate max-w-[200px]" title={ord.link}>
                          <a href={ord.link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                            {ord.link}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">{ord.quantity.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono text-white">Rs. {ord.charge.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <select
                            id={`status-select-order-${ord.id}`}
                            className="bg-slate-950 border border-slate-850 text-[10px] font-bold uppercase rounded p-1 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {ord.status !== "Cancelled" && ord.status !== "Completed" && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(ord.id)}
                                className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-red-500/30 transition-all cursor-pointer"
                              >
                                <Ban className="w-2.5 h-2.5" />
                                Cancel & Refund
                              </button>
                            )}
                            {ord.status === "Cancelled" && (
                              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold font-mono border border-red-500/15">
                                Refunded
                              </span>
                            )}
                            {ord.status === "Completed" && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold font-mono border border-emerald-500/15">
                                Done
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(ord.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- ADMIN TAB: SERVICE PRICE CONFIGURATOR --- */}
      {adminTab === "services" && (
        <div id="admin-services-panel" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Categories & Service Pricing
            </h2>
            <button
              id="admin-add-service-button"
              type="button"
              onClick={() => setAddingService(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Service / Category
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                    <th className="py-3.5 px-4 font-normal">Service ID</th>
                    <th className="py-3.5 px-4 font-normal">Category</th>
                    <th className="py-3.5 px-4 font-normal">Service Description</th>
                    <th className="py-3.5 px-4 font-normal text-right">Price Per 1,000</th>
                    <th className="py-3.5 px-4 font-normal text-right">Min Order Limit</th>
                    <th className="py-3.5 px-4 font-normal text-right">Max Order Limit</th>
                    <th className="py-3.5 px-4 font-normal text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{s.id}</td>
                      <td className="py-3.5 px-4 text-indigo-300 font-medium">{s.category}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{s.name}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">Rs. {s.price_per_k.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{s.min_qty.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{s.max_qty.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`edit-service-${s.id}`}
                            onClick={() => setEditingService(s)}
                            className="p-1 px-2.5 rounded bg-slate-850 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/20 transition-all cursor-pointer text-[10px] flex items-center gap-1"
                          >
                            <Edit className="w-2.5 h-2.5" /> Edit
                          </button>
                          <button
                            id={`delete-service-${s.id}`}
                            onClick={() => handleDeleteService(s.id)}
                            className="p-1 px-2.5 rounded bg-slate-850 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-800 hover:border-red-500/20 transition-all cursor-pointer text-[10px] flex items-center gap-1"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Pricing Edit Modal Popup */}
          {editingService && (
            <div id="edit-service-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                <button
                  id="close-service-modal"
                  onClick={() => setEditingService(null)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-bold text-white mb-2">Edit Service</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Editing: <strong className="text-indigo-400">{editingService.name}</strong>
                </p>

                <form onSubmit={handleUpdateServicePrice} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Name</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors"
                      value={editingService.name}
                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors"
                      value={editingService.category}
                      onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Price Per 1,000 Votes/Orders (PKR)
                    </label>
                    <input
                      id="edit-service-price-input"
                      type="number"
                      required
                      step="any"
                      placeholder="Price per K"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors"
                      value={editingService.price_per_k}
                      onChange={(e) => setEditingService({ ...editingService, price_per_k: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Min Quantity
                      </label>
                      <input
                        id="edit-service-min-qty"
                        type="number"
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                        value={editingService.min_qty}
                        onChange={(e) => setEditingService({ ...editingService, min_qty: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Max Quantity
                      </label>
                      <input
                        id="edit-service-max-qty"
                        type="number"
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                        value={editingService.max_qty}
                        onChange={(e) => setEditingService({ ...editingService, max_qty: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      SMM Panel Service ID <span className="text-slate-500 normal-case">(for auto-dispatch)</span>
                    </label>
                    <input
                      id="edit-service-upstream-id"
                      type="text"
                      placeholder="e.g. 1234"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                      value={(editingService as any).upstream_service_id || ""}
                      onChange={(e) => setEditingService({ ...editingService, upstream_service_id: e.target.value } as any)}
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Leave empty to keep this service manual (no auto-dispatch).</p>
                  </div>

                  <button
                    id="edit-service-submit"
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    Save Service Changes
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Add Service Modal */}
          {addingService && (
            <div id="add-service-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setAddingService(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white mb-2">Add New Service</h3>
                <p className="text-xs text-slate-400 mb-6">Create a new service and category shown to users at checkout.</p>
                <form onSubmit={handleAddService} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Instagram Real Likes"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Instagram Services"
                      list="admin-existing-categories"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors"
                      value={newService.category}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    />
                    <datalist id="admin-existing-categories">
                      {Array.from(new Set(services.map(s => s.category))).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    <span className="text-[10px] text-gray-500 mt-1 block">Pick from existing categories or type a new one.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Price Per 1,000 (PKR)</label>
                    <input
                      type="number"
                      required
                      step="any"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors"
                      value={newService.price_per_k}
                      onChange={(e) => setNewService({ ...newService, price_per_k: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min Qty</label>
                      <input
                        type="number"
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                        value={newService.min_qty}
                        onChange={(e) => setNewService({ ...newService, min_qty: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Max Qty</label>
                      <input
                        type="number"
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                        value={newService.max_qty}
                        onChange={(e) => setNewService({ ...newService, max_qty: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">SMM Panel Service ID <span className="text-slate-500 normal-case">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. 1234"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition-colors font-mono"
                      value={newService.upstream_service_id}
                      onChange={(e) => setNewService({ ...newService, upstream_service_id: e.target.value })}
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Empty = manual service (no auto-dispatch to panel).</p>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    Create Service
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- ADMIN TAB: SYSTEM SETTINGS (JAZZCASH / PROVIDER API KEY) --- */}
      {adminTab === "settings" && (
        <div id="admin-settings-panel" className="glass rounded-2xl p-6 sm:p-8 backdrop-blur-xl max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2 uppercase tracking-tight">
              <Settings className="w-5 h-5 text-indigo-400" />
              Global System Configuration
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure active JazzCash & Easypaisa payment details shown during user top-ups.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            
            {/* JazzCash Section */}
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">JazzCash Mobile Wallet</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Wallet Number
                  </label>
                  <input
                    id="admin-settings-jazzcash-number"
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 outline-none transition-colors font-mono"
                    value={settings.jazzcash_number}
                    onChange={(e) => setSettings({ ...settings, jazzcash_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Account Title Name
                  </label>
                  <input
                    id="admin-settings-jazzcash-name"
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 outline-none transition-colors"
                    value={settings.jazzcash_name}
                    onChange={(e) => setSettings({ ...settings, jazzcash_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Easypaisa Section */}
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Easypaisa Mobile Wallet</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Wallet Number
                  </label>
                  <input
                    id="admin-settings-easypaisa-number"
                    type="text"
                    placeholder="e.g. 03001234567"
                    className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 outline-none transition-colors font-mono"
                    value={settings.easypaisa_number || ""}
                    onChange={(e) => setSettings({ ...settings, easypaisa_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Account Title Name
                  </label>
                  <input
                    id="admin-settings-easypaisa-name"
                    type="text"
                    placeholder="e.g. KoSh Vote Software"
                    className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 outline-none transition-colors"
                    value={settings.easypaisa_name || ""}
                    onChange={(e) => setSettings({ ...settings, easypaisa_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* SMM Panel API Section */}
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">SMM Panel API (Auto-Dispatch)</h3>
              <p className="text-[10px] text-slate-500 -mt-2">Orders are auto-sent to this panel when a service has a mapped Panel Service ID.</p>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Panel API URL</label>
                <input
                  id="admin-settings-smm-url"
                  type="text"
                  placeholder="https://example.com/api/v2"
                  className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 outline-none transition-colors font-mono"
                  value={settings.smm_api_url || ""}
                  onChange={(e) => setSettings({ ...settings, smm_api_url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Panel API Key</label>
                <input
                  id="admin-settings-smm-key"
                  type="text"
                  placeholder="Your SMM panel API key"
                  className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 outline-none transition-colors font-mono"
                  value={settings.system_api_key || ""}
                  onChange={(e) => setSettings({ ...settings, system_api_key: e.target.value })}
                />
              </div>
            </div>

            <button
              id="admin-settings-save-button"
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer"
            >
              Save Configuration Settings
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
