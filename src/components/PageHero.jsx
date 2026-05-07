export default function PageHero({ eyebrow, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">{eyebrow}</div>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black leading-tight">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-100/90">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
