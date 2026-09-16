/**
 * Mirrors the API's keyset-pagination envelope (`emailListResponseSchema` and
 * friends). There is never a `total` — the API is deliberately built around
 * cursors, not offsets, so lists here must never assume a page count.
 */
export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Query params accepted by a cursor-paginated list endpoint. */
export interface CursorQuery {
  cursor?: string;
  limit?: number;
}
