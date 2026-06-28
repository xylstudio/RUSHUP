import fs from 'fs';
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8');

// 1. Update Payment Modal Amount to remainingTotal
code = code.replace(
  "Total Amount Due\n                </span>\n                <div className=\"text-4xl sm:text-6xl font-black text-black\">฿ {cartTotal.toLocaleString()}</div>",
  "Total Amount Due\n                </span>\n                <div className=\"text-4xl sm:text-6xl font-black text-black\">฿ {remainingTotal.toLocaleString()}</div>\n                {totalPaid > 0 && <div className=\"text-[10px] font-bold text-gray-400 mt-2\">จ่ายแล้ว ฿ {totalPaid.toLocaleString()} / จากยอดเต็ม ฿ {cartTotal.toLocaleString()}</div>}"
);

// 2. Add Split Bill button
code = code.replace(
  "<div className=\"grid grid-cols-3 gap-2 sm:gap-6\">",
  `<div className="mb-4">
                  <button
                    disabled={isProcessing || remainingTotal <= 0}
                    onClick={() => {
                      setShowPaymentModal(false);
                      setShowSplitPaymentModal(true);
                    }}
                    className="w-full h-14 bg-[#1A1A18] text-white text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/></svg>
                    หารจ่าย / แยกจ่าย (SPLIT BILL)
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-6">`
);

// 3. Add POSSplitPaymentModal
code = code.replace(
  "{/* 10. MODIFIER SELECTION MODAL - FULL CENTER UNIFIED */}",
  `{showSplitPaymentModal && (
        <POSSplitPaymentModal
          cart={cart}
          cartTotal={cartTotal}
          remainingTotal={remainingTotal}
          isProcessing={isProcessing}
          onClose={() => setShowSplitPaymentModal(false)}
          handleProcessPayment={(method, amount) => {
             setShowSplitPaymentModal(false);
             if (method === 'cash') {
                setCurrentPaymentAmount(amount);
                setCashReceived('');
                setPaymentSuccessData(null);
                setShowCashPaymentModal(true);
             } else {
                handleProcessPayment(method, amount);
             }
          }}
        />
      )}
      
      {/* 10. MODIFIER SELECTION MODAL - FULL CENTER UNIFIED */}`
);

// 4. Update the cash button in main payment modal to pass remainingTotal
code = code.replace(
  "setShowCashPaymentModal(true);\n                  }}",
  "setCurrentPaymentAmount(remainingTotal);\n                    setShowCashPaymentModal(true);\n                  }}"
);

fs.writeFileSync('components/pos/POSTerminal.tsx', code);
console.log('Patched POSTerminal payment UI successfully');
