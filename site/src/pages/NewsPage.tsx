import { announcements, importantDates } from '../data/mockData'
import { DemoHelpCallout } from '../demo/DemoHelpCallout'
import { CalendarIcon } from '../components/ui/Icons'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  })
}

export default function NewsPage() {
  const pinned = announcements.find((a) => a.pinned)
  const regular = announcements.filter((a) => !a.pinned)

  return (
    <>
      {/* Page hero */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h1 className="text-4xl md:text-5xl font-semibold text-charcoal tracking-tight mb-4">
            Aktualności
          </h1>
          <p className="text-lg text-slate max-w-xl">
            Bądź na bieżąco z życiem naszej wspólnoty.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 py-20">
        <DemoHelpCallout>
          Na stronie głównej widać przykładowe ogłoszenia — w działającym systemie zarząd publikuje je w panelu i mogą
          trafiać też e-mailem do mieszkańców.
        </DemoHelpCallout>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pinned announcement */}
            {pinned && (
              <article className="bg-white rounded-[24px] p-8 shadow-[0_12px_32px_rgba(45,52,54,0.05)] border-l-4 border-amber-container">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber bg-amber-light rounded-full px-3 py-1">
                    Ważne
                  </span>
                  <span className="text-xs text-outline">
                    {formatDate(pinned.date)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-charcoal mb-3">
                  {pinned.title}
                </h2>
                <p className="text-slate leading-relaxed">{pinned.excerpt}</p>
              </article>
            )}

            {/* Regular announcements */}
            {regular.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]"
              >
                <span className="inline-block text-xs font-medium text-white bg-sage rounded-full px-3 py-1 mb-4">
                  {formatDate(item.date)}
                </span>
                <h3 className="text-lg font-semibold text-charcoal mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate leading-relaxed">
                  {item.excerpt}
                </p>
              </article>
            ))}
          </div>

          {/* Sidebar - Important dates */}
          <aside>
            <div className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)] sticky top-24">
              <h3 className="text-lg font-semibold text-charcoal mb-6 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sage" />
                Ważne terminy
              </h3>
              <div className="space-y-4">
                {importantDates.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 pb-4 last:pb-0 last:border-0 border-b border-cream-medium"
                  >
                    <div className="bg-sage-pale/30 rounded-[12px] px-3 py-2 text-center min-w-[60px]">
                      <span className="text-sm font-semibold text-sage block">
                        {formatShortDate(item.date)}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal font-medium pt-1">
                      {item.event}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
