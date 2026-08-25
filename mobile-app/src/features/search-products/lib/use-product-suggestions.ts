import { useRef, useState } from 'react';

import { productApi, type ProductListItem } from '@entities/product';

const DEBOUNCE_MS = 300;
const SUGGESTIONS_SIZE = 5;

export function useProductSuggestions() {
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const search = (query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const currentRequest = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const result = await productApi.getList({ q: trimmed, size: SUGGESTIONS_SIZE });
        if (currentRequest === requestIdRef.current) {
          setSuggestions(result.items);
        }
      } finally {
        if (currentRequest === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  };

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestions([]);
  };

  return { suggestions, isLoading, search, clear };
}