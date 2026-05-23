import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Aggressive caching for sub-100ms loading
			staleTime: 5 * 60 * 1000, // 5 minutes (data remains fresh without refetching)
			gcTime: 24 * 60 * 60 * 1000, // 24 hours (keep data in cache memory)
			refetchOnMount: false, // Serve from cache instantly
		},
	},
});