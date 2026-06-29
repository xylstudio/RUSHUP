import { useState, useRef, useEffect } from 'react';
import { 
    Search, Map, Tent, Umbrella, Coffee, 
    Camera, Mountain, Building2, MapPin, 
    Star, Heart, SlidersHorizontal, Ticket,
    Palmtree, Waves, Castle, ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { ImageWithFallback } from './figma/ImageWithFallback';

// --- Types & Data ---
interface ExploreItem {
    id: number;
    image: string;
    title: string;
    location: string;
    rating: number;
    category: string;
    type: 'stay' | 'place' | 'food';
}

const CATEGORIES = [
  { id: 'all', label: 'For You', icon: Star },
  { id: 'islands', label: 'Islands', icon: Palmtree },
  { id: 'cafe', label: 'Cafe', icon: Coffee },
  { id: 'camping', label: 'Camping', icon: Tent },
  { id: 'nature', label: 'Nature', icon: Mountain },
  { id: 'city', label: 'City Vibes', icon: Building2 },
  { id: 'photo', label: 'Photo Spots', icon: Camera },
];

const EXPLORE_ITEMS: ExploreItem[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=600",
    title: "Bali Swing",
    location: "Bali, Indonesia",
    rating: 4.9,
    category: 'nature',
    type: 'place'
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=600",
    title: "The Private Pool Villa",
    location: "Phuket, Thailand",
    rating: 4.95,
    category: 'islands',
    type: 'stay'
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600",
    title: "Nana Coffee Roaster",
    location: "Bangkok",
    rating: 4.7,
    category: 'cafe',
    type: 'food'
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=600",
    title: "Swiss Alps",
    location: "Switzerland",
    rating: 5.0,
    category: 'nature',
    type: 'place'
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1534008897995-27a23e859048?auto=format&fit=crop&q=80&w=600",
    title: "Beach Club",
    location: "Pattaya",
    rating: 4.6,
    category: 'islands',
    type: 'food'
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=600",
    title: "Golden Gate",
    location: "San Francisco",
    rating: 4.8,
    category: 'city',
    type: 'place'
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=600",
    title: "Koh Samui",
    location: "Surat Thani",
    rating: 4.9,
    category: 'islands',
    type: 'stay'
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&q=80&w=600",
    title: "Hidden Gem Beach",
    location: "Krabi",
    rating: 4.85,
    category: 'nature',
    type: 'place'
  }
];

// --- Components ---

function MosaicCard({ item }: { item: ExploreItem }) {
    return (
        <div className="relative group cursor-pointer overflow-hidden rounded-2xl mb-3 break-inside-avoid">
            {/* Image */}
            <ImageWithFallback 
                src={item.image} 
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Gradient Overlay (Always visible at bottom for text legibility) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/60" />

            {/* Top Right Actions */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors">
                    <Heart size={16} className="text-white" />
                </button>
            </div>

            {/* Content (Bottom Overlay) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-white font-bold text-sm mb-0.5 leading-snug">{item.title}</h3>
                        <div className="flex items-center gap-1 text-white/80 text-xs">
                            <MapPin size={10} />
                            <span className="truncate max-w-[100px]">{item.location}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded text-xs font-bold text-white">
                        <Star size={10} fill="white" />
                        <span>{item.rating}</span>
                    </div>
                </div>
            </div>

            {/* Type Badge (Top Left) */}
            <div className="absolute top-2 left-2">
                <span className={`
                    text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md uppercase tracking-wide
                    ${item.type === 'stay' ? 'bg-orange-500/80 text-white' : ''}
                    ${item.type === 'place' ? 'bg-blue-500/80 text-white' : ''}
                    ${item.type === 'food' ? 'bg-green-500/80 text-white' : ''}
                `}>
                    {item.type}
                </span>
            </div>
        </div>
    );
}

export function ExploreView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-white font-sans">
      
      {/* --- 1. MINIMAL HEADER --- */}
      <div className="pt-6 pb-2 px-5 sticky top-0 bg-white/95 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-11 bg-stone-100 rounded-full flex items-center px-4 gap-2 text-stone-400 group cursor-pointer hover:bg-stone-50 border border-transparent hover:border-orange-200 transition-all">
                  <Search size={18} className="text-stone-500" />
                  <span className="text-sm font-medium text-stone-500 group-hover:text-stone-700">ค้นหาแรงบันดาลใจ...</span>
              </div>
              <button className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center text-stone-900 hover:bg-stone-50 transition-colors">
                  <Map size={20} />
              </button>
          </div>

          {/* Categories */}
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
              {CATEGORIES.map((cat) => (
                  <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`
                          px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all
                          ${activeCategory === cat.id 
                              ? 'bg-stone-900 text-white shadow-md' 
                              : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-400'}
                      `}
                  >
                      <div className="flex items-center gap-1.5">
                          {activeCategory === cat.id && <cat.icon size={14} />}
                          {cat.label}
                      </div>
                  </button>
              ))}
          </div>
      </div>

      {/* --- 2. MOSAIC GRID --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
          <ResponsiveMasonry columnsCountBreakPoints={{350: 2, 750: 3, 900: 4}}>
                <Masonry gutter="12px">
                    {EXPLORE_ITEMS.map((item) => (
                        <MosaicCard key={item.id} item={item} />
                    ))}
                </Masonry>
          </ResponsiveMasonry>
          
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                  <ArrowUpRight className="text-stone-400" />
              </div>
              <p className="text-sm text-stone-500">That's all for now.</p>
          </div>
      </div>

    </div>
  );
}