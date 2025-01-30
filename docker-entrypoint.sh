#!/bin/bash
set -e

# Build release tarball
releasetarball() {
    mkdir -p /data/dist
    cd /app/rdrf
    tar czf /data/dist/rdrf.tar.gz .
}

case "$1" in
    releasetarball)
        releasetarball
        ;;
    *)
        exec "$@"
        ;;
esac