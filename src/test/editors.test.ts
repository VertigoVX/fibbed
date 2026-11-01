// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { as, freshDb } from './db'

const EDITOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const STRANGER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const DEVICE = '11111111-1111-1111-1111-111111111111'
const DEVICE_2 = '22222222-2222-2222-2222-222222222222'

let db: PGlite

beforeEach(async () => {
  db = await freshDb()
  await db.exec(`insert into auth.users values ('${EDITOR}'), ('${STRANGER}');`)
  await db.exec(`insert into public.editors (user_id) values ('${EDITOR}');`)
})

afterEach(async () => {
  await db.close()
})

const editor = { user: EDITOR }
const stranger = { user: STRANGER }

async function submit(n: number, text: string, device = DEVICE) {
  const { rows } = await db.query<{ id: string }>(
    `insert into fibs (puzzle_number, text, author, client_id) values ($1, $2, 'Sam', $3) returning id`,
    [n, text, device],
  )
  return rows[0].id
}

describe('is_editor', () => {
  it('is true only for listed editors', async () => {
    expect((await as<{ ok: boolean }>(db, editor, 'select is_editor() as ok')).rows[0].ok).toBe(true)
    expect((await as<{ ok: boolean }>(db, stranger, 'select is_editor() as ok')).rows[0].ok).toBe(false)
    expect((await as<{ ok: boolean }>(db, 'anon', 'select is_editor() as ok')).rows[0].ok).toBe(false)
  })

  it('cannot be granted by a signed-in user to themselves', async () => {
    await expect(as(db, stranger, `insert into editors (user_id) values ('${STRANGER}')`)).rejects.toThrow(/row-level security|permission denied/)
  })
})

describe('editors reading fibs', () => {
  it('lets an editor read the fibs for a day', async () => {
    await submit(4, 'Bees can recognise human faces from photos.')
    const { rows } = await as<{ text: string; author: string; status: string }>(
      db,
      editor,
      'select text, author, status from fibs where puzzle_number = 4',
    )
    expect(rows).toEqual([{ text: 'Bees can recognise human faces from photos.', author: 'Sam', status: 'pending' }])
  })

  it('shows signed-in strangers nothing', async () => {
    await submit(4, 'Bees can recognise human faces from photos.')
    expect((await as(db, stranger, 'select * from fibs')).rows).toEqual([])
  })

  it('does not let editors rewrite a player’s fib directly', async () => {
    await submit(4, 'Bees can recognise human faces from photos.')
    await as(db, editor, `update fibs set text = 'Something the player never wrote at all.'`)
    expect((await db.query<{ text: string }>('select text from fibs')).rows[0].text).toBe('Bees can recognise human faces from photos.')
  })
})

describe('moderation functions', () => {
  it('lets an editor run a fib, replacing the one already running', async () => {
    const first = await submit(4, 'Bees can recognise human faces from photos.')
    const second = await submit(4, 'Bees hum in the key of C when calm.', DEVICE_2)
    await as(db, editor, 'select feature_fib($1)', [first])
    await as(db, editor, 'select feature_fib($1)', [second])
    const { rows } = await db.query<{ id: string; status: string; featured: boolean }>(
      'select id, status, featured from fibs order by created_at, id',
    )
    expect(rows.find((r) => r.id === second)).toMatchObject({ status: 'approved', featured: true })
    expect(rows.find((r) => r.id === first)).toMatchObject({ status: 'approved', featured: false })
  })

  it('lets an editor reject a fib, taking it off the paper if it was running', async () => {
    const id = await submit(4, 'Bees can recognise human faces from photos.')
    await as(db, editor, 'select feature_fib($1)', [id])
    await as(db, editor, `select set_fib_status($1, 'rejected')`, [id])
    expect((await db.query('select status, featured from fibs')).rows).toEqual([{ status: 'rejected', featured: false }])
  })

  it('lets an editor restore a rejected fib to pending', async () => {
    const id = await submit(4, 'Bees can recognise human faces from photos.')
    await as(db, editor, `select set_fib_status($1, 'rejected')`, [id])
    await as(db, editor, `select set_fib_status($1, 'pending')`, [id])
    expect((await db.query('select status from fibs')).rows).toEqual([{ status: 'pending' }])
  })

  it('lets an editor go back to the house fib for a day', async () => {
    const id = await submit(4, 'Bees can recognise human faces from photos.')
    await as(db, editor, 'select feature_fib($1)', [id])
    await as(db, editor, 'select use_house_fib(4)')
    expect((await db.query('select status, featured from fibs')).rows).toEqual([{ status: 'approved', featured: false }])
  })

  it('refuses all of it to anyone who is not an editor', async () => {
    const id = await submit(4, 'Bees can recognise human faces from photos.')
    await expect(as(db, stranger, 'select feature_fib($1)', [id])).rejects.toThrow(/not an editor/)
    await expect(as(db, stranger, `select set_fib_status($1, 'rejected')`, [id])).rejects.toThrow(/not an editor/)
    await expect(as(db, stranger, 'select use_house_fib(4)')).rejects.toThrow(/not an editor/)
    await expect(as(db, 'anon', 'select feature_fib($1)', [id])).rejects.toThrow(/permission denied|not an editor/)
    expect((await db.query('select status, featured from fibs')).rows).toEqual([{ status: 'pending', featured: false }])
  })

  it('rejects an unknown status', async () => {
    const id = await submit(4, 'Bees can recognise human faces from photos.')
    await expect(as(db, editor, `select set_fib_status($1, 'deleted')`, [id])).rejects.toThrow()
  })
})

describe('fib_counts', () => {
  it('gives editors pending and total counts per day', async () => {
    await submit(4, 'Bees can recognise human faces from photos.')
    const id = await submit(4, 'Bees hum in the key of C when calm.', DEVICE_2)
    await submit(5, 'Words with seven letters are the most common.')
    await as(db, editor, `select set_fib_status($1, 'rejected')`, [id])
    const { rows } = await as<{ puzzle_number: number; pending: number; total: number }>(
      db,
      editor,
      'select puzzle_number, pending::int, total::int from fib_counts() order by puzzle_number',
    )
    expect(rows).toEqual([
      { puzzle_number: 4, pending: 1, total: 2 },
      { puzzle_number: 5, pending: 1, total: 1 },
    ])
  })

  it('is refused to non-editors', async () => {
    await expect(as(db, stranger, 'select * from fib_counts()')).rejects.toThrow(/not an editor/)
  })
})
