import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, Send, Loader2, Sparkles, Database, 
  TrendingUp, Building2, X, Minimize2, Maximize2 
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: {
    entities?: Array<{ id: string; name: string; type: string; score?: number }>;
    stats?: Record<string, string | number>;
    contracts?: Array<{ type: string; entity?: string; value: unknown }>;
  };
  timestamp: Date;
}

interface AiChatProps {
  initialContext?: Record<string, unknown>;
  onEntityClick?: (entityId: string) => void;
}

export default function AiChat({ initialContext, onEntityClick }: AiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Based Data AI assistant. Ask me anything about entities, contracts, relationships, or market trends. Try:\n\n• \"Show me the top healthcare companies\"\n• \"What contracts were recently awarded?\"\n• \"Find competitors to major hospitals\"\n• \"Summarize the federal contracting market\"",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: input,
          context: initialContext,
          history: messages.slice(-10)
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        data: data.data,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-lg z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 bg-background border-border shadow-2xl z-50 flex flex-col transition-all duration-300 ${
      isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Based Data AI</p>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Render data cards if present */}
                    {msg.data?.entities && (
                      <div className="mt-3 space-y-2">
                        {msg.data.entities.slice(0, 3).map((entity, j) => (
                          <div 
                            key={j}
                            className="bg-background/20 rounded p-2 cursor-pointer hover:bg-background/30 transition-colors"
                            onClick={() => onEntityClick?.(entity.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{entity.name}</span>
                              {entity.score && (
                                <Badge variant="outline" className="text-xs">
                                  {entity.score}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs opacity-70">{entity.type}</p>
                          </div>
                        ))}
                        {msg.data.entities.length > 3 && (
                          <p className="text-xs opacity-70">
                            +{msg.data.entities.length - 3} more results
                          </p>
                        )}
                      </div>
                    )}
                    
                    {msg.data?.stats && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {Object.entries(msg.data.stats).map(([key, value]) => (
                          <div key={key} className="bg-background/20 rounded p-2">
                            <p className="text-xs opacity-70">{key}</p>
                            <p className="font-mono font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-border">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => setInput('Top contracts in Maryland')}
              >
                <Database className="w-3 h-3 mr-1" /> Contracts
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => setInput('Healthcare market trends')}
              >
                <TrendingUp className="w-3 h-3 mr-1" /> Trends
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted whitespace-nowrap"
                onClick={() => setInput('Show high opportunity entities')}
              >
                <Building2 className="w-3 h-3 mr-1" /> Opportunities
              </Badge>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask anything about the data..."
                className="bg-muted border-border text-foreground"
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
