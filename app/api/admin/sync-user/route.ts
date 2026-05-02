import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { walletAddress, role } = await req.json();

    if (!walletAddress || role === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // PROFESSIONAL ADDITION: Always lowercase addresses before saving to DB
    // This ensures consistency across different wallet providers.
    const normalizedAddress = walletAddress.toLowerCase();

    const user = await prisma.user.upsert({
      where: { walletAddress: normalizedAddress },
      update: { role: Number(role) },
      create: {
        walletAddress: normalizedAddress,
        role: Number(role),
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Sync User Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync user" }, { status: 500 });
  }
}