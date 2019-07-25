#!/bin/sh

cat << end
		location ~ [.]br\$ {
			more_set_headers 'Content-Encoding: br';
			expires 24h;
		}
		location / {
			rewrite ^($(
				ls dist/*/*.br \
				| sed -E 's/^dist|[.]br$//g' \
				| sed 's/[.]/[&]/g' \
				| tr \\n \| \
				| sed 's/|$//'
			))\$ \$1.br last;

			expires 24h;

			location ~ [.]html\$ {
				expires off;
			}
		}
end