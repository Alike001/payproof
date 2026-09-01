export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      invoices: {
        Row: {
          amount_minor: number
          cancelled_at: string | null
          client_reference: string | null
          created_at: string
          creator_user_id: string
          creator_wallet: string
          currency: string
          description: string
          due_date: string
          freelancer_name: string
          id: string
          lifecycle: string
          minor_unit_decimals: number
          public_id: string
          recipient_wallet: string
          verified_at: string | null
        }
        Insert: {
          amount_minor: number
          cancelled_at?: string | null
          client_reference?: string | null
          created_at?: string
          creator_user_id: string
          creator_wallet: string
          currency: string
          description: string
          due_date: string
          freelancer_name: string
          id?: string
          lifecycle?: string
          minor_unit_decimals?: number
          public_id?: string
          recipient_wallet: string
          verified_at?: string | null
        }
        Update: {
          amount_minor?: number
          cancelled_at?: string | null
          client_reference?: string | null
          created_at?: string
          creator_user_id?: string
          creator_wallet?: string
          currency?: string
          description?: string
          due_date?: string
          freelancer_name?: string
          id?: string
          lifecycle?: string
          minor_unit_decimals?: number
          public_id?: string
          recipient_wallet?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          last_checked_at: string | null
          mismatch_code: string | null
          mismatch_details: Json | null
          observed_amount_units: number | null
          observed_chain_id: number | null
          observed_recipient: string | null
          observed_token: string | null
          observed_tx_status: string | null
          quote_id: string
          state: string
          submitted_at: string
          submitted_by_wallet: string
          tx_hash: string
          verification_call_id: string | null
          verified_at: string | null
          verified_transfer_sender: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          last_checked_at?: string | null
          mismatch_code?: string | null
          mismatch_details?: Json | null
          observed_amount_units?: number | null
          observed_chain_id?: number | null
          observed_recipient?: string | null
          observed_token?: string | null
          observed_tx_status?: string | null
          quote_id: string
          state?: string
          submitted_at?: string
          submitted_by_wallet: string
          tx_hash: string
          verification_call_id?: string | null
          verified_at?: string | null
          verified_transfer_sender?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          last_checked_at?: string | null
          mismatch_code?: string | null
          mismatch_details?: Json | null
          observed_amount_units?: number | null
          observed_chain_id?: number | null
          observed_recipient?: string | null
          observed_token?: string | null
          observed_tx_status?: string | null
          quote_id?: string
          state?: string
          submitted_at?: string
          submitted_by_wallet?: string
          tx_hash?: string
          verification_call_id?: string | null
          verified_at?: string | null
          verified_transfer_sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_invoice_fk"
            columns: ["quote_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "invoice_id"]
          },
          {
            foreignKeyName: "payments_verification_call_fk"
            columns: ["verification_call_id"]
            isOneToOne: false
            referencedRelation: "telegraph_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invoice_id: string
          quoted_at: string
          rate_decimal: number
          source_amount_minor: number
          source_currency: string
          source_kind: string
          source_name: string
          source_observed_at: string | null
          target_currency: string
          telegraph_call_id: string | null
          usdc_amount_units: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invoice_id: string
          quoted_at: string
          rate_decimal: number
          source_amount_minor: number
          source_currency: string
          source_kind: string
          source_name: string
          source_observed_at?: string | null
          target_currency?: string
          telegraph_call_id?: string | null
          usdc_amount_units: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invoice_id?: string
          quoted_at?: string
          rate_decimal?: number
          source_amount_minor?: number
          source_currency?: string
          source_kind?: string
          source_name?: string
          source_observed_at?: string | null
          target_currency?: string
          telegraph_call_id?: string | null
          usdc_amount_units?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_telegraph_call_fk"
            columns: ["telegraph_call_id"]
            isOneToOne: false
            referencedRelation: "telegraph_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      telegraph_calls: {
        Row: {
          action_key: string
          attempt_role: string
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          intent: string
          invoice_id: string | null
          latency_ms: number | null
          miner_id: string
          miner_name: string
          payment_id: string | null
          quote_id: string | null
          request_sanitized: Json
          response_raw: Json | null
          status: string
          x402_amount_units: number | null
          x402_network: string | null
          x402_transaction: string | null
        }
        Insert: {
          action_key: string
          attempt_role: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          intent: string
          invoice_id?: string | null
          latency_ms?: number | null
          miner_id: string
          miner_name: string
          payment_id?: string | null
          quote_id?: string | null
          request_sanitized?: Json
          response_raw?: Json | null
          status: string
          x402_amount_units?: number | null
          x402_network?: string | null
          x402_transaction?: string | null
        }
        Update: {
          action_key?: string
          attempt_role?: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          intent?: string
          invoice_id?: string | null
          latency_ms?: number | null
          miner_id?: string
          miner_name?: string
          payment_id?: string | null
          quote_id?: string | null
          request_sanitized?: Json
          response_raw?: Json | null
          status?: string
          x402_amount_units?: number | null
          x402_network?: string | null
          x402_transaction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegraph_calls_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegraph_calls_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegraph_calls_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          actor_wallet_hash: string | null
          anonymous_session_hash: string | null
          creator_user_id: string | null
          event_name: string
          id: string
          invoice_id: string | null
          metadata: Json
          network_hash: string | null
          occurred_at: string
          traffic_source: string
        }
        Insert: {
          actor_wallet_hash?: string | null
          anonymous_session_hash?: string | null
          creator_user_id?: string | null
          event_name: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          network_hash?: string | null
          occurred_at?: string
          traffic_source?: string
        }
        Update: {
          actor_wallet_hash?: string | null
          anonymous_session_hash?: string | null
          creator_user_id?: string | null
          event_name?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          network_hash?: string | null
          occurred_at?: string
          traffic_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finalize_verified_payment: {
        Args: {
          p_observed_amount_units: number
          p_observed_chain_id: number
          p_observed_recipient: string
          p_observed_token: string
          p_observed_tx_status: string
          p_payment_id: string
          p_verification_call_id: string
          p_verified_transfer_sender: string
        }
        Returns: {
          invoice_id: string
          outcome: string
          payment_id: string
        }[]
      }
      reserve_telegraph_spend: {
        Args: {
          p_action_key: string
          p_amount_units: number
          p_attempt_role: string
          p_daily_budget_units: number
          p_intent: string
          p_invoice_id: string
          p_miner_id: string
          p_miner_name: string
          p_payment_id: string
          p_quote_id: string
          p_request_sanitized: Json
          p_x402_network: string
        }
        Returns: {
          call_id: string
          call_status: string
          reserved: boolean
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
    Enums: {},
  },
} as const

