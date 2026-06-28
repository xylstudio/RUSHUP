import sys

with open('components/customer/GardenCalendar.tsx', 'r') as f:
    content = f.read()

old_header = """                <div className="flex items-center justify-between border-b border-[var(--customer-line)] pb-4">
                  <div>
                    <h4 className="font-serif-thai text-xl font-light italic text-[var(--customer-ink)]">{t.summaryTitle}</h4>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--customer-muted)] opacity-50">{t.summaryFor} {monthName}</p>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <span className="block text-xl font-serif-thai text-emerald-600">
                        {Object.values(eventsByDate).flat().filter(e => e.type === 'upcoming' && isSameMonth(parseDateKey(e.scheduled_date || ''), currentMonth)).length}
                      </span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.upcoming}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-xl font-serif-thai text-gray-400">
                        {Object.values(eventsByDate).flat().filter(e => e.type === 'past' && isSameMonth(new Date(e.createdAt || e.created_at), currentMonth)).length}
                      </span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.history}</span>
                    </div>
                  </div>
                </div>"""

new_header = """                <div className="mb-8 grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1 rounded-[24px] bg-[#FAFAF8] p-6 border border-[#F3F3EF] flex flex-col justify-center shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-5 text-[var(--customer-ink)]">
                        <CalendarIcon size={120} strokeWidth={1} className="-mt-8 -mr-8" />
                     </div>
                     <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--customer-muted)] opacity-60 mb-2">{t.summaryFor} {monthName}</p>
                     <h4 className="text-2xl md:text-3xl font-light tracking-tight text-[var(--customer-ink)]" style={{ fontFamily: 'var(--customer-font-serif)' }}>{t.summaryTitle}</h4>
                  </div>
                  <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
                     <div className="rounded-[24px] bg-emerald-50 p-6 border border-emerald-100 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                        <span className="block text-4xl md:text-5xl font-light text-emerald-600 mb-2">
                          {Object.values(eventsByDate).flat().filter(e => e.type === 'upcoming' && isSameMonth(parseDateKey(e.scheduled_date || ''), currentMonth)).length}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700/60">{t.upcoming}</span>
                     </div>
                     <div className="rounded-[24px] bg-white p-6 border border-[var(--customer-line)] shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:border-[var(--customer-accent)]/30 transition-colors">
                        <span className="block text-4xl md:text-5xl font-light text-[var(--customer-ink)] mb-2">
                          {Object.values(eventsByDate).flat().filter(e => e.type === 'past' && isSameMonth(new Date(e.createdAt || e.created_at), currentMonth)).length}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.history}</span>
                     </div>
                  </div>
                </div>"""

content = content.replace(old_header, new_header)

old_upcoming = """                        {monthUpcoming.map((event, i) => (
                          <div 
                            key={`up-${i}`}
                            onClick={() => {
                              const d = parseDateKey(event.scheduled_date)
                              setSelectedDay({
                                day: d.getDate(),
                                date: d,
                                dateKey: event.scheduled_date,
                                events: eventsByDate[event.scheduled_date] || []
                              })
                            }}
                            className="group flex items-center justify-between bg-[#FAFAF8] p-5 border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-white flex flex-center items-center justify-center text-[var(--customer-accent)] shadow-sm">
                                <CalendarIcon size={16} strokeWidth={1.5} />
                              </div>
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">{t.upcomingVisit} • {formatDateByLocale(event.scheduled_date, locale)}</p>
                                  <h5 className="text-[13px] font-bold text-[var(--customer-ink)]">
                                    {showHouseName && (event.houses?.name || event.house_name) ? `${event.houses?.name || event.house_name} - ` : ''}
                                    {event.service_name || 'Garden Maintenance'}
                                  </h5>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                              <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.details}</span>
                              <ChevronRight size={14} className="text-[var(--customer-muted)]" />
                            </div>
                          </div>
                        ))}"""

new_upcoming = """                        {monthUpcoming.map((event, i) => (
                          <div 
                            key={`up-${i}`}
                            onClick={() => {
                              const d = parseDateKey(event.scheduled_date)
                              setSelectedDay({
                                day: d.getDate(),
                                date: d,
                                dateKey: event.scheduled_date,
                                events: eventsByDate[event.scheduled_date] || []
                              })
                            }}
                            className="group relative flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-transparent hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400 scale-y-50 group-hover:scale-y-100 transition-transform origin-center" />
                            <div className="flex items-center gap-5">
                              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <CalendarIcon size={20} strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1.5">{t.upcomingVisit} • {formatDateByLocale(event.scheduled_date, locale)}</p>
                                <h5 className="text-[15px] font-bold text-[var(--customer-ink)]">
                                  {showHouseName && (event.houses?.name || event.house_name) ? `${event.houses?.name || event.house_name} - ` : ''}
                                  {event.service_name || 'Garden Maintenance'}
                                </h5>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{t.details}</span>
                              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                <ChevronRight size={14} className="text-emerald-600" />
                              </div>
                            </div>
                          </div>
                        ))}"""

content = content.replace(old_upcoming, new_upcoming)

old_past = """                        {monthPast.map((report, i) => (
                          <div 
                            key={`past-${i}`}
                            onClick={() => {
                              const d = new Date(report.createdAt || report.created_at)
                              const key = toLocalDateKey(d)
                              setSelectedDay({
                                day: d.getDate(),
                                date: d,
                                dateKey: key,
                                events: eventsByDate[key] || []
                              })
                            }}
                            className="group flex items-center justify-between bg-white p-5 border border-[var(--customer-line)] hover:border-[var(--customer-accent)] transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-gray-50 flex items-center justify-center text-gray-300">
                                <CheckCircle2 size={16} strokeWidth={1.5} />
                              </div>
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{t.pastService} • {formatDateByLocale(report.createdAt || report.created_at, locale)}</p>
                                  <h5 className="text-[13px] font-bold text-[var(--customer-muted)]">
                                    {showHouseName && (report.houseName || report.houses?.name) ? `${report.houseName || report.houses?.name} - ` : ''}
                                    {report.serviceName || 'Garden Service'}
                                  </h5>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                              <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.report}</span>
                              <ChevronRight size={14} className="text-[var(--customer-muted)]" />
                            </div>
                          </div>
                        ))}"""

new_past = """                        {monthPast.map((report, i) => (
                          <div 
                            key={`past-${i}`}
                            onClick={() => {
                              const d = new Date(report.createdAt || report.created_at)
                              const key = toLocalDateKey(d)
                              setSelectedDay({
                                day: d.getDate(),
                                date: d,
                                dateKey: key,
                                events: eventsByDate[key] || []
                              })
                            }}
                            className="group relative flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-[#EBEBE8] hover:border-[var(--customer-accent)]/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                          >
                            <div className="flex items-center gap-5">
                              <div className="h-12 w-12 rounded-xl bg-[#F6F6F6] flex items-center justify-center text-gray-400 group-hover:bg-[var(--customer-accent)]/5 group-hover:text-[var(--customer-accent)] transition-colors">
                                <CheckCircle2 size={20} strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5">{t.pastService} • {formatDateByLocale(report.createdAt || report.created_at, locale)}</p>
                                <h5 className="text-[15px] font-bold text-[var(--customer-muted)] group-hover:text-[var(--customer-ink)] transition-colors">
                                  {showHouseName && (report.houseName || report.houses?.name) ? `${report.houseName || report.houses?.name} - ` : ''}
                                  {report.serviceName || 'Garden Service'}
                                </h5>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--customer-accent)]">{t.report}</span>
                              <div className="h-8 w-8 rounded-full bg-[var(--customer-accent)]/5 flex items-center justify-center">
                                <ChevronRight size={14} className="text-[var(--customer-accent)]" />
                              </div>
                            </div>
                          </div>
                        ))}"""

content = content.replace(old_past, new_past)

with open('components/customer/GardenCalendar.tsx', 'w') as f:
    f.write(content)
