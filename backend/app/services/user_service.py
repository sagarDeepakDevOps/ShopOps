from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.address import Address
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import AddressCreate, AddressUpdate, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = UserRepository(session)

    async def update_profile(self, user: User, payload: UserUpdate) -> User:
        if payload.full_name is not None:
            user.full_name = payload.full_name
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def add_address(self, user_id: UUID, payload: AddressCreate) -> Address:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        address = Address(user_id=user_id, **payload.model_dump())
        await self.repo.add_address(address)
        await self.session.commit()
        return address

    async def update_address(
        self, user_id: UUID, address_id: UUID, payload: AddressUpdate
    ) -> Address:
        address = await self.repo.get_address(user_id, address_id)
        if not address:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(address, field, value)

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(address)
        return address

    async def list_addresses(self, user_id: UUID) -> list[Address]:
        return list(await self.repo.list_addresses(user_id))

    async def delete_address(self, user_id: UUID, address_id: UUID) -> None:
        address = await self.repo.get_address(user_id, address_id)
        if not address:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

        await self.session.delete(address)
        await self.session.commit()

    async def deactivate_user(self, user: User) -> User:
        user.is_active = False
        user.soft_delete(datetime.now(UTC))
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return user
