// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migration = readFileSync(resolve(__dirname, '../../supabase/migrations/20261101000000_init.sql'), 'utf8')
const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'

let db: PGlite

beforeEach(async () => {
  db = new PGlite()
  // Supabase provides these roles; recreate them for the test database.
  await db.exec(`create role anon nologin; create role authenticated nologin;`)
  await db.exec(migration)
  await db.exec(`grant usage on schema public to anon; grant insert on public.fibs, public.results to anon;`)
})

afterEach(async () => {
  await db.close()
})

const asAnon = async <T,>(sql: string, params: unknown[] = []) => {
  await db.exec('set role anon')
  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec('reset role')
  }
}

describe('fibs', () => {
  it('lets a player send a pending fib', async () => {
    await asAnon(`insert into fibs (puzzle_number, text, client_id) values (3, 'Octopuses can count to ten easily.', $1)`, [A])
    const { rows } = await db.query<{ status: string }>('select status from fibs')
    expect(rows).toEqual([{ status: 'pending' }])
  })

  it('refuses a second fib from the same device for the same day', async () => {
    const sql = `insert into fibs (puzzle_number, text, client_id) values (3, 'Octopuses can count to ten easily.', $1)`
    await asAnon(sql, [A])
    await expect(asAnon(sql, [A])).rejects.toMatchObject({ code: '23505' })
  })

  it('refuses fibs that are too short', async () => {
    await expect(asAnon(`insert into fibs (puzzle_number, text, client_id) values (3, 'short', $1)`, [A])).rejects.toThrow()
  })

  it('stops players featuring or approving their own fib', async () => {
    await expect(
      asAnon(`insert into fibs (puzzle_number, text, client_id, status) values (3, 'Octopuses can count to ten easily.', $1, 'approved')`, [A]),
    ).rejects.toThrow(/row-level security/)
  })

  it('hides fibs from players', async () => {
    await asAnon(`insert into fibs (puzzle_number, text, client_id) values (3, 'Octopuses can count to ten easily.', $1)`, [A])
    await expect(asAnon('select * from fibs')).rejects.toThrow(/permission denied/)
  })
})

describe('featured_fib', () => {
  async function featured(n: number) {
    const { rows } = await db.query<{ id: string }>(
      `insert into fibs (puzzle_number, text, client_id) values ($1, 'Octopuses can count to ten easily.', $2) returning id`,
      [n, A],
    )
    await db.query('select feature_fib($1)', [rows[0].id])
    return rows[0].id
  }

  it('returns the featured fib for a day that has started', async () => {
    await featured(1)
    const { rows } = await asAnon('select * from featured_fib(1)')
    expect(rows).toEqual([{ text: 'Octopuses can count to ten easily.', author: null }])
  })

  it('keeps a future day’s fib secret', async () => {
    await featured(5000)
    const { rows } = await asAnon('select * from featured_fib(5000)')
    expect(rows).toEqual([])
  })

  it('keeps only one featured fib per day', async () => {
    await featured(1)
    const { rows } = await db.query<{ id: string }>(
      `insert into fibs (puzzle_number, text, client_id) values (1, 'A second invented octopus fact.', $1) returning id`,
      [B],
    )
    await db.query('select feature_fib($1)', [rows[0].id])
    const count = await db.query<{ n: number }>('select count(*)::int as n from fibs where featured')
    expect(count.rows[0].n).toBe(1)
  })

  it('cannot be called by players to feature a fib', async () => {
    const id = await featured(1)
    await expect(asAnon('select feature_fib($1)', [id])).rejects.toThrow(/permission denied/)
  })
})

describe('results and stats', () => {
  it('records one result per device and reports totals', async () => {
    await asAnon(`insert into results (puzzle_number, client_id, picks, caught) values (2, $1, '{a,b,c,d}', true)`, [A])
    await asAnon(`insert into results (puzzle_number, client_id, picks, caught) values (2, $1, '{fib}', false)`, [B])
    await expect(
      asAnon(`insert into results (puzzle_number, client_id, picks, caught) values (2, $1, '{a}', false)`, [A]),
    ).rejects.toMatchObject({ code: '23505' })
    const { rows } = await asAnon<{ players: number; caught: number }>('select * from puzzle_stats(2)')
    expect(rows.map((r) => ({ players: Number(r.players), caught: Number(r.caught) }))).toEqual([{ players: 2, caught: 1 }])
  })

  it('hides individual results', async () => {
    await expect(asAnon('select * from results')).rejects.toThrow(/permission denied/)
  })
})
