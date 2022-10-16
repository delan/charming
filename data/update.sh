#!/bin/sh
# usage: ( cd data; ./update.sh 15.0.0 )
set -eu

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
    Unihan.zip \
; do
    echo $i
    curl -fsSO https://www.unicode.org/Public/15.0.0/ucd/$i
done
unzip -o Unihan.zip Unihan_Readings.txt
rm Unihan.zip
