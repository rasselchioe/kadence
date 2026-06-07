/** Editorial framed section header: [ ix ] TITLE + optional right-side action. */
export function Section({
  ix,
  title,
  action,
  children,
}: {
  ix: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="label">[ {ix} ]</span>
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
