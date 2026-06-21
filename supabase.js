import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yuyusxbsvjpuhdebwnwc.supabase.co';
const supabaseKey = 'sb_publishable_dpXYtn17VQdS5JaT_K-0LA__489xIh1';

export const supabase = createClient(supabaseUrl, supabaseKey);