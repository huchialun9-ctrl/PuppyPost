import React from 'react';
import { motion } from 'motion/react';
import { Compass, Trophy, Zap, HelpCircle, X } from 'lucide-react';

interface HowToPlayModalProps {
  lang: 'zh' | 'en';
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ lang, onClose }) => {
  const steps = [
    {
      num: '01',
      titleZh: '每日一玩 · 單局無長期存檔',
      titleEn: 'Daily Run · Zero Long-Term Save',
      descZh:
        '每次進入即開啟全新單局！先領「今日開局禮」與「免費補給箱」疊高本局倍率（1.1x 起跳），再開啟青銅／紫晶／傳奇寶箱挖掘 2012–至今真實 Reddit 爆紅貼文！',
      descEn:
        'Every session is a fresh Daily Run with no long-term save! Claim your Starter Boost & Free Chest to build your run multiplier, then unbox real viral Reddit posts.',
      icon: Compass,
      bg: 'bg-[#F5F3FA]',
      accent: 'text-[#46178F]',
    },
    {
      num: '02',
      titleZh: '看板搶答衝刺高分與代幣',
      titleEn: 'Subreddit Quiz for Fast Coins',
      descZh:
        '想在單局內衝高分或補充代幣？進入「競猜賺幣」，15 秒內猜出貼文出自哪個看板，答越快、連勝越多次，代幣倍率最高可達 2.5x！',
      descEn:
        'Boost your run score and coins in Subreddit Quiz! Guess the community within 15s—faster answers & combos multiply your payout up to 2.5x.',
      icon: Zap,
      bg: 'bg-[#E8F7E4]',
      accent: 'text-[#195E07]',
    },
    {
      num: '03',
      titleZh: '達成每日任務 & 單局 Era Master',
      titleEn: 'Finish Quests & Era Master',
      descZh:
        '將「每日進度條」推進至 100%，並在「戰利品」切換「依年代分組」，任一年代收集滿 2 篇貼文即可在本局直接點亮 Era Master 獎章！',
      descEn:
        'Push your Daily Progress bar to 100% and collect 2 posts in any era inside Vault (Group by Era) to unlock Era Master in a single run!',
      icon: Trophy,
      bg: 'bg-[#FFF5D6]',
      accent: 'text-[#8F6500]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className="bg-white rounded-3xl p-5 md:p-7 text-[#222222] shadow-[0_10px_0_rgba(0,0,0,0.22)] space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#46178F]">
          <HelpCircle className="w-6 h-6" />
          <h2 className="text-xl md:text-2xl font-black">
            {lang === 'zh' ? '每日一玩 · 3 步驟快速上手' : 'Daily Run · How to Play'}
          </h2>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className={`rounded-2xl p-4 ${step.bg} flex flex-col gap-2`}
            >
              <div className={`flex items-center justify-between ${step.accent}`}>
                <span className="text-xs font-mono-num font-black">{step.num}</span>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[#1F1B2E]">
                {lang === 'zh' ? step.titleZh : step.titleEn}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#444444] leading-relaxed">
                {lang === 'zh' ? step.descZh : step.descEn}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#46178F] hover:bg-[#531FA5] text-white font-black text-sm shadow-[0_4px_0_#2D0E5E] active:translate-y-[2px]"
        >
          {lang === 'zh' ? '開始今日尋寶！' : 'Start Today’s Run!'}
        </button>
      </div>
    </motion.div>
  );
};
