from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status

from app.models import (
    Credential,
    CredentialStatus,
    DynamicQr,
    Incident,
    KycApplication,
    KycApplicationCreate,
    KycReviewCreate,
    KycStatus,
    SosCreate,
    Tourist,
    TouristCreate,
    VerificationCreate,
    VerificationResult,
)
from app.repository import MvpRepository, NotFoundError
from app.security import ExpiredQrTokenError, QrTokenError, QrTokenSigner
from app.time import utc_now


class TouristSafetyService:
    def __init__(self, repository: MvpRepository, signer: QrTokenSigner) -> None:
        self._repository = repository
        self._signer = signer

    def create_tourist(self, payload: TouristCreate) -> Tourist:
        return self._repository.create_tourist(payload)

    def submit_kyc(
        self, tourist_id: UUID, payload: KycApplicationCreate
    ) -> KycApplication:
        self._get_tourist(tourist_id)
        return self._repository.create_kyc_application(tourist_id, payload)

    def review_kyc(
        self, application_id: UUID, authority_id: UUID, payload: KycReviewCreate
    ) -> KycApplication:
        application = self._get_kyc_application(application_id)
        review_status = KycStatus.APPROVED if payload.approved else KycStatus.REJECTED
        try:
            return self._repository.review_kyc_application(
                application.id,
                status=review_status,
                authority_id=authority_id,
                reason=payload.reason,
            )
        except ValueError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    def issue_credential(self, tourist_id: UUID) -> Credential:
        self._get_tourist(tourist_id)
        if not self._repository.has_approved_kyc(tourist_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="an approved KYC application is required before issuing a credential",
            )
        return self._repository.create_credential(tourist_id)

    def create_dynamic_qr(self, tourist_id: UUID, credential_id: UUID) -> DynamicQr:
        credential = self._get_credential(credential_id)
        self._require_owner(credential.tourist_id, tourist_id, "credential")
        if credential.status is not CredentialStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="credential is not active",
            )
        token, expires_at = self._signer.issue(credential.id)
        return DynamicQr(credential_id=credential.id, token=token, expires_at=expires_at)

    def verify_qr(
        self, partner_id: UUID, payload: VerificationCreate
    ) -> VerificationResult:
        try:
            credential_id = self._signer.verify(payload.qr_token)
        except ExpiredQrTokenError as error:
            raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(error)) from error
        except QrTokenError as error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

        credential = self._get_credential(credential_id)
        is_valid = credential.status is CredentialStatus.ACTIVE
        verified_at = utc_now()
        audit_id = self._repository.add_verification_audit(
            partner_id=partner_id,
            credential_id=credential.id,
            purpose=payload.purpose,
            valid=is_valid,
            verified_at=verified_at,
        )
        return VerificationResult(
            audit_id=audit_id,
            credential_id=credential.id,
            valid=is_valid,
            credential_status=credential.status,
            verified_at=verified_at,
        )

    def create_sos(self, tourist_id: UUID, payload: SosCreate) -> Incident:
        self._get_tourist(tourist_id)
        return self._repository.create_incident(tourist_id, payload)

    def get_incident(self, tourist_id: UUID, incident_id: UUID) -> Incident:
        incident = self._get_incident(incident_id)
        self._require_owner(incident.tourist_id, tourist_id, "incident")
        return incident

    def _get_tourist(self, tourist_id: UUID) -> Tourist:
        try:
            return self._repository.get_tourist(tourist_id)
        except NotFoundError as error:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    def _get_kyc_application(self, application_id: UUID) -> KycApplication:
        try:
            return self._repository.get_kyc_application(application_id)
        except NotFoundError as error:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    def _get_credential(self, credential_id: UUID) -> Credential:
        try:
            return self._repository.get_credential(credential_id)
        except NotFoundError as error:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    def _get_incident(self, incident_id: UUID) -> Incident:
        try:
            return self._repository.get_incident(incident_id)
        except NotFoundError as error:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    @staticmethod
    def _require_owner(resource_owner_id: UUID, caller_id: UUID, resource_name: str) -> None:
        if resource_owner_id != caller_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"caller does not own this {resource_name}",
            )
