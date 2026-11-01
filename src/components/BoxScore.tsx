import type { Stats } from '../lib/stats'

export function BoxScore({ stats }: { stats: Stats }) {
  const cells: [number, string][] = [
    [stats.played, 'Played'],
    [stats.perfect, 'Perfect'],
    [stats.streak, 'Streak'],
    [stats.best, 'Best'],
  ]
  return (
    <section className="boxscore" aria-label="Your record">
      {cells.map(([n, label]) => (
        <div key={label}>
          <p className="boxscore__fig">{n}</p>
          <p>{label}</p>
        </div>
      ))}
    </section>
  )
}
