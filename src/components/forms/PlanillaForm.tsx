"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; error?: string; data?: { id: string } }>;
};

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function lastDayOfMonth(anio: number, mes: number) {
  return new Date(anio, mes, 0).getDate(); // mes is 1-based, Date(y,m,0) = last day
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function PlanillaForm({ onSubmit }: Props) {
  const router = useRouter();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute default dates whenever anio/mes/quincena change
  useEffect(() => {
    if (quincena === 1) {
      setFechaInicio(toISODate(new Date(Date.UTC(anio, mes - 1, 1))));
      setFechaFin(toISODate(new Date(Date.UTC(anio, mes - 1, 15))));
    } else {
      setFechaInicio(toISODate(new Date(Date.UTC(anio, mes - 1, 16))));
      setFechaFin(toISODate(new Date(Date.UTC(anio, mes - 1, lastDayOfMonth(anio, mes)))));
    }
  }, [anio, mes, quincena]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await onSubmit(formData);
    if (!res.ok) {
      setError(res.error ?? "Error al crear la planilla");
      setPending(false);
      return;
    }
    router.push(`/planillas/${res.data!.id}`);
  }

  const anioActual = hoy.getFullYear();
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 1 + i);

  return (
    <form action={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="anio">Año *</Label>
            <Select
              id="anio"
              name="anio"
              value={String(anio)}
              onChange={(e) => setAnio(Number(e.target.value))}
            >
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="mes">Mes *</Label>
            <Select
              id="mes"
              name="mes"
              value={String(mes)}
              onChange={(e) => setMes(Number(e.target.value))}
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="quincena">Quincena *</Label>
            <Select
              id="quincena"
              name="quincena"
              value={String(quincena)}
              onChange={(e) => setQuincena(Number(e.target.value) as 1 | 2)}
            >
              <option value="1">1ª quincena (1–15)</option>
              <option value="2">2ª quincena (16–fin de mes)</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="fechaInicio">Fecha inicio *</Label>
            <Input
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="fechaFin">Fecha fin *</Label>
            <Input
              id="fechaFin"
              name="fechaFin"
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="fechaPago">Fecha de pago *</Label>
            <Input id="fechaPago" name="fechaPago" type="date" required />
          </div>

          <div>
            <Label htmlFor="medioPago">Medio de pago *</Label>
            <Select id="medioPago" name="medioPago" defaultValue="EFECTIVO">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia bancaria</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando..." : "Crear planilla"}
        </Button>
      </div>
    </form>
  );
}
