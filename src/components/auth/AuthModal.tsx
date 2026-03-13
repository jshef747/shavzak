import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { langFromDir, t } from '../../utils/i18n';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

interface Props {
  open: boolean;
  onClose: () => void;
  dir: 'ltr' | 'rtl';
}

export function AuthModal({ open, onClose, dir }: Props) {
  const lang = langFromDir(dir);
  const [tab, setTab] = useState('signin');

  return (
    <Modal open={open} onClose={onClose} title={t('authModalTitle', lang)} size="sm">
      <div dir={dir}>
        <Tabs
          tabs={['signin', 'signup']}
          active={tab}
          onChange={setTab}
          labels={[t('signInTab', lang), t('signUpTab', lang)]}
        />
        {tab === 'signin' ? (
          <SignInForm dir={dir} />
        ) : (
          <SignUpForm dir={dir} />
        )}
      </div>
    </Modal>
  );
}
