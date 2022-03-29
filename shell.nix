{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  shellHook = ''
    # helper > requirements.txt > nanoemoji + Brotli
    # https://discourse.nixos.org/t/x/5522/2
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [pkgs.stdenv.cc.cc]}
  '';

  buildInputs = [
    # Makefile
    pkgs.patchelf
    pkgs.curl
    pkgs.cacert # for curl https
    pkgs.poppler_utils # pdfdetach(1)

    # package.json
    pkgs.nodejs-10_x

    # webpack.config.js > DefinePlugin
    pkgs.git

    # data > Cargo.toml
    pkgs.cargo # pkgs.rust_1_58.packages.stable.cargo

    # helper > requirements.txt
    pkgs.python38
  ];
}
