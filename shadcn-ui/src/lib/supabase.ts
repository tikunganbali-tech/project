import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ahytxsoqswtpurvtbqcr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeXR4c29xc3d0cHVydnRicWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTI2NjIsImV4cCI6MjA4MTUyODY2Mn0.hfGCggtNyAxHVPW6LcZCILIYFIhei-Pi_1LfdmOSwvM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    
    if (error) {
      // If table doesn't exist, that's okay - connection is working
      if (error.code === '42P01') {
        return { success: true, message: 'Supabase connected successfully!' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: true, message: 'Supabase connected successfully!', data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}