class Loader:
#read the usernames from the file as specified, and append to self.username_list
    def __init__(self, filein):
        self.username_list = []
        self.filein = filein

    def parse_usernames(self):
        with open(self.filein, "r") as file_input:
            lines = file_input.read().splitlines()
            for line in lines:
                self.username_list.append(line)
