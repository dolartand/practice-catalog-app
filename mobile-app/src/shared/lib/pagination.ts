export interface PageEnvelope<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export function hasNextPage(envelope: Pick<PageEnvelope<unknown>, 'page' | 'totalPages'>): boolean {
  return envelope.page + 1 < envelope.totalPages;
}