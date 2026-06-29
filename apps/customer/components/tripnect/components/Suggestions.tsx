
import { USERS, CURRENT_USER } from '../data';
import { clsx } from 'clsx';

export function Suggestions() {
  // Use a subset of users as suggestions
  const suggestions = USERS.slice(0, 5);

  return (
    <div className="hidden lg:block w-80 pl-8 py-8 pr-4 fixed right-0 h-full overflow-y-auto">
        {/* Current User */}
        <div className="flex items-center justify-between mb-8 p-3 hover:bg-stone-50 transition-colors rounded-xl cursor-pointer group">
            <div className="flex items-center gap-3">
                <img 
                    src={CURRENT_USER.avatarUrl} 
                    alt={CURRENT_USER.username} 
                    className="w-12 h-12 rounded-full object-cover border border-stone-200"
                />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-stone-900 group-hover:text-orange-600 transition-colors">{CURRENT_USER.username}</span>
                    <span className="text-xs text-stone-500">{CURRENT_USER.fullName}</span>
                </div>
            </div>
            <button className="text-xs font-bold text-orange-600 hover:text-orange-800 uppercase tracking-wide">
                โปรไฟล์
            </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-sm font-bold text-stone-500">แนะนำสำหรับคุณ</span>
            <button className="text-xs font-semibold text-stone-800 hover:text-orange-600 transition-colors">ดูทั้งหมด</button>
        </div>

        {/* List */}
        <div className="space-y-2">
            {suggestions.map((user) => (
                <div key={`suggestion-${user.id}`} className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <img 
                            src={user.avatarUrl} 
                            alt={user.username} 
                            className="w-10 h-10 rounded-full object-cover border border-stone-100"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-stone-900 group-hover:text-orange-600 transition-colors cursor-pointer">{user.username}</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wide font-medium">
                                {user.rating ? `${user.rating} ยอดเยี่ยม` : 'สมาชิกใหม่ RUSHUP'}
                            </span>
                        </div>
                    </div>
                    <button className="text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors">
                        ติดตาม
                    </button>
                </div>
            ))}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-xs text-stone-300 space-y-4 px-2">
             <div className="flex flex-wrap gap-x-2 gap-y-1">
                 {['เกี่ยวกับ', 'ช่วยเหลือ', 'ข่าวสาร', 'API', 'งาน', 'ความเป็นส่วนตัว', 'ข้อกำหนด', 'สถานที่', 'ภาษา', 'Meta Verified'].map(link => (
                     <a href="#" key={link} className="hover:underline hover:text-stone-500 transition-colors">{link}</a>
                 ))}
             </div>
             <div className="font-medium text-stone-300">
                 © 2026 TRIPNECT
             </div>
        </div>
    </div>
  );
}
