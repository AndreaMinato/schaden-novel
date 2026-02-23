#!/bin/bash
set -e

node ./scripts/import_ids.mjs

git add content/
git commit -m "update novels"
git checkout -- .
git push
