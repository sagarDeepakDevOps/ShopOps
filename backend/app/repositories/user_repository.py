from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.address import Address
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.is_deleted.is_(False))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id, User.is_deleted.is_(False))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def list_users(self, skip: int = 0, limit: int = 50) -> Sequence[User]:
        stmt = (
            select(User)
            .where(User.is_deleted.is_(False))
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def add_address(self, address: Address) -> Address:
        self.session.add(address)
        await self.session.flush()
        await self.session.refresh(address)
        return address

    async def list_addresses(self, user_id: UUID) -> Sequence[Address]:
        stmt = select(Address).where(Address.user_id == user_id).order_by(Address.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_address(self, user_id: UUID, address_id: UUID) -> Address | None:
        stmt = select(Address).where(Address.id == address_id, Address.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
