from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


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


def test_kyc_qr_verification_and_sos_flow() -> None:
    client = make_client()
    tourist_id = create_tourist(client)
    tourist_headers = {"X-Tourist-Id": tourist_id}

    kyc_response = client.post(
        "/v1/kyc/applications",
        headers=tourist_headers,
        json={
            "document_reference": "s3://secure-bucket/documents/passport.enc",
            "selfie_reference": "s3://secure-bucket/selfies/liveness.enc",
        },
    )
    assert kyc_response.status_code == 201

    blocked_credential = client.post("/v1/credentials", headers=tourist_headers)
    assert blocked_credential.status_code == 409

    review_response = client.post(
        f"/v1/kyc/applications/{kyc_response.json()['id']}/review",
        headers={"X-Authority-Id": str(uuid4())},
        json={"approved": True, "reason": "Verified through approved review process"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"

    credential_response = client.post("/v1/credentials", headers=tourist_headers)
    assert credential_response.status_code == 201
    credential_id = credential_response.json()["id"]

    qr_response = client.post(
        f"/v1/credentials/{credential_id}/qr", headers=tourist_headers
    )
    assert qr_response.status_code == 200

    verification_response = client.post(
        "/v1/verifications",
        headers={"X-Partner-Id": str(uuid4())},
        json={"qr_token": qr_response.json()["token"], "purpose": "hotel check-in"},
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

    kyc_response = client.post(
        "/v1/kyc/applications",
        headers=tourist_headers,
        json={"document_reference": "s3://bucket/passport", "selfie_reference": "s3://bucket/selfie"},
    )
    client.post(
        f"/v1/kyc/applications/{kyc_response.json()['id']}/review",
        headers={"X-Authority-Id": str(uuid4())},
        json={"approved": True, "reason": "Approved for QR token test"},
    )
    credential_id = client.post("/v1/credentials", headers=tourist_headers).json()["id"]
    token = client.post(
        f"/v1/credentials/{credential_id}/qr", headers=tourist_headers
    ).json()["token"]

    response = client.post(
        "/v1/verifications",
        headers={"X-Partner-Id": str(uuid4())},
        json={"qr_token": f"{token}tampered", "purpose": "hotel check-in"},
    )
    assert response.status_code == 400
