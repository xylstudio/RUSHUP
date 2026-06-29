import { Plus, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabaseClient';

interface StoriesProps {
  onStoryClick: (storyIndex: number) => void;
}

export interface DBStory {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  username: string;
  avatarUrl: string;
  isViewed: boolean;
}

function StoryCircle({ story, index, onClick, isMyStory = false, myAvatarUrl }: { 
  story?: DBStory; 
  index: number; 
  onClick: () => void;
  isMyStory?: boolean;
  myAvatarUrl?: string;
}) {
  if (isMyStory) {
    return (
      <div 
        onClick={onClick}
        className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px]"
      >
        <div className="relative">
          <div className="w-[62px] h-[62px] rounded-full p-[2px] border border-dashed border-stone-200 group-hover:border-orange-300 transition-colors flex items-center justify-center overflow-hidden">
            {myAvatarUrl ? (
                <img 
                  src={myAvatarUrl} 
                  alt="My Story"
                  className="w-full h-full rounded-full object-cover"
                />
            ) : (
                <div className="w-full h-full rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                   <User size={24} strokeWidth={2} />
                </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md">
            <Plus size={10} strokeWidth={3} />
          </div>
        </div>
        <span className="text-[10px] text-stone-600 font-semibold tracking-wide mt-1 group-hover:text-orange-500 transition-colors">
          คุณ
        </span>
      </div>
    );
  }

  if (!story) return null;

  const isViewed = story.isViewed;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px] relative"
    >
      <div className="relative">
        <div className={`relative w-[62px] h-[62px] p-[2.5px] rounded-full transition-all duration-300 ${
          !isViewed 
            ? 'bg-gradient-to-tr from-orange-500 via-orange-400 to-orange-500' 
            : 'bg-stone-200'
        }`}>
          <div className={`w-full h-full rounded-full overflow-hidden border-[2.5px] border-white bg-stone-100 ${
            isViewed ? 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100' : ''
          } transition-all duration-300`}>
            <img 
              src={story.avatarUrl} 
              alt={story.username} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
        </div>
      </div>

      <span className={`text-[10px] tracking-wide mt-1 transition-colors max-w-[72px] truncate ${
        !isViewed 
          ? "font-bold text-stone-900" 
          : "text-stone-500 font-medium"
      }`}>
        {story.username}
      </span>
    </motion.div>
  );
}

export function Stories({ onStoryClick }: StoriesProps) {
  const { profile } = useAuth();
  const avatarUrl = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800';
  const [dbStories, setDbStories] = useState<DBStory[]>([]);

  useEffect(() => {
    async function fetchStories() {
      try {
        const { data, error } = await supabase
          .from('stories')
          .select(`
            id,
            user_id,
            media_url,
            media_type,
            profiles (
              first_name,
              avatar_url
            )
          `)
          .gt('expires_at', new Date().toISOString());

        if (data && !error) {
          const formatted: DBStory[] = data.map((story: any) => ({
            id: story.id,
            user_id: story.user_id,
            media_url: story.media_url,
            media_type: story.media_type,
            username: story.profiles?.first_name ? story.profiles.first_name.toLowerCase() : 'traveler',
            avatarUrl: story.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
            isViewed: false
          }));
          setDbStories(formatted);
        }
      } catch (err) {
        console.error('Error fetching stories:', err);
      }
    }
    fetchStories();
  }, []);

  const handleMyStoryClick = () => {
    console.log('Create/View my story');
    if (navigator.vibrate) navigator.vibrate(30);
  };

  return (
    <div className="flex flex-col w-full pb-3 pt-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 items-end pb-2">
        <StoryCircle 
          index={-1} 
          onClick={handleMyStoryClick}
          isMyStory 
          myAvatarUrl={avatarUrl}
        />
        
        {dbStories.map((story, index) => (
          <StoryCircle 
            key={story.id}
            story={story}
            index={index}
            onClick={() => onStoryClick(index)}
          />
        ))}
      </div>
    </div>
  );
}