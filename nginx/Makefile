.POSIX:
.SUFFIXES:
.PHONY: clean

nginx/charming.conf: nginx/Makefile nginx/build.sh dist
	nginx/build.sh > $@
