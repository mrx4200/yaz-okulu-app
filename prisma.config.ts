import { defineConfig } from '@prisma/config'
import { loadEnvConfig } from '@next/env'

// هذا السطر يجبر النظام على قراءة ملف .env محلياً
loadEnvConfig(process.cwd())

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL,
  },
})