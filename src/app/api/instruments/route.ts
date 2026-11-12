import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { blobTokenError, ensureSchema, getPhoto, isMissingBlobCredentials, readFields } from "@/lib/instruments";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sql = await ensureSchema();
    const instruments = await sql`
      SELECT id, person_name, instrument_name, part_number, serial_number,
             photo_url, created_at, updated_at
      FROM instruments
      ORDER BY created_at DESC
    `;
    return NextResponse.json(
      instruments.map((instrument) => ({
        ...instrument,
        photo_url: `/api/instruments/${instrument.id}/photo`,
      })),
    );
  } catch (error) {
    console.error("Error al consultar instrumentos:", error);
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Falta configurar POSTGRES_URL o DATABASE_URL para guardar y recuperar los instrumentos." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "No se pudo conectar con la base de datos. Revisa la configuración." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let uploadedPathname: string | null = null;

  try {
    const form = await request.formData();
    const result = readFields(form);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const photoResult = getPhoto(form);
    if (photoResult && "error" in photoResult) {
      return NextResponse.json({ error: photoResult.error }, { status: 400 });
    }
    const photo = photoResult;
    if (!photo) return NextResponse.json({ error: "La foto es obligatoria." }, { status: 400 });

    const blob = await put(`instrumentos/${Date.now()}-${photo.name}`, photo, {
      access: "private",
      addRandomSuffix: true,
    });
    uploadedPathname = blob.pathname;

    const sql = await ensureSchema();
    const [instrument] = await sql`
      INSERT INTO instruments (person_name, instrument_name, part_number, serial_number, photo_url, photo_pathname)
      VALUES (${result.data.person_name}, ${result.data.instrument_name}, ${result.data.part_number}, ${result.data.serial_number}, ${blob.url}, ${blob.pathname})
      RETURNING id, person_name, instrument_name, part_number, serial_number, photo_url, created_at, updated_at
    `;

    return NextResponse.json({
      ...instrument,
      photo_url: `/api/instruments/${instrument.id}/photo`,
    }, { status: 201 });
  } catch (error) {
    if (uploadedPathname) await del(uploadedPathname).catch(() => undefined);
    console.error("Error al crear instrumento:", error);
    if (isMissingBlobCredentials(error)) {
      return NextResponse.json({ error: blobTokenError }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "No se pudo guardar el registro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}