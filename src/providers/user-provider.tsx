'use client';
import React, { createContext, useContext } from 'react';
import { User } from '@/types/user';

const UserContext = createContext<User | null>(null);

export function UserProvider({ children, user }: { children: React.ReactNode; user: User | null }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  return context;
}
