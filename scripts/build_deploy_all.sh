#!/bin/bash
PKG_DIR=$(pwd)
appDirs=(cli core design-system editor-ui nodes-base workflow)
echo $PKG_DIR
rm $PKG_DIR/*.tgz

function pause() {
	read -p "$*"
}

for t in ${appDirs[@]}; do
	appDir=$PKG_DIR/packages/$t
	cd $appDir && rm -Rf "$appDir/*.tgz" && npm pack && mv ./*.tgz "$PKG_DIR/$t.tgz"
done


