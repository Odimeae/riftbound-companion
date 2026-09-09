import {
  SideboardSession,
  emptySideboardSession,
  normalizeSwaps,
} from './sideboard';
import { normalizeDeckName } from '../utils/deckName';

export type EventType = 'Event' | 'Friendly';
export type MatchFormat = 'Bo1' | 'Bo3';
export type MatchOutcome = 'Win' | 'Loss';

/** @deprecated Old quick-tag taxonomy — migrated into MistakeTag on load. */
export type NoteTag = 'Mulligan' | 'Sideboard' | 'Mana' | 'Combat';

export type MistakeTag =
  | 'mulligan'
  | 'sequencing'
  | 'forgotten_trigger'
  | 'battlefield_contest'
  | 'resource_miss'
  | 'wrong_plan'
  | 'clock'
  | 'rules_judge'
  | 'tilt'
  | 'missed_public_info';

export const EVENT_TYPES: EventType[] = ['Event', 'Friendly'];
export const MATCH_FORMATS: MatchFormat[] = ['Bo1', 'Bo3'];
export const MATCH_OUTCOMES: MatchOutcome[] = ['Win', 'Loss'];

/** @deprecated */
export const NOTE_TAGS: NoteTag[] = ['Mulligan', 'Sideboard', 'Mana', 'Combat'];

export const MISTAKE_TAGS: MistakeTag[] = [
  'mulligan',
  'sequencing',
  'forgotten_trigger',
  'battlefield_contest',
  'resource_miss',
  'wrong_plan',
  'clock',
  'rules_judge',
  'tilt',
  'missed_public_info',
];

export const MISTAKE_TAG_LABELS: Record<MistakeTag, string> = {
  mulligan: 'Mulligan',
  sequencing: 'Sequencing',
  forgotten_trigger: 'Forgotten trigger',
  battlefield_contest: 'Battlefield contest',
  resource_miss: 'Resource miss (energy/power/XP)',
  wrong_plan: 'Wrong plan vs archetype',
  clock: 'Clock',
  rules_judge: 'Rules / judge',
  tilt: 'Tilt',
  missed_public_info: 'Missed public info',
};

const MISTAKE_TAG_SET = new Set<string>(MISTAKE_TAGS);

/** Map legacy NoteTag values → MistakeTag; unknown values ignored. */
const LEGACY_NOTE_TAG_MAP: Record<string, MistakeTag | null> = {
  Mulligan: 'mulligan',
  Sideboard: null,
  Mana: 'resource_miss',
  Combat: 'battlefield_contest',
};

export interface GameResult {
  id: string;
  gameNumber: number;
  outcome: MatchOutcome;
  /** Optional sideboard logging for Bo3 G2/G3. G1 must have sideboardingAllowed=false. */
  sideboard?: SideboardSession;
}

export interface MatchNote {
  /** Legacy long fields — kept empty for new writes; preserved when migrating. */
  wentWell: string;
  wentPoorly: string;
  mistakes: string;
  nextTime: string;
  /**
   * @deprecated Old taxonomy. Prefer mistakeTags.
   * Kept empty after migration; raw values may still appear on disk until rewrite.
   */
  tags: NoteTag[];
  /** Primary anti-typing mistake chips. */
  mistakeTags: MistakeTag[];
  /** Optional 1-line free-text note. */
  oneLiner: string;
}

export interface Match {
  id: string;
  date: string; // ISO string
  eventType: EventType;
  format: MatchFormat;
  ownDeck: string;
  ownLegend: string;
  opponentDeck: string;
  opponentLegend: string;
  outcome: MatchOutcome;
  games: GameResult[];
  note: MatchNote;
  createdAt: string;
  updatedAt: string;
}

export type MatchInput = Omit<Match, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export function emptyNote(): MatchNote {
  return {
    wentWell: '',
    wentPoorly: '',
    mistakes: '',
    nextTime: '',
    tags: [],
    mistakeTags: [],
    oneLiner: '',
  };
}

export function isMistakeTag(value: unknown): value is MistakeTag {
  return typeof value === 'string' && MISTAKE_TAG_SET.has(value);
}

/** Normalize / migrate mistake tags from disk (mistakeTags + legacy tags). */
export function normalizeMistakeTags(
  raw: unknown,
  legacyTags?: unknown,
): MistakeTag[] {
  const out: MistakeTag[] = [];
  const seen = new Set<MistakeTag>();

  const push = (tag: MistakeTag | null | undefined) => {
    if (!tag || seen.has(tag)) return;
    seen.add(tag);
    out.push(tag);
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isMistakeTag(item)) push(item);
      else if (typeof item === 'string' && item in LEGACY_NOTE_TAG_MAP) {
        push(LEGACY_NOTE_TAG_MAP[item]);
      }
    }
  }

  if (Array.isArray(legacyTags)) {
    for (const item of legacyTags) {
      if (isMistakeTag(item)) push(item);
      else if (typeof item === 'string') {
        push(LEGACY_NOTE_TAG_MAP[item] ?? null);
      }
    }
  }

  return out;
}

/** Prefer oneLiner; fall back to legacy free-text fields for display/migration. */
export function noteOneLiner(note: MatchNote | undefined | null): string {
  if (!note) return '';
  const primary = (note.oneLiner ?? '').trim();
  if (primary) return primary;
  return (
    note.nextTime?.trim() ||
    note.wentPoorly?.trim() ||
    note.mistakes?.trim() ||
    note.wentWell?.trim() ||
    ''
  );
}

export function normalizeMatchNote(raw: Partial<MatchNote> | null | undefined): MatchNote {
  const base = emptyNote();
  if (!raw || typeof raw !== 'object') return base;

  const mistakeTags = normalizeMistakeTags(raw.mistakeTags, raw.tags);
  // Keep oneLiner as stored; noteOneLiner() falls back to legacy fields for UI.
  const oneLiner = typeof raw.oneLiner === 'string' ? raw.oneLiner.trim() : '';

  return {
    wentWell: typeof raw.wentWell === 'string' ? raw.wentWell : '',
    wentPoorly: typeof raw.wentPoorly === 'string' ? raw.wentPoorly : '',
    mistakes: typeof raw.mistakes === 'string' ? raw.mistakes : '',
    nextTime: typeof raw.nextTime === 'string' ? raw.nextTime : '',
    tags: [],
    mistakeTags,
    oneLiner,
  };
}

export function isNoteEmpty(note: MatchNote): boolean {
  return (
    !noteOneLiner(note) &&
    !note.wentWell.trim() &&
    !note.wentPoorly.trim() &&
    !note.mistakes.trim() &&
    !note.nextTime.trim() &&
    note.mistakeTags.length === 0
  );
}

export function displayTitle(match: Match): string {
  const own = normalizeDeckName(match.ownDeck) || 'Unknown';
  const opp = normalizeDeckName(match.opponentDeck) || 'Unknown';
  return `${own} vs ${opp}`;
}

export function outcomeShort(outcome: MatchOutcome): 'W' | 'L' {
  return outcome === 'Win' ? 'W' : 'L';
}

export function normalizeGameSideboard(
  gameNumber: number,
  sideboard?: Partial<SideboardSession> | null,
): SideboardSession | undefined {
  const allowed = gameNumber >= 2;
  if (!sideboard && gameNumber === 1) {
    return emptySideboardSession(false);
  }
  if (!sideboard) {
    return allowed ? undefined : emptySideboardSession(false);
  }
  const session: SideboardSession = {
    fromPlanId: sideboard.fromPlanId,
    actualSwaps: normalizeSwaps(
      Array.isArray(sideboard.actualSwaps) ? sideboard.actualSwaps : [],
    ),
    planFollowed: normalizePlanFollowed(sideboard.planFollowed),
    sideboardingAllowed: allowed ? Boolean(sideboard.sideboardingAllowed ?? true) : false,
  };
  // Game 1: force locked session (no swaps).
  if (!allowed) {
    return {
      actualSwaps: [],
      planFollowed: 'no_plan',
      sideboardingAllowed: false,
    };
  }
  return session;
}

function normalizePlanFollowed(
  value: unknown,
): SideboardSession['planFollowed'] {
  if (value === 'yes' || value === 'partial' || value === 'no' || value === 'no_plan') {
    return value;
  }
  return 'no_plan';
}
