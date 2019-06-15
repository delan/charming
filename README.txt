# fetch dependencies
git submodule update --init --recursive

# build data
make

# build client
npm run build

# check TypeScript
npm run check

# start dev server
npm run start

# start and open
npm run open

# format code
npm run prettier [-- additional options]
