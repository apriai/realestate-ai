import { useState, useRef, useEffect } from "react";
import { useListConversations, useCreateConversation, useGetConversation, useSendMessage } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User as UserIcon, Send, Plus, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";

export default function AIChat() {
  const search = useSearch();
  const urlConvId = new URLSearchParams(search).get("conversationId");
  const [activeConvId, setActiveConvId] = useState<number | null>(
    urlConvId ? parseInt(urlConvId, 10) : null
  );
  const [inputMsg, setInputMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const createConvMutation = useCreateConversation();
  const sendMessageMutation = useSendMessage();

  const { data: activeConversation, isLoading: chatLoading } = useGetConversation(activeConvId || 0, {
    query: { enabled: !!activeConvId, queryKey: ['getConversation', activeConvId] as any }
  });

  useEffect(() => {
    if (!activeConvId && !urlConvId && conversations && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId, urlConvId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setInputMsg("");
  };

  const handleSend = () => {
    if (!inputMsg.trim() || sendMessageMutation.isPending || createConvMutation.isPending) return;
    const msg = inputMsg.trim();
    setInputMsg("");

    const doSend = (convId: number) => {
      sendMessageMutation.mutate(
        { id: convId, data: { content: msg } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getConversation', convId] as any });
          },
          onError: () => {
            setInputMsg(msg);
          }
        }
      );
    };

    if (activeConvId) {
      doSend(activeConvId);
    } else {
      const title = msg.length > 45 ? msg.slice(0, 42) + "..." : msg;
      createConvMutation.mutate({ data: { title } }, {
        onSuccess: (conv) => {
          setActiveConvId(conv.id);
          queryClient.invalidateQueries({ queryKey: ['listConversations'] as any });
          doSend(conv.id);
        },
        onError: () => {
          setInputMsg(msg);
        }
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 overflow-hidden">
      {/* Sidebar - Conversation List */}
      <Card className="w-64 hidden md:flex flex-col overflow-hidden bg-card/50">
        <div className="p-4 border-b">
          <Button className="w-full justify-start" onClick={handleNewChat} disabled={createConvMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Análisis
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {convsLoading ? (
              Array.from({length: 5}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : conversations?.map(conv => (
              <Button 
                key={conv.id} 
                variant={activeConvId === conv.id ? "secondary" : "ghost"} 
                className="w-full justify-start font-normal"
                onClick={() => setActiveConvId(conv.id)}
              >
                <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{conv.title}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {activeConvId ? (
          <>
            <div className="p-4 border-b bg-secondary/30 flex items-center justify-between">
              <h2 className="font-semibold">{activeConversation?.title || "Cargando..."}</h2>
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Bot className="h-4 w-4" /> IA GPT-5.4
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-6 max-w-3xl mx-auto pb-4">
                {chatLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-3/4 ml-auto" />
                    <Skeleton className="h-32 w-3/4" />
                  </div>
                ) : activeConversation?.messages?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground mt-20">
                    <Bot className="h-12 w-12 mb-4 text-muted-foreground/50" />
                    <p>Soy tu analista inmobiliario personal.</p>
                    <p className="text-sm mt-2">Pregúntame sobre rendimientos, análisis de zonas o normativas.</p>
                  </div>
                ) : (
                  activeConversation?.messages?.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      
                      <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        
                        {/* Structured Data Card for AI */}
                        {msg.role === 'assistant' && msg.structuredData && (
                          <Card className="w-full mt-2 bg-card border-primary/20 shadow-sm">
                            <CardContent className="p-4">
                              <pre className="text-xs text-muted-foreground overflow-auto">
                                {JSON.stringify(msg.structuredData, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        )}
                        
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>

                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 bg-background border-t">
              <form 
                className="max-w-3xl mx-auto relative flex items-center"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <Input 
                  className="pr-12 py-6 rounded-full bg-secondary/50 border-secondary focus-visible:ring-primary"
                  placeholder="Escribe tu consulta sobre bienes raíces..."
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1.5 h-9 w-9 rounded-full"
                  disabled={!inputMsg.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-muted-foreground">RealEstate AI puede cometer errores. Verifica la información importante.</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecciona o crea una conversación para comenzar
          </div>
        )}
      </Card>
    </div>
  );
}
