import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const copy = process.argv.includes('--copy')
const deleteSource = process.argv.includes('--delete-source')
const confirmed = process.argv.includes('--yes-i-verified-cutover')
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_ANON_KEY

const buckets = ['product-images', 'product-models']

if (!supabaseUrl || !supabaseKey) throw new Error('Supabase URL and publishable/anon key are required')
if (deleteSource && !confirmed) {
  throw new Error('--delete-source requires --yes-i-verified-cutover')
}

async function ensureSupabaseAvailable() {
  const response = await fetch(`${supabaseUrl}/rest/v1/products?select=id&limit=1`, {
    headers: { apikey: supabaseKey },
  })
  const text = await response.text()
  if (response.status === 402) {
    throw new Error(`Supabase is still restricted (402): ${text}`)
  }
  if (!response.ok) throw new Error(`Supabase preflight failed (${response.status}): ${text}`)
}

async function runRclone(args, { stream = false } = {}) {
  if (!stream) {
    const { stdout } = await execFileAsync('rclone', args, { maxBuffer: 10 * 1024 * 1024 })
    return stdout
  }
  await new Promise((resolve, reject) => {
    const child = spawn('rclone', args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`rclone exited with ${code}`)))
  })
  return ''
}

async function stats(remote, bucket) {
  return JSON.parse(await runRclone(['size', `${remote}:${bucket}`, '--json']))
}

async function verify(bucket) {
  await runRclone([
    'check',
    `supabase:${bucket}`,
    `r2:${bucket}`,
    '--one-way',
    '--size-only',
  ], { stream: true })
  const [source, destination] = await Promise.all([
    stats('supabase', bucket),
    stats('r2', bucket),
  ])
  console.log(`${bucket}: source=${source.count} objects/${source.bytes} bytes; R2=${destination.count} objects/${destination.bytes} bytes`)
}

await ensureSupabaseAvailable()

if (copy) {
  console.log('Copying both Supabase buckets to R2. Source objects will not be deleted.')
  await Promise.all(buckets.map(bucket => runRclone([
    'copy',
    `supabase:${bucket}`,
    `r2:${bucket}`,
    '--metadata',
    '--fast-list',
    '--transfers', '16',
    '--checkers', '32',
    '--retries', '3',
    '--low-level-retries', '10',
    '--progress',
  ], { stream: true })))
}

for (const bucket of buckets) await verify(bucket)

if (deleteSource) {
  console.log('Verification passed. Deleting verified source objects from Supabase Storage.')
  for (const bucket of buckets) {
    await runRclone(['delete', `supabase:${bucket}`, '--rmdirs', '--progress'], { stream: true })
    const remaining = await stats('supabase', bucket)
    if (remaining.count !== 0 || remaining.bytes !== 0) {
      throw new Error(`${bucket} is not empty after deletion`)
    }
  }
  console.log('Both Supabase Storage buckets are empty.')
} else {
  console.log('Verification only. Source objects were not deleted.')
}
