const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetInit = `  // --- INITIALIZATION ---
  useEffect(() => {`

const replacementInit = `  // --- LOCAL STORAGE PERSISTENCE ---
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('pos_saved_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedOrderType = localStorage.getItem('pos_saved_order_type');
      if (savedOrderType) setOrderType(savedOrderType as any);

      const savedDeliveryPlatform = localStorage.getItem('pos_saved_delivery_platform');
      if (savedDeliveryPlatform) setDeliveryPlatform(savedDeliveryPlatform);

      const savedPlatformOrderId = localStorage.getItem('pos_saved_platform_order_id');
      if (savedPlatformOrderId) setPlatformOrderId(savedPlatformOrderId);

      const savedEditingOrderId = localStorage.getItem('pos_saved_editing_order_id');
      if (savedEditingOrderId) setEditingOrderId(savedEditingOrderId);
      
      const savedEditingOrderNumber = localStorage.getItem('pos_saved_editing_order_number');
      if (savedEditingOrderNumber) setEditingOrderNumber(savedEditingOrderNumber);

      const savedSelectedTable = localStorage.getItem('pos_saved_selected_table');
      if (savedSelectedTable) {
        // Table needs to be verified against the loaded tables to ensure it still exists, 
        // but since tables might not be loaded yet, we can set it and wait.
        setSelectedTable(JSON.parse(savedSelectedTable));
      }
    } catch (e) {
      console.error('Failed to load POS state from localStorage', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_saved_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pos_saved_order_type', orderType);
  }, [orderType]);

  useEffect(() => {
    localStorage.setItem('pos_saved_delivery_platform', deliveryPlatform);
  }, [deliveryPlatform]);

  useEffect(() => {
    localStorage.setItem('pos_saved_platform_order_id', platformOrderId);
  }, [platformOrderId]);

  useEffect(() => {
    if (editingOrderId) localStorage.setItem('pos_saved_editing_order_id', editingOrderId);
    else localStorage.removeItem('pos_saved_editing_order_id');
  }, [editingOrderId]);

  useEffect(() => {
    if (editingOrderNumber) localStorage.setItem('pos_saved_editing_order_number', editingOrderNumber);
    else localStorage.removeItem('pos_saved_editing_order_number');
  }, [editingOrderNumber]);

  useEffect(() => {
    if (selectedTable) localStorage.setItem('pos_saved_selected_table', JSON.stringify(selectedTable));
    else localStorage.removeItem('pos_saved_selected_table');
  }, [selectedTable]);

  // --- INITIALIZATION ---
  useEffect(() => {`

if (code.includes(targetInit)) {
    code = code.replace(targetInit, replacementInit)
    fs.writeFileSync('components/pos/POSTerminal.tsx', code)
    console.log("Patched Task 2 LocalStorage!")
} else {
    console.log("Target not found for Task 2")
}
