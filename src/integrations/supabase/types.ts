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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_chats: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          school_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          school_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chats_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chats_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chats_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          id: string
          school_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          school_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachments: Json
          content: string | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          school_id: string
          score: number | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          attachments?: Json
          content?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          school_id: string
          score?: number | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          attachments?: Json
          content?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          school_id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          attachments: Json
          class_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          max_score: number
          school_id: string
          subject: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          max_score?: number
          school_id: string
          subject?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          max_score?: number
          school_id?: string
          subject?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          school_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_notes: {
        Row: {
          category: string | null
          created_at: string
          id: string
          note: string
          school_id: string
          severity: string
          student_id: string
          teacher_id: string
          type: string
          visible_to_parent: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          note: string
          school_id: string
          severity?: string
          student_id: string
          teacher_id: string
          type?: string
          visible_to_parent?: boolean
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          note?: string
          school_id?: string
          severity?: string
          student_id?: string
          teacher_id?: string
          type?: string
          visible_to_parent?: boolean
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string
          created_at: string
          grade_level: string | null
          id: string
          name: string
          school_id: string
          subject: string | null
          teacher_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          grade_level?: string | null
          id?: string
          name: string
          school_id: string
          subject?: string | null
          teacher_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          grade_level?: string | null
          id?: string
          name?: string
          school_id?: string
          subject?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          attempt_id: string
          id: string
          marked_for_review: boolean
          question_id: string
          selected_index: number | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          id?: string
          marked_for_review?: boolean
          question_id: string
          selected_index?: number | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          id?: string
          marked_for_review?: boolean
          question_id?: string
          selected_index?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          exam_id: string
          id: string
          school_id: string
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          exam_id: string
          id?: string
          school_id: string
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          exam_id?: string
          id?: string
          school_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_index: number
          exam_id: string
          id: string
          options: Json
          points: number
          position: number
          prompt: string
          school_id: string
        }
        Insert: {
          correct_index?: number
          exam_id: string
          id?: string
          options?: Json
          points?: number
          position?: number
          prompt: string
          school_id: string
        }
        Update: {
          correct_index?: number
          exam_id?: string
          id?: string
          options?: Json
          points?: number
          position?: number
          prompt?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_violations: {
        Row: {
          attempt_id: string
          created_at: string
          detail: string | null
          id: string
          school_id: string
          type: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          detail?: string | null
          id?: string
          school_id: string
          type: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          school_id?: string
          type?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          class_id: string | null
          counts_to_results: boolean
          created_at: string
          created_by: string
          duration_min: number | null
          duration_minutes: number
          id: string
          mode: Database["public"]["Enums"]["exam_mode"]
          proctored: boolean
          randomize: boolean
          scheduled_at: string | null
          school_id: string
          show_answers_after_each: boolean
          status: Database["public"]["Enums"]["exam_status"]
          subject: string | null
          title: string
          violation_limit: number
        }
        Insert: {
          class_id?: string | null
          counts_to_results?: boolean
          created_at?: string
          created_by: string
          duration_min?: number | null
          duration_minutes?: number
          id?: string
          mode?: Database["public"]["Enums"]["exam_mode"]
          proctored?: boolean
          randomize?: boolean
          scheduled_at?: string | null
          school_id: string
          show_answers_after_each?: boolean
          status?: Database["public"]["Enums"]["exam_status"]
          subject?: string | null
          title: string
          violation_limit?: number
        }
        Update: {
          class_id?: string | null
          counts_to_results?: boolean
          created_at?: string
          created_by?: string
          duration_min?: number | null
          duration_minutes?: number
          id?: string
          mode?: Database["public"]["Enums"]["exam_mode"]
          proctored?: boolean
          randomize?: boolean
          scheduled_at?: string | null
          school_id?: string
          show_answers_after_each?: boolean
          status?: Database["public"]["Enums"]["exam_status"]
          subject?: string | null
          title?: string
          violation_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string | null
          id: string
          school_id: string
          status: Database["public"]["Enums"]["fee_status"]
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          school_id: string
          status?: Database["public"]["Enums"]["fee_status"]
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["fee_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gradebook_entries: {
        Row: {
          category: string
          class_id: string
          created_at: string
          id: string
          max_score: number
          recorded_at: string
          school_id: string
          score: number
          student_id: string
          subject: string
          teacher_id: string
          term: string
          title: string
        }
        Insert: {
          category?: string
          class_id: string
          created_at?: string
          id?: string
          max_score?: number
          recorded_at?: string
          school_id: string
          score?: number
          student_id: string
          subject: string
          teacher_id: string
          term?: string
          title: string
        }
        Update: {
          category?: string
          class_id?: string
          created_at?: string
          id?: string
          max_score?: number
          recorded_at?: string
          school_id?: string
          score?: number
          student_id?: string
          subject?: string
          teacher_id?: string
          term?: string
          title?: string
        }
        Relationships: []
      }
      hostels: {
        Row: {
          capacity: number
          created_at: string
          gender: string | null
          id: string
          name: string
          occupied: number
          school_id: string
          warden: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          gender?: string | null
          id?: string
          name: string
          occupied?: number
          school_id: string
          warden?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          gender?: string | null
          id?: string
          name?: string
          occupied?: number
          school_id?: string
          warden?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number
          role: Database["public"]["Enums"]["member_role"]
          school_id: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          role: Database["public"]["Enums"]["member_role"]
          school_id: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          role?: Database["public"]["Enums"]["member_role"]
          school_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          id: string
          issued_at: string
          line_items: Json
          number: string
          paid_at: string | null
          school_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          id?: string
          issued_at?: string
          line_items?: Json
          number: string
          paid_at?: string | null
          school_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          id?: string
          issued_at?: string
          line_items?: Json
          number?: string
          paid_at?: string | null
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          admin_feedback: string | null
          content: string
          created_at: string
          duration_min: number | null
          grade_level: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: string
          subject: string | null
          teacher_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          admin_feedback?: string | null
          content: string
          created_at?: string
          duration_min?: number | null
          grade_level?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: string
          subject?: string | null
          teacher_id: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          admin_feedback?: string | null
          content?: string
          created_at?: string
          duration_min?: number | null
          grade_level?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: string
          subject?: string | null
          teacher_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      library_files: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_files_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_files_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_files_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          bio_completed: boolean
          created_at: string
          id: string
          must_change_pin: boolean
          profile_data: Json
          role: Database["public"]["Enums"]["member_role"]
          school_id: string
          status: string
          user_id: string
        }
        Insert: {
          bio_completed?: boolean
          created_at?: string
          id?: string
          must_change_pin?: boolean
          profile_data?: Json
          role: Database["public"]["Enums"]["member_role"]
          school_id: string
          status?: string
          user_id: string
        }
        Update: {
          bio_completed?: boolean
          created_at?: string
          id?: string
          must_change_pin?: boolean
          profile_data?: Json
          role?: Database["public"]["Enums"]["member_role"]
          school_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          school_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          school_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          school_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      module_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          requested_by: string
          school_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          requested_by: string
          school_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          requested_by?: string
          school_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_requests_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          category: string
          config_schema: Json
          created_at: string
          default_config: Json
          description: string | null
          global_default: boolean
          icon: string | null
          id: string
          monthly_price_cents: number
          name: string
          pricing_model: string
          slug: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          category?: string
          config_schema?: Json
          created_at?: string
          default_config?: Json
          description?: string | null
          global_default?: boolean
          icon?: string | null
          id?: string
          monthly_price_cents?: number
          name: string
          pricing_model?: string
          slug: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string
          config_schema?: Json
          created_at?: string
          default_config?: Json
          description?: string | null
          global_default?: boolean
          icon?: string | null
          id?: string
          monthly_price_cents?: number
          name?: string
          pricing_model?: string
          slug?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      parent_comms: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string
          read_at: string | null
          school_id: string
          student_id: string
          subject: string
          teacher_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id: string
          read_at?: string | null
          school_id: string
          student_id: string
          subject: string
          teacher_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string
          read_at?: string | null
          school_id?: string
          student_id?: string
          subject?: string
          teacher_id?: string
        }
        Relationships: []
      }
      parent_links: {
        Row: {
          created_at: string
          id: string
          parent_user_id: string
          school_id: string
          student_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_user_id: string
          school_id: string
          student_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_user_id?: string
          school_id?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string
          id: string
          priority: string
          scheduled_for: string | null
          target: Json
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by: string
          id?: string
          priority?: string
          scheduled_for?: string | null
          target?: Json
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          priority?: string
          scheduled_for?: string | null
          target?: Json
          title?: string
        }
        Relationships: []
      }
      platform_audit: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          ip: string | null
          payload: Json
          school_id: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          id?: string
          ip?: string | null
          payload?: Json
          school_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          ip?: string | null
          payload?: Json
          school_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          brand: Json
          id: number
          integrations: Json
          maintenance_message: string | null
          maintenance_mode: boolean
          smtp: Json
          updated_at: string
        }
        Insert: {
          brand?: Json
          id?: number
          integrations?: Json
          maintenance_message?: string | null
          maintenance_mode?: boolean
          smtp?: Json
          updated_at?: string
        }
        Update: {
          brand?: Json
          id?: number
          integrations?: Json
          maintenance_message?: string | null
          maintenance_mode?: boolean
          smtp?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          dob: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          photo_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          photo_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          answer: Json | null
          body: string
          created_at: string
          created_by: string
          difficulty: string
          explanation: string | null
          id: string
          options: Json
          school_id: string
          subject: string
          topic: string | null
          type: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          body: string
          created_at?: string
          created_by: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          school_id: string
          subject: string
          topic?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          body?: string
          created_at?: string
          created_by?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          school_id?: string
          subject?: string
          topic?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          id: string
          question_id: string
          tag: string
        }
        Insert: {
          id?: string
          question_id: string
          tag: string
        }
        Update: {
          id?: string
          question_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          remarks: string | null
          school_id: string
          score: number
          student_id: string
          subject: string
          teacher_id: string | null
          term: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          remarks?: string | null
          school_id: string
          score: number
          student_id: string
          subject: string
          teacher_id?: string | null
          term?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          remarks?: string | null
          school_id?: string
          score?: number
          student_id?: string
          subject?: string
          teacher_id?: string | null
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_modules: {
        Row: {
          beta: boolean
          config: Json
          enabled: boolean
          enabled_at: string
          expires_at: string | null
          id: string
          module_id: string
          school_id: string
        }
        Insert: {
          beta?: boolean
          config?: Json
          enabled?: boolean
          enabled_at?: string
          expires_at?: string | null
          id?: string
          module_id: string
          school_id: string
        }
        Update: {
          beta?: boolean
          config?: Json
          enabled?: boolean
          enabled_at?: string
          expires_at?: string | null
          id?: string
          module_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_modules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_modules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_modules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          branding: Json
          created_at: string
          created_by: string
          current_session: string | null
          current_term: string | null
          email: string | null
          exams_violation_limit: number
          grading_system: string | null
          id: string
          logo_url: string | null
          motto: string | null
          name: string
          neco_subject_codes: Json
          phone: string | null
          plan: Database["public"]["Enums"]["school_plan"]
          plan_expires_at: string | null
          plan_started_at: string
          platform_notice: string | null
          proctoring_default: boolean
          resumption_date: string | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["school_status"]
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branding?: Json
          created_at?: string
          created_by: string
          current_session?: string | null
          current_term?: string | null
          email?: string | null
          exams_violation_limit?: number
          grading_system?: string | null
          id?: string
          logo_url?: string | null
          motto?: string | null
          name: string
          neco_subject_codes?: Json
          phone?: string | null
          plan?: Database["public"]["Enums"]["school_plan"]
          plan_expires_at?: string | null
          plan_started_at?: string
          platform_notice?: string | null
          proctoring_default?: boolean
          resumption_date?: string | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["school_status"]
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branding?: Json
          created_at?: string
          created_by?: string
          current_session?: string | null
          current_term?: string | null
          email?: string | null
          exams_violation_limit?: number
          grading_system?: string | null
          id?: string
          logo_url?: string | null
          motto?: string | null
          name?: string
          neco_subject_codes?: Json
          phone?: string | null
          plan?: Database["public"]["Enums"]["school_plan"]
          plan_expires_at?: string | null
          plan_started_at?: string
          platform_notice?: string | null
          proctoring_default?: boolean
          resumption_date?: string | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["school_status"]
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          ip: string | null
          school_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          ip?: string | null
          school_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          ip?: string | null
          school_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          class_id: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          class_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          class_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          monthly_amount_cents: number
          plan: Database["public"]["Enums"]["school_plan"]
          school_id: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          monthly_amount_cents?: number
          plan: Database["public"]["Enums"]["school_plan"]
          school_id: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          monthly_amount_cents?: number
          plan?: Database["public"]["Enums"]["school_plan"]
          school_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          internal: boolean
          ticket_id: string
        }
        Insert: {
          author: string
          body: string
          created_at?: string
          id?: string
          internal?: boolean
          ticket_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee: string | null
          created_at: string
          id: string
          opened_by: string
          priority: string
          school_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          id?: string
          opened_by: string
          priority?: string
          school_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          id?: string
          opened_by?: string
          priority?: string
          school_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          school_id: string
          start_time: string
          subject: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          school_id: string
          start_time: string
          subject: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          school_id?: string
          start_time?: string
          subject?: string
          teacher_id?: string | null
        }
        Relationships: []
      }
      transport_routes: {
        Row: {
          capacity: number
          created_at: string
          driver: string | null
          fee: number
          id: string
          name: string
          school_id: string
          vehicle_no: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver?: string | null
          fee?: number
          id?: string
          name: string
          school_id: string
          vehicle_no?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          driver?: string | null
          fee?: number
          id?: string
          name?: string
          school_id?: string
          vehicle_no?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      school_directory: {
        Row: {
          id: string | null
          logo_url: string | null
          motto: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      schools_public: {
        Row: {
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_school_role: {
        Args: {
          _role: Database["public"]["Enums"]["member_role"]
          _school: string
          _user: string
        }
        Returns: boolean
      }
      is_member: { Args: { _school: string; _user: string }; Returns: boolean }
      is_school_admin: {
        Args: { _school: string; _user: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user: string }; Returns: boolean }
      redeem_invite: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student" | "parent" | "super_admin"
      attendance_status: "present" | "absent" | "late" | "excused"
      exam_mode: "neco_sim" | "school" | "practice"
      exam_status: "draft" | "scheduled" | "active" | "closed"
      fee_status: "pending" | "paid" | "overdue"
      member_role: "admin" | "teacher" | "student" | "parent"
      school_plan: "trial" | "basic" | "standard" | "premium" | "enterprise"
      school_status: "active" | "suspended" | "expired" | "trial"
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
      app_role: ["admin", "teacher", "student", "parent", "super_admin"],
      attendance_status: ["present", "absent", "late", "excused"],
      exam_mode: ["neco_sim", "school", "practice"],
      exam_status: ["draft", "scheduled", "active", "closed"],
      fee_status: ["pending", "paid", "overdue"],
      member_role: ["admin", "teacher", "student", "parent"],
      school_plan: ["trial", "basic", "standard", "premium", "enterprise"],
      school_status: ["active", "suspended", "expired", "trial"],
    },
  },
} as const
