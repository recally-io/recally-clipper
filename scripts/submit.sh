#!/bin/bash

# read name from package.json
name=$(cat package.json \
  | grep name \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

echo "Submitting $name"

# read version in package.json 
version=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

echo "Submitting version $version"

# Dry run
bunx wxt submit --dry-run \
  --chrome-zip ".output/${name}-${version}-chrome.zip" \
  --firefox-zip ".output/${name}-${version}-firefox.zip" \
  --firefox-sources-zip ".output/${name}-${version}-sources.zip"
  # --edge-zip ".output/${name}-${version}-chrome.zip"
