'use client';

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useLoading() {
  return {
    isLoading: false,
    startLoading: () => {},
    stopLoading: () => {},
    setLoading: () => {},
    loadingMessage: null,
  };
}
