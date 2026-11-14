import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ExternalLink,
  Share2,
  Check,
  X,
  Compass,
} from 'lucide-react';
import { RedditPostItem } from '../data/chests';
import { soundFX } from '../utils/sound';

interface RedditPostModalProps {
  post: RedditPostItem;
  lang: 'zh' | 'en';
  rewardBadge?: string;
  onClose?: () => void;
}

export const RedditPostModal: React.FC<RedditPostModalProps> = ({
  post,
  lang,
  rewardBadge,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  useEffect(() => {
    setImgFailed(false);
  }, [post.id]);

  const handleShare = async () => {
    soundFX.playTap(600);
    const shareUrl = post.permalink;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      // ignore
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.84, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className="bg-white rounded-3xl p-5 md:p-7 text-[#222222] shadow-[0_10px_0_rgba(0,0,0,0.22)] max-h-[88vh] flex flex-col"
    >
      {/* Discovery Reward Banner */}
      {rewardBadge && (
        <div className="shrink-0 mb-3 px-4 py-2 rounded-2xl bg-[#E8F7E4] text-[#195E07] font-black text-sm flex items-center gap-2">
          <Compass className="w-4 h-4 shrink-0" />
          <span>{rewardBadge}</span>
        </div>
      )}

      {/* Header Metadata & Actions */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-sm font-mono-num text-[#666666]">
          <span className="font-black text-[#46178F]">{post.subreddit}</span>
          <span>·</span>
          <span className="font-bold text-[#444444]">{post.author}</span>
          <span>·</span>
          <span className="text-[#B58200] font-black">▲ {post.ups.toLocaleString()}</span>
          <span>·</span>
          <span>{post.postedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className={`min-h-[38px] px-4 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5 transition-all active:translate-y-[2px] ${
              copied
                ? 'bg-[#26890C] text-white shadow-[0_3px_0_#195E07]'
                : 'bg-[#1368CE] hover:bg-[#1974E0] text-white shadow-[0_3px_0_#0D4994]'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : lang === 'zh' ? '分享' : 'Share'}</span>
          </button>

          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#46178F] hover:bg-[#531FA5] text-white text-sm font-black flex items-center gap-1.5 shadow-[0_3px_0_#2D0E5E] active:translate-y-[2px] transition-all"
          >
            <span>Reddit</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-h-[38px] min-w-[38px] rounded-xl bg-[#F3F1F8] hover:bg-[#E7E2F3] text-[#46178F] flex items-center justify-center shadow-[0_3px_0_#D8D2E8] active:translate-y-[2px]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body Inside Modal Only */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black leading-snug text-[#222222]">
            {post.title}
          </h2>
          {post.selftext && (
            <p className="mt-2.5 text-base font-medium text-[#444444] leading-relaxed whitespace-pre-line">
              {post.selftext}
            </p>
          )}
        </div>

        {post.imageUrl && !imgFailed && (
          <div className="rounded-2xl overflow-hidden bg-[#F3F1F8]">
            <img
              src={post.imageUrl}
              alt={post.title}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full max-h-[380px] object-contain mx-auto"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
