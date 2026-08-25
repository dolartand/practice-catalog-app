import { isAxiosError } from 'axios';

export interface StockIssue {
  skuId: string;
  requested: number;
  available: number;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
  errors: Record<string, string[]>;
  items?: StockIssue[];
}

export type AppError =
  | {
      kind: 'api';
      status: number;
      title: string;
      detail: string;
      fieldErrors: Record<string, string[]>;
      stockIssues?: StockIssue[];
      traceId?: string;
    }
  | { kind: 'network'; titleKey: string; detailKey: string }
  | { kind: 'unknown'; titleKey: string; detailKey: string };

function isProblemDetails(data: unknown): data is ProblemDetails {
  return typeof data === 'object' && data !== null && 'status' in data && 'title' in data;
}

export function parseApiError(error: unknown): AppError {
  if (isAxiosError(error) && isProblemDetails(error.response?.data)) {
    const problem = error.response!.data as ProblemDetails;
    return {
      kind: 'api',
      status: problem.status,
      title: problem.title,
      detail: problem.detail,
      fieldErrors: problem.errors ?? {},
      // Расширение бэкенда при 422 (нехватка склада): items: [{ skuId, requested, available }]
      stockIssues: Array.isArray(problem.items) && problem.items.length > 0 ? problem.items : undefined,
      traceId: problem.traceId,
    };
  }

  if (isAxiosError(error) && !error.response) {
    return {
      kind: 'network',
      titleKey: 'errors.network.title',
      detailKey: 'errors.network.detail',
    };
  }

  return {
    kind: 'unknown',
    titleKey: 'errors.unknown.title',
    detailKey: 'errors.unknown.detail',
  };
}