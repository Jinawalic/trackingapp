import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TRACKING_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRACKING_ID_LENGTH = 6;

function generateTrackingIdCandidate() {
  let value = "";
  for (let i = 0; i < TRACKING_ID_LENGTH; i++) {
    const idx = Math.floor(Math.random() * TRACKING_ID_ALPHABET.length);
    value += TRACKING_ID_ALPHABET[idx];
  }
  return value;
}

async function generateUniqueTrackingId() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generateTrackingIdCandidate();
    const existing = await prisma.product.findUnique({
      where: { trackingId: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Unable to generate unique tracking ID");
}

export async function POST(req: Request) {
  try {
    const { name, ipfsHash, ownerAddress, transactionHash, blockchainId } = await req.json();

    if (!name || !ipfsHash || !ownerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedOwnerAddress = ownerAddress.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedOwnerAddress },
    });

    if (!user) {
      // Create user if not exists (assume Farmer role = 1)
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedOwnerAddress,
          role: 1, 
        },
      });
    }

    const rawChainId = blockchainId;
    const normalizedChainId =
      rawChainId === undefined || rawChainId === null || rawChainId === ""
        ? null
        : String(rawChainId);
    const trackingId = normalizedChainId ? await generateUniqueTrackingId() : null;

    const product = await prisma.product.create({
      data: {
        name,
        ipfsHash,
        blockchainId: normalizedChainId,
        trackingId,
        ownerId: user.id,
        history: {
          create: {
            action: "Created",
            performedBy: user.id,
          }
        }
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Save Product Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save product" }, { status: 500 });
  }
}
