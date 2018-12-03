from UsernamesLoader import Loader
from usernames_insertion import insert_usernames

if __name__ == '__main__':
	#read usernames from the file to loader_servey1.username_list
    loader_survey1 = Loader("username_loader/username1.txt")
    loader_survey1.parse_usernames()
    assert (len(loader_survey1.username_list) != 0), "Survey 1 list is empty!"
	#add username list to the DB
    retval = insert_usernames("UserSurvey1", loader_survey1.username_list)
    assert retval, "Error in inserting survey 1 usernames into the DB"

    loader_survey2 = Loader("username_loader/username2.txt")
    loader_survey2.parse_usernames()
    assert (len(loader_survey2.username_list) != 0), "Survey 2 list is empty!"
    retval = insert_usernames("UserSurvey2", loader_survey2.username_list)
    assert retval, "Error in inserting survey 2 usernames into the DB"
