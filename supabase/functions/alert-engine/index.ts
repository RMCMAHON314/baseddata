import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  console.log('🔔 ALERT ENGINE ACTIVATED')

  const results = {
    alerts_checked: 0,
    alerts_triggered: 0,
    notifications_sent: 0
  }

  try {
    // Get all active alerts
    const { data: alerts } = await supabase
      .from('user_alerts')
      .select(`
        *,
        entity:core_entities(id, canonical_name, opportunity_score, health_score, risk_score)
      `)
      .eq('is_active', true)

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active alerts', results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    for (const alert of alerts) {
      results.alerts_checked++
      let shouldTrigger = false
      let triggerData: Record<string, any> = {}

      switch (alert.alert_type) {
        case 'entity_change':
          // Check if entity has new facts since last trigger
          if (alert.entity_id) {
            const { count } = await supabase
              .from('core_facts')
              .select('*', { count: 'exact', head: true })
              .eq('entity_id', alert.entity_id)
              .gt('created_at', alert.last_triggered || '1970-01-01')
            
            if (count && count > 0) {
              shouldTrigger = true
              triggerData = { new_facts: count, entity: alert.entity }
            }
          }
          break

        case 'new_contract':
          // Check for new contracts matching criteria
          const { data: newContracts } = await supabase
            .from('core_facts')
            .select('*')
            .eq('fact_type', 'contract_awarded')
            .gt('created_at', alert.last_triggered || new Date(Date.now() - 86400000).toISOString())
            .limit(10)
          
          if (newContracts && newContracts.length > 0) {
            const conditions = alert.conditions || {}
            let matchingContracts = newContracts
            
            if (conditions.min_amount) {
              matchingContracts = matchingContracts.filter((c: any) => 
                ((c.fact_value as any)?.amount || 0) >= conditions.min_amount
              )
            }
            if (conditions.state) {
              matchingContracts = matchingContracts.filter((c: any) => 
                (c.fact_value as any)?.state === conditions.state
              )
            }
            
            if (matchingContracts.length > 0) {
              shouldTrigger = true
              triggerData = { contracts: matchingContracts.slice(0, 5), total: matchingContracts.length }
            }
          }
          break

        case 'threshold':
          // Check if entity metric exceeds threshold
          if (alert.entity_id && alert.conditions) {
            const entity = alert.entity as any
            const { field, operator, value } = alert.conditions as any
            
            let currentValue = entity?.[field]
            
            if (currentValue !== undefined) {
              const operators: Record<string, (a: number, b: number) => boolean> = {
                '>': (a, b) => a > b,
                '<': (a, b) => a < b,
                '>=': (a, b) => a >= b,
                '<=': (a, b) => a <= b,
                '=': (a, b) => a === b
              }
              
              if (operators[operator]?.(currentValue, value)) {
                shouldTrigger = true
                triggerData = { field, value: currentValue, threshold: value, entity }
              }
            }
          }
          break

        case 'keyword':
          // Check for new entities/facts matching keyword
          if ((alert.conditions as any)?.keyword) {
            const keyword = (alert.conditions as any).keyword.toLowerCase()
            const { data: matches } = await supabase
              .from('core_entities')
              .select('id, canonical_name')
              .ilike('canonical_name', `%${keyword}%`)
              .gt('created_at', alert.last_triggered || '1970-01-01')
              .limit(10)
            
            if (matches && matches.length > 0) {
              shouldTrigger = true
              triggerData = { keyword, matches, total: matches.length }
            }
          }
          break

        case 'high_opportunity':
          // Check for entities with high opportunity scores
          const { data: highOpps } = await supabase
            .from('core_entities')
            .select('id, canonical_name, opportunity_score')
            .gte('opportunity_score', 80)
            .gt('updated_at', alert.last_triggered || new Date(Date.now() - 86400000).toISOString())
            .limit(10)

          if (highOpps && highOpps.length > 0) {
            shouldTrigger = true
            triggerData = { entities: highOpps, total: highOpps.length }
          }
          break
      }

      // If alert should trigger, create notification
      if (shouldTrigger) {
        results.alerts_triggered++

        // Update alert
        await supabase
          .from('user_alerts')
          .update({
            last_triggered: new Date().toISOString(),
            trigger_count: (alert.trigger_count || 0) + 1
          })
          .eq('id', alert.id)

        // Create notification
        const notification = {
          user_id: alert.user_id,
          alert_id: alert.id,
          title: getAlertTitle(alert.alert_type, triggerData),
          message: getAlertMessage(alert.alert_type, triggerData),
          type: 'alert',
          data: triggerData
        }

        await supabase.from('notifications').insert(notification)
        results.notifications_sent++

        // TODO: Send email/SMS if configured
        const channels = alert.channels || ['in_app']
        if (channels.includes('email')) {
          // Implement email sending via Resend/SendGrid
          console.log(`📧 Would send email for alert ${alert.id}`)
        }
        if (channels.includes('sms')) {
          // Implement SMS via Twilio
          console.log(`📱 Would send SMS for alert ${alert.id}`)
        }
      }
    }

    console.log(`🔔 ALERT ENGINE COMPLETE: ${results.alerts_triggered}/${results.alerts_checked} triggered`)

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Alert engine error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getAlertTitle(type: string, data: any): string {
  switch (type) {
    case 'entity_change':
      return `📊 ${data.entity?.canonical_name || 'Entity'} Updated`
    case 'new_contract':
      return `💰 ${data.total} New Contract(s) Found`
    case 'threshold':
      return `⚠️ Threshold Alert: ${data.entity?.canonical_name}`
    case 'keyword':
      return `🔍 "${data.keyword}" - ${data.total} New Match(es)`
    case 'high_opportunity':
      return `🎯 ${data.total} High Opportunity Entities Found`
    default:
      return '🔔 Alert Triggered'
  }
}

function getAlertMessage(type: string, data: any): string {
  switch (type) {
    case 'entity_change':
      return `${data.new_facts} new data points added for ${data.entity?.canonical_name}`
    case 'new_contract':
      return `Found ${data.total} new contracts matching your criteria`
    case 'threshold':
      return `${data.field} is now ${data.value} (threshold: ${data.threshold})`
    case 'keyword':
      return `${data.total} new entities matching "${data.keyword}"`
    case 'high_opportunity':
      return `${data.total} entities with opportunity score 80+ were updated`
    default:
      return 'Your alert was triggered'
  }
}
