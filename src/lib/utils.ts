import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): HSL {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function getSafeThemeColor(hexColor: string, isDark: boolean) {
  const defaultStyle = {
    bg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)",
    border: isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(59, 130, 246, 0.25)",
    text: isDark ? "#93c5fd" : "#1e3a8a",
  };

  if (!hexColor || !/^#[0-9A-Fa-f]{3,6}$/.test(hexColor)) {
    return defaultStyle;
  }

  try {
    const { h, s, l: originalL } = hexToHsl(hexColor);

    if (isDark) {
      // In dark theme:
      // - Background: very dark translucent color (lightness 10-14%, 25% opacity)
      // - Border: 40% opacity with moderate brightness
      // - Text: vibrant high-lightness color (78-84% lightness) for outstanding contrast
      const textL = 82;
      return {
        bg: `hsla(${h}, ${Math.max(s, 60)}%, 12%, 0.35)`,
        border: `hsla(${h}, ${Math.max(s, 60)}%, 45%, 0.4)`,
        text: `hsl(${h}, ${Math.max(s, 70)}%, ${textL}%)`,
      };
    } else {
      // In light theme:
      // - Background: ultra-light tint (95% lightness, 70% opacity)
      // - Border: 20% opacity with medium lightness
      // - Text: highly saturated deep color (lightness 22-28%) to meet WCAG AA standards
      // Special check: Yellow / Amber hues (around 30-70 degrees) need extremely dark values to be readable
      const textL = h >= 30 && h <= 70 ? 18 : 28;
      const saturation = h >= 30 && h <= 70 ? Math.max(s, 90) : Math.max(s, 80);
      return {
        bg: `hsla(${h}, ${saturation}%, 95%, 0.75)`,
        border: `hsla(${h}, ${saturation}%, 45%, 0.22)`,
        text: `hsl(${h}, ${saturation}%, ${textL}%)`,
      };
    }
  } catch (e) {
    return defaultStyle;
  }
}

