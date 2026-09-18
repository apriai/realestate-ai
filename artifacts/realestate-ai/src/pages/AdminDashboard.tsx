import { useState } from "react";
import { useGetAdminStats, useListAdminUsers, useListAdminProperties, useListAdminInvestmentInterests, useUpdateUserRole, useUpdateInvestmentInterestStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ShieldCheck, ShieldOff } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  contactado: "Contactado",
  rechazado: "Rechazado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "outline",
  contactado: "default",
  rechazado: "destructive",
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: users, isLoading: usersLoading } = useListAdminUsers();
  const { data: properties, isLoading: propsLoading } = useListAdminProperties();
  const { data: interests, isLoading: interestsLoading } = useListAdminInvestmentInterests();

  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateInvestmentInterestStatus();

  const [processingId, setProcessingId] = useState<number | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

  const handleRoleToggle = (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setProcessingId(userId);
    updateRole.mutate(
      { id: userId, data: { role: newRole as any } },
      {
        onSuccess: () => {
          toast({ title: `Rol actualizado a ${newRole}` });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        },
        onError: () => toast({ title: "Error actualizando rol", variant: "destructive" }),
        onSettled: () => setProcessingId(null),
      }
    );
  };

  const handleInterestStatus = (id: number, status: "contactado" | "rechazado") => {
    setProcessingId(id);
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: status === "contactado" ? "Solicitud contactada" : "Solicitud rechazada" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/investment-interests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
        onError: () => toast({ title: "Error actualizando solicitud", variant: "destructive" }),
        onSettled: () => setProcessingId(null),
      }
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Métricas globales de la plataforma RealEstate AI.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Usuarios Activos", value: stats?.totalUsers, color: "" },
          { label: "AUM Global", value: stats?.totalAum !== undefined ? formatCurrency(stats.totalAum) : undefined, color: "text-primary" },
          { label: "Propiedades Registradas", value: stats?.totalProperties, color: "" },
          { label: "Inversiones Pendientes", value: stats?.pendingInterests, color: "text-destructive" },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-20" /> : <p className={`text-3xl font-bold ${card.color}`}>{card.value ?? 0}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="intereses">
        <TabsList>
          <TabsTrigger value="intereses">Solicitudes de Inversión</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="propiedades">Propiedades</TabsTrigger>
        </TabsList>

        <TabsContent value="intereses" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Solicitudes de Inversión</CardTitle></CardHeader>
            <CardContent>
              {interestsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : interests?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay solicitudes de inversión.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inversionista</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interests?.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs font-medium">{(i as any).user?.email || `Usuario ${i.userId}`}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{(i as any).project?.title || `Proyecto ${i.projectId}`}</TableCell>
                        <TableCell className="text-xs">{i.amountInterested ? formatCurrency(i.amountInterested) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[i.status] ?? "outline"} className="text-[10px]">
                            {STATUS_LABELS[i.status] ?? i.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {i.status === "pendiente" && (
                            <div className="flex gap-1">
                              <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={processingId === i.id}
                                onClick={() => handleInterestStatus(i.id, "contactado")}
                                title="Marcar como contactado"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                disabled={processingId === i.id}
                                onClick={() => handleInterestStatus(i.id, "rechazado")}
                                title="Rechazar"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Gestión de Usuarios</CardTitle></CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">{u.email}</TableCell>
                        <TableCell className="capitalize text-muted-foreground text-xs">{u.investorType?.replace('_', ' ') || '—'}</TableCell>
                        <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge></TableCell>
                        <TableCell>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs gap-1.5"
                            disabled={processingId === u.id}
                            onClick={() => handleRoleToggle(u.id, u.role)}
                          >
                            {u.role === "admin"
                              ? <><ShieldOff className="h-3.5 w-3.5" />Quitar admin</>
                              : <><ShieldCheck className="h-3.5 w-3.5" />Hacer admin</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="propiedades" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Propiedades Registradas</CardTitle></CardHeader>
            <CardContent>
              {propsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pública</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties?.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-[150px] truncate text-sm">{p.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.city || '—'}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(p.currentValue || p.purchasePrice)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-[10px]">{p.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={p.isPublic ? "default" : "secondary"} className="text-[10px]">
                            {p.isPublic ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
