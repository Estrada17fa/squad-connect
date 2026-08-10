/**
 * Utilidades para leer un PDF con varios pases de abordar y sugerir a qué
 * persona pertenece cada página. Todo corre en el navegador.
 */

export interface PageExtract {
  page: number;
  text: string;
  nameGuess: string | null;
  seat: string | null;
  flightCode: string | null;
  hasText: boolean;
}

export type MatchConfidence = "alta" | "media" | "ninguna";

export interface PageMatch extends PageExtract {
  suggestedUserId: string | null;
  confidence: MatchConfidence;
}

/** Minúsculas, sin acentos ni signos, espacios colapsados. */
export function normalizeName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_NOISE = new Set([
  "boarding",
  "pass",
  "pase",
  "abordar",
  "abordaje",
  "passenger",
  "pasajero",
  "nombre",
  "name",
  "seat",
  "asiento",
  "gate",
  "puerta",
  "flight",
  "vuelo",
  "terminal",
  "group",
  "grupo",
  "clase",
  "class",
  "mr",
  "mrs",
  "ms",
  "sr",
  "sra",
]);

function tokens(value: string) {
  return normalizeName(value)
    .split(" ")
    .filter((t) => t.length > 1 && !NAME_NOISE.has(t));
}

/** ¿Un token es compatible con otro? (igual, prefijo o inicial). */
function tokenMatches(a: string, b: string) {
  if (a === b) return true;
  if (a.length === 1 || b.length === 1) return a[0] === b[0];
  if (a.startsWith(b) || b.startsWith(a)) return true;
  return levenshtein(a, b) <= 1;
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/** Puntaje 0–1 entre el nombre detectado y el nombre de una persona. */
export function nameScore(detected: string, person: string) {
  const a = tokens(detected);
  const b = tokens(person);
  if (!a.length || !b.length) return 0;
  let hits = 0;
  const used = new Set<number>();
  for (const ta of a) {
    const idx = b.findIndex((tb, i) => !used.has(i) && tokenMatches(ta, tb));
    if (idx >= 0) {
      used.add(idx);
      hits += 1;
    }
  }
  return hits / Math.min(a.length, b.length);
}

const SEAT_RE = /\b(?:seat|asiento)\s*[:#]?\s*([0-9]{1,3}\s?[A-K])\b/i;
const FLIGHT_RE = /\b(?:flight|vuelo)\s*[:#]?\s*([A-Z]{1,3}\s?[0-9]{1,4})\b/i;
const NAME_LABEL_RE = /(?:passenger(?:\s*name)?|nombre(?:\s*del?\s*pasajero)?|name)\s*[:#]?\s*([^\n]{3,60})/i;

/** Intenta sacar nombre, asiento y vuelo del texto de una página. */
export function extractFromPageText(text: string, page: number): PageExtract {
  const clean = text.replace(/\u00a0/g, " ");
  const hasText = clean.replace(/\s/g, "").length > 20;
  const seat = clean.match(SEAT_RE)?.[1]?.replace(/\s+/g, "") ?? null;
  const flightCode = clean.match(FLIGHT_RE)?.[1]?.replace(/\s+/g, "") ?? null;

  let nameGuess: string | null = clean.match(NAME_LABEL_RE)?.[1]?.trim() ?? null;

  if (!nameGuess) {
    // Sin etiqueta: buscamos una línea tipo "APELLIDO/NOMBRE" o en mayúsculas.
    const lines = clean
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const slash = lines.find((l) => /^[A-ZÁÉÍÓÚÑ' ]{2,30}\/[A-ZÁÉÍÓÚÑ' ]{2,30}$/.test(l));
    if (slash) {
      const [last, first] = slash.split("/");
      nameGuess = `${first?.trim() ?? ""} ${last?.trim() ?? ""}`.trim();
    } else {
      nameGuess =
        lines.find((l) => /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' ]{5,40}$/.test(l) && tokens(l).length >= 2) ?? null;
    }
  }

  if (nameGuess) nameGuess = nameGuess.replace(/\s{2,}/g, " ").slice(0, 60).trim();

  return { page, text: clean, nameGuess, seat, flightCode, hasText };
}

/** Elige la mejor persona para un nombre detectado. */
export function matchPerson(
  nameGuess: string | null,
  people: { user_id: string; label: string }[],
): { userId: string | null; confidence: MatchConfidence } {
  if (!nameGuess) return { userId: null, confidence: "ninguna" };
  const scored = people
    .map((p) => ({ ...p, score: nameScore(nameGuess, p.label) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];
  if (!best || best.score < 0.5) return { userId: null, confidence: "ninguna" };
  const clear = !second || best.score - second.score >= 0.25;
  if (best.score >= 0.9 && clear) return { userId: best.user_id, confidence: "alta" };
  return { userId: best.user_id, confidence: "media" };
}

/** Lee el PDF: texto por página. Devuelve null si el PDF no se puede abrir. */
export async function extractPdfPages(file: File): Promise<PageExtract[] | null> {
  try {
    const pdfjs: any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const out: PageExtract[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      let text = "";
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text = content.items
          .map((it: any) => (typeof it.str === "string" ? it.str : ""))
          .join("\n");
      } catch {
        text = "";
      }
      out.push(extractFromPageText(text, i));
    }
    return out;
  } catch {
    return null;
  }
}

/** Recorta una página del PDF original en un PDF independiente. */
export async function splitPdfPage(file: File, pageIndex: number): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const src = await PDFDocument.load(await file.arrayBuffer());
  const out = await PDFDocument.create();
  const [copied] = await out.copyPages(src, [pageIndex]);
  out.addPage(copied!);
  const bytes = await out.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}
