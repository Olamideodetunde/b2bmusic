import { Metadata } from 'next';
import { PageHeader } from '@/components/navigation/PageHeader';
import { AccountView } from '@/components/auth/AccountView';

export const metadata: Metadata = {
  title: 'My downloads & licenses',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div>
      <PageHeader
        crumbs={[{ href: '/', label: 'Home' }, { label: 'Account' }]}
        eyebrow="Account"
        title="Downloads & licenses"
        description="Your subscription, your single-track licenses and the full-quality masters that come with them."
      />
      <AccountView />
    </div>
  );
}
