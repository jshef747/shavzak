import { useState } from 'react';
import type { AppState, UserProfile, UserRole } from '../../types';
import type { BoardMemberWithEmail } from '../../hooks/useBoardMembers';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  state: AppState;
  boardId: string | null;
  members: BoardMemberWithEmail[];
  allProfiles: UserProfile[];
  inviteUrl: string | null;
  onGenerateInvite: () => Promise<void>;
  onRevokeInvite: () => Promise<void>;
  onUnlinkMember: (memberId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: UserRole) => Promise<void>;
}

export function UsersTab({
  state,
  members,
  inviteUrl,
  onGenerateInvite,
  onRevokeInvite,
  onUnlinkMember,
  onUpdateRole,
}: Props) {
  const lang = langFromDir(state.dir);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  async function handleGenerateInvite() {
    setGeneratingLink(true);
    await onGenerateInvite();
    setGeneratingLink(false);
  }

  async function handleCopyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const personMap = Object.fromEntries(state.people.map(p => [p.id, p.name]));

  return (
    <div className="space-y-8 py-2">
      <ConfirmDialog
        open={revokeConfirmOpen}
        message={t('revokeInviteConfirm', lang)}
        onConfirm={async () => { setRevokeConfirmOpen(false); await onRevokeInvite(); }}
        onCancel={() => setRevokeConfirmOpen(false)}
        lang={lang}
      />
      <ConfirmDialog
        open={!!removeConfirmId}
        message={t('removeFromTeamConfirm', lang)}
        onConfirm={async () => { if (removeConfirmId) await onUnlinkMember(removeConfirmId); setRemoveConfirmId(null); }}
        onCancel={() => setRemoveConfirmId(null)}
        lang={lang}
      />

      {/* Invite link section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">
          {lang === 'he' ? 'קישור הזמנה' : 'Invite Link'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
          {lang === 'he'
            ? 'שתף קישור זה עם חברי הצוות. לאחר לחיצה על הקישור יוכלו להירשם ולהצטרף ללוח.'
            : 'Share this link with your team. Anyone who clicks it can register and join the schedule.'}
        </p>

        {inviteUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
              <span className="text-xs text-gray-600 dark:text-slate-300 truncate flex-1 font-mono">{inviteUrl}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCopyLink}>
                {copied ? t('linkCopied', lang) : t('copyLink', lang)}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRevokeConfirmOpen(true)}>
                {t('revokeInvite', lang)}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 dark:text-slate-500">{t('noActiveInvite', lang)}</p>
            <Button variant="secondary" size="sm" onClick={handleGenerateInvite} disabled={generatingLink}>
              {generatingLink ? '...' : t('generateLink', lang)}
            </Button>
          </div>
        )}
      </section>

      {/* Members section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">
          {t('membersSection', lang)}
        </h3>

        {members.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">{t('noMembersLinked', lang)}</p>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                    {member.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {personMap[member.person_id] ?? member.person_id}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  member.role === 'admin'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {member.role === 'admin' ? 'Admin' : 'User'}
                </span>
                <button
                  onClick={() => onUpdateRole(member.user_id, member.role === 'admin' ? 'user' : 'admin')}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 shrink-0 transition-colors"
                >
                  {member.role === 'admin' ? t('makeUser', lang) : t('makeAdmin', lang)}
                </button>
                <button
                  onClick={() => setRemoveConfirmId(member.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
                  title={t('removeFromTeam', lang)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
