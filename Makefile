data.json.lzo.64: data.json.lzo
	openssl base64 < data.string.json.lzo | tr -d '\n' > data.string.json.lzo.64
	openssl base64 < data.name.json.lzo | tr -d '\n' > data.name.json.lzo.64
	openssl base64 < data.gc.json.lzo | tr -d '\n' > data.gc.json.lzo.64
	openssl base64 < data.block.json.lzo | tr -d '\n' > data.block.json.lzo.64
	openssl base64 < data.age.json.lzo | tr -d '\n' > data.age.json.lzo.64
	openssl base64 < data.mpy.json.lzo | tr -d '\n' > data.mpy.json.lzo.64
	openssl base64 < data.bits.json.lzo | tr -d '\n' > data.bits.json.lzo.64

data.json.lzo: data.json compress/compress
	compress/compress data.string.json data.string.json.lzo
	compress/compress data.name.json data.name.json.lzo
	compress/compress data.gc.json data.gc.json.lzo
	compress/compress data.block.json data.block.json.lzo
	compress/compress data.age.json data.age.json.lzo
	compress/compress data.mpy.json data.mpy.json.lzo
	compress/compress data.bits.json data.bits.json.lzo

data.json: data/UnicodeData.txt
	python gendata.py

compress/compress:
	$(MAKE) -C compress

clean:
	$(MAKE) -C compress clean
	rm -f data.*
