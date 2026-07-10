// Napojenie na FULL SINTEL — externú platformu na monitoring konkurencie.
// Číta token-scoped read-only export (len dáta klienta Zdravý shot).
// Env: SINTEL_API_URL (https://<sintel-instancia>) + SINTEL_API_KEY.

export type SintelCompetitor = {
  name: string;
  posts: number;
  facebook: number;
  instagram: number;
  telegram: number;
  avg_likes: number | null;
  latest_post: string | null;
};

export type SintelPost = {
  competitor: string | null;
  platform: string;
  posted_at: string;
  url: string | null;
  engagement: number;
  text: string;
};

export type SintelAdvice = {
  summary: string;
  trends: { title: string; why: string; evidence: string }[];
  recommendations: { title: string; detail: string; example_post: string }[];
};

export type SintelExport = {
  client: { name: string; business: string };
  generated_at: string;
  advice: SintelAdvice | null;
  advice_at: string | null;
  competitors: SintelCompetitor[];
  top_posts: SintelPost[];
  total_posts_30d: number;
};

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
};

export function sintelConfigured(): boolean {
  return Boolean(process.env.SINTEL_API_URL && process.env.SINTEL_API_KEY);
}

/** Načíta export z FULL SINTEL. Vracia null pri chybe (stránka zobrazí hint). */
export async function fetchSintelExport(): Promise<SintelExport | null> {
  if (!sintelConfigured()) return null;
  try {
    const res = await fetch(`${process.env.SINTEL_API_URL}/api/commerce/export`, {
      headers: { "x-api-key": process.env.SINTEL_API_KEY! },
      // dáta sa menia po scrapoch (~1× denne) — 5 min cache úplne stačí
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SintelExport;
  } catch {
    return null;
  }
}
