import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = "postgresql://postgres.aywmigxeznxngvnpljkw:Eym12n34_5.*@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_mode=session"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// إعداد المحول (Adapter) كما تطلب Prisma 7 تماماً
if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    globalForPrisma.prisma = new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma