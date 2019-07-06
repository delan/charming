#!/bin/sh

cat << end
		location ~ [.]br\$ {
			more_set_headers 'Content-Encoding: br';
		}
		location / {
			rewrite ^($(
				ls dist/*.br \
				| sed -E 's/^dist|[.]br$//g' \
				| sed 's/[.]/[&]/g' \
				| tr \\n \| \
				| sed 's/|$//'
			))\$ \$1.br last;
		}
end
