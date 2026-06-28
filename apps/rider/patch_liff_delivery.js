const fs = require('fs');
let file = fs.readFileSync('app/liff/menu/page.tsx', 'utf8');

file = file.replace(
  `  const grandTotal = useMemo(() => Math.max(0, cartTotal + (orderType === 'delivery' ? deliveryFee : 0) - totalDiscount), [cartTotal, orderType, deliveryFee, totalDiscount]);`,
  `  const grandTotal = useMemo(() => Math.max(0, cartTotal + (orderType === 'delivery' && deliveryFee > 0 ? deliveryFee : 0) - totalDiscount), [cartTotal, orderType, deliveryFee, totalDiscount]);`
);

file = file.replace(
  `                    <span className="text-emerald-600">{(orderType === 'delivery' && deliveryFee > 0) ? \`฿\${deliveryFee.toLocaleString()}\` : 'FREE'}</span>`,
  `                    <span className="text-emerald-600">{(orderType === 'delivery') ? (deliveryFee === -1 ? 'อยู่นอกพื้นที่ให้บริการ' : deliveryFee > 0 ? \`฿\${deliveryFee.toLocaleString()}\` : 'FREE') : 'FREE'}</span>`
);

file = file.replace(
  `                          <Truck size={14} className="text-emerald-500" /> {locale === 'en' ? 'Fee' : 'ค่าส่ง'} <span className="text-emerald-600">฿{deliveryFee.toLocaleString()}</span>`,
  `                          <Truck size={14} className="text-emerald-500" /> {locale === 'en' ? 'Fee' : 'ค่าส่ง'} <span className="text-emerald-600">{deliveryFee === -1 ? 'อยู่นอกพื้นที่' : \`฿\${deliveryFee.toLocaleString()}\`}</span>`
);

file = file.replace(
  `                      <span className="text-[16px] font-black text-emerald-600">฿{deliveryFee.toLocaleString()}</span>`,
  `                      <span className="text-[16px] font-black text-emerald-600">{deliveryFee === -1 ? 'อยู่นอกพื้นที่' : \`฿\${deliveryFee.toLocaleString()}\`}</span>`
);

file = file.replace(
  `                   {!isShopEffectivelyOpen ? 'ร้านปิดแล้ว' : isProcessing ? 'กำลังดำเนินการ...' : \`ยืนยันออเดอร์: ฿\${grandTotal.toLocaleString()}\`}`,
  `                   {!isShopEffectivelyOpen ? 'ร้านปิดแล้ว' : (orderType === 'delivery' && deliveryFee === -1) ? 'อยู่นอกพื้นที่จัดส่ง' : isProcessing ? 'กำลังดำเนินการ...' : \`ยืนยันออเดอร์: ฿\${grandTotal.toLocaleString()}\`}`
);

file = file.replace(
  `                   disabled={isProcessing || !isShopEffectivelyOpen}`,
  `                   disabled={isProcessing || !isShopEffectivelyOpen || (orderType === 'delivery' && deliveryFee === -1)}`
);

file = file.replace(
  `              deliveryFee: orderType === 'delivery' ? deliveryFee : 0,`,
  `              deliveryFee: orderType === 'delivery' ? (deliveryFee > 0 ? deliveryFee : 0) : 0,`
);

file = file.replace(
  `      const calcTotal = cart.reduce((acc, it) => acc + (it.sale_price * it.quantity), 0) + (orderType === 'delivery' ? deliveryFee : 0);`,
  `      const calcTotal = cart.reduce((acc, it) => acc + (it.sale_price * it.quantity), 0) + (orderType === 'delivery' && deliveryFee > 0 ? deliveryFee : 0);`
);


fs.writeFileSync('app/liff/menu/page.tsx', file);
console.log('patched');
