export const WMark = ({ size = 28, className = "" }) => (
  <img
    src="/brand-icon.webp"
    alt="Fikirizm Work"
    className={"shrink-0 rounded-full object-contain " + className}
    style={{ width: size, height: size }}
  />
);

export const Logo = ({ className = "h-7", chip = false }) =>
  chip ? (
    <span className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5">
      <img src="/brand-logo.webp" alt="Fikirizm Work" className={"w-auto " + className} />
    </span>
  ) : (
    <img src="/brand-logo.webp" alt="Fikirizm Work" className={"w-auto " + className} />
  );
