import type { ReactNode } from 'react'

/** Wykrywa http(s) — bez HTML z bazy (bezpieczniej niż dangerouslySetInnerHTML). */
const URL_SPLIT = /(https?:\/\/[^\s]+)/g

function hrefFromToken(token: string): string {
  return token.replace(/[.,;:!?)\]}'"]+$/u, '')
}

interface Props {
  text: string
  className?: string
}

/**
 * Zwykły tekst + automatyczne linki dla adresów http/https (nowa karta).
 */
export default function TextWithAutoLinks({ text, className }: Props) {
  const parts = text.split(URL_SPLIT)
  const nodes: ReactNode[] = []
  parts.forEach((part, i) => {
    if (part === '') return
    if (/^https?:\/\//i.test(part)) {
      const href = hrefFromToken(part)
      nodes.push(
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage underline underline-offset-2 decoration-sage/50 break-all hover:text-sage-light"
        >
          {part}
        </a>,
      )
    } else {
      nodes.push(part)
    }
  })
  return <span className={className}>{nodes}</span>
}
