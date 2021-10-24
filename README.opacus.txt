To deploy charming to opacus.daz.cat, first do the following locally:

1. $ npm i
2. $ npm run build
3. $ rsync -aL --info=progress2 --no-i-r dist/ opacus:/var/www/htdocs/www.azabani.com/labs/charming

Then do this on opacus in /var/www/htdocs/www.azabani.com:

4. $ ( cd labs/charming; ./nginx.sh | doas tee /etc/nginx/.site/charming.conf )
5. $ doas rcctl reload nginx
6. $ make BUNDLE=bundleNN; make examine; make deploy

After at least 72 hours (3 × expires), delete any webpack bundle
directories (labs/charming/[0-9a-f]{20}) still having older mtime
than the current deployment, then repeat steps 4 through 6.
