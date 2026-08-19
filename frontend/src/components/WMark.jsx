export const WMark = ({ size = 28, className = "" }) => (
  <img
    src="/brand-icon.webp"
    alt="Fikirizm Work"
    className={"shrink-0 rounded-full object-contain " + className}
    style={{ width: size, height: size }}
  />
);

export const Logo = ({ className = "h-7", force }) => {
  const cls = "w-auto " + className;
  if (force === "light") return <img src="/brand-logo.webp" alt="Fikirizm Work" className={cls} />;
  if (force === "dark") return <img src="/brand-logo-dark.webp" alt="Fikirizm Work" className={cls} />;
  return (
    <>
      <img src="/brand-logo.webp" alt="Fikirizm Work" className={cls + " dark:hidden"} />
      <img src="/brand-logo-dark.webp" alt="Fikirizm Work" className={cls + " hidden dark:block"} />
    </>
  );
};
