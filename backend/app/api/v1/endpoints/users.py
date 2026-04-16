from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import AddressCreate, AddressRead, AddressUpdate, UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_profile(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_profile(payload: UserUpdate, db: DbSession, current_user: CurrentUser) -> UserRead:
    service = UserService(db)
    user = await service.update_profile(current_user, payload)
    return UserRead.model_validate(user)


@router.get("/me/addresses", response_model=list[AddressRead])
async def list_addresses(db: DbSession, current_user: CurrentUser) -> list[AddressRead]:
    service = UserService(db)
    addresses = await service.list_addresses(UUID(str(current_user.id)))
    return [AddressRead.model_validate(address) for address in addresses]


@router.post("/me/addresses", response_model=AddressRead, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressCreate, db: DbSession, current_user: CurrentUser
) -> AddressRead:
    service = UserService(db)
    address = await service.add_address(UUID(str(current_user.id)), payload)
    return AddressRead.model_validate(address)


@router.patch("/me/addresses/{address_id}", response_model=AddressRead)
async def update_address(
    address_id: UUID,
    payload: AddressUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> AddressRead:
    service = UserService(db)
    address = await service.update_address(UUID(str(current_user.id)), address_id, payload)
    return AddressRead.model_validate(address)


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(address_id: UUID, db: DbSession, current_user: CurrentUser) -> None:
    service = UserService(db)
    await service.delete_address(UUID(str(current_user.id)), address_id)
