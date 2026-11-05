import { neon } from "@neondatabase/serverless";

export type Instrument = {
  id: number;
  person_name: string;
  instrument_name: string;
  part_number: string;
  serial_number: string;
  photo_url: string;
  created_at: string;
  updated_at: string;
};

export const blobTokenError = "No se detectaron credenciales de Blob. Conecta el almacén al proyecto o configura BLOB_READ_WRITE_TOKEN.";

export function isBlobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

export function getDatabase() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Configura POSTGRES_URL o DATABASE_URL para conectar la base de datos.");
  }

  return neon(connectionString);
}

export async function ensureSchema() {
  const sql = getDatabase();
  await sql`
    CREATE TABLE IF NOT EXISTS instruments (
      id BIGSERIAL PRIMARY KEY,
      person_name VARCHAR(120) NOT NULL,
      instrument_name VARCHAR(120) NOT NULL,
      part_number VARCHAR(80) NOT NULL,
      serial_number VARCHAR(80) NOT NULL,
      photo_url TEXT NOT NULL,
      photo_pathname TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}

export function readFields(form: FormData) {
  const limits = {
    person_name: 120,
    instrument_name: 120,
    part_number: 80,
    serial_number: 80,
  };
  const fields = {
    person_name: form.get("person_name"),
    instrument_name: form.get("instrument_name"),
    part_number: form.get("part_number"),
    serial_number: form.get("serial_number"),
  };

  for (const [name, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim()) {
      return { error: `El campo ${name.replaceAll("_", " ")} es obligatorio.` };
    }
    if (value.trim().length > limits[name as keyof typeof limits]) {
      return { error: `El campo ${name.replaceAll("_", " ")} es demasiado largo.` };
    }
  }

  return {
    data: {
      person_name: (fields.person_name as string).trim(),
      instrument_name: (fields.instrument_name as string).trim(),
      part_number: (fields.part_number as string).trim(),
      serial_number: (fields.serial_number as string).trim(),
    },
  };
}

export function getPhoto(form: FormData) {
  const photo = form.get("photo");
  if (!photo || typeof photo === "string" || photo.size === 0) return null;
  if (!photo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
  if (photo.size > 5 * 1024 * 1024) return { error: "La imagen no puede superar 5 MB." };
  return photo;
}