'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SHOW_NAVIGATION, VISIBLE_NAV_ITEMS } from './nav-items';

export function Header({ demo }: { demo: boolean }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-[color:var(--color-line)] bg-[color:var(--color-paper)]/88 backdrop-blur-md lg:block">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-6 px-6">
        <Link href="/map" className="flex items-center gap-2">
          <span aria-hidden className="text-[17px]">
            🌏
          </span>
          <span className="text-[15px] font-semibold tracking-tight">지금日지도</span>
          <span className="text-[12px] text-[color:var(--color-faint)]">Nature Now Korea</span>
        </Link>

        {SHOW_NAVIGATION && (
          <nav aria-label="주요 메뉴" className="flex items-center gap-1">
            {VISIBLE_NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-[13.5px] transition-colors ${
                    active
                      ? 'bg-[color:var(--color-ink)] text-white'
                      : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-line-soft)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {demo && (
          <p className="ml-auto text-[11.5px] text-[color:var(--color-faint)]">
            표시되는 데이터는 개발용 DEMO입니다
          </p>
        )}
      </div>
    </header>
  );
}
