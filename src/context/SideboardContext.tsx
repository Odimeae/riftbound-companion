import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DeckSideboard,
  MatchupPlan,
  clampSideboardCards,
} from '../types/sideboard';
import {
  MatchupPlanInput,
  buildMatchupPlan,
  buildSideboard,
  loadMatchupPlans,
  loadSideboards,
  saveMatchupPlans,
  saveSideboards,
} from '../storage/sideboard';
import { deckLookupKey, normalizeDeckName } from '../utils/deckName';

interface SideboardContextValue {
  sideboards: DeckSideboard[];
  plans: MatchupPlan[];
  loading: boolean;
  getSideboardForDeck: (deckName: string) => DeckSideboard | undefined;
  upsertSideboardCards: (deckName: string, cards: string[]) => Promise<DeckSideboard>;
  ensureSideboard: (deckName: string) => Promise<DeckSideboard>;
  deleteSideboard: (id: string) => Promise<void>;
  getPlan: (id: string) => MatchupPlan | undefined;
  plansForDeck: (deckName: string) => MatchupPlan[];
  savePlan: (input: MatchupPlanInput) => Promise<MatchupPlan>;
  deletePlan: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SideboardContext = createContext<SideboardContextValue | null>(null);

function deckKey(name: string): string {
  return deckLookupKey(name);
}

export function SideboardProvider({ children }: { children: React.ReactNode }) {
  const [sideboards, setSideboards] = useState<DeckSideboard[]>([]);
  const [plans, setPlans] = useState<MatchupPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const persistSideboards = useCallback(async (next: DeckSideboard[]) => {
    setSideboards(next);
    await saveSideboards(next);
  }, []);

  const persistPlans = useCallback(async (next: MatchupPlan[]) => {
    const sorted = [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setPlans(sorted);
    await saveMatchupPlans(sorted);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [sb, pl] = await Promise.all([loadSideboards(), loadMatchupPlans()]);
    setSideboards(sb);
    setPlans(pl);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getSideboardForDeck = useCallback(
    (deckName: string) => {
      const key = deckKey(deckName);
      if (!key) return undefined;
      return sideboards.find((s) => deckKey(s.deckName) === key);
    },
    [sideboards],
  );

  const upsertSideboardCards = useCallback(
    async (deckName: string, cards: string[]) => {
      const trimmed = normalizeDeckName(deckName) || 'Untitled Deck';
      const existing = sideboards.find((s) => deckKey(s.deckName) === deckKey(trimmed));
      const next = buildSideboard(trimmed, clampSideboardCards(cards), existing?.id);
      if (existing) {
        await persistSideboards(
          sideboards.map((s) => (s.id === existing.id ? next : s)),
        );
      } else {
        await persistSideboards([next, ...sideboards]);
      }
      return next;
    },
    [sideboards, persistSideboards],
  );

  const ensureSideboard = useCallback(
    async (deckName: string) => {
      const existing = getSideboardForDeck(deckName);
      if (existing) return existing;
      return upsertSideboardCards(deckName, []);
    },
    [getSideboardForDeck, upsertSideboardCards],
  );

  const deleteSideboard = useCallback(
    async (id: string) => {
      await persistSideboards(sideboards.filter((s) => s.id !== id));
    },
    [sideboards, persistSideboards],
  );

  const getPlan = useCallback(
    (id: string) => plans.find((p) => p.id === id),
    [plans],
  );

  const plansForDeck = useCallback(
    (deckName: string) => {
      const key = deckKey(deckName);
      if (!key) return [];
      return plans.filter((p) => deckKey(p.deckName) === key);
    },
    [plans],
  );

  const savePlan = useCallback(
    async (input: MatchupPlanInput) => {
      const existing = input.id ? plans.find((p) => p.id === input.id) : undefined;
      const plan = buildMatchupPlan({
        ...input,
        id: existing?.id ?? input.id,
        createdAt: existing?.createdAt,
      });
      if (existing) {
        await persistPlans(plans.map((p) => (p.id === existing.id ? plan : p)));
      } else {
        await persistPlans([plan, ...plans]);
      }
      return plan;
    },
    [plans, persistPlans],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      await persistPlans(plans.filter((p) => p.id !== id));
    },
    [plans, persistPlans],
  );

  const value = useMemo(
    () => ({
      sideboards,
      plans,
      loading,
      getSideboardForDeck,
      upsertSideboardCards,
      ensureSideboard,
      deleteSideboard,
      getPlan,
      plansForDeck,
      savePlan,
      deletePlan,
      refresh,
    }),
    [
      sideboards,
      plans,
      loading,
      getSideboardForDeck,
      upsertSideboardCards,
      ensureSideboard,
      deleteSideboard,
      getPlan,
      plansForDeck,
      savePlan,
      deletePlan,
      refresh,
    ],
  );

  return (
    <SideboardContext.Provider value={value}>{children}</SideboardContext.Provider>
  );
}

export function useSideboard() {
  const ctx = useContext(SideboardContext);
  if (!ctx) {
    throw new Error('useSideboard must be used within SideboardProvider');
  }
  return ctx;
}
