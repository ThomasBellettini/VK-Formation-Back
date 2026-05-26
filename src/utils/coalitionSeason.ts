import CoalitionSeason from "../model/coalition/CoalitionSeason.js";

const FIRST_AVAILABLE_SEASON = {
  year: 2026,
  seasonIndex: 3 as const,
  voteStartDateKey: "2026-07-01",
};

export interface CoalitionSeasonBootstrapRow {
  seasonKey: string;
  year: number;
  seasonIndex: 1 | 2 | 3 | 4;
  warStartDateKey: string;
  warEndDateKey: string;
  voteStartDateKey: string;
  voteEndDateKey: string;
}

export type SeasonPhase = "war" | "vote";

export interface SeasonInfo {
  seasonKey: string;
  year: number;
  seasonIndex: 1 | 2 | 3 | 4;
  phase: SeasonPhase;
  voteStartDateKey: string;
  voteEndDateKey: string;
  warStartDateKey: string;
  warEndDateKey: string;
}

export function getParisYmd(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { y: get("year"), m: get("month"), day: get("day") };
}

export function getParisDateKey(d: Date = new Date()): string {
  const { y, m, day } = getParisYmd(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildSeasonRowsForYear(
  year: number
): CoalitionSeasonBootstrapRow[] {
  const y = year;
  const rows: CoalitionSeasonBootstrapRow[] = [
    {
      seasonKey: `${y}-1`,
      year: y,
      seasonIndex: 1,
      voteStartDateKey: `${y}-01-01`,
      voteEndDateKey: `${y}-01-07`,
      warStartDateKey: `${y}-01-08`,
      warEndDateKey: `${y}-03-31`,
    },
    {
      seasonKey: `${y}-2`,
      year: y,
      seasonIndex: 2,
      voteStartDateKey: `${y}-04-01`,
      voteEndDateKey: `${y}-04-07`,
      warStartDateKey: `${y}-04-08`,
      warEndDateKey: `${y}-06-30`,
    },
    {
      seasonKey: `${y}-3`,
      year: y,
      seasonIndex: 3,
      voteStartDateKey: `${y}-07-01`,
      voteEndDateKey: `${y}-07-07`,
      warStartDateKey: `${y}-07-08`,
      warEndDateKey: `${y}-09-30`,
    },
    {
      seasonKey: `${y}-4`,
      year: y,
      seasonIndex: 4,
      voteStartDateKey: `${y}-10-01`,
      voteEndDateKey: `${y}-10-07`,
      warStartDateKey: `${y}-10-08`,
      warEndDateKey: `${y}-12-31`,
    },
  ];

  return rows.filter(
    (row) =>
      row.year > FIRST_AVAILABLE_SEASON.year ||
      (row.year === FIRST_AVAILABLE_SEASON.year &&
        row.seasonIndex >= FIRST_AVAILABLE_SEASON.seasonIndex)
  );
}

export function pickBootstrapRowContainingDateKey(
  dateKeyParis: string
): CoalitionSeasonBootstrapRow {
  if (dateKeyParis < FIRST_AVAILABLE_SEASON.voteStartDateKey) {
    return buildSeasonRowsForYear(FIRST_AVAILABLE_SEASON.year)[0]!;
  }

  const y = Number(dateKeyParis.slice(0, 4));
  if (!Number.isFinite(y)) {
    throw new Error(`Clé date Paris invalide: ${dateKeyParis}`);
  }
  const rows = buildSeasonRowsForYear(y);
  for (const row of rows) {
    if (
      dateKeyParis >= row.voteStartDateKey &&
      dateKeyParis <= row.warEndDateKey
    ) {
      return row;
    }
  }
  throw new Error(
    `Aucune saison calendaire ne contient la date Paris ${dateKeyParis}`
  );
}

export function nextSeasonRowAfter(
  row: CoalitionSeasonBootstrapRow
): CoalitionSeasonBootstrapRow {
  const sameYear = buildSeasonRowsForYear(row.year);
  if (row.seasonIndex < 4) {
    return (
      sameYear.find((candidate) => candidate.seasonIndex === row.seasonIndex + 1)!
    );
  }
  return buildSeasonRowsForYear(row.year + 1)[0]!;
}

export async function ensureCurrentAndNextSeasonDocs(
  at: Date = new Date()
): Promise<void> {
  const dateKeyParis = getParisDateKey(at);
  const current = pickBootstrapRowContainingDateKey(dateKeyParis);
  const nextRow = nextSeasonRowAfter(current);
  const rows = [current, nextRow];

  const bulk: Parameters<typeof CoalitionSeason.bulkWrite>[0] = rows.map(
    (row) => ({
      updateOne: {
        filter: { seasonKey: row.seasonKey },
        update: {
          $setOnInsert: {
            seasonKey: row.seasonKey,
            year: row.year,
            seasonIndex: row.seasonIndex,
            warStartDateKey: row.warStartDateKey,
            warEndDateKey: row.warEndDateKey,
            voteStartDateKey: row.voteStartDateKey,
            voteEndDateKey: row.voteEndDateKey,
          },
        },
        upsert: true,
      },
    })
  );
  await CoalitionSeason.bulkWrite(bulk, { ordered: false });
}

function seasonInfoFromDoc(
  doc: CoalitionSeasonBootstrapRow,
  dateKeyParis: string
): SeasonInfo {
  let phase: SeasonPhase;
  if (
    dateKeyParis >= doc.voteStartDateKey &&
    dateKeyParis <= doc.voteEndDateKey
  ) {
    phase = "vote";
  } else if (
    dateKeyParis >= doc.warStartDateKey &&
    dateKeyParis <= doc.warEndDateKey
  ) {
    phase = "war";
  } else {
    throw new Error(
      `Clé Paris ${dateKeyParis} hors plages guerre/vote pour ${doc.seasonKey}`
    );
  }

  return {
    seasonKey: doc.seasonKey,
    year: doc.year,
    seasonIndex: doc.seasonIndex,
    phase,
    voteStartDateKey: doc.voteStartDateKey,
    voteEndDateKey: doc.voteEndDateKey,
    warStartDateKey: doc.warStartDateKey,
    warEndDateKey: doc.warEndDateKey,
  };
}

export async function getSeasonInfoAt(
  at: Date = new Date()
): Promise<SeasonInfo | null> {
  const dateKeyParis = getParisDateKey(at);
  await ensureCurrentAndNextSeasonDocs(at);

  const key = dateKeyParis;

  const doc = await CoalitionSeason.findOne({
    $or: [
      {
        voteStartDateKey: { $lte: key },
        voteEndDateKey: { $gte: key },
      },
      {
        warStartDateKey: { $lte: key },
        warEndDateKey: { $gte: key },
      },
    ],
  })
    .sort({ voteStartDateKey: 1 })
    .lean();

  if (!doc) return null;
  const row: CoalitionSeasonBootstrapRow = {
    seasonKey: doc.seasonKey,
    year: doc.year,
    seasonIndex: doc.seasonIndex as CoalitionSeasonBootstrapRow["seasonIndex"],
    warStartDateKey: doc.warStartDateKey,
    warEndDateKey: doc.warEndDateKey,
    voteStartDateKey: doc.voteStartDateKey,
    voteEndDateKey: doc.voteEndDateKey,
  };
  return seasonInfoFromDoc(row, dateKeyParis);
}

export async function requireSeasonInfoAt(at?: Date): Promise<SeasonInfo> {
  const s = await getSeasonInfoAt(at ?? new Date());
  if (!s) {
    throw new Error(
      "Aucune CoalitionSeason trouvée pour la date courante ; vérifiez la base ou le bootstrap."
    );
  }
  return s;
}
