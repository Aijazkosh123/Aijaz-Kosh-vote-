import React, { useState, useEffect, useRef } from "react";
import { PlusCircle, Wallet, History, Settings, Check, RefreshCw, Upload, AlertTriangle, MessageSquare, Info, ShieldAlert } from "lucide-react";
import { Service, Order, Payment } from "../types";

interface UserDashboardProps {
  token: string;
  userBalance: number;
  onOrderPlaced: (newBalance: number) => void;
}

export default function UserDashboard({ token, userBalance, onOrderPlaced }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<"new-order" | "add-funds" | "order-history" | "deposit-history" | "settings">("new-order");
  
  // API State
  const [services, setServices] = useState<Service[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myDeposits, setMyDeposits] = useState<Payment[]>([]);
  
  // New Order fields
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | "">("");
  const [pollLink, setPollLink] = useState("");
  const [votingOption, setVotingOption] = useState<"A" | "B" | "C" | "D" | "E" | "">("");
  const [quantity, setQuantity] = useState<number>(1000);
  
  // Deposit fields
  const [depositAmount, setDepositAmount] = useState("");
  const [trxId, setTrxId] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState<string>("");
  const [screenshotName, setScreenshotName] = useState("");
  
  // Settings fields
  const [userApiKey, setUserApiKey] = useState("");

  // UI Status
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial services
  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data);
        if (data.length > 0) {
          setSelectedCategory(data[0].category);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch my profile for API Key setting
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserApiKey(data.api_key || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchProfile();
  }, [token]);

  // Handle category shift
  const filteredServices = services.filter(s => s.category === selectedCategory);
  const selectedService = services.find(s => s.id === Number(selectedServiceId));

  // Auto set first service when category changes
  useEffect(() => {
    if (filteredServices.length > 0) {
      setSelectedServiceId(filteredServices[0].id);
      // Auto-set voting option default if it is WhatsApp Voting
      if (filteredServices[0].category.toLowerCase().includes("whatsapp")) {
        setVotingOption("A");
      } else {
        setVotingOption("");
      }
    } else {
      setSelectedServiceId("");
      setVotingOption("");
    }
  }, [selectedCategory, services]);

  // Adjust default voting options when service changes
  const handleServiceChange = (id: number) => {
    setSelectedServiceId(id);
    const service = services.find(s => s.id === id);
    if (service && service.name.toLowerCase().includes("vote")) {
      // Is it choice A, B, C, D, or E? Let's parse out from title or default to A
      const match = service.name.match(/Option ([A-E])/i);
      if (match) {
        setVotingOption(match[1] as any);
      } else {
        setVotingOption("A");
      }
    } else {
      setVotingOption("");
    }
  };

  // Live order cost computation
  const calculatedCost = selectedService
    ? (selectedService.price_per_k / 1000.0) * quantity
    : 0;

  // Handle custom file upload for payments screenshot
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setActionError("File is too large. Max screenshot file size is 8MB.");
        return;
      }
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setActionError("File is too large. Max size is 8MB.");
        return;
      }
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Load Order and Deposit histories
  const fetchHistories = async () => {
    setLoadingHistory(true);
    try {
      // Orders
      const orderRes = await fetch("/api/orders/my", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (orderRes.ok) {
        setMyOrders(await orderRes.json());
      }

      // Deposits
      const depositRes = await fetch("/api/payments/my", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (depositRes.ok) {
        setMyDeposits(await depositRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "order-history" || activeTab === "deposit-history") {
      fetchHistories();
    }
    setActionError("");
    setActionSuccess("");
  }, [activeTab]);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!selectedServiceId) {
      setActionError("Please select a service.");
      return;
    }

    if (!pollLink) {
      setActionError("Please provide a valid URL link.");
      return;
    }

    if (quantity <= 0) {
      setActionError("Quantity must be a positive integer.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          link: pollLink,
          votingOption,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order placement failed");
      }

      // Order success!
      setActionSuccess(data.message);
      onOrderPlaced(userBalance - calculatedCost); // Update user balance locally
      setPollLink("");
      // Reset defaults
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Payment/Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!depositAmount || Number(depositAmount) <= 0) {
      setActionError("Please specify a valid deposit amount.");
      return;
    }

    if (!trxId) {
      setActionError("Please provide the transaction ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          trxId: trxId.trim(),
          screenshot: screenshotBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit deposit");
      }

      setActionSuccess(data.message);
      setDepositAmount("");
      setTrxId("");
      setScreenshotBase64("");
      setScreenshotName("");
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save SMM API Key Settings
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/user/update-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ api_key: userApiKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update API key");
      }

      setActionSuccess(data.message);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get categories list
  const categories = Array.from(new Set(services.map(s => s.category)));

  return (
    <div id="user-dashboard-wrapper" className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Tab Selector Headers */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4 mb-8">
        <button
          id="tab-new-order"
          onClick={() => setActiveTab("new-order")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
            activeTab === "new-order"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Order</span>
        </button>

        <button
          id="tab-add-funds"
          onClick={() => setActiveTab("add-funds")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
            activeTab === "add-funds"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Deposit Funds</span>
        </button>

        <button
          id="tab-orders"
          onClick={() => setActiveTab("order-history")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
            activeTab === "order-history"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Orders</span>
        </button>

        <button
          id="tab-deposits"
          onClick={() => setActiveTab("deposit-history")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
            activeTab === "deposit-history"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>My Deposits</span>
        </button>

        <button
          id="tab-settings"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>API Settings</span>
        </button>
      </div>

      {/* Message Notifications */}
      {actionError && (
        <div id="action-error" className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm max-w-3xl">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div id="action-success" className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 text-sm max-w-3xl">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* --- TAB CONTENT: NEW ORDER --- */}
      {activeTab === "new-order" && (
        <div id="new-order-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Order placement form */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <PlusCircle className="text-indigo-400 w-5 h-5" />
              Place Automatic SMM Order
            </h2>

            <form onSubmit={handlePlaceOrder} className="space-y-6">
              
              {/* Category Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  1. Choose Service Category
                </label>
                <select
                  id="category-select"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 outline-none transition-colors"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Service Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  2. Choose Specific Service
                </label>
                <select
                  id="service-select"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 outline-none transition-colors"
                  value={selectedServiceId}
                  onChange={(e) => handleServiceChange(Number(e.target.value))}
                >
                  <option value="" disabled>-- Select Service --</option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - Rs. {s.price_per_k.toFixed(2)} per K
                    </option>
                  ))}
                </select>
              </div>

              {/* Whatsapp VOTING Options (Conditional) */}
              {selectedService && selectedService.category.toLowerCase().includes("whatsapp") && (
                <div id="whatsapp-voting-options-panel" className="bg-indigo-600/5 border border-indigo-500/10 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Voting Poll Option Selection
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Select which option (A, B, C, D, or E) on the WhatsApp Group Poll needs votes:
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {(["A", "B", "C", "D", "E"] as const).map((opt) => (
                      <button
                        key={opt}
                        id={`vote-option-${opt}`}
                        type="button"
                        onClick={() => setVotingOption(opt)}
                        className={`w-12 h-12 rounded-xl text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                          votingOption === opt
                            ? "bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-600/20 scale-105"
                            : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Poll/Group Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  3. Target URL / Group Link
                </label>
                <input
                  id="target-link-input"
                  type="url"
                  required
                  placeholder="https://chat.whatsapp.com/... or WhatsApp Poll Link"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"
                  value={pollLink}
                  onChange={(e) => setPollLink(e.target.value)}
                />
              </div>

              {/* Quantity */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    4. Quantity (Minimum: {selectedService?.min_qty || 100} / Max: {selectedService?.max_qty || 50000})
                  </label>
                  {selectedService && (
                    <span className="text-xs text-slate-500 font-mono">
                      Cost: Rs. {selectedService.price_per_k} per 1K
                    </span>
                  )}
                </div>
                <input
                  id="order-quantity"
                  type="number"
                  required
                  min={selectedService?.min_qty || 100}
                  max={selectedService?.max_qty || 50000}
                  step={50}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 outline-none transition-colors"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              {/* Cost Summary Box */}
              {selectedService && (
                <div id="cost-summary" className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Est. Cost</span>
                    <span className="text-lg font-bold text-indigo-400 font-mono">Rs. {calculatedCost.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Available Balance</span>
                    <span className={`text-sm font-semibold font-mono ${userBalance >= calculatedCost ? 'text-emerald-400' : 'text-red-400'}`}>
                      Rs. {userBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Place Order CTA */}
              <button
                id="place-order-submit"
                type="submit"
                disabled={loading || !selectedService || userBalance < calculatedCost}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Placing Order..." : "Place Auto Order"}
              </button>

            </form>
          </div>

          {/* Quick FAQ / Instructions Sidebar */}
          <div className="space-y-6">
            
            {/* WhatsApp Polling Specific Hint */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 uppercase tracking-wider text-indigo-400">
                <Info className="w-4 h-4" />
                WhatsApp Voting Rules
              </h3>
              <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 shrink-0 font-bold">•</span>
                  <span><strong>Correct Option Selection:</strong> Ensure you select the exact letter (A, B, C, etc.) configured in your group poll.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 shrink-0 font-bold">•</span>
                  <span><strong>Poll Link:</strong> Provide the direct poll link or group chat invite link with explicit join clearance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 shrink-0 font-bold">•</span>
                  <span><strong>Process Timing:</strong> Votes will start trickling automatically within 5-10 minutes.</span>
                </li>
              </ul>
            </div>

            {/* Quick SMM Help */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider text-slate-400">
                Payment Info
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                To top-up your SMM panel balance instantly, proceed to the <strong>Deposit Funds</strong> tab. Send payments directly to our JazzCash wallet.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs font-mono">
                <span className="text-slate-400 block text-[10px] uppercase">JazzCash</span>
                <strong className="text-indigo-400 text-sm">03077321978</strong>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB CONTENT: DEPOSIT / ADD FUNDS --- */}
      {activeTab === "add-funds" && (
        <div id="add-funds-panel" className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Instructions card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">JazzCash Payment Method</h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Please transfer your desired balance recharge amount to our mobile wallet account listed below. Once you complete the transaction, copy the Transaction ID (Trx ID) and upload the payment receipt screen shot.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs text-slate-400 uppercase font-medium">Payment Channel</span>
                <span className="text-xs font-bold text-indigo-400 px-2 py-1 rounded bg-indigo-500/10">JazzCash Wallet</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs text-slate-400 uppercase font-medium">Account Number</span>
                <span className="text-sm font-bold text-white font-mono tracking-wide select-all">03077321978</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 uppercase font-medium">Account Title</span>
                <span className="text-xs font-bold text-slate-200">KoSh Vote Software</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-xl text-xs text-indigo-400 flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Manual Verifications:</strong> Admin checks deposits 24/7. Once the transaction details match our wallet ledger, your balance will be credited instantly!
              </span>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-6">Submit Payment Deposit Receipt</h2>

            <form onSubmit={handleDepositSubmit} className="space-y-5">
              
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Amount Deposited (PKR / Rs.)
                </label>
                <input
                  id="deposit-amount-input"
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Transaction ID (Trx ID)
                </label>
                <input
                  id="trx-id-input"
                  type="text"
                  required
                  placeholder="e.g. 810934812"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                />
              </div>

              {/* Payment Screenshot (Drag & Drop or Select) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Upload Payment Screenshot Receipt
                </label>
                <div
                  id="screenshot-dropzone"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl p-5 text-center cursor-pointer transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {screenshotBase64 ? (
                    <div id="screenshot-preview-container" className="space-y-3">
                      <img
                        id="screenshot-preview"
                        src={screenshotBase64}
                        alt="Screenshot receipt preview"
                        className="max-h-24 mx-auto rounded-lg border border-slate-850"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-xs text-slate-400 block truncate max-w-[200px] mx-auto">
                        {screenshotName}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs text-slate-400">
                        Drag and drop image here, or <span className="text-indigo-400 font-medium">browse files</span>
                      </p>
                      <p className="text-[10px] text-slate-600">Supports PNG, JPG, JPEG up to 8MB</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                id="deposit-submit-button"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Payment Record"}
              </button>

            </form>
          </div>

        </div>
      )}

      {/* --- TAB CONTENT: MY ORDERS (HISTORY) --- */}
      {activeTab === "order-history" && (
        <div id="order-history-panel" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              SMM Order History
            </h2>
            <button
              id="refresh-orders-button"
              onClick={fetchHistories}
              disabled={loadingHistory}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Fetching orders, please wait...
            </div>
          ) : myOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No orders placed yet. Select the &quot;New Order&quot; tab to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                    <th className="py-3 px-4 font-normal">Order ID</th>
                    <th className="py-3 px-4 font-normal">Service</th>
                    <th className="py-3 px-4 font-normal">Link</th>
                    <th className="py-3 px-4 font-normal">Vote Opt</th>
                    <th className="py-3 px-4 font-normal text-right">Qty</th>
                    <th className="py-3 px-4 font-normal text-right">Price</th>
                    <th className="py-3 px-4 font-normal text-center">Status</th>
                    <th className="py-3 px-4 font-normal">Placed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {myOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">#{ord.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200 block">{ord.service_name}</span>
                        <span className="text-[10px] text-slate-500">{ord.service_category}</span>
                      </td>
                      <td className="py-3 px-4 font-mono max-w-[200px] truncate" title={ord.link}>
                        <a href={ord.link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                          {ord.link}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ord.voting_option ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold font-mono">
                            {ord.voting_option}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{ord.quantity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-white">Rs. {ord.charge.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          ord.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : ord.status === "In Progress"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : ord.status === "Cancelled"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(ord.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: MY DEPOSITS (HISTORY) --- */}
      {activeTab === "deposit-history" && (
        <div id="deposit-history-panel" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-400" />
              JazzCash Deposits Log
            </h2>
            <button
              id="refresh-deposits-button"
              onClick={fetchHistories}
              disabled={loadingHistory}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Fetching deposits, please wait...
            </div>
          ) : myDeposits.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No deposit submissions found. Use the &quot;Deposit Funds&quot; tab to deposit PKR via JazzCash.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                    <th className="py-3 px-4 font-normal">Request ID</th>
                    <th className="py-3 px-4 font-normal">Trx ID</th>
                    <th className="py-3 px-4 font-normal text-right">Amount</th>
                    <th className="py-3 px-4 font-normal text-center">Receipt</th>
                    <th className="py-3 px-4 font-normal text-center">Status</th>
                    <th className="py-3 px-4 font-normal">Submitted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {myDeposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">#{dep.id}</td>
                      <td className="py-3 px-4 font-mono text-indigo-300 select-all font-semibold">{dep.trx_id}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">Rs. {dep.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        {dep.screenshot ? (
                          <a
                            href={dep.screenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1 justify-center"
                          >
                            <span>View receipt</span>
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          dep.status === "Approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : dep.status === "Rejected"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {dep.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(dep.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: SETTINGS (SMM API KEY) --- */}
      {activeTab === "settings" && (
        <div id="settings-panel" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Personal SMM API Key Configuration
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Configure your external SMM provider API key here. This key can be utilized by automated scripts or webhook clients interacting with KoSh Vote Software.
          </p>

          <form onSubmit={handleSaveApiKey} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                External SMM API Key
              </label>
              <input
                id="user-api-key-input"
                type="text"
                placeholder="Paste API Key here..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors font-mono"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
              />
            </div>

            <button
              id="save-api-key-button"
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/10 transition-colors cursor-pointer"
            >
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
