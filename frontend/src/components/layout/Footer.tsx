import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.56v-2.2c-3.34.71-4.04-1.59-4.04-1.59-.55-1.36-1.33-1.72-1.33-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.5.97.11-.76.42-1.27.76-1.56-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.29-1.53 3.3-1.21 3.3-1.21.66 1.64.24 2.86.12 3.16.77.83 1.24 1.88 1.24 3.17 0 4.53-2.8 5.53-5.48 5.82.43.36.81 1.08.81 2.18v3.23c0 .31.21.68.83.56A12.01 12.01 0 0 0 24 12.29C24 5.78 18.63.5 12 .5Z" />
    </svg>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto border-t border-border bg-surface-1">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-md text-xs leading-relaxed text-faint">
            CryptoFlow is a paper-trading simulator for educational purposes. No real funds are involved and nothing
            here is financial advice. Market data via Binance &amp; CoinGecko.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          <Link to="/markets" className="transition-colors hover:text-text">
            Markets
          </Link>
          <Link to="/trade" className="transition-colors hover:text-text">
            Trade
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-text"
          >
            <GithubIcon className="size-4" /> Source
          </a>
        </div>
      </div>
      <div className="border-t border-border py-3 text-center text-xs text-faint">© {year} CryptoFlow</div>
    </footer>
  )
}
