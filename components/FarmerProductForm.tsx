"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { connectWallet, getContract } from "@/lib/contract";

interface FarmerProductFormProps {
  onWalletConnect?: (address: string) => void;
}

export default function FarmerProductForm({ onWalletConnect }: FarmerProductFormProps) {
  const [productName, setProductName] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<"checking" | "not_installed" | "disconnected" | "connected">("checking");

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isMockConnection, setIsMockConnection] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletStatus("connected");
            if (onWalletConnect) onWalletConnect(accounts[0]);
          } else {
            setWalletStatus("disconnected");
          }
        } catch (err) {
          setWalletStatus("disconnected");
        }
      } else {
        setWalletStatus("not_installed");
      }
    };
    checkWallet();
  }, [onWalletConnect]);

  const handleConnectWallet = async () => {
    if (typeof window !== "undefined" && !(window as any).ethereum) {
      setShowManualInput(true);
      return;
    }

    setError("");
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
      setWalletStatus("connected");
      if (onWalletConnect) onWalletConnect(address);

      // Sync wallet to backend
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        console.error("Backend sync failed");
      }
    } catch (err: any) {
      if (err.message === "MetaMask is not installed") {
        setWalletStatus("not_installed");
        setShowManualInput(true);
      } else if (err.code === "ACTION_REJECTED" || err.message?.includes("user rejected")) {
        setError("Connection cancelled by user.");
      } else {
        setError(err.message || "Failed to connect wallet");
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualInput)) {
      alert("Invalid address format. Must be 42 characters starting with 0x.");
      return;
    }
    
    setShowManualInput(false);
    setIsMockConnection(true);
    setWalletAddress(manualInput);
    setWalletStatus("connected");
    if (onWalletConnect) onWalletConnect(manualInput);
    
    try {
      const address = manualInput;
      // Send address to PostgreSQL /api/auth/login route
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        console.error("Backend authentication failed");
      }
    } catch (err) {
      console.error(err);
      setWalletStatus("disconnected");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload to Pinata
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setIpfsHash(data.hash);
      setSuccess("Image uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload image.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    setIpfsHash("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateProduct = async () => {
    if (walletStatus !== "connected") {
      await handleConnectWallet();
      return;
    }

    setError("");
    setSuccess("");
    setIsCreating(true);

    try {
      let transactionHash = "mock-tx-hash-" + Date.now();
      let ownerAddr = walletAddress || "0x0000000000000000000000000000000000000000";

      let blockchainId = null;

      if (isMockConnection) {
        setSuccess("Mocking transaction on blockchain...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        blockchainId = Math.floor(Math.random() * 10000).toString();
      } else {
        const { signer, address } = await connectWallet();
        const contract = await getContract(signer);
        ownerAddr = address;

        // Blockchain transaction
        setSuccess("Confirming on Blockchain...");
        const tx = await contract.createProduct(productName, ipfsHash);
        
        const receipt = await tx.wait();
        transactionHash = receipt.hash || receipt.transactionHash;

        try {
          const countBn = await contract.productCount();
          const total = Number(countBn);
          const ownerLc = address.toLowerCase();
          let resolved: string | null = null;
          if (total > 0) {
            for (let i = total; i >= 0; i--) {
              try {
                const p = await contract.getProduct(i);
                const pOwner = (
                  typeof p.owner === "string" ? p.owner : String(p.owner)
                ).toLowerCase();
                if (p.ipfsHash === ipfsHash && pOwner === ownerLc) {
                  resolved = String(i);
                  break;
                }
              } catch {
                continue;
              }
            }
          }
          blockchainId =
            resolved ?? (total > 0 ? (total - 1).toString() : null);
        } catch (e) {
          console.error("Failed to resolve on-chain product id", e);
        }
      }

      // Database insertion
      setSuccess("Saving to database...");
      const res = await fetch("/api/save-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          ipfsHash,
          ownerAddress: ownerAddr,
          transactionHash: transactionHash,
          blockchainId: blockchainId
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Database save failed");

      setSuccess("Product created successfully!");
      setProductName("");
      removeImage();
    } catch (err: any) {
      console.error(err);
      if (err.code === "ACTION_REJECTED" || err.message?.includes("user rejected")) {
        setError("Transaction cancelled by user.");
      } else {
        setError(err.reason || err.message || "Transaction failed");
      }
      setSuccess("");
    } finally {
      setIsCreating(false);
    }
  };

  const isFormReady = !!(productName && ipfsHash);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto mt-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xl leading-none shadow-sm">
            +
          </div>
          Create New Product
        </h2>
        <p className="text-gray-500 mt-2 font-medium">Register a new product onto the blockchain.</p>
      </div>

      {/* Wallet Status messages removed for a cleaner look */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Image Upload */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Product Image</label>
          <div 
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 relative transition-colors ${
              previewUrl ? 'border-gray-200' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
            }`}
          >
            {previewUrl ? (
              <div className="w-full h-full min-h-[200px] relative rounded-lg overflow-hidden group shadow-sm border border-gray-100">
                <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={removeImage}
                    disabled={isUploading || isCreating}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors shadow-lg"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex flex-col items-center text-sm text-gray-600 justify-center">
                  <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Click to upload an image</span>
                    <input 
                      type="file" 
                      className="sr-only" 
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      disabled={isUploading || isCreating}
                    />
                  </label>
                  <p className="mt-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10 border border-gray-100">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">Uploading to IPFS...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inputs */}
        <div className="flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={isCreating}
                placeholder="e.g. Organic Arabica Beans"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium"
              />
            </div>
            
            <input type="hidden" value={ipfsHash} />
            
            {ipfsHash && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-800">IPFS Hash Ready</p>
                  <p className="text-xs font-mono text-green-600 truncate mt-0.5">{ipfsHash}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}
            
            {success && !error && (
              <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-200 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 flex-shrink-0 animate-pulse mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="leading-relaxed">{success}</span>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={handleCreateProduct}
              disabled={!isFormReady || isCreating}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2
                ${isFormReady 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }
              `}
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                walletStatus === "connected" ? "Create Product" : "Connect Wallet & Create"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
