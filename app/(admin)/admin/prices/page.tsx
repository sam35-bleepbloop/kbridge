import { Suspense } from 'react'
import PricesClient from './PricesClient'

export const metadata = { title: 'Price References — K-Bridge Admin' }

export default function AdminPricesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Price References</h1>
        <p className="text-sm text-gray-500 mt-1">
          KRW price ranges used by the AI when estimating costs. Keep these fresh — stale data reduces trust.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        <PricesClient />
      </Suspense>
    </div>
  )
}
