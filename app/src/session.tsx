import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import type { Me } from '@thurst/shared';
import { api, ApiError, setApiToken } from './api';

const KEY = 'thurst.session';

// SecureStore is native only; the web build keeps the token in memory.
const store = {
  get: () => (Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(KEY, v)),
  clear: () => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(KEY)),
};

interface Session {
  ready: boolean;
  token: string | null;
  me: Me | null;
  signIn: (token: string, me: Me) => Promise<void>;
  signOut: () => Promise<void>;
  setMe: (me: Me) => void;
  /** Loads `me` again, e.g. after the server was unreachable at launch. */
  reload: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await store.get();
      if (saved) {
        setApiToken(saved);
        try {
          setMe(await api<Me>('GET', '/me'));
          setToken(saved);
        } catch (e) {
          // Keep the token if the server is just unreachable; drop it if it was rejected.
          if (e instanceof ApiError && e.status === 401) {
            setApiToken(null);
            await store.clear();
          } else {
            setToken(saved);
          }
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (t: string, m: Me) => {
    setApiToken(t);
    await store.set(t);
    setToken(t);
    setMe(m);
  }, []);

  const signOut = useCallback(async () => {
    setApiToken(null);
    await store.clear();
    setToken(null);
    setMe(null);
  }, []);

  const reload = useCallback(async () => {
    setMe(await api<Me>('GET', '/me'));
  }, []);

  const value = useMemo(
    () => ({ ready, token, me, signIn, signOut, setMe, reload }),
    [ready, token, me, signIn, signOut, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

/** For screens behind the auth gate, where `me` is always loaded. */
export function useMe(): Me {
  const { me } = useSession();
  if (!me) throw new Error('Not signed in');
  return me;
}
