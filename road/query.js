require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const { data: features } = await supabase.from('public_report_features').select('report_id, thumbnail_url').order('created_at', { ascending: false }).limit(5);
  console.log("Features:", JSON.stringify(features, null, 2));
  
  if (features && features.length > 0) {
    const ids = features.map(f => f.report_id);
    const { data: media } = await supabase.from('report_media').select('report_id, sanitized_path, approved_public_derivative_path, private_original_path').in('report_id', ids);
    console.log("Media:", JSON.stringify(media, null, 2));
    
    for (const row of features) {
      if (row.thumbnail_url && !row.thumbnail_url.startsWith("http")) {
        const { data: urlData } = supabase.storage.from("reports").getPublicUrl(row.thumbnail_url);
        console.log(`URL for ${row.thumbnail_url}:`, urlData.publicUrl);
      }
    }
  }
}
run();
