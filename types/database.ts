export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone_number: string | null;
          email: string | null;
          full_name: string;
          contact_permission_granted: boolean;
          current_cycle_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone_number?: string | null;
          email?: string | null;
          full_name: string;
          contact_permission_granted?: boolean;
          current_cycle_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string | null;
          email?: string | null;
          full_name?: string;
          contact_permission_granted?: boolean;
          current_cycle_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      traits: {
        Row: {
          id: string;
          name: string;
          description: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          display_order: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      feedback_cycles: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'completed' | 'cooldown';
          requests_sent: number;
          submissions_received: number;
          started_at: string;
          completed_at: string | null;
          next_cycle_available_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'active' | 'completed' | 'cooldown';
          requests_sent?: number;
          submissions_received?: number;
          started_at?: string;
          completed_at?: string | null;
          next_cycle_available_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'active' | 'completed' | 'cooldown';
          requests_sent?: number;
          submissions_received?: number;
          started_at?: string;
          completed_at?: string | null;
          next_cycle_available_at?: string | null;
          created_at?: string;
        };
      };
      feedback_requests: {
        Row: {
          id: string;
          cycle_id: string;
          sender_id: string;
          rater_phone_number: string;
          unique_token: string;
          status: 'sent' | 'completed' | 'expired';
          sent_at: string;
          completed_at: string | null;
          expires_at: string;
          verification_hint: string | null;
        };
        Insert: {
          id?: string;
          cycle_id: string;
          sender_id: string;
          rater_phone_number: string;
          unique_token: string;
          status?: 'sent' | 'completed' | 'expired';
          sent_at?: string;
          completed_at?: string | null;
          expires_at: string;
          verification_hint?: string | null;
        };
        Update: {
          id?: string;
          cycle_id?: string;
          sender_id?: string;
          rater_phone_number?: string;
          unique_token?: string;
          status?: 'sent' | 'completed' | 'expired';
          sent_at?: string;
          completed_at?: string | null;
          expires_at?: string;
          verification_hint?: string | null;
        };
      };
      feedback_submissions: {
        Row: {
          id: string;
          request_id: string;
          cycle_id: string;
          sender_id: string;
          trait_id: string;
          rating: number;
          reflection: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          cycle_id: string;
          sender_id: string;
          trait_id: string;
          rating: number;
          reflection?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          cycle_id?: string;
          sender_id?: string;
          trait_id?: string;
          rating?: number;
          reflection?: string | null;
          submitted_at?: string;
        };
      };
      feedback_summaries: {
        Row: {
          id: string;
          cycle_id: string;
          user_id: string;
          submission_count: number;
          top_strengths: Json;
          growth_opportunities: Json;
          all_trait_scores: Json;
          patterns: string;
          comparison_to_previous: string | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          cycle_id: string;
          user_id: string;
          submission_count: number;
          top_strengths: Json;
          growth_opportunities: Json;
          all_trait_scores?: Json;
          patterns: string;
          comparison_to_previous?: string | null;
          generated_at?: string;
        };
        Update: {
          id?: string;
          cycle_id?: string;
          user_id?: string;
          submission_count?: number;
          top_strengths?: Json;
          growth_opportunities?: Json;
          all_trait_scores?: Json;
          patterns?: string;
          comparison_to_previous?: string | null;
          generated_at?: string;
        };
      };
      growth_recommendations: {
        Row: {
          id: string;
          user_id: string;
          summary_id: string;
          trait_id: string | null;
          recommendation_type: 'strength' | 'growth' | 'habit';
          title: string;
          description: string;
          is_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary_id: string;
          trait_id?: string | null;
          recommendation_type: 'strength' | 'growth' | 'habit';
          title: string;
          description: string;
          is_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          summary_id?: string;
          trait_id?: string | null;
          recommendation_type?: 'strength' | 'growth' | 'habit';
          title?: string;
          description?: string;
          is_completed?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
