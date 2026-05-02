import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const archivedOnly = new URL(req.url).searchParams.get("archived") === "true";

    // Fetch products that belong to the user
    const products: Array<{
      id: string;
      trackingId: string | null;
      blockchainId: string | null;
      name: string;
      owner: { walletAddress: string };
      ipfsHash: string;
      status: string;
      archived: boolean;
    }> = await prisma.product.findMany({
      where: {
        archived: archivedOnly,
        owner: {
          walletAddress: normalizedAddress,
        },
      },
      include: {
        owner: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = products.map((p) => ({
      dbId: p.id,
      id: p.trackingId || p.blockchainId || "N/A",
      name: p.name,
      owner: p.owner.walletAddress,
      ipfsHash: p.ipfsHash,
      status: p.status,
      archived: p.archived,
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error: any) {
    console.error("Products Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
