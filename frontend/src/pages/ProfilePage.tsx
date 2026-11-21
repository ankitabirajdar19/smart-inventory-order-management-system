import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { profileApi } from '../api/services'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { Badge, Button, Card, Input, useToast } from '../components/ui'
import { label } from '../lib/format'
import { passwordSchema, profileSchema, type PasswordForm, type ProfileForm } from '../lib/schemas'

export function ProfilePage() {
  const { user, setUser, logout } = useAuth(); const toast = useToast(); const nav = useNavigate(); const { hash } = useLocation()
  useEffect(() => { if (hash === '#password') document.getElementById('password')?.scrollIntoView({ block: 'start' }) }, [hash])
  const profile = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' } })
  const pw = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })
  const save = useMutation({ mutationFn: (v: ProfileForm) => profileApi.update({ fullName: v.fullName, phone: v.phone || undefined }),
    onSuccess: u => { setUser(u); toast('ok', 'Profile updated') }, onError: e => toast('err', errorMessage(e)) })
  const change = useMutation({ mutationFn: (v: PasswordForm) => profileApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: async () => { toast('ok', 'Password changed. Please sign in again.'); await logout(); nav('/login') }, onError: e => toast('err', errorMessage(e)) })
  if (!user) return null
  return (
    <div className="max-w-2xl">
      <PageHeader title="My profile" description="Manage your account details and password." />
      <Card className="mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2"><p className="text-sm text-muted">{user.email}</p>{user.roles.map(r => <Badge key={r} tone="accent">{label(r)}</Badge>)}</div>
        <form onSubmit={profile.handleSubmit(v => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input label="Full name" error={profile.formState.errors.fullName?.message} {...profile.register('fullName')} />
          <Input label="Phone" error={profile.formState.errors.phone?.message} {...profile.register('phone')} />
          <div className="sm:col-span-2"><Button type="submit" loading={save.isPending}>Save changes</Button></div>
        </form>
      </Card>
      <Card className="p-5"><h2 id="password" className="mb-1 scroll-mt-24 font-semibold">Change password</h2>
        <p className="mb-4 text-sm text-muted">You will be signed out on all devices after changing your password.</p>
        <form onSubmit={pw.handleSubmit(v => change.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2"><Input label="Current password" type="password" autoComplete="current-password" error={pw.formState.errors.currentPassword?.message} {...pw.register('currentPassword')} /></div>
          <Input label="New password" type="password" autoComplete="new-password" error={pw.formState.errors.newPassword?.message} {...pw.register('newPassword')} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={pw.formState.errors.confirm?.message} {...pw.register('confirm')} />
          <div className="sm:col-span-2"><Button type="submit" loading={change.isPending}>Change password</Button></div>
        </form></Card>
    </div>)
}
