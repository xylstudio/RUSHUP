const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const collaboratorId = 'a73f8ca7-8868-44d6-be1c-ecb94885d2f3';

function normalizeLineUserId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return /^U[0-9a-f]{32}$/.test(trimmed) ? trimmed : null;
}

async function resolveLineUserIdBySupabaseUserId(userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;

  const metadata = data.user.user_metadata || {};
  const appMetadata = data.user.app_metadata || {};

  const candidates = [
    metadata.line_user_id,
    metadata.lineUserId,
    appMetadata.line_user_id,
  ];

  const identities = data.user.identities || [];
  for (const identity of identities) {
    const provider = String(identity.provider || '').toLowerCase();
    const identityData = identity.identity_data || {};
    if (provider === 'line') {
      candidates.push(identityData.userId, identityData.user_id, identityData.sub);
    }
  }

  const resolved = candidates.map(item => normalizeLineUserId(item)).find(Boolean);
  if (resolved) return resolved;

  // Fallback: line_users table
  const { data: dbEntry } = await supabaseAdmin.from('line_users').select('line_user_id').eq('user_id', userId).maybeSingle();
  return dbEntry?.line_user_id || null;
}

async function run() {
  const lineId = await resolveLineUserIdBySupabaseUserId(collaboratorId);
  console.log('Resolved LINE ID:', lineId);
  
  // Also check notification preferences
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(collaboratorId);
  const meta = authUser?.user?.user_metadata || {};
  console.log('\nuser_metadata keys:', Object.keys(meta));
  console.log('line_notification_enabled:', meta.line_notification_enabled);
  console.log('line_notifications:', meta.line_notifications);
  console.log('notif_preferences:', meta.notification_preferences);
}
run();
