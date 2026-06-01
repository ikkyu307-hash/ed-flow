import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// Check if Supabase has been configured with real keys
const isSupabaseConfigured = 
  !!supabaseUrl && 
  supabaseUrl.trim() !== "" &&
  supabaseUrl !== "your_supabase_url_here" &&
  !!supabaseAnonKey &&
  supabaseAnonKey.trim() !== "" &&
  supabaseAnonKey !== "your_supabase_anon_key_here";

let supabase: any = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
  }
} else {
  console.warn("Supabase has not been configured. Running in Local Mock Data mode.");
}

export { supabase, isSupabaseConfigured };
