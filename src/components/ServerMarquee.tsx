import React, { useState } from 'react';
import { Megaphone, History, X, Check, Edit3 } from 'lucide-react';
import { ServerAnnouncement } from '../hooks/useServerAnnouncements';

interface ServerMarqueeProps {
  lang: 'zh' | 'en';
  announcements: ServerAnnouncement[];
  wsConnected: boolean;
  playerName: string;
  onChangePlayerName: (name: string) => void;
}

export const ServerMarquee: React.FC<ServerMarqueeProps> = ({
  lang,
  announcements,
  wsConnected,
  playerName,
  onChangePlayerName,
}) => {
  const [showLog, setShowLog] = useState<boolean>(false);
  const [editingName, setEditingName] = useState<boolean>(false);
  const [draftName, setDraftName] = useState<string>(playerName);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftName.trim()) {
      onChangePlayerName(draftName.trim());
    }
    setEditingName(false);
  };

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const renderTrackItems = (keyPrefix: string) =>
    announcements.map((item) => (
      <span
        key={`${keyPrefix}-${item.id}`}
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-[#222222] shrink-0"
      >
        <span className="px-2 py-0.5 rounded-md bg-[#EFEAF8] text-[#46178F] font-mono-num text-[11px]">
          {formatTime(item.createdAt)}
        </span>
        <span>{lang === 'zh' ? item.messageZh : item.messageEn}</span>
        <span className="text-[#B58200] font-black mx-2">◆</span>
      </span>
    ));

  return (
    <div className="relative shrink-0">
      <div className="bg-white text-[#222222] rounded-2xl px-3 py-1.5 shadow-[0_4px_0_rgba(0,0,0,0.16)] flex items-center gap-2.5 h-10">
        {/* Server Live Anchor (no people count) */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#46178F] text-white text-xs font-black">
          <Megaphone className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
          <span className="hidden sm:inline">
            {lang === 'zh' ? '伺服器共同公告' : 'Server Live Feed'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ml-0.5 ${
              wsConnected ? 'bg-[#65E53D]' : 'bg-[#FFD700]'
            }`}
          />
        </div>

        {/* Continuous Marquee Track */}
        <div className="flex-1 min-w-0 overflow-hidden relative">
          {announcements.length === 0 ? (
            <div className="text-xs sm:text-sm font-bold text-[#666666] truncate">
              {lang === 'zh'
                ? '伺服器即時廣播已連線，等待第一位玩家開箱或完成搶答...'
                : 'Server live broadcast ready — open a chest or play quiz to broadcast!'}
            </div>
          ) : (
            <div className="marquee-container">
              <div className="marquee-track">
                <div className="flex items-center gap-3 pr-6">
                  {renderTrackItems('a')}
                </div>
                <div className="flex items-center gap-3 pr-6" aria-hidden="true">
                  {renderTrackItems('b')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Editable Real Player Handle + Log Drawer Trigger */}
        <div className="shrink-0 flex items-center gap-1.5">
          {editingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={24}
                autoFocus
                className="w-24 sm:w-28 h-7 px-2 rounded-lg bg-[#F3F1F8] text-xs font-black text-[#46178F] focus:outline-none"
              />
              <button
                type="submit"
                className="w-7 h-7 rounded-lg bg-[#26890C] text-white flex items-center justify-center"
                title={lang === 'zh' ? '儲存暱稱' : 'Save Name'}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(playerName);
                setEditingName(true);
              }}
              title={lang === 'zh' ? '點擊更改玩家名稱' : 'Click to edit player name'}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F3F1F8] hover:bg-[#E7E2F3] text-xs font-black text-[#46178F] transition-colors"
            >
              <span>{playerName}</span>
              <Edit3 className="w-3 h-3 opacity-70" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="h-7 px-2.5 rounded-lg bg-[#FFF5D6] hover:bg-[#FFECA8] text-[#8F6500] text-xs font-black inline-flex items-center gap-1 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {lang === 'zh' ? '動態紀錄' : 'Feed Log'}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Server Event Log Popover */}
      {showLog && (
        <div className="absolute right-0 top-12 z-40 w-full sm:w-[440px] bg-white text-[#222222] rounded-2xl p-4 shadow-[0_10px_28px_rgba(0,0,0,0.32)]">
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#46178F]" />
              <span className="text-sm font-black text-[#46178F]">
                {lang === 'zh' ? '全服玩家即時動態紀錄' : 'Live Server Player Feed'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLog(false)}
              className="w-7 h-7 rounded-lg bg-[#F3F1F8] hover:bg-[#E7E2F3] flex items-center justify-center text-[#46178F]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {announcements.length === 0 ? (
              <p className="text-xs font-bold text-[#666666] py-4 text-center">
                {lang === 'zh'
                  ? '目前尚未有玩家動態，快成為第一位吧！'
                  : 'No server events yet.'}
              </p>
            ) : (
              announcements.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-[#F5F3FA] flex items-start justify-between gap-2"
                >
                  <div className="text-xs font-bold text-[#222222] leading-snug">
                    {lang === 'zh' ? item.messageZh : item.messageEn}
                  </div>
                  <span className="text-[10px] font-mono-num font-bold text-[#666666] shrink-0">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
