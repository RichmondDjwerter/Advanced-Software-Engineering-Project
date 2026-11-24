import base64
import json
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import main
from chat import gemini_provider
from chat.base import ChatProviderError
from chat.transcription import MAX_IMAGE_SIDE, prepare_image

OCR_TEXT = "wrong ocr text"


@pytest.fixture(autouse=True)
def env_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    # Never read the developer's real key.
    path = tmp_path / "test.env"
    monkeypatch.setattr(gemini_provider, "ENV_FILE", path)
    monkeypatch.setattr(gemini_provider, "_START_ENV", {})
    return path


@pytest.fixture
def gemini_calls(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    calls: list[dict] = []

    def fake_client(api_key: str):
        def create(**request):
            calls.append({"api_key": api_key, **request})
            return SimpleNamespace(
                output_text='{"lines": [{"text": "I have got a bad cold", '
                '"box_2d": [100, 50, 150, 900]}]}'
            )

        return SimpleNamespace(interactions=SimpleNamespace(create=create))

    monkeypatch.setattr(gemini_provider.genai, "Client", fake_client)
    return calls


@pytest.fixture
def record_id(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setattr(main, "transcribe_image", lambda image_bytes: OCR_TEXT)
    monkeypatch.setattr(main, "translate_text", lambda text, language=None: "")
    monkeypatch.setattr(main, "detect_language", lambda text: None)

    buffer = BytesIO()
    Image.new("RGB", (8, 8), "white").save(buffer, format="PNG")
    response = client.post(
        "/historical_records",
        files={"image": ("secret-name.png", buffer.getvalue(), "image/png")},
    )
    return response.json()["id"]


def gemini_available(client: TestClient) -> bool:
    providers = client.get("/chat/providers").json()["providers"]
    return {p["name"]: p["available"] for p in providers}["gemini"]


def compare(client: TestClient, record_id: str, provider: str = "gemini"):
    return client.post(
        f"/historical_records/{record_id}/compare-transcription",
        json={"provider": provider},
    )


def test_providers_detect_key_added_after_start(
    client: TestClient, env_file: Path
) -> None:
    assert not gemini_available(client)

    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8")

    assert gemini_available(client)
    assert "secret-123" not in client.get("/chat/providers").text


def test_providers_accept_env_file_with_bom(client: TestClient, env_file: Path) -> None:
    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8-sig")

    assert gemini_available(client)


@pytest.mark.parametrize(
    "content",
    [
        b"GEMINI_API_KEY=\n",
        b"GEMINI_API_KEY=your-key\n",
        "GEMINI_API_KEY=secret-123\n".encode("utf-16"),
    ],
)
def test_providers_reject_unusable_key(
    client: TestClient, env_file: Path, content: bytes
) -> None:
    env_file.write_bytes(content)

    assert not gemini_available(client)


def test_environment_takes_precedence_over_file(
    env_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    env_file.write_text("GEMINI_API_KEY=from-file\n", encoding="utf-8")
    monkeypatch.setattr(gemini_provider, "_START_ENV", {"GEMINI_API_KEY": "from-env"})

    assert gemini_provider._api_key() == "from-env"


def test_chat_without_key_returns_503(client: TestClient, record_id: str) -> None:
    response = client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "Hello", "provider": "gemini"},
    )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
    assert client.get(f"/historical_records/{record_id}/chat").json() == []


def test_compare_saves_nothing(
    client: TestClient, record_id: str, env_file: Path, gemini_calls: list[dict]
) -> None:
    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8")
    before = client.get(f"/historical_records/{record_id}").json()

    response = compare(client, record_id)

    assert response.status_code == 200
    assert response.json()["current_text"] == OCR_TEXT
    assert response.json()["image"] == {
        "name": f"{record_id}.png",
        "width": 8,
        "height": 8,
    }
    assert response.json()["rows"][0]["proposed"][0]["text"] == "I have got a bad cold"
    assert client.get(f"/historical_records/{record_id}").json() == before
    assert client.get(f"/historical_records/{record_id}/chat").json() == []


def test_compare_sends_only_prompt_and_image(
    client: TestClient, record_id: str, env_file: Path, gemini_calls: list[dict]
) -> None:
    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8")
    client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "earlier question", "provider": "gemini"},
    )

    compare(client, record_id)

    request = gemini_calls[-1]
    assert request["store"] is False
    assert request["input"][0]["content"][1]["mime_type"] == "image/jpeg"
    for hint in (OCR_TEXT, "secret-name", "earlier question"):
        assert hint not in str(request)


def test_chat_gets_instructions_and_no_image(
    client: TestClient, record_id: str, env_file: Path, gemini_calls: list[dict]
) -> None:
    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8")

    client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "hallo gemini", "provider": "gemini"},
    )

    request = gemini_calls[-1]
    assert request["system_instruction"] == gemini_provider.CHAT_PROMPT + OCR_TEXT
    assert request["input"] == [
        {"type": "user_input", "content": [{"type": "text", "text": "hallo gemini"}]}
    ]


def test_compare_missing_record_returns_404(client: TestClient) -> None:
    assert compare(client, "missing").status_code == 404


def test_compare_missing_image_returns_404(client: TestClient, record_id: str) -> None:
    for path in main.UPLOAD_DIR.glob(f"{record_id}.*"):
        path.unlink()

    response = compare(client, record_id)

    assert response.status_code == 404
    assert response.json() == {"detail": "The document image was not found."}


def test_compare_requires_a_provider(client: TestClient, record_id: str) -> None:
    response = client.post(
        f"/historical_records/{record_id}/compare-transcription", json={}
    )

    assert response.status_code == 422


def test_compare_failure_saves_nothing(client: TestClient, record_id: str) -> None:
    response = compare(client, record_id, "gemini")

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
    assert client.get(f"/historical_records/{record_id}/chat").json() == []


@pytest.fixture
def local_requests(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    from chat import local_provider

    requests: list[dict] = []

    class Answer:
        def __init__(self, request):
            requests.append(json.loads(request.data))

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            content = json.dumps(
                {"lines": [{"text": "Local line", "box_2d": [100, 50, 150, 900]}]}
            )
            return json.dumps({"choices": [{"message": {"content": content}}]}).encode()

    monkeypatch.setattr(
        local_provider, "urlopen", lambda request, timeout: Answer(request)
    )
    return requests


def test_compare_with_local_llm(
    client: TestClient, record_id: str, local_requests: list[dict]
) -> None:
    response = compare(client, record_id, "local")

    assert response.status_code == 200
    assert response.json()["rows"][0]["proposed"][0]["text"] == "Local line"
    request = local_requests[0]
    assert request["response_format"]["type"] == "json_schema"
    assert request["messages"][1]["content"][1]["image_url"]["url"].startswith(
        "data:image/jpeg;base64,"
    )
    for hint in (OCR_TEXT, "secret-name"):
        assert hint not in json.dumps(request)


def test_compare_local_llm_not_running(
    client: TestClient, record_id: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    from chat import local_provider

    def refuse(request, timeout):
        raise local_provider.URLError("connection refused")

    monkeypatch.setattr(local_provider, "urlopen", refuse)

    response = compare(client, record_id, "local")

    assert response.status_code == 503
    assert "Could not reach the local" in response.json()["detail"]


def test_api_error_does_not_reveal_key(
    env_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8")

    def failing_client(api_key: str):
        raise ValueError(f"Illegal header value {api_key}")

    monkeypatch.setattr(gemini_provider.genai, "Client", failing_client)

    with pytest.raises(ChatProviderError) as error:
        gemini_provider.GeminiProvider()._generate(input="hello")

    assert "secret-123" not in str(error.value)


def test_empty_answer_is_an_error(
    env_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    env_file.write_text("GEMINI_API_KEY=secret-123\n", encoding="utf-8")
    interactions = SimpleNamespace(create=lambda **_: SimpleNamespace(output_text=""))
    monkeypatch.setattr(
        gemini_provider.genai,
        "Client",
        lambda api_key: SimpleNamespace(interactions=interactions),
    )

    with pytest.raises(ChatProviderError, match="empty answer"):
        gemini_provider.GeminiProvider()._generate(input="hello")


def decode(encoded: str) -> Image.Image:
    return Image.open(BytesIO(base64.b64decode(encoded)))


def test_prepare_image_downscales_and_flattens_to_white(tmp_path: Path) -> None:
    path = tmp_path / "page.png"
    Image.new("RGBA", (4096, 1024), (0, 0, 0, 0)).save(path)

    result = decode(prepare_image(path))

    assert result.format == "JPEG"
    assert result.size == (MAX_IMAGE_SIDE, 512)
    assert result.getpixel((10, 10)) == (255, 255, 255)


def test_prepare_image_applies_exif_orientation(tmp_path: Path) -> None:
    path = tmp_path / "page.jpg"
    exif = Image.Exif()
    exif[274] = 6  # rotated by 90 degrees
    Image.new("RGB", (80, 40), "white").save(path, exif=exif)

    assert decode(prepare_image(path)).size == (40, 80)
