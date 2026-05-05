"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  iniciarUploadAdjunto,
  registrarAdjunto,
  eliminarAdjunto,
  urlDescargaAdjunto,
} from "@/server/actions/adjuntos";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Adjunto } from "@prisma/client";

const ADJUNTOS_BUCKET = "adjuntos";

type Props = {
  movimientoId: string;
  adjuntos: Adjunto[];
};

export function AdjuntosManager({ movimientoId, adjuntos }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      // 1. Pedir signed upload URL
      const init = await iniciarUploadAdjunto({
        movimientoId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        tamanoBytes: file.size,
      });
      if (!init.ok) {
        setError(init.error);
        return;
      }

      // 2. Subir directo a Supabase Storage con el token
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from(ADJUNTOS_BUCKET)
        .uploadToSignedUrl(init.data.path, init.data.token, file);
      if (upErr) {
        setError(upErr.message);
        return;
      }

      // 3. Registrar metadata en DB
      await registrarAdjunto({
        movimientoId,
        storagePath: init.data.path,
        nombreOriginal: file.name,
        mimeType: file.type || "application/octet-stream",
        tamanoBytes: file.size,
      });

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
      ev.target.value = "";
    }
  }

  async function onView(id: string) {
    const r = await urlDescargaAdjunto(id);
    if (r.ok) window.open(r.data.url, "_blank");
    else setError(r.error);
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este adjunto?")) return;
    const r = await eliminarAdjunto(id);
    if (!r.ok) setError(r.error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Subir archivo</label>
        <input
          type="file"
          onChange={onFileChange}
          disabled={uploading}
          accept="application/pdf,image/*"
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
        />
        <p className="text-xs text-muted-foreground mt-1">
          PDF o imagen. Máximo 50MB. Subida directa al storage.
        </p>
        {uploading ? (
          <p className="text-sm text-muted-foreground mt-2">Subiendo...</p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {adjuntos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin adjuntos.</p>
      ) : (
        <ul className="space-y-2">
          {adjuntos.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline">{a.mimeType.split("/")[1]?.toUpperCase() ?? "?"}</Badge>
                <span className="font-medium">{a.nombreOriginal}</span>
                <span className="text-xs text-muted-foreground">
                  {(a.tamanoBytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onView(a.id)}>
                  Ver
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(a.id)}>
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
