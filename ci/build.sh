#!/bin/sh

npm install
make init
make init-nixos
make assets
npm run build
