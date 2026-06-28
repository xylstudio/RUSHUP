require('dotenv').config({ path: '.env.local' });
require('child_process').execSync('npx ts-node scratch/fix_customer_session.ts', { stdio: 'inherit' });
