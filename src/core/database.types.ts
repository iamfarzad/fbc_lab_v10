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
    PostgrestVersion: "13.0.5"
  }
  admin: {
    Tables: {
      admin_conversations: {
        Row: {
          admin_id: string
          context_leads: string[] | null
          conversation_id: string
          created_at: string
          embeddings: string
          id: string
          message_content: string
          message_type: Database["admin"]["Enums"]["message_type_enum"]
          session_id: string
        }
        Insert: {
          admin_id: string
          context_leads?: string[] | null
          conversation_id: string
          created_at?: string
          embeddings: string
          id?: string
          message_content: string
          message_type: Database["admin"]["Enums"]["message_type_enum"]
          session_id: string
        }
        Update: {
          admin_id?: string
          context_leads?: string[] | null
          conversation_id?: string
          created_at?: string
          embeddings?: string
          id?: string
          message_content?: string
          message_type?: Database["admin"]["Enums"]["message_type_enum"]
          session_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          context_summary: string | null
          id: string
          is_active: boolean
          last_activity: string
          session_name: string
        }
        Insert: {
          admin_id: string
          context_summary?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          session_name: string
        }
        Update: {
          admin_id?: string
          context_summary?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          session_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      http: {
        Args: { request: Database["admin"]["CompositeTypes"]["http_request"] }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "admin.http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["admin"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["admin"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["admin"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["admin"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["admin"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["admin"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["admin"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      search_admin_conversations: {
        Args: {
          p_limit?: number
          p_query: string
          p_session_id?: string
          p_thresh?: number
        }
        Returns: {
          admin_id: string
          context_leads: string[]
          conversation_id: string
          created_at: string
          distance: number
          embeddings: string
          id: string
          message_content: string
          message_type: Database["admin"]["Enums"]["message_type_enum"]
          session_id: string
        }[]
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: admin.urlencode(string => bytea), admin.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      message_type_enum: "user" | "assistant" | "system"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["admin"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["admin"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      ai_responses: {
        Row: {
          activity_id: string | null
          audio_data: string | null
          created_at: string | null
          id: string
          image_data: string | null
          response_type: string
          session_id: string
          text: string | null
          tools_used: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          audio_data?: string | null
          created_at?: string | null
          id?: string
          image_data?: string | null
          response_type: string
          session_id: string
          text?: string | null
          tools_used?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          audio_data?: string | null
          created_at?: string | null
          id?: string
          image_data?: string | null
          response_type?: string
          session_id?: string
          text?: string | null
          tools_used?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_responses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      artifacts: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event: string
          id: string
          ip_hash: string | null
          session_id: string
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event: string
          id?: string
          ip_hash?: string | null
          session_id: string
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event?: string
          id?: string
          ip_hash?: string | null
          session_id?: string
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      cache: {
        Row: {
          cache_key: string
          cache_value: Json
          created_at: string | null
          expires_at: string | null
          ttl_seconds: number
        }
        Insert: {
          cache_key: string
          cache_value: Json
          created_at?: string | null
          expires_at?: string | null
          ttl_seconds?: number
        }
        Update: {
          cache_key?: string
          cache_value?: Json
          created_at?: string | null
          expires_at?: string | null
          ttl_seconds?: number
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          conversation_id: string | null
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          lead_score: number | null
          name: string | null
          opened_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          lead_score?: number | null
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          lead_score?: number | null
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_usage: {
        Row: {
          capability_name: string | null
          created_at: string | null
          id: string
          session_id: string | null
          usage_count: number | null
          usage_data: Json | null
        }
        Insert: {
          capability_name?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          usage_count?: number | null
          usage_data?: Json | null
        }
        Update: {
          capability_name?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          usage_count?: number | null
          usage_data?: Json | null
        }
        Relationships: []
      }
      capability_usage_log: {
        Row: {
          agent: string | null
          capability: string
          context: Json | null
          first_used_at: string | null
          id: number
          session_id: string
        }
        Insert: {
          agent?: string | null
          capability: string
          context?: Json | null
          first_used_at?: string | null
          id?: never
          session_id: string
        }
        Update: {
          agent?: string | null
          capability?: string
          context?: Json | null
          first_used_at?: string | null
          id?: never
          session_id?: string
        }
        Relationships: []
      }
      conversation_contexts: {
        Row: {
          ai_capabilities_shown: string[] | null
          analytics_pending: boolean | null
          company_context: Json | null
          company_country: string | null
          company_url: string | null
          conversation_flow: Json | null
          created_at: string | null
          email: string
          event_id: string | null
          intelligence_context: Json | null
          intent_data: Json | null
          last_agent: string | null
          last_stage: string | null
          last_user_message: string | null
          metadata: Json | null
          name: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          person_context: Json | null
          role: string | null
          role_confidence: number | null
          session_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          ai_capabilities_shown?: string[] | null
          analytics_pending?: boolean | null
          company_context?: Json | null
          company_country?: string | null
          company_url?: string | null
          conversation_flow?: Json | null
          created_at?: string | null
          email: string
          event_id?: string | null
          intelligence_context?: Json | null
          intent_data?: Json | null
          last_agent?: string | null
          last_stage?: string | null
          last_user_message?: string | null
          metadata?: Json | null
          name?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          person_context?: Json | null
          role?: string | null
          role_confidence?: number | null
          session_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          ai_capabilities_shown?: string[] | null
          analytics_pending?: boolean | null
          company_context?: Json | null
          company_country?: string | null
          company_url?: string | null
          conversation_flow?: Json | null
          created_at?: string | null
          email?: string
          event_id?: string | null
          intelligence_context?: Json | null
          intent_data?: Json | null
          last_agent?: string | null
          last_stage?: string | null
          last_user_message?: string | null
          metadata?: Json | null
          name?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          person_context?: Json | null
          role?: string | null
          role_confidence?: number | null
          session_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      conversation_insights: {
        Row: {
          confidence_score: number | null
          conversation_id: string | null
          created_at: string | null
          extracted_at: string | null
          id: string
          insight_text: string
          insight_type: string
          lead_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_at?: string | null
          id?: string
          insight_text: string
          insight_type: string
          lead_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_at?: string | null
          id?: string
          insight_text?: string
          insight_type?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          email_retries: number | null
          email_status: string | null
          ended_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          session_id: string
          stage: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_retries?: number | null
          email_status?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          session_id: string
          stage?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_retries?: number | null
          email_status?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          session_id?: string
          stage?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          job_type: string
          metadata: Json | null
          result_data: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          job_type: string
          metadata?: Json | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          job_type?: string
          metadata?: Json | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      documents_embeddings: {
        Row: {
          content: string | null
          created_at: string | null
          embedding: string
          id: string
          kind: string
          metadata: Json | null
          session_id: string
          text: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          embedding: string
          id?: string
          kind: string
          metadata?: Json | null
          session_id: string
          text: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          embedding?: string
          id?: string
          kind?: string
          metadata?: Json | null
          session_id?: string
          text?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          clicked_count: number | null
          created_at: string | null
          id: string
          name: string
          opened_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          status: string
          subject: string
          target_segment: string | null
          template: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          clicked_count?: number | null
          created_at?: string | null
          id?: string
          name: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          target_segment?: string | null
          template: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          clicked_count?: number | null
          created_at?: string | null
          id?: string
          name?: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          target_segment?: string | null
          template?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      failed_emails: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          pdf_url: string | null
          retries: number
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          pdf_url?: string | null
          retries?: number
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          pdf_url?: string | null
          retries?: number
        }
        Relationships: [
          {
            foreignKeyName: "failed_emails_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean
          metadata: Json | null
          rollout_percentage: number | null
          target_environments: string[] | null
          target_users: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          rollout_percentage?: number | null
          target_environments?: string[] | null
          target_users?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          rollout_percentage?: number | null
          target_environments?: string[] | null
          target_users?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      file_metadata: {
        Row: {
          access_level: string | null
          bucket_name: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_level?: string | null
          bucket_name?: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_level?: string | null
          bucket_name?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          scheduled_for: string
          status: string
          task_data: Json | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for: string
          status?: string
          task_data?: Json | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for?: string
          status?: string
          task_data?: Json | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_classifications: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          intent: string | null
          session_id: string | null
          slots: Json | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          intent?: string | null
          session_id?: string | null
          slots?: Json | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          intent?: string | null
          session_id?: string | null
          slots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_classifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_contexts"
            referencedColumns: ["session_id"]
          },
        ]
      }
      lead_research: {
        Row: {
          company: string | null
          created_at: string | null
          id: number
          industry: string | null
          research_data: string | null
          session_id: string | null
          target_audience: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          id?: number
          industry?: string | null
          research_data?: string | null
          session_id?: string | null
          target_audience?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          id?: number
          industry?: string | null
          research_data?: string | null
          session_id?: string | null
          target_audience?: string | null
        }
        Relationships: []
      }
      lead_search_results: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          raw: Json | null
          snippet: string | null
          source: string
          title: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          raw?: Json | null
          snippet?: string | null
          source: string
          title?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          raw?: Json | null
          snippet?: string | null
          source?: string
          title?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_search_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_summaries: {
        Row: {
          company_name: string
          consultant_brief: string | null
          conversation_summary: string | null
          created_at: string | null
          email: string | null
          id: string
          intent_type: string | null
          lead_score: number | null
          summary: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name: string
          consultant_brief?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          intent_type?: string | null
          lead_score?: number | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string
          consultant_brief?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          intent_type?: string | null
          lead_score?: number | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leads: {
        Row: {
          challenges: string | null
          company: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          interests: string | null
          last_name: string | null
          lead_score: number | null
          name: string
          role: string | null
          session_summary: string | null
          source: string | null
          status: string | null
          tc_acceptance: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          challenges?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          interests?: string | null
          last_name?: string | null
          lead_score?: number | null
          name?: string
          role?: string | null
          session_summary?: string | null
          source?: string | null
          status?: string | null
          tc_acceptance?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenges?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          interests?: string | null
          last_name?: string | null
          lead_score?: number | null
          name?: string
          role?: string | null
          session_summary?: string | null
          source?: string | null
          status?: string | null
          tc_acceptance?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          meta: Json | null
          service: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          message: string
          meta?: Json | null
          service: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          service?: string
          timestamp?: string
        }
        Relationships: []
      }
      meeting_participants: {
        Row: {
          created_at: string | null
          email: string
          id: string
          meeting_id: string
          name: string | null
          responded_at: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          meeting_id: string
          name?: string | null
          responded_at?: string | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          meeting_id?: string
          name?: string | null
          responded_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendees: Json | null
          conversation_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lead_email: string | null
          lead_id: string | null
          lead_name: string | null
          location: string | null
          meeting_date: string
          meeting_link: string | null
          meeting_time: string
          meeting_type: string | null
          meeting_url: string | null
          metadata: Json | null
          notes: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          scheduled_at: string | null
          status: string
          timezone: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendees?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string | null
          location?: string | null
          meeting_date: string
          meeting_link?: string | null
          meeting_time: string
          meeting_type?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          notes?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: string
          timezone?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendees?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string | null
          location?: string | null
          meeting_date?: string
          meeting_link?: string | null
          meeting_time?: string
          meeting_type?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          notes?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      personality_profiles: {
        Row: {
          communication_style: string | null
          created_at: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          name: string
          profile_data: Json
          traits: string[] | null
          updated_at: string | null
        }
        Insert: {
          communication_style?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          name: string
          profile_data?: Json
          traits?: string[] | null
          updated_at?: string | null
        }
        Update: {
          communication_style?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          name?: string
          profile_data?: Json
          traits?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      token_usage_log: {
        Row: {
          cost: number
          created_at: string
          id: string
          input_tokens: number
          is_tool: boolean | null
          model: string
          operation: string | null
          output_tokens: number
          session_id: string
          timestamp: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          input_tokens?: number
          is_tool?: boolean | null
          model: string
          operation?: string | null
          output_tokens?: number
          session_id: string
          timestamp?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          input_tokens?: number
          is_tool?: boolean | null
          model?: string
          operation?: string | null
          output_tokens?: number
          session_id?: string
          timestamp?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      token_usage_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          estimated_cost: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          session_id: string | null
          success: boolean
          task_type: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          session_id?: string | null
          success?: boolean
          task_type?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          session_id?: string | null
          success?: boolean
          task_type?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transcripts: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          message_type: string
          metadata: Json | null
          role: string
          search_vector: unknown
          timestamp: string | null
          tool_name: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message_type: string
          metadata?: Json | null
          role: string
          search_vector?: unknown
          timestamp?: string | null
          tool_name?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          metadata?: Json | null
          role?: string
          search_vector?: unknown
          timestamp?: string | null
          tool_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_budgets: {
        Row: {
          created_at: string | null
          daily_limit: number
          id: string
          monthly_limit: number
          per_request_limit: number
          updated_at: string | null
          user_id: string | null
          user_plan: string
        }
        Insert: {
          created_at?: string | null
          daily_limit?: number
          id?: string
          monthly_limit?: number
          per_request_limit?: number
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Update: {
          created_at?: string | null
          daily_limit?: number
          id?: string
          monthly_limit?: number
          per_request_limit?: number
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_usage_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voice_sessions: {
        Row: {
          audio_chunks_received: number | null
          audio_chunks_sent: number | null
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          session_id: string
          started_at: string | null
          status: string
          total_audio_bytes: number | null
          websocket_connection_id: string | null
        }
        Insert: {
          audio_chunks_received?: number | null
          audio_chunks_sent?: number | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          session_id: string
          started_at?: string | null
          status?: string
          total_audio_bytes?: number | null
          websocket_connection_id?: string | null
        }
        Update: {
          audio_chunks_received?: number | null
          audio_chunks_sent?: number | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          session_id?: string
          started_at?: string | null
          status?: string
          total_audio_bytes?: number | null
          websocket_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      wal_log: {
        Row: {
          created_at: string | null
          id: string
          operation: string
          payload: Json
          session_id: string
          synced_at: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id: string
          operation: string
          payload: Json
          session_id: string
          synced_at?: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          id?: string
          operation?: string
          payload?: Json
          session_id?: string
          synced_at?: string
          timestamp?: string
        }
        Relationships: []
      }
    }
    Views: {
      failed_conversations: {
        Row: {
          company_context: Json | null
          conversation_created_at: string | null
          conversation_id: string | null
          email: string | null
          email_status: string | null
          failed_at: string | null
          failed_id: string | null
          failure_reason: string | null
          lead_score: number | null
          name: string | null
          pdf_url: string | null
          research_json: Json | null
          retries: number | null
          summary: string | null
        }
        Relationships: [
          {
            foreignKeyName: "failed_emails_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_conversations_mat: {
        Row: {
          company_context: Json | null
          conversation_created_at: string | null
          conversation_id: string | null
          email: string | null
          email_status: string | null
          failed_at: string | null
          failed_id: string | null
          failure_reason: string | null
          lead_score: number | null
          name: string | null
          pdf_url: string | null
          research_json: Json | null
          retries: number | null
          summary: string | null
        }
        Relationships: [
          {
            foreignKeyName: "failed_emails_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage_summary: {
        Row: {
          daily_limit: number | null
          email: string | null
          month_cost: number | null
          month_tokens: number | null
          monthly_limit: number | null
          today_cost: number | null
          today_tokens: number | null
          user_id: string | null
          user_plan: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_capability_if_missing:
        | {
            Args: { p_capability: string; p_session_id: string }
            Returns: undefined
          }
        | {
            Args: { p_capability_name: string; p_context?: Json }
            Returns: undefined
          }
        | {
            Args: {
              p_capability: Database["public"]["Enums"]["ai_capability"]
              p_session_id: string
            }
            Returns: undefined
          }
      check_feature_flag: {
        Args: { p_environment?: string; p_flag_key: string; p_user_id?: string }
        Returns: Json
      }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_cron_logs: { Args: never; Returns: undefined }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_old_wal: { Args: never; Returns: undefined }
      clear_cache: { Args: { p_cache_key?: string }; Returns: number }
      create_file_record: {
        Args: {
          access_level?: string
          bucket_name?: string
          file_name: string
          file_path: string
          file_size: number
          is_public?: boolean
          metadata?: Json
          mime_type: string
          tags?: string[]
          user_id?: string
        }
        Returns: string
      }
      database_health_check: {
        Args: never
        Returns: {
          metric: string
          value: string
        }[]
      }
      get_cache: { Args: { p_cache_key: string }; Returns: Json }
      get_feature_flag:
        | {
            Args: { default_value?: boolean; flag_name: string }
            Returns: boolean
          }
        | { Args: { flag_key: string }; Returns: Json }
      get_slow_queries: {
        Args: never
        Returns: {
          duration: unknown
          query: string
        }[]
      }
      has_capability_been_used: {
        Args: {
          p_capability: Database["public"]["Enums"]["ai_capability"]
          p_session_id: string
        }
        Returns: boolean
      }
      hashint8:
        | { Args: { value: number }; Returns: number }
        | { Args: { "": string }; Returns: number }
      log_cron_job_complete: {
        Args: {
          error_message?: string
          job_id: string
          result_data?: Json
          status?: string
        }
        Returns: undefined
      }
      log_cron_job_start: {
        Args: { job_name: string; job_type?: string }
        Returns: string
      }
      match_documents: {
        Args: { p_match_count?: number; p_query: string; p_session_id: string }
        Returns: {
          created_at: string
          id: string
          kind: string
          similarity: number
          text: string
        }[]
      }
      search_transcripts: {
        Args: {
          max_results?: number
          result_offset?: number
          search_query: string
        }
        Returns: {
          content: string
          conversation_id: string
          message_type: string
          rank: number
          role: string
          session_id: string
        }[]
      }
      secure_function_template: { Args: { param1: string }; Returns: string }
      set_cache: {
        Args: {
          p_cache_key: string
          p_cache_value: Json
          p_ttl_seconds?: number
        }
        Returns: undefined
      }
      update_cache: {
        Args: {
          p_cache_key: string
          p_cache_value: Json
          p_ttl_seconds?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      ai_capability:
        | "text_generation"
        | "image_generation"
        | "code_completion"
        | "translation"
        | "summarization"
        | "sentiment_analysis"
        | "entity_extraction"
        | "voice_transcription"
        | "embeddings_generation"
        | "question_answering"
        | "intent_classification"
        | "language_detection"
        | "keyword_extraction"
        | "paraphrasing"
        | "content_moderation"
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
  admin: {
    Enums: {
      message_type_enum: ["user", "assistant", "system"],
    },
  },
  public: {
    Enums: {
      ai_capability: [
        "text_generation",
        "image_generation",
        "code_completion",
        "translation",
        "summarization",
        "sentiment_analysis",
        "entity_extraction",
        "voice_transcription",
        "embeddings_generation",
        "question_answering",
        "intent_classification",
        "language_detection",
        "keyword_extraction",
        "paraphrasing",
        "content_moderation",
      ],
    },
  },
} as const
