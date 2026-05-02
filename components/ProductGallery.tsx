"use client";

import { useState, useEffect } from "react";
import { connectWallet, getContract } from "../lib/contract";
import { BrowserProvider } from "ethers";

interface Product {
  id: number;
  name: string;
  owner: string;
  ipfsHash: string;
}

export default function ProductGallery() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string>("");
  const [transferTo, setTransferTo] = useState<Record<number, string>>({});
  const [transferLoading, setTransferLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let contract;
      try {
        const { signer, address: userAddr } = await connectWallet();
        setAddress(userAddr);
        contract = await getContract(signer);
      } catch (e) {
        if (typeof window !== "undefined" && (window as any).ethereum) {
           const provider = new BrowserProvider((window as any).ethereum);
           contract = await getContract(provider);
        } else {
           return;
        }
      }

      const count = await contract.productCount();
      const productCount = Number(count);
      
      const fetchedProducts: Product[] = [];
      for (let i = 1; i <= productCount; i++) {
        const p = await contract.products(i);
        fetchedProducts.push({
          id: Number(p.id),
          name: p.name,
          owner: p.owner,
          ipfsHash: p.ipfsHash,
        });
      }
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (id: number) => {
    const toAddress = transferTo[id];
    if (!toAddress) return;

    try {
      setTransferLoading(prev => ({ ...prev, [id]: true }));
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      
      const tx = await contract.transferProduct(id, toAddress);
      await tx.wait();
      
      await fetchProducts();
      setTransferTo(prev => ({ ...prev, [id]: "" }));
    } catch (error) {
      console.error("Transfer failed", error);
      alert("Transfer failed. See console for details.");
    } finally {
      setTransferLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">Product Gallery</h2>
      
      {products.length === 0 ? (
        <p className="text-center text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">ID: {product.id}</span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Owner</p>
                    <p className="text-sm font-mono truncate text-gray-700 bg-gray-50 p-2 rounded mt-1" title={product.owner}>
                      {product.owner}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">IPFS Hash</p>
                    <p className="text-sm font-mono truncate text-gray-700 bg-gray-50 p-2 rounded mt-1" title={product.ipfsHash}>
                      {product.ipfsHash}
                    </p>
                  </div>
                </div>

                {address && product.owner.toLowerCase() === address.toLowerCase() && (
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Transfer Ownership</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={transferTo[product.id] || ""}
                        onChange={(e) => setTransferTo(prev => ({ ...prev, [product.id]: e.target.value }))}
                        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={() => handleTransfer(product.id)}
                        disabled={transferLoading[product.id] || !transferTo[product.id]}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {transferLoading[product.id] ? "..." : "Transfer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
