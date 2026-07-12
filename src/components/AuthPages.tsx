import { useState } from "react";
import { User } from "../types"; // ye line upar honi chahiye

interface AuthProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export default function AuthPages({ onLoginSuccess }: AuthProps) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobile || !password) {
      alert("Mobile aur Password dalo");
      return;
    }

    // DUMMY LOGIN - API nahi hai abhi
    const dummyUser: User = { 
      id: 1, 
      name: "Test User", 
      mobile: mobile, 
      balance: 1000, 
      is_admin: 0  // 1 kar do to Admin Panel khul jaye ga
    }
    
    const dummyToken = "dummy-token-" + Date.now()

    onLoginSuccess(dummyToken, dummyUser)
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl shadow-lg w-full max-w-md border-slate-800">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-2 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-extrabold text-base">KS</span>
          </div>
          <h1 className="text-2xl font-bold">Sign In to Panel</h1>
          <p className="text-sm text-slate-400">KoSh Vote Software</p>
        </div>
        
        <input 
          type="text" 
          placeholder="Mobile Number" 
          className="border border-slate-700 bg-slate-800 w-full p-3 mb-4 rounded-lg outline-none focus:border-indigo-500"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          className="border border-slate-700 bg-slate-800 w-full p-3 mb-6 rounded-lg outline-none focus:border-indigo-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full p-3 rounded-lg font-semibold">
          Sign In to Panel
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Demo Mode: Koi bhi mobile/password likh do
        </p>
      </form>
    </div>
  );
}
