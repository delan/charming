#!/bin/sh
set -eu

cd helper

. .venv/bin/activate

set -x
# exec nanoemoji --helpfull
# twemoji-13.1.1/assets/svg/1f496.svg
[ -f build/Font.ttf ] \
    || find $1 -name '*.svg' -print0 \
    | >&2 xargs -0xs 262144 -n 999999999 nanoemoji --color_format cff_colr_0
