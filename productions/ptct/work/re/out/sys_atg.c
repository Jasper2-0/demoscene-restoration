// ==== ads_initatg @ 00002c00 ====

/* void __cdecl ads_initatg(void) */

void __cdecl ads_initatg(void)

{
  uchar uVar1;
  int iVar2;
  int iVar3;
  uint uVar4;
  
  ads_fadetab = _malloc(0x10000);
  iVar3 = 0;
  do {
    iVar2 = 0;
    uVar4 = 0;
    do {
      ads_fadetab[iVar2 + iVar3 * 0x100] = (uchar)(uVar4 / 0x7f);
      iVar2 = iVar2 + 1;
      uVar4 = uVar4 + iVar3;
    } while (iVar2 < 0x100);
    iVar3 = iVar3 + 1;
  } while (iVar3 < 0x80);
  iVar3 = 0x8000;
  do {
    iVar2 = 0;
    do {
      uVar1 = __ftol();
      iVar2 = iVar2 + 1;
      ads_fadetab[iVar2 + iVar3 + -1] = uVar1;
    } while (iVar2 < 0x100);
    iVar3 = iVar3 + 0x100;
  } while (iVar3 < 0x10000);
  templayer = _malloc(0x40000);
  templayer2 = _malloc(0x40000);
  layer = _malloc(0x40000);
  DAT_00002410 = _malloc(0x40000);
  DAT_00002414 = _malloc(0x40000);
  DAT_00002418 = _malloc(0x40000);
  texmap = _malloc(0x40000);
  atg = _malloc(0x10000);
  return;
}


// ==== ads_savetga256x256 @ 00002d40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl ads_savetga256x256(unsigned int *) */

void __cdecl ads_savetga256x256(uint *param_1)

{
  undefined4 uVar1;
  code *pcVar2;
  undefined4 uVar3;
  int iVar4;
  int iVar5;
  undefined4 *puVar6;
  undefined4 uStack_8c;
  undefined4 uStack_88;
  undefined4 *puStack_84;
  undefined4 uStack_80;
  undefined4 *puStack_7c;
  undefined4 uStack_78;
  undefined4 uStack_74;
  char ***pppcStack_70;
  undefined4 uStack_6c;
  undefined4 *puStack_68;
  undefined4 uStack_64;
  undefined4 uStack_60;
  undefined1 *puStack_5c;
  undefined4 uStack_58;
  undefined4 *puStack_54;
  undefined4 uStack_50;
  char **ppcStack_4c;
  undefined4 uStack_48;
  undefined4 uStack_44;
  undefined4 uStack_40;
  undefined4 uStack_3c;
  undefined4 uStack_38;
  undefined4 uStack_34;
  
  uStack_34 = 0;
  uStack_38 = 0x80;
  uStack_3c = 2;
  uStack_40 = 0;
  uStack_44 = 0;
  uStack_48 = 0x40000000;
  ppcStack_4c = &shotname;
  uStack_50 = 0x2d9b;
  uVar3 = (*___imp__CreateFileA_28)();
  pcVar2 = ___imp__WriteFile_20;
  puStack_54 = &uStack_3c;
  uStack_50 = 0;
  puStack_5c = &stack0xffffffd4;
  uStack_58 = 0xc;
  uStack_64 = 0x2db4;
  uStack_60 = uVar3;
  (*___imp__WriteFile_20)();
  puStack_68 = &uStack_50;
  uStack_64 = 0;
  pppcStack_70 = &ppcStack_4c;
  uStack_6c = 2;
  uStack_78 = 0x2dc5;
  uStack_74 = uVar3;
  (*pcVar2)();
  puStack_7c = &uStack_64;
  uStack_78 = 0;
  puStack_84 = &uStack_60;
  uStack_80 = 2;
  uStack_8c = 0x2dd6;
  uStack_88 = uVar3;
  (*pcVar2)();
  uStack_8c = 0;
  (*pcVar2)(uVar3,&uStack_6c,2,&uStack_78);
  iVar4 = 0;
  puStack_84 = (undefined4 *)0x100;
  puStack_68 = puStack_68 + 0xff00;
  do {
    iVar5 = 0x100;
    puVar6 = puStack_68;
    do {
      uVar1 = *puVar6;
      puVar6 = puVar6 + 1;
      texmap[iVar4] = (uchar)uVar1;
      texmap[iVar4 + 1] = (uchar)((uint)uVar1 >> 8);
      texmap[iVar4 + 2] = (uchar)((uint)uVar1 >> 0x10);
      iVar4 = iVar4 + 3;
      iVar5 = iVar5 + -1;
    } while (iVar5 != 0);
    puStack_68 = puStack_68 + -0x100;
    puStack_84 = (undefined4 *)((int)puStack_84 + -1);
  } while (puStack_84 != (undefined4 *)0x0);
  (*___imp__WriteFile_20)(uVar3,texmap,0x30000,&uStack_8c,0);
  (*___imp__CloseHandle_4)(uVar3);
  s_0_tga_00002507[0] = s_0_tga_00002507[0] + '\x01';
  if (s_0_tga_00002507[0] == ':') {
    s_0_tga_00002507[0] = '0';
    DAT_00002506 = DAT_00002506 + '\x01';
  }
  return;
}


// ==== ads_loadtga256x256 @ 00002ea0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* int __cdecl ads_loadtga256x256(char *,unsigned int *) */

int __cdecl ads_loadtga256x256(char *param_1,uint *param_2)

{
  uchar *puVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  uint *puVar5;
  uint *puVar6;
  int iVar7;
  int iVar8;
  
  iVar3 = (*___imp__CreateFileA_28)();
  if (iVar3 == -1) {
    return 0;
  }
  iVar8 = 0x12;
  (*___imp__SetFilePointer_16)(iVar3,0x12,0,0);
  (*___imp__ReadFile_20)(iVar3,texmap,0x30000,&stack0xffffffd0,0);
  (*___imp__CloseHandle_4)(iVar3);
  iVar3 = 0;
  iVar7 = 0x100;
  puVar5 = (uint *)(iVar8 + 0x3fc00);
  do {
    iVar8 = 0x100;
    puVar6 = puVar5;
    do {
      puVar1 = texmap + iVar3;
      iVar4 = iVar3 + 2;
      iVar2 = iVar3 + 1;
      iVar3 = iVar3 + 3;
      iVar8 = iVar8 + -1;
      *puVar6 = (uint)CONCAT21(CONCAT11(texmap[iVar4],texmap[iVar2]),*puVar1);
      puVar6 = puVar6 + 1;
    } while (iVar8 != 0);
    puVar5 = puVar5 + -0x100;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  s_0_tga_00002507[0] = s_0_tga_00002507[0] + '\x01';
  if (s_0_tga_00002507[0] == ':') {
    s_0_tga_00002507[0] = '0';
    DAT_00002506 = DAT_00002506 + '\x01';
  }
  return 1;
}


// ==== ads_deinitatg @ 00002f90 ====

/* void __cdecl ads_deinitatg(void) */

void __cdecl ads_deinitatg(void)

{
  if (templayer2 != (uint *)0x0) {
    _free(templayer2);
  }
  if (templayer != (uint *)0x0) {
    _free(templayer);
  }
  if (layer != (uint **)0x0) {
    _free(layer);
  }
  if (DAT_00002410 != (void *)0x0) {
    _free(DAT_00002410);
  }
  if (DAT_00002414 != (void *)0x0) {
    _free(DAT_00002414);
  }
  if (DAT_00002418 != (void *)0x0) {
    _free(DAT_00002418);
  }
  if (texmap != (uchar *)0x0) {
    _free(texmap);
  }
  if (atg != (uchar *)0x0) {
    _free(atg);
  }
  return;
}


// ==== fpu_getpixel @ 00003020 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* unsigned int __cdecl fpu_getpixel(unsigned int *,float,float) */

uint __cdecl fpu_getpixel(uint *param_1,float param_2,float param_3)

{
  uint uVar1;
  int iVar2;
  uint uVar3;
  undefined4 unaff_ESI;
  undefined4 unaff_EDI;
  float in_stack_00000010;
  float fStack00000014;
  float fStack00000018;
  undefined8 uVar4;
  
  for (; param_2 < ___real_4_00000000000000000000;
      param_2 = param_2 + ___real_4_40078000000000000000) {
  }
  if ((float)___real_8_40078000000000000000 <= param_2) {
    do {
      param_2 = param_2 - ___real_4_40078000000000000000;
    } while ((float)___real_8_40078000000000000000 <= param_2);
  }
  for (; param_3 < ___real_4_00000000000000000000;
      param_3 = param_3 + ___real_4_40078000000000000000) {
  }
  if ((float)___real_8_40078000000000000000 <= param_3) {
    do {
      param_3 = param_3 - ___real_4_40078000000000000000;
    } while ((float)___real_8_40078000000000000000 <= param_3);
  }
  uVar4 = CONCAT44(unaff_ESI,unaff_EDI);
  _floor((double)param_2);
  uVar1 = __ftol(uVar4);
  fStack00000014 = (float)uVar1;
  _floor((double)in_stack_00000010);
  iVar2 = __ftol();
  uVar1 = *(uint *)((int)fStack00000014 + ((uVar1 & 0xff) + (iVar2 + 1U & 0xff) * 0x100) * 4);
  fStack00000018 = (float)(uVar1 >> 8 & 0xff);
  fStack00000014 = (float)(uVar1 & 0xff);
  iVar2 = __ftol();
  uVar1 = __ftol();
  uVar3 = __ftol();
  return uVar3 | (iVar2 << 8 | uVar1) << 8;
}


// ==== mmx_getpixel @ 000032e0 ====

/* unsigned int __cdecl mmx_getpixel(unsigned int *,float,float) */

uint __cdecl mmx_getpixel(uint *param_1,float param_2,float param_3)

{
  uint uVar1;
  uint uVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  uint uVar7;
  uint uVar8;
  uint uVar9;
  short sVar10;
  unkbyte10 in_ST0;
  short sVar11;
  unkbyte10 in_ST1;
  short sVar14;
  short sVar15;
  short sVar16;
  unkbyte10 in_ST2;
  unkbyte10 Var12;
  short sVar17;
  short sVar18;
  ushort uVar19;
  unkbyte10 in_ST4;
  unkbyte10 in_ST5;
  ushort uVar20;
  ushort uVar21;
  ushort uVar22;
  ushort uVar23;
  ushort uVar24;
  ushort uVar25;
  ushort uVar26;
  unkbyte10 Var13;
  
  iVar3 = ((int)ROUND(param_2 * 256.0) & 0xffU) * 0x10101;
  iVar4 = ((int)ROUND(param_3 * 256.0) & 0xffU) * 0x10101;
  uVar9 = (int)ROUND(param_3 * 256.0) & 0xff00;
  uVar7 = ((int)ROUND(param_2 * 256.0) & 0xff00U) >> 8;
  uVar1 = param_1[uVar7 + uVar9];
  uVar5 = CONCAT31((uint3)(ushort)((unkuint10)in_ST4 >> 0x40) << 8,(char)(uVar1 >> 0x18));
  uVar8 = uVar7 + 1 & 0xff;
  uVar2 = param_1[uVar8 + uVar9];
  uVar24 = (ushort)((unkuint10)in_ST5 >> 0x40);
  uVar9 = uVar9 + 0x100 & 0xff00;
  uVar8 = param_1[uVar8 + uVar9];
  uVar7 = param_1[uVar7 + uVar9];
  uVar9 = CONCAT31((uint3)(ushort)((unkuint10)in_ST0 >> 0x40) << 8,(char)((uint)iVar3 >> 0x18));
  uVar20 = (ushort)(byte)iVar3;
  Var13 = CONCAT37((int3)(((unkuint10)(ushort)((unkuint10)in_ST2 >> 0x40) << 0x40) >> 0x38),
                   0xff0000ffffffff);
  Var12 = CONCAT55((int5)(((unkuint10)(uint)((unkuint10)Var13 >> 0x30) << 0x30) >> 0x28),
                   0xffffffffff);
  uVar6 = CONCAT31((uint3)(ushort)((unkuint10)in_ST1 >> 0x40) << 8,(char)((uint)iVar4 >> 0x18));
  uVar22 = (ushort)(byte)iVar4;
  uVar21 = (ushort)(byte)((uint)iVar3 >> 8);
  sVar17 = (short)(CONCAT73((int7)(((unkuint10)(uint6)((unkuint10)Var12 >> 0x20) << 0x20) >> 0x18),
                            0xffffff) >> 0x10);
  sVar14 = sVar17 - uVar21;
  sVar10 = (short)(CONCAT55((uint5)uVar9 << 8,CONCAT14((char)((uint)iVar3 >> 0x10),iVar3)) >> 0x20);
  sVar18 = (short)((unkuint10)Var12 >> 0x20);
  sVar15 = sVar18 - sVar10;
  sVar16 = (short)((unkuint10)Var13 >> 0x30);
  uVar23 = (ushort)(byte)((uint)iVar4 >> 8);
  sVar17 = sVar17 - uVar23;
  sVar11 = (short)(CONCAT55((uint5)uVar6 << 8,CONCAT14((char)((uint)iVar4 >> 0x10),iVar4)) >> 0x20);
  sVar18 = sVar18 - sVar11;
  uVar19 = ((ushort)((short)uVar5 * (sVar16 - (short)uVar9)) >> 8) * (sVar16 - (short)uVar6);
  uVar20 = ((ushort)((byte)uVar8 * uVar20) >> 8) * uVar22 +
           ((ushort)((byte)uVar7 * uVar22) >> 8) * (0xff - uVar20) +
           ((ushort)((byte)uVar2 * uVar20) >> 8) * (0xff - uVar22) +
           ((ushort)((ushort)(byte)uVar1 * (0xff - uVar20)) >> 8) * (0xff - uVar22);
  uVar22 = ((ushort)((byte)(uVar8 >> 8) * uVar21) >> 8) * uVar23 +
           ((ushort)((byte)(uVar7 >> 8) * uVar23) >> 8) * sVar14 +
           ((ushort)((byte)(uVar2 >> 8) * uVar21) >> 8) * sVar17 +
           ((ushort)((ushort)(byte)(uVar1 >> 8) * sVar14) >> 8) * sVar17;
  uVar24 = ((ushort)((short)(CONCAT55((uint5)uVar24 << 0x18,CONCAT14((char)(uVar8 >> 0x10),uVar8))
                            >> 0x20) * sVar10) >> 8) * sVar11 +
           ((ushort)((short)(CONCAT55((uint5)uVar24 << 0x18,CONCAT14((char)(uVar7 >> 0x10),uVar7))
                            >> 0x20) * sVar11) >> 8) * sVar15 +
           ((ushort)((short)(CONCAT55((uint5)uVar24 << 0x18,CONCAT14((char)(uVar2 >> 0x10),uVar2))
                            >> 0x20) * sVar10) >> 8) * sVar18 +
           ((ushort)((short)(CONCAT55((uint5)uVar5 << 8,CONCAT14((char)(uVar1 >> 0x10),uVar1)) >>
                            0x20) * sVar15) >> 8) * sVar18;
  uVar21 = uVar20 >> 8;
  uVar23 = uVar22 >> 8;
  uVar25 = uVar24 >> 8;
  uVar26 = uVar19 >> 8;
  return CONCAT13((uVar26 != 0) * (uVar26 < 0x100) * (char)(uVar19 >> 8) - (0xff < uVar26),
                  CONCAT12((uVar25 != 0) * (uVar25 < 0x100) * (char)(uVar24 >> 8) - (0xff < uVar25),
                           CONCAT11((uVar23 != 0) * (uVar23 < 0x100) * (char)(uVar22 >> 8) -
                                    (0xff < uVar23),
                                    (uVar21 != 0) * (uVar21 < 0x100) * (char)(uVar20 >> 8) -
                                    (0xff < uVar21))));
}


// ==== atg_getpixel @ 000033f0 ====

/* unsigned int __cdecl atg_getpixel(unsigned int *,float,float) */

uint __cdecl atg_getpixel(uint *param_1,float param_2,float param_3)

{
  uint uVar1;
  
  if (atgUseMmx) {
    uVar1 = mmx_getpixel(param_1,param_2,param_3);
    return uVar1;
  }
  uVar1 = fpu_getpixel(param_1,param_2,param_3);
  return uVar1;
}


// ==== atgLoadList @ 00003420 ====

/* unsigned int * * __cdecl atgLoadList(unsigned char * *,void (__stdcall*)(float)) */

uint ** __cdecl atgLoadList(uchar **param_1,_func_void_float *param_2)

{
  uchar **ppuVar1;
  uchar **ppuVar2;
  uint **ppuVar3;
  uint *puVar4;
  int iVar5;
  uint **ppuVar6;
  int iVar7;
  
  if (!atgInited) {
    ads_initatg();
    atgInited = true;
  }
  atg_callback = param_2;
  iVar7 = 0;
  ppuVar2 = param_1;
  do {
    ppuVar1 = ppuVar2 + 1;
    ppuVar2 = ppuVar2 + 1;
    iVar7 = iVar7 + 1;
  } while (*ppuVar1 != (uchar *)0x0);
  atg_totalfx = 0;
  atg_fxdone = 0;
  ppuVar2 = param_1;
  iVar5 = iVar7;
  if (0 < iVar7) {
    do {
      atg_totalfx = atg_totalfx + (uint)(*ppuVar2)[3];
      iVar5 = iVar5 + -1;
      ppuVar2 = ppuVar2 + 1;
    } while (iVar5 != 0);
  }
  ppuVar3 = _malloc(iVar7 * 4);
  if (0 < iVar7) {
    ppuVar6 = ppuVar3;
    do {
      puVar4 = ads_loadatg(*(uchar **)((int)ppuVar6 + ((int)param_1 - (int)ppuVar3)));
      *ppuVar6 = puVar4;
      ppuVar6 = ppuVar6 + 1;
      iVar7 = iVar7 + -1;
    } while (iVar7 != 0);
  }
  atg_totalfx = 0;
  atg_fxdone = 0;
  ads_deinitatg();
  return ppuVar3;
}


// ==== ads_loadatg @ 000034d0 ====

/* unsigned int * __cdecl ads_loadatg(unsigned char *) */

uint * __cdecl ads_loadatg(uchar *param_1)

{
  uint *puVar1;
  uchar *in_stack_00000008;
  
  puVar1 = _malloc(0x40000);
  ads_loadatg(in_stack_00000008,puVar1);
  return puVar1;
}


// ==== ads_loadatg @ 000034f0 ====

/* void __cdecl ads_loadatg(unsigned char *,unsigned int *) */

void __cdecl ads_loadatg(uchar *param_1,uint *param_2)

{
  uchar uVar1;
  byte bVar2;
  uchar *puVar3;
  int iVar4;
  uchar *puVar5;
  int iVar6;
  uint **ppuVar7;
  
  puVar3 = param_1;
  if ((param_1 != (uchar *)0x0) && (param_2 != (uint *)0x0)) {
    if (templayer == (uint *)0x0) {
      ads_initatg();
    }
    if ((atgUseDisk != false) && (iVar4 = ads_loadtga256x256((char *)&shotname,param_2), iVar4 != 0)
       ) {
      atg_fxdone = atg_fxdone + (uint)param_1[3];
      (*atg_callback)((float)atg_fxdone / (float)atg_totalfx);
      return;
    }
    *(undefined4 *)atg = *(undefined4 *)param_1;
    clear(templayer);
    clear(templayer2);
    clear((uint *)layer);
    clear(DAT_00002410);
    clear(DAT_00002414);
    clear(DAT_00002418);
    if ((*(uint *)atg & 0xffffff) == 0x475441) {
      param_1 = (uchar *)((int)*(uint *)atg >> 0x18);
      iVar4 = 4;
      if (0 < (int)param_1) {
        iVar6 = 0;
        do {
          puVar5 = puVar3 + iVar4 + iVar6;
          uVar1 = *puVar5;
          cf = puVar5 + 1;
          bVar2 = *cf;
          if (bVar2 < 4) {
            if (uVar1 == '\x01') {
              atg_fractalplasma((uint)bVar2,(uint)puVar5[2],(uint)puVar5[4],(uint)puVar5[5],
                                (uint)puVar5[6],(uint)puVar5[7]);
            }
            else if (uVar1 == '\x02') {
              atg_plasma((uint)bVar2,(uint)puVar5[8],(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]
                         ,(uint)puVar5[5]);
            }
            else if (uVar1 == '\x03') {
              atg_cells((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4],(uint)puVar5[5],
                        (uint)puVar5[6],(uint)puVar5[7],(uint)puVar5[8]);
            }
            else if (uVar1 == '\x04') {
              atg_envmap((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]);
            }
            else if (uVar1 == '\x05') {
              atg_subplasma((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4],
                            (uint)puVar5[5],(uint)puVar5[6],(uint)puVar5[7]);
            }
            else if (uVar1 == '\x06') {
              clear((uint *)(&layer)[bVar2]);
            }
            else if (uVar1 == '\n') {
              atg_sinedistort((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4],
                              (uint)puVar5[5],(uint)puVar5[6],(uint)puVar5[7]);
            }
            else if (uVar1 == '\v') {
              atg_offset((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3]);
            }
            else if (uVar1 == '\f') {
              atg_twirl((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x0e') {
              atg_bump((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x0f') {
              atg_blur((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x11') {
              atg_mapdistort((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4],
                             (uint)puVar5[5],(uint)puVar5[6],(uint)puVar5[7]);
            }
            else if (uVar1 == '\x12') {
              atg_dirblur((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]);
            }
            else if (uVar1 == '\x14') {
              atg_exchange((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]);
            }
            else if (uVar1 == '\x15') {
              atg_torgb((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x17') {
              atg_copylayer((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]);
            }
            else if (uVar1 == '\x18') {
              atg_mix((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3]);
            }
            else if (uVar1 == '\x19') {
              atg_mul((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x1a') {
              atg_add((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x1b') {
              atg_max((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x1e') {
              atg_contrast((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\x1f') {
              atg_invert((uint)bVar2);
            }
            else if (uVar1 == ' ') {
              atg_shade((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3]);
            }
            else if (uVar1 == '!') {
              atg_brightness((uint)bVar2,(uint)puVar5[2]);
            }
            else if (uVar1 == '\"') {
              atg_sinecolor((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3]);
            }
            else if (uVar1 == '#') {
              atg_scalecolor((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]);
            }
            else if (uVar1 == '$') {
              atg_hsv((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3]);
            }
            else if (uVar1 == '%') {
              atg_colorize((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4],
                           (uint)puVar5[5],(uint)puVar5[6],(uint)puVar5[7],(uint)puVar5[8]);
            }
            else if (uVar1 == '&') {
              atg_mixmap((uint)bVar2,(uint)puVar5[2],(uint)puVar5[3],(uint)puVar5[4]);
            }
            else if (uVar1 == '\'') {
              atg_emboss((uint)bVar2);
            }
            else if (uVar1 == '(') {
              atg_loadbitmap((uint)bVar2,puVar5 + 9,
                             ((uint)puVar5[2] * 0x100 + (uint)puVar5[3]) * 0x100 + (uint)puVar5[4],
                             ((uint)puVar5[5] * 0x100 + (uint)puVar5[6]) * 0x100 + (uint)puVar5[7]);
              iVar4 = iVar4 + 0x2000;
            }
          }
          atg_fxdone = atg_fxdone + 1;
          (*atg_callback)((float)atg_fxdone / (float)atg_totalfx);
          iVar6 = iVar6 + 9;
          param_1 = param_1 + -1;
        } while (param_1 != (uchar *)0x0);
      }
      ppuVar7 = layer;
      for (iVar4 = 0x10000; iVar4 != 0; iVar4 = iVar4 + -1) {
        *param_2 = (uint)*ppuVar7;
        ppuVar7 = ppuVar7 + 1;
        param_2 = param_2 + 1;
      }
      if (atgUseDisk != false) {
        ads_savetga256x256((uint *)layer);
      }
    }
  }
  return;
}


// ==== clear @ 00003b90 ====

/* void __cdecl clear(unsigned int *) */

void __cdecl clear(uint *param_1)

{
  int iVar1;
  
  for (iVar1 = 0x10000; iVar1 != 0; iVar1 = iVar1 + -1) {
    *param_1 = 0;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== ilerand @ 00003ba0 ====

/* long __cdecl ilerand(long) */

long __cdecl ilerand(long param_1)

{
  uint uVar1;
  
  uVar1 = param_1 << 0xd ^ param_1;
  return (int)((uVar1 * uVar1 * 0x3d73 + 0xc0ae5) * (tempie + uVar1) + 0x5208dd0d) / 0x3047;
}


// ==== spline_inter @ 00003bf0 ====

/* float __cdecl spline_inter(float,float,float,float,float,float) */

float __cdecl
spline_inter(float param_1,float param_2,float param_3,float param_4,float param_5,float param_6)

{
  float fVar1;
  float fVar2;
  
  fVar1 = param_5 / param_6;
  fVar2 = (param_4 - param_3) - (param_1 - param_2);
  return (param_3 - param_1) * fVar1 +
         fVar1 * fVar1 * fVar1 * fVar2 + ((param_1 - param_2) - fVar2) * fVar1 * fVar1 + param_2;
}


// ==== vulmapjesub @ 00003c40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl vulmapjesub(float *,int,float) */

void __cdecl vulmapjesub(float *param_1,int param_2,float param_3)

{
  float *pfVar1;
  uint uVar2;
  uint uVar3;
  int iVar4;
  int iVar5;
  uint uVar6;
  float *pfVar7;
  float *pfVar8;
  float fVar9;
  float *local_1c;
  float *local_18;
  float *local_14;
  float *local_10;
  int local_c;
  
  pfVar1 = param_1;
  fVar9 = param_3 * (float)___real_8_3ff78000000000000000;
  local_14 = (float *)0x0;
  for (iVar4 = 0x10000; iVar4 != 0; iVar4 = iVar4 + -1) {
    *param_1 = 0.0;
    param_1 = param_1 + 1;
  }
  param_1 = (float *)0x0;
  param_3 = (float)pfVar1;
  do {
    iVar4 = 0;
    pfVar7 = (float *)param_3;
    do {
      iVar5 = (int)local_14 + 1;
      uVar2 = ilerand((long)local_14);
      iVar4 = iVar4 + param_2;
      *pfVar7 = (float)(uVar2 & 0xff) * fVar9;
      pfVar7 = pfVar7 + param_2;
      local_14 = (float *)iVar5;
    } while (iVar4 < 0x100);
    param_1 = (float *)((int)param_1 + param_2);
    param_3 = (float)((int)param_3 + param_2 * 0x400);
  } while ((int)param_1 < 0x100);
  iVar4 = 0;
  do {
    uVar2 = 0;
    do {
      if (uVar2 != 0) {
        uVar3 = 0x100U - param_2 & uVar2;
        uVar6 = uVar3 + param_2 & 0xff;
        fVar9 = spline_inter(pfVar1[(uVar3 - param_2 & 0xff) + iVar4],pfVar1[uVar3 + iVar4],
                             pfVar1[iVar4 + uVar6],pfVar1[(uVar6 + param_2 & 0xff) + iVar4],
                             (float)(int)(param_2 - 1U & uVar2),(float)param_2);
        pfVar1[iVar4 + uVar2] = fVar9;
      }
      uVar2 = uVar2 + 1;
    } while ((int)uVar2 < 0x100);
    iVar4 = iVar4 + param_2 * 0x100;
  } while (iVar4 < 0x10000);
  local_14 = pfVar1;
  param_1 = (float *)0x0;
  do {
    if (param_1 != (float *)0x0) {
      uVar2 = 0x100U - param_2 & (uint)param_1;
      uVar3 = uVar2 + param_2 & 0xff;
      local_1c = pfVar1 + uVar3 * 0x100;
      local_18 = pfVar1 + (uVar3 + param_2 & 0xff) * 0x100;
      local_10 = local_14;
      pfVar7 = pfVar1 + uVar2 * 0x100;
      pfVar8 = pfVar1 + (uVar2 - param_2 & 0xff) * 0x100;
      local_c = 0x100;
      do {
        fVar9 = spline_inter(*pfVar8,*pfVar7,*local_1c,*local_18,
                             (float)(int)(param_2 - 1U & (uint)param_1),(float)param_2);
        *local_10 = fVar9;
        local_1c = local_1c + 1;
        local_10 = local_10 + 1;
        pfVar8 = pfVar8 + 1;
        pfVar7 = pfVar7 + 1;
        local_18 = local_18 + 1;
        local_c = local_c + -1;
      } while (local_c != 0);
    }
    param_1 = (float *)((int)param_1 + 1);
    local_14 = local_14 + 0x100;
  } while ((int)param_1 < 0x100);
  return;
}


// ==== atg_subplasma @ 00003ec0 ====

/* void __cdecl atg_subplasma(int,int,int,int,int,int,int) */

void __cdecl
atg_subplasma(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6,int param_7)

{
  uint *puVar1;
  float *__ptr;
  int iVar2;
  byte bVar3;
  uint **ppuVar4;
  
  if (param_3 != 0) {
    tempie = ((param_4 << 8 | param_5) << 8 | param_6) << 8 | param_7;
    __ptr = _malloc(0x40000);
    vulmapjesub(__ptr,param_3,255.0);
    bVar3 = ('\x02' - (char)param_3) * '\b';
    param_4 = 0x10000;
    ppuVar4 = (&layer)[param_2];
    do {
      puVar1 = *ppuVar4;
      iVar2 = __ftol();
      if (iVar2 < 0x100) {
        if (iVar2 < 0) {
          iVar2 = 0;
        }
      }
      else {
        iVar2 = 0xff;
      }
      *ppuVar4 = (uint *)(iVar2 << (bVar3 & 0x1f) |
                         (uint)puVar1 & 0xffffffU - (0xff << (bVar3 & 0x1f)));
      param_4 = param_4 + -1;
      ppuVar4 = ppuVar4 + 1;
    } while (param_4 != 0);
    _free(__ptr);
  }
  return;
}


// ==== addmapje @ 00003fa0 ====

/* void __cdecl addmapje(unsigned int *,unsigned int *) */

void __cdecl addmapje(uint *param_1,uint *param_2)

{
  int iVar1;
  int iVar2;
  
  iVar1 = (int)param_2 - (int)param_1;
  iVar2 = 0x10000;
  do {
    *param_1 = *param_1 + *(int *)(iVar1 + (int)param_1);
    param_1 = param_1 + 1;
    iVar2 = iVar2 + -1;
  } while (iVar2 != 0);
  return;
}


// ==== vulmapjefrac @ 00003fd0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl vulmapjefrac(unsigned int *,int,float) */

void __cdecl vulmapjefrac(uint *param_1,int param_2,float param_3)

{
  uint *puVar1;
  int iVar2;
  int iVar3;
  int *piVar4;
  uint uVar5;
  uint *puVar6;
  uint uVar7;
  uint uVar8;
  uint *puVar9;
  int iVar10;
  int iVar11;
  uint uVar12;
  int **ppiVar13;
  float10 fVar14;
  float10 extraout_ST0;
  int local_10;
  int local_c;
  
  iVar2 = param_2;
  puVar1 = param_1;
  local_10 = 0;
  for (iVar10 = 0x10000; iVar10 != 0; iVar10 = iVar10 + -1) {
    *param_1 = 0;
    param_1 = param_1 + 1;
  }
  param_1 = (uint *)0x0;
  param_3 = (float)puVar1;
  do {
    iVar10 = 0;
    piVar4 = (int *)param_3;
    do {
      iVar11 = local_10 + 1;
      ilerand(local_10);
      iVar3 = __ftol();
      *piVar4 = iVar3 << 0x10;
      iVar10 = iVar10 + param_2;
      piVar4 = piVar4 + param_2;
      local_10 = iVar11;
    } while (iVar10 < 0x100);
    param_1 = (uint *)((int)param_1 + param_2);
    param_3 = (float)((int)param_3 + param_2 * 0x400);
  } while ((int)param_1 < 0x100);
  param_1 = (uint *)0x0;
  if (0 < param_2) {
    fVar14 = (float10)param_2;
    ppiVar13 = &costab;
    do {
      fcos(((float10)(int)param_1 * (float10)___real_8_4000c90fdb0000000000) / fVar14);
      piVar4 = (int *)__ftol();
      *ppiVar13 = piVar4;
      param_1 = (uint *)((int)param_1 + 1);
      ppiVar13 = ppiVar13 + 1;
      fVar14 = extraout_ST0;
    } while ((int)param_1 < param_2);
  }
  iVar3 = 0;
  uVar5 = 0x100 - param_2;
  iVar10 = param_2 * 0x100;
  puVar6 = puVar1;
  do {
    uVar12 = 0;
    param_2 = (int)puVar6;
    do {
      uVar7 = uVar5 & uVar12;
      uVar8 = iVar2 - 1U & uVar12;
      uVar12 = uVar12 + 1;
      *(uint *)param_2 =
           ((int)((puVar1[(uVar7 + iVar2 & 0xff) + iVar3] - puVar1[iVar3 + uVar7]) *
                 (int)(&costab)[uVar8]) >> 8) + puVar1[iVar3 + uVar7];
      param_2 = param_2 + 4;
    } while ((int)uVar12 < 0x100);
    iVar3 = iVar3 + iVar10;
    puVar6 = puVar6 + iVar2 * 0x100;
  } while (iVar3 < 0x10000);
  param_2 = (int)puVar1;
  param_1 = (uint *)0x0;
  do {
    if (param_1 != (uint *)0x0) {
      uVar12 = uVar5 & (uint)param_1;
      local_c = 0x100;
      puVar6 = puVar1 + (uVar12 + iVar2 & 0xff) * 0x100;
      puVar9 = puVar1 + uVar12 * 0x100;
      piVar4 = (int *)param_2;
      do {
        uVar12 = *puVar6;
        puVar6 = puVar6 + 1;
        *piVar4 = ((int)((uVar12 - *puVar9) * (int)(&costab)[iVar2 - 1U & (uint)param_1]) >> 8) +
                  *puVar9;
        local_c = local_c + -1;
        puVar9 = puVar9 + 1;
        piVar4 = piVar4 + 1;
      } while (local_c != 0);
    }
    param_1 = (uint *)((int)param_1 + 1);
    param_2 = param_2 + 0x400;
  } while ((int)param_1 < 0x100);
  return;
}


// ==== atg_fractalplasma @ 000041e0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_fractalplasma(int,int,int,int,int,int) */

void __cdecl
atg_fractalplasma(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6)

{
  uint **ppuVar1;
  int iVar2;
  byte bVar3;
  int iVar4;
  
  ppuVar1 = (&layer)[param_1];
  tempie = ((param_3 << 8 | param_4) << 8 | param_5) << 8 | param_6;
  bVar3 = ('\x02' - (char)param_2) * '\b';
  vulmapjefrac(templayer,0x80,128.0);
  iVar4 = 0x40;
  param_1 = 0x42800000;
  do {
    vulmapjefrac(templayer2,iVar4,(float)param_1);
    addmapje(templayer,templayer2);
    param_1 = (int)((float)param_1 * (float)___real_8_3ffe8000000000000000);
    iVar4 = iVar4 / 2;
  } while (0 < iVar4);
  iVar4 = 0;
  do {
    iVar2 = iVar4 + 4;
    *(uint *)(iVar4 + (int)ppuVar1) =
         (*(uint *)(iVar4 + (int)templayer) >> 0x10) << (bVar3 & 0x1f) |
         *(uint *)(iVar4 + (int)ppuVar1) & 0xffffffU - (0xff << (bVar3 & 0x1f));
    iVar4 = iVar2;
  } while (iVar2 < 0x40000);
  return;
}


// ==== atg_cells @ 000042d0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_cells(int,int,int,int,int,int,int,int) */

void __cdecl
atg_cells(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6,int param_7,
         int param_8)

{
  int iVar1;
  int *piVar2;
  uint uVar3;
  undefined4 *__ptr;
  undefined4 uVar4;
  int iVar5;
  uint uVar6;
  uint uVar7;
  byte bVar8;
  int iVar9;
  uint *puVar10;
  uint uVar11;
  undefined4 *puVar12;
  int iVar13;
  uint in_stack_00000024;
  int local_8;
  
  __ptr = _malloc(0x40000);
  local_8 = 0;
  puVar12 = __ptr;
  do {
    param_5 = 0;
    do {
      uVar4 = __ftol();
      *puVar12 = uVar4;
      param_5 = param_5 + 1;
      puVar12 = puVar12 + 1;
    } while (param_5 < 0x100);
    local_8 = local_8 + 1;
  } while (local_8 < 0x100);
  tempie = ((param_6 << 8 | param_7) << 8 | param_8) << 8 | in_stack_00000024;
  iVar13 = 0;
  do {
    iVar5 = iVar13 + 4;
    *(undefined4 *)(iVar13 + (int)templayer) = 0xff;
    iVar13 = iVar5;
  } while (iVar5 < 0x40000);
  iVar13 = 0;
  if (0 < param_4) {
    param_5 = param_4;
    do {
      iVar5 = iVar13 + 1;
      uVar6 = ilerand(iVar13);
      iVar13 = iVar13 + 2;
      uVar7 = ilerand(iVar5);
      iVar9 = 0;
      uVar11 = (uVar7 & 0xff) - 0x80;
      iVar5 = (uVar7 & 0xff) + 0x80;
      if ((int)uVar11 < iVar5) {
        uVar7 = (uVar6 & 0xff) - 0x80;
        iVar1 = (uVar6 & 0xff) + 0x80;
        do {
          if ((int)uVar7 < iVar1) {
            puVar10 = __ptr + iVar9;
            iVar9 = iVar9 + (iVar1 - uVar7);
            uVar6 = uVar7;
            do {
              uVar3 = *puVar10;
              puVar10 = puVar10 + 1;
              if (uVar3 < templayer[(uVar6 & 0xff) + (uVar11 & 0xff) * 0x100]) {
                templayer[(uVar6 & 0xff) + (uVar11 & 0xff) * 0x100] = uVar3;
              }
              uVar6 = uVar6 + 1;
            } while ((int)uVar6 < iVar1);
          }
          uVar11 = uVar11 + 1;
        } while ((int)uVar11 < iVar5);
      }
      param_5 = param_5 + -1;
    } while (param_5 != 0);
  }
  bVar8 = ('\x02' - (char)param_3) * '\b';
  iVar13 = 0;
  do {
    *(uint *)((int)(&layer)[param_2] + iVar13) =
         *(uint *)((int)(&layer)[param_2] + iVar13) & 0xffffffU - (0xff << (bVar8 & 0x1f));
    piVar2 = (int *)(iVar13 + (int)templayer);
    puVar10 = (uint *)((int)(&layer)[param_2] + iVar13);
    iVar13 = iVar13 + 4;
    *puVar10 = *puVar10 | *piVar2 << (bVar8 & 0x1f);
  } while (iVar13 < 0x40000);
  _free(__ptr);
  return;
}


// ==== atg_plasma @ 000044d0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_plasma(int,int,int,int,int,int) */

void __cdecl atg_plasma(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6)

{
  uint **ppuVar1;
  int iVar2;
  int iVar3;
  byte bVar4;
  uint uVar5;
  int iVar6;
  int iVar7;
  float10 fVar8;
  float10 fVar9;
  float10 extraout_ST1;
  
  fVar8 = (float10)param_3;
  ppuVar1 = (&layer)[param_1];
  bVar4 = (char)param_2 * -8 + 0x10;
  fVar9 = (float10)param_4;
  iVar7 = 0;
  param_2 = 0;
  do {
    iVar6 = 0;
    fsin((float10)(param_2 + param_6) * fVar9 * (float10)___real_8_3ff9c90fdb0000000000);
    iVar3 = iVar7;
    do {
      fsin((float10)(iVar6 + param_5) * fVar8 * (float10)___real_8_3ff9c90fdb0000000000);
      fVar8 = fVar9;
      iVar2 = __ftol();
      iVar7 = iVar3 + 1;
      iVar6 = iVar6 + 1;
      templayer[iVar3] = iVar2 << (bVar4 & 0x1f);
      iVar3 = iVar7;
      fVar9 = extraout_ST1;
    } while (iVar6 < 0x100);
    param_2 = param_2 + 1;
  } while (param_2 < 0x100);
  iVar7 = 0;
  do {
    iVar3 = iVar7 + 4;
    uVar5 = *(uint *)(iVar7 + (int)ppuVar1) & 0xffffffU - (0xff << (bVar4 & 0x1f));
    *(uint *)(iVar7 + (int)ppuVar1) = uVar5;
    *(uint *)(iVar7 + (int)ppuVar1) = *(uint *)(iVar7 + (int)templayer) | uVar5;
    iVar7 = iVar3;
  } while (iVar3 < 0x40000);
  return;
}


// ==== atg_envmap @ 000045c0 ====

/* void __cdecl atg_envmap(int,int,int,int) */

void __cdecl atg_envmap(int param_1,int param_2,int param_3,int param_4)

{
  uint ***pppuVar1;
  uint **ppuVar2;
  uint **ppuVar3;
  uint uVar4;
  byte bVar5;
  int iVar6;
  
  pppuVar1 = &layer + param_1;
  bVar5 = ('\x02' - (char)param_3) * '\b';
  param_1 = 0;
  ppuVar2 = *pppuVar1;
  do {
    iVar6 = 0;
    ppuVar3 = ppuVar2 + 0x100;
    do {
      uVar4 = __ftol();
      if ((int)uVar4 < 0) {
        uVar4 = 0;
      }
      else if (0xff < (int)uVar4) {
        uVar4 = 0xff;
      }
      if (param_2 == 0) {
        *ppuVar2 = (uint *)((uVar4 << 8 | uVar4) << 8 | uVar4);
      }
      else if (param_2 == 1) {
        *ppuVar2 = (uint *)((uint)*ppuVar2 & 0xffffffU - (0xff << (bVar5 & 0x1f)) |
                           uVar4 << (bVar5 & 0x1f));
      }
      ppuVar2 = ppuVar2 + 1;
      iVar6 = iVar6 + 1;
    } while (iVar6 < 0x100);
    param_1 = param_1 + 1;
    ppuVar2 = ppuVar3;
  } while (param_1 < 0x100);
  return;
}


// ==== atg_sinedistort @ 000046e0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_sinedistort(int,int,int,int,int,int,int) */

void __cdecl
atg_sinedistort(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6,int param_7)

{
  uint uVar1;
  float *pfVar2;
  int iVar3;
  int iVar4;
  uint *puVar5;
  uint **ppuVar6;
  float10 fVar7;
  float local_41c;
  int local_418;
  float local_414;
  float local_400 [256];
  
  ppuVar6 = (&layer)[param_1];
  iVar3 = 0;
  local_41c = 0.0;
  pfVar2 = local_400;
  do {
    fVar7 = (float10)(int)local_41c;
    local_41c = (float)((int)local_41c + 1);
    fVar7 = (float10)fcos((float10)param_3 * (fVar7 + (float10)param_7) *
                          (float10)___real_8_3ff9c90fdb0000000000);
    *pfVar2 = (float)((float10)param_5 * fVar7);
    pfVar2 = pfVar2 + 1;
  } while ((int)local_41c < 0x100);
  local_41c = 0.0;
  local_418 = 0;
  do {
    local_414 = 0.0;
    pfVar2 = local_400;
    iVar4 = 0x100;
    fVar7 = (float10)fsin(((float10)local_418 + (float10)param_6) * (float10)param_2 *
                          (float10)___real_8_3ff9c90fdb0000000000);
    do {
      uVar1 = atg_getpixel((uint *)ppuVar6,local_414 + (float)(fVar7 * (float10)param_4),
                           local_41c + *pfVar2);
      local_414 = local_414 + ___real_4_3fff8000000000000000;
      templayer[iVar3] = uVar1;
      iVar3 = iVar3 + 1;
      pfVar2 = pfVar2 + 1;
      iVar4 = iVar4 + -1;
    } while (iVar4 != 0);
    local_41c = local_41c + ___real_4_3fff8000000000000000;
    local_418 = local_418 + 1;
  } while (local_418 < 0x100);
  puVar5 = templayer;
  for (iVar3 = 0x10000; iVar3 != 0; iVar3 = iVar3 + -1) {
    *ppuVar6 = (uint *)*puVar5;
    puVar5 = puVar5 + 1;
    ppuVar6 = ppuVar6 + 1;
  }
  return;
}


// ==== atg_twirl @ 00004820 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_twirl(int,int) */

void __cdecl atg_twirl(int param_1,int param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  uint uVar4;
  int iVar5;
  uint *puVar6;
  uint **ppuVar7;
  float10 fVar8;
  float10 fVar9;
  float local_8;
  
  ppuVar7 = (&layer)[param_1];
  local_8 = -1.0;
  fVar2 = ((float)param_2 - (float)___real_8_4005ff00000000000000) *
          (float)___real_8_3ffa8000000000000000;
  if (fVar2 <= ___real_4_00000000000000000000) {
    local_8 = 1.0;
  }
  iVar5 = 0;
  param_2 = 0;
  do {
    param_1 = 0;
    fVar3 = (float)param_2 - (float)___real_8_4005ff00000000000000;
    do {
      fVar8 = (float10)param_1 - (float10)___real_8_4005ff00000000000000;
      fVar1 = (float)SQRT(fVar8 * fVar8 + (float10)(fVar3 * fVar3));
      fVar8 = (float10)fpatan(fVar8,(float10)fVar3);
      if ((float10)___real_4_00000000000000000000 <=
          (float10)___real_4_40068000000000000000 - (float10)fVar1) {
        fVar9 = (float10)fcos(((float10)___real_4_40068000000000000000 - (float10)fVar1) *
                              (float10)fVar2 * (float10)___real_4_3ff8c90fdb0000000000);
        fVar9 = fVar9 * (float10)___real_8_40068000000000000000 +
                (float10)___real_8_40068000000000000000;
      }
      else {
        fVar9 = (float10)___real_4_00000000000000000000;
      }
      fVar8 = (fVar9 * (float10)local_8 + fVar8 * (float10)___real_8_4004a2f9832237cda000) *
              (float10)___real_8_3ff9c90fdb0000000000;
      fVar9 = (float10)fcos(fVar8);
      fVar8 = (float10)fsin(fVar8);
      uVar4 = atg_getpixel((uint *)ppuVar7,
                           (float)(fVar8 * (float10)fVar1 + (float10)___real_8_40068000000000000000)
                           ,(float)(fVar9 * (float10)fVar1 + (float10)___real_8_40068000000000000000
                                   ));
      templayer[iVar5] = uVar4;
      iVar5 = iVar5 + 1;
      param_1 = param_1 + 1;
    } while (param_1 < 0x100);
    param_2 = param_2 + 1;
  } while (param_2 < 0x100);
  puVar6 = templayer;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *ppuVar7 = (uint *)*puVar6;
    puVar6 = puVar6 + 1;
    ppuVar7 = ppuVar7 + 1;
  }
  return;
}


// ==== atg_offset @ 00004960 ====

/* void __cdecl atg_offset(int,int,int) */

void __cdecl atg_offset(int param_1,int param_2,int param_3)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  uint *puVar4;
  uint **ppuVar5;
  
  ppuVar5 = (&layer)[param_1];
  param_1 = 0;
  do {
    iVar2 = 0;
    iVar3 = param_1 << 10;
    do {
      uVar1 = iVar2 + param_2;
      iVar2 = iVar2 + 1;
      *(uint **)(iVar3 + (int)templayer) =
           ppuVar5[(uVar1 & 0xff) + (param_3 + param_1 & 0xffU) * 0x100];
      iVar3 = iVar3 + 4;
    } while (iVar2 < 0x100);
    param_1 = param_1 + 1;
  } while (param_1 < 0x100);
  puVar4 = templayer;
  for (iVar3 = 0x10000; iVar3 != 0; iVar3 = iVar3 + -1) {
    *ppuVar5 = (uint *)*puVar4;
    puVar4 = puVar4 + 1;
    ppuVar5 = ppuVar5 + 1;
  }
  return;
}


// ==== atg_bump @ 000049e0 ====

/* void __cdecl atg_bump(int,int) */

void __cdecl atg_bump(int param_1,int param_2)

{
  uint *puVar1;
  uint uVar2;
  int iVar3;
  uint uVar4;
  int iVar5;
  uint *puVar6;
  uint **ppuVar7;
  
  ppuVar7 = (&layer)[param_1];
  iVar5 = 0;
  do {
    puVar6 = ppuVar7[param_2 * 0x101 + iVar5 & 0xffff];
    puVar1 = ppuVar7[iVar5];
    iVar3 = ((uint)puVar6 >> 0x10 & 0xff) - ((uint)puVar1 >> 0x10 & 0xff);
    uVar4 = ((uint)puVar6 >> 8 & 0xff) - ((uint)puVar1 >> 8 & 0xff);
    uVar2 = ((uint)puVar6 & 0xff) - ((uint)puVar1 & 0xff);
    if (iVar3 < 0) {
      iVar3 = 0;
    }
    if ((int)uVar4 < 0) {
      uVar4 = 0;
    }
    if ((int)uVar2 < 0) {
      uVar2 = 0;
    }
    templayer[iVar5] = (iVar3 << 8 | uVar4) << 8 | uVar2;
    iVar5 = iVar5 + 1;
  } while (iVar5 < 0x10000);
  puVar6 = templayer;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *ppuVar7 = (uint *)*puVar6;
    puVar6 = puVar6 + 1;
    ppuVar7 = ppuVar7 + 1;
  }
  return;
}


// ==== atg_mapdistort @ 00004a90 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_mapdistort(int,int,int,int,int,int,int) */

void __cdecl
atg_mapdistort(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6,int param_7)

{
  uint **ppuVar1;
  uint **ppuVar2;
  float fVar3;
  float fVar4;
  uint uVar5;
  int iVar6;
  uint **ppuVar7;
  uint *puVar8;
  uint **ppuVar9;
  
  ppuVar9 = (&layer)[param_1];
  ppuVar1 = (&layer)[param_2];
  ppuVar2 = (&layer)[param_5];
  fVar3 = (float)___real_8_3ff78000000000000000;
  fVar4 = (float)___real_8_3ff78000000000000000;
  iVar6 = 0;
  param_1 = 0;
  do {
    param_2 = 0;
    ppuVar7 = ppuVar2 + iVar6;
    do {
      uVar5 = atg_getpixel((uint *)ppuVar9,
                           (float)(*(uint *)(((int)ppuVar1 - (int)ppuVar2) + (int)ppuVar7) >>
                                   ((char)param_3 * -8 + 0x10U & 0x1f) & 0xff) *
                           (float)param_4 * fVar3 + (float)param_2,
                           (float)((uint)*ppuVar7 >> ((char)param_6 * -8 + 0x10U & 0x1f) & 0xff) *
                           (float)param_7 * fVar4 + (float)param_1);
      ppuVar7 = ppuVar7 + 1;
      templayer[iVar6] = uVar5;
      iVar6 = iVar6 + 1;
      param_2 = param_2 + 1;
    } while (param_2 < 0x100);
    param_1 = param_1 + 1;
  } while (param_1 < 0x100);
  puVar8 = templayer;
  for (iVar6 = 0x10000; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppuVar9 = (uint *)*puVar8;
    puVar8 = puVar8 + 1;
    ppuVar9 = ppuVar9 + 1;
  }
  return;
}


// ==== atg_exchange @ 00004bf0 ====

/* void __cdecl atg_exchange(int,int,int,int) */

void __cdecl atg_exchange(int param_1,int param_2,int param_3,int param_4)

{
  uint *puVar1;
  uint **ppuVar2;
  byte bVar3;
  byte bVar4;
  int iVar5;
  int iVar6;
  uint uVar7;
  uint *puVar8;
  
  ppuVar2 = (&layer)[param_1];
  bVar3 = (char)param_2 * -8 + 0x10;
  bVar4 = (char)param_4 * -8 + 0x10;
  iVar6 = 0;
  do {
    iVar5 = iVar6 + 4;
    *(uint *)(iVar6 + (int)templayer) =
         (*(uint *)((int)(&layer)[param_3] + iVar6) >> (bVar4 & 0x1f) & 0xff) << (bVar3 & 0x1f);
    iVar6 = iVar5;
  } while (iVar5 < 0x40000);
  iVar6 = 0;
  do {
    iVar5 = iVar6 + 4;
    *(uint *)(iVar6 + (int)templayer2) =
         (*(uint *)(iVar6 + (int)ppuVar2) >> (bVar3 & 0x1f) & 0xff) << (bVar4 & 0x1f);
    iVar6 = iVar5;
  } while (iVar5 < 0x40000);
  iVar6 = 0;
  do {
    iVar5 = iVar6 + 4;
    uVar7 = *(uint *)(iVar6 + (int)ppuVar2) & 0xffffffU - (0xff << (bVar3 & 0x1f));
    *(uint *)(iVar6 + (int)ppuVar2) = uVar7;
    *(uint *)(iVar6 + (int)ppuVar2) = *(uint *)(iVar6 + (int)templayer) | uVar7;
    iVar6 = iVar5;
  } while (iVar5 < 0x40000);
  iVar6 = 0;
  do {
    *(uint *)((int)(&layer)[param_3] + iVar6) =
         *(uint *)((int)(&layer)[param_3] + iVar6) & 0xffffffU - (0xff << (bVar4 & 0x1f));
    puVar8 = (uint *)((int)(&layer)[param_3] + iVar6);
    puVar1 = (uint *)(iVar6 + (int)templayer2);
    iVar6 = iVar6 + 4;
    *puVar8 = *puVar8 | *puVar1;
  } while (iVar6 < 0x40000);
  return;
}


// ==== atg_torgb @ 00004d10 ====

/* void __cdecl atg_torgb(int,int) */

void __cdecl atg_torgb(int param_1,int param_2)

{
  uint uVar1;
  uint **ppuVar2;
  int iVar3;
  
  iVar3 = 0x10000;
  ppuVar2 = (&layer)[param_1];
  do {
    uVar1 = (uint)*ppuVar2 >> ((char)param_2 * -8 + 0x10U & 0x1f) & 0xff;
    iVar3 = iVar3 + -1;
    *ppuVar2 = (uint *)((uVar1 << 8 | uVar1) << 8 | uVar1);
    ppuVar2 = ppuVar2 + 1;
  } while (iVar3 != 0);
  return;
}


// ==== atg_shade @ 00004d60 ====

/* void __cdecl atg_shade(int,int,int) */

void __cdecl atg_shade(int param_1,int param_2,int param_3)

{
  uint **ppuVar1;
  uint **ppuVar2;
  uint *puVar3;
  int iVar4;
  uint **ppuVar5;
  
  ppuVar1 = (&layer)[param_1];
  ppuVar2 = (&layer)[param_2];
  param_1 = 0x10000;
  ppuVar5 = ppuVar1;
  do {
    puVar3 = *ppuVar5;
    iVar4 = (*(uint *)(((int)ppuVar2 - (int)ppuVar1) + (int)ppuVar5) >>
             ((char)param_3 * -8 + 0x10U & 0x1f) & 0xff) * 0x100;
    *ppuVar5 = (uint *)(uint)CONCAT21(CONCAT11(ads_fadetab[((uint)puVar3 >> 0x10 & 0xff) + iVar4],
                                               ads_fadetab[((uint)puVar3 >> 8 & 0xff) + iVar4]),
                                      ads_fadetab[((uint)puVar3 & 0xff) + iVar4]);
    param_1 = param_1 + -1;
    ppuVar5 = ppuVar5 + 1;
  } while (param_1 != 0);
  return;
}


// ==== atg_copylayer @ 00004e00 ====

/* void __cdecl atg_copylayer(int,int,int,int) */

void __cdecl atg_copylayer(int param_1,int param_2,int param_3,int param_4)

{
  uint **ppuVar1;
  byte bVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  
  ppuVar1 = (&layer)[param_1];
  bVar2 = (char)param_2 * -8 + 0x10;
  iVar4 = 0;
  do {
    iVar3 = iVar4 + 4;
    *(uint *)(iVar4 + (int)templayer) =
         (*(uint *)(iVar4 + (int)(&layer)[param_3 & 0xff]) >> ((char)param_4 * -8 + 0x10U & 0x1f) &
         0xff) << (bVar2 & 0x1f);
    iVar4 = iVar3;
  } while (iVar3 < 0x40000);
  iVar4 = 0;
  do {
    iVar3 = iVar4 + 4;
    uVar5 = *(uint *)(iVar4 + (int)ppuVar1) & 0xffffffU - (0xff << (bVar2 & 0x1f));
    *(uint *)(iVar4 + (int)ppuVar1) = uVar5;
    *(uint *)(iVar4 + (int)ppuVar1) = *(uint *)(iVar4 + (int)templayer) | uVar5;
    iVar4 = iVar3;
  } while (iVar3 < 0x40000);
  return;
}


// ==== atg_mix @ 00004ec0 ====

/* void __cdecl atg_mix(int,int,int) */

void __cdecl atg_mix(int param_1,int param_2,int param_3)

{
  uchar *puVar1;
  uint **ppuVar2;
  byte *pbVar3;
  uint **ppuVar4;
  uint uVar5;
  int iVar6;
  uint **ppuVar7;
  byte *pbVar8;
  
  puVar1 = ads_fadetab;
  ppuVar2 = (&layer)[param_1];
  ppuVar7 = (&layer)[param_2];
  uVar5 = param_3 & 0xfffffffe;
  iVar6 = uVar5 * -0x80 + 0x7f00;
  param_1 = 0x10000;
  ppuVar4 = ppuVar2;
  do {
    *(uchar *)ppuVar4 =
         puVar1[(uint)*(byte *)ppuVar7 + iVar6] + puVar1[(uint)*(byte *)ppuVar2 + uVar5 * 0x80];
    pbVar3 = (byte *)((int)ppuVar2 + 2);
    pbVar8 = (byte *)((int)ppuVar7 + 2);
    *(uchar *)((int)ppuVar4 + 1) =
         puVar1[(uint)*(byte *)((int)ppuVar7 + 1) + iVar6] +
         puVar1[(uint)*(byte *)((int)ppuVar2 + 1) + uVar5 * 0x80];
    ppuVar2 = ppuVar2 + 1;
    ppuVar7 = ppuVar7 + 1;
    *(uchar *)((int)ppuVar4 + 2) =
         puVar1[(uint)*pbVar8 + iVar6] + puVar1[(uint)*pbVar3 + uVar5 * 0x80];
    param_1 = param_1 + -1;
    ppuVar4 = ppuVar4 + 1;
  } while (param_1 != 0);
  return;
}


// ==== atg_mul @ 00004f60 ====

/* void __cdecl atg_mul(int,int) */

void __cdecl atg_mul(int param_1,int param_2)

{
  uint **ppuVar1;
  uint **ppuVar2;
  uint *puVar3;
  uint uVar4;
  uint **ppuVar5;
  
  ppuVar1 = (&layer)[param_1];
  ppuVar2 = (&layer)[param_2];
  param_1 = 0x10000;
  ppuVar5 = ppuVar1;
  do {
    puVar3 = *ppuVar5;
    uVar4 = *(uint *)(((int)ppuVar2 - (int)ppuVar1) + (int)ppuVar5);
    *ppuVar5 = (uint *)(((int)((uVar4 >> 8 & 0xff) * ((uint)puVar3 >> 8 & 0xff)) >> 8 |
                        (((int)uVar4 >> 0x10) * ((int)puVar3 >> 0x10) >> 8) << 8) << 8 |
                       (int)((uVar4 & 0xff) * ((uint)puVar3 & 0xff)) >> 8);
    param_1 = param_1 + -1;
    ppuVar5 = ppuVar5 + 1;
  } while (param_1 != 0);
  return;
}


// ==== atg_invert @ 00004fe0 ====

/* void __cdecl atg_invert(int) */

void __cdecl atg_invert(int param_1)

{
  int iVar1;
  uint **ppuVar2;
  
  ppuVar2 = (&layer)[param_1];
  iVar1 = 0x10000;
  do {
    *(byte *)ppuVar2 = *(byte *)ppuVar2 ^ 0xff;
    ppuVar2 = ppuVar2 + 1;
    iVar1 = iVar1 + -1;
  } while (iVar1 != 0);
  return;
}


// ==== atg_contrast @ 00005010 ====

/* void __cdecl atg_contrast(int,int) */

void __cdecl atg_contrast(int param_1,int param_2)

{
  int iVar1;
  int iVar2;
  int iVar3;
  uint **ppuVar4;
  
  ppuVar4 = (&layer)[param_1];
  param_1 = 0x10000;
  do {
    iVar1 = __ftol();
    iVar2 = __ftol();
    iVar3 = __ftol();
    if (0x7f < iVar1) {
      iVar1 = 0x7f;
    }
    if (0x7f < iVar2) {
      iVar2 = 0x7f;
    }
    if (0x7f < iVar3) {
      iVar3 = 0x7f;
    }
    if (iVar1 < -0x7f) {
      iVar1 = -0x7f;
    }
    if (iVar2 < -0x7f) {
      iVar2 = -0x7f;
    }
    if (iVar3 < -0x7f) {
      iVar3 = -0x7f;
    }
    *ppuVar4 = (uint *)((iVar2 + 0x80) * 0x100 | (iVar1 + 0x80) * 0x10000 | iVar3 + 0x80U);
    ppuVar4 = ppuVar4 + 1;
    param_1 = param_1 + -1;
  } while (param_1 != 0);
  return;
}


// ==== atg_brightness @ 00005110 ====

/* void __cdecl atg_brightness(int,int) */

void __cdecl atg_brightness(int param_1,int param_2)

{
  uint *puVar1;
  int iVar2;
  int iVar3;
  uint **ppuVar4;
  
  iVar2 = 0x10000;
  iVar3 = param_2 * 0x100;
  ppuVar4 = (&layer)[param_1];
  do {
    puVar1 = *ppuVar4;
    iVar2 = iVar2 + -1;
    *ppuVar4 = (uint *)(uint)CONCAT21(CONCAT11(ads_fadetab[iVar3 + ((uint)puVar1 >> 0x10 & 0xff)],
                                               ads_fadetab[iVar3 + ((uint)puVar1 >> 8 & 0xff)]),
                                      ads_fadetab[iVar3 + ((uint)puVar1 & 0xff)]);
    ppuVar4 = ppuVar4 + 1;
  } while (iVar2 != 0);
  return;
}


// ==== atg_sinecolor @ 00005170 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_sinecolor(int,int,int) */

void __cdecl atg_sinecolor(int param_1,int param_2,int param_3)

{
  uint ***pppuVar1;
  uint *puVar2;
  int iVar3;
  byte bVar4;
  uint **ppuVar5;
  float10 fVar6;
  float10 extraout_ST0;
  
  bVar4 = (char)param_2 * -8 + 0x10;
  pppuVar1 = &layer + param_1;
  param_1 = 0x10000;
  fVar6 = (float10)param_3 * (float10)___real_8_4001c90fdb0000000000 *
          (float10)___real_8_3ff78000000000000000;
  ppuVar5 = *pppuVar1;
  do {
    puVar2 = *ppuVar5;
    fcos((float10)((uint)puVar2 >> (bVar4 & 0x1f) & 0xff) * fVar6);
    iVar3 = __ftol();
    *ppuVar5 = (uint *)((uint)puVar2 & 0xffffffU - (0xff << (bVar4 & 0x1f)) |
                       iVar3 << (bVar4 & 0x1f));
    param_1 = param_1 + -1;
    ppuVar5 = ppuVar5 + 1;
    fVar6 = extraout_ST0;
  } while (param_1 != 0);
  return;
}


// ==== atg_scalecolor @ 00005210 ====

/* void __cdecl atg_scalecolor(int,int,int,int) */

void __cdecl atg_scalecolor(int param_1,int param_2,int param_3,int param_4)

{
  uint *puVar1;
  int iVar2;
  byte bVar3;
  uint **ppuVar4;
  
  bVar3 = (char)param_2 * -8 + 0x10;
  param_3 = 0x10000;
  ppuVar4 = (&layer)[param_1];
  do {
    puVar1 = *ppuVar4;
    iVar2 = __ftol();
    *ppuVar4 = (uint *)(iVar2 << (bVar3 & 0x1f) |
                       (uint)puVar1 & 0xffffffU - (0xff << (bVar3 & 0x1f)));
    param_3 = param_3 + -1;
    ppuVar4 = ppuVar4 + 1;
  } while (param_3 != 0);
  return;
}


// ==== atg_loadbitmap @ 000052c0 ====

/* void __cdecl atg_loadbitmap(int,unsigned char *,int,int) */

void __cdecl atg_loadbitmap(int param_1,uchar *param_2,int param_3,int param_4)

{
  uint **ppuVar1;
  uint **ppuVar2;
  int iVar3;
  byte bVar4;
  uint *puVar5;
  int iVar6;
  int iVar7;
  
  ppuVar1 = (&layer)[param_1];
  iVar3 = 0;
  iVar7 = 0;
  do {
    ppuVar2 = ppuVar1 + iVar3;
    iVar6 = 8;
    bVar4 = param_2[iVar7];
    do {
      puVar5 = (uint *)param_3;
      if ((bVar4 & 1) != 0) {
        puVar5 = (uint *)param_4;
      }
      *ppuVar2 = puVar5;
      iVar3 = iVar3 + 1;
      ppuVar2 = ppuVar2 + 1;
      bVar4 = bVar4 >> 1;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
    iVar7 = iVar7 + 1;
  } while (iVar7 < 0x2000);
  return;
}


// ==== atg_blur @ 00005310 ====

/* void __cdecl atg_blur(int,int) */

void __cdecl atg_blur(int param_1,int param_2)

{
  uint **ppuVar1;
  uint *puVar2;
  uint *puVar3;
  uint *puVar4;
  uint *puVar5;
  bool bVar6;
  uint **ppuVar7;
  uint **ppuVar8;
  int iVar9;
  uint uVar10;
  uint *puVar11;
  uint **ppuVar12;
  int local_2c;
  int local_20;
  uint local_10;
  int local_c;
  
  ppuVar1 = (&layer)[param_1];
  if (0 < param_2) {
    local_c = param_2;
    do {
      local_20 = 0;
      local_10 = 1;
      local_2c = 0;
      ppuVar12 = ppuVar1;
      do {
        ppuVar8 = ppuVar1 + (local_10 - 2 & 0xff) * 0x100;
        ppuVar7 = ppuVar1 + (local_10 & 0xff) * 0x100;
        uVar10 = 1;
        do {
          puVar11 = *ppuVar8;
          puVar2 = *ppuVar7;
          puVar3 = ppuVar1[(uVar10 - 2 & 0xff) + local_2c];
          puVar4 = ppuVar1[(uVar10 & 0xff) + local_2c];
          puVar5 = *ppuVar12;
          templayer[local_20] =
               (((int)(((uint)puVar4 >> 0x10 & 0xff) + ((uint)puVar5 >> 0x10 & 0xff) * 4 +
                       ((uint)puVar11 >> 0x10 & 0xff) + ((uint)puVar3 >> 0x10 & 0xff) +
                      ((uint)puVar2 >> 0x10 & 0xff)) >> 3) << 8 |
               (int)(((uint)puVar4 >> 8 & 0xff) + ((uint)puVar5 >> 8 & 0xff) * 4 +
                     ((uint)puVar11 >> 8 & 0xff) + ((uint)puVar3 >> 8 & 0xff) +
                    ((uint)puVar2 >> 8 & 0xff)) >> 3) << 8 |
               (int)(((uint)puVar4 & 0xff) + ((uint)puVar5 & 0xff) * 4 + ((uint)puVar11 & 0xff) +
                     ((uint)puVar3 & 0xff) + ((uint)puVar2 & 0xff)) >> 3;
          local_20 = local_20 + 1;
          ppuVar8 = ppuVar8 + 1;
          ppuVar7 = ppuVar7 + 1;
          ppuVar12 = ppuVar12 + 1;
          bVar6 = (int)uVar10 < 0x100;
          uVar10 = uVar10 + 1;
        } while (bVar6);
        local_2c = local_2c + 0x100;
        bVar6 = (int)local_10 < 0x100;
        local_10 = local_10 + 1;
      } while (bVar6);
      local_c = local_c + -1;
      puVar11 = templayer;
      ppuVar12 = ppuVar1;
      for (iVar9 = 0x10000; iVar9 != 0; iVar9 = iVar9 + -1) {
        *ppuVar12 = (uint *)*puVar11;
        puVar11 = puVar11 + 1;
        ppuVar12 = ppuVar12 + 1;
      }
    } while (local_c != 0);
  }
  return;
}


// ==== atg_dirblur @ 000054e0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_dirblur(int,int,int,int) */

void __cdecl atg_dirblur(int param_1,int param_2,int param_3,int param_4)

{
  uint **ppuVar1;
  uint uVar2;
  uint uVar3;
  int iVar4;
  uint *puVar5;
  uint **ppuVar6;
  float10 fVar7;
  int local_18;
  int local_14;
  
  ppuVar1 = (&layer)[param_2];
  ppuVar6 = (&layer)[param_1];
  local_14 = 0;
  local_18 = 0;
  do {
    param_2 = 0;
    do {
      fVar7 = (float10)((uint)ppuVar1[local_14] >> (('\x02' - (char)param_3) * '\b' & 0x1fU) & 0xff)
              * (float10)___real_8_3ff9c90fdb0000000000;
      fsin(fVar7);
      fcos(fVar7);
      iVar4 = param_4;
      if (0 < param_4) {
        do {
          __ftol();
          __ftol();
          iVar4 = iVar4 + -1;
        } while (iVar4 != 0);
      }
      iVar4 = __ftol();
      uVar2 = __ftol();
      uVar3 = __ftol();
      templayer[local_14] = (iVar4 << 8 | uVar2) << 8 | uVar3;
      local_14 = local_14 + 1;
      param_2 = param_2 + 1;
    } while (param_2 < 0x100);
    local_18 = local_18 + 1;
  } while (local_18 < 0x100);
  puVar5 = templayer;
  for (iVar4 = 0x10000; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppuVar6 = (uint *)*puVar5;
    puVar5 = puVar5 + 1;
    ppuVar6 = ppuVar6 + 1;
  }
  atg_blur(param_1,2);
  return;
}


// ==== atg_add @ 00005690 ====

/* void __cdecl atg_add(int,int) */

void __cdecl atg_add(int param_1,int param_2)

{
  uint **ppuVar1;
  uint **ppuVar2;
  uint *puVar3;
  uint uVar4;
  uint uVar5;
  int iVar6;
  uint **ppuVar7;
  
  ppuVar1 = (&layer)[param_1];
  ppuVar2 = (&layer)[param_2];
  param_1 = 0x10000;
  ppuVar7 = ppuVar1;
  do {
    puVar3 = *ppuVar7;
    uVar4 = *(uint *)((int)ppuVar7 + ((int)ppuVar2 - (int)ppuVar1));
    iVar6 = ((int)uVar4 >> 0x10) + ((int)puVar3 >> 0x10);
    uVar5 = (uVar4 >> 8 & 0xff) + ((uint)puVar3 >> 8 & 0xff);
    uVar4 = (uVar4 & 0xff) + ((uint)puVar3 & 0xff);
    if (0xff < iVar6) {
      iVar6 = 0xff;
    }
    if (0xff < uVar5) {
      uVar5 = 0xff;
    }
    if (0xff < uVar4) {
      uVar4 = 0xff;
    }
    *ppuVar7 = (uint *)((iVar6 << 8 | uVar5) << 8 | uVar4);
    param_1 = param_1 + -1;
    ppuVar7 = ppuVar7 + 1;
  } while (param_1 != 0);
  return;
}


// ==== atg_max @ 00005730 ====

/* void __cdecl atg_max(int,int) */

void __cdecl atg_max(int param_1,int param_2)

{
  uint *puVar1;
  uint uVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  uint uVar7;
  uint **ppuVar8;
  
  ppuVar8 = (&layer)[param_1];
  iVar4 = (int)(&layer)[param_2] - (int)ppuVar8;
  param_1 = 0x10000;
  do {
    puVar1 = *ppuVar8;
    uVar2 = *(uint *)(iVar4 + (int)ppuVar8);
    uVar5 = (uint)puVar1 >> 0x10 & 0xff;
    uVar6 = (uint)puVar1 >> 8 & 0xff;
    uVar7 = uVar2 >> 0x10 & 0xff;
    uVar3 = uVar2 >> 8 & 0xff;
    if (uVar7 < uVar5) {
      uVar7 = uVar5;
    }
    if (uVar3 < uVar6) {
      uVar3 = uVar6;
    }
    uVar5 = uVar2 & 0xff;
    if ((uVar2 & 0xff) < ((uint)puVar1 & 0xff)) {
      uVar5 = (uint)puVar1 & 0xff;
    }
    *ppuVar8 = (uint *)((uVar7 << 8 | uVar3) << 8 | uVar5);
    ppuVar8 = ppuVar8 + 1;
    param_1 = param_1 + -1;
  } while (param_1 != 0);
  return;
}


// ==== hsv_to_rgb @ 000057d0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* unsigned int __cdecl hsv_to_rgb(float,float,float) */

uint __cdecl hsv_to_rgb(float param_1,float param_2,float param_3)

{
  undefined4 uVar1;
  int iVar2;
  uint uVar3;
  uint uVar4;
  undefined4 unaff_ESI;
  undefined4 unaff_EDI;
  undefined8 uVar5;
  
  if (param_2 != (float)___real_8_00000000000000000000) {
    if ((float)___real_8_4007b400000000000000 <= param_1) {
      do {
        param_1 = param_1 - (float)___real_8_4007b400000000000000;
      } while ((float)___real_8_4007b400000000000000 <= param_1);
    }
    if (param_1 < (float)___real_8_00000000000000000000) {
      do {
        param_1 = param_1 + (float)___real_8_4007b400000000000000;
      } while (param_1 < (float)___real_8_00000000000000000000);
    }
    _floor((double)(param_1 * (float)___real_8_3ff98888888888888800));
    uVar1 = __ftol();
    switch(uVar1) {
    case 0:
      break;
    case 1:
      break;
    case 2:
      break;
    case 3:
      break;
    case 4:
      break;
    case 5:
    }
  }
  uVar5 = CONCAT44(unaff_ESI,unaff_EDI);
  iVar2 = __ftol();
  uVar3 = __ftol(uVar5);
  uVar4 = __ftol();
  if (0xff < iVar2) {
    iVar2 = 0xff;
  }
  if (0xff < (int)uVar3) {
    uVar3 = 0xff;
  }
  if (0xff < (int)uVar4) {
    uVar4 = 0xff;
  }
  return (iVar2 << 8 | uVar3) << 8 | uVar4;
}


// ==== rgb_to_hsv @ 000059b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl rgb_to_hsv(float,float,float,float *,float *,float *) */

void __cdecl
rgb_to_hsv(float param_1,float param_2,float param_3,float *param_4,float *param_5,float *param_6)

{
  float fVar1;
  float fVar2;
  float fVar3;
  
  fVar2 = param_2;
  if (param_2 < param_1) {
    fVar2 = param_1;
  }
  if (fVar2 < param_3) {
    fVar2 = param_3;
  }
  fVar1 = param_2;
  if (param_1 < param_2) {
    fVar1 = param_1;
  }
  if (param_3 < fVar1) {
    fVar1 = param_3;
  }
  *param_6 = fVar2;
  fVar3 = (float)___real_8_00000000000000000000;
  *param_5 = 0.0;
  if (fVar2 != fVar3) {
    *param_5 = (fVar2 - fVar1) / fVar2;
  }
  if (*param_5 == (float)___real_8_00000000000000000000) {
    *param_4 = -1.0;
    return;
  }
  fVar1 = fVar2 - fVar1;
  if (param_1 == fVar2) {
    fVar1 = ((fVar2 - param_3) - (fVar2 - param_2)) / fVar1;
  }
  else if (param_2 == fVar2) {
    fVar1 = ((fVar2 - param_1) - (fVar2 - param_3)) / fVar1 + (float)___real_8_40008000000000000000;
  }
  else {
    if (param_3 != fVar2) goto LAB_00005ae4;
    fVar1 = ((fVar2 - param_2) - (fVar2 - param_1)) / fVar1 + (float)___real_8_40018000000000000000;
  }
  *param_4 = fVar1;
LAB_00005ae4:
  fVar2 = *param_4;
  fVar1 = (float)___real_8_4004f000000000000000;
  *param_4 = fVar2 * fVar1;
  if (fVar2 * fVar1 < (float)___real_8_00000000000000000000) {
    do {
      fVar2 = *param_4;
      fVar1 = (float)___real_8_4007b400000000000000;
      *param_4 = fVar2 + fVar1;
    } while (fVar2 + fVar1 < (float)___real_8_00000000000000000000);
  }
  if ((float)___real_8_4007b400000000000000 <= *param_4) {
    do {
      fVar2 = *param_4;
      fVar1 = (float)___real_8_4007b400000000000000;
      *param_4 = fVar2 - fVar1;
    } while ((float)___real_8_4007b400000000000000 <= fVar2 - fVar1);
  }
  return;
}


// ==== atg_hsv @ 00005b40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */
/* void __cdecl atg_hsv(int,int,int) */

void __cdecl atg_hsv(int param_1,int param_2,int param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  uint *puVar5;
  uint **ppuVar6;
  int iVar7;
  float local_4;
  
  fVar2 = (float)param_2;
  ppuVar6 = (&layer)[param_1];
  fVar1 = (float)___real_8_3fffb400000000000000;
  param_1 = 0xff - param_3;
  iVar7 = 0x10000;
  fVar4 = (float)param_1;
  fVar3 = (float)___real_8_3ff78080808080808000;
  do {
    puVar5 = *ppuVar6;
    param_3 = (uint)puVar5 >> 0x10 & 0xff;
    rgb_to_hsv((float)param_3,(float)((uint)puVar5 >> 8 & 0xff),(float)((uint)puVar5 & 0xff),
               (float *)&param_2,(float *)&param_1,&local_4);
    param_2 = (int)((float)param_2 + fVar2 * fVar1);
    param_1 = (int)((float)param_1 * fVar4 * fVar3);
    puVar5 = (uint *)hsv_to_rgb((float)param_2,(float)param_1,local_4);
    *ppuVar6 = puVar5;
    ppuVar6 = ppuVar6 + 1;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  return;
}


// ==== atg_colorize @ 00005c20 ====

/* void __cdecl atg_colorize(int,int,int,int,int,int,int,int) */

void __cdecl
atg_colorize(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6,int param_7,
            int param_8)

{
  uint *puVar1;
  int iVar2;
  uint uVar3;
  uint uVar4;
  uint *puVar5;
  int iVar6;
  uint local_400 [256];
  
  iVar6 = 0;
  puVar5 = local_400;
  do {
    iVar2 = __ftol();
    uVar3 = __ftol();
    uVar4 = __ftol();
    iVar6 = iVar6 + 1;
    *puVar5 = (iVar2 << 8 | uVar3) << 8 | uVar4;
    puVar5 = puVar5 + 1;
  } while (iVar6 < 0x100);
  iVar6 = 0;
  do {
    puVar5 = (uint *)((int)(&layer)[param_1] + iVar6);
    puVar1 = (uint *)((int)(&layer)[param_1] + iVar6);
    iVar6 = iVar6 + 4;
    *puVar1 = local_400[*puVar5 >> (('\x02' - (char)param_2) * '\b' & 0x1fU) & 0xff];
  } while (iVar6 < 0x40000);
  return;
}


// ==== atg_mixmap @ 00005d40 ====

/* void __cdecl atg_mixmap(int,int,int,int) */

void __cdecl atg_mixmap(int param_1,int param_2,int param_3,int param_4)

{
  int iVar1;
  uint uVar2;
  uint uVar3;
  uint **ppuVar4;
  
  ppuVar4 = (&layer)[param_1];
  param_3 = 0x10000;
  do {
    iVar1 = __ftol();
    uVar2 = __ftol();
    uVar3 = __ftol();
    *ppuVar4 = (uint *)((iVar1 << 8 | uVar2) << 8 | uVar3);
    ppuVar4 = ppuVar4 + 1;
    param_3 = param_3 + -1;
  } while (param_3 != 0);
  return;
}


// ==== atg_emboss @ 00005e70 ====

/* void __cdecl atg_emboss(int) */

void __cdecl atg_emboss(int param_1)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  uint *puVar6;
  uint **ppuVar7;
  char local_20 [4];
  int local_1c;
  int local_18;
  int local_14;
  int local_10;
  int local_c;
  int local_8;
  uint **local_4;
  
  local_20[0] = -1;
  local_20[1] = 0;
  local_20[2] = 1;
  local_18 = 0;
  local_8 = 0;
  do {
    local_1c = 0;
    local_c = 1;
    do {
      iVar2 = 0;
      local_14 = 0;
      iVar3 = 0;
      local_10 = 0;
      local_4 = (&layer)[param_1];
      do {
        uVar1 = local_1c - 1;
        do {
          iVar4 = (int)local_20[uVar1 + local_c];
          puVar6 = (&layer)[param_1][(uVar1 & 0xff) + (local_18 + -1 + local_10 & 0xffU) * 0x100];
          iVar3 = iVar3 + ((uint)puVar6 >> 0x10) * iVar4;
          iVar2 = iVar2 + ((uint)puVar6 >> 8 & 0xff) * iVar4;
          local_14 = local_14 + ((uint)puVar6 & 0xff) * iVar4;
          uVar1 = uVar1 + 1;
        } while ((int)(local_c + uVar1) < 3);
        local_10 = local_10 + 1;
      } while (local_10 < 3);
      iVar3 = iVar3 + 0x80;
      uVar1 = iVar2 + 0x80;
      uVar5 = local_14 + 0x80;
      if (0xff < iVar3) {
        iVar3 = 0xff;
      }
      if (0xff < (int)uVar1) {
        uVar1 = 0xff;
      }
      if (0xff < (int)uVar5) {
        uVar5 = 0xff;
      }
      if (iVar3 < 0) {
        iVar3 = 0;
      }
      if ((int)uVar1 < 0) {
        uVar1 = 0;
      }
      if ((int)uVar5 < 0) {
        uVar5 = 0;
      }
      iVar2 = local_8 + local_1c;
      local_c = local_c + -1;
      local_1c = local_1c + 1;
      templayer[iVar2] = (iVar3 << 8 | uVar1) << 8 | uVar5;
    } while (-0xff < local_c);
    local_8 = local_8 + 0x100;
    local_18 = local_18 + 1;
  } while (local_8 < 0x10000);
  puVar6 = templayer;
  ppuVar7 = (&layer)[param_1];
  for (iVar2 = 0x10000; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppuVar7 = (uint *)*puVar6;
    puVar6 = puVar6 + 1;
    ppuVar7 = ppuVar7 + 1;
  }
  return;
}


