import { BrowserProvider, Contract, ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../constants";

export const connectWallet = async () => {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    try {
      await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      return { provider, signer, address: await signer.getAddress() };
    } catch (error) {
      console.error("User rejected request", error);
      throw error;
    }
  } else {
    throw new Error("MetaMask is not installed");
  }
};

export const getContract = async (signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};
