#!/bin/bash
set -e

node ./scripts/import_ids.mjs

git add content/ scripts/menu_state/
git commit -m "update novels"
git checkout -- .
git push

node ./scripts/check-gaps.mjs
