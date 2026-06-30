import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function AppLayout() {
  const { pathname } = useLocation()
  // The Trade terminal is full-bleed and manages its own height — hide the footer there.
  const hideFooter = pathname.startsWith('/trade')

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}
