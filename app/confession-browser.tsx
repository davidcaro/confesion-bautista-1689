"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, BookOpenCheck, Check, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Menu, MessageSquarePlus, Minus, Moon, Plus, Search, Settings2, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import chapters from "./data/confession.json";
import { ReflectionPanel, StudyNotesPanel } from "./study-panels";

type Chapter = (typeof chapters)[number];
type Section = { text: string; references: string[] };
type ReferenceGroup = { number: string; citations: string[] };
type FontPreference = "sans" | "serif";
type TextSize = "small" | "medium" | "large";
type ColorTheme = "light" | "dark";

const PREFERENCES_KEY = "confesion-1689-preferencias";
const textSizes: TextSize[] = ["small", "medium", "large"];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function toSections(chapter: Chapter): Section[] {
  const sections: Section[] = [];
  for (const paragraph of chapter.paragraphs) {
    const isReference = /^\d+\.\s+.*\d+:\d+/.test(paragraph);
    if (isReference && sections.length) {
      sections[sections.length - 1].references.push(paragraph);
    } else {
      sections.push({ text: paragraph, references: [] });
    }
  }
  return sections;
}

function bibleGatewayUrl(reference: string) {
  const linkReference = reference
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d)\s*ss\.?/gi, "$1")
    .replace(/(\d)[a-z](?=[,;.:\-–\s]|$)/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(linkReference)}&version=NBLA`;
}

function splitReferences(groups: string[]) {
  let currentBook = "";
  const seen = new Set<string>();

  return groups
    .flatMap((group) =>
      group
        .replace(/\.\s+\d+\.\s+(?=(?:[1-3]\s*)?[A-ZÁÉÍÓÚÑ])/g, ". ||| ")
        .split(/;|\|\|\|/),
    )
    .map((item) => item.trim().replace(/^\d+\.\s+/, "").replace(/\s+/g, " "))
    .map((item) => {
      const book = item.match(/^((?:[1-3]\s*)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]*\.?)\s+(?=\d)/)?.[1];
      if (book) currentBook = book;
      if (!book && /^\d/.test(item) && currentBook) return `${currentBook} ${item}`;
      return item;
    })
    .map((item) => item.replace(/[.,]+$/, "").trim())
    .filter((item) => /\d+:\d/.test(item) && !seen.has(item) && seen.add(item));
}

function toReferenceGroups(references: string[]): ReferenceGroup[] {
  const groups: Array<{ number: string; blocks: string[] }> = [];
  let current: { number: string; blocks: string[] } | undefined;

  for (const block of references) {
    const marker = /(?:^|\s)(\d+)\.\s+(?=(?:[1-3]\s*)?[A-ZÁÉÍÓÚÑ])/g;
    const matches = Array.from(block.matchAll(marker));

    if (!matches.length) {
      current?.blocks.push(block);
      continue;
    }

    matches.forEach((match, index) => {
      const number = match[1];
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? block.length;
      const content = block.slice(start, end).trim();
      current = groups.find((group) => group.number === number);
      if (!current) {
        current = { number, blocks: [] };
        groups.push(current);
      }
      if (content) current.blocks.push(content);
    });
  }

  return groups
    .map((group) => ({ number: group.number, citations: splitReferences(group.blocks) }))
    .filter((group) => group.citations.length > 0);
}

function renderParagraph(text: string, referencePrefix: string, groupNumbers: string[]) {
  const clean = text.replace(/^\d+\.\s+/, "");
  if (!groupNumbers.length) return clean;
  const choices = [...groupNumbers].sort((a, b) => b.length - a.length).join("|");
  const parts = clean.split(new RegExp(`(?<![\\d\\s])(${choices})(?=[.,;:]?(?:\\s|$))`, "g"));

  return parts.map((part, index) =>
    groupNumbers.includes(part) ? (
      <sup className="paragraph-reference" key={`${referencePrefix}-${index}`}>
        <a href={`#${referencePrefix}-${part}`} aria-label={`Ir al grupo de citas ${part}`}>{part}</a>
      </sup>
    ) : part,
  );
}

type PassageState =
  | { status: "idle" | "loading"; text?: undefined }
  | { status: "ready"; text: string }
  | { status: "error"; text?: undefined };

function BibleReference({ reference }: { reference: string }) {
  const [passage, setPassage] = useState<PassageState>({ status: "idle" });

  const loadPassage = async () => {
    if (passage.status !== "idle") return;
    setPassage({ status: "loading" });
    try {
      const response = await fetch(`/api/bible?ref=${encodeURIComponent(reference)}&format=3`);
      if (!response.ok) throw new Error("Passage unavailable");
      const data = (await response.json()) as { text: string };
      setPassage({ status: "ready", text: data.text });
    } catch {
      setPassage({ status: "error" });
    }
  };

  return (
    <span
      className="scripture-tooltip"
      tabIndex={0}
      onMouseEnter={loadPassage}
      onFocus={loadPassage}
    >
      <span className="reference-chip">{reference}</span>
      <span className="tooltip-card" role="tooltip">
        <span className="tooltip-kicker">Nueva Biblia de las Américas</span>
        <strong>{reference}</strong>
        {passage.status === "idle" || passage.status === "loading" ? (
          <span className="tooltip-loading"><LoaderCircle /> Cargando texto NBLA…</span>
        ) : passage.status === "ready" ? (
          <span className="tooltip-passage">{passage.text}</span>
        ) : (
          <span>No fue posible cargar el texto en este momento.</span>
        )}
        <span className="tooltip-copyright">NBLA © The Lockman Foundation · vía Bible Gateway</span>
        <a href={bibleGatewayUrl(reference)} target="_blank" rel="noreferrer">
          Abrir pasaje completo <ExternalLink />
        </a>
      </span>
    </span>
  );
}

export default function ConfessionBrowser() {
  const [query, setQuery] = useState("");
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontPreference, setFontPreference] = useState<FontPreference>("sans");
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("light");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ chapter: number; section: number } | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}") as {
        font?: FontPreference;
        size?: TextSize;
        theme?: ColorTheme;
      };
      if (saved.font === "sans" || saved.font === "serif") setFontPreference(saved.font);
      if (textSizes.includes(saved.size as TextSize)) setTextSize(saved.size as TextSize);
      if (saved.theme === "light" || saved.theme === "dark") setColorTheme(saved.theme);
    } catch {
      // Keep the reading defaults when stored preferences are invalid.
    }
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ font: fontPreference, size: textSize, theme: colorTheme }));
  }, [colorTheme, fontPreference, preferencesReady, textSize]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return chapters;
    if (/^\d+$/.test(term)) {
      const chapterNumber = Number(term);
      return chapters.filter((chapter) => chapter.number === chapterNumber);
    }
    return chapters.filter((chapter) => {
      const haystack = normalize(
        `${chapter.number} ${chapter.title} ${chapter.topics.join(" ")} ${chapter.paragraphs.join(" ")}`,
      );
      return haystack.includes(term);
    });
  }, [query]);

  useEffect(() => {
    const exactNumber = Number(query.trim());
    if (exactNumber >= 1 && exactNumber <= 32 && Number.isInteger(exactNumber)) {
      setSelectedNumber(exactNumber);
    }
  }, [query]);

  const chapter = chapters.find((item) => item.number === selectedNumber) ?? chapters[0];
  const sections = useMemo(() => toSections(chapter), [chapter]);
  const referenceGroupCount = useMemo(
    () => sections.reduce((total, section) => total + toReferenceGroups(section.references).length, 0),
    [sections],
  );
  const progress = Math.round((chapter.number / chapters.length) * 100);

  const selectChapter = (number: number) => {
    setSelectedNumber(number);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeTextSize = (direction: -1 | 1) => {
    const nextIndex = Math.min(textSizes.length - 1, Math.max(0, textSizes.indexOf(textSize) + direction));
    setTextSize(textSizes[nextIndex]);
  };

  return (
    <main className={`site-shell reader-font-${fontPreference} reader-size-${textSize} theme-${colorTheme}`}>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Ir al inicio">
          <span className="brand-mark">1689</span>
          <span className="brand-name">Confesión Bautista</span>
        </a>
        <div className="topbar-meta">
          <span>Edición de estudio</span>
          <span className="topbar-dot" aria-hidden="true" />
          <span>32 capítulos</span>
        </div>
        <div className="topbar-actions">
          <div className="reading-settings">
            <Button
              className="settings-button rounded-full"
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Ajustes de lectura"
              aria-expanded={settingsOpen}
              aria-controls="reading-settings-panel"
            >
              <Settings2 />
            </Button>
            {settingsOpen && (
              <div className="settings-panel" id="reading-settings-panel" role="dialog" aria-label="Ajustes de lectura">
                <div className="settings-heading">
                  <div><span>Lectura</span><strong>Ajustes visuales</strong></div>
                  <button onClick={() => setSettingsOpen(false)} aria-label="Cerrar ajustes"><X /></button>
                </div>

                <div className="setting-row">
                  <div><strong>Tipografía</strong><span>Elige el estilo del texto</span></div>
                  <div className="segmented-control" aria-label="Tipografía">
                    <button aria-pressed={fontPreference === "sans"} className={fontPreference === "sans" ? "is-active" : ""} onClick={() => setFontPreference("sans")}>
                      <span className="font-preview-sans">Aa</span> Sans {fontPreference === "sans" && <Check />}
                    </button>
                    <button aria-pressed={fontPreference === "serif"} className={fontPreference === "serif" ? "is-active" : ""} onClick={() => setFontPreference("serif")}>
                      <span className="font-preview-serif">Aa</span> Serif {fontPreference === "serif" && <Check />}
                    </button>
                  </div>
                </div>

                <div className="setting-row setting-row-inline">
                  <div><strong>Tamaño del texto</strong><span>{textSize === "small" ? "Pequeño" : textSize === "large" ? "Grande" : "Mediano"}</span></div>
                  <div className="size-control">
                    <button onClick={() => changeTextSize(-1)} disabled={textSize === "small"} aria-label="Reducir texto"><Minus /></button>
                    <span aria-hidden="true">A</span>
                    <button onClick={() => changeTextSize(1)} disabled={textSize === "large"} aria-label="Aumentar texto"><Plus /></button>
                  </div>
                </div>

                <div className="setting-row">
                  <div><strong>Tema</strong><span>Reduce o aumenta el contraste</span></div>
                  <div className="segmented-control theme-control" aria-label="Tema de color">
                    <button aria-pressed={colorTheme === "light"} className={colorTheme === "light" ? "is-active" : ""} onClick={() => setColorTheme("light")}><Sun /> Claro</button>
                    <button aria-pressed={colorTheme === "dark"} className={colorTheme === "dark" ? "is-active" : ""} onClick={() => setColorTheme("dark")}><Moon /> Oscuro</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button
            className="mobile-menu-button rounded-full"
            variant="outline"
            size="icon"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar capítulos" : "Abrir capítulos"}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      <div className="workspace" id="inicio">
        <aside className={`chapter-rail ${menuOpen ? "is-open" : ""}`}>
          <div className="search-wrap">
            <Search aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tema, palabra o capítulo…"
              aria-label="Buscar en la confesión"
              className="search-input"
            />
            {query && (
              <button className="clear-search" onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
                <X />
              </button>
            )}
          </div>

          <div className="rail-heading">
            <span>Índice</span>
            <span>{filtered.length} de 32</span>
          </div>

          <nav className="chapter-list" aria-label="Capítulos">
            {filtered.length ? (
              filtered.map((item) => (
                <button
                  key={item.number}
                  className={`chapter-link ${item.number === chapter.number ? "is-active" : ""}`}
                  onClick={() => selectChapter(item.number)}
                >
                  <span className="chapter-number">{String(item.number).padStart(2, "0")}</span>
                  <span>{item.title}</span>
                </button>
              ))
            ) : (
              <div className="empty-search">
                <Search />
                <p>No encontramos ese término.</p>
                <button onClick={() => setQuery("")}>Ver todos los capítulos</button>
              </div>
            )}
          </nav>
        </aside>

        <article className="reader">
          <div className="progress-line" aria-label={`Progreso: ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <header className="chapter-hero">
            <div className="eyebrow">
              <BookOpen />
              Capítulo {String(chapter.number).padStart(2, "0")}
            </div>
            <h1>{chapter.title}</h1>
            <div className="topic-row" aria-label="Temas del capítulo">
              {chapter.topics.map((topic) => <span key={topic}>{topic}</span>)}
            </div>
            <div className="hero-stats">
              <div><strong>{sections.length}</strong><span>secciones</span></div>
              <div><strong>{referenceGroupCount}</strong><span>grupos de citas</span></div>
              <div><strong>{progress}%</strong><span>del recorrido</span></div>
            </div>
            <button className="study-question-cta" onClick={() => setReflectionOpen(true)}>
              <span className="study-question-icon"><BookOpenCheck /></span>
              <span><strong>Preguntas de estudio</strong><small>5 preguntas abiertas para profundizar en este capítulo</small></span>
              <ChevronRight />
            </button>
          </header>

          <div className="reading-column">
            {sections.map((section, index) => {
              const referencePrefix = `ref-${chapter.number}-${index + 1}`;
              const referenceGroups = toReferenceGroups(section.references);
              return (
              <section className="confession-section" key={`${chapter.number}-${index}`}>
                <div className="section-index"><span>{String(index + 1).padStart(2, "0")}</span><button onClick={() => setNoteTarget({ chapter: chapter.number, section: index + 1 })} aria-label={`Ver o agregar notas del párrafo ${index + 1}`} title="Notas de estudio"><MessageSquarePlus /></button></div>
                <div className="section-content">
                  <p>{renderParagraph(section.text, referencePrefix, referenceGroups.map((group) => group.number))}</p>
                  {referenceGroups.length > 0 && (
                    <div className="references">
                      <span className="references-label">Textos bíblicos</span>
                      {referenceGroups.map((group) => (
                        <div className="reference-group" id={`${referencePrefix}-${group.number}`} key={group.number}>
                          <div className="reference-group-number" aria-label={`Grupo de citas ${group.number}`}>{group.number}</div>
                          <div className="reference-group-citations">
                            {group.citations.map((reference) => (
                              <BibleReference reference={reference} key={reference} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              );
            })}
          </div>

          <div className="study-question-footer">
            <div><span>Continúa el estudio</span><h2>Reflexiona sobre este capítulo</h2><p>Repasa sus enseñanzas con cinco preguntas abiertas, individualmente o en grupo.</p></div>
            <Button className="rounded-full" onClick={() => setReflectionOpen(true)}><BookOpenCheck /> Ver preguntas de estudio</Button>
          </div>

          <nav className="chapter-pagination" aria-label="Navegación entre capítulos">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={chapter.number === 1}
              onClick={() => selectChapter(chapter.number - 1)}
            >
              <ChevronLeft /> Anterior
            </Button>
            <span>{chapter.number} / 32</span>
            <Button
              className="rounded-full"
              disabled={chapter.number === 32}
              onClick={() => selectChapter(chapter.number + 1)}
            >
              Siguiente <ChevronRight />
            </Button>
          </nav>

          <footer className="reader-footer">
            <p>Texto base: Confesión Bautista de Fe de 1689, edición Chapel Library.</p>
            <a href="https://www.chapellibrary.org/pdf/books/lbcos.pdf" target="_blank" rel="noreferrer">
              Consultar PDF original <ExternalLink />
            </a>
          </footer>
        </article>
      </div>
      {noteTarget && <StudyNotesPanel chapter={noteTarget.chapter} section={noteTarget.section} onClose={() => setNoteTarget(null)} />}
      {reflectionOpen && <ReflectionPanel chapter={chapter} onClose={() => setReflectionOpen(false)} />}
    </main>
  );
}
