db_management: db.py defines the tables in the database. One can use session.query to refer to data there.

username_loader: load the usernames from usernames1.txt and usernames2.txt and add them to the DB in talbe UserServey1 and UserSurvey2 respectively

validation: to delete user data that not have all the three parts (two surveys and one game data) finished.

webService: for setting up the service to accept learning_data sent from the game. and use db_management.db_insert_data to store the learning_data to the db