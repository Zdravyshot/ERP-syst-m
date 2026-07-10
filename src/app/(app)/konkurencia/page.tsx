import { PageHeader, PlaceholderCard } from "@/components/PageHeader";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  fetchSintelExport,
  sintelConfigured,
  PLATFORM_LABELS,
} from "./sintel";

export default async function KonkurenciaPage() {
  if (!sintelConfigured()) {
    return (
      <>
        <PageHeader
          title="Konkurencia"
          subtitle="Sledovanie konkurencie cez platformu FULL SINTEL"
        />
        <PlaceholderCard text="Napojenie nie je nakonfigurované — nastav SINTEL_API_URL a SINTEL_API_KEY v .env (kľúč vydáva správca FULL SINTEL)." />
      </>
    );
  }

  const data = await fetchSintelExport();
  if (!data) {
    return (
      <>
        <PageHeader
          title="Konkurencia"
          subtitle="Sledovanie konkurencie cez platformu FULL SINTEL"
        />
        <PlaceholderCard text="Dáta z FULL SINTEL sa nepodarilo načítať — skontroluj SINTEL_API_URL / SINTEL_API_KEY, prípadne skús o chvíľu." />
      </>
    );
  }

  const { advice } = data;

  return (
    <>
      <PageHeader
        title="Konkurencia"
        subtitle={`Čo konkurencia postuje a čo jej funguje · FULL SINTEL · ${formatDateTime(data.generated_at)}`}
      />

      {advice ? (
        <section className="mb-6 rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">💡 Rady — ako sa chytiť trendov</h2>
            {data.advice_at && (
              <span className="text-xs text-gray-400">vygenerované {formatDate(data.advice_at)}</span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{advice.summary}</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Čo rezonuje u konkurencie
              </h3>
              {advice.trends.map((t, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                  <p className="mt-1 text-sm text-gray-600">{t.why}</p>
                  <p className="mt-2 text-xs text-gray-400">📌 {t.evidence}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Odporúčané kroky
              </h3>
              {advice.recommendations.map((r, i) => (
                <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-semibold text-emerald-900">{r.title}</div>
                  <p className="mt-1 text-sm text-gray-600">{r.detail}</p>
                  {r.example_post && (
                    <div className="mt-2 whitespace-pre-wrap rounded border-l-2 border-emerald-400 bg-white px-3 py-2 text-xs text-gray-700">
                      ✍️ {r.example_post}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-400">
          Rady zatiaľ nie sú vygenerované — generujú sa v administrácii FULL SINTEL a zobrazia sa tu automaticky.
        </section>
      )}

      <section className="mb-6 rounded-xl bg-white p-6 ring-1 ring-gray-200">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Sledovaní konkurenti ({data.competitors.length})
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
              <th className="py-2 font-medium">Konkurent</th>
              <th className="py-2 text-right font-medium">Príspevky</th>
              <th className="hidden py-2 text-right font-medium sm:table-cell">FB / IG / TG</th>
              <th className="hidden py-2 text-right font-medium sm:table-cell">Ø lajky</th>
              <th className="py-2 text-right font-medium">Posledný post</th>
            </tr>
          </thead>
          <tbody>
            {data.competitors.map((c) => (
              <tr key={c.name} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 font-medium text-gray-900">{c.name}</td>
                <td className="py-2.5 text-right text-gray-700">{c.posts}</td>
                <td className="hidden py-2.5 text-right text-gray-400 sm:table-cell">
                  {c.facebook} / {c.instagram} / {c.telegram}
                </td>
                <td className="hidden py-2.5 text-right text-gray-500 sm:table-cell">{c.avg_likes ?? "—"}</td>
                <td className="py-2.5 text-right text-xs text-gray-400">{formatDate(c.latest_post)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          💥 Najrezonantnejšie príspevky konkurencie
          <span className="ml-2 text-sm font-normal text-gray-400">
            30 dní · {data.total_posts_30d} celkovo
          </span>
        </h2>
        {data.top_posts.length === 0 ? (
          <p className="text-sm text-gray-400">Za posledných 30 dní zatiaľ žiadne príspevky.</p>
        ) : (
          <div className="space-y-3">
            {data.top_posts.map((p, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-700">{p.competitor ?? "?"}</span>
                  <span>· {PLATFORM_LABELS[p.platform] ?? p.platform}</span>
                  <span>· {formatDate(p.posted_at)}</span>
                  <span>· ❤ {p.engagement}</span>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener"
                      className="ml-auto font-medium text-emerald-700 hover:underline"
                    >
                      zdroj ↗
                    </a>
                  )}
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-gray-700">{p.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
