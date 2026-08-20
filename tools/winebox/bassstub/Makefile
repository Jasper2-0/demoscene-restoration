# Cross-compiled with mingw-w64 for i686. Built in an amd64 container rather than
# the i386 runtime one: compiling under qemu-i386 emulation is needlessly slow,
# and the compiler's own architecture has nothing to do with the target's.
#
#   make            -> BASS.DLL
# --kill-at strips the @N stdcall decoration, so exports are plain names, which is
# how the shipped BASS.DLL exports them and therefore what Genoaux.exe imports.
CC = i686-w64-mingw32-gcc
all: BASS.DLL
BASS.DLL: bassstub.c
	$(CC) -O2 -shared -o $@ $< -Wl,--kill-at -Wl,--enable-stdcall-fixup -lkernel32
clean:
	rm -f BASS.DLL
