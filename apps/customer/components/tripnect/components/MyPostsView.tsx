import { FileText, Plus, Heart, MessageCircle, Video } from 'lucide-react';
import { useState } from 'react';
import { POSTS, CURRENT_USER } from '../data';

type PostType = 'all' | 'images' | 'videos';

export function MyPostsView() {
  const [activeType, setActiveType] = useState<PostType>('all');

  const myPosts = POSTS?.filter(post => post?.user?.username === CURRENT_USER?.username) || [];

  const stats = {
    total: myPosts.length,
    images: myPosts.filter(p => !p.videoUrl).length,
    videos: myPosts.filter(p => p.videoUrl).length,
    totalLikes: myPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
    totalComments: myPosts.reduce((sum, post) => sum + (post.comments || 0), 0)
  };

  const filteredPosts = activeType === 'all' 
    ? myPosts 
    : activeType === 'videos'
      ? myPosts.filter(p => p.videoUrl)
      : myPosts.filter(p => !p.videoUrl);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-8 text-white">
        <h1 className="text-2xl font-bold mb-1">โพสต์ของฉัน</h1>
        <p className="text-white/90 text-sm">{stats.total} โพสต์</p>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-4 mb-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-around mb-4">
            <div className="text-center">
              <div className="font-bold text-xl">{stats.total}</div>
              <div className="text-xs text-slate-500">โพสต์</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="font-bold text-xl text-orange-500">{stats.totalLikes}</div>
              <div className="text-xs text-slate-500">ถูกใจ</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="font-bold text-xl">{stats.totalComments}</div>
              <div className="text-xs text-slate-500">ความคิดเห็น</div>
            </div>
          </div>
          <button className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
            <Plus size={18} strokeWidth={2.5} />
            สร้างโพสต์ใหม่
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: `ทั้งหมด (${stats.total})` },
            { key: 'images', label: `รูปภาพ (${stats.images})` },
            { key: 'videos', label: `วิดีโอ (${stats.videos})` }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveType(filter.key as PostType)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeType === filter.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="pb-20">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText size={28} className="text-slate-400" />
            </div>
            <h3 className="font-semibold mb-1">ยังไม่มีโพสต์</h3>
            <p className="text-sm text-slate-500 mb-4">แบ่งปันประสบการณ์ของคุณ</p>
            <button className="text-sm text-orange-500 font-semibold">
              สร้างโพสต์แรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {filteredPosts.map((post) => (
              <button 
                key={post.id}
                className="aspect-square bg-slate-100 relative group"
              >
                <img 
                  src={post.imageUrl} 
                  alt=""
                  className="w-full h-full object-cover"
                />
                {post.videoUrl && (
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1">
                    <Video size={12} className="text-white" fill="white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors">
                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 text-white">
                      <Heart size={16} fill="white" />
                      <span className="text-sm font-semibold">{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle size={16} fill="white" />
                      <span className="text-sm font-semibold">{post.comments}</span>
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
