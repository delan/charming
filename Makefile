.POSIX:

TWEMOJI = 14.0.1
TWEMOJI_REF = refs/tags/v$(TWEMOJI)
TWEMOJI_REF = 5c22969a9498d798e447372bccac692faf20bd8b
TWEMOJI_DIR = $(TWEMOJI)
TWEMOJI_DIR = $(TWEMOJI_REF)
SYMBOLA = 14.00

data:
	cd data && cargo run

data-clean:
	cd data && rm -f data.string.json data.*.bin

assets: helper/dist/twemoji-$(TWEMOJI).woff2 helper/dist/Symbola-$(SYMBOLA).woff2 helper/dist/fa-brands-400.woff2 helper/dist/fa-solid-900.woff2

assets-clean:
	cd helper && rm -Rf build dist twemoji-$(TWEMOJI) twemoji-$(TWEMOJI_DIR)

init: helper/.venv helper/requirements.txt
	. helper/.venv/bin/activate && pip install -r helper/requirements.txt

init-clean:
	rm -Rf helper/.venv

init-nixos: init
	# FIXME this can’t possibly be the best solution
	patchelf --set-interpreter $$(cat $$NIX_CC/nix-support/dynamic-linker) helper/.venv/lib/*/site-packages/ninja/data/bin/ninja
	helper/.venv/lib/*/site-packages/ninja/data/bin/ninja --version

helper/.venv:
	python3 -m venv -- '$@'

helper/dist/twemoji-$(TWEMOJI).woff2: helper/twemoji-$(TWEMOJI)
	cd data && cargo run -- $(TWEMOJI)
	helper/nanoemoji.sh twemoji-$(TWEMOJI)/assets/svg
	. helper/.venv/bin/activate && >&2 npx glyphhanger --formats=woff2 --subset=helper/build/Font.ttf
	mkdir -p helper/dist
	mv helper/build/Font-subset.woff2 $@

helper/dist/Symbola-$(SYMBOLA).woff2: helper/Symbola-$(SYMBOLA).otf
	. helper/.venv/bin/activate && >&2 npx glyphhanger --formats=woff2 --subset=$?
	mkdir -p helper/dist
	mv helper/Symbola-$(SYMBOLA)-subset.woff2 $@

helper/dist/fa-brands-400.woff2: helper/fa-brands-400.woff2
	. helper/.venv/bin/activate && >&2 npx glyphhanger --formats=woff2 --subset=$? --whitelist=''
	mkdir -p helper/dist
	mv helper/fa-brands-400-subset.woff2 $@

helper/dist/fa-solid-900.woff2: helper/fa-solid-900.woff2
	. helper/.venv/bin/activate && >&2 npx glyphhanger --formats=woff2 --subset=$? --whitelist=''
	mkdir -p helper/dist
	mv helper/fa-solid-900-subset.woff2 $@

helper/twemoji-$(TWEMOJI): helper/twemoji-$(TWEMOJI).tar.gz
	cd helper && tar xzf twemoji-$(TWEMOJI).tar.gz
	if [ $(TWEMOJI_DIR) != $(TWEMOJI) ]; then cd helper && mv twemoji-$(TWEMOJI_DIR) twemoji-$(TWEMOJI); fi

helper/twemoji-$(TWEMOJI).tar.gz:
	curl -Lo $@ https://github.com/twitter/twemoji/archive/$(TWEMOJI_REF).tar.gz

helper/Symbola-$(SYMBOLA).otf: helper/Symbola-$(SYMBOLA).pdf
	pdfdetach -savefile Symbola.otf -o $@ helper/Symbola-$(SYMBOLA).pdf

helper/Symbola-$(SYMBOLA).pdf:
	curl -Lo $@ https://dn-works.com/wp-content/uploads/2021/UFAS121921/Symbola.pdf

helper/fa-brands-400.woff2: node_modules/@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2
	cp -- $? $@

helper/fa-solid-900.woff2: node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2
	cp -- $? $@

.PHONY: data data-clean assets init init-clean init-nixos
