'use client';

import { iamApi } from '@/api/client/iam';
import { formatApiErrorMessage } from '@/api/client/error-messages';
import { userApi } from '@/api/client/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { PERMISSIONS } from '@/constants/permissions';
import { useUser } from '@/providers/user-provider';
import type { IamGroup, IamGroupMember } from '@/types/iam';
import type { PaginationMetadata } from '@/types/common';
import type { User } from '@/types/user';
import { hasPermission } from '@/types/user';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  UserMinus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface GroupMembersSheetProps {
  group: IamGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SheetMode = 'list' | 'add';

const PAGE_SIZE = 10;
const ADD_PAGE_SIZE = 8;

export function GroupMembersSheet({ group, open, onOpenChange }: GroupMembersSheetProps) {
  const user = useUser();
  const canManage = hasPermission(user, PERMISSIONS.IAM_MANAGE_GROUPS);
  const canSearch = hasPermission(user, PERMISSIONS.USERS_LIST);

  // ── List mode state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<SheetMode>('list');
  const [members, setMembers] = useState<IamGroupMember[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [page, setPage] = useState(1);
  const snapshotCreatedBeforeRef = useRef<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  // ── Add mode state ───────────────────────────────────────────────────────
  const [addSearchInput, setAddSearchInput] = useState('');
  const [addResults, setAddResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  // ── Debounce member search ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
      snapshotCreatedBeforeRef.current = undefined;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Load members ─────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    if (!open) return;
    setIsLoadingMembers(true);
    try {
      const res = await iamApi.listGroupUsers(group.id, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        snapshotCreatedBefore: snapshotCreatedBeforeRef.current,
      });
      setMembers(res.data);
      setPagination(res.pagination);
      snapshotCreatedBeforeRef.current = res.pagination.snapshotCreatedBefore;
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Failed to load members.'));
    } finally {
      setIsLoadingMembers(false);
    }
  }, [open, group.id, page, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers();
  }, [loadMembers]);

  // ── Reset on close ───────────────────────────────────────────────────────
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode('list');
      setSearchInput('');
      setDebouncedSearch('');
      setPage(1);
      snapshotCreatedBeforeRef.current = undefined;
      setAddSearchInput('');
      setAddResults([]);
      setAddedIds(new Set());
    }
    onOpenChange(next);
  };

  const handleBackToList = () => {
    setMode('list');
    setAddSearchInput('');
    setAddResults([]);
    snapshotCreatedBeforeRef.current = undefined;
  };

  // ── Remove member ─────────────────────────────────────────────────────────
  const handleRemove = async (member: IamGroupMember) => {
    setRemovingIds((prev) => new Set(prev).add(member.studentId));
    try {
      await iamApi.revokeUserGroup(member.studentId, group.id);
      setMembers((prev) => prev.filter((m) => m.studentId !== member.studentId));
      if (pagination) {
        setPagination((prev) => prev && { ...prev, totalItems: prev.totalItems - 1 });
      }
      toast.success(`${member.firstName} ${member.lastName} removed from group.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Failed to remove member. Please try again.'));
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.studentId);
        return next;
      });
    }
  };

  // ── Add mode: search users ────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'add') return;
    if (!addSearchInput.trim()) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await userApi.listAllUsers({ search: addSearchInput, pageSize: ADD_PAGE_SIZE });
        if (!cancelled) setAddResults(res.data);
      } catch (error) {
        if (!cancelled) toast.error(formatApiErrorMessage(error, 'Failed to search users.'));
      } finally {
        if (!cancelled) setIsSearchingUsers(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addSearchInput, mode]);

  // ── Add member ────────────────────────────────────────────────────────────
  const handleAdd = async (candidate: User) => {
    setAddingIds((prev) => new Set(prev).add(candidate.studentId));
    try {
      await iamApi.assignUserGroup(candidate.studentId, group.id);
      setAddedIds((prev) => new Set(prev).add(candidate.studentId));
      const newMember: IamGroupMember = {
        studentId: candidate.studentId,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        assignedAt: new Date().toISOString(),
      };
      setMembers((prev) => [newMember, ...prev]);
      setPagination((prev) => prev && { ...prev, totalItems: prev.totalItems + 1 });
      toast.success(`${candidate.firstName} ${candidate.lastName} added to group.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Failed to add user. Please try again.'));
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(candidate.studentId);
        return next;
      });
    }
  };

  const memberStudentIds = new Set(members.map((m) => m.studentId));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === 'list' ? `Members — ${group.name}` : `Add Member — ${group.name}`}
          </SheetTitle>
          <SheetDescription>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{group.groupKey}</code>
            {pagination && mode === 'list' && (
              <span className="ml-2 text-xs">
                {pagination.totalItems} {pagination.totalItems === 1 ? 'member' : 'members'}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* ── List mode ──────────────────────────────────────────────────── */}
        {mode === 'list' && (
          <>
            <div className="flex items-center gap-2 px-4">
              <Input
                placeholder="Search members..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
                aria-label="Search members"
              />
              {canManage && canSearch && (
                <Button size="sm" onClick={() => setMode('add')}>
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {isLoadingMembers ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearch
                      ? 'No members match your search.'
                      : 'No members in this group yet.'}
                  </p>
                  {!debouncedSearch && canManage && canSearch && (
                    <Button size="sm" variant="outline" onClick={() => setMode('add')}>
                      <Plus className="h-4 w-4" />
                      Add the first member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {members.map((member) => (
                    <div
                      key={member.studentId}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">ID: {member.studentId}</p>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemove(member)}
                          disabled={removingIds.has(member.studentId)}
                          aria-label={`Remove ${member.firstName} ${member.lastName} from group`}
                        >
                          {removingIds.has(member.studentId) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 pt-3">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!pagination.hasPrevious || isLoadingMembers}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNext || isLoadingMembers}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Add mode ───────────────────────────────────────────────────── */}
        {mode === 'add' && (
          <>
            <div className="px-4">
              <Input
                placeholder="Search by name, email, or student ID..."
                value={addSearchInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setAddSearchInput(next);
                  if (!next.trim()) setAddResults([]);
                }}
                autoFocus
                aria-label="Search users to add"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {isSearchingUsers ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              ) : !addSearchInput.trim() ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Search by name, email, or student ID.
                  </p>
                </div>
              ) : addResults.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
              ) : (
                <div className="space-y-1">
                  {addResults.map((candidate) => {
                    const alreadyMember =
                      memberStudentIds.has(candidate.studentId) ||
                      addedIds.has(candidate.studentId);
                    const isAdding = addingIds.has(candidate.studentId);

                    return (
                      <div
                        key={candidate.studentId}
                        className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {candidate.email}
                          </p>
                          <p className="text-xs text-muted-foreground">ID: {candidate.studentId}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyMember ? 'secondary' : 'default'}
                          className="shrink-0"
                          onClick={() => !alreadyMember && !isAdding && handleAdd(candidate)}
                          disabled={alreadyMember || isAdding}
                          aria-label={
                            alreadyMember
                              ? `${candidate.firstName} is already a member`
                              : `Add ${candidate.firstName} to group`
                          }
                        >
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : alreadyMember ? (
                            'Added'
                          ) : (
                            'Add'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'add' && (
          <SheetFooter>
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
