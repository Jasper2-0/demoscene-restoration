#ifndef __ATGLIB_H
#define __ATGLIB_H

typedef void (WINAPI *ATGCALLBACK) (float);

extern bool atgUseMmx;
extern bool atgUseDisk;

unsigned int ** atgLoadList(unsigned char **atgList, ATGCALLBACK callback);

#endif
