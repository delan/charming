.POSIX:
.SUFFIXES:
.SUFFIXES: .json .lzo .64
.PHONY: all clean

all: data.string.64
all: data.bits.64
all: data.age.64
all: data.block.64
all: data.gc.64
all: data.mpy.64
all: data.name.64

.lzo.64:
	< $< openssl base64 | tr -d \\n > $@

.json.lzo:
	compress/compress $< $@

data.string.json: data.json
data.bits.json: data.json
data.age.json: data.json
data.block.json: data.json
data.gc.json: data.json
data.mpy.json: data.json
data.name.json: data.json

data.json: data/UnicodeData.txt compress/compress
	python gendata.py

compress/compress:
	$(MAKE) -C compress

clean:
	$(MAKE) -C compress clean
	rm -f data.json data.*.json data.*.lzo data.*.64
