"use client";
import React, { ReactNode, useState } from "react";
import { ipfsGatewayUrl } from "@/lib/ipfs";

interface ProductCardProps {
  dbId?: string;
  id: string;
  name: string;
  owner: string;
  ipfsHash: string;
  actionNode?: ReactNode;
  /** When false, hides archive / restore control (e.g. read-only contexts). */
  showArchiveToggle?: boolean;
  /** Current archive state from the server */
  archived?: boolean;
  isArchiveBusy?: boolean;
  onToggleArchive?: (dbId: string, nextArchived: boolean) => void | Promise<void>;
}

export default function ProductCard({
  dbId,
  id,
  name,
  owner,
  ipfsHash,
  actionNode,
  showArchiveToggle = true,
  archived = false,
  isArchiveBusy = false,
  onToggleArchive,
}: ProductCardProps) {
  const formatHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  const imgSrc = ipfsGatewayUrl(ipfsHash);
  const [imageFailed, setImageFailed] = useState(false);

  const canArchiveToggle =
    Boolean(showArchiveToggle && dbId && typeof onToggleArchive === "function");

  const handleArchiveClick = async () => {
    if (!dbId || !onToggleArchive) return;
    await onToggleArchive(dbId, !archived);
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>

      <div className="relative h-44 w-full bg-gray-100 border-b border-gray-100 shrink-0">
        {imgSrc && !imageFailed ? (
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
            <svg className="h-14 w-14 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="mt-2 text-xs font-medium">No preview</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors leading-tight">
            {name}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {canArchiveToggle && (
              <button
                type="button"
                title={archived ? "Restore from archive" : "Archive product"}
                onClick={handleArchiveClick}
                disabled={isArchiveBusy}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-blue-700 disabled:opacity-50"
              >
                {archived ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                )}
              </button>
            )}
            <span className="px-2.5 py-1 rounded-md bg-gray-50 text-xs font-mono font-medium text-gray-500 border border-gray-200">
              ID: {id}
            </span>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Owner</span>
            <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1.5 rounded border border-gray-100 truncate">
              {owner}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">IPFS Hash</span>
            <span
              className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1.5 rounded border border-blue-100 truncate hover:text-blue-800 cursor-pointer"
              title={ipfsHash}
            >
              {formatHash(ipfsHash)}
            </span>
          </div>
        </div>
      </div>

      {actionNode && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 mt-auto">{actionNode}</div>
      )}
    </div>
  );
}
