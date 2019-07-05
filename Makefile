.POSIX:
.SUFFIXES:
.PHONY: all clean

all: data.string.json
all: data.bits.bin
all: data.age.bin
all: data.block.bin
all: data.gc.bin
all: data.mpy.bin
all: data.name.bin

data.string.json: data.json
data.bits.bin: data.json
data.age.bin: data.json
data.block.bin: data.json
data.gc.bin: data.json
data.mpy.bin: data.json
data.name.bin: data.json

data.json: data/UnicodeData.txt
	./gendata.py

clean:
	rm -f data.json data.string.json data.*.bin
