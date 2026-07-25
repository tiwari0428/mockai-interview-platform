const PageHero = ({ eyebrow, title, description, action }) => (
  <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div className="max-w-2xl">
      {eyebrow ? <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-brand-300">{eyebrow}</p> : null}
      <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-base text-slate-300">{description}</p> : null}
    </div>
    {action ? <div>{action}</div> : null}
  </div>
);

export default PageHero;
