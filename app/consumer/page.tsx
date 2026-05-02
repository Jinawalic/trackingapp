"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { ipfsGatewayUrl } from "@/lib/ipfs";

// Live Database Connected

export default function ConsumerVerification() {
  const [productId, setProductId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [verifyImageFailed, setVerifyImageFailed] = useState(false);

  const verifiedImageSrc =
    result &&
    typeof result === "object" &&
    !(result as { error?: string }).error &&
    (result as { ipfsHash?: string }).ipfsHash
      ? ipfsGatewayUrl((result as { ipfsHash: string }).ipfsHash)
      : null;

  const handleCheckProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId.trim()) return;
    
    setIsSearching(true);
    setResult(null);
    setVerifyImageFailed(false);

    try {
      const res = await fetch(`/api/verify-product?id=${encodeURIComponent(productId)}`);
      const data = await res.json();
      
      if (!res.ok) {
        setResult({ error: data.error || "Failed to fetch product" });
      } else {
        setResult(data.product);
      }
    } catch (err) {
      setResult({ error: "An error occurred while communicating with the network." });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col items-center">
        
        {/* Header Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4 shadow-inner">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Verify Product Authenticity</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
            Enter the product ID to trace its journey on the blockchain, ensuring transparency and authenticity from farm to table.
          </p>
        </div>

        {/* Search Card */}
        <div className="w-full bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
          
          <form onSubmit={handleCheckProduct} className="relative z-10 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Enter Product ID (e.g. 101)"
                className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none bg-gray-50/50 focus:bg-white text-lg font-medium text-gray-900 placeholder:text-gray-500 placeholder:font-normal"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 min-w-[160px]"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </>
              ) : (
                "Check Product"
              )}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {result.error ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex items-center gap-3">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-medium">{result.error}</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="relative h-52 w-full border-b border-gray-100 bg-gray-100">
                  {verifiedImageSrc && !verifyImageFailed ? (
                    <img
                      src={verifiedImageSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setVerifyImageFailed(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
                      <svg className="h-14 w-14 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="mt-2 text-xs font-medium">No image preview</span>
                    </div>
                  )}
                </div>
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-br from-white to-gray-50/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{result.name}</h2>
                      <p className="text-gray-500 flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Verified Authentic
                      </p>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 font-mono text-sm font-semibold border border-blue-100">
                      ID: {result.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current Owner</p>
                      <p className="font-mono text-gray-800 text-sm bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 break-all">{result.owner}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">IPFS Metadata Hash</p>
                      <a href={`https://ipfs.io/ipfs/${result.ipfsHash}`} target="_blank" rel="noreferrer" className="font-mono text-blue-600 text-sm bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 break-all block transition-colors">
                        {result.ipfsHash}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Supply Chain History
                  </h3>
                  
                  <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {result.history.map((item: any, index: number) => (
                      <div key={index} className="relative">
                        <div className="absolute -left-8 mt-1.5 w-4 h-4 rounded-full border-4 border-white bg-blue-500 shadow-sm"></div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow duration-300">
                          <p className="font-semibold text-gray-900">{item.action}</p>
                          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {item.by}
                            </span>
                            <span className="hidden sm:block text-gray-300">•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {item.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
