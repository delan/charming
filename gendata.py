import re
import json
import gzip

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
	data.append({}.copy())

print 'Processing UnicodeData.txt ...'

for l in open('data/UnicodeData.txt'):
	l = l.rstrip('\r\n')
	f = l.split(';')
	cp = int(f[0], 16)
	data[cp]['name'] = f[1]
	data[cp]['gc'] = pretty_gencat(f[2])

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
	if f[2] == 'control':
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
		data[cp]['han'] = True

print 'Generating JSON ...'

j = json.dumps(data)

print 'Writing data ...'

open('data.json', 'w').write(j)

print 'Compressing with gzip ...'

f = gzip.open('data.json.gz', 'w')
f.write(j)
f.close()
