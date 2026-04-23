import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const day = searchParams.get('day')

  const activities = await prisma.activity.findMany({
    where: day ? { day } : undefined,
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  return Response.json(activities)
}
