from pathlib import Path

from fastapi.testclient import TestClient


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


def test_chat_echoes_message(client: TestClient) -> None:
    response = client.post(
        "/historical_records/record-id/chat",
        json={"message": "Read this manuscript"},
    )

    assert response.status_code == 200
    assert response.json() == {"response": "ECHO: Read this manuscript"}
