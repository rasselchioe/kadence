import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Ticker } from "./ticker";

/** Sidebar + topbar + ticker frame for the authenticated app (Design Spec § 07-B). */
export function AppShell({
  children,
  archiveCount,
}: {
  children: React.ReactNode;
  archiveCount: number;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 md:block">
        <Sidebar archiveCount={archiveCount} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Ticker />
        <TopBar />
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
