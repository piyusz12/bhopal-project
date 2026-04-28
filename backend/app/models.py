from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from .database import Base

class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(120), index=True)
    domain = Column(String(50), index=True)
    user_message = Column(Text)
    response = Column(Text)
    intent = Column(String(50))
    sentiment = Column(String(50))
    sentiment_score = Column(Float)
    language = Column(String(50))
    requires_escalation = Column(Boolean)
