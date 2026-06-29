import { Bookmark, MapPin, Star, Heart, Filter } from 'lucide-react';
import { useState } from 'react';

type ReviewCategory = 'all' | 'restaurants' | 'hotels' | 'attractions';

interface SavedReview {
  id: number;
  placeName: string;
  location: string;
  rating: number;
  reviewText: string;
  imageUrl: string;
  category: ReviewCategory;
  likes: number;
}

export function SavedReviewsView() {
  const [activeCategory, setActiveCategory] = useState<ReviewCategory>('all');

  const reviews: SavedReview[] = [
    {
      id: 1,
      placeName: 'Bloom Cafe & Eatery',
      location: 'สยาม, กรุงเทพฯ',
      rating: 5,
      reviewText: 'คาเฟ่บรรยากาศดี ตกแต่งสวย อาหารอร่อย แนะนำเมนู Truffle Pasta',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      category: 'restaurants',
      likes: 234
    },
    {
      id: 2,
      placeName: 'Anantara Riverside Bangkok',
      location: 'กรุงเทพฯ',
      rating: 5,
      reviewText: 'โรงแรมหรูริมแม่น้ำ วิวสวย บริการดี สระว่ายน้ำกว้าง',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      category: 'hotels',
      likes: 456
    },
    {
      id: 3,
      placeName: 'วัดพระแก้ว',
      location: 'กรุงเทพฯ',
      rating: 5,
      reviewText: 'สถานที่ท่องเที่ยวสวยงาม สถาปัตยกรรมตระการตา',
      imageUrl: 'https://images.unsplash.com/photo-1563492065421-0e3347d93724?w=800',
      category: 'attractions',
      likes: 789
    }
  ];

  const filteredReviews = activeCategory === 'all'
    ? reviews
    : reviews.filter(review => review.category === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-8 text-white">
        <h1 className="text-2xl font-bold mb-1">รีวิวที่บันทึก</h1>
        <p className="text-white/90 text-sm">{filteredReviews.length} รีวิว</p>
      </div>

      {/* Category Filter */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'restaurants', label: 'ร้านอาหาร' },
            { key: 'hotels', label: 'ที่พัก' },
            { key: 'attractions', label: 'สถานที่' }
          ].map((category) => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key as ReviewCategory)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === category.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="pb-20">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bookmark size={28} className="text-slate-400" />
            </div>
            <h3 className="font-semibold mb-1">ยังไม่มีรีวิว</h3>
            <p className="text-sm text-slate-500">บันทึกรีวิวที่คุณสนใจ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredReviews.map((review) => (
              <button
                key={review.id}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={review.imageUrl} 
                      alt={review.placeName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{review.placeName}</h3>
                      <Bookmark size={16} className="text-orange-500 fill-orange-500 flex-shrink-0" />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} size={10} className="text-orange-400 fill-orange-400" />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">•</span>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={10} />
                        <span className="truncate">{review.location}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                      {review.reviewText}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Heart size={12} />
                      <span>{review.likes}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
