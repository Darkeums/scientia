import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace with your actual Supabase credentials
const supabaseUrl = 'https://ewyfwhortgkmywkdsscg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eWZ3aG9ydGdrbXl3a2Rzc2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTcyMDgsImV4cCI6MjA4NTc5MzIwOH0.edwKuTBi98xxX0C-YZtQHoLpGblmWq5vZZc7tuucmyU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);