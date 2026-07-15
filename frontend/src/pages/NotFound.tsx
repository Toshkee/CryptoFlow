import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
      <div className="space-y-4">
        <p className="font-display text-7xl text-accent">404</p>
        <h1 className="font-display text-3xl tracking-tight">Page not found</h1>
        <p className="text-muted">The page you're looking for drifted off the chart.</p>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
