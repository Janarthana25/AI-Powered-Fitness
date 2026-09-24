"""
SQLAlchemy ORM models for the database.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """
    Users table — stores all registered user accounts.
    Passwords are NEVER stored in plain text; only bcrypt hashes.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    otp = Column(String(10), nullable=True)          # Temporary OTP for password reset
    otp_expiry = Column(DateTime, nullable=True)      # OTP expiration timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # One-to-one relationship with profile (lazy loaded)
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    # One-to-many relationship with progress entries
    progress_entries = relationship("Progress", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    """
    User profile table — stores fitness-specific details.
    One row per user; linked via user_id FK.

    Fields:
      age                : integer, years
      gender             : Male | Female | Other | Prefer not to say
      height_cm          : float, centimetres
      weight_kg          : float, kilograms
      fitness_goal       : Weight Loss | Muscle Gain | Endurance | Flexibility | General Fitness
      experience_level   : Beginner | Intermediate | Advanced
      medical_conditions : free-text (optional)
      preferred_language : Tamil | English | Hindi | …
    """
    __tablename__ = "user_profiles"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, unique=True, index=True)

    age                = Column(Integer,      nullable=True)
    gender             = Column(String(30),   nullable=True)
    height_cm          = Column(Float,        nullable=True)
    weight_kg          = Column(Float,        nullable=True)
    fitness_goal       = Column(String(60),   nullable=True)
    experience_level   = Column(String(30),   nullable=True)
    medical_conditions = Column(String(500),  nullable=True)
    preferred_language = Column(String(30),   nullable=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(),
                         onupdate=func.now())

    # Back-reference to User
    user = relationship("User", back_populates="profile")


class Progress(Base):
    """
    Progress tracking table — one row per daily log entry per user.

    Fields:
      weight_kg        : measured body weight (optional)
      water_intake_L   : water consumed in litres
      calories_consumed: total calories eaten that day
      sleep_hours      : hours slept
      workout_completed: whether a workout was done (0/1 stored as Integer)
      notes            : free-text observations (optional, max 500 chars)
      created_at       : UTC timestamp of the log entry
    """
    __tablename__ = "progress"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                               nullable=False, index=True)

    weight_kg        = Column(Float,        nullable=True)
    water_intake_L   = Column(Float,        nullable=True)
    calories_consumed= Column(Integer,      nullable=True)
    sleep_hours      = Column(Float,        nullable=True)
    workout_completed= Column(Integer,      nullable=False, default=0)   # 0 or 1
    notes            = Column(String(500),  nullable=True)
    created_at       = Column(DateTime(timezone=False), server_default=func.now())

    user = relationship("User", back_populates="progress_entries")
