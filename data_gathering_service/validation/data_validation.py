import sys
import os.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db_management import db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

if __name__ == '__main__':
    engine = create_engine('sqlite:///database/CyberCraftDB.db')
    db.Base.metadata.bind = engine

    db_session = sessionmaker(bind=engine)
    session = db_session()

    usernames = []
    for instance in session.query(db.User).all():
        usernames.append(instance.username.lower())
    usernames_survey1 = []
    for instance in session.query(db.UserSurvey1).all():
        usernames_survey1.append(instance.username.lower())
    usernames_survey2 = []
    for instance in session.query(db.UserSurvey2).all():
        usernames_survey2.append(instance.username.lower())

    usernames_to_delete = []

    for name in usernames:
        if (name not in usernames_survey1 or name not in usernames_survey2) and name not in usernames_to_delete:
            usernames_to_delete.append(name)

    for name in usernames_survey1:
        if (name not in usernames or name not in usernames_survey2) and name not in usernames_to_delete:
            usernames_to_delete.append(name)

    for name in usernames_survey2:
        if (name not in usernames_survey1 or name not in usernames) and name not in usernames_to_delete:
            usernames_to_delete.append(name)

    print usernames_to_delete
	#delete in table User
    users_to_delete = session.query(db.User).filter(db.User.username.in_(usernames_to_delete)).all()
    for user in users_to_delete:
        session.delete(user)
	#delete in table UserSurvey1
    users_to_delete = session.query(db.UserSurvey1).filter(db.UserSurvey1.username.in_(usernames_to_delete)).all()
    for user in users_to_delete:
        session.delete(user)
	#delete in table UserSurvey2
    users_to_delete = session.query(db.UserSurvey2).filter(db.UserSurvey2.username.in_(usernames_to_delete)).all()
    for user in users_to_delete:
        session.delete(user)
	#don't delete in table score?

    session.commit()
