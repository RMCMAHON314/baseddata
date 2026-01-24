// ============================================================
// 💬 SLACK INTEGRATION - Slash Commands & Alerts
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { action, channel_id, text, webhook_url } = await req.json();

    switch (action) {
      case 'send_alert': {
        if (!webhook_url) {
          return new Response(JSON.stringify({ error: 'webhook_url required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: channel_id,
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: '🔔 Based Data Alert' }
              },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: text }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'View in Based Data' },
                    url: 'https://baseddata.lovable.app/dashboard'
                  }
                ]
              }
            ]
          })
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'search': {
        // Handle /baseddata slash command
        const { data: results } = await supabase.functions.invoke('omniscient', {
          body: { prompt: text, limit: 5 }
        });

        const entities = results?.features || [];
        const blocks = [
          {
            type: 'header',
            text: { type: 'plain_text', text: `🔍 Results for "${text}"` }
          },
          ...entities.slice(0, 5).map((e: { properties?: { name?: string; category?: string; opportunity_score?: number }; id?: string }) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${e.properties?.name || 'Unknown'}*\n${e.properties?.category || 'N/A'} | Score: ${e.properties?.opportunity_score || 'N/A'}`
            },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View' },
              url: `https://baseddata.lovable.app/entity/${e.id}`
            }
          }))
        ];

        return new Response(JSON.stringify({ blocks }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Slack integration error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
