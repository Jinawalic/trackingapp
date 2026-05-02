"use client";

import { useState } from "react";
import { connectWallet, getContract } from "../lib/contract";

export default function FarmerDashboard() {
  const [address, setAddress] = useState<string>("");
  const [role, setRole] = useState<number>(0);
  const [name, setName] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleConnect = async () => {
    try {
      setLoading(true);
      setMessage("");
      const { signer, address } = await connectWallet();
      setAddress(address);
      const contract = await getContract(signer);
      const userRole = await contract.roles(address);
      setRole(Number(userRole));
    } catch (error: any) {
      setMessage(error.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ipfsHash) return;

    try {
      setLoading(true);
      setMessage("");
      const { signer } = await connectWallet();
      const contract = await getContract(signer);

      const tx = await contract.createProduct(name, ipfsHash);
      await tx.wait();

      setMessage("Product created successfully!");
      setName("");
      setIpfsHash("");
    } catch (error: any) {
      setMessage(error.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Farmer Dashboard</h2>

      {!address ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Connected: <span className="font-mono bg-gray-100 p-1 rounded">{address.slice(0, 6)}...{address.slice(-4)}</span></p>
        </div>
      )}

      {address && role !== 1 && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
          You are not registered as a Farmer
        </div>
      )}

      {address && role === 1 && (
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g., Organic Apples"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IPFS Hash</label>
            <input
              type="text"
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Qm..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : "Create Product"}
          </button>
        </form>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes("success") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
