import { createClient } from '@supabase/supabase-js';

const url = 'https://brrpfuzoctcwwjuszpzb.supabase.co';
const key = 'sb_publishable_Qaq55qXL82SroX1f5pYR0g_8-FnjdGC'; // from .env (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('public_report_features').select('*').limit(5).order('created_at', { ascending: false });
  console.log("Features:", data);
  
  if (data) {
    for (const row of data) {
      if (row.thumbnail_url) {
        const { data: urlData1 } = supabase.storage.from("reports").getPublicUrl(row.thumbnail_url);
        const { data: urlData2 } = supabase.storage.from("report-evidence").getPublicUrl(row.thumbnail_url);
        
        console.log(`Thumbnail URL for ${row.report_id}:`);
        console.log(`Original DB string: ${row.thumbnail_url}`);
        console.log(`reports bucket URL:`, urlData1.publicUrl);
        console.log(`report-evidence bucket URL:`, urlData2.publicUrl);
      } else {
        console.log(`No thumbnail_url for ${row.report_id}`);
      }
    }
  }
}
test();
