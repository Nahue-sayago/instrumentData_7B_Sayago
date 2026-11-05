import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { blobTokenError, ensureSchema, getPhoto, isBlobConfigured, readFields } from "@/lib/instruments";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  let uploadedPathname: string | null = null;

  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Identificador no válido." }, { status: 400 });

    const form = await request.formData();
    const result = readFields(form);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const sql = await ensureSchema();
    const [current] = await sql`SELECT id, photo_url, photo_pathname FROM instruments WHERE id = ${id}`;
    if (!current) return NextResponse.json({ error: "No se encontró el instrumento." }, { status: 404 });

    const photo = getPhoto(form);
    if (photo && "error" in photo) {
      return NextResponse.json({ error: photo.error }, { status: 400 });
    }
    if (photo && !isBlobConfigured()) {
      return NextResponse.json({ error: blobTokenError }, { status: 503 });
    }
    let photoUrl = (current as { photo_url?: string }).photo_url;
    let photoPathname = (current as { photo_pathname: string }).photo_pathname;
    if (photo) {
      const blob = await put(`instrumentos/${Date.now()}-${photo.name}`, photo, {
        access: "public",
        addRandomSuffix: true,
      });
      uploadedPathname = blob.pathname;
      photoUrl = blob.url;
      photoPathname = blob.pathname;
    }

    const [instrument] = await sql`
      UPDATE instruments
      SET person_name = ${result.data.person_name}, instrument_name = ${result.data.instrument_name},
          part_number = ${result.data.part_number}, serial_number = ${result.data.serial_number},
          photo_url = ${photoUrl}, photo_pathname = ${photoPathname}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, person_name, instrument_name, part_number, serial_number, photo_url, created_at, updated_at
    `;

    if (uploadedPathname) await del((current as { photo_pathname: string }).photo_pathname).catch(() => undefined);
    return NextResponse.json(instrument);
  } catch (error) {
    if (uploadedPathname) await del(uploadedPathname).catch(() => undefined);
    console.error("Error al actualizar instrumento:", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el registro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Identificador no válido." }, { status: 400 });
    if (!isBlobConfigured()) return NextResponse.json({ error: blobTokenError }, { status: 503 });

    const sql = await ensureSchema();
    const [instrument] = await sql`DELETE FROM instruments WHERE id = ${id} RETURNING photo_pathname`;
    if (!instrument) return NextResponse.json({ error: "No se encontró el instrumento." }, { status: 404 });

    await del((instrument as { photo_pathname: string }).photo_pathname).catch((error) => {
      console.error("No se pudo eliminar la foto:", error);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar instrumento:", error);
    return NextResponse.json({ error: "No se pudo eliminar el registro." }, { status: 500 });
  }
}