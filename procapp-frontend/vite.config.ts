import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { MOCK_PASSWORD, TEST_LOGINS, type TestLogin } from './src/api/mock/testLogins.ts'

/** Prints the seeded demo logins to the terminal once when the dev server starts. */
function printTestLogins(): Plugin {
  return {
    name: 'print-test-logins',
    configureServer() {
      const rows = TEST_LOGINS.map(
        (login: TestLogin) =>
          `  ${login.email.padEnd(32)} ${MOCK_PASSWORD}  [${login.roles.join(', ')}]${login.note ? ` (${login.note})` : ''}`,
      )
      console.log(
        '\n[ProcApp] Mock demo logins (password is the same for all):\n' + rows.join('\n') + '\n',
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/ProcApp-Frontend/' : '/',
  plugins: [react(), tailwindcss(), printTestLogins()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
