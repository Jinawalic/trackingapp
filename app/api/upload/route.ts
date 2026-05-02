import { NextResponse } from "next/server";

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text) as Record<string, unknown>;
    } catch {
        return { _nonJsonBody: text.slice(0, 500) };
    }
}

export async function POST(req: Request) {
    try {
        const jwt = process.env.PINATA_JWT?.trim();
        if (!jwt) {
            return NextResponse.json(
                { error: "PINATA_JWT is not configured on the server" },
                { status: 503 }
            );
        }

        const data = await req.formData();
        const file = data.get("file");

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const formData = new FormData();
        const bytes = await file.arrayBuffer();
        const filename = file instanceof File ? file.name : "upload";
        const mime = file.type || "application/octet-stream";
        formData.append("file", new Blob([bytes], { type: mime }), filename);

        const metadata = JSON.stringify({
            name: filename,
            keyvalues: {
                project: "SupplyChain-dApp",
            },
        });
        formData.append("pinataMetadata", metadata);

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
            body: formData,
        });

        const result = await readJsonSafe(res);

        if (!res.ok) {
            console.error("Pinata Error:", result);
            const errMsg =
                typeof result.error === "object" && result.error !== null
                    ? JSON.stringify(result.error)
                    : typeof result.error === "string"
                      ? result.error
                      : typeof result.message === "string"
                        ? result.message
                        : "Pinata upload failed";
            return NextResponse.json({ error: errMsg }, { status: res.status });
        }

        const hash = result.IpfsHash;
        if (typeof hash !== "string" || !hash) {
            console.error("Pinata unexpected response:", result);
            return NextResponse.json(
                { error: "Pinata returned no IPFS hash" },
                { status: 502 }
            );
        }

        return NextResponse.json({ hash });
    } catch (error) {
        console.error("Server Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
