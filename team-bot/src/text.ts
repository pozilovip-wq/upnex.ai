export function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** "Aziz Karimov +998 90 123 45 67" → { name: "Aziz Karimov", phone: "+998901234567" } */
export function parseClient(text: string): { name: string; phone: string | null } | null {
  const m = text.match(/\+?\d[\d\s\-()]{6,}\d/);
  const phone = m ? m[0].replace(/[\s\-()]/g, "") : null;
  const name = (m ? text.replace(m[0], " ") : text)
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name && !phone) return null;
  return { name: name || phone!, phone };
}
