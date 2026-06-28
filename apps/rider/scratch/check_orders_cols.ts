import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrdersSchema() {
    const { data, error } = await supabase.from('pos_orders').select('*').limit(1)
    if (error) {
        console.error(error)
    } else {
        console.log(JSON.stringify(Object.keys(data[0] || {}), null, 2))
    }
}

checkOrdersSchema()
