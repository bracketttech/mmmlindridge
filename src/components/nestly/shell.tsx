import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "./logo";
import { clearSession, readSession } from "@/lib/session";
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, LogOut, MoreHorizontal, Search, Settings, UserRound, Check, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppState } from "@/lib/app-state";
import { navForRole, ROLES, type NavItem } from "@/lib/nav";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { propertyService, notificationService, type Property, type Notification } from "@/services";
import { NAvatar, BottomSheet } from "./composites";
import { SearchOverlay } from "./SearchOverlay";
import { propertyThumb, avatarFor, preloadImages, allShellImages } from "@/images";
import { TruncatedText, IconButton, useRipple, Skel } from "./primitives";

function useActiveIndex(items: NavItem[]) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return items.findIndex((i) => path === i.to || path.startsWith(i.to + "/"));
}

/* ---------- Desktop sidebar ---------- */
function Sidebar() {
  const { role, collapsed, setCollapsed } = useAppState();
  const { items } = navForRole(role);
  const active = useActiveIndex(items);
  return (
    <aside aria-label={t.shell.mainNav} className={cn("sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-[8px] bg-sidebar-bg p-3 text-on-dark transition-[width] duration-300 ease-out lg:flex", collapsed ? "w-[76px]" : "w-[264px]")}>
      <div className={cn("flex h-12 items-center", collapsed ? "justify-center" : "justify-between px-2")}>
        <Logo showText={!collapsed} />
      </div>
      <nav className="relative mt-4 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none]">
        <ul className="relative flex flex-col gap-1">
          {active >= 0 && <span aria-hidden className="absolute left-0 right-0 top-0 h-11 rounded-full bg-olive-700 transition-transform duration-300 ease-out" style={{ transform: `translateY(${active * 48}px)` }} />}
          {items.map((it, i) => {
            const link = (
              <Link to={it.to} aria-label={collapsed ? it.label : undefined} aria-current={i === active ? "page" : undefined}
                className={cn("relative z-10 flex h-11 items-center gap-3 rounded-full text-[14px] font-medium text-on-dark transition-colors", collapsed ? "justify-center" : "px-4", i !== active && "hover:bg-sidebar-hover")}>
                <it.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
            return (
              <li key={it.key}>
                {collapsed ? (
                  <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{it.label}</TooltipContent></Tooltip>
                ) : link}
              </li>
            );
          })}
        </ul>
      </nav>
      <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? t.shell.expand : t.shell.collapse} aria-expanded={!collapsed}
        className={cn("mt-2 flex h-11 items-center gap-3 rounded-full text-[13px] text-on-dark-muted hover:bg-sidebar-hover hover:text-on-dark", collapsed ? "justify-center" : "px-4")}>
        {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <><ChevronsLeft className="h-[18px] w-[18px]" /><span>{t.shell.collapse}</span></>}
      </button>
    </aside>
  );
}

/* ---------- Property switcher ---------- */
function PropertySwitcher() {
  const { propertyId, setPropertyId, role } = useAppState();
  const [list, setList] = useState<Property[] | null>(null);
  useEffect(() => { propertyService.list().then(setList); }, []);
  if (role === "tenant") return null;
  // A saved property is restoring: hold a same-size placeholder instead of flashing "All properties".
  if (!list && propertyId !== "all")
    return (
      <div role="status" aria-label={t.shell.switchProperty} className="glass flex h-12 w-[240px] max-w-full min-w-0 items-center gap-3 rounded-full py-1 pl-1 pr-3 shadow-none">
        <Skel className="h-10 w-10 shrink-0 rounded-full" />
        <span className="min-w-0 flex-1 space-y-1.5"><Skel className="h-3 w-3/4" /><Skel className="h-2.5 w-1/2" /></span>
      </div>
    );
  const current = list?.find((p) => p.id === propertyId);
  const name = current?.name ?? t.shell.allProperties;
  const sub = current ? `${current.address}, ${current.suburb}` : t.shell.allPropertiesSub;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t.shell.switchProperty} className="glass flex h-12 min-w-0 max-w-[280px] items-center gap-3 rounded-full py-1 pl-1 pr-3 text-left shadow-none">
        {current ? <NAvatar name={current.name} src={propertyThumb(current.id)} size={40} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-olive-700 text-primary-foreground"><Building2 className="h-4 w-4" /></span>}
        <span className="min-w-0 flex-1">
          <TruncatedText text={name} className="text-[14px] font-medium text-ink-900" />
          <TruncatedText text={sub} className="text-[11px] text-ink-500" />
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-[5px] p-1.5">
        {[{ id: "all", name: t.shell.allProperties, address: t.shell.allPropertiesSub, suburb: "" }, ...(list ?? [])].map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => setPropertyId(p.id)} className="gap-3 rounded-[4px] py-2">
            {p.id === "all" ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-olive-700 text-primary-foreground"><Building2 className="h-3.5 w-3.5" /></span> : <NAvatar name={p.name} src={propertyThumb(p.id)} size={32} />}
            <span className="min-w-0 flex-1">
              <TruncatedText text={p.name} className="text-[14px] font-medium" />
              <TruncatedText text={p.suburb ? `${p.address}, ${p.suburb}` : p.address} className="text-[12px] text-ink-500" />
            </span>
            {propertyId === p.id && <Check className="h-4 w-4 text-olive-700" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Notifications ---------- */
function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { notificationService.list().then(setItems); }, []);
  const unread = items.some((n) => n.unread);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={t.shell.notifications}>
          <Bell className="h-4 w-4" />
          {unread && <span aria-hidden className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-solid" />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-[5px] p-2">
        <DropdownMenuLabel>{t.shell.notifications}</DropdownMenuLabel>
        {items.length === 0 && <p className="p-3 text-[13px] text-ink-500">{t.shell.noNotifications}</p>}
        {items.map((n) => (
          <div key={n.id} className="flex gap-3 rounded-[4px] p-2 hover:bg-olive-100">
            <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? "bg-olive-700" : "bg-olive-200")} />
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{n.title}</p>
              <TruncatedText text={n.body} lines={2} className="text-[12px] text-ink-500" />
              <p className="text-[11px] text-ink-500">{formatDate(n.at)}</p>
            </div>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/notifications" className="justify-center rounded-[4px] font-medium text-olive-700">{t.shell.viewAll}</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Avatar menu w/ dev role switcher ---------- */
export const DEMO_USER = { name: "Janice Tinto", email: "janice@nestly.co.za" };
function AvatarMenu() {
  const { role, setRole } = useAppState();
  const navigate = useNavigate();
  // Shell is client-only (ssr: false), so the session can be read synchronously — no name/photo flash.
  const [user] = useState(() => {
    const s = readSession();
    return s ? { name: s.name, email: s.email } : DEMO_USER;
  });
  const signOut = () => {
    clearSession();
    navigate({ to: "/login", replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t.shell.account} className="shrink-0 rounded-full">
        <NAvatar name={user.name} src={avatarFor(user.email)} size={40} className="bg-olive-800 text-primary-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-[5px] p-1.5">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-[14px] font-medium">{user.name}</p>
          <p className="truncate text-[12px] text-ink-500">{t.shell.signedInAs}: {t.roles[role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/profile"><UserRound className="h-4 w-4" />{t.shell.profile}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings"><Settings className="h-4 w-4" />{t.shell.settings}</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-overline text-ink-500">{t.shell.devRole}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as typeof role)}>
          {ROLES.map((r) => <DropdownMenuRadioItem key={r} value={r}>{t.roles[r]}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}><LogOut className="h-4 w-4" />{t.shell.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:flex md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-ink-900 lg:hidden"><Logo showText={false} /></span>
        <PropertySwitcher />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setSearchOpen(true)} className="glass hidden h-11 w-72 items-center gap-2 rounded-full px-4 text-left text-[14px] text-ink-500 shadow-none xl:flex">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{t.shell.search}</span>
          <kbd className="rounded-md bg-olive-100 px-1.5 text-[11px]">Ctrl K</kbd>
        </button>
        <IconButton label={t.shell.search} className="xl:hidden" onClick={() => setSearchOpen(true)}><Search className="h-4 w-4" /></IconButton>
        <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
        <NotificationsBell />
        <AvatarMenu />
      </div>
    </div>
  );
}

/* ---------- Mobile floating tab bar ---------- */
function MobileTabBar() {
  const { role } = useAppState();
  const { tabs, more } = navForRole(role);
  const active = useActiveIndex(tabs);
  const [open, setOpen] = useState(false);
  const ripple = useRipple();
  return (
    <>
      <nav aria-label={t.shell.mainNav} className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:hidden">
        <div className="relative flex items-center gap-1 rounded-full bg-olive-800 p-1.5 shadow-soft">
          {active >= 0 && <span aria-hidden className="absolute left-1.5 top-1.5 h-11 w-11 rounded-full bg-surface-solid transition-transform duration-300 ease-out" style={{ transform: `translateX(${active * 48}px)` }} />}
          {tabs.map((tb, i) => (
            <Link key={tb.key} to={tb.to} onClick={ripple} aria-label={tb.label} aria-current={i === active ? "page" : undefined}
              className={cn("relative z-10 grid h-11 w-11 place-items-center overflow-hidden rounded-full transition-colors", i === active ? "text-olive-900" : "text-on-dark")}>
              <tb.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Link>
          ))}
          {more.length > 0 && (
            <button onClick={() => setOpen(true)} aria-label={t.shell.moreMenu} className="relative z-10 grid h-11 w-11 place-items-center rounded-full text-on-dark">
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </nav>
      <BottomSheet open={open} onOpenChange={setOpen} title={t.nav.more}>
        <ul className="grid gap-1">
          {more.map((m) => (
            <li key={m.key}>
              <Link to={m.to} onClick={() => setOpen(false)} className="flex h-12 items-center gap-3 rounded-[5px] px-3 text-[15px] hover:bg-olive-100">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-olive-200 text-olive-900"><m.icon className="h-4 w-4" /></span>
                <span className="truncate">{m.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // Warm every shell image once so property switches and menus never show a blank frame.
  useEffect(() => { preloadImages(allShellImages()); }, []);
  return (
    <div className="flex min-h-screen w-full gap-3 bg-outer p-0 md:p-3">
      <Sidebar />
      <div className="relative min-w-0 flex-1 overflow-hidden bg-canvas md:rounded-[8px] md:border md:border-surface-solid md:shadow-soft">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-32 pt-4 md:px-8 md:pt-6 lg:pb-10">
          <TopBar />
          <main key={path} className="mt-6 animate-page-in md:mt-8">{children}</main>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
