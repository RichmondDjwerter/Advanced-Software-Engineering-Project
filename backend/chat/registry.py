"""All chat providers: the classes (behaviour) matched with the config (data) by name.

Adding a provider: write a ChatProvider subclass, add it to PROVIDER_CLASSES and add
an entry to chat/providers.toml. The API and the UI need no changes.
"""

from typing import Any

from .base import ChatProvider, ProviderInfo
from .config import ProvidersConfig, load_config
from .gemini_provider import GeminiProvider
from .local_provider import LocalLLMProvider

PROVIDER_CLASSES: dict[str, type[ChatProvider]] = {
    cls.name: cls for cls in (LocalLLMProvider, GeminiProvider)
}


def check_config(
    config: ProvidersConfig, classes: dict[str, type[ChatProvider]]
) -> None:
    """Raise RuntimeError if config and classes do not describe the same providers."""
    missing = sorted(classes.keys() - config.providers.keys())
    unknown = sorted(config.providers.keys() - classes.keys())
    problems = []
    if missing:
        problems.append(f"no entry in providers.toml for {missing}")
    if unknown:
        problems.append(f"no provider class for {unknown}")
    if config.default not in classes:
        problems.append(f"default provider {config.default!r} does not exist")
    if problems:
        raise RuntimeError("Chat provider setup is invalid: " + "; ".join(problems))


check_config(load_config(), PROVIDER_CLASSES)


def names() -> list[str]:
    return list(PROVIDER_CLASSES)


def default_name() -> str:
    return load_config().default


def create(name: str) -> ChatProvider:
    """Raises KeyError for an unknown name."""
    return PROVIDER_CLASSES[name]()


def infos() -> dict[str, Any]:
    """What the UI needs to list and set up the providers, never credentials."""
    config = load_config()
    providers = []
    for name, cls in PROVIDER_CLASSES.items():
        entry = config.providers[name]
        setup = entry.setup.model_dump(exclude_none=True)
        setup.pop("placeholder", None)  # only the backend needs it
        providers.append(
            ProviderInfo(
                name=name,
                label=entry.label,
                available=cls.is_configured(),
                external=entry.external,
                setup=setup,
            )
        )
    return {"default": config.default, "providers": providers}
