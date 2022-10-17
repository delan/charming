#!/bin/sh

# Generates an nginx.conf snippet that rewrites requests for
# charming’s files to their Brotli-compressed siblings, based on the
# current set of webpack bundles being served.
#
# I wrote them because I can’t be bothered compiling an ngx_brotli
# module for charming.daz.cat right now, but the approach I’m using
# breaks clients that don’t have Accept-Encoding: br.
#
# Consider using ngx_brotli with “brotli_static on;” someday.

cat << end
		location ~ [.]br\$ {
			more_set_headers 'Content-Encoding: br';
			expires 24h;
		}
		location / {
$(
	ls */*.br \
	| sed 's/^/\//' \
	| sed 's/[.]br$//' \
	| sed 's/[.]/[&]/g' \
	| sed 's/^/			rewrite ^(/' \
	| sed 's/$/)$ $1.br last;/'
)

			expires 24h;

			location ~ [.]html\$ {
				expires off;
			}
		}
end
