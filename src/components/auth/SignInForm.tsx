import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { langFromDir, t } from '../../utils/i18n';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  dir: 'ltr' | 'rtl';
}

export function SignInForm({ dir }: Props) {
  const { signIn } = useAuth();
  const lang = langFromDir(dir);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) setError(err.message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" dir={dir}>
      <Input
        label={t('emailLabel', lang)}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="you@example.com"
      />
      <Input
        label={t('passwordLabel', lang)}
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />
      {error && <p className="text-sm text-red-600 text-left rtl:text-right">{error}</p>}
      <Button
        type="submit"
        variant="primary"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0"
      >
        {loading ? t('signingIn', lang) : t('signIn', lang)}
      </Button>
    </form>
  );
}
