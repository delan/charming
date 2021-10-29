To deploy charming to opacus.daz.cat, first do the following locally:

1. $ npm i
2. $ git clean -fx dist
3. $ npm run build
4. $ rsync -aL --info=progress2 --no-i-r dist/ opacus:/var/www/htdocs/www.azabani.com/labs/charming

Then do this on opacus in /var/www/htdocs/www.azabani.com:

5. $ ( cd labs/charming; ./nginx.sh | doas tee /etc/nginx/.site/charming.conf )
6. $ doas rcctl reload nginx
7. $ make BUNDLE=bundleNN; git -C _staging diff --cached --stat
8. $ make deploy

After at least 72 hours (3 × expires), delete any webpack bundle
directories (labs/charming/[0-9a-f]{20}) still having older mtime
than the current deployment, then repeat steps 5 through 8.

Cleaning dist in step 2 ensures that the bundle hashes still in use
get fresh mtimes, so that we don’t accidentally delete any bundles
that are still in use but were introduced in an older deployment.
