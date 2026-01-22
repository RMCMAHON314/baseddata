// OMNISCIENT Community Voting Edge Function
// Upvote, downvote, and flag records for crowd-sourced quality

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type FeedbackType = 'upvote' | 'downvote' | 'flag' | 'correction';

interface VoteRequest {
  record_id: string;
  feedback_type: FeedbackType;
  correction_data?: {
    field: string;
    original_value: any;
    corrected_value: any;
    reason?: string;
  };
}

interface VoteResponse {
  success: boolean;
  message: string;
  new_quality_score?: number;
  vote_counts?: {
    upvotes: number;
    downvotes: number;
    flags: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Verify user if token provided
    let userId: string | null = null;
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
      }
    }
    
    // For now, allow anonymous voting but track differently
    // In production, you might want to require authentication
    
    const { record_id, feedback_type, correction_data } = await req.json() as VoteRequest;
    
    if (!record_id || !feedback_type) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'record_id and feedback_type required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify record exists
    const { data: record, error: recordError } = await supabase
      .from('records')
      .select('id, quality_score, user_validations')
      .eq('id', record_id)
      .single();
    
    if (recordError || !record) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Record not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check for existing vote from this user (if authenticated)
    if (userId) {
      const { data: existingVote } = await supabase
        .from('record_feedback')
        .select('id, feedback_type')
        .eq('record_id', record_id)
        .eq('user_id', userId)
        .single();
      
      if (existingVote) {
        // Update existing vote
        const { error: updateError } = await supabase
          .from('record_feedback')
          .update({
            feedback_type,
            correction_data: correction_data || null,
          })
          .eq('id', existingVote.id);
        
        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new vote
        const { error: insertError } = await supabase
          .from('record_feedback')
          .insert({
            record_id,
            user_id: userId,
            feedback_type,
            correction_data: correction_data || null,
          });
        
        if (insertError) {
          throw insertError;
        }
      }
    } else {
      // Anonymous vote - still insert but with a placeholder user_id
      // This requires modifying RLS or using service key
      const anonId = '00000000-0000-0000-0000-000000000000';
      
      // For anonymous users, we just count but don't store individual votes
      // Update the record's quality score directly
      const currentValidations = record.user_validations || { upvotes: 0, downvotes: 0, flags: 0 };
      
      if (feedback_type === 'upvote') {
        currentValidations.upvotes = (currentValidations.upvotes || 0) + 1;
      } else if (feedback_type === 'downvote') {
        currentValidations.downvotes = (currentValidations.downvotes || 0) + 1;
      } else if (feedback_type === 'flag') {
        currentValidations.flags = (currentValidations.flags || 0) + 1;
      }
      
      // Calculate new quality score (Wilson score)
      const { upvotes = 0, downvotes = 0, flags = 0 } = currentValidations;
      const total = upvotes + downvotes;
      let newScore = 0.5;
      
      if (total > 0) {
        const z = 1.96; // 95% confidence
        const phat = upvotes / total;
        newScore = (phat + z*z/(2*total) - z * Math.sqrt((phat*(1-phat)+z*z/(4*total))/total)) / (1+z*z/total);
        newScore = Math.max(0, Math.min(1, newScore - flags * 0.1));
      }
      
      const { error: updateError } = await supabase
        .from('records')
        .update({
          quality_score: newScore,
          user_validations: currentValidations,
        })
        .eq('id', record_id);
      
      if (updateError) {
        throw updateError;
      }
      
      const response: VoteResponse = {
        success: true,
        message: `Vote recorded: ${feedback_type}`,
        new_quality_score: newScore,
        vote_counts: currentValidations,
      };
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get updated vote counts for authenticated users
    const { data: voteCounts } = await supabase
      .from('record_feedback')
      .select('feedback_type')
      .eq('record_id', record_id);
    
    const counts = {
      upvotes: voteCounts?.filter(v => v.feedback_type === 'upvote').length || 0,
      downvotes: voteCounts?.filter(v => v.feedback_type === 'downvote').length || 0,
      flags: voteCounts?.filter(v => v.feedback_type === 'flag').length || 0,
    };
    
    // Recalculate quality score
    const total = counts.upvotes + counts.downvotes;
    let newScore = 0.5;
    
    if (total > 0) {
      const z = 1.96;
      const phat = counts.upvotes / total;
      newScore = (phat + z*z/(2*total) - z * Math.sqrt((phat*(1-phat)+z*z/(4*total))/total)) / (1+z*z/total);
      newScore = Math.max(0, Math.min(1, newScore - counts.flags * 0.1));
    }
    
    // Update record quality score
    await supabase
      .from('records')
      .update({
        quality_score: newScore,
        user_validations: counts,
      })
      .eq('id', record_id);
    
    const response: VoteResponse = {
      success: true,
      message: `Vote recorded: ${feedback_type}`,
      new_quality_score: newScore,
      vote_counts: counts,
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (e) {
    console.error('Vote error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Vote failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
