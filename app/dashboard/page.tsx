"use client";
import { useState, useEffect, Suspense } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import FarmerProductForm from "@/components/FarmerProductForm";
import { useSearchParams } from "next/navigation";
import { connectWallet, getContract } from "@/lib/contract";

type ProductItem = {
  dbId: string;
  id: string;
  name: string;
  owner: string;
  ipfsHash: string;
  status: string;
  archived?: boolean;
};

type ToastItem = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

function Dashboard() {
  const searchParams = useSearchParams();
  const initialRole = parseInt(searchParams.get("role") || "1");

  const [role, setRole] = useState<number>(initialRole); 
  const [userRole, setUserRole] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userWallet, setUserWallet] = useState<string | null>(null);
  
  const [myProducts, setMyProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<string | null>(null);
  const [viewArchive, setViewArchive] = useState(false);
  const [archiveBusyDbId, setArchiveBusyDbId] = useState<string | null>(null);
  const [selectedProductDbId, setSelectedProductDbId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMarkingSold, setIsMarkingSold] = useState<string | null>(null);

  const [transferRecipient, setTransferRecipient] = useState<{ [key: string]: string }>({});

  const pushToast = (message: string, type: ToastItem["type"] = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    const checkWallet = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setUserWallet(accounts[0].toLowerCase());
          }
        } catch (err) {
          console.error("Failed to check wallet:", err);
        }
      }
    };
    checkWallet();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchUserRoleAndProducts = async () => {
      if (!userWallet) {
        setUserRole(null);
        setMyProducts([]);
        return;
      }
      
      setLoadingProducts(true);
      try {
        const authRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: userWallet }),
        });
        const authData = await authRes.json();
        if (authData.success) {
          setUserRole(authData.user.role);
        }

        const prodRes = await fetch(
          `/api/products?address=${userWallet}&archived=${viewArchive}`
        );
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const products = (prodData.products || []) as ProductItem[];
          setMyProducts(products);
          setSelectedProductDbId((prev) =>
            prev && products.some((p) => p.dbId === prev) ? prev : null
          );
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchUserRoleAndProducts();
  }, [userWallet, viewArchive]);

  const refreshProducts = async () => {
    if (!userWallet) return;
    const prodRes = await fetch(
      `/api/products?address=${userWallet}&archived=${viewArchive}`
    );
    if (!prodRes.ok) return;
    const prodData = await prodRes.json();
    const products = (prodData.products || []) as ProductItem[];
    setMyProducts(products);
    setSelectedProductDbId((prev) =>
      prev && products.some((p) => p.dbId === prev) ? prev : null
    );
  };

  const handleToggleArchive = async (dbId: string, nextArchived: boolean) => {
    if (!userWallet) return;
    setArchiveBusyDbId(dbId);
    try {
      const res = await fetch("/api/products/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: dbId,
          walletAddress: userWallet,
          archived: nextArchived,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Archive update failed");
      await refreshProducts();
      pushToast(nextArchived ? "Product archived successfully." : "Product restored successfully.", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not update archive";
      pushToast(msg, "error");
    } finally {
      setArchiveBusyDbId(null);
    }
  };

  const handleTransfer = async (productOrId: any) => {
    if (typeof window === "undefined") return;
    const provider = (window as any).ethereum;

    if (!provider) {
      pushToast("MetaMask not detected. Please refresh the page or unlock MetaMask.", "error");
      return;
    }

    const isObject = typeof productOrId === "object";
    const dbId = isObject ? productOrId.dbId : productOrId;
    const blockchainId = isObject ? productOrId.id : productOrId;
    
    const recipient = transferRecipient[dbId];
    if (!recipient) {
      pushToast("Please enter a recipient address.", "error");
      return;
    }

    if (blockchainId === "N/A") {
      pushToast("This product does not have a valid Blockchain ID yet.", "error");
      return;
    }

    setIsTransferring(dbId);
    try {
      await provider.request({ method: 'eth_requestAccounts' });
      const { signer, address: signerAddress } = await connectWallet();
      const contract = await getContract(signer);

      let transferId: string | number | bigint = blockchainId;
      const ipfsHash = isObject ? productOrId.ipfsHash : undefined;
      if (ipfsHash && typeof ipfsHash === "string") {
        try {
          const countBn = await contract.productCount();
          const total = Number(countBn);
          const signerLc = signerAddress.toLowerCase();
          for (let i = total; i >= 0; i--) {
            try {
              const p = await contract.getProduct(i);
              const pOwner = (
                typeof p.owner === "string" ? p.owner : String(p.owner)
              ).toLowerCase();
              if (p.ipfsHash === ipfsHash && pOwner === signerLc) {
                transferId = i;
                break;
              }
            } catch {
              continue;
            }
          }
        } catch (e) {
          console.error("On-chain id lookup failed, using stored id", e);
        }
      }

      const tx = await contract.transferProduct(transferId, recipient);
      await tx.wait();

      const res = await fetch("/api/products/transfer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: dbId,
          newOwnerAddress: recipient,
          transactionHash: tx.hash,
          blockchainId: String(transferId),
          newOwnerRole: role === 2 ? 3 : role === 1 ? 2 : 3,
        }),
      });

      if (res.ok) {
        pushToast("Transfer successful.", "success");
        await refreshProducts();
        setSelectedProductDbId(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update database");
      }
    } catch (err: any) {
      console.error("Transfer failed:", err);
      pushToast(`Transfer failed: ${err.reason || err.message}`, "error");
    } finally {
      setIsTransferring(null);
    }
  };

  const handleConnectWalletUI = async () => {
    try {
      const { address } = await connectWallet();
      setUserWallet(address.toLowerCase());
    } catch (err) {
      console.error("Wallet connection failed:", err);
      pushToast("Wallet connection failed.", "error");
    }
  };

  const handleMarkAsSold = async (id: string) => {
    if (!userWallet) {
      pushToast("Please connect your wallet first.", "error");
      return;
    }
    const confirmed = window.confirm("Confirm this product has been sold?");
    if (!confirmed) return;

    setIsMarkingSold(id);
    try {
      const res = await fetch("/api/products/sold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, walletAddress: userWallet }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to mark as sold");
      pushToast("Product marked as sold.", "success");
      await refreshProducts();
      setSelectedProductDbId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to mark as sold";
      pushToast(msg, "error");
    } finally {
      setIsMarkingSold(null);
    }
  };

  const selectedProduct =
    myProducts.find((product) => product.dbId === selectedProductDbId) || null;

  const renderProductTable = (emptyText: string) => {
    if (loadingProducts) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (myProducts.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium text-lg">{emptyText}</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Owner</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {myProducts.map((product) => (
              <tr key={product.dbId} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-gray-800">{product.name}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{product.id}</td>
                <td className="px-4 py-3 font-mono text-gray-600 max-w-[240px] truncate" title={product.owner}>
                  {product.owner}
                </td>
                <td className="px-4 py-3 text-gray-600">{product.status}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProductDbId(product.dbId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      title="View product"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                      </svg>
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleArchive(product.dbId, !Boolean(product.archived))
                      }
                      disabled={archiveBusyDbId === product.dbId}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      title={viewArchive ? "Restore product" : "Archive product"}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      {viewArchive ? "Restore" : "Archive"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProductModal = (
    recipientPlaceholder: string,
    transferLabel: string,
    showMarkAsSold: boolean
  ) => {
    if (!selectedProduct) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-2xl">
          <ProductCard
            {...selectedProduct}
            dbId={selectedProduct.dbId}
            archived={Boolean(selectedProduct.archived)}
            isArchiveBusy={archiveBusyDbId === selectedProduct.dbId}
            onToggleArchive={handleToggleArchive}
            actionNode={
              viewArchive ? (
                <button
                  type="button"
                  onClick={() => setSelectedProductDbId(null)}
                  className="w-full py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  {showMarkAsSold && (
                    <button
                      onClick={() => handleMarkAsSold(selectedProduct.dbId)}
                      disabled={isMarkingSold === selectedProduct.dbId}
                      className="w-full py-2.5 bg-green-600 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-60"
                    >
                      {isMarkingSold === selectedProduct.dbId ? "Saving..." : "Mark as Sold"}
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder={recipientPlaceholder}
                    value={transferRecipient[selectedProduct.dbId] || ""}
                    onChange={(e) =>
                      setTransferRecipient({
                        ...transferRecipient,
                        [selectedProduct.dbId]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none text-gray-900"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProductDbId(null)}
                      className="w-full py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleTransfer(selectedProduct)}
                      disabled={isTransferring === selectedProduct.dbId}
                      className="w-full py-2 bg-purple-600 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-60"
                    >
                      {isTransferring === selectedProduct.dbId ? "Transferring..." : transferLabel}
                    </button>
                  </div>
                </div>
              )
            }
          />
        </div>
      </div>
    );
  };

  const isRoleAuthorized = userWallet && userRole === role;
  const roleNames = ["", "Farmer", "Distributor", "Retailer"];
  const roleColors = ["", "blue", "purple", "orange"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-12 h-12 border-4 border-${roleColors[role]}-200 border-t-${roleColors[role]}-600 rounded-full animate-spin`}></div>
            <p className="text-gray-500 font-medium animate-pulse">Loading {roleNames[role]} Portal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-${roleColors[role]}-100 flex items-center justify-center`}>
              <svg className={`w-5 h-5 text-${roleColors[role]}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{roleNames[role]} Dashboard</h2>
              <p className="text-sm text-gray-500">Manage your supply chain operations</p>
            </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 1, label: "Farmer" },
              { id: 2, label: "Distributor" },
              { id: 3, label: "Retailer" }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${role === r.id
                    ? `bg-white text-${roleColors[r.id]}-700 shadow-sm border border-gray-200/50`
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {!isRoleAuthorized ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
            <div className={`w-20 h-20 rounded-3xl bg-${roleColors[role]}-100 flex items-center justify-center mb-6 shadow-lg shadow-${roleColors[role]}-500/10`}>
              <svg className={`w-10 h-10 text-${roleColors[role]}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500 mb-8 max-w-md text-center font-medium">
              Please connect a wallet authorized as a <span className={`text-${roleColors[role]}-600 font-bold`}>{roleNames[role]}</span> to access this dashboard.
            </p>
            <button 
              onClick={handleConnectWalletUI}
              className={`px-8 py-3 bg-${roleColors[role]}-600 hover:bg-${roleColors[role]}-700 text-white rounded-2xl font-bold shadow-lg shadow-${roleColors[role]}-500/20 transition-all hover:-translate-y-0.5`}
            >
              Connect {roleNames[role]} Wallet
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {role === 1 && (
              <div className="space-y-8">
                <FarmerProductForm onWalletConnect={(addr) => setUserWallet(addr.toLowerCase())} />
                <section>
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      {viewArchive ? "Archived products" : "My Products"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setViewArchive((v) => !v)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      {viewArchive ? "Back to my products" : "View Archive"}
                    </button>
                  </div>
                  {renderProductTable(viewArchive ? "No archived products." : "No products found.")}
                  {renderProductModal("Recipient Address (0x...)", "Transfer Ownership", false)}
                </section>
              </div>
            )}
            {role === 2 && (
              <div className="space-y-8">
                <section>
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      {viewArchive ? "Archived products" : "Received Products"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setViewArchive((v) => !v)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      {viewArchive ? "Back to inventory" : "View Archive"}
                    </button>
                  </div>
                  {renderProductTable(viewArchive ? "No archived products." : "No products found.")}
                  {renderProductModal("Retailer Address...", "Transfer to Retailer", false)}
                </section>
              </div>
            )}
            {role === 3 && (
              <div className="space-y-8">
                <section>
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                      {viewArchive ? "Archived products" : "Available Products"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setViewArchive((v) => !v)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      {viewArchive ? "Back to inventory" : "View Archive"}
                    </button>
                  </div>
                  {renderProductTable(viewArchive ? "No archived products." : "No products available.")}
                  {renderProductModal("Transfer to...", "Transfer", true)}
                </section>
              </div>
            )}
          </div>
        )}
      </main>
      <div className="fixed right-4 top-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[240px] max-w-[340px] rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : toast.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Initializing Dashboard...</p>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}
