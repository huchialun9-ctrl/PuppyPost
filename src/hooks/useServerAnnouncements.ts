import { useState, useEffect, useCallback, useRef } from 'react';

export type ServerActionType =
  | 'chest_open'
  | 'quiz_answer'
  | 'quiz_win'
  | 'vault_collect'
  | 'mission_claim'
  | 'era_master'
  | 'player_join';

export interface ServerAnnouncement {
  id: string;
  playerName: string;
  actionType: ServerActionType;
  messageZh: string;
  messageEn: string;
  createdAt: number;
}

function createSessionPlayerName(): string {
  const code = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `玩家#${code}`;
}

export function useServerAnnouncements() {
  const [announcements, setAnnouncements] = useState<ServerAnnouncement[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [playerName, setPlayerNameState] = useState<string>(() =>
    createSessionPlayerName()
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hasAnnouncedJoinRef = useRef<boolean>(false);
  const playerNameRef = useRef<string>(playerName);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  const setPlayerName = useCallback((name: string) => {
    const cleaned = name.trim().slice(0, 24);
    if (!cleaned) return;
    setPlayerNameState(cleaned);
  }, []);

  const mergeAnnouncements = useCallback((incoming: ServerAnnouncement[]) => {
    setAnnouncements((prev) => {
      const next = [...prev];
      for (const item of incoming) {
        if (!item?.id || seenIdsRef.current.has(item.id)) continue;
        seenIdsRef.current.add(item.id);
        next.push(item);
      }
      next.sort((a, b) => b.createdAt - a.createdAt);
      return next.slice(0, 40);
    });
  }, []);

  const publishAnnouncement = useCallback(
    (payload: {
      actionType: ServerActionType;
      messageZh: string;
      messageEn: string;
      overridePlayerName?: string;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: ServerAnnouncement = {
        id,
        playerName: (payload.overridePlayerName || playerName).trim().slice(0, 24),
        actionType: payload.actionType,
        messageZh: payload.messageZh,
        messageEn: payload.messageEn,
        createdAt: Date.now(),
      };

      mergeAnnouncements([entry]);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'announcement:create', announcement: entry }));
      } else {
        fetch('/api/server/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {});
      }
    },
    [mergeAnnouncements, playerName]
  );

  useEffect(() => {
    let unmounted = false;
    let attempt = 0;

    fetch('/api/server/announcements')
      .then((r) => r.json())
      .then((data: { announcements?: ServerAnnouncement[] }) => {
        if (unmounted) return;
        if (Array.isArray(data.announcements)) {
          mergeAnnouncements(data.announcements);
        }
      })
      .catch(() => {});

    const connect = () => {
      if (unmounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/announcements`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          attempt = 0;
          setWsConnected(true);

          if (!hasAnnouncedJoinRef.current) {
            hasAnnouncedJoinRef.current = true;
            const currentName = playerNameRef.current;
            const joinId = `join-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const joinEntry: ServerAnnouncement = {
              id: joinId,
              playerName: currentName,
              actionType: 'player_join',
              messageZh: `${currentName} 開啟了今日一玩考古局`,
              messageEn: `${currentName} started a fresh Daily Run`,
              createdAt: Date.now(),
            };
            mergeAnnouncements([joinEntry]);
            ws.send(
              JSON.stringify({ type: 'announcement:create', announcement: joinEntry })
            );
          }
        };

        ws.onmessage = (evt) => {
          if (unmounted) return;
          try {
            const msg = JSON.parse(evt.data) as {
              type?: string;
              announcements?: ServerAnnouncement[];
              announcement?: ServerAnnouncement;
            };
            if (msg.type === 'init') {
              if (Array.isArray(msg.announcements)) {
                mergeAnnouncements(msg.announcements);
              }
            } else if (msg.type === 'announcement:new' && msg.announcement) {
              mergeAnnouncements([msg.announcement]);
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setWsConnected(false);
          wsRef.current = null;
          attempt += 1;
          const delay = Math.min(10000, 1500 * Math.pow(1.4, attempt));
          reconnectTimerRef.current = window.setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mergeAnnouncements]);

  return {
    announcements,
    wsConnected,
    playerName,
    setPlayerName,
    publishAnnouncement,
  };
}
