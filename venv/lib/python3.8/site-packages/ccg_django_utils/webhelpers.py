#!/usr/bin/env python

"""Some web helpers taken from the Pylons camp"""

import os
from django.conf import settings

# SCRIPT_NAME is searched for legacy reasons, typically header will be
# HTTP_SCRIPT_NAME and make its way to environ via the wsgi script
if 'SCRIPT_NAME' in os.environ:
    wsgibasepath = os.environ['SCRIPT_NAME']
elif 'HTTP_SCRIPT_NAME' in os.environ:
    wsgibasepath = os.environ['HTTP_SCRIPT_NAME']
else:
    wsgibasepath=''

def wsgibase():
        return wsgibasepath

def url( relpath ):
        if len(wsgibasepath):
            if relpath and relpath[0]=='/':
                    return "%s%s"%(wsgibasepath,relpath)
            else:
                    return "%s/%s"%(wsgibasepath,relpath)
        return relpath

def deie( html ):
        """try to de - internet explorer - ify the html snippet"""
        if html=="":
                return "&nbsp;"
        return html

def siteurl(request):
    d = request.__dict__
    u = ''
    if 'HTTP_X_FORWARDED_HOST' in d['META']:
        #The request has come from outside, so respect X_FORWARDED_HOST
        u = d['META']['wsgi.url_scheme'] + '://' + d['META']['HTTP_X_FORWARDED_HOST'] + wsgibase() + '/'
    else:
        #Otherwise, its an internal request
        host = d['META'].get('HTTP_HOST')
        if not host:
            host = d['META'].get('SERVER_NAME')
             
        u = d['META']['wsgi.url_scheme'] + '://' + host + wsgibase() + '/' 
    return u
        
