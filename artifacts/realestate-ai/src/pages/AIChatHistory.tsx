import { useListConversations, useDeleteConversation } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AIChatHistory() {
  const { data: conversations, isLoading } = useListConversations();
  const deleteMutation = useDeleteConversation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['listConversations'] as any });
        toast({ title: "Conversación eliminada" });
      },
      onError: () => {
        toast({ title: "Error al eliminar conversación", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de Análisis</h1>
          <p className="text-muted-foreground text-sm mt-1">Todas tus conversaciones con el asesor IA</p>
        </div>
        <Link href="/ai">
          <Button size="sm">
            Nueva Consulta <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-medium text-muted-foreground">Sin conversaciones aún</p>
            <p className="text-sm text-muted-foreground mt-1">Inicia una consulta con tu asesor IA</p>
            <Link href="/ai">
              <Button className="mt-4" size="sm">Comenzar</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => (
            <Card key={conv.id} className="hover:bg-secondary/30 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <Link href={`/ai?conversationId=${conv.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(conv.createdAt).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(conv.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
