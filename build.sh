#!/usr/bin/env bash
# Aetherfall build script.
# Clears NODE_OPTIONS (which can carry an incompatible preload hook in some
# sandboxes) and compiles TypeScript to dist/.
set -euo pipefail
unset NODE_OPTIONS
tsc -p tsconfig.json
echo "Build complete -> dist/"
