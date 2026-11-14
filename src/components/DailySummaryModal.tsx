import React from 'react';
import { motion } from 'motion/react';
import { Award, RotateCcw, Trophy, X, Sparkles } from 'lucide-react';
import { ERA_DEFINITIONS, GAME_PROPS, getPostEra, RedditPostItem } from '../data/chests';

interface DailySummaryModalProps {
  lang: 'zh' | 'en';
  coins: number;
  points: number;
  streakMultiplier: number;
  missionPct: number;
  vaultPosts: RedditPostItem[];
  onStartFreshRun: () => void;
  onClose: () => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({
  lang,
  coins,
  points,
  streakMultiplier,
  missionPct,
  vaultPosts,
  onStartFreshRun,
  onClose,
}) => {
  const eraMasters = ERA_DEFINITIONS.filter(
    (era) =>
      vaultPosts.filter((p) => getPostEra(p.postedDate) === era.key).length >=
      era.targetCount
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className="bg-white rounded-3xl p-5 md:p-7 text-[#222222] shadow-[0_10px_0_rgba(0,0,0,0.22)] space-y-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#46178F]">
            <Trophy className="w-6 h-6 text-[#D89E00]" />
            <h2 className="text-xl md:text-2xl font-black">
              {lang === 'zh' ? '今日一玩 · 本局戰績結算' : 'Daily Run Summary'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[#666666]">
            {lang === 'zh'
              ? '本遊戲採用「每日單局無存檔」模式，隨時結算成績或重新開啟全新一局！'
              : 'Pure single-session Daily Run — no long-term save state. Review today’s score or start fresh!'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-h-[38px] min-w-[38px] rounded-xl bg-[#F3F1F8] hover:bg-[#E7E2F3] text-[#46178F] flex items-center justify-center shadow-[0_3px_0_#D8D2E8]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Run Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#FFF5D6] p-3.5 text-center">
          <img
            src={GAME_PROPS.coinIcon}
            alt=""
            className="w-7 h-7 object-contain mix-blend-multiply mx-auto mb-1"
          />
          <div className="text-xs font-extrabold text-[#8F6500]">
            {lang === 'zh' ? '本局代幣' : 'Run Coins'}
          </div>
          <div className="text-xl font-black font-mono-num text-[#B58200]">
            {coins.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-[#F5F3FA] p-3.5 text-center">
          <img
            src={GAME_PROPS.trophyIcon}
            alt=""
            className="w-7 h-7 object-contain mix-blend-multiply mx-auto mb-1"
          />
          <div className="text-xs font-extrabold text-[#46178F]">
            {lang === 'zh' ? '本局 Karma' : 'Run Karma'}
          </div>
          <div className="text-xl font-black font-mono-num text-[#46178F]">
            {points.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-[#E8F7E4] p-3.5 text-center">
          <Sparkles className="w-7 h-7 text-[#26890C] mx-auto mb-1" />
          <div className="text-xs font-extrabold text-[#195E07]">
            {lang === 'zh' ? '今日進度' : 'Daily Goal'}
          </div>
          <div className="text-xl font-black font-mono-num text-[#26890C]">
            {missionPct}%
          </div>
        </div>

        <div className="rounded-2xl bg-[#F5F3FA] p-3.5 text-center">
          <Award className="w-7 h-7 text-[#D89E00] mx-auto mb-1" />
          <div className="text-xs font-extrabold text-[#555555]">
            {lang === 'zh' ? '獎勵倍率 / 收藏' : 'Bonus / Vault'}
          </div>
          <div className="text-xl font-black font-mono-num text-[#222222]">
            {streakMultiplier.toFixed(1)}x · {vaultPosts.length}
          </div>
        </div>
      </div>

      {/* Era Master Badges Achieved in This Run */}
      <div className="rounded-2xl bg-[#F5F3FA] p-4 space-y-2">
        <div className="text-xs font-black text-[#46178F]">
          {lang === 'zh'
            ? `本局獲得 Era Master 獎章 (${eraMasters.length} / ${ERA_DEFINITIONS.length})`
            : `Era Master Badges This Run (${eraMasters.length} / ${ERA_DEFINITIONS.length})`}
        </div>
        {eraMasters.length === 0 ? (
          <p className="text-xs font-bold text-[#666666]">
            {lang === 'zh'
              ? '尚未達成任何年代全套（在任一年代收集 2 篇貼文即可獲得 Era Master！）'
              : 'Collect 2 posts in any era to unlock an Era Master badge in this run!'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {eraMasters.map((era) => (
              <div
                key={era.key}
                className="px-3 py-1.5 rounded-xl bg-[#FFF5D6] text-[#8F6500] text-xs font-black flex items-center gap-1.5"
              >
                <Award className="w-4 h-4 text-[#D89E00]" />
                <span>{lang === 'zh' ? era.labelZh : era.labelEn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-5 py-2 rounded-2xl bg-[#F3F1F8] hover:bg-[#E7E2F3] text-[#46178F] font-black text-sm"
        >
          {lang === 'zh' ? '繼續本局' : 'Keep Playing'}
        </button>
        <button
          type="button"
          onClick={onStartFreshRun}
          className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#26890C] hover:bg-[#2C9C0F] text-white font-black text-sm flex items-center gap-2 shadow-[0_4px_0_#195E07] active:translate-y-[2px]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{lang === 'zh' ? '重新開一局（每日重置）' : 'Start Fresh Run'}</span>
        </button>
      </div>
    </motion.div>
  );
};
