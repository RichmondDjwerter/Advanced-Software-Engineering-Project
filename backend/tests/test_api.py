from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import chat_mock


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


def test_upload_image_creates_historical_record(
    client: TestClient, tmp_path: Path
) -> None:
    response = client.post(
        "/historical_records",
        files={"image": ("record.png", b"image data", "image/png")},
    )

    assert response.status_code == 200
    record = response.json()
    assert record["name"] == "record.png"
    assert record["description"] == ""
    assert record["id"]
    assert record["created_at"]
    assert record["updated_at"]
    assert (tmp_path / f"{record['id']}.png").read_bytes() == b"image data"


def test_upload_non_image_returns_415(client: TestClient) -> None:
    response = client.post(
        "/historical_records",
        files={"image": ("record.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json() == {
        "detail": "Invalid file type. Only image files are allowed."
    }


@pytest.fixture(autouse=True)
def no_mock_delay(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(chat_mock, "REPLY_DELAY_SECONDS", 0)


def create_record(client: TestClient) -> str:
    response = client.post(
        "/historical_records",
        files={"image": ("record.png", b"image data", "image/png")},
    )
    return response.json()["id"]


def test_chat_returns_user_message_and_mocked_reply(client: TestClient) -> None:
    record_id = create_record(client)

    response = client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "Who wrote this letter?"},
    )

    assert response.status_code == 201
    user_message, assistant_message = response.json()
    assert user_message["role"] == "user"
    assert user_message["content"] == "Who wrote this letter?"
    assert assistant_message["role"] == "assistant"
    assert (
        assistant_message["content"]
        == chat_mock.MOCK_RESPONSES["who wrote this letter?"]
    )
    assert assistant_message["historical_record_id"] == record_id


def test_chat_unknown_question_returns_default_reply(client: TestClient) -> None:
    record_id = create_record(client)

    response = client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "What is the meaning of life?"},
    )

    assert response.status_code == 201
    assert response.json()[1]["content"] == chat_mock.DEFAULT_RESPONSE


def test_chat_history_contains_both_messages(client: TestClient) -> None:
    record_id = create_record(client)
    client.post(
        f"/historical_records/{record_id}/chat",
        json={"content": "When was this letter written?"},
    )

    response = client.get(f"/historical_records/{record_id}/chat")

    assert response.status_code == 200
    assert [m["role"] for m in response.json()] == ["user", "assistant"]


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
