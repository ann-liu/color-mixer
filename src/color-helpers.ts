export const stepsArray = (key: string): number[] => {
  const n = Number(key);
  const step = Math.round(100 / (n + 1));
  return Array.from({ length: n }, (_, i) => step * (i + 1));
};

export const ensureHash = (hex: string) => `#${hex.replace(/^#+/, "")}`;

const removeHash = (hex: string) => hex.replace(/^#/, "");

export const isValid = (str: string) => /^#?([0-9A-Fa-f]{3}){1,2}$/.test(str);

export const expandHex = (hex: string): string => {
  hex = removeHash(hex);
  if (hex.length === 3) {
    return hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return hex;
};
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const expanded = expandHex(hex);
  return {
    r: parseInt(expanded.substring(0, 2), 16),
    g: parseInt(expanded.substring(2, 4), 16),
    b: parseInt(expanded.substring(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (num: number): number =>
    Math.min(255, Math.max(0, Math.round(num)));
  return (
    "#" +
    [r, g, b]
      .map(clamp)
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
};

export const mixHex = (
  color1: string,
  color2: string,
  percentage: number = 50
): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const p = percentage / 100;
  return rgbToHex(
    c1.r * (1 - p) + c2.r * p,
    c1.g * (1 - p) + c2.g * p,
    c1.b * (1 - p) + c2.b * p
  );
};

export const randomColor = () => "#" + Math.random().toString(16).slice(-6);

export const textColor = (hex: string): "#ffffff" | "#000000" => {
  const c = hex.replace("#", "");
  const fullHex =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c;
  const rgb = fullHex.match(/.{2}/g)!.map((x) => parseInt(x, 16) / 255);
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const L =
    0.2126 * lin(rgb[0]!) + 0.7152 * lin(rgb[1]!) + 0.0722 * lin(rgb[2]!);
  return L > 0.179 ? "#000000" : "#ffffff";
};
