import { NextRequest, NextResponse } from "next/server";

const BOOKS: Record<string, string> = {
  Gn: "Génesis", Ex: "Éxodo", Lv: "Levítico", Nm: "Números", Dt: "Deuteronomio",
  Jos: "Josué", Jue: "Jueces", Rt: "Rut", "1 S": "1 Samuel", "2 S": "2 Samuel",
  "1 R": "1 Reyes", "2 R": "2 Reyes", "1 Cr": "1 Crónicas", "2 Cr": "2 Crónicas",
  Esd: "Esdras", Neh: "Nehemías", Est: "Ester", Job: "Job", Sal: "Salmos",
  Pr: "Proverbios", Ec: "Eclesiastés", Cnt: "Cantares", Is: "Isaías", Jer: "Jeremías",
  Lm: "Lamentaciones", Ez: "Ezequiel", Dn: "Daniel", Os: "Oseas", Jl: "Joel",
  Am: "Amós", Abd: "Abdías", Jon: "Jonás", Mi: "Miqueas", Nah: "Nahúm",
  Hab: "Habacuc", Sof: "Sofonías", Hag: "Hageo", Zac: "Zacarías", Mal: "Malaquías",
  Mt: "Mateo", Mr: "Marcos", Lc: "Lucas", Jn: "Juan", Hch: "Hechos",
  Ro: "Romanos", "1 Co": "1 Corintios", "2 Co": "2 Corintios", Gá: "Gálatas",
  Ef: "Efesios", Fil: "Filipenses", Col: "Colosenses", "1 Ts": "1 Tesalonicenses",
  "2 Ts": "2 Tesalonicenses", "1 Ti": "1 Timoteo", "2 Ti": "2 Timoteo", Tit: "Tito",
  Flm: "Filemón", He: "Hebreos", Stg: "Santiago", "1 P": "1 Pedro", "2 P": "2 Pedro",
  "1 Jn": "1 Juan", "2 Jn": "2 Juan", "3 Jn": "3 Juan", Jud: "Judas", Ap: "Apocalipsis",
};

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", laquo: "«", raquo: "»",
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

function expandBook(reference: string) {
  const match = reference.match(/^((?:[1-3]\s*)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]*?)\.?\s+(.*)$/);
  if (!match) return reference;
  return `${BOOKS[match[1]] ?? match[1]} ${match[2]}`;
}

function normalizeSearch(reference: string) {
  const expanded = expandBook(reference)
    .replace(/(\d+)[a-z]\b/gi, "$1")
    .replace(/(\d+)ss\.?/gi, "$1")
    .replace(/\betc\..*$/i, "");
  const parts = expanded.match(/^(.+?)\s+(\d.*)$/);
  if (!parts) return expanded;

  const book = parts[1];
  const notation = parts[2];
  const passages: string[] = [];
  let lastChapter = "";
  const explicit = /(\d+):([0-9]+(?:-[0-9]+)?(?:\s*,\s*[0-9]+(?:-[0-9]+)?)*)/g;

  for (const match of notation.matchAll(explicit)) {
    lastChapter = match[1];
    match[2].split(",").forEach((verse) => {
      passages.push(`${book} ${lastChapter}:${verse.trim()}`);
    });
  }

  if (lastChapter) {
    const supplemental = /\bvv?\.\s*([0-9]+(?:-[0-9]+)?(?:\s*,\s*[0-9]+(?:-[0-9]+)?)*)/gi;
    for (const match of notation.matchAll(supplemental)) {
      match[1].split(",").forEach((verse) => {
        passages.push(`${book} ${lastChapter}:${verse.trim()}`);
      });
    }
  }

  return Array.from(new Set(passages)).join("; ") || expanded;
}

function extractPassage(html: string) {
  const passages: string[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf('<div class="passage-text">', cursor);
    if (start < 0) break;
    const fullChapter = html.indexOf('<a class="full-chap-link"', start);
    const crossReferences = html.indexOf('<div class="crossrefs', start);
    const otherTranslations = html.indexOf('<div class="passage-other-trans"', start);
    const endCandidates = [fullChapter, crossReferences, otherTranslations].filter((value) => value > start);
    if (!endCandidates.length) break;
    const end = Math.min(...endCandidates);

    const passage = html
      .slice(start, end)
      .replace(/<sup[^>]*class=['"][^'"]*(?:crossreference|footnote)[^'"]*['"][^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<h3[\s\S]*?<\/h3>/gi, "")
      .replace(/<sup class=['"]versenum['"]>([\s\S]*?)<\/sup>/gi, " $1 ")
      .replace(/<[^>]+>/g, " ");
    const clean = decodeEntities(passage).replace(/\s+/g, " ").trim();
    if (clean && !passages.includes(clean)) passages.push(clean);
    cursor = end + 1;
  }

  return passages.join(" ") || null;
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("ref")?.trim() ?? "";
  if (!reference || reference.length > 120 || !/\d+:\d/.test(reference)) {
    return NextResponse.json({ error: "Referencia inválida" }, { status: 400 });
  }

  const search = normalizeSearch(reference);
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=NBLA&interface=print`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "es-ES,es;q=0.9" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Bible Gateway ${response.status}`);
    const text = extractPassage(await response.text());
    if (!text) return NextResponse.json({ error: "Texto no encontrado" }, { status: 404 });

    return NextResponse.json(
      { reference, normalizedReference: search, text, sourceUrl: url },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "No disponible" }, { status: 502 });
  }
}
