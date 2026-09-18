import { useGetProject, useCreateInvestmentInterest } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Users, Building, MapPin, DollarSign, Calendar, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id, 10);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: project, isLoading } = useGetProject(projectId, { 
    query: { enabled: !isNaN(projectId), queryKey: ['getProject', projectId] as any } 
  });

  const investMutation = useCreateInvestmentInterest();
  const [investData, setInvestData] = useState({ amountInterested: 0, message: "" });

  const formatCurrency = (value?: number | null) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
  };

  const handleInvest = () => {
    investMutation.mutate({ 
      data: { 
        projectId, 
        amountInterested: investData.amountInterested, 
        message: investData.message 
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Interés registrado exitosamente", description: "Nos pondremos en contacto contigo pronto." });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Error al registrar interés", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!project) return <div className="p-8 text-center">Proyecto no encontrado</div>;

  const fundingPercent = project.raisedAmount && project.totalInvestment 
    ? (project.raisedAmount / project.totalInvestment) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/proyectos">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
              <Badge variant="secondary" className="capitalize">{project.status}</Badge>
            </div>
            <div className="flex items-center text-muted-foreground text-sm mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {project.location}
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto">Invertir en Proyecto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Declarar Interés de Inversión</DialogTitle>
              <DialogDescription>
                Ingresa el monto que te interesaría invertir en {project.title}. Un asesor se comunicará contigo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Monto de Inversión Estimado (MXN)</Label>
                <Input 
                  type="number" 
                  placeholder="Ej. 500000"
                  value={investData.amountInterested || ''}
                  onChange={e => setInvestData({ ...investData, amountInterested: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensaje (Opcional)</Label>
                <Textarea 
                  placeholder="¿Tienes alguna pregunta específica?"
                  value={investData.message}
                  onChange={e => setInvestData({ ...investData, message: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvest} disabled={investMutation.isPending || !investData.amountInterested}>
                {investMutation.isPending ? "Enviando..." : "Confirmar Interés"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {project.images && project.images.length > 0 ? (
            <div className="aspect-[21/9] bg-muted rounded-lg overflow-hidden relative">
              <img src={`/api/storage${project.images[0]}`} alt={project.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                 <h2 className="text-white text-2xl font-bold">{project.type}</h2>
              </div>
            </div>
          ) : (
            <div className="aspect-[21/9] bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Descripción del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{project.description || 'Sin descripción detallada.'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fases del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {project.phases && project.phases.length > 0 ? (
                  project.phases.map((phase, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-4 w-4 rounded-full ${phase.status === 'completed' ? 'bg-primary' : phase.status === 'active' ? 'bg-primary/50 border-2 border-primary' : 'bg-muted'}`} />
                        {i !== project.phases.length - 1 && <div className="w-px h-full bg-border my-2" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className={`font-medium ${phase.status !== 'pending' ? 'text-foreground' : 'text-muted-foreground'}`}>{phase.name}</h4>
                          <Badge variant={phase.status === 'completed' ? 'default' : phase.status === 'active' ? 'secondary' : 'outline'} className="capitalize">
                            {phase.status}
                          </Badge>
                        </div>
                        <Progress value={phase.progress} className="h-1.5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay fases registradas.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-secondary/50 pb-4">
              <CardTitle>Fondeo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Recaudado</span>
                  <span className="text-primary">{fundingPercent.toFixed(1)}%</span>
                </div>
                <Progress value={fundingPercent} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatCurrency(project.raisedAmount)}</span>
                  <span>{formatCurrency(project.totalInvestment)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Users className="h-3 w-3" /> Inversores</p>
                  <p className="text-xl font-bold">{project.investorCount}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-muted-foreground uppercase flex justify-end items-center gap-1"><TrendingUp className="h-3 w-3" /> ROI Est.</p>
                  <p className="text-xl font-bold text-primary">{project.roiEstimated}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Métricas de Zona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><Building className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Desarrollo</p>
                  <p className="font-medium text-sm capitalize">{project.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Inicio</p>
                  <p className="font-medium text-sm">{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
