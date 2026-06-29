import { User, MessageCircle, Heart, Share2, Bookmark } from 'lucide-react';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  isVerified?: boolean;
  rating?: number; // Agoda style rating
}

export interface PostData {
  id: string;
  user: UserProfile;
  imageUrl: string;
  videoUrl?: string; // Added for video posts
  likes: number;
  caption: string;
  timestamp: string;
  comments: number;
  likedBy?: UserProfile[];
  location?: string;
  price?: number; // Agoda style price just for fun/mashup
  discount?: number;
}

export const CURRENT_USER: UserProfile = {
  id: 'me',
  username: 'design_wizard',
  fullName: 'ดีไซน์ วิซาร์ด',
  avatarUrl: 'https://images.unsplash.com/photo-1669206053726-bfafe8d4537f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZSUyMGZhY2V8ZW58MXx8fHwxNzY4NTM5OTk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  rating: 9.8,
};

export const USERS: UserProfile[] = [
  {
    id: '1',
    username: 'alex_shoots',
    fullName: 'อเล็กซ์ ช่างภาพ',
    avatarUrl: 'https://images.unsplash.com/photo-1597434429739-2574d7e06807?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGxhbmRzY2FwZSUyMG5hdHVyZSUyMGhpa2luZ3xlbnwxfHx8fDE3Njg1Mzk5OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    isVerified: true,
    rating: 9.5,
  },
  {
    id: '2',
    username: 'cafe_culture',
    fullName: 'เดลี่ คอฟฟี่',
    avatarUrl: 'https://images.unsplash.com/photo-1604145703889-5c58d94ee681?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBzaG9wJTIwYWVzdGhldGljJTIwbGF0dGV8ZW58MXx8fHwxNzY4NTM5OTk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 8.9,
  },
  {
    id: '3',
    username: 'arch_daily',
    fullName: 'สถาปัตยกรรมโมเดิร์น',
    avatarUrl: 'https://images.unsplash.com/photo-1695067440629-b5e513976100?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBidWlsZGluZ3xlbnwxfHx8fDE3Njg1MjMxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 9.9,
  },
  {
    id: '4',
    username: 'puppy_love',
    fullName: 'น้องหมาน่ารัก',
    avatarUrl: 'https://images.unsplash.com/photo-1616615591669-a8452b6f5c18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZG9nJTIwcHVwcHklMjBwZXR8ZW58MXx8fHwxNzY4NTM5OTk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    rating: 10.0,
  },
];

export const POSTS: PostData[] = [
  {
    id: 'p1',
    user: USERS[0],
    imageUrl: 'https://images.unsplash.com/photo-1597434429739-2574d7e06807?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGxhbmRzY2FwZSUyMG5hdHVyZSUyMGhpa2luZ3xlbnwxfHx8fDE3Njg1Mzk5OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    likes: 1243,
    caption: 'ไม่มีอะไรดีไปกว่าอากาศบริสุทธิ์บนภูเขา 🏔️ #เดินป่า #ธรรมชาติ',
    timestamp: '2 ชม.',
    comments: 45,
    location: 'เทือกเขาสวิสแอลป์',
    price: 120,
    discount: 15,
  },
  {
    id: 'p2',
    user: USERS[1],
    imageUrl: 'https://images.unsplash.com/photo-1604145703889-5c58d94ee681?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBzaG9wJTIwYWVzdGhldGljJTIwbGF0dGV8ZW58MXx8fHwxNzY4NTM5OTk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    likes: 892,
    caption: 'กาแฟยามเช้าที่สมบูรณ์แบบ ☕️',
    timestamp: '4 ชม.',
    comments: 12,
    location: 'ดาวน์ทาวน์ คาเฟ่',
    price: 5,
  },
  {
    id: 'v1',
    user: USERS[0],
    imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/4121573/4121573-hd_1080_1920_25fps.mp4',
    likes: 5432,
    caption: 'หนึ่งวันในชีวิตนักเดินทาง ✈️ #vlog #ท่องเที่ยว #reels',
    timestamp: '5 ชม.',
    comments: 128,
    location: 'เกียวโต, ญี่ปุ่น',
    price: 0,
  },
  {
    id: 'p3',
    user: USERS[2],
    imageUrl: 'https://images.unsplash.com/photo-1695067440629-b5e513976100?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBidWlsZGluZ3xlbnwxfHx8fDE3Njg1MjMxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    likes: 3541,
    caption: 'เส้นสายและมุมมอง ความเรียบง่ายที่ทันสมัย',
    timestamp: '6 ชม.',
    comments: 88,
    location: 'พิพิธภัณฑ์ศิลปะสมัยใหม่',
    price: 25,
    discount: 10,
  },
  {
    id: 'v2',
    user: USERS[1],
    imageUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/3205634/3205634-hd_1080_1920_25fps.mp4',
    likes: 2100,
    caption: 'ความพึงพอใจในการเทกาแฟ ☕️ #latteart #coffee',
    timestamp: '8 ชม.',
    comments: 56,
    location: 'คาเฟ่ อเมซอน',
    price: 0,
  },
  {
    id: 'v3',
    user: USERS[2],
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/3571264/3571264-hd_1080_1920_30fps.mp4',
    likes: 8934,
    caption: 'พระอาทิตย์ตกที่ดอยสุเทพ มหัศจรรย์มาก 🌅 #เชียงใหม่ #sunset',
    timestamp: '1 วัน',
    comments: 234,
    location: 'ดอยสุเทพ, เชียงใหม่',
    price: 0,
  },
  {
    id: 'v4',
    user: USERS[3],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/2795405/2795405-hd_1080_1920_25fps.mp4',
    likes: 6721,
    caption: 'ความสงบของภูเขาในหมอกยามเช้า 🏔️ #ภูชี้ฟ้า #เชียงราย',
    timestamp: '1 วัน',
    comments: 189,
    location: 'ภูชี้ฟ้า, เชียงราย',
    price: 0,
  },
  {
    id: 'v5',
    user: USERS[0],
    imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/3571375/3571375-hd_1080_1920_30fps.mp4',
    likes: 4521,
    caption: 'Street food ที่อร่อยที่สุดในเชียงใหม่ 🍜 #อาหารเหนือ #streetfood',
    timestamp: '2 วัน',
    comments: 167,
    location: 'ถนนนิมมาน, เชียงใหม่',
    price: 0,
  },
  {
    id: 'v6',
    user: USERS[1],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/2795402/2795402-hd_1080_1920_25fps.mp4',
    likes: 3890,
    caption: 'คาเฟ่ในสวนสุดชิล บรรยากาศดีมาก ☕️ #cafehoping #เชียงใหม่',
    timestamp: '2 วัน',
    comments: 93,
    location: 'เมืองเก่า, เชียงใหม่',
    price: 0,
  },
  {
    id: 'v7',
    user: USERS[2],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/3648043/3648043-hd_1080_1920_25fps.mp4',
    likes: 11245,
    caption: 'ชายหาดสวรรค์ที่ไม่มีใครรู้จัก 🏖️ #ทะเลสวย #หาดลับ',
    timestamp: '3 วัน',
    comments: 456,
    location: 'เกาะหลีเป๊ะ, สตูล',
    price: 0,
  },
  {
    id: 'v8',
    user: USERS[3],
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/4625964/4625964-hd_1080_1920_25fps.mp4',
    likes: 7632,
    caption: 'เดินป่าในธรรมชาติ รู้สึกเป็นหนึ่งเดียวกับป่า 🌲 #trekking #adventure',
    timestamp: '3 วัน',
    comments: 201,
    location: 'อุทยานแห่งชาติดอยอินทนนท์',
    price: 0,
  },
  {
    id: 'v9',
    user: USERS[0],
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/3571541/3571541-hd_1080_1920_30fps.mp4',
    likes: 9871,
    caption: 'ตลาดใหม่ดอยแก้ว ของกินเยอะมาก! 🍢 #ตลาดเชียงใหม่ #อาหาร',
    timestamp: '4 วัน',
    comments: 312,
    location: 'แม่ริม, เชียงใหม่',
    price: 0,
  },
  {
    id: 'v10',
    user: USERS[1],
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://videos.pexels.com/video-files/2491284/2491284-hd_1080_1920_30fps.mp4',
    likes: 5234,
    caption: 'ทางรถไฟสายโรแมนติก ขึ้นเขาไปกันเถอะ 🚂 #รถไฟ #travel',
    timestamp: '4 วัน',
    comments: 145,
    location: 'ปาย, แม่ฮ่องสอน',
    price: 0,
  },
  {
    id: 'p4',
    user: USERS[3],
    imageUrl: 'https://images.unsplash.com/photo-1616615591669-a8452b6f5c18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZG9nJTIwcHVwcHklMjBwZXR8ZW58MXx8fHwxNzY4NTM5OTk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    likes: 12000,
    caption: 'ขอกลับไปเลี้ยงที่บ้านได้มั้ย? 🥺',
    timestamp: '12 ชม.',
    comments: 420,
    location: 'บ้านแสนสุข',
    price: 9999,
  },
];