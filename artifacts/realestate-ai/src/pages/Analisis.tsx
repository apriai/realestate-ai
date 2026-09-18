import { useState } from "react";
import { useListZones, useListZoneNotes, useUpsertZoneNote } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, MapPin, BarChart2, DollarSign, Percent, Building2, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function RoiBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

const METRIC_CARDS = [
  { label: "Rendimiento Promedio", value: "8.4%", sub: "anual bruto", icon: Percent, color: "text-primary", bg: "bg-primary/10" },
  { label: "Apreciación de Zonas", value: "+12.1%", sub: "últimos 12 meses", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  { label: "Precio Promedio m²", value: "$28,400", sub: "MXN · promedio nacional", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Zonas Analizadas", value: "—", sub: "en tu cartera", icon: Building2, color: "text-muted-foreground", bg: "bg-secondary", dynamic: true },
];

const MARKET_SEGMENTS = [
  { name: "Residencial", share: 52, trend: "up" as const, roi: 7.8 },
  { name: "Comercial", share: 22, trend: "up" as const, roi: 9.2 },
  { name: "Industrial", share: 14, trend: "neutral" as const, roi: 8.5 },
  { name: "Plus / Lujo", share: 8, trend: "down" as const, roi: 5.9 },
  { name: "Terrenos", share: 4, trend: "up" as const, roi: 11.3 },
];

const MARKET_INSIGHTS = [
  { title: "CDMX — Corredor Santa Fe", insight: "Alta demanda corporativa impulsa renta de oficinas. Cap rate 7–9%.", badge: "Alta oportunidad", badgeColor: "bg-green-100 text-green-700" },
  { title: "Monterrey — Valle Oriente", insight: "Zona consolidada con apreciación constante. Demanda residencial sostenida.", badge: "Estable", badgeColor: "bg-blue-100 text-blue-700" },
  { title: "Guadalajara — Zapopan", insight: "Expansión del clúster tecnológico genera demanda de vivienda media–alta.", badge: "Crecimiento", badgeColor: "bg-primary/10 text-primary" },
  { title: "Tulum — Zona Hotelera", insight: "Saturación del mercado turístico. Evaluar con cautela proyectos nuevos.", badge: "Precaución", badgeColor: "bg-orange-100 text-orange-700" },
];

function ZoneNoteEditor({ zoneId, zoneName, existingContent }: { zoneId: number; zoneName: string; existingContent?: string }) {
  const [content, setContent] = useState(existingContent ?? "");
  const [saved, setSaved] = useState(false);
  const upsertNote = useUpsertZoneNote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSave = () => {
    upsertNote.mutate(
      { zoneId, data: { content } },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          queryClient.invalidateQueries({ queryKey: ["/api/zone-notes"] });
        },
        onError: () => toast({ title: "Error guardando nota", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="font-semibold text-sm">{zoneName}</p>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Tus notas sobre ${zoneName}...`}
        rows={3}
        className="text-sm resize-none bg-secondary/30"
      />
      <div className="flex justify-end items-center gap-2">
        {saved && <span className="text-xs text-green-600 font-medium">Guardado ✓</span>}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={handleSave}
          disabled={upsertNote.isPending}
        >
          <Save className="h-3.5 w-3.5" />
          {upsertNote.isPending ? "Guardando..." : "Guardar nota"}
        </Button>
      </div>
    </div>
  );
}

export default function Analisis() {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const { data: zones, isLoading: zonesLoading } = useListZones();
  const { data: zoneNotes, isLoading: notesLoading } = useListZoneNotes();

  const zoneCount = zones?.length ?? 0;

  const getNoteContent = (zoneId: number) =>
    (zoneNotes as any[])?.find((n: any) => n.zoneId === zoneId)?.content ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Análisis de Mercado</h1>
        <p className="text-sm text-muted-foreground mt-1">Indicadores clave para el mercado inmobiliario mexicano</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          const displayValue = card.dynamic ? (zoneCount > 0 ? String(zoneCount) : "—") : card.value;
          return (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className={`inline-flex p-2 rounded-xl ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight">{displayValue}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{card.sub}</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Segmentos del Mercado</h2>
          </div>
          <div className="space-y-4">
            {MARKET_SEGMENTS.map((seg) => (
              <button
                key={seg.name}
                onClick={() => setActiveSegment(activeSegment === seg.name ? null : seg.name)}
                className={`w-full text-left space-y-1.5 rounded-xl p-3 transition-colors ${activeSegment === seg.name ? "bg-primary/8" : "hover:bg-secondary/60"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={seg.trend} />
                    <span className="text-sm font-medium">{seg.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{seg.share}%</span>
                    <span className="font-semibold text-foreground">ROI {seg.roi}%</span>
                  </div>
                </div>
                <RoiBar value={seg.roi} max={15} />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Oportunidades por Zona</h2>
          </div>
          <div className="space-y-3">
            {MARKET_INSIGHTS.map((item) => (
              <div key={item.title} className="rounded-xl border border-border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Notes Notebook */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Notas de Zonas</h2>
          <span className="text-xs text-muted-foreground ml-auto">Tus apuntes privados por zona</span>
        </div>

        {zonesLoading || notesLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : !zones || zones.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Guarda zonas de interés en la sección <span className="font-medium text-foreground">Zonas</span> para agregar notas aquí.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {zones.map((zone) => (
              <ZoneNoteEditor
                key={zone.id}
                zoneId={zone.id}
                zoneName={zone.name}
                existingContent={getNoteContent(zone.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
