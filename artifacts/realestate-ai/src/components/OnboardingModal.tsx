import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateMe } from "@workspace/api-client-react";
import { Home, Wrench, Building2, LayoutGrid } from "lucide-react";

const TYPES = [
  {
    value: "rental" as const,
    label: "Renta",
    desc: "Propiedades para generar ingreso mensual pasivo",
    icon: Home,
  },
  {
    value: "fix_flip" as const,
    label: "Fix & Flip",
    desc: "Comprar, rehabilitar y vender con plusvalía",
    icon: Wrench,
  },
  {
    value: "development" as const,
    label: "Desarrollador",
    desc: "Proyectos de construcción y desarrollo desde cero",
    icon: Building2,
  },
  {
    value: "mixed" as const,
    label: "Mixto",
    desc: "Combino varias estrategias según la oportunidad",
    icon: LayoutGrid,
  },
];

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const updateMe = useUpdateMe();

  const handleContinue = () => {
    if (!selected) return;
    updateMe.mutate(
      { data: { investorType: selected as any } },
      {
        onSuccess: () => {
          fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ onboardingCompleted: new Date().toISOString() }),
          });
          onComplete();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Bienvenido a RealEstate AI</DialogTitle>
          <DialogDescription>
            Para personalizar tu experiencia, ¿cuál es tu perfil como inversor?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const isSelected = selected === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setSelected(t.value)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/8"
                    : "border-border hover:border-primary/40 hover:bg-secondary/50"
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/15" : "bg-secondary"}`}>
                  <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full mt-2"
          disabled={!selected || updateMe.isPending}
          onClick={handleContinue}
        >
          {updateMe.isPending ? "Guardando…" : "Comenzar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
