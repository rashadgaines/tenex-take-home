import { AppShell } from '@/components/layout';

// TODO: Replace with real user data from NextAuth session
const mockUser = {
  name: 'Rashad',
  email: 'rashad@example.com',
  image: null,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell user={mockUser}>{children}</AppShell>;
}
