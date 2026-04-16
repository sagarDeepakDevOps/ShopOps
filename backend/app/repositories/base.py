from collections.abc import Sequence
from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, session: AsyncSession, model: type[ModelType]) -> None:
        self.session = session
        self.model = model

    async def get(self, entity_id: UUID) -> ModelType | None:
        return await self.session.get(self.model, entity_id)

    async def list(self, stmt: Select[tuple[ModelType]] | None = None) -> Sequence[ModelType]:
        query = stmt or select(self.model)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def add(self, entity: ModelType) -> ModelType:
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity
