export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string
          email: string
          name: string
          role: 'admin' | 'student' | 'super_admin'
          status: 'active' | 'pending' | 'rejected'
          created_at: string
          updated_at?: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          name: string
          role: 'admin' | 'student' | 'super_admin'
          status?: 'active' | 'pending' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          email?: string
          name?: string
          role?: 'admin' | 'student' | 'super_admin'
          status?: 'active' | 'pending' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          title: string
          description: string
          questions: Json
          passing_score: number
          created_by: string
          is_published?: boolean
          created_at: string
          updated_at?: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          questions: Json
          passing_score?: number
          created_by: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          questions?: Json
          passing_score?: number
          created_by?: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          student_id: string
          answers: Json
          score: number
          passed: boolean
          completed_at: string
          created_at?: string
        }
        Insert: {
          id?: string
          quiz_id: string
          student_id: string
          answers: Json
          score: number
          passed: boolean
          completed_at: string
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          student_id?: string
          answers?: Json
          score?: number
          passed?: boolean
          completed_at?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message: string
          p_metadata?: Json
        }
        Returns: string
      }
      mark_notification_as_read: {
        Args: {
          p_notification_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      mark_all_notifications_as_read: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      get_unread_notification_count: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      get_notifications: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          type: string
          title: string
          message: string
          read: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
