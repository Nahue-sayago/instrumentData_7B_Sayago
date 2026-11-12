import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { blobTokenError, ensureSchema, isMissingBlobCredentials } from "@/lib/instruments";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Identificador no válido." }, { status: 400 });

    const sql = await ensureSchema();
    const [instrument] = await sql`SELECT photo_pathname FROM instruments WHERE id = ${id}`;
    if (!instrument) return NextResponse.json({ error: "No se encontró el instrumento." }, { status: 404 });

    const blob = await get((instrument as { photo_pathname: string }).photo_pathname, { access: "private" });
    if (!blob) return NextResponse.json({ error: "No se encontró la fotografía." }, { status: 404 });
    if (blob.statusCode !== 200) return new Response(null, { status: blob.statusCode });

    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al consultar fotografía:", error);
    if (isMissingBlobCredentials(error)) {
      return NextResponse.json({ error: blobTokenError }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo cargar la fotografía." }, { status: 500 });
  }
}
