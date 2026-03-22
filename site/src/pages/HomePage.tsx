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
      {/* Hero — split layout */}
      <section className="relative min-h-[85vh] flex flex-col md:flex-row overflow-hidden">
        {/* Lewa strona — treść */}
        <div className="relative w-full md:w-[50%] flex items-center bg-cream-dark px-8 md:px-16 lg:px-24 py-20 md:py-0 z-20">
          {/* Dekoracja: dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle, #6B8F71 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          {/* Dekoracja: blur blob */}
          <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sage-pale/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center bg-sage text-white px-4 py-1.5 rounded-full mb-8 text-[11px] font-bold tracking-[0.15em] uppercase">
              {communityInfo.fullAddress}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-charcoal tracking-tight leading-[0.95] mb-8">
              Witamy w naszej{' '}
              <span className="text-sage">wspólnocie</span>
            </h1>
            <p className="text-lg md:text-xl text-slate leading-relaxed mb-12 max-w-lg">
              Komfortowe mieszkanie w sercu Chojnic. Razem tworzymy miejsce,
              które z dumą nazywamy domem.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/o-nas"
                className="px-8 py-4 bg-sage text-white rounded-full font-semibold text-sm shadow-lg shadow-sage/10 hover:shadow-sage/20 hover:bg-sage-light transition-all active:scale-95"
              >
                Poznaj nas
              </Link>
              <Link
                to="/kontakt"
                className="px-8 py-4 border-2 border-sage text-sage rounded-full font-semibold text-sm hover:bg-sage/5 transition-all active:scale-95"
              >
                Kontakt
              </Link>
            </div>
          </div>
        </div>

        {/* Prawa strona — zdjęcie budynku */}
        <div className="relative w-full md:w-[50%] min-h-[300px] md:min-h-0">
          {/* Gradient blend — miękkie przejście z lewej sekcji */}
          <div className="absolute top-0 -left-px h-full w-40 bg-gradient-to-r from-cream-dark via-cream-dark/20 to-transparent z-30 hidden md:block" />
          <img
            src="/gabi-budynek.png"
            alt="Budynek Wspólnoty Mieszkaniowej GABI"
            className="w-full h-full object-cover"
          />
          {/* Gradient blend na desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-cream-dark/40 via-transparent to-transparent hidden md:block" />
          {/* Gradient na mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-cream-dark/80 via-transparent to-transparent md:hidden" />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-sage opacity-60 z-40 hidden md:flex">
          <span className="text-[10px] font-bold tracking-widest uppercase">Przewiń</span>
          <div className="w-px h-10 bg-sage/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-sage animate-bounce" />
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
