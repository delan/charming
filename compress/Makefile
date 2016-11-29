minilzo = minilzo-2.09

compress: compress.o minilzo.o
	$(CC) -o compress compress.o minilzo.o

compress.o: compress.c minilzo.h lzodefs.h lzoconf.h
	$(CC) -o compress.o -c compress.c

minilzo.o: minilzo.c minilzo.h lzodefs.h lzoconf.h
	$(CC) -o minilzo.o -c minilzo.c

minilzo.c: $(minilzo)/minilzo.c
	cp $(minilzo)/minilzo.c .

minilzo.h: $(minilzo)/minilzo.h
	cp $(minilzo)/minilzo.h .

lzodefs.h: $(minilzo)/lzodefs.h
	cp $(minilzo)/lzodefs.h .

lzoconf.h: $(minilzo)/lzoconf.h
	cp $(minilzo)/lzoconf.h .

clean:
	rm -f compress compress.exe compress.o
	rm -f minilzo.o minilzo.c minilzo.h
	rm -f lzodefs.h lzoconf.h
