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
  group?: string | null;
  terminal?: string | null;
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
const NAME_LABEL_RE = /^(?:passenger(?:\s*name)?|nombre(?:\s*del?\s*pasajero)?|pasajero|name)\s*[:#]?\s*(.*)$/i;
const NAME_LINE_RE = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü' .-]{3,60}$/;
const NOT_NAME = /\b(pase|abordar|boarding|terminal|vuelo|flight|tarifa|equipaje|asiento|grupo|puerta|reserva|fecha|servicios|contactanos|aeropuerto|cierre|inicio|salida)\b/;

/** ¿Parece un nombre de persona? 2–6 palabras, solo letras. */
function looksLikeName(line: string) {
  if (!NAME_LINE_RE.test(line)) return false;
  const n = normalizeName(line);
  if (NOT_NAME.test(n)) return false;
  const words = n.split(" ").filter((w) => w.length > 1);
  return words.length >= 2 && words.length <= 6;
}

/** Nombre del pasajero: etiqueta, formato Volaris (tras la clave de reserva o antes de "SEC."), APELLIDO/NOMBRE o línea en mayúsculas. */
export function guessName(text: string): string | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const slash = (l: string) => {
    const m = l.match(/^([A-ZÁÉÍÓÚÑ' -]{2,30})\s*\/\s*([A-ZÁÉÍÓÚÑ' -]{2,30}?)(?:\s+(?:MR|MRS|MS|SR|SRA))?$/i);
    return m ? `${m[2]!.trim()} ${m[1]!.trim()}` : null;
  };
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(NAME_LABEL_RE);
    if (!m) continue;
    const same = m[1]!.trim();
    const cand = same || lines[i + 1] || "";
    const s = slash(cand);
    if (s) return s;
    if (looksLikeName(cand)) return cand;
  }
  // Volaris: "Reserva" → clave (6 caracteres) → nombre.
  const r = lines.findIndex((l) => /^(reserva|reservation|clave de reserva|booking)$/i.test(l));
  if (r >= 0 && /^[A-Z0-9]{5,7}$/.test(lines[r + 1] ?? "") && looksLikeName(lines[r + 2] ?? "")) return lines[r + 2]!;
  const sec = lines.findIndex((l) => /^(sec\.?|secuencia|seq\.?)$/i.test(l));
  if (sec > 0 && looksLikeName(lines[sec - 1]!)) return lines[sec - 1]!;
  for (const l of lines) { const s = slash(l); if (s) return s; }
  return lines.find((l) => /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' ]{5,40}$/.test(l) && looksLikeName(l)) ?? null;
}

/** Intenta sacar nombre, asiento y vuelo del texto de una página. */
export function extractFromPageText(text: string, page: number): PageExtract {
  const clean = text.replace(/\u00a0/g, " ");
  const hasText = clean.replace(/\s/g, "").length > 20;
  const seat = clean.match(SEAT_RE)?.[1]?.replace(/\s+/g, "") ?? null;
  const flightCode = clean.match(FLIGHT_RE)?.[1]?.replace(/\s+/g, "") ?? null;

  const nameGuess0 = guessName(clean);
  let nameGuess: string | null = nameGuess0;
  if (nameGuess) nameGuess = nameGuess.replace(/\s{2,}/g, " ").slice(0, 60).trim();

  const group = clean.match(/\b(?:group|grupo|zona|zone)\s*[:#]?\s*([A-Z0-9]{1,2})\b/i)?.[1]?.toUpperCase() ?? null;
  const terminal = clean.match(/\b(?:terminal|term)\s*[:#.]?\s*([A-Z0-9]{1,2})\b/i)?.[1]?.toUpperCase() ?? null;
  return { page, text: clean, nameGuess, seat, flightCode, group, terminal, hasText };
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

const MONTHS = [
  ["JAN", "ENE"], ["FEB"], ["MAR"], ["APR", "ABR"], ["MAY"], ["JUN"],
  ["JUL"], ["AUG", "AGO"], ["SEP", "SEPT"], ["OCT"], ["NOV"], ["DEC", "DIC"],
];

/** "AM 1234" / "am1234" / "AM-01234" → "AM1234". */
export function normalizeFlightCode(code: string | null | undefined) {
  if (!code) return "";
  const m = code.toUpperCase().replace(/[^A-Z0-9]/g, "").match(/^([A-Z0-9]{2})0*([0-9]{1,4})$/);
  return m ? `${m[1]}${m[2]}` : code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function dateTokens(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const toks = new Set<string>([`${dd}/${mm}`, `${d.getFullYear()}-${mm}-${dd}`, `${dd}-${mm}-${d.getFullYear()}`]);
  for (const mon of MONTHS[d.getMonth()]!) {
    toks.add(`${dd}${mon}`);
    toks.add(`${d.getDate()}${mon}`);
  }
  return [...toks];
}

/**
 * ¿A qué vuelo pertenece el pase? Primero por código de vuelo (en el texto o
 * el detectado); si no, por la fecha del vuelo. Null si no hay una única opción.
 */
export function detectFlight<F extends { id: string; flight_code: string; departs_at: string }>(
  extract: Pick<PageExtract, "text" | "flightCode">,
  flights: F[],
): F | null {
  if (!flights.length) return null;
  const compact = extract.text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const detected = normalizeFlightCode(extract.flightCode);
  const byCode = flights.filter((f) => {
    const c = normalizeFlightCode(f.flight_code);
    if (!c) return false;
    if (detected && detected === c) return true;
    const [, air, num] = c.match(/^([A-Z0-9]{2})([0-9]+)$/) ?? [];
    if (!air || !num) return compact.includes(c);
    return new RegExp(`${air}0*${num}(?![0-9])`).test(compact);
  });
  if (byCode.length === 1) return byCode[0]!;
  const spaced = extract.text.toUpperCase().replace(/\s+/g, "");
  const byDate = flights.filter((f) => dateTokens(f.departs_at).some((tok) => spaced.includes(tok)));
  if (byDate.length === 1) return byDate[0]!;
  return null;
}

/** Miniatura (dataURL) de una página del PDF. */
export async function renderPdfPageThumb(file: File, pageIndex: number, width = 120): Promise<string | null> {
  try {
    const pdfjs: any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await doc.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

/**
 * Lee un PDF y convierte cada página en imagen JPEG (para que se vea en
 * cualquier celular), junto con el texto extraído. Null si no se puede abrir.
 */
export async function pdfToPassImages(file: File, onPage?: (done: number, total: number) => void): Promise<{ extract: PageExtract; blob: Blob }[] | null> {
  try {
    const pdfjs: any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const out: { extract: PageExtract; blob: Blob }[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      let text = "";
      try {
        const content = await page.getTextContent();
        text = content.items.map((it: any) => (typeof it.str === "string" ? it.str : "")).join("\n");
      } catch { text = ""; }
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(3, 1400 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
      if (!blob) throw new Error("render");
      out.push({ extract: extractFromPageText(text, i), blob });
      onPage?.(i, doc.numPages);
    }
    return out;
  } catch {
    return null;
  }
}
