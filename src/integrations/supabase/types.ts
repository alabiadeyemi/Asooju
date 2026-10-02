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
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          prompt: string | null;
          code: string | null;
          vfs_files: Record<string, string> | null;
          chat_messages: Json | null;
          preview_supabase_url: string | null;
          preview_supabase_anon_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          prompt?: string | null;
          code?: string | null;
          vfs_files?: Record<string, string> | null;
          chat_messages?: Json | null;
          preview_supabase_url?: string | null;
          preview_supabase_anon_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          prompt?: string | null;
          code?: string | null;
          vfs_files?: Record<string, string> | null;
          chat_messages?: Json | null;
          preview_supabase_url?: string | null;
          preview_supabase_anon_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
