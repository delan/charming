These files generate nginx/charming.conf, an nginx.conf snippet that
rewrites requests for charming’s files to their Brotli-compressed
siblings, based on the current state of dist.

I wrote them because I can’t be bothered compiling an ngx_brotli
module for charming.daz.cat right now, but the approach I’m using
breaks clients that don’t have Accept-Encoding: br.

1. consider using ngx_brotli: brotli_static on;
2. generate charming.conf: make -f nginx/Makefile
3. server block: include path/to/charming.conf;
