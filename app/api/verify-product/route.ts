import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Find the product by DB ID, tracking ID, or blockchain ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: id },
          { trackingId: id },
          { blockchainId: id }
        ]
      },
      include: {
        owner: true,
        history: {
          include: {
            user: true
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found. Please check the ID and try again." }, { status: 404 });
    }

    // Format history
    const formattedHistory = product.history.map(h => {
      let roleName = "Unknown";
      if (h.user.role === 1) roleName = "Farmer";
      else if (h.user.role === 2) roleName = "Distributor";
      else if (h.user.role === 3) roleName = "Retailer";
      else if (h.user.role === 4) roleName = "Admin";
      
      const shortWallet = `${h.user.walletAddress.slice(0,6)}...${h.user.walletAddress.slice(-4)}`;
      
      return {
        action: h.action,
        by: `${roleName} (${shortWallet})`,
        date: new Date(h.timestamp).toLocaleString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
    });

    return NextResponse.json({
      product: {
        id: product.trackingId || product.blockchainId || product.id,
        name: product.name,
        owner: product.owner.walletAddress,
        ipfsHash: product.ipfsHash,
        history: formattedHistory.length > 0 ? formattedHistory : [
          {
            action: "Created",
            by: `Farmer (${product.owner.walletAddress.slice(0,6)}...${product.owner.walletAddress.slice(-4)})`,
            date: new Date(product.createdAt).toLocaleString(undefined, { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }
        ]
      }
    });

  } catch (error: any) {
    console.error("Verify Product Error:", error);
    return NextResponse.json({ error: "An error occurred while verifying the product." }, { status: 500 });
  }
}
