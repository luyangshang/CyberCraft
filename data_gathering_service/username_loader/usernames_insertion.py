from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db_management import db

#add the usernames from usernames_list to database table table_object
def insert_usernames(table_object, usernames_list):
    try:
        engine = create_engine('sqlite:///database/CyberCraftDB.db')
        db.Base.metadata.bind = engine
        db.Base.metadata.create_all()

        db_session = sessionmaker(bind=engine)
        session = db_session()

		#if table is filled with data, delete everything
        if session.query(getattr(db, table_object)).count() != 0:
            session.execute('delete from ' + table_object + ';')

        for username in usernames_list:
            user = getattr(db, table_object)(username=username)
            session.add(user)

        session.commit()
        return True
    except RuntimeError:
        return False
