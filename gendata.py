import re
import gzip
from json import dumps
from operator import itemgetter

BITS = {
	"kDefinition exists": 0x01,
	"Emoji_Presentation": 0x02,
	"General_Category Zs": 0x04,
}

data = []
gencat = {}

def pretty_gencat(gc):
	return gencat[gc] + ' (' + gc + ')'

print 'Processing PropertyValueAliases.txt ...'

for l in open('data/PropertyValueAliases.txt'):
	l = l.rstrip('\r\n')
	m = re.match('gc *; *([^ ]+) *; *([^ ]+)', l)
	if m is None:
		continue
	gencat[m.group(1)] = m.group(2).replace('_', ' ')

print 'Initialising data structure ...'

for i in range(0x110000):
	data.append({"bits": 0x00})

print 'Processing UnicodeData.txt ...'

for l in open('data/UnicodeData.txt'):
	l = l.rstrip('\r\n')
	f = l.split(';')
	cp = int(f[0], 16)
	data[cp]['name'] = f[1]
	data[cp]['gc'] = pretty_gencat(f[2])
	if f[2] == "Zs":
		data[cp]["bits"] |= BITS["General_Category Zs"]

print 'Processing Blocks.txt ...'

for l in open('data/Blocks.txt'):
	if l[0] not in '0123456789ABCDEF':
		continue
	l = l.rstrip('\r\n')
	m = re.match('([0-9A-F]+)\.\.([0-9A-F]+); (.+)', l)
	start = int(m.group(1), 16)
	end = int(m.group(2), 16)
	for i in range(start, end + 1):
		data[i]['block'] = m.group(3)

print 'Processing DerivedAge.txt ...'

for l in open('data/DerivedAge.txt'):
	if l[0] not in '0123456789ABCDEF':
		continue
	l = l.rstrip('\r\n')
	m = re.match('([0-9A-F]+)\.\.([0-9A-F]+)\s*;\s*([^ ]+)', l)
	if m:
		start = int(m.group(1), 16)
		end = int(m.group(2), 16)
		version = m.group(3)
	else:
		m = re.match('([0-9A-F]+)\s*;\s*([^ ]+)', l)
		start = int(m.group(1), 16)
		end = start
		version = m.group(2)
	for i in range(start, end + 1):
		data[i]['age'] = 'Unicode ' + version

print 'Processing NameAliases.txt ...'

for l in open('data/NameAliases.txt'):
	if l[0] not in '0123456789ABCDEF':
		continue
	l = l.rstrip('\r\n')
	f = l.split(';')
	cp = int(f[0], 16)
	if f[2] in ['control', 'correction']:
		data[cp]['name'] = f[1]

print 'Processing Unihan_Readings.txt ...'

for l in open('data/Unihan_Readings.txt'):
	l = l.rstrip('\r\n')
	m = re.match('U\+([0-9A-F]+)\t(kMandarin|kDefinition)\t(.+)', l)
	if m is None:
		continue
	cp = int(m.group(1), 16)
	if m.group(2) == 'kMandarin':
		data[cp]['mpy'] = m.group(3)
	elif m.group(2) == 'kDefinition':
		data[cp]['name'] = m.group(3)
		data[cp]['bits'] |= BITS["kDefinition exists"]

print 'Processing emoji-data.txt ...'

for l in open('data/emoji-data.txt'):
	if l[0] not in '0123456789ABCDEF':
		continue
	l = l.rstrip('\r\n')
	m = re.match('([0-9A-F]+)\.\.([0-9A-F]+)\s*;\s*([^ ]+)', l)
	if m:
		start = int(m.group(1), 16)
		end = int(m.group(2), 16)
		property = m.group(3)
	else:
		m = re.match('([0-9A-F]+)\s*;\s*([^ ]+)', l)
		start = int(m.group(1), 16)
		end = start
		property = m.group(2)
	for i in range(start, end + 1):
		if property == "Emoji_Presentation":
			data[i]["bits"] |= BITS[property]

with open("data.string.json", "w") as file:
	print "Writing data.string.json ..."
	hash = {}
	def see(string):
		hash[string] = hash.get(string, 0) + 1
	for key in ("name","gc","block","age","mpy",):
		for cp in xrange(len(data)):
			value = data[cp].get(key)
			if value is not None:
				see(value)
	blob = []
	sort = hash.items()
	sort = sorted(sort, key=itemgetter(0))
	sort = sorted(sort, key=itemgetter(1), reverse=True)
	for string in map(itemgetter(0), sort):
		hash[string] = len(blob)
		blob.append(string)
	def use(string):
		return "\\u%04X" % hash.get(string, 0xFFFF)
	file.write("[")
	for index in xrange(len(blob)):
		file.write(dumps(blob[index]))
		if index < len(blob) - 1:
			file.write(",")
	file.write("]")

for key in ("name","gc","block","age","mpy",):
	with open("data.%s.json" % key, "w") as file:
		print "Writing data.%s.json ..." % key
		file.write('"')
		for cp in xrange(len(data)):
			value = data[cp].get(key)
			file.write(use(value))
		file.write('"')

for key in ("bits",):
	with open("data.%s.json" % key, "w") as file:
		print "Writing data.%s.json ..." % key
		file.write('"')
		for pair in xrange(len(data) / 2):
			low = data[pair * 2 + 0].get(key, 0)
			high = data[pair * 2 + 1].get(key, 0)
			file.write("\\u%02X%02X" % (high, low))
		file.write('"')
