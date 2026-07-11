import { useState, useEffect } from "react";
import AuthPages from "./components/AuthPages";
import Navbar from "./components/Navbar";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { User } from "./types";
import { Shield } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Authenticate user on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("kosh_vote_token");
    const storedUser = localStorage.getItem("kosh_vote_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Auto-set admin mode default if they are admin
      if (parsedUser.is_admin === 1) {
        setIsAdminMode(true);
      }

      // Refresh credentials from server
      fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          } else {
            throw new Error("Session expired");
          }
        })
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem("kosh_vote_user", JSON.stringify(freshUser));
        })
        .catch(() => {
          // If token expired, clear it
          handleLogout();
        })
        .finally(() => {
          setAppLoading(false);
        });
    } else {
      setAppLoading(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: User) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem("kosh_vote_token", newToken);
    localStorage.setItem("kosh_vote_user", JSON.stringify(loggedUser));
    
    if (loggedUser.is_admin === 1) {
      setIsAdminMode(true);
    } else {
      setIsAdminMode(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAdminMode(false);
    localStorage.removeItem("kosh_vote_token");
    localStorage.removeItem("kosh_vote_user");
  };

  // Refresh balance trigger
  const handleRefreshBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
        localStorage.setItem("kosh_vote_user", JSON.stringify(freshUser));
      }
    } catch (err) {
      console.error("Error refreshing profile balance:", err);
    }
  };

  if (appLoading) {
    return (
      <div id="app-loading-screen" className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-2 animate-pulse flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4">
          <span className="text-white font-extrabold text-base tracking-widest">KS</span>
        </div>
        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase animate-pulse">
          Booting KoSh Vote Software...
        </p>
      </div>
    );
  }

  // Session exists layout
  return (
    <div id="root-viewport" className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white">
      {!token || !user ? (
        <AuthPages onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div id="authenticated-layout" className="min-h-screen flex flex-col">
          {/* Header */}
          <Navbar
            user={user}
            isAdminMode={isAdminMode}
            onToggleMode={() => setIsAdminMode(!isAdminMode)}
            onLogout={handleLogout}
          />

          {/* Admin Banner Indicator */}
          {user.is_admin === 1 && isAdminMode && (
            <div id="admin-banner" className="bg-indigo-600/10 border-y border-indigo-500/15 py-2 px-4 text-center text-xs font-semibold text-indigo-400 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>You are viewing the administration control board. Toggle &quot;Admin Panel&quot; in the header to return to customer view.</span>
            </div>
          )}

          {/* Main Dashboard Panel Body */}
          <main className="flex-1">
            {user.is_admin === 1 && isAdminMode ? (
              <AdminDashboard token={token} onRefreshUserBalance={handleRefreshBalance} />
            ) : (
              <UserDashboard
                token={token}
                userBalance={user.balance}
                onOrderPlaced={(newBalance) => {
                  setUser({ ...user, balance: newBalance });
                  const stored = localStorage.getItem("kosh_vote_user");
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.balance = newBalance;
                    localStorage.setItem("kosh_vote_user", JSON.stringify(parsed));
                  }
                }}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-900 bg-slate-950/40 py-6 px-4 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 KoSh Vote Software. All rights reserved.</p>
              <p className="font-mono text-[10px] text-slate-600">
                JazzCash Deposit Account: 03077321978 | System Online
              </p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
