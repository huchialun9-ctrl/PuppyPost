import 'dotenv/config';
import http from 'http';
import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const USER_AGENT = 'web:puppypost.arcade.game:v2.0.0 (by /u/puppypost_dev)';

interface RedditSession {
  accessToken: string;
  username: string;
  iconUrl: string;
  expiresAt: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ServerAnnouncement {
  id: string;
  playerName: string;
  actionType:
    | 'chest_open'
    | 'quiz_answer'
    | 'quiz_win'
    | 'vault_collect'
    | 'mission_claim'
    | 'era_master'
    | 'player_join';
  messageZh: string;
  messageEn: string;
  createdAt: number;
}

const sessions = new Map<string, RedditSession>();
const pendingStates = new Map<string, string>();
const redditCache = new Map<string, CacheEntry<any>>();
const seenAnnouncementIds = new Set<string>();
let serverAnnouncements: ServerAnnouncement[] = [];

let appTokenCache: { token: string; expiresAt: number } | null = null;

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

function getSession(req: Request): { sessionId: string; session: RedditSession } | null {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies['pp_reddit_sid'];
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session || Date.now() > session.expiresAt) {
    if (session) sessions.delete(sid);
    return null;
  }
  return { sessionId: sid, session };
}

function getRedirectUri(req: Request): string {
  const base = (process.env.APP_URL || '').replace(/\/+$/, '');
  if (base && base !== 'MY_APP_URL') {
    return `${base}/auth/reddit/callback`;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/auth/reddit/callback`;
}

async function getAppAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID || '';
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return null;

  if (appTokenCache && Date.now() < appTokenCache.expiresAt - 30_000) {
    return appTokenCache.token;
  }

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const resp = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: 'grant_type=client_credentials',
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    appTokenCache = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
    };
    return appTokenCache.token;
  } catch {
    return null;
  }
}

function extractPostImage(postData: Record<string, any>): string | null {
  try {
    const previewUrl = postData?.preview?.images?.[0]?.source?.url;
    if (typeof previewUrl === 'string' && previewUrl.startsWith('http')) {
      return previewUrl.replace(/&amp;/g, '&');
    }
    if (
      typeof postData?.url_overridden_by_dest === 'string' &&
      /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(postData.url_overridden_by_dest)
    ) {
      return postData.url_overridden_by_dest;
    }
    if (
      typeof postData?.url === 'string' &&
      /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(postData.url)
    ) {
      return postData.url;
    }
    if (
      typeof postData?.thumbnail === 'string' &&
      postData.thumbnail.startsWith('http')
    ) {
      return postData.thumbnail;
    }
  } catch {
    // ignore
  }
  return null;
}

function mapRedditPost(p: Record<string, any>) {
  const createdUtc = Number(p.created_utc || 0);
  const createdDate = createdUtc
    ? new Date(createdUtc * 1000).toISOString().slice(0, 10)
    : '';
  const ups = Number(p.ups ?? p.score ?? 0);
  const recommendedTier =
    ups >= 40000
      ? 'legendary'
      : ups >= 10000
      ? 'mystic'
      : ups >= 2000
      ? 'bronze'
      : 'daily';

  const permalinkPath =
    typeof p.permalink === 'string' && p.permalink.startsWith('/')
      ? `https://www.reddit.com${p.permalink}`
      : `https://www.reddit.com/r/${p.subreddit}/comments/${p.id}/`;

  return {
    id: String(p.id),
    fullname: String(p.name || `t3_${p.id}`),
    subreddit: `r/${p.subreddit}`,
    title: String(p.title || ''),
    author: p.author ? `u/${p.author}` : 'u/[deleted]',
    selftext:
      p.selftext && p.selftext !== '[removed]' && p.selftext !== '[deleted]'
        ? String(p.selftext)
        : '',
    ups,
    postedDate: createdDate,
    permalink: permalinkPath,
    imageUrl: extractPostImage(p),
    recommendedTier,
  };
}

/**
 * Fetches 100% real Reddit posts across any subreddit (or 'all') and era (2012-2015, 2016-2020, 2021-now).
 */
async function fetchLiveSubredditPosts(options: {
  subreddit: string;
  q?: string;
  sort?: string;
  t?: string;
  after?: string;
  before?: string;
  limit?: number;
  userToken?: string;
}) {
  const rawSub = options.subreddit.replace(/^r\//i, '').replace(/[^a-zA-Z0-9_]/g, '');
  const isAllReddit =
    !rawSub || rawSub.toLowerCase() === 'all' || rawSub.toLowerCase() === 'popular';
  const cleanSub = isAllReddit ? 'all' : rawSub;

  const q = (options.q || '').trim();
  const sort = options.sort || 'top';
  const t = options.t || 'all';
  const after = (options.after || '').trim();
  const before = (options.before || '').trim();
  const limit = Math.min(Math.max(options.limit || 15, 1), 25);

  const cacheKey = `posts:${cleanSub}:${q}:${sort}:${t}:${after}:${before}:${limit}:${Boolean(
    options.userToken
  )}`;
  const cached = redditCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as ReturnType<typeof mapRedditPost>[];
  }

  // 1. Official Reddit OAuth API (when configured and no specific historical era window)
  const token = options.userToken || (await getAppAccessToken());
  if (token && !after && !before) {
    const endpoint = q
      ? `/r/${encodeURIComponent(cleanSub)}/search.json?q=${encodeURIComponent(
          q
        )}&restrict_sr=1&sort=${encodeURIComponent(sort)}&t=${encodeURIComponent(
          t
        )}&limit=${limit}&raw_json=1`
      : `/r/${encodeURIComponent(cleanSub)}/${encodeURIComponent(
          sort === 'new' ? 'new' : sort === 'hot' ? 'hot' : 'top'
        )}.json?t=${encodeURIComponent(t)}&limit=${limit}&raw_json=1`;

    try {
      const resp = await fetch(`https://oauth.reddit.com${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });
      if (resp.ok) {
        const json = (await resp.json()) as {
          data?: { children?: Array<{ data: Record<string, any> }> };
        };
        const mapped = (json?.data?.children || [])
          .filter((c) => c?.data && !c.data.stickied && !c.data.over_18)
          .map((c) => mapRedditPost(c.data));
        if (mapped.length > 0) {
          redditCache.set(cacheKey, { data: mapped, expiresAt: Date.now() + 180_000 });
          return mapped;
        }
      }
    } catch {
      // fall through
    }
  }

  // 2. Real Reddit Index (Arctic Shift API - supports any subreddit & real historical eras)
  const daysAgo = (days: number) =>
    new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

  const defaultAfter =
    after ||
    (isAllReddit
      ? daysAgo(2)
      : t === 'day'
      ? daysAgo(14)
      : t === 'month'
      ? daysAgo(60)
      : daysAgo(180));

  const queryArcticShift = async (afterStr: string, beforeStr: string) => {
    const params = new URLSearchParams({
      after: afterStr,
      limit: String(Math.max(limit + 15, 30)),
    });
    if (!isAllReddit) {
      params.set('subreddit', cleanSub);
    }
    if (beforeStr) {
      params.set('before', beforeStr);
    }
    if (q) {
      params.set('query', q);
    }
    const url = `https://arctic-shift.photon-reddit.com/api/posts/search?${params.toString()}`;
    let resp = await fetch(url, { headers: { Accept: 'application/json' } });

    if (resp.status === 422 || resp.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      resp = await fetch(url, { headers: { Accept: 'application/json' } });
    }
    return resp;
  };

  let resp = await queryArcticShift(defaultAfter, before);
  // If an explicit wide multi-year window timed out, narrow to the core window of that era
  if (!resp.ok && after && before) {
    const startYear = Number(after.slice(0, 4));
    const endYear = Number(before.slice(0, 4));
    if (!Number.isNaN(startYear) && !Number.isNaN(endYear) && endYear - startYear >= 2) {
      const midYear = Math.floor((startYear + endYear) / 2);
      await new Promise((resolve) => setTimeout(resolve, 350));
      resp = await queryArcticShift(`${midYear}-01-01`, `${endYear}-12-31`);
    }
  } else if (!resp.ok && after && !before) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    resp = await queryArcticShift(daysAgo(180), '');
  }

  if (resp.ok) {
    const json = (await resp.json()) as { data?: Array<Record<string, any>> };
    let list = (json.data || [])
      .filter(
        (p) =>
          p &&
          !p.over_18 &&
          !p.stickied &&
          p.title &&
          p.created_utc &&
          p.removed_by_category == null &&
          p.author &&
          p.author !== '[deleted]'
      )
      .map((p) => mapRedditPost(p));

    if (sort === 'top') {
      list.sort((a, b) => b.ups - a.ups);
    }
    list = list.slice(0, limit);

    if (list.length > 0) {
      redditCache.set(cacheKey, { data: list, expiresAt: Date.now() + 300_000 });
      return list;
    }
  }

  throw new Error(`No live posts returned for r/${cleanSub}. Try another subreddit or query.`);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/reddit/status', async (_req: Request, res: Response) => {
    try {
      const posts = await fetchLiveSubredditPosts({
        subreddit: 'pics',
        sort: 'top',
        t: 'month',
        limit: 5,
      });
      return res.json({
        live: posts.length > 0,
        mode: 'auto_live',
      });
    } catch {
      return res.json({
        live: false,
        mode: 'offline',
      });
    }
  });

  app.get('/api/auth/reddit/url', (req: Request, res: Response) => {
    const clientId = process.env.REDDIT_CLIENT_ID || '';
    const clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    const redirectUri = getRedirectUri(req);

    if (!clientId || !clientSecret) {
      return res.json({ configured: false, redirectUri, url: null });
    }

    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, redirectUri);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      state,
      redirect_uri: redirectUri,
      duration: 'temporary',
      scope: 'identity read submit',
    });

    res.json({
      configured: true,
      redirectUri,
      url: `https://www.reddit.com/api/v1/authorize?${params.toString()}`,
    });
  });

  app.get(['/auth/reddit/callback', '/auth/reddit/callback/'], async (req: Request, res: Response) => {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const errorParam = String(req.query.error || '');

    if (errorParam || !code) {
      return res.status(400).send(`
        <html>
          <body style="font-family:sans-serif;background:#46178F;color:#fff;padding:24px;">
            <p>Reddit authorization cancelled (${errorParam || 'missing code'}).</p>
            <script>setTimeout(() => window.close(), 1200);</script>
          </body>
        </html>
      `);
    }

    const clientId = process.env.REDDIT_CLIENT_ID || '';
    const clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    const redirectUri = pendingStates.get(state) || getRedirectUri(req);
    pendingStates.delete(state);

    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResp = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      const tokenJson = (await tokenResp.json()) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
      };

      if (!tokenResp.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error || 'Token exchange failed');
      }

      const meResp = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'User-Agent': USER_AGENT,
        },
      });
      const meJson = (await meResp.json()) as { name?: string; icon_img?: string };

      const sid = crypto.randomBytes(24).toString('hex');
      const username = meJson.name || 'redditor';
      const iconUrl = (meJson.icon_img || '').split('?')[0];
      const expiresInMs = (tokenJson.expires_in || 3600) * 1000;

      sessions.set(sid, {
        accessToken: tokenJson.access_token,
        username,
        iconUrl,
        expiresAt: Date.now() + expiresInMs,
      });

      res.cookie('pp_reddit_sid', sid, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: expiresInMs,
        path: '/',
      });

      return res.send(`
        <html>
          <body style="font-family:sans-serif;background:#46178F;color:#fff;padding:24px;text-align:center;">
            <h2>Connected u/${username}</h2>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'REDDIT_OAUTH_SUCCESS', username: ${JSON.stringify(username)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      return res.status(500).send(`
        <html>
          <body style="font-family:sans-serif;background:#46178F;color:#fff;padding:24px;">
            <p>${String(err?.message || 'Failed to authenticate')}</p>
          </body>
        </html>
      `);
    }
  });

  app.get('/api/reddit/me', (req: Request, res: Response) => {
    const configured = Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
    const active = getSession(req);
    if (!active) {
      return res.json({
        connected: false,
        configured,
        redirectUri: getRedirectUri(req),
      });
    }
    return res.json({
      connected: true,
      configured,
      username: active.session.username,
      iconUrl: active.session.iconUrl,
      redirectUri: getRedirectUri(req),
    });
  });

  app.post('/api/reddit/disconnect', (req: Request, res: Response) => {
    const active = getSession(req);
    if (active) sessions.delete(active.sessionId);
    res.clearCookie('pp_reddit_sid', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    res.json({ ok: true });
  });

  // Search ANY Reddit Subreddit + Optional Era Window (after / before)
  app.get('/api/reddit/search', async (req: Request, res: Response) => {
    const rawSub =
      String(req.query.subreddit || 'pics')
        .replace(/^r\//i, '')
        .replace(/[^a-zA-Z0-9_]/g, '') || 'pics';
    const q = String(req.query.q || '').trim();
    const sort = String(req.query.sort || 'top');
    const t = String(req.query.t || 'all');
    const after = String(req.query.after || '').trim();
    const before = String(req.query.before || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 25);

    const active = getSession(req);

    try {
      const posts = await fetchLiveSubredditPosts({
        subreddit: rawSub,
        q,
        sort,
        t,
        after,
        before,
        limit,
        userToken: active?.session.accessToken,
      });

      return res.json({
        subreddit: `r/${rawSub}`,
        posts,
      });
    } catch (err: any) {
      return res.status(502).json({
        error: err?.message || 'Unable to reach Reddit API right now.',
      });
    }
  });

  // Diverse Reddit-wide Quiz Batch (5 real live image posts across general Reddit communities)
  app.get('/api/reddit/quiz-batch', async (req: Request, res: Response) => {
    const subs = [
      'pics',
      'Damnthatsinteresting',
      'funny',
      'mildlyinteresting',
      'nextfuckinglevel',
      'aww',
      'gaming',
    ];
    const active = getSession(req);

    try {
      const pickedSubs = [...subs].sort(() => Math.random() - 0.5).slice(0, 4);
      const pool: ReturnType<typeof mapRedditPost>[] = [];

      for (const sub of pickedSubs) {
        try {
          const items = await fetchLiveSubredditPosts({
            subreddit: sub,
            sort: 'top',
            t: 'month',
            limit: 12,
            userToken: active?.session.accessToken,
          });
          for (const p of items) {
            if (p.imageUrl && p.title) {
              pool.push(p);
            }
          }
        } catch {
          // continue to next subreddit
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      if (pool.length === 0) {
        return res.status(502).json({ error: 'Unable to fetch live Reddit quiz posts.' });
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const selected: typeof pool = [];
      const seenIds = new Set<string>();

      for (const item of shuffled) {
        if (selected.length >= 5) break;
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          selected.push(item);
        }
      }

      const allSubLabels = subs.map((s) => `r/${s}`);
      const rounds = selected.map((post) => {
        const distractors = allSubLabels
          .filter((label) => label.toLowerCase() !== post.subreddit.toLowerCase())
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const options = [post.subreddit, ...distractors].sort(() => Math.random() - 0.5);
        return {
          post,
          options,
          correctOption: post.subreddit,
        };
      });

      return res.json({ rounds });
    } catch (err: any) {
      return res.status(502).json({
        error: err?.message || 'Unable to generate live Reddit quiz batch.',
      });
    }
  });

  // Live All-Reddit Trending Active Subreddits (100% derived from live real-time posts)
  app.get('/api/reddit/trending', async (_req: Request, res: Response) => {
    const cacheKey = 'trending:all';
    const cached = redditCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    try {
      const posts = await fetchLiveSubredditPosts({
        subreddit: 'all',
        sort: 'top',
        t: 'day',
        limit: 25,
      });

      const communityPosts = posts.filter((p) => {
        const subName = p.subreddit.replace(/^r\//i, '');
        return (
          Boolean(subName) &&
          subName.toLowerCase() !== 'all' &&
          !subName.toLowerCase().startsWith('u_')
        );
      });

      const subCounts = new Map<string, number>();
      for (const p of communityPosts) {
        const subName = p.subreddit.replace(/^r\//i, '');
        subCounts.set(subName, (subCounts.get(subName) || 0) + 1);
      }

      const trendingSubreddits = [...subCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
        .slice(0, 8);

      const payload = {
        subreddits: trendingSubreddits,
        posts: (communityPosts.length > 0 ? communityPosts : posts).slice(0, 15),
      };
      redditCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 180_000 });
      return res.json(payload);
    } catch (err: any) {
      return res.status(502).json({
        error: err?.message || 'Unable to fetch live trending Reddit communities.',
      });
    }
  });

  // Server-authoritative Shared Announcement Feed & WebSocket Broadcast
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/announcements' });

  const broadcastWs = (payload: Record<string, any>) => {
    const encoded = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(encoded);
      }
    }
  };

  const ingestAnnouncement = (raw: Partial<ServerAnnouncement>): ServerAnnouncement | null => {
    const id = String(raw.id || '').trim();
    const playerName = String(raw.playerName || '').trim().slice(0, 32);
    const messageZh = String(raw.messageZh || '').trim().slice(0, 220);
    const messageEn = String(raw.messageEn || '').trim().slice(0, 220);
    const actionType = raw.actionType;

    if (!id || !playerName || !messageZh || !actionType) return null;
    if (seenAnnouncementIds.has(id)) return null;

    const entry: ServerAnnouncement = {
      id,
      playerName,
      actionType,
      messageZh,
      messageEn: messageEn || messageZh,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    };

    seenAnnouncementIds.add(id);
    serverAnnouncements = [entry, ...serverAnnouncements].slice(0, 40);
    broadcastWs({ type: 'announcement:new', announcement: entry });
    return entry;
  };

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'init',
        announcements: serverAnnouncements,
      })
    );

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          type?: string;
          announcement?: Partial<ServerAnnouncement>;
        };
        if (msg.type === 'announcement:create' && msg.announcement) {
          ingestAnnouncement(msg.announcement);
        }
      } catch {
        // ignore malformed frames
      }
    });
  });

  app.get('/api/server/announcements', (_req: Request, res: Response) => {
    res.json({
      announcements: serverAnnouncements,
    });
  });

  app.post('/api/server/announcements', (req: Request, res: Response) => {
    const body = req.body as Partial<ServerAnnouncement>;
    const created = ingestAnnouncement(body);
    if (!created) {
      return res.json({ ok: true, duplicateOrIgnored: true });
    }
    return res.status(201).json({ ok: true, announcement: created });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PuppyPost full-stack HTTP+WS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
