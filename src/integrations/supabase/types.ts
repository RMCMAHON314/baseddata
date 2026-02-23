export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          messages: Json | null
          title: string | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          title?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          title?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      algorithm_metrics: {
        Row: {
          created_at: string | null
          cycle_timestamp: string | null
          duration_ms: number | null
          entities_expanded: number | null
          facts_enriched: number | null
          id: string
          insights_generated: number | null
          queue_additions: number | null
          queue_processed: number | null
          relationships_discovered: number | null
          sources_discovered: number | null
          total_entities: number | null
          total_facts: number | null
          total_relationships: number | null
        }
        Insert: {
          created_at?: string | null
          cycle_timestamp?: string | null
          duration_ms?: number | null
          entities_expanded?: number | null
          facts_enriched?: number | null
          id?: string
          insights_generated?: number | null
          queue_additions?: number | null
          queue_processed?: number | null
          relationships_discovered?: number | null
          sources_discovered?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_relationships?: number | null
        }
        Update: {
          created_at?: string | null
          cycle_timestamp?: string | null
          duration_ms?: number | null
          entities_expanded?: number | null
          facts_enriched?: number | null
          id?: string
          insights_generated?: number | null
          queue_additions?: number | null
          queue_processed?: number | null
          relationships_discovered?: number | null
          sources_discovered?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_relationships?: number | null
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          contracts_by_agency: Json | null
          contracts_by_state: Json | null
          created_at: string | null
          date: string
          entities_by_state: Json | null
          entities_by_type: Json | null
          new_contract_value: number | null
          new_contracts: number | null
          new_entities: number | null
          new_facts: number | null
          new_grants: number | null
          total_contract_value: number | null
          total_contracts: number | null
          total_entities: number | null
          total_facts: number | null
          total_grant_value: number | null
          total_grants: number | null
        }
        Insert: {
          contracts_by_agency?: Json | null
          contracts_by_state?: Json | null
          created_at?: string | null
          date: string
          entities_by_state?: Json | null
          entities_by_type?: Json | null
          new_contract_value?: number | null
          new_contracts?: number | null
          new_entities?: number | null
          new_facts?: number | null
          new_grants?: number | null
          total_contract_value?: number | null
          total_contracts?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_grant_value?: number | null
          total_grants?: number | null
        }
        Update: {
          contracts_by_agency?: Json | null
          contracts_by_state?: Json | null
          created_at?: string | null
          date?: string
          entities_by_state?: Json | null
          entities_by_type?: Json | null
          new_contract_value?: number | null
          new_contracts?: number | null
          new_entities?: number | null
          new_facts?: number | null
          new_grants?: number | null
          total_contract_value?: number | null
          total_contracts?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_grant_value?: number | null
          total_grants?: number | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          is_dismissible: boolean | null
          message: string
          starts_at: string | null
          target_tiers: string[] | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_dismissible?: boolean | null
          message: string
          starts_at?: string | null
          target_tiers?: string[] | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_dismissible?: boolean | null
          message?: string
          starts_at?: string | null
          target_tiers?: string[] | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      api_circuit_breakers: {
        Row: {
          api_domain: string
          created_at: string
          failure_count: number
          failure_threshold: number
          half_open_at: string | null
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          opened_at: string | null
          state: string
          success_count: number
          success_threshold: number
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          api_domain: string
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          half_open_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_at?: string | null
          state?: string
          success_count?: number
          success_threshold?: number
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          api_domain?: string
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          half_open_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_at?: string | null
          state?: string
          success_count?: number
          success_threshold?: number
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_request_at: string | null
          last_reset_at: string | null
          name: string
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          requests_this_minute: number | null
          requests_today: number | null
          scopes: string[] | null
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_request_at?: string | null
          last_reset_at?: string | null
          name: string
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          requests_this_minute?: number | null
          requests_today?: number | null
          scopes?: string[] | null
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_request_at?: string | null
          last_reset_at?: string | null
          name?: string
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          requests_this_minute?: number | null
          requests_today?: number | null
          scopes?: string[] | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "api_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_pricing_tiers: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          rate_limit_per_minute: number
          requests_per_month: number
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number
          rate_limit_per_minute?: number
          requests_per_month?: number
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          rate_limit_per_minute?: number
          requests_per_month?: number
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          id: string
          method: string
          request_body: Json | null
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          method?: string
          request_body?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          method?: string
          request_body?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_sources: {
        Row: {
          api_type: string | null
          auth_type: string | null
          avg_response_time_ms: number | null
          base_url: string
          categories: string[]
          consecutive_failures: number | null
          created_at: string | null
          description: string | null
          geographic_coverage: string | null
          health_status: string | null
          id: string
          keywords: string[] | null
          last_health_check: string | null
          last_successful_query: string | null
          name: string
          priority: number | null
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_type?: string | null
          auth_type?: string | null
          avg_response_time_ms?: number | null
          base_url: string
          categories: string[]
          consecutive_failures?: number | null
          created_at?: string | null
          description?: string | null
          geographic_coverage?: string | null
          health_status?: string | null
          id?: string
          keywords?: string[] | null
          last_health_check?: string | null
          last_successful_query?: string | null
          name: string
          priority?: number | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_type?: string | null
          auth_type?: string | null
          avg_response_time_ms?: number | null
          base_url?: string
          categories?: string[]
          consecutive_failures?: number | null
          created_at?: string | null
          description?: string | null
          geographic_coverage?: string | null
          health_status?: string | null
          id?: string
          keywords?: string[] | null
          last_health_check?: string | null
          last_successful_query?: string | null
          name?: string
          priority?: number | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_key: string | null
          created_at: string | null
          endpoint: string
          id: string
          method: string
          request_size: number | null
          response_size: number | null
          response_time_ms: number | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          method: string
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          method?: string
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_connections: {
        Row: {
          connection_type: string
          created_at: string | null
          from_component: string
          id: string
          is_active: boolean | null
          last_verified: string | null
          latency_p50_ms: number | null
          latency_p99_ms: number | null
          success_rate: number | null
          to_component: string
        }
        Insert: {
          connection_type?: string
          created_at?: string | null
          from_component: string
          id?: string
          is_active?: boolean | null
          last_verified?: string | null
          latency_p50_ms?: number | null
          latency_p99_ms?: number | null
          success_rate?: number | null
          to_component: string
        }
        Update: {
          connection_type?: string
          created_at?: string | null
          from_component?: string
          id?: string
          is_active?: boolean | null
          last_verified?: string | null
          latency_p50_ms?: number | null
          latency_p99_ms?: number | null
          success_rate?: number | null
          to_component?: string
        }
        Relationships: []
      }
      auto_crawlers: {
        Row: {
          circuit_state: string | null
          consecutive_failures: number | null
          crawler_type: string
          created_at: string
          description: string | null
          expansion_keywords: string[]
          firecrawl_config: Json | null
          id: string
          is_active: boolean
          last_health_check: string | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          schedule_cron: string
          similarity_config: Json | null
          success_rate: number | null
          target_categories: string[]
          target_patterns: Json
          total_records_discovered: number
          total_runs: number
          total_sources_found: number
          updated_at: string
        }
        Insert: {
          circuit_state?: string | null
          consecutive_failures?: number | null
          crawler_type?: string
          created_at?: string
          description?: string | null
          expansion_keywords?: string[]
          firecrawl_config?: Json | null
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          schedule_cron?: string
          similarity_config?: Json | null
          success_rate?: number | null
          target_categories?: string[]
          target_patterns?: Json
          total_records_discovered?: number
          total_runs?: number
          total_sources_found?: number
          updated_at?: string
        }
        Update: {
          circuit_state?: string | null
          consecutive_failures?: number | null
          crawler_type?: string
          created_at?: string
          description?: string | null
          expansion_keywords?: string[]
          firecrawl_config?: Json | null
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          schedule_cron?: string
          similarity_config?: Json | null
          success_rate?: number | null
          target_categories?: string[]
          target_patterns?: Json
          total_records_discovered?: number
          total_runs?: number
          total_sources_found?: number
          updated_at?: string
        }
        Relationships: []
      }
      clinical_trials: {
        Row: {
          completion_date: string | null
          conditions: string[] | null
          created_at: string | null
          drug_names: string[] | null
          enrollment: number | null
          enrollment_type: string | null
          id: string
          intervention_names: string[] | null
          intervention_type: string | null
          keywords: string[] | null
          lead_sponsor_name: string | null
          lead_sponsor_type: string | null
          location_countries: string[] | null
          location_states: string[] | null
          nct_id: string
          official_title: string | null
          overall_status: string | null
          phase: string | null
          raw_data: Json | null
          source: string | null
          sponsor_entity_id: string | null
          start_date: string | null
          study_type: string | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          completion_date?: string | null
          conditions?: string[] | null
          created_at?: string | null
          drug_names?: string[] | null
          enrollment?: number | null
          enrollment_type?: string | null
          id?: string
          intervention_names?: string[] | null
          intervention_type?: string | null
          keywords?: string[] | null
          lead_sponsor_name?: string | null
          lead_sponsor_type?: string | null
          location_countries?: string[] | null
          location_states?: string[] | null
          nct_id: string
          official_title?: string | null
          overall_status?: string | null
          phase?: string | null
          raw_data?: Json | null
          source?: string | null
          sponsor_entity_id?: string | null
          start_date?: string | null
          study_type?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          completion_date?: string | null
          conditions?: string[] | null
          created_at?: string | null
          drug_names?: string[] | null
          enrollment?: number | null
          enrollment_type?: string | null
          id?: string
          intervention_names?: string[] | null
          intervention_type?: string | null
          keywords?: string[] | null
          lead_sponsor_name?: string | null
          lead_sponsor_type?: string | null
          location_countries?: string[] | null
          location_states?: string[] | null
          nct_id?: string
          official_title?: string | null
          overall_status?: string | null
          phase?: string | null
          raw_data?: Json | null
          source?: string | null
          sponsor_entity_id?: string | null
          start_date?: string | null
          study_type?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_trials_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_trials_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_trials_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_trials_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_trials_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_classifications: {
        Row: {
          capabilities: string[] | null
          classified_at: string | null
          confidence: number | null
          contract_id: string | null
          id: string
          primary_category: string
          secondary_categories: string[] | null
        }
        Insert: {
          capabilities?: string[] | null
          classified_at?: string | null
          confidence?: number | null
          contract_id?: string | null
          id?: string
          primary_category: string
          secondary_categories?: string[] | null
        }
        Update: {
          capabilities?: string[] | null
          classified_at?: string | null
          confidence?: number | null
          contract_id?: string | null
          id?: string
          primary_category?: string
          secondary_categories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_classifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          award_amount: number | null
          award_date: string | null
          award_id: string | null
          award_type: string | null
          awarding_agency: string | null
          awarding_sub_agency: string | null
          base_and_all_options: number | null
          competition_type: string | null
          contract_category: string | null
          contract_type: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          funding_agency: string | null
          id: string
          is_minority_owned: boolean | null
          is_small_business: boolean | null
          is_veteran_owned: boolean | null
          is_women_owned: boolean | null
          last_modified: string | null
          modification_number: string | null
          naics_code: string | null
          naics_description: string | null
          parent_award_id: string | null
          piid: string | null
          pop_city: string | null
          pop_congressional_district: string | null
          pop_country: string | null
          pop_state: string | null
          pop_zip: string | null
          psc_code: string | null
          psc_description: string | null
          raw_data: Json | null
          recipient_duns: string | null
          recipient_entity_id: string | null
          recipient_name: string
          recipient_uei: string | null
          search_text: string | null
          search_vector: unknown
          set_aside_type: string | null
          source: string | null
          source_url: string | null
          start_date: string | null
          total_obligation: number | null
          updated_at: string | null
        }
        Insert: {
          award_amount?: number | null
          award_date?: string | null
          award_id?: string | null
          award_type?: string | null
          awarding_agency?: string | null
          awarding_sub_agency?: string | null
          base_and_all_options?: number | null
          competition_type?: string | null
          contract_category?: string | null
          contract_type?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          funding_agency?: string | null
          id?: string
          is_minority_owned?: boolean | null
          is_small_business?: boolean | null
          is_veteran_owned?: boolean | null
          is_women_owned?: boolean | null
          last_modified?: string | null
          modification_number?: string | null
          naics_code?: string | null
          naics_description?: string | null
          parent_award_id?: string | null
          piid?: string | null
          pop_city?: string | null
          pop_congressional_district?: string | null
          pop_country?: string | null
          pop_state?: string | null
          pop_zip?: string | null
          psc_code?: string | null
          psc_description?: string | null
          raw_data?: Json | null
          recipient_duns?: string | null
          recipient_entity_id?: string | null
          recipient_name: string
          recipient_uei?: string | null
          search_text?: string | null
          search_vector?: unknown
          set_aside_type?: string | null
          source?: string | null
          source_url?: string | null
          start_date?: string | null
          total_obligation?: number | null
          updated_at?: string | null
        }
        Update: {
          award_amount?: number | null
          award_date?: string | null
          award_id?: string | null
          award_type?: string | null
          awarding_agency?: string | null
          awarding_sub_agency?: string | null
          base_and_all_options?: number | null
          competition_type?: string | null
          contract_category?: string | null
          contract_type?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          funding_agency?: string | null
          id?: string
          is_minority_owned?: boolean | null
          is_small_business?: boolean | null
          is_veteran_owned?: boolean | null
          is_women_owned?: boolean | null
          last_modified?: string | null
          modification_number?: string | null
          naics_code?: string | null
          naics_description?: string | null
          parent_award_id?: string | null
          piid?: string | null
          pop_city?: string | null
          pop_congressional_district?: string | null
          pop_country?: string | null
          pop_state?: string | null
          pop_zip?: string | null
          psc_code?: string | null
          psc_description?: string | null
          raw_data?: Json | null
          recipient_duns?: string | null
          recipient_entity_id?: string | null
          recipient_name?: string
          recipient_uei?: string | null
          search_text?: string | null
          search_vector?: unknown
          set_aside_type?: string | null
          source?: string | null
          source_url?: string | null
          start_date?: string | null
          total_obligation?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      core_derived_insights: {
        Row: {
          action_count: number | null
          confidence: number | null
          created_at: string | null
          description: string
          id: string
          insight_type: string
          is_active: boolean | null
          related_entities: string[] | null
          scope_type: string
          scope_value: string | null
          severity: string | null
          supporting_data: Json
          title: string
          valid_from: string | null
          valid_until: string | null
          view_count: number | null
        }
        Insert: {
          action_count?: number | null
          confidence?: number | null
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          is_active?: boolean | null
          related_entities?: string[] | null
          scope_type: string
          scope_value?: string | null
          severity?: string | null
          supporting_data?: Json
          title: string
          valid_from?: string | null
          valid_until?: string | null
          view_count?: number | null
        }
        Update: {
          action_count?: number | null
          confidence?: number | null
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          is_active?: boolean | null
          related_entities?: string[] | null
          scope_type?: string
          scope_value?: string | null
          severity?: string | null
          supporting_data?: Json
          title?: string
          valid_from?: string | null
          valid_until?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      core_entities: {
        Row: {
          alternate_names: string[] | null
          annual_revenue: number | null
          business_types: string[] | null
          cage_code: string | null
          canonical_id: string | null
          canonical_name: string
          city: string | null
          clusters: string[] | null
          contract_count: number | null
          country: string | null
          created_at: string | null
          data_quality_score: number | null
          description: string | null
          duns: string | null
          ein: string | null
          employee_count: number | null
          entity_type: string
          grant_count: number | null
          health_score: number | null
          id: string
          identifiers: Json
          is_canonical: boolean | null
          last_source_update: string | null
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          merge_count: number | null
          merged_data: Json
          naics_codes: string[] | null
          opportunity_score: number | null
          phone: string | null
          psc_codes: string[] | null
          risk_score: number | null
          search_text: string | null
          search_vector: unknown
          source_count: number | null
          source_records: Json
          state: string | null
          tags: string[] | null
          total_contract_value: number | null
          total_grant_value: number | null
          uei: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          alternate_names?: string[] | null
          annual_revenue?: number | null
          business_types?: string[] | null
          cage_code?: string | null
          canonical_id?: string | null
          canonical_name: string
          city?: string | null
          clusters?: string[] | null
          contract_count?: number | null
          country?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          description?: string | null
          duns?: string | null
          ein?: string | null
          employee_count?: number | null
          entity_type: string
          grant_count?: number | null
          health_score?: number | null
          id?: string
          identifiers?: Json
          is_canonical?: boolean | null
          last_source_update?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          merge_count?: number | null
          merged_data?: Json
          naics_codes?: string[] | null
          opportunity_score?: number | null
          phone?: string | null
          psc_codes?: string[] | null
          risk_score?: number | null
          search_text?: string | null
          search_vector?: unknown
          source_count?: number | null
          source_records?: Json
          state?: string | null
          tags?: string[] | null
          total_contract_value?: number | null
          total_grant_value?: number | null
          uei?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          alternate_names?: string[] | null
          annual_revenue?: number | null
          business_types?: string[] | null
          cage_code?: string | null
          canonical_id?: string | null
          canonical_name?: string
          city?: string | null
          clusters?: string[] | null
          contract_count?: number | null
          country?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          description?: string | null
          duns?: string | null
          ein?: string | null
          employee_count?: number | null
          entity_type?: string
          grant_count?: number | null
          health_score?: number | null
          id?: string
          identifiers?: Json
          is_canonical?: boolean | null
          last_source_update?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          merge_count?: number | null
          merged_data?: Json
          naics_codes?: string[] | null
          opportunity_score?: number | null
          phone?: string | null
          psc_codes?: string[] | null
          risk_score?: number | null
          search_text?: string | null
          search_vector?: unknown
          source_count?: number | null
          source_records?: Json
          state?: string | null
          tags?: string[] | null
          total_contract_value?: number | null
          total_grant_value?: number | null
          uei?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      core_entity_history: {
        Row: {
          change_reason: string | null
          change_source: string | null
          change_type: string
          changed_fields: string[] | null
          created_at: string | null
          entity_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          change_reason?: string | null
          change_source?: string | null
          change_type: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          change_reason?: string | null
          change_source?: string | null
          change_type?: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "core_entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      core_facts: {
        Row: {
          confidence: number | null
          created_at: string | null
          entity_id: string | null
          fact_date: string | null
          fact_period: string | null
          fact_type: string
          fact_value: Json
          id: string
          source_name: string | null
          source_record_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          fact_date?: string | null
          fact_period?: string | null
          fact_type: string
          fact_value: Json
          id?: string
          source_name?: string | null
          source_record_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          fact_date?: string | null
          fact_period?: string | null
          fact_type?: string
          fact_value?: Json
          id?: string
          source_name?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_facts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      core_facts_summary: {
        Row: {
          earliest_date: string | null
          entity_id: string | null
          fact_count: number | null
          fact_type: string
          id: string
          latest_date: string | null
          latest_value: string | null
          sample_values: Json | null
          updated_at: string | null
        }
        Insert: {
          earliest_date?: string | null
          entity_id?: string | null
          fact_count?: number | null
          fact_type: string
          id?: string
          latest_date?: string | null
          latest_value?: string | null
          sample_values?: Json | null
          updated_at?: string | null
        }
        Update: {
          earliest_date?: string | null
          entity_id?: string | null
          fact_count?: number | null
          fact_type?: string
          id?: string
          latest_date?: string | null
          latest_value?: string | null
          sample_values?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_facts_summary_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_summary_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_summary_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_summary_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_facts_summary_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      core_feedback: {
        Row: {
          created_at: string | null
          entity_id: string | null
          feedback_data: Json
          feedback_type: string
          id: string
          processed_at: string | null
          query_id: string | null
          record_id: string | null
          status: string | null
          user_id: string | null
          user_trust_score: number | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          feedback_data: Json
          feedback_type: string
          id?: string
          processed_at?: string | null
          query_id?: string | null
          record_id?: string | null
          status?: string | null
          user_id?: string | null
          user_trust_score?: number | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          feedback_data?: Json
          feedback_type?: string
          id?: string
          processed_at?: string | null
          query_id?: string | null
          record_id?: string | null
          status?: string | null
          user_id?: string | null
          user_trust_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "core_feedback_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_feedback_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_feedback_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_feedback_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_feedback_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_feedback_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_feedback_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      core_intelligence_metrics: {
        Row: {
          avg_data_freshness_days: number | null
          avg_entity_completeness: number | null
          avg_query_time_ms: number | null
          cache_hit_rate: number | null
          created_at: string | null
          entities_verified_today: number | null
          feedback_processed_today: number | null
          id: string
          insights_generated_today: number | null
          metric_date: string
          new_entities_today: number | null
          new_relationships_today: number | null
          patterns_learned_today: number | null
          queries_processed_today: number | null
          total_entities: number | null
          total_facts: number | null
          total_relationships: number | null
        }
        Insert: {
          avg_data_freshness_days?: number | null
          avg_entity_completeness?: number | null
          avg_query_time_ms?: number | null
          cache_hit_rate?: number | null
          created_at?: string | null
          entities_verified_today?: number | null
          feedback_processed_today?: number | null
          id?: string
          insights_generated_today?: number | null
          metric_date: string
          new_entities_today?: number | null
          new_relationships_today?: number | null
          patterns_learned_today?: number | null
          queries_processed_today?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_relationships?: number | null
        }
        Update: {
          avg_data_freshness_days?: number | null
          avg_entity_completeness?: number | null
          avg_query_time_ms?: number | null
          cache_hit_rate?: number | null
          created_at?: string | null
          entities_verified_today?: number | null
          feedback_processed_today?: number | null
          id?: string
          insights_generated_today?: number | null
          metric_date?: string
          new_entities_today?: number | null
          new_relationships_today?: number | null
          patterns_learned_today?: number | null
          queries_processed_today?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_relationships?: number | null
        }
        Relationships: []
      }
      core_query_patterns: {
        Row: {
          avg_result_count: number | null
          avg_satisfaction_score: number | null
          cached_insights: Json | null
          created_at: string | null
          id: string
          last_queried_at: string | null
          pattern_category: string | null
          pattern_signature: string
          pattern_template: string | null
          query_count: number | null
          recommended_correlations: string[] | null
          recommended_sources: string[] | null
          sample_queries: Json | null
          successful_sources: string[] | null
          unique_users: number | null
          updated_at: string | null
        }
        Insert: {
          avg_result_count?: number | null
          avg_satisfaction_score?: number | null
          cached_insights?: Json | null
          created_at?: string | null
          id?: string
          last_queried_at?: string | null
          pattern_category?: string | null
          pattern_signature: string
          pattern_template?: string | null
          query_count?: number | null
          recommended_correlations?: string[] | null
          recommended_sources?: string[] | null
          sample_queries?: Json | null
          successful_sources?: string[] | null
          unique_users?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_result_count?: number | null
          avg_satisfaction_score?: number | null
          cached_insights?: Json | null
          created_at?: string | null
          id?: string
          last_queried_at?: string | null
          pattern_category?: string | null
          pattern_signature?: string
          pattern_template?: string | null
          query_count?: number | null
          recommended_correlations?: string[] | null
          recommended_sources?: string[] | null
          sample_queries?: Json | null
          successful_sources?: string[] | null
          unique_users?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      core_relationships: {
        Row: {
          confidence: number | null
          created_at: string | null
          end_date: string | null
          evidence: Json
          from_entity_id: string | null
          id: string
          is_active: boolean | null
          relationship_type: string
          start_date: string | null
          state: string | null
          strength: number | null
          to_entity_id: string | null
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          end_date?: string | null
          evidence?: Json
          from_entity_id?: string | null
          id?: string
          is_active?: boolean | null
          relationship_type: string
          start_date?: string | null
          state?: string | null
          strength?: number | null
          to_entity_id?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          end_date?: string | null
          evidence?: Json
          from_entity_id?: string | null
          id?: string
          is_active?: boolean | null
          relationship_type?: string
          start_date?: string | null
          state?: string | null
          strength?: number | null
          to_entity_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_relationships_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      crawler_runs: {
        Row: {
          completed_at: string | null
          crawler_id: string | null
          discovery_log: Json | null
          error_message: string | null
          id: string
          new_collectors_created: number | null
          processing_time_ms: number | null
          records_collected: number | null
          sources_discovered: Json | null
          started_at: string
          status: string
          urls_discovered: string[] | null
        }
        Insert: {
          completed_at?: string | null
          crawler_id?: string | null
          discovery_log?: Json | null
          error_message?: string | null
          id?: string
          new_collectors_created?: number | null
          processing_time_ms?: number | null
          records_collected?: number | null
          sources_discovered?: Json | null
          started_at?: string
          status?: string
          urls_discovered?: string[] | null
        }
        Update: {
          completed_at?: string | null
          crawler_id?: string | null
          discovery_log?: Json | null
          error_message?: string | null
          id?: string
          new_collectors_created?: number | null
          processing_time_ms?: number | null
          records_collected?: number | null
          sources_discovered?: Json | null
          started_at?: string
          status?: string
          urls_discovered?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "crawler_runs_crawler_id_fkey"
            columns: ["crawler_id"]
            isOneToOne: false
            referencedRelation: "auto_crawlers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          dataset_id: string | null
          description: string | null
          id: string
          stripe_payment_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          dataset_id?: string | null
          description?: string | null
          id?: string
          stripe_payment_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          dataset_id?: string | null
          description?: string | null
          id?: string
          stripe_payment_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          export_type: string
          file_size: number | null
          file_url: string | null
          filters: Json | null
          format: string
          id: string
          row_count: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          export_type: string
          file_size?: number | null
          file_url?: string | null
          filters?: Json | null
          format: string
          id?: string
          row_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          filters?: Json | null
          format?: string
          id?: string
          row_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_quality_logs: {
        Row: {
          audit_type: string
          details: Json | null
          id: string
          issues_fixed: number | null
          issues_found: number | null
          ran_at: string | null
        }
        Insert: {
          audit_type: string
          details?: Json | null
          id?: string
          issues_fixed?: number | null
          issues_found?: number | null
          ran_at?: string | null
        }
        Update: {
          audit_type?: string
          details?: Json | null
          id?: string
          issues_fixed?: number | null
          issues_found?: number | null
          ran_at?: string | null
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          content_hash: string | null
          crawl_frequency: unknown
          created_at: string
          domain: string
          id: string
          last_crawled: string | null
          metadata: Json | null
          reliability_score: number | null
          source_type: string | null
          updated_at: string
          url: string
        }
        Insert: {
          content_hash?: string | null
          crawl_frequency?: unknown
          created_at?: string
          domain: string
          id?: string
          last_crawled?: string | null
          metadata?: Json | null
          reliability_score?: number | null
          source_type?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          content_hash?: string | null
          crawl_frequency?: unknown
          created_at?: string
          domain?: string
          id?: string
          last_crawled?: string | null
          metadata?: Json | null
          reliability_score?: number | null
          source_type?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      datasets: {
        Row: {
          created_at: string
          credits_used: number | null
          data: Json | null
          description: string | null
          id: string
          insights: Json | null
          is_public: boolean | null
          processing_log: Json | null
          prompt: string
          row_count: number | null
          schema_definition: Json | null
          sources: Json | null
          status: Database["public"]["Enums"]["dataset_status"] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number | null
          data?: Json | null
          description?: string | null
          id?: string
          insights?: Json | null
          is_public?: boolean | null
          processing_log?: Json | null
          prompt: string
          row_count?: number | null
          schema_definition?: Json | null
          sources?: Json | null
          status?: Database["public"]["Enums"]["dataset_status"] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number | null
          data?: Json | null
          description?: string | null
          id?: string
          insights?: Json | null
          is_public?: boolean | null
          processing_log?: Json | null
          prompt?: string
          row_count?: number | null
          schema_definition?: Json | null
          sources?: Json | null
          status?: Database["public"]["Enums"]["dataset_status"] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      derivation_runs: {
        Row: {
          completed_at: string | null
          details: Json | null
          error: string | null
          id: string
          job_type: string
          records_created: number | null
          records_processed: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          error?: string | null
          id?: string
          job_type: string
          records_created?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          error?: string | null
          id?: string
          job_type?: string
          records_created?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      discovered_sources: {
        Row: {
          api_endpoint: string | null
          auto_collector_id: string | null
          collector_generated: boolean | null
          created_at: string
          data_type: string | null
          description: string | null
          discovered_at: string
          discovered_by_crawler_id: string | null
          documentation_url: string | null
          id: string
          inferred_categories: string[]
          inferred_keywords: string[]
          is_active: boolean | null
          last_validated_at: string | null
          name: string
          quality_score: number | null
          review_status: string | null
          reviewed_at: string | null
          updated_at: string
          url: string
        }
        Insert: {
          api_endpoint?: string | null
          auto_collector_id?: string | null
          collector_generated?: boolean | null
          created_at?: string
          data_type?: string | null
          description?: string | null
          discovered_at?: string
          discovered_by_crawler_id?: string | null
          documentation_url?: string | null
          id?: string
          inferred_categories?: string[]
          inferred_keywords?: string[]
          is_active?: boolean | null
          last_validated_at?: string | null
          name: string
          quality_score?: number | null
          review_status?: string | null
          reviewed_at?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          api_endpoint?: string | null
          auto_collector_id?: string | null
          collector_generated?: boolean | null
          created_at?: string
          data_type?: string | null
          description?: string | null
          discovered_at?: string
          discovered_by_crawler_id?: string | null
          documentation_url?: string | null
          id?: string
          inferred_categories?: string[]
          inferred_keywords?: string[]
          is_active?: boolean | null
          last_validated_at?: string | null
          name?: string
          quality_score?: number | null
          review_status?: string | null
          reviewed_at?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovered_sources_auto_collector_id_fkey"
            columns: ["auto_collector_id"]
            isOneToOne: false
            referencedRelation: "dynamic_collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_sources_discovered_by_crawler_id_fkey"
            columns: ["discovered_by_crawler_id"]
            isOneToOne: false
            referencedRelation: "auto_crawlers"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_dead_letter: {
        Row: {
          can_retry: boolean | null
          created_at: string
          failure_count: number
          failure_reason: string
          first_failed_at: string
          id: string
          last_failed_at: string
          original_discovery_id: string | null
          original_payload: Json
          recovered_at: string | null
          recovered_by: string | null
          retry_after: string | null
        }
        Insert: {
          can_retry?: boolean | null
          created_at?: string
          failure_count?: number
          failure_reason: string
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          original_discovery_id?: string | null
          original_payload: Json
          recovered_at?: string | null
          recovered_by?: string | null
          retry_after?: string | null
        }
        Update: {
          can_retry?: boolean | null
          created_at?: string
          failure_count?: number
          failure_reason?: string
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          original_discovery_id?: string | null
          original_payload?: Json
          recovered_at?: string | null
          recovered_by?: string | null
          retry_after?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_dead_letter_original_discovery_id_fkey"
            columns: ["original_discovery_id"]
            isOneToOne: false
            referencedRelation: "source_discoveries"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_metrics: {
        Row: {
          avg_confidence_score: number | null
          avg_generation_time_ms: number | null
          collectors_approved: number | null
          collectors_failed: number | null
          collectors_generated: number | null
          created_at: string
          date: string
          discoveries_queued: number | null
          discoveries_validated: number | null
          gaps_filled: number | null
          gaps_identified: number | null
          id: string
          new_sources_added: number | null
          records_from_new_sources: number | null
        }
        Insert: {
          avg_confidence_score?: number | null
          avg_generation_time_ms?: number | null
          collectors_approved?: number | null
          collectors_failed?: number | null
          collectors_generated?: number | null
          created_at?: string
          date?: string
          discoveries_queued?: number | null
          discoveries_validated?: number | null
          gaps_filled?: number | null
          gaps_identified?: number | null
          id?: string
          new_sources_added?: number | null
          records_from_new_sources?: number | null
        }
        Update: {
          avg_confidence_score?: number | null
          avg_generation_time_ms?: number | null
          collectors_approved?: number | null
          collectors_failed?: number | null
          collectors_generated?: number | null
          created_at?: string
          date?: string
          discoveries_queued?: number | null
          discoveries_validated?: number | null
          gaps_filled?: number | null
          gaps_identified?: number | null
          id?: string
          new_sources_added?: number | null
          records_from_new_sources?: number | null
        }
        Relationships: []
      }
      dismissed_announcements: {
        Row: {
          announcement_id: string
          dismissed_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_collectors: {
        Row: {
          api_method: string
          api_url: string
          categories: string[]
          created_at: string
          created_by_prompt: string | null
          description: string | null
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          keywords: string[]
          last_used_at: string | null
          name: string
          params_template: Json | null
          response_mapping: Json
          success_count: number | null
          updated_at: string
        }
        Insert: {
          api_method?: string
          api_url: string
          categories: string[]
          created_at?: string
          created_by_prompt?: string | null
          description?: string | null
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          last_used_at?: string | null
          name: string
          params_template?: Json | null
          response_mapping: Json
          success_count?: number | null
          updated_at?: string
        }
        Update: {
          api_method?: string
          api_url?: string
          categories?: string[]
          created_at?: string
          created_by_prompt?: string | null
          description?: string | null
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          last_used_at?: string | null
          name?: string
          params_template?: Json | null
          response_mapping?: Json
          success_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      embed_widgets: {
        Row: {
          allowed_domains: string[] | null
          api_key: string | null
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          user_id: string | null
          view_count: number | null
          widget_type: string
        }
        Insert: {
          allowed_domains?: string[] | null
          api_key?: string | null
          config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string | null
          view_count?: number | null
          widget_type: string
        }
        Update: {
          allowed_domains?: string[] | null
          api_key?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string | null
          view_count?: number | null
          widget_type?: string
        }
        Relationships: []
      }
      enrichment_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          enrichment_type: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          priority: number | null
          record_id: string
          result: Json | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          enrichment_type: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          priority?: number | null
          record_id: string
          result?: Json | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          enrichment_type?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          priority?: number | null
          record_id?: string
          result?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_queue_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_stats: {
        Row: {
          avg_enrichment_time_ms: number | null
          category: string
          created_at: string
          date: string
          fusion_operations: number | null
          id: string
          records_enriched: number | null
          relationships_created: number | null
        }
        Insert: {
          avg_enrichment_time_ms?: number | null
          category: string
          created_at?: string
          date?: string
          fusion_operations?: number | null
          id?: string
          records_enriched?: number | null
          relationships_created?: number | null
        }
        Update: {
          avg_enrichment_time_ms?: number | null
          category?: string
          created_at?: string
          date?: string
          fusion_operations?: number | null
          id?: string
          records_enriched?: number | null
          relationships_created?: number | null
        }
        Relationships: []
      }
      entity_aliases: {
        Row: {
          alias: string
          alias_type: string | null
          confidence: number | null
          created_at: string | null
          entity_id: string | null
          id: string
          source: string | null
        }
        Insert: {
          alias: string
          alias_type?: string | null
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          source?: string | null
        }
        Update: {
          alias?: string
          alias_type?: string | null
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_health_scores: {
        Row: {
          calculated_at: string | null
          contract_velocity: number | null
          entity_id: string | null
          grant_success: number | null
          id: string
          market_diversification: number | null
          overall_score: number
          relationship_density: number | null
          trend_direction: string | null
        }
        Insert: {
          calculated_at?: string | null
          contract_velocity?: number | null
          entity_id?: string | null
          grant_success?: number | null
          id?: string
          market_diversification?: number | null
          overall_score: number
          relationship_density?: number | null
          trend_direction?: string | null
        }
        Update: {
          calculated_at?: string | null
          contract_velocity?: number | null
          entity_id?: string | null
          grant_success?: number | null
          id?: string
          market_diversification?: number | null
          overall_score?: number
          relationship_density?: number | null
          trend_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_health_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_health_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_health_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_health_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_health_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_identifiers: {
        Row: {
          created_at: string | null
          entity_id: string | null
          id: string
          identifier_type: string
          identifier_value: string
          is_primary: boolean | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          identifier_type: string
          identifier_value: string
          is_primary?: boolean | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          identifier_type?: string
          identifier_value?: string
          is_primary?: boolean | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_merge_candidates: {
        Row: {
          created_at: string | null
          entity_a_id: string | null
          entity_b_id: string | null
          id: string
          match_reasons: Json | null
          match_score: number | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          entity_a_id?: string | null
          entity_b_id?: string | null
          id?: string
          match_reasons?: Json | null
          match_score?: number | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          entity_a_id?: string | null
          entity_b_id?: string | null
          id?: string
          match_reasons?: Json | null
          match_score?: number | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_merge_candidates_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_merge_candidates_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_merges: {
        Row: {
          id: string
          loser_id: string | null
          loser_name: string | null
          merge_reason: string | null
          merged_at: string | null
          winner_id: string | null
        }
        Insert: {
          id?: string
          loser_id?: string | null
          loser_name?: string | null
          merge_reason?: string | null
          merged_at?: string | null
          winner_id?: string | null
        }
        Update: {
          id?: string
          loser_id?: string | null
          loser_name?: string | null
          merge_reason?: string | null
          merged_at?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      entity_profiles: {
        Row: {
          auto_generated: boolean | null
          competitors: Json | null
          entity_id: string | null
          financial_summary: Json | null
          id: string
          key_facts: Json | null
          last_updated: string | null
          market_position: string | null
          news_mentions: Json | null
          opportunities: Json | null
          relationship_summary: Json | null
          risk_factors: Json | null
          summary: string | null
          timeline: Json | null
        }
        Insert: {
          auto_generated?: boolean | null
          competitors?: Json | null
          entity_id?: string | null
          financial_summary?: Json | null
          id?: string
          key_facts?: Json | null
          last_updated?: string | null
          market_position?: string | null
          news_mentions?: Json | null
          opportunities?: Json | null
          relationship_summary?: Json | null
          risk_factors?: Json | null
          summary?: string | null
          timeline?: Json | null
        }
        Update: {
          auto_generated?: boolean | null
          competitors?: Json | null
          entity_id?: string | null
          financial_summary?: Json | null
          id?: string
          key_facts?: Json | null
          last_updated?: string | null
          market_position?: string | null
          news_mentions?: Json | null
          opportunities?: Json | null
          relationship_summary?: Json | null
          risk_factors?: Json | null
          summary?: string | null
          timeline?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_timeline: {
        Row: {
          change_magnitude: number | null
          entity_id: string | null
          event_data: Json
          event_type: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          recorded_at: string | null
        }
        Insert: {
          change_magnitude?: number | null
          entity_id?: string | null
          event_data: Json
          event_type: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          recorded_at?: string | null
        }
        Update: {
          change_magnitude?: number | null
          entity_id?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_timeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_timeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_timeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_timeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_timeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_watchlist: {
        Row: {
          added_at: string | null
          entity_id: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          entity_id?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          entity_id?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_watchlist_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_watchlist_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_watchlist_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_watchlist_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_watchlist_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      expansion_rules: {
        Row: {
          created_at: string
          description: string | null
          expansion_strategy: Json
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          max_records_per_run: number | null
          name: string
          priority: number | null
          rule_type: string
          target_categories: string[] | null
          target_regions: string[] | null
          times_triggered: number | null
          trigger_condition: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expansion_strategy: Json
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_records_per_run?: number | null
          name: string
          priority?: number | null
          rule_type: string
          target_categories?: string[] | null
          target_regions?: string[] | null
          times_triggered?: number | null
          trigger_condition: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expansion_strategy?: Json
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_records_per_run?: number | null
          name?: string
          priority?: number | null
          rule_type?: string
          target_categories?: string[] | null
          target_regions?: string[] | null
          times_triggered?: number | null
          trigger_condition?: Json
          updated_at?: string
        }
        Relationships: []
      }
      fda_devices: {
        Row: {
          applicant: string | null
          applicant_entity_id: string | null
          created_at: string | null
          decision: string | null
          decision_date: string | null
          device_class: string | null
          device_name: string
          id: string
          k_number: string | null
          medical_specialty: string | null
          pma_number: string | null
          product_code: string | null
          raw_data: Json | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          applicant?: string | null
          applicant_entity_id?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          device_class?: string | null
          device_name: string
          id?: string
          k_number?: string | null
          medical_specialty?: string | null
          pma_number?: string | null
          product_code?: string | null
          raw_data?: Json | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant?: string | null
          applicant_entity_id?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          device_class?: string | null
          device_name?: string
          id?: string
          k_number?: string | null
          medical_specialty?: string | null
          pma_number?: string | null
          product_code?: string | null
          raw_data?: Json | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fda_devices_applicant_entity_id_fkey"
            columns: ["applicant_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_devices_applicant_entity_id_fkey"
            columns: ["applicant_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_devices_applicant_entity_id_fkey"
            columns: ["applicant_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_devices_applicant_entity_id_fkey"
            columns: ["applicant_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_devices_applicant_entity_id_fkey"
            columns: ["applicant_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      fda_drugs: {
        Row: {
          active_ingredients: string[] | null
          application_number: string | null
          application_type: string | null
          approval_date: string | null
          brand_name: string | null
          created_at: string | null
          dosage_form: string | null
          generic_name: string | null
          id: string
          market_status: string | null
          raw_data: Json | null
          route: string | null
          source: string | null
          sponsor_entity_id: string | null
          sponsor_name: string | null
          therapeutic_class: string | null
          updated_at: string | null
        }
        Insert: {
          active_ingredients?: string[] | null
          application_number?: string | null
          application_type?: string | null
          approval_date?: string | null
          brand_name?: string | null
          created_at?: string | null
          dosage_form?: string | null
          generic_name?: string | null
          id?: string
          market_status?: string | null
          raw_data?: Json | null
          route?: string | null
          source?: string | null
          sponsor_entity_id?: string | null
          sponsor_name?: string | null
          therapeutic_class?: string | null
          updated_at?: string | null
        }
        Update: {
          active_ingredients?: string[] | null
          application_number?: string | null
          application_type?: string | null
          approval_date?: string | null
          brand_name?: string | null
          created_at?: string | null
          dosage_form?: string | null
          generic_name?: string | null
          id?: string
          market_status?: string | null
          raw_data?: Json | null
          route?: string | null
          source?: string | null
          sponsor_entity_id?: string | null
          sponsor_name?: string | null
          therapeutic_class?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fda_drugs_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_drugs_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_drugs_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_drugs_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_drugs_sponsor_entity_id_fkey"
            columns: ["sponsor_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          rollout_percentage: number | null
          subscription_tiers: string[] | null
          user_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_enabled?: boolean | null
          name: string
          rollout_percentage?: number | null
          subscription_tiers?: string[] | null
          user_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          rollout_percentage?: number | null
          subscription_tiers?: string[] | null
          user_ids?: string[] | null
        }
        Relationships: []
      }
      flywheel_collection_log: {
        Row: {
          collected_at: string | null
          id: string
          merged_entities: number | null
          new_entities: number | null
          pattern_signature: string | null
          query_params: Json | null
          records_collected: number | null
          source_name: string
        }
        Insert: {
          collected_at?: string | null
          id?: string
          merged_entities?: number | null
          new_entities?: number | null
          pattern_signature?: string | null
          query_params?: Json | null
          records_collected?: number | null
          source_name: string
        }
        Update: {
          collected_at?: string | null
          id?: string
          merged_entities?: number | null
          new_entities?: number | null
          pattern_signature?: string | null
          query_params?: Json | null
          records_collected?: number | null
          source_name?: string
        }
        Relationships: []
      }
      flywheel_crawl_log: {
        Row: {
          crawled_at: string | null
          crawler_type: string
          duration_ms: number | null
          entities_created: number | null
          errors: Json | null
          facts_extracted: number | null
          id: string
          metadata: Json | null
          records_collected: number | null
          relationships_created: number | null
        }
        Insert: {
          crawled_at?: string | null
          crawler_type: string
          duration_ms?: number | null
          entities_created?: number | null
          errors?: Json | null
          facts_extracted?: number | null
          id?: string
          metadata?: Json | null
          records_collected?: number | null
          relationships_created?: number | null
        }
        Update: {
          crawled_at?: string | null
          crawler_type?: string
          duration_ms?: number | null
          entities_created?: number | null
          errors?: Json | null
          facts_extracted?: number | null
          id?: string
          metadata?: Json | null
          records_collected?: number | null
          relationships_created?: number | null
        }
        Relationships: []
      }
      flywheel_dead_letter_queue: {
        Row: {
          created_at: string | null
          error_count: number | null
          error_message: string | null
          id: string
          last_retry_at: string | null
          original_id: string | null
          payload: Json | null
          resolved_at: string | null
          source_table: string
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          original_id?: string | null
          payload?: Json | null
          resolved_at?: string | null
          source_table: string
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          original_id?: string | null
          payload?: Json | null
          resolved_at?: string | null
          source_table?: string
        }
        Relationships: []
      }
      flywheel_discovery_queue: {
        Row: {
          completed_at: string | null
          context: Json | null
          created_at: string | null
          discovery_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          priority: number | null
          records_collected: number | null
          started_at: string | null
          status: string | null
          target_query: Json
          target_source: string
          target_type: string | null
          target_value: string | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          discovery_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          records_collected?: number | null
          started_at?: string | null
          status?: string | null
          target_query: Json
          target_source: string
          target_type?: string | null
          target_value?: string | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          discovery_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          records_collected?: number | null
          started_at?: string | null
          status?: string | null
          target_query?: Json
          target_source?: string
          target_type?: string | null
          target_value?: string | null
        }
        Relationships: []
      }
      flywheel_metrics: {
        Row: {
          dimensions: Json | null
          id: string
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      flywheel_source_health: {
        Row: {
          avg_response_ms: number | null
          failure_count: number | null
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          notes: string | null
          rate_limit_remaining: number | null
          rate_limit_reset_at: string | null
          source_name: string
          status: string | null
          success_count: number | null
          updated_at: string | null
        }
        Insert: {
          avg_response_ms?: number | null
          failure_count?: number | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          notes?: string | null
          rate_limit_remaining?: number | null
          rate_limit_reset_at?: string | null
          source_name: string
          status?: string | null
          success_count?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_response_ms?: number | null
          failure_count?: number | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          notes?: string | null
          rate_limit_remaining?: number | null
          rate_limit_reset_at?: string | null
          source_name?: string
          status?: string | null
          success_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fpds_awards: {
        Row: {
          award_type: string | null
          base_and_all_options: number | null
          completion_date: string | null
          contracting_department: string | null
          contracting_office: string | null
          contracting_subtier: string | null
          created_at: string | null
          description_of_requirement: string | null
          dollars_obligated: number | null
          effective_date: string | null
          extent_competed: string | null
          funding_department: string | null
          id: string
          last_modified: string | null
          modification_number: string | null
          naics_code: string | null
          number_of_offers: number | null
          piid: string | null
          pop_city: string | null
          pop_state: string | null
          psc_code: string | null
          raw_data: Json | null
          set_aside: string | null
          solicitation_id: string | null
          source: string | null
          vendor_cage: string | null
          vendor_city: string | null
          vendor_name: string | null
          vendor_state: string | null
          vendor_uei: string | null
          vendor_zip: string | null
        }
        Insert: {
          award_type?: string | null
          base_and_all_options?: number | null
          completion_date?: string | null
          contracting_department?: string | null
          contracting_office?: string | null
          contracting_subtier?: string | null
          created_at?: string | null
          description_of_requirement?: string | null
          dollars_obligated?: number | null
          effective_date?: string | null
          extent_competed?: string | null
          funding_department?: string | null
          id?: string
          last_modified?: string | null
          modification_number?: string | null
          naics_code?: string | null
          number_of_offers?: number | null
          piid?: string | null
          pop_city?: string | null
          pop_state?: string | null
          psc_code?: string | null
          raw_data?: Json | null
          set_aside?: string | null
          solicitation_id?: string | null
          source?: string | null
          vendor_cage?: string | null
          vendor_city?: string | null
          vendor_name?: string | null
          vendor_state?: string | null
          vendor_uei?: string | null
          vendor_zip?: string | null
        }
        Update: {
          award_type?: string | null
          base_and_all_options?: number | null
          completion_date?: string | null
          contracting_department?: string | null
          contracting_office?: string | null
          contracting_subtier?: string | null
          created_at?: string | null
          description_of_requirement?: string | null
          dollars_obligated?: number | null
          effective_date?: string | null
          extent_competed?: string | null
          funding_department?: string | null
          id?: string
          last_modified?: string | null
          modification_number?: string | null
          naics_code?: string | null
          number_of_offers?: number | null
          piid?: string | null
          pop_city?: string | null
          pop_state?: string | null
          psc_code?: string | null
          raw_data?: Json | null
          set_aside?: string | null
          solicitation_id?: string | null
          source?: string | null
          vendor_cage?: string | null
          vendor_city?: string | null
          vendor_name?: string | null
          vendor_state?: string | null
          vendor_uei?: string | null
          vendor_zip?: string | null
        }
        Relationships: []
      }
      fused_records: {
        Row: {
          base_record_id: string
          created_at: string
          enrichment_count: number | null
          enrichment_sources: string[]
          fused_properties: Json
          fusion_score: number | null
          id: string
          last_enriched_at: string
        }
        Insert: {
          base_record_id: string
          created_at?: string
          enrichment_count?: number | null
          enrichment_sources?: string[]
          fused_properties?: Json
          fusion_score?: number | null
          id?: string
          last_enriched_at?: string
        }
        Update: {
          base_record_id?: string
          created_at?: string
          enrichment_count?: number | null
          enrichment_sources?: string[]
          fused_properties?: Json
          fusion_score?: number | null
          id?: string
          last_enriched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fused_records_base_record_id_fkey"
            columns: ["base_record_id"]
            isOneToOne: true
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      gap_analysis: {
        Row: {
          created_at: string
          gap_description: string
          gap_type: string
          id: string
          identified_at: string
          query_frequency: number | null
          resolution_discovery_id: string | null
          resolved_at: string | null
          sample_queries: Json | null
          severity: number | null
          status: string | null
          target_category: string | null
          target_keywords: string[] | null
          target_region: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gap_description: string
          gap_type: string
          id?: string
          identified_at?: string
          query_frequency?: number | null
          resolution_discovery_id?: string | null
          resolved_at?: string | null
          sample_queries?: Json | null
          severity?: number | null
          status?: string | null
          target_category?: string | null
          target_keywords?: string[] | null
          target_region?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gap_description?: string
          gap_type?: string
          id?: string
          identified_at?: string
          query_frequency?: number | null
          resolution_discovery_id?: string | null
          resolved_at?: string | null
          sample_queries?: Json | null
          severity?: number | null
          status?: string | null
          target_category?: string | null
          target_keywords?: string[] | null
          target_region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_analysis_resolution_discovery_id_fkey"
            columns: ["resolution_discovery_id"]
            isOneToOne: false
            referencedRelation: "source_discoveries"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          content: Json
          created_at: string | null
          entity_id: string | null
          id: string
          is_public: boolean | null
          pdf_url: string | null
          public_slug: string | null
          report_type: string
          title: string
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_public?: boolean | null
          pdf_url?: string | null
          public_slug?: string | null
          report_type: string
          title: string
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_public?: boolean | null
          pdf_url?: string | null
          public_slug?: string | null
          report_type?: string
          title?: string
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          assistance_type: string | null
          award_amount: number | null
          award_date: string | null
          award_id: string | null
          awarding_agency: string | null
          awarding_sub_agency: string | null
          cfda_number: string | null
          cfda_title: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          fain: string | null
          funding_agency: string | null
          grant_category: string | null
          grant_id: string | null
          grant_type: string | null
          id: string
          pop_city: string | null
          pop_state: string | null
          project_title: string | null
          raw_data: Json | null
          recipient_city: string | null
          recipient_entity_id: string | null
          recipient_name: string
          recipient_state: string | null
          recipient_uei: string | null
          recipient_zip: string | null
          source: string | null
          start_date: string | null
          total_funding: number | null
          updated_at: string | null
        }
        Insert: {
          assistance_type?: string | null
          award_amount?: number | null
          award_date?: string | null
          award_id?: string | null
          awarding_agency?: string | null
          awarding_sub_agency?: string | null
          cfda_number?: string | null
          cfda_title?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fain?: string | null
          funding_agency?: string | null
          grant_category?: string | null
          grant_id?: string | null
          grant_type?: string | null
          id?: string
          pop_city?: string | null
          pop_state?: string | null
          project_title?: string | null
          raw_data?: Json | null
          recipient_city?: string | null
          recipient_entity_id?: string | null
          recipient_name: string
          recipient_state?: string | null
          recipient_uei?: string | null
          recipient_zip?: string | null
          source?: string | null
          start_date?: string | null
          total_funding?: number | null
          updated_at?: string | null
        }
        Update: {
          assistance_type?: string | null
          award_amount?: number | null
          award_date?: string | null
          award_id?: string | null
          awarding_agency?: string | null
          awarding_sub_agency?: string | null
          cfda_number?: string | null
          cfda_title?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fain?: string | null
          funding_agency?: string | null
          grant_category?: string | null
          grant_id?: string | null
          grant_type?: string | null
          id?: string
          pop_city?: string | null
          pop_state?: string | null
          project_title?: string | null
          raw_data?: Json | null
          recipient_city?: string | null
          recipient_entity_id?: string | null
          recipient_name?: string
          recipient_state?: string | null
          recipient_uei?: string | null
          recipient_zip?: string | null
          source?: string | null
          start_date?: string | null
          total_funding?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grants_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_recipient_entity_id_fkey"
            columns: ["recipient_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          checked_at: string | null
          error_message: string | null
          http_status: number | null
          id: string
          records_returned: number | null
          response_time_ms: number | null
          source_id: string | null
          source_slug: string | null
          status: string
          test_endpoint: string | null
        }
        Insert: {
          checked_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          records_returned?: number | null
          response_time_ms?: number | null
          source_id?: string | null
          source_slug?: string | null
          status: string
          test_endpoint?: string | null
        }
        Update: {
          checked_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          records_returned?: number | null
          response_time_ms?: number | null
          source_id?: string | null
          source_slug?: string | null
          status?: string
          test_endpoint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "api_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          priority: number
          records_fetched: number | null
          scheduled_for: string
          source_slug: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          priority?: number
          records_fetched?: number | null
          scheduled_for?: string
          source_slug: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          priority?: number
          records_fetched?: number | null
          scheduled_for?: string
          source_slug?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_queue_source_slug_fkey"
            columns: ["source_slug"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["slug"]
          },
        ]
      }
      ingestion_sources: {
        Row: {
          base_url: string
          category: string
          consecutive_failures: number
          created_at: string
          fetch_config: Json
          fetch_interval_hours: number
          id: string
          is_active: boolean
          last_error: string | null
          last_fetched_at: string | null
          last_success_at: string | null
          name: string
          priority: number
          slug: string
          total_records_fetched: number
          updated_at: string
        }
        Insert: {
          base_url: string
          category: string
          consecutive_failures?: number
          created_at?: string
          fetch_config?: Json
          fetch_interval_hours?: number
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_fetched_at?: string | null
          last_success_at?: string | null
          name: string
          priority?: number
          slug: string
          total_records_fetched?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          category?: string
          consecutive_failures?: number
          created_at?: string
          fetch_config?: Json
          fetch_interval_hours?: number
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_fetched_at?: string | null
          last_success_at?: string | null
          name?: string
          priority?: number
          slug?: string
          total_records_fetched?: number
          updated_at?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          created_at: string | null
          description: string | null
          entity_ids: string[] | null
          evidence: Json | null
          id: string
          insight_type: string
          is_active: boolean | null
          severity: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_ids?: string[] | null
          evidence?: Json | null
          id?: string
          insight_type: string
          is_active?: boolean | null
          severity?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_ids?: string[] | null
          evidence?: Json | null
          id?: string
          insight_type?: string
          is_active?: boolean | null
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      intelligence_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          data: Json | null
          description: string
          entity_id: string | null
          id: string
          is_read: boolean | null
          severity: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          data?: Json | null
          description: string
          entity_id?: string | null
          id?: string
          is_read?: boolean | null
          severity?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          data?: Json | null
          description?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_edges: {
        Row: {
          created_at: string
          evidence: Json | null
          id: string
          object_id: string
          object_type: string
          predicate: string
          subject_id: string
          subject_type: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          id?: string
          object_id: string
          object_type: string
          predicate: string
          subject_id: string
          subject_type: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          id?: string
          object_id?: string
          object_type?: string
          predicate?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      location_cache: {
        Row: {
          admin_level: string | null
          bbox: Json | null
          center: Json
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          hit_count: number | null
          id: string
          last_used_at: string
          name: string
          name_normalized: string
          state: string | null
        }
        Insert: {
          admin_level?: string | null
          bbox?: Json | null
          center: Json
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string
          name: string
          name_normalized: string
          state?: string | null
        }
        Update: {
          admin_level?: string | null
          bbox?: Json | null
          center?: Json
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string
          name?: string
          name_normalized?: string
          state?: string | null
        }
        Relationships: []
      }
      market_shifts: {
        Row: {
          agencies: string[] | null
          detected_at: string | null
          entity_id: string | null
          id: string
          shift_type: string
          velocity_change: number | null
        }
        Insert: {
          agencies?: string[] | null
          detected_at?: string | null
          entity_id?: string | null
          id?: string
          shift_type: string
          velocity_change?: number | null
        }
        Update: {
          agencies?: string[] | null
          detected_at?: string | null
          entity_id?: string | null
          id?: string
          shift_type?: string
          velocity_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_shifts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_shifts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_shifts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_shifts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_shifts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      master_dataset_stats: {
        Row: {
          avg_quality_score: number | null
          bounding_box: Json | null
          geographic_coverage: Json | null
          id: string
          newest_record_at: string | null
          oldest_record_at: string | null
          recorded_at: string
          records_added_this_month: number | null
          records_added_this_week: number | null
          records_added_today: number | null
          records_by_category: Json | null
          records_by_source: Json | null
          records_with_high_quality: number | null
          total_categories: number
          total_records: number
          total_sources: number
        }
        Insert: {
          avg_quality_score?: number | null
          bounding_box?: Json | null
          geographic_coverage?: Json | null
          id?: string
          newest_record_at?: string | null
          oldest_record_at?: string | null
          recorded_at?: string
          records_added_this_month?: number | null
          records_added_this_week?: number | null
          records_added_today?: number | null
          records_by_category?: Json | null
          records_by_source?: Json | null
          records_with_high_quality?: number | null
          total_categories?: number
          total_records?: number
          total_sources?: number
        }
        Update: {
          avg_quality_score?: number | null
          bounding_box?: Json | null
          geographic_coverage?: Json | null
          id?: string
          newest_record_at?: string | null
          oldest_record_at?: string | null
          recorded_at?: string
          records_added_this_month?: number | null
          records_added_this_week?: number | null
          records_added_today?: number | null
          records_by_category?: Json | null
          records_by_source?: Json | null
          records_with_high_quality?: number | null
          total_categories?: number
          total_records?: number
          total_sources?: number
        }
        Relationships: []
      }
      md_education_institutions: {
        Row: {
          annual_budget: number | null
          city: string | null
          county: string | null
          created_at: string | null
          enrollment: number | null
          entity_id: string | null
          id: string
          institution_name: string
          institution_type: string | null
          meec_member: boolean | null
          updated_at: string | null
        }
        Insert: {
          annual_budget?: number | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          enrollment?: number | null
          entity_id?: string | null
          id?: string
          institution_name: string
          institution_type?: string | null
          meec_member?: boolean | null
          updated_at?: string | null
        }
        Update: {
          annual_budget?: number | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          enrollment?: number | null
          entity_id?: string | null
          id?: string
          institution_name?: string
          institution_type?: string | null
          meec_member?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_education_institutions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_institutions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_institutions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_institutions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_institutions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      md_education_spending: {
        Row: {
          county: string
          created_at: string | null
          fiscal_year: number
          id: string
          payee_entity_id: string | null
          payee_name: string
          purpose: string | null
          source: string | null
          total_payment: number
        }
        Insert: {
          county: string
          created_at?: string | null
          fiscal_year: number
          id?: string
          payee_entity_id?: string | null
          payee_name: string
          purpose?: string | null
          source?: string | null
          total_payment: number
        }
        Update: {
          county?: string
          created_at?: string | null
          fiscal_year?: number
          id?: string
          payee_entity_id?: string | null
          payee_name?: string
          purpose?: string | null
          source?: string | null
          total_payment?: number
        }
        Relationships: [
          {
            foreignKeyName: "md_education_spending_payee_entity_id_fkey"
            columns: ["payee_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_spending_payee_entity_id_fkey"
            columns: ["payee_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_spending_payee_entity_id_fkey"
            columns: ["payee_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_spending_payee_entity_id_fkey"
            columns: ["payee_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_education_spending_payee_entity_id_fkey"
            columns: ["payee_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      meec_contracts: {
        Row: {
          categories: string[] | null
          contract_name: string
          contract_number: string | null
          contract_type: string | null
          created_at: string | null
          eligible_members: string[] | null
          end_date: string | null
          estimated_value: number | null
          id: string
          prime_contractors: string[] | null
          source: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          contract_name: string
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          eligible_members?: string[] | null
          end_date?: string | null
          estimated_value?: number | null
          id?: string
          prime_contractors?: string[] | null
          source?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          contract_name?: string
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          eligible_members?: string[] | null
          end_date?: string | null
          estimated_value?: number | null
          id?: string
          prime_contractors?: string[] | null
          source?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      narrative_templates: {
        Row: {
          created_at: string | null
          id: string
          template_body: string
          template_name: string
          template_type: string
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          template_body: string
          template_name: string
          template_type: string
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          template_body?: string
          template_name?: string
          template_type?: string
          variables?: Json | null
        }
        Relationships: []
      }
      nl_queries: {
        Row: {
          api_key_id: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          explanation: string | null
          generated_sql: string | null
          id: string
          natural_query: string
          result_count: number | null
          user_id: string | null
          was_successful: boolean | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          explanation?: string | null
          generated_sql?: string | null
          id?: string
          natural_query: string
          result_count?: number | null
          user_id?: string | null
          was_successful?: boolean | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          explanation?: string | null
          generated_sql?: string | null
          id?: string
          natural_query?: string
          result_count?: number | null
          user_id?: string | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_queries_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "user_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      nsf_awards: {
        Row: {
          abstract: string | null
          agency: string | null
          award_amount: number | null
          award_number: string | null
          created_at: string | null
          exp_date: string | null
          fund_agency: string | null
          id: string
          institution_city: string | null
          institution_name: string | null
          institution_state: string | null
          institution_zip: string | null
          pi_first_name: string | null
          pi_last_name: string | null
          program_element: string | null
          source: string | null
          start_date: string | null
          title: string | null
        }
        Insert: {
          abstract?: string | null
          agency?: string | null
          award_amount?: number | null
          award_number?: string | null
          created_at?: string | null
          exp_date?: string | null
          fund_agency?: string | null
          id?: string
          institution_city?: string | null
          institution_name?: string | null
          institution_state?: string | null
          institution_zip?: string | null
          pi_first_name?: string | null
          pi_last_name?: string | null
          program_element?: string | null
          source?: string | null
          start_date?: string | null
          title?: string | null
        }
        Update: {
          abstract?: string | null
          agency?: string | null
          award_amount?: number | null
          award_number?: string | null
          created_at?: string | null
          exp_date?: string | null
          fund_agency?: string | null
          id?: string
          institution_city?: string | null
          institution_name?: string | null
          institution_state?: string | null
          institution_zip?: string | null
          pi_first_name?: string | null
          pi_last_name?: string | null
          program_element?: string | null
          source?: string | null
          start_date?: string | null
          title?: string | null
        }
        Relationships: []
      }
      ocean_health_snapshots: {
        Row: {
          active_sources: number | null
          avg_entity_quality: number | null
          contracts_last_hour: number | null
          coverage_score: number | null
          degraded_sources: number | null
          entities_last_hour: number | null
          entities_with_cage: number | null
          entities_with_uei: number | null
          failed_sources: number | null
          freshness_score: number | null
          healthy_sources: number | null
          id: string
          overall_health_score: number | null
          pipeline_health_score: number | null
          records_last_hour: number | null
          snapshot_at: string | null
          total_contract_value: number | null
          total_contracts: number | null
          total_entities: number | null
          total_facts: number | null
          total_grants: number | null
          total_insights: number | null
          total_opportunities: number | null
          total_relationships: number | null
        }
        Insert: {
          active_sources?: number | null
          avg_entity_quality?: number | null
          contracts_last_hour?: number | null
          coverage_score?: number | null
          degraded_sources?: number | null
          entities_last_hour?: number | null
          entities_with_cage?: number | null
          entities_with_uei?: number | null
          failed_sources?: number | null
          freshness_score?: number | null
          healthy_sources?: number | null
          id?: string
          overall_health_score?: number | null
          pipeline_health_score?: number | null
          records_last_hour?: number | null
          snapshot_at?: string | null
          total_contract_value?: number | null
          total_contracts?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_grants?: number | null
          total_insights?: number | null
          total_opportunities?: number | null
          total_relationships?: number | null
        }
        Update: {
          active_sources?: number | null
          avg_entity_quality?: number | null
          contracts_last_hour?: number | null
          coverage_score?: number | null
          degraded_sources?: number | null
          entities_last_hour?: number | null
          entities_with_cage?: number | null
          entities_with_uei?: number | null
          failed_sources?: number | null
          freshness_score?: number | null
          healthy_sources?: number | null
          id?: string
          overall_health_score?: number | null
          pipeline_health_score?: number | null
          records_last_hour?: number | null
          snapshot_at?: string | null
          total_contract_value?: number | null
          total_contracts?: number | null
          total_entities?: number | null
          total_facts?: number | null
          total_grants?: number | null
          total_insights?: number | null
          total_opportunities?: number | null
          total_relationships?: number | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          archive_date: string | null
          award_amount: number | null
          award_ceiling: number | null
          award_date: string | null
          award_floor: number | null
          award_number: string | null
          awardee_city: string | null
          awardee_name: string | null
          awardee_state: string | null
          awardee_uei: string | null
          base_type: string | null
          classification_code: string | null
          created_at: string | null
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          naics_code: string | null
          notice_id: string | null
          notice_type: string | null
          office: string | null
          point_of_contact: Json | null
          pop_city: string | null
          pop_state: string | null
          pop_zip: string | null
          posted_date: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          psc_code: string | null
          raw_data: Json | null
          resource_links: Json | null
          response_deadline: string | null
          search_text: string | null
          search_vector: unknown
          set_aside: string | null
          set_aside_code: string | null
          solicitation_number: string | null
          source: string | null
          status: string | null
          sub_tier: string | null
          title: string
          ui_link: string | null
          updated_at: string | null
        }
        Insert: {
          archive_date?: string | null
          award_amount?: number | null
          award_ceiling?: number | null
          award_date?: string | null
          award_floor?: number | null
          award_number?: string | null
          awardee_city?: string | null
          awardee_name?: string | null
          awardee_state?: string | null
          awardee_uei?: string | null
          base_type?: string | null
          classification_code?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          naics_code?: string | null
          notice_id?: string | null
          notice_type?: string | null
          office?: string | null
          point_of_contact?: Json | null
          pop_city?: string | null
          pop_state?: string | null
          pop_zip?: string | null
          posted_date?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          psc_code?: string | null
          raw_data?: Json | null
          resource_links?: Json | null
          response_deadline?: string | null
          search_text?: string | null
          search_vector?: unknown
          set_aside?: string | null
          set_aside_code?: string | null
          solicitation_number?: string | null
          source?: string | null
          status?: string | null
          sub_tier?: string | null
          title: string
          ui_link?: string | null
          updated_at?: string | null
        }
        Update: {
          archive_date?: string | null
          award_amount?: number | null
          award_ceiling?: number | null
          award_date?: string | null
          award_floor?: number | null
          award_number?: string | null
          awardee_city?: string | null
          awardee_name?: string | null
          awardee_state?: string | null
          awardee_uei?: string | null
          base_type?: string | null
          classification_code?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          naics_code?: string | null
          notice_id?: string | null
          notice_type?: string | null
          office?: string | null
          point_of_contact?: Json | null
          pop_city?: string | null
          pop_state?: string | null
          pop_zip?: string | null
          posted_date?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          psc_code?: string | null
          raw_data?: Json | null
          resource_links?: Json | null
          response_deadline?: string | null
          search_text?: string | null
          search_vector?: unknown
          set_aside?: string | null
          set_aside_code?: string | null
          solicitation_number?: string | null
          source?: string | null
          status?: string | null
          sub_tier?: string | null
          title?: string
          ui_link?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      opportunity_pipeline: {
        Row: {
          created_at: string | null
          description: string | null
          entity_id: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          probability: number | null
          source: string | null
          stage: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          stage?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          stage?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_pipeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_pipeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_pipeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_pipeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_pipeline_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          completed_at: string | null
          credits_used: number | null
          error_message: string | null
          id: string
          insights: Json | null
          pipeline_id: string | null
          processing_time_ms: number | null
          records_collected: number | null
          sources_queried: string[] | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          insights?: Json | null
          pipeline_id?: string | null
          processing_time_ms?: number | null
          records_collected?: number | null
          sources_queried?: string[] | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          insights?: Json | null
          pipeline_id?: string | null
          processing_time_ms?: number | null
          records_collected?: number | null
          sources_queried?: string[] | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "scheduled_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_members: {
        Row: {
          added_at: string | null
          entity_id: string | null
          id: string
          notes: string | null
          portfolio_id: string | null
        }
        Insert: {
          added_at?: string | null
          entity_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id?: string | null
        }
        Update: {
          added_at?: string | null
          entity_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_topoff_amount: number | null
          auto_topoff_enabled: boolean | null
          auto_topoff_threshold: number | null
          avatar_url: string | null
          created_at: string
          credits_balance: number
          credits_used: number | null
          default_location: Json | null
          full_name: string | null
          id: string
          last_query_at: string | null
          preferences: Json | null
          stripe_customer_id: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_topoff_amount?: number | null
          auto_topoff_enabled?: boolean | null
          auto_topoff_threshold?: number | null
          avatar_url?: string | null
          created_at?: string
          credits_balance?: number
          credits_used?: number | null
          default_location?: Json | null
          full_name?: string | null
          id?: string
          last_query_at?: string | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_topoff_amount?: number | null
          auto_topoff_enabled?: boolean | null
          auto_topoff_threshold?: number | null
          avatar_url?: string | null
          created_at?: string
          credits_balance?: number
          credits_used?: number | null
          default_location?: Json | null
          full_name?: string | null
          id?: string
          last_query_at?: string | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          access_count: number | null
          api_key_id: string | null
          avg_relevance_score: number | null
          cache_hit: boolean | null
          categories_matched: string[] | null
          completed_at: string | null
          created_at: string | null
          credits_used: number | null
          engine_version: string | null
          execution_time_ms: number | null
          features: Json | null
          high_relevance_count: number | null
          id: string
          input_type: string
          insights: Json | null
          is_saved: boolean | null
          last_accessed_at: string | null
          low_relevance_filtered: number | null
          parsed_intent: Json | null
          processing_time_ms: number | null
          prompt: string
          raw_query: string | null
          result_count: number | null
          session_id: string | null
          snapshot: Json | null
          sources_attempted: number | null
          sources_failed: number | null
          sources_queried: string[] | null
          sources_succeeded: number | null
          started_at: string | null
          status: string | null
          title: string | null
          total_records_raw: number | null
          total_results: number | null
          total_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          access_count?: number | null
          api_key_id?: string | null
          avg_relevance_score?: number | null
          cache_hit?: boolean | null
          categories_matched?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          engine_version?: string | null
          execution_time_ms?: number | null
          features?: Json | null
          high_relevance_count?: number | null
          id?: string
          input_type?: string
          insights?: Json | null
          is_saved?: boolean | null
          last_accessed_at?: string | null
          low_relevance_filtered?: number | null
          parsed_intent?: Json | null
          processing_time_ms?: number | null
          prompt: string
          raw_query?: string | null
          result_count?: number | null
          session_id?: string | null
          snapshot?: Json | null
          sources_attempted?: number | null
          sources_failed?: number | null
          sources_queried?: string[] | null
          sources_succeeded?: number | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          total_records_raw?: number | null
          total_results?: number | null
          total_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          access_count?: number | null
          api_key_id?: string | null
          avg_relevance_score?: number | null
          cache_hit?: boolean | null
          categories_matched?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          engine_version?: string | null
          execution_time_ms?: number | null
          features?: Json | null
          high_relevance_count?: number | null
          id?: string
          input_type?: string
          insights?: Json | null
          is_saved?: boolean | null
          last_accessed_at?: string | null
          low_relevance_filtered?: number | null
          parsed_intent?: Json | null
          processing_time_ms?: number | null
          prompt?: string
          raw_query?: string | null
          result_count?: number | null
          session_id?: string | null
          snapshot?: Json | null
          sources_attempted?: number | null
          sources_failed?: number | null
          sources_queried?: string[] | null
          sources_succeeded?: number | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          total_records_raw?: number | null
          total_results?: number | null
          total_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queries_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      query_patterns: {
        Row: {
          avg_processing_time_ms: number | null
          avg_record_count: number | null
          categories: string[]
          created_at: string
          execution_count: number | null
          expansion_priority: number | null
          id: string
          last_expansion_at: string | null
          last_used_at: string
          pattern_hash: string
          prompt_template: string
          should_auto_expand: boolean | null
          sources_used: string[]
          success_rate: number | null
        }
        Insert: {
          avg_processing_time_ms?: number | null
          avg_record_count?: number | null
          categories: string[]
          created_at?: string
          execution_count?: number | null
          expansion_priority?: number | null
          id?: string
          last_expansion_at?: string | null
          last_used_at?: string
          pattern_hash: string
          prompt_template: string
          should_auto_expand?: boolean | null
          sources_used: string[]
          success_rate?: number | null
        }
        Update: {
          avg_processing_time_ms?: number | null
          avg_record_count?: number | null
          categories?: string[]
          created_at?: string
          execution_count?: number | null
          expansion_priority?: number | null
          id?: string
          last_expansion_at?: string | null
          last_used_at?: string
          pattern_hash?: string
          prompt_template?: string
          should_auto_expand?: boolean | null
          sources_used?: string[]
          success_rate?: number | null
        }
        Relationships: []
      }
      query_sources: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          execution_time_ms: number | null
          http_status: number | null
          id: string
          query_id: string
          records_after_filter: number | null
          records_returned: number | null
          response_size_bytes: number | null
          retry_count: number | null
          source_id: string | null
          source_slug: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          http_status?: number | null
          id?: string
          query_id: string
          records_after_filter?: number | null
          records_returned?: number | null
          response_size_bytes?: number | null
          retry_count?: number | null
          source_id?: string | null
          source_slug: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          http_status?: number | null
          id?: string
          query_id?: string
          records_after_filter?: number | null
          records_returned?: number | null
          response_size_bytes?: number | null
          retry_count?: number | null
          source_id?: string | null
          source_slug?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "query_sources_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "api_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      query_understanding: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          parsed_intent: Json
          raw_query: string
          suggested_sources: string[] | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          parsed_intent: Json
          raw_query: string
          suggested_sources?: string[] | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          parsed_intent?: Json
          raw_query?: string
          suggested_sources?: string[] | null
        }
        Relationships: []
      }
      record_feedback: {
        Row: {
          correction_data: Json | null
          created_at: string
          feedback_type: string
          id: string
          record_id: string
          user_id: string
        }
        Insert: {
          correction_data?: Json | null
          created_at?: string
          feedback_type: string
          id?: string
          record_id: string
          user_id: string
        }
        Update: {
          correction_data?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_feedback_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      record_relationships: {
        Row: {
          confidence_score: number | null
          created_at: string
          distance_meters: number | null
          id: string
          metadata: Json | null
          relationship_type: string
          source_record_id: string
          target_record_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          distance_meters?: number | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_record_id: string
          target_record_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          distance_meters?: number | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_record_id?: string
          target_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_relationships_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_relationships_target_record_id_fkey"
            columns: ["target_record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      records: {
        Row: {
          category: string
          collected_at: string
          description: string | null
          display_name: string | null
          entity_id: string | null
          geometry: Json
          id: string
          last_seen_at: string
          name: string
          properties: Json
          quality_score: number | null
          query_id: string | null
          relevance_score: number | null
          seen_count: number
          source_id: string
          source_record_id: string
          user_validations: Json | null
        }
        Insert: {
          category: string
          collected_at?: string
          description?: string | null
          display_name?: string | null
          entity_id?: string | null
          geometry: Json
          id?: string
          last_seen_at?: string
          name: string
          properties?: Json
          quality_score?: number | null
          query_id?: string | null
          relevance_score?: number | null
          seen_count?: number
          source_id: string
          source_record_id: string
          user_validations?: Json | null
        }
        Update: {
          category?: string
          collected_at?: string
          description?: string | null
          display_name?: string | null
          entity_id?: string | null
          geometry?: Json
          id?: string
          last_seen_at?: string
          name?: string
          properties?: Json
          quality_score?: number | null
          query_id?: string | null
          relevance_score?: number | null
          seen_count?: number
          source_id?: string
          source_record_id?: string
          user_validations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "records_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string | null
          reward_amount: number | null
          reward_claimed: boolean | null
          reward_type: string | null
          status: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          reward_type?: string | null
          status?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          reward_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      relationship_types: {
        Row: {
          default_strength: number | null
          description: string | null
          id: string
          is_directional: boolean | null
          name: string
        }
        Insert: {
          default_strength?: number | null
          description?: string | null
          id: string
          is_directional?: boolean | null
          name: string
        }
        Update: {
          default_strength?: number | null
          description?: string | null
          id?: string
          is_directional?: boolean | null
          name?: string
        }
        Relationships: []
      }
      sam_entities: {
        Row: {
          business_types: Json | null
          cage_code: string | null
          congressional_district: string | null
          created_at: string | null
          dba_name: string | null
          entity_structure: string | null
          entity_url: string | null
          expiration_date: string | null
          id: string
          legal_business_name: string | null
          linked_entity_id: string | null
          physical_address_line1: string | null
          physical_city: string | null
          physical_country: string | null
          physical_state: string | null
          physical_zip: string | null
          purpose_of_registration: string | null
          registration_date: string | null
          registration_status: string | null
          source: string | null
          uei: string
          updated_at: string | null
        }
        Insert: {
          business_types?: Json | null
          cage_code?: string | null
          congressional_district?: string | null
          created_at?: string | null
          dba_name?: string | null
          entity_structure?: string | null
          entity_url?: string | null
          expiration_date?: string | null
          id?: string
          legal_business_name?: string | null
          linked_entity_id?: string | null
          physical_address_line1?: string | null
          physical_city?: string | null
          physical_country?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          purpose_of_registration?: string | null
          registration_date?: string | null
          registration_status?: string | null
          source?: string | null
          uei: string
          updated_at?: string | null
        }
        Update: {
          business_types?: Json | null
          cage_code?: string | null
          congressional_district?: string | null
          created_at?: string | null
          dba_name?: string | null
          entity_structure?: string | null
          entity_url?: string | null
          expiration_date?: string | null
          id?: string
          legal_business_name?: string | null
          linked_entity_id?: string | null
          physical_address_line1?: string | null
          physical_city?: string | null
          physical_country?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          purpose_of_registration?: string | null
          registration_date?: string | null
          registration_status?: string | null
          source?: string | null
          uei?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sam_exclusions: {
        Row: {
          active_date: string | null
          cage_code: string | null
          city: string | null
          classification: string | null
          country: string | null
          created_at: string | null
          description: string | null
          excluding_agency: string | null
          exclusion_name: string | null
          exclusion_program: string | null
          exclusion_type: string | null
          id: string
          record_status: string | null
          source: string | null
          state: string | null
          termination_date: string | null
          uei: string | null
        }
        Insert: {
          active_date?: string | null
          cage_code?: string | null
          city?: string | null
          classification?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          excluding_agency?: string | null
          exclusion_name?: string | null
          exclusion_program?: string | null
          exclusion_type?: string | null
          id?: string
          record_status?: string | null
          source?: string | null
          state?: string | null
          termination_date?: string | null
          uei?: string | null
        }
        Update: {
          active_date?: string | null
          cage_code?: string | null
          city?: string | null
          classification?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          excluding_agency?: string | null
          exclusion_name?: string | null
          exclusion_program?: string | null
          exclusion_type?: string | null
          id?: string
          record_status?: string | null
          source?: string | null
          state?: string | null
          termination_date?: string | null
          uei?: string | null
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          last_run_at: string | null
          name: string
          prompt: string
          result_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          last_run_at?: string | null
          name: string
          prompt: string
          result_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          last_run_at?: string | null
          name?: string
          prompt?: string
          result_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          is_public: boolean | null
          last_result_count: number | null
          last_run: string | null
          name: string
          notify_on_change: boolean | null
          public_slug: string | null
          query: string
          schedule: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          last_result_count?: number | null
          last_run?: string | null
          name: string
          notify_on_change?: boolean | null
          public_slug?: string | null
          query: string
          schedule?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          last_result_count?: number | null
          last_run?: string | null
          name?: string
          notify_on_change?: boolean | null
          public_slug?: string | null
          query?: string
          schedule?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sbir_awards: {
        Row: {
          abstract: string | null
          agency: string | null
          award_amount: number | null
          award_link: string | null
          award_title: string | null
          award_year: number | null
          branch: string | null
          city: string | null
          company_url: string | null
          contract: string | null
          created_at: string | null
          firm: string
          hubzone_owned: string | null
          id: string
          number_employees: number | null
          phase: string | null
          pi_email: string | null
          pi_name: string | null
          poc_email: string | null
          poc_name: string | null
          poc_phone: string | null
          program: string | null
          socially_disadvantaged: string | null
          source: string | null
          state: string | null
          uei: string | null
          updated_at: string | null
          women_owned: string | null
          zip: string | null
        }
        Insert: {
          abstract?: string | null
          agency?: string | null
          award_amount?: number | null
          award_link?: string | null
          award_title?: string | null
          award_year?: number | null
          branch?: string | null
          city?: string | null
          company_url?: string | null
          contract?: string | null
          created_at?: string | null
          firm: string
          hubzone_owned?: string | null
          id?: string
          number_employees?: number | null
          phase?: string | null
          pi_email?: string | null
          pi_name?: string | null
          poc_email?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          program?: string | null
          socially_disadvantaged?: string | null
          source?: string | null
          state?: string | null
          uei?: string | null
          updated_at?: string | null
          women_owned?: string | null
          zip?: string | null
        }
        Update: {
          abstract?: string | null
          agency?: string | null
          award_amount?: number | null
          award_link?: string | null
          award_title?: string | null
          award_year?: number | null
          branch?: string | null
          city?: string | null
          company_url?: string | null
          contract?: string | null
          created_at?: string | null
          firm?: string
          hubzone_owned?: string | null
          id?: string
          number_employees?: number | null
          phase?: string | null
          pi_email?: string | null
          pi_name?: string | null
          poc_email?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          program?: string | null
          socially_disadvantaged?: string | null
          source?: string | null
          state?: string | null
          uei?: string | null
          updated_at?: string | null
          women_owned?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      scheduled_pipelines: {
        Row: {
          config: Json | null
          created_at: string
          cron_expression: string
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          prompt: string
          run_count: number | null
          success_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          cron_expression: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          prompt: string
          run_count?: number | null
          success_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          cron_expression?: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          prompt?: string
          run_count?: number | null
          success_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          format: string | null
          id: string
          is_active: boolean | null
          last_sent: string | null
          name: string
          next_send: string | null
          recipients: string[] | null
          report_type: string
          schedule: string
          time_of_day: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          name: string
          next_send?: string | null
          recipients?: string[] | null
          report_type: string
          schedule: string
          time_of_day?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          name?: string
          next_send?: string | null
          recipients?: string[] | null
          report_type?: string
          schedule?: string
          time_of_day?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      schema_registry: {
        Row: {
          auto_generated: boolean | null
          columns: Json
          created_at: string
          description: string | null
          id: string
          row_count: number | null
          sample_queries: string[] | null
          table_name: string
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean | null
          columns: Json
          created_at?: string
          description?: string | null
          id?: string
          row_count?: number | null
          sample_queries?: string[] | null
          table_name: string
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean | null
          columns?: Json
          created_at?: string
          description?: string | null
          id?: string
          row_count?: number | null
          sample_queries?: string[] | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          filters: Json | null
          id: string
          query: string
          result_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          filters?: Json | null
          id?: string
          query: string
          result_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          filters?: Json | null
          id?: string
          query?: string
          result_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          query: string | null
          response_time_ms: number | null
          result_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          result_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          result_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      shared_links: {
        Row: {
          created_at: string | null
          data: Json
          expires_at: string | null
          id: string
          is_active: boolean | null
          link_type: string
          password_hash: string | null
          slug: string
          title: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          link_type: string
          password_hash?: string | null
          slug: string
          title?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string
          password_hash?: string | null
          slug?: string
          title?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      source_discoveries: {
        Row: {
          backoff_multiplier: number | null
          circuit_breaker_blocked: boolean | null
          confidence_score: number | null
          created_at: string
          error_count: number | null
          error_message: string | null
          estimated_value_score: number | null
          generated_collector_id: string | null
          generation_attempts: number | null
          id: string
          inferred_categories: string[]
          inferred_keywords: string[]
          last_error_at: string | null
          last_generation_at: string | null
          priority: number | null
          processed_at: string | null
          retry_after: string | null
          status: string | null
          target_api_name: string
          target_api_url: string | null
          target_description: string | null
          target_documentation_url: string | null
          trigger_id: string | null
          trigger_prompt: string | null
          trigger_type: string
          updated_at: string
          validation_result: Json | null
        }
        Insert: {
          backoff_multiplier?: number | null
          circuit_breaker_blocked?: boolean | null
          confidence_score?: number | null
          created_at?: string
          error_count?: number | null
          error_message?: string | null
          estimated_value_score?: number | null
          generated_collector_id?: string | null
          generation_attempts?: number | null
          id?: string
          inferred_categories?: string[]
          inferred_keywords?: string[]
          last_error_at?: string | null
          last_generation_at?: string | null
          priority?: number | null
          processed_at?: string | null
          retry_after?: string | null
          status?: string | null
          target_api_name: string
          target_api_url?: string | null
          target_description?: string | null
          target_documentation_url?: string | null
          trigger_id?: string | null
          trigger_prompt?: string | null
          trigger_type?: string
          updated_at?: string
          validation_result?: Json | null
        }
        Update: {
          backoff_multiplier?: number | null
          circuit_breaker_blocked?: boolean | null
          confidence_score?: number | null
          created_at?: string
          error_count?: number | null
          error_message?: string | null
          estimated_value_score?: number | null
          generated_collector_id?: string | null
          generation_attempts?: number | null
          id?: string
          inferred_categories?: string[]
          inferred_keywords?: string[]
          last_error_at?: string | null
          last_generation_at?: string | null
          priority?: number | null
          processed_at?: string | null
          retry_after?: string | null
          status?: string | null
          target_api_name?: string
          target_api_url?: string | null
          target_description?: string | null
          target_documentation_url?: string | null
          trigger_id?: string | null
          trigger_prompt?: string | null
          trigger_type?: string
          updated_at?: string
          validation_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "source_discoveries_generated_collector_id_fkey"
            columns: ["generated_collector_id"]
            isOneToOne: false
            referencedRelation: "dynamic_collectors"
            referencedColumns: ["id"]
          },
        ]
      }
      source_performance: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string
          failed_requests: number | null
          id: string
          is_active: boolean | null
          last_error_message: string | null
          last_failure_at: string | null
          last_success_at: string | null
          reliability_score: number | null
          source_id: string
          source_name: string
          successful_requests: number | null
          total_records_collected: number | null
          total_requests: number | null
          updated_at: string
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string
          failed_requests?: number | null
          id?: string
          is_active?: boolean | null
          last_error_message?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          reliability_score?: number | null
          source_id: string
          source_name: string
          successful_requests?: number | null
          total_records_collected?: number | null
          total_requests?: number | null
          updated_at?: string
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string
          failed_requests?: number | null
          id?: string
          is_active?: boolean | null
          last_error_message?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          reliability_score?: number | null
          source_id?: string
          source_name?: string
          successful_requests?: number | null
          total_records_collected?: number | null
          total_requests?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subawards: {
        Row: {
          awarding_agency: string | null
          awarding_sub_agency: string | null
          created_at: string | null
          id: string
          naics_code: string | null
          prime_award_id: string | null
          prime_recipient_name: string | null
          prime_recipient_uei: string | null
          source: string | null
          sub_awardee_city: string | null
          sub_awardee_country: string | null
          sub_awardee_name: string | null
          sub_awardee_state: string | null
          sub_awardee_zip: string | null
          subaward_action_date: string | null
          subaward_amount: number | null
          subaward_description: string | null
          subaward_number: string | null
        }
        Insert: {
          awarding_agency?: string | null
          awarding_sub_agency?: string | null
          created_at?: string | null
          id?: string
          naics_code?: string | null
          prime_award_id?: string | null
          prime_recipient_name?: string | null
          prime_recipient_uei?: string | null
          source?: string | null
          sub_awardee_city?: string | null
          sub_awardee_country?: string | null
          sub_awardee_name?: string | null
          sub_awardee_state?: string | null
          sub_awardee_zip?: string | null
          subaward_action_date?: string | null
          subaward_amount?: number | null
          subaward_description?: string | null
          subaward_number?: string | null
        }
        Update: {
          awarding_agency?: string | null
          awarding_sub_agency?: string | null
          created_at?: string | null
          id?: string
          naics_code?: string | null
          prime_award_id?: string | null
          prime_recipient_name?: string | null
          prime_recipient_uei?: string | null
          source?: string | null
          sub_awardee_city?: string | null
          sub_awardee_country?: string | null
          sub_awardee_name?: string | null
          sub_awardee_state?: string | null
          sub_awardee_zip?: string | null
          subaward_action_date?: string | null
          subaward_amount?: number | null
          subaward_description?: string | null
          subaward_number?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          alerts_limit: number | null
          api_access: boolean | null
          custom_integrations: boolean | null
          description: string | null
          export_pdf: boolean | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          priority_support: boolean | null
          saved_searches_limit: number | null
          searches_per_month: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          team_members: number | null
        }
        Insert: {
          alerts_limit?: number | null
          api_access?: boolean | null
          custom_integrations?: boolean | null
          description?: string | null
          export_pdf?: boolean | null
          features?: Json | null
          id: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          saved_searches_limit?: number | null
          searches_per_month?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          team_members?: number | null
        }
        Update: {
          alerts_limit?: number | null
          api_access?: boolean | null
          custom_integrations?: boolean | null
          description?: string | null
          export_pdf?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          saved_searches_limit?: number | null
          searches_per_month?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          team_members?: number | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          component: string
          created_at: string | null
          details: Json | null
          id: string
          level: string
          message: string
          query_id: string | null
          source_id: string | null
          stack_trace: string | null
        }
        Insert: {
          component: string
          created_at?: string | null
          details?: Json | null
          id?: string
          level: string
          message: string
          query_id?: string | null
          source_id?: string | null
          stack_trace?: string | null
        }
        Update: {
          component?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message?: string
          query_id?: string | null
          source_id?: string | null
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "api_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      system_resilience: {
        Row: {
          check_timestamp: string
          component: string
          error_count: number | null
          id: string
          last_error: string | null
          latency_ms: number | null
          metadata: Json | null
          recovery_attempts: number | null
          status: string
        }
        Insert: {
          check_timestamp?: string
          component: string
          error_count?: number | null
          id?: string
          last_error?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          recovery_attempts?: number | null
          status?: string
        }
        Update: {
          check_timestamp?: string
          component?: string
          error_count?: number | null
          id?: string
          last_error?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          recovery_attempts?: number | null
          status?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          inviter_id: string | null
          role: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          inviter_id?: string | null
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          inviter_id?: string | null
          role?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teaming_partners: {
        Row: {
          discovered_at: string | null
          entity_id: string | null
          id: string
          partner_entity_id: string | null
          shared_agencies: number | null
          strength_score: number | null
        }
        Insert: {
          discovered_at?: string | null
          entity_id?: string | null
          id?: string
          partner_entity_id?: string | null
          shared_agencies?: number | null
          strength_score?: number | null
        }
        Update: {
          discovered_at?: string | null
          entity_id?: string | null
          id?: string
          partner_entity_id?: string | null
          shared_agencies?: number | null
          strength_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teaming_partners_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_partner_entity_id_fkey"
            columns: ["partner_entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_partner_entity_id_fkey"
            columns: ["partner_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_partner_entity_id_fkey"
            columns: ["partner_entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_partner_entity_id_fkey"
            columns: ["partner_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaming_partners_partner_entity_id_fkey"
            columns: ["partner_entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          settings: Json | null
          subscription_tier: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json | null
          subscription_tier?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      user_alerts: {
        Row: {
          alert_type: string
          channels: Json | null
          conditions: Json
          created_at: string | null
          entity_id: string | null
          id: string
          is_active: boolean | null
          last_triggered: string | null
          trigger_count: number | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          channels?: Json | null
          conditions: Json
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          trigger_count?: number | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          channels?: Json | null
          conditions?: Json
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          trigger_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string | null
          feedback_type: string
          id: string
          message: string
          metadata: Json | null
          page: string | null
          screenshot_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_type: string
          id?: string
          message: string
          metadata?: Json | null
          page?: string | null
          screenshot_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          page?: string | null
          screenshot_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          company: string | null
          created_at: string | null
          credits: number | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          job_title: string | null
          onboarding_completed: boolean | null
          phone: string | null
          preferences: Json | null
          referral_code: string | null
          referred_by: string | null
          searches_limit: number | null
          searches_this_month: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          credits?: number | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          job_title?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          searches_limit?: number | null
          searches_this_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          credits?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          job_title?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          searches_limit?: number | null
          searches_this_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacuum_runs: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          errors: Json | null
          id: string
          results: Json | null
          started_at: string | null
          status: string | null
          total_errors: number | null
          total_loaded: number | null
          trigger: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          errors?: Json | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          total_errors?: number | null
          total_loaded?: number | null
          trigger?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          errors?: Json | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          total_errors?: number | null
          total_loaded?: number | null
          trigger?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          event: string
          id: string
          payload: Json | null
          response_body: string | null
          response_status: number | null
          success: boolean | null
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          event: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          event?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered: string | null
          name: string
          secret: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          events: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          name: string
          secret?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          name?: string
          secret?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      win_predictions: {
        Row: {
          entity_id: string | null
          features: Json | null
          id: string
          opportunity_id: string | null
          predicted_at: string | null
          predicted_win_rate: number | null
        }
        Insert: {
          entity_id?: string | null
          features?: Json | null
          id?: string
          opportunity_id?: string | null
          predicted_at?: string | null
          predicted_win_rate?: number | null
        }
        Update: {
          entity_id?: string | null
          features?: Json | null
          id?: string
          opportunity_id?: string | null
          predicted_at?: string | null
          predicted_win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "win_predictions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "core_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "win_predictions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_360_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "win_predictions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "high_value_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "win_predictions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "mv_top_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "win_predictions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "top_entities_mv"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      entity_360_profiles: {
        Row: {
          canonical_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          data_quality_score: number | null
          entity_type: string | null
          fact_count: number | null
          health_score: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          opportunity_score: number | null
          relationship_count: number | null
          risk_score: number | null
          source_count: number | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          entity_type?: string | null
          fact_count?: never
          health_score?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          opportunity_score?: number | null
          relationship_count?: never
          risk_score?: number | null
          source_count?: number | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          entity_type?: string | null
          fact_count?: never
          health_score?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          opportunity_score?: number | null
          relationship_count?: never
          risk_score?: number | null
          source_count?: number | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      high_value_opportunities: {
        Row: {
          canonical_name: string | null
          city: string | null
          data_quality_score: number | null
          entity_type: string | null
          id: string | null
          opportunity_score: number | null
          state: string | null
        }
        Insert: {
          canonical_name?: string | null
          city?: string | null
          data_quality_score?: number | null
          entity_type?: string | null
          id?: string | null
          opportunity_score?: number | null
          state?: string | null
        }
        Update: {
          canonical_name?: string | null
          city?: string | null
          data_quality_score?: number | null
          entity_type?: string | null
          id?: string | null
          opportunity_score?: number | null
          state?: string | null
        }
        Relationships: []
      }
      infinite_algorithm_status: {
        Row: {
          avg_opportunity_score: number | null
          completed_24h: number | null
          entities_expanded_24h: number | null
          facts_enriched_24h: number | null
          insights_generated_24h: number | null
          last_cycle: string | null
          last_cycle_duration: number | null
          queue_pending: number | null
          queue_processing: number | null
          relationships_discovered_24h: number | null
          total_entities: number | null
          total_facts: number | null
          total_insights: number | null
          total_relationships: number | null
        }
        Relationships: []
      }
      mv_agency_spending: {
        Row: {
          avg_value: number | null
          awarding_agency: string | null
          contract_count: number | null
          states: string[] | null
          total_value: number | null
          unique_vendors: number | null
        }
        Relationships: []
      }
      mv_state_spending: {
        Row: {
          agencies: number | null
          avg_value: number | null
          contract_count: number | null
          state: string | null
          total_value: number | null
          unique_vendors: number | null
        }
        Relationships: []
      }
      mv_top_contractors: {
        Row: {
          avg_contract_value: number | null
          canonical_name: string | null
          city: string | null
          contract_count: number | null
          entity_type: string | null
          id: string | null
          opportunity_score: number | null
          state: string | null
          total_value: number | null
        }
        Relationships: []
      }
      ocean_health_current: {
        Row: {
          active_sources: number | null
          avg_entity_quality: number | null
          contracts_last_hour: number | null
          coverage_score: number | null
          degraded_sources: number | null
          entities_last_hour: number | null
          entities_with_cage: number | null
          entities_with_uei: number | null
          failed_sources: number | null
          freshness_score: number | null
          healthy_sources: number | null
          id: string | null
          overall_health_score: number | null
          pipeline_health_score: number | null
          records_last_hour: number | null
          snapshot_at: string | null
          total_contract_value: number | null
          total_contracts: number | null
          total_entities: number | null
          total_facts: number | null
          total_grants: number | null
          total_insights: number | null
          total_opportunities: number | null
          total_relationships: number | null
        }
        Relationships: []
      }
      realtime_dashboard: {
        Row: {
          active_sources: number | null
          queue_depth: number | null
          total_entities: number | null
          total_facts: number | null
          total_records: number | null
          total_relationships: number | null
        }
        Relationships: []
      }
      top_entities_mv: {
        Row: {
          canonical_name: string | null
          contract_count: number | null
          contract_velocity: number | null
          entity_type: string | null
          grant_success: number | null
          health_score: number | null
          id: string | null
          state: string | null
          total_contract_value: number | null
          trend_direction: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_stripe_payment_id?: string
          p_transaction_type: Database["public"]["Enums"]["transaction_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      add_knowledge_edge: {
        Args: {
          p_evidence?: Json
          p_object_id: string
          p_object_type: string
          p_predicate: string
          p_subject_id: string
          p_subject_type: string
          p_weight?: number
        }
        Returns: string
      }
      analyze_data_gaps: {
        Args: never
        Returns: {
          gap_description: string
          gap_type: string
          severity: number
          target_category: string
          target_keywords: string[]
        }[]
      }
      analyze_query_intent: { Args: { p_query: string }; Returns: Json }
      auto_merge_duplicates: { Args: never; Returns: number }
      build_unified_context: { Args: { p_query: string }; Returns: Json }
      cache_location: {
        Args: {
          p_admin_level?: string
          p_bbox?: Json
          p_center: Json
          p_city?: string
          p_country?: string
          p_county?: string
          p_name: string
          p_state?: string
        }
        Returns: string
      }
      calculate_crawler_next_run: {
        Args: { p_crawler_id: string }
        Returns: string
      }
      calculate_network_influence: { Args: never; Returns: undefined }
      calculate_next_run: {
        Args: { p_cron: string; p_from?: string }
        Returns: string
      }
      calculate_opportunity_scores: { Args: never; Returns: undefined }
      calculate_retry_delay: {
        Args: { p_attempt: number; p_base_delay?: number }
        Returns: unknown
      }
      calculate_state_market_concentration: {
        Args: never
        Returns: {
          category: string
          entity_count: number
          hhi: number
          state: string
          total_value: number
        }[]
      }
      capture_health_snapshot: { Args: never; Returns: string }
      capture_ocean_health: { Args: never; Returns: string }
      check_circuit_breaker: {
        Args: { p_domain: string }
        Returns: {
          is_open: boolean
          retry_after: string
          state: string
        }[]
      }
      complete_query: {
        Args: {
          p_categories_matched: string[]
          p_credits_used?: number
          p_features: Json
          p_insights: Json
          p_processing_time_ms: number
          p_query_id: string
          p_result_count: number
          p_sources_queried: string[]
        }
        Returns: undefined
      }
      compute_entity_risk: {
        Args: { p_entity_name: string }
        Returns: {
          concentration_risk: number
          exclusion_status: string
          recompete_exposure: number
          registration_status: string
          risk_level: string
          risk_score: number
          top_agency_pct: number
        }[]
      }
      compute_market_concentration: {
        Args: { p_agency?: string; p_naics?: string; p_state?: string }
        Returns: {
          concentration_level: string
          contract_count: number
          contractor_count: number
          hhi_score: number
          market_label: string
          top_contractors: Json
          total_value: number
        }[]
      }
      compute_market_opportunity: {
        Args: { p_naics?: string; p_state?: string }
        Returns: {
          active_contractors: number
          active_opportunities: number
          concentration: string
          hhi: number
          opportunity_score: number
          opportunity_value: number
          recompete_count: number
          recompete_value: number
          sbir_awards_count: number
          sbir_value: number
          total_contract_value: number
        }[]
      }
      count_unresolved_records: { Args: never; Returns: number }
      create_record_relationship: {
        Args: {
          p_confidence?: number
          p_distance?: number
          p_metadata?: Json
          p_relationship_type: string
          p_source_id: string
          p_target_id: string
        }
        Returns: string
      }
      create_shared_link: {
        Args: {
          p_data: Json
          p_expires_in_days?: number
          p_link_type: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      deduct_credits: {
        Args: {
          p_amount: number
          p_dataset_id?: string
          p_description?: string
          p_user_id: string
        }
        Returns: boolean
      }
      derive_relationships: { Args: never; Returns: number }
      detect_anomalies: {
        Args: { lookback_days?: number; threshold_multiplier?: number }
        Returns: {
          anomaly_type: string
          confidence: number
          description: string
          details: Json
          entity_id: string
          entity_name: string
        }[]
      }
      detect_teaming_pairs: {
        Args: { p_agency?: string; p_limit?: number; p_naics?: string }
        Returns: {
          co_occurrence_score: number
          combined_value: number
          entity_a: string
          entity_b: string
          shared_agencies: string[]
          shared_agency_count: number
        }[]
      }
      discover_competitors: { Args: never; Returns: number }
      discover_geographic_clusters: { Args: never; Returns: number }
      discover_industry_clusters: { Args: never; Returns: number }
      discover_relationships: { Args: never; Returns: number }
      discover_transitive_relationships: {
        Args: { limit_count?: number; min_strength?: number }
        Returns: {
          from_entity_id: string
          inferred_strength: number
          to_entity_id: string
          via_entity_id: string
          via_type: string
        }[]
      }
      execute_nl_query: { Args: { p_sql: string }; Returns: Json }
      find_competitors: {
        Args: { p_entity_id: string; p_limit?: number }
        Returns: {
          competitor_id: string
          competitor_name: string
          entity_type: string
          opportunity_score: number
          shared_categories: number
          similarity_score: number
        }[]
      }
      find_low_coverage_areas: {
        Args: never
        Returns: {
          area_name: string
          categories: string[]
          record_count: number
        }[]
      }
      find_nearby_entities_by_name: {
        Args: {
          p_lat: number
          p_lng: number
          p_name: string
          p_radius_km?: number
        }
        Returns: {
          canonical_name: string
          distance_km: number
          id: string
          similarity: number
        }[]
      }
      find_potential_duplicates: {
        Args: { p_entity_id: string; p_threshold?: number }
        Returns: {
          duplicate_id: string
          duplicate_name: string
          score: number
          state: string
          uei: string
        }[]
      }
      find_similar_entities: {
        Args: {
          search_name: string
          search_type?: string
          similarity_threshold?: number
        }
        Returns: {
          canonical_name: string
          entity_id: string
          entity_type: string
          similarity: number
        }[]
      }
      find_unconnected_same_city_entities: {
        Args: { limit_count?: number }
        Returns: {
          city: string
          entity1_id: string
          entity2_id: string
        }[]
      }
      find_unconnected_same_type_state: {
        Args: { limit_count?: number }
        Returns: {
          entity_type: string
          entity1_id: string
          entity2_id: string
          state: string
        }[]
      }
      find_underexplored_areas: {
        Args: never
        Returns: {
          entity_count: number
          missing_categories: string[]
          name: string
          query_count: number
        }[]
      }
      generate_ai_narrative: {
        Args: { p_context: Json; p_template_type: string }
        Returns: string
      }
      generate_all_insights: { Args: never; Returns: Json }
      generate_entity_briefing: {
        Args: { p_entity_id: string }
        Returns: string
      }
      generate_entity_profile: {
        Args: { p_entity_id: string }
        Returns: string
      }
      generate_insights: { Args: never; Returns: number }
      generate_intelligence_alerts: { Args: never; Returns: number }
      generate_market_insights: {
        Args: never
        Returns: {
          data: Json
          description: string
          market_category: string
          market_state: string
        }[]
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_agency_buying_patterns: {
        Args: { p_agency?: string; p_naics?: string }
        Returns: {
          agency: string
          contract_count: number
          fiscal_quarter: string
          is_peak: boolean
          pct_of_annual: number
          quarter_label: string
          total_value: number
        }[]
      }
      get_competition_intelligence: {
        Args: { p_agency?: string; p_naics?: string; p_state?: string }
        Returns: {
          avg_offers: number
          competition_breakdown: Json
          full_open_pct: number
          offers_distribution: Json
          sole_source_pct: number
          total_awards: number
          total_value: number
        }[]
      }
      get_entity_360:
        | { Args: { p_entity_id: string }; Returns: Json }
        | {
            Args: { p_name: string }
            Returns: {
              avg_offers: number
              contract_count: number
              contract_value: number
              disadvantaged: string
              entity_name: string
              exclusion_detail: string
              fpds_count: number
              grant_count: number
              grant_value: number
              hubzone: string
              idv_count: number
              idv_value: number
              is_excluded: boolean
              naics_codes: string[]
              primes_to_count: number
              primes_to_value: number
              sam_business_types: Json
              sam_cage: string
              sam_entity_structure: string
              sam_expiration: string
              sam_status: string
              sam_uei: string
              sbir_count: number
              sbir_phases: string[]
              sbir_value: number
              sole_source_pct: number
              states: string[]
              subs_for_count: number
              subs_for_value: number
              top_agencies: Json
              top_agency_pct: number
              women_owned: string
            }[]
          }
      get_entity_network: {
        Args: { p_depth?: number; p_entity_id: string; p_min_strength?: number }
        Returns: Json
      }
      get_fact_poor_entities: {
        Args: {
          limit_count?: number
          min_facts?: number
          min_opportunity_score?: number
        }
        Returns: {
          canonical_name: string
          entity_type: string
          fact_count: number
          id: string
          opportunity_score: number
        }[]
      }
      get_flywheel_health: { Args: never; Returns: Json }
      get_matched_sources: {
        Args: { p_query: string }
        Returns: {
          base_url: string
          categories: string[]
          id: string
          keywords: string[]
          match_score: number
          name: string
          priority: number
          slug: string
        }[]
      }
      get_platform_stats: {
        Args: never
        Returns: {
          data_sources: number
          last_vacuum_at: string
          last_vacuum_loaded: number
          total_contract_value: number
          total_contracts: number
          total_entities: number
          total_exclusions: number
          total_fpds: number
          total_grant_value: number
          total_grants: number
          total_idv_value: number
          total_idvs: number
          total_nsf: number
          total_opportunities: number
          total_records: number
          total_relationships: number
          total_sam_entities: number
          total_sbir: number
          total_subawards: number
        }[]
      }
      get_recompete_pipeline: {
        Args: {
          p_min_value?: number
          p_months_ahead?: number
          p_state?: string
        }
        Returns: {
          award_amount: number
          award_id: string
          awarding_agency: string
          contract_id: string
          days_until_expiry: number
          end_date: string
          naics_code: string
          pop_state: string
          recipient_name: string
          urgency: string
        }[]
      }
      get_sbir_landscape: {
        Args: { p_agency?: string; p_state?: string }
        Returns: {
          agency_breakdown: Json
          diversity_stats: Json
          phase_breakdown: Json
          top_firms: Json
          total_awards: number
          total_value: number
        }[]
      }
      get_set_aside_analysis: {
        Args: { p_naics?: string; p_set_aside?: string; p_state?: string }
        Returns: {
          avg_contract_value: number
          contract_count: number
          contractor_count: number
          set_aside: string
          top_contractors: Json
          total_value: number
        }[]
      }
      get_system_health: {
        Args: never
        Returns: {
          entities: number
          fact_density: number
          facts: number
          health_score: number
          healthy_sources: number
          insights: number
          queue_depth: number
          relationships: number
          resolution_rate: number
          system_status: string
        }[]
      }
      get_system_stats: {
        Args: never
        Returns: {
          active_sources: number
          entities_with_facts: number
          pending_queue: number
          resolution_rate: number
          total_entities: number
          total_facts: number
          total_insights: number
          total_records: number
          total_relationships: number
        }[]
      }
      get_teaming_network: {
        Args: { p_entity_name?: string; p_limit?: number; p_state?: string }
        Returns: {
          agencies: string[]
          prime_name: string
          relationship: string
          sub_count: number
          sub_name: string
          total_sub_value: number
        }[]
      }
      get_under_explored_entities: {
        Args: { limit_count?: number; min_relationships?: number }
        Returns: {
          canonical_name: string
          entity_type: string
          fact_count: number
          id: string
          opportunity_score: number
          relationship_count: number
          state: string
        }[]
      }
      get_user_dashboard: { Args: { p_user_id: string }; Returns: Json }
      get_velocity_signals: {
        Args: { p_limit?: number; p_months?: number; p_state?: string }
        Returns: {
          contract_growth_pct: number
          entity_name: string
          prior_contracts: number
          prior_value: number
          recent_contracts: number
          recent_value: number
          signal: string
          value_growth_pct: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_query_access_count: {
        Args: { query_uuid: string }
        Returns: number
      }
      increment_search_count: { Args: { p_user_id: string }; Returns: boolean }
      log_kraken_crawl: {
        Args: {
          p_crawler_type: string
          p_duration_ms?: number
          p_entities?: number
          p_errors?: Json
          p_facts?: number
          p_metadata?: Json
          p_records?: number
          p_relationships?: number
        }
        Returns: string
      }
      log_query: {
        Args: {
          p_api_key_id?: string
          p_input_type?: string
          p_prompt: string
          p_user_id: string
        }
        Returns: string
      }
      log_system_event: {
        Args: {
          p_component: string
          p_details?: Json
          p_level: string
          p_message: string
          p_query_id?: string
          p_source_id?: string
        }
        Returns: string
      }
      mark_duplicates: { Args: { p_query_id: string }; Returns: number }
      mega_search: {
        Args: {
          p_entity_types?: string[]
          p_limit?: number
          p_max_amount?: number
          p_min_amount?: number
          p_query: string
          p_states?: string[]
        }
        Returns: {
          description: string
          entity_type: string
          id: string
          name: string
          opportunity_score: number
          result_type: string
          state: string
          total_value: number
        }[]
      }
      ml_duplicate_score: {
        Args: {
          p_name_a: string
          p_name_b: string
          p_state_a: string
          p_state_b: string
          p_uei_a: string
          p_uei_b: string
        }
        Returns: number
      }
      move_to_dead_letter: {
        Args: { p_discovery_id: string; p_reason: string }
        Returns: string
      }
      queue_discovery: {
        Args: {
          p_confidence?: number
          p_inferred_categories?: string[]
          p_inferred_keywords?: string[]
          p_priority?: number
          p_target_api_name?: string
          p_target_api_url?: string
          p_target_description?: string
          p_trigger_id?: string
          p_trigger_prompt?: string
          p_trigger_type: string
        }
        Returns: string
      }
      queue_ingestion_jobs: { Args: never; Returns: number }
      queue_kraken_discovery: {
        Args: {
          p_context?: Json
          p_discovery_type: string
          p_priority?: number
          p_target_query: Json
          p_target_source: string
        }
        Returns: string
      }
      recalculate_opportunity_scores: {
        Args: { lookback_days?: number }
        Returns: number
      }
      record_circuit_result: {
        Args: { p_domain: string; p_success: boolean }
        Returns: string
      }
      record_flywheel_metric: {
        Args: {
          p_dimensions?: Json
          p_name: string
          p_type: string
          p_value: number
        }
        Returns: string
      }
      record_master_dataset_stats: { Args: never; Returns: string }
      refresh_all_materialized_views: { Args: never; Returns: undefined }
      refresh_top_entities: { Args: never; Returns: undefined }
      reset_monthly_search_counts: { Args: never; Returns: undefined }
      run_all_discovery: { Args: never; Returns: Json }
      run_full_ocean_cycle: { Args: never; Returns: Json }
      score_all_entities: { Args: never; Returns: number }
      semantx_search: {
        Args: {
          p_limit?: number
          p_max_value?: number
          p_min_value?: number
          p_query: string
          p_states?: string[]
          p_types?: string[]
        }
        Returns: {
          city: string
          description: string
          entity_type: string
          id: string
          name: string
          relevance: number
          result_type: string
          score: number
          state: string
          value: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      smart_resolve_entity: {
        Args: {
          p_cage_code?: string
          p_city?: string
          p_duns?: string
          p_ein?: string
          p_name: string
          p_source?: string
          p_state?: string
          p_type?: string
          p_uei?: string
        }
        Returns: string
      }
      sync_all_entity_stats: { Args: never; Returns: undefined }
      sync_entity_contract_stats: {
        Args: { p_entity_id: string }
        Returns: undefined
      }
      update_discovery_status: {
        Args: {
          p_discovery_id: string
          p_error_message?: string
          p_generated_collector_id?: string
          p_status: string
          p_validation_result?: Json
        }
        Returns: boolean
      }
      update_intelligence_metrics: { Args: never; Returns: undefined }
      update_query_stats: { Args: { p_query_id: string }; Returns: undefined }
      update_source_health: {
        Args: {
          p_response_ms?: number
          p_source_name: string
          p_success: boolean
        }
        Returns: undefined
      }
      update_source_performance: {
        Args: {
          p_error_message?: string
          p_records_collected: number
          p_response_time_ms: number
          p_source_id: string
          p_source_name: string
          p_success: boolean
        }
        Returns: undefined
      }
      upsert_fused_record: {
        Args: {
          p_base_record_id: string
          p_properties: Json
          p_sources: string[]
        }
        Returns: string
      }
      upsert_record: {
        Args: {
          p_category: string
          p_description: string
          p_geometry: Json
          p_name: string
          p_properties: Json
          p_source_id: string
          p_source_record_id: string
        }
        Returns: string
      }
      validate_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          is_valid: boolean
          key_id: string
          owner_id: string
          rate_limited: boolean
          scopes: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      dataset_status: "pending" | "processing" | "complete" | "failed"
      transaction_type: "purchase" | "usage" | "bonus" | "refund"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      dataset_status: ["pending", "processing", "complete", "failed"],
      transaction_type: ["purchase", "usage", "bonus", "refund"],
    },
  },
} as const
