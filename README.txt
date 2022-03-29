Welcome! You’ll need:

• Nix and one of the following
  • nix-shell [--pure]
  • direnv allow
• or your own environment with
  • make(1) + git(1) + pdfdetach(1)
  • Rust 1.58+
  • Python 3.8+ (for make assets)
  • Node.js 10+ (for make assets)

# fetch dependencies
git submodule update --init --recursive

# install dependencies
npm i
make [init-clean] init
make init-nixos # if using NixOS

# build data
make data

# build assets
make assets

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
