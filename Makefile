.POSIX:

TWEMOJI = 13.1.1

data:
	cd data && cargo run

data-clean:
	cd data && rm -f data.string.json data.*.bin

assets: helper/font.sh helper/twemoji-$(TWEMOJI)
	helper/font.sh twemoji-$(TWEMOJI)/assets/svg

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

.PHONY: data data-clean assets init init-clean init-nixos
