/** Public gateway URL for an IPFS CID (Pinata/ipfs.io compatible). */
export function ipfsGatewayUrl(cid: string | undefined | null): string | null {
  if (!cid || typeof cid !== "string") return null;
  const trimmed = cid.trim();
  if (!trimmed) return null;
  return `https://gateway.pinata.cloud/ipfs/${trimmed}`;
}
