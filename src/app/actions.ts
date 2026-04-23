'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export type ActionState = {
  error?: string
  success?: boolean
  submissionId?: number
}

/**
 * Overlap conflict matrix:
 *  existing=الجميع  → conflicts with all new bookings
 *  new=الجميع       → conflicts if ANY existing booking on that slot/day
 *  same age group   → conflicts with itself
 */
function hasConflict(existingAgeGroup: string, newAgeGroup: string): boolean {
  if (existingAgeGroup === 'الجميع') return true
  if (newAgeGroup === 'الجميع') return true
  return existingAgeGroup === newAgeGroup
}

export async function registerActivity(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = formData.get('id') as string | null
  const day = formData.get('day') as string
  const timeSlot = formData.get('timeSlot') as string
  const ageGroup = formData.get('ageGroup') as string
  const activityName = formData.get('activityName') as string
  const volunteerName = formData.get('volunteerName') as string
  const location = formData.get('location') as string
  const pinCode = formData.get('pinCode') as string
  const supplies = (formData.get('supplies') as string) ?? ''

  if (!day || !timeSlot || !ageGroup || !activityName || !volunteerName || !location || !pinCode) {
    return { error: 'جميع الحقول مطلوبة، بما في ذلك الرمز السري' }
  }

  // ─── Step A: Fetch existing activity ───────────────────────────────────
  if (id) {
    const activityId = parseInt(id)
    if (isNaN(activityId)) return { error: 'معرف الفعالية غير صالح' }

    const existing = await prisma.activity.findUnique({
      where: { id: activityId },
    })

    if (!existing) {
      return { error: 'الفعالية غير موجودة' }
    }

    // ─── Step B & C: Compare PINs ─────────────────────────────────────────
    // If the database pinCode is NOT null/empty, it MUST match the submitted PIN
    if (existing.pinCode && existing.pinCode.trim() !== '') {
      if (existing.pinCode !== pinCode) {
        console.error(`Security Alert: Wrong PIN for activity ${id}. Expected ${existing.pinCode}, got ${pinCode}`)
        return { error: 'الرقم السري غير صحيح' }
      }
    }
  }

  // Fetch bookings for this day+timeslot, excluding the record being edited
  const existingBookings = await prisma.activity.findMany({
    where: {
      day,
      timeSlot,
      ...(id ? { id: { not: parseInt(id) } } : {}),
    },
    select: { ageGroup: true },
  })

  for (const booking of existingBookings) {
    if (hasConflict(booking.ageGroup, ageGroup)) {
      return {
        error: 'هذا الوقت محجوز مسبقاً للمرحلة العمرية المحددة',
      }
    }
  }

  try {
    if (id) {
      await prisma.activity.update({
        where: { id: parseInt(id) },
        data: { day, timeSlot, ageGroup, activityName, volunteerName, location, supplies, pinCode },
      })
    } else {
      await prisma.activity.create({
        data: { day, timeSlot, ageGroup, activityName, volunteerName, location, supplies, pinCode },
      })
    }

    revalidatePath('/')
    return { success: true, submissionId: Date.now() }
  } catch {
    return { error: 'حدث خطأ أثناء حفظ البيانات. ربما هذا الوقت محجوز مسبقاً.' }
  }
}

export async function deleteActivity(
  id: number,
  pinCode: string
): Promise<{ error?: string }> {
  try {
    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { pinCode: true },
    })

    if (!existing) return { error: 'الفعالية غير موجودة' }

    if (existing.pinCode && existing.pinCode.trim() !== '') {
      if (existing.pinCode !== pinCode) {
        return { error: 'الرقم السري غير صحيح' }
      }
    }

    await prisma.activity.delete({ where: { id } })
    revalidatePath('/')
    return {}
  } catch (error) {
    console.error('Delete error:', error)
    return { error: 'حدث خطأ أثناء الحذف' }
  }
}

/**
 * Dedicated action to verify a PIN without performing any side effects.
 * Used by the frontend to authorize opening the edit form.
 */
export async function verifyActivityPin(
  id: number,
  pinCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { pinCode: true },
    })

    if (!existing) return { success: false, error: 'الفعالية غير موجودة' }

    if (existing.pinCode && existing.pinCode.trim() !== '') {
      if (existing.pinCode !== pinCode) {
        return { success: false, error: 'الرقم السري غير صحيح' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Verify error:', error)
    return { success: false, error: 'حدث خطأ أثناء التحقق' }
  }
}
