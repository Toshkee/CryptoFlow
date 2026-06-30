import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

interface LoginResponse {
  access: string
  refresh: string
}

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const from = (location.state as { from?: string } | null)?.from || '/trade'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const res = await apiPost<LoginResponse>('/accounts/login/', values)
      await login(res.access, res.refresh)
      toast.success('Welcome back', { description: `Signed in as ${values.username}` })
      navigate(from, { replace: true })
    } catch (err) {
      toast.error('Sign in failed', { description: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const useDemo = () => {
    setValue('username', 'demo')
    setValue('password', 'demodemo123')
    handleSubmit(onSubmit)()
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back, trader."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" autoComplete="username" placeholder="satoshi" {...register('username')} />
          {errors.username && <p className="text-xs text-down">{errors.username.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-down">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="secondary" className="w-full" onClick={useDemo} disabled={submitting}>
        <Sparkles className="text-accent" /> Try the live demo
      </Button>
    </AuthShell>
  )
}
