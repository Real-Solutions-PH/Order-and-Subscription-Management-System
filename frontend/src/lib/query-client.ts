import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // 1 min before refetch
        gcTime: 5 * 60 * 1000,      // 5 min garbage collection
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
