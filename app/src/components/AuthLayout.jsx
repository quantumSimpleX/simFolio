import BrandPanel from './BrandPanel';

// Responsive two-panel auth shell shared by the desktop welcome/sign-up and
// sign-in pages: dark brand panel on the left, form on the right. The brand
// panel is fluid (44%, capped at 580px) and hides below xl so the form is never
// crushed on narrower windows — there it simply centers as a single column.
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100dvh/var(--zoom))] w-full bg-paper">
      <div className="hidden w-[44%] max-w-[580px] flex-shrink-0 overflow-hidden xl:block">
        <BrandPanel/>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 xl:px-[72px]">
        <div className="mx-auto w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
