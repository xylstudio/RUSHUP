
const fs = require('fs');
const { execSync } = require('child_process');

// Keys that are publicly used in the frontend (must have NEXT_PUBLIC_ prefix)
const keys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_LIFF_ID',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'NEXT_PUBLIC_ENABLE_LINE_LOGIN',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
];

console.log('--- SYNCING VERCEL ENV VARIABLES ---');

// Load environment variables from .env.prod.local
const lines = fs.readFileSync('.env.prod.local', 'utf8').split('\n');
const env = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2 && !l.startsWith('#')) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1'); // Unquote if quoted
    env[key] = val;
  }
});

keys.forEach(k => {
  const v = env[k];
  if (v) {
    console.log(`Updating ${k}...`);
    try {
      // Use npx with CMD to bypass PS restrictions
      const cmd = `cmd /c "set PATH=C:\\Program Files\\nodejs\\;C:\\Users\\localadmin\\AppData\\Roaming\\npm\\;%PATH% && echo | set /p dummy=${v} | vercel env add ${k} production --force"`;
      // Actually, vercel env add <key> <env> accepts value on stdin
      // But windows echo is tricky with multiline or special chars. 
      // I'll try to just pass it directly if possible or use a temp file.
      fs.writeFileSync('temp_val.txt', v);
      execSync(`cmd /c "set PATH=C:\\Program Files\\nodejs\\;C:\\Users\\localadmin\\AppData\\Roaming\\npm\\;%PATH% && vercel env add ${k} production --force < temp_val.txt"`, { stdio: 'inherit' });
      fs.unlinkSync('temp_val.txt');
    } catch (e) {
      console.error(`Failed to sync ${k}: ${e.message}`);
    }
  } else {
    console.warn(`Key ${k} not found in .env.prod.local`);
  }
});

console.log('--- SYNC COMPLETE ---');
