#!/bin/sh
# usage: ( cd data; ./update.sh )
set -eu

unicode_ver=16.0.0
emoji_ver=16.0

for i in \
    Blocks.txt \
    DerivedAge.txt \
    HangulSyllableType.txt \
    Jamo.txt \
    NameAliases.txt \
    NamedSequences.txt \
    PropertyValueAliases.txt \
    UnicodeData.txt \
    auxiliary/GraphemeBreakProperty.txt \
    auxiliary/GraphemeBreakTest.txt \
    emoji/emoji-data.txt \
    Unihan.zip \
; do
    echo $i
    curl -fsO https://www.unicode.org/Public/${unicode_ver}/ucd/$i
done
echo "emoji-text.txt (this may take a while)"
curl -fO https://www.unicode.org/Public/emoji/${emoji_ver}/emoji-test.txt
unzip -o Unihan.zip Unihan_Readings.txt
rm Unihan.zip
