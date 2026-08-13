/*
  code (c)1999 snq@scene.org
  textures (c)1999 oyise@hotmail.com
  
  oh, these are the textures used in CashCow :)

  on my comp this list takes:
  without MMX: 17.39 secs
  with MMX: 9.36 secs
*/

#include <windows.h>
#include <stdio.h>
#include "../include/atglib.h"

/*
  this is our callback function
  this will be called by ATG every time one effect is finished
  f ranges from 0 to 1 and you can use it for a progress bar or so
*/
void __stdcall callback(float f)
{
  char tmp[80];
  
  int percent=(int)(f*100);
  wsprintf(tmp,"calcing textures: %3i%%",percent);
  SetConsoleTitle(tmp);
  
  int dots=(int)(f*77);
  int i;
  printf("[");
  for(i=0; i<dots; i++) printf(">");
  for(;i<77;i++) printf(" ");
  printf("]\r");
}


extern unsigned char * atgList[]; // in atgfiles.cpp

void main(void)
{
  /*
    hello
  */
  printf("ATGlib example\n");

  /*
    do we want to save the textures to disk?
    this defaults to false
    if you have saved them, next time you run your "thing", 
    they will be loaded from disk...
  */
  atgUseDisk=true;

  /*
    do we want to use MMX?
    WARNING: there is NO check for an MMX proc in the ATG code!!
    so if you tell it to use MMX, it will! :)
    but if you enable it, it will be about twice as fast!
  */
//  atgUseMmx=true;
  
  int theTime=timeGetTime();
  
  /*
    our textures will be in textures[0], textures[1], etc..
  */
  unsigned int ** textures = atgLoadList( atgList, callback );

  theTime-=timeGetTime();
  printf("\nelapsed time: %3.2f seconds\n\n",(float)(-theTime/1000.f));
  printf("- we are very g.. ehr.. well this is nice, isn't it?\n");
}




















// useful hint of the month: MSVCRT.LIB