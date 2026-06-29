import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { CURRENT_USER } from '../data';
import { STORIES_DATA, Story } from '../storiesData';

interface StoriesProps {
  onStoryClick: (storyIndex: number) => void;
}

function StoryCircle({ story, index, onClick, isMyStory = false }: { 
  story?: Story; 
  index: number; 
  onClick: () => void;
  isMyStory?: boolean;
}) {
  if (isMyStory) {
    return (
      <div 
        onClick={onClick}
        className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px]"
      >
        <div className="relative">
          <div className="w-[62px] h-[62px] rounded-full p-[2px] border border-dashed border-stone-200 group-hover:border-orange-300 transition-colors">
            <img 
              src={CURRENT_USER.avatarUrl} 
              alt="My Story"
              className="w-full h-full rounded-full object-cover"
            />
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
  const visitedFriends = story.visitedFriends || [];
  const displayFriends = visitedFriends.slice(0, 3); // แสดงได้ถึง 3 คน
  const remainingCount = visitedFriends.length - displayFriends.length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px] relative"
    >
      {/* Main Story Circle Container */}
      <div className="relative">
        {/* Main Story Circle */}
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

        {/* Friend Avatars Stack - Static Display */}
        {displayFriends.length > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center z-10">
            {displayFriends.map((friendAvatar, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: (index * 0.05) + (idx * 0.1) + 0.2,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                className="relative"
                style={{
                  marginLeft: idx > 0 ? '-6px' : '0',
                }}
              >
                <img
                  src={friendAvatar}
                  alt={`Friend ${idx + 1}`}
                  className="w-[18px] h-[18px] rounded-full object-cover border-[2px] border-white shadow-md"
                />
              </motion.div>
            ))}
            
            {/* +X Badge for remaining friends */}
            {remainingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: (index * 0.05) + (displayFriends.length * 0.1) + 0.2,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                className="w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center border-[2px] border-white shadow-md"
                style={{
                  marginLeft: '-6px',
                }}
              >
                <span className="text-[8px] font-bold">+{remainingCount}</span>
              </motion.div>
            )}
          </div>
        )}

        {/* Live Indicator */}
        {index === 0 && !isViewed && (
          <div className="absolute -top-0.5 -left-0.5 z-20">
            <div className="relative">
            </div>
          </div>
        )}
      </div>

      {/* Username */}
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
  const handleMyStoryClick = () => {
    console.log('Create/View my story');
    if (navigator.vibrate) navigator.vibrate(30);
  };

  return (
    <div className="flex flex-col w-full pb-3 pt-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 items-end pb-2">
        {/* My Story */}
        <StoryCircle 
          index={-1} 
          onClick={handleMyStoryClick}
          isMyStory 
        />
        
        {/* Friends Stories */}
        {STORIES_DATA.map((story, index) => (
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