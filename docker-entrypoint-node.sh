#!/bin/bash

case "$1" in
    build)
        yarn install
        yarn build
        ;;
    *)
        exec "$@"
        ;;
esac