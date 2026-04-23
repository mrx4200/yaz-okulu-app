'use client'

import { useEffect, useState, useTransition } from 'react'
import { deleteActivity, verifyActivityPin } from '@/app/actions'
import type { Activity } from './ActivityForm'

type Props = {
  refreshKey: number
  onEditStart: (activity: Activity, pin: string) => void
  onDelete: () => void
}

// ─── Badge component ──────────────────────────────────────────────────────────

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: 'gold' | 'green'
}) {
  return (
    <span
      className="inline-block rounded-full px-3 py-0.5 text-xs font-bold"
      style={
        variant === 'gold'
          ? { backgroundColor: '#D4AF3720', color: '#8B6914', border: '1px solid #D4AF3740' }
          : { backgroundColor: '#1E463220', color: '#1E4632', border: '1px solid #1E463230' }
      }
    >
      {children}
    </span>
  )
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onClick,
}: {
  activity: Activity
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}) {
  const handleAction = (e: React.MouseEvent, type: 'edit' | 'delete') => {
    e.stopPropagation()
    if (type === 'edit') onEdit()
    else onDelete()
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 transition-all cursor-pointer hover:bg-gray-50 hover:shadow-md"
    >
      {/* Top row: time + volunteer badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="gold">🕐 {activity.timeSlot}</Badge>
        <Badge variant="green">👤 {activity.volunteerName}</Badge>
      </div>

      {/* Main info */}
      <div className="space-y-1.5 text-sm text-gray-700">
        <div className="flex items-start gap-2">
          <span className="text-gray-400 shrink-0 w-24">الفعالية:</span>
          <span className="font-semibold text-gray-800">{activity.activityName}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-400 shrink-0 w-24">الفئة:</span>
          <span>{activity.ageGroup}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-400 shrink-0 w-24">المكان:</span>
          <span>{activity.location}</span>
        </div>
        {activity.supplies && (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0 w-24">المستلزمات:</span>
            <span className="text-gray-600 leading-relaxed">{activity.supplies}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-50">
        <button
          onClick={(e) => handleAction(e, 'edit')}
          className="flex-1 rounded-lg py-1.5 text-sm font-medium border transition-all
            border-[#1E4632] text-[#1E4632] hover:bg-[#1E4632] hover:text-white"
        >
          ✏️ تعديل
        </button>
        <button
          onClick={(e) => handleAction(e, 'delete')}
          className="flex-1 rounded-lg py-1.5 text-sm font-medium border transition-all
            border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
        >
          🗑 حذف
        </button>
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

function DaySection({
  dayLabel,
  activities,
  onEdit,
  onDelete,
  onCardClick,
}: {
  dayLabel: string
  activities: Activity[]
  onEdit: (a: Activity) => void
  onDelete: (a: Activity) => void
  onCardClick: (a: Activity) => void
}) {
  if (activities.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-extrabold text-white">
          📅 فعاليات {dayLabel}
        </h2>
        <span
          className="text-xs font-bold rounded-full px-2.5 py-0.5"
          style={{ backgroundColor: '#D4AF37', color: '#1E4632' }}
        >
          {activities.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activities.map((a) => (
          <ActivityCard
            key={a.id}
            activity={a}
            onEdit={() => onEdit(a)}
            onDelete={() => onDelete(a)}
            onClick={() => onCardClick(a)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActivityList({ refreshKey, onEditStart, onDelete }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null)
  const [isPending, startTransition] = useTransition()

  // PIN Modal State
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinAction, setPinAction] = useState<'edit' | 'delete' | null>(null)
  const [targetActivity, setTargetActivity] = useState<Activity | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  const fetchAll = () => {
    setIsLoading(true)
    setFetchError(false)
    fetch('/api/activities')
      .then((r) => r.json())
      .then((data: Activity[]) => setActivities(data))
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [refreshKey])

  const handleActionTrigger = (activity: Activity, action: 'edit' | 'delete') => {
    setTargetActivity(activity)
    setPinAction(action)
    setPinInput('')
    setPinError(null)
    setPinModalOpen(true)
  }

  const handlePinSubmit = async () => {
    if (!targetActivity || !pinAction) return
    if (pinInput.length !== 4) {
      setPinError('يرجى إدخال 4 أرقام')
      return
    }

    if (pinAction === 'delete') {
      startTransition(async () => {
        const res = await deleteActivity(targetActivity.id, pinInput)
        if (res.error) {
          setPinError(res.error)
        } else {
          setPinModalOpen(false)
          fetchAll()
          onDelete()
        }
      })
    } else {
      // Edit action: Verify PIN BEFORE opening the form
      startTransition(async () => {
        const res = await verifyActivityPin(targetActivity.id, pinInput)
        if (res.error) {
          setPinError(res.error)
        } else if (!res.success) {
          setPinError('الرقم السري غير صحيح')
        } else {
          onEditStart(targetActivity, pinInput)
          setPinModalOpen(false)
        }
      })
    }
  }

  const saturday = activities.filter((a) => a.day === 'يوم السبت')
  const sunday = activities.filter((a) => a.day === 'يوم الأحد')

  if (isLoading) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-[#D4AF37] rounded-full animate-spin mb-2" />
        <p>جارٍ تحميل الفعاليات...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="py-8 text-center text-red-400 text-sm">
        حدث خطأ في تحميل البيانات. حاول مجدداً.
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="py-14 text-center text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">لا توجد فعاليات مسجلة حتى الآن</p>
      </div>
    )
  }

  return (
    <div>
      <DaySection
        dayLabel="يوم السبت"
        activities={saturday}
        onEdit={(a) => handleActionTrigger(a, 'edit')}
        onDelete={(a) => handleActionTrigger(a, 'delete')}
        onCardClick={setSelectedEvent}
      />
      <DaySection
        dayLabel="يوم الأحد"
        activities={sunday}
        onEdit={(a) => handleActionTrigger(a, 'edit')}
        onDelete={(a) => handleActionTrigger(a, 'delete')}
        onCardClick={setSelectedEvent}
      />

      {/* ── Modal Overlay ── */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-[#1E4632] p-5 text-white flex justify-between items-center">
              <h3 className="text-xl font-extrabold">{selectedEvent.activityName}</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-white/80 hover:text-white transition p-1 flex-shrink-0"
                aria-label="إغلاق"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="block text-xs text-gray-400 mb-1">اليوم</span>
                  <span className="font-semibold text-gray-800">{selectedEvent.day}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="block text-xs text-gray-400 mb-1">الوقت</span>
                  <span className="font-semibold text-gray-800" dir="ltr">{selectedEvent.timeSlot}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="block text-xs text-gray-400 mb-1">الفئة العمرية</span>
                  <span className="font-semibold text-gray-800">{selectedEvent.ageGroup}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="block text-xs text-gray-400 mb-1">المكان</span>
                  <span className="font-semibold text-gray-800">{selectedEvent.location}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs text-gray-400 mb-1">اسم المتطوع</span>
                <span className="font-semibold text-gray-800">{selectedEvent.volunteerName}</span>
              </div>
              
              {selectedEvent.supplies && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="block text-xs text-gray-400 mb-1">المستلزمات</span>
                  <span className="text-gray-700 leading-relaxed">{selectedEvent.supplies}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PIN Verification Modal ── */}
      {pinModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all border border-gray-100">
            <div className="bg-[#1E4632] p-5 text-white text-center">
              <h3 className="text-lg font-bold">تحقق من الهوية</h3>
              <p className="text-xs text-white/70 mt-1">يرجى إدخال الرمز السري للمتابعة</p>
            </div>
            
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="w-full">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setPinInput(val)
                    setPinError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  autoFocus
                  className="w-full text-center text-3xl tracking-[1em] font-mono py-3 border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:outline-none transition-all placeholder:text-gray-200"
                  placeholder="0000"
                  inputMode="numeric"
                />
                {pinError && (
                  <p className="text-red-500 text-xs text-center mt-2 font-medium">⚠️ {pinError}</p>
                )}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handlePinSubmit}
                  disabled={isPending}
                  className="flex-1 bg-[#1E4632] text-white rounded-xl py-3 text-sm font-bold hover:bg-[#2d5a3f] transition-all disabled:opacity-50"
                >
                  {isPending ? 'جاري التحقق...' : 'تأكيد'}
                </button>
                <button
                  onClick={() => setPinModalOpen(false)}
                  className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl py-3 text-sm font-bold hover:bg-gray-100 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
