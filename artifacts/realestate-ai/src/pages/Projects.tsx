import { useState } from "react";
import { useListProjects, useUpdateProject, useCreateInvestmentInterest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Globe, Lock, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const updateProject = useUpdateProject();
  const createInterest = useCreateInvestmentInterest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [investDialog, setInvestDialog] = useState<{ id: number; title: string } | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [investMessage, setInvestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

  const handleTogglePublic = (e: React.MouseEvent, projectId: number, isPublic: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setTogglingId(projectId);
    updateProject.mutate(
      { id: projectId, data: { isPublic: !isPublic } as any },
      {
        onSuccess: () => {
          toast({ title: !isPublic ? "Proyecto visible en página pública" : "Proyecto ocultado de la página pública" });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        },
        onError: () => toast({ title: "Error actualizando visibilidad", variant: "destructive" }),
        onSettled: () => setTogglingId(null),
      }
    );
  };

  const openInvestDialog = (e: React.MouseEvent, id: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setInvestAmount("");
    setInvestMessage("");
    setInvestDialog({ id, title });
  };

  const handleSubmitInterest = () => {
    if (!investDialog) return;
    setSubmitting(true);
    const amountNum = investAmount ? parseFloat(investAmount.replace(/,/g, "")) : undefined;
    createInterest.mutate(
      {
        data: {
          projectId: investDialog.id,
          ...(amountNum && !isNaN(amountNum) ? { amountInterested: amountNum } : {}),
          ...(investMessage.trim() ? { message: investMessage.trim() } : {}),
        }
      },
      {
        onSuccess: () => {
          toast({ title: "¡Solicitud enviada! El equipo te contactará pronto." });
          setInvestDialog(null);
        },
        onError: () => toast({ title: "Error enviando solicitud", variant: "destructive" }),
        onSettled: () => setSubmitting(false),
      }
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyectos en Desarrollo</h1>
          <p className="text-muted-foreground">Sigue el avance de construcciones y preventas.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full rounded-none" />
                <CardContent className="p-4 space-y-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))
          ) : projects?.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <p className="text-muted-foreground">No hay proyectos activos.</p>
            </div>
          ) : (
            projects?.map((project) => {
              const fundingPercent = project.raisedAmount && project.totalInvestment
                ? (project.raisedAmount / project.totalInvestment) * 100
                : 0;

              return (
                <Link key={project.id} href={`/proyectos/${project.id}`}>
                  <Card className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col group">
                    <div className="aspect-[16/9] bg-muted relative">
                      {project.images?.[0] && (
                        <img src={`/api/storage${project.images[0]}`} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="capitalize bg-black/70 hover:bg-black/80 text-white backdrop-blur-md border-0">
                          {project.status}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={project.isPublic ? "default" : "secondary"}
                          className="text-[10px] gap-1 cursor-pointer"
                          onClick={(e) => handleTogglePublic(e, project.id, project.isPublic)}
                        >
                          {togglingId === project.id ? (
                            <span className="animate-pulse">...</span>
                          ) : project.isPublic ? (
                            <><Globe className="h-3 w-3" /> Público</>
                          ) : (
                            <><Lock className="h-3 w-3" /> Privado</>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-lg mb-1">{project.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-4">{project.location}</p>

                      <div className="mt-auto space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Fondeo</span>
                            <span>{fundingPercent.toFixed(0)}%</span>
                          </div>
                          <Progress value={fundingPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground text-right mt-1">
                            {formatCurrency(project.raisedAmount || 0)} / {formatCurrency(project.totalInvestment || 0)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">ROI Est.</p>
                            <p className="font-semibold text-primary flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />{project.roiEstimated}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Inversores</p>
                            <p className="font-semibold">{project.investorCount}</p>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          size="sm"
                          onClick={(e) => openInvestDialog(e, project.id, project.title)}
                        >
                          Quiero Invertir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={!!investDialog} onOpenChange={(open) => !open && setInvestDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Inversión</DialogTitle>
            <DialogDescription>
              {investDialog?.title} — Completa tu solicitud y el equipo te contactará.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invest-amount">Monto a invertir (MXN, opcional)</Label>
              <Input
                id="invest-amount"
                type="number"
                placeholder="Ej. 500000"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invest-message">Mensaje (opcional)</Label>
              <Textarea
                id="invest-message"
                placeholder="Cuéntanos sobre tus objetivos de inversión..."
                rows={3}
                value={investMessage}
                onChange={(e) => setInvestMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestDialog(null)}>Cancelar</Button>
            <Button onClick={handleSubmitInterest} disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
