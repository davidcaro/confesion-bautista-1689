export type BibleVersionKey = "RVR1960" | "NBLA" | "NTV" | "LBLA";

export const BIBLE_VERSIONS: Record<
  BibleVersionKey,
  {
    code: BibleVersionKey;
    name: string;
    shortName: string;
    copyright: string;
  }
> = {
  RVR1960: {
    code: "RVR1960",
    name: "Reina-Valera 1960",
    shortName: "RVR1960",
    copyright: "RVR1960 © Sociedades Bíblicas Unidas · vía Bible Gateway",
  },
  NBLA: {
    code: "NBLA",
    name: "Nueva Biblia de las Américas",
    shortName: "NBLA",
    copyright: "NBLA © The Lockman Foundation · vía Bible Gateway",
  },
  NTV: {
    code: "NTV",
    name: "Nueva Traducción Viviente",
    shortName: "NTV",
    copyright: "NTV © Tyndale House Publishers · vía Bible Gateway",
  },
  LBLA: {
    code: "LBLA",
    name: "La Biblia de las Américas",
    shortName: "LBLA",
    copyright: "LBLA © The Lockman Foundation · vía Bible Gateway",
  },
};

export const BIBLE_VERSION_KEYS = Object.keys(BIBLE_VERSIONS) as BibleVersionKey[];
