import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Match, MatchInput, MatchNote, normalizeMatchNote } from '../types/match';
import { normalizeDeckName } from '../utils/deckName';
import { buildMatch, loadMatches, saveMatches } from '../storage/matches';

interface MatchContextValue {
  matches: Match[];
  loading: boolean;
  addMatch: (input: MatchInput) => Promise<Match>;
  updateMatch: (id: string, input: MatchInput) => Promise<Match | null>;
  updateNotes: (id: string, note: MatchNote) => Promise<Match | null>;
  deleteMatch: (id: string) => Promise<void>;
  getMatch: (id: string) => Match | undefined;
  refresh: () => Promise<void>;
}

const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (next: Match[]) => {
    const sorted = [...next].sort((a, b) => b.date.localeCompare(a.date));
    setMatches(sorted);
    await saveMatches(sorted);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadMatches();
    setMatches(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMatch = useCallback(
    async (input: MatchInput) => {
      const match = buildMatch(input);
      await persist([match, ...matches]);
      return match;
    },
    [matches, persist],
  );

  const updateMatch = useCallback(
    async (id: string, input: MatchInput) => {
      const existing = matches.find((m) => m.id === id);
      if (!existing) return null;
      const updated: Match = {
        ...existing,
        ...input,
        id,
        ownDeck: normalizeDeckName(input.ownDeck ?? existing.ownDeck),
        ownLegend: normalizeDeckName(input.ownLegend ?? existing.ownLegend),
        opponentDeck: normalizeDeckName(
          input.opponentDeck ?? existing.opponentDeck,
        ),
        opponentLegend: normalizeDeckName(
          input.opponentLegend ?? existing.opponentLegend,
        ),
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      await persist(matches.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    [matches, persist],
  );

  const updateNotes = useCallback(
    async (id: string, note: MatchNote) => {
      const existing = matches.find((m) => m.id === id);
      if (!existing) return null;
      const updated: Match = {
        ...existing,
        note: normalizeMatchNote(note),
        updatedAt: new Date().toISOString(),
      };
      await persist(matches.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    [matches, persist],
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      await persist(matches.filter((m) => m.id !== id));
    },
    [matches, persist],
  );

  const getMatch = useCallback(
    (id: string) => matches.find((m) => m.id === id),
    [matches],
  );

  const value = useMemo(
    () => ({
      matches,
      loading,
      addMatch,
      updateMatch,
      updateNotes,
      deleteMatch,
      getMatch,
      refresh,
    }),
    [
      matches,
      loading,
      addMatch,
      updateMatch,
      updateNotes,
      deleteMatch,
      getMatch,
      refresh,
    ],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatches() {
  const ctx = useContext(MatchContext);
  if (!ctx) {
    throw new Error('useMatches must be used within MatchProvider');
  }
  return ctx;
}
