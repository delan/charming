# fetch dependencies
git submodule update --init --recursive

# build data
make

# build client
npm run build

# start dev server
npm run start

# start and open
npm run open
