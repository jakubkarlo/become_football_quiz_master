// Shared by kits:deploy, kits:pull and stadiums:deploy — target validation and rsync invocation.

import { spawnSync } from 'child_process'

// Uploaded files must be readable for nginx inside the container regardless of local permissions
export const NGINX_READABLE = 'Du=rwx,Dgo=rx,Fu=rw,Fgo=r'

const EXCLUDES = ['desktop.ini', 'config.xml', 'readme.txt', 'Thumbs.db', '.DS_Store', '.*']

export function fail(message) {
  console.error(message)
  process.exit(1)
}

// Reads a "user@host:/absolute/path/" target from the given env variable (set in .env) — strict, so the value
// cannot smuggle rsync options or remote shell syntax. Exits with a hint when it is missing or malformed.
export function remoteTarget(envName, example) {
  const target = process.env[envName] || ''
  if (!/^[a-z_][a-z0-9_.-]*@[a-z0-9.-]+:\/[A-Za-z0-9_./-]+$/i.test(target) || target.includes('..')) {
    fail(`Set ${envName} in .env, e.g. ${envName}=${example}`)
  }
  return target.endsWith('/') ? target : `${target}/`
}

export function requireTools() {
  for (const tool of ['rsync', 'ssh']) {
    if (spawnSync(tool, ['--version'], { stdio: 'ignore' }).error) {
      fail(`${tool} is not installed — install it (e.g. sudo apt install rsync openssh-client) or run this from a machine that has it.`)
    }
  }
}

// Arguments go straight to rsync (no shell), so paths with spaces are safe.
export function rsync(args, label, { dryRun = false, chmod } = {}) {
  console.log(`\n── ${label}${dryRun ? ' (dry run)' : ''}`)
  const res = spawnSync('rsync', [
    '-rtvz', '--itemize-changes',
    ...(chmod ? [`--chmod=${chmod}`] : []),
    ...EXCLUDES.flatMap(p => ['--exclude', p]),
    ...(dryRun ? ['--dry-run'] : []),
    ...args,
  ], { stdio: 'inherit' })
  if (res.status !== 0) fail(`rsync failed (${label}), exit code ${res.status}`)
}
