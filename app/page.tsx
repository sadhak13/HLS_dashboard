import { redirect } from 'next/navigation';

export default function Home() {
  // We'll perform role-based redirects in a client component or check server session here
  redirect('/login');
}
