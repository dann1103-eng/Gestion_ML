import { createSupabaseAdminClient } from "./supabase/admin";

const BUCKET_ADJUNTOS = process.env.SUPABASE_STORAGE_BUCKET_ADJUNTOS ?? "adjuntos";

export function buildAdjuntoPath(opts: {
  movimientoId: string;
  fecha: Date;
  filename: string;
}) {
  const yyyy = opts.fecha.getUTCFullYear();
  const mm = String(opts.fecha.getUTCMonth() + 1).padStart(2, "0");
  const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uid = Math.random().toString(36).slice(2, 10);
  return `movimientos/${yyyy}/${mm}/${opts.movimientoId}/${uid}-${safeName}`;
}

/**
 * Emite una signed upload URL para que el cliente suba directamente a Supabase Storage.
 */
export async function crearSignedUploadUrl(path: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_ADJUNTOS)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data;
}

/**
 * Emite una signed URL temporal para visualizar/descargar un adjunto.
 */
export async function crearSignedDownloadUrl(path: string, expiresInSec = 3600) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_ADJUNTOS)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export async function eliminarAdjuntoStorage(path: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(BUCKET_ADJUNTOS).remove([path]);
  if (error) throw error;
}

export const ADJUNTOS_BUCKET = BUCKET_ADJUNTOS;
