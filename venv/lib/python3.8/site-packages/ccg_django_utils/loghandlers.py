import os
import sys
from logging.handlers import TimedRotatingFileHandler


class ParentPathFileHandler(TimedRotatingFileHandler):
    def __init__(self, filename, *args, **kwargs):
        try:
            os.makedirs(os.path.dirname(filename))
        except OSError:
            pass
        TimedRotatingFileHandler.__init__(self, filename, *args, **kwargs)

    def _open(self):
       try:
           return TimedRotatingFileHandler._open(self)
       except IOError as e:
           # If log file can't be opened then don't log to file
           sys.stderr.write("warning: %s\n" % e)
           return open("/dev/null", self.mode)
