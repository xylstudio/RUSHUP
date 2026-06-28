const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

// 1. Update handleResumeOrder definition
const targetHandleResume = `const handleResumeOrder = async (order: any) => {`
const replacementHandleResume = `const handleResumeOrder = async (order: any, mergeWithCurrentCart: boolean = false) => {`
if (code.includes(targetHandleResume)) {
    code = code.replace(targetHandleResume, replacementHandleResume)
}

// 2. Update setCart inside handleResumeOrder
const targetSetCart = `        setCart(
          directItems.map((i: any) => ({
            id: i.item_id,
            name: i.item?.name || 'Unknown Item',
            image_url: i.item?.image_url || '',
            sale_price: i.unit_price,
            cost_price: i.cost_price || 0,
            quantity: i.quantity,
            selected_modifiers: i.selected_modifiers || [],
            category_id: i.item?.category_id || 'uncategorized',
            customer_name: i.customer_name || null,
          }))
        )`
const replacementSetCart = `        const fetchedItems = directItems.map((i: any) => ({
            id: i.item_id,
            name: i.item?.name || 'Unknown Item',
            image_url: i.item?.image_url || '',
            sale_price: i.unit_price,
            cost_price: i.cost_price || 0,
            quantity: i.quantity,
            selected_modifiers: i.selected_modifiers || [],
            category_id: i.item?.category_id || 'uncategorized',
            customer_name: i.customer_name || null,
        }));
        
        if (mergeWithCurrentCart) {
            setCart(prev => [...fetchedItems, ...prev]);
        } else {
            setCart(fetchedItems);
        }`
if (code.includes(targetSetCart)) {
    code = code.replace(targetSetCart, replacementSetCart)
}

// 3. Add merge modal state right below isPinModalOpen
const targetState = `const [isPinModalOpen, setIsPinModalOpen] = useState(false)`
const replacementState = `const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [mergeTableTarget, setMergeTableTarget] = useState<{table: any, pendingOrder: any} | null>(null)`
if (code.includes(targetState)) {
    code = code.replace(targetState, replacementState)
}

// 4. Update the table selection logic inside the Table Modal
const targetTableClick = `                          } else {
                            setSelectedTable(table)
                            setShowTableModal(false)
                            if (pendingForThisTable.length > 0) {
                                handleResumeOrder(pendingForThisTable[0])
                            } else {
                                if (editingOrderId) {
                                    setCart([])
                                    setEditingOrderId(null)
                                    setEditingOrderNumber('')
                                    setTotalPaid(0)
                                }
                            }
                          }`
const replacementTableClick = `                          } else {
                            if (pendingForThisTable.length > 0 && cart.length > 0 && !editingOrderId) {
                                setMergeTableTarget({ table, pendingOrder: pendingForThisTable[0] })
                            } else {
                                setSelectedTable(table)
                                setShowTableModal(false)
                                if (pendingForThisTable.length > 0) {
                                    handleResumeOrder(pendingForThisTable[0])
                                } else {
                                    if (editingOrderId) {
                                        setCart([])
                                        setEditingOrderId(null)
                                        setEditingOrderNumber('')
                                        setTotalPaid(0)
                                    }
                                }
                            }
                          }`
if (code.includes(targetTableClick)) {
    code = code.replace(targetTableClick, replacementTableClick)
}

// 5. Add Merge Confirm Modal at the end of the file, right before `      {/* SUCCESS MODAL */}`
const targetModals = `      {/* SUCCESS MODAL */}`
const replacementModals = `      {/* MERGE MODAL */}
      {mergeTableTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-bold">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMergeTableTarget(null)}></div>
          <div className="animate-in zoom-in-95 relative w-[90%] max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <ShoppingBag size={32} />
            </div>
            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-gray-900">
              {locale === 'en' ? 'Merge with Table?' : locale === 'zh' ? 'Merge with Table?' : 'รวมรายการเข้าโต๊ะ?'}
            </h3>
            <p className="mb-8 text-sm font-bold text-gray-500">
              {locale === 'en' ? 'Table ' : locale === 'zh' ? 'Table ' : 'โต๊ะ '}{mergeTableTarget.table.name} {locale === 'en' ? ' already has an open order. Do you want to add your ' : locale === 'zh' ? ' already has an open order. Do you want to add your ' : ' มีออเดอร์ค้างอยู่แล้ว คุณต้องการนำรายการที่เลือกไว้ '}{cart.length} {locale === 'en' ? ' items to it?' : locale === 'zh' ? ' items to it?' : ' รายการ ไปรวมในบิลนี้เลยหรือไม่?'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setSelectedTable(mergeTableTarget.table)
                  setShowTableModal(false)
                  handleResumeOrder(mergeTableTarget.pendingOrder, true)
                  setMergeTableTarget(null)
                }}
                className="w-full rounded-2xl bg-[#1A1A18] py-4 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {locale === 'en' ? 'Merge items' : locale === 'zh' ? 'Merge items' : 'ยืนยันการรวมบิล (Merge)'}
              </button>
              <button
                onClick={() => {
                  setSelectedTable(mergeTableTarget.table)
                  setShowTableModal(false)
                  handleResumeOrder(mergeTableTarget.pendingOrder, false)
                  setMergeTableTarget(null)
                }}
                className="w-full rounded-2xl bg-gray-100 py-4 text-[13px] font-black uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-200"
              >
                {locale === 'en' ? 'Discard new items & view table' : locale === 'zh' ? 'Discard new items & view table' : 'ทิ้งรายการใหม่ & ดูบิลเดิม'}
              </button>
              <button
                onClick={() => setMergeTableTarget(null)}
                className="w-full py-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
              >
                {locale === 'en' ? 'Cancel' : locale === 'zh' ? 'Cancel' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* SUCCESS MODAL */}`
if (code.includes(targetModals)) {
    code = code.replace(targetModals, replacementModals)
}

fs.writeFileSync('components/pos/POSTerminal.tsx', code)
console.log("Patched merge logic in POSTerminal!")
