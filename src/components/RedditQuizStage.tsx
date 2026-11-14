import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Loader2, RotateCcw, ArrowRight, BookmarkPlus, Trophy } from 'lucide-react';
import { QuizRoundItem, RedditPostItem, KahootShapeType } from '../data/chests';
import { KahootShape } from './KahootShape';
import { soundFX } from '../utils/sound';

interface RedditQuizStageProps {
  lang: 'zh' | 'en';
  onEarnRewards: (
    coins: number,
    karma: number,
    meta?: { subreddit: string; combo: number }
  ) => void;
  onMatchComplete?: (summary: {
    correctCount: number;
    totalRounds: number;
    bestCombo: number;
    sessionCoins: number;
  }) => void;
  onQuizAnswerSubmitted: () => void;
  onSavePost: (post: RedditPostItem) => void;
  onCelebrate: () => void;
  onBackToChests: () => void;
}

const OPTION_STYLES: Array<{
  shape: KahootShapeType;
  bg: string;
  shadow: string;
}> = [
  {
    shape: 'triangle',
    bg: 'bg-[#E21B3C] hover:bg-[#EE2647]',
    shadow: 'shadow-[0_5px_0_#A61029] active:shadow-[0_1px_0_#A61029]',
  },
  {
    shape: 'diamond',
    bg: 'bg-[#1368CE] hover:bg-[#1974E0]',
    shadow: 'shadow-[0_5px_0_#0D4994] active:shadow-[0_1px_0_#0D4994]',
  },
  {
    shape: 'circle',
    bg: 'bg-[#D89E00] hover:bg-[#E5AA00]',
    shadow: 'shadow-[0_5px_0_#9E7300] active:shadow-[0_1px_0_#9E7300]',
  },
  {
    shape: 'square',
    bg: 'bg-[#26890C] hover:bg-[#2C9C0F]',
    shadow: 'shadow-[0_5px_0_#195E07] active:shadow-[0_1px_0_#195E07]',
  },
];

const ROUND_SECONDS = 15;

export const RedditQuizStage: React.FC<RedditQuizStageProps> = ({
  lang,
  onEarnRewards,
  onMatchComplete,
  onQuizAnswerSubmitted,
  onSavePost,
  onCelebrate,
  onBackToChests,
}) => {
  const [rounds, setRounds] = useState<QuizRoundItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_SECONDS);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [sessionCoins, setSessionCoins] = useState<number>(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState<boolean>(false);

  const loadQuizBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFinished(false);
    setRoundIdx(0);
    setSelectedOption(null);
    setTimeLeft(ROUND_SECONDS);
    setCombo(0);
    setBestCombo(0);
    setCorrectCount(0);
    setSessionCoins(0);

    try {
      const resp = await fetch('/api/reddit/quiz-batch');
      const json = (await resp.json()) as { rounds?: QuizRoundItem[]; error?: string };
      if (!resp.ok || !json.rounds || json.rounds.length === 0) {
        throw new Error(json.error || 'Failed to load live Reddit quiz posts');
      }
      setRounds(json.rounds);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach live Reddit feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizBatch();
  }, [loadQuizBatch]);

  const currentRound = rounds[roundIdx];

  useEffect(() => {
    if (loading || error || finished || !currentRound || selectedOption !== null) {
      return;
    }
    if (timeLeft <= 0) {
      setSelectedOption('__TIMEOUT__');
      setCombo(0);
      soundFX.playTap(260);
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [loading, error, finished, currentRound, selectedOption, timeLeft]);

  const handleSelectOption = (option: string) => {
    if (!currentRound || selectedOption !== null) return;
    setSelectedOption(option);
    onQuizAnswerSubmitted();

    const isCorrect = option === currentRound.correctOption;
    if (isCorrect) {
      const nextCombo = combo + 1;
      const mult = 1 + Math.min(nextCombo - 1, 3) * 0.5;
      const speedBonus = Math.round(timeLeft * 2);
      const earnedCoins = Math.round((45 + speedBonus) * mult);
      const earnedKarma = Math.round((60 + speedBonus) * mult);

      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setCorrectCount((c) => c + 1);
      setSessionCoins((c) => c + earnedCoins);
      onEarnRewards(earnedCoins, earnedKarma, {
        subreddit: currentRound.correctOption,
        combo: nextCombo,
      });
      soundFX.playSuccess();
      if (nextCombo >= 3) {
        onCelebrate();
      }
    } else {
      setCombo(0);
      soundFX.playTap(240);
    }
  };

  const handleNext = () => {
    soundFX.playTap(540);
    if (roundIdx + 1 >= rounds.length) {
      setFinished(true);
      onMatchComplete?.({
        correctCount,
        totalRounds: rounds.length,
        bestCombo,
        sessionCoins,
      });
      if (correctCount >= 3) {
        soundFX.playRelicDiscovered('mystic');
        onCelebrate();
      }
    } else {
      setRoundIdx((i) => i + 1);
      setSelectedOption(null);
      setTimeLeft(ROUND_SECONDS);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 bg-white text-[#222222] rounded-3xl p-6 shadow-[0_8px_0_rgba(0,0,0,0.18)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#46178F]" />
        <p className="text-lg font-black">
          {lang === 'zh'
            ? '正從 Reddit 載入真實爆紅貼文題庫...'
            : 'Loading live Reddit quiz posts...'}
        </p>
      </div>
    );
  }

  if (error || !currentRound) {
    return (
      <div className="flex-1 min-h-0 bg-white text-[#222222] rounded-3xl p-6 shadow-[0_8px_0_rgba(0,0,0,0.18)] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-base font-black text-[#E21B3C]">{error || 'No posts loaded'}</p>
        <button
          type="button"
          onClick={loadQuizBatch}
          className="min-h-[46px] px-6 py-2 rounded-xl bg-[#46178F] text-white font-black flex items-center gap-2 shadow-[0_4px_0_#2D0E5E] active:translate-y-[2px]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{lang === 'zh' ? '重新載入題庫' : 'Retry'}</span>
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 min-h-0 bg-white text-[#222222] rounded-3xl p-6 shadow-[0_8px_0_rgba(0,0,0,0.18)] flex flex-col items-center justify-center text-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#F3F1F8] flex items-center justify-center">
          <Trophy className="w-8 h-8 text-[#D89E00]" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-[#1F1B2E]">
          {lang === 'zh' ? '挑戰結算完成！' : 'Match Complete!'}
        </h2>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
          <div className="p-3.5 rounded-2xl bg-[#F5F3FA]">
            <div className="text-xs font-extrabold text-[#666666]">
              {lang === 'zh' ? '答對題數' : 'Accuracy'}
            </div>
            <div className="text-xl md:text-2xl font-black font-mono-num text-[#46178F] mt-1">
              {correctCount} / {rounds.length}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F5F3FA]">
            <div className="text-xs font-extrabold text-[#666666]">
              {lang === 'zh' ? '獲得代幣' : 'Coins Won'}
            </div>
            <div className="text-xl md:text-2xl font-black font-mono-num text-[#B58200] mt-1">
              +{sessionCoins}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F5F3FA]">
            <div className="text-xs font-extrabold text-[#666666]">
              {lang === 'zh' ? '最高連擊' : 'Best Streak'}
            </div>
            <div className="text-xl md:text-2xl font-black font-mono-num text-[#26890C] mt-1">
              {bestCombo}x
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
          <button
            type="button"
            onClick={loadQuizBatch}
            className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#26890C] hover:bg-[#2C9C0F] text-white text-base font-black flex items-center gap-2 shadow-[0_5px_0_#195E07] active:translate-y-[3px]"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{lang === 'zh' ? '再玩一局賺幣' : 'Play Again'}</span>
          </button>
          <button
            type="button"
            onClick={onBackToChests}
            className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#46178F] hover:bg-[#531FA5] text-white text-base font-black shadow-[0_5px_0_#2D0E5E] active:translate-y-[3px]"
          >
            {lang === 'zh' ? '回去開寶箱' : 'Open Chests'}
          </button>
        </div>
      </motion.div>
    );
  }

  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === currentRound.correctOption;
  const timerPct = Math.max(0, Math.round((timeLeft / ROUND_SECONDS) * 100));
  const isPostSaved = savedIds.has(currentRound.post.id);

  return (
    <div className="flex-1 min-h-0 bg-white text-[#222222] rounded-3xl p-4 lg:p-5 shadow-[0_8px_0_rgba(0,0,0,0.18)] flex flex-col justify-between gap-3">
      {/* Top Question Header + Timer */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono-num font-black text-[#46178F]">
              {lang === 'zh'
                ? `第 ${roundIdx + 1} / ${rounds.length} 題`
                : `Round ${roundIdx + 1} / ${rounds.length}`}
            </span>
            {combo > 0 && (
              <span className="text-sm font-mono-num font-black text-[#26890C]">
                · {combo}x {lang === 'zh' ? '連勝加成' : 'Combo'}
              </span>
            )}
          </div>
          <span className="text-base font-mono-num font-black text-[#222222]">
            {timeLeft}s
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-[#EFEAF8] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              timeLeft <= 4 ? 'bg-[#E21B3C]' : 'bg-[#46178F]'
            }`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </div>

      {/* Real Reddit Post Prompt */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-6 h-full max-h-[190px] xl:max-h-[230px] rounded-2xl bg-[#F5F3FA] flex items-center justify-center overflow-hidden p-2">
          {currentRound.post.imageUrl && (
            <img
              src={currentRound.post.imageUrl}
              alt={currentRound.post.title}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          )}
        </div>

        <div className="lg:col-span-6 flex flex-col justify-center gap-2.5">
          <div className="text-xs font-extrabold tracking-wide text-[#666666]">
            {lang === 'zh'
              ? '這篇真實 Reddit 貼文來自哪個看板？（越快答對連勝倍率越高，最高 2.5x）'
              : 'Which Subreddit is this live post from? (Faster answers + combos up to 2.5x)'}
          </div>
          <h2 className="text-lg xl:text-xl font-black leading-snug text-[#1F1B2E] line-clamp-3">
            {currentRound.post.title}
          </h2>

          {isAnswered && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div
                className={`text-sm md:text-base font-black ${
                  isCorrect ? 'text-[#26890C]' : 'text-[#E21B3C]'
                }`}
              >
                {isCorrect
                  ? lang === 'zh'
                    ? `答對了！來自 ${currentRound.correctOption} · ▲ ${currentRound.post.ups.toLocaleString()}`
                    : `Correct! ${currentRound.correctOption} · ▲ ${currentRound.post.ups.toLocaleString()}`
                  : selectedOption === '__TIMEOUT__'
                  ? lang === 'zh'
                    ? `時間到！答案：${currentRound.correctOption}`
                    : `Time up! ${currentRound.correctOption}`
                  : lang === 'zh'
                  ? `正確答案：${currentRound.correctOption}`
                  : `Answer: ${currentRound.correctOption}`}
              </div>

              <div className="flex items-center gap-2">
                {!isPostSaved && (
                  <button
                    type="button"
                    onClick={() => {
                      onSavePost(currentRound.post);
                      setSavedIds((prev) => new Set(prev).add(currentRound.post.id));
                    }}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-[#F3F1F8] hover:bg-[#E7E2F3] text-xs font-black text-[#46178F] flex items-center gap-1"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{lang === 'zh' ? '收藏' : 'Save'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[36px] px-4 py-1 rounded-xl bg-[#46178F] hover:bg-[#531FA5] text-white text-xs md:text-sm font-black flex items-center gap-1 shadow-[0_3px_0_#2D0E5E]"
                >
                  <span>
                    {roundIdx + 1 >= rounds.length
                      ? lang === 'zh'
                        ? '查看結算'
                        : 'Finish'
                      : lang === 'zh'
                      ? '下一題'
                      : 'Next'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2x2 Kahoot 4-Color 3D Answer Grid */}
      <div className="shrink-0 grid grid-cols-2 gap-3">
        {currentRound.options.map((opt, idx) => {
          const style = OPTION_STYLES[idx % 4];
          const isThisCorrect = opt === currentRound.correctOption;
          const isThisSelected = opt === selectedOption;
          const dimmed = isAnswered && !isThisCorrect && !isThisSelected;

          return (
            <button
              key={opt}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(opt)}
              className={`min-h-[52px] xl:min-h-[58px] px-4 py-2.5 rounded-2xl text-white font-black text-base flex items-center gap-2.5 transition-all ${
                style.bg
              } ${style.shadow} ${
                isAnswered ? '' : 'active:translate-y-[3px]'
              } ${dimmed ? 'opacity-35' : 'opacity-100'} ${
                isAnswered && isThisCorrect ? 'ring-4 ring-[#1F1B2E]/25' : ''
              }`}
            >
              <KahootShape shape={style.shape} className="w-4 h-4 shrink-0 text-white" />
              <span className="truncate">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
