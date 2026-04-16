from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AddressBase(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    line1: str = Field(min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=1, max_length=120)
    postal_code: str = Field(min_length=1, max_length=20)
    note: str | None = Field(default=None, max_length=1000)


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=100)
    line1: str | None = Field(default=None, min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    state: str | None = Field(default=None, min_length=1, max_length=120)
    country: str | None = Field(default=None, min_length=1, max_length=120)
    postal_code: str | None = Field(default=None, min_length=1, max_length=20)
    note: str | None = Field(default=None, max_length=1000)


class AddressRead(AddressBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
