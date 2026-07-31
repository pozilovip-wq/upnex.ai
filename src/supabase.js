import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ifhjjafkogxauqhrmzaj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1bh73jL33j57_tYiX55ToQ_heGIWbTG'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
