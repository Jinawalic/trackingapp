"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectWallet } from "@/lib/contract";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet is already connected
    const checkConn = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) setConnectedAddress(accounts[0]);
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkConn();
  }, []);

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (connectedAddress) {
      syncAndRedirect(connectedAddress);
    } else {
      setShowModal(true);
    }
  };

  const syncAndRedirect = async (address: string) => {
    setIsConnecting(true);
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
      } else {
        alert("Authentication failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync wallet with dashboard.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMetamaskConnect = async () => {
    try {
      const { address } = await connectWallet();
      setConnectedAddress(address);
      await syncAndRedirect(address);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualConnect = async () => {
    if (/^0x[a-fA-F0-9]{40}$/.test(manualAddress)) {
      await syncAndRedirect(manualAddress);
    } else {
      alert("Invalid address format.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>

        <div className="max-w-4xl w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-4 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            Live on Blockchain
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Transparent & Secure <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Supply Chain Tracking
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            Trace the journey of your products from farm to table. Empowering consumers with verified authenticity and streamlining operations for farmers, distributors, and retailers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mt-12">
            
            {/* Dashboard Link Card */}
            <div 
              onClick={handleDashboardClick}
              className="group cursor-pointer flex flex-col items-start text-left bg-white p-8 rounded-3xl shadow-md shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors"></div>
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 shadow-sm border border-blue-200/50 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Stakeholder Dashboard</h2>
              <p className="text-gray-500 flex-1 leading-relaxed">For Farmers, Distributors, and Retailers to manage inventory and transfer product ownership securely.</p>
              <div className="mt-8 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform bg-blue-50 px-4 py-2 rounded-lg">
                Enter Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>

            {/* Consumer Link Card */}
            <Link href="/consumer" className="group flex flex-col items-start text-left bg-white p-8 rounded-3xl shadow-md shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-100 transition-colors"></div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6 shadow-sm border border-indigo-200/50 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Consumer Verification</h2>
              <p className="text-gray-500 flex-1 leading-relaxed">For end-consumers to verify product authenticity, origin, and full supply chain journey.</p>
              <div className="mt-8 flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform bg-indigo-50 px-4 py-2 rounded-lg">
                Verify Product
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </Link>

          </div>
        </div>
      </main>

      {/* Connection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Connect Wallet</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={handleMetamaskConnect}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none"><path d="M21.5 5.5L18.5 2.5L16.5 6.5L13.5 8L15 11L18 10L21.5 5.5Z" fill="#E2761B"/><path d="M2.5 5.5L5.5 2.5L7.5 6.5L10.5 8L9 11L6 10L2.5 5.5Z" fill="#E2761B"/><path d="M18.5 13.5L19.5 18.5L15.5 21.5L10.5 20.5L8.5 21.5L4.5 18.5L5.5 13.5L8.5 11.5L15.5 11.5L18.5 13.5Z" fill="#E4761B"/><path d="M10.5 20.5L12 22.5L13.5 20.5L10.5 20.5Z" fill="#D7C1B3"/></svg>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">MetaMask</p>
                      <p className="text-xs text-gray-500">Connect using browser extension</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400 font-bold tracking-widest">OR</span></div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Manual Address</label>
                  <input 
                    type="text" 
                    placeholder="0x..." 
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-900 font-mono text-sm"
                  />
                  <button 
                    onClick={handleManualConnect}
                    disabled={isConnecting}
                    className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {isConnecting ? "Connecting..." : "Access Dashboard"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
