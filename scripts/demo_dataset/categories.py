"""
Shared, cross-modal-aligned category list.

Every category has a real ESC-50 audio class, a searchable visual phrase, and a
Wikipedia title. Aligning all four modalities on the SAME concept is what makes
the demo land: typing "thunderstorm" should surface thunder audio + storm
photos + storm video + the Wikipedia article, all near each other in the shared
ImageBind space.

`key`   — ESC-50 folder/category name (underscored) used to select audio clips.
`query` — human phrase for image/video search (Openverse / Wikimedia Commons).
`wiki`  — Wikipedia page title for the text passage.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Category:
    key: str       # ESC-50 category (matches meta/esc50.csv `category` column)
    query: str     # visual search phrase
    wiki: str      # Wikipedia page title


# ~24 categories chosen for strong image/audio/text/video counterparts.
CATEGORIES: List[Category] = [
    Category("dog",              "dog",                 "Dog"),
    Category("cat",              "cat",                 "Cat"),
    Category("rooster",          "rooster",             "Rooster"),
    Category("cow",              "cow cattle",          "Cattle"),
    Category("frog",             "frog",                "Frog"),
    Category("chirping_birds",   "bird singing",        "Bird"),
    Category("rain",             "rain weather",        "Rain"),
    Category("sea_waves",        "ocean waves beach",   "Wind wave"),
    Category("crackling_fire",   "campfire flames",     "Campfire"),
    Category("wind",             "wind storm",          "Wind"),
    Category("thunderstorm",     "thunderstorm lightning", "Thunderstorm"),
    Category("pouring_water",    "pouring water",       "Water"),
    Category("footsteps",        "person walking",      "Walking"),
    Category("helicopter",       "helicopter",          "Helicopter"),
    Category("chainsaw",         "chainsaw",            "Chainsaw"),
    Category("siren",            "emergency siren ambulance", "Siren (alarm)"),
    Category("car_horn",         "car traffic",         "Car"),
    Category("engine",           "car engine",          "Engine"),
    Category("train",            "train railway",       "Train"),
    Category("church_bells",     "church bell tower",   "Bell"),
    Category("airplane",         "airplane flying",     "Airplane"),
    Category("fireworks",        "fireworks",           "Fireworks"),
    Category("clock_alarm",      "alarm clock",         "Alarm clock"),
    Category("glass_breaking",   "broken glass",        "Glass"),
]

KEYS = [c.key for c in CATEGORIES]


def by_key(key: str) -> Category | None:
    for c in CATEGORIES:
        if c.key == key:
            return c
    return None
