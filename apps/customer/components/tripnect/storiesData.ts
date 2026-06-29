export interface StorySegment {
  id: number;
  imageUrl: string;
  timestamp: string;
  duration?: number; // in seconds, default 5
}

export interface Story {
  id: number;
  username: string;
  avatarUrl: string;
  isViewed: boolean;
  segments: StorySegment[];
  visitedFriends?: string[]; // Array of friend avatar URLs who visited this place
}

export const STORIES_DATA: Story[] = [
  {
    id: 1,
    username: 'นิมมาน',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    isViewed: false,
    visitedFriends: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
    ],
    segments: [
      {
        id: 1,
        imageUrl: 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=1080&h=1920&fit=crop',
        timestamp: '5 ชม.',
        duration: 5
      },
      {
        id: 2,
        imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1080&h=1920&fit=crop',
        timestamp: '4 ชม.',
        duration: 5
      },
      {
        id: 3,
        imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1080&h=1920&fit=crop',
        timestamp: '3 ชม.',
        duration: 5
      }
    ]
  },
  {
    id: 2,
    username: 'ดอยสุเทพ',
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
    isViewed: false,
    visitedFriends: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop'
    ],
    segments: [
      {
        id: 1,
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
        timestamp: '2 ชม.',
        duration: 5
      },
      {
        id: 2,
        imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1080&h=1920&fit=crop',
        timestamp: '1 ชม.',
        duration: 5
      }
    ]
  },
  {
    id: 3,
    username: 'เชียงใหม่ Travel',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
    isViewed: false,
    visitedFriends: [
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
    ],
    segments: [
      {
        id: 1,
        imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1080&h=1920&fit=crop',
        timestamp: '6 ชม.',
        duration: 5
      },
      {
        id: 2,
        imageUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1080&h=1920&fit=crop',
        timestamp: '5 ชม.',
        duration: 5
      },
      {
        id: 3,
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&h=1920&fit=crop',
        timestamp: '4 ชม.',
        duration: 5
      },
      {
        id: 4,
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
        timestamp: '3 ชม.',
        duration: 5
      }
    ]
  },
  {
    id: 4,
    username: 'แม่ฮ่องสอน Adventures',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    isViewed: false,
    visitedFriends: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    ],
    segments: [
      {
        id: 1,
        imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1080&h=1920&fit=crop',
        timestamp: '8 ชม.',
        duration: 5
      },
      {
        id: 2,
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&h=1920&fit=crop',
        timestamp: '7 ชม.',
        duration: 5
      }
    ]
  }
];