'use client'

import { useActionState, useEffect, useRef, useState, startTransition } from 'react'
import { registerActivity, type ActionState } from '@/app/actions'

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_TIME_SLOTS = [
  '13:00 - 13:30',
  '13:30 - 14:00',
  '14:00 - 14:30',
  '14:30 - 15:00 استراحة',
  '15:00 - 15:30',
  '15:30 - 16:00',
]

const SATURDAY_TIME_SLOTS = ALL_TIME_SLOTS.filter((s) => s !== '13:00 - 13:30')

const AGE_GROUPS = ['9-12', '13-15', 'الجميع']

const LOCATIONS = [
  'Konferans salonu',
  'Has oda',
  'Kitap kafe',
  '4.kat Toplantı Masası',
  'Akıl Zeka Atölyesi',
  'Resim Atölyesi',
  'El sanatlar Atölyesi',
  'Drama Atölyesi',
  'Kişisel Gelişim Atölyesi',
]

// ─── Types ────────────────────────────────────────────────────────────────────

export type Activity = {
  id: number
  day: string
  timeSlot: string
  ageGroup: string
  activityName: string
  volunteerName: string
  location: string
  supplies: string
  pinCode?: string
}

type BookingSlot = { id: number; timeSlot: string; ageGroup: string }

type Props = {
  editingActivity: Activity | null
  authorizedPin: string | null
  onSuccess: () => void
}

// ─── Overlap logic (mirrors server) ──────────────────────────────────────────

function isSlotDisabled(
  slot: string,
  selectedAgeGroup: string,
  bookings: BookingSlot[],
  editingId?: number
): boolean {
  const slotBookings = bookings.filter(
    (b) => b.timeSlot === slot && !(editingId && b.id === editingId)
  )
  return slotBookings.some((b) => {
    if (b.ageGroup === 'الجميع') return true
    if (selectedAgeGroup === 'الجميع') return true
    return b.ageGroup === selectedAgeGroup
  })
}

// ─── Input / Select shared styles ────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent ' +
  'transition placeholder:text-gray-400'

const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityForm({ editingActivity, authorizedPin, onSuccess }: Props) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    registerActivity,
    {}
  )

  // Controlled state for all fields
  const [day, setDay] = useState('يوم الأحد')
  const [ageGroup, setAgeGroup] = useState('9-12')
  const [timeSlot, setTimeSlot] = useState('')
  const [activityName, setActivityName] = useState('')
  const [volunteerName, setVolunteerName] = useState('')
  const [location, setLocation] = useState('')
  const [supplies, setSupplies] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [bookings, setBookings] = useState<BookingSlot[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Track last successful submissionId to detect each new success uniquely
  const lastSubmissionId = useRef<number | null>(null)
  const prevIsPending = useRef(false)

  // ── Refresh bookings after any submission finishes ───────────────────────────
  useEffect(() => {
    if (prevIsPending.current && !isPending) {
      setRefreshTrigger((t) => t + 1)
    }
    prevIsPending.current = isPending
  }, [isPending])

  // ── Pre-populate form when editing ──────────────────────────────────────────
  useEffect(() => {
    if (editingActivity) {
      setDay(editingActivity.day)
      setAgeGroup(editingActivity.ageGroup)
      setTimeSlot(editingActivity.timeSlot)
      setActivityName(editingActivity.activityName)
      setVolunteerName(editingActivity.volunteerName)
      setLocation(editingActivity.location)
      setSupplies(editingActivity.supplies)
    }
  }, [editingActivity])

  // ── Reset form on success ────────────────────────────────────────────────────
  useEffect(() => {
    if (
      state.success &&
      state.submissionId !== undefined &&
      state.submissionId !== lastSubmissionId.current
    ) {
      lastSubmissionId.current = state.submissionId
      setDay('يوم الأحد')
      setAgeGroup('9-12')
      setTimeSlot('')
      setActivityName('')
      setVolunteerName('')
      setLocation('')
      setSupplies('')
      setPinCode('')
      onSuccess()
    }
  }, [state, onSuccess])

  // ── Saturday: clear '13:00 - 13:30' if it was the selected slot ─────────────
  useEffect(() => {
    if (timeSlot === '13:00 - 13:30' && day === 'يوم السبت') {
      setTimeSlot('')
    }
  }, [day]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch availability whenever day changes or on refresh ────────────────────
  useEffect(() => {
    if (!day) return
    setIsFetching(true)
    fetch(`/api/activities?day=${encodeURIComponent(day)}`)
      .then((r) => r.json())
      .then((data: BookingSlot[]) => setBookings(data))
      .catch(() => {})
      .finally(() => setIsFetching(false))
  }, [day, refreshTrigger])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const availableSlots = day === 'يوم السبت' ? SATURDAY_TIME_SLOTS : ALL_TIME_SLOTS
  const isEditMode = !!editingActivity

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold" style={{ color: '#1E4632' }}>
          {isEditMode ? '✏️ تعديل الفعالية' : 'تسجيل فعالية جديدة'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {isEditMode
            ? 'قم بتعديل البيانات ثم اضغط تحديث'
            : 'أدخل بيانات الفعالية في الحقول أدناه'}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          startTransition(() => {
            action(formData)
          })
        }}
        className="space-y-5"
        noValidate
        autoComplete="off"
      >
        {/* Hidden id for edit mode */}
        {isEditMode && <input type="hidden" name="id" value={editingActivity.id} />}
        {/* Hidden day value for form submission */}
        <input type="hidden" name="day" value={day} />
        {/* Hidden pinCode if authorized during edit */}
        {isEditMode && (
          <input type="hidden" name="pinCode" value={authorizedPin || ''} />
        )}

        {/* ── Day ─────────────────────────────────────────────────────────── */}
        <div>
          <span className={labelCls}>اليوم *</span>
          <div className="flex gap-6 mt-1">
            {['يوم السبت', 'يوم الأحد'].map((d) => (
              <label
                key={d}
                className={`flex items-center gap-2.5 cursor-pointer rounded-lg px-4 py-2.5 border text-sm font-medium transition-all
                  ${
                    day === d
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#1E4632]'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
              >
                <input
                  type="radio"
                  name="_day_radio"
                  value={d}
                  checked={day === d}
                  onChange={() => setDay(d)}
                  className="accent-[#D4AF37]"
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        {/* ── Age Group ───────────────────────────────────────────────────── */}
        <div>
          <label className={labelCls} htmlFor="ageGroup">
            الفئة العمرية *
          </label>
          <select
            id="ageGroup"
            name="ageGroup"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className={inputCls}
            required
          >
            {AGE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* ── Time Slot ───────────────────────────────────────────────────── */}
        <div>
          <label className={labelCls} htmlFor="timeSlot">
            الوقت *{' '}
            {isFetching && (
              <span className="text-xs font-normal text-gray-400">(جارٍ التحقق...)</span>
            )}
          </label>
          <select
            id="timeSlot"
            name="timeSlot"
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">-- اختر الوقت --</option>
            {availableSlots.map((slot) => {
              const disabled = isSlotDisabled(
                slot,
                ageGroup,
                bookings,
                editingActivity?.id
              )
              return (
                <option key={slot} value={slot} disabled={disabled}>
                  {slot}
                  {disabled ? ' (محجوز)' : ''}
                </option>
              )
            })}
          </select>
        </div>

        {/* ── Activity Name ────────────────────────────────────────────────── */}
        <div>
          <label className={labelCls} htmlFor="activityName">
            اسم الفعالية *
          </label>
          <input
            id="activityName"
            type="text"
            name="activityName"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="أدخل اسم الفعالية"
            className={inputCls}
            required
          />
        </div>

        {/* ── Volunteer Name ───────────────────────────────────────────────── */}
        <div>
          <label className={labelCls} htmlFor="volunteerName">
            اسم المتطوع *
          </label>
          <input
            id="volunteerName"
            type="text"
            name="volunteerName"
            value={volunteerName}
            onChange={(e) => setVolunteerName(e.target.value)}
            placeholder="أدخل اسم المتطوع"
            className={inputCls}
            required
            autoComplete="off"
          />
        </div>

        {/* ── Location ─────────────────────────────────────────────────────── */}
        <div>
          <label className={labelCls} htmlFor="location">
            المكان *
          </label>
          <select
            id="location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">-- اختر المكان --</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* ── Supplies ─────────────────────────────────────────────────────── */}
        <div>
          <label className={labelCls} htmlFor="supplies">
            المستلزمات
          </label>
          <textarea
            id="supplies"
            name="supplies"
            value={supplies}
            onChange={(e) => setSupplies(e.target.value)}
            placeholder="اذكر المستلزمات المطلوبة (اختياري)"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* ── PIN Code ─────────────────────────────────────────────────────── */}
        {!isEditMode && (
          <div>
            <label className={labelCls} htmlFor="pinCode">
              الرمز السري (يستخدم للتعديل أو الحذف لاحقاً) *
            </label>
            <input
              id="pinCode"
              type="password"
              name="pinCode"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="أدخل 4 أرقام"
              className={inputCls}
              required
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              autoComplete="new-password"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              تنبيه: هذا الرمز ضروري للقيام بأي تعديل أو حذف مستقبلاً.
            </p>
          </div>
        )}

        {/* ── Error message ────────────────────────────────────────────────── */}
        {state.error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <p>{state.error}</p>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg px-6 py-3 text-base font-bold transition-all
              disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              backgroundColor: '#D4AF37',
              color: '#1E4632',
            }}
          >
            {isPending
              ? 'جارٍ الحفظ...'
              : isEditMode
              ? '✔ تحديث الفعالية'
              : 'تسجيل الفعالية'}
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={() => onSuccess()}
              className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
