// Serialize an object for safe embedding inside a <script type="application/ld+json">
// block. JSON.stringify alone does NOT escape `</script>`, `<!--`, or the JS line
// separators U+2028/U+2029 — any of which let attacker-controlled string fields
// (vendor name/description/etc.) break out of the script element and execute
// arbitrary script in our origin. Escaping `<`, `>`, `&`, and the line/paragraph
// separators as unicode escapes keeps the JSON semantically identical while
// making breakout impossible.
const LS = String.fromCharCode(0x2028); // line separator
const PS = String.fromCharCode(0x2029); // paragraph separator

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LS]: "\\u2028",
  [PS]: "\\u2029",
};

const UNSAFE = new RegExp(`[<>&${LS}${PS}]`, "g");

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE, (ch) => ESCAPES[ch]);
}
