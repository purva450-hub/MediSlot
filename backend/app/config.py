import os
from datetime import timedelta


class Config:
    APP_ENV = os.environ.get("APP_ENV", "development")
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-only-change-me-too")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "mysql+pymysql://medislot:password@localhost:3306/medislot")
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")]
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    CLINIC_TZ = os.environ.get("CLINIC_TZ", "Asia/Kolkata")
    CANCEL_MIN_HOURS = int(os.environ.get("CANCEL_MIN_HOURS", "2"))
    BOOKING_MIN_LEAD_MINUTES = 30
    RESET_TOKEN_MINUTES = 30
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")


class TestConfig(Config):
    TESTING = True
    APP_ENV = "testing"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    RATELIMIT_ENABLED = False
