const US_STATE_SET = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
]);

const SMALL_WORDS = new Set(["and", "or", "the", "of", "in", "on", "at", "to", "for"]);

function capitalizeSimple(word: string): string {
  if (!word) return word;
  return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
}

function capitalizeMcWord(word: string): string {
  const lower = word.toLowerCase();
  if (!lower.startsWith("mc") || lower.length <= 2) return capitalizeSimple(word);
  return `Mc${lower[2].toUpperCase()}${lower.slice(3)}`;
}

function capitalizeStWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower === "st") return "St";
  if (lower === "st.") return "St.";
  return capitalizeSimple(word);
}

function normalizeWord(word: string, index: number): string {
  const trimmed = word.trim();
  if (!trimmed) return "";
  if (/^\d/.test(trimmed)) return trimmed;
  if (trimmed.toUpperCase() === "PO") return "Po";
  if (trimmed.toUpperCase() === "BOX") return "Box";
  if (trimmed.includes("-")) {
    return trimmed
      .split("-")
      .map((part, partIndex) => normalizeWord(part, partIndex))
      .join("-");
  }

  const withApostrophe = trimmed
    .split("'")
    .map((part, partIndex) => {
      if (!part) return part;
      if (partIndex > 0 && part.length <= 2) return part.toLowerCase();
      return capitalizeMcWord(capitalizeStWord(part));
    })
    .join("'");

  const lower = withApostrophe.toLowerCase();
  if (index > 0 && SMALL_WORDS.has(lower)) return lower;
  return withApostrophe;
}

export function normalizeStateInput(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
}

export function isValidUsState(value: string): boolean {
  if (!value) return false;
  return US_STATE_SET.has(normalizeStateInput(value));
}

export function normalizeCity(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      if (word.endsWith(".")) {
        return `${normalizeWord(word.slice(0, -1), index)}.`;
      }
      if (word.includes(".")) {
        return word
          .split(".")
          .map((part, partIndex) => (part ? normalizeWord(part, index + partIndex) : ""))
          .join(".");
      }
      return normalizeWord(word, index);
    })
    .join(" ");
}

export function normalizeStreetAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((word, index) => normalizeWord(word, index))
    .join(" ")
    .replace(/^Po\s+Box\b/i, "PO Box");
}
