"""
Categories + topics for the demo dataset.

Two tiers:

1. CATEGORIES — ~41 ESC-50 sound classes. These get ALL four modalities
   (image + audio + video + text) so the cross-modal trick works: search a
   thunder *sound* and get storm *photos*, etc. Audio is the limiter — ESC-50
   is the only keyless labelled audio source, so the aligned set is capped here.

2. EXTRA_TOPICS — ~100 visually-rich subjects (food, landmarks, vehicles, wild
   animals, instruments, sports, tech…). Image + text only (no audio/video).
   These add breadth so search feels like "anything", without 50 near-duplicate
   photos of one thing.

ALL_VISUAL = CATEGORIES + EXTRA_TOPICS  → used for images & text.
CATEGORIES alone → used for audio & video.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Category:
    key: str       # slug / ESC-50 class name
    query: str     # visual + text search phrase
    wiki: str      # Wikipedia page title


CATEGORIES: List[Category] = [
    # animals
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
    # nature / water / weather
    Category("rain", "rain weather", "Rain"),
    Category("sea_waves", "ocean waves beach", "Wind wave"),
    Category("crackling_fire", "campfire flames", "Campfire"),
    Category("water_drops", "water droplets", "Drop (liquid)"),
    Category("wind", "wind storm", "Wind"),
    Category("pouring_water", "pouring water glass", "Water"),
    Category("thunderstorm", "thunderstorm lightning", "Thunderstorm"),
    # human actions
    Category("footsteps", "person walking", "Walking"),
    Category("clapping", "applause clapping hands", "Applause"),
    Category("laughing", "people laughing", "Laughter"),
    # domestic / office
    Category("keyboard_typing", "computer keyboard", "Computer keyboard"),
    Category("mouse_click", "computer mouse", "Computer mouse"),
    Category("can_opening", "soda can", "Drink can"),
    Category("washing_machine", "washing machine", "Washing machine"),
    Category("vacuum_cleaner", "vacuum cleaner", "Vacuum cleaner"),
    Category("clock_alarm", "alarm clock", "Alarm clock"),
    Category("clock_tick", "wall clock", "Clock"),
    Category("glass_breaking", "broken glass", "Glass"),
    Category("door_wood_knock", "wooden door", "Door"),
    # tools / vehicles / urban
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

# (search phrase, Wikipedia title) — image + text only, for breadth.
EXTRA_TOPICS: List[tuple[str, str]] = [
    # food & drink
    ("pizza", "Pizza"), ("sushi", "Sushi"), ("hamburger", "Hamburger"),
    ("pasta", "Pasta"), ("taco", "Taco"), ("ramen", "Ramen"),
    ("ice cream", "Ice cream"), ("chocolate", "Chocolate"), ("coffee", "Coffee"),
    ("cheese", "Cheese"), ("bread", "Bread"), ("strawberry", "Strawberry"),
    ("watermelon", "Watermelon"), ("avocado", "Avocado"), ("cake", "Cake"),
    # nature & places
    ("mountain", "Mountain"), ("beach", "Beach"), ("desert", "Desert"),
    ("forest", "Forest"), ("waterfall", "Waterfall"), ("volcano", "Volcano"),
    ("canyon", "Canyon"), ("glacier", "Glacier"), ("coral reef", "Coral reef"),
    ("aurora", "Aurora"), ("rainbow", "Rainbow"), ("snowflake", "Snowflake"),
    # landmarks
    ("Eiffel Tower", "Eiffel Tower"), ("Great Wall of China", "Great Wall of China"),
    ("Taj Mahal", "Taj Mahal"), ("Colosseum", "Colosseum"),
    ("Statue of Liberty", "Statue of Liberty"), ("Mount Fuji", "Mount Fuji"),
    ("Golden Gate Bridge", "Golden Gate Bridge"), ("Sydney Opera House", "Sydney Opera House"),
    ("pyramids of Giza", "Giza pyramid complex"), ("lighthouse", "Lighthouse"),
    # vehicles
    ("bicycle", "Bicycle"), ("motorcycle", "Motorcycle"), ("sports car", "Sports car"),
    ("bus", "Bus"), ("sailboat", "Sailboat"), ("submarine", "Submarine"),
    ("rocket", "Rocket"), ("tractor", "Tractor"), ("hot air balloon", "Hot air balloon"),
    ("cruise ship", "Cruise ship"), ("skateboard", "Skateboard"),
    # wild animals
    ("tiger", "Tiger"), ("lion", "Lion"), ("elephant", "Elephant"),
    ("giraffe", "Giraffe"), ("panda", "Giant panda"), ("kangaroo", "Kangaroo"),
    ("penguin", "Penguin"), ("owl", "Owl"), ("eagle", "Eagle"),
    ("dolphin", "Dolphin"), ("whale", "Whale"), ("shark", "Shark"),
    ("octopus", "Octopus"), ("jellyfish", "Jellyfish"), ("butterfly", "Butterfly"),
    ("snake", "Snake"), ("turtle", "Turtle"), ("fox", "Fox"),
    ("wolf", "Wolf"), ("bear", "Bear"), ("deer", "Deer"),
    ("horse", "Horse"), ("zebra", "Zebra"), ("flamingo", "Flamingo"),
    ("peacock", "Peafowl"),
    # plants
    ("sunflower", "Sunflower"), ("rose", "Rose"), ("tulip", "Tulip"),
    ("cactus", "Cactus"), ("bamboo", "Bamboo"), ("mushroom", "Mushroom"),
    ("palm tree", "Arecaceae"), ("maple leaf", "Maple"),
    # sports
    ("soccer", "Association football"), ("basketball", "Basketball"),
    ("tennis", "Tennis"), ("baseball", "Baseball"), ("surfing", "Surfing"),
    ("skiing", "Skiing"), ("rock climbing", "Climbing"), ("yoga", "Yoga"),
    ("boxing", "Boxing"), ("cycling", "Cycling"),
    # instruments
    ("guitar", "Guitar"), ("piano", "Piano"), ("violin", "Violin"),
    ("drum kit", "Drum kit"), ("trumpet", "Trumpet"), ("saxophone", "Saxophone"),
    ("flute", "Flute"), ("harp", "Harp"),
    # tech & objects
    ("robot", "Robot"), ("drone", "Unmanned aerial vehicle"), ("telescope", "Telescope"),
    ("camera", "Camera"), ("lightbulb", "Incandescent light bulb"),
    ("windmill", "Windmill"), ("solar panel", "Solar panel"), ("satellite", "Satellite"),
    ("globe", "Globe"), ("hourglass", "Hourglass"),
]


def _slug(s: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in s.lower()).strip("_")


# Aligned + diverse, for image & text fetching.
ALL_VISUAL: List[Category] = CATEGORIES + [
    Category(_slug(q), q, w) for (q, w) in EXTRA_TOPICS
]

KEYS = [c.key for c in CATEGORIES]


def by_key(key: str) -> Category | None:
    for c in ALL_VISUAL:
        if c.key == key:
            return c
    return None
