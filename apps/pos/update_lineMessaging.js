const fs = require('fs');
const file = 'app/api/staff/work-reports/notify-customer/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the sendLinePushToSupabaseUser to loop over collaborators
// ... (I'll use code edit instead)
