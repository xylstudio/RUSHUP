
const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\localadmin\\Desktop\\xylproject-pr-copilot-swe-agent-3\\xylem-landscape\\app\\dashboard\\customer\\houses\\[houseId]\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const insertion = `
            {/* Active Services / Live Status Section */}
            {orders.length > 0 && (
               <section className="mb-32">
                  <div className="mb-12 flex items-center justify-between border-b border-[var(--customer-line)] pb-8">
                     <div>
                        <h3 className="customer-editorial-kicker">{copy.activeServices}</h3>
                        <p className="customer-editorial-meta mt-2 text-[#A3A3A3]">OVERVIEW OF YOUR CURRENT PROPERTY MAINTENANCE PORTFOLIO</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                     {/* Group orders by service to show unique plans */}
                     {Array.from(new Set(orders.filter(o => o.service_id).map(o => o.service_id))).map(serviceId => {
                        const serviceOrders = orders.filter(o => o.service_id === serviceId)
                        const serviceName = serviceOrders[0]?.services?.service_name || 'Service Plan'
                        const isLive = serviceOrders.some(o => 
                           o.status === 'in_progress' || 
                           o.job_assignments?.some(a => a.status === 'in_progress')
                        )
                        const activeAssignment = serviceOrders
                           .flatMap(o => o.job_assignments || [])
                           .find(a => a.status === 'in_progress')
                        
                        const nextOrder = serviceOrders.find(o => o.status === 'confirmed' || o.status === 'pending')

                        return (
                           <motion.div 
                              key={serviceId || Math.random()}
                              whileHover={{ y: -5 }}
                              className="group relative flex flex-col border border-[var(--customer-line)] bg-white p-8 transition-all hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)]"
                           >
                              {isLive && (
                                 <div className="absolute -right-2 -top-2 z-10 flex items-center gap-2 bg-red-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-xl">
                                    <span className="relative flex h-2 w-2">
                                       <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                                       <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                                    </span>
                                    {copy.liveStatus}
                                 </div>
                              )}
                              
                              <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#FAFAF8] text-[var(--customer-accent)] transition-colors group-hover:bg-[var(--customer-accent)] group-hover:text-white">
                                 <Activity size={20} strokeWidth={1.5} />
                              </div>

                              <h4 className="font-serif-thai text-xl font-medium tracking-tight text-[#111111]">{serviceName}</h4>
                              
                              <div className="mt-8 space-y-6">
                                 {isLive ? (
                                    <div className="space-y-2">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">{copy.onSiteNow}</p>
                                       {activeAssignment?.profiles?.display_name && (
                                          <div className="flex items-center gap-2">
                                             <div className="h-5 w-5 rounded-full bg-[#F0EFEB] flex items-center justify-center">
                                                <Users size={10} />
                                             </div>
                                             <span className="text-xs font-medium text-gray-600">{activeAssignment.profiles.display_name}</span>
                                          </div>
                                       )}
                                    </div>
                                 ) : nextOrder ? (
                                    <div>
                                       <p className="customer-editorial-meta">{copy.upcomingVisit}</p>
                                       <p className="mt-2 text-sm font-bold uppercase tracking-widest text-[#111111]">
                                          {formatDateByLocale(nextOrder.scheduled_date, locale)}
                                       </p>
                                    </div>
                                 ) : (
                                    <div>
                                       <p className="customer-editorial-meta">{copy.activePlan}</p>
                                       <p className="mt-2 text-sm font-bold uppercase tracking-widest text-[var(--customer-success)]">ACTIVE</p>
                                    </div>
                                 )}
                              </div>

                              <div className="mt-10 h-1 w-0 bg-[var(--customer-accent)] transition-all duration-500 group-hover:w-full" />
                           </motion.div>
                        )
                     })}
                  </div>
               </section>
            )
`;

// Target: <div className="mx-auto max-w-5xl px-6">
const regex = /<div className="mx-auto max-w-5xl px-6">/;
if (regex.test(content)) {
    console.log('Found target, replacing...');
    content = content.replace(regex, `<div className="mx-auto w-full max-w-7xl px-6">${insertion}`);
    fs.writeFileSync(filePath, content);
    console.log('Successfully updated.');
} else {
    console.error('Target not found.');
    process.exit(1);
}
