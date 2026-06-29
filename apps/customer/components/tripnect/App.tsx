'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { POSTS, PostData, CURRENT_USER } from './data';
import { supabase } from '../../lib/supabaseClient';
import { Sidebar } from './components/Sidebar';
import { MobileNav, MobileSidebar } from './components/MobileNav';
import { MobileHeader } from './components/MobileHeader';
import { Stories } from './components/Stories';
import { StoriesViewer } from './components/StoriesViewer';
import { STORIES_DATA } from './storiesData';
import { Post } from './components/Post';
import { Suggestions } from './components/Suggestions';
import { MailView } from './components/MailView';
import { ExploreView } from './components/ExploreView';
import { WalletView } from './components/WalletView';
import { ReelsViewer } from './components/ReelsViewer';
import { MagicRandomizer, RandomizerActionType, RandomizerResult } from './components/MagicRandomizer';
import { TripPlannerModal } from './components/TripPlannerModal';
import { FoodDeliveryModal } from './components/FoodDeliveryModal';
import { PassportModal } from './components/PassportModal'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { BookingModal } from './components/BookingModal';
import { RideModal } from './components/RideModal';
import { HotelModal } from './components/HotelModal';
import { CarRentalModal } from './components/CarRentalModal';

import { BookingWidget } from './components/BookingWidget';

// Import new views
import { ProfileView } from './components/ProfileView';
import { TripnectPlusView } from './components/TripnectPlusView';
import { SavedReviewsView } from './components/SavedReviewsView';
import { MyPostsView } from './components/MyPostsView';
import { SettingsView } from './components/SettingsView';
import { HelpCenterView } from './components/HelpCenterView';
import { SearchView } from './components/SearchView';
import { CreatePostModal } from './components/CreatePostModal';

// Import ThemeProvider
import { ThemeProvider } from './contexts/ThemeContext';

type Category = 'food' | 'trip' | 'quest' | 'ride' | 'hotel' | 'car';

// --- Custom Hook for Long Press ---
function useLongPress(
    onLongPress: () => void, 
    onClick: () => void, 
    { delay = 800, isEnabled = true } = {}
) {
  const [isPressing, setIsPressing] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{x: number, y: number} | null>(null);
  const isLongPressTriggered = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isEnabled) return;

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }
    
    startPos.current = { x: clientX, y: clientY };
    isLongPressTriggered.current = false;
    setIsPressing(true);

    timeout.current = setTimeout(() => {
      onLongPress();
      isLongPressTriggered.current = true;
      setIsPressing(false); 
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]); 
    }, delay);
  }, [onLongPress, delay, isEnabled]);

  const clear = useCallback((e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }

    if (!isEnabled) {
        if (shouldTriggerClick) onClick();
        return;
    }

    let clientX, clientY;
    if ('changedTouches' in e) {
         clientX = e.changedTouches[0].clientX;
         clientY = e.changedTouches[0].clientY;
    } else if ('touches' in e && e.touches.length > 0) {
         clientX = e.touches[0].clientX;
         clientY = e.touches[0].clientY;
    } else {
         clientX = (e as React.MouseEvent).clientX;
         clientY = (e as React.MouseEvent).clientY;
    }

    let moved = false;
    if (startPos.current) {
        const dx = Math.abs(clientX - startPos.current.x);
        const dy = Math.abs(clientY - startPos.current.y);
        if (dx > 10 || dy > 10) moved = true;
    }

    if (shouldTriggerClick && !isLongPressTriggered.current && !moved) {
        onClick();
    }

    setIsPressing(false);
    isLongPressTriggered.current = false;
    startPos.current = null;
  }, [onClick, isEnabled]);

  return {
    handlers: {
        onMouseDown: (e: any) => start(e),
        onTouchStart: (e: any) => start(e),
        onMouseUp: (e: any) => clear(e),
        onMouseLeave: (e: any) => clear(e, false),
        onTouchEnd: (e: any) => clear(e),
    },
    isPressing
  };
}

export default function App({ services = [], orders = [], profile = null }: { services?: any[], orders?: any[], profile?: any }) {
  const [dbPosts, setDbPosts] = useState<PostData[]>([]);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          image_url,
          video_url,
          caption,
          location,
          price,
          discount,
          created_at,
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (data && !error) {
        const formatted: PostData[] = data.map((post: any) => ({
          id: post.id,
          user: {
            id: post.profiles?.id || post.user_id,
            username: post.profiles?.first_name ? post.profiles.first_name.toLowerCase() : 'traveler',
            fullName: post.profiles ? `${post.profiles.first_name || ''} ${post.profiles.last_name || ''}`.trim() : 'นักเดินทางไร้นาม',
            avatarUrl: post.profiles?.avatar_url || null,
            rating: 9.5
          },
          imageUrl: post.image_url,
          videoUrl: post.video_url || undefined,
          likes: 0,
          caption: post.caption || '',
          timestamp: new Date(post.created_at).toLocaleDateString('th-TH'),
          comments: 0
        }));
        setDbPosts(formatted);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'mail' | 'wallet'>('home');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('food'); // Default to food for RUSHUP
  const [homeTab, setHomeTab] = useState<'foryou' | 'following'>('foryou');
  const [previousTab, setPreviousTab] = useState<'home' | 'search' | 'mail' | 'wallet'>('home');
  const [selectedVideo, setSelectedVideo] = useState<PostData | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);
  const [isInChatRoom, setIsInChatRoom] = useState(false);

  // Custom Modals State
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showFoodDelivery, setShowFoodDelivery] = useState(false);
  const [showRideModal, setShowRideModal] = useState(false);
  const [showPassport, setShowPassport] = useState(false);

  // Map RUSHUPAPP services (pos_menu_items) to Tripnect POSTS format
  const dynamicPosts: PostData[] = useMemo(() => {
    if (!services || services.length === 0) return POSTS;
    return services.map((item, index) => ({
      id: item.id,
      user: {
        id: item.branch_id || 'admin',
        username: 'rushup_kitchen',
        fullName: 'RUSHUP Kitchen',
        avatarUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=200',
        rating: 4.8
      },
      imageUrl: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
      likes: Math.floor(Math.random() * 500) + 50,
      caption: `${item.name} - ${item.description || 'Delicious food!'}`,
      timestamp: 'Just now',
      comments: Math.floor(Math.random() * 50),
      price: item.sale_price || item.price || item.base_price,
      location: 'Local Kitchen'
    }));
  }, [services]);

  const finalPosts = dbPosts;
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showCarRentalModal, setShowCarRentalModal] = useState(false);
  const [selectedBookingPost, setSelectedBookingPost] = useState<PostData | null>(null);

  // Comments modal state
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Stories viewer state
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);

  // Randomizer state
  const [showMagicRandomizer, setShowMagicRandomizer] = useState(false);
  const [randomizerContext, setRandomizerContext] = useState<Category | null>(null);

  // Deep linking state
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [tripDestination, setTripDestination] = useState('');

  // Bottom Sheet Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // SIDEBAR STATE
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const LONG_PRESS_DURATION = 800;

  const activeContext: Category | null = showFoodDelivery 
        ? 'food' 
        : showTripPlanner 
            ? 'trip' 
            : showRideModal
                ? 'ride'
                : showHotelModal
                    ? 'hotel'
                    : showCarRentalModal
                        ? 'car'
                        : activeTab === 'trip' 
                            ? 'trip' 
                            : null;

  // --- Unified Modal Management ---
  const closeAllModals = () => {
      setShowRideModal(false);
      setShowHotelModal(false);
      setShowCarRentalModal(false);
      setShowTripPlanner(false);
      setShowFoodDelivery(false);
      setShowPassport(false);
      setShowMagicRandomizer(false);
      setSelectedBookingPost(null);
      // Don't clear deep link states immediately if we are switching between them
  };

  const handleRandomizerResult = (result: RandomizerResult) => {
      closeAllModals();
      
      setTimeout(() => {
          if (result.type === 'search_food') {
              setFoodSearchQuery(result.query);
              setShowFoodDelivery(true);
          } else if (result.type === 'plan_trip') {
              setTripDestination(result.query);
              setShowTripPlanner(true);
          } else if (result.type === 'explore_place') {
              setActiveTab('trip'); // Switch to Explore/Search tab
              // Ideally pass query to ExploreView via context or prop, but for now tab switch is enough context
          }
      }, 300); // Wait for randomizer to close
  };

  const handleRideModalToggle = (show: boolean) => {
      if (show) closeAllModals();
      setShowRideModal(show);
  };

  const handleHotelModalToggle = (show: boolean) => {
      if (show) closeAllModals();
      setShowHotelModal(show);
  };

  const handleCarRentalModalToggle = (show: boolean) => {
      if (show) closeAllModals();
      setShowCarRentalModal(show);
  };

  const handleTripPlannerToggle = (show: boolean) => {
      if (show) closeAllModals();
      setShowTripPlanner(show);
  };

  const handleFoodDeliveryToggle = (show: boolean) => {
      if (show) closeAllModals();
      setShowFoodDelivery(show);
  };

  const handleTabChange = (tab: string) => {
      if (tab !== 'search') {
          setPreviousTab(activeTab);
      }
      setActiveTab(tab);
      closeAllModals();
  };

  const handleLongPress = () => {
     setRandomizerContext(activeContext);
     setShowMagicRandomizer(true);
  };

  const handleClick = () => {
      setIsMobileMenuOpen(prev => !prev);
  };

  const { handlers: plusButtonHandlers, isPressing: isPlusButtonPressing } = useLongPress(
      handleLongPress, 
      handleClick, 
      { 
          delay: LONG_PRESS_DURATION,
          isEnabled: !isMobileMenuOpen 
      }
  );

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'wallet': return "กระเป๋าเงิน";
      case 'mail': return "ข้อความ";
      case 'trip': return "ค้นหา"; 
      case 'profile': return "โปรไฟล์";
      case 'plus': return "Tripnect Plus";
      case 'saved': return "รีวิวที่บันทึก";
      case 'myposts': return "รายการที่สร้าง";
      case 'settings': return "การตั้งค่า";
      case 'help': return "ศูนย์ช่วยเหลือ";
      default: return "Tripnect";
    }
  };

  // Clean Transition
  const smoothTransition = {
      type: "tween",
      ease: [0.32, 0.72, 0, 1], 
      duration: 0.5
  };

  return (
    // MAIN CONTAINER - Cream Background
    <ThemeProvider>
    <div className="fixed inset-0 bg-white dark:bg-stone-950 overflow-hidden font-sans select-none">
      
      {/* 1. SIDEBAR */}
      <motion.div 
        className="absolute top-0 left-0 bottom-0 w-[75%] z-[200] md:hidden bg-white dark:bg-stone-950 border-r border-stone-100 dark:border-stone-800" 
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? '0%' : '-100%' }}
        transition={smoothTransition}
      >
         <MobileSidebar 
            onClose={() => setIsSidebarOpen(false)}
            onOpenPassport={() => {
                setIsSidebarOpen(false);
                setTimeout(() => setShowPassport(true), 300);
            }}
            onNavigate={(tab) => {
                setActiveTab(tab);
            }}
         />
      </motion.div>

      {/* 2. MAIN APP CONTENT */}
      <motion.div 
        className="absolute inset-0 z-40 bg-white dark:bg-stone-950 flex flex-col h-full w-full"
        animate={{
            x: isSidebarOpen ? '75%' : '0%', 
            filter: isSidebarOpen ? "blur(2px)" : "blur(0px)",
        }}
        transition={smoothTransition}
      >
          {/* Click Overlay */}
          {isSidebarOpen && (
              <div 
                className="absolute inset-0 z-[100] cursor-pointer" 
                onClick={() => setIsSidebarOpen(false)}
              />
          )}

          {/* HEADER - Consistent MobileHeader */}
          {activeTab !== 'mail' && activeTab !== 'search' && (
            <div className="flex-shrink-0 relative z-20 bg-white dark:bg-stone-950 sticky top-0 transition-all duration-300 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
               <MobileHeader 
                  title={getHeaderTitle()} 
                  onOpenSidebar={() => setIsSidebarOpen(true)}
                  isHome={activeTab === 'home'}
                  homeTab={homeTab}
                  onHomeTabChange={setHomeTab}
                  onSearchClick={() => {
                      setPreviousTab(activeTab);
                      setActiveTab('search');
                  }}
               />
            </div>
          )}

          {/* SCROLLABLE CONTENT */}
          <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isInChatRoom ? 'pb-0' : 'pb-[80px]'} md:ml-64 md:pb-0 scroll-smooth bg-white dark:bg-stone-950 relative z-10`}>
            {activeTab === 'home' && (
               <div className="flex flex-col w-full max-w-[500px] mx-auto pb-10">
                   {/* Booking Section */}
                   <div className="pt-2">
                      <BookingWidget />
                   </div>

                   {/* Stories Section */}
                   <div className="mb-2">
                     <Stories onStoryClick={(index) => {
                       setInitialStoryIndex(index);
                       setIsStoriesViewerOpen(true);
                     }} />
                   </div>

                   {/* Content Feed */}
                   <div className="flex flex-col gap-0">
                     {finalPosts.map((post, index) => (
                       <Post 
                            key={post.id} 
                            post={post} 
                            onVideoClick={(videoPost) => {
                              setSelectedVideo(videoPost);
                              // Find the index of this video in all videos
                              const videoOnlyPosts = finalPosts.filter(p => p.videoUrl);
                              const videoIndex = videoOnlyPosts.findIndex(p => p.id === videoPost.id);
                              setSelectedVideoIndex(videoIndex >= 0 ? videoIndex : 0);
                            }}
                            onBookingClick={setSelectedBookingPost}
                            onRideClick={() => setShowRideModal(true)}
                            onCommentsOpenChange={setIsCommentsModalOpen}
                            onShareOpenChange={setIsShareModalOpen}
                       />
                     ))}
                     
                     <div className="py-16 text-center px-6">
                        <span className="text-slate-300 text-xs tracking-widest uppercase mb-4 block">End of Feed</span>
                        <button 
                            onClick={() => setShowTripPlanner(true)}
                            className="px-6 py-2 bg-slate-900 text-white font-medium text-xs rounded-full hover:scale-105 transition-transform"
                        >
                            Start Planning
                        </button>
                     </div>
                   </div>
               </div>
            )}

            {activeTab === 'mail' && <MailView 
                onOpenSidebar={() => setIsSidebarOpen(true)} 
                onSearchClick={() => {
                    setPreviousTab(activeTab);
                    setActiveTab('search');
                }} 
                onChatRoomChange={setIsInChatRoom}
            />}
            {activeTab === 'wallet' && <WalletView />}
            {activeTab === 'trip' && <ExploreView />}
            {activeTab === 'profile' && <ProfileView />}
            {activeTab === 'plus' && <TripnectPlusView />}
            {activeTab === 'saved' && <SavedReviewsView />}
            {activeTab === 'myposts' && <MyPostsView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'help' && <HelpCenterView />}
            {activeTab === 'search' && <SearchView onClose={() => setActiveTab(previousTab)} />}
          </main>
      </motion.div>

      {/* 3. BOTTOM NAV (Fixed & Pushable) - Hide when in chat room, comments modal, or share modal */}
      {!isInChatRoom && !selectedVideo && !isCommentsModalOpen && !isShareModalOpen && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-[150] md:hidden"
          animate={{ x: isSidebarOpen ? '75%' : '0%' }}
          transition={smoothTransition}
        >
          <MobileNav 
              activeTab={activeTab}  
              onTabChange={handleTabChange} 
              showTripPlanner={showTripPlanner}
              setShowTripPlanner={handleTripPlannerToggle}
              showFoodDelivery={showFoodDelivery}
              setShowFoodDelivery={handleFoodDeliveryToggle}
              showRideModal={showRideModal}
              setShowRideModal={handleRideModalToggle}
              showHotelModal={showHotelModal}
              setShowHotelModal={handleHotelModalToggle}
              showCarRentalModal={showCarRentalModal}
              setShowCarRentalModal={handleCarRentalModalToggle}
              showMagicRandomizer={showMagicRandomizer}
              isMenuOpen={isMobileMenuOpen}
              setIsMenuOpen={setIsMobileMenuOpen}
              onPlusClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              activeContext={activeContext} 
              onCreatePostClick={() => setIsCreatePostOpen(true)}
          />
        </motion.div>
      )}

      {/* --- MODALS (Layered behind Bottom Nav) --- */}
      {/* Z-Index Strategy: Nav is 150. Modals are 50-100. */}
      
      <BookingModal 
          post={selectedBookingPost} 
          onClose={() => setSelectedBookingPost(null)} 
      />

      <TripPlannerModal 
          isOpen={showTripPlanner} 
          onClose={() => setShowTripPlanner(false)} 
          initialDestination={tripDestination}
      />

        <FoodDeliveryModal 
          isOpen={showFoodDelivery} 
          onClose={() => setShowFoodDelivery(false)} 
          initialSearchQuery={activeCategory === 'food' ? "" : ""}
          services={services}
        />

      <MagicRandomizer 
          isOpen={showMagicRandomizer} 
          onClose={() => setShowMagicRandomizer(false)}
          initialCategory={randomizerContext}
          onResultAction={handleRandomizerResult}
      />

      <PassportModal 
          isOpen={showPassport}
          onClose={() => setShowPassport(false)}
      />

      <RideModal 
          isOpen={showRideModal} 
          onClose={() => setShowRideModal(false)} 
      />

      <HotelModal 
          isOpen={showHotelModal} 
          onClose={() => setShowHotelModal(false)} 
      />

      <CarRentalModal 
          isOpen={showCarRentalModal} 
          onClose={() => setShowCarRentalModal(false)} 
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed z-50 h-full">
         <Sidebar onCreateClick={() => setIsCreatePostOpen(true)} />
      </div>

      {/* Fullscreen Video */}
      {selectedVideo && (
        <ReelsViewer 
            posts={finalPosts.filter(p => p.videoUrl)}
            initialIndex={selectedVideoIndex}
            onClose={() => setSelectedVideo(null)} 
        />
      )}

      {/* Stories Viewer */}
      {isStoriesViewerOpen && (
        <StoriesViewer 
            isOpen={isStoriesViewerOpen}
            stories={STORIES_DATA}
            initialStoryIndex={initialStoryIndex}
            onClose={() => setIsStoriesViewerOpen(false)} 
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal 
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={fetchPosts}
      />
    </div>
    </ThemeProvider>
  );
}