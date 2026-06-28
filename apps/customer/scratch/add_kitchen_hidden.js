const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

const target = `                    cashierName={profile?.display_name || profile?.first_name || 'Staff'}
                  />
                </div>`;

const replacement = `                    cashierName={profile?.display_name || profile?.first_name || 'Staff'}
                  />
                  <POSKitchenTicket
                    ref={kitchenReceiptRef}
                    orderNumber={paymentSuccessData.orderNumber}
                    orderType={orderType}
                    tableNumber={selectedTable?.table_number}
                    items={paymentSuccessData.items}
                    timestamp={paymentSuccessData.timestamp}
                  />
                </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');
