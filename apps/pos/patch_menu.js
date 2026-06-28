const fs = require('fs');
const file = '/Users/natthanchaimongkol/Downloads/XYLPROJECT-main สำเนา 3/components/pos/POSMenuManager.tsx';
let content = fs.readFileSync(file, 'utf8');

// Inside fetchData, fetch inventory_items and pos_menu_modifiers
const fetchReplacement = `
    const { data: categories } = await catQuery
    const { data: itemsData } = await itemQuery
    const { data: groups } = await groupQuery
    const { data: inventory } = await supabase.from('inventory_items').select('id, cost_price')
    const { data: modifiers } = await supabase.from('pos_menu_modifiers').select('id, name, recipe_data')
    
    // Calculate dynamic cost_price for each item
    if (itemsData && inventory) {
        const invCostMap = new Map(inventory.map(i => [i.id, i.cost_price || 0]))
        
        const calculateRecipeCost = (recipe: any[]) => {
            return (recipe || []).reduce((sum, ing) => {
                const cost = invCostMap.get(ing.ingredient_id) || 0
                return sum + (cost * Number(ing.quantity || 0) * (ing.factor || 1))
            }, 0)
        }
        
        itemsData.forEach(item => {
            const recipeCost = calculateRecipeCost(item.recipe_data || [])
            if (recipeCost > 0) {
                // Only override if there is a valid recipe
                item.cost_price = recipeCost
            }
        })
    }

    setCategories(categories || [])
    setItems(sortMenuItems(itemsData || []))
`;

content = content.replace(`
    const { data: categories } = await catQuery
    const { data: itemsData } = await itemQuery
    const { data: groups } = await groupQuery
    
    setCategories(categories || [])
    setItems(sortMenuItems(itemsData || []))`, fetchReplacement);

fs.writeFileSync(file, content);
console.log("Patched POSMenuManager.tsx");
