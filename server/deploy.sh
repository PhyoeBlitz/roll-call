#!/bin/sh

if [ -z "$1" ]; then
  echo "Usage: sh deploy.sh <version>"
  exit 1
fi

VERSION="$1"

docker build -t phyoe085/roll-call-server:$VERSION .
docker push phyoe085/roll-call-server:$VERSION
docker tag phyoe085/roll-call-server:$VERSION phyoe085/roll-call-server:latest
docker push phyoe085/roll-call-server:latest