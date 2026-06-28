const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

// 1. Add imports
const imports = `import { useReactToPrint } from 'react-to-print'
import { POSReceipt } from './POSReceipt'`;
content = content.replace("import POSCashActionModal from './POSCashActionModal'", "import POSCashActionModal from './POSCashActionModal'\n" + imports);

// 2. Add useRef and print hook
const hookInjection = `  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ received: number, change: number, orderId: string, orderNumber: string, items: any[], subtotal: number, discount: number, tax: number, serviceCharge: number, total: number, paymentMethod: string, timestamp: string } | null>(null)

  const receiptRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  })
`;
content = content.replace(/  const \[showCashPaymentModal, setShowCashPaymentModal\] = useState\(false\)\n  const \[cashReceived, setCashReceived\] = useState\(''\)\n  const \[paymentSuccessData, setPaymentSuccessData\] = useState<{ received: number, change: number } \| null>\(null\)/, hookInjection.trim());

// 3. Update the handleProcessPayment success logic for CASH
// Currently we have:
/*
                  onClick={async () => {
                    const received = Number(cashReceived);
                    if (received < cartTotal) {
                      alert('รับเงินมาไม่ครบยอดชำระ');
                      return;
                    }
                    const change = received - cartTotal;
                    await handleProcessPayment('cash');
                    // show success
                    setPaymentSuccessData({ received, change });
                  }}
*/
// We need to capture the cart details before they are cleared by handleProcessPayment.
// Wait, I can just store it locally in the onClick.
const oldOnClick = `                  onClick={async () => {
                    const received = Number(cashReceived);
                    if (received < cartTotal) {
                      alert('รับเงินมาไม่ครบยอดชำระ');
                      return;
                    }
                    const change = received - cartTotal;
                    await handleProcessPayment('cash');
                    // show success
                    setPaymentSuccessData({ received, change });
                  }}`;

const newOnClick = `                  onClick={async () => {
                    const received = Number(cashReceived);
                    if (received < cartTotal) {
                      alert('รับเงินมาไม่ครบยอดชำระ');
                      return;
                    }
                    const change = received - cartTotal;
                    const itemsSnap = [...cart];
                    const subtotalSnap = cartSubTotal;
                    const discountSnap = discountTotalValue;
                    const taxSnap = vatAmount;
                    const scSnap = serviceChargeAmount;
                    const totalSnap = cartTotal;
                    
                    await handleProcessPayment('cash');
                    
                    setPaymentSuccessData({
                      received,
                      change,
                      orderId: 'NEW',
                      orderNumber: 'NEW', // In reality handleProcessPayment doesn't return the order info, so we use a placeholder or modify it later
                      items: itemsSnap,
                      subtotal: subtotalSnap,
                      discount: discountSnap,
                      tax: taxSnap,
                      serviceCharge: scSnap,
                      total: totalSnap,
                      paymentMethod: 'cash',
                      timestamp: new Date().toISOString()
                    });
                  }}`;
content = content.replace(oldOnClick, newOnClick);

// 4. Update the Success UI to have a Print button and the hidden receipt
const oldSuccessUI = `                <button
                  onClick={() => {
                    setShowCashPaymentModal(false);
                    setPaymentSuccessData(null);
                  }}
                  className="w-full h-14 bg-[#1A1A18] text-white font-black tracking-widest uppercase hover:bg-black transition-all"
                >
                  เสร็จสิ้น / NEXT ORDER
                </button>`;

const newSuccessUI = `                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setShowCashPaymentModal(false);
                      setPaymentSuccessData(null);
                    }}
                    className="flex-1 h-14 bg-gray-200 text-black font-black tracking-widest uppercase hover:bg-gray-300 transition-all"
                  >
                    NEXT ORDER
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-[2] h-14 bg-[#1A1A18] text-white font-black tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={20} />
                    พิมพ์ใบเสร็จ
                  </button>
                </div>
                
                {/* Hidden Receipt for Printing */}
                <div className="hidden">
                  <POSReceipt
                    ref={receiptRef}
                    orderNumber={paymentSuccessData.orderNumber}
                    orderType={orderType}
                    tableNumber={selectedTable?.table_number}
                    customerName={selectedCustomer?.name}
                    items={paymentSuccessData.items}
                    subtotal={paymentSuccessData.subtotal}
                    discount={paymentSuccessData.discount}
                    tax={paymentSuccessData.tax}
                    serviceCharge={paymentSuccessData.serviceCharge}
                    total={paymentSuccessData.total}
                    paymentMethod={paymentSuccessData.paymentMethod}
                    paidAmount={paymentSuccessData.received}
                    change={paymentSuccessData.change}
                    timestamp={paymentSuccessData.timestamp}
                    cashierName={profile?.display_name || profile?.first_name || 'Staff'}
                  />
                </div>`;
content = content.replace(oldSuccessUI, newSuccessUI);

fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');
