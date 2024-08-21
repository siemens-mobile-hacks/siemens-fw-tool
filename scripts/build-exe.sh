#!/bin/bash
set -e
set -x
cd "$(dirname $0)/../"
rm -f *.exe *.exe.zip
npx -y esbuild bin/siemens-fw-tool.js --bundle --outfile=./siemens-fw-tool.js --format=cjs --platform=node --loader:.node=file
npx -y pkg -c ./pkg.json ./siemens-fw-tool.js
