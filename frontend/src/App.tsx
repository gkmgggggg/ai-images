import { lazy, Suspense, type ComponentType } from 'react';
import { Link, Navigate, Route, Routes, useLocation, type Location } from 'react-router';

import { CaseDialog } from '@/features/case-detail/CaseDialog';
import { CasePage } from '@/features/case-detail/CasePage';
import { GalleryPage } from '@/features/gallery/GalleryPage';

// 后台代码单独打包，访客不需要下载
function lazyNamed<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => loader().then((module) => ({ default: module[name] })));
}
const AdminLayout = lazyNamed(() => import('@/features/admin/AdminLayout'), 'AdminLayout');
const LoginPage = lazyNamed(() => import('@/features/admin/LoginPage'), 'LoginPage');
const CasesPage = lazyNamed(() => import('@/features/admin/CasesPage'), 'CasesPage');
const CaseEditPage = lazyNamed(() => import('@/features/admin/CaseEditPage'), 'CaseEditPage');
const CategoriesPage = lazyNamed(() => import('@/features/admin/CategoriesPage'), 'CategoriesPage');
const TagsPage = lazyNamed(() => import('@/features/admin/TagsPage'), 'TagsPage');
const ImportsPage = lazyNamed(() => import('@/features/admin/ImportsPage'), 'ImportsPage');

export function App() {
  const location = useLocation();
  // 从图库点开案例时，背景仍渲染图库，案例以弹窗叠加；直接访问链接时渲染独立页面
  const background = (location.state as { background?: Location } | null)?.background;

  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted">加载中…</div>}>
      <Routes location={background ?? location}>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/cases/:id" element={<CasePage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/cases" replace />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/new" element={<CaseEditPage />} />
          <Route path="cases/:id" element={<CaseEditPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="imports" element={<ImportsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {background && (
        <Routes>
          <Route path="/cases/:id" element={<CaseDialog />} />
        </Routes>
      )}
    </Suspense>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center text-center">
      <div>
        <p className="font-label text-7xl font-semibold tracking-wider text-accent">404</p>
        <p className="mt-2 text-muted">页面不存在</p>
        <Link to="/" className="mt-4 inline-block text-sm underline underline-offset-4 hover:text-accent">
          回到图库
        </Link>
      </div>
    </main>
  );
}
