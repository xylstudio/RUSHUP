import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCols() {
    const { data: cols } = await supabase.rpc('get_table_columns_v2', { t_name: 'pos_orders' })
    if (cols) {
        console.log(cols)
    } else {
        // Fallback: check one record
        const { data } = await supabase.from('pos_orders').select('*').limit(1).maybeSingle()
        console.log(Object.keys(data || {}))
    }
}

checkCols()
