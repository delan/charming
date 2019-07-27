# fetch dependencies
git submodule update --init --recursive

# build data
make -C data

# build client
npm run build

# start dev server
npm run start

# start and open
npm run open

# format code
npm run prettier:write

# check TypeScript
npm run check

# run unit tests
npm run test

# do all three
npm run dwim

# test coverage
npm run test:coverage
