// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { as, freshDb } from './db'

let db: PGlite

const EDITOR = '33333333-3333-3333-3333-333333333333'

/** Three minimal rounds in the JSONB format the agent writes. */
const ROUNDS = [
  {
    theme: 'Penguins',
    level: 'easy',
    truths: [
      { text: 'Penguins live only in the Southern Hemisphere.', source_url: 'https://en.wikipedia.org/wiki/Penguin', source_label: 'Wikipedia: Penguin' },
      { text: 'Penguins cannot fly but are excellent swimmers.', source_url: 'https://en.wikipedia.org/wiki/Penguin', source_label: 'Wikipedia: Penguin' },
      { text: 'Emperor penguins are the tallest species, reaching about 1.1 metres.', source_url: 'https://en.wikipedia.org/wiki/Emperor_penguin', source_label: 'Wikipedia: Emperor penguin' },
    ],
    fib: { text: 'Penguins have hollow bones that help them dive deep.', explanation: 'Penguin bones are solid and dense, which aids diving.', source_url: 'https://en.wikipedia.org/wiki/Penguin', source_label: 'Wikipedia: Penguin' },
  },
  {
    theme: 'Volcanoes',
    level: 'medium',
    truths: [
      { text: 'Lava is magma that has reached the surface.', source_url: 'https://en.wikipedia.org/wiki/Lava', source_label: 'Wikipedia: Lava' },
      { text: 'The Ring of Fire encircles most of the Pacific Ocean.', source_url: 'https://en.wikipedia.org/wiki/Ring_of_Fire', source_label: 'Wikipedia: Ring of Fire' },
      { text: 'Hawaii was formed by a hot spot, not a tectonic plate boundary.', source_url: 'https://en.wikipedia.org/wiki/Hawaiian_Islands', source_label: 'Wikipedia: Hawaiian Islands' },
    ],
    fib: { text: 'Pompeii was buried by lava flows from Mount Vesuvius.', explanation: 'Pompeii was buried by pyroclastic material and ash, not lava.', source_url: 'https://en.wikipedia.org/wiki/Eruption_of_Mount_Vesuvius_in_79_AD', source_label: 'Wikipedia: Eruption of Mount Vesuvius in 79 AD' },
  },
  {
    theme: 'Black holes',
    level: 'hard',
    truths: [
      { text: 'The event horizon is the boundary beyond which nothing can escape.', source_url: 'https://en.wikipedia.org/wiki/Event_horizon', source_label: 'Wikipedia: Event horizon' },
      { text: 'Stellar black holes form when massive stars collapse at the end of their lives.', source_url: 'https://en.wikipedia.org/wiki/Stellar_black_hole', source_label: 'Wikipedia: Stellar black hole' },
      { text: 'The first image of a black hole was captured in 2019.', source_url: 'https://en.wikipedia.org/wiki/Event_Horizon_Telescope', source_label: 'Wikipedia: Event Horizon Telescope' },
    ],
    fib: { text: 'Black holes continuously grow by pulling in surrounding matter at a constant rate.', explanation: 'Black holes only grow when matter crosses the event horizon; they can also slowly shrink via Hawking radiation.', source_url: 'https://en.wikipedia.org/wiki/Hawking_radiation', source_label: 'Wikipedia: Hawking radiation' },
  },
]

beforeEach(async () => {
  db = await freshDb()
  // Make the test user an editor.
  await db.query(`insert into auth.users (id) values ($1)`, [EDITOR])
  await db.query(`insert into public.editors (user_id) values ($1)`, [EDITOR])
})

afterEach(async () => {
  await db.close()
})

const asEditor = <T,>(sql: string, params: unknown[] = []) => as<T>(db, { user: EDITOR }, sql, params)
const asAnon = <T,>(sql: string, params: unknown[] = []) => as<T>(db, 'anon', sql, params)

describe('puzzle_drafts table', () => {
  it('lets the service role insert a draft', async () => {
    // db.query runs as superuser (simulates service-role bypass)
    await db.query(`insert into puzzle_drafts (rounds) values ($1)`, [JSON.stringify(ROUNDS)])
    const { rows } = await db.query<{ status: string; puzzle_number: null }>('select status, puzzle_number from puzzle_drafts')
    expect(rows).toEqual([{ status: 'pending', puzzle_number: null }])
  })

  it('hides drafts from anonymous players', async () => {
    await db.query(`insert into puzzle_drafts (rounds) values ($1)`, [JSON.stringify(ROUNDS)])
    const { rows } = await asAnon('select * from puzzle_drafts')
    expect(rows).toEqual([])
  })

  it('lets editors read drafts', async () => {
    await db.query(`insert into puzzle_drafts (rounds) values ($1)`, [JSON.stringify(ROUNDS)])
    const { rows } = await asEditor<{ status: string }>('select status from puzzle_drafts')
    expect(rows).toEqual([{ status: 'pending' }])
  })
})

describe('approve_draft', () => {
  async function insertDraft() {
    const { rows } = await db.query<{ id: string }>(
      `insert into puzzle_drafts (rounds) values ($1) returning id`,
      [JSON.stringify(ROUNDS)],
    )
    return rows[0].id
  }

  it('auto-assigns the next puzzle number and marks approved', async () => {
    const id = await insertDraft()
    const { rows } = await asEditor<{ n: number }>('select approve_draft($1) as n', [id])
    const n = rows[0].n
    expect(n).toBeGreaterThan(0)
    const { rows: drafts } = await db.query<{ status: string; puzzle_number: number }>(
      'select status, puzzle_number from puzzle_drafts where id = $1', [id]
    )
    expect(drafts[0]).toEqual({ status: 'approved', puzzle_number: n })
  })

  it('assigns sequential numbers for multiple drafts', async () => {
    const id1 = await insertDraft()
    const id2 = await insertDraft()
    const { rows: [{ n: n1 }] } = await asEditor<{ n: number }>('select approve_draft($1) as n', [id1])
    const { rows: [{ n: n2 }] } = await asEditor<{ n: number }>('select approve_draft($1) as n', [id2])
    expect(n2).toBe(n1 + 1)
  })

  it('refuses anonymous callers', async () => {
    const id = await insertDraft()
    await expect(asAnon('select approve_draft($1)', [id])).rejects.toThrow(/permission denied|not an editor/)
  })
})

describe('reject_draft', () => {
  it('marks a draft as rejected', async () => {
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      `insert into puzzle_drafts (rounds) values ($1) returning id`, [JSON.stringify(ROUNDS)]
    )
    await asEditor('select reject_draft($1)', [id])
    const { rows } = await db.query<{ status: string }>('select status from puzzle_drafts where id = $1', [id])
    expect(rows[0].status).toBe('rejected')
  })

  it('refuses anonymous callers', async () => {
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      `insert into puzzle_drafts (rounds) values ($1) returning id`, [JSON.stringify(ROUNDS)]
    )
    await expect(asAnon('select reject_draft($1)', [id])).rejects.toThrow(/permission denied|not an editor/)
  })
})

describe('update_draft_rounds', () => {
  it('lets an editor edit the rounds before approving', async () => {
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      `insert into puzzle_drafts (rounds) values ($1) returning id`, [JSON.stringify(ROUNDS)]
    )
    const edited = [...ROUNDS]
    edited[0] = { ...edited[0], theme: 'Arctic penguins' }
    await asEditor('select update_draft_rounds($1, $2)', [id, JSON.stringify(edited)])
    const { rows } = await db.query<{ rounds: typeof ROUNDS }>('select rounds from puzzle_drafts where id = $1', [id])
    expect(rows[0].rounds[0].theme).toBe('Arctic penguins')
  })
})

describe('get_approved_puzzle', () => {
  it('returns null for a pending draft', async () => {
    await db.query(`insert into puzzle_drafts (rounds) values ($1)`, [JSON.stringify(ROUNDS)])
    const { rows } = await asAnon<{ get_approved_puzzle: unknown }>('select get_approved_puzzle(1)')
    expect(rows[0].get_approved_puzzle).toBeNull()
  })

  it('returns rounds JSON for an approved puzzle', async () => {
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      `insert into puzzle_drafts (rounds) values ($1) returning id`, [JSON.stringify(ROUNDS)]
    )
    const { rows: [{ n }] } = await asEditor<{ n: number }>('select approve_draft($1) as n', [id])
    const { rows } = await asAnon<{ get_approved_puzzle: typeof ROUNDS }>('select get_approved_puzzle($1)', [n])
    expect(rows[0].get_approved_puzzle[0].theme).toBe('Penguins')
  })

  it('returns null for a rejected draft', async () => {
    const { rows: [{ id }] } = await db.query<{ id: string }>(
      `insert into puzzle_drafts (rounds) values ($1) returning id`, [JSON.stringify(ROUNDS)]
    )
    await asEditor('select reject_draft($1)', [id])
    const { rows } = await asAnon<{ get_approved_puzzle: unknown }>('select get_approved_puzzle(1)')
    expect(rows[0].get_approved_puzzle).toBeNull()
  })
})
