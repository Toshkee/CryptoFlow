import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LineChart, LogOut, Menu, User as UserIcon, Wallet as WalletIcon, X } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const links = [
  { to: '/markets', label: 'Markets', auth: false },
  { to: '/trade', label: 'Trade', auth: true },
  { to: '/wallet', label: 'Wallet', auth: true },
]

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const visibleLinks = links.filter((l) => !l.auth || user)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-15 max-w-[1600px] items-center gap-6 px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="CryptoFlow home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-surface-1 p-0.5 pr-2.5 transition-colors hover:border-surface-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <Avatar user={user} />
                  <span className="hidden text-sm font-medium sm:inline">{user.username}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Signed in as {user.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/trade')}>
                  <LineChart /> Trade
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/wallet')}>
                  <WalletIcon /> Wallet
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <UserIcon /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="text-down focus:bg-down-soft">
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-surface-1 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {visibleLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {!user && (
              <div className="mt-2 flex gap-2">
                <Button variant="outline" className="flex-1" asChild onClick={() => setOpen(false)}>
                  <Link to="/signin">Sign in</Link>
                </Button>
                <Button className="flex-1" asChild onClick={() => setOpen(false)}>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

function Avatar({ user }: { user: { username: string; profile_picture?: string | null } }) {
  if (user.profile_picture) {
    return <img src={user.profile_picture} alt="" className="size-7 rounded-full object-cover" />
  }
  return (
    <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
      {user.username.slice(0, 1).toUpperCase()}
    </span>
  )
}
