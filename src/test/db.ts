import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve(__dirname, '../../supabase/migrations')

/**
 * A throwaway Postgres shaped like a Supabase project: the anon and authenticated
 * roles with Supabase's default table grants, an auth schema whose uid() reads
 * the signed-in user, then every migration in order.
 */
export async function freshDb() {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
  `)
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(resolve(dir, f), 'utf8'))
  }
  return db
}

/** Run a query as a player (anon) or as a signed-in user. */
export async function as<T>(db: PGlite, who: 'anon' | { user: string }, sql: string, params: unknown[] = []) {
  if (who === 'anon') {
    await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`)
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who.user])
    await db.exec('set role authenticated')
  }
  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}
