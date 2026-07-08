export interface DisplayInitialsInput {
  firstname?: string | null;
  lastname?: string | null;
  displayName?: string | null;
  username?: string | null;
}

function firstGrapheme(value: string): string {
  if (!value) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const [first] = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)];
    return first?.segment ?? "";
  }
  return [...value][0] ?? "";
}

function firstTwoGraphemes(value: string): string {
  if (!value) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)]
      .slice(0, 2)
      .map((part) => part.segment)
      .join("");
  }
  return value.slice(0, 2);
}

/** Up to two uppercase letters for Avatar labels — no backend avatar field required. */
export function getDisplayInitials(input: DisplayInitialsInput): string | null {
  const first = (input.firstname ?? "").trim();
  const last = (input.lastname ?? "").trim();

  if (first && last) {
    return `${firstGrapheme(first)}${firstGrapheme(last)}`.toUpperCase();
  }
  if (first) {
    return firstTwoGraphemes(first).toUpperCase();
  }
  if (last) {
    return firstTwoGraphemes(last).toUpperCase();
  }

  const displayName = (input.displayName ?? "").trim();
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${firstGrapheme(parts[0]!)}${firstGrapheme(parts[1]!)}`.toUpperCase();
    }
    return firstTwoGraphemes(displayName).toUpperCase();
  }

  const username = (input.username ?? "").trim();
  if (username) {
    return firstTwoGraphemes(username).toUpperCase();
  }

  return null;
}
