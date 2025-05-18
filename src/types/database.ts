import { PatientInfo } from './patient';
import { SupabaseClient } from '@supabase/supabase-js';

// Basic type definitions
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
export type DbClient = SupabaseClient<Database>;

// Disease-related types
export interface Disease {
  disease_name: string;
  disease_code?: string;
  confidence: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Scan analysis types
export interface ScanAnalysisResult {
  scan_id?: number;
  condition: string;
  severity?: string;
  probability: number;
  predictions: Disease[];
  performed_at: string;
  recommendation: string;
  heatmap_url: string;
  heatmap_storage_path?: string | null;
  patient_info: PatientInfo;
}

export interface ScanPrediction {
  prediction_id: number;
  scan_id: number;
  predictions: Disease[];
  created_at: string;
}

export interface Scan {
  scan_id: number;
  auth_id: string;
  patient_id: number | null;
  filename: string;
  storage_path: string;
  heatmap_storage_path: string | null;
  file_size_kb: number | null;
  scan_type: string | null;
  body_part: string | null;
  performed_at: string;
  created_at: string;
  updated_at?: string;
}

// Helper function to type check predictions
export function isValidPredictions(predictions: unknown): predictions is Disease[] {
  if (!Array.isArray(predictions)) return false;
  
  return predictions.every(pred => 
    typeof pred === 'object' && 
    pred !== null &&
    'disease_name' in pred && 
    'confidence' in pred &&
    typeof pred.disease_name === 'string' &&
    typeof pred.confidence === 'number'
  );
}

// Main Database type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          auth_id: string;
          full_name: string | null;
          email: string;
          plan_id: number | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          auth_id: string;
          full_name?: string | null;
          email: string;
          plan_id?: number | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          auth_id?: string;
          full_name?: string | null;
          email?: string;
          plan_id?: number | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          plan_id: number;
          name: string;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          price_usd: number;
          billing_interval: string;
          max_scans_per_day: number;
          features: Json | null;
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          plan_id?: number;
          name: string;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          price_usd: number;
          billing_interval: string;
          max_scans_per_day: number;
          features?: Json | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_id?: number;
          name?: string;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          price_usd?: number;
          billing_interval?: string;
          max_scans_per_day?: number;
          features?: Json | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      scans: {
        Row: {
          scan_id: number;
          auth_id: string;
          patient_id: number | null;
          filename: string;
          storage_path: string;
          file_size_kb: number | null;
          scan_type: string | null;
          body_part: string | null;
          performed_at: string;
          created_at: string;
          updated_at?: string;
          heatmap_storage_path: string | null;
        };
        Insert: {
          scan_id?: number;
          auth_id: string;
          patient_id?: number | null;
          filename: string;
          storage_path: string;
          file_size_kb?: number | null;
          scan_type?: string | null;
          body_part?: string | null;
          performed_at?: string;
          created_at?: string;
          updated_at?: string;
          heatmap_storage_path?: string | null;
        };
        Update: {
          scan_id?: number;
          auth_id?: string;
          patient_id?: number | null;
          filename?: string;
          storage_path?: string;
          file_size_kb?: number | null;
          scan_type?: string | null;
          body_part?: string | null;
          performed_at?: string;
          created_at?: string;
          updated_at?: string;
          heatmap_storage_path?: string | null;
        };
      };
      scan_predictions: {
        Row: {
          prediction_id: number;
          scan_id: number;
          predictions: Json;
          created_at: string;
        };
        Insert: {
          prediction_id?: number;
          scan_id: number;
          predictions: Json;
          created_at?: string;
        };
        Update: {
          prediction_id?: number;
          scan_id?: number;
          predictions?: Json;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          patient_id: number;
          auth_id: string;
          first_name: string | null;
          last_name: string | null;
          date_of_birth: string | null;
          gender: string | null;
          country: string | null;
          city: string | null;
          created_at: string;
        };
        Insert: {
          patient_id?: number;
          auth_id: string;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          country?: string | null;
          city?: string | null;
          created_at?: string;
        };
        Update: {
          patient_id?: number;
          auth_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          country?: string | null;
          city?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          report_id: number;
          scan_id: number;
          title: string;
          content: string | null;
          created_by: string;
          shared_with: string[] | null;
          is_public: boolean | null;
          created_at: string;
        };
        Insert: {
          report_id?: number;
          scan_id: number;
          title: string;
          content?: string | null;
          created_by: string;
          shared_with?: string[] | null;
          is_public?: boolean | null;
          created_at?: string;
        };
        Update: {
          report_id?: number;
          scan_id?: number;
          title?: string;
          content?: string | null;
          created_by?: string;
          shared_with?: string[] | null;
          is_public?: boolean | null;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          subscription_id: number;
          auth_id: string;
          plan_id: number;
          stripe_subscription_id: string | null;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          subscription_id?: number;
          auth_id: string;
          plan_id: number;
          stripe_subscription_id?: string | null;
          status: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subscription_id?: number;
          auth_id?: string;
          plan_id?: number;
          stripe_subscription_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_history: {
        Row: {
          payment_id: number;
          auth_id: string;
          subscription_id: number | null;
          stripe_payment_intent_id: string | null;
          amount_usd: number;
          status: string;
          payment_method: string | null;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          payment_id?: number;
          auth_id: string;
          subscription_id?: number | null;
          stripe_payment_intent_id?: string | null;
          amount_usd: number;
          status: string;
          payment_method?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          payment_id?: number;
          auth_id?: string;
          subscription_id?: number | null;
          stripe_payment_intent_id?: string | null;
          amount_usd?: number;
          status?: string;
          payment_method?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      scans_view: {
        Row: {
          scan_id: number;
          auth_id: string;
          patient_id: number | null;
          filename: string;
          storage_path: string;
          heatmap_storage_path: string | null;
          performed_at: string;
          user_email: string;
        };
      };
      public_statistics: {
        Row: {
          total_scans: number;
          total_users: number;
        };
      };
    };
    Functions: {
      get_user_scan_count_by_date: {
        Args: {
          user_auth_id: string;
          scan_date: string;
        };
        Returns: number;
      };
      get_scans_done_by_user: {
        Args: {
          user_auth_id: string;
        };
        Returns: number;
      };
      get_all_users_scan_counts: {
        Args: Record<string, never>;
        Returns: {
          total_users: number;
          total_scans: number;
        }[];
      };
      get_public_total_scans: {
        Args: Record<string, never>;
        Returns: number;
      };
      store_scan_predictions: {
        Args: {
          p_scan_id: number;
          p_predictions: Json;
        };
        Returns: undefined;
      };
      get_scan_predictions: {
        Args: {
          p_scan_id: number;
        };
        Returns: Json;
      };
      get_top_prediction: {
        Args: {
          p_scan_id: number;
        };
        Returns: {
          disease_name: string;
          confidence: number;
        }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      user_can_access_own_data: {
        Args: {
          user_id: string;
        };
        Returns: boolean;
      };
      create_user_safely: {
        Args: {
          p_auth_id: string;
          p_email: string;
          p_full_name: string;
          p_plan_id: number | null;
        };
        Returns: unknown;
      };
      ensure_default_plans: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
  };
} 