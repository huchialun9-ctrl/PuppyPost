import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ExternalLink,
  Loader2,
  BookmarkPlus,
  Compass,
  Check,
  RefreshCw,
} from 'lucide-react';
import { RedditPostItem, EraKey } from '../data/chests';
import { soundFX } from '../utils/sound';

interface RedditHubProps {
  lang: 'zh' | 'en';
  savedPostIds: Set<string>;
  onSavePostToVault: (post: RedditPostItem) => void;
}

const ERA_FILTERS: Array<{
  key: 'all' | EraKey;
  labelZh: string;
  labelEn: string;
  after?: string;
  before?: string;
}> = [
  { key: 'all', labelZh: '全年代', labelEn: 'All Eras' },
  {
    key: '2012-2015',
    labelZh: '2012–2015',
    labelEn: '2012–2015',
    after: '2012-01-01',
    before: '2015-12-31',
  },
  {
    key: '2016-2020',
    labelZh: '2016–2020',
    labelEn: '2016–2020',
    after: '2016-01-01',
    before: '2020-12-31',
  },
  {
    key: '2021-now',
    labelZh: '2021–至今',
    labelEn: '2021–Now',
    after: '2021-01-01',
  },
];

export const RedditHub: React.FC<RedditHubProps> = ({
  lang,
  savedPostIds,
  onSavePostToVault,
}) => {
  const [subreddit, setSubreddit] = useState<string>('all');
  const [eraFilter, setEraFilter] = useState<'all' | EraKey>('all');
  const [query, setQuery] = useState<string>('');
  const [liveTrendingSubs, setLiveTrendingSubs] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState<boolean>(false);

  const [posts, setPosts] = useState<RedditPostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activePost, setActivePost] = useState<RedditPostItem | null>(null);

  const loadLiveTrending = useCallback(async (alsoPopulatePosts = false) => {
    setLoadingTrending(true);
    try {
      const resp = await fetch('/api/reddit/trending');
      const json = (await resp.json()) as {
        subreddits?: string[];
        posts?: RedditPostItem[];
      };
      if (resp.ok) {
        if (Array.isArray(json.subreddits)) {
          setLiveTrendingSubs(json.subreddits);
        }
        if (alsoPopulatePosts && Array.isArray(json.posts) && json.posts.length > 0) {
          setPosts(json.posts);
          setActivePost(json.posts[0]);
        }
      }
    } catch {
      // ignore; user can still search any subreddit directly
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  const fetchRedditPosts = useCallback(
    async (
      targetSub = subreddit,
      targetQ = query,
      targetEra = eraFilter,
      pickRandom = false
    ) => {
      setLoadingPosts(true);
      setSearchError(null);
      try {
        const cleanSub = targetSub.replace(/^r\//i, '').trim() || 'all';
        const eraSpec = ERA_FILTERS.find((e) => e.key === targetEra);
        const params = new URLSearchParams({
          subreddit: cleanSub,
          q: targetQ,
          sort: 'top',
          t: 'all',
          limit: '15',
        });
        if (eraSpec?.after) params.set('after', eraSpec.after);
        if (eraSpec?.before) params.set('before', eraSpec.before);

        const resp = await fetch(`/api/reddit/search?${params.toString()}`);
        const json = (await resp.json()) as {
          posts?: RedditPostItem[];
          error?: string;
        };
        if (!resp.ok) {
          throw new Error(json.error || 'Reddit API request failed');
        }
        const list = json.posts || [];
        setPosts(list);
        if (list.length > 0) {
          if (pickRandom) {
            const chosen = list[Math.floor(Math.random() * list.length)];
            setActivePost(chosen);
            soundFX.playRelicDiscovered('bronze');
          } else {
            setActivePost(list[0]);
          }
        }
      } catch (err: any) {
        setSearchError(err?.message || 'Unable to reach Reddit API right now.');
      } finally {
        setLoadingPosts(false);
      }
    },
    [subreddit, query, eraFilter]
  );

  useEffect(() => {
    loadLiveTrending(true);
  }, [loadLiveTrending]);

  const handleRandomRadarDig = () => {
    const candidatePool =
      liveTrendingSubs.length > 0 ? ['all', ...liveTrendingSubs] : ['all'];
    const randomSub =
      candidatePool[Math.floor(Math.random() * candidatePool.length)];
    soundFX.playDigging();
    setSubreddit(randomSub);
    setQuery('');
    fetchRedditPosts(randomSub, '', eraFilter, true);
  };

  const isCurrentSaved = activePost ? savedPostIds.has(activePost.id) : false;

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column: Real Live Reddit Discovery & Custom Subreddit Search */}
      <div className="lg:col-span-6 min-h-0 flex flex-col gap-3">
        <div className="shrink-0 bg-white rounded-3xl p-4 text-[#222222] shadow-[0_6px_0_rgba(0,0,0,0.18)] space-y-2.5">
          {/* Search Any Real Subreddit Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchRedditPosts(subreddit, query, eraFilter);
            }}
            className="flex flex-wrap sm:flex-nowrap gap-2"
          >
            <input
              type="text"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              placeholder="all 或任意看板如 pics"
              className="w-36 sm:w-44 min-h-[40px] px-3 py-1 rounded-xl bg-[#F3F1F8] focus:bg-[#ECE8F5] focus:outline-none text-sm font-bold text-[#46178F]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'zh' ? '輸入關鍵字搜尋真實貼文...' : 'Search real posts...'}
              className="flex-1 min-w-[140px] min-h-[40px] px-3.5 py-1 rounded-xl bg-[#F3F1F8] focus:bg-[#ECE8F5] focus:outline-none text-sm font-semibold text-[#222222]"
            />
            <button
              type="submit"
              disabled={loadingPosts}
              className="min-h-[40px] px-4 py-1 rounded-xl bg-[#26890C] hover:bg-[#2C9C0F] text-white font-black text-sm flex items-center gap-1.5 shrink-0 shadow-[0_3px_0_#195E07] active:translate-y-[2px]"
            >
              {loadingPosts ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{lang === 'zh' ? '搜尋' : 'Search'}</span>
            </button>
          </form>

          {/* Real-Time Discovered Active Communities from Live Reddit Feed */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.playTap(500);
                  setSubreddit('all');
                  fetchRedditPosts('all', query, eraFilter);
                }}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  subreddit.toLowerCase() === 'all'
                    ? 'bg-[#1368CE] text-white shadow-[0_2px_0_#0D4994]'
                    : 'bg-[#F3F1F8] hover:bg-[#E7E2F3] text-[#333333]'
                }`}
              >
                r/all
              </button>

              {liveTrendingSubs.slice(0, 5).map((sub) => {
                const isActive = subreddit.toLowerCase() === sub.toLowerCase();
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      soundFX.playTap(520);
                      setSubreddit(sub);
                      fetchRedditPosts(sub, query, eraFilter);
                    }}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                      isActive
                        ? 'bg-[#1368CE] text-white shadow-[0_2px_0_#0D4994]'
                        : 'bg-[#F3F1F8] hover:bg-[#E7E2F3] text-[#333333]'
                    }`}
                  >
                    r/{sub}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  soundFX.playTap(540);
                  loadLiveTrending(false);
                }}
                disabled={loadingTrending}
                title={lang === 'zh' ? '刷新即時活躍看板' : 'Refresh Live Communities'}
                className="min-h-[30px] px-2 py-1 rounded-lg bg-[#EFEAF8] hover:bg-[#E3DBF4] text-[#46178F] text-xs font-black inline-flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loadingTrending ? 'animate-spin' : ''}`}
                />
                <span>{lang === 'zh' ? '即時熱版' : 'Live'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRandomRadarDig}
              disabled={loadingPosts}
              className="min-h-[30px] px-3 py-1 rounded-lg bg-[#46178F] hover:bg-[#531FA5] text-white text-xs font-black flex items-center gap-1.5 shadow-[0_2px_0_#2D0E5E] active:translate-y-[1px]"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '全站隨機挖寶' : 'Random Dig'}</span>
            </button>
          </div>

          {/* Era Window Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ERA_FILTERS.map((era) => {
              const isActive = eraFilter === era.key;
              return (
                <button
                  key={era.key}
                  type="button"
                  onClick={() => {
                    soundFX.playTap(520);
                    setEraFilter(era.key);
                    fetchRedditPosts(subreddit, query, era.key);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    isActive
                      ? 'bg-[#46178F] text-white'
                      : 'bg-[#F3F1F8] text-[#666666] hover:text-[#222222]'
                  }`}
                >
                  {lang === 'zh' ? era.labelZh : era.labelEn}
                </button>
              );
            })}
          </div>

          {searchError && (
            <div className="p-2.5 rounded-xl bg-[#FDE8EC] text-xs font-bold text-[#B0102A]">
              {searchError}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
          {loadingPosts && posts.length === 0 ? (
            <div className="p-8 text-center text-base font-black text-white">
              {lang === 'zh' ? '載入全站真實 Reddit 貼文中...' : 'Loading live Reddit posts...'}
            </div>
          ) : (
            posts.map((post) => {
              const isSelected = activePost?.id === post.id;
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    soundFX.playTap(520);
                    setActivePost(post);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all flex gap-3 items-center ${
                    isSelected
                      ? 'bg-[#1368CE] text-white shadow-[0_5px_0_#0D4994]'
                      : 'bg-white hover:bg-[#FAF9FD] text-[#222222] shadow-[0_5px_0_rgba(0,0,0,0.16)]'
                  }`}
                >
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 bg-[#F3F1F8]"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-mono-num font-bold flex items-center gap-2 ${
                        isSelected ? 'text-white/90' : 'text-[#666666]'
                      }`}
                    >
                      <span
                        className={
                          isSelected ? 'text-white font-black' : 'text-[#46178F] font-black'
                        }
                      >
                        {post.subreddit}
                      </span>
                      <span>·</span>
                      <span
                        className={
                          isSelected ? 'text-white' : 'text-[#B58200] font-black'
                        }
                      >
                        ▲ {post.ups.toLocaleString()}
                      </span>
                      <span>·</span>
                      <span>{post.postedDate}</span>
                    </div>
                    <h3 className="text-sm font-black mt-0.5 line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Post & Real Comments Inspector */}
      <div className="lg:col-span-6 min-h-0 bg-white rounded-3xl p-5 text-[#222222] shadow-[0_6px_0_rgba(0,0,0,0.18)] flex flex-col">
        {activePost ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center justify-between gap-3 pb-3">
              <span className="text-xs md:text-sm font-mono-num font-black text-[#46178F]">
                {activePost.subreddit} · ▲ {activePost.ups.toLocaleString()} · {activePost.postedDate}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isCurrentSaved}
                  onClick={() => onSavePostToVault(activePost)}
                  className={`min-h-[38px] px-3.5 py-1 rounded-xl text-xs md:text-sm font-black flex items-center gap-1.5 transition-all ${
                    isCurrentSaved
                      ? 'bg-[#E8F7E4] text-[#195E07]'
                      : 'bg-[#26890C] hover:bg-[#2C9C0F] text-white shadow-[0_3px_0_#195E07] active:translate-y-[2px]'
                  }`}
                >
                  {isCurrentSaved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4" />
                  )}
                  <span>
                    {isCurrentSaved
                      ? lang === 'zh'
                        ? '已收藏'
                        : 'Saved'
                      : lang === 'zh'
                      ? '收藏貼文'
                      : 'Collect'}
                  </span>
                </button>
                <a
                  href={activePost.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[38px] px-3.5 py-1 rounded-xl bg-[#46178F] hover:bg-[#531FA5] text-white text-xs md:text-sm font-black inline-flex items-center gap-1.5 shadow-[0_3px_0_#2D0E5E]"
                >
                  <span>Reddit</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
              <h2 className="text-lg font-black text-[#222222] leading-snug">
                {activePost.title}
              </h2>

              {activePost.imageUrl && (
                <img
                  src={activePost.imageUrl}
                  alt={activePost.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-72 object-contain rounded-2xl bg-[#F3F1F8]"
                />
              )}

              {activePost.selftext && (
                <p className="text-sm font-medium text-[#444444] leading-relaxed whitespace-pre-line">
                  {activePost.selftext}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-base font-bold text-[#666666] py-12 text-center">
            {lang === 'zh' ? '請從左側點選文章檢視。' : 'Select a post to inspect.'}
          </p>
        )}
      </div>
    </div>
  );
};
