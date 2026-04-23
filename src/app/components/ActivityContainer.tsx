'use client'

import { useCallback, useRef, useState } from 'react'
import ActivityForm from './ActivityForm'
import ActivityList from './ActivityList'
import type { Activity } from './ActivityForm'

export default function ActivityContainer() {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [authorizedPin, setAuthorizedPin] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const formRef = useRef<HTMLDivElement>(null)

  const handleEditStart = useCallback((activity: Activity, pin: string) => {
    setEditingActivity(activity)
    setAuthorizedPin(pin)
    // Scroll smoothly to the form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  const handleSuccess = useCallback(() => {
    setEditingActivity(null)
    setAuthorizedPin(null)
    setRefreshKey((k) => k + 1)
  }, [])

  const handleDelete = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <>
      {/* ── Form section ─────────────────────────────────────────────── */}
      <div ref={formRef} className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 mb-10">
        <ActivityForm 
          editingActivity={editingActivity} 
          authorizedPin={authorizedPin}
          onSuccess={handleSuccess} 
        />
      </div>

      {/* ── List section ─────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-extrabold text-white mb-6 text-center">
            📋 جدول الفعاليات المسجلة
          </h2>
          <ActivityList
            refreshKey={refreshKey}
            onEditStart={handleEditStart}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </>
  )
}
