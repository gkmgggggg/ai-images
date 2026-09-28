import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';

import { App } from '@/App';
import { GalleryOrderProvider } from '@/features/gallery/galleryContext';
import { ApiError } from '@/lib/api';
import { ThemeProvider, useTheme } from '@/lib/theme';

import './index.css';

/** 后台会话过期时（任意后台请求返回 401），跳回登录页。 */
function handleUnauthorized(error: unknown) {
  const { pathname, search } = window.location;
  if (error instanceof ApiError && error.status === 401 && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    window.location.assign(`/admin/login?next=${encodeURIComponent(pathname + search)}`);
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // 登录状态查询自己处理 401
      if (query.queryKey[1] !== 'me') handleUnauthorized(error);
    },
  }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} position="top-center" richColors closeButton />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GalleryOrderProvider>
            <App />
          </GalleryOrderProvider>
        </BrowserRouter>
        <ThemedToaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
