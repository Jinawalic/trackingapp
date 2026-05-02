import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { productId, walletAddress } = (await req.json()) as {
      productId?: string;
      walletAddress?: string;
    };

    if (!productId || !walletAddress) {
      return NextResponse.json(
        { error: "Missing productId or walletAddress" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      include: { owner: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (existing.owner.walletAddress !== normalizedAddress) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: "SOLD",
        history: {
          create: {
            action: "Sold",
            performedBy: existing.ownerId,
          },
        },
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("Mark Sold Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark product as sold" },
      { status: 500 }
    );
  }
}
