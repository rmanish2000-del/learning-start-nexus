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
    PostgrestVersion: "14.17"
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
      assessment_outcomes: {
        Row: {
          bloom_level: string
          book_id: string
          category: string
          code: string
          created_at: string
          diagnostic_weight: number
          difficulty: number
          id: string
          intervention_strategy: string
          org_id: string
          question_types: Json
          status: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          bloom_level: string
          book_id: string
          category: string
          code: string
          created_at?: string
          diagnostic_weight?: number
          difficulty?: number
          id?: string
          intervention_strategy?: string
          org_id: string
          question_types?: Json
          status?: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          bloom_level?: string
          book_id?: string
          category?: string
          code?: string
          created_at?: string
          diagnostic_weight?: number
          difficulty?: number
          id?: string
          intervention_strategy?: string
          org_id?: string
          question_types?: Json
          status?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_outcomes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_outcomes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_outcomes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_question_map: {
        Row: {
          assessment_id: string
          created_at: string
          points: number
          question_id: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          points?: number
          question_id: string
          sort_order: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          points?: number
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_question_map_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_question_map_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
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
          archived_at: string | null
          book_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          grade: number
          id: string
          is_demo: boolean
          kind: string
          org_id: string
          status: string
          subject: string
          time_limit_minutes: number | null
          title: string
          topic: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          book_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade?: number
          id?: string
          is_demo?: boolean
          kind?: string
          org_id: string
          status?: string
          subject?: string
          time_limit_minutes?: number | null
          title: string
          topic?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          book_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade?: number
          id?: string
          is_demo?: boolean
          kind?: string
          org_id?: string
          status?: string
          subject?: string
          time_limit_minutes?: number | null
          title?: string
          topic?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      book_events: {
        Row: {
          actor_id: string | null
          book_id: string
          created_at: string
          detail: Json
          event: string
          id: string
          org_id: string
        }
        Insert: {
          actor_id?: string | null
          book_id: string
          created_at?: string
          detail?: Json
          event: string
          id?: string
          org_id: string
        }
        Update: {
          actor_id?: string | null
          book_id?: string
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_events_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          archived_at: string | null
          board: string | null
          created_at: string
          file_names: string[]
          file_size_bytes: number
          grade: number
          id: string
          is_demo: boolean
          mime_types: string[]
          org_id: string
          processed_at: string | null
          processing_error: string | null
          status: string
          storage_paths: string[]
          subject: string
          title: string
          uploaded_by: string
        }
        Insert: {
          archived_at?: string | null
          board?: string | null
          created_at?: string
          file_names?: string[]
          file_size_bytes?: number
          grade: number
          id?: string
          is_demo?: boolean
          mime_types?: string[]
          org_id: string
          processed_at?: string | null
          processing_error?: string | null
          status?: string
          storage_paths?: string[]
          subject: string
          title: string
          uploaded_by: string
        }
        Update: {
          archived_at?: string | null
          board?: string | null
          created_at?: string
          file_names?: string[]
          file_size_bytes?: number
          grade?: number
          id?: string
          is_demo?: boolean
          mime_types?: string[]
          org_id?: string
          processed_at?: string | null
          processing_error?: string | null
          status?: string
          storage_paths?: string[]
          subject?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_edges: {
        Row: {
          book_id: string
          child_id: string
          created_at: string
          id: string
          org_id: string
          parent_id: string
          relation: string
        }
        Insert: {
          book_id: string
          child_id: string
          created_at?: string
          id?: string
          org_id: string
          parent_id: string
          relation?: string
        }
        Update: {
          book_id?: string
          child_id?: string
          created_at?: string
          id?: string
          org_id?: string
          parent_id?: string
          relation?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_edges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_edges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "concept_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_edges_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_edges_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "concept_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_nodes: {
        Row: {
          book_id: string
          created_at: string
          depth: number
          id: string
          label: string
          org_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          depth?: number
          id?: string
          label: string
          org_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          depth?: number
          id?: string
          label?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_nodes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_nodes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_chapters: {
        Row: {
          book_id: string
          created_at: string
          id: string
          org_id: string
          position: number
          status: string
          title: string
          unit_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          org_id: string
          position?: number
          status?: string
          title: string
          unit_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          org_id?: string
          position?: number
          status?: string
          title?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_chapters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_chapters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_outcomes: {
        Row: {
          book_id: string
          created_at: string
          id: string
          org_id: string
          position: number
          status: string
          text: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          org_id: string
          position?: number
          status?: string
          text: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          org_id?: string
          position?: number
          status?: string
          text?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_outcomes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_outcomes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_outcomes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_topics: {
        Row: {
          book_id: string
          chapter_id: string
          created_at: string
          id: string
          key_concepts: Json
          learning_outcomes: Json
          org_id: string
          position: number
          question_opportunities: Json
          status: string
          title: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          created_at?: string
          id?: string
          key_concepts?: Json
          learning_outcomes?: Json
          org_id: string
          position?: number
          question_opportunities?: Json
          status?: string
          title: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          created_at?: string
          id?: string
          key_concepts?: Json
          learning_outcomes?: Json
          org_id?: string
          position?: number
          question_opportunities?: Json
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_topics_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_units: {
        Row: {
          book_id: string
          created_at: string
          id: string
          org_id: string
          position: number
          status: string
          title: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          org_id: string
          position?: number
          status?: string
          title: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          org_id?: string
          position?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_units_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_units_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_consents: {
        Row: {
          action: string
          consent_date: string
          consent_version: string
          created_at: string
          id: string
          learner_id: string
          org_id: string
          parent_email: string
          parent_mobile: string
          parent_name: string
          recorded_by: string | null
        }
        Insert: {
          action?: string
          consent_date: string
          consent_version: string
          created_at?: string
          id?: string
          learner_id: string
          org_id: string
          parent_email: string
          parent_mobile: string
          parent_name: string
          recorded_by?: string | null
        }
        Update: {
          action?: string
          consent_date?: string
          consent_version?: string
          created_at?: string
          id?: string
          learner_id?: string
          org_id?: string
          parent_email?: string
          parent_mobile?: string
          parent_name?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_consents_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_consents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_map: {
        Row: {
          assessment_outcome_id: string
          book_id: string
          created_at: string
          failure_pattern: string
          id: string
          org_id: string
          priority: number
          recommended_intervention: string
          updated_at: string
        }
        Insert: {
          assessment_outcome_id: string
          book_id: string
          created_at?: string
          failure_pattern: string
          id?: string
          org_id: string
          priority?: number
          recommended_intervention: string
          updated_at?: string
        }
        Update: {
          assessment_outcome_id?: string
          book_id?: string
          created_at?: string
          failure_pattern?: string
          id?: string
          org_id?: string
          priority?: number
          recommended_intervention?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_map_assessment_outcome_id_fkey"
            columns: ["assessment_outcome_id"]
            isOneToOne: false
            referencedRelation: "assessment_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_map_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_map_org_id_fkey"
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
          board: string | null
          created_at: string
          educator_id: string | null
          focus_note: string | null
          full_name: string
          grade: number
          handle: string
          id: string
          is_demo: boolean
          mastery_lift: number
          mastery_score: number
          org_id: string | null
          status: Database["public"]["Enums"]["learner_status"]
          student_user_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          board?: string | null
          created_at?: string
          educator_id?: string | null
          focus_note?: string | null
          full_name: string
          grade: number
          handle: string
          id?: string
          is_demo?: boolean
          mastery_lift?: number
          mastery_score?: number
          org_id?: string | null
          status?: Database["public"]["Enums"]["learner_status"]
          student_user_id?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          board?: string | null
          created_at?: string
          educator_id?: string | null
          focus_note?: string | null
          full_name?: string
          grade?: number
          handle?: string
          id?: string
          is_demo?: boolean
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
      mastery_levels: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
          max_score: number
          min_score: number
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          label: string
          max_score: number
          min_score: number
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
          max_score?: number
          min_score?: number
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      outcome_map: {
        Row: {
          assessment_outcome_id: string
          book_id: string
          created_at: string
          curriculum_outcome_id: string
          id: string
          org_id: string
        }
        Insert: {
          assessment_outcome_id: string
          book_id: string
          created_at?: string
          curriculum_outcome_id: string
          id?: string
          org_id: string
        }
        Update: {
          assessment_outcome_id?: string
          book_id?: string
          created_at?: string
          curriculum_outcome_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_map_assessment_outcome_id_fkey"
            columns: ["assessment_outcome_id"]
            isOneToOne: false
            referencedRelation: "assessment_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_map_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_map_curriculum_outcome_id_fkey"
            columns: ["curriculum_outcome_id"]
            isOneToOne: false
            referencedRelation: "curriculum_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_entitlements: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string | null
          granted_at: string
          id: string
          kind: string
          learner_id: string | null
          order_id: string
          parent_user_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind: string
          learner_id?: string | null
          order_id: string
          parent_user_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind?: string
          learner_id?: string | null
          order_id?: string
          parent_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_entitlements_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "parent_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_learner_links: {
        Row: {
          created_at: string
          id: string
          learner_id: string
          org_id: string
          parent_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          learner_id: string
          org_id: string
          parent_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          learner_id?: string
          org_id?: string
          parent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_learner_links_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_learner_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_orders: {
        Row: {
          access_token: string
          amount_paise: number
          assessment_id: string | null
          board: string | null
          book_id: string | null
          child_first_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          grade: number | null
          id: string
          learner_id: string | null
          order_ref: string
          org_id: string | null
          paid_at: string | null
          parent_order_id: string | null
          parent_user_id: string | null
          provider: string
          provider_order_id: string | null
          provider_payment_ref: string | null
          purpose: string
          session_id: string | null
          status: string
          subject: string | null
          unit_id: string | null
          updated_at: string
          utm: Json
        }
        Insert: {
          access_token: string
          amount_paise: number
          assessment_id?: string | null
          board?: string | null
          book_id?: string | null
          child_first_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          grade?: number | null
          id?: string
          learner_id?: string | null
          order_ref: string
          org_id?: string | null
          paid_at?: string | null
          parent_order_id?: string | null
          parent_user_id?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_ref?: string | null
          purpose: string
          session_id?: string | null
          status?: string
          subject?: string | null
          unit_id?: string | null
          updated_at?: string
          utm?: Json
        }
        Update: {
          access_token?: string
          amount_paise?: number
          assessment_id?: string | null
          board?: string | null
          book_id?: string | null
          child_first_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          grade?: number | null
          id?: string
          learner_id?: string | null
          order_ref?: string
          org_id?: string | null
          paid_at?: string | null
          parent_order_id?: string | null
          parent_user_id?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_ref?: string | null
          purpose?: string
          session_id?: string | null
          status?: string
          subject?: string | null
          unit_id?: string | null
          updated_at?: string
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "parent_orders_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_orders_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "parent_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "curriculum_units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credentials: {
        Row: {
          id: string
          key_id: string
          key_secret: string
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
        }
        Insert: {
          id?: string
          key_id: string
          key_secret: string
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Update: {
          id?: string
          key_id?: string
          key_secret?: string
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          is_duplicate: boolean
          order_id: string | null
          outcome: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          signature_valid: boolean
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          is_duplicate?: boolean
          order_id?: string | null
          outcome: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          signature_valid?: boolean
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          is_duplicate?: boolean
          order_id?: string | null
          outcome?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          signature_valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "parent_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_leads: {
        Row: {
          boards_grades: string | null
          centre_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          learner_count: string | null
          notes: string | null
          phone: string | null
          status: string
          timeline: string | null
        }
        Insert: {
          boards_grades?: string | null
          centre_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          learner_count?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          timeline?: string | null
        }
        Update: {
          boards_grades?: string | null
          centre_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          learner_count?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          timeline?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          org_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          org_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          org_id?: string | null
          phone?: string | null
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
      question_bank: {
        Row: {
          book_id: string
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: number
          explanation: string
          external_ref: string | null
          id: string
          kind: string
          options: Json | null
          org_id: string
          outcome_id: string
          parent_question_id: string | null
          part_order: number | null
          prompt: string
          source: string
          status: string
          stimulus: string | null
          updated_at: string
          verification_note: string | null
          verification_state: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          book_id: string
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty: number
          explanation: string
          external_ref?: string | null
          id?: string
          kind: string
          options?: Json | null
          org_id: string
          outcome_id: string
          parent_question_id?: string | null
          part_order?: number | null
          prompt: string
          source?: string
          status?: string
          stimulus?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_state?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          book_id?: string
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: number
          explanation?: string
          external_ref?: string | null
          id?: string
          kind?: string
          options?: Json | null
          org_id?: string
          outcome_id?: string
          parent_question_id?: string | null
          part_order?: number | null
          prompt?: string
          source?: string
          status?: string
          stimulus?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_state?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "assessment_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_verifications: {
        Row: {
          action: string
          created_at: string
          id: string
          note: string | null
          org_id: string
          question_id: string
          reviewer_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          note?: string | null
          org_id: string
          question_id: string
          reviewer_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string
          question_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_verifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_verifications_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
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
          ended_at: string | null
          gap_id: string | null
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
          ended_at?: string | null
          gap_id?: string | null
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
          ended_at?: string | null
          gap_id?: string | null
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
            foreignKeyName: "tutor_sessions_gap_id_fkey"
            columns: ["gap_id"]
            isOneToOne: false
            referencedRelation: "learning_gaps"
            referencedColumns: ["id"]
          },
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
      tutor_evidence_by_gap: {
        Args: never
        Returns: {
          first_at: string
          gap_id: string
          interactions: number
          last_at: string
          learner_id: string
          sessions: number
          substantive_interactions: number
          tutor_minutes: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "educator" | "student" | "reviewer" | "parent"
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
      app_role: ["admin", "educator", "student", "reviewer", "parent"],
      learner_status: ["active", "needs_attention", "paused"],
    },
  },
} as const
