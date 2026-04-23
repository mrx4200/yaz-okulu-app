import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// السطر السحري: قراءة الرابط بأمان من متغيرات البيئة (Vercel سيوفر هذا الرابط تلقائياً)
const connectionString = process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// إعداد المحول (Adapter) كما تطلب Prisma 7 تماماً
if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    globalForPrisma.prisma = new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma