type FontExport = {
  variable: string;
  className: string;
};

const FONT_VARIABLES: Record<string, string> = {
  Inter: "--font-inter",
  Noto_Sans: "--font-noto-sans",
  Roboto: "--font-roboto",
  Geist: "--font-geist",
  Outfit: "--font-outfit",
  Geist_Mono: "--font-geist-mono",
  DM_Sans: "--font-dm-sans",
  Nunito_Sans: "--font-nunito-sans",
  Figtree: "--font-figtree",
  Raleway: "--font-raleway",
  Public_Sans: "--font-public-sans",
  JetBrains_Mono: "--font-jetbrains-mono",
  Noto_Serif: "--font-noto-serif",
  Roboto_Slab: "--font-roboto-slab",
  Merriweather: "--font-merriweather",
  Lora: "--font-lora",
  Playfair_Display: "--font-playfair-display",
};

function createFont(exportName: string) {
  return (_options?: unknown): FontExport => {
    const variable = FONT_VARIABLES[exportName] ?? `--font-${exportName.toLowerCase()}`;
    return {
      variable,
      className: variable.slice(2),
    };
  };
}

export const Inter = createFont("Inter");
export const Noto_Sans = createFont("Noto_Sans");
export const Roboto = createFont("Roboto");
export const Geist = createFont("Geist");
export const Outfit = createFont("Outfit");
export const Geist_Mono = createFont("Geist_Mono");
export const DM_Sans = createFont("DM_Sans");
export const Nunito_Sans = createFont("Nunito_Sans");
export const Figtree = createFont("Figtree");
export const Raleway = createFont("Raleway");
export const Public_Sans = createFont("Public_Sans");
export const JetBrains_Mono = createFont("JetBrains_Mono");
export const Noto_Serif = createFont("Noto_Serif");
export const Roboto_Slab = createFont("Roboto_Slab");
export const Merriweather = createFont("Merriweather");
export const Lora = createFont("Lora");
export const Playfair_Display = createFont("Playfair_Display");
