import json

import tornado.ioloop
import tornado.web
from tornado_cors import CorsMixin

import sys
import os.path

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db_management import db_insert_data
from db_management.db import create_database


class MainHandler(CorsMixin, tornado.web.RequestHandler):

    # Value for the Access-Control-Allow-Origin header.
    # Default: None (no header).
    CORS_ORIGIN = '*'

    # Value for the Access-Control-Allow-Headers header.
    # Default: None (no header).
    CORS_HEADERS = 'Content-Type'

    # Value for the Access-Control-Allow-Methods header.
    # Default: Methods defined in handler class.
    # None means no header.
    CORS_METHODS = 'POST'

    # Value for the Access-Control-Allow-Credentials header.
    # Default: None (no header).
    # None means no header.
    CORS_CREDENTIALS = True

    # Value for the Access-Control-Max-Age header.
    # Default: 86400.
    # None means no header.
    CORS_MAX_AGE = 21600

    # Value for the Access-Control-Expose-Headers header.
    # Default: None
    CORS_EXPOSE_HEADERS = 'Location, X-WP-TotalPages'

    def data_received(self, chunk):
        pass

    def get(self):
        self.write("Server online!")
    
    def post(self):
        body_raw = self.request.body
        learning_data = {}

        try:
            learning_data = json.loads(body_raw)
        except ValueError, e:
            print e.message
            self.write("{\"status\":\"error\", \"message\":\"JSON format not correct!\"}")
            self.set_status(400)
            pass

        username = learning_data["username"]
        records = learning_data["records"]
        reply = db_insert_data.insert_player_complete_data(username, records)
        self.write(reply)

application = tornado.web.Application([
    (r"/saveLearningData", MainHandler),
])

if __name__ == "__main__":
    create_database()
    application.listen(8080)
    tornado.ioloop.IOLoop.current().start()
