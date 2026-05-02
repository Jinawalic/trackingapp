import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const { productId, newOwnerAddress, transactionHash, blockchainId } =
      await req.json();

    if (!productId || !newOwnerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedAddress = newOwnerAddress.toLowerCase();

    // Find or create the new owner user
    let newOwner = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!newOwner) {
      // Create user if not exists. Default role is 2 (Distributor) for simplicity, 
      // but in a real app this might be more dynamic.
      newOwner = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          role: 2, 
        },
      });
    }

    const chainIdStr =
      blockchainId !== undefined && blockchainId !== null && blockchainId !== ""
        ? String(blockchainId)
        : undefined;

    // Update the product owner
    const updatedProduct = await prisma.product.update({
      where: { id: productId }, // We use the database UUID for internal updates
      data: {
        ownerId: newOwner.id,
        status: "IN_TRANSIT", // Update status to reflect transfer
        ...(chainIdStr !== undefined ? { blockchainId: chainIdStr } : {}),
        history: {
          create: {
            action: "Transferred",
            performedBy: newOwner.id, // This should ideally be the person who performed it, but we use the recipient for now or fetch the current owner
          }
        }
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error("Transfer Product Error:", error);
    return NextResponse.json({ error: error.message || "Failed to transfer product" }, { status: 500 });
  }
}
