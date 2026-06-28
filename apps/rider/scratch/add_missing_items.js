
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const newItems = [
    { name: "รัม", unit: "ml", purchase_unit: "กิโลกรัม", conversion_factor: 1000 },
    { name: "อโรม่าสูตร 2", unit: "กรัม", purchase_unit: "กิโลกรัม", conversion_factor: 1000 },
    { name: "วิปครีม", unit: "ml", purchase_unit: "ขวด", conversion_factor: 1000 },
    { name: "แก้ว 12 oz", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 50 },
    { name: "แก้ว 16 oz", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 50 },
    { name: "ฝายกดื่มสั้น", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ฝายกดื่มยาว", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ฝาฮัพ", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "แก้วเล็กต้อน", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 50 },
    { name: "ถุงเดี่ยว 4*14", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ถุงเล็ก 6*14", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ถุงกลาง 7*15", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ถุงใหญ่ 9*18", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ถุงคู่", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ถุงดำ", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 50 },
    { name: "ถุงซิปน้ำแข็ง 13*20", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 50 },
    { name: "กระดาษปิดฝา Delivery", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "หลอดเล็ก", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "หลอดงอ", unit: "ชิ้น", purchase_unit: "แพ็ค", conversion_factor: 100 },
    { name: "ทิชชู่วลูกค้า", unit: "แพ็ค", purchase_unit: "แพ็ค", conversion_factor: 1 },
    { name: "ทิชชู่พนักงาน", unit: "แพ็ค", purchase_unit: "แพ็ค", conversion_factor: 1 },
    { name: "ทิชชู่ห้องน้ำ", unit: "แพ็ค", purchase_unit: "แพ็ค", conversion_factor: 1 },
];

async function run() {
    console.log("--- Adding New Inventory Items ---");
    
    for (const item of newItems) {
        const { data: existing } = await supabase.from('inventory_items').select('id').eq('name', item.name).single();
        if (existing) {
            console.log(`- Skipping ${item.name} (Already exists)`);
        } else {
            const { error } = await supabase.from('inventory_items').insert(item);
            if (error) console.error(`Error inserting ${item.name}:`, error);
            else console.log(`+ Added: ${item.name} (${item.purchase_unit})`);
        }
    }

    console.log("--- Update Complete ---");
}

run();
