import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://brrpfuzoctcwwjuszpzb.supabase.co', 'dummy_key');
const path = 'https://brrpfuzoctcwwjuszpzb.supabase.co/storage/v1/object/public/report-evidence/uploads/123.jpg';
const { data } = supabase.storage.from('report-evidence').getPublicUrl(path);
console.log(data.publicUrl);
