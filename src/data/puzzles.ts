import type { Puzzle, Source } from '../lib/types'

const wiki = (title: string): Source => ({
  label: `Wikipedia: ${title.replace(/_/g, ' ')}`,
  url: `https://en.wikipedia.org/wiki/${title}`,
})

type Raw = {
  theme: string
  truths: [string, string][]
  fib: { text: string; explanation: string; source: string }
}

const RAW: Raw[] = [
  {
    theme: 'Octopuses',
    truths: [
      ['An octopus has three hearts.', 'Octopus'],
      ['Octopus blood is blue because it carries oxygen with copper, not iron.', 'Octopus'],
      ['About two thirds of an octopus’s neurons sit in its arms, not its head.', 'Octopus'],
      ['A mother octopus stops eating while guarding her eggs and dies soon after.', 'Octopus'],
    ],
    fib: {
      text: 'An octopus can regrow a lost arm completely in about a day.',
      explanation: 'Octopuses do regrow arms, but it takes weeks to months, not a day.',
      source: 'Octopus',
    },
  },
  {
    theme: 'Honey bees',
    truths: [
      ['Honey bees tell each other where food is by doing a waggle dance.', 'Waggle_dance'],
      ['Male honey bees, called drones, have no sting at all.', 'Drone_(bee)'],
      ['A queen honey bee can lay up to around 2,000 eggs in a single day.', 'Queen_bee'],
      ['A honey bee beats its wings around 200 times every second.', 'Western_honey_bee'],
    ],
    fib: {
      text: 'Honey bees see the colour red more vividly than any other colour.',
      explanation: 'Bees barely see red at all. They see ultraviolet, blue and green instead.',
      source: 'Bee_learning_and_communication',
    },
  },
  {
    theme: 'The Solar System',
    truths: [
      ['A single day on Venus lasts longer than a whole year on Venus.', 'Venus'],
      ['Neptune was predicted by maths before anyone saw it through a telescope.', 'Discovery_of_Neptune'],
      ['Saturn is less dense than water.', 'Saturn'],
      ['Olympus Mons on Mars stands about two and a half times as tall as Everest.', 'Olympus_Mons'],
    ],
    fib: {
      text: 'Mercury is the hottest planet because it is the closest one to the Sun.',
      explanation: 'Venus is hotter. Its thick carbon dioxide atmosphere traps heat; Mercury has almost none.',
      source: 'Venus',
    },
  },
  {
    theme: 'The human body',
    truths: [
      ['Babies are born with around 300 bones, but adults have only 206.', 'Human_skeleton'],
      ['The smallest bone in your body, the stapes, sits inside your ear.', 'Stapes'],
      ['The cornea has no blood vessels and takes oxygen straight from the air.', 'Cornea'],
      ['Fingernails grow several times faster than toenails.', 'Nail_(anatomy)'],
    ],
    fib: {
      text: 'Your heart stops for a split second every time you sneeze.',
      explanation: 'A sneeze can change your heart’s rhythm slightly, but the heart keeps beating.',
      source: 'Sneeze',
    },
  },
  {
    theme: 'Words',
    truths: [
      ['The dot over a lowercase i or j is called a tittle.', 'Tittle'],
      ['The word robot comes from R.U.R., a Czech play first staged in 1921.', 'R.U.R.'],
      ['Quarantine comes from the Venetian for forty days.', 'Quarantine'],
      ['“The quick brown fox jumps over the lazy dog” uses every letter.', 'The_quick_brown_fox_jumps_over_the_lazy_dog'],
    ],
    fib: {
      text: 'The word OK began as a short form of the Scottish phrase “och aye”.',
      explanation: 'OK began in 1830s Boston as a joke abbreviation of “oll korrect”.',
      source: 'OK',
    },
  },
  {
    theme: 'Food',
    truths: [
      ['Peanuts are not true nuts. They are legumes, like peas and beans.', 'Peanut'],
      ['Botanically, bananas count as berries but strawberries do not.', 'Berry_(botany)'],
      ['Carrots were mostly purple or yellow before orange ones took over.', 'Carrot'],
      ['Most “wasabi” served outside Japan is horseradish dyed green.', 'Wasabi'],
    ],
    fib: {
      text: 'Caesar salad is named after Julius Caesar, who ate it before battles.',
      explanation: 'It is named after Caesar Cardini, a restaurateur in Tijuana, Mexico, in the 1920s.',
      source: 'Caesar_salad',
    },
  },
  {
    theme: 'Mammals',
    truths: [
      ['Wombats produce poo shaped like cubes.', 'Wombat'],
      ['The platypus lays eggs, and males have venomous spurs on their back legs.', 'Platypus'],
      ['A giraffe has seven bones in its neck, the same number as you.', 'Giraffe'],
      ['Bats are the only mammals capable of true, sustained flight.', 'Bat'],
    ],
    fib: {
      text: 'Hippos sweat a red liquid that is actually their own blood.',
      explanation: 'The red fluid is neither blood nor sweat. It is a secretion that works like sunscreen.',
      source: 'Hippopotamus',
    },
  },
  {
    theme: 'Inventions',
    truths: [
      ['Bubble wrap was first designed as a textured wallpaper.', 'Bubble_wrap'],
      ['The microwave oven began when a radar part melted a chocolate bar.', 'Microwave_oven'],
      ['Play-Doh was first sold as a cleaner for removing soot from wallpaper.', 'Play-Doh'],
      ['In 1947, engineers found a real moth stuck inside a Harvard computer.', 'Software_bug'],
    ],
    fib: {
      text: 'Post-it Notes were invented on purpose by 3M chemists aiming for a weak glue.',
      explanation: 'The glue was an accident: Spencer Silver was trying to make a very strong adhesive.',
      source: 'Post-it_Note',
    },
  },
  {
    theme: 'Geography',
    truths: [
      ['Russia stretches across eleven time zones.', 'Time_in_Russia'],
      ['Australia is wider from east to west than the Moon.', 'Australia'],
      ['Chimborazo in Ecuador is the farthest point from Earth’s centre, not Everest.', 'Chimborazo'],
      ['Africa is the only continent that lies in all four hemispheres.', 'Africa'],
    ],
    fib: {
      text: 'The Sahara is the largest desert on Earth.',
      explanation: 'Antarctica is the largest desert. The Sahara is the largest hot desert.',
      source: 'Desert',
    },
  },
  {
    theme: 'History',
    truths: [
      ['Cleopatra lived closer in time to the Moon landing than to the Great Pyramid.', 'Cleopatra'],
      ['Teaching at Oxford began before the Aztec capital Tenochtitlan was founded.', 'University_of_Oxford'],
      ['The war between Britain and Zanzibar in 1896 lasted under an hour.', 'Anglo-Zanzibar_War'],
      ['Napoleon was about average height for a Frenchman of his time.', 'Napoleon'],
    ],
    fib: {
      text: 'The Great Fire of London in 1666 killed tens of thousands of people.',
      explanation: 'Only a handful of deaths were recorded, though the true toll is uncertain.',
      source: 'Great_Fire_of_London',
    },
  },
  {
    theme: 'Music',
    truths: [
      ['A standard modern piano has 88 keys.', 'Piano'],
      ['Beethoven wrote his Ninth Symphony after he had become almost totally deaf.', 'Ludwig_van_Beethoven'],
      ['Mozart wrote his first symphony when he was about eight years old.', 'Symphony_No._1_(Mozart)'],
      ['The saxophone was invented by a Belgian, Adolphe Sax, in the 1840s.', 'Saxophone'],
    ],
    fib: {
      text: 'Antonio Stradivari made his most famous violins in a workshop in Vienna.',
      explanation: 'Stradivari worked his whole life in Cremona, in northern Italy.',
      source: 'Antonio_Stradivari',
    },
  },
  {
    theme: 'Sport',
    truths: [
      ['Astronaut Alan Shepard hit golf balls on the Moon in 1971.', 'Apollo_14'],
      ['Olympic gold medals are mostly silver, with a thin plating of gold.', 'Olympic_medal'],
      ['The marathon’s 42.195 km comes from the route of the 1908 London Olympics.', 'Marathon'],
      ['The first basketball hoops were peach baskets nailed to a balcony.', 'Basketball'],
    ],
    fib: {
      text: 'Table tennis was one of the sports at the first modern Olympics in 1896.',
      explanation: 'Table tennis only joined the Olympics in 1988, in Seoul.',
      source: 'Table_tennis_at_the_Summer_Olympics',
    },
  },
  {
    theme: 'Plants',
    truths: [
      ['Some bamboo can grow almost a metre in a single day.', 'Bamboo'],
      ['A bristlecone pine in California is more than 4,800 years old.', 'Methuselah_(tree)'],
      ['Young sunflowers turn to follow the Sun across the sky.', 'Heliotropism'],
      ['Vanilla comes from the seed pods of an orchid.', 'Vanilla'],
    ],
    fib: {
      text: 'The Venus flytrap grows wild in the Amazon rainforest.',
      explanation: 'It grows wild only in a small area of North and South Carolina, in the USA.',
      source: 'Venus_flytrap',
    },
  },
  {
    theme: 'Weather',
    truths: [
      ['A bolt of lightning is about five times hotter than the surface of the Sun.', 'Lightning'],
      ['Raindrops are not tear-shaped. Large ones flatten out like a burger bun.', 'Drop_(liquid)'],
      ['Thunder is the sound of air expanding suddenly as lightning heats it.', 'Thunder'],
      ['Earth is closest to the Sun in early January, during the northern winter.', 'Apsis'],
    ],
    fib: {
      text: 'Southern Hemisphere storms spin clockwise because of the Moon’s gravity.',
      explanation: 'They do spin clockwise, but because of Earth’s rotation (the Coriolis effect), not the Moon.',
      source: 'Coriolis_force',
    },
  },
]

export const PUZZLES: Puzzle[] = RAW.map((r, i) => {
  const number = i + 1
  return {
    number,
    theme: r.theme,
    truths: r.truths.map(([text, source], j) => ({ id: `p${number}-t${j + 1}`, text, source: wiki(source) })),
    fib: { id: `p${number}-fib`, text: r.fib.text, explanation: r.fib.explanation, source: wiki(r.fib.source) },
  }
})

/** The puzzle for a day. Past the end of the set it cycles, keeping the real number. */
export function getPuzzle(number: number): Puzzle {
  const base = PUZZLES[(number - 1) % PUZZLES.length]
  return { ...base, number }
}
