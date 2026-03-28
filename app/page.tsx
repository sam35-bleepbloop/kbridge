import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import LandingPage from './_landing/LandingPage'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')
  return <LandingPage />
}