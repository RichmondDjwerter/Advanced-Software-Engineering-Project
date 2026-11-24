from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class HistoricalRecord(Base):
    __tablename__ = "historical_records"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    extracted_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    translated_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    line_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_width: Mapped[int | None] = mapped_column(nullable=True)
    image_height: Mapped[int | None] = mapped_column(nullable=True)
    detected_language: Mapped[str | None] = mapped_column(String(16), nullable=True)
    transcription_revision: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )

    # chat messages of the record, oldest first
    chat_messages: Mapped[list[ChatMessage]] = relationship(
        back_populates="historical_record",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )
    transcription_history: Mapped[list[TranscriptionSnapshot]] = relationship(
        back_populates="historical_record",
        cascade="all, delete-orphan",
        order_by="TranscriptionSnapshot.revision",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    # ondelete="CASCADE" ensures that the messages are deleted with the corresponding record
    historical_record_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("historical_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[str] = mapped_column(String(16), nullable=False)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Only messages tied to the current source revision are sent as model context.
    source_revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    historical_record: Mapped[HistoricalRecord] = relationship(
        back_populates="chat_messages",
    )


class TranscriptionSnapshot(Base):
    __tablename__ = "transcription_history"
    __table_args__ = (
        UniqueConstraint(
            "historical_record_id", "revision", name="uq_transcription_revision"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    historical_record_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("historical_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    translated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    line_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    historical_record: Mapped[HistoricalRecord] = relationship(
        back_populates="transcription_history",
    )