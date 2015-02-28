minidir = minilzo-2.09

comp: comp.o minilzo.o

comp.o: comp.c minilzo.o

minilzo.o: lzoconf.h lzodefs.h minilzo.c minilzo.h
	$(CC) -c minilzo.c -o minilzo.o

lzoconf.h:
	cp $(minidir)/lzoconf.h .

lzodefs.h:
	cp $(minidir)/lzodefs.h .

minilzo.c:
	cp $(minidir)/minilzo.c .

minilzo.h:
	cp $(minidir)/minilzo.h .

clean:
	rm -f comp comp.exe* comp.o minilzo.* lzo*
