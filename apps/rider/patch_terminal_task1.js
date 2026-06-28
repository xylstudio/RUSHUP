const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetMerge = `        if (mergeWithCurrentCart) {
            setCart([...fetchedItems, ...cart]);
        } else {
            setCart(fetchedItems);
        }`

const replacementMerge = `        if (mergeWithCurrentCart) {
            const combinedCart = [...fetchedItems, ...cart];
            setCart(combinedCart);
            
            // Auto-save the newly merged items to the database
            try {
                const insertData = cart.map(item => ({
                    order_id: order.id,
                    item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.sale_price,
                    cost_price: item.cost_price,
                    selected_modifiers: item.selected_modifiers || [],
                    customer_name: item.customer_name || null
                }));
                const { error: insertError } = await supabase.from('pos_order_items').insert(insertData);
                if (insertError) {
                    console.error('Auto-save merge error:', insertError);
                } else {
                    // Update the order's total amounts based on the combined cart
                    const subTotal = combinedCart.reduce((sum, item) => {
                        let itemTotal = Number(item.sale_price) * item.quantity;
                        if (item.selected_modifiers) {
                            item.selected_modifiers.forEach((m: any) => {
                                itemTotal += Number(m.price || 0) * item.quantity;
                            });
                        }
                        return sum + itemTotal;
                    }, 0);
                    
                    const taxRate = 7;
                    const taxAmount = (subTotal * taxRate) / 107;
                    const finalNetTotal = subTotal;
                    
                    await supabase.from('pos_orders').update({
                        total_amount: subTotal,
                        net_total: finalNetTotal,
                        tax_amount: taxAmount,
                        updated_at: new Date().toISOString()
                    }).eq('id', order.id);
                }
            } catch (err) {
                console.error('Error auto-saving merge', err);
            }
        } else {
            setCart(fetchedItems);
        }`

if (code.includes(targetMerge)) {
    code = code.replace(targetMerge, replacementMerge)
    fs.writeFileSync('components/pos/POSTerminal.tsx', code)
    console.log("Patched Task 1!")
} else {
    console.log("Target not found for Task 1")
}
