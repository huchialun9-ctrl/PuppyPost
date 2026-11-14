export type ChestTierId = 'daily' | 'bronze' | 'mystic' | 'legendary';
export type KahootShapeType = 'triangle' | 'diamond' | 'circle' | 'square';
export type EraKey = '2012-2015' | '2016-2020' | '2021-now';

export interface GameProps {
  coinIcon: string;
  trophyIcon: string;
  streakIcon: string;
}

export const GAME_PROPS: GameProps = {
  coinIcon: '/src/assets/images/game_prop_coin_1794635414179.jpg',
  trophyIcon: '/src/assets/images/game_prop_trophy_1794635414259.jpg',
  streakIcon: '/src/assets/images/game_prop_streak_1794635416633.jpg',
};

export interface ChestConfig {
  id: ChestTierId;
  tierNumber: number;
  shape: KahootShapeType;
  nameZh: string;
  nameEn: string;
  tierLabelZh: string;
  tierLabelEn: string;
  poolHintZh: string;
  poolHintEn: string;
  costCoins: number;
  baseCoinReward: number;
  rewardPoints: number;
  luckGain: number;
  subredditPool: string[];
  redditSort: 'hot' | 'top';
  redditTime: 'day' | 'month' | 'year' | 'all';
  eraWindow?: { after: string; before?: string };
  cardBg: string;
  cardShadow: string;
  cardButtonText: string;
  buttonBg: string;
  buttonShadow: string;
  shapeColor: string;
  imageUrl: string;
}

export const CHEST_TIERS: ChestConfig[] = [
  {
    id: 'daily',
    tierNumber: 1,
    shape: 'triangle',
    nameZh: '每日補給箱',
    nameEn: 'Daily Chest',
    tierLabelZh: 'TIER 1 · 免費',
    tierLabelEn: 'TIER 1 · FREE',
    poolHintZh: '2021–至今全站熱帖',
    poolHintEn: '2021–Now Hot Posts',
    costCoins: 0,
    baseCoinReward: 120,
    rewardPoints: 100,
    luckGain: 20,
    subredditPool: ['pics', 'mildlyinteresting', 'aww', 'funny'],
    redditSort: 'hot',
    redditTime: 'day',
    eraWindow: { after: '2021-01-01' },
    cardBg: 'bg-[#26890C]',
    cardShadow: 'shadow-[0_8px_0_#195E07]',
    cardButtonText: 'text-[#195E07]',
    buttonBg: 'bg-[#26890C] hover:bg-[#2C9C0F]',
    buttonShadow: 'shadow-[0_5px_0_#195E07] active:shadow-[0_1px_0_#195E07]',
    shapeColor: 'text-[#26890C]',
    imageUrl: '/src/assets/images/game_chest_daily.png',
  },
  {
    id: 'bronze',
    tierNumber: 2,
    shape: 'diamond',
    nameZh: '青銅冒險箱',
    nameEn: 'Bronze Chest',
    tierLabelZh: 'TIER 2 · 進階',
    tierLabelEn: 'TIER 2 · RARE',
    poolHintZh: '2016–2020 黃金年代',
    poolHintEn: '2016–2020 Era Top',
    costCoins: 80,
    baseCoinReward: 30,
    rewardPoints: 180,
    luckGain: 25,
    subredditPool: ['Damnthatsinteresting', 'funny', 'todayilearned', 'pics'],
    redditSort: 'top',
    redditTime: 'all',
    eraWindow: { after: '2016-01-01', before: '2020-12-31' },
    cardBg: 'bg-[#1368CE]',
    cardShadow: 'shadow-[0_8px_0_#0D4994]',
    cardButtonText: 'text-[#0D4994]',
    buttonBg: 'bg-[#1368CE] hover:bg-[#1974E0]',
    buttonShadow: 'shadow-[0_5px_0_#0D4994] active:shadow-[0_1px_0_#0D4994]',
    shapeColor: 'text-[#1368CE]',
    imageUrl: '/src/assets/images/game_chest_bronze.png',
  },
  {
    id: 'mystic',
    tierNumber: 3,
    shape: 'circle',
    nameZh: '紫晶公會箱',
    nameEn: 'Mystic Coffer',
    tierLabelZh: 'TIER 3 · 史詩',
    tierLabelEn: 'TIER 3 · EPIC',
    poolHintZh: '2012–2015 早期考古',
    poolHintEn: '2012–2015 Early Era',
    costCoins: 180,
    baseCoinReward: 60,
    rewardPoints: 280,
    luckGain: 35,
    subredditPool: ['pics', 'todayilearned', 'funny', 'aww', 'gaming'],
    redditSort: 'top',
    redditTime: 'all',
    eraWindow: { after: '2012-01-01', before: '2015-12-31' },
    cardBg: 'bg-[#E21B3C]',
    cardShadow: 'shadow-[0_8px_0_#A3112A]',
    cardButtonText: 'text-[#A3112A]',
    buttonBg: 'bg-[#E21B3C] hover:bg-[#F02648]',
    buttonShadow: 'shadow-[0_5px_0_#A3112A] active:shadow-[0_1px_0_#A3112A]',
    shapeColor: 'text-[#E21B3C]',
    imageUrl: '/src/assets/images/game_chest_mystic.png',
  },
  {
    id: 'legendary',
    tierNumber: 4,
    shape: 'square',
    nameZh: '皇室傳奇箱',
    nameEn: 'Legendary Chest',
    tierLabelZh: 'TIER 4 · 傳奇',
    tierLabelEn: 'TIER 4 · LEGEND',
    poolHintZh: '全站歷代殿堂精選',
    poolHintEn: 'All-Time Reddit Legends',
    costCoins: 260,
    baseCoinReward: 95,
    rewardPoints: 500,
    luckGain: 50,
    subredditPool: ['nextfuckinglevel', 'Damnthatsinteresting', 'pics', 'aww'],
    redditSort: 'top',
    redditTime: 'all',
    eraWindow: { after: '2013-01-01' },
    cardBg: 'bg-[#D89E00]',
    cardShadow: 'shadow-[0_8px_0_#9E7300]',
    cardButtonText: 'text-[#8F6500]',
    buttonBg: 'bg-[#D89E00] hover:bg-[#E5AA00]',
    buttonShadow: 'shadow-[0_5px_0_#9E7300] active:shadow-[0_1px_0_#9E7300]',
    shapeColor: 'text-[#D89E00]',
    imageUrl: '/src/assets/images/game_chest_legendary.png',
  },
];

export const MASTERY_SUBREDDITS = [
  'r/pics',
  'r/Damnthatsinteresting',
  'r/funny',
  'r/nextfuckinglevel',
  'r/todayilearned',
  'r/aww',
  'r/gaming',
];

export const ERA_DEFINITIONS: Array<{
  key: EraKey;
  labelZh: string;
  labelEn: string;
  targetCount: number;
}> = [
  {
    key: '2012-2015',
    labelZh: '2012–2015 早期經典年代',
    labelEn: '2012–2015 Classic Era',
    targetCount: 2,
  },
  {
    key: '2016-2020',
    labelZh: '2016–2020 黃金擴張年代',
    labelEn: '2016–2020 Golden Era',
    targetCount: 2,
  },
  {
    key: '2021-now',
    labelZh: '2021–至今 當代潮流年代',
    labelEn: '2021–Present Modern Era',
    targetCount: 2,
  },
];

export function getPostEra(postedDate: string): EraKey {
  const year = Number(String(postedDate).slice(0, 4));
  if (year >= 2012 && year <= 2015) return '2012-2015';
  if (year >= 2016 && year <= 2020) return '2016-2020';
  return '2021-now';
}

export interface RedditPostItem {
  id: string;
  fullname: string;
  subreddit: string;
  title: string;
  author: string;
  selftext: string;
  ups: number;
  postedDate: string;
  permalink: string;
  imageUrl: string | null;
  recommendedTier: ChestTierId;
  unlockedAt?: number;
}

export interface QuizRoundItem {
  post: RedditPostItem;
  options: string[];
  correctOption: string;
}

export type DailyMissionId = 'open_chests' | 'collect_posts' | 'quiz_answers';

export interface DailyMissionItem {
  id: DailyMissionId;
  titleZh: string;
  titleEn: string;
  progress: number;
  target: number;
  rewardCoins: number;
  rewardKarma: number;
  claimed: boolean;
}
