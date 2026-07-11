import { useState, useEffect } from "react";
import { LogOut, User, Activity, Wallet, Shield } from "lucide-react";
import { User as UserType } from "../types";

interface NavbarProps {
  user: UserType;
  isAdminMode: boolean;
  onToggleMode: () => void;
  onLogout: () => void;
}

export default function Navbar({ user, isAdminMode, onToggleMode, onLogout }: NavbarProps) {
  const [onlineUsers, setOnlineUsers] = useState<number>(1);

  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const res = await fetch("/api/stats/online");
        if (res.ok) {
          const data = await res.json();
          setOnlineUsers(data.onlineUsers || 1);
        }
      } catch (err) {
        // Safe fallback
      }
    };

    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <nav id="app-navbar" className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-2 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="text-white font-bold text-sm tracking-widest">KS</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide leading-none">
              KoSh Vote Software
            </h1>
            <span className="text-[10px] text-slate-400 font-mono">VOTING PANEL</span>
          </div>
        </div>

        {/* Action Widgets & User Profile */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          
          {/* Active Users Badge */}
          <div id="online-users-badge" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{onlineUsers} Active</span>
          </div>

          {/* User Wallet Balance */}
          <div id="wallet-balance-display" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono">
            <Wallet className="w-4 h-4 text-indigo-400" />
            <span>Balance: <strong className="text-white font-semibold">Rs. {user.balance.toFixed(2)}</strong></span>
          </div>

          {/* Admin Control Switch */}
          {user.is_admin === 1 && (
            <button
              id="admin-toggle-button"
              onClick={onToggleMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                isAdminMode 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdminMode ? "Admin Panel" : "Switch to Admin"}</span>
            </button>
          )}

          {/* User Name Tag */}
          <div className="flex items-center gap-2 px-2 py-1 text-slate-300 text-xs font-medium">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden md:inline">{user.name}</span>
          </div>

          {/* Logout Button */}
          <button
            id="logout-button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-850 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/20 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>
      </div>
    </nav>
  );
}
