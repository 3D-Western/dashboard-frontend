import { User } from '@/types/user';
import { Avatar, AvatarFallback } from '../ui/avatar';
import LogoutButton from './LogoutButton';

export default function DashboardHeader({ user }: { user: User }) {
  return (
    <header className="mb-6 border-b p-6 shadow-sm">
      <div className="container flex flex-row items-center justify-between gap-4">
        <LogoutButton />
        {/* Dashboard Header */}
        <div className="text-2xl font-bold">Welcome {user.firstName}</div>

        <Avatar>
          <AvatarFallback aria-label={`${user.firstName} ${user.lastName}`}>
            {user.lastName[0] + user.firstName[0]}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
