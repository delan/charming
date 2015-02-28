data.json.lzo.64: data.json.lzo
	base64 -w 0 data.json.lzo > data.json.lzo.64

data.json.lzo: data.json comp/comp
	comp/comp data.json data.json.lzo

data.json:
	python gendata.py

comp/comp:
	$(MAKE) -C comp

clean:
	$(MAKE) -C comp clean
	rm -f data.*
