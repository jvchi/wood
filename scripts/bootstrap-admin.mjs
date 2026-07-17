import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = (process.argv[2] || process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase()
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || ''

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before bootstrapping an admin')
}
if (!email) {
  throw new Error('Pass the admin email as the first argument or set ADMIN_BOOTSTRAP_EMAIL')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

async function findUserByEmail(targetEmail) {
  let page = 1
  while (page <= 100) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const match = data.users.find(user => user.email?.toLowerCase() === targetEmail)
    if (match) return match
    if (data.users.length < 100) return null
    page += 1
  }
  throw new Error('Admin lookup exceeded 10,000 users; use the user ID with the Admin API')
}

let user = await findUserByEmail(email)
if (!user) {
  if (!password || password.length < 8) {
    throw new Error(
      'No user exists for that email. Set ADMIN_BOOTSTRAP_PASSWORD (at least 8 characters) to create it.',
    )
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })
  if (error) throw error
  user = data.user
} else {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: 'admin' },
  })
  if (error) throw error
  user = data.user
}

console.log(`Administrator ready: ${user.email} (${user.id})`)
console.log('Sign out and sign back in if this account already had an active session so its JWT refreshes.')
