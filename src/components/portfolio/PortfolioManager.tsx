// BASED DATA - Portfolio Manager
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Briefcase, Plus, Trash2, Building2, DollarSign, Share2, 
  Users, TrendingUp, Eye, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { getEntityHealthScore, HealthScoreMetrics } from '@/services/healthScoreService';

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  member_count?: number;
  total_value?: number;
}

interface PortfolioMember {
  id: string;
  entity_id: string;
  entity_name: string;
  total_value: number;
  health_score: number | null;
  added_at: string;
}

interface PortfolioManagerProps {
  entityId?: string;
  entityName?: string;
  onAddToPortfolio?: (portfolioId: string) => void;
}

export function PortfolioManager({ entityId, entityName, onAddToPortfolio }: PortfolioManagerProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [members, setMembers] = useState<PortfolioMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    if (user) {
      loadPortfolios(user.id);
    } else {
      setLoading(false);
    }
  }

  async function loadPortfolios(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get member counts and total values
      const enrichedPortfolios = await Promise.all(data.map(async (p) => {
        const { count } = await supabase
          .from('portfolio_members')
          .select('*', { count: 'exact', head: true })
          .eq('portfolio_id', p.id);

        const { data: members } = await supabase
          .from('portfolio_members')
          .select('entity_id')
          .eq('portfolio_id', p.id);

        let totalValue = 0;
        if (members?.length) {
          const { data: entities } = await supabase
            .from('core_entities')
            .select('total_contract_value')
            .in('id', members.map(m => m.entity_id));
          totalValue = entities?.reduce((sum, e) => sum + (e.total_contract_value || 0), 0) || 0;
        }

        return { ...p, member_count: count || 0, total_value: totalValue };
      }));

      setPortfolios(enrichedPortfolios);
    }
    setLoading(false);
  }

  async function loadMembers(portfolioId: string) {
    setMembersLoading(true);
    const { data, error } = await supabase
      .from('portfolio_members')
      .select('id, entity_id, added_at')
      .eq('portfolio_id', portfolioId);

    if (!error && data) {
      // Enrich with entity data
      const enrichedMembers = await Promise.all(data.map(async (m) => {
        const { data: entity } = await supabase
          .from('core_entities')
          .select('canonical_name, total_contract_value')
          .eq('id', m.entity_id)
          .single();

        const healthScore = await getEntityHealthScore(m.entity_id);

        return {
          id: m.id,
          entity_id: m.entity_id,
          entity_name: entity?.canonical_name || 'Unknown',
          total_value: entity?.total_contract_value || 0,
          health_score: healthScore?.overallScore || null,
          added_at: m.added_at
        };
      }));

      setMembers(enrichedMembers);
    }
    setMembersLoading(false);
  }

  async function createPortfolio() {
    if (!userId || !newName.trim()) {
      toast.error('Please enter a portfolio name');
      return;
    }

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: userId,
        name: newName.trim(),
        description: newDescription.trim() || null,
        is_public: isPublic
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create portfolio');
    } else {
      toast.success('Portfolio created');
      setCreateDialogOpen(false);
      setNewName('');
      setNewDescription('');
      setIsPublic(false);
      loadPortfolios(userId);
    }
  }

  async function addEntityToPortfolio(portfolioId: string) {
    if (!entityId) return;

    const { error } = await supabase
      .from('portfolio_members')
      .insert({
        portfolio_id: portfolioId,
        entity_id: entityId
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Entity already in portfolio');
      } else {
        toast.error('Failed to add entity');
      }
    } else {
      toast.success(`Added ${entityName} to portfolio`);
      setAddDialogOpen(false);
      onAddToPortfolio?.(portfolioId);
      if (userId) loadPortfolios(userId);
    }
  }

  async function removeFromPortfolio(memberId: string) {
    const { error } = await supabase
      .from('portfolio_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Removed from portfolio');
    }
  }

  async function deletePortfolio(id: string) {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id);

    if (!error) {
      setPortfolios(portfolios.filter(p => p.id !== id));
      if (selectedPortfolio?.id === id) {
        setSelectedPortfolio(null);
        setMembers([]);
      }
      toast.success('Portfolio deleted');
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  };

  if (!userId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Sign in to manage portfolios</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            My Portfolios
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Portfolio</DialogTitle>
                <DialogDescription>
                  Group entities together to track and compare their performance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pname">Name</Label>
                  <Input
                    id="pname"
                    placeholder="e.g., Key Competitors"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdesc">Description</Label>
                  <Textarea
                    id="pdesc"
                    placeholder="Optional description..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <Label>Make Public</Label>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createPortfolio}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : portfolios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No portfolios yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolios.map((portfolio, idx) => (
                <motion.div
                  key={portfolio.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-secondary/20 rounded-lg p-4 cursor-pointer hover:bg-secondary/30 transition-colors ${
                    selectedPortfolio?.id === portfolio.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedPortfolio(portfolio);
                    loadMembers(portfolio.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {portfolio.name}
                        {portfolio.is_public ? (
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {portfolio.description && (
                        <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePortfolio(portfolio.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {portfolio.member_count} entities
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(portfolio.total_value || 0)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entity Button (when on entity page) */}
      {entityId && entityName && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add {entityName} to Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Portfolio</DialogTitle>
              <DialogDescription>
                Select a portfolio to add {entityName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {portfolios.map(p => (
                <Button
                  key={p.id}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => addEntityToPortfolio(p.id)}
                >
                  <Briefcase className="h-4 w-4" />
                  {p.name}
                </Button>
              ))}
              {portfolios.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No portfolios. Create one first.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Selected Portfolio Members */}
      {selectedPortfolio && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedPortfolio.name} Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <Skeleton className="h-32" />
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No entities in this portfolio</p>
            ) : (
              <div className="space-y-3">
                {members.map((member, idx) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-secondary/20 rounded-lg p-3 flex items-center justify-between"
                  >
                    <Link 
                      to={`/entity/${member.entity_id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {member.entity_name}
                    </Link>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">{formatCurrency(member.total_value)}</span>
                      {member.health_score !== null && (
                        <Badge variant="secondary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {member.health_score}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromPortfolio(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
