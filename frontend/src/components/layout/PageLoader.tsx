import { Loader2 } from 'lucide-react'

export function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="size-6 animate-spin text-accent" />
    </div>
  )
}
