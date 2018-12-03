from sqlalchemy import Column, ForeignKey, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import create_engine
import sys
import os.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

Base = declarative_base()


class User(Base):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    username = Column(String(250), nullable=False)


class UserSurvey1(Base):
    __tablename__ = 'userSurvey1'
    id = Column(Integer, primary_key=True)
    username = Column(String(250), nullable=False)


class UserSurvey2(Base):
    __tablename__ = 'userSurvey2'
    id = Column(Integer, primary_key=True)
    username = Column(String(250), nullable=False)


class Record(Base):
    __tablename__ = 'record'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'))
    index = Column(Integer, nullable=False)
    assetsCompromised = Column(Integer, nullable=False)
    endingRound = Column(Integer, nullable=False)
    role = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
 
    user = relationship(User)


class LogEntry(Base):
    __tablename__ = 'logentry'
    id = Column(Integer, primary_key=True)
    record_id = Column(Integer, ForeignKey('record.id'))
    round = Column(Integer, nullable=False)
    act = Column(String(25), nullable=False)
    noBuffHurdle = Column(String(250), nullable=False)
    buffHurdle = Column(String(250), nullable=False)
    unlucky = Column(Boolean, nullable=False)
    success = Column(Boolean, nullable=False)
	
    record = relationship(Record)


def create_database():
    engine = create_engine('sqlite:///database/CyberCraftDB.db')
    Base.metadata.create_all(engine)
