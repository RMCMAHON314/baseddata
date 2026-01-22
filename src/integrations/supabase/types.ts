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
          updated_at?: string
          user_id?: string
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
      profiles: {
        Row: {
          auto_topoff_amount: number | null
          auto_topoff_enabled: boolean | null
          auto_topoff_threshold: number | null
          avatar_url: string | null
          created_at: string
          credits_balance: number
          full_name: string | null
          id: string
          stripe_customer_id: string | null
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
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
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
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      query_patterns: {
        Row: {
          avg_processing_time_ms: number | null
          avg_record_count: number | null
          categories: string[]
          created_at: string
          execution_count: number | null
          id: string
          last_used_at: string
          pattern_hash: string
          prompt_template: string
          sources_used: string[]
          success_rate: number | null
        }
        Insert: {
          avg_processing_time_ms?: number | null
          avg_record_count?: number | null
          categories: string[]
          created_at?: string
          execution_count?: number | null
          id?: string
          last_used_at?: string
          pattern_hash: string
          prompt_template: string
          sources_used: string[]
          success_rate?: number | null
        }
        Update: {
          avg_processing_time_ms?: number | null
          avg_record_count?: number | null
          categories?: string[]
          created_at?: string
          execution_count?: number | null
          id?: string
          last_used_at?: string
          pattern_hash?: string
          prompt_template?: string
          sources_used?: string[]
          success_rate?: number | null
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
          geometry: Json
          id: string
          last_seen_at: string
          name: string
          properties: Json
          quality_score: number | null
          seen_count: number
          source_id: string
          source_record_id: string
          user_validations: Json | null
        }
        Insert: {
          category: string
          collected_at?: string
          description?: string | null
          geometry: Json
          id?: string
          last_seen_at?: string
          name: string
          properties?: Json
          quality_score?: number | null
          seen_count?: number
          source_id: string
          source_record_id: string
          user_validations?: Json | null
        }
        Update: {
          category?: string
          collected_at?: string
          description?: string | null
          geometry?: Json
          id?: string
          last_seen_at?: string
          name?: string
          properties?: Json
          quality_score?: number | null
          seen_count?: number
          source_id?: string
          source_record_id?: string
          user_validations?: Json | null
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
    }
    Views: {
      [_ in never]: never
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
      calculate_next_run: {
        Args: { p_cron: string; p_from?: string }
        Returns: string
      }
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
      deduct_credits: {
        Args: {
          p_amount: number
          p_dataset_id?: string
          p_description?: string
          p_user_id: string
        }
        Returns: boolean
      }
      execute_nl_query: { Args: { p_sql: string }; Returns: Json }
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
      dataset_status: ["pending", "processing", "complete", "failed"],
      transaction_type: ["purchase", "usage", "bonus", "refund"],
    },
  },
} as const
