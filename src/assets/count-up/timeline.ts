const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getCountValue(start: number, end: number, time: number, duration: number, easing: "ease-out" | "linear" = "ease-out") {
  const progress = clamp01(time / Math.max(0.001, duration));
  const eased = easing === "linear" ? progress : 1 - (1 - progress) ** 3;
  return start + (end - start) * eased;
}

export function formatCount(value: number, decimals: number, prefix: string, suffix: string, separator = true) {
  const places = Math.max(0, Math.min(4, Math.round(decimals)));
  return `${prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
    useGrouping: separator,
  })}${suffix}`;
}
