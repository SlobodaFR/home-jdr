import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

// Mobile-first navigation shell: bottom nav bar below the DESIGN.md
// "desktop" breakpoint (1024px), sidebar at/above it
// (DESIGN.md > Responsive Behavior).
// Purely structural/generic — no business-domain types imported, nav items
// and their targets are supplied by the consuming (business) screen.
export interface AppShellNavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
}

export interface AppShellProps {
  navItems: AppShellNavItem[];
  children: ReactNode;
  header?: ReactNode;
}

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return [
    // min-h/min-w-11 (44px, Tailwind default scale) satisfies the 44x44px
    // touch-target minimum from DESIGN.md > Responsive Behavior > Cibles tactiles.
    'flex min-h-11 min-w-11 flex-col items-center justify-center gap-xxs font-sans-ui text-caption-sm',
    'desktop:flex-row desktop:justify-start desktop:gap-sm desktop:text-button-sm desktop:px-md desktop:py-sm desktop:rounded-sm',
    isActive ? 'text-ink' : 'text-mute',
  ].join(' ');
}

export function AppShell({ navItems, children, header }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas desktop:flex">
      <aside
        aria-label="Navigation principale"
        className="hidden desktop:flex desktop:w-64 desktop:flex-col desktop:gap-lg desktop:border-r desktop:border-hairline desktop:p-lg"
      >
        {header}
        <nav aria-label="Sections" className="flex flex-col gap-xs">
          {navItems.map((item) => (
            <NavLink key={item.key} to={item.to} className={navLinkClassName} aria-label={item.label}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {header ? (
          <header className="flex items-center justify-between border-b border-hairline px-lg py-md desktop:hidden">
            {header}
          </header>
        ) : null}

        <main className="flex-1 px-lg py-xl desktop:py-section">{children}</main>

        <nav
          aria-label="Sections"
          className="sticky bottom-0 flex items-stretch justify-around border-t border-hairline bg-canvas px-sm py-xs desktop:hidden"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={navLinkClassName}
              aria-label={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
