"""
Categories + topics for the demo dataset.

Two tiers:

1. CATEGORIES — ~41 ESC-50 sound classes. Get ALL four modalities
   (image + audio + video + text) so cross-modal search works (search a sound,
   get a photo). Audio is the limiter — ESC-50 is the only keyless labelled
   audio source — so the aligned set is capped here.

2. EXTRA_TOPICS — ~200 visually-rich subjects. Image + text only. These add
   breadth so search feels like "anything" — ~12 images each, not 100 of one
   thing.

ALL_VISUAL = CATEGORIES + EXTRA_TOPICS  → images & text.
CATEGORIES alone → audio & video.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Category:
    key: str
    query: str
    wiki: str


CATEGORIES: List[Category] = [
    Category("dog", "dog", "Dog"),
    Category("cat", "cat", "Cat"),
    Category("rooster", "rooster", "Rooster"),
    Category("hen", "hen chicken", "Chicken"),
    Category("pig", "pig", "Pig"),
    Category("cow", "cow cattle", "Cattle"),
    Category("sheep", "sheep", "Sheep"),
    Category("frog", "frog", "Frog"),
    Category("crow", "crow bird", "Crow"),
    Category("chirping_birds", "songbird", "Bird"),
    Category("insects", "insect macro", "Insect"),
    Category("crickets", "cricket insect", "Cricket (insect)"),
    Category("rain", "rain weather", "Rain"),
    Category("sea_waves", "ocean waves beach", "Wind wave"),
    Category("crackling_fire", "campfire flames", "Campfire"),
    Category("water_drops", "water droplets", "Drop (liquid)"),
    Category("wind", "wind storm", "Wind"),
    Category("pouring_water", "pouring water glass", "Water"),
    Category("thunderstorm", "thunderstorm lightning", "Thunderstorm"),
    Category("footsteps", "person walking", "Walking"),
    Category("clapping", "applause clapping hands", "Applause"),
    Category("laughing", "people laughing", "Laughter"),
    Category("keyboard_typing", "computer keyboard", "Computer keyboard"),
    Category("mouse_click", "computer mouse", "Computer mouse"),
    Category("can_opening", "soda can", "Drink can"),
    Category("washing_machine", "washing machine", "Washing machine"),
    Category("vacuum_cleaner", "vacuum cleaner", "Vacuum cleaner"),
    Category("clock_alarm", "alarm clock", "Alarm clock"),
    Category("clock_tick", "wall clock", "Clock"),
    Category("glass_breaking", "broken glass", "Glass"),
    Category("door_wood_knock", "wooden door", "Door"),
    Category("hand_saw", "hand saw tool", "Saw"),
    Category("chainsaw", "chainsaw", "Chainsaw"),
    Category("helicopter", "helicopter", "Helicopter"),
    Category("airplane", "airplane flying", "Airplane"),
    Category("train", "train railway", "Train"),
    Category("engine", "car engine motor", "Engine"),
    Category("car_horn", "car traffic street", "Car"),
    Category("siren", "ambulance emergency", "Siren (alarm)"),
    Category("church_bells", "church bell tower", "Church bell"),
    Category("fireworks", "fireworks display", "Fireworks"),
]

# Diverse image+text subjects (query strings; wiki title = same string, which
# the summary API resolves via redirect/capitalisation — misses just skip text).
EXTRA_TOPICS: List[str] = [
    # food & drink
    "pizza", "sushi", "hamburger", "pasta", "taco", "ramen", "ice cream",
    "chocolate", "coffee", "cheese", "bread", "strawberry", "watermelon",
    "avocado", "cake", "donut", "pancake", "popcorn", "lemon", "grapes",
    "pineapple", "mango", "broccoli", "steak", "cookie", "honey", "cupcake",
    "salad", "noodles", "wine",
    # wild & zoo animals
    "tiger", "lion", "elephant", "giraffe", "panda", "kangaroo", "penguin",
    "owl", "eagle", "dolphin", "whale", "shark", "octopus", "jellyfish",
    "butterfly", "snake", "turtle", "fox", "wolf", "bear", "deer", "horse",
    "zebra", "flamingo", "peacock", "rabbit", "squirrel", "hedgehog", "otter",
    "seal", "polar bear", "leopard", "cheetah", "rhinoceros", "hippopotamus",
    "gorilla", "monkey", "sloth", "camel", "llama", "duck", "swan", "crab",
    "lobster", "starfish", "seahorse", "spider", "ladybug", "dragonfly",
    # plants & flowers
    "sunflower", "rose", "tulip", "cactus", "bamboo", "mushroom", "palm tree",
    "maple leaf", "daisy", "lily", "lotus", "dandelion", "fern", "pine tree",
    "cherry blossom", "autumn leaves", "lavender", "orchid", "succulent",
    # places & nature
    "mountain", "beach", "desert", "forest", "waterfall", "volcano", "canyon",
    "glacier", "coral reef", "aurora", "rainbow", "meadow", "valley", "cliff",
    "cave", "lake", "river", "island", "vineyard", "harbor", "geyser",
    "hot spring", "fjord", "sand dune", "snow",
    # landmarks
    "Eiffel Tower", "Great Wall of China", "Taj Mahal", "Colosseum",
    "Statue of Liberty", "Mount Fuji", "Golden Gate Bridge",
    "Sydney Opera House", "lighthouse", "Leaning Tower of Pisa", "Stonehenge",
    "Machu Picchu", "Christ the Redeemer", "Burj Khalifa", "Tower Bridge",
    # vehicles
    "bicycle", "motorcycle", "sports car", "bus", "sailboat", "submarine",
    "rocket", "tractor", "hot air balloon", "cruise ship", "skateboard",
    "tram", "ambulance", "fire truck", "taxi", "jeep", "excavator", "crane",
    "canoe", "kayak", "ferry", "fighter jet", "scooter", "truck",
    # sports
    "soccer", "basketball", "tennis", "baseball", "surfing", "skiing",
    "rock climbing", "yoga", "boxing", "cycling", "golf", "bowling", "diving",
    "fishing", "hiking",
    # instruments
    "guitar", "piano", "violin", "drum kit", "trumpet", "saxophone", "flute",
    "harp", "cello", "accordion",
    # tech & objects
    "robot", "drone", "telescope", "camera", "lightbulb", "windmill",
    "solar panel", "satellite", "globe", "hourglass", "headphones",
    "microphone", "game controller", "smartwatch", "laptop", "printer",
    "gears", "turbine", "battery", "lantern", "umbrella", "backpack",
    "sunglasses", "key", "compass",
    # architecture & scenes
    "skyscraper", "staircase", "archway", "dome", "fountain", "alley",
    "market", "library", "museum", "stadium", "airport", "train station",
    "factory", "barn", "greenhouse",
    # misc / abstract
    "balloon", "kite", "origami", "graffiti", "mosaic", "stained glass",
    "neon sign", "dice", "playing cards", "yarn", "candle", "mirror", "vase",
    "teapot", "chessboard",
    # nature phenomena & space
    "lightning", "tornado", "eclipse", "galaxy", "nebula", "moon", "fog",
    "frost", "icicle", "comet",
]


def _slug(s: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in s.lower()).strip("_")


# Aligned + diverse, for image & text fetching. dedupe by slug.
_seen = {c.key for c in CATEGORIES}
ALL_VISUAL: List[Category] = list(CATEGORIES)
for _t in EXTRA_TOPICS:
    _k = _slug(_t)
    if _k and _k not in _seen:
        _seen.add(_k)
        ALL_VISUAL.append(Category(_k, _t, _t))

KEYS = [c.key for c in CATEGORIES]


def by_key(key: str) -> Category | None:
    for c in ALL_VISUAL:
        if c.key == key:
            return c
    return None
