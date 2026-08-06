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
      calendar_events: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          description: string | null
          details: Json | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          meeting_id: string | null
          starts_at: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: Json | null
          ends_at?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          meeting_id?: string | null
          starts_at: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: Json | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          meeting_id?: string | null
          starts_at?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invitations: {
        Row: {
          accepted_at: string | null
          club_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role_id: string | null
          team_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role_id?: string | null
          team_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role_id?: string | null
          team_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          league_name: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          league_name?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          league_name?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          club_id: string
          created_at: string
          description: string | null
          expiry_date: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          issue_date: string | null
          related_user_id: string | null
          tags: string[] | null
          team_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          club_id: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_date?: string | null
          related_user_id?: string | null
          tags?: string[] | null
          team_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          club_id?: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_date?: string | null
          related_user_id?: string | null
          tags?: string[] | null
          team_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          club_id: string
          concept: string
          created_at: string
          created_by: string | null
          currency: string
          expense_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          receipt_path: string | null
          request_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          club_id: string
          concept: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          receipt_path?: string | null
          request_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          club_id?: string
          concept?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          receipt_path?: string | null
          request_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          club_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_path: string | null
          min_quantity: number
          name: string
          total_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          min_quantity?: number
          name: string
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          min_quantity?: number
          name?: string
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_loans: {
        Row: {
          borrower_user_id: string
          club_id: string
          created_at: string
          created_by: string | null
          event_id: string | null
          expected_return_at: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          request_id: string | null
          returned_at: string | null
          returned_quantity: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          borrower_user_id: string
          club_id: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          expected_return_at?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          request_id?: string | null
          returned_at?: string | null
          returned_quantity?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          borrower_user_id?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          expected_return_at?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          request_id?: string | null
          returned_at?: string | null
          returned_quantity?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_loans_borrower_user_id_profiles_fkey"
            columns: ["borrower_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_loans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          club_id: string
          created_at: string
          created_by: string | null
          ended_at_actual: string | null
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          started_at: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          ended_at_actual?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          started_at?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          ended_at_actual?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          started_at?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          club_id: string | null
          created_at: string
          id: string
          role_id: string | null
          target_user_id: string
          team_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          role_id?: string | null
          target_user_id: string
          team_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          role_id?: string | null
          target_user_id?: string
          team_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: string
          body: string | null
          club_id: string
          created_at: string
          id: string
          read_at: string | null
          related_id: string | null
          related_module: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          audience?: string
          body?: string | null
          club_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          related_id?: string | null
          related_module?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          audience?: string
          body?: string | null
          club_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          related_id?: string | null
          related_module?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_profiles: {
        Row: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          birthdate: string | null
          created_at: string
          height_cm: number | null
          id: string
          jersey_number: number | null
          notes: string | null
          position: string | null
          team_id: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          birthdate?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          notes?: string | null
          position?: string | null
          team_id: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          birthdate?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          notes?: string | null
          position?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthdate: string | null
          birthplace: string | null
          club_id: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          full_name: string | null
          id: string
          jersey_number: number | null
          maternal_last_name: string | null
          name_completed: boolean
          nationality: string | null
          pants_size: string | null
          paternal_last_name: string | null
          phone: string | null
          position: string | null
          shirt_size: string | null
          shoe_size: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthdate?: string | null
          birthplace?: string | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          jersey_number?: number | null
          maternal_last_name?: string | null
          name_completed?: boolean
          nationality?: string | null
          pants_size?: string | null
          paternal_last_name?: string | null
          phone?: string | null
          position?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string | null
          birthplace?: string | null
          club_id?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          jersey_number?: number | null
          maternal_last_name?: string | null
          name_completed?: boolean
          nationality?: string | null
          pants_size?: string | null
          paternal_last_name?: string | null
          phone?: string | null
          position?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_comments: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          request_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["request_status"] | null
          id: string
          note: string | null
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          note?: string | null
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          note?: string | null
          request_id?: string
          to_status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_type_user_overrides: {
        Row: {
          assigned_by: string | null
          club_id: string
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["approver_override_mode"]
          request_type: Database["public"]["Enums"]["request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          club_id: string
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["approver_override_mode"]
          request_type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          club_id?: string
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["approver_override_mode"]
          request_type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_type_user_overrides_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          amount: number | null
          club_id: string
          created_at: string
          currency: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          description: string | null
          details: Json
          id: string
          needed_at: string | null
          related_event_id: string | null
          related_item_id: string | null
          related_loan_id: string | null
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          title: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          club_id: string
          created_at?: string
          currency?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description?: string | null
          details?: Json
          id?: string
          needed_at?: string | null
          related_event_id?: string | null
          related_item_id?: string | null
          related_loan_id?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          club_id?: string
          created_at?: string
          currency?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description?: string | null
          details?: Json
          id?: string
          needed_at?: string | null
          related_event_id?: string | null
          related_item_id?: string | null
          related_loan_id?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_decided_by_profiles_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_related_loan_id_fkey"
            columns: ["related_loan_id"]
            isOneToOne: false
            referencedRelation: "inventory_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requester_id_profiles_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          id: string
          module_key: string
          role_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          id?: string
          module_key: string
          role_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          id?: string
          module_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_request_approvals: {
        Row: {
          created_at: string
          id: string
          request_type: Database["public"]["Enums"]["request_type"]
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_type: Database["public"]["Enums"]["request_type"]
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_request_approvals_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          allows_club_wide: boolean
          base_role: string
          club_id: string
          created_at: string
          id: string
          is_system_default: boolean
          name: string
        }
        Insert: {
          allows_club_wide?: boolean
          base_role?: string
          club_id: string
          created_at?: string
          id?: string
          is_system_default?: boolean
          name: string
        }
        Update: {
          allows_club_wide?: boolean
          base_role?: string
          club_id?: string
          created_at?: string
          id?: string
          is_system_default?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          club_id: string
          contact: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          club_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          job_title: string | null
          role_id: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_title?: string | null
          role_id: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_title?: string | null
          role_id?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category: string
          club_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          club_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          club_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_boarding_passes: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          flight_id: string
          id: string
          notes: string | null
          seat: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          flight_id: string
          id?: string
          notes?: string | null
          seat?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          flight_id?: string
          id?: string
          notes?: string | null
          seat?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_boarding_passes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_boarding_passes_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "trip_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_boarding_passes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_flight_passengers: {
        Row: {
          created_at: string
          flight_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flight_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flight_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_flight_passengers_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "trip_flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_flight_passengers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_flights: {
        Row: {
          airline: string | null
          arrives_at: string | null
          created_at: string
          created_by: string | null
          departs_at: string
          destination: string
          flight_code: string
          gate: string | null
          id: string
          leg: Database["public"]["Enums"]["trip_leg"]
          notes: string | null
          origin: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          airline?: string | null
          arrives_at?: string | null
          created_at?: string
          created_by?: string | null
          departs_at: string
          destination: string
          flight_code: string
          gate?: string | null
          id?: string
          leg?: Database["public"]["Enums"]["trip_leg"]
          notes?: string | null
          origin: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          airline?: string | null
          arrives_at?: string | null
          created_at?: string
          created_by?: string | null
          departs_at?: string
          destination?: string
          flight_code?: string
          gate?: string | null
          id?: string
          leg?: Database["public"]["Enums"]["trip_leg"]
          notes?: string | null
          origin?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_flights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_flights_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_hotels: {
        Row: {
          address: string | null
          check_in_at: string
          check_out_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          check_in_at: string
          check_out_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_hotels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_hotels_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_luggage: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          quantity: number | null
          responsible_user_id: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          quantity?: number | null
          responsible_user_id?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          quantity?: number | null
          responsible_user_id?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_luggage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_luggage_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_luggage_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_meals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          meal_type: Database["public"]["Enums"]["trip_meal_type"]
          notes: string | null
          scheduled_at: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meal_type?: Database["public"]["Enums"]["trip_meal_type"]
          notes?: string | null
          scheduled_at: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meal_type?: Database["public"]["Enums"]["trip_meal_type"]
          notes?: string | null
          scheduled_at?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_meals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_meals_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_room_occupants: {
        Row: {
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_room_occupants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "trip_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_room_occupants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_rooms: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          notes: string | null
          room_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          notes?: string | null
          room_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          notes?: string | null
          room_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "trip_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_transport_passengers: {
        Row: {
          created_at: string
          id: string
          transport_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          transport_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          transport_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_transport_passengers_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "trip_transports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_transport_passengers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_transports: {
        Row: {
          created_at: string
          created_by: string | null
          departs_at: string
          destination: string
          id: string
          label: string | null
          leg: Database["public"]["Enums"]["trip_leg"]
          notes: string | null
          pickup_location: string
          transport_type: Database["public"]["Enums"]["trip_transport_type"]
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          departs_at: string
          destination: string
          id?: string
          label?: string | null
          leg?: Database["public"]["Enums"]["trip_leg"]
          notes?: string | null
          pickup_location: string
          transport_type?: Database["public"]["Enums"]["trip_transport_type"]
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          departs_at?: string
          destination?: string
          id?: string
          label?: string | null
          leg?: Database["public"]["Enums"]["trip_leg"]
          notes?: string | null
          pickup_location?: string
          transport_type?: Database["public"]["Enums"]["trip_transport_type"]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_transports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_transports_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_travelers: {
        Row: {
          created_at: string
          id: string
          role_note: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_note?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_note?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_travelers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          departure_at: string
          destination: string | null
          id: string
          match_event_id: string | null
          meeting_at: string | null
          meeting_point: string | null
          notes: string | null
          return_at: string | null
          status: Database["public"]["Enums"]["trip_status"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          departure_at: string
          destination?: string | null
          id?: string
          match_event_id?: string | null
          meeting_at?: string | null
          meeting_point?: string | null
          notes?: string | null
          return_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          departure_at?: string
          destination?: string | null
          id?: string
          match_event_id?: string | null
          meeting_at?: string | null
          meeting_point?: string | null
          notes?: string | null
          return_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_match_event_id_fkey"
            columns: ["match_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          created_at: string
          id: string
          module_key: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level: Database["public"]["Enums"]["access_level"]
          created_at?: string
          id?: string
          module_key: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          created_at?: string
          id?: string
          module_key?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve_request_type: {
        Args: {
          _requester_id: string
          _type: Database["public"]["Enums"]["request_type"]
          _user_id: string
        }
        Returns: boolean
      }
      can_edit_trip: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_request: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_trip: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      expense_report: {
        Args: { _club_id: string; _from: string; _to: string }
        Returns: {
          category: Database["public"]["Enums"]["expense_category"]
          expense_count: number
          paid_total: number
          pending_total: number
          total: number
        }[]
      }
      expense_summary: {
        Args: { _club_id: string }
        Returns: {
          month_total: number
          pending_count: number
          pending_total: number
        }[]
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          club_id: string
          club_name: string
          email: string
          expires_at: string
          id: string
          role_name: string
          team_name: string
        }[]
      }
      get_user_club_id: { Args: { _user_id: string }; Returns: string }
      has_club_access: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      has_event_access: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      has_module_access: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      has_module_approver_any: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      has_module_editor: {
        Args: { _module_key: string; _team_id: string; _user_id: string }
        Returns: boolean
      }
      has_module_editor_any: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      has_team_access: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      has_team_scope: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      inventory_catalog: {
        Args: { _club_id: string }
        Returns: {
          available_quantity: number
          category: string
          id: string
          image_path: string
          name: string
          total_quantity: number
          unit: string
        }[]
      }
      is_player_only: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      notifications_push_hook: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      notify_due_loans: { Args: never; Returns: undefined }
      notify_group: {
        Args: {
          _body: string
          _club_id: string
          _related_id: string
          _related_module: string
          _scope: string
          _scope_id: string
          _title: string
          _type: string
        }
        Returns: number
      }
      notify_users: {
        Args: {
          _body: string
          _club_id: string
          _related_id: string
          _related_module: string
          _title: string
          _type: string
          _user_ids: string[]
        }
        Returns: undefined
      }
      request_approver_module: {
        Args: { _type: Database["public"]["Enums"]["request_type"] }
        Returns: string
      }
      request_type_approver_ids: {
        Args: {
          _club_id: string
          _type: Database["public"]["Enums"]["request_type"]
        }
        Returns: {
          user_id: string
        }[]
      }
      user_sees_all_club: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "none" | "read" | "editor" | "approver"
      approver_override_mode: "grant" | "revoke"
      attendance_status: "invitado" | "confirmado" | "rechazado"
      availability_status: "apto" | "lesionado" | "en_duda"
      document_category:
        | "jugador"
        | "staff"
        | "institucional"
        | "legal"
        | "competicion"
        | "comercial"
        | "operativo"
      event_type:
        | "partido"
        | "entrenamiento"
        | "viaje"
        | "junta"
        | "evento_especial"
      expense_category:
        | "material"
        | "servicios"
        | "nomina"
        | "viajes"
        | "mantenimiento"
        | "proveedores"
        | "otro"
      payment_status: "pendiente" | "pagado"
      request_status:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "cancelada"
        | "completada"
      request_type:
        | "material"
        | "compra"
        | "pago_proveedor"
        | "permiso"
        | "cortesias"
        | "reembolso"
        | "medica"
        | "otro"
      task_priority: "baja" | "media" | "alta"
      task_status: "pendiente" | "en_progreso" | "completada" | "en_pausa"
      trip_leg: "ida" | "regreso"
      trip_meal_type: "desayuno" | "comida" | "cena" | "snack"
      trip_status: "planeacion" | "confirmado" | "en_curso" | "completado"
      trip_transport_type: "bus" | "van" | "taxi" | "privado" | "otro"
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
      access_level: ["none", "read", "editor", "approver"],
      approver_override_mode: ["grant", "revoke"],
      attendance_status: ["invitado", "confirmado", "rechazado"],
      availability_status: ["apto", "lesionado", "en_duda"],
      document_category: [
        "jugador",
        "staff",
        "institucional",
        "legal",
        "competicion",
        "comercial",
        "operativo",
      ],
      event_type: [
        "partido",
        "entrenamiento",
        "viaje",
        "junta",
        "evento_especial",
      ],
      expense_category: [
        "material",
        "servicios",
        "nomina",
        "viajes",
        "mantenimiento",
        "proveedores",
        "otro",
      ],
      payment_status: ["pendiente", "pagado"],
      request_status: [
        "pendiente",
        "aprobada",
        "rechazada",
        "cancelada",
        "completada",
      ],
      request_type: [
        "material",
        "compra",
        "pago_proveedor",
        "permiso",
        "cortesias",
        "reembolso",
        "medica",
        "otro",
      ],
      task_priority: ["baja", "media", "alta"],
      task_status: ["pendiente", "en_progreso", "completada", "en_pausa"],
      trip_leg: ["ida", "regreso"],
      trip_meal_type: ["desayuno", "comida", "cena", "snack"],
      trip_status: ["planeacion", "confirmado", "en_curso", "completado"],
      trip_transport_type: ["bus", "van", "taxi", "privado", "otro"],
    },
  },
} as const
