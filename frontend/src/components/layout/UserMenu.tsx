import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Dropdown, MenuItem } from '../common/Dropdown'
import { label } from '../../lib/format'

export function UserMenu() {
  const { user, logout } = useAuth(); const nav = useNavigate()
  if (!user) return null
  const initials = user.fullName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <Dropdown label="Open user menu" width="w-64" triggerClassName="flex items-center gap-2 rounded-lg p-1 hover:bg-subtle"
      trigger={<>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent" aria-hidden>{initials}</span>
        <span className="hidden text-left leading-tight md:block"><span className="block max-w-32 truncate text-sm font-medium">{user.fullName}</span><span className="block text-[11px] text-muted">{label(user.roles[0] ?? '')}</span></span>
      </>}>
      {close => (<>
        <div className="border-b border-line px-2.5 pb-2 pt-1"><p className="truncate text-sm font-medium">{user.fullName}</p><p className="truncate text-xs text-muted">{user.email}</p></div>
        <div className="pt-1.5">
          <MenuItem icon={<UserCircle className="h-4 w-4" />} onClick={() => { close(); nav('/profile') }}>My profile</MenuItem>
          <MenuItem icon={<KeyRound className="h-4 w-4" />} onClick={() => { close(); nav('/profile#password') }}>Change password</MenuItem>
          <MenuItem danger icon={<LogOut className="h-4 w-4" />} onClick={async () => { close(); await logout(); nav('/login') }}>Log out</MenuItem>
        </div>
      </>)}
    </Dropdown>
  )
}
