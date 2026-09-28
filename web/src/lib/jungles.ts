import { getPool } from "./db";
import type { Jungle } from "./types";

type JungleRow = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  ranges: string[];
  animals: string[];
  best_season: string;
  state: Jungle["state"];
  image_url: string;
  coming_soon: boolean;
};

function toJungle(row: JungleRow): Jungle {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    ranges: row.ranges,
    animals: row.animals,
    bestSeason: row.best_season,
    state: row.state,
    image: row.image_url,
    comingSoon: row.coming_soon,
  };
}

const SELECT_JUNGLES = `
  select slug, name, tagline, description, ranges, animals, best_season,
         state, image_url, coming_soon
  from jungle
`;

export async function getJungles(): Promise<Jungle[]> {
  const result = await getPool().query<JungleRow>(
    `${SELECT_JUNGLES} order by display_order, name`
  );
  return result.rows.map(toJungle);
}

export async function getJungleBySlug(slug: string): Promise<Jungle | null> {
  const result = await getPool().query<JungleRow>(
    `${SELECT_JUNGLES} where slug = $1 limit 1`,
    [slug]
  );
  return result.rows[0] ? toJungle(result.rows[0]) : null;
}
