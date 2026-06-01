"""
Shared, cross-modal-aligned category list.

Every category is a real ESC-50 audio class, with a searchable visual phrase and
a Wikipedia title. Aligning all four modalities on the SAME concept is what makes
the demo land: typing "thunderstorm" surfaces thunder audio + storm photos + storm
video + the article, all near each other in the shared ImageBind space.

We cover ~40 of ESC-50's 50 classes — spanning animals, birds, insects, weather,
water, fire, human actions, domestic appliances, office gear, tools, and vehicles
(cars, trains, planes, helicopters) — so the dataset feels broad while staying
cross-modal. (Audio is capped to ESC-50's classes because it's the only keyless,
labeled audio source; images/text/video are matched to those concepts.)

`key`   — ESC-50 category (matches meta/esc50.csv `category` column)
`query` — visual search phrase (Openverse / Wikimedia Commons)
`wiki`  — Wikipedia page title for the text passage
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
    # animals
    Category("dog",              "dog",                    "Dog"),
    Category("cat",              "cat",                    "Cat"),
    Category("rooster",          "rooster",                "Rooster"),
    Category("hen",              "hen chicken",            "Chicken"),
    Category("pig",              "pig",                    "Pig"),
    Category("cow",              "cow cattle",             "Cattle"),
    Category("sheep",            "sheep",                  "Sheep"),
    Category("frog",             "frog",                   "Frog"),
    Category("crow",             "crow bird",              "Crow"),
    Category("chirping_birds",   "songbird singing",       "Bird"),
    Category("insects",          "insect macro",           "Insect"),
    Category("crickets",         "cricket insect",         "Cricket (insect)"),
    # nature / water / weather
    Category("rain",             "rain weather",           "Rain"),
    Category("sea_waves",        "ocean waves beach",      "Wind wave"),
    Category("crackling_fire",   "campfire flames",        "Campfire"),
    Category("water_drops",      "water droplets",         "Drop (liquid)"),
    Category("wind",             "wind storm",             "Wind"),
    Category("pouring_water",    "pouring water glass",    "Water"),
    Category("thunderstorm",     "thunderstorm lightning", "Thunderstorm"),
    # human actions
    Category("footsteps",        "person walking",         "Walking"),
    Category("clapping",         "applause clapping hands","Applause"),
    Category("laughing",         "people laughing",        "Laughter"),
    # domestic / office
    Category("keyboard_typing",  "computer keyboard",      "Computer keyboard"),
    Category("mouse_click",      "computer mouse",         "Computer mouse"),
    Category("can_opening",      "soda can",               "Drink can"),
    Category("washing_machine",  "washing machine",        "Washing machine"),
    Category("vacuum_cleaner",   "vacuum cleaner",         "Vacuum cleaner"),
    Category("clock_alarm",      "alarm clock",            "Alarm clock"),
    Category("clock_tick",       "wall clock",             "Clock"),
    Category("glass_breaking",   "broken glass",           "Glass"),
    Category("door_wood_knock",  "wooden door",            "Door"),
    # tools / vehicles / urban
    Category("hand_saw",         "hand saw tool",          "Saw"),
    Category("chainsaw",         "chainsaw",               "Chainsaw"),
    Category("helicopter",       "helicopter",             "Helicopter"),
    Category("airplane",         "airplane flying",        "Airplane"),
    Category("train",            "train railway",          "Train"),
    Category("engine",           "car engine motor",       "Engine"),
    Category("car_horn",         "car traffic street",     "Car"),
    Category("siren",            "ambulance emergency",     "Siren (alarm)"),
    Category("church_bells",     "church bell tower",      "Church bell"),
    Category("fireworks",        "fireworks display",      "Fireworks"),
]

KEYS = [c.key for c in CATEGORIES]


def by_key(key: str) -> Category | None:
    for c in CATEGORIES:
        if c.key == key:
            return c
    return None
