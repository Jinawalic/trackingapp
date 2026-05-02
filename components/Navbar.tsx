"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectWallet } from "@/lib/contract";

export default function Navbar() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const router = useRouter();

  const [showInput, setShowInput] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectClick = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const { address } = await connectWallet();
        setWalletAddress(address);
        await syncAndRedirect(address);
      } catch (err) {
        console.error(err);
      }
    } else {
      setShowInput(!showInput);
    }
  };

  const syncAndRedirect = async (address: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        const role = data.user.role;
        if (role >= 1 && role <= 3) {
          router.push(`/dashboard?role=${role}`);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error("Redirection sync failed:", err);
    }
  };

  const handleManualSubmit = async () => {
    if (/^0x[a-fA-F0-9]{40}$/.test(manualInput)) {
      setIsConnecting(true);
      try {
        setWalletAddress(manualInput);
        setShowInput(false);
        await syncAndRedirect(manualInput);
      } catch (err) {
        console.error(err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("Invalid address format. Must be 42 characters starting with 0x.");
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-white/70 border-b border-gray-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <Link href="/" className="font-bold text-xl tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
              SupplyChain <span className="text-blue-600">DApp</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/consumer" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden sm:block">
              Verify Product
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden sm:block">
              Dashboard
            </Link>
            <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden sm:block">
              Admin
            </Link>
            
            {walletAddress ? (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-full bg-blue-50 border border-blue-100 flex items-center gap-2 shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-semibold text-blue-700">{formatAddress(walletAddress)}</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors bg-gray-50 rounded-full hover:bg-red-50 border border-gray-200 shadow-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={handleConnectClick}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  Connect Wallet
                </button>
                
                {showInput && (
                  <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Manual Connection</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Enter 0x address..."
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowInput(false)}
                          className="flex-1 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleManualSubmit}
                          disabled={isConnecting}
                          className="flex-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                          {isConnecting ? "..." : "Connect"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
