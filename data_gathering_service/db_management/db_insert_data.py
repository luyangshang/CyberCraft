from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import db


def insert_player_complete_data(username=None, records=None):
    engine = create_engine('sqlite:///database/CyberCraftDB.db')
    db.Base.metadata.bind = engine

    db_session = sessionmaker(bind=engine)
    session = db_session()

    if session.query(db.User).filter(db.User.username == username).first() is not None:
        print "Player " + username + " tried to upload data more than once"
        return "{\"status\":\"error\", \"message\":\"You have already uploaded your data! " \
               "Link to the post-game survey: https://goo.gl/forms/RMx7oVoxsnIZpRRb2\"}"
    else:
        new_user = db.User(username=username)
        session.add(new_user)

    for record in records:
		newRecord = db.Record(	index = record["index"],
								assetsCompromised = record["AC"],
								endingRound = record["ER"],
								role = record["role"],
								score = record["score"])
		session.add(newRecord)
		
		for log in record["logs"]:
			newLog = db.LogEntry(round = log["round"],
							act = log["act"],
							noBuffHurdle = log["noBuffHurdle"],
							buffHurdle = log["buffHurdle"],
							unlucky = log["unlucky"],
							success = log["success"]
							)
			session.add(newLog)	
    session.commit()

    return "{\"status\":\"ok\", " \
           "\"message\":\"Data uploaded successfully! Link to the post-game survey: https://goo.gl/forms/RMx7oVoxsnIZpRRb2\"}"
