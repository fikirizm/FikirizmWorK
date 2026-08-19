export const WMark = ({ size = 28, className = "" }) => (
  <div
    className={"flex shrink-0 items-center justify-center rounded-full " + className}
    style={{ width: size, height: size, background: "#5859a3" }}
  >
    <span className="font-heading font-bold leading-none text-white" style={{ fontSize: Math.round(size * 0.56) }}>W</span>
  </div>
);
