// BASED DATA - Omniscient AI Assistant — BOMB-07 Production Upgrade
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Building2, Target, BarChart3, Brain, DollarSign, Search, Sparkles } from 'lucide-react';
import aiChatIcon from '@/assets/ai-chat-icon.png';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';


interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  entities?: Array<{ id: string; name: string }>;
  sources?: string[];
  timestamp: Date;
}

const STARTER_QUESTIONS = [
  { icon: Building2, text: "Who are the top defense contractors in Maryland?" },
  { icon: Target, text: "What opportunities are closing this week?" },
  { icon: DollarSign, text: "Show me the biggest healthcare contracts from last year" },
  { icon: BarChart3, text: "What's the average GSA labor rate for a Senior Developer?" },
  { icon: Brain, text: "Which agencies spend the most on cybersecurity?" },
  { icon: Search, text: "Find small businesses in Virginia doing cloud computing" },
];

function getPageContext(pathname: string): string {
  if (pathname.startsWith('/entity/')) return 'entity_profile';
  if (pathname === '/opportunities') return 'opportunities';
  if (pathname === '/analytics') return 'analytics';
  if (pathname === '/explore') return 'market_explorer';
  if (pathname === '/sbir') return 'sbir';
  if (pathname === '/healthcare') return 'healthcare';
  if (pathname === '/education') return 'education';
  if (pathname === '/entities') return 'entities_list';
  if (pathname === '/intelligence') return 'intelligence';
  return 'general';
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const pageContext = getPageContext(location.pathname);
      const entityMatch = location.pathname.match(/^\/entity\/(.+)$/);

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: text,
          context: {
            currentPage: pageContext,
            pathname: location.pathname,
            entityId: entityMatch?.[1] || null,
          },
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || "I couldn't process that request. Try rephrasing your question.",
        entities: data.entities,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Chat error:', err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I couldn't find data for that query. Try rephrasing or check if the data source is loaded.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, location.pathname]);

  const handleEntityClick = (entityId: string) => {
    navigate(`/entity/${entityId}`);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-16 w-16 flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <img src={aiChatIcon} alt="AI Assistant" className="h-16 w-16 object-contain drop-shadow-lg" />
        </motion.button>
      )}

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Omniscient AI</h3>
                    <p className="text-xs text-muted-foreground">GovCon Intelligence Analyst</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-6">
                      <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
                      <h4 className="font-semibold mb-1">Ask me anything</h4>
                      <p className="text-sm text-muted-foreground">I can query contracts, entities, opportunities, labor rates, and more from your database.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Try asking</p>
                      {STARTER_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q.text)}
                          className="w-full p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-3 text-left"
                        >
                          <q.icon className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm">{q.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[90%] ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5' : 'space-y-2'}`}>
                          {message.role === 'user' ? (
                            <p className="text-sm">{message.content}</p>
                          ) : (
                            <>
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-headings:my-2 text-sm bg-secondary/50 rounded-2xl rounded-bl-sm px-4 py-3">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                              {message.entities && message.entities.length > 0 && (
                                <div className="flex flex-wrap gap-1 px-1">
                                  {message.entities.map((entity) => (
                                    <Badge
                                      key={entity.id}
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-primary/20 transition-colors text-xs"
                                      onClick={() => handleEntityClick(entity.id)}
                                    >
                                      <Building2 className="h-3 w-3 mr-1" />
                                      {entity.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {message.sources && message.sources.length > 0 && (
                                <p className="text-xs text-muted-foreground px-1">
                                  Sources: {message.sources.join(', ')}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-secondary/50 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Analyzing data...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about contracts, entities, opportunities..."
                    className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="h-9 w-9 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
