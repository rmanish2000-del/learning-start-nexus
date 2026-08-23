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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assessment_item_map: {
        Row: {
          assessment_id: string
          item_id: string
          points: number
          sort_order: number
        }
        Insert: {
          assessment_id: string
          item_id: string
          points?: number
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          item_id?: string
          points?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_map_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_item_map_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_items: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: number
          explanation: string | null
          grade: number
          id: string
          kind: string
          options: Json | null
          org_id: string
          prompt: string
          subject: string
          subtopic: string
          topic: string
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty?: number
          explanation?: string | null
          grade?: number
          id?: string
          kind?: string
          options?: Json | null
          org_id: string
          prompt: string
          subject?: string
          subtopic: string
          topic?: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: number
          explanation?: string | null
          grade?: number
          id?: string
          kind?: string
          options?: Json | null
          org_id?: string
          prompt?: string
          subject?: string
          subtopic?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          answers: Json
          assessment_id: string
          assigned_by: string | null
          correct_count: number | null
          created_at: string
          current_position: number
          due: string | null
          id: string
          intervention_id: string | null
          last_activity_at: string | null
          learner_id: string
          org_id: string
          result: Json | null
          score_pct: number | null
          started_at: string | null
          status: string
          submitted_at: string | null
          total_count: number | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          assigned_by?: string | null
          correct_count?: number | null
          created_at?: string
          current_position?: number
          due?: string | null
          id?: string
          intervention_id?: string | null
          last_activity_at?: string | null
          learner_id: string
          org_id: string
          result?: Json | null
          score_pct?: number | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          assigned_by?: string | null
          correct_count?: number | null
          created_at?: string
          current_position?: number
          due?: string | null
          id?: string
          intervention_id?: string | null
          last_activity_at?: string | null
          learner_id?: string
          org_id?: string
          result?: Json | null
          score_pct?: number | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          total_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          grade: number
          id: string
          kind: string
          org_id: string
          status: string
          subject: string
          time_limit_minutes: number | null
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade?: number
          id?: string
          kind?: string
          org_id: string
          status?: string
          subject?: string
          time_limit_minutes?: number | null
          title: string
          topic?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade?: number
          id?: string
          kind?: string
          org_id?: string
          status?: string
          subject?: string
          time_limit_minutes?: number | null
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          activity: string
          completed_at: string | null
          created_at: string
          educator_id: string | null
          gap_id: string | null
          id: string
          learner_id: string
          notes: string | null
          org_id: string
          recommendation_id: string | null
          started_at: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity: string
          completed_at?: string | null
          created_at?: string
          educator_id?: string | null
          gap_id?: string | null
          id?: string
          learner_id: string
          notes?: string | null
          org_id: string
          recommendation_id?: string | null
          started_at?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity?: string
          completed_at?: string | null
          created_at?: string
          educator_id?: string | null
          gap_id?: string | null
          id?: string
          learner_id?: string
          notes?: string | null
          org_id?: string
          recommendation_id?: string | null
          started_at?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: false
            referencedRelation: "learning_gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_assessments: {
        Row: {
          created_at: string
          id: string
          learner_id: string
          score: number | null
          status: string
          subject: string
          taken_on: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          learner_id: string
          score?: number | null
          status?: string
          subject?: string
          taken_on?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          learner_id?: string
          score?: number | null
          status?: string
          subject?: string
          taken_on?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_assessments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_evidence: {
        Row: {
          created_at: string
          id: string
          kind: string
          learner_id: string
          note: string | null
          recorded_on: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          learner_id: string
          note?: string | null
          recorded_on?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          learner_id?: string
          note?: string | null
          recorded_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_evidence_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_outcomes: {
        Row: {
          baseline_score: number
          baseline_session_id: string | null
          completed_at: string | null
          confidence: number | null
          created_at: string
          gap_id: string | null
          id: string
          intervention_id: string
          learner_id: string
          mastery_lift: number | null
          org_id: string
          post_score: number | null
          reassessment_session_id: string | null
          status: string
          subject: string
          subtopic: string
          topic: string
          updated_at: string
        }
        Insert: {
          baseline_score: number
          baseline_session_id?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          gap_id?: string | null
          id?: string
          intervention_id: string
          learner_id: string
          mastery_lift?: number | null
          org_id: string
          post_score?: number | null
          reassessment_session_id?: string | null
          status?: string
          subject: string
          subtopic: string
          topic: string
          updated_at?: string
        }
        Update: {
          baseline_score?: number
          baseline_session_id?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          gap_id?: string | null
          id?: string
          intervention_id?: string
          learner_id?: string
          mastery_lift?: number | null
          org_id?: string
          post_score?: number | null
          reassessment_session_id?: string | null
          status?: string
          subject?: string
          subtopic?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_outcomes_baseline_session_id_fkey"
            columns: ["baseline_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_outcomes_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: false
            referencedRelation: "learning_gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_outcomes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: true
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_outcomes_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_outcomes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_outcomes_reassessment_session_id_fkey"
            columns: ["reassessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learners: {
        Row: {
          created_at: string
          educator_id: string | null
          focus_note: string | null
          full_name: string
          grade: number
          handle: string
          id: string
          mastery_lift: number
          mastery_score: number
          org_id: string | null
          status: Database["public"]["Enums"]["learner_status"]
          student_user_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          educator_id?: string | null
          focus_note?: string | null
          full_name: string
          grade: number
          handle: string
          id?: string
          mastery_lift?: number
          mastery_score?: number
          org_id?: string | null
          status?: Database["public"]["Enums"]["learner_status"]
          student_user_id?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          educator_id?: string | null
          focus_note?: string | null
          full_name?: string
          grade?: number
          handle?: string
          id?: string
          mastery_lift?: number
          mastery_score?: number
          org_id?: string | null
          status?: Database["public"]["Enums"]["learner_status"]
          student_user_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learners_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_gaps: {
        Row: {
          created_at: string
          detected_at: string
          first_detected_at: string
          gap_score_pct: number
          id: string
          items_correct: number
          items_total: number
          learner_id: string
          org_id: string
          resolved_session_id: string | null
          session_id: string | null
          severity: string
          status: string
          subject: string
          subtopic: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detected_at?: string
          first_detected_at?: string
          gap_score_pct: number
          id?: string
          items_correct: number
          items_total: number
          learner_id: string
          org_id: string
          resolved_session_id?: string | null
          session_id?: string | null
          severity: string
          status?: string
          subject: string
          subtopic: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detected_at?: string
          first_detected_at?: string
          gap_score_pct?: number
          id?: string
          items_correct?: number
          items_total?: number
          learner_id?: string
          org_id?: string
          resolved_session_id?: string | null
          session_id?: string | null
          severity?: string
          status?: string
          subject?: string
          subtopic?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_gaps_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_gaps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_gaps_resolved_session_id_fkey"
            columns: ["resolved_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_gaps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_items: {
        Row: {
          created_at: string
          due: string | null
          id: string
          kind: string
          progress_pct: number
          status: string
          student_user_id: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due?: string | null
          id?: string
          kind?: string
          progress_pct?: number
          status?: string
          student_user_id: string
          subject?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due?: string | null
          id?: string
          kind?: string
          progress_pct?: number
          status?: string
          student_user_id?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_plan_items: {
        Row: {
          activity: string
          created_at: string
          focus: string
          id: string
          learner_id: string
          sort_order: number
          status: string
          target_date: string | null
        }
        Insert: {
          activity: string
          created_at?: string
          focus: string
          id?: string
          learner_id: string
          sort_order?: number
          status?: string
          target_date?: string | null
        }
        Update: {
          activity?: string
          created_at?: string
          focus?: string
          id?: string
          learner_id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_plan_items_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_history: {
        Row: {
          created_at: string
          id: string
          learner_id: string
          recorded_on: string
          score: number
        }
        Insert: {
          created_at?: string
          id?: string
          learner_id: string
          recorded_on: string
          score: number
        }
        Update: {
          created_at?: string
          id?: string
          learner_id?: string
          recorded_on?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "mastery_history_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tagline: string | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tagline?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tagline?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          activity: string
          created_at: string
          gap_id: string
          id: string
          learner_id: string
          org_id: string
          priority: number
          rationale: string
          rule_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity: string
          created_at?: string
          gap_id: string
          id?: string
          learner_id: string
          org_id: string
          priority: number
          rationale: string
          rule_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity?: string
          created_at?: string
          gap_id?: string
          id?: string
          learner_id?: string
          org_id?: string
          priority?: number
          rationale?: string
          rule_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: true
            referencedRelation: "learning_gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_interactions: {
        Row: {
          ai_used: boolean
          created_at: string
          id: string
          kind: string
          learner_id: string
          org_id: string
          practice_correct: boolean | null
          request_text: string | null
          response_text: string
          session_id: string
          student_user_id: string
        }
        Insert: {
          ai_used?: boolean
          created_at?: string
          id?: string
          kind: string
          learner_id: string
          org_id: string
          practice_correct?: boolean | null
          request_text?: string | null
          response_text: string
          session_id: string
          student_user_id: string
        }
        Update: {
          ai_used?: boolean
          created_at?: string
          id?: string
          kind?: string
          learner_id?: string
          org_id?: string
          practice_correct?: boolean | null
          request_text?: string | null
          response_text?: string
          session_id?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_interactions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_interactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_sessions: {
        Row: {
          concept: string
          concepts_accessed: string[]
          created_at: string
          id: string
          interaction_count: number
          intervention_id: string | null
          last_activity_at: string
          learner_id: string
          mastery_at_start: number
          objective: string
          org_id: string
          status: string
          student_user_id: string
          subject: string
          topic: string
          updated_at: string
        }
        Insert: {
          concept: string
          concepts_accessed?: string[]
          created_at?: string
          id?: string
          interaction_count?: number
          intervention_id?: string | null
          last_activity_at?: string
          learner_id: string
          mastery_at_start?: number
          objective: string
          org_id: string
          status?: string
          student_user_id: string
          subject: string
          topic: string
          updated_at?: string
        }
        Update: {
          concept?: string
          concepts_accessed?: string[]
          created_at?: string
          id?: string
          interaction_count?: number
          intervention_id?: string | null
          last_activity_at?: string
          learner_id?: string
          mastery_at_start?: number
          objective?: string
          org_id?: string
          status?: string
          student_user_id?: string
          subject?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_sessions_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_sessions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      rls_policy_audit: {
        Row: {
          cmd: string | null
          policyname: unknown
          roles: string | null
          tablename: unknown
          using_expression: string | null
          with_check_expression: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "educator" | "student" | "reviewer"
      learner_status: "active" | "needs_attention" | "paused"
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
      app_role: ["admin", "educator", "student", "reviewer"],
      learner_status: ["active", "needs_attention", "paused"],
    },
  },
} as const
