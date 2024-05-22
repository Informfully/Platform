#!/bin/bash
# make script stop on error
set -ex

npx expo prebuild --clean --yarn --platform ios

# Find the path to the Node.js binary
NODE_PATH=$(which node)

# Check if the node path was found
if [ -z "$NODE_PATH" ]; then
    echo "Node.js not found. Please ensure it's installed."
    exit 1
fi

# Overwrite the ios/.xcode.env.local file with the new NODE_BINARY path
echo "export NODE_BINARY=\"$NODE_PATH\"" > ios/.xcode.env.local

