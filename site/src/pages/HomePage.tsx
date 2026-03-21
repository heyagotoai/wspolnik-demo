import { Link } from 'react-router-dom'
import { announcements, communityInfo } from '../data/mockData'
import { MegaphoneIcon, FolderIcon, MailIcon, ArrowRightIcon } from '../components/ui/Icons'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const quickCards = [
  {
    title: 'Aktualności',
    description: 'Bądź na bieżąco z życiem wspólnoty',
    link: '/aktualnosci',
    linkText: 'Zobacz ogłoszenia',
    Icon: MegaphoneIcon,
  },
  {
    title: 'Dokumenty',
    description: 'Regulaminy, protokoły i formularze',
    link: '/dokumenty',
    linkText: 'Przeglądaj dokumenty',
    Icon: FolderIcon,
  },
  {
    title: 'Kontakt',
    description: 'Skontaktuj się z zarządem',
    link: '/kontakt',
    linkText: 'Napisz do nas',
    Icon: MailIcon,
  },
]

export default function HomePage() {
  const latestNews = announcements.filter((a) => !a.pinned).slice(0, 3)

  return (
    <>
      {/* Hero */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-24 md:py-32">
          <p className="text-sm uppercase tracking-widest text-sage font-medium mb-4">
            {communityInfo.fullAddress}
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold text-charcoal tracking-tight leading-tight mb-6">
            Witamy w naszej<br />
            <span className="text-sage">wspólnocie</span>
          </h1>
          <p className="text-lg text-slate max-w-xl mb-10 leading-relaxed">
            Komfortowe mieszkanie w sercu Chojnic. Razem tworzymy miejsce,
            które z dumą nazywamy domem.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/o-nas"
              className="inline-flex items-center px-7 py-3.5 bg-sage text-white rounded-[10px] font-medium text-sm hover:bg-sage-light transition-colors"
            >
              Poznaj nas
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex items-center px-7 py-3.5 border-2 border-sage text-sage rounded-[10px] font-medium text-sm hover:bg-sage hover:text-white transition-colors"
            >
              Kontakt
            </Link>
          </div>
        </div>
      </section>

      {/* Quick access cards */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {quickCards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="group bg-white rounded-[24px] p-8 shadow-[0_12px_32px_rgba(45,52,54,0.05)] hover:shadow-[0_16px_40px_rgba(45,52,54,0.08)] transition-shadow"
            >
              <card.Icon className="w-10 h-10 text-sage mb-5" />
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-slate mb-5">{card.description}</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-sage group-hover:gap-3 transition-all">
                {card.linkText}
                <ArrowRightIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* About preview */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold text-charcoal mb-6">
              O naszej wspólnocie
            </h2>
            <p className="text-slate leading-relaxed mb-6">
              Wspólnota Mieszkaniowa GABI to społeczność mieszkańców budynku
              przy ul. Gdańskiej 58 w Chojnicach. Od lat dbamy o komfort
              i bezpieczeństwo naszych lokatorów, wspólnie tworząc przyjazne
              miejsce do życia. Nasze działania opierają się na wzajemnym
              szacunku, współpracy i trosce o wspólną przestrzeń.
            </p>
            <Link
              to="/o-nas"
              className="inline-flex items-center gap-2 text-sage font-medium hover:gap-3 transition-all"
            >
              Dowiedz się więcej <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Latest news */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <h2 className="text-3xl font-semibold text-charcoal">
            Najnowsze ogłoszenia
          </h2>
          <Link
            to="/aktualnosci"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-sage hover:gap-3 transition-all"
          >
            Zobacz wszystkie <ArrowRightIcon />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {latestNews.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]"
            >
              <span className="inline-block text-xs font-medium text-white bg-sage rounded-full px-3 py-1 mb-4">
                {formatDate(item.date)}
              </span>
              <h3 className="text-base font-semibold text-charcoal mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-slate line-clamp-3">{item.excerpt}</p>
            </article>
          ))}
        </div>

        <Link
          to="/aktualnosci"
          className="md:hidden mt-8 inline-flex items-center gap-2 text-sm font-medium text-sage"
        >
          Zobacz wszystkie <ArrowRightIcon />
        </Link>
      </section>
    </>
  )
}
