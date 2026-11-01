// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { as, freshDb } from './db'

const ANA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const BEN = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PHONE = '11111111-1111-1111-1111-111111111111'
const LAPTOP = '22222222-2222-2222-2222-222222222222'
const OTHER = '33333333-3333-3333-3333-333333333333'

let db: PGlite

beforeEach(async () => {
  db = await freshDb()
  await db.exec(`insert into auth.users values ('${ANA}'), ('${BEN}');`)
})

afterEach(async () => {
  await db.close()
})

const ana = { user: ANA }
const ben = { user: BEN }

function record(who: 'anon' | { user: string }, n: number, device: string, fibsCaught: number, cleared: number) {
  return as(
    db,
    who,
    `insert into results (puzzle_number, client_id, picks, caught, fibs_caught, reader_caught, cleared)
     values ($1, $2, '{a}', $3 = 3, $3, true, $4)`,
    [n, device, fibsCaught, cleared],
  )
}

describe('results with accounts', () => {
  it('ties a signed-in player’s result to their account automatically', async () => {
    await record(ana, 1, PHONE, 2, 7)
    const { rows } = await db.query<{ user_id: string }>('select user_id from results')
    expect(rows).toEqual([{ user_id: ANA }])
  })

  it('leaves anonymous results without an account', async () => {
    await record('anon', 1, PHONE, 2, 7)
    expect((await db.query('select user_id from results')).rows).toEqual([{ user_id: null }])
  })

  it('stops anyone filing a result under someone else’s account', async () => {
    await expect(
      as(db, ben, `insert into results (puzzle_number, client_id, picks, caught, user_id) values (1, $1, '{a}', false, $2)`, [LAPTOP, ANA]),
    ).rejects.toThrow(/row-level security/)
    await expect(
      as(db, 'anon', `insert into results (puzzle_number, client_id, picks, caught, user_id) values (1, $1, '{a}', false, $2)`, [LAPTOP, ANA]),
    ).rejects.toThrow(/row-level security/)
  })

  it('counts one result per account per day, across devices', async () => {
    await record(ana, 1, PHONE, 2, 7)
    await expect(record(ana, 1, LAPTOP, 3, 9)).rejects.toMatchObject({ code: '23505' })
    await record(ana, 2, LAPTOP, 3, 9)
  })

  it('lets players read their own history and nobody else’s', async () => {
    await record(ana, 1, PHONE, 2, 7)
    await record(ana, 2, PHONE, 3, 9)
    await record(ben, 1, OTHER, 0, 1)
    await record('anon', 1, LAPTOP, 1, 4)
    const mine = await as<{ puzzle_number: number; fibs_caught: number; cleared: number }>(
      db,
      ana,
      'select puzzle_number, fibs_caught, cleared from results order by puzzle_number',
    )
    expect(mine.rows).toEqual([
      { puzzle_number: 1, fibs_caught: 2, cleared: 7 },
      { puzzle_number: 2, fibs_caught: 3, cleared: 9 },
    ])
    expect((await as(db, 'anon', 'select * from results')).rows).toEqual([])
  })

  it('refuses an impossible number of truths cleared', async () => {
    await expect(record(ana, 1, PHONE, 0, 10)).rejects.toThrow()
  })
})

describe('claim_device_results', () => {
  it('moves this device’s anonymous results into the account', async () => {
    await record('anon', 1, PHONE, 1, 5)
    await record('anon', 2, PHONE, 2, 8)
    await record('anon', 2, LAPTOP, 0, 0)
    await as(db, ana, 'select claim_device_results($1)', [PHONE])
    const { rows } = await db.query<{ puzzle_number: number; client_id: string; user_id: string | null }>(
      'select puzzle_number, client_id, user_id from results order by puzzle_number, client_id',
    )
    expect(rows).toEqual([
      { puzzle_number: 1, client_id: PHONE, user_id: ANA },
      { puzzle_number: 2, client_id: PHONE, user_id: ANA },
      { puzzle_number: 2, client_id: LAPTOP, user_id: null },
    ])
  })

  it('keeps the account’s own result when both exist for a day', async () => {
    await record(ana, 1, LAPTOP, 3, 9)
    await record('anon', 1, PHONE, 0, 0)
    await as(db, ana, 'select claim_device_results($1)', [PHONE])
    const { rows } = await db.query<{ client_id: string; user_id: string | null }>(
      'select client_id, user_id from results order by client_id',
    )
    expect(rows).toEqual([
      { client_id: PHONE, user_id: null },
      { client_id: LAPTOP, user_id: ANA },
    ])
  })

  it('never takes results already in another account', async () => {
    await record(ben, 1, PHONE, 2, 7)
    await as(db, ana, 'select claim_device_results($1)', [PHONE])
    expect((await db.query('select user_id from results')).rows).toEqual([{ user_id: BEN }])
  })

  it('does nothing for players who are not signed in', async () => {
    await record('anon', 1, PHONE, 1, 5)
    await expect(as(db, 'anon', 'select claim_device_results($1)', [PHONE])).rejects.toThrow(/permission denied/)
  })
})

describe('score_counts', () => {
  it('gives the spread of scores for a day (truths cleared + fibs caught)', async () => {
    await record('anon', 4, PHONE, 3, 9) // 12
    await record('anon', 4, LAPTOP, 1, 5) // 6
    await record(ana, 4, OTHER, 1, 5) // 6
    await record(ben, 5, OTHER, 0, 0) // another day
    const { rows } = await as<{ score: number; players: number }>(db, 'anon', 'select score, players::int from score_counts(4) order by score')
    expect(rows).toEqual([
      { score: 6, players: 2 },
      { score: 12, players: 1 },
    ])
  })

  it('skips results saved before scores were recorded', async () => {
    await as(db, 'anon', `insert into results (puzzle_number, client_id, picks, caught) values (4, $1, '{a}', false)`, [PHONE])
    expect((await as(db, 'anon', 'select * from score_counts(4)')).rows).toEqual([])
  })
})
