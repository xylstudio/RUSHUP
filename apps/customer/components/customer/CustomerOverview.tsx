'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Search, Star, Compass, 
  Ticket, Bed, Plane, Calendar, ChevronRight
} from 'lucide-react'

// Mock Data for Travel App Look
const TRAVEL_CATEGORIES = [
  { id: 1, name: 'Attractions', icon: <Ticket size={24} />, color: 'bg-blue-100 text-blue-600' },
  { id: 2, name: 'Tours', icon: <Compass size={24} />, color: 'bg-emerald-100 text-emerald-600' },
  { id: 3, name: 'Hotels', icon: <Bed size={24} />, color: 'bg-indigo-100 text-indigo-600' },
  { id: 4, name: 'Flights', icon: <Plane size={24} />, color: 'bg-sky-100 text-sky-600' },
]

const DESTINATIONS = [
  { id: 1, name: 'Phuket, Thailand', img: 'https://images.unsplash.com/photo-1589394815804-964ce0ff96c7?auto=format&fit=crop&q=80&w=800' },
  { id: 2, name: 'Bali, Indonesia', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800' },
  { id: 3, name: 'Kyoto, Japan', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800' },
]

const pressable = "active:scale-[0.96] transition-transform duration-300 ease-out"

interface CustomerOverviewProps {
  displayName: string
  shortName: string
  activeTab: string
  setActiveTab: (tab: any) => void
  overviewActiveOrders: any[]
  locale: 'th' | 'en' | 'zh'
  copy: any
  services: any[]
  handleServiceSelectForBooking: (service: any) => void
}

const CustomerOverview: React.FC<CustomerOverviewProps> = ({
  displayName,
  setActiveTab,
  overviewActiveOrders,
  copy,
  services,
  handleServiceSelectForBooking,
}) => {
  // Format Services as Travel Experiences
  const experiences = (services || []).map((s, idx) => ({
    id: s.id,
    title: s.service_name,
    desc: s.description || 'Discover amazing local experiences and unforgettable tours.',
    price: s.base_price ? `From ฿${s.base_price.toLocaleString()}` : 'Check Prices',
    image: s.thumbnail_url || s.image_url || `https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800`,
    rating: (4.5 + (Math.random() * 0.5)).toFixed(1),
    reviews: Math.floor(Math.random() * 500) + 50,
    original: s
  }))

  return (
    <div className="flex-1 overflow-x-hidden font-sans text-slate-900 bg-slate-50 pb-32">
      
      {/* HERO HEADER */}
      <div className="relative pt-12 pb-10 px-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-b-[40px] shadow-lg">
        <div className="absolute inset-0 overflow-hidden rounded-b-[40px]">
           <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200" alt="Travel" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-blue-100 text-sm font-medium">Hello, {displayName || 'Traveler'}</p>
              <h1 className="text-3xl font-black mt-1">Where to next?</h1>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 cursor-pointer">
              <span className="font-bold text-lg">✈️</span>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="relative bg-white text-slate-800 rounded-2xl shadow-xl flex items-center p-2">
            <div className="pl-3 pr-2 text-blue-500">
              <Search size={22} />
            </div>
            <input 
              type="text" 
              placeholder="Search destinations, tours..."
              className="w-full bg-transparent py-3 pr-4 text-base font-medium outline-none placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      <main className="px-5 mt-8 space-y-10">
        
        {/* CATEGORIES */}
        <section>
          <div className="grid grid-cols-4 gap-4">
            {TRAVEL_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center shadow-sm`}>
                  {cat.icon}
                </div>
                <span className="text-[11px] font-bold text-slate-600">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TOP DESTINATIONS (Horizontal Scroll) */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-slate-900">Popular Destinations</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 -mx-5 px-5">
            {DESTINATIONS.map(dest => (
              <div key={dest.id} className="snap-start shrink-0 w-48 h-64 rounded-3xl relative overflow-hidden shadow-md cursor-pointer group">
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                  <MapPin size={16} className="text-white" />
                  <h3 className="text-white font-bold text-sm line-clamp-1">{dest.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EXPERIENCES / TOURS (Mapped from Services) */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-slate-900">Trending Experiences</h2>
            <button onClick={() => setActiveTab('marketplace')} className="text-sm font-bold text-blue-600">See All</button>
          </div>
          
          <div className="flex flex-col gap-6">
            {experiences.map(exp => (
              <div 
                key={exp.id} 
                onClick={() => handleServiceSelectForBooking(exp.original)}
                className={`bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer ${pressable}`}
              >
                <div className="w-full h-56 relative bg-slate-200">
                  <img src={exp.image} alt={exp.title} className="w-full h-full object-cover" />
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm font-bold text-xs text-blue-600">
                    Bestseller
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 pr-4 leading-tight">{exp.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-900">{exp.rating}</span>
                    </div>
                    <span className="text-sm text-slate-500">({exp.reviews} reviews)</span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{exp.desc}</p>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="text-slate-500 text-xs">Price per person</div>
                    <div className="text-blue-600 font-black text-lg">{exp.price}</div>
                  </div>
                </div>
              </div>
            ))}
            {experiences.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                <span className="text-sm font-bold text-slate-400">No experiences available</span>
              </div>
            )}
          </div>
        </section>

        {/* UPCOMING TRIPS / ACTIVE ORDERS */}
        {overviewActiveOrders && overviewActiveOrders.length > 0 && (
          <section className="pt-4 pb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Upcoming Trips</h2>
            <div className="flex flex-col gap-4">
              {overviewActiveOrders.map((order) => (
                <div key={order.id} onClick={() => setActiveTab('orders')} className={`bg-blue-600 text-white rounded-3xl p-5 flex items-center gap-4 shadow-lg shadow-blue-500/30 ${pressable} cursor-pointer relative overflow-hidden`}>
                  <div className="absolute right-[-20%] top-[-50%] opacity-10">
                     <Compass size={120} />
                  </div>
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <Calendar size={24} className="text-white" />
                  </div>
                  <div className="flex-1 relative z-10">
                    <span className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1 block">Confirmed</span>
                    <h4 className="text-base font-bold line-clamp-1">{order.services?.service_name || 'Trip Booking'}</h4>
                  </div>
                  <ChevronRight size={24} className="text-blue-200 relative z-10" />
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}

export default CustomerOverview
