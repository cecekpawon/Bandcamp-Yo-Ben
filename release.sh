#!/bin/sh

VERSION=$(cat version.txt)
FILES=(meta user)

for file in "${FILES[@]}"
do
	sed -e "s;{{{VERSION}}};$VERSION;g" tpl/Bandcamp-Yo-Ben.$file.js > releases/Bandcamp-Yo-Ben.$file.js
done
