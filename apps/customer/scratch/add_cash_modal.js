const fs = require('fs');

let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

// 1. Add states
const stateInjection = `
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinCallback, setPinCallback] = useState<(() => void) | null>(null)
  const [pinTitle, setPinTitle] = useState('')
  const [pinDesc, setPinDesc] = useState('')

  // Cash Payment Modal States
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ received: number, change: number } | null>(null)
`;

content = content.replace(/  const \[isPinModalOpen, setIsPinModalOpen\] = useState\(false\)\n  const \[pinCallback, setPinCallback\] = useState<\(\(\) => void\) \| null>\(null\)\n  const \[pinTitle, setPinTitle\] = useState\(''\)\n  const \[pinDesc, setPinDesc\] = useState\(''\)/, stateInjection.trim());

// 2. Modify CASH button onClick
const oldCashButton = `onClick={() => handleProcessPayment('cash')}`;
const newCashButton = `onClick={() => {
                    setShowPaymentModal(false);
                    setCashReceived('');
                    setPaymentSuccessData(null);
                    setShowCashPaymentModal(true);
                  }}`;

content = content.replace(oldCashButton, newCashButton);

// 3. Inject the Cash Modal UI at the end of the file, just before the Pin Modal
const cashModalUI = `
      {/* CASH PAYMENT MODAL */}
      {showCashPaymentModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3a3a38]/40 backdrop-blur-md" onClick={() => !isProcessing && !paymentSuccessData && setShowCashPaymentModal(false)}></div>
          <div className="relative w-full max-w-md bg-white shadow-2xl animate-in fade-in zoom-in-95 p-8 flex flex-col font-bold">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-[#1A1A18]">ชำระเงินสด (CASH)</h3>
              {!isProcessing && !paymentSuccessData && (
                <button onClick={() => setShowCashPaymentModal(false)} className="text-gray-400 hover:text-black">
                  <X size={24} />
                </button>
              )}
            </div>

            {paymentSuccessData ? (
              <div className="flex flex-col items-center py-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black text-[#1A1A18] mb-2">ทอนเงิน</h2>
                <div className="text-5xl font-black text-emerald-500 mb-8 tracking-tighter">
                  ฿{paymentSuccessData.change.toLocaleString()}
                </div>
                
                <div className="w-full bg-gray-50 border border-gray-100 p-4 mb-8 flex justify-between text-sm">
                  <span className="text-gray-500">รับเงินมา: ฿{paymentSuccessData.received.toLocaleString()}</span>
                  <span className="text-gray-500">ยอดชำระ: ฿{(paymentSuccessData.received - paymentSuccessData.change).toLocaleString()}</span>
                </div>

                <button
                  onClick={() => {
                    setShowCashPaymentModal(false);
                    setPaymentSuccessData(null);
                  }}
                  className="w-full h-14 bg-[#1A1A18] text-white font-black tracking-widest uppercase hover:bg-black transition-all"
                >
                  เสร็จสิ้น / NEXT ORDER
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 mb-6">
                  <span className="text-sm font-black text-gray-500 uppercase tracking-widest">ยอดที่ต้องชำระ</span>
                  <span className="text-3xl font-black text-emerald-600 tracking-tighter">฿{cartTotal.toLocaleString()}</span>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">รับเงินมา (Received)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">฿</span>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full h-14 pl-10 pr-4 text-2xl font-black border-2 border-gray-200 outline-none focus:border-black transition-all"
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-8">
                  <button onClick={() => setCashReceived(cartTotal.toString())} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">พอดี</button>
                  <button onClick={() => setCashReceived('100')} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">100</button>
                  <button onClick={() => setCashReceived('500')} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">500</button>
                  <button onClick={() => setCashReceived('1000')} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">1000</button>
                </div>

                <button
                  disabled={isProcessing || !cashReceived || Number(cashReceived) < cartTotal}
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
                  className="w-full h-14 bg-[#1A1A18] text-white font-black tracking-widest uppercase hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'ยืนยันชำระเงิน'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <POSPinModal
`;

content = content.replace('<POSPinModal', cashModalUI.trim() + '\n\n      <POSPinModal');

fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');
