import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
      <div className="space-y-4">
        <p className="font-num text-6xl font-bold text-accent">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted">The page you're looking for drifted off the chart.</p>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
