import type { Level, Puzzle, Round, Source } from '../lib/types'

const wiki = (title: string): Source => ({
  label: `Wikipedia: ${title.replace(/_/g, ' ')}`,
  url: `https://en.wikipedia.org/wiki/${title}`,
})

type Raw = {
  theme: string
  /** [statement, Wikipedia article] */
  truths: [string, string][]
  fib: { text: string; explanation: string; source: string }
}

/** Round 1: everyday knowledge, a fib most people can spot. */
const EASY: Raw[] = [
  {
    theme: 'Cats',
    truths: [
      ['Cats usually sleep for somewhere between 12 and 16 hours a day.', 'Cat'],
      ['Cats cannot taste sweetness.', 'Cat'],
      ['Most cats have five toes on each front paw and four on each back paw.', 'Polydactyl_cat'],
    ],
    fib: {
      text: 'A cat’s purr comes from a special bone in its throat vibrating.',
      explanation: 'There is no purring bone. Muscles in the voice box twitch, making the vocal folds vibrate.',
      source: 'Purr',
    },
  },
  {
    theme: 'Dogs',
    truths: [
      ['A dog’s nose is at least ten thousand times more sensitive than ours.', 'Dog'],
      ['Dalmatian puppies are born pure white and grow their spots later.', 'Dalmatian_dog'],
      ['Dogs sweat mainly through the pads of their paws.', 'Dog_anatomy'],
    ],
    fib: {
      text: 'Dogs see the world only in black, white and grey.',
      explanation: 'Dogs see colour, just less of it than we do: mostly blues and yellows.',
      source: 'Dog',
    },
  },
  {
    theme: 'Trees',
    truths: [
      ['You can tell a tree’s age by counting the rings in its trunk.', 'Dendrochronology'],
      ['Leaves are green because of a pigment called chlorophyll.', 'Chlorophyll'],
      ['The tallest known living tree is a coast redwood over 115 metres tall.', 'Hyperion_(tree)'],
    ],
    fib: {
      text: 'Trees get most of their weight from minerals they suck up out of the soil.',
      explanation: 'Most of a tree’s mass is carbon it pulls out of the air as carbon dioxide.',
      source: 'Photosynthesis',
    },
  },
  {
    theme: 'Oceans',
    truths: [
      ['The Pacific is the largest and deepest of Earth’s oceans.', 'Pacific_Ocean'],
      ['The deepest known point in the sea is nearly 11 kilometres down.', 'Challenger_Deep'],
      ['About 71 percent of Earth’s surface is covered by water.', 'Earth'],
    ],
    fib: {
      text: 'The Arctic is the largest of the world’s five oceans.',
      explanation: 'The Arctic is the smallest and shallowest of the five oceans.',
      source: 'Arctic_Ocean',
    },
  },
  {
    theme: 'Dinosaurs',
    truths: [
      ['Birds are living dinosaurs.', 'Bird'],
      ['T. rex lived closer in time to us than to Stegosaurus.', 'Stegosaurus'],
      ['The word dinosaur means “terrible lizard”.', 'Dinosaur'],
    ],
    fib: {
      text: 'Pterodactyls were a kind of flying dinosaur.',
      explanation: 'Pterosaurs were flying reptiles, close cousins of dinosaurs but not dinosaurs.',
      source: 'Pterosaur',
    },
  },
  {
    theme: 'Insects',
    truths: [
      ['Every adult insect has six legs.', 'Insect'],
      ['Butterflies taste with sensors on their feet.', 'Butterfly'],
      ['Ants have no lungs. Air enters through tiny holes along their bodies.', 'Ant'],
    ],
    fib: {
      text: 'Spiders are a kind of insect with eight legs.',
      explanation: 'Spiders are arachnids, not insects, the same group as scorpions and mites.',
      source: 'Spider',
    },
  },
  {
    theme: 'Birds',
    truths: [
      ['The ostrich lays the largest egg of any living bird.', 'Ostrich'],
      ['Hummingbirds can fly backwards.', 'Hummingbird'],
      ['Penguins live almost entirely in the Southern Hemisphere.', 'Penguin'],
    ],
    fib: {
      text: 'Owls can turn their heads all the way round, a full 360 degrees.',
      explanation: 'Owls can turn their heads about 270 degrees, not the whole way round.',
      source: 'Owl',
    },
  },
  {
    theme: 'Calendars',
    truths: [
      ['July and August are named after Julius Caesar and Augustus.', 'August'],
      ['September comes from the Latin for seven: it was once the seventh month.', 'September'],
      ['A leap year adds a day to February, almost every four years.', 'Leap_year'],
    ],
    fib: {
      text: 'The week has seven days because Rome was built on seven hills.',
      explanation: 'The seven-day week came from ancient Babylon and the Jewish calendar, long before Rome adopted it.',
      source: 'Week',
    },
  },
  {
    theme: 'Colours',
    truths: [
      ['Your eyes see colour with three kinds of cone cells.', 'Cone_cell'],
      ['Mix red, green and blue light together and you get white light.', 'Additive_color'],
      ['Flamingos are pink because of pigments in the food they eat.', 'Flamingo'],
    ],
    fib: {
      text: 'Bulls charge at a matador’s cape because the colour red angers them.',
      explanation: 'Bulls cannot tell red from green. They charge at the cape because it moves.',
      source: 'Cattle',
    },
  },
  {
    theme: 'Football',
    truths: [
      ['A football match lasts 90 minutes, played in two halves.', 'Association_football'],
      ['Brazil has won the men’s World Cup more times than any other country.', 'FIFA_World_Cup'],
      ['Only the goalkeeper may handle the ball, and only inside their own box.', 'Goalkeeper_(association_football)'],
    ],
    fib: {
      text: 'The first World Cup was held in England, where football’s rules were written.',
      explanation: 'The first World Cup was held in Uruguay in 1930. England did not even take part.',
      source: '1930_FIFA_World_Cup',
    },
  },
  {
    theme: 'Fruit',
    truths: [
      ['Botanically, a tomato is a fruit.', 'Tomato'],
      ['A cashew nut grows hanging from the bottom of a fruit called a cashew apple.', 'Cashew'],
      ['An avocado is a berry with a single large seed.', 'Avocado'],
    ],
    fib: {
      text: 'The orange fruit was named after the colour orange.',
      explanation: 'It went the other way: the colour was named after the fruit.',
      source: 'Orange_(colour)',
    },
  },
  {
    theme: 'Capital cities',
    truths: [
      ['The capital of Australia is Canberra, not Sydney.', 'Canberra'],
      ['Vatican City is the smallest country in the world.', 'Vatican_City'],
      ['South Africa has three capital cities.', 'Capital_of_South_Africa'],
    ],
    fib: {
      text: 'Istanbul is the capital city of Turkey.',
      explanation: 'Turkey’s capital is Ankara. Istanbul is its largest city.',
      source: 'Ankara',
    },
  },
  {
    theme: 'The kitchen',
    truths: [
      ['Water boils at a lower temperature high up a mountain.', 'Boiling_point'],
      ['Popcorn pops because water inside each kernel turns to steam.', 'Popcorn'],
      ['Bread rises because yeast gives off carbon dioxide gas.', 'Baker%27s_yeast'],
    ],
    fib: {
      text: 'Adding salt to a pot of water makes it boil much faster.',
      explanation: 'Salt raises the boiling point very slightly, so if anything it boils a touch later.',
      source: 'Boiling-point_elevation',
    },
  },
  {
    theme: 'The Moon',
    truths: [
      ['The Moon always shows the same face to Earth.', 'Tidal_locking'],
      ['Twelve people have walked on the Moon.', 'List_of_Apollo_astronauts'],
      ['The Moon is drifting away from Earth by about 3.8 centimetres a year.', 'Lunar_distance'],
    ],
    fib: {
      text: 'The Moon looks bigger near the horizon because it is closer to us then.',
      explanation: 'It is an illusion. The Moon is no closer on the horizon; if anything it is slightly farther.',
      source: 'Moon_illusion',
    },
  },
]

/** Round 2: surprising but checkable, a fib that sounds plausible. */
const MEDIUM: Raw[] = [
  {
    theme: 'Sharks',
    truths: [
      ['Sharks have no bones. Their skeletons are made of cartilage.', 'Shark'],
      ['Some sharks must keep swimming to push water over their gills.', 'Shark'],
      ['Sharks were around before the first trees.', 'Shark'],
    ],
    fib: {
      text: 'The great white is the largest fish in the sea.',
      explanation: 'The largest fish is the whale shark, which can grow more than twice as long.',
      source: 'Whale_shark',
    },
  },
  {
    theme: 'Ancient Egypt',
    truths: [
      ['The Great Pyramid was the world’s tallest building for nearly 4,000 years.', 'Great_Pyramid_of_Giza'],
      ['Egyptians wrote on a kind of paper made from papyrus reeds.', 'Papyrus'],
      ['Cleopatra came from a Greek-speaking Macedonian family.', 'Cleopatra'],
    ],
    fib: {
      text: 'The pyramids were built by slaves captured in war.',
      explanation: 'The evidence points to paid workers, who lived in villages beside the pyramids.',
      source: 'Great_Pyramid_of_Giza',
    },
  },
  {
    theme: 'Chocolate',
    truths: [
      ['Chocolate is made from the seeds of the cacao tree.', 'Cocoa_bean'],
      ['White chocolate contains no cocoa solids, only cocoa butter.', 'White_chocolate'],
      ['A chemical in chocolate called theobromine is poisonous to dogs.', 'Theobromine_poisoning'],
    ],
    fib: {
      text: 'Milk chocolate was invented in Belgium in the 1700s.',
      explanation: 'Milk chocolate was invented in Switzerland by Daniel Peter, in 1875.',
      source: 'Milk_chocolate',
    },
  },
  {
    theme: 'Volcanoes',
    truths: [
      ['Most of the world’s volcanoes ring the Pacific Ocean.', 'Ring_of_Fire'],
      ['Pompeii was buried when Mount Vesuvius erupted in AD 79.', 'Pompeii'],
      ['Iceland sits on the ridge where two tectonic plates pull apart.', 'Mid-Atlantic_Ridge'],
    ],
    fib: {
      text: 'Mount Everest is the tallest volcano in the world.',
      explanation: 'Everest is not a volcano. It was pushed up as two plates collided.',
      source: 'Mount_Everest',
    },
  },
  {
    theme: 'Money',
    truths: [
      ['The first coins were made in Lydia, in what is now Turkey.', 'Lydia'],
      ['Paper money was first used in China.', 'Banknote'],
      ['Nobody knows for sure who invented Bitcoin.', 'Satoshi_Nakamoto'],
    ],
    fib: {
      text: 'The pound got its name from early coins that weighed a pound of gold.',
      explanation: 'The name comes from a pound weight of silver, cut into 240 pennies.',
      source: 'Pound_sterling',
    },
  },
  {
    theme: 'Rivers',
    truths: [
      ['The Amazon carries more water than any other river.', 'Amazon_River'],
      ['The Danube flows through ten countries, more than any other river.', 'Danube'],
      ['The Nile and the Amazon are the two longest rivers in the world.', 'List_of_river_systems_by_length'],
    ],
    fib: {
      text: 'The Nile flows south, from the Mediterranean down into Lake Victoria.',
      explanation: 'The Nile flows north, from East Africa out into the Mediterranean.',
      source: 'Nile',
    },
  },
  {
    theme: 'Sleep',
    truths: [
      ['Most vivid dreaming happens during REM sleep.', 'Rapid_eye_movement_sleep'],
      ['Dolphins sleep with one half of their brain at a time.', 'Unihemispheric_slow-wave_sleep'],
      ['Koalas can sleep for up to 20 hours a day.', 'Koala'],
    ],
    fib: {
      text: 'Your brain switches itself almost completely off while you sleep.',
      explanation: 'The sleeping brain stays busy, sorting memories and in some stages working as hard as when awake.',
      source: 'Sleep',
    },
  },
  {
    theme: 'Languages',
    truths: [
      ['Mandarin Chinese has more native speakers than any other language.', 'Mandarin_Chinese'],
      ['Papua New Guinea has more languages than any other country.', 'Languages_of_Papua_New_Guinea'],
      ['No official body sets the rules of the English language.', 'English_language'],
    ],
    fib: {
      text: 'Latin is still one of the official languages of Italy.',
      explanation: 'Italy’s official language is Italian. Latin is official only in Vatican City.',
      source: 'Latin',
    },
  },
  {
    theme: 'The Olympics',
    truths: [
      ['The first modern Olympics were held in Athens in 1896.', '1896_Summer_Olympics'],
      ['Women first competed at the Olympics in Paris in 1900.', '1900_Summer_Olympics'],
      ['The ring colours were chosen because every flag of 1913 contained at least one.', 'Olympic_symbols'],
    ],
    fib: {
      text: 'The Olympic torch relay goes back to the ancient Greek Games.',
      explanation: 'The torch relay began at the 1936 Berlin Games. The ancient Games had none.',
      source: 'Olympic_flame',
    },
  },
  {
    theme: 'Coffee and tea',
    truths: [
      ['Coffee beans are the seeds of a small red fruit.', 'Coffee_bean'],
      ['Green tea and black tea come from the same plant.', 'Camellia_sinensis'],
      ['The word coffee reached English from Arabic, through Turkish and Dutch.', 'Coffee'],
    ],
    fib: {
      text: 'People first drank coffee in Brazil before it spread to Europe.',
      explanation: 'Coffee drinking began in Yemen, with beans from Ethiopia. Brazil came much later.',
      source: 'History_of_coffee',
    },
  },
  {
    theme: 'Kings and queens',
    truths: [
      ['Elizabeth II reigned for more than 70 years.', 'Elizabeth_II'],
      ['Louis XIV of France reigned for 72 years.', 'Louis_XIV'],
      ['Henry VIII of England married six times.', 'Wives_of_Henry_VIII'],
    ],
    fib: {
      text: 'Napoleon crowned himself emperor in St Peter’s Basilica in Rome.',
      explanation: 'He crowned himself in Notre-Dame Cathedral in Paris, in 1804.',
      source: 'Coronation_of_Napoleon',
    },
  },
  {
    theme: 'Islands',
    truths: [
      ['Greenland is the world’s largest island that is not a continent.', 'Greenland'],
      ['Wild lemurs live only on Madagascar and a few small islands nearby.', 'Lemur'],
      ['Indonesia is made up of more than 17,000 islands.', 'Indonesia'],
    ],
    fib: {
      text: 'Iceland is mostly covered in ice, while Greenland is mostly green.',
      explanation: 'It is the other way round. About 80 percent of Greenland is ice; only about a tenth of Iceland is.',
      source: 'Greenland',
    },
  },
  {
    theme: 'Computers',
    truths: [
      ['Ada Lovelace wrote what is often called the first computer program, in the 1840s.', 'Ada_Lovelace'],
      ['The word pixel is short for “picture element”.', 'Pixel'],
      ['The QWERTY keyboard layout was designed for typewriters.', 'QWERTY'],
    ],
    fib: {
      text: 'The @ symbol was invented for the first email, in 1971.',
      explanation: 'The @ sign is centuries older. Merchants used it to mean “at the rate of”.',
      source: 'At_sign',
    },
  },
  {
    theme: 'The elements',
    truths: [
      ['Gold can be beaten into sheets so thin that light shines through.', 'Gold_leaf'],
      ['Mercury is a metal that is liquid at room temperature.', 'Mercury_(element)'],
      ['Diamonds and pencil lead are both made of pure carbon.', 'Allotropes_of_carbon'],
    ],
    fib: {
      text: 'Helium was first discovered in a natural gas well in Texas.',
      explanation: 'Helium was first found in the light of the Sun, in 1868, before anyone found it on Earth.',
      source: 'Helium',
    },
  },
]

/** Round 3: the hard round, and the one a reader’s fib can take over. */
const HARD: Raw[] = [
  {
    theme: 'Octopuses',
    truths: [
      ['An octopus has three hearts.', 'Octopus'],
      ['Octopus blood is blue because it carries oxygen with copper, not iron.', 'Octopus'],
      ['About two thirds of an octopus’s neurons sit in its arms, not its head.', 'Octopus'],
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
      ['Earth is closest to the Sun in early January, during the northern winter.', 'Apsis'],
    ],
    fib: {
      text: 'Southern Hemisphere storms spin clockwise because of the Moon’s gravity.',
      explanation: 'They do spin clockwise, but because of Earth’s rotation (the Coriolis effect), not the Moon.',
      source: 'Coriolis_force',
    },
  },
]

const LEVELS: Level[] = ['easy', 'medium', 'hard']

function toRound(raw: Raw, number: number, r: number): Round {
  const prefix = `p${number}-r${r + 1}`
  return {
    theme: raw.theme,
    level: LEVELS[r],
    truths: raw.truths.map(([text, source], j) => ({ id: `${prefix}-t${j + 1}`, text, source: wiki(source) })),
    fib: { id: `${prefix}-fib`, text: raw.fib.text, explanation: raw.fib.explanation, source: wiki(raw.fib.source) },
  }
}

export const PUZZLES: Puzzle[] = HARD.map((_, i) => {
  const number = i + 1
  return { number, rounds: [EASY[i], MEDIUM[i], HARD[i]].map((raw, r) => toRound(raw, number, r)) }
})

/** The paper for a day. Past the end of the set it cycles, keeping the real number. */
export function getPuzzle(number: number): Puzzle {
  const base = PUZZLES[(number - 1) % PUZZLES.length]
  return { ...base, number }
}
