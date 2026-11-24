"""Loads chat/providers.toml: the data about each provider (labels, setup steps).

Kept separate from the registry, so that provider classes can read their own entry
without importing each other.
"""

import tomllib
from functools import cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict

CONFIG_FILE = Path(__file__).with_name("providers.toml")


class Strict(BaseModel):
    # a typo in the config should fail at start, not silently hide a field
    model_config = ConfigDict(extra="forbid")


class SetupLink(Strict):
    label: str
    url: str


class ProviderSetup(Strict):
    title: str
    steps: list[str]
    link: SetupLink | None = None
    copy_line: str | None = None
    placeholder: str | None = None


class ProviderConfig(Strict):
    label: str
    external: bool
    setup: ProviderSetup


class ProvidersConfig(Strict):
    default: str
    providers: dict[str, ProviderConfig]


def read_config(path: Path) -> ProvidersConfig:
    with path.open("rb") as file:
        return ProvidersConfig.model_validate(tomllib.load(file))


@cache
def load_config() -> ProvidersConfig:
    return read_config(CONFIG_FILE)


def provider_config(name: str) -> ProviderConfig:
    return load_config().providers[name]
