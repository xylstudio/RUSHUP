
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ingredients = [
    { name: "เมล็ดกาแฟคั่วเข้ม", unit: "กรัม", purchase_unit: "ถุง (500g)", conversion_factor: 500 },
    { name: "เมล็ดกาแฟคั่วกลาง", unit: "กรัม", purchase_unit: "ถุง (500g)", conversion_factor: 500 },
    { name: "นมข้นหวาน", unit: "ml", purchase_unit: "กระป๋อง", conversion_factor: 380 },
    { name: "นมข้นจืด", unit: "ml", purchase_unit: "กระป๋อง", conversion_factor: 405 },
    { name: "ครีมเหลว", unit: "ml", purchase_unit: "กล่อง", conversion_factor: 1000 },
    { name: "นมสด", unit: "ml", purchase_unit: "แกลลอน (2L)", conversion_factor: 2000 },
    { name: "ผงโกโก้", unit: "กรัม", purchase_unit: "ถุง", conversion_factor: 500 },
    { name: "น้ำเชื่อม", unit: "ml", purchase_unit: "แกลลอน", conversion_factor: 5000 },
    { name: "ผงมัทฉะ", unit: "กรัม", purchase_unit: "ถุง", conversion_factor: 100 },
    { name: "ผงชาไทย", unit: "กรัม", purchase_unit: "ถุง", conversion_factor: 400 },
    { name: "ผงชาเขียว", unit: "กรัม", purchase_unit: "ถุง", conversion_factor: 400 },
    { name: "น้ำผึ้ง", unit: "ml", purchase_unit: "ขวด", conversion_factor: 1000 },
    { name: "ไซรัปคาราเมล", unit: "ml", purchase_unit: "ขวด", conversion_factor: 750 },
    { name: "ไซรัปวานิลลา", unit: "ml", purchase_unit: "ขวด", conversion_factor: 750 },
    { name: "ไซรัปสตรอว์เบอร์รี่", unit: "ml", purchase_unit: "ขวด", conversion_factor: 750 },
    { name: "ไซรัปมิ้นต์", unit: "ml", purchase_unit: "ขวด", conversion_factor: 750 },
    { name: "น้ำแดง", unit: "ml", purchase_unit: "ขวด", conversion_factor: 710 },
    { name: "เนยถั่ว", unit: "กรัม", purchase_unit: "กระปุก", conversion_factor: 500 },
    { name: "ผงถ่าน (Charcoal)", unit: "กรัม", purchase_unit: "ซอง", conversion_factor: 100 },
    { name: "น้ำส้ม", unit: "ml", purchase_unit: "ขวด", conversion_factor: 1000 },
    { name: "น้ำมะนาว", unit: "ml", purchase_unit: "ขวด", conversion_factor: 1000 },
    { name: "น้ำสับปะรด", unit: "ml", purchase_unit: "ขวด", conversion_factor: 1000 },
    { name: "น้ำมะพร้าว", unit: "ml", purchase_unit: "ขวด", conversion_factor: 1000 },
];

const categories = [
    "กาแฟร้อน (Hot Coffee)",
    "Non-coffee (ร้อน)",
    "กาแฟเย็น (Iced Coffee)",
    "ชาเย็น (Iced Tea)",
    "มัทฉะเย็น (Iced Matcha)",
    "นม/โกโก้ (Milk/Cocoa)"
];

const recipes = [
    // กาแฟร้อน
    { category: "กาแฟร้อน (Hot Coffee)", name: "Espresso shot (ร้อน)", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }], price: 45 },
    { category: "กาแฟร้อน (Hot Coffee)", name: "อเมริกาโน่ร้อน", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }], price: 50 },
    { category: "กาแฟร้อน (Hot Coffee)", name: "ลาเต้ร้อน", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมสด", qty: 250 }], price: 60 },
    { category: "กาแฟร้อน (Hot Coffee)", name: "คาปูชิโน่ร้อน", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมสด", qty: 250 }], price: 60 },
    { category: "กาแฟร้อน (Hot Coffee)", name: "มอคค่าร้อน", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมสด", qty: 250 }, { name: "ผงโกโก้", qty: 3 }], price: 65 },
    { category: "กาแฟร้อน (Hot Coffee)", name: "คาราเมลมัคคิอาโต้ร้อน", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมสด", qty: 250 }, { name: "ไซรัปคาราเมล", qty: 3 }], price: 70 },
    
    // Non-coffee ร้อน
    { category: "Non-coffee (ร้อน)", name: "มัทฉะลาเต้ร้อน", ingredients: [{ name: "ผงมัทฉะ", qty: 3 }, { name: "นมสด", qty: 250 }], price: 65 },
    { category: "Non-coffee (ร้อน)", name: "มัทฉะใสร้อน", ingredients: [{ name: "ผงมัทฉะ", qty: 2 }], price: 55 },
    { category: "Non-coffee (ร้อน)", name: "โกโก้ร้อน", ingredients: [{ name: "ผงโกโก้", qty: 10 }, { name: "นมสด", qty: 200 }], price: 60 },
    { category: "Non-coffee (ร้อน)", name: "น้ำผึ้งเลมอนร้อน", ingredients: [{ name: "น้ำผึ้ง", qty: 30 }, { name: "น้ำมะนาว", qty: 15 }], price: 55 },

    // กาแฟเย็น
    { category: "กาแฟเย็น (Iced Coffee)", name: "เอสเย็น", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมข้นหวาน", qty: 15 }, { name: "ครีมเหลว", qty: 45 }, { name: "นมสด", qty: 45 }], price: 65 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "อเมริกาโน่เย็น", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }], price: 60 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "ลาเต้เย็น", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "น้ำเชื่อม", qty: 15 }, { name: "ครีมเหลว", qty: 30 }, { name: "นมสด", qty: 120 }], price: 70 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "คาปูชิโน่เย็น", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมข้นหวาน", qty: 15 }, { name: "ครีมเหลว", qty: 45 }, { name: "นมสด", qty: 45 }], price: 70 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "มอคค่าเย็น", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "นมข้นหวาน", qty: 15 }, { name: "ครีมเหลว", qty: 30 }, { name: "นมสด", qty: 60 }, { name: "ผงโกโก้", qty: 5 }], price: 75 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "คาราเมลมัคคิอาโต้เย็น", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "ไซรัปวานิลลา", qty: 5 }, { name: "นมสด", qty: 120 }, { name: "ไซรัปคาราเมล", qty: 15 }], price: 80 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "ลาเต้เนยถั่ว", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "น้ำเชื่อม", qty: 15 }, { name: "ครีมเหลว", qty: 30 }, { name: "นมสด", qty: 90 }, { name: "เนยถั่ว", qty: 40 }], price: 85 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "ชาโคลลาเต้", ingredients: [{ name: "เมล็ดกาแฟคั่วเข้ม", qty: 18 }, { name: "ผงถ่าน (Charcoal)", qty: 2 }, { name: "ไซรัปวานิลลา", qty: 10 }, { name: "นมสด", qty: 100 }, { name: "ไซรัปคาราเมล", qty: 2 }], price: 85 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "อเมริกาโน่ส้ม", ingredients: [{ name: "เมล็ดกาแฟคั่วกลาง", qty: 18 }, { name: "น้ำส้ม", qty: 120 }], price: 80 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "อเมริกาโน่น้ำผึ้งมะนาว", ingredients: [{ name: "เมล็ดกาแฟคั่วกลาง", qty: 18 }, { name: "น้ำเชื่อม", qty: 15 }, { name: "น้ำผึ้ง", qty: 30 }, { name: "น้ำมะนาว", qty: 15 }], price: 75 },
    { category: "กาแฟเย็น (Iced Coffee)", name: "ไหมไทยเปรสโซ่", ingredients: [{ name: "เมล็ดกาแฟคั่วกลาง", qty: 18 }, { name: "น้ำเชื่อม", qty: 15 }, { name: "น้ำส้ม", qty: 45 }, { name: "น้ำมะนาว", qty: 22.5 }, { name: "น้ำสับปะรด", qty: 30 }], price: 85 },

    // ชา
    { category: "ชาเย็น (Iced Tea)", name: "ชาไทยเย็น", ingredients: [{ name: "ผงชาไทย", qty: 20 }, { name: "นมข้นหวาน", qty: 30 }, { name: "นมข้นจืด", qty: 30 }, { name: "นมสด", qty: 30 }], price: 60 },
    { category: "ชาเย็น (Iced Tea)", name: "ชาเขียวนมเย็น", ingredients: [{ name: "ผงชาเขียว", qty: 20 }, { name: "นมข้นหวาน", qty: 30 }, { name: "นมข้นจืด", qty: 30 }, { name: "นมสด", qty: 30 }], price: 60 },
    
    // มัทฉะ
    { category: "มัทฉะเย็น (Iced Matcha)", name: "มัทฉะลาเต้เย็น", ingredients: [{ name: "ผงมัทฉะ", qty: 5 }, { name: "ครีมเหลว", qty: 15 }, { name: "นมสด", qty: 120 }], price: 75 },
    { category: "มัทฉะเย็น (Iced Matcha)", name: "มัทฉะสตรอว์เบอร์รี่", ingredients: [{ name: "ผงมัทฉะ", qty: 5 }, { name: "ครีมเหลว", qty: 15 }, { name: "นมสด", qty: 90 }, { name: "ไซรัปสตรอว์เบอร์รี่", qty: 50 }], price: 85 },
    { category: "มัทฉะเย็น (Iced Matcha)", name: "มัทฉะน้ำผึ้งมะนาว", ingredients: [{ name: "ผงมัทฉะ", qty: 3 }, { name: "น้ำผึ้ง", qty: 40 }, { name: "น้ำเชื่อม", qty: 5 }, { name: "น้ำมะนาว", qty: 30 }], price: 80 },
    { category: "มัทฉะเย็น (Iced Matcha)", name: "มัทฉะส้ม", ingredients: [{ name: "ผงมัทฉะ", qty: 3 }, { name: "น้ำผึ้ง", qty: 15 }, { name: "น้ำส้ม", qty: 120 }], price: 85 },
    { category: "มัทฉะเย็น (Iced Matcha)", name: "มัทฉะมะพร้าว", ingredients: [{ name: "ผงมัทฉะ", qty: 3 }, { name: "น้ำเชื่อม", qty: 10 }, { name: "น้ำมะพร้าว", qty: 120 }], price: 85 },

    // นม/โกโก้
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "นมสดเย็น", ingredients: [{ name: "นมสด", qty: 90 }, { name: "นมข้นจืด", qty: 30 }, { name: "น้ำเชื่อม", qty: 30 }], price: 55 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "นมสดมิกซ์เบอร์รี่/สตรอว์", ingredients: [{ name: "นมสด", qty: 90 }, { name: "นมข้นจืด", qty: 30 }, { name: "ไซรัปสตรอว์เบอร์รี่", qty: 60 }], price: 65 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "นมชมพู", ingredients: [{ name: "นมสด", qty: 90 }, { name: "นมข้นจืด", qty: 30 }, { name: "น้ำแดง", qty: 30 }], price: 55 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "นมคาราเมล", ingredients: [{ name: "นมสด", qty: 120 }, { name: "ไซรัปคาราเมล", qty: 20 }], price: 65 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "นมน้ำผึ้ง", ingredients: [{ name: "นมสด", qty: 120 }, { name: "น้ำผึ้ง", qty: 30 }], price: 65 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "โกโก้เย็น", ingredients: [{ name: "ผงโกโก้", qty: 20 }, { name: "นมสด", qty: 60 }, { name: "นมข้นจืด", qty: 30 }, { name: "นมข้นหวาน", qty: 30 }], price: 65 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "โกโก้มิ้นต์", ingredients: [{ name: "ผงโกโก้", qty: 30 }, { name: "นมสด", qty: 65 }, { name: "นมข้นจืด", qty: 30 }, { name: "ไซรัปมิ้นต์", qty: 20 }], price: 75 },
    { category: "นม/โกโก้ (Milk/Cocoa)", name: "โกโก้สตรอว์เบอร์รี่", ingredients: [{ name: "ผงโกโก้", qty: 20 }, { name: "นมสด", qty: 60 }, { name: "นมข้นจืด", qty: 30 }, { name: "ไซรัปสตรอว์เบอร์รี่", qty: 30 }], price: 75 },
];

async function run() {
    console.log("--- Starting Comprehensive Menu & Recipe Setup ---");

    // 1. Get or Create Categories
    console.log("Processing Categories...");
    const categoryMap = {};
    for (const catName of categories) {
        const { data: existing } = await supabase.from('pos_menu_categories').select('id').eq('name', catName).single();
        if (existing) {
            categoryMap[catName] = existing.id;
        } else {
            const { data, error } = await supabase.from('pos_menu_categories').insert({ name: catName }).select().single();
            if (error) console.error(`Error inserting category ${catName}:`, error);
            else categoryMap[catName] = data.id;
        }
    }

    // 2. Get or Create Ingredients
    console.log("Processing Ingredients...");
    for (const item of ingredients) {
        const { data: existing } = await supabase.from('inventory_items').select('id').eq('name', item.name).single();
        if (existing) {
            await supabase.from('inventory_items').update(item).eq('id', existing.id);
        } else {
            await supabase.from('inventory_items').insert(item);
        }
    }

    // Fetch Fresh Ingredients to get IDs
    const { data: dbIngredients } = await supabase.from('inventory_items').select('id, name, unit');
    const ingredientMap = Object.fromEntries(dbIngredients.map(i => [i.name, i]));

    // 3. Get or Create Menu Items and Recipes
    console.log("Processing Menu Items and Recipes...");
    for (const recipe of recipes) {
        const catId = categoryMap[recipe.category];
        
        // Map ingredients to recipe_data format
        const recipeData = recipe.ingredients.map(ri => {
            const ing = ingredientMap[ri.name];
            if (!ing) return null;
            return {
                ingredient_id: ing.id,
                name: ing.name,
                quantity: ri.qty,
                base_unit: ing.unit,
                recipe_unit: ing.unit,
                factor: 1
            };
        }).filter(Boolean);

        const { data: existing } = await supabase.from('pos_menu_items').select('id').eq('name', recipe.name).single();
        if (existing) {
            const { error } = await supabase.from('pos_menu_items').update({
                category_id: catId,
                sale_price: recipe.price,
                recipe_data: recipeData,
                is_active: true
            }).eq('id', existing.id);
            if (error) console.error(`Error updating menu item ${recipe.name}:`, error);
            else console.log(`✓ Updated: ${recipe.name}`);
        } else {
            const { error } = await supabase.from('pos_menu_items').insert({
                category_id: catId,
                name: recipe.name,
                sale_price: recipe.price,
                recipe_data: recipeData,
                is_active: true
            });
            if (error) console.error(`Error inserting menu item ${recipe.name}:`, error);
            else console.log(`✓ Created: ${recipe.name}`);
        }
    }

    console.log("--- Setup Complete ---");
}

run();
