import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Check if user exists, if not create as generic (role 0)
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          role: 0, 
        },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
