#!/bin/bash
echo Entryponit script is Running...

NGSPICE_HOME="https://github.com/danchitnis/ngspice-sf-mirror"
#NGSPICE_HOME="https://git.code.sf.net/p/ngspice/ngspice"

echo -e "Ngsice git repository is $NGSPICE_HOME\n"

cd /opt
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

echo -e "\n"
echo -e "installing ngspice...\n"

cd /opt

git clone $NGSPICE_HOME ngspice-ngspice

cd ngspice-ngspice

#https://www.cyberciti.biz/faq/how-to-use-sed-to-find-and-replace-text-in-files-in-linux-unix-shell/
#https://sourceforge.net/p/ngspice/patches/99/
sed -i 's/-Wno-unused-but-set-variable/-Wno-unused-const-variable/g' ./configure.ac
sed -i 's/AC_CHECK_FUNCS(\[time getrusage\])/AC_CHECK_FUNCS(\[time\])/g' ./configure.ac
sed -i 's|#include "ngspice/ngspice.h"|#include <emscripten.h>\n\n#include "ngspice/ngspice.h"|g' ./src/frontend/control.c
sed -i 's|freewl = wlist = getcommand(string);|emscripten_sleep(100);\n\n\t\tfreewl = wlist = getcommand(string);|g' ./src/frontend/control.c


./autogen.sh
mkdir release
cd release

emconfigure ../configure --disable-debug --disable-openmp --disable-xspice -with-readline=no
wait

# ngspice$(EXEEXT)
sed -i 's|$(ngspice_LDADD) $(LIBS)|$(ngspice_LDADD) $(LIBS) -g1 -s ASYNCIFY=1 -s ASYNCIFY_ADVISE=0 -s ASYNCIFY_IGNORE_INDIRECT=0 -s ENVIRONMENT="web,worker" -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXTRA_EXPORTED_RUNTIME_METHODS=["FS","Asyncify"] -o spice.mjs|g' ./src/Makefile


emmake make -j
#emmake make 2>&1 | tee make.log

wait



cd src
mv spice.mjs spice.js
mkdir -p /mnt/build
\cp spice.js spice.wasm /mnt/build


echo -e "\n"
echo -e "This script is ended\n"





