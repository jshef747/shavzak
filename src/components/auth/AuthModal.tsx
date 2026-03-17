import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { t, type Lang } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  lang: Lang;
}

export function AuthModal({ open, onClose, onLogin, onRegister, lang }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const pwChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password);
      } else {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!passwordRegex.test(password)) {
          setError(t('passwordRequirements', lang));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('passwordMismatch', lang));
          setLoading(false);
          return;
        }
        await onRegister(email.trim(), password);
      }
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('authFailed', lang));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setConfirmPassword('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'login' ? t('login', lang) : t('createAccount', lang)}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <button
            type="button"
            onClick={() => setShowWhy(w => !w)}
            className="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1 transition-colors"
          >
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center font-bold leading-none">?</span>
            {lang === 'he' ? 'למה להירשם?' : 'Why sign up?'}
          </button>
          {showWhy && (
            <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1.5 text-xs text-gray-600">
              <p className="text-gray-400 text-[11px] mb-2">
                {lang === 'he'
                  ? 'כרגע הנתונים שלך נשמרים רק בדפדפן הזה — ניקוי הדפדפן ימחק הכל.'
                  : 'Right now your data lives only in this browser — clearing it means losing everything.'}
              </p>
              {[
                lang === 'he'
                  ? ['גיבוי לענן', 'לוחות נשמרים אוטומטית, ללא אובדן נתונים']
                  : ['Cloud backup', 'Schedules saved automatically, never lost'],
                lang === 'he'
                  ? ['גישה מכל מקום', 'טלפון, טאבלט, כל מחשב']
                  : ['Access anywhere', 'Phone, tablet, any computer'],
                lang === 'he'
                  ? ['תבניות מסונכרנות', 'משמרות ותפקידים קשורים לחשבון שלך']
                  : ['Synced presets', 'Your shifts & positions follow your account'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold mt-0.5">·</span>
                  <span><span className="font-semibold text-gray-700">{title}</span> — {desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Input
          label={t('emailLabel', lang)}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder', lang)}
          autoComplete="email"
        />
        <Input
          label={t('passwordLabel', lang)}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder', lang)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {mode === 'register' && (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 px-1">
              {([
                ['length', t('pwReq8Chars', lang)],
                ['upper', t('pwReqUppercase', lang)],
                ['lower', t('pwReqLowercase', lang)],
                ['number', t('pwReqNumber', lang)],
                ['special', t('pwReqSpecial', lang)],
              ] as [keyof typeof pwChecks, string][]).map(([key, label]) => (
                <li key={key} className="flex items-center gap-1.5 text-xs">
                  {pwChecks[key] ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center text-gray-300 font-bold">·</span>
                  )}
                  <span className={pwChecks[key] ? 'text-emerald-700' : 'text-gray-400'}>{label}</span>
                </li>
              ))}
            </ul>

            <Input
              label={t('confirmPasswordLabel', lang)}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('passwordPlaceholder', lang)}
              autoComplete="new-password"
            />
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={loading} className="w-full justify-center">
            {loading ? '...' : mode === 'login' ? t('login', lang) : t('createAccount', lang)}
          </Button>
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-blue-600 hover:text-blue-700 text-center transition-colors duration-150"
          >
            {mode === 'login'
              ? t('noAccountRegister', lang)
              : t('haveAccountLogin', lang)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
