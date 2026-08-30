export default function PageHero({ eyebrow, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#2c7895] bg-[linear-gradient(110deg,#123047_0%,#175a75_52%,#6fb8cf_100%)] px-6 py-4 text-white shadow-[0_12px_30px_rgba(15,41,64,0.18)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100">{eyebrow}</div>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight tracking-[-0.02em] md:text-2xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-100/90">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
