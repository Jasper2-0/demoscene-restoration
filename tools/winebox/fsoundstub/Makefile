# Cross-compiled with mingw-w64 for i686, in an amd64 container: compiling under
# qemu-i386 emulation is needlessly slow and the compiler's architecture has
# nothing to do with the target's.
#
#   make            -> FSOUND.DLL
#
# NO --kill-at here, unlike the BASS stub. BASS exports undecorated names, so that
# stub strips the @N; FMOD exports MSVC-decorated ones and the .def reproduces
# them exactly. Getting this backwards produces a DLL that loads and then fails to
# bind, which reads like a missing dependency rather than a naming mismatch.
CC = i686-w64-mingw32-gcc
all: FSOUND.DLL
FSOUND.DLL: fsoundstub.c fsoundstub.def
	$(CC) -O2 -shared -o $@ fsoundstub.c fsoundstub.def -lkernel32
clean:
	rm -f FSOUND.DLL
