from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from chat import config, gemini_provider, local_provider, registry
from chat.base import ChatProvider


@pytest.fixture(autouse=True)
def no_real_key(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(gemini_provider, "ENV_FILE", tmp_path / "test.env")
    monkeypatch.setattr(gemini_provider, "_START_ENV", {})


def test_providers_come_from_the_config(client: TestClient) -> None:
    body = client.get("/chat/providers").json()

    assert body["default"] == "local"
    by_name = {p["name"]: p for p in body["providers"]}
    assert by_name.keys() == config.load_config().providers.keys()
    gemini = by_name["gemini"]
    assert gemini["label"] == "Gemini"
    assert gemini["external"] is True
    assert gemini["setup"]["link"]["url"].startswith("https://")
    assert gemini["setup"]["copy_line"] == "GEMINI_API_KEY=your-key"
    assert "placeholder" not in gemini["setup"]


def test_local_without_server_is_not_available(client: TestClient) -> None:
    providers = client.get("/chat/providers").json()["providers"]

    local = next(p for p in providers if p["name"] == "local")
    assert local["available"] is False
    assert local["setup"]["steps"]


def test_local_with_server_is_available(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    class Answer:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    urls = []
    monkeypatch.setattr(
        local_provider, "urlopen", lambda url, timeout: urls.append(url) or Answer()
    )

    providers = client.get("/chat/providers").json()["providers"]

    assert next(p for p in providers if p["name"] == "local")["available"] is True
    assert urls == ["http://127.0.0.1:8080/v1/models"]


def test_unknown_provider_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/historical_records/any/chat", json={"content": "hi", "provider": "nope"}
    )

    assert response.status_code == 422
    assert "Unknown provider" in response.text


def write_config(path: Path, *names: str, default: str = "local") -> Path:
    entries = "".join(
        f'[providers.{name}]\nlabel = "{name}"\nexternal = false\n'
        f'[providers.{name}.setup]\ntitle = "t"\nsteps = []\n'
        for name in names
    )
    path.write_text(f'default = "{default}"\n{entries}', encoding="utf-8")
    return path


def test_config_and_classes_must_match(tmp_path: Path) -> None:
    classes: dict[str, type[ChatProvider]] = dict(registry.PROVIDER_CLASSES)

    registry.check_config(
        config.read_config(write_config(tmp_path / "ok.toml", *classes)), classes
    )

    with pytest.raises(RuntimeError, match="no entry in providers.toml"):
        registry.check_config(
            config.read_config(write_config(tmp_path / "a.toml", "local")), classes
        )
    with pytest.raises(RuntimeError, match="no provider class"):
        registry.check_config(
            config.read_config(write_config(tmp_path / "b.toml", *classes, "claude")),
            classes,
        )
    with pytest.raises(RuntimeError, match="default provider"):
        registry.check_config(
            config.read_config(
                write_config(tmp_path / "c.toml", *classes, default="claude")
            ),
            classes,
        )


def test_config_rejects_typos(tmp_path: Path) -> None:
    path = write_config(tmp_path / "typo.toml", "local")
    path.write_text(
        path.read_text(encoding="utf-8").replace("label", "lable"), encoding="utf-8"
    )

    with pytest.raises(ValueError):
        config.read_config(path)


def test_placeholder_comes_from_the_config(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "test.env").write_text("GEMINI_API_KEY=your-key\n", encoding="utf-8")
    monkeypatch.setattr(gemini_provider, "ENV_FILE", tmp_path / "test.env")

    assert gemini_provider.GeminiProvider.is_configured() is False
