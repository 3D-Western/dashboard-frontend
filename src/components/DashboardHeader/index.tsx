import { User } from '@/types/user';
import LogoutButton from './logout-button';
import { Avatar, AvatarFallback } from '../ui/avatar';

export default function DashboardHeader({ user }: { user: User }) {
  return (
    <header className="flex flex-row container justify-between p-6 items-center mb-6">
      <LogoutButton />
      {/* Dashboard Header */}
      <div className="text-2xl font-bold">Welcome {user.firstName}</div>

      <Avatar>
        <AvatarFallback>{user.lastName[0] + user.firstName[0]}</AvatarFallback>
      </Avatar>
    </header>
  );
}
