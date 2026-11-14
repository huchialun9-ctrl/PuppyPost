/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Bookmark,
  Loader2,
  Search,
  X,
  Zap,
  Target,
  CheckCircle2,
  ArrowUpDown,
  Award,
  Layers,
  TrendingUp,
  Gift,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import {
  CHEST_TIERS,
  GAME_PROPS,
  MASTERY_SUBREDDITS,
  ERA_DEFINITIONS,
  getPostEra,
  ChestTierId,
  RedditPostItem,
  DailyMissionItem,
  DailyMissionId,
} from './data/chests';
import { KahootShape } from './components/KahootShape';
import { RedditPostModal } from './components/RedditPostModal';
import { RedditHub } from './components/RedditHub';
import { RedditQuizStage } from './components/RedditQuizStage';
import { CelebrationBurst } from './components/CelebrationBurst';
import { ServerMarquee } from './components/ServerMarquee';
import { DailySummaryModal } from './components/DailySummaryModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { useServerAnnouncements } from './hooks/useServerAnnouncements';
import { soundFX } from './utils/sound';

type NavTab = 'chests' | 'quiz' | 'vault' | 'reddit';
type VaultSortBy = 'ups' | 'subreddit' | 'date';

function createFreshDailyMissions(): DailyMissionItem[] {
  return [
    {
      id: 'open_chests',
      titleZh: '今日開箱 2 次',
      titleEn: 'Open 2 Chests',
      progress: 0,
      target: 2,
      rewardCoins: 100,
      rewardKarma: 120,
      claimed: false,
    },
    {
      id: 'collect_posts',
      titleZh: '今日收藏 3 篇文',
      titleEn: 'Collect 3 Posts',
      progress: 0,
      target: 3,
      rewardCoins: 150,
      rewardKarma: 180,
      claimed: false,
    },
    {
      id: 'quiz_answers',
      titleZh: '在看板完成 5 次問答',
      titleEn: 'Answer 5 Quiz',
      progress: 0,
      target: 5,
      rewardCoins: 200,
      rewardKarma: 250,
      claimed: false,
    },
  ];
}

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [activeTab, setActiveTab] = useState<NavTab>('chests');

  // Pure Single-Session "每日一玩 · 無長期存檔" In-Memory Run State
  const [coins, setCoins] = useState<number>(420);
  const [points, setPoints] = useState<number>(0);
  const [dailyStreak, setDailyStreak] = useState<number>(1);
  const [todayStarterClaimed, setTodayStarterClaimed] = useState<boolean>(false);
  const [dailyChestClaimed, setDailyChestClaimed] = useState<boolean>(false);
  const [luckMeter, setLuckMeter] = useState<number>(0);
  const [vaultPosts, setVaultPosts] = useState<RedditPostItem[]>([]);
  const [missions, setMissions] = useState<DailyMissionItem[]>(() =>
    createFreshDailyMissions()
  );

  const [coinBounce, setCoinBounce] = useState<boolean>(false);
  const [pointBounce, setPointBounce] = useState<boolean>(false);
  const [streakBounce, setStreakBounce] = useState<boolean>(false);
  const prevCoinsRef = useRef<number>(coins);
  const prevPointsRef = useRef<number>(points);
  const prevStreakRef = useRef<number>(dailyStreak);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [redditLive, setRedditLive] = useState<boolean>(true);
  const [celebrationId, setCelebrationId] = useState<number>(0);

  const [activePost, setActivePost] = useState<RedditPostItem | null>(null);
  const [rewardBadgeText, setRewardBadgeText] = useState<string | undefined>(undefined);
  const [openingTier, setOpeningTier] = useState<ChestTierId | null>(null);
  const [magicBurst, setMagicBurst] = useState<{
    id: number;
    tierId: ChestTierId;
    chestImg: string;
  } | null>(null);

  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Vault Filter, Sort & Era Group Mode
  const [vaultQuery, setVaultQuery] = useState<string>('');
  const [vaultSort, setVaultSort] = useState<VaultSortBy>('date');
  const [groupByEra, setGroupByEra] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const {
    announcements,
    wsConnected,
    playerName,
    setPlayerName,
    publishAnnouncement,
  } = useServerAnnouncements();

  const dailyClaimed = dailyChestClaimed;

  const triggerCelebration = useCallback(() => {
    setCelebrationId((n) => n + 1);
  }, []);

  // Ensure any legacy persistent save keys from earlier builds are cleared (zero long-term save points)
  useEffect(() => {
    try {
      localStorage.removeItem('puppypost_save_v3');
      localStorage.removeItem('puppypost_save_v4');
      localStorage.removeItem('puppypost_player_name_v1');
    } catch {
      // ignore storage restrictions
    }
  }, []);

  useEffect(() => {
    if (coins > prevCoinsRef.current) {
      setCoinBounce(true);
      const t = window.setTimeout(() => setCoinBounce(false), 380);
      prevCoinsRef.current = coins;
      return () => window.clearTimeout(t);
    }
    prevCoinsRef.current = coins;
  }, [coins]);

  useEffect(() => {
    if (points > prevPointsRef.current) {
      setPointBounce(true);
      const t = window.setTimeout(() => setPointBounce(false), 380);
      prevPointsRef.current = points;
      return () => window.clearTimeout(t);
    }
    prevPointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (dailyStreak > prevStreakRef.current) {
      setStreakBounce(true);
      const t = window.setTimeout(() => setStreakBounce(false), 420);
      prevStreakRef.current = dailyStreak;
      return () => window.clearTimeout(t);
    }
    prevStreakRef.current = dailyStreak;
  }, [dailyStreak]);

  // Reward Multiplier derived cleanly from Daily Streak (1.1x, 1.2x, 1.3x ...)
  const streakMultiplier = useMemo(
    () => Number((1 + Math.min(dailyStreak, 15) * 0.1).toFixed(1)),
    [dailyStreak]
  );

  const playerRank = useMemo(() => {
    if (points >= 3000) return lang === 'zh' ? 'Lv.5 傳奇考古王' : 'Lv.5 Reddit Legend';
    if (points >= 1500) return lang === 'zh' ? 'Lv.4 黃金策展師' : 'Lv.4 Gold Curator';
    if (points >= 600) return lang === 'zh' ? 'Lv.3 看板鑑賞家' : 'Lv.3 Sub Critic';
    if (points >= 200) return lang === 'zh' ? 'Lv.2 話題獵人' : 'Lv.2 Post Hunter';
    return lang === 'zh' ? 'Lv.1 見習挖掘者' : 'Lv.1 Rookie Dig';
  }, [points, lang]);

  const unlockedSubsCount = useMemo(() => {
    const owned = new Set(vaultPosts.map((p) => p.subreddit.toLowerCase()));
    return MASTERY_SUBREDDITS.filter((s) => owned.has(s.toLowerCase())).length;
  }, [vaultPosts]);

  const savedPostIds = useMemo(
    () => new Set(vaultPosts.map((p) => p.id)),
    [vaultPosts]
  );

  const showNotice = useCallback((msg: string) => {
    setStatusBanner(msg);
  }, []);

  useEffect(() => {
    fetch('/api/reddit/status')
      .then((r) => r.json())
      .then((s: { live?: boolean }) => setRedditLive(Boolean(s.live)))
      .catch(() => setRedditLive(false));
  }, []);

  const advanceMission = useCallback((id: DailyMissionId, delta = 1) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, progress: Math.min(m.target, m.progress + delta) } : m
      )
    );
  }, []);

  const checkEraMasterUnlock = useCallback(
    (previousPosts: RedditPostItem[], addedPost: RedditPostItem) => {
      const eraKey = getPostEra(addedPost.postedDate);
      const eraSpec = ERA_DEFINITIONS.find((e) => e.key === eraKey);
      if (!eraSpec) return;
      const beforeCount = previousPosts.filter(
        (p) => getPostEra(p.postedDate) === eraKey
      ).length;
      if (beforeCount < eraSpec.targetCount && beforeCount + 1 >= eraSpec.targetCount) {
        publishAnnouncement({
          actionType: 'era_master',
          messageZh: `${playerName} 達成「${eraSpec.labelZh}」Era Master 全套成就！`,
          messageEn: `${playerName} unlocked ${eraSpec.labelEn} Era Master!`,
        });
      }
    },
    [playerName, publishAnnouncement]
  );

  const handleClaimRunStarter = useCallback(() => {
    if (todayStarterClaimed) return;

    const nextStreak = dailyStreak + 1;
    const nextMult = Number((1 + Math.min(nextStreak, 15) * 0.1).toFixed(1));
    const coinGain = Math.round(120 * nextMult);

    soundFX.playRelicDiscovered('legendary');
    triggerCelebration();

    setTodayStarterClaimed(true);
    setDailyStreak(nextStreak);
    setCoins((prev) => prev + coinGain);
    setPoints((prev) => prev + 50);
    setLuckMeter((prev) => Math.min(100, prev + 25));

    publishAnnouncement({
      actionType: 'mission_claim',
      messageZh: `${playerName} 領取本局「今日開局禮」，啟動 ${nextMult.toFixed(1)}x 倍率與 +${coinGain} 代幣！`,
      messageEn: `${playerName} claimed the Daily Run Starter Gift (+${coinGain} Coins, ${nextMult.toFixed(1)}x)!`,
    });

    showNotice(
      lang === 'zh'
        ? `今日開局禮已領取：+${coinGain} 代幣 · +25% 幸運值 · 倍率升至 ${nextMult.toFixed(1)}x！`
        : `Starter Gift Claimed: +${coinGain} Coins · +25% Luck · Multiplier ${nextMult.toFixed(1)}x!`
    );
  }, [
    dailyStreak,
    lang,
    playerName,
    publishAnnouncement,
    showNotice,
    todayStarterClaimed,
    triggerCelebration,
  ]);

  const handleStartFreshRun = useCallback(() => {
    soundFX.playTap(580);
    setCoins(420);
    setPoints(0);
    setDailyStreak(1);
    setTodayStarterClaimed(false);
    setDailyChestClaimed(false);
    setLuckMeter(0);
    setVaultPosts([]);
    setMissions(createFreshDailyMissions());
    setActivePost(null);
    setRewardBadgeText(undefined);
    setShowSummaryModal(false);
    setActiveTab('chests');
    showNotice(
      lang === 'zh'
        ? '已開啟全新「每日一玩」單局！祝你今日開箱手氣爆棚！'
        : 'Started a fresh Daily Run! Good luck!'
    );
  }, [lang, showNotice]);

  const handleClaimMission = (missionId: DailyMissionId) => {
    const target = missions.find((m) => m.id === missionId);
    if (!target || target.claimed || target.progress < target.target) return;

    const nextStreak = dailyStreak + 1;
    const boostedMult = Number((1 + Math.min(nextStreak, 15) * 0.1).toFixed(1));
    soundFX.playRelicDiscovered('mystic');
    triggerCelebration();
    const coinReward = Math.round(target.rewardCoins * boostedMult);
    setDailyStreak(nextStreak);
    setCoins((prev) => prev + coinReward);
    setPoints((prev) => prev + target.rewardKarma);
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, claimed: true } : m))
    );
    publishAnnouncement({
      actionType: 'mission_claim',
      messageZh: `${playerName} 完成任務「${target.titleZh}」領取 +${coinReward} 代幣 (${boostedMult.toFixed(
        1
      )}x)！`,
      messageEn: `${playerName} claimed "${target.titleEn}" for +${coinReward} Coins (${boostedMult.toFixed(
        1
      )}x)!`,
    });
    showNotice(
      lang === 'zh'
        ? `完成任務「${target.titleZh}」：+${coinReward} 代幣 · 倍率升至 ${boostedMult.toFixed(
            1
          )}x · +${target.rewardKarma} Karma！`
        : `Mission Claimed: +${coinReward} Coins (${boostedMult.toFixed(1)}x) · +${
            target.rewardKarma
          } Karma!`
    );
  };

  const missionOverview = useMemo(() => {
    const completedCount = missions.filter((m) => m.progress >= m.target).length;
    const totalRatio =
      missions.reduce((acc, m) => acc + Math.min(1, m.progress / m.target), 0) /
      missions.length;
    return {
      completedCount,
      total: missions.length,
      pct: Math.round(totalRatio * 100),
    };
  }, [missions]);

  const handleOpenChest = async (tierId: ChestTierId) => {
    if (openingTier) return;
    const tierConfig = CHEST_TIERS.find((t) => t.id === tierId)!;

    if (tierId === 'daily' && dailyClaimed) {
      showNotice(
        lang === 'zh'
          ? '本局免費補給箱已開啟，快玩「競猜賺幣」與高階寶箱或點上方重開一局！'
          : 'Daily Chest claimed this run! Play Quiz or start a fresh run.'
      );
      return;
    }

    if (coins < tierConfig.costCoins) {
      showNotice(
        lang === 'zh'
          ? `代幣不足（需要 ${tierConfig.costCoins}）！請先遊玩「競猜賺幣」贏取代幣。`
          : `Need ${tierConfig.costCoins} Coins! Play Quiz to earn more.`
      );
      return;
    }

    setOpeningTier(tierId);
    soundFX.playDigging();

    try {
      const sub =
        tierConfig.subredditPool[
          Math.floor(Math.random() * tierConfig.subredditPool.length)
        ];
      const params = new URLSearchParams({
        subreddit: sub,
        sort: tierConfig.redditSort,
        t: tierConfig.redditTime,
        limit: '25',
      });
      if (tierConfig.eraWindow?.after) params.set('after', tierConfig.eraWindow.after);
      if (tierConfig.eraWindow?.before) params.set('before', tierConfig.eraWindow.before);

      const resp = await fetch(`/api/reddit/search?${params.toString()}`);
      const json = (await resp.json()) as {
        posts?: RedditPostItem[];
        error?: string;
      };

      if (!resp.ok || !json.posts || json.posts.length === 0) {
        throw new Error(json.error || 'Reddit API returned no posts.');
      }

      const withImages = json.posts.filter((p) => Boolean(p.imageUrl));
      const candidates = withImages.length > 0 ? withImages : json.posts;
      const unseen = candidates.filter((p) => !vaultPosts.some((v) => v.id === p.id));
      const pool = unseen.length > 0 ? unseen : candidates;

      const isPityTriggered = luckMeter >= 100;
      const sortedByUps = [...pool].sort((a, b) => b.ups - a.ups);
      const rawPicked = isPityTriggered
        ? sortedByUps[Math.floor(Math.random() * Math.min(3, sortedByUps.length))]
        : pool[Math.floor(Math.random() * pool.length)];

      const stampedPost: RedditPostItem = {
        ...rawPicked,
        unlockedAt: Date.now(),
      };

      const coinReturn = Math.round(tierConfig.baseCoinReward * streakMultiplier);
      const karmaEarned = isPityTriggered
        ? Math.round(tierConfig.rewardPoints * 1.5)
        : tierConfig.rewardPoints;

      setCoins((prev) => prev - tierConfig.costCoins + coinReturn);
      setPoints((prev) => prev + karmaEarned);
      setLuckMeter((prev) =>
        isPityTriggered ? 0 : Math.min(100, prev + tierConfig.luckGain)
      );

      if (tierId === 'daily') {
        setDailyChestClaimed(true);
        setDailyStreak((prev) => prev + 1);
      }

      const isNewPost = !vaultPosts.some((v) => v.id === stampedPost.id);
      if (isNewPost) {
        checkEraMasterUnlock(vaultPosts, stampedPost);
        setVaultPosts((prev) => [stampedPost, ...prev]);
        advanceMission('collect_posts', 1);
      }
      advanceMission('open_chests', 1);

      soundFX.playRelicDiscovered(tierId);
      triggerCelebration();

      const burstId = Date.now();
      setMagicBurst({ id: burstId, tierId, chestImg: tierConfig.imageUrl });
      window.setTimeout(() => {
        setMagicBurst((curr) => (curr?.id === burstId ? null : curr));
      }, 1050);

      // Ceremonial pause while magic shards and flash erupt before revealing post card
      await new Promise((resolve) => window.setTimeout(resolve, 420));

      const shortTitle =
        stampedPost.title.length > 26
          ? `${stampedPost.title.slice(0, 26)}...`
          : stampedPost.title;
      publishAnnouncement({
        actionType: 'chest_open',
        messageZh: `${playerName} 開啟「${tierConfig.nameZh}」，從 ${stampedPost.subreddit} 挖出「${shortTitle}」(+${coinReturn} 代幣)`,
        messageEn: `${playerName} opened ${tierConfig.nameEn}, dug "${shortTitle}" from ${stampedPost.subreddit} (+${coinReturn}c)`,
      });

      const coinSummary =
        tierConfig.costCoins === 0
          ? `+${coinReturn} 代幣 (${streakMultiplier.toFixed(1)}x 加成)`
          : `返還 +${coinReturn} 代幣 (${streakMultiplier.toFixed(1)}x 加成)`;

      const badge = isPityTriggered
        ? lang === 'zh'
          ? `幸運保底觸發 · ${stampedPost.subreddit} (${stampedPost.postedDate.slice(
              0,
              4
            )}) · ${coinSummary} · +${karmaEarned} Karma`
          : `Luck Jackpot · ${stampedPost.subreddit} · +${coinReturn} Coins (${streakMultiplier.toFixed(
              1
            )}x) · +${karmaEarned} Karma`
        : lang === 'zh'
        ? `挖掘發現 ${stampedPost.subreddit} (${stampedPost.postedDate.slice(
            0,
            4
          )}) · ${coinSummary} · +${karmaEarned} Karma`
        : `Discovered ${stampedPost.subreddit} · +${coinReturn} Coins (${streakMultiplier.toFixed(
            1
          )}x) · +${karmaEarned} Karma`;

      setRewardBadgeText(badge);
      setActivePost(stampedPost);
      showNotice(badge);
    } catch (err: any) {
      showNotice(err?.message || 'Unable to fetch live Reddit post right now.');
    } finally {
      setOpeningTier(null);
    }
  };

  const handleEarnQuizRewards = useCallback(
    (
      earnedCoins: number,
      earnedKarma: number,
      meta?: { subreddit: string; combo: number }
    ) => {
      const boostedCoins = Math.round(earnedCoins * streakMultiplier);
      setCoins((prev) => prev + boostedCoins);
      setPoints((prev) => prev + earnedKarma);
      if (meta) {
        publishAnnouncement({
          actionType: 'quiz_answer',
          messageZh: `${playerName} 猜對「${meta.subreddit}」(${meta.combo}x 連擊) 賺取 +${boostedCoins} 代幣！`,
          messageEn: `${playerName} guessed ${meta.subreddit} (${meta.combo}x combo) for +${boostedCoins} Coins!`,
        });
      }
    },
    [playerName, publishAnnouncement, streakMultiplier]
  );

  const handleQuizMatchComplete = useCallback(
    (summary: {
      correctCount: number;
      totalRounds: number;
      bestCombo: number;
      sessionCoins: number;
    }) => {
      const boostedTotal = Math.round(summary.sessionCoins * streakMultiplier);
      publishAnnouncement({
        actionType: 'quiz_win',
        messageZh: `${playerName} 完成看板搶答挑戰（答對 ${summary.correctCount}/${summary.totalRounds} 題，累計 +${boostedTotal} 代幣）`,
        messageEn: `${playerName} finished Subreddit Quiz (${summary.correctCount}/${summary.totalRounds} right, +${boostedTotal}c)`,
      });
    },
    [playerName, publishAnnouncement, streakMultiplier]
  );

  const handleSavePostToVault = useCallback(
    (post: RedditPostItem) => {
      soundFX.playRelicDiscovered('bronze');
      const stamped: RedditPostItem = { ...post, unlockedAt: post.unlockedAt || Date.now() };
      let added = false;
      setVaultPosts((prev) => {
        if (prev.some((p) => p.id === stamped.id)) return prev;
        added = true;
        checkEraMasterUnlock(prev, stamped);
        advanceMission('collect_posts', 1);
        return [stamped, ...prev];
      });
      if (added) {
        const shortTitle =
          stamped.title.length > 26
            ? `${stamped.title.slice(0, 26)}...`
            : stamped.title;
        publishAnnouncement({
          actionType: 'vault_collect',
          messageZh: `${playerName} 收藏了 ${stamped.subreddit} 貼文「${shortTitle}」`,
          messageEn: `${playerName} collected "${shortTitle}" from ${stamped.subreddit}`,
        });
      }
      showNotice(
        lang === 'zh' ? '已收藏至戰利品庫（+1 每日收藏進度）！' : 'Collected to Vault!'
      );
    },
    [advanceMission, checkEraMasterUnlock, lang, playerName, publishAnnouncement, showNotice]
  );

  const sortedFilteredVault = useMemo(() => {
    const q = vaultQuery.trim().toLowerCase();
    const filtered = !q
      ? vaultPosts
      : vaultPosts.filter(
          (p) =>
            p.subreddit.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.author.toLowerCase().includes(q)
        );

    return [...filtered].sort((a, b) => {
      if (vaultSort === 'ups') {
        return b.ups - a.ups;
      }
      if (vaultSort === 'subreddit') {
        const cmp = a.subreddit.localeCompare(b.subreddit);
        return cmp !== 0 ? cmp : b.ups - a.ups;
      }
      const aTime = a.unlockedAt ?? new Date(a.postedDate).getTime();
      const bTime = b.unlockedAt ?? new Date(b.postedDate).getTime();
      return bTime - aTime;
    });
  }, [vaultPosts, vaultQuery, vaultSort]);

  const eraGroupedVault = useMemo(() => {
    return ERA_DEFINITIONS.map((era) => {
      const postsInEra = sortedFilteredVault.filter(
        (p) => getPostEra(p.postedDate) === era.key
      );
      const totalUnlockedInEra = vaultPosts.filter(
        (p) => getPostEra(p.postedDate) === era.key
      ).length;
      return {
        ...era,
        posts: postsInEra,
        totalUnlockedInEra,
        isEraMaster: totalUnlockedInEra >= era.targetCount,
      };
    });
  }, [sortedFilteredVault, vaultPosts]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#46178F] text-white flex flex-col relative">
      <CelebrationBurst triggerId={celebrationId} />

      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-[#3D137D]" />
        <div className="absolute top-1/3 -right-24 w-72 h-72 rotate-45 rounded-3xl bg-[#3D137D]" />
        <div className="absolute -bottom-28 left-1/4 w-96 h-96 rounded-full bg-[#3D137D]" />
      </div>

      {/* COMPACT 3-ZONE WHITE TOP BAR */}
      <header className="relative z-30 shrink-0 bg-white shadow-[0_4px_0_rgba(0,0,0,0.14)] px-4 md:px-8 h-14 flex items-center">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('chests');
                setActivePost(null);
              }}
              className="text-xl md:text-2xl font-black tracking-tight text-[#46178F] font-display whitespace-nowrap"
            >
              PuppyPost
            </a>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold text-[#26890C]">
              <span
                className={`w-2 h-2 rounded-full ${
                  redditLive ? 'bg-[#26890C]' : 'bg-[#D89E00]'
                }`}
              />
              {redditLive
                ? lang === 'zh'
                  ? 'Reddit 全站即時連線'
                  : 'Reddit Live'
                : lang === 'zh'
                ? '重連中'
                : 'Reconnecting'}
            </span>
          </div>

          <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm md:text-base font-black text-[#666666] overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                soundFX.playTap(500);
                setActiveTab('chests');
              }}
              className={`py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'chests'
                  ? 'text-[#46178F] shadow-[inset_0_-3px_0_#46178F]'
                  : 'hover:text-[#222222]'
              }`}
            >
              {lang === 'zh' ? '寶箱開箱' : 'Chests'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playTap(530);
                setActiveTab('quiz');
              }}
              className={`py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'quiz'
                  ? 'text-[#46178F] shadow-[inset_0_-3px_0_#46178F]'
                  : 'hover:text-[#222222]'
              }`}
            >
              {lang === 'zh' ? '競猜賺幣' : 'Quiz'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playTap(560);
                setActiveTab('vault');
              }}
              className={`py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'vault'
                  ? 'text-[#46178F] shadow-[inset_0_-3px_0_#46178F]'
                  : 'hover:text-[#222222]'
              }`}
            >
              {lang === 'zh'
                ? `戰利品 (${vaultPosts.length})`
                : `Vault (${vaultPosts.length})`}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playTap(590);
                setActiveTab('reddit');
              }}
              className={`py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'reddit'
                  ? 'text-[#46178F] shadow-[inset_0_-3px_0_#46178F]'
                  : 'hover:text-[#222222]'
              }`}
            >
              {lang === 'zh' ? '尋寶雷達' : 'Radar'}
            </button>
          </nav>

          <button
            type="button"
            onClick={() => {
              soundFX.playTap(560);
              setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
            }}
            className="min-h-[36px] px-3.5 py-1 rounded-xl bg-[#26890C] hover:bg-[#2C9C0F] text-xs sm:text-sm font-black text-white shadow-[0_3px_0_#195E07] active:translate-y-[2px] transition-all whitespace-nowrap shrink-0"
          >
            {lang === 'zh' ? '中 / EN' : 'EN / 中文'}
          </button>
        </div>
      </header>

      {/* FRONT-FACING SINGLE-VIEWPORT STAGE */}
      <main className="relative z-10 flex-1 min-h-0 max-w-6xl w-full mx-auto px-4 md:px-8 py-2.5 lg:py-3 flex flex-col gap-2.5">
        {/* LIVE SERVER SHARED ANNOUNCEMENT MARQUEE */}
        <ServerMarquee
          lang={lang}
          announcements={announcements}
          wsConnected={wsConnected}
          playerName={playerName}
          onChangePlayerName={setPlayerName}
        />

        {/* ROW 1: PLAYER HEADER + HUD WITH STREAK REWARD MULTIPLIER INDICATOR */}
        <section className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {activeTab === 'chests'
                ? lang === 'zh'
                  ? '全站考古寶箱大廳'
                  : 'Reddit Treasure Stage'
                : activeTab === 'quiz'
                ? lang === 'zh'
                  ? 'Reddit 看板搶答'
                  : 'Subreddit Quiz'
                : activeTab === 'vault'
                ? lang === 'zh'
                  ? '戰利品收藏庫'
                  : 'Post Vault'
                : lang === 'zh'
                ? '全站看板尋寶雷達'
                : 'Reddit Radar'}
            </h1>
            <span className="text-xs md:text-sm font-extrabold text-white/85">
              {playerRank}
            </span>
          </div>

          <div className="bg-white text-[#222222] rounded-2xl px-4 py-1.5 shadow-[0_4px_0_rgba(0,0,0,0.18)] flex flex-wrap items-center gap-3.5 sm:gap-5">
            <div className="flex items-center gap-1.5">
              <img
                src={GAME_PROPS.coinIcon}
                alt="Coins"
                className={`w-6 h-6 object-contain mix-blend-multiply ${
                  coinBounce ? 'animate-hud-bounce' : ''
                }`}
              />
              <span
                className={`text-sm sm:text-base md:text-lg font-black font-mono-num text-[#B58200] ${
                  coinBounce ? 'animate-hud-bounce' : ''
                }`}
              >
                {coins.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <img
                src={GAME_PROPS.trophyIcon}
                alt="Karma"
                className={`w-6 h-6 object-contain mix-blend-multiply ${
                  pointBounce ? 'animate-hud-bounce' : ''
                }`}
              />
              <span
                className={`text-sm sm:text-base md:text-lg font-black font-mono-num text-[#46178F] ${
                  pointBounce ? 'animate-hud-bounce' : ''
                }`}
              >
                {points.toLocaleString()}
              </span>
            </div>

            {/* Run Combo + Visual Reward Multiplier Indicator (Opens Run Summary) */}
            <button
              type="button"
              onClick={() => {
                soundFX.playTap(560);
                setShowSummaryModal(true);
              }}
              title={
                lang === 'zh'
                  ? '查看本局連勝倍率與結算成績'
                  : 'View Run Multiplier & Daily Summary'
              }
              className="flex items-center gap-2 rounded-xl px-1.5 py-0.5 hover:bg-[#F3F1F8] transition-colors"
            >
              <img
                src={GAME_PROPS.streakIcon}
                alt="Combo"
                className={`w-6 h-6 object-contain mix-blend-multiply ${
                  streakBounce ? 'animate-hud-bounce' : ''
                }`}
              />
              <span
                className={`text-sm sm:text-base font-black font-mono-num text-[#222222] ${
                  streakBounce ? 'animate-hud-bounce' : ''
                }`}
              >
                {dailyStreak}
                {lang === 'zh' ? '連段' : 'x'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg bg-[#E8F7E4] text-[#195E07] text-xs font-black font-mono-num flex items-center gap-1 ${
                  streakBounce ? 'animate-hud-bounce' : ''
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#26890C]" />
                <span>{streakMultiplier.toFixed(1)}x</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playTap(560);
                setShowSummaryModal(true);
              }}
              title={lang === 'zh' ? '本局結算 / 重新開局' : 'Run Summary / Reset'}
              className="h-7 px-2.5 rounded-lg bg-[#FFF5D6] hover:bg-[#FFEBB3] text-[#8F6500] text-xs font-black flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {lang === 'zh' ? '結算/新局' : 'Summary'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playTap(580);
                setShowHowToPlay(true);
              }}
              aria-label={lang === 'zh' ? '玩法說明' : 'How to play'}
              title={lang === 'zh' ? '玩法說明' : 'How to play'}
              className="h-7 px-2 rounded-lg bg-[#EFEAF8] hover:bg-[#E2DAF5] text-[#46178F] text-xs font-black flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'zh' ? '玩法' : 'Guide'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                soundFX.enabled = next;
                setSoundEnabled(next);
                if (next) soundFX.playTap(600);
              }}
              aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              className="w-7 h-7 rounded-lg bg-[#F3F1F8] hover:bg-[#E7E2F3] flex items-center justify-center transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#26890C]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#E21B3C]" />
              )}
            </button>
          </div>
        </section>

        {/* ROW 2: INSTANT RUN STARTER GIFT + DAILY PROGRESS BAR & QUESTS (ZERO LONG-TERM SAVE) */}
        <section className="shrink-0 bg-white text-[#222222] rounded-2xl px-4 py-2 shadow-[0_5px_0_rgba(0,0,0,0.16)] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-3 min-w-[230px]">
            <button
              type="button"
              disabled={todayStarterClaimed}
              onClick={handleClaimRunStarter}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shrink-0 ${
                todayStarterClaimed
                  ? 'bg-[#E8F7E4] text-[#195E07] cursor-default'
                  : 'bg-[#D89E00] hover:bg-[#E5AA00] text-white shadow-[0_3px_0_#9E7300] active:translate-y-[2px]'
              }`}
            >
              <Gift className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">
                {todayStarterClaimed
                  ? lang === 'zh'
                    ? '本局開局禮已領'
                    : 'Starter Boost Active'
                  : lang === 'zh'
                  ? '領取今日開局禮 (+120幣)'
                  : 'Claim Starter Boost'}
              </span>
            </button>

            <div className="flex-1 min-w-[160px] lg:w-48">
              <div className="flex items-center justify-between text-xs font-black mb-1">
                <span className="text-[#46178F] flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {lang === 'zh'
                      ? `每日進度條 (${missionOverview.completedCount}/${missionOverview.total})`
                      : `Daily Progress (${missionOverview.completedCount}/${missionOverview.total})`}
                  </span>
                </span>
                <span className="font-mono-num text-[#26890C]">{missionOverview.pct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#EFEAF8] overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[#46178F] via-[#1368CE] to-[#26890C] transition-all duration-500"
                  style={{ width: `${missionOverview.pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {missions.map((m) => {
              const ready = m.progress >= m.target && !m.claimed;
              const boostedReward = Math.round(m.rewardCoins * streakMultiplier);
              const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
              return (
                <div
                  key={m.id}
                  className={`px-3 py-1 rounded-xl flex flex-col gap-1 text-xs font-black transition-all min-w-[136px] ${
                    m.claimed
                      ? 'bg-[#E8F7E4] text-[#195E07]'
                      : ready
                      ? 'bg-[#FFF5D6] text-[#8F6500]'
                      : 'bg-[#F3F1F8] text-[#333333]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{lang === 'zh' ? m.titleZh : m.titleEn}</span>
                    <span className="font-mono-num opacity-80">
                      {m.progress}/{m.target}
                    </span>
                    {ready && (
                      <button
                        type="button"
                        onClick={() => handleClaimMission(m.id)}
                        className="px-2 py-0.5 rounded-lg bg-[#26890C] hover:bg-[#2C9C0F] text-white font-black shadow-[0_2px_0_#195E07] active:translate-y-[1px]"
                      >
                        {lang === 'zh' ? `領 +${boostedReward}` : `Claim +${boostedReward}`}
                      </button>
                    )}
                    {m.claimed && <CheckCircle2 className="w-3.5 h-3.5 text-[#26890C]" />}
                  </div>
                  <div className="w-full h-1 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        m.claimed ? 'bg-[#26890C]' : ready ? 'bg-[#D89E00]' : 'bg-[#46178F]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {statusBanner && (
          <div className="shrink-0 bg-[#E8F7E4] text-[#195E07] rounded-xl px-4 py-1.5 flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-black truncate">{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs font-black text-[#195E07]/75 hover:text-[#195E07] shrink-0"
            >
              {lang === 'zh' ? '關閉' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* TAB 1: FRONT-FACING 4-COLUMN STYLIZED CHEST STAGE */}
        {activeTab === 'chests' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-3">
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3.5 xl:gap-4 items-center">
                {CHEST_TIERS.map((chest) => {
                  const isOpening = openingTier === chest.id;
                  const isDailyUsed = chest.id === 'daily' && dailyClaimed;
                  const projectedCoins = Math.round(chest.baseCoinReward * streakMultiplier);

                  return (
                    <motion.div
                      key={chest.id}
                      whileHover={{ y: -5, scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                      className={`w-full max-w-[270px] mx-auto aspect-square ${chest.cardBg} ${chest.cardShadow} text-white rounded-3xl p-3 xl:p-4 flex flex-col items-center justify-between ${
                        isOpening ? 'animate-chest-shake' : ''
                      }`}
                    >
                      <div className="shrink-0 w-full flex items-center justify-between">
                        <span className="text-[11px] font-mono-num font-black text-white/90 tracking-tight">
                          {lang === 'zh' ? chest.tierLabelZh : chest.tierLabelEn}
                        </span>
                        <KahootShape shape={chest.shape} className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1 px-2">
                        <img
                          src={chest.imageUrl}
                          alt={lang === 'zh' ? chest.nameZh : chest.nameEn}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full w-auto h-auto object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.38)] transition-transform duration-300 hover:scale-105"
                        />
                      </div>

                      <div className="shrink-0 w-full text-center mb-1.5">
                        <h2 className="text-base xl:text-lg font-black text-white leading-tight drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                          {lang === 'zh' ? chest.nameZh : chest.nameEn}
                        </h2>
                        <p className="text-[11px] font-extrabold text-white/90 truncate mt-0.5">
                          {lang === 'zh' ? chest.poolHintZh : chest.poolHintEn}
                        </p>
                        <p className="text-[10px] font-bold text-white/85 font-mono-num truncate">
                          +{chest.luckGain}% {lang === 'zh' ? '幸運' : 'Luck'} · +{chest.rewardPoints}K · +{projectedCoins}
                          {lang === 'zh' ? '幣' : 'c'}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(openingTier) || isDailyUsed}
                        onClick={() => handleOpenChest(chest.id)}
                        className={`shrink-0 w-full min-h-[38px] xl:min-h-[42px] px-3 py-1.5 rounded-2xl font-black text-xs xl:text-sm flex items-center justify-center gap-1.5 transition-all ${
                          isDailyUsed
                            ? 'bg-black/25 text-white/75 cursor-not-allowed'
                            : luckMeter >= 100 && chest.id !== 'daily'
                            ? 'bg-[#FFF5D6] hover:bg-white text-[#8F6500] shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[2px]'
                            : `bg-white hover:bg-white/95 ${chest.cardButtonText} shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[2px]`
                        }`}
                      >
                        {isOpening ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <KahootShape shape={chest.shape} className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="whitespace-nowrap">
                          {isOpening
                            ? lang === 'zh'
                              ? '挖掘中...'
                              : 'Digging...'
                            : chest.id === 'daily'
                            ? isDailyUsed
                              ? lang === 'zh'
                                ? '本局免費箱已開'
                                : 'Claimed'
                              : lang === 'zh'
                              ? `免費開箱 (+${projectedCoins} 幣)`
                              : `Free Open (+${projectedCoins}c)`
                            : luckMeter >= 100
                            ? lang === 'zh'
                              ? `必出神貼 · ${chest.costCoins} 幣`
                              : `Jackpot · ${chest.costCoins}c`
                            : lang === 'zh'
                            ? `${chest.costCoins} 代幣開啟`
                            : `${chest.costCoins} Coins`}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Progression Strip + Clear Smart Gameplay Guide */}
            <div className="shrink-0 bg-white text-[#222222] rounded-2xl px-4 py-2.5 shadow-[0_5px_0_rgba(0,0,0,0.18)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[200px] flex items-center gap-3">
                <Zap className="w-4 h-4 text-[#D89E00] shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs font-black mb-1">
                    <span className="text-[#46178F]">
                      {luckMeter >= 100
                        ? lang === 'zh'
                          ? '幸運保底已滿：下次開箱必出超高讚神貼！'
                          : 'Luck Full: Viral Post Guaranteed Next!'
                        : lang === 'zh'
                        ? '保底幸運值（滿 100% 必出高讚神貼）'
                        : 'Luck Meter (100% = Guaranteed Viral)'}
                    </span>
                    <span className="font-mono-num text-[#B58200]">{luckMeter}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#EFEAF8] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        luckMeter >= 100 ? 'bg-[#26890C]' : 'bg-[#D89E00]'
                      }`}
                      style={{ width: `${luckMeter}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs font-black text-[#444444] hidden xl:block">
                {!todayStarterClaimed
                  ? lang === 'zh'
                    ? '每日一玩無存檔 · 先點上方「領取今日開局禮」加速！'
                    : 'Zero-Save Daily Run · Claim Starter Boost above!'
                  : coins < 80
                  ? lang === 'zh'
                    ? '提示：代幣不夠？點右側玩競猜快速賺代幣！'
                    : 'Tip: Low on coins? Play Quiz to earn fast!'
                  : lang === 'zh'
                  ? `全站看板圖鑑：${unlockedSubsCount} / ${MASTERY_SUBREDDITS.length}`
                  : `Communities: ${unlockedSubsCount} / ${MASTERY_SUBREDDITS.length}`}
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.playTap(560);
                  setActiveTab('quiz');
                }}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#1368CE] hover:bg-[#1974E0] text-white text-xs sm:text-sm font-black shadow-[0_3px_0_#0D4994] active:translate-y-[2px] transition-all whitespace-nowrap"
              >
                {lang === 'zh' ? '玩競猜賺代幣 →' : 'Play Quiz for Coins →'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE REDDIT KAHOOT QUIZ GAME */}
        {activeTab === 'quiz' && (
          <RedditQuizStage
            lang={lang}
            onEarnRewards={handleEarnQuizRewards}
            onMatchComplete={handleQuizMatchComplete}
            onQuizAnswerSubmitted={() => advanceMission('quiz_answers', 1)}
            onSavePost={handleSavePostToVault}
            onCelebrate={triggerCelebration}
            onBackToChests={() => setActiveTab('chests')}
          />
        )}

        {/* TAB 3: SORTABLE + ERA-GROUPED VAULT COLLECTION */}
        {activeTab === 'vault' && (
          <div className="flex-1 min-h-0 bg-white rounded-3xl p-4 md:p-5 text-[#222222] shadow-[0_8px_0_rgba(0,0,0,0.2)] flex flex-col gap-3.5">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#46178F]" />
                <span className="text-lg font-black">
                  {lang === 'zh'
                    ? `戰利品收藏庫 (${vaultPosts.length})`
                    : `Post Vault (${vaultPosts.length})`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                {/* Era Grouping Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playTap(540);
                    setGroupByEra((v) => !v);
                  }}
                  className={`min-h-[36px] px-3.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    groupByEra
                      ? 'bg-[#26890C] text-white shadow-[0_3px_0_#195E07]'
                      : 'bg-[#F3F1F8] hover:bg-[#E7E2F3] text-[#46178F]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '依年代分組' : 'Group by Era'}</span>
                </button>

                {/* Sort Segmented Controls */}
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F3F1F8]">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#666666] ml-1.5 mr-0.5 shrink-0" />
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTap(520);
                      setVaultSort('ups');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                      vaultSort === 'ups'
                        ? 'bg-[#46178F] text-white shadow-[0_2px_0_#2D0E5E]'
                        : 'text-[#555555] hover:text-[#222222]'
                    }`}
                  >
                    {lang === 'zh' ? 'Upvotes 數量' : 'Upvotes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTap(540);
                      setVaultSort('subreddit');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                      vaultSort === 'subreddit'
                        ? 'bg-[#46178F] text-white shadow-[0_2px_0_#2D0E5E]'
                        : 'text-[#555555] hover:text-[#222222]'
                    }`}
                  >
                    {lang === 'zh' ? '看板名稱' : 'Subreddit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTap(560);
                      setVaultSort('date');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                      vaultSort === 'date'
                        ? 'bg-[#46178F] text-white shadow-[0_2px_0_#2D0E5E]'
                        : 'text-[#555555] hover:text-[#222222]'
                    }`}
                  >
                    {lang === 'zh' ? '挖掘日期' : 'Dig Date'}
                  </button>
                </div>

                <div className="relative flex-1 sm:w-48 sm:flex-none">
                  <Search className="w-4 h-4 text-[#7A758A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={vaultQuery}
                    onChange={(e) => setVaultQuery(e.target.value)}
                    placeholder={lang === 'zh' ? '篩選看板或標題...' : 'Filter posts...'}
                    className="w-full min-h-[36px] pl-9 pr-7 py-1 rounded-xl bg-[#F3F1F8] focus:bg-[#ECE8F5] focus:outline-none text-xs font-semibold text-[#222222]"
                  />
                  {vaultQuery && (
                    <button
                      type="button"
                      onClick={() => setVaultQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#222222] p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {sortedFilteredVault.length === 0 ? (
                <div className="h-full flex items-center justify-center bg-[#F5F3FA] rounded-2xl p-8 text-center">
                  <p className="text-base font-bold text-[#666666]">
                    {vaultPosts.length === 0
                      ? lang === 'zh'
                        ? '尚未收集貼文，快去開寶箱、玩競猜或用尋寶雷達挖寶吧！'
                        : 'No posts yet. Open a chest, play Quiz, or dig in Radar!'
                      : lang === 'zh'
                      ? '找不到符合的文章。'
                      : 'No matching posts.'}
                  </p>
                </div>
              ) : groupByEra ? (
                <div className="space-y-4">
                  {eraGroupedVault.map((era) => {
                    const isMaster = era.totalUnlockedInEra >= era.targetCount;
                    const eraPct = Math.min(
                      100,
                      Math.round((era.totalUnlockedInEra / era.targetCount) * 100)
                    );
                    const remaining = Math.max(0, era.targetCount - era.totalUnlockedInEra);

                    return (
                    <div
                      key={era.key}
                      className={`rounded-2xl p-4 space-y-3 transition-all ${
                        isMaster ? 'bg-[#FFFDF5] shadow-[0_3px_0_#E6D396]' : 'bg-[#F5F3FA]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex-1 min-w-[210px] space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-base font-black text-[#46178F]">
                              {lang === 'zh' ? era.labelZh : era.labelEn}
                            </h3>
                            <span
                              className={`text-xs font-mono-num font-black ${
                                isMaster ? 'text-[#26890C]' : 'text-[#666666]'
                              }`}
                            >
                              {era.totalUnlockedInEra} / {era.targetCount}{' '}
                              {lang === 'zh' ? '篇全套' : 'Set'}
                            </span>
                            {!isMaster && (
                              <span className="text-[11px] font-extrabold text-[#46178F]/80">
                                {lang === 'zh'
                                  ? `還差 ${remaining} 篇達成全套`
                                  : `${remaining} more to complete set`}
                              </span>
                            )}
                          </div>
                          <div className="w-full max-w-xs h-2 rounded-full bg-black/10 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isMaster
                                  ? 'bg-gradient-to-r from-[#D89E00] to-[#26890C]'
                                  : 'bg-[#46178F]'
                              }`}
                              style={{ width: `${eraPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isMaster ? (
                            <motion.div
                              initial={{ scale: 0.85, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#FFF5D6] text-[#8F6500] text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#E6D396]"
                            >
                              <Award className="w-4 h-4 text-[#D89E00]" />
                              <span>Era Master</span>
                            </motion.div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.playTap(560);
                                setActiveTab('chests');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#46178F] hover:bg-[#531FA5] text-white text-xs font-black shadow-[0_2px_0_#2D0E5E] transition-all"
                            >
                              {lang === 'zh' ? '去開此年代寶箱 →' : 'Open Era Chest →'}
                            </button>
                          )}
                        </div>
                      </div>

                      {era.posts.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white/80 text-xs font-bold text-[#666666]">
                          {lang === 'zh'
                            ? '此年代尚無收藏，可開啟對應年代寶箱或到尋寶雷達探索！'
                            : 'No posts in this era yet. Open its matching chest or use Radar!'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {era.posts.map((post) => {
                            const digDateStr = post.unlockedAt
                              ? new Date(post.unlockedAt).toISOString().slice(0, 10)
                              : post.postedDate;
                            return (
                              <button
                                key={post.id}
                                type="button"
                                onClick={() => {
                                  soundFX.playTap(520);
                                  setRewardBadgeText(undefined);
                                  setActivePost(post);
                                }}
                                className="text-left p-3 rounded-2xl bg-white hover:bg-[#FAF9FD] transition-all flex items-center gap-3 shadow-[0_3px_0_#DFDAF0]"
                              >
                                {post.imageUrl && (
                                  <img
                                    src={post.imageUrl}
                                    alt={post.title}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 rounded-xl object-cover shrink-0 bg-[#F3F1F8]"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-mono-num font-bold text-[#666666] truncate">
                                    <span className="text-[#46178F] font-black">
                                      {post.subreddit}
                                    </span>{' '}
                                    · ▲ {post.ups.toLocaleString()} · {post.postedDate.slice(0, 4)}
                                  </div>
                                  <div className="text-sm font-black text-[#222222] line-clamp-2 mt-0.5 leading-snug">
                                    {post.title}
                                  </div>
                                  <div className="text-[10px] font-mono-num text-[#888888] mt-0.5">
                                    {lang === 'zh' ? '挖掘：' : 'Dug: '}
                                    {digDateStr}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedFilteredVault.map((post) => {
                    const digDateStr = post.unlockedAt
                      ? new Date(post.unlockedAt).toISOString().slice(0, 10)
                      : post.postedDate;
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => {
                          soundFX.playTap(520);
                          setRewardBadgeText(undefined);
                          setActivePost(post);
                        }}
                        className="text-left p-3.5 rounded-2xl bg-[#F5F3FA] hover:bg-[#ECE8F5] transition-all flex items-center gap-3 shadow-[0_3px_0_#DFDAF0]"
                      >
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono-num font-bold text-[#666666] truncate">
                            <span className="text-[#46178F] font-black">{post.subreddit}</span> · ▲{' '}
                            {post.ups.toLocaleString()} · {post.postedDate.slice(0, 4)}
                          </div>
                          <div className="text-sm font-black text-[#222222] line-clamp-2 mt-0.5 leading-snug">
                            {post.title}
                          </div>
                          <div className="text-[10px] font-mono-num text-[#888888] mt-0.5">
                            {lang === 'zh' ? '挖掘：' : 'Dug: '}
                            {digDateStr}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ALL-REDDIT LIVE SUBREDDIT RADAR */}
        {activeTab === 'reddit' && (
          <RedditHub
            lang={lang}
            savedPostIds={savedPostIds}
            onSavePostToVault={handleSavePostToVault}
          />
        )}
      </main>

      {/* MAGIC ERUPTION FRAMER MOTION OVERLAY (handleOpenChest Ritual Burst) */}
      <AnimatePresence>
        {magicBurst && (
          <motion.div
            key={magicBurst.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          >
            {/* Background Flash Effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.92, 0.35, 0] }}
              transition={{ duration: 0.95, times: [0, 0.14, 0.45, 1], ease: 'easeOut' }}
              className={`absolute inset-0 ${
                magicBurst.tierId === 'legendary'
                  ? 'bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.95)_0%,rgba(139,92,246,0.55)_45%,rgba(70,23,143,0)_80%)]'
                  : magicBurst.tierId === 'mystic'
                  ? 'bg-[radial-gradient(circle_at_center,rgba(192,132,252,0.95)_0%,rgba(19,104,206,0.55)_45%,rgba(70,23,143,0)_80%)]'
                  : magicBurst.tierId === 'bronze'
                  ? 'bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.95)_0%,rgba(251,191,36,0.45)_45%,rgba(70,23,143,0)_80%)]'
                  : 'bg-[radial-gradient(circle_at_center,rgba(101,229,61,0.92)_0%,rgba(255,215,0,0.45)_45%,rgba(70,23,143,0)_80%)]'
              }`}
            />

            {/* Expanding Shockwave Rings */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0.95 }}
              animate={{ scale: 3.1, opacity: 0 }}
              transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-44 h-44 rounded-full border-[6px] border-[#FFD700] shadow-[0_0_45px_rgba(255,215,0,0.85)]"
            />
            <motion.div
              initial={{ scale: 0.15, opacity: 0.9 }}
              animate={{ scale: 2.3, opacity: 0 }}
              transition={{ duration: 0.68, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-40 h-40 rounded-full border-4 border-white"
            />

            {/* Center Chest Eruption Pop */}
            <motion.img
              src={magicBurst.chestImg}
              alt=""
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{
                scale: [0.5, 1.32, 0.95],
                rotate: [-10, 8, -4, 0],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-36 h-36 object-contain drop-shadow-[0_0_32px_rgba(255,255,255,0.95)]"
            />

            {/* 28 Flying Magic Shards / Fragments */}
            {Array.from({ length: 28 }).map((_, idx) => {
              const angle = (idx / 28) * Math.PI * 2 + (idx % 3) * 0.14;
              const distance = 150 + (idx % 5) * 65;
              const endX = Math.cos(angle) * distance;
              const endY = Math.sin(angle) * distance;
              const shardColors = [
                'bg-[#FFD700]',
                'bg-[#FFFFFF]',
                'bg-[#65E53D]',
                'bg-[#1368CE]',
                'bg-[#E21B3C]',
              ];
              const colorClass = shardColors[idx % shardColors.length];
              const isDiamond = idx % 2 === 0;

              return (
                <motion.div
                  key={idx}
                  initial={{ x: 0, y: 0, scale: 0.2, rotate: 0, opacity: 1 }}
                  animate={{
                    x: endX,
                    y: endY,
                    scale: [0.2, 1.4, 0.3],
                    rotate: (idx % 2 === 0 ? 1 : -1) * (240 + idx * 18),
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 0.85,
                    delay: (idx % 4) * 0.025,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`absolute ${colorClass} ${
                    isDiamond
                      ? 'w-4 h-4 rotate-45 rounded-xs'
                      : 'w-3.5 h-6 rounded-sm'
                  } shadow-[0_0_12px_rgba(255,255,255,0.85)]`}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DAILY RUN SUMMARY & FRESH RESTART MODAL (ZERO LONG-TERM SAVE MODE) */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 bg-[#2E0E63]/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
          onClick={() => setShowSummaryModal(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <DailySummaryModal
              lang={lang}
              coins={coins}
              points={points}
              streakMultiplier={streakMultiplier}
              missionPct={missionOverview.pct}
              vaultPosts={vaultPosts}
              onStartFreshRun={handleStartFreshRun}
              onClose={() => {
                soundFX.playTap(460);
                setShowSummaryModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* HOW TO PLAY 3-STEP GUIDE MODAL */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 z-50 bg-[#2E0E63]/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
          onClick={() => setShowHowToPlay(false)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <HowToPlayModal
              lang={lang}
              onClose={() => {
                soundFX.playTap(460);
                setShowHowToPlay(false);
              }}
            />
          </div>
        </div>
      )}

      {/* CHEST REVEAL OVERLAY MODAL */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 bg-[#2E0E63]/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
          onClick={() => setActivePost(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <RedditPostModal
              post={activePost}
              lang={lang}
              rewardBadge={rewardBadgeText}
              onClose={() => {
                soundFX.playTap(460);
                setActivePost(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
