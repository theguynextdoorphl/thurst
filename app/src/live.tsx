import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { EV, type ChatMessage, type Decision, type SessionState } from '@thurst/shared';
import { API_URL } from './api';
import { useSession } from './session';

type Coords = { lat: number; lng: number };
type Ack = { ok?: true; error?: string };

interface Live {
  connected: boolean;
  state: SessionState;
  /** Latest "1 minute remaining" notice for the current chat. */
  warning: { matchId: string; message: string } | null;
  setAvailable: (available: boolean, coords?: Coords) => Promise<void>;
  decide: (matchId: string, decision: Decision) => Promise<void>;
  sendText: (matchId: string, text: string) => Promise<void>;
  sendLocation: (matchId: string, coords: Coords) => Promise<void>;
}

const EMPTY: SessionState = { available: false, match: null, pendingRating: null };
const Ctx = createContext<Live | null>(null);

const buzz = (type: Haptics.NotificationFeedbackType) => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(type).catch(() => {});
};

export function LiveProvider({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const socket = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<SessionState>(EMPTY);
  const [warning, setWarning] = useState<Live['warning']>(null);

  useEffect(() => {
    if (!token) return;
    const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.current = s;
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on(EV.state, (next: SessionState) => {
      setState((prev) => {
        if (next.match?.phase === 'review' && prev.match?.matchId !== next.match.matchId) {
          buzz(Haptics.NotificationFeedbackType.Success);
        }
        return next;
      });
    });
    s.on(EV.message, (msg: ChatMessage) => {
      setState((prev) =>
        prev.match?.matchId === msg.matchId
          ? { ...prev, match: { ...prev.match, messages: [...prev.match.messages, msg] } }
          : prev,
      );
    });
    s.on(EV.warning, (w: { matchId: string; message: string }) => {
      setWarning(w);
      buzz(Haptics.NotificationFeedbackType.Warning);
    });
    return () => {
      s.disconnect();
      socket.current = null;
      setState(EMPTY);
      setConnected(false);
    };
  }, [token]);

  // Keep the server's idea of where we are fresh while we're in the queue or a match.
  const tracking = state.available || !!state.match;
  useEffect(() => {
    if (!tracking) return;
    let sub: Location.LocationSubscription | undefined;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 100 }, (p) => {
      socket.current?.emit(EV.updateLocation, { lat: p.coords.latitude, lng: p.coords.longitude });
    })
      .then((s) => (sub = s))
      .catch(() => {});
    return () => sub?.remove();
  }, [tracking]);

  const emit = useCallback(
    (event: string, data: unknown) =>
      new Promise<void>((resolve, reject) => {
        const s = socket.current;
        if (!s?.connected) return reject(new Error("You're offline. Reconnecting…"));
        s.timeout(10_000).emit(event, data, (err: Error | null, res: Ack) => {
          if (err) reject(new Error('The server did not answer. Try again.'));
          else if (res?.error) reject(new Error(res.error));
          else resolve();
        });
      }),
    [],
  );

  const value = useMemo<Live>(
    () => ({
      connected,
      state,
      warning,
      setAvailable: (available, coords) => emit(EV.setAvailable, { available, coords }),
      decide: (matchId, decision) => emit(EV.decide, { matchId, decision }),
      sendText: (matchId, text) => emit(EV.send, { matchId, kind: 'text', body: text }),
      sendLocation: (matchId, coords) => emit(EV.send, { matchId, kind: 'location', body: coords }),
    }),
    [connected, state, warning, emit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): Live {
  const l = useContext(Ctx);
  if (!l) throw new Error('useLive outside LiveProvider');
  return l;
}

/** Asks for location permission and returns the current position, or throws a friendly error. */
export async function currentCoords(): Promise<Coords> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('Thurst needs your location to find matches near you. You can allow it in Settings.');
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
