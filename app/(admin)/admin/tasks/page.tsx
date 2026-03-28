import { Suspense } from 'react'
import TasksListClient from './TasksListClient'

export const metadata = { title: 'All Tasks — K-Bridge Admin' }

export default function AdminTasksPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">All Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">Search, filter, and manage every task on the platform.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-500">Loading tasks…</div>}>
        <TasksListClient />
      </Suspense>
    </div>
  )
}
