import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { AuthShell } from './AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
})
type FormValues = z.infer<typeof schema>

export default function SignUp() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await apiPost('/accounts/signup/', values)
      // auto sign-in for a smooth first run
      const res = await apiPost<{ access: string; refresh: string }>('/accounts/login/', {
        username: values.username,
        password: values.password,
      })
      await login(res.access, res.refresh)
      toast.success('Account created', { description: 'You start with $10,000 in paper funds.' })
      navigate('/trade', { replace: true })
    } catch (err) {
      toast.error('Sign up failed', { description: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start paper-trading with $10,000 — risk-free."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-accent hover:underline">
            Sign in
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-down">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-down">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
