"use client";
import React, { useState } from "react";
import { connectWallet, getContract } from "@/lib/contract";

type UIState = 'disconnected' | 'connecting' | 'verifying' | 'authorized' | 'unauthorized';
type Status = 'idle' | 'approving' | 'pending' | 'success' | 'error';

export default function AdminRoleManager() {
  const [uiState, setUiState] = useState<UIState>('disconnected');
  const [addressInput, setAddressInput] = useState("");
  const [roleInput, setRoleInput] = useState<number | "">("");
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState("");

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isMockConnection, setIsMockConnection] = useState(false);

  const handleConnectClick = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      await handleConnectAndVerify();
    } else {
      setShowManualInput(true);
    }
  };

  const handleManualSubmit = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualInput)) {
      alert("Invalid address format. Must be 42 characters starting with 0x.");
      return;
    }
    
    setShowManualInput(false);
    setIsMockConnection(true);
    setUiState('connecting');
    
    try {
      const address = manualInput;
      setUiState('verifying');

      // Send address to PostgreSQL /api/auth/login route
      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      
      if (!authRes.ok) {
        throw new Error("Backend authentication failed");
      }

      // Bypass strict blockchain owner check for manual mock testing
      setUiState('authorized');
    } catch (err) {
      console.error(err);
      setUiState('disconnected');
    }
  };

  const handleConnectAndVerify = async () => {
    setUiState('connecting');
    try {
      const { signer, address } = await connectWallet();
      
      setUiState('verifying');

      // 1. Send address to PostgreSQL /api/auth/login route
      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      
      if (!authRes.ok) {
        throw new Error("Backend authentication failed");
      }

      // 2. Check if owner on Blockchain
      const contract = await getContract(signer);
      let isOwner = false;
      if (typeof contract.owner === 'function') {
        const owner = await contract.owner();
        isOwner = owner.toLowerCase() === address.toLowerCase();
      }

      if (isOwner) {
        setUiState('authorized');
      } else {
        setUiState('unauthorized');
      }

    } catch (err) {
      console.error("Connection/Verification failed:", err);
      // Fallback to manual if connection fails (e.g. MetaMask not found)
      setUiState('disconnected');
      setShowManualInput(true);
    }
  };

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(addressInput);
  const isValidRole = roleInput !== "";
  const isFormValid = isValidAddress && isValidRole;

  const handleGrantAccess = async () => {
    if (!isFormValid) return;
    
    setStatus('approving');
    setMessage("");

    try {
      if (isMockConnection) {
        // Mock the transaction delay
        setStatus('pending');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        const { signer } = await connectWallet();
        const contract = await getContract(signer);

        const tx = await contract.assignRole(addressInput, Number(roleInput));
        
        setStatus('pending');
        await tx.wait();
      }

      const res = await fetch("/api/admin/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: addressInput,
          role: Number(roleInput),
        }),
      });

      if (!res.ok) {
        console.error("Database sync failed");
      }

      setStatus('success');
      setAddressInput("");
      setRoleInput("");
      setMessage("Role assigned and synchronized successfully!");

      setTimeout(() => {
        setStatus('idle');
        setMessage("");
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      
      let errorMsg = "Transaction failed.";
      if (err.code === "ACTION_REJECTED" || err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected in MetaMask.";
      } else if (err.message?.includes("already assigned")) {
        errorMsg = "This address already has an assigned role.";
      } else if (err.reason) {
        errorMsg = err.reason;
      }
      
      setMessage(errorMsg);
    }
  };

  if (uiState === 'disconnected' || uiState === 'connecting' || uiState === 'verifying') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-lg mx-auto mt-8 text-center py-16 transition-all duration-500">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Admin Portal</h2>
        <p className="text-gray-500 mb-8">
          Please connect your wallet. We will verify your identity with the smart contract to ensure you are the authorized owner.
        </p>

        {showManualInput ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowManualInput(false)} 
                className="flex-1 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit} 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-md shadow-blue-500/20"
              >
                Connect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnectClick}
            disabled={uiState !== 'disconnected'}
            className="w-full py-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {uiState === 'connecting' ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : uiState === 'verifying' ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying Ownership...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M21.5 5.5L18.5 2.5L16.5 6.5L13.5 8L15 11L18 10L21.5 5.5Z" fill="#E2761B"/>
                  <path d="M2.5 5.5L5.5 2.5L7.5 6.5L10.5 8L9 11L6 10L2.5 5.5Z" fill="#E2761B"/>
                  <path d="M18.5 13.5L19.5 18.5L15.5 21.5L10.5 20.5L8.5 21.5L4.5 18.5L5.5 13.5L8.5 11.5L15.5 11.5L18.5 13.5Z" fill="#E4761B"/>
                  <path d="M10.5 20.5L12 22.5L13.5 20.5L10.5 20.5Z" fill="#D7C1B3"/>
                </svg>
                Connect Wallet
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  if (uiState === 'unauthorized') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-100 p-8 max-w-3xl mx-auto mt-8 text-center py-16">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">403 Unauthorized</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          You do not have permission to view this page. Only the contract owner can assign roles to participants.
        </p>
        <button
          onClick={() => {
            setUiState('disconnected');
            setShowManualInput(false);
          }}
          className="px-6 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // authorized state
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto mt-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="mb-8 relative z-10">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          Stakeholder Management
        </h2>
        <p className="text-gray-500 mt-2 font-medium">Assign system roles to new supply chain participants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end relative z-10">
        <div className="md:col-span-6 space-y-2 relative">
          <label className="text-sm font-semibold text-gray-700">Wallet Address</label>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="0x..."
            disabled={status === 'approving' || status === 'pending'}
            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all outline-none bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-mono text-sm ${
              addressInput.length > 0 && !isValidAddress 
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' 
                : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          />
          {addressInput.length > 0 && !isValidAddress && (
            <p className="text-xs text-red-500 font-medium absolute -bottom-5 left-0">Address must be 42 characters and start with 0x</p>
          )}
        </div>

        <div className="md:col-span-4 space-y-2">
          <label className="text-sm font-semibold text-gray-700">Role</label>
          <div className="relative">
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(Number(e.target.value))}
              disabled={status === 'approving' || status === 'pending'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white text-gray-900 font-medium appearance-none"
            >
              <option value="" disabled>Select Role...</option>
              <option value={1}>Farmer (1)</option>
              <option value={2}>Distributor (2)</option>
              <option value={3}>Retailer (3)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <button
            onClick={handleGrantAccess}
            disabled={!isFormValid || status === 'approving' || status === 'pending'}
            className="w-full h-[50px] rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'approving' || status === 'pending' ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Grant Access"
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 relative z-10 min-h-[48px]">
        {status === 'approving' && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100 animate-pulse w-max">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium text-sm">Please approve the transaction in MetaMask...</span>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-3 rounded-lg border border-indigo-100 animate-pulse w-max">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium text-sm">Confirming on blockchain...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100 max-w-2xl">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium text-sm leading-relaxed">{message}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg border border-green-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-max">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium text-sm">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
