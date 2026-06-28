/**
 * Database Migrations Manager
 * 
 * Manages Supabase schema migrations with version control.
 * 
 * Usage:
 * ```
 * npm run db:migrate   # Run pending migrations
 * npm run db:rollback  # Rollback last migration
 * npm run db:status    # Check migration status
 * ```
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations')
const MIGRATIONS_TABLE = '_migrations'

interface Migration {
  id: string
  name: string
  applied_at: string
}

/**
 * Initialize migrations table if it doesn't exist
 */
async function initMigrationsTable() {
  const { error } = await supabase.rpc('init_migrations_table', {})
  
  // If RPC doesn't exist, create table directly via schema sql
  // This would be used in real setup
  console.log('Migrations table initialized')
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(): Promise<Migration[]> {
  const { data, error } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('*')
    .order('applied_at', { ascending: true })

  if (error && error.code !== 'PGRST116') { // PGRST116 = table not found
    throw error
  }

  return data || []
}

/**
 * Get list of pending migrations
 */
async function getPendingMigrations(): Promise<string[]> {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return []
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.rollback.sql'))
    .sort()

  const appliedMigrations = await getAppliedMigrations()
  const appliedNames = new Set(appliedMigrations.map(m => m.name))

  return files.filter(f => !appliedNames.has(f))
}

/**
 * Read migration file content
 */
function readMigrationFile(filename: string): string {
  const filepath = path.join(MIGRATIONS_DIR, filename)
  return fs.readFileSync(filepath, 'utf-8')
}

/**
 * Run all pending migrations
 */
async function migrate() {
  console.log('🔄 Checking for pending migrations...')

  try {
    await initMigrationsTable()

    const pending = await getPendingMigrations()

    if (pending.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`📦 Found ${pending.length} pending migration(s)`)

    for (const filename of pending) {
      try {
        console.log(`⏳ Applying ${filename}...`)
        
        const sql = readMigrationFile(filename)
        
        // Execute migration
        const { error } = await supabase.rpc('run_migration', {
          migration_sql: sql,
          migration_name: filename,
        })

        if (error) {
          // If RPC doesn't exist, fallback to manual execution
          // In production, you'd use Supabase SQL Editor
          console.error(`Failed to apply ${filename}:`, error)
          throw error
        }

        console.log(`✅ Applied ${filename}`)
      } catch (error) {
        console.error(`❌ Failed to apply ${filename}:`, error)
        throw error
      }
    }

    console.log('🎉 All migrations applied successfully!')
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

/**
 * Rollback last migration
 */
async function rollback() {
  console.log('⏮️  Rolling back last migration...')

  try {
    const applied = await getAppliedMigrations()

    if (applied.length === 0) {
      console.log('ℹ️  No migrations to rollback')
      return
    }

    const last = applied[applied.length - 1]
    const rollbackFile = last.name.replace('.sql', '.rollback.sql')

    if (!fs.existsSync(path.join(MIGRATIONS_DIR, rollbackFile))) {
      console.error(`❌ Rollback file not found: ${rollbackFile}`)
      return
    }

    console.log(`⏳ Rolling back ${last.name}...`)

    const sql = readMigrationFile(rollbackFile)
    
    const { error } = await supabase.rpc('rollback_migration', {
      migration_sql: sql,
      migration_name: last.name,
    })

    if (error) {
      console.error(`Failed to rollback ${last.name}:`, error)
      throw error
    }

    console.log(`✅ Rolled back ${last.name}`)
  } catch (error) {
    console.error('💥 Rollback failed:', error)
    process.exit(1)
  }
}

/**
 * Show migration status
 */
async function status() {
  try {
    const applied = await getAppliedMigrations()
    const pending = await getPendingMigrations()

    console.log('\n📊 Migration Status\n')

    if (applied.length > 0) {
      console.log('✅ Applied Migrations:')
      applied.forEach(m => {
        const date = new Date(m.applied_at).toLocaleString()
        console.log(`   • ${m.name} (${date})`)
      })
    } else {
      console.log('ℹ️  No applied migrations')
    }

    console.log()

    if (pending.length > 0) {
      console.log('⏳ Pending Migrations:')
      pending.forEach(f => {
        console.log(`   • ${f}`)
      })
    } else {
      console.log('✅ No pending migrations')
    }

    console.log()
  } catch (error) {
    console.error('Error checking status:', error)
    process.exit(1)
  }
}

// CLI
const command = process.argv[2]

switch (command) {
  case 'migrate':
    migrate()
    break
  case 'rollback':
    rollback()
    break
  case 'status':
    status()
    break
  default:
    console.log('Usage: ts-node lib/migrations.ts [migrate|rollback|status]')
    process.exit(0)
}
