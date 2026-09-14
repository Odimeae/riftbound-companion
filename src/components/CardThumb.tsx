import React from 'react';
import { spacing } from '../theme/spacing';
import { CardArt, CardArtState } from './CardArt';
import { resolveCardQuery } from '../utils/cardResolve';
import { getCardById } from '../data/cardCatalog';

/** @deprecated Prefer CardArt — kept as thin adapter. */
export function CardThumb({
  nameOrCode,
  catalogId,
  size = spacing.artThumb,
  state,
}: {
  nameOrCode?: string;
  catalogId?: string;
  size?: number;
  state?: CardArtState;
}) {
  const entry =
    (catalogId ? getCardById(catalogId) : undefined) ||
    (nameOrCode ? resolveCardQuery(nameOrCode) : undefined);
  return (
    <CardArt
      size={size}
      uri={entry?.imageUrl}
      name={entry?.name || nameOrCode || ''}
      state={state}
    />
  );
}
