import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CompanionDeck } from '../types/deck';
import {
  buildCompanionDeck,
  loadCompanionDecks,
  saveCompanionDecks,
} from '../storage/decks';
import { deckLookupKey, normalizeDeckName } from '../utils/deckName';
import {
  decodePiltoverDeck,
  entriesToRefs,
  expandSideboardSlots,
  mainPoolLabels,
  resolveDeckCodeFromInput,
} from '../utils/piltoverImport';

export type ImportPiltoverResult = {
  deck: CompanionDeck;
  sideboardSlotNames: string[];
  suggestedName?: string;
};

interface DeckContextValue {
  decks: CompanionDeck[];
  loading: boolean;
  getDeckForName: (deckName: string) => CompanionDeck | undefined;
  mainPoolForDeck: (deckName: string) => string[];
  upsertDeck: (deck: CompanionDeck) => Promise<CompanionDeck>;
  deleteDeck: (id: string) => Promise<void>;
  /**
   * Import from Piltover Archive URL or raw deck code.
   * Links to `deckName` (Title Case). Does not mutate sideboard storage —
   * caller may apply `sideboardSlotNames` via SideboardContext.
   */
  importFromPiltover: (
    input: string,
    deckName: string,
    knownCardNames?: string[],
  ) => Promise<ImportPiltoverResult>;
  /** Re-fetch/re-decode from saved URL or code and update lists. */
  refreshFromPiltover: (
    deckName: string,
    knownCardNames?: string[],
  ) => Promise<ImportPiltoverResult>;
  refresh: () => Promise<void>;
}

const DeckContext = createContext<DeckContextValue | null>(null);

function deckKey(name: string): string {
  return deckLookupKey(name);
}

export function DeckProvider({ children }: { children: React.ReactNode }) {
  const [decks, setDecks] = useState<CompanionDeck[]>([]);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (next: CompanionDeck[]) => {
    const sorted = [...next].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    setDecks(sorted);
    await saveCompanionDecks(sorted);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const items = await loadCompanionDecks();
    setDecks(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getDeckForName = useCallback(
    (deckName: string) => {
      const key = deckKey(deckName);
      if (!key) return undefined;
      return decks.find((d) => deckKey(d.deckName) === key);
    },
    [decks],
  );

  const mainPoolForDeck = useCallback(
    (deckName: string) => {
      const deck = getDeckForName(deckName);
      if (!deck) return [];
      return mainPoolLabels(deck.mainCards);
    },
    [getDeckForName],
  );

  const upsertDeck = useCallback(
    async (deck: CompanionDeck) => {
      const existing = decks.find(
        (d) =>
          d.id === deck.id || deckKey(d.deckName) === deckKey(deck.deckName),
      );
      const next = buildCompanionDeck({
        ...deck,
        id: existing?.id ?? deck.id,
        createdAt: existing?.createdAt ?? deck.createdAt,
      });
      if (existing) {
        await persist(decks.map((d) => (d.id === existing.id ? next : d)));
      } else {
        await persist([next, ...decks]);
      }
      return next;
    },
    [decks, persist],
  );

  const deleteDeck = useCallback(
    async (id: string) => {
      await persist(decks.filter((d) => d.id !== id));
    },
    [decks, persist],
  );

  const applyDecoded = useCallback(
    async (
      code: string,
      sourceUrl: string | undefined,
      deckName: string,
      knownCardNames: string[],
      existing?: CompanionDeck,
      nameByCode?: Map<string, string>,
    ): Promise<ImportPiltoverResult> => {
      const canonical = normalizeDeckName(deckName) || 'Untitled Deck';
      const { mainCards, sideboardCards } = decodePiltoverDeck(
        code,
        knownCardNames,
        nameByCode,
      );
      const deck = await upsertDeck(
        buildCompanionDeck({
          id: existing?.id,
          createdAt: existing?.createdAt,
          deckName: canonical,
          mainCards,
          sideboardCards,
          mainRefs: entriesToRefs(mainCards),
          sideboardRefs: entriesToRefs(sideboardCards),
          deckCode: code,
          piltoverUrl: sourceUrl || existing?.piltoverUrl,
        }),
      );
      return {
        deck,
        sideboardSlotNames: expandSideboardSlots(sideboardCards),
      };
    },
    [upsertDeck],
  );

  const importFromPiltover = useCallback(
    async (
      input: string,
      deckName: string,
      knownCardNames: string[] = [],
    ): Promise<ImportPiltoverResult> => {
      const { code, sourceUrl, suggestedName, nameByCode } =
        await resolveDeckCodeFromInput(input);
      const canonical =
        normalizeDeckName(deckName) ||
        normalizeDeckName(suggestedName ?? '') ||
        'Untitled Deck';
      const existing =
        getDeckForName(canonical) ||
        (deckName ? getDeckForName(deckName) : undefined);
      const result = await applyDecoded(
        code,
        sourceUrl,
        canonical,
        knownCardNames,
        existing,
        nameByCode,
      );
      return { ...result, suggestedName };
    },
    [applyDecoded, getDeckForName],
  );

  const refreshFromPiltover = useCallback(
    async (
      deckName: string,
      knownCardNames: string[] = [],
    ): Promise<ImportPiltoverResult> => {
      const existing = getDeckForName(deckName);
      if (!existing) {
        throw new Error('No linked deck list for this name yet. Import first.');
      }
      const source = existing.piltoverUrl || existing.deckCode;
      if (!source) {
        throw new Error('No saved Piltover URL or deck code to refresh.');
      }
      const { code, sourceUrl, nameByCode } = await resolveDeckCodeFromInput(
        source,
      );
      const result = await applyDecoded(
        code,
        sourceUrl || existing.piltoverUrl,
        existing.deckName,
        knownCardNames,
        existing,
        nameByCode,
      );
      return result;
    },
    [applyDecoded, getDeckForName],
  );

  const value = useMemo(
    () => ({
      decks,
      loading,
      getDeckForName,
      mainPoolForDeck,
      upsertDeck,
      deleteDeck,
      importFromPiltover,
      refreshFromPiltover,
      refresh,
    }),
    [
      decks,
      loading,
      getDeckForName,
      mainPoolForDeck,
      upsertDeck,
      deleteDeck,
      importFromPiltover,
      refreshFromPiltover,
      refresh,
    ],
  );

  return (
    <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
  );
}

export function useDecks() {
  const ctx = useContext(DeckContext);
  if (!ctx) {
    throw new Error('useDecks must be used within DeckProvider');
  }
  return ctx;
}
