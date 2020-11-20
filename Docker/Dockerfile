FROM fedora:latest

RUN dnf -y update

RUN dnf -y install autoconf automake make cmake bzip2\
  gcc-c++ libstdc++-static.x86_64

RUN dnf -y install libtool bison xz which


## Emscripten
## https://emscripten.org/docs/getting_started/downloads.html
RUN dnf -y install git wget curl


RUN dnf clean all

## fix the bug in ngspice
# COPY ./misc_time.c /opt/misc_time.c

COPY ./run.sh /
RUN chmod +x /run.sh


ENTRYPOINT ["/run.sh"]

## run command:
## docker run -it -v $(realpath .):/mnt ngspice:emcc




