.POSIX:

TWEMOJI = 13.1.1
SYMBOLA = 14.00

data:
	cd data && cargo run

data-clean:
	cd data && rm -f data.string.json data.*.bin

assets: helper/font.sh helper/twemoji-$(TWEMOJI) helper/Symbola-$(SYMBOLA).otf
	helper/font.sh twemoji-$(TWEMOJI)/assets/svg
	. helper/.venv/bin/activate && >&2 npx glyphhanger --formats=woff2 --subset=helper/build/Font.ttf
	. helper/.venv/bin/activate && >&2 npx glyphhanger --formats=woff2 --subset=helper/Symbola-$(SYMBOLA).otf

assets-clean:
	cd helper && rm -Rf build twemoji-$(TWEMOJI) twemoji-$(TWEMOJI).tar.gz

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

helper/twemoji-$(TWEMOJI): helper/twemoji-$(TWEMOJI).tar.gz
	cd helper && tar xzf twemoji-$(TWEMOJI).tar.gz

helper/twemoji-$(TWEMOJI).tar.gz:
	curl -Lo $@ https://github.com/twitter/twemoji/archive/refs/tags/v$(TWEMOJI).tar.gz

helper/Symbola-$(SYMBOLA).pdf:
	curl -Lo $@ https://dn-works.com/wp-content/uploads/2021/UFAS121921/Symbola.pdf

helper/Symbola-$(SYMBOLA).otf: helper/Symbola-$(SYMBOLA).pdf
	pdfdetach -savefile Symbola.otf -o $@ helper/Symbola-$(SYMBOLA).pdf

.PHONY: data data-clean assets init init-clean init-nixos
