const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

// 1. Add State
const targetState = `  const [mergeTableTarget, setMergeTableTarget] = useState<{table: any, pendingOrder: any} | null>(null)`
const replacementState = `  const [mergeTableTarget, setMergeTableTarget] = useState<{table: any, pendingOrder: any} | null>(null)
  const [pendingOrderTypeSwitch, setPendingOrderTypeSwitch] = useState<'dine_in' | 'takeaway' | 'delivery' | null>(null)`

if (code.includes(targetState)) {
    code = code.replace(targetState, replacementState)
}

// 2. Replace onClick logic for Order Type buttons
// They are located at: onClick={() => setOrderType('dine_in')}
const targetDineIn = `onClick={() => setOrderType('dine_in')}`
const replacementDineIn = `onClick={() => {
    if (cart.length > 0 || editingOrderId) {
        setPendingOrderTypeSwitch('dine_in');
    } else {
        setOrderType('dine_in');
    }
}}`
code = code.replace(targetDineIn, replacementDineIn)

const targetTakeaway = `onClick={() => {
                    setSelectedTable(null)
                    setOrderType('takeaway')
                  }}`
const replacementTakeaway = `onClick={() => {
                    if (cart.length > 0 || editingOrderId) {
                        setPendingOrderTypeSwitch('takeaway');
                    } else {
                        setSelectedTable(null);
                        setOrderType('takeaway');
                    }
                  }}`
code = code.replace(targetTakeaway, replacementTakeaway)

const targetDelivery = `onClick={() => {
                    setOrderType('delivery')
                    setSelectedTable(null)
                    if (!deliveryPlatform) setDeliveryPlatform('grab')
                  }}`
const replacementDelivery = `onClick={() => {
                    if (cart.length > 0 || editingOrderId) {
                        setPendingOrderTypeSwitch('delivery');
                    } else {
                        setOrderType('delivery');
                        setSelectedTable(null);
                        if (!deliveryPlatform) setDeliveryPlatform('grab');
                    }
                  }}`
code = code.replace(targetDelivery, replacementDelivery)

// 3. Add the Modal UI
const targetModal = `{/* MERGE MODAL */}`
const replacementModal = `{/* ORDER TYPE SWITCH MODAL */}
      {pendingOrderTypeSwitch && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center font-bold">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPendingOrderTypeSwitch(null)}></div>
          <div className="animate-in zoom-in-95 relative w-[90%] max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
              <ShoppingBag size={32} />
            </div>
            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-gray-900">
              {locale === 'en' ? 'Change Order Type?' : locale === 'zh' ? 'Change Order Type?' : 'เปลี่ยนประเภทการสั่ง?'}
            </h3>
            <p className="mb-8 text-sm font-bold text-gray-500">
              {locale === 'en' ? 'You have items in the cart or an active order. Are you sure you want to switch to ' : locale === 'zh' ? 'You have items in the cart or an active order. Are you sure you want to switch to ' : 'คุณมีรายการสินค้าในตะกร้าหรือกำลังแก้ไขบิลอยู่ คุณแน่ใจหรือไม่ที่จะเปลี่ยนประเภทเป็น '}
              {pendingOrderTypeSwitch === 'dine_in' ? 'Dine-In' : pendingOrderTypeSwitch === 'takeaway' ? 'Takeaway' : 'Delivery'}?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  const newType = pendingOrderTypeSwitch;
                  setOrderType(newType);
                  if (newType !== 'dine_in') {
                      setSelectedTable(null);
                  }
                  if (newType === 'delivery' && !deliveryPlatform) {
                      setDeliveryPlatform('grab');
                  }
                  setPendingOrderTypeSwitch(null);
                  
                  // Auto-update db if editing
                  if (editingOrderId) {
                      await supabase.from('pos_orders').update({ order_type: newType, table_id: newType !== 'dine_in' ? null : undefined }).eq('id', editingOrderId);
                  }
                }}
                className="w-full rounded-2xl bg-red-500 py-4 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {locale === 'en' ? 'Yes, change type' : locale === 'zh' ? 'Yes, change type' : 'ยืนยันการเปลี่ยนประเภท'}
              </button>
              <button
                onClick={() => setPendingOrderTypeSwitch(null)}
                className="w-full py-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
              >
                {locale === 'en' ? 'Cancel' : locale === 'zh' ? 'Cancel' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MERGE MODAL */}`

if (code.includes(targetModal)) {
    code = code.replace(targetModal, replacementModal)
    fs.writeFileSync('components/pos/POSTerminal.tsx', code)
    console.log("Patched Task 3 Modal!")
} else {
    console.log("Target not found for Task 3 Modal")
}
