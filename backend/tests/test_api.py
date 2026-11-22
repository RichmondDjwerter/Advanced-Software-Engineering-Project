from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, inspect, text

import chat_mock
import main


def test_migrate_historical_record_columns_adds_missing_columns() -> None:
    legacy_engine = create_engine("sqlite://")
    with legacy_engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE historical_records "
                "(id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL)"
            )
        )

    main.migrate_historical_record_columns(legacy_engine)
    main.migrate_historical_record_columns(legacy_engine)

    columns = {
        column["name"]
        for column in inspect(legacy_engine).get_columns("historical_records")
    }
    assert {
        "line_data",
        "image_width",
        "image_height",
        "detected_language",
    } <= columns


def test_root_returns_api_description(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Historical Manuscripts API"}


def test_list_historical_records_returns_empty_list(client: TestClient) -> None:
    response = client.get("/historical_records")

    assert response.status_code == 200
    assert response.json() == []


def test_missing_historical_record_returns_404(client: TestClient) -> None:
    response = client.get("/historical_records/missing-record")

    assert response.status_code == 404
    assert response.json() == {"detail": "Historical record not found"}


def make_png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (4, 4), "white").save(buffer, format="PNG")
    return buffer.getvalue()


PNG_BYTES = make_png_bytes()


@pytest.fixture(autouse=True)
def fake_ocr(monkeypatch: pytest.MonkeyPatch) -> None:
    # Avoid loading the real TrOCR model in tests.
    monkeypatch.setattr(main, "transcribe_image", lambda image_bytes: "fake text")


@pytest.fixture(autouse=True)
def fake_translation(monkeypatch: pytest.MonkeyPatch) -> None:
    # Avoid loading the real translation model in tests.
    monkeypatch.setattr(
        main, "translate_text", lambda text, language=None: f"translated: {text}"
    )


@pytest.fixture(autouse=True)
def fake_language_detection(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "detect_language", lambda text: None)


def test_upload_translates_extracted_text(client: TestClient) -> None:
    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["translated_text"] == "translated: fake text"
    assert response.json()["detected_language"] is None


def test_upload_uses_detected_language_for_translation(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    languages: list[str | None] = []
    monkeypatch.setattr(main, "detect_language", lambda text: "la")
    monkeypatch.setattr(
        main,
        "translate_text",
        lambda text, language=None: languages.append(language) or "translated",
    )

    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    assert languages == ["la"]
    assert response.json()["detected_language"] == "la"


def test_language_detection_falls_back_if_fasttext_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def broken_detection(text: str) -> str | None:
        raise RuntimeError("FastText model unavailable")

    monkeypatch.setattr(main, "detect_language", broken_detection)

    assert main.detect_transcription_language("some transcription") is None


def test_upload_succeeds_when_translation_fails(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(text: str, language: str | None = None) -> str:
        raise RuntimeError("model missing")

    monkeypatch.setattr(main, "translate_text", broken)

    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["extracted_text"] == "fake text"
    assert response.json()["translated_text"] is None
    assert response.json()["detected_language"] is None


def test_upload_keeps_detected_language_when_translation_fails(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(main, "detect_language", lambda text: "la")

    def broken_translation(text: str, language: str | None = None) -> str:
        raise RuntimeError("model missing")

    monkeypatch.setattr(main, "translate_text", broken_translation)

    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["detected_language"] == "la"


def test_upload_image_creates_historical_record(
    client: TestClient, tmp_path: Path
) -> None:
    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    record = response.json()
    assert record["name"] == "record.png"
    assert record["description"] is None
    assert record["extracted_text"] == "fake text"
    assert record["id"]
    assert record["created_at"]
    assert record["updated_at"]
    assert (tmp_path / f"{record['id']}.png").read_bytes() == PNG_BYTES


def test_upload_non_image_returns_415(client: TestClient) -> None:
    response = client.post(
        "/historical_records",
        files={"image": ("record.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json() == {"detail": "Upload a JPEG, PNG, GIF, BMP, or WebP image."}


@pytest.fixture(autouse=True)
def no_mock_delay(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(chat_mock, "REPLY_DELAY_SECONDS", 0)


def create_record(client: TestClient) -> str:
    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )
    return response.json()["id"]


def test_chat_missing_record_returns_404(client: TestClient) -> None:
    response = client.post(
        "/historical_records/missing-record/chat",
        json={"content": "Hello"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Historical record not found"}


def test_chat_empty_message_returns_400(client: TestClient) -> None:
    record_id = create_record(client)

    response = client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "   "},
    )

    assert response.status_code == 400


def upload_record(client: TestClient) -> str:
    response = client.post(
        "/historical_records",
        files={"image": ("record.png", PNG_BYTES, "image/png")},
    )
    return response.json()["id"]


def test_retranslation_saves_detected_language(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record_id = upload_record(client)
    monkeypatch.setattr(main, "detect_language", lambda text: "la")

    response = client.post(
        f"/historical_records/{record_id}/translate",
        json={"text": "Gallia est omnis divisa"},
    )

    assert response.status_code == 200
    assert response.json()["detected_language"] == "la"
    assert (
        client.get(f"/historical_records/{record_id}").json()["detected_language"]
        == "la"
    )


def test_detect_language_endpoint_updates_existing_record(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    record_id = upload_record(client)
    monkeypatch.setattr(main, "detect_language", lambda text: "la")

    response = client.post(
        f"/historical_records/{record_id}/detect-language",
    )

    assert response.status_code == 200
    assert response.json()["detected_language"] == "la"
    assert (
        client.get(f"/historical_records/{record_id}").json()["detected_language"]
        == "la"
    )


def test_update_record_saves_texts_without_touching_other_fields(
    client: TestClient,
) -> None:
    record_id = upload_record(client)

    response = client.put(
        f"/historical_records/{record_id}",
        json={"extracted_text": "edited transcription"},
    )

    assert response.status_code == 200
    assert response.json()["extracted_text"] == "edited transcription"
    assert response.json()["name"] == "record.png"

    response = client.put(
        f"/historical_records/{record_id}",
        json={"translated_text": "edited translation"},
    )
    record = client.get(f"/historical_records/{record_id}").json()

    assert response.status_code == 200
    assert record["extracted_text"] == "edited transcription"
    assert record["translated_text"] == "edited translation"


def test_update_record_can_rename_and_clear_text(client: TestClient) -> None:
    record_id = upload_record(client)
    client.put(f"/historical_records/{record_id}", json={"extracted_text": "x"})

    response = client.put(
        f"/historical_records/{record_id}",
        json={"name": "renamed.png", "extracted_text": ""},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "renamed.png"
    assert response.json()["extracted_text"] == ""


def test_update_record_rejects_empty_name(client: TestClient) -> None:
    record_id = upload_record(client)

    response = client.put(f"/historical_records/{record_id}", json={"name": ""})

    assert response.status_code == 422


def test_update_missing_record_returns_404(client: TestClient) -> None:
    response = client.put("/historical_records/missing", json={"name": "a.png"})

    assert response.status_code == 404
