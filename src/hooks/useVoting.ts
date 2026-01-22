// BASED DATA v6.0 - Community Voting Hook
// Upvote, downvote, and flag records for crowd-sourced quality

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Re-export quality label helper from central constants
export { getQualityLabel } from '@/lib/constants';

export type FeedbackType = 'upvote' | 'downvote' | 'flag';

interface VoteCounts {
  upvotes: number;
  downvotes: number;
  flags: number;
}

interface VoteState {
  [recordId: string]: {
    userVote?: FeedbackType;
    counts: VoteCounts;
    qualityScore: number;
  };
}

export function useVoting() {
  const [voteState, setVoteState] = useState<VoteState>({});
  const [isVoting, setIsVoting] = useState(false);

  const vote = useCallback(async (
    recordId: string,
    feedbackType: FeedbackType
  ): Promise<boolean> => {
    setIsVoting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('vote', {
        body: {
          record_id: recordId,
          feedback_type: feedbackType,
        },
      });
      
      if (error) throw error;
      
      if (data.success) {
        setVoteState(prev => ({
          ...prev,
          [recordId]: {
            userVote: feedbackType,
            counts: data.vote_counts,
            qualityScore: data.new_quality_score,
          },
        }));
        
        const emoji = feedbackType === 'upvote' ? '👍' : feedbackType === 'downvote' ? '👎' : '🚩';
        toast.success(`${emoji} Vote recorded!`);
        return true;
      } else {
        throw new Error(data.error || 'Vote failed');
      }
    } catch (e) {
      console.error('Vote error:', e);
      toast.error('Failed to record vote');
      return false;
    } finally {
      setIsVoting(false);
    }
  }, []);

  const upvote = useCallback((recordId: string) => vote(recordId, 'upvote'), [vote]);
  const downvote = useCallback((recordId: string) => vote(recordId, 'downvote'), [vote]);
  const flag = useCallback((recordId: string) => vote(recordId, 'flag'), [vote]);

  const getVoteState = useCallback((recordId: string) => {
    return voteState[recordId] || {
      userVote: undefined,
      counts: { upvotes: 0, downvotes: 0, flags: 0 },
      qualityScore: 0.5,
    };
  }, [voteState]);

  return {
    vote,
    upvote,
    downvote,
    flag,
    getVoteState,
    isVoting,
  };
}

// getQualityLabel is now exported from @/lib/constants
