data.json.lzo.64: data.json.lzo
	openssl base64 < data.json.lzo | tr -d '\n' > data.json.lzo.64

data.json.lzo: data.json compress/compress
	compress/compress data.json data.json.lzo

data.json:
	python gendata.py

compress/compress:
	$(MAKE) -C compress

clean:
	$(MAKE) -C compress clean
	rm -f data.*
