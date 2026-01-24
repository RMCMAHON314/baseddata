// BASED DATA - Opportunity Recommendations
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, Calendar, Building2, DollarSign, ChevronRight, 
  Sparkles, CheckCircle, ExternalLink
} from 'lucide-react';
import { matchOpportunitiesForEntity, OpportunityMatch } from '@/services/opportunityMatcher';

interface OpportunityRecommendationsProps {
  entityId: string;
  entityName: string;
}

export function OpportunityRecommendations({ entityId, entityName }: OpportunityRecommendationsProps) {
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, [entityId]);

  async function loadMatches() {
    setLoading(true);
    try {
      const results = await matchOpportunitiesForEntity(entityId, 15);
      setMatches(results);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'Not specified';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recommended Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Recommended Opportunities
          <Badge variant="secondary" className="ml-2">{matches.length} matches</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Active opportunities matched to {entityName}'s capabilities
        </p>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No matching opportunities found</p>
            <p className="text-sm">Check back later for new opportunities</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, idx) => (
              <motion.div
                key={match.opportunityId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-secondary/20 rounded-lg overflow-hidden"
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpanded(expanded === match.opportunityId ? null : match.opportunityId)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold line-clamp-2">{match.opportunityTitle}</h4>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {match.department || 'Unknown Agency'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(match.deadline)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(match.awardCeiling)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold ${getScoreColor(match.score)}`}>
                        {match.score}%
                      </div>
                      <div className="text-xs text-muted-foreground">match</div>
                    </div>
                  </div>
                  <Progress value={match.score} className="h-2 mt-3" />
                </div>

                {expanded === match.opportunityId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t bg-secondary/10 p-4"
                  >
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Why This Matches
                    </h5>
                    <div className="space-y-2">
                      {match.reasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{reason.factor}</div>
                            <div className="text-xs text-muted-foreground">{reason.description}</div>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            +{reason.weight}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="gap-2">
                        View Details
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        SAM.gov
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
