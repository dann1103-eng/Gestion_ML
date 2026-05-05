"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildAdjuntoPath,
  crearSignedUploadUrl,
  crearSignedDownloadUrl,
  eliminarAdjuntoStorage,
} from "@/lib/storage";
import { requireUser } from "@/lib/auth";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

/**
 * Server Action: emite signed URL para que el cliente suba directo.
 * Devuelve { token, path } que el cliente usa con supabase.storage.uploadToSignedUrl()
 */
export async function iniciarUploadAdjunto(opts: {
  movimientoId: string;
  filename: string;
  mimeType: string;
  tamanoBytes: number;
}) {
  await requireUser();

  if (opts.tamanoBytes > MAX_BYTES) {
    return { ok: false as const, error: `Archivo muy grande (máx ${MAX_BYTES / 1024 / 1024}MB)` };
  }
  if (!ALLOWED_MIMES.includes(opts.mimeType)) {
    return { ok: false as const, error: "Tipo de archivo no permitido" };
  }

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: opts.movimientoId },
    select: { id: true, fecha: true },
  });
  if (!movimiento) return { ok: false as const, error: "Movimiento no encontrado" };

  const path = buildAdjuntoPath({
    movimientoId: movimiento.id,
    fecha: movimiento.fecha,
    filename: opts.filename,
  });

  const signed = await crearSignedUploadUrl(path);

  return {
    ok: true as const,
    data: { path, token: signed.token, signedUrl: signed.signedUrl },
  };
}

/**
 * Tras la subida exitosa, registra el adjunto en la base de datos.
 */
export async function registrarAdjunto(opts: {
  movimientoId: string;
  storagePath: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
}) {
  const user = await requireUser();
  const adjunto = await prisma.adjunto.create({
    data: {
      movimientoId: opts.movimientoId,
      storagePath: opts.storagePath,
      nombreOriginal: opts.nombreOriginal,
      mimeType: opts.mimeType,
      tamanoBytes: opts.tamanoBytes,
      uploadedById: user.id,
    },
  });
  revalidatePath(`/movimientos/${opts.movimientoId}`);
  return { ok: true as const, data: adjunto };
}

export async function eliminarAdjunto(adjuntoId: string) {
  await requireUser();
  const adj = await prisma.adjunto.findUnique({ where: { id: adjuntoId } });
  if (!adj) return { ok: false as const, error: "Adjunto no encontrado" };

  await eliminarAdjuntoStorage(adj.storagePath);
  await prisma.adjunto.delete({ where: { id: adjuntoId } });
  revalidatePath(`/movimientos/${adj.movimientoId}`);
  return { ok: true as const, data: null };
}

export async function urlDescargaAdjunto(adjuntoId: string) {
  await requireUser();
  const adj = await prisma.adjunto.findUnique({ where: { id: adjuntoId } });
  if (!adj) return { ok: false as const, error: "Adjunto no encontrado" };
  const url = await crearSignedDownloadUrl(adj.storagePath, 3600);
  return { ok: true as const, data: { url } };
}
