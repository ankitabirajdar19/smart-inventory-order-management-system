import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Boxes, Eye, EyeOff, ShieldCheck, History, PackageCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api, errorMessage } from '../api/client'
import { Button, Input, useToast } from '../components/ui'
import { firstStaffRoute } from '../lib/nav'
import { loginSchema, registerSchema, type LoginForm, type RegisterForm } from '../lib/schemas'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-accent p-12 text-accent-fg lg:flex">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15"><Boxes className="h-5 w-5" aria-hidden /></div>
          <div className="leading-tight"><p className="font-semibold">Smart Inventory</p><p className="text-[10px] tracking-[0.14em] opacity-80">INVENTORY MANAGEMENT</p></div></div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">Know what you have, where it is, and what is selling.</h2>
          <ul className="mt-8 space-y-4 text-sm">
            {[[PackageCheck, 'Stock is reserved at checkout, so the same unit is never sold twice.'], [History, 'Every stock change is recorded in an auditable movement history.'], [ShieldCheck, 'Role-based access enforced on the server, not just in the UI.']].map(([Icon, text], i) => {
              const I = Icon as typeof Boxes
              return <li key={i} className="flex items-start gap-3"><I className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden /><span className="opacity-90">{text as string}</span></li>
            })}
          </ul>
        </div>
        <p className="text-xs opacity-70">Enterprise inventory and order management</p>
      </aside>
      <main className="flex items-center justify-center bg-app p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg"><Boxes className="h-4 w-4" aria-hidden /></div><span className="font-semibold">Smart Inventory</span></div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          <div className="rounded-xl border border-line bg-surface p-6 shadow-card">{children}</div>
          <p className="mt-4 text-center text-sm text-muted">{footer}</p>
        </div>
      </main>
    </div>)
}

function PasswordInput({ label, error, autoComplete, ...rest }: { label: string; error?: string; autoComplete: string } & Record<string, unknown>) {
  const [show, setShow] = useState(false)
  return <Input label={label} type={show ? 'text' : 'password'} autoComplete={autoComplete} error={error}
    trailing={<button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="rounded-md p-1.5 text-muted hover:text-fg">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} {...rest} />
}

export function LoginPage() {
  const { login } = useAuth(); const nav = useNavigate(); const toast = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const submit = handleSubmit(async v => {
    try {
      const u = await login(v.email, v.password)
      const staff = u.roles.some(r => r !== 'CUSTOMER')
      nav(staff ? firstStaffRoute(p => !!u.permissions?.includes(p)) : '/')
    } catch (e) { toast('err', errorMessage(e)) }
  })
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account to continue." footer={<>New here? <Link className="font-medium text-accent hover:underline" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordInput label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Sign in</Button>
      </form>
    </AuthShell>)
}

export function RegisterPage() {
  const nav = useNavigate(); const toast = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })
  const submit = handleSubmit(async v => {
    try { await api.post('/auth/register', v); toast('ok', 'Account created. Please sign in.'); nav('/login') }
    catch (e) { toast('err', errorMessage(e)) }
  })
  return (
    <AuthShell title="Create your account" subtitle="Register to browse products and place orders." footer={<>Already registered? <Link className="font-medium text-accent hover:underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordInput label="Password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <p className="-mt-2 text-xs text-muted">Use 8+ characters including a letter and a digit.</p>
        <Button type="submit" loading={isSubmitting} className="w-full">Register</Button>
      </form>
    </AuthShell>)
}
