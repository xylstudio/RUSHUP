import fs from 'fs';
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import POSBranchSelectModal from './POSBranchSelectModal'",
  "import POSBranchSelectModal from './POSBranchSelectModal'\nimport POSSplitPaymentModal from './POSSplitPaymentModal'"
);

// 2. Add new states
code = code.replace(
  "const [cashReceived, setCashReceived] = useState('')",
  "const [totalPaid, setTotalPaid] = useState<number>(0)\n  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false)\n  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<number>(0)\n  const [cashReceived, setCashReceived] = useState('')"
);

// 3. remainingTotal calculation
code = code.replace(
  "const cartTotal = cartSubTotal - discountTotalValue + vatAmount + serviceChargeAmount",
  "const cartTotal = cartSubTotal - discountTotalValue + vatAmount + serviceChargeAmount\n  const remainingTotal = Math.max(0, cartTotal - totalPaid)"
);

// 4. Update handleResumeOrder to fetch payments
code = code.replace(
  "setEditingOrderNumber(order.order_number)",
  `setEditingOrderNumber(order.order_number)
        
        // Fetch existing payments
        const { data: payments } = await supabase
          .from('pos_order_payments')
          .select('amount')
          .eq('order_id', order.id)
          .eq('status', 'paid')
        
        if (payments && payments.length > 0) {
          const sumPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
          setTotalPaid(sumPaid)
        } else {
          setTotalPaid(0)
        }`
);

// 5. Update handleProcessPayment
code = code.replace(
  "const handleProcessPayment = async (method: string) => {",
  "const handleProcessPayment = async (method: string, amount?: number) => {"
);
// Replace `cartTotal` with `amountToPay` in handleProcessPayment
code = code.replace(
  "let finalOrderId = editingOrderId",
  "let finalOrderId = editingOrderId\n      const amountToPay = amount !== undefined ? amount : remainingTotal\n      const newTotalPaid = totalPaid + amountToPay\n      const newStatus = newTotalPaid >= cartTotal ? 'completed' : 'payment_pending'"
);
code = code.replace(
  "status: 'completed',",
  "status: newStatus,"
);
code = code.replace(
  "status: 'completed',", // second instance
  "status: newStatus,"
);
code = code.replace(
  "amount: cartTotal,",
  "amount: amountToPay,"
);

// 6. Update Cash Payment Modal to use currentPaymentAmount instead of cartTotal
code = code.replace(
  "if (received >= cartTotal) {",
  "if (received >= currentPaymentAmount) {"
);
code = code.replace(
  "change = received - cartTotal;",
  "change = received - currentPaymentAmount;"
);
code = code.replace(
  "alert('จำนวนเงินไม่เพียงพอ (Not enough cash)');",
  "alert(`จำนวนเงินไม่เพียงพอ ขาดอีก ${currentPaymentAmount - received}`);"
);
code = code.replace(
  "await handleProcessPayment('cash');",
  "await handleProcessPayment('cash', currentPaymentAmount);"
);
// Update Cash payment display
code = code.replace(
  "Yod cham ra: ฿{(paymentSuccessData.received - paymentSuccessData.change).toLocaleString()}",
  "Yod cham ra: ฿{(paymentSuccessData.received - paymentSuccessData.change).toLocaleString()}"
);

fs.writeFileSync('components/pos/POSTerminal.tsx', code);
console.log('Patched POSTerminal.tsx successfully');
