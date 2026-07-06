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
      branches: {
        Row: {
          id: string
          name: string
          location: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          role: 'ADMIN' | 'COACH'
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          role: 'ADMIN' | 'COACH'
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'ADMIN' | 'COACH'
          full_name?: string
          created_at?: string
        }
      }
      coaches: {
        Row: {
          id: string
          user_id: string
          branch_id: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          branch_id: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          branch_id?: string
          phone?: string | null
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          branch_id: string
          full_name: string
          date_of_birth: string
          parent_name: string
          parent_phone: string
          enrolled_date: string
          status: 'active' | 'inactive' | 'dropped'
          created_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          full_name: string
          date_of_birth: string
          parent_name: string
          parent_phone: string
          enrolled_date?: string
          status?: 'active' | 'inactive' | 'dropped'
          created_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          full_name?: string
          date_of_birth?: string
          parent_name?: string
          parent_phone?: string
          enrolled_date?: string
          status?: 'active' | 'inactive' | 'dropped'
          created_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          player_id: string
          branch_id: string
          date: string
          status: 'present' | 'absent'
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          branch_id: string
          date: string
          status: 'present' | 'absent'
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          branch_id?: string
          date?: string
          status?: 'present' | 'absent'
          created_at?: string
        }
      }
      fees: {
        Row: {
          id: string
          player_id: string
          branch_id: string
          month: string
          amount: number
          status: 'paid' | 'pending' | 'overdue'
          mode_of_payment: 'cash' | 'online' | 'cash+online' | null
          paid_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          branch_id: string
          month: string
          amount: number
          status?: 'paid' | 'pending' | 'overdue'
          mode_of_payment?: 'cash' | 'online' | 'cash+online' | null
          paid_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          branch_id?: string
          month?: string
          amount?: number
          status?: 'paid' | 'pending' | 'overdue'
          mode_of_payment?: 'cash' | 'online' | 'cash+online' | null
          paid_date?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_coach_branch_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
