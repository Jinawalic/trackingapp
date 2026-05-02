import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { productId, walletAddress, archived } = body as {
      productId?: string;
      walletAddress?: string;
      archived?: boolean;
    };

    if (!productId || !walletAddress) {
      return NextResponse.json(
        { error: "Missing productId or walletAddress" },
        { status: 400 }
      );
    }

    if (typeof archived !== "boolean") {
      return NextResponse.json(
        { error: "archived must be a boolean" },
        { status: 400 }
      );
    }

    const normalizedAddress = String(walletAddress).toLowerCase();

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

    await prisma.product.update({
      where: { id: productId },
      data: { archived },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Archive Product Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update archive state" },
      { status: 500 }
    );
  }
}
