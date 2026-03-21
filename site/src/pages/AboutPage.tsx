import { Link } from 'react-router-dom'
import { communityValues } from '../data/mockData'
import { ShieldIcon, HandshakeIcon, HomeIcon } from '../components/ui/Icons'

const iconMap = {
  shield: ShieldIcon,
  handshake: HandshakeIcon,
  home: HomeIcon,
} as const

export default function AboutPage() {
  return (
    <>
      {/* Page hero */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h1 className="text-4xl md:text-5xl font-semibold text-charcoal tracking-tight mb-4">
            O naszej wspólnocie
          </h1>
          <p className="text-lg text-slate max-w-xl">
            Poznaj naszą historię i wartości, które nas łączą.
          </p>
        </div>
      </section>

      {/* Community description */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-2xl font-semibold text-charcoal mb-6">
              Kim jesteśmy
            </h2>
            <div className="space-y-4 text-slate leading-relaxed">
              <p>
                Wspólnota Mieszkaniowa GABI to społeczność mieszkańców budynku
                przy ul. Gdańskiej 58 w Chojnicach. Od lat dbamy o komfort
                i bezpieczeństwo naszych lokatorów, wspólnie tworząc przyjazne
                miejsce do życia.
              </p>
              <p>
                Naszym priorytetem jest utrzymanie budynku w jak najlepszym
                stanie technicznym oraz tworzenie atmosfery wzajemnego szacunku
                i dobrosąsiedzkiej współpracy. Regularnie organizujemy zebrania,
                podczas których wspólnie podejmujemy decyzje dotyczące naszej
                wspólnoty.
              </p>
              <p>
                Wierzymy, że dobre relacje sąsiedzkie i wspólna troska
                o przestrzeń, w której żyjemy, to fundament komfortowego
                mieszkania.
              </p>
            </div>
          </div>
          <div className="bg-cream-dark rounded-[24px] h-80 flex items-center justify-center">
            <div className="text-center text-outline">
              <HomeIcon className="w-16 h-16 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Zdjęcie budynku</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h2 className="text-3xl font-semibold text-charcoal text-center mb-12">
            Nasze wartości
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {communityValues.map((value) => {
              const Icon = iconMap[value.icon as keyof typeof iconMap]
              return (
                <div
                  key={value.title}
                  className="bg-white rounded-[24px] p-8 text-center shadow-[0_12px_32px_rgba(45,52,54,0.05)]"
                >
                  <div className="w-16 h-16 bg-sage-pale/30 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-8 h-8 text-sage" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal mb-3">
                    {value.title}
                  </h3>
                  <p className="text-sm text-slate leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Community life */}
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <h2 className="text-3xl font-semibold text-charcoal mb-10">
          Życie wspólnoty
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: 'Zebrania wspólnoty',
              description: 'Regularnie organizujemy spotkania, na których wspólnie podejmujemy ważne decyzje dotyczące naszego budynku i otoczenia.',
            },
            {
              title: 'Utrzymanie budynku',
              description: 'Dbamy o bieżącą konserwację i planowe remonty, aby nasz budynek był zawsze w dobrym stanie technicznym.',
            },
            {
              title: 'Porządek i czystość',
              description: 'Wspólnie dbamy o estetykę klatek schodowych, otoczenia budynku i części wspólnych.',
            },
            {
              title: 'Komunikacja',
              description: 'Informujemy mieszkańców o ważnych sprawach, terminach i planowanych pracach za pośrednictwem ogłoszeń i strony internetowej.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]"
            >
              <h3 className="text-base font-semibold text-charcoal mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sage">
        <div className="mx-auto max-w-[1280px] px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Masz pytania?
          </h2>
          <p className="text-sage-pale mb-8 max-w-md mx-auto">
            Jesteśmy do Twojej dyspozycji. Skontaktuj się z nami w każdej
            sprawie dotyczącej wspólnoty.
          </p>
          <Link
            to="/kontakt"
            className="inline-flex items-center px-7 py-3.5 bg-white text-sage rounded-[10px] font-medium text-sm hover:bg-cream transition-colors"
          >
            Skontaktuj się z nami
          </Link>
        </div>
      </section>
    </>
  )
}
