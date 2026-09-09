import os
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.security import QrTokenSigner


def make_client() -> TestClient:
    app = create_app(
        settings=Settings(qr_signing_secret="test-signing-secret", qr_ttl_seconds=60)
    )
    return TestClient(app)


def create_tourist(client: TestClient) -> str:
    response = client.post(
        "/v1/tourists", json={"display_name": "Asha Patel", "nationality": "India"}
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_credential_verification_and_sos_flow() -> None:
    client = make_client()
    tourist_id = create_tourist(client)
    tourist_headers = {"X-Tourist-Id": tourist_id}

    credential_response = client.post("/v1/credentials", headers=tourist_headers)
    assert credential_response.status_code == 201
    credential_id = credential_response.json()["id"]

    signer = QrTokenSigner(secret="test-signing-secret", ttl_seconds=60)
    token, _ = signer.issue(UUID(credential_id))

    verification_response = client.post(
        "/v1/verifications",
        headers={"X-Partner-Id": str(uuid4())},
        json={"qr_token": token, "purpose": "hotel check-in"},
    )
    assert verification_response.status_code == 200
    assert verification_response.json()["valid"] is True

    sos_response = client.post(
        "/v1/incidents/sos",
        headers=tourist_headers,
        json={
            "location": {"latitude": 28.6139, "longitude": 77.209},
            "message": "I need medical help.",
        },
    )
    assert sos_response.status_code == 201
    assert sos_response.json()["status"] == "open"


def test_qr_token_cannot_be_verified_after_tampering() -> None:
    client = make_client()
    tourist_id = create_tourist(client)
    tourist_headers = {"X-Tourist-Id": tourist_id}

    credential_id = client.post("/v1/credentials", headers=tourist_headers).json()["id"]
    signer = QrTokenSigner(secret="test-signing-secret", ttl_seconds=60)
    token, _ = signer.issue(UUID(credential_id))

    response = client.post(
        "/v1/verifications",
        headers={"X-Partner-Id": str(uuid4())},
        json={"qr_token": f"{token}tampered", "purpose": "hotel check-in"},
    )
    assert response.status_code == 400


def test_multilingual_assistant_and_aws_configuration_boundary() -> None:
    client = make_client()

    assistant_response = client.post(
        "/v1/integrations/assistant/messages",
        json={"message": "मुझे मदद चाहिए"},
    )
    assert assistant_response.status_code == 200
    assert assistant_response.json()["language"] == "hi"

    liveness_response = client.post("/v1/integrations/kyc/liveness-sessions")
    if os.getenv("REKOGNITION_ENABLED", "false").lower() == "true":
        assert liveness_response.status_code == 200
        assert "session_id" in liveness_response.json()
    else:
        assert liveness_response.status_code == 503
