// ==== FUN_004010c0 @ 004010c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_004010c0(int param_1,undefined4 param_2,undefined4 param_3,int param_4,undefined4 param_5)

{
  bool bVar1;
  float10 fVar2;
  float10 fVar3;
  double dVar4;
  double dVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  float fVar9;
  int iVar10;
  int iVar11;
  int iVar12;
  int iVar13;
  int iVar14;
  int iVar15;
  float10 fVar16;
  float10 fVar17;
  float10 fVar18;
  float10 fVar19;
  float10 fVar20;
  float10 fVar21;
  float10 fVar22;
  float10 fVar23;
  int local_14;
  int local_10;
  
  iVar10 = param_1;
  dVar4 = (double)CONCAT44(param_5,param_4);
  fVar2 = (float10)_DAT_0041a360;
  dVar5 = (double)CONCAT44(param_5,param_4);
  fVar3 = (float10)_DAT_0041a358;
  *(undefined4 *)(param_1 + 0x28) = 1000;
  *(undefined4 *)(param_1 + 0x34) = 0;
  param_1 = 0;
  iVar11 = 0;
  local_14 = -0xb4;
  do {
    param_4 = 0;
    fVar16 = (float10)fcos(((float10)param_1 * (float10)_DAT_0041a350 + (float10)dVar4 * fVar2) *
                           (float10)_DAT_0041a348);
    fVar17 = (float10)fsin(((float10)param_1 * (float10)_DAT_0041a340 + (float10)dVar5 * fVar3) *
                           (float10)_DAT_0041a338);
    fVar18 = (fVar17 + fVar16) * (float10)_DAT_0041a330;
    fVar17 = fVar18 * (float10)_DAT_0041a328;
    fVar19 = (float10)fsin(fVar17);
    fVar16 = (float10)_DAT_0041a320;
    fVar20 = (float10)fcos(fVar17);
    fVar17 = (float10)_DAT_0041a320;
    iVar12 = iVar11;
    do {
      iVar14 = param_4 + 1;
      iVar11 = iVar12 + 0xc;
      fVar21 = (float10)fsin(((float10)param_4 + fVar18) * (float10)_DAT_0041a318);
      fVar22 = (ABS(fVar21) + (float10)_DAT_0041a310) * (float10)_DAT_0041a308;
      fVar21 = (float10)_DAT_0041a300;
      fVar23 = (float10)fsin((float10)param_4 * fVar21);
      *(float *)(iVar12 + *(int *)(iVar10 + 0x24)) =
           (float)(fVar23 * fVar22 * (float10)_DAT_0041a2f8 + (float10)(double)(fVar19 * fVar16));
      fVar21 = (float10)fcos((float10)param_4 * fVar21);
      *(float *)(iVar12 + 4 + *(int *)(iVar10 + 0x24)) =
           (float)(fVar21 * fVar22 * (float10)_DAT_0041a2f8 + fVar20 * fVar17);
      *(float *)(iVar12 + 8 + *(int *)(iVar10 + 0x24)) = (float)local_14;
      iVar12 = iVar11;
      param_4 = iVar14;
    } while (iVar14 < 0x28);
    local_14 = local_14 + 0xf;
    param_1 = param_1 + 1;
  } while (local_14 < 0xc3);
  local_10 = 0;
  param_1 = 0;
  do {
    iVar12 = param_1 + 1;
    fVar6 = (float)param_1 * _DAT_0041a2f0;
    fVar7 = (float)iVar12 * _DAT_0041a2f0;
    param_4 = 1;
    iVar14 = (iVar12 % 0x19) * 0x28;
    iVar11 = local_10;
    param_1 = iVar14;
    do {
      *(int *)(*(int *)(iVar10 + 0x34) * 0x30 + *(int *)(iVar10 + 0x30)) = iVar11;
      *(int *)(*(int *)(iVar10 + 0x34) * 0x30 + 4 + *(int *)(iVar10 + 0x30)) =
           local_10 + param_4 % 0x28;
      iVar15 = param_4 % 0x28 + iVar14;
      *(int *)(*(int *)(iVar10 + 0x34) * 0x30 + 8 + *(int *)(iVar10 + 0x30)) = iVar15;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x10 + *(int *)(iVar10 + 0x30)) = fVar6;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x18 + *(int *)(iVar10 + 0x30)) = fVar6;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x20 + *(int *)(iVar10 + 0x30)) = fVar7;
      fVar8 = (float)(param_4 + -1) * _DAT_0041a2f0;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x14 + *(int *)(iVar10 + 0x30)) = fVar8;
      fVar9 = (float)param_4 * _DAT_0041a2f0;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x1c + *(int *)(iVar10 + 0x30)) = fVar9;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x24 + *(int *)(iVar10 + 0x30)) = fVar9;
      iVar13 = *(int *)(iVar10 + 0x34) + 1;
      *(int *)(iVar10 + 0x34) = iVar13;
      *(int *)(iVar13 * 0x30 + *(int *)(iVar10 + 0x30)) = iVar11;
      *(int *)(*(int *)(iVar10 + 0x34) * 0x30 + 4 + *(int *)(iVar10 + 0x30)) = iVar15;
      *(int *)(*(int *)(iVar10 + 0x34) * 0x30 + 8 + *(int *)(iVar10 + 0x30)) = param_1;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x10 + *(int *)(iVar10 + 0x30)) = fVar6;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x18 + *(int *)(iVar10 + 0x30)) = fVar7;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x20 + *(int *)(iVar10 + 0x30)) = fVar7;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x14 + *(int *)(iVar10 + 0x30)) = fVar8;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x1c + *(int *)(iVar10 + 0x30)) = fVar9;
      *(float *)(*(int *)(iVar10 + 0x34) * 0x30 + 0x24 + *(int *)(iVar10 + 0x30)) = fVar8;
      iVar11 = iVar11 + 1;
      param_1 = param_1 + 1;
      *(int *)(iVar10 + 0x34) = *(int *)(iVar10 + 0x34) + 1;
      bVar1 = param_4 < 0x28;
      param_4 = param_4 + 1;
    } while (bVar1);
    param_1 = iVar12;
    local_10 = iVar11;
  } while (iVar11 < 0x3c0);
  return;
}


// ==== FUN_00401490 @ 00401490 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_00401490(int param_1)

{
  undefined4 *puVar1;
  undefined4 uVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  ulonglong uVar8;
  int local_1c;
  undefined4 *local_18;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00418e8b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  iVar7 = 0;
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    local_18 = (undefined4 *)0x0;
  }
  else {
    local_18 = FUN_004163c0(puVar1);
  }
  local_4 = 0xffffffff;
  uVar2 = FUN_00417400(0x1e,3000.0,DAT_0041d944);
  FUN_004164b0(local_18,uVar2);
  puVar1 = FUN_00417140(0xd,5500.0,DAT_0041d96c);
  FUN_004164b0(local_18,puVar1);
  iVar5 = 0;
  iVar4 = *(int *)local_18[2];
  *(undefined1 *)(iVar4 + 0x44) = 1;
  *(undefined4 *)(iVar4 + 0x4c) = DAT_0041d938;
  if (0 < *(int *)(iVar4 + 0x34)) {
    iVar6 = 0;
    do {
      iVar3 = *(int *)(iVar4 + 0x30) + iVar6;
      iVar5 = iVar5 + 1;
      iVar6 = iVar6 + 0x30;
      *(float *)(iVar3 + 0x10) = *(float *)(iVar3 + 0x10) * _DAT_0041a378;
      *(float *)(iVar3 + 0x14) = *(float *)(iVar3 + 0x14) * _DAT_0041a378;
      *(float *)(iVar3 + 0x18) = *(float *)(iVar3 + 0x18) * _DAT_0041a378;
      *(float *)(iVar3 + 0x1c) = *(float *)(iVar3 + 0x1c) * _DAT_0041a378;
      *(float *)(iVar3 + 0x20) = *(float *)(iVar3 + 0x20) * _DAT_0041a378;
      *(float *)(iVar3 + 0x24) = *(float *)(iVar3 + 0x24) * _DAT_0041a378;
      *(float *)(iVar3 + 0x28) = *(float *)(iVar3 + 0x28) * _DAT_0041a378;
      *(float *)(iVar3 + 0x2c) = *(float *)(iVar3 + 0x2c) * _DAT_0041a378;
    } while (iVar5 < *(int *)(iVar4 + 0x34));
  }
  if (0 < *(int *)(iVar4 + 0x28)) {
    local_1c = 0;
    do {
      iVar6 = local_1c + *(int *)(iVar4 + 0x24);
      iVar5 = ftol();
      if (iVar5 < 400) {
        iVar5 = iVar5 / 2;
      }
      iVar3 = iVar5 / 3;
      uVar8 = FUN_004119a0(-(iVar5 >> 0x1f),iVar3);
      iVar7 = iVar7 + 1;
      local_1c = local_1c + 0xc;
      *(float *)(iVar6 + 4) =
           (float)((int)((longlong)
                         ((ulonglong)(uint)((int)uVar8 >> 0x1f) << 0x20 | uVar8 & 0xffffffff) %
                        (longlong)(iVar3 / 2 + 1)) + iVar3 * 2);
    } while (iVar7 < *(int *)(iVar4 + 0x28));
  }
  iVar5 = 0;
  iVar7 = *(int *)(local_18[2] + 4);
  iVar4 = *(int *)(iVar7 + 0x34);
  *(undefined1 *)(iVar7 + 0x45) = 1;
  if (0 < iVar4) {
    iVar6 = 0;
    do {
      iVar4 = *(int *)(iVar7 + 0x30) + iVar6;
      iVar5 = iVar5 + 1;
      iVar6 = iVar6 + 0x30;
      *(float *)(iVar4 + 0x10) = *(float *)(iVar4 + 0x10) * _DAT_0041a374;
      *(float *)(iVar4 + 0x14) = *(float *)(iVar4 + 0x14) * _DAT_0041a374;
      *(float *)(iVar4 + 0x18) = *(float *)(iVar4 + 0x18) * _DAT_0041a374;
      *(float *)(iVar4 + 0x1c) = *(float *)(iVar4 + 0x1c) * _DAT_0041a374;
      *(float *)(iVar4 + 0x20) = *(float *)(iVar4 + 0x20) * _DAT_0041a374;
      *(float *)(iVar4 + 0x24) = *(float *)(iVar4 + 0x24) * _DAT_0041a374;
      *(float *)(iVar4 + 0x28) = *(float *)(iVar4 + 0x28) * _DAT_0041a374;
      *(float *)(iVar4 + 0x2c) = *(float *)(iVar4 + 0x2c) * _DAT_0041a374;
    } while (iVar5 < *(int *)(iVar7 + 0x34));
  }
  *(undefined4 **)(param_1 + 4) = local_18;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)iVar4 >> 8),1);
}


// ==== FUN_004017e0 @ 004017e0 ====

undefined4 __fastcall FUN_004017e0(int param_1)

{
  size_t sVar1;
  char *_Str;
  size_t *psVar2;
  char *local_40c;
  char *local_408;
  undefined *local_404;
  char *local_400;
  char *local_3fc;
  char *local_3f8;
  undefined *local_3f4;
  char *local_3f0;
  char *local_3ec;
  char *local_3e8;
  undefined *local_3e4;
  char *local_3e0;
  char *local_3dc;
  char *local_3d8;
  char *local_3d4;
  char *local_3d0;
  char *local_3cc;
  undefined4 local_3c8;
  void *local_c;
  char **local_8;
  
  local_40c = s_The_Aardbei_Machine_marches_on_0041d0d8;
  local_408 = s_Greeting_the_following_cookie_th_0041d0b0;
  local_404 = &DAT_0041d5e8;
  local_400 = s_3state_0041d0a8;
  local_3fc = s_domage_0041d0a0;
  local_3f8 = s_haujobb_0041d098;
  local_3f4 = &DAT_0041d094;
  local_3f0 = s_infuse_project_0041d084;
  local_3ec = s_nosferatu_0041d078;
  local_3e8 = s_nostalgia_0041d06c;
  local_3e4 = &DAT_0041d064;
  local_3e0 = s_replay_0041d05c;
  local_3dc = s_sub97_0041d054;
  local_3d8 = s_the_black_lotus_0041d044;
  local_3d4 = s_total_eclipse_0041d034;
  local_3d0 = s_tpolm_0041d02c;
  local_3cc = s_twilight_0041d020;
  local_3c8 = 0;
  FUN_004126b0(1,0x10,'\0',0);
  local_c = operator_new(0x8000);
  _Str = s_The_Aardbei_Machine_marches_on_0041d0d8;
  local_8 = &local_40c;
  psVar2 = (size_t *)(param_1 + 0x404);
  do {
    RtlZeroMemory(local_c,0x8000);
    FUN_00412700(_Str,(int)local_c,0,0,0x200,0x10,'\0');
    sVar1 = FUN_00412300();
    psVar2[-0x100] = sVar1;
    sVar1 = strlen(_Str);
    local_8 = local_8 + 1;
    *psVar2 = sVar1;
    psVar2 = psVar2 + 1;
    _Str = *local_8;
  } while (_Str != (LPCSTR)0x0);
  return CONCAT31((int3)((uint)local_8 >> 8),1);
}


// ==== FUN_0040192c @ 0040192c ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040192c(void *this,float param_1,float param_2)

{
  float fVar1;
  float fVar2;
  
  glBegin(7,this);
  glTexCoord2f(0,0x3f800000);
  glVertex2f(_DAT_0041a3b8,param_2);
  glTexCoord2f(param_1,0x3f800000);
  fVar2 = param_1 + _DAT_0041a3b8;
  glVertex2f(fVar2,param_2);
  glTexCoord2f(param_1,0);
  fVar1 = param_2 + _DAT_0041a3b4;
  glVertex2f(fVar2,fVar1);
  glTexCoord2f(0,0);
  glVertex2f(_DAT_0041a3b8,fVar1);
  glEnd();
  return;
}


// ==== FUN_004019eb @ 004019eb ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_004019eb(void *this,uint param_1)

{
  uint uVar1;
  void *this_00;
  int *piVar2;
  
  uVar1 = param_1;
  FUN_00412410();
  glEnable(0xbe2);
  glBlendFunc(1,1);
  param_1 = 0;
  uVar1 = uVar1 / 600;
  piVar2 = (int *)((int)this + 0x404);
  do {
    if (0 < (int)uVar1) {
      FUN_004123f0(piVar2[-0x100]);
      FUN_0040192c(this_00,(float)(int)uVar1 * _DAT_0041a3bc,
                   (float)_DAT_0041a3c0 - (float)(int)param_1 * (float)_DAT_0041a3c8);
    }
    uVar1 = uVar1 - *piVar2;
    param_1 = param_1 + 1;
    piVar2 = piVar2 + 1;
  } while ((int)param_1 < 0x11);
  FUN_00412480();
  return;
}


// ==== FUN_00401a80 @ 00401a80 ====

undefined4 __fastcall FUN_00401a80(int param_1)

{
  undefined4 *puVar1;
  int iVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00418eab;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_004163c0(puVar1);
  }
  *(undefined4 **)(param_1 + 4) = puVar1;
  local_4 = 0xffffffff;
  puVar1 = FUN_00417140(0x23,100.0,DAT_0041d938);
  *(undefined1 *)(puVar1 + 0x11) = 1;
  puVar1[0x13] = DAT_0041d938;
  *(undefined1 *)((int)puVar1 + 0x46) = 1;
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  DAT_0041d5ec = operator_new(puVar1[10] * 0xc);
  iVar3 = 0;
  if (0 < (int)puVar1[10]) {
    iVar2 = 0;
    do {
      puVar4 = (undefined4 *)(iVar2 + puVar1[9]);
      puVar5 = (undefined4 *)((int)DAT_0041d5ec + iVar2);
      iVar3 = iVar3 + 1;
      iVar2 = iVar2 + 0xc;
      *puVar5 = *puVar4;
      puVar5[1] = puVar4[1];
      puVar5[2] = puVar4[2];
    } while (iVar3 < (int)puVar1[10]);
    ExceptionList = local_c;
    return CONCAT31((int3)((uint)iVar2 >> 8),1);
  }
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)puVar1[10] >> 8),1);
}


// ==== FUN_00401ca0 @ 00401ca0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00401ca0(int *param_1,byte param_2,byte param_3)

{
  double dVar1;
  double dVar2;
  double dVar3;
  double dVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  float10 fVar9;
  float10 fVar10;
  float10 fVar11;
  int local_50;
  
  dVar3 = (double)param_2 * _DAT_0041a460;
  local_50 = 0x80;
  dVar4 = (double)param_3 * _DAT_0041a458;
  do {
    iVar8 = 0;
    do {
      fVar9 = (float10)(iVar8 + -0x80);
      fVar10 = SQRT(fVar9 * fVar9 + (float10)((double)local_50 * (double)local_50)) *
               (float10)_DAT_0041a450;
      dVar1 = (double)fVar10;
      fVar11 = (float10)1.4426950408889634 * -(fVar10 * (float10)dVar1 * (float10)dVar4);
      fVar10 = ROUND(fVar11);
      fVar11 = (float10)f2xm1(fVar11 - fVar10);
      fscale((float10)1 + fVar11,fVar10);
      fVar9 = (float10)fpatan(fVar9,(float10)local_50);
      dVar2 = (double)((fVar9 + (float10)_DAT_0041a448) * (float10)_DAT_0041a440);
      FUN_00401ef0(SUB84(dVar2,0),(int)((ulonglong)dVar2 >> 0x20));
      _CIfmod();
      _CIpow();
      fVar10 = (float10)1.4426950408889634 * -((float10)dVar1 * (float10)dVar3);
      fVar9 = ROUND(fVar10);
      fVar10 = (float10)f2xm1(fVar10 - fVar9);
      fscale((float10)1 + fVar10,fVar9);
      iVar5 = ftol();
      iVar6 = ftol();
      iVar7 = ftol();
      iVar8 = iVar8 + 1;
      *param_1 = (iVar5 * 0x100 + iVar6) * 0x100 + iVar7;
      param_1 = param_1 + 1;
    } while (iVar8 < 0x100);
    local_50 = local_50 + -1;
  } while (-0x80 < local_50);
  return;
}


// ==== FUN_00401ef0 @ 00401ef0 ====

float10 __cdecl FUN_00401ef0(undefined4 param_1,undefined4 param_2)

{
  int iVar1;
  float10 fVar2;
  float10 fVar3;
  
  floor((double)CONCAT44(param_2,param_1));
  iVar1 = ftol();
  fVar2 = FUN_00401f40(iVar1);
  fVar3 = FUN_00401f40(iVar1 + 1);
  return ((float10)(double)CONCAT44(param_2,param_1) - (float10)iVar1) *
         (fVar3 - (float10)(double)fVar2) + (float10)(double)fVar2;
}


// ==== FUN_00401f40 @ 00401f40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __cdecl FUN_00401f40(int param_1)

{
  uint uVar1;
  
  uVar1 = param_1 * 0x47 ^ param_1 * 0x8e000;
  return (float10)_DAT_0041a310 -
         (float10)((uVar1 * uVar1 * 0x3d73 + 0xc0ae5) * uVar1 + 0xd208dd0d & 0x7fffffff) *
         (float10)_DAT_0041a468;
}


// ==== FUN_00401f90 @ 00401f90 ====

void __cdecl FUN_00401f90(undefined4 *param_1,int param_2,int param_3)

{
  undefined4 *puVar1;
  int iVar2;
  uint uVar3;
  int iVar4;
  int iVar5;
  uint uVar6;
  int iVar7;
  undefined4 *puVar8;
  int iVar9;
  int local_18;
  int local_14;
  uint *local_10;
  int local_c;
  
  local_c = param_3;
  uVar6 = param_2 * param_3;
  puVar1 = operator_new(uVar6 * 4);
  if (0 < param_3) {
    param_3 = 0;
    do {
      local_18 = 0;
      if (0 < param_2) {
        local_14 = -4;
        local_10 = (uint *)((int)puVar1 + param_3);
        do {
          uVar3 = 0;
          iVar2 = local_18 + -1;
          iVar9 = 3;
          iVar5 = local_14;
          do {
            iVar4 = iVar2;
            iVar7 = iVar5;
            if (iVar2 < 0) {
              iVar4 = iVar2 + param_2;
              iVar7 = iVar5 + param_2 * 4;
            }
            if (param_2 <= iVar4) {
              iVar7 = iVar7 + param_2 * -4;
            }
            iVar5 = iVar5 + 4;
            uVar3 = uVar3 + *(byte *)(iVar7 + param_3 + 2 + (int)param_1);
            iVar2 = iVar2 + 1;
            iVar9 = iVar9 + -1;
          } while (iVar9 != 0);
          uVar3 = uVar3 >> 2;
          *local_10 = ((uVar3 << 8 | uVar3) << 8 | uVar3) << 8 | uVar3;
          local_18 = local_18 + 1;
          local_14 = local_14 + 4;
          local_10 = local_10 + 1;
        } while (local_18 < param_2);
      }
      param_3 = param_3 + param_2 * 4;
      local_c = local_c + -1;
    } while (local_c != 0);
  }
  puVar8 = puVar1;
  for (uVar6 = uVar6 & 0x3fffffff; uVar6 != 0; uVar6 = uVar6 - 1) {
    *param_1 = *puVar8;
    puVar8 = puVar8 + 1;
    param_1 = param_1 + 1;
  }
  for (iVar5 = 0; iVar5 != 0; iVar5 = iVar5 + -1) {
    *(undefined1 *)param_1 = *(undefined1 *)puVar8;
    puVar8 = (undefined4 *)((int)puVar8 + 1);
    param_1 = (undefined4 *)((int)param_1 + 1);
  }
  operator_delete(puVar1);
  return;
}


// ==== FUN_004021f0 @ 004021f0 ====

void __thiscall FUN_004021f0(void *this,uint param_1)

{
  int iVar1;
  
  iVar1 = FUN_004119d0();
  *(int *)((int)this + (param_1 & 0xffff) * 4 + 0x804) = iVar1;
  return;
}


// ==== FUN_004025c0 @ 004025c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_004025c0(int param_1)

{
  undefined4 *puVar1;
  void *this;
  int iVar2;
  int iVar3;
  int iVar4;
  int *piVar5;
  int *piVar6;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00418ed6;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_004163c0(puVar1);
  }
  local_4 = 0xffffffff;
  *(undefined4 **)(param_1 + 4) = puVar1;
  this = operator_new(0x5c);
  local_4 = 1;
  if (this == (void *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_00416770(this,0,0,0);
  }
  local_4 = 0xffffffff;
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x45) = 2;
  *(undefined4 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x40) = 0x20;
  DAT_00481efc = &LAB_00402750;
  iVar3 = 0;
  do {
    iVar2 = rand();
    *(float *)((int)&DAT_0041d730 + iVar3) = (float)(iVar2 % 1000 + -500) * (float)_DAT_0041a420;
    iVar2 = rand();
    iVar4 = iVar3 + 4;
    *(float *)((int)&DAT_0041d830 + iVar3) = (float)(iVar2 % 1000 + -500) * (float)_DAT_0041a420;
    iVar3 = iVar4;
  } while (iVar4 < 0x100);
  piVar5 = &DAT_0041d5f4;
  do {
    iVar3 = rand();
    piVar5[-1] = iVar3 % 0xf0;
    iVar3 = rand();
    *piVar5 = iVar3 % 0xf0;
    iVar3 = rand();
    piVar5[1] = (int)((float)(iVar3 % 1000) * (float)_DAT_0041a4a8 + (float)_DAT_0041a308);
    iVar3 = rand();
    piVar6 = piVar5 + 4;
    piVar5[2] = (int)((float)(iVar3 % 1000) * (float)_DAT_0041a4a8 + (float)_DAT_0041a308);
    piVar5 = piVar6;
  } while ((int)piVar6 < 0x41d734);
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)(iVar3 / 1000) >> 8),1);
}


// ==== FUN_00402a90 @ 00402a90 ====

undefined4 __fastcall FUN_00402a90(int param_1)

{
  undefined4 *puVar1;
  void *this;
  undefined4 uVar2;
  undefined4 *this_00;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  uVar2 = DAT_0041d948;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00418ef6;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  this_00 = (undefined4 *)0x0;
  local_4 = 0;
  if (puVar1 != (undefined4 *)0x0) {
    this_00 = FUN_004163c0(puVar1);
  }
  local_4 = 0xffffffff;
  this = operator_new(0x5c);
  local_4 = 1;
  if (this == (void *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_00416770(this,4000,8000,uVar2);
  }
  local_4 = 0xffffffff;
  uVar2 = FUN_004164b0(this_00,puVar1);
  puVar1[0x10] = 4;
  *(undefined1 *)(puVar1 + 0x11) = 2;
  *(undefined1 *)((int)puVar1 + 0x45) = 1;
  *(undefined4 **)(param_1 + 4) = this_00;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar2 >> 8),1);
}


// ==== FUN_00402b50 @ 00402b50 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00402b50(int param_1,undefined4 param_2,undefined4 param_3,double param_4)

{
  bool bVar1;
  float10 fVar2;
  float10 fVar3;
  float10 fVar4;
  float10 fVar5;
  float10 fVar6;
  int iVar7;
  int iVar8;
  int iVar9;
  int iVar10;
  int iVar11;
  int iVar12;
  float10 fVar13;
  float10 fVar14;
  float10 fVar15;
  float10 fVar16;
  float10 fVar17;
  float10 fVar18;
  float10 fVar19;
  float10 fVar20;
  float10 fVar21;
  float10 fVar22;
  float10 fVar23;
  float10 fVar24;
  float10 fVar25;
  undefined4 local_4c;
  undefined4 local_48;
  undefined4 local_44;
  
  fVar13 = (float10)fsin((float10)param_4 * (float10)_DAT_0041a430);
  iVar8 = 0;
  *(undefined4 *)(param_1 + 0x28) = 0x4e2;
  *(undefined4 *)(param_1 + 0x34) = 0;
  local_44 = 0;
  local_48 = 4;
  local_4c = 6;
  fVar2 = (float10)_DAT_0041a450;
  fVar14 = (float10)fcos((float10)param_4 * (float10)_DAT_0041a308);
  fVar3 = (float10)_DAT_0041a308;
  do {
    iVar12 = local_44;
    iVar7 = local_4c;
    fVar15 = (float10)fsin((float10)local_48 * (float10)_DAT_0041a348);
    fVar4 = (float10)_DAT_0041a538;
    fVar16 = (float10)(local_44 + -1) * (float10)_DAT_0041a348;
    fVar17 = (float10)fcos(fVar16);
    fVar5 = (float10)_DAT_0041a538;
    fVar18 = (float10)local_4c;
    local_4c = 0;
    fVar19 = (float10)fcos(fVar18 * (float10)_DAT_0041a348);
    fVar6 = (float10)_DAT_0041a530;
    fVar18 = (float10)fcos((float10)local_48 * (float10)_DAT_0041a348);
    fVar16 = (float10)fsin(fVar16);
    fVar18 = (float10)fpatan(fVar18 * (float10)_DAT_0041a538,fVar16 * (float10)_DAT_0041a528);
    fVar16 = (float10)local_44;
    local_44 = 0;
    fVar20 = (float10)fsin((fVar16 + (float10)param_4) * (float10)_DAT_0041a518);
    fVar20 = fVar20 * (float10)(double)(fVar14 * fVar3);
    fVar16 = (float10)_DAT_0041a510;
    fVar21 = (float10)fsin(fVar18 + (float10)_DAT_0041a520);
    fVar22 = (float10)fcos(fVar18 + (float10)_DAT_0041a520);
    fVar18 = (float10)_DAT_0041a390;
    iVar9 = iVar8;
    do {
      fVar23 = (float10)local_44;
      local_44 = local_44 + 6;
      iVar8 = iVar9 + 0xc;
      fVar23 = (float10)fsin(fVar23 * (float10)_DAT_0041a508);
      fVar24 = fVar23 * fVar13 * fVar2 + (float10)_DAT_0041a500;
      fVar23 = (float10)_DAT_0041a508;
      fVar25 = (float10)fsin((float10)local_4c * fVar23);
      fVar25 = fVar25 * fVar24 * (float10)_DAT_0041a2f8 * (float10)(double)(fVar20 + fVar16);
      *(float *)(iVar9 + *(int *)(param_1 + 0x24)) =
           (float)((float10)(double)fVar21 * fVar25 + (float10)(double)(fVar15 * fVar4));
      *(float *)(iVar9 + 4 + *(int *)(param_1 + 0x24)) =
           (float)(fVar22 * fVar25 + (float10)(double)(fVar17 * fVar5));
      fVar23 = (float10)fcos((float10)local_4c * fVar23);
      *(float *)(iVar9 + 8 + *(int *)(param_1 + 0x24)) =
           (float)(fVar23 * fVar24 * (float10)_DAT_0041a2f8 * ((float10)(double)fVar20 + fVar18) +
                  (float10)(double)(fVar19 * fVar6));
      local_4c = local_4c + 1;
      iVar9 = iVar8;
    } while (local_44 < 0x96);
    local_4c = iVar7 + 3;
    local_44 = iVar12 + 1;
    local_48 = local_48 + 2;
  } while (local_4c < 0x9c);
  iVar8 = 0;
  local_48 = 0;
  do {
    iVar8 = iVar8 + 1;
    iVar7 = (iVar8 % 0x32) * 0x19;
    iVar12 = local_48;
    iVar9 = 1;
    local_44 = iVar7;
    do {
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + *(int *)(param_1 + 0x30)) = iVar12;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 4 + *(int *)(param_1 + 0x30)) =
           iVar9 % 0x19 + local_48;
      iVar10 = iVar7 + iVar9 % 0x19;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 8 + *(int *)(param_1 + 0x30)) = iVar10;
      iVar11 = *(int *)(param_1 + 0x34) + 1;
      *(int *)(param_1 + 0x34) = iVar11;
      *(int *)(iVar11 * 0x30 + *(int *)(param_1 + 0x30)) = iVar12;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 4 + *(int *)(param_1 + 0x30)) = iVar10;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 8 + *(int *)(param_1 + 0x30)) = local_44;
      iVar12 = iVar12 + 1;
      local_44 = local_44 + 1;
      *(int *)(param_1 + 0x34) = *(int *)(param_1 + 0x34) + 1;
      bVar1 = iVar9 < 0x19;
      iVar9 = iVar9 + 1;
    } while (bVar1);
    local_48 = iVar12;
  } while (iVar12 < 0x4e2);
  return;
}


// ==== FUN_00402ec0 @ 00402ec0 ====

undefined4 __fastcall FUN_00402ec0(int param_1)

{
  undefined4 *puVar1;
  void *this;
  undefined4 uVar2;
  undefined4 *this_00;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  uVar2 = DAT_0041d948;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00418f16;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  this_00 = (undefined4 *)0x0;
  local_4 = 0;
  if (puVar1 != (undefined4 *)0x0) {
    this_00 = FUN_004163c0(puVar1);
  }
  local_4 = 0xffffffff;
  this = operator_new(0x5c);
  local_4 = 1;
  if (this == (void *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_00416770(this,1000,2000,uVar2);
  }
  local_4 = 0xffffffff;
  FUN_004164b0(this_00,puVar1);
  puVar1[0x14] = 0x43480000;
  puVar1[0x15] = 0x3f0000;
  uVar2 = FUN_004166d0(this_00,0.0,0.0,0.0,420.0,0xffffff);
  *(undefined1 *)(this_00 + 4) = 1;
  *(undefined4 **)(param_1 + 4) = this_00;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar2 >> 8),1);
}


// ==== FUN_00402f90 @ 00402f90 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00402f90(double *param_1,double *param_2,undefined4 *param_3,double param_4)

{
  float10 fVar1;
  float10 fVar2;
  float10 fVar3;
  
  fVar1 = (float10)param_4;
  fVar2 = (float10)fcos((fVar1 + fVar1) * (float10)_DAT_0041a570 * (float10)_DAT_0041a590);
  fVar3 = (float10)fsin((float10)_DAT_0041a558 * fVar1 * (float10)_DAT_0041a590);
  *param_1 = (double)(fVar3 * (float10)_DAT_0041a580 + fVar2 * (float10)_DAT_0041a588);
  fVar2 = (float10)fsin((float10)_DAT_0041a578 * fVar1 * (float10)_DAT_0041a590);
  fVar1 = (float10)fcos((float10)_DAT_0041a560 * fVar1 * (float10)_DAT_0041a590);
  *param_2 = (double)(fVar1 * (float10)_DAT_0041a580 + fVar2 * (float10)_DAT_0041a588);
  *param_3 = 0;
  param_3[1] = 0;
  return;
}


// ==== FUN_00403020 @ 00403020 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00403020(double *param_1,double *param_2,undefined4 *param_3,double param_4)

{
  float10 fVar1;
  float10 fVar2;
  float10 fVar3;
  
  fVar1 = (float10)param_4;
  fVar2 = (float10)fcos((float10)_DAT_0041a558 * fVar1 * (float10)_DAT_0041a590);
  fVar3 = (float10)fsin((fVar1 + fVar1) * (float10)_DAT_0041a570 * (float10)_DAT_0041a590);
  *param_1 = (double)(fVar2 * (float10)_DAT_0041a580 - fVar3 * (float10)_DAT_0041a588);
  fVar2 = (float10)fcos((float10)_DAT_0041a578 * fVar1 * (float10)_DAT_0041a590);
  fVar1 = (float10)fsin((float10)_DAT_0041a560 * fVar1 * (float10)_DAT_0041a590);
  *param_2 = (double)(fVar2 * (float10)_DAT_0041a588 - fVar1 * (float10)_DAT_0041a580);
  *param_3 = 0;
  param_3[1] = 0;
  return;
}


// ==== FUN_004030b0 @ 004030b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_004030b0(int param_1,int param_2)

{
  bool bVar1;
  double dVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  int iVar8;
  int iVar9;
  int iVar10;
  int iVar11;
  int iVar12;
  float10 fVar13;
  float10 fVar14;
  float10 fVar15;
  float10 fVar16;
  float10 fVar17;
  float10 fVar18;
  int local_58;
  int local_54;
  int local_4c;
  double local_38;
  double local_30;
  double local_28;
  double local_20;
  double local_18;
  undefined4 local_10 [3];
  
  iVar12 = 0;
  *(undefined4 *)(param_1 + 0x28) = 800;
  *(undefined4 *)(param_1 + 0x34) = 0;
  local_58 = 0;
  do {
    dVar2 = (double)local_58 + (double)(param_2 / 600);
    FUN_00402f90(&local_28,&local_20,(undefined4 *)&local_18,dVar2);
    FUN_00403020(&local_38,&local_30,local_10,dVar2);
    fVar18 = (float10)fpatan((float10)local_38,(float10)local_30);
    local_54 = 0;
    fVar13 = (float10)fsin(fVar18 + (float10)_DAT_0041a520);
    fVar18 = (float10)fcos(fVar18 + (float10)_DAT_0041a520);
    do {
      fVar14 = (float10)local_54;
      local_54 = local_54 + 1;
      iVar12 = iVar12 + 0xc;
      fVar17 = (float10)_DAT_0041a328;
      fVar15 = (float10)fsin(fVar14 * (float10)_DAT_0041a5a8 * (float10)_DAT_0041a328);
      fVar16 = (float10)fsin(fVar14 * fVar17);
      fVar15 = fVar16 * (fVar15 * (float10)_DAT_0041a428 + (float10)_DAT_0041a5a0) *
               (float10)_DAT_0041a400;
      *(float *)(*(int *)(param_1 + 0x24) + -0xc + iVar12) =
           (float)((float10)(double)fVar13 * fVar15 + (float10)local_28);
      *(float *)(*(int *)(param_1 + 0x24) + -8 + iVar12) =
           (float)(fVar18 * fVar15 + (float10)local_20);
      fVar15 = (float10)fsin(fVar14 * (float10)_DAT_0041a598 * (float10)_DAT_0041a328);
      fVar17 = (float10)fcos(fVar14 * fVar17);
      *(float *)(*(int *)(param_1 + 0x24) + -4 + iVar12) =
           (float)(fVar17 * (fVar15 * (float10)_DAT_0041a428 + (float10)_DAT_0041a5a0) *
                   (float10)_DAT_0041a400 + (float10)local_18);
    } while (local_54 < 0x28);
    local_58 = local_58 + 1;
  } while (iVar12 < 0x2580);
  fVar6 = (float)(param_2 / 600) * (float)_DAT_0041a450;
  local_58 = 0;
  local_4c = 0;
  do {
    iVar8 = local_58 + 1;
    fVar5 = (float)local_58 * (float)_DAT_0041a450 + fVar6;
    fVar7 = (float)iVar8 * (float)_DAT_0041a450 + fVar6;
    local_58 = 1;
    iVar9 = (iVar8 % 0x14) * 0x28;
    iVar12 = local_4c;
    local_54 = iVar9;
    do {
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + *(int *)(param_1 + 0x30)) = iVar12;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 4 + *(int *)(param_1 + 0x30)) =
           local_58 % 0x28 + local_4c;
      iVar10 = iVar9 + local_58 % 0x28;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 8 + *(int *)(param_1 + 0x30)) = iVar10;
      fVar3 = (float)(local_58 + -1) * (float)_DAT_0041a420;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x10 + *(int *)(param_1 + 0x30)) = fVar3;
      fVar4 = (float)local_58 * (float)_DAT_0041a420;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x18 + *(int *)(param_1 + 0x30)) = fVar4;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x20 + *(int *)(param_1 + 0x30)) = fVar4;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x14 + *(int *)(param_1 + 0x30)) = fVar5;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x1c + *(int *)(param_1 + 0x30)) = fVar5;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x24 + *(int *)(param_1 + 0x30)) = fVar7;
      iVar11 = *(int *)(param_1 + 0x34) + 1;
      *(int *)(param_1 + 0x34) = iVar11;
      *(int *)(iVar11 * 0x30 + *(int *)(param_1 + 0x30)) = iVar12;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 4 + *(int *)(param_1 + 0x30)) = iVar10;
      *(int *)(*(int *)(param_1 + 0x34) * 0x30 + 8 + *(int *)(param_1 + 0x30)) = local_54;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x10 + *(int *)(param_1 + 0x30)) = fVar3;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x18 + *(int *)(param_1 + 0x30)) = fVar4;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x20 + *(int *)(param_1 + 0x30)) = fVar3;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x14 + *(int *)(param_1 + 0x30)) = fVar5;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x1c + *(int *)(param_1 + 0x30)) = fVar7;
      *(float *)(*(int *)(param_1 + 0x34) * 0x30 + 0x24 + *(int *)(param_1 + 0x30)) = fVar7;
      iVar12 = iVar12 + 1;
      local_54 = local_54 + 1;
      *(int *)(param_1 + 0x34) = *(int *)(param_1 + 0x34) + 1;
      bVar1 = local_58 < 0x28;
      local_58 = local_58 + 1;
    } while (bVar1);
    local_58 = iVar8;
    local_4c = iVar12;
  } while (iVar12 < 0x2f8);
  return;
}


// ==== FUN_00403410 @ 00403410 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00403410(void *this,uint param_1)

{
  void *this_00;
  float fVar1;
  float fVar2;
  int iVar3;
  double local_28;
  double local_20;
  double local_18;
  double local_10;
  
  local_10 = (double)(ulonglong)param_1;
  fVar1 = (float)(longlong)local_10;
  this_00 = *(void **)((int)this + 4);
  iVar3 = ftol();
  FUN_004030b0(**(int **)((int)this_00 + 8),iVar3);
  FUN_004168d0(*(void **)((int)this_00 + 4),0,0,0);
  FUN_00416ee0(*(void **)((int)this_00 + 4),0,0,0xc4bb8000);
  fVar2 = fVar1 * _DAT_0041a5b8 * _DAT_0041a5bc;
  local_10 = (double)fVar2;
  FUN_00402f90(&local_28,&local_20,(undefined4 *)&local_18,(double)(fVar2 + (float)_DAT_0041a3f0));
  FUN_00416ee0(*(void **)((int)this_00 + 4),(float)local_28,(float)local_20,(float)local_18);
  FUN_00402f90(&local_28,&local_20,(undefined4 *)&local_18,local_10 + _DAT_0041a4e8);
  FUN_004168d0(*(void **)((int)this_00 + 4),(float)local_28,(float)local_20,(float)local_18);
  FUN_00402f90(&local_28,&local_20,(undefined4 *)&local_18,local_10 + _DAT_0041a440);
  *(float *)(*(int *)((int)this_00 + 0xc) + 0x10) = (float)local_28;
  *(float *)(*(int *)((int)this_00 + 0xc) + 0x14) = (float)local_20;
  *(float *)(*(int *)((int)this_00 + 0xc) + 0x18) = (float)local_18;
  FUN_00416550(this_00,0.0);
  *(float *)(*(int *)((int)this_00 + 4) + 0x20) = fVar1 * _DAT_0041a5b4 + _DAT_0041a5b0;
  FUN_004164d0((int)this_00);
  return;
}


// ==== FUN_00403580 @ 00403580 ====

void FUN_00403580(void)

{
  if (DAT_0041e938 == (int *)0x0) {
    DAT_0041e938 = (int *)0x0;
    DAT_0041e938 = operator_new(4);
    Sleep(100);
    FUN_00406c40(DAT_0041e938);
    return;
  }
  return;
}


// ==== FUN_00403620 @ 00403620 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00403620(undefined4 param_1,int param_2,uint param_3,int param_4,uint param_5,undefined4 param_6
            ,uint param_7,undefined4 param_8,undefined4 param_9,int param_10)

{
  int *piVar1;
  undefined4 *puVar2;
  undefined4 uVar3;
  int iVar4;
  int iVar5;
  int *piVar6;
  undefined1 *puVar7;
  LPCSTR in_stack_0000102c;
  
  FUN_00418980();
  FUN_00403580();
  iVar5 = 0;
  if (in_stack_0000102c != (LPCSTR)0x0) {
    puVar7 = &stack0x0000102c;
    piVar6 = &param_10;
    do {
      piVar1 = (int *)FUN_00415c60(DAT_0041e93c,&param_7,in_stack_0000102c);
      param_2 = *piVar1;
      param_3 = piVar1[1];
      param_4 = piVar1[2];
      puVar2 = operator_new(param_3);
      *piVar6 = (int)puVar2;
      FUN_00415d90(&param_2,puVar2,param_3);
      FUN_00415dd0(&param_2);
      in_stack_0000102c = *(LPCSTR *)(puVar7 + 4);
      puVar7 = puVar7 + 4;
      iVar5 = iVar5 + 1;
      piVar6 = piVar6 + 1;
    } while (in_stack_0000102c != (LPCSTR)0x0);
  }
  (&param_10)[iVar5] = 0;
  DAT_0041d934 = FUN_00412c00(&param_10,&LAB_004035c0);
  if (param_10 != 0) {
    iVar5 = 0;
    do {
      if ((iVar5 < 0x1c) || (0x30 < iVar5)) {
        uVar3 = FUN_00412300();
        puVar2 = DAT_0041d934;
        *(undefined4 *)((int)&DAT_0041d938 + iVar5) = uVar3;
        operator_delete(*(void **)(iVar5 + (int)puVar2));
      }
      piVar6 = (int *)(&stack0x0000002c + iVar5);
      iVar5 = iVar5 + 4;
    } while (*piVar6 != 0);
  }
  iVar5 = FUN_004119d0();
  iVar4 = FUN_004119d0();
  if ((double)(uint)(iVar4 - iVar5) < _DAT_0041a5c0) {
    do {
      iVar4 = FUN_004119d0();
      param_5 = iVar4 - iVar5;
      param_6 = 0;
      FUN_00406d80(DAT_0041e938,(float)param_5 * _DAT_0041a370 + _DAT_0041a418);
      FUN_004121f0();
      iVar4 = FUN_004119d0();
      param_7 = iVar4 - iVar5;
      param_8 = 0;
    } while ((double)param_7 < _DAT_0041a5c0);
  }
  return;
}


// ==== FUN_004037b0 @ 004037b0 ====

void FUN_004037b0(void)

{
  undefined4 uStack_24;
  undefined4 local_c [3];
  
  FUN_00403580();
  uStack_24 = 0x4037cd;
  FUN_00415c60(DAT_0041e93c,local_c,s_data_wnoise_ixx_0041d114);
  uStack_24 = 0x3f800000;
  glColor3f();
  FUN_00409430(uStack_24,&LAB_004035f0);
  FUN_00415dd0(&uStack_24);
  return;
}


// ==== FUN_00403820 @ 00403820 ====

void FUN_00403820(undefined4 param_1)

{
  bool bVar1;
  char *pcVar2;
  char *pcVar3;
  undefined4 uVar4;
  undefined4 *puVar5;
  undefined4 *puVar6;
  undefined4 *puVar7;
  undefined4 *puVar8;
  undefined4 *puVar9;
  undefined4 *puVar10;
  undefined4 *puVar11;
  undefined4 *puStack_68;
  undefined4 *puStack_64;
  undefined4 *puStack_60;
  undefined4 *puStack_5c;
  undefined4 *puStack_58;
  undefined4 *puStack_54;
  undefined4 *puStack_50;
  undefined4 *puStack_4c;
  undefined4 *puStack_48;
  undefined4 *puStack_44;
  undefined4 *puStack_40;
  undefined4 *puStack_3c;
  int *piStack_38;
  undefined4 uStack_34;
  undefined4 uStack_30;
  undefined4 auStack_2c [5];
  undefined4 uStack_18;
  undefined4 *puStack_10;
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 uStack_4;
  
  uStack_4 = 0xffffffff;
  puStack_8 = &LAB_00419054;
  pvStack_c = ExceptionList;
  ExceptionList = &pvStack_c;
  pcVar2 = (char *)FUN_00407430();
  FUN_00411910(pcVar2,param_1);
  DAT_0041f420 = s_Aardbei___Please_the_cookie_thin_0041d258;
  pcVar3 = strstr(pcVar2,&DAT_0041d27c);
  if (pcVar3 != (char *)0x0) {
    DAT_0041f41c = 1;
  }
  pcVar3 = strstr(pcVar2,&DAT_0041d250);
  if (pcVar3 != (char *)0x0) {
    DAT_0041d124 = 800;
    DAT_0041d128 = 600;
  }
  pcVar3 = strstr(pcVar2,s_x1024_0041d248);
  if (pcVar3 != (char *)0x0) {
    DAT_0041d124 = 0x400;
    DAT_0041d128 = 0x300;
  }
  pcVar3 = strstr(pcVar2,s_x1280_0041d240);
  if (pcVar3 != (char *)0x0) {
    DAT_0041d124 = 0x500;
    DAT_0041d128 = 0x400;
  }
  pcVar2 = strstr(pcVar2,s_x1600_0041d238);
  if (pcVar2 != (char *)0x0) {
    DAT_0041d124 = 0x640;
    DAT_0041d128 = 0x4b0;
  }
  uVar4 = FUN_00411fd0(DAT_0041d124,DAT_0041d128);
  if ((char)uVar4 == '\0') {
    MessageBoxA((HWND)0x0,s_we_have_a_no_go_0041d228,DAT_0041f420,0x10);
    FUN_00411900();
  }
  glEnable(0xc11);
  glScissor(0,(int)DAT_0041d128 / 0xc,DAT_0041d124,(int)(DAT_0041d128 * 5) / 6);
  DAT_0041e93c = (undefined1 *)FUN_00415b90(0x66);
  *DAT_0041e93c = 0;
  FUN_004037b0();
  FUN_00403620(s_data_31_atg_0041d13c,0x41d148,0x41d154,0x41d168,0x41d17c,s_data_18_atg_0041d188,
               0x41d194,s_data_cr_ile_atg_0041d1a0,s_data_cr_rob_atg_0041d1b0,0x41d1c0);
  puVar5 = operator_new(8);
  uStack_18 = 0;
  puStack_10 = puVar5;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a768;
  }
  uStack_18 = 0xffffffff;
  puVar6 = operator_new(8);
  uStack_18 = 1;
  puStack_10 = puVar6;
  if (puVar6 == (undefined4 *)0x0) {
    puVar6 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar6);
    *puVar6 = &PTR_FUN_0041a758;
  }
  uStack_18 = 0xffffffff;
  puVar7 = operator_new(0xc);
  uStack_18 = 2;
  puStack_10 = puVar7;
  if (puVar7 == (undefined4 *)0x0) {
    puVar7 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar7);
    *puVar7 = &PTR_FUN_0041a748;
  }
  uStack_18 = 0xffffffff;
  puStack_3c = operator_new(0x1004);
  uStack_18 = 3;
  puStack_10 = puStack_3c;
  if (puStack_3c == (undefined4 *)0x0) {
    puStack_3c = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_3c);
    *puStack_3c = &PTR_FUN_0041a738;
  }
  uStack_18 = 0xffffffff;
  puStack_40 = operator_new(0x1004);
  uStack_18 = 4;
  puStack_10 = puStack_40;
  if (puStack_40 == (undefined4 *)0x0) {
    puStack_40 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_40);
    *puStack_40 = &PTR_FUN_0041a728;
  }
  uStack_18 = 0xffffffff;
  puVar8 = operator_new(8);
  uStack_18 = 5;
  puStack_10 = puVar8;
  if (puVar8 == (undefined4 *)0x0) {
    puVar8 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar8);
    *puVar8 = &PTR_FUN_0041a718;
  }
  uStack_18 = 0xffffffff;
  puStack_68 = operator_new(8);
  uStack_18 = 6;
  puStack_10 = puStack_68;
  if (puStack_68 == (undefined4 *)0x0) {
    puStack_68 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_68);
    *puStack_68 = &PTR_FUN_0041a708;
  }
  uStack_18 = 0xffffffff;
  puStack_64 = operator_new(8);
  uStack_18 = 7;
  puStack_10 = puStack_64;
  if (puStack_64 == (undefined4 *)0x0) {
    puStack_64 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_64);
    *puStack_64 = &PTR_FUN_0041a6f8;
  }
  uStack_18 = 0xffffffff;
  puStack_60 = operator_new(8);
  uStack_18 = 8;
  puStack_10 = puStack_60;
  if (puStack_60 == (undefined4 *)0x0) {
    puStack_60 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_60);
    *puStack_60 = &PTR_FUN_0041a6e8;
  }
  uStack_18 = 0xffffffff;
  puStack_5c = operator_new(8);
  uStack_18 = 9;
  puStack_10 = puStack_5c;
  if (puStack_5c == (undefined4 *)0x0) {
    puStack_5c = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_5c);
    *puStack_5c = &PTR_FUN_0041a6d8;
  }
  uStack_18 = 0xffffffff;
  puStack_58 = operator_new(8);
  uStack_18 = 10;
  puStack_10 = puStack_58;
  if (puStack_58 == (undefined4 *)0x0) {
    puStack_58 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_58);
    *puStack_58 = &PTR_FUN_0041a6c8;
  }
  uStack_18 = 0xffffffff;
  puStack_54 = operator_new(8);
  uStack_18 = 0xb;
  puStack_10 = puStack_54;
  if (puStack_54 == (undefined4 *)0x0) {
    puStack_54 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_54);
    *puStack_54 = &PTR_FUN_0041a6b8;
  }
  uStack_18 = 0xffffffff;
  puStack_50 = operator_new(8);
  uStack_18 = 0xc;
  puStack_10 = puStack_50;
  if (puStack_50 == (undefined4 *)0x0) {
    puStack_50 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_50);
    *puStack_50 = &PTR_FUN_0041a6a8;
  }
  uStack_18 = 0xffffffff;
  puStack_4c = operator_new(8);
  uStack_18 = 0xd;
  puStack_10 = puStack_4c;
  if (puStack_4c == (undefined4 *)0x0) {
    puStack_4c = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_4c);
    *puStack_4c = &PTR_FUN_0041a698;
  }
  uStack_18 = 0xffffffff;
  puStack_48 = operator_new(0x804);
  uStack_18 = 0xe;
  puStack_10 = puStack_48;
  if (puStack_48 == (undefined4 *)0x0) {
    puStack_48 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_48);
    *puStack_48 = &PTR_FUN_0041a688;
  }
  uStack_18 = 0xffffffff;
  puStack_44 = operator_new(8);
  uStack_18 = 0xf;
  puStack_10 = puStack_44;
  if (puStack_44 == (undefined4 *)0x0) {
    puStack_44 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_44);
    *puStack_44 = &PTR_FUN_0041a678;
  }
  uStack_18 = 0xffffffff;
  puVar9 = operator_new(8);
  uStack_18 = 0x10;
  puStack_10 = puVar9;
  if (puVar9 == (undefined4 *)0x0) {
    puVar9 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar9);
    *puVar9 = &PTR_FUN_0041a668;
  }
  uStack_18 = 0xffffffff;
  puVar10 = operator_new(8);
  uStack_18 = 0x11;
  puStack_10 = puVar10;
  if (puVar10 == (undefined4 *)0x0) {
    puVar10 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar10);
    *puVar10 = &PTR_FUN_0041a658;
  }
  uStack_18 = 0xffffffff;
  puVar11 = operator_new(8);
  uStack_18 = 0x12;
  puStack_10 = puVar11;
  if (puVar11 == (undefined4 *)0x0) {
    puVar11 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar11);
    *puVar11 = &PTR_FUN_0041a648;
  }
  uStack_18 = 0xffffffff;
  puStack_10 = operator_new(8);
  uStack_18 = 0x13;
  if (puStack_10 == (undefined4 *)0x0) {
    puStack_10 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puStack_10);
    *puStack_10 = &PTR_FUN_0041a638;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,10);
  FUN_00415df0(puVar6,0xc);
  FUN_00415df0(puVar7,0xd);
  FUN_00415df0(puVar8,0x10);
  FUN_00415df0(puStack_68,0x11);
  FUN_00415df0(puStack_64,0x12);
  FUN_00415df0(puStack_60,0x13);
  FUN_00415df0(puStack_5c,0x15);
  FUN_00415df0(puStack_58,0x18);
  FUN_00415df0(puStack_54,0x19);
  FUN_00415df0(puStack_50,0x1a);
  FUN_00415df0(puStack_4c,0x1c);
  FUN_00415df0(puStack_48,0x1d);
  FUN_00415df0(puStack_44,0x1e);
  FUN_00415df0(puVar9,0x1f);
  FUN_00415df0(puVar10,0x20);
  FUN_00415df0(puVar11,0x21);
  puVar5 = operator_new(4);
  uStack_18 = 0x14;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a628;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x32);
  puVar5 = operator_new(4);
  uStack_18 = 0x15;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a618;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x33);
  puVar5 = operator_new(4);
  uStack_18 = 0x16;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a608;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x34);
  puVar5 = operator_new(4);
  uStack_18 = 0x17;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a5f8;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x35);
  puVar5 = operator_new(4);
  uStack_18 = 0x18;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a5e8;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x36);
  puVar5 = operator_new(4);
  uStack_18 = 0x19;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a5d8;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x37);
  puVar5 = operator_new(4);
  uStack_18 = 0x1a;
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a5c8;
  }
  uStack_18 = 0xffffffff;
  FUN_00415df0(puVar5,0x38);
  FUN_00415df0(puStack_40,0x3c);
  FUN_00415df0(puStack_3c,0x3d);
  FUN_00415df0(puStack_10,0x46);
  puVar5 = (undefined4 *)FUN_00415c60(DAT_0041e93c,auStack_2c,s_data_script_as1_0041d12c);
  piStack_38 = (int *)*puVar5;
  uStack_34 = puVar5[1];
  uStack_30 = puVar5[2];
  FUN_00415e60(piStack_38);
  FUN_00415dd0(&piStack_38);
  FUN_004094b0(0);
  puVar5 = operator_new(4);
  uStack_18 = 0x1b;
  puStack_10 = puVar5;
  if (puVar5 != (undefined4 *)0x0) {
    FUN_00416370(puVar5);
    *puVar5 = &PTR_FUN_0041a5f8;
  }
  uStack_18 = 0xffffffff;
  FUN_004119d0();
  bVar1 = true;
LAB_0040412a:
  FUN_00415ed0();
  FUN_004121f0();
  FUN_00409500((undefined1 *)&puStack_10,&stack0xffffff87);
  if ((byte)puStack_10 < 0x20) goto LAB_00404157;
  bVar1 = false;
  goto LAB_0040415b;
LAB_00404157:
  if (!bVar1) {
LAB_0040415b:
    if ((byte)puStack_10 < 10) {
      FUN_00411900();
    }
  }
  goto LAB_0040412a;
}


// ==== FUN_00404170 @ 00404170 ====

undefined4 * __thiscall FUN_00404170(void *this,byte param_1)

{
  thunk_FUN_004163a0(this);
  if ((param_1 & 1) != 0) {
    operator_delete(this);
  }
  return this;
}


// ==== FUN_004041a0 @ 004041a0 ====

undefined4 __fastcall FUN_004041a0(int param_1)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  void *this;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00419076;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  DAT_0041e94c = operator_new(0x484);
  DAT_0041e948 = operator_new(0x484);
  DAT_0041e958 = operator_new(0x484);
  DAT_0041e940 = operator_new(0x1210);
  DAT_0041e954 = operator_new(0x1210);
  uVar1 = DAT_0041d938;
  puVar2 = operator_new(0x1c);
  local_4 = 0;
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_004163c0(puVar2);
  }
  local_4 = 0xffffffff;
  *(undefined4 **)(param_1 + 4) = puVar2;
  this = operator_new(0x5c);
  local_4 = 1;
  if (this == (void *)0x0) {
    DAT_0041e944 = (undefined4 *)0x0;
  }
  else {
    DAT_0041e944 = FUN_00416770(this,0x10ef0,0x8778,uVar1);
  }
  local_4 = 0xffffffff;
  FUN_004164b0(*(void **)(param_1 + 4),DAT_0041e944);
  puVar2 = DAT_0041e944;
  DAT_0041e944[0x10] = 5;
  *(undefined1 *)((int)DAT_0041e944 + 0x45) = 2;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)puVar2 >> 8),1);
}


// ==== FUN_004042b0 @ 004042b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

short __cdecl FUN_004042b0(float param_1)

{
  byte bVar1;
  
  bVar1 = param_1 < _DAT_0041d280 |
          (byte)((ushort)((ushort)(NAN(param_1) || NAN(_DAT_0041d280)) << 10) >> 8) |
          (byte)((ushort)((ushort)(param_1 == _DAT_0041d280) << 0xe) >> 8);
  if (param_1 >= _DAT_0041d280) {
    return CONCAT11(bVar1,1);
  }
  return (ushort)bVar1 << 8;
}


// ==== FUN_004042d0 @ 004042d0 ====

int __cdecl FUN_004042d0(undefined4 param_1,undefined4 param_2,int param_3)

{
  if (*(char *)(DAT_0041e948 + param_3) == '\0') {
    *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + *(int *)(DAT_0041e944 + 0x28) * 0xc) = param_1;
    *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + 4 + *(int *)(DAT_0041e944 + 0x28) * 0xc) =
         param_2;
    *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + 8 + *(int *)(DAT_0041e944 + 0x28) * 0xc) =
         0x43960000;
    *(undefined1 *)(DAT_0041e948 + param_3) = 1;
    *(undefined4 *)(DAT_0041e940 + param_3 * 4) = *(undefined4 *)(DAT_0041e944 + 0x28);
    *(int *)(DAT_0041e944 + 0x28) = *(int *)(DAT_0041e944 + 0x28) + 1;
    return *(int *)(DAT_0041e944 + 0x28) + -1;
  }
  return *(int *)(DAT_0041e940 + param_3 * 4);
}


// ==== FUN_00404360 @ 00404360 ====

int __cdecl FUN_00404360(undefined4 param_1,undefined4 param_2,int param_3)

{
  if (*(char *)(DAT_0041e958 + param_3) == '\0') {
    *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + *(int *)(DAT_0041e944 + 0x28) * 0xc) = param_1;
    *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + 4 + *(int *)(DAT_0041e944 + 0x28) * 0xc) =
         param_2;
    *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + 8 + *(int *)(DAT_0041e944 + 0x28) * 0xc) =
         0x43960000;
    *(undefined1 *)(DAT_0041e958 + param_3) = 1;
    *(undefined4 *)(DAT_0041e954 + param_3 * 4) = *(undefined4 *)(DAT_0041e944 + 0x28);
    *(int *)(DAT_0041e944 + 0x28) = *(int *)(DAT_0041e944 + 0x28) + 1;
    return *(int *)(DAT_0041e944 + 0x28) + -1;
  }
  return *(int *)(DAT_0041e954 + param_3 * 4);
}


// ==== FUN_004043f0 @ 004043f0 ====

void __cdecl FUN_004043f0(undefined4 param_1,undefined4 param_2,undefined4 param_3)

{
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + *(int *)(DAT_0041e944 + 0x30)) = param_1;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 4 + *(int *)(DAT_0041e944 + 0x30)) =
       param_2;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 8 + *(int *)(DAT_0041e944 + 0x30)) =
       param_3;
  *(int *)(DAT_0041e944 + 0x34) = *(int *)(DAT_0041e944 + 0x34) + 1;
  return;
}


// ==== FUN_00404450 @ 00404450 ====

void __cdecl
FUN_00404450(undefined4 param_1,undefined4 param_2,undefined4 param_3,undefined4 param_4,
            undefined4 param_5,undefined4 param_6,undefined4 param_7,undefined4 param_8)

{
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + *(int *)(DAT_0041e944 + 0x30)) = param_1;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 4 + *(int *)(DAT_0041e944 + 0x30)) =
       param_2;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 8 + *(int *)(DAT_0041e944 + 0x30)) =
       param_3;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 0x10 + *(int *)(DAT_0041e944 + 0x30)) =
       param_4;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 0x14 + *(int *)(DAT_0041e944 + 0x30)) =
       param_4;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 0x18 + *(int *)(DAT_0041e944 + 0x30)) =
       param_6;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 0x1c + *(int *)(DAT_0041e944 + 0x30)) =
       param_6;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 0x20 + *(int *)(DAT_0041e944 + 0x30)) =
       param_8;
  *(undefined4 *)(*(int *)(DAT_0041e944 + 0x34) * 0x30 + 0x24 + *(int *)(DAT_0041e944 + 0x30)) =
       param_8;
  *(int *)(DAT_0041e944 + 0x34) = *(int *)(DAT_0041e944 + 0x34) + 1;
  return;
}


// ==== FUN_00404550 @ 00404550 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00404550(void)

{
  undefined4 *puVar1;
  undefined4 *puVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  int iVar7;
  char cVar8;
  char cVar9;
  char cVar10;
  char cVar11;
  short sVar12;
  int iVar13;
  int iVar14;
  uint uVar15;
  int *piVar16;
  int iVar17;
  int iVar18;
  int iVar19;
  int local_44;
  int local_40;
  int local_28;
  int local_24;
  int local_20 [8];
  
  iVar13 = 0;
  do {
    iVar13 = iVar13 + 1;
    *(undefined1 *)(DAT_0041e948 + -1 + iVar13) = 0;
  } while (iVar13 < 0x484);
  iVar13 = 0;
  do {
    iVar13 = iVar13 + 1;
    *(undefined1 *)(DAT_0041e958 + -1 + iVar13) = 0;
  } while (iVar13 < 0x484);
  iVar13 = *(int *)(DAT_0041e944 + 0x34);
  iVar7 = *(int *)(DAT_0041e944 + 0x28);
  local_40 = 0;
  do {
    local_44 = 0;
    iVar18 = local_40 * 0x44 + 0x48;
    do {
      iVar14 = iVar18 + -0x48;
      fVar3 = *(float *)(DAT_0041e94c + iVar14);
      fVar4 = *(float *)(iVar18 + -0x44 + DAT_0041e94c);
      fVar5 = *(float *)(iVar18 + DAT_0041e94c);
      fVar6 = *(float *)(iVar18 + -4 + DAT_0041e94c);
      sVar12 = FUN_004042b0(fVar3);
      cVar8 = (char)sVar12;
      sVar12 = FUN_004042b0(fVar4);
      cVar9 = (char)sVar12;
      sVar12 = FUN_004042b0(fVar5);
      cVar10 = (char)sVar12;
      sVar12 = FUN_004042b0(fVar6);
      cVar11 = (char)sVar12;
      if ((((cVar8 != '\0') || (cVar9 != '\0')) || (cVar10 != '\0')) || (cVar11 != '\0')) {
        if (cVar8 != '\0') {
          local_20[0] = FUN_004042d0((float)local_44 * _DAT_0041a77c - _DAT_0041a778,
                                     (float)local_40 * _DAT_0041a77c - _DAT_0041a778,iVar14);
        }
        uVar15 = (uint)(cVar8 != '\0');
        if (cVar8 != cVar9) {
          iVar14 = FUN_00404360(((float)local_44 - (fVar3 - _DAT_0041d280) / (fVar4 - fVar3)) *
                                _DAT_0041a77c - _DAT_0041a778,
                                (float)local_40 * _DAT_0041a77c - _DAT_0041a778,iVar14);
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        if (cVar9 != '\0') {
          iVar14 = FUN_004042d0((float)(local_44 + 1) * _DAT_0041a77c - _DAT_0041a778,
                                (float)local_40 * _DAT_0041a77c - _DAT_0041a778,iVar18 + -0x47);
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        if (cVar9 != cVar10) {
          iVar14 = FUN_00404360((float)(local_44 + 1) * _DAT_0041a77c - _DAT_0041a778,
                                ((float)local_40 - (fVar4 - _DAT_0041d280) / (fVar5 - fVar4)) *
                                _DAT_0041a77c - _DAT_0041a778,iVar18 + -0x47);
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        if (cVar10 != '\0') {
          iVar14 = FUN_004042d0((float)(local_44 + 1) * _DAT_0041a77c - _DAT_0041a778,
                                (float)(local_40 + 1) * _DAT_0041a77c - _DAT_0041a778,iVar18 + -0x46
                               );
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        if (cVar10 != cVar11) {
          iVar14 = FUN_00404360(((float)local_44 - (fVar6 - _DAT_0041d280) / (fVar5 - fVar6)) *
                                _DAT_0041a77c - _DAT_0041a778,
                                (float)(local_40 + 1) * _DAT_0041a77c - _DAT_0041a778,iVar18 + -0x46
                               );
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        if (cVar11 != '\0') {
          iVar14 = FUN_004042d0((float)local_44 * _DAT_0041a77c - _DAT_0041a778,
                                (float)(local_40 + 1) * _DAT_0041a77c - _DAT_0041a778,iVar18 + -0x45
                               );
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        if (cVar11 != cVar8) {
          iVar14 = FUN_00404360((float)local_44 * _DAT_0041a77c - _DAT_0041a778,
                                ((float)local_40 - (fVar3 - _DAT_0041d280) / (fVar6 - fVar3)) *
                                _DAT_0041a77c - _DAT_0041a778,iVar18 + -0x45);
          local_20[uVar15] = iVar14;
          uVar15 = uVar15 + 1;
        }
        iVar14 = uVar15 - 1;
        if (0 < iVar14) {
          piVar16 = local_20;
          do {
            FUN_004043f0(local_20[0],*piVar16,piVar16[1]);
            piVar16 = piVar16 + 1;
            iVar14 = iVar14 + -1;
          } while (iVar14 != 0);
        }
      }
      iVar18 = iVar18 + 4;
      local_44 = local_44 + 1;
    } while (local_44 < 0x10);
    local_40 = local_40 + 1;
  } while (local_40 < 0x10);
  iVar14 = 0;
  iVar18 = *(int *)(DAT_0041e944 + 0x28);
  iVar19 = iVar18 - iVar7;
  if (0 < iVar19) {
    iVar17 = iVar7 * 0xc;
    do {
      puVar1 = (undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + iVar17);
      iVar17 = iVar17 + 0xc;
      puVar2 = (undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + (iVar18 + iVar14) * 0xc);
      *puVar2 = *puVar1;
      puVar2[1] = puVar1[1];
      puVar2[2] = puVar1[2];
      iVar18 = *(int *)(DAT_0041e944 + 0x28) + iVar14;
      iVar14 = iVar14 + 1;
      *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + 8 + iVar18 * 0xc) =
           *(undefined4 *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar17);
      iVar18 = *(int *)(DAT_0041e944 + 0x28);
    } while (iVar14 < iVar18 - iVar7);
  }
  iVar18 = *(int *)(DAT_0041e944 + 0x34);
  iVar14 = 0;
  if (iVar18 != iVar13 && -1 < iVar18 - iVar13) {
    iVar17 = iVar13 * 0x30;
    do {
      piVar16 = (int *)(*(int *)(DAT_0041e944 + 0x30) + iVar17);
      iVar17 = iVar17 + 0x30;
      *(int *)((iVar18 + iVar14) * 0x30 + *(int *)(DAT_0041e944 + 0x30)) =
           (*piVar16 + *(int *)(DAT_0041e944 + 0x28)) - iVar7;
      *(int *)((*(int *)(DAT_0041e944 + 0x34) + iVar14) * 0x30 + 4 + *(int *)(DAT_0041e944 + 0x30))
           = (*(int *)(*(int *)(DAT_0041e944 + 0x30) + -0x2c + iVar17) +
             *(int *)(DAT_0041e944 + 0x28)) - iVar7;
      iVar18 = *(int *)(DAT_0041e944 + 0x34) + iVar14;
      iVar14 = iVar14 + 1;
      *(int *)(iVar18 * 0x30 + 8 + *(int *)(DAT_0041e944 + 0x30)) =
           (*(int *)(*(int *)(DAT_0041e944 + 0x30) + -0x28 + iVar17) + *(int *)(DAT_0041e944 + 0x28)
           ) - iVar7;
      iVar18 = *(int *)(DAT_0041e944 + 0x34);
    } while (iVar14 < iVar18 - iVar13);
  }
  *(int *)(DAT_0041e944 + 0x34) = *(int *)(DAT_0041e944 + 0x34) * 2 - iVar13;
  local_24 = 0;
  local_28 = 0xc;
  iVar13 = DAT_0041e958;
  do {
    iVar17 = 0x10;
    iVar18 = local_24;
    iVar14 = local_28;
    do {
      if (*(char *)(iVar13 + iVar18) == '\0') {
LAB_00404aa9:
        if (*(char *)(iVar13 + 1 + iVar18) == '\0') goto LAB_00404b1c;
        if (*(char *)(iVar13 + 2 + iVar18) != '\0') {
          iVar13 = *(int *)(iVar14 + -8 + DAT_0041e954);
          FUN_00404450(iVar13,iVar13 + iVar19,*(int *)(iVar14 + -4 + DAT_0041e954) + iVar19,0,0,0,
                       0x3f800000,0);
          iVar13 = *(int *)(iVar14 + -4 + DAT_0041e954);
          FUN_00404450(*(undefined4 *)(iVar14 + -8 + DAT_0041e954),iVar13 + iVar19,iVar13,0,0,0,
                       0x3f800000,0);
          iVar13 = DAT_0041e958;
          goto LAB_00404b1c;
        }
LAB_00404b8d:
        if (*(char *)(iVar13 + 3 + iVar18) == '\0') goto LAB_00404bfc;
        if (*(char *)(iVar13 + iVar18) != '\0') {
          FUN_00404450(*(int *)(iVar14 + DAT_0041e954),*(int *)(iVar14 + DAT_0041e954) + iVar19,
                       *(int *)(iVar14 + -0xc + DAT_0041e954) + iVar19,0,0,0,0x3f800000,0);
          iVar13 = *(int *)(iVar14 + -0xc + DAT_0041e954);
          FUN_00404450(*(undefined4 *)(iVar14 + DAT_0041e954),iVar13 + iVar19,iVar13,0,0,0,
                       0x3f800000,0);
          iVar13 = DAT_0041e958;
          goto LAB_00404bfc;
        }
      }
      else {
        if (*(char *)(iVar13 + 1 + iVar18) != '\0') {
          iVar13 = *(int *)(iVar14 + -0xc + DAT_0041e954);
          FUN_00404450(iVar13,iVar13 + iVar19,*(int *)(iVar14 + -8 + DAT_0041e954) + iVar19,0,0,0,
                       0x3f800000,0);
          iVar13 = *(int *)(iVar14 + -8 + DAT_0041e954);
          FUN_00404450(*(undefined4 *)(iVar14 + -0xc + DAT_0041e954),iVar13 + iVar19,iVar13,0,0,0,
                       0x3f800000,0);
          iVar13 = DAT_0041e958;
          goto LAB_00404aa9;
        }
LAB_00404b1c:
        if (*(char *)(iVar13 + 2 + iVar18) == '\0') goto LAB_00404b8d;
        if (*(char *)(iVar13 + 3 + iVar18) != '\0') {
          iVar13 = *(int *)(iVar14 + -4 + DAT_0041e954);
          FUN_00404450(iVar13,iVar13 + iVar19,*(int *)(iVar14 + DAT_0041e954) + iVar19,0,0,0,
                       0x3f800000,0);
          FUN_00404450(*(undefined4 *)(iVar14 + -4 + DAT_0041e954),
                       *(int *)(iVar14 + DAT_0041e954) + iVar19,*(int *)(iVar14 + DAT_0041e954),0,0,
                       0,0x3f800000,0);
          iVar13 = DAT_0041e958;
          goto LAB_00404b8d;
        }
LAB_00404bfc:
        if ((*(char *)(iVar13 + iVar18) != '\0') && (*(char *)(iVar13 + 2 + iVar18) != '\0')) {
          iVar13 = *(int *)(iVar14 + -0xc + DAT_0041e954);
          FUN_00404450(iVar13,iVar13 + iVar19,*(int *)(iVar14 + -4 + DAT_0041e954) + iVar19,0,0,0,
                       0x3f800000,0);
          iVar13 = *(int *)(iVar14 + -4 + DAT_0041e954);
          FUN_00404450(*(undefined4 *)(iVar14 + -0xc + DAT_0041e954),iVar13 + iVar19,iVar13,0,0,0,
                       0x3f800000,0);
          iVar13 = DAT_0041e958;
        }
      }
      if ((*(char *)(iVar13 + 1 + iVar18) != '\0') && (*(char *)(iVar13 + 3 + iVar18) != '\0')) {
        iVar13 = *(int *)(iVar14 + -8 + DAT_0041e954);
        FUN_00404450(iVar13,iVar13 + iVar19,*(int *)(iVar14 + DAT_0041e954) + iVar19,0,0,0,
                     0x3f800000,0);
        FUN_00404450(*(undefined4 *)(iVar14 + -8 + DAT_0041e954),
                     *(int *)(iVar14 + DAT_0041e954) + iVar19,*(int *)(iVar14 + DAT_0041e954),0,0,0,
                     0x3f800000,0);
        iVar13 = DAT_0041e958;
      }
      iVar14 = iVar14 + 0x10;
      iVar18 = iVar18 + 4;
      iVar17 = iVar17 + -1;
    } while (iVar17 != 0);
    local_28 = local_28 + 0x110;
    local_24 = local_24 + 0x44;
    if (0x110b < local_28) {
      *(int *)(DAT_0041e944 + 0x28) = *(int *)(DAT_0041e944 + 0x28) * 2 - iVar7;
      return;
    }
  } while( true );
}


// ==== FUN_00404d30 @ 00404d30 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00404d30(float param_1,float param_2)

{
  float fVar1;
  int iVar2;
  int iVar3;
  float10 fVar4;
  float10 fVar5;
  float10 fVar6;
  float10 fVar7;
  float10 fVar8;
  float10 fVar9;
  float10 fVar10;
  undefined4 local_c;
  undefined4 local_8;
  undefined4 local_4;
  
  fVar1 = param_1;
  fVar4 = (float10)param_2;
  local_8 = 0;
  iVar2 = 0;
  do {
    local_4 = 0;
    iVar3 = iVar2;
    do {
      if (fVar1 == 0.0) {
        local_c = 300.0;
        fVar4 = (float10)local_4 * (float10)_DAT_0041a77c - (float10)_DAT_0041a778;
        param_1 = (float)local_8 * _DAT_0041a77c - _DAT_0041a778;
      }
      else if (fVar1 == 1.4013e-45) {
        local_c = -300.0;
        fVar4 = (float10)local_4 * (float10)_DAT_0041a77c - (float10)_DAT_0041a778;
        param_1 = (float)local_8 * _DAT_0041a77c - _DAT_0041a778;
      }
      else if (fVar1 == 2.8026e-45) {
        param_1 = 300.0;
        fVar4 = (float10)local_4 * (float10)_DAT_0041a77c - (float10)_DAT_0041a778;
        local_c = (float)local_8 * _DAT_0041a77c - _DAT_0041a778;
      }
      else if (fVar1 == 4.2039e-45) {
        param_1 = -300.0;
        fVar4 = (float10)local_4 * (float10)_DAT_0041a77c - (float10)_DAT_0041a778;
        local_c = (float)local_8 * _DAT_0041a77c - _DAT_0041a778;
      }
      else if (fVar1 == 5.60519e-45) {
        local_c = (float)local_4 * _DAT_0041a77c - _DAT_0041a778;
        param_1 = (float)local_8 * _DAT_0041a77c - _DAT_0041a778;
        fVar4 = (float10)_DAT_0041a778;
      }
      else if (fVar1 == 7.00649e-45) {
        local_c = (float)local_4 * _DAT_0041a77c - _DAT_0041a778;
        param_1 = (float)local_8 * _DAT_0041a77c - _DAT_0041a778;
        fVar4 = (float10)_DAT_0041a7b8;
      }
      local_4 = local_4 + 1;
      iVar2 = iVar3 + 4;
      fVar5 = SQRT(fVar4 * fVar4 +
                   (float10)param_1 * (float10)param_1 + (float10)local_c * (float10)local_c);
      fVar4 = fVar4 / fVar5;
      param_1 = (float)((float10)param_1 / fVar5);
      local_c = (float)((float10)local_c / fVar5);
      fVar5 = (float10)local_c + (float10)local_c;
      fVar6 = (float10)fsin((((fVar4 - (float10)param_2) + fVar5) -
                            (float10)param_1 * (float10)_DAT_0041a4f0) * (float10)_DAT_0041a7b0);
      fVar7 = (float10)fsin(((((float10)param_1 - (float10)param_2) + fVar5) -
                            fVar4 * (float10)_DAT_0041a4f0) * (float10)_DAT_0041a7a8);
      fVar8 = (float10)fsin(((((float10)param_1 + (float10)param_1) - (float10)param_2) +
                             fVar4 + fVar4 + (float10)local_c) * (float10)_DAT_0041a7a0);
      fVar9 = (float10)fsin(((float10)param_1 + (float10)param_2 +
                             (float10)param_1 + (float10)param_2 + (float10)local_c) *
                            (float10)_DAT_0041a798);
      fVar10 = (float10)fsin(((float10)local_c * (float10)_DAT_0041a790 + fVar4 + fVar4 +
                             (float10)param_2) * (float10)_DAT_0041a788);
      fVar5 = (float10)fsin(((fVar4 - ((float10)param_2 + (float10)param_2)) - fVar5) *
                            (float10)_DAT_0041a780);
      *(float *)(iVar3 + DAT_0041e94c) = (float)(fVar5 + fVar10 + fVar9 + fVar8 + fVar7 + fVar6);
      iVar3 = iVar2;
    } while (local_4 < 0x11);
    local_8 = local_8 + 1;
  } while (iVar2 < 0x484);
  return;
}


// ==== FUN_00405840 @ 00405840 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00405840(void)

{
  float fVar1;
  
  glDisable(0xde1);
  glDisable();
  glEnable(0xbe2);
  glBlendFunc(0x302,0x303);
  fVar1 = _DAT_0041a418 - _DAT_0041a7d4 * 2929.0;
  if (_DAT_0041a494 < fVar1) {
    glColor4f(0x3f800000,0x3f800000,0x3f800000,fVar1);
    FUN_004124a0(0.0,0.0,1.0,1.0);
  }
  return;
}


// ==== FUN_00405e70 @ 00405e70 ====

undefined4 __fastcall FUN_00405e70(int param_1)

{
  int iVar1;
  undefined4 *puVar2;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041908b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar2 = operator_new(0x1c);
  local_4 = 0;
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_004163c0(puVar2);
  }
  *(undefined4 **)(param_1 + 4) = puVar2;
  local_4 = 0xffffffff;
  puVar2 = FUN_00417650(0x1a,3,300.0,5000.0,DAT_0041d938);
  FUN_004164b0(*(void **)(param_1 + 4),puVar2);
  puVar2 = FUN_00417650(0x1a,3,300.0,5000.0,DAT_0041d938);
  FUN_004164b0(*(void **)(param_1 + 4),puVar2);
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x45) = 1;
  *(undefined4 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x50) = 0x44160000;
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x44) = 1;
  *(int *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x4c) = DAT_0041d938;
  *(undefined4 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 4) + 0x40) = 0;
  FUN_004164b0(*(void **)(param_1 + 4),**(undefined4 **)((int)*(void **)(param_1 + 4) + 8));
  iVar1 = *(int *)(param_1 + 4);
  *(undefined4 *)(*(int *)(iVar1 + 4) + 0x20) = 0x42dc0000;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)iVar1 >> 8),1);
}


// ==== FUN_00406140 @ 00406140 ====

undefined4 __fastcall FUN_00406140(int param_1)

{
  int *piVar1;
  int iVar2;
  undefined4 *puVar3;
  uint uVar4;
  uint uVar5;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004190ab;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  if (DAT_0041e974 == (void *)0x0) {
    ExceptionList = &local_c;
    DAT_0041e974 = operator_new(0x100);
    piVar1 = operator_new(0x40000);
    FUN_00401ca0(piVar1,0x2d,4);
    uVar4 = 0;
    do {
      uVar5 = uVar4 & 0x80000007;
      if ((int)uVar5 < 0) {
        uVar5 = (uVar5 - 1 | 0xfffffff8) + 1;
      }
      iVar2 = uVar4 + ((int)uVar4 >> 0x1f & 7U);
      uVar4 = uVar4 + 1;
      *(int *)((int)DAT_0041e974 + uVar4 * 4 + -4) = piVar1[((iVar2 >> 3) * 0x100 + uVar5) * 0x20];
    } while ((int)uVar4 < 0x40);
    DAT_0041e968 = FUN_00412300();
    operator_delete(piVar1);
  }
  puVar3 = operator_new(0x1c);
  local_4 = 0;
  if (puVar3 == (undefined4 *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004163c0(puVar3);
  }
  *(undefined4 **)(param_1 + 4) = puVar3;
  local_4 = 0xffffffff;
  puVar3 = FUN_00417140(0x14,1000.0,DAT_0041e968);
  FUN_004164b0(*(void **)(param_1 + 4),puVar3);
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x45) = 2;
  *(undefined4 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x40) = 0x10;
  DAT_00481ef8 = &LAB_00406280;
  iVar2 = *(int *)(*(int *)(param_1 + 4) + 4);
  *(undefined4 *)(iVar2 + 0x20) = 0x42c80000;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)iVar2 >> 8),1);
}


// ==== FUN_004066f0 @ 004066f0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_004066f0(int param_1)

{
  undefined4 *puVar1;
  undefined4 uVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  iVar8 = DAT_0041d94c;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004190cb;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  iVar5 = 0;
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_004163c0(puVar1);
  }
  local_4 = 0xffffffff;
  *(undefined4 **)(param_1 + 8) = puVar1;
  uVar2 = FUN_00417400(0xf,600.0,iVar8);
  FUN_004164b0(*(void **)(param_1 + 8),uVar2);
  uVar2 = FUN_00417400(0xf,600.0,iVar8);
  FUN_004164b0(*(void **)(param_1 + 8),uVar2);
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 8) + 8) + 0x45) = 2;
  *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 8) + 8) + 4) + 0x45) = 2;
  FUN_00416ee0((void *)**(undefined4 **)(*(int *)(param_1 + 8) + 8),0,0xc1a00000,0);
  FUN_00416ee0(*(void **)(*(int *)(*(int *)(param_1 + 8) + 8) + 4),0,0x41a00000,0);
  uVar2 = FUN_00417400(0xf,600.0,iVar8);
  FUN_004164b0(*(void **)(param_1 + 8),uVar2);
  uVar2 = FUN_00417400(0xf,600.0,iVar8);
  FUN_004164b0(*(void **)(param_1 + 8),uVar2);
  *(undefined4 *)(*(int *)(*(int *)(*(int *)(param_1 + 8) + 8) + 8) + 0x40) = 0;
  *(undefined4 *)(*(int *)(*(int *)(*(int *)(param_1 + 8) + 8) + 0xc) + 0x40) = 0;
  iVar8 = *(int *)(*(int *)(param_1 + 8) + 8);
  iVar7 = *(int *)(iVar8 + 8);
  iVar8 = *(int *)(iVar8 + 0xc);
  if (0 < *(int *)(iVar7 + 0x34)) {
    iVar6 = 0;
    do {
      iVar3 = *(int *)(iVar7 + 0x30) + iVar6;
      iVar4 = *(int *)(iVar8 + 0x30) + iVar6;
      iVar5 = iVar5 + 1;
      iVar6 = iVar6 + 0x30;
      *(float *)(iVar3 + 0x10) = *(float *)(iVar3 + 0x10) * _DAT_0041a374;
      *(float *)(iVar3 + 0x14) = *(float *)(iVar3 + 0x14) * _DAT_0041a374;
      *(float *)(iVar3 + 0x18) = *(float *)(iVar3 + 0x18) * _DAT_0041a374;
      *(float *)(iVar3 + 0x1c) = *(float *)(iVar3 + 0x1c) * _DAT_0041a374;
      *(float *)(iVar3 + 0x20) = *(float *)(iVar3 + 0x20) * _DAT_0041a374;
      *(float *)(iVar3 + 0x24) = *(float *)(iVar3 + 0x24) * _DAT_0041a374;
      *(float *)(iVar3 + 0x28) = *(float *)(iVar3 + 0x28) * _DAT_0041a374;
      *(float *)(iVar3 + 0x2c) = *(float *)(iVar3 + 0x2c) * _DAT_0041a374;
      *(float *)(iVar4 + 0x10) = *(float *)(iVar4 + 0x10) * _DAT_0041a374;
      *(float *)(iVar4 + 0x14) = *(float *)(iVar4 + 0x14) * _DAT_0041a374;
      *(float *)(iVar4 + 0x18) = *(float *)(iVar4 + 0x18) * _DAT_0041a374;
      *(float *)(iVar4 + 0x1c) = *(float *)(iVar4 + 0x1c) * _DAT_0041a374;
      *(float *)(iVar4 + 0x20) = *(float *)(iVar4 + 0x20) * _DAT_0041a374;
      *(float *)(iVar4 + 0x24) = *(float *)(iVar4 + 0x24) * _DAT_0041a374;
      *(float *)(iVar4 + 0x28) = *(float *)(iVar4 + 0x28) * _DAT_0041a374;
      *(float *)(iVar4 + 0x2c) = *(float *)(iVar4 + 0x2c) * _DAT_0041a374;
    } while (iVar5 < *(int *)(iVar7 + 0x34));
  }
  iVar8 = **(int **)(*(int *)(param_1 + 8) + 8);
  iVar5 = 0;
  if (0 < *(int *)(iVar8 + 0x28)) {
    iVar7 = 0;
    do {
      puVar1 = (undefined4 *)(iVar7 + *(int *)(iVar8 + 0x1c));
      iVar5 = iVar5 + 1;
      iVar7 = iVar7 + 0x10;
      *puVar1 = 0x3f800000;
      puVar1[1] = 0x3f800000;
      puVar1[2] = 0x3f800000;
    } while (iVar5 < *(int *)(iVar8 + 0x28));
  }
  iVar8 = 9;
  do {
    uVar2 = FUN_004166d0(*(void **)(param_1 + 8),0.0,0.0,0.0,60.0,0xffffff);
    iVar8 = iVar8 + -1;
  } while (iVar8 != 0);
  *(undefined4 *)(param_1 + 4) = 0x459c4000;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar2 >> 8),1);
}


// ==== FUN_00406c40 @ 00406c40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_00406c40(int *param_1)

{
  float fVar1;
  undefined4 *puVar2;
  void *this;
  undefined4 uVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004190eb;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar2 = operator_new(0x1c);
  local_4 = 0;
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_004163c0(puVar2);
  }
  local_4 = 0xffffffff;
  *param_1 = (int)puVar2;
  iVar7 = 0;
  do {
    this = (void *)FUN_00416f00(_DAT_0041d290 - _DAT_0041d28c,0);
    iVar5 = 0;
    *(undefined1 *)((int)this + 0x45) = 2;
    *(undefined4 *)((int)this + 0x40) = 2;
    if (0 < *(int *)((int)this + 0x28)) {
      iVar6 = 0;
      do {
        iVar4 = iVar6 + *(int *)((int)this + 0x24);
        fVar1 = _DAT_0041a470;
        if (_DAT_0041a494 < *(float *)(iVar4 + 8)) {
          fVar1 = _DAT_0041a2f0;
        }
        *(float *)(iVar4 + 4) = *(float *)(iVar4 + 4) * fVar1;
        iVar5 = iVar5 + 1;
        iVar6 = iVar6 + 0xc;
        *(float *)(iVar4 + 8) =
             *(float *)(iVar4 + 8) -
             ((_DAT_0041d290 - _DAT_0041d28c) * _DAT_0041a340 + _DAT_0041d28c);
      } while (iVar5 < *(int *)((int)this + 0x28));
    }
    FUN_004168d0(this,(float)(iVar7 / 0x19),0,0);
    *(undefined1 *)((int)this + 0x48) = 1;
    *(undefined4 *)((int)this + 0x3c) = 0x1f1f1f;
    uVar3 = FUN_004164b0((void *)*param_1,this);
    iVar7 = iVar7 + 0x168;
  } while (iVar7 < 9000);
  *(undefined4 *)(*(int *)(*param_1 + 4) + 0x20) = 0x43020000;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar3 >> 8),1);
}


// ==== FUN_00406d80 @ 00406d80 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00406d80(void *this,float param_1)

{
  int iVar1;
  int iVar2;
  int iVar3;
  
  FUN_004119d0();
  iVar2 = ftol();
  iVar3 = 0;
  do {
    iVar1 = *(int *)(*(int *)(*(int *)this + 8) + iVar3 * 4);
    if (iVar2 < iVar3) {
      *(undefined4 *)(iVar1 + 0x40) = 0;
    }
    else {
      *(undefined4 *)(iVar1 + 0x40) = 2;
    }
    iVar3 = iVar3 + 1;
  } while (iVar3 < 0x19);
  param_1 = (param_1 - _DAT_0041a418) * _DAT_0041a778;
  if (param_1 < _DAT_0041a494) {
    param_1 = 0.0;
  }
  FUN_00416ee0(*(void **)(*(int *)this + 4),0x43960000,0,param_1 - _DAT_0041a86c);
  FUN_004168d0(*(void **)(*(int *)this + 4),0,0,param_1);
  *(undefined4 *)(*(int *)(*(int *)this + 4) + 0x1c) = 0x42b40000;
  FUN_004164d0(*(int *)this);
  return;
}


// ==== FUN_00406e30 @ 00406e30 ====

undefined4 __cdecl FUN_00406e30(DWORD param_1,DWORD param_2,DWORD param_3)

{
  DWORD iModeNum;
  int iVar1;
  DWORD local_2c;
  DWORD local_28;
  DWORD local_24;
  
  EnumDisplaySettingsA((LPCSTR)0x0,0xffffffff,(DEVMODEA *)&stack0xffffff6c);
  iVar1 = EnumDisplaySettingsA((LPCSTR)0x0,0,(DEVMODEA *)&stack0xffffff6c);
  iModeNum = 1;
  while( true ) {
    if (iVar1 == 0) {
      return 0;
    }
    if (((local_28 == param_1) && (local_24 == param_2)) && (local_2c == param_3)) break;
    iVar1 = EnumDisplaySettingsA((LPCSTR)0x0,iModeNum,(DEVMODEA *)&stack0xffffff6c);
    iModeNum = iModeNum + 1;
  }
  return CONCAT31((int3)(local_28 >> 8),1);
}


// ==== FUN_00406ec0 @ 00406ec0 ====

void FUN_00406ec0(void)

{
  UINT UVar1;
  undefined4 uVar2;
  HWND pHVar3;
  DWORD DVar4;
  BOOL BVar5;
  
  DVar4 = 0x10;
  UVar1 = IsDlgButtonChecked(DAT_0041e980,0x3e9);
  if (UVar1 != 0) {
    DVar4 = 0x20;
  }
  uVar2 = FUN_00406e30(800,600,DVar4);
  if ((char)uVar2 == '\0') {
    BVar5 = 0;
    pHVar3 = GetDlgItem(DAT_0041e980,0x3ef);
    EnableWindow(pHVar3,BVar5);
  }
  uVar2 = FUN_00406e30(0x400,0x300,DVar4);
  if ((char)uVar2 == '\0') {
    BVar5 = 0;
    pHVar3 = GetDlgItem(DAT_0041e980,0x3f0);
    EnableWindow(pHVar3,BVar5);
  }
  uVar2 = FUN_00406e30(0x500,0x400,DVar4);
  if ((char)uVar2 == '\0') {
    BVar5 = 0;
    pHVar3 = GetDlgItem(DAT_0041e980,0x3f1);
    EnableWindow(pHVar3,BVar5);
  }
  uVar2 = FUN_00406e30(0x640,0x4b0,DVar4);
  if ((char)uVar2 == '\0') {
    BVar5 = 0;
    pHVar3 = GetDlgItem(DAT_0041e980,0x3f2);
    EnableWindow(pHVar3,BVar5);
  }
  return;
}


// ==== FUN_00407430 @ 00407430 ====

undefined4 * FUN_00407430(void)

{
  HMODULE hInstance;
  int iVar1;
  undefined4 *puVar2;
  LPCSTR lpTemplateName;
  HWND hWndParent;
  DLGPROC lpDialogFunc;
  LPARAM dwInitParam;
  
  DAT_0041e97c = operator_new(0x400);
  dwInitParam = 0;
  lpDialogFunc = (DLGPROC)&LAB_00406fa0;
  hWndParent = (HWND)0x0;
  lpTemplateName = (LPCSTR)0x66;
  puVar2 = DAT_0041e97c;
  for (iVar1 = 0x100; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar2 = 0;
    puVar2 = puVar2 + 1;
  }
  hInstance = GetModuleHandleA((LPCSTR)0x0);
  DialogBoxParamA(hInstance,lpTemplateName,hWndParent,lpDialogFunc,dwInitParam);
  return DAT_0041e97c;
}


// ==== FUN_00407470 @ 00407470 ====

undefined4 __fastcall FUN_00407470(int param_1)

{
  undefined4 *puVar1;
  undefined4 uVar2;
  bool bVar3;
  int *piVar4;
  int local_14;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041910b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  bVar3 = false;
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_004163c0(puVar1);
  }
  *(undefined4 **)(param_1 + 4) = puVar1;
  local_4 = 0xffffffff;
  piVar4 = &DAT_0041e990;
  local_14 = 500;
  do {
    puVar1 = FUN_00417140(5,(float)local_14,(&DAT_0041d938)[(-(uint)bVar3 & 0xfffffffb) + 5]);
    *piVar4 = (int)puVar1;
    *(undefined1 *)(puVar1 + 0x12) = 1;
    if (bVar3) {
      *(undefined4 *)(*piVar4 + 0x3c) = 0x5f5f5f5f;
    }
    else {
      *(undefined4 *)(*piVar4 + 0x3c) = 0x1f1f1f5;
    }
    *(undefined1 *)(*piVar4 + 0x44) = 4;
    uVar2 = FUN_004164b0(*(void **)(param_1 + 4),*piVar4);
    local_14 = local_14 + 0x96;
    bVar3 = (bool)(bVar3 ^ 1);
    piVar4 = piVar4 + 1;
  } while (local_14 < 0xed8);
  *(undefined1 *)(*(int *)(param_1 + 4) + 0x10) = 1;
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar2 >> 8),1);
}


// ==== FUN_00407780 @ 00407780 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_00407780(int param_1)

{
  undefined4 *puVar1;
  int iVar2;
  int iVar3;
  float *pfVar4;
  undefined4 uVar5;
  int iVar6;
  int iVar7;
  float10 fVar8;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041912b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_004163c0(puVar1);
  }
  *(undefined4 **)(param_1 + 4) = puVar1;
  local_4 = 0xffffffff;
  iVar2 = FUN_00417400(9,10000.0,DAT_0041d948);
  iVar3 = FUN_00417400(9,10000.0,0);
  iVar6 = 0;
  *(undefined4 *)(iVar3 + 0x40) = 0;
  if (0 < *(int *)(iVar2 + 0x28)) {
    iVar7 = 0;
    do {
      pfVar4 = (float *)(*(int *)(iVar2 + 0x24) + iVar7);
      iVar6 = iVar6 + 1;
      iVar7 = iVar7 + 0xc;
      fVar8 = (float10)fcos(SQRT((float10)pfVar4[2] * (float10)pfVar4[2] +
                                 (float10)*pfVar4 * (float10)*pfVar4) * (float10)_DAT_0041a8a8);
      pfVar4[1] = (float)((float10)_DAT_0041a8a0 - fVar8 * (float10)_DAT_0041a8a0);
    } while (iVar6 < *(int *)(iVar2 + 0x28));
  }
  FUN_004164b0(*(void **)(param_1 + 4),iVar2);
  FUN_004164b0(*(void **)(param_1 + 4),iVar3);
  *(undefined4 *)(*(int *)(*(int *)(param_1 + 4) + 4) + 0x20) = 0x43020000;
  FUN_004166d0(*(void **)(param_1 + 4),0.0,0.0,0.0,7000.0,0xffffff);
  FUN_004166d0(*(void **)(param_1 + 4),0.0,0.0,0.0,3000.0,0xffffff);
  uVar5 = FUN_00416550(*(void **)(param_1 + 4),5.808325e-39);
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar5 >> 8),1);
}


// ==== FUN_004079b0 @ 004079b0 ====

void __cdecl FUN_004079b0(float *param_1)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  int iVar7;
  float *pfVar8;
  int iVar9;
  float *pfVar10;
  undefined4 *puVar11;
  float *pfVar12;
  float *unaff_retaddr;
  undefined1 local_40 [60];
  undefined4 *puStack_4;
  
  pfVar12 = param_1;
  RtlZeroMemory(local_40,0x40);
  iVar6 = -8 - (int)param_1;
  param_1 = (float *)0x4;
  do {
    pfVar8 = (float *)(local_40 + iVar6 + (int)pfVar12);
    iVar9 = 4;
    pfVar10 = unaff_retaddr;
    do {
      fVar1 = *pfVar8;
      iVar7 = 4;
      pfVar4 = pfVar10;
      pfVar5 = pfVar12;
      do {
        fVar2 = *pfVar5;
        fVar3 = *pfVar4;
        pfVar4 = pfVar4 + 4;
        pfVar5 = pfVar5 + 1;
        iVar7 = iVar7 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar7 != 0);
      *pfVar8 = fVar1;
      pfVar8 = pfVar8 + 1;
      pfVar10 = pfVar10 + 1;
      iVar9 = iVar9 + -1;
    } while (iVar9 != 0);
    pfVar12 = pfVar12 + 4;
    param_1 = (float *)((int)param_1 + -1);
  } while (param_1 != (float *)0x0);
  puVar11 = (undefined4 *)&stack0xffffffb8;
  for (iVar6 = 0x10; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puStack_4 = *puVar11;
    puVar11 = puVar11 + 1;
    puStack_4 = puStack_4 + 1;
  }
  return;
}


// ==== FUN_00407a40 @ 00407a40 ====

void __cdecl FUN_00407a40(float *param_1,float *param_2,float *param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  float fVar9;
  float fVar10;
  float fVar11;
  float fVar12;
  float fVar13;
  float fVar14;
  
  fVar1 = param_3[9];
  fVar2 = param_2[2];
  fVar3 = param_3[1];
  fVar4 = *param_2;
  fVar5 = param_3[5];
  fVar6 = param_2[1];
  fVar7 = param_3[0xd];
  fVar8 = param_3[10];
  fVar9 = param_2[2];
  fVar10 = param_3[2];
  fVar11 = *param_2;
  fVar12 = param_3[6];
  fVar13 = param_2[1];
  fVar14 = param_3[0xe];
  *param_1 = *param_2 * *param_3 + param_3[4] * param_2[1] + param_3[8] * param_2[2] + param_3[0xc];
  param_1[2] = fVar12 * fVar13 + fVar10 * fVar11 + fVar8 * fVar9 + fVar14;
  param_1[1] = fVar5 * fVar6 + fVar3 * fVar4 + fVar1 * fVar2 + fVar7;
  return;
}


// ==== FUN_00407ab0 @ 00407ab0 ====

void __cdecl FUN_00407ab0(undefined4 *param_1)

{
  param_1[0xf] = 0x3f800000;
  param_1[10] = 0x3f800000;
  param_1[5] = 0x3f800000;
  *param_1 = 0x3f800000;
  param_1[4] = 0;
  param_1[3] = 0;
  param_1[2] = 0;
  param_1[1] = 0;
  param_1[9] = 0;
  param_1[8] = 0;
  param_1[7] = 0;
  param_1[6] = 0;
  param_1[0xe] = 0;
  param_1[0xd] = 0;
  param_1[0xc] = 0;
  param_1[0xb] = 0;
  return;
}


// ==== FUN_00407af0 @ 00407af0 ====

void __cdecl FUN_00407af0(undefined4 *param_1,float param_2)

{
  float10 fVar1;
  float10 fVar2;
  
  FUN_00407ab0(param_1);
  fVar1 = (float10)fcos((float10)param_2);
  param_1[5] = (float)fVar1;
  fVar2 = (float10)fsin((float10)param_2);
  param_1[6] = (float)fVar2;
  param_1[9] = (float)-fVar2;
  param_1[10] = (float)fVar1;
  return;
}


// ==== FUN_00407b20 @ 00407b20 ====

void __cdecl FUN_00407b20(float *param_1,float param_2)

{
  float10 fVar1;
  float10 fVar2;
  
  FUN_00407ab0(param_1);
  fVar1 = (float10)fcos((float10)param_2);
  *param_1 = (float)fVar1;
  fVar2 = (float10)fsin((float10)param_2);
  param_1[2] = (float)-fVar2;
  param_1[8] = (float)fVar2;
  param_1[10] = (float)fVar1;
  return;
}


// ==== FUN_00407b50 @ 00407b50 ====

void __cdecl FUN_00407b50(float *param_1,float param_2)

{
  float10 fVar1;
  float10 fVar2;
  
  FUN_00407ab0(param_1);
  fVar1 = (float10)fcos((float10)param_2);
  *param_1 = (float)fVar1;
  fVar2 = (float10)fsin((float10)param_2);
  param_1[1] = (float)fVar2;
  param_1[4] = (float)-fVar2;
  param_1[5] = (float)fVar1;
  return;
}


// ==== FUN_00407b80 @ 00407b80 ====

void __cdecl FUN_00407b80(float *param_1,float param_2,float param_3,float param_4)

{
  float local_c0 [16];
  float local_80 [16];
  undefined4 local_40 [16];
  
  FUN_00407b50(local_c0,param_4);
  FUN_00407b20(local_80,param_3);
  FUN_00407af0(local_40,param_2);
  FUN_004079b0(param_1);
  FUN_004079b0(param_1);
  return;
}


// ==== FUN_00407bf0 @ 00407bf0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_00407bf0(int param_1)

{
  float *pfVar1;
  float *pfVar2;
  float fVar3;
  float fVar4;
  int iVar5;
  undefined4 *puVar6;
  int iVar7;
  undefined4 uVar8;
  int iVar9;
  int iVar10;
  int local_6c;
  int local_68;
  float local_64 [4];
  undefined4 local_54;
  undefined4 local_50;
  float local_4c [16];
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  iVar5 = DAT_0041d948;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041914b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar6 = operator_new(0x1c);
  local_4 = 0;
  if (puVar6 == (undefined4 *)0x0) {
    puVar6 = (undefined4 *)0x0;
  }
  else {
    puVar6 = FUN_004163c0(puVar6);
  }
  *(undefined4 **)(param_1 + 4) = puVar6;
  local_4 = 0xffffffff;
  FUN_00416ee0((void *)puVar6[1],0,0,0x42c80000);
  local_6c = 0;
  local_68 = 0;
  do {
    puVar6 = FUN_00417650(5,0x14,70.0,1000.0,iVar5);
    FUN_004164b0(*(void **)(param_1 + 4),puVar6);
    iVar10 = 0;
    iVar9 = *(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4);
    if (0 < *(int *)(iVar9 + 0x34)) {
      iVar7 = 0;
      do {
        iVar10 = iVar10 + 1;
        *(float *)(*(int *)(iVar9 + 0x30) + 0x14 + iVar7) =
             *(float *)(*(int *)(iVar9 + 0x30) + 0x14 + iVar7) * _DAT_0041a4f0;
        iVar9 = *(int *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4) + 0x30);
        *(float *)(iVar9 + 0x1c + iVar7) = *(float *)(iVar9 + 0x1c + iVar7) * _DAT_0041a4f0;
        iVar9 = *(int *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4) + 0x30);
        pfVar1 = (float *)(iVar9 + 0x24 + iVar7);
        pfVar2 = (float *)(iVar9 + 0x24 + iVar7);
        iVar7 = iVar7 + 0x30;
        *pfVar2 = *pfVar1 * _DAT_0041a4f0;
        iVar9 = *(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4);
      } while (iVar10 < *(int *)(iVar9 + 0x34));
    }
    fVar3 = (float)local_68 * _DAT_0041a8b4;
    FUN_004168d0(*(void **)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4),fVar3,0,
                 (float)local_6c);
    fVar4 = (float)local_6c * _DAT_0041a8b0;
    *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4) + 0x48) = 1;
    FUN_00407b80(local_4c,fVar3 * _DAT_0041a8b0,0.0,fVar4);
    local_64[0] = 0.0;
    local_64[1] = 0.0;
    local_64[2] = 0.0;
    FUN_00407a40(local_64 + 3,local_64,local_4c);
    FUN_00416ee0(*(void **)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4),local_64[3],local_54
                 ,local_50);
    local_6c = local_6c + 0xfe;
    local_68 = local_68 + 1;
    *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + -4 + local_68 * 4) + 0x46) = 1;
  } while (local_6c < 0x16d2);
  puVar6 = FUN_00417140(0x14,1.4,iVar5);
  FUN_004164b0(*(void **)(param_1 + 4),puVar6);
  *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + local_68 * 4) + 0x48) = 1;
  FUN_004166d0(*(void **)(param_1 + 4),0.0,0.0,0.0,40.0,0xffffff);
  uVar8 = FUN_004166d0(*(void **)(param_1 + 4),0.0,0.0,0.0,40.0,0xffd0d0);
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar8 >> 8),1);
}


// ==== FUN_00408120 @ 00408120 ====

undefined4 __fastcall FUN_00408120(int param_1)

{
  undefined4 *puVar1;
  undefined4 uVar2;
  int iVar3;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  iVar3 = DAT_0041d948;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041916b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar1 = operator_new(0x1c);
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_004163c0(puVar1);
  }
  local_4 = 0xffffffff;
  *(undefined4 **)(param_1 + 4) = puVar1;
  puVar1 = FUN_00417650(0x15,3,300.0,6000.0,iVar3);
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x45) = 1;
  FUN_00416ee0((void *)**(undefined4 **)(*(int *)(param_1 + 4) + 8),0,0x453b8000,0);
  puVar1 = FUN_00417650(0x13,3,100.0,6000.0,DAT_0041d950);
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  FUN_00416ee0(*(void **)(*(int *)(*(int *)(param_1 + 4) + 8) + 4),0,0x453b8000,0);
  *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 4) + 0x48) = 1;
  *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 4) + 0x45) = 2;
  puVar1 = FUN_00417650(0x15,3,300.0,3000.0,iVar3);
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  puVar1 = FUN_00417650(0x13,3,150.0,3000.0,iVar3);
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  *(undefined4 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 8) + 0x40) = 0;
  *(undefined4 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 0xc) + 0x40) = 0;
  puVar1 = FUN_00417650(0x13,3,270.0,6000.0,DAT_0041d950);
  FUN_004164b0(*(void **)(param_1 + 4),puVar1);
  FUN_00416ee0(*(void **)(*(int *)(*(int *)(param_1 + 4) + 8) + 0x10),0,0x453b8000,0);
  iVar3 = 4;
  *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 0x10) + 0x48) = 1;
  *(undefined1 *)(*(int *)(*(int *)(*(int *)(param_1 + 4) + 8) + 0x10) + 0x45) = 1;
  do {
    uVar2 = FUN_004166d0(*(void **)(param_1 + 4),0.0,-10000.0,0.0,900.0,0xffffff);
    iVar3 = iVar3 + -1;
  } while (iVar3 != 0);
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar2 >> 8),1);
}


// ==== FUN_00408610 @ 00408610 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00408610(int param_1,float param_2,int param_3,float param_4,float param_5)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  int iVar7;
  int iVar8;
  int iVar9;
  int iVar10;
  float10 fVar11;
  float10 fVar12;
  float10 fVar13;
  float10 fVar14;
  float10 fVar15;
  float10 fVar16;
  float10 fVar17;
  float10 fVar18;
  int local_28;
  
  iVar7 = param_1;
  *(undefined4 *)(param_1 + 0x28) = 0;
  *(undefined4 *)(param_1 + 0x34) = 0;
  iVar9 = DAT_0041d2e4 + -1;
  local_28 = 0;
  fVar5 = _DAT_0041d2f0 / (float)iVar9;
  fVar6 = _DAT_0041d2f0 * _DAT_0041a340;
  iVar8 = DAT_0041d2e8;
  iVar10 = DAT_0041d2e4;
  if (0 < DAT_0041d2e4) {
    do {
      param_1 = 0;
      if (0 < iVar8) {
        fVar4 = (float)local_28 * fVar5 - fVar6;
        fVar11 = (float10)fsin((float10)param_2 * (float10)_DAT_0041a920);
        fVar12 = (float10)local_28 * (float10)(param_2 / (float)iVar9) * (float10)_DAT_0041a918;
        fVar13 = (float10)fsin(fVar12);
        fVar12 = (float10)fcos((float10)(double)fVar12);
        do {
          fVar14 = (float10)fcos(((float10)_DAT_0041a918 / (float10)DAT_0041d2e4 +
                                 (float10)_DAT_0041a918 / (float10)DAT_0041d2e4) * (float10)local_28
                                );
          fVar1 = (float)(((float10)_DAT_0041a310 - fVar14 * fVar11 * (float10)_DAT_0041a308) *
                         (float10)_DAT_0041d2ec);
          fVar14 = ((float10)_DAT_0041a920 / (float10)DAT_0041d2e8) * (float10)param_1;
          fVar15 = (float10)fcos(fVar14);
          fVar2 = (float)(fVar15 * (float10)fVar1);
          fVar14 = (float10)fsin(fVar14);
          fVar1 = (float)(fVar14 * (float10)fVar1);
          fVar3 = (float)((float10)fVar2 * fVar12 +
                         (float10)-_DAT_0041d2f0 * fVar12 + (float10)fVar4 * fVar13);
          *(float *)(*(int *)(iVar7 + 0x24) + 4 + *(int *)(iVar7 + 0x28) * 0xc) =
               (float)((float10)_DAT_0041d2ec * (float10)_DAT_0041a910 -
                      ((float10)fVar2 * fVar13 +
                      ((float10)-_DAT_0041d2f0 * fVar13 - (float10)(double)(fVar12 * (float10)fVar4)
                      )));
          if (param_3 == 0) {
            *(float *)(*(int *)(iVar7 + 0x24) + 8 + *(int *)(iVar7 + 0x28) * 0xc) =
                 param_5 - (_DAT_0041d2f0 + _DAT_0041d2f0 + fVar3);
            fVar1 = param_4 - fVar1;
          }
          else {
            *(float *)(*(int *)(iVar7 + 0x24) + 8 + *(int *)(iVar7 + 0x28) * 0xc) = fVar3 + param_5;
            fVar1 = fVar1 + param_4;
          }
          *(float *)(*(int *)(iVar7 + 0x24) + *(int *)(iVar7 + 0x28) * 0xc) = fVar1;
          param_1 = param_1 + 1;
          *(int *)(iVar7 + 0x28) = *(int *)(iVar7 + 0x28) + 1;
          iVar8 = DAT_0041d2e8;
          iVar10 = DAT_0041d2e4;
        } while (param_1 < DAT_0041d2e8);
      }
      local_28 = local_28 + 1;
    } while (local_28 < iVar10);
  }
  local_28 = 0;
  if (0 < iVar10 + -1) {
    do {
      param_1 = 0;
      if (0 < iVar8) {
        fVar5 = (float)local_28 + _DAT_0041a418;
        do {
          fVar6 = _DAT_0041a418;
          *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + *(int *)(iVar7 + 0x30)) =
               iVar8 * local_28 + param_1;
          iVar9 = param_1 + 1;
          *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 4 + *(int *)(iVar7 + 0x30)) =
               iVar9 % DAT_0041d2e8 + DAT_0041d2e8 * local_28;
          *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 8 + *(int *)(iVar7 + 0x30)) =
               (local_28 + 1) * DAT_0041d2e8 + iVar9 % DAT_0041d2e8;
          if (param_3 != 0) {
            fVar6 = _DAT_0041a90c;
          }
          fVar4 = (float)param_1;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x10 + *(int *)(iVar7 + 0x30)) =
               fVar4 / (float)DAT_0041d2e8;
          fVar1 = (float)iVar9;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x18 + *(int *)(iVar7 + 0x30)) =
               fVar1 / (float)DAT_0041d2e8;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x20 + *(int *)(iVar7 + 0x30)) =
               fVar1 / (float)DAT_0041d2e8;
          fVar2 = (float)local_28 * fVar6;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x14 + *(int *)(iVar7 + 0x30)) =
               fVar2 / (float)DAT_0041d2e4;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x1c + *(int *)(iVar7 + 0x30)) =
               fVar2 / (float)DAT_0041d2e4;
          fVar6 = fVar5 * fVar6;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x24 + *(int *)(iVar7 + 0x30)) =
               fVar6 / (float)DAT_0041d2e4;
          iVar8 = *(int *)(iVar7 + 0x34) + 1;
          *(int *)(iVar7 + 0x34) = iVar8;
          *(int *)(iVar8 * 0x30 + *(int *)(iVar7 + 0x30)) = DAT_0041d2e8 * local_28 + param_1;
          *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 4 + *(int *)(iVar7 + 0x30)) =
               (local_28 + 1) * DAT_0041d2e8 + iVar9 % DAT_0041d2e8;
          *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 8 + *(int *)(iVar7 + 0x30)) =
               (local_28 + 1) * DAT_0041d2e8 + param_1;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x10 + *(int *)(iVar7 + 0x30)) =
               fVar4 / (float)DAT_0041d2e8;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x18 + *(int *)(iVar7 + 0x30)) =
               fVar1 / (float)DAT_0041d2e8;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x20 + *(int *)(iVar7 + 0x30)) =
               fVar4 / (float)DAT_0041d2e8;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x14 + *(int *)(iVar7 + 0x30)) =
               fVar2 / (float)DAT_0041d2e4;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x1c + *(int *)(iVar7 + 0x30)) =
               fVar6 / (float)DAT_0041d2e4;
          *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x24 + *(int *)(iVar7 + 0x30)) =
               fVar6 / (float)DAT_0041d2e4;
          *(int *)(iVar7 + 0x34) = *(int *)(iVar7 + 0x34) + 1;
          iVar8 = DAT_0041d2e8;
          iVar10 = DAT_0041d2e4;
          param_1 = iVar9;
        } while (iVar9 < DAT_0041d2e8);
      }
      local_28 = local_28 + 1;
    } while (local_28 < iVar10 + -1);
  }
  param_1 = 0;
  if (iVar8 != 1 && -1 < iVar8 + -1) {
    fVar15 = (float10)fsin((float10)_DAT_0041a408);
    fVar11 = (float10)_DAT_0041a310;
    fVar13 = (float10)_DAT_0041a308;
    fVar16 = (float10)fcos((float10)_DAT_0041a408);
    fVar12 = (float10)_DAT_0041a310;
    fVar14 = (float10)_DAT_0041a308;
    do {
      *(undefined4 *)(*(int *)(iVar7 + 0x34) * 0x30 + *(int *)(iVar7 + 0x30)) = 0;
      *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 4 + *(int *)(iVar7 + 0x30)) = param_1;
      iVar9 = param_1 + 1;
      *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 8 + *(int *)(iVar7 + 0x30)) = iVar9;
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x10 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar15 + fVar11) * fVar13);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x14 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar16 + fVar12) * fVar14);
      fVar17 = (float10)fsin(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * (float10)param_1);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x18 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      fVar17 = (float10)fcos(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * (float10)param_1);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x1c + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      fVar17 = (float10)fsin(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * (float10)iVar9);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x20 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      fVar17 = (float10)fcos(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * (float10)iVar9);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x24 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      *(int *)(iVar7 + 0x34) = *(int *)(iVar7 + 0x34) + 1;
      iVar8 = DAT_0041d2e8;
      iVar10 = DAT_0041d2e4;
      param_1 = iVar9;
    } while (iVar9 < DAT_0041d2e8 + -1);
  }
  param_1 = 0;
  if (iVar8 != 1 && -1 < iVar8 + -1) {
    fVar15 = (float10)fsin((float10)_DAT_0041a408);
    fVar11 = (float10)_DAT_0041a310;
    fVar13 = (float10)_DAT_0041a308;
    fVar16 = (float10)fcos((float10)_DAT_0041a408);
    fVar12 = (float10)_DAT_0041a310;
    fVar14 = (float10)_DAT_0041a308;
    do {
      *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + *(int *)(iVar7 + 0x30)) = (iVar10 + -1) * iVar8;
      *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 4 + *(int *)(iVar7 + 0x30)) =
           (DAT_0041d2e4 + -1) * DAT_0041d2e8 + param_1;
      *(int *)(*(int *)(iVar7 + 0x34) * 0x30 + 8 + *(int *)(iVar7 + 0x30)) =
           (DAT_0041d2e4 + -1) * DAT_0041d2e8 + 1 + param_1;
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x10 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar15 + fVar11) * fVar13);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x14 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar16 + fVar12) * fVar14);
      fVar17 = (float10)param_1;
      fVar18 = (float10)fsin(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * fVar17);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x18 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar18 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      param_1 = param_1 + 1;
      fVar17 = (float10)fcos(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * fVar17);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x1c + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      fVar17 = (float10)fsin(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * (float10)param_1);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x20 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      fVar17 = (float10)fcos(((float10)_DAT_0041a918 / (float10)DAT_0041d2e8) * (float10)param_1);
      *(float *)(*(int *)(iVar7 + 0x34) * 0x30 + 0x24 + *(int *)(iVar7 + 0x30)) =
           (float)((fVar17 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308);
      *(int *)(iVar7 + 0x34) = *(int *)(iVar7 + 0x34) + 1;
      iVar8 = DAT_0041d2e8;
      iVar10 = DAT_0041d2e4;
    } while (param_1 < DAT_0041d2e8 + -1);
  }
  return;
}


// ==== FUN_00408da0 @ 00408da0 ====

undefined4 __fastcall FUN_00408da0(int param_1)

{
  int iVar1;
  int iVar2;
  undefined4 *puVar3;
  void *this;
  undefined4 *puVar4;
  undefined4 uVar5;
  undefined4 extraout_ECX;
  int iVar6;
  uint uVar7;
  ulonglong uVar8;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  uVar5 = DAT_0041d948;
  iVar2 = DAT_0041d944;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00419196;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar3 = operator_new(0x1c);
  uVar7 = 0;
  local_4 = 0;
  if (puVar3 == (undefined4 *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004163c0(puVar3);
  }
  local_4 = 0xffffffff;
  do {
    this = operator_new(0x5c);
    local_4 = 1;
    if (this == (void *)0x0) {
      puVar4 = (undefined4 *)0x0;
    }
    else {
      puVar4 = FUN_00416770(this,DAT_0041d2e8 * DAT_0041d2e4,DAT_0041d2e8 * DAT_0041d2e4 * 2 + -2,
                            uVar5);
    }
    local_4 = 0xffffffff;
    FUN_004164b0(puVar3,puVar4);
    puVar4[0x10] = 4;
    *(undefined1 *)(puVar4 + 0x11) = 2;
    *(undefined1 *)((int)puVar4 + 0x45) = 2;
    *(undefined1 *)((int)puVar4 + 0x46) = 1;
    *(undefined4 **)(param_1 + 4) = puVar3;
    uVar8 = FUN_004119a0(extraout_ECX,param_1);
    iVar6 = (int)((longlong)((ulonglong)(uint)((int)uVar8 >> 0x1f) << 0x20 | uVar8 & 0xffffffff) %
                 2000);
    iVar1 = iVar6 + -5000 + ((int)uVar7 >> 2) * 3000;
    (&DAT_0041efe8)[uVar7] = (float)iVar1;
    uVar8 = FUN_004119a0(iVar1,iVar6);
    iVar6 = (int)((longlong)((ulonglong)(uint)((int)uVar8 >> 0x1f) << 0x20 | uVar8 & 0xffffffff) %
                 2000);
    iVar1 = iVar6 + -5000 + (uVar7 & 3) * 3000;
    (&DAT_0041f028)[uVar7] = (float)iVar1;
    uVar8 = FUN_004119a0(iVar1,iVar6);
    uVar7 = uVar7 + 1;
    *(float *)(uVar7 * 4 + 0x41e9e4) =
         (float)(int)((longlong)((ulonglong)(uint)((int)uVar8 >> 0x1f) << 0x20 | uVar8 & 0xffffffff)
                     % 0x32);
  } while ((int)uVar7 < 0x10);
  uVar5 = FUN_00417400(10,80000.0,iVar2);
  uVar5 = FUN_004164b0(puVar3,uVar5);
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)uVar5 >> 8),1);
}


// ==== FUN_004091b0 @ 004091b0 ====

undefined4 __fastcall FUN_004091b0(int param_1)

{
  int iVar1;
  undefined4 *puVar2;
  undefined4 uVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004191ab;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  puVar2 = operator_new(0x1c);
  local_4 = 0;
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_004163c0(puVar2);
  }
  *(undefined4 **)(param_1 + 4) = puVar2;
  local_4 = 0xffffffff;
  uVar3 = FUN_00417400(3,600.0,DAT_0041d970);
  FUN_004164b0(*(void **)(param_1 + 4),uVar3);
  *(undefined1 *)(**(int **)(*(int *)(param_1 + 4) + 8) + 0x45) = 2;
  iVar1 = **(int **)(*(int *)(param_1 + 4) + 8);
  iVar5 = 0;
  if (0 < *(int *)(iVar1 + 0x34)) {
    iVar6 = 0;
    do {
      iVar4 = iVar6 + *(int *)(iVar1 + 0x30);
      iVar5 = iVar5 + 1;
      iVar6 = iVar6 + 0x30;
      *(undefined4 *)(iVar4 + 0x10) = *(undefined4 *)(iVar4 + 0x10);
      *(undefined4 *)(iVar4 + 0x14) = *(undefined4 *)(iVar4 + 0x14);
      *(undefined4 *)(iVar4 + 0x18) = *(undefined4 *)(iVar4 + 0x18);
      *(undefined4 *)(iVar4 + 0x1c) = *(undefined4 *)(iVar4 + 0x1c);
      *(undefined4 *)(iVar4 + 0x20) = *(undefined4 *)(iVar4 + 0x20);
      *(undefined4 *)(iVar4 + 0x24) = *(undefined4 *)(iVar4 + 0x24);
      *(undefined4 *)(iVar4 + 0x28) = *(undefined4 *)(iVar4 + 0x28);
      *(undefined4 *)(iVar4 + 0x2c) = *(undefined4 *)(iVar4 + 0x2c);
    } while (iVar5 < *(int *)(iVar1 + 0x34));
    ExceptionList = local_c;
    return CONCAT31((int3)((uint)*(int *)(iVar1 + 0x34) >> 8),1);
  }
  ExceptionList = local_c;
  return CONCAT31((int3)((uint)*(int *)(iVar1 + 0x34) >> 8),1);
}


// ==== FUN_00409430 @ 00409430 ====

void FUN_00409430(undefined4 param_1,undefined *param_2)

{
  if (DAT_0041f070 == 0) {
    DAT_0041f07c = param_2;
    DAT_0041f068 = FUN_00409770((uint)(DAT_0041f074 == '\0'),1,'\x01');
    (**(code **)*DAT_0041f068)(DAT_0041f068,param_1,0,0,&DAT_0041f06c);
    if (param_2 != (undefined *)0x0) {
      (*(code *)param_2)(0x3f800000);
    }
    DAT_0041f070 = 1;
  }
  return;
}


// ==== FUN_00409490 @ 00409490 ====

void FUN_00409490(void)

{
  if (DAT_0041f070 == 1) {
    (**(code **)(*DAT_0041f068 + 4))(DAT_0041f068);
    DAT_0041f070 = 2;
  }
  return;
}


// ==== FUN_004094b0 @ 004094b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004094b0(undefined4 param_1)

{
  _DAT_0041f08c = param_1;
  FUN_00409490();
  return;
}


// ==== FUN_004094d0 @ 004094d0 ====

void FUN_004094d0(void)

{
  if (DAT_0041f070 == 2) {
    (**(code **)(*DAT_0041f068 + 8))(DAT_0041f068);
    (**(code **)(*DAT_0041f068 + 0x28))(DAT_0041f068);
    DAT_0041f070 = 0;
  }
  return;
}


// ==== FUN_00409500 @ 00409500 ====

void FUN_00409500(undefined1 *param_1,undefined1 *param_2)

{
  undefined2 uVar1;
  undefined1 *unaff_retaddr;
  
  if (DAT_0041f070 == 2) {
    uVar1 = (**(code **)(*DAT_0041f068 + 0x14))(DAT_0041f068);
    *param_1 = (char)uVar1;
    *unaff_retaddr = (char)((ushort)uVar1 >> 8);
    *param_2 = 0;
  }
  return;
}


// ==== FUN_00409530 @ 00409530 ====

undefined4 * __thiscall FUN_00409530(void *this,int param_1,undefined1 param_2,char param_3)

{
  void *pvVar1;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004191cb;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  *(undefined ***)this = &PTR_LAB_0041a9b8;
  pvVar1 = operator_new(0x5d63c);
  local_4 = 0;
  if (pvVar1 == (void *)0x0) {
    pvVar1 = (void *)0x0;
  }
  else {
    pvVar1 = (void *)FUN_004097d0((int)pvVar1);
  }
  local_4 = 0xffffffff;
  *(void **)((int)this + 4) = pvVar1;
  FUN_00409890(pvVar1,(uint)(param_1 == 0),param_2,param_3);
  ExceptionList = local_c;
  return this;
}


// ==== FUN_004095c0 @ 004095c0 ====

void __fastcall FUN_004095c0(undefined4 *param_1)

{
  void *pvVar1;
  
  pvVar1 = (void *)param_1[1];
  *param_1 = &PTR_LAB_0041a9b8;
  if (pvVar1 != (void *)0x0) {
    FUN_00409850((int)pvVar1);
    operator_delete(pvVar1);
  }
  return;
}


// ==== FUN_00409620 @ 00409620 ====

undefined4 FUN_00409620(int param_1)

{
  FUN_00409db0();
  FUN_00409b60(*(int *)(param_1 + 4));
  FUN_00409bd0(*(char **)(param_1 + 4));
  return 0;
}


// ==== FUN_00409710 @ 00409710 ====

void FUN_00409710(undefined4 *param_1)

{
  if (param_1 != (undefined4 *)0x0) {
    FUN_004095c0(param_1);
    operator_delete(param_1);
  }
  return;
}


// ==== FUN_00409770 @ 00409770 ====

undefined4 * __cdecl FUN_00409770(int param_1,undefined1 param_2,char param_3)

{
  void *this;
  undefined4 *puVar1;
  
  this = operator_new(8);
  if (this != (void *)0x0) {
    puVar1 = FUN_00409530(this,param_1,param_2,param_3);
    return puVar1;
  }
  return (undefined4 *)0x0;
}


// ==== FUN_004097a0 @ 004097a0 ====

void __fastcall FUN_004097a0(int param_1)

{
  *(undefined1 *)(param_1 + 0xb0) = 0;
  *(undefined1 *)(param_1 + 0xb1) = 0;
  *(undefined1 *)(param_1 + 0xb2) = 0;
  *(undefined1 *)(param_1 + 0xb5) = 1;
  *(undefined1 *)(param_1 + 0xc4) = 0;
  return;
}


// ==== FUN_004097d0 @ 004097d0 ====

int __fastcall FUN_004097d0(int param_1)

{
  void *this;
  int iVar1;
  int iVar2;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004191eb;
  local_c = ExceptionList;
  iVar1 = 0x40;
  iVar2 = param_1 + 0xc;
  ExceptionList = &local_c;
  do {
    FUN_004097a0(iVar2);
    iVar2 = iVar2 + 200;
    iVar1 = iVar1 + -1;
  } while (iVar1 != 0);
  this = operator_new(0xfaf0);
  local_4 = 0;
  if (this == (void *)0x0) {
    iVar2 = 0;
  }
  else {
    iVar2 = FUN_0040b580(this,param_1);
  }
  *(int *)(param_1 + 8) = iVar2;
  ExceptionList = local_c;
  return param_1;
}


// ==== FUN_00409850 @ 00409850 ====

void __fastcall FUN_00409850(int param_1)

{
  void *pvVar1;
  undefined4 *puVar2;
  
  pvVar1 = *(void **)(param_1 + 8);
  if (pvVar1 != (void *)0x0) {
    thunk_FUN_0040b5f0((int)pvVar1);
    operator_delete(pvVar1);
  }
  puVar2 = *(undefined4 **)(param_1 + 0x3224);
  if (puVar2 != (undefined4 *)0x0) {
    FUN_0040d330(puVar2);
    operator_delete(puVar2);
  }
  return;
}


// ==== FUN_00409890 @ 00409890 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __thiscall FUN_00409890(void *this,int param_1,undefined1 param_2,char param_3)

{
  HMODULE pHVar1;
  undefined4 *puVar2;
  UINT UVar3;
  HGLOBAL pvVar4;
  undefined4 uVar5;
  float *pfVar6;
  int iVar7;
  float10 fVar8;
  void *local_10;
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_00419237;
  pvStack_c = ExceptionList;
  ExceptionList = &pvStack_c;
  local_10 = this;
  pHVar1 = GetModuleHandleA((LPCSTR)0x0);
  VirtualProtect((LPVOID)((int)&pHVar1->unused +
                         *(int *)((int)&pHVar1[0xb].unused + pHVar1[0xf].unused)),
                 *(SIZE_T *)((int)&pHVar1[7].unused + pHVar1[0xf].unused),4,(PDWORD)&local_10);
  *(undefined1 *)((int)this + 0x3230) = param_2;
  if (param_1 != 0) {
    *(undefined4 *)((int)this + 0x3234) = 0xffffffff;
    *(undefined1 *)this = 1;
    puVar2 = operator_new(0x40);
    local_4 = 0;
    if (puVar2 == (undefined4 *)0x0) {
      puVar2 = (undefined4 *)0x0;
    }
    else {
      FUN_0040d270(puVar2);
      *puVar2 = &PTR_LAB_0041aa54;
    }
    *(undefined4 **)((int)this + 0x3224) = puVar2;
    local_4 = 0xffffffff;
    DAT_0041f088._0_2_ = 0xac44;
    DAT_0041f080 = 0x11a;
    goto LAB_00409a4f;
  }
  *(undefined1 *)this = 0;
  UVar3 = FUN_0040b130();
  *(UINT *)((int)this + 0x3234) = UVar3;
  if (UVar3 == 0xffffffff) {
    *(undefined1 *)this = 1;
    puVar2 = operator_new(0x40);
    local_4 = 1;
    if (puVar2 == (undefined4 *)0x0) {
      local_4 = 0xffffffff;
      *(undefined4 *)((int)this + 0x3224) = 0;
    }
    else {
      FUN_0040d270(puVar2);
      *puVar2 = &PTR_LAB_0041aa54;
      local_4 = 0xffffffff;
      *(undefined4 **)((int)this + 0x3224) = puVar2;
    }
    goto LAB_00409a4f;
  }
  if (*(char *)((int)this + 0x3230) == '\0') {
    puVar2 = operator_new(0x40);
    local_4 = 4;
    if (puVar2 == (undefined4 *)0x0) goto LAB_00409a2d;
    FUN_0040d270(puVar2);
    *puVar2 = &PTR_LAB_0041aa18;
  }
  else if (param_3 == '\0') {
    puVar2 = operator_new(0x40);
    local_4 = 3;
    if (puVar2 == (undefined4 *)0x0) goto LAB_00409a2d;
    FUN_0040d270(puVar2);
    *puVar2 = &PTR_LAB_0041aa2c;
  }
  else {
    puVar2 = operator_new(0x40);
    local_4 = 2;
    if (puVar2 == (undefined4 *)0x0) {
LAB_00409a2d:
      puVar2 = (undefined4 *)0x0;
    }
    else {
      FUN_0040d270(puVar2);
      *puVar2 = &PTR_LAB_0041aa40;
    }
  }
  local_4 = 0xffffffff;
  *(undefined4 **)((int)this + 0x3224) = puVar2;
  pvVar4 = GlobalAlloc(0,0x80000);
  *(HGLOBAL *)(*(int *)((int)this + 0x3224) + 0x1c) = pvVar4;
LAB_00409a4f:
  FUN_0040b5a0(*(int *)((int)this + 8));
  iVar7 = 0;
  puVar2 = (undefined4 *)((int)this + 0x3238);
  do {
    uVar5 = ftol();
    *puVar2 = uVar5;
    iVar7 = iVar7 + 1;
    puVar2 = puVar2 + 1;
  } while (iVar7 < 0xff);
  iVar7 = 0;
  pfVar6 = (float *)((int)this + 0x3634);
  do {
    if (iVar7 < 0xf00) {
      fVar8 = (float10)_CIpow();
      fVar8 = (float10)_DAT_0041a310 / fVar8;
    }
    else {
      fVar8 = (float10)_CIpow();
    }
    *pfVar6 = (float)fVar8;
    iVar7 = iVar7 + 1;
    pfVar6 = pfVar6 + 1;
  } while (iVar7 < 0x1e00);
  ExceptionList = pvStack_c;
  return 1;
}


// ==== FUN_00409b60 @ 00409b60 ====

undefined4 __fastcall FUN_00409b60(int param_1)

{
  return *(undefined4 *)(param_1 + 0x3234);
}


// ==== FUN_00409b70 @ 00409b70 ====

undefined4 __fastcall FUN_00409b70(char *param_1)

{
  char *local_4;
  
  DAT_0041f090 = 1;
  local_4 = param_1;
  do {
    GetExitCodeThread(*(HANDLE *)(param_1 + 0x322c),(LPDWORD)&local_4);
  } while (local_4 == (char *)0x103);
  if (*param_1 == '\0') {
    FUN_0040b0e0();
  }
  DeleteCriticalSection(*(LPCRITICAL_SECTION *)(param_1 + 4));
  operator_delete(*(void **)(param_1 + 4));
  return 1;
}


// ==== FUN_00409bd0 @ 00409bd0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __fastcall FUN_00409bd0(char *param_1)

{
  char cVar1;
  byte bVar2;
  void *this;
  undefined4 *puVar3;
  DWORD DVar4;
  LPCRITICAL_SECTION lpCriticalSection;
  HANDLE hThread;
  int iVar5;
  char *pcVar6;
  int iVar7;
  char *pcVar8;
  
  this = *(void **)(param_1 + 8);
  param_1[0x320c] = *(char *)((int)this + 0x33);
  cVar1 = *(char *)((int)this + 0x32);
  param_1[0x320e] = cVar1;
  param_1[0x320d] = cVar1;
  cVar1 = DAT_0041f08c;
  param_1[0x3216] = '\0';
  param_1[0x3215] = cVar1;
  param_1[0x3218] = '\0';
  param_1[0x3219] = '\0';
  param_1[0x321a] = '\0';
  param_1[0x321b] = '\0';
  param_1[0x3210] = '\0';
  param_1[0x3211] = '\0';
  param_1[0x3212] = '\0';
  param_1[0x3213] = '\0';
  param_1[0x3217] = *(char *)((int)this + 0x30);
  cVar1 = *(char *)((uint)(byte)param_1[0x3215] + *(int *)((int)this + 200));
  do {
    if (cVar1 != -2) {
      bVar2 = *(byte *)((uint)(byte)param_1[0x3215] + *(int *)((int)this + 200));
      param_1[0x3214] = bVar2;
      puVar3 = FUN_0040c880(this,(uint)bVar2);
      *(undefined4 **)(param_1 + 0x3220) = puVar3;
      iVar7 = 0;
      *(undefined4 *)(param_1 + 0x321c) =
           *(undefined4 *)(*(int *)(*(int *)(param_1 + 8) + 0xd8) + (uint)(byte)param_1[0x3214] * 4)
      ;
      pcVar6 = param_1 + 0xc;
      do {
        iVar7 = iVar7 + 1;
        pcVar8 = pcVar6;
        for (iVar5 = 0x32; iVar5 != 0; iVar5 = iVar5 + -1) {
          pcVar8[0] = '\0';
          pcVar8[1] = '\0';
          pcVar8[2] = '\0';
          pcVar8[3] = '\0';
          pcVar8 = pcVar8 + 4;
        }
        pcVar6[0x28] = *(char *)(*(int *)(param_1 + 8) + 0x7f + iVar7);
        pcVar6[0x29] = *(char *)(*(int *)(param_1 + 8) + 0x3f + iVar7);
        *pcVar6 = '\0';
        pcVar6 = pcVar6 + 200;
      } while (iVar7 < 0x40);
      FUN_0040d290(*(void **)(param_1 + 0x3224),_DAT_0041f080 & 0xffff,DAT_0041f088 & 0xffff);
      iVar7 = 0;
      *(undefined4 *)(*(int *)(param_1 + 0x3224) + 0x10) = 0;
      if (0 < *(int *)(*(int *)(param_1 + 0x3224) + 0x28)) {
        do {
          FUN_00409e80(param_1);
          FUN_00409ec0((int)param_1);
          iVar7 = iVar7 + 1;
        } while (iVar7 < *(int *)(*(int *)(param_1 + 0x3224) + 0x28));
      }
      if (*param_1 == '\0') {
        FUN_0040afd0(*(undefined4 *)(*(int *)(param_1 + 0x3224) + 0x1c));
      }
      else {
        DVar4 = timeGetTime();
        *(DWORD *)(param_1 + 0x5d634) = DVar4;
      }
      param_1[0x5d638] = '\0';
      param_1[0x5d639] = '\0';
      param_1[0x5d63a] = '\0';
      param_1[0x5d63b] = '\0';
      DAT_0041f090 = 0;
      DAT_0041f084 = param_1;
      lpCriticalSection = operator_new(0x18);
      *(LPCRITICAL_SECTION *)(param_1 + 4) = lpCriticalSection;
      InitializeCriticalSection(lpCriticalSection);
      hThread = CreateThread((LPSECURITY_ATTRIBUTES)0x0,0,(LPTHREAD_START_ROUTINE)&LAB_00409b10,
                             (LPVOID)0x8,0,(LPDWORD)(param_1 + 0x3228));
      *(HANDLE *)(param_1 + 0x322c) = hThread;
      SetThreadPriority(hThread,1);
      return 1;
    }
    cVar1 = param_1[0x3215];
    param_1[0x3215] = cVar1 + 1U;
    cVar1 = *(char *)((uint)(byte)(cVar1 + 1U) + *(int *)((int)this + 200));
  } while (cVar1 != -1);
  return 0;
}


// ==== FUN_00409db0 @ 00409db0 ====

undefined4 FUN_00409db0(void)

{
  return 1;
}


// ==== FUN_00409dc0 @ 00409dc0 ====

void __fastcall FUN_00409dc0(char *param_1)

{
  if (*param_1 != '\0') {
    timeGetTime();
    ftol();
    return;
  }
  FUN_0040b3e0();
  return;
}


// ==== FUN_00409e10 @ 00409e10 ====

void __thiscall FUN_00409e10(void *this,char param_1)

{
  uint uVar1;
  uint uVar2;
  int iVar3;
  
  while( true ) {
    if (param_1 == '\0') {
      uVar1 = 0x7fffffff;
      *(undefined4 *)((int)this + 0x3218) = 0;
    }
    else {
      uVar1 = FUN_00409dc0(this);
      uVar2 = FUN_0040d3e0(*(void **)((int)this + 0x3224),uVar1);
      *(uint *)((int)this + 0x3218) = uVar2;
    }
    FUN_0040d390(*(void **)((int)this + 0x3224),uVar1);
    iVar3 = FUN_0040d440(*(void **)((int)this + 0x3224),uVar1);
    if (iVar3 == -1) break;
    FUN_00409e80(this);
    FUN_00409ec0((int)this);
  }
  return;
}


// ==== FUN_00409e80 @ 00409e80 ====

void __fastcall FUN_00409e80(void *param_1)

{
  if (*(char *)((int)param_1 + 0x320e) != '\0') {
    *(char *)((int)param_1 + 0x320e) = *(char *)((int)param_1 + 0x320e) + -1;
  }
  if (*(char *)((int)param_1 + 0x320e) != '\0') {
    FUN_00409f50(param_1);
    return;
  }
  FUN_0040a240(param_1);
  return;
}


// ==== FUN_00409eb0 @ 00409eb0 ====

undefined1 __fastcall FUN_00409eb0(undefined1 *param_1)

{
  return *param_1;
}


// ==== FUN_00409ec0 @ 00409ec0 ====

void __fastcall FUN_00409ec0(int param_1)

{
  undefined1 uVar1;
  undefined3 extraout_var;
  int iVar2;
  int iVar3;
  int unaff_retaddr;
  
  (**(code **)(**(int **)(param_1 + 0x3224) + 4))(*(undefined1 *)(param_1 + 0x320c));
  iVar3 = param_1 + 0x94;
  iVar2 = 0x40;
  do {
    uVar1 = FUN_00409eb0((undefined1 *)(iVar3 + -0x88));
    if (CONCAT31(extraout_var,uVar1) != 0) {
      (**(code **)**(undefined4 **)(param_1 + 0x3224))(iVar3);
    }
    iVar3 = iVar3 + 200;
    iVar2 = iVar2 + -1;
  } while (iVar2 != 0);
  (**(code **)(**(int **)(param_1 + 0x3224) + 8))(unaff_retaddr);
  *(uint *)(*(int *)(*(int *)(param_1 + 0x3224) + 0x38) + 0xc + unaff_retaddr * 0x14) =
       (uint)*(byte *)(param_1 + 0x3215);
  *(uint *)(*(int *)(*(int *)(param_1 + 0x3224) + 0x38) + 0x10 + unaff_retaddr * 0x14) =
       (uint)*(byte *)(param_1 + 0x3216);
  return;
}


// ==== FUN_00409f50 @ 00409f50 ====

void __fastcall FUN_00409f50(void *param_1)

{
  char cVar1;
  int iVar2;
  char *pcVar3;
  
  iVar2 = 0;
  pcVar3 = (char *)((int)param_1 + 0xc);
  do {
    if ((&DAT_0041d304)[iVar2] != '\0') {
      pcVar3[0x24] = '\0';
      cVar1 = FUN_0040af20((int)pcVar3);
      if (cVar1 == '\0') {
        FUN_0040a740((int)pcVar3);
      }
      FUN_0040a870(param_1,pcVar3,pcVar3[4],pcVar3[5]);
      FUN_00409fb0((int)pcVar3);
      FUN_0040a1c0(param_1,pcVar3);
    }
    iVar2 = iVar2 + 1;
    pcVar3 = pcVar3 + 200;
  } while (iVar2 < 0x40);
  return;
}


// ==== FUN_00409fb0 @ 00409fb0 ====

void FUN_00409fb0(int param_1)

{
  uint uVar1;
  
  if (*(char *)(param_1 + 0x30) != '\0') {
    uVar1 = FUN_0040a010(param_1 + 0x30);
    *(byte *)(param_1 + 0x27) = *(byte *)(param_1 + 0x27) | (byte)uVar1;
    *(char *)(param_1 + 0x2c) = (char)((uint)*(undefined4 *)(param_1 + 0x38) >> 8);
  }
  if (*(char *)(param_1 + 0x48) != '\0') {
    FUN_0040a010(param_1 + 0x48);
    *(char *)(param_1 + 0x2d) = (char)((uint)*(undefined4 *)(param_1 + 0x50) >> 8);
  }
  if (*(char *)(param_1 + 0x60) != '\0') {
    FUN_0040a010(param_1 + 0x60);
    *(char *)(param_1 + 0x2e) = (char)((uint)*(undefined4 *)(param_1 + 0x68) >> 8);
  }
  return;
}


// ==== FUN_0040a010 @ 0040a010 ====

uint __fastcall FUN_0040a010(int param_1)

{
  undefined2 *puVar1;
  byte bVar2;
  byte bVar3;
  undefined1 uVar4;
  undefined2 uVar5;
  int iVar6;
  uint3 uVar7;
  byte *pbVar8;
  int iVar9;
  uint uVar10;
  byte bVar11;
  undefined1 uStack_f;
  char local_8;
  undefined1 uStack_7;
  byte bStack_6;
  
  bVar11 = *(byte *)(param_1 + 0x10);
  if ((bVar11 == 0) && (pbVar8 = *(byte **)(param_1 + 0x14), (*pbVar8 & 4) != 0)) {
    *(byte *)(param_1 + 2) = pbVar8[4];
    *(byte *)(param_1 + 3) = pbVar8[5];
    *(undefined1 *)(param_1 + 0x10) = 2;
  }
  else {
    pbVar8 = *(byte **)(param_1 + 0x14);
    if ((*pbVar8 & 2) == 0) {
      *(undefined1 *)(param_1 + 2) = 0;
      bVar11 = bVar11 & 0xfd;
      *(byte *)(param_1 + 3) = pbVar8[1] - 1;
    }
    else {
      bVar11 = bVar11 | 2;
      *(byte *)(param_1 + 2) = pbVar8[2];
      *(byte *)(param_1 + 3) = pbVar8[3];
    }
    *(byte *)(param_1 + 0x10) = bVar11;
  }
  uVar5 = *(undefined2 *)(pbVar8 + (*(byte *)(param_1 + 1) + 2) * 3);
  local_8 = (char)uVar5;
  uStack_7 = (undefined1)((ushort)uVar5 >> 8);
  bStack_6 = (pbVar8 + (*(byte *)(param_1 + 1) + 2) * 3)[2];
  if (pbVar8[1] == 7) {
    pbVar8[1] = 7;
  }
  bVar11 = *(byte *)(param_1 + 1);
  bVar2 = *(byte *)(param_1 + 3);
  if ((bVar11 == bVar2) && ((*(byte *)(param_1 + 0x10) & 2) == 0)) {
    *(int *)(param_1 + 8) = (int)local_8 << 8;
    return CONCAT31((int3)((uint)pbVar8 >> 8),1);
  }
  bVar3 = *(byte *)(param_1 + 2);
  if ((bVar3 == bVar2) && (bVar11 == bVar3)) {
    *(int *)(param_1 + 8) = (int)local_8 << 8;
    return (int)local_8 << 8;
  }
  if (bVar11 == bVar2) {
    *(byte *)(param_1 + 1) = bVar3;
    puVar1 = (undefined2 *)(*(int *)(param_1 + 0x14) + (bVar3 + 2) * 3);
    uVar5 = *puVar1;
    local_8 = (char)uVar5;
    uStack_7 = (undefined1)((ushort)uVar5 >> 8);
    bStack_6 = *(byte *)(puVar1 + 1);
    *(int *)(param_1 + 8) = (int)local_8 << 8;
    *(uint *)(param_1 + 4) = (uint)*(ushort *)((uint)bVar3 * 3 + 7 + *(int *)(param_1 + 0x14));
  }
  iVar6 = *(int *)(param_1 + 0x14);
  bVar11 = *(char *)(param_1 + 1) + 1;
  puVar1 = (undefined2 *)(iVar6 + (bVar11 + 2) * 3);
  uStack_f = (undefined1)((ushort)*puVar1 >> 8);
  uVar4 = *(undefined1 *)(puVar1 + 1);
  uVar7 = (uint3)CONCAT11(uVar4,uStack_f);
  if (CONCAT11(uVar4,uStack_f) == CONCAT11(bStack_6,uStack_7)) {
    *(undefined4 *)(param_1 + 0xc) = 0;
  }
  else {
    iVar9 = ftol();
    *(int *)(param_1 + 0xc) = iVar9 / (int)((uint)uVar7 - (uint)CONCAT11(bStack_6,uStack_7));
  }
  uVar10 = *(int *)(param_1 + 4) + 1;
  *(int *)(param_1 + 8) = *(int *)(param_1 + 8) + *(int *)(param_1 + 0xc);
  *(uint *)(param_1 + 4) = uVar10;
  if (uVar7 < uVar10) {
    *(byte *)(param_1 + 1) = bVar11;
    uVar10 = iVar6 + (bVar11 + 2) * 2;
    *(int *)(param_1 + 8) = (int)*(char *)(bVar11 + 2 + uVar10) << 8;
  }
  return uVar10 & 0xffffff00;
}


// ==== FUN_0040a1c0 @ 0040a1c0 ====

void __thiscall FUN_0040a1c0(void *this,char *param_1)

{
  int iVar1;
  uint uVar2;
  undefined4 uVar3;
  int iVar4;
  
  if (param_1[0x27] != '\0') {
    iVar1 = *(int *)(param_1 + 0x7c);
    iVar4 = *(int *)(param_1 + 0x78) - (uint)*(ushort *)(iVar1 + 0x14);
    *(int *)(param_1 + 0x78) = iVar4;
    if (iVar4 < 0) {
      param_1[0x78] = '\0';
      param_1[0x79] = '\0';
      param_1[0x7a] = '\0';
      param_1[0x7b] = '\0';
    }
    if ((*(int *)(param_1 + 0x78) == 0) || (*(short *)(iVar1 + 0x14) == 0)) {
      *param_1 = '\0';
    }
  }
  if (param_1[0x26] != '\0') {
    param_1[0x26] = '\0';
    *param_1 = '\0';
  }
  if (*param_1 != '\0') {
    uVar2 = FUN_0040a650(this,(int)param_1);
    *(uint *)(param_1 + 0x9c) = uVar2 & 0xff;
    uVar2 = FUN_0040a6b0((int)param_1);
    *(uint *)(param_1 + 0x98) = uVar2 & 0xff;
    uVar3 = FUN_0040a6f0();
    *(undefined4 *)(param_1 + 0xac) = uVar3;
  }
  return;
}


// ==== FUN_0040a240 @ 0040a240 ====

void __fastcall FUN_0040a240(void *param_1)

{
  char *pcVar1;
  char cVar2;
  void *this;
  byte bVar3;
  char cVar4;
  undefined4 *puVar5;
  char *pcVar6;
  int local_4;
  
  *(undefined1 *)((int)param_1 + 0x320e) = *(undefined1 *)((int)param_1 + 0x320d);
  if ((*(ushort *)(*(int *)((int)param_1 + 0x321c) + 2) <= (ushort)*(byte *)((int)param_1 + 0x3216))
     || ((*(uint *)((int)param_1 + 0x3210) & 0x100) != 0)) {
    this = *(void **)((int)param_1 + 8);
    *(undefined1 *)((int)param_1 + 0x3216) = *(undefined1 *)((int)param_1 + 0x3210);
    *(undefined4 *)((int)param_1 + 0x3210) = 0;
    do {
      bVar3 = *(char *)((int)param_1 + 0x3215) + 1;
      *(byte *)((int)param_1 + 0x3215) = bVar3;
      if (*(char *)((uint)bVar3 + *(int *)((int)this + 200)) == -1) {
        *(undefined1 *)((int)param_1 + 0x3215) = 0;
        *(int *)((int)param_1 + 0x5d638) =
             *(int *)(*(int *)((int)param_1 + 0x3224) + 0x18) * 0x80000 +
             *(int *)(*(int *)((int)param_1 + 0x3224) + 0x10);
      }
    } while (*(char *)((uint)*(byte *)((int)param_1 + 0x3215) + *(int *)((int)this + 200)) == -2);
    bVar3 = *(byte *)((uint)*(byte *)((int)param_1 + 0x3215) + *(int *)((int)this + 200));
    *(byte *)((int)param_1 + 0x3214) = bVar3;
    puVar5 = FUN_0040c880(this,(uint)bVar3);
    *(undefined4 **)((int)param_1 + 0x3220) = puVar5;
    *(undefined4 *)((int)param_1 + 0x321c) =
         *(undefined4 *)
          (*(int *)(*(int *)((int)param_1 + 8) + 0xd8) + (uint)*(byte *)((int)param_1 + 0x3214) * 4)
    ;
  }
  pcVar6 = (char *)((int)param_1 + 0xd0);
  local_4 = 0;
  do {
    puVar5 = (undefined4 *)
             (((uint)*(byte *)((int)param_1 + 0x3216) * 0x40 + local_4) * 5 +
             *(int *)((int)param_1 + 0x3220));
    *(undefined4 *)(pcVar6 + -0xc3) = *puVar5;
    pcVar6[-0xbf] = *(char *)(puVar5 + 1);
    if ((&DAT_0041d304)[local_4] != '\0') {
      cVar2 = pcVar6[-0xc0];
      pcVar6[-0xa0] = '\0';
      pcVar1 = pcVar6 + -0xc4;
      cVar4 = FUN_0040af20((int)pcVar1);
      if (pcVar6[-0xc0] == '\b') {
        *pcVar6 = '\x01';
      }
      else {
        if (*pcVar6 != '\0') {
          *(undefined4 *)(pcVar6 + -0xa8) = *(undefined4 *)(pcVar6 + -0xa4);
        }
        *pcVar6 = '\0';
      }
      if (cVar4 == '\0' && cVar2 != '\a') {
        FUN_0040a470((int)pcVar1);
        FUN_0040a4e0(param_1,(int)pcVar1);
      }
      if (pcVar6[-0xc0] == '\x0f') {
        *(uint *)(pcVar6 + -0xb0) = (uint)(byte)pcVar6[-0xbf] << 8;
      }
      if (pcVar6[-0xa0] != '\0') {
        FUN_0040a590(param_1,pcVar1);
      }
      if (cVar4 == '\0' && cVar2 != '\a') {
        FUN_0040a740((int)pcVar1);
      }
      FUN_0040ab20(param_1,pcVar1,pcVar6[-0xc0],pcVar6[-0xbf]);
      FUN_0040a870(param_1,pcVar1,pcVar6[-0xc0],pcVar6[-0xbf]);
      FUN_00409fb0((int)pcVar1);
      FUN_0040a1c0(param_1,pcVar1);
      FUN_0040ad50(param_1,pcVar1);
    }
    local_4 = local_4 + 1;
    pcVar6 = pcVar6 + 200;
  } while (local_4 < 0x40);
  *(char *)((int)param_1 + 0x3216) = *(char *)((int)param_1 + 0x3216) + '\x01';
  return;
}


// ==== FUN_0040a470 @ 0040a470 ====

void FUN_0040a470(int param_1)

{
  byte bVar1;
  
  bVar1 = *(byte *)(param_1 + 1);
  if (bVar1 != 0) {
    if (bVar1 == 0xfe) {
      *(undefined1 *)(param_1 + 0x26) = 1;
      return;
    }
    if (bVar1 == 0xff) {
      *(undefined1 *)(param_1 + 0x25) = 1;
      return;
    }
    if (bVar1 < 0x78) {
      *(byte *)(param_1 + 6) = bVar1;
      *(byte *)(param_1 + 0xb) = bVar1;
      *(undefined1 *)(param_1 + 0x2c) = 0x40;
      *(undefined1 *)(param_1 + 0x2e) = 0x20;
      *(undefined1 *)(param_1 + 0x2d) = 0x20;
      *(undefined4 *)(param_1 + 0x10) = 0x2000;
      *(undefined4 *)(param_1 + 0x78) = 0x400;
      *(undefined1 *)(param_1 + 0x26) = 0;
      *(undefined1 *)(param_1 + 0x25) = 0;
      *(undefined1 *)(param_1 + 0x27) = 0;
      *(undefined1 *)(param_1 + 0x24) = 1;
      *(undefined4 *)(param_1 + 0x14) = 0;
      return;
    }
    *(undefined1 *)(param_1 + 0x27) = 1;
  }
  return;
}


// ==== FUN_0040a4e0 @ 0040a4e0 ====

void __thiscall FUN_0040a4e0(void *this,int param_1)

{
  byte bVar1;
  int iVar2;
  
  bVar1 = *(byte *)(param_1 + 2);
  if (bVar1 != 0) {
    *(byte *)(param_1 + 7) = bVar1;
    *(byte *)(param_1 + 0xc) = bVar1;
    iVar2 = *(int *)(*(int *)(*(int *)((int)this + 8) + 0xcc) + -4 + (uint)bVar1 * 4);
    *(int *)(param_1 + 0x7c) = iVar2;
    *(byte *)(param_1 + 0x24) = *(byte *)(param_1 + 0x24) | 2;
    *(undefined1 *)(param_1 + 0x31) = 0;
    *(undefined4 *)(param_1 + 0x34) = 0;
    bVar1 = *(byte *)(iVar2 + 0x130);
    *(int *)(param_1 + 0x44) = iVar2 + 0x130;
    *(byte *)(param_1 + 0x30) = bVar1 & 1;
    *(int *)(param_1 + 0x38) = (int)*(char *)(iVar2 + 0x136) << 8;
    *(undefined1 *)(param_1 + 0x49) = 0;
    *(undefined4 *)(param_1 + 0x4c) = 0;
    bVar1 = *(byte *)(iVar2 + 0x182);
    *(byte **)(param_1 + 0x5c) = (byte *)(iVar2 + 0x182);
    *(byte *)(param_1 + 0x48) = bVar1 & 1;
    *(int *)(param_1 + 0x50) = (int)*(char *)(iVar2 + 0x188) << 8;
    *(undefined1 *)(param_1 + 0x61) = 0;
    *(undefined4 *)(param_1 + 100) = 0;
    bVar1 = *(byte *)(iVar2 + 0x1d4);
    *(byte **)(param_1 + 0x74) = (byte *)(iVar2 + 0x1d4);
    *(byte *)(param_1 + 0x60) = bVar1 & 1;
    *(int *)(param_1 + 0x68) = (int)*(char *)(iVar2 + 0x1da) << 8;
  }
  return;
}


// ==== FUN_0040a590 @ 0040a590 ====

void __thiscall FUN_0040a590(void *this,undefined1 *param_1)

{
  byte bVar1;
  undefined4 uVar2;
  int iVar3;
  
  bVar1 = *(byte *)(*(int *)(param_1 + 0x7c) + 0x41 + (uint)(byte)param_1[0xb] * 2);
  param_1[0x84] = bVar1;
  *(undefined4 *)(param_1 + 0x80) =
       *(undefined4 *)(*(int *)(*(int *)((int)this + 8) + 0xd0) + -4 + (uint)bVar1 * 4);
  iVar3 = (uint)*(byte *)(*(int *)(param_1 + 0x7c) + 0x40 + (uint)(byte)param_1[0xb] * 2) << 6;
  *(int *)(param_1 + 0x1c) = iVar3;
  *(int *)(param_1 + 0x20) = iVar3;
  iVar3 = *(int *)(param_1 + 0x80);
  if ((*(byte *)(iVar3 + 0x12) & 1) == 0) {
    *param_1 = 0;
    return;
  }
  *param_1 = 1;
  *(int *)(param_1 + 0x88) = *(int *)(param_1 + 0x14) << 8;
  uVar2 = *(undefined4 *)
           (*(int *)(*(int *)((int)this + 8) + 0xd4) + -4 + (uint)(byte)param_1[0x84] * 4);
  *(undefined4 *)(param_1 + 0x90) = 1;
  *(undefined4 *)(param_1 + 0x8c) = uVar2;
  *(uint *)(param_1 + 0x94) = (-(uint)((*(byte *)(iVar3 + 0x12) & 2) != 0) & 8) + 8;
  param_1[0x2a] = *(undefined1 *)(iVar3 + 0x13);
  param_1[0x2b] = *(undefined1 *)(iVar3 + 0x2f);
  return;
}


// ==== FUN_0040a650 @ 0040a650 ====

uint __thiscall FUN_0040a650(void *this,int param_1)

{
  return (((uint)*(byte *)(*(int *)(param_1 + 0x80) + 0x11) * (uint)*(byte *)(param_1 + 0x2a) *
           (uint)*(byte *)(param_1 + 0x28) >> 10) * (uint)*(byte *)(*(int *)(param_1 + 0x7c) + 0x18)
          * (uint)*(byte *)(param_1 + 0x2c) >> 10) * (uint)*(byte *)(*(int *)((int)this + 8) + 0x30)
         * *(int *)(param_1 + 0x78) >> 0x15;
}


// ==== FUN_0040a6b0 @ 0040a6b0 ====

undefined4 FUN_0040a6b0(int param_1)

{
  byte bVar1;
  char cVar2;
  int iVar3;
  uint uVar4;
  
  if ((*(byte *)(param_1 + 0x2b) & 0x80) == 0) {
    bVar1 = *(byte *)(param_1 + 0x29);
  }
  else {
    bVar1 = *(byte *)(param_1 + 0x2b) & 0x7f;
  }
  cVar2 = bVar1 - 0x20;
  uVar4 = (int)cVar2 >> 0x1f;
  iVar3 = (0x20 - (((int)cVar2 ^ uVar4) - uVar4)) * (*(byte *)(param_1 + 0x2d) - 0x20);
  return CONCAT31((int3)(iVar3 >> 0xd),(char)(iVar3 >> 5) + cVar2 + ' ');
}


// ==== FUN_0040a6f0 @ 0040a6f0 ====

void FUN_0040a6f0(void)

{
  ftol();
  return;
}


// ==== FUN_0040a740 @ 0040a740 ====

void FUN_0040a740(int param_1)

{
  byte bVar1;
  
  bVar1 = *(byte *)(param_1 + 3);
  if (bVar1 < 0x41) {
    *(byte *)(param_1 + 0x2a) = bVar1;
  }
  if ((0x7f < bVar1) && (bVar1 < 0xc1)) {
    *(byte *)(param_1 + 0x2b) = bVar1 + 0x80;
  }
  return;
}


// ==== FUN_0040a760 @ 0040a760 ====

undefined4 __fastcall FUN_0040a760(int param_1)

{
  return *(undefined4 *)(param_1 + 0x3218);
}


// ==== FUN_0040a770 @ 0040a770 ====

float10 __fastcall FUN_0040a770(int param_1)

{
  undefined4 local_8;
  undefined4 local_4;
  
  local_8 = DAT_0041f088 & 0xffff;
  if (((byte)DAT_0041f080 & 2) != 0) {
    local_8 = local_8 << 1;
  }
  if (((byte)DAT_0041f080 & 8) != 0) {
    local_8 = local_8 << 1;
  }
  local_4 = FUN_0040b3e0();
  local_4 = local_4 - *(int *)(param_1 + 0x5d638);
  if (local_4 < 0) {
    local_4 = 0;
  }
  return (float10)local_4 / (float10)local_8;
}


// ==== FUN_0040a7d0 @ 0040a7d0 ====

void __thiscall FUN_0040a7d0(void *this,undefined4 param_1)

{
  void *this_00;
  undefined4 *puVar1;
  byte bVar2;
  
  this_00 = *(void **)((int)this + 8);
  *(char *)((int)this + 0x3216) = (char)param_1;
  *(undefined4 *)((int)this + 0x3210) = 0;
  *(char *)((int)this + 0x3215) = (char)((uint)param_1 >> 8) + -1;
  do {
    bVar2 = *(char *)((int)this + 0x3215) + 1;
    *(byte *)((int)this + 0x3215) = bVar2;
    if (*(char *)((uint)bVar2 + *(int *)((int)this_00 + 200)) == -1) {
      *(undefined1 *)((int)this + 0x3215) = 0;
    }
  } while (*(char *)((uint)*(byte *)((int)this + 0x3215) + *(int *)((int)this_00 + 200)) == -2);
  bVar2 = *(byte *)((uint)*(byte *)((int)this + 0x3215) + *(int *)((int)this_00 + 200));
  *(byte *)((int)this + 0x3214) = bVar2;
  puVar1 = FUN_0040c880(this_00,(uint)bVar2);
  *(undefined4 **)((int)this + 0x3220) = puVar1;
  *(undefined4 *)((int)this + 0x321c) =
       *(undefined4 *)
        (*(int *)(*(int *)((int)this + 8) + 0xd8) + (uint)*(byte *)((int)this + 0x3214) * 4);
  return;
}


// ==== FUN_0040a870 @ 0040a870 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040a870(void *this,char *param_1,undefined1 param_2,byte param_3)

{
  byte bVar1;
  uint uVar2;
  int iVar3;
  undefined4 uVar4;
  int iVar5;
  float10 fVar6;
  
  bVar1 = param_3;
  _param_3 = (uint)param_3;
  iVar5 = *(int *)(param_1 + 0xc0);
  *(uint *)(param_1 + 0xc0) = iVar5 + 1U;
  switch(param_2) {
  case 4:
    if (bVar1 == 0) {
      bVar1 = param_1[0xb0];
      _param_3 = (uint)bVar1;
    }
    else {
      param_1[0xb0] = bVar1;
    }
    if ((bVar1 & 0xf) == 0) {
      uVar2 = (_param_3 >> 4) + (uint)(byte)param_1[0x2a];
      if (0x40 < uVar2) {
        uVar2 = 0x40;
      }
      param_1[0x2a] = (char)uVar2;
      return;
    }
    if ((bVar1 & 0xf0) == 0) {
      iVar5 = (uint)(byte)param_1[0x2a] - (bVar1 & 0xf);
      if (iVar5 < 0) {
        iVar5 = 0;
      }
      param_1[0x2a] = (char)iVar5;
      return;
    }
    break;
  case 5:
    if (bVar1 == 0) {
      bVar1 = param_1[0xb1];
      _param_3 = (uint)bVar1;
    }
    else {
      param_1[0xb1] = bVar1;
    }
    if ((bVar1 & 0xf0) == 0xf0) {
      return;
    }
    if ((bVar1 & 0xf0) == 0xe0) {
      return;
    }
    iVar5 = *(int *)(param_1 + 0x1c) + _param_3 * -4;
    *(int *)(param_1 + 0x1c) = iVar5;
    if (iVar5 < 0) {
      param_1[0x1c] = '\0';
      param_1[0x1d] = '\0';
      param_1[0x1e] = '\0';
      param_1[0x1f] = '\0';
    }
    goto LAB_0040a9a9;
  case 6:
    if (bVar1 == 0) {
      bVar1 = param_1[0xb1];
      _param_3 = (uint)bVar1;
    }
    else {
      param_1[0xb1] = bVar1;
    }
    if ((bVar1 & 0xf0) == 0xf0) {
      return;
    }
    if ((bVar1 & 0xf0) == 0xe0) {
      return;
    }
    iVar5 = *(int *)(param_1 + 0x1c) + _param_3 * 4;
    *(int *)(param_1 + 0x1c) = iVar5;
    if (0x1e00 < iVar5) {
      param_1[0x1c] = '\0';
      param_1[0x1d] = '\x1e';
      param_1[0x1e] = '\0';
      param_1[0x1f] = '\0';
    }
LAB_0040a9a9:
    if (*param_1 != '\0') {
      uVar4 = FUN_0040a6f0();
      *(undefined4 *)(param_1 + 0xac) = uVar4;
      return;
    }
    break;
  case 7:
    iVar5 = *(int *)(param_1 + 0xbc);
    iVar3 = *(int *)(param_1 + 0x1c);
    if (iVar3 == iVar5) {
      return;
    }
    if (iVar3 < iVar5) {
      iVar3 = iVar3 + (uint)(byte)param_1[0xb2] * 4;
      if (iVar5 < iVar3) {
LAB_0040a9f2:
        iVar3 = iVar5;
      }
    }
    else {
      iVar3 = iVar3 + (uint)(byte)param_1[0xb2] * -4;
      if (iVar3 < iVar5) goto LAB_0040a9f2;
    }
    if (*param_1 != '\0') {
      *(int *)(param_1 + 0x1c) = iVar3;
      uVar4 = FUN_0040a6f0();
      *(undefined4 *)(param_1 + 0xac) = uVar4;
      return;
    }
    break;
  case 8:
    fsin((float10)*(float *)(param_1 + 0xb8) * (float10)_DAT_0041aa70);
    fVar6 = (float10)_CIfmod();
    *(float *)(param_1 + 0xb8) = (float)fVar6;
    uVar4 = ftol();
    *(undefined4 *)(param_1 + 0x1c) = uVar4;
  case 0x13:
    if (((param_1[0xb4] & 0xf0U) == 0xd0) && ((uint)(byte)param_1[0xb5] == iVar5 + 1U)) {
      FUN_0040a470((int)param_1);
      FUN_0040a4e0(this,(int)param_1);
      if (param_1[0x24] != '\0') {
        FUN_0040a590(this,param_1);
        FUN_0040a740((int)param_1);
      }
      FUN_0040ad50(this,param_1);
    }
  }
  return;
}


// ==== FUN_0040ab20 @ 0040ab20 ====

void __thiscall FUN_0040ab20(void *this,char *param_1,undefined1 param_2,byte param_3)

{
  byte bVar1;
  uint uVar2;
  undefined4 uVar3;
  int iVar4;
  
  param_1[0xc0] = -1;
  param_1[0xc1] = -1;
  param_1[0xc2] = -1;
  param_1[0xc3] = -1;
  switch(param_2) {
  case 3:
    *(uint *)((int)this + 0x3210) = param_3 + 0x100;
    return;
  case 4:
    if (param_3 == 0) {
      param_3 = param_1[0xb0];
    }
    else {
      param_1[0xb0] = param_3;
    }
    if (((param_3 & 0xf) != 0) && ((param_3 & 0xf0) != 0)) {
      if ((param_3 & 0xf) == 0xf) {
        bVar1 = param_1[0x2a];
        if (0x40 < bVar1) {
          bVar1 = 0x40;
        }
        param_1[0x2a] = bVar1;
        return;
      }
      if ((param_3 & 0xf0) == 0xf0) {
        iVar4 = (uint)(byte)param_1[0x2a] - (param_3 & 0xf);
        if (iVar4 < 0) {
          iVar4 = 0;
        }
        param_1[0x2a] = (char)iVar4;
        return;
      }
    }
    break;
  case 5:
    if (param_3 == 0) {
      param_3 = param_1[0xb1];
    }
    else {
      param_1[0xb1] = param_3;
    }
    if ((param_3 & 0xf0) == 0xf0) {
      uVar2 = (param_3 & 0xf) << 2;
    }
    else {
      if ((param_3 & 0xf0) != 0xe0) {
        return;
      }
      uVar2 = param_3 & 0xf;
    }
    iVar4 = *(int *)(param_1 + 0x1c);
    *(uint *)(param_1 + 0x1c) = iVar4 - uVar2;
    if ((int)(iVar4 - uVar2) < 0) {
      param_1[0x1c] = '\0';
      param_1[0x1d] = '\0';
      param_1[0x1e] = '\0';
      param_1[0x1f] = '\0';
    }
    goto LAB_0040ac6d;
  case 6:
    if (param_3 == 0) {
      param_3 = param_1[0xb1];
    }
    else {
      param_1[0xb1] = param_3;
    }
    if ((param_3 & 0xf0) == 0xf0) {
      uVar2 = (param_3 & 0xf) << 2;
    }
    else {
      if ((param_3 & 0xf0) != 0xe0) {
        return;
      }
      uVar2 = param_3 & 0xf;
    }
    iVar4 = *(int *)(param_1 + 0x1c);
    *(uint *)(param_1 + 0x1c) = iVar4 + uVar2;
    if (0x1e00 < (int)(iVar4 + uVar2)) {
      param_1[0x1c] = '\0';
      param_1[0x1d] = '\x1e';
      param_1[0x1e] = '\0';
      param_1[0x1f] = '\0';
    }
LAB_0040ac6d:
    if (*param_1 != '\0') {
      uVar3 = FUN_0040a6f0();
      *(undefined4 *)(param_1 + 0xac) = uVar3;
      return;
    }
    break;
  case 7:
    if (param_3 != 0) {
      param_1[0xb2] = param_3;
      if (*(int *)(param_1 + 0x80) != 0) {
        param_1[0x2a] = *(char *)(*(int *)(param_1 + 0x80) + 0x13);
      }
    }
    if (param_1[1] != 0) {
      *(uint *)(param_1 + 0xbc) = (uint)(byte)param_1[1] << 6;
      return;
    }
    break;
  case 8:
    if (param_3 != 0) {
      param_1[0xb8] = '\0';
      param_1[0xb9] = '\0';
      param_1[0xba] = '\0';
      param_1[0xbb] = '\0';
      param_1[0xb3] = param_3;
    }
    *(undefined4 *)(param_1 + 0x20) = *(undefined4 *)(param_1 + 0x1c);
    return;
  case 0xf:
    *(uint *)(param_1 + 0x14) = (uint)param_3 << 8;
    return;
  case 0x13:
    if (param_3 != 0) {
      param_1[0xb4] = param_3;
    }
    if (((param_1[0xb4] & 0xf0U) == 0xd0) && (bVar1 = param_1[0xb4] & 0xf, bVar1 != 0)) {
      param_1[0xb5] = bVar1;
    }
  }
  return;
}


// ==== FUN_0040ad50 @ 0040ad50 ====

void __thiscall FUN_0040ad50(void *this,char *param_1)

{
  int iVar1;
  uint uVar2;
  undefined4 uVar3;
  
  if (*param_1 != '\0') {
    uVar2 = FUN_0040a650(this,(int)param_1);
    *(uint *)(param_1 + 0x9c) = uVar2 & 0xff;
    uVar2 = FUN_0040a6b0((int)param_1);
    *(uint *)(param_1 + 0x98) = uVar2 & 0xff;
    uVar3 = FUN_0040a6f0();
    *(undefined4 *)(param_1 + 0xac) = uVar3;
    iVar1 = *(int *)(param_1 + 0x80);
    if (((*(byte *)(iVar1 + 0x12) & 0x20) == 0) || (param_1[0x25] != '\0')) {
      if ((*(byte *)(iVar1 + 0x12) & 0x10) == 0) {
        param_1[0xa4] = '\0';
        param_1[0xa5] = '\0';
        param_1[0xa6] = '\0';
        param_1[0xa7] = '\0';
        *(int *)(param_1 + 0xa8) = *(int *)(iVar1 + 0x30) << 8;
        param_1[0xa0] = '\0';
        param_1[0xa1] = '\0';
        param_1[0xa2] = '\0';
        param_1[0xa3] = '\0';
      }
      else {
        *(int *)(param_1 + 0xa4) = *(int *)(iVar1 + 0x34) << 8;
        *(int *)(param_1 + 0xa8) = *(int *)(iVar1 + 0x38) << 8;
        *(uint *)(param_1 + 0xa0) = ((*(byte *)(iVar1 + 0x12) & 0x40) != 0) + 1;
      }
    }
    else {
      *(int *)(param_1 + 0xa4) = *(int *)(iVar1 + 0x40) << 8;
      *(int *)(param_1 + 0xa8) = *(int *)(iVar1 + 0x44) << 8;
      *(uint *)(param_1 + 0xa0) = ((*(byte *)(iVar1 + 0x12) & 0x80) != 0) + 1;
    }
    if (param_1[0x25] != '\0') {
      param_1[0x27] = '\x01';
    }
  }
  return;
}


// ==== FUN_0040ae40 @ 0040ae40 ====

void __fastcall FUN_0040ae40(int param_1)

{
  EnterCriticalSection(*(LPCRITICAL_SECTION *)(param_1 + 4));
  SuspendThread(*(HANDLE *)(param_1 + 0x322c));
  FUN_0040b420();
  return;
}


// ==== FUN_0040ae70 @ 0040ae70 ====

void __fastcall FUN_0040ae70(int param_1)

{
  DWORD DVar1;
  
  FUN_0040b450();
  do {
    DVar1 = ResumeThread(*(HANDLE *)(param_1 + 0x322c));
  } while (1 < DVar1);
  LeaveCriticalSection(*(LPCRITICAL_SECTION *)(param_1 + 4));
  return;
}


// ==== FUN_0040aea0 @ 0040aea0 ====

void __fastcall FUN_0040aea0(int param_1)

{
  void *pvVar1;
  int iVar2;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041925b;
  local_c = ExceptionList;
  pvVar1 = *(void **)(param_1 + 8);
  ExceptionList = &local_c;
  if (pvVar1 != (void *)0x0) {
    ExceptionList = &local_c;
    thunk_FUN_0040b5f0((int)pvVar1);
    operator_delete(pvVar1);
  }
  pvVar1 = operator_new(0xfaf0);
  local_4 = 0;
  if (pvVar1 != (void *)0x0) {
    iVar2 = FUN_0040b580(pvVar1,param_1);
    *(int *)(param_1 + 8) = iVar2;
    ExceptionList = local_c;
    return;
  }
  *(undefined4 *)(param_1 + 8) = 0;
  ExceptionList = local_c;
  return;
}


// ==== FUN_0040af20 @ 0040af20 ====

undefined1 FUN_0040af20(int param_1)

{
  undefined1 uVar1;
  
  uVar1 = 0;
  if ((*(char *)(param_1 + 4) == '\x13') &&
     (((*(byte *)(param_1 + 5) == 0 && ((*(byte *)(param_1 + 0xb4) & 0xf0) == 0xd0)) ||
      ((*(byte *)(param_1 + 5) & 0xf0) == 0xd0)))) {
    uVar1 = 1;
  }
  return uVar1;
}


// ==== FUN_0040af50 @ 0040af50 ====

int __fastcall FUN_0040af50(int param_1)

{
  return *(int *)(param_1 + 8) + 4;
}


// ==== FUN_0040af60 @ 0040af60 ====

void __cdecl FUN_0040af60(short *param_1,uint param_2)

{
  char cVar1;
  short sVar2;
  uint uVar3;
  uint uVar4;
  
  if ((DAT_0041f080 & 2) == 0) {
    cVar1 = (~(byte)DAT_0041f080 & 0xf0) << 3;
    if (0 < (int)param_2) {
      for (uVar3 = param_2 >> 2; uVar3 != 0; uVar3 = uVar3 - 1) {
        *(uint *)param_1 = CONCAT22(CONCAT11(cVar1,cVar1),CONCAT11(cVar1,cVar1));
        param_1 = param_1 + 2;
      }
      for (uVar3 = param_2 & 3; uVar3 != 0; uVar3 = uVar3 - 1) {
        *(char *)param_1 = cVar1;
        param_1 = (short *)((int)param_1 + 1);
      }
    }
  }
  else {
    uVar3 = (int)param_2 >> 1;
    sVar2 = (~DAT_0041f080 & 0xfff0) << 0xb;
    if (0 < (int)uVar3) {
      for (uVar4 = uVar3 >> 1; uVar4 != 0; uVar4 = uVar4 - 1) {
        *(uint *)param_1 = CONCAT22(sVar2,sVar2);
        param_1 = param_1 + 2;
      }
      for (uVar3 = (uint)((uVar3 & 1) != 0); uVar3 != 0; uVar3 = uVar3 - 1) {
        *param_1 = sVar2;
        param_1 = param_1 + 1;
      }
      return;
    }
  }
  return;
}


// ==== FUN_0040afd0 @ 0040afd0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __cdecl FUN_0040afd0(undefined4 param_1)

{
  ushort uVar1;
  
  if (DAT_0041d344 == 0xffffffff) {
    return 0;
  }
  _DAT_0041f0a0 = 1;
  _DAT_0041f0a2 = ((DAT_0041f080 & 8) != 0) + 1;
  uVar1 = (-(ushort)((DAT_0041f080 & 2) != 0) & 8) + 8;
  _DAT_0041f0a4 = (uint)(ushort)DAT_0041f088;
  _DAT_0041f0a8 = (int)((uint)uVar1 * (uint)_DAT_0041f0a2) >> 3;
  DAT_0041f0ac = CONCAT22(uVar1,(short)_DAT_0041f0a8);
  _DAT_0041f0a8 = _DAT_0041f0a8 * _DAT_0041f0a4;
  _DAT_0041f0b0 = 0;
  waveOutOpen(&DAT_0041f09c,DAT_0041d344,(LPCWAVEFORMATEX)&DAT_0041f0a0,0,0,0);
  DAT_0041f0b8 = param_1;
  _DAT_0041f0bc = 0x80000;
  _DAT_0041f0c0 = 0;
  _DAT_0041f0cc = 0xffffffff;
  _DAT_0041f0c4 = 0;
  _DAT_0041f0c8 = 0xc;
  waveOutPrepareHeader(DAT_0041f09c,(LPWAVEHDR)&DAT_0041f0b8,0x20);
  waveOutWrite(DAT_0041f09c,(LPWAVEHDR)&DAT_0041f0b8,0x20);
  return DAT_0041f0b8;
}


// ==== FUN_0040b0e0 @ 0040b0e0 ====

void FUN_0040b0e0(void)

{
  FUN_0040af60(DAT_0041f0b8,0x80000);
  waveOutReset(DAT_0041f09c);
  waveOutUnprepareHeader(DAT_0041f09c,(LPWAVEHDR)&DAT_0041f0b8,0x20);
  waveOutClose(DAT_0041f09c);
  return;
}


// ==== FUN_0040b130 @ 0040b130 ====

UINT FUN_0040b130(void)

{
  UINT UVar1;
  int iVar2;
  uint uVar3;
  UINT_PTR uDeviceID;
  UINT_PTR local_38;
  tagWAVEOUTCAPSA local_34;
  
  if (DAT_0041d344 == 0xffffffff) {
    UVar1 = waveOutGetNumDevs();
    uVar3 = 0;
    DAT_0041f088._0_2_ = 0x2b11;
    DAT_0041f080 = 0x105;
    DAT_0041d344 = 0xffffffff;
    if (UVar1 == 0) {
      return 0xffffffff;
    }
    uDeviceID = 0;
    if (0 < (int)UVar1) {
      do {
        waveOutGetDevCapsA(uDeviceID,&local_34,0x34);
        if ((uVar3 < local_34.dwFormats) && ((local_34.dwFormats & 0xfff) != 0)) {
          uVar3 = local_34.dwFormats;
          local_38 = uDeviceID;
        }
        uDeviceID = uDeviceID + 1;
      } while ((int)uDeviceID < (int)UVar1);
    }
    DAT_0041d344 = local_38;
    if ((uVar3 & 0x800) != 0) {
      iVar2 = FUN_0040b340(local_38,0xac44,(HWAVEOUT)0x2,0x10);
      if (iVar2 != -1) {
        DAT_0041f088._0_2_ = 0xac44;
        DAT_0041f080 = 0x11a;
        return DAT_0041d344;
      }
    }
    if ((uVar3 & 0x80) != 0) {
      iVar2 = FUN_0040b340(DAT_0041d344,0x5622,(HWAVEOUT)0x2,0x10);
      if (iVar2 != -1) {
        DAT_0041f088._0_2_ = 0x5622;
        DAT_0041f080 = 0x11a;
        return DAT_0041d344;
      }
    }
    if ((uVar3 & 0x400) != 0) {
      iVar2 = FUN_0040b340(DAT_0041d344,0xac44,(HWAVEOUT)0x1,0x10);
      if (iVar2 != -1) {
        DAT_0041f088._0_2_ = 0xac44;
        DAT_0041f080 = 0x116;
        return DAT_0041d344;
      }
    }
    if ((uVar3 & 0x40) != 0) {
      iVar2 = FUN_0040b340(DAT_0041d344,0x5622,(HWAVEOUT)0x1,0x10);
      if (iVar2 != -1) {
        DAT_0041f088._0_2_ = 0x5622;
        DAT_0041f080 = 0x116;
        return DAT_0041d344;
      }
    }
    if ((uVar3 & 8) != 0) {
      iVar2 = FUN_0040b340(DAT_0041d344,0x2b11,(HWAVEOUT)0x2,0x10);
      if (iVar2 != -1) {
        DAT_0041f088._0_2_ = 0x2b11;
        DAT_0041f080 = 0x11a;
        return DAT_0041d344;
      }
    }
    if ((uVar3 & 4) != 0) {
      iVar2 = FUN_0040b340(DAT_0041d344,0x2b11,(HWAVEOUT)0x1,0x10);
      if (iVar2 != -1) {
        DAT_0041f088._0_2_ = 0x2b11;
        DAT_0041f080 = 0x116;
        return DAT_0041d344;
      }
    }
    DAT_0041d344 = 0xffffffff;
  }
  return DAT_0041d344;
}


// ==== FUN_0040b340 @ 0040b340 ====

undefined4 __cdecl FUN_0040b340(UINT param_1,DWORD param_2,HWAVEOUT param_3,uint param_4)

{
  int iVar1;
  uint uVar2;
  MMRESULT MVar3;
  WAVEFORMATEX local_14;
  
  local_14.nChannels = (WORD)param_3;
  iVar1 = (param_4 & 0xffff) * ((uint)param_3 & 0xffff);
  uVar2 = (int)(iVar1 + (iVar1 >> 0x1f & 7U)) >> 3;
  local_14.wBitsPerSample = (WORD)param_4;
  local_14.nBlockAlign = (WORD)uVar2;
  local_14.nAvgBytesPerSec = (uVar2 & 0xffff) * param_2;
  local_14.wFormatTag = 1;
  local_14.nSamplesPerSec = param_2;
  local_14.cbSize = 0;
  MVar3 = waveOutOpen(&param_3,param_1,&local_14,0,0,0);
  waveOutReset(param_3);
  waveOutClose(param_3);
  if (MVar3 != 0) {
    return 0xffffffff;
  }
  return DAT_0041d344;
}


// ==== FUN_0040b3e0 @ 0040b3e0 ====

int FUN_0040b3e0(void)

{
  mmtime_tag local_c;
  
  local_c.wType = 2;
  waveOutGetPosition(DAT_0041f09c,&local_c,0xc);
  return (DAT_0041f0ac & 0xffff) * local_c.u.ms;
}


// ==== FUN_0040b420 @ 0040b420 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040b420(void)

{
  if (DAT_0041d344 == -1) {
    _DAT_0041f0dc = 1;
    return;
  }
  waveOutPause(DAT_0041f09c);
  return;
}


// ==== FUN_0040b450 @ 0040b450 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040b450(void)

{
  if (DAT_0041d344 == -1) {
    _DAT_0041f0dc = 0;
    return;
  }
  waveOutRestart(DAT_0041f09c);
  return;
}


// ==== FUN_0040b480 @ 0040b480 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040b480(float *param_1,float *param_2)

{
  uint local_8 [2];
  
  waveOutGetVolume(DAT_0041f09c,local_8);
  *param_1 = (float)(local_8[0] & 0xffff) * _DAT_0041aa78;
  *param_2 = (float)(local_8[0] >> 0x10) * _DAT_0041aa78;
  return;
}


// ==== FUN_0040b4e0 @ 0040b4e0 ====

void FUN_0040b4e0(void)

{
  int iVar1;
  uint uVar2;
  
  iVar1 = ftol();
  uVar2 = ftol();
  waveOutSetVolume(DAT_0041f09c,iVar1 << 0x10 | uVar2 & 0xffff);
  return;
}


// ==== FUN_0040b540 @ 0040b540 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040b540(void)

{
  DAT_0041f0e8 = DAT_0041f0e8 + 1;
  if (DAT_0041f0e4 != (float *)0x0) {
    *DAT_0041f0e4 = (float)DAT_0041f0e8 / (float)_DAT_0041f0e0;
  }
  if (DAT_0041f07c != (code *)0x0) {
    (*DAT_0041f07c)(*DAT_0041f0e4);
  }
  return;
}


// ==== FUN_0040b580 @ 0040b580 ====

int __thiscall FUN_0040b580(void *this,undefined4 param_1)

{
  *(undefined4 *)((int)this + 0xfae0) = param_1;
  FUN_0040b5a0((int)this);
  return (int)this;
}


// ==== FUN_0040b5a0 @ 0040b5a0 ====

void __fastcall FUN_0040b5a0(int param_1)

{
  *(undefined4 *)(param_1 + 0xcc) = 0;
  *(undefined4 *)(param_1 + 0xd0) = 0;
  *(undefined4 *)(param_1 + 0xd4) = 0;
  *(undefined4 *)(param_1 + 0xd8) = 0;
  *(undefined4 *)(param_1 + 0xdc) = 0;
  *(undefined4 *)(param_1 + 0xc0) = 0;
  *(undefined4 *)(param_1 + 200) = 0;
  *(undefined4 *)(param_1 + 0xc4) = 0;
  return;
}


// ==== FUN_0040b5f0 @ 0040b5f0 ====

void __fastcall FUN_0040b5f0(int param_1)

{
  int iVar1;
  
  if (*(void **)(param_1 + 200) != (void *)0x0) {
    operator_delete(*(void **)(param_1 + 200));
  }
  if (*(int *)(param_1 + 0xcc) != 0) {
    iVar1 = 0;
    if (*(short *)(param_1 + 0x22) != 0) {
      do {
        operator_delete(*(void **)(*(int *)(param_1 + 0xcc) + iVar1 * 4));
        iVar1 = iVar1 + 1;
      } while (iVar1 < (int)(uint)*(ushort *)(param_1 + 0x22));
    }
    operator_delete(*(void **)(param_1 + 0xcc));
  }
  if (*(int *)(param_1 + 0xd0) != 0) {
    iVar1 = 0;
    if (*(short *)(param_1 + 0x24) != 0) {
      do {
        operator_delete(*(void **)(*(int *)(param_1 + 0xd0) + iVar1 * 4));
        iVar1 = iVar1 + 1;
      } while (iVar1 < (int)(uint)*(ushort *)(param_1 + 0x24));
    }
    operator_delete(*(void **)(param_1 + 0xd0));
  }
  if (*(int *)(param_1 + 0xd4) != 0) {
    iVar1 = 0;
    if (*(short *)(param_1 + 0x24) != 0) {
      do {
        operator_delete(*(void **)(*(int *)(param_1 + 0xd4) + iVar1 * 4));
        iVar1 = iVar1 + 1;
      } while (iVar1 < (int)(uint)*(ushort *)(param_1 + 0x24));
    }
    operator_delete(*(void **)(param_1 + 0xd4));
  }
  if (*(int *)(param_1 + 0xd8) != 0) {
    iVar1 = 0;
    if (*(short *)(param_1 + 0x26) != 0) {
      do {
        operator_delete(*(void **)(*(int *)(param_1 + 0xd8) + iVar1 * 4));
        iVar1 = iVar1 + 1;
      } while (iVar1 < (int)(uint)*(ushort *)(param_1 + 0x26));
    }
    operator_delete(*(void **)(param_1 + 0xd8));
  }
  if (*(int *)(param_1 + 0xdc) != 0) {
    iVar1 = 0;
    if (*(short *)(param_1 + 0x26) != 0) {
      do {
        operator_delete(*(void **)(*(int *)(param_1 + 0xdc) + iVar1 * 4));
        iVar1 = iVar1 + 1;
      } while (iVar1 < (int)(uint)*(ushort *)(param_1 + 0x26));
    }
    operator_delete(*(void **)(param_1 + 0xdc));
  }
  if (*(void **)(param_1 + 0xc4) != (void *)0x0) {
    operator_delete(*(void **)(param_1 + 0xc4));
  }
  FUN_0040b5a0(param_1);
  return;
}


// ==== FUN_0040b760 @ 0040b760 ====

void __thiscall FUN_0040b760(void *this,int *param_1,int *param_2,int *param_3,undefined4 param_4)

{
  *(int **)((int)this + 0xfae4) = param_2;
  DAT_0041f0e4 = param_4;
  DAT_0041f0e8 = 0;
  *(int **)((int)this + 0xc0) = param_1;
  if (*param_1 == 0x21535849) {
    FUN_0040b7b0(this,param_1,param_2,param_3);
    return;
  }
  FUN_0040c500(this,param_1);
  return;
}


// ==== FUN_0040b7b0 @ 0040b7b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __thiscall FUN_0040b7b0(void *this,undefined4 param_1,int *param_2,int *param_3)

{
  byte bVar1;
  char cVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int *piVar7;
  int *piVar8;
  uint uVar9;
  uint uVar10;
  int *piVar11;
  byte *pbVar12;
  char *pcVar13;
  char *pcVar14;
  CHAR local_24c [260];
  CHAR local_148 [260];
  byte local_44 [32];
  int local_24;
  byte *local_20;
  byte *local_1c;
  int local_18;
  int *local_14;
  void *local_10;
  int *local_c;
  undefined4 local_8;
  
  *(undefined4 *)((int)this + 0xc0) = param_1;
  local_10 = this;
  iVar3 = FUN_0040cd10((int)this);
  if (iVar3 != 0x21535849) {
    return 0;
  }
  iVar4 = FUN_0040cd10((int)this);
  iVar5 = FUN_0040cd10((int)this);
  iVar6 = FUN_0040cd10((int)this);
  FUN_0040cd10((int)this);
  FUN_0040cd30(this,&local_8,4);
  FUN_0040cd30(this,local_44,0x20);
  iVar3 = *(int *)((int)this + 0xc0);
  local_18 = iVar3 + iVar4;
  piVar11 = (int *)(iVar3 + iVar5);
  local_20 = (byte *)(iVar3 + iVar6);
  local_1c = local_44;
  _DAT_0041f0e0 = (int)(char)*local_20 + *piVar11;
  local_14 = piVar11;
  piVar7 = FUN_004118a0();
  piVar8 = param_3;
  if (param_3 == (int *)0x0) {
    if (param_2 != (int *)0x0) goto LAB_0040b979;
    local_c = param_3;
    uVar9 = 0xffffffff;
    pbVar12 = local_44;
    do {
      if (uVar9 == 0) break;
      uVar9 = uVar9 - 1;
      bVar1 = *pbVar12;
      pbVar12 = pbVar12 + 1;
    } while (bVar1 != 0);
    local_24 = ~uVar9 - 1;
    iVar3 = local_24;
    if (local_24 < 1) {
LAB_0040b8a5:
      piVar11 = (int *)0xdeadbeef;
    }
    else {
      do {
        piVar11 = (int *)0x0;
        iVar4 = local_24;
        pbVar12 = local_1c;
        do {
          bVar1 = (byte)iVar4 & 0x1f;
          piVar11 = (int *)((uint)piVar11 ^
                           ((uint)*pbVar12 << bVar1 | (uint)(*pbVar12 >> 0x20 - bVar1)));
          pbVar12 = pbVar12 + 1;
          iVar4 = iVar4 + -1;
        } while (iVar4 != 0);
        iVar3 = iVar3 + -1;
      } while (iVar3 != 0);
      this = local_10;
      local_c = piVar11;
      if (piVar11 == (int *)0x0) goto LAB_0040b8a5;
    }
    GetTempPathA(0x104,local_24c);
    GetTempFileNameA(local_24c,&DAT_0041d348,(UINT)piVar11,local_148);
    if (DAT_0041f078 != (char *)0x0) {
      uVar9 = 0xffffffff;
      pcVar13 = DAT_0041f078;
      do {
        pcVar14 = pcVar13;
        if (uVar9 == 0) break;
        uVar9 = uVar9 - 1;
        pcVar14 = pcVar13 + 1;
        cVar2 = *pcVar13;
        pcVar13 = pcVar14;
      } while (cVar2 != '\0');
      uVar9 = ~uVar9;
      pcVar13 = pcVar14 + -uVar9;
      pcVar14 = local_148;
      for (uVar10 = uVar9 >> 2; uVar10 != 0; uVar10 = uVar10 - 1) {
        *(undefined4 *)pcVar14 = *(undefined4 *)pcVar13;
        pcVar13 = pcVar13 + 4;
        pcVar14 = pcVar14 + 4;
      }
      for (uVar9 = uVar9 & 3; uVar9 != 0; uVar9 = uVar9 - 1) {
        *pcVar14 = *pcVar13;
        pcVar13 = pcVar13 + 1;
        pcVar14 = pcVar14 + 1;
      }
    }
    piVar11 = (int *)(**(code **)(*piVar7 + 4))(piVar7,local_148);
    if (piVar11 == (int *)0x0) {
      piVar11 = GlobalAlloc(0x1000,0xf00000);
      piVar8 = (int *)FUN_00411590(piVar11);
      piVar11 = local_14;
      goto LAB_0040b934;
    }
  }
  else {
LAB_0040b934:
    FUN_0040b9e0(this,piVar11,piVar8);
    FUN_004111f0(local_20,piVar8);
    if (param_3 != (int *)0x0) {
      return 1;
    }
    piVar11 = (int *)(**(code **)(*piVar7 + 8))(piVar7,local_148);
    (**(code **)*piVar8)(piVar8,piVar11);
    (**(code **)(*piVar8 + 0x10))(piVar8);
    if (piVar11 == (int *)0x0) goto LAB_0040b979;
  }
  (**(code **)(*piVar11 + 0x1c))(piVar11);
LAB_0040b979:
  piVar11 = (int *)0x0;
  if (param_2 == (int *)0x0) {
    piVar11 = (int *)(**(code **)(*piVar7 + 4))(piVar7,local_148);
    param_2 = (int *)FUN_004115e0(piVar11);
  }
  FUN_0040be10(this,local_18,param_2);
  (**(code **)(*param_2 + 0x10))(param_2);
  if (piVar11 != (int *)0x0) {
    (**(code **)(*piVar11 + 0x1c))(piVar11);
  }
  *(undefined4 *)(*(int *)(*(int *)((int)this + 0xfae0) + 0x3224) + 0x24) = local_8;
  return 1;
}


// ==== FUN_0040b9e0 @ 0040b9e0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040b9e0(void *this,undefined4 param_1,int *param_2)

{
  int iVar1;
  char cVar2;
  bool bVar3;
  byte bVar4;
  undefined2 uVar5;
  undefined2 *puVar6;
  int *piVar7;
  int iVar8;
  uint uVar9;
  uint uVar10;
  uint uVar11;
  undefined4 unaff_ESI;
  float *pfVar12;
  char *pcVar13;
  undefined4 *puVar14;
  char *pcVar15;
  char *pcVar16;
  undefined4 uStack_5dc;
  uint local_5d8;
  void *local_5d4;
  uint local_5d0;
  undefined2 *local_5cc;
  int local_5c8;
  int local_5c4;
  undefined4 local_5c0;
  int local_5bc;
  undefined1 local_5b8 [4];
  char local_5b4 [12];
  char local_5a8 [232];
  undefined1 auStack_4c0 [24];
  char local_4a8 [256];
  undefined1 local_3a8 [9];
  char acStack_39f [259];
  undefined4 local_29c [2];
  char acStack_293 [259];
  float local_190 [35];
  float local_104;
  
  *(undefined4 *)((int)this + 0xc0) = param_1;
  local_5c8 = FUN_0040cd10((int)this);
  puVar14 = local_29c;
  for (iVar8 = 0x43; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar14 = 0;
    puVar14 = puVar14 + 1;
  }
  uStack_5dc = CONCAT13(1,CONCAT12(1,(undefined2)uStack_5dc));
  uStack_5dc = CONCAT22(uStack_5dc._2_2_,(undefined2)uStack_5dc) & 0xffff00ff;
  if (0 < local_5c8) {
    do {
      FUN_0040cd30(this,local_3a8,0x10c);
      iVar8 = 0;
      do {
        cVar2 = acStack_39f[iVar8];
        acStack_39f[iVar8] = cVar2 + acStack_293[iVar8];
        acStack_293[iVar8] = cVar2 + acStack_293[iVar8];
        iVar1 = iVar8 + 10;
        iVar8 = iVar8 + 1;
      } while (iVar1 < 0x10c);
      local_5c0 = *(undefined4 *)((int)this + 0xc0);
      *(undefined1 **)((int)this + 0xc0) = local_3a8;
      FUN_0040cd30(this,local_5b4,9);
      iVar8 = 100;
      pfVar12 = local_190;
      do {
        bVar4 = FUN_0040cce0((int)this);
        local_5d8 = (uint)bVar4;
        iVar8 = iVar8 + -1;
        *pfVar12 = ((float)local_5d8 - _DAT_0041aa94) * _DAT_0041aa90;
        pfVar12 = pfVar12 + 1;
      } while (iVar8 != 0);
      FUN_0040cd30(this,&DAT_0041f118,0x40);
      FUN_0040cd30(this,&DAT_0041f158,0x10);
      FUN_0040cd30(this,&DAT_0041f168,0x40);
      FUN_0040cd30(this,&DAT_0041f1ac,4);
      FUN_0040cd30(this,local_5b8,4);
      FUN_0040cd30(this,&DAT_0041f1a8,4);
      FUN_0040cd30(this,(void *)((int)&uStack_5dc + 3),1);
      FUN_0040cd30(this,(void *)((int)&uStack_5dc + 2),1);
      FUN_0040cd30(this,(void *)((int)&uStack_5dc + 1),1);
      DAT_0041f100 = uStack_5dc._1_1_;
      if (DAT_0041f104 != (void *)0x0) {
        operator_delete(DAT_0041f104);
        DAT_0041f104 = (void *)0x0;
      }
      if (DAT_0041f108 != (void *)0x0) {
        operator_delete(DAT_0041f108);
        DAT_0041f108 = (void *)0x0;
      }
      if (uStack_5dc._2_1_ != '\0') {
        FUN_0040e770(&DAT_0041f0f0,local_190);
        uVar9 = 0xffffffff;
        pcVar13 = local_5b4;
        do {
          pcVar16 = pcVar13;
          if (uVar9 == 0) break;
          uVar9 = uVar9 - 1;
          pcVar16 = pcVar13 + 1;
          cVar2 = *pcVar13;
          pcVar13 = pcVar16;
        } while (cVar2 != '\0');
        bVar3 = (float)_DAT_0041aa88 <= local_104;
        uVar9 = ~uVar9;
        pcVar13 = pcVar16 + -uVar9;
        pcVar16 = local_5a8;
        for (uVar10 = uVar9 >> 2; uVar10 != 0; uVar10 = uVar10 - 1) {
          *(undefined4 *)pcVar16 = *(undefined4 *)pcVar13;
          pcVar13 = pcVar13 + 4;
          pcVar16 = pcVar16 + 4;
        }
        for (uVar9 = uVar9 & 3; uVar9 != 0; uVar9 = uVar9 - 1) {
          *pcVar16 = *pcVar13;
          pcVar13 = pcVar13 + 1;
          pcVar16 = pcVar16 + 1;
        }
        uVar9 = 0xffffffff;
        pcVar13 = local_5a8;
        do {
          pcVar16 = pcVar13;
          if (uVar9 == 0) break;
          uVar9 = uVar9 - 1;
          pcVar16 = pcVar13 + 1;
          cVar2 = *pcVar13;
          pcVar13 = pcVar16;
        } while (cVar2 != '\0');
        uVar9 = ~uVar9;
        pcVar13 = pcVar16 + -uVar9;
        pcVar16 = local_4a8;
        for (uVar10 = uVar9 >> 2; uVar10 != 0; uVar10 = uVar10 - 1) {
          *(undefined4 *)pcVar16 = *(undefined4 *)pcVar13;
          pcVar13 = pcVar13 + 4;
          pcVar16 = pcVar16 + 4;
        }
        for (uVar9 = uVar9 & 3; uVar9 != 0; uVar9 = uVar9 - 1) {
          *pcVar16 = *pcVar13;
          pcVar13 = pcVar13 + 1;
          pcVar16 = pcVar16 + 1;
        }
        if (bVar3) {
          local_5d8 = 1;
          uVar9 = DAT_0041f10c;
        }
        else {
          local_5d8 = 2;
          uVar9 = (int)DAT_0041f10c >> 1;
        }
        uVar10 = uVar9 * 2;
        local_5d0 = uVar9;
        local_5d4 = operator_new(uVar10);
        puVar6 = operator_new(uVar10);
        local_5cc = puVar6;
        if (0 < (int)uVar9) {
          local_5bc = local_5d8 * 4;
          local_5c4 = (int)local_5d4 - (int)puVar6;
          local_5d8 = local_5d0;
          do {
            uVar5 = ftol();
            *(undefined2 *)(local_5c4 + (int)puVar6) = uVar5;
            uVar5 = ftol();
            *puVar6 = uVar5;
            puVar6 = puVar6 + 1;
            local_5d8 = local_5d8 - 1;
          } while (local_5d8 != 0);
        }
        if (uStack_5dc._2_1_ == '\0') {
LAB_0040bd2a:
          uVar9 = 0xffffffff;
          pcVar13 = &DAT_0041d354;
          do {
            pcVar16 = pcVar13;
            if (uVar9 == 0) break;
            uVar9 = uVar9 - 1;
            pcVar16 = pcVar13 + 1;
            cVar2 = *pcVar13;
            pcVar13 = pcVar16;
          } while (cVar2 != '\0');
          uVar9 = ~uVar9;
          iVar8 = -1;
          pcVar13 = local_5a8;
          do {
            pcVar15 = pcVar13;
            if (iVar8 == 0) break;
            iVar8 = iVar8 + -1;
            pcVar15 = pcVar13 + 1;
            cVar2 = *pcVar13;
            pcVar13 = pcVar15;
          } while (cVar2 != '\0');
          pcVar13 = pcVar16 + -uVar9;
          pcVar16 = pcVar15 + -1;
          for (uVar11 = uVar9 >> 2; uVar11 != 0; uVar11 = uVar11 - 1) {
            *(undefined4 *)pcVar16 = *(undefined4 *)pcVar13;
            pcVar13 = pcVar13 + 4;
            pcVar16 = pcVar16 + 4;
          }
          for (uVar9 = uVar9 & 3; uVar9 != 0; uVar9 = uVar9 - 1) {
            *pcVar16 = *pcVar13;
            pcVar13 = pcVar13 + 1;
            pcVar16 = pcVar16 + 1;
          }
          uVar9 = 0xffffffff;
          pcVar13 = &DAT_0041d34c;
          do {
            pcVar16 = pcVar13;
            if (uVar9 == 0) break;
            uVar9 = uVar9 - 1;
            pcVar16 = pcVar13 + 1;
            cVar2 = *pcVar13;
            pcVar13 = pcVar16;
          } while (cVar2 != '\0');
          uVar9 = ~uVar9;
          iVar8 = -1;
          pcVar13 = local_4a8;
          do {
            pcVar15 = pcVar13;
            if (iVar8 == 0) break;
            iVar8 = iVar8 + -1;
            pcVar15 = pcVar13 + 1;
            cVar2 = *pcVar13;
            pcVar13 = pcVar15;
          } while (cVar2 != '\0');
          pcVar13 = pcVar16 + -uVar9;
          pcVar16 = pcVar15 + -1;
          for (uVar11 = uVar9 >> 2; uVar11 != 0; uVar11 = uVar11 - 1) {
            *(undefined4 *)pcVar16 = *(undefined4 *)pcVar13;
            pcVar13 = pcVar13 + 4;
            pcVar16 = pcVar16 + 4;
          }
          for (uVar9 = uVar9 & 3; uVar9 != 0; uVar9 = uVar9 - 1) {
            *pcVar16 = *pcVar13;
            pcVar13 = pcVar13 + 1;
            pcVar16 = pcVar16 + 1;
          }
          piVar7 = (int *)(**(code **)(*param_2 + 8))(param_2,local_5a8);
          (**(code **)(*piVar7 + 4))(piVar7,uStack_5dc,uVar10);
          (**(code **)(*piVar7 + 0x1c))(piVar7);
          piVar7 = (int *)(**(code **)(*param_2 + 8))(param_2,auStack_4c0);
          (**(code **)(*piVar7 + 4))(piVar7,unaff_ESI,uVar10);
          (**(code **)(*piVar7 + 0x1c))(piVar7);
        }
        else {
          if (uStack_5dc._1_1_ != '\0') goto LAB_0040bd2a;
          uVar9 = 0xffffffff;
          pcVar13 = &DAT_0041d35c;
          do {
            pcVar16 = pcVar13;
            if (uVar9 == 0) break;
            uVar9 = uVar9 - 1;
            pcVar16 = pcVar13 + 1;
            cVar2 = *pcVar13;
            pcVar13 = pcVar16;
          } while (cVar2 != '\0');
          uVar9 = ~uVar9;
          iVar8 = -1;
          pcVar13 = local_5a8;
          do {
            pcVar15 = pcVar13;
            if (iVar8 == 0) break;
            iVar8 = iVar8 + -1;
            pcVar15 = pcVar13 + 1;
            cVar2 = *pcVar13;
            pcVar13 = pcVar15;
          } while (cVar2 != '\0');
          pcVar13 = pcVar16 + -uVar9;
          pcVar16 = pcVar15 + -1;
          for (uVar11 = uVar9 >> 2; uVar11 != 0; uVar11 = uVar11 - 1) {
            *(undefined4 *)pcVar16 = *(undefined4 *)pcVar13;
            pcVar13 = pcVar13 + 4;
            pcVar16 = pcVar16 + 4;
          }
          for (uVar9 = uVar9 & 3; uVar9 != 0; uVar9 = uVar9 - 1) {
            *pcVar16 = *pcVar13;
            pcVar13 = pcVar13 + 1;
            pcVar16 = pcVar16 + 1;
          }
          piVar7 = (int *)(**(code **)(*param_2 + 8))(param_2,local_5a8);
          (**(code **)(*piVar7 + 4))(piVar7,uStack_5dc,uVar10);
          (**(code **)(*piVar7 + 0x1c))(piVar7);
        }
        operator_delete(local_5d4);
        operator_delete(local_5cc);
        *(undefined4 *)((int)this + 0xc0) = local_5c0;
        FUN_0040b540();
      }
      local_5c8 = local_5c8 + -1;
    } while (local_5c8 != 0);
  }
  return;
}


// ==== FUN_0040be10 @ 0040be10 ====

undefined4 __thiscall FUN_0040be10(void *this,undefined4 param_1,int *param_2)

{
  ushort *puVar1;
  char cVar2;
  undefined1 uVar3;
  byte bVar4;
  undefined2 uVar5;
  ushort uVar6;
  void *pvVar7;
  int iVar8;
  int iVar9;
  undefined4 uVar10;
  byte *pbVar11;
  undefined4 *puVar12;
  int *piVar13;
  uint uVar14;
  undefined1 *puVar15;
  uint uVar16;
  byte *pbVar17;
  char *pcVar18;
  undefined4 *puVar19;
  bool bVar20;
  undefined4 uStack_11c;
  uint uStack_118;
  undefined4 uStack_110;
  int iStack_10c;
  int iStack_108;
  undefined1 uStack_103;
  char acStack_100 [256];
  
  *(undefined4 *)((int)this + 0xc0) = param_1;
  cVar2 = FUN_0040cce0((int)this);
  if (cVar2 != '!') {
    return 0;
  }
  uVar5 = FUN_0040ccf0((int)this);
  *(undefined2 *)((int)this + 0x20) = uVar5;
  uVar5 = FUN_0040ccf0((int)this);
  *(undefined2 *)((int)this + 0x22) = uVar5;
  uVar5 = FUN_0040ccf0((int)this);
  *(undefined2 *)((int)this + 0x24) = uVar5;
  uVar5 = FUN_0040ccf0((int)this);
  *(undefined2 *)((int)this + 0x26) = uVar5;
  uVar3 = FUN_0040cce0((int)this);
  *(undefined1 *)((int)this + 0x30) = uVar3;
  uVar3 = FUN_0040cce0((int)this);
  *(undefined1 *)((int)this + 0x31) = uVar3;
  uVar3 = FUN_0040cce0((int)this);
  *(undefined1 *)((int)this + 0x32) = uVar3;
  uVar3 = FUN_0040cce0((int)this);
  *(undefined1 *)((int)this + 0x33) = uVar3;
  FUN_0040cd30(this,(void *)((int)this + 4),0x1a);
  FUN_0040cd30(this,(void *)((int)this + 0x80),0x40);
  FUN_0040cd30(this,(void *)((int)this + 0x40),0x40);
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x20));
  *(void **)((int)this + 200) = pvVar7;
  FUN_0040cd30(this,pvVar7,(uint)*(ushort *)((int)this + 0x20));
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x22) << 2);
  *(void **)((int)this + 0xcc) = pvVar7;
  uStack_118 = 0;
  if (*(short *)((int)this + 0x22) != 0) {
    do {
      pvVar7 = operator_new(0x22d);
      *(void **)(*(int *)((int)this + 0xcc) + uStack_118 * 4) = pvVar7;
      iVar8 = *(int *)(*(int *)((int)this + 0xcc) + uStack_118 * 4);
      cVar2 = FUN_0040cce0((int)this);
      if (cVar2 == 'i') {
        puVar15 = (undefined1 *)(iVar8 + 0x41);
        iVar8 = 0x78;
        do {
          *puVar15 = 0;
          puVar15 = puVar15 + 2;
          iVar8 = iVar8 + -1;
        } while (iVar8 != 0);
      }
      else {
        uVar5 = FUN_0040ccf0((int)this);
        *(undefined2 *)(iVar8 + 0x14) = uVar5;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x18) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x19) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x40) = uVar3;
        bVar4 = FUN_0040cce0((int)this);
        *(byte *)(iVar8 + 0x41) = bVar4;
        if ((bVar4 & 0x80) == 0) {
          FUN_0040cd30(this,(void *)(iVar8 + 0x42),0xee);
        }
        else {
          puVar15 = (undefined1 *)(iVar8 + 0x43);
          *(byte *)(iVar8 + 0x41) = bVar4 & 0x7f;
          iVar9 = 1;
          do {
            puVar15[-1] = (char)iVar9;
            *puVar15 = *(undefined1 *)(iVar8 + 0x41);
            iVar9 = iVar9 + 1;
            puVar15 = puVar15 + 2;
          } while (iVar9 < 0x78);
        }
        uStack_110 = iVar8 + 0x130;
        iStack_10c = iVar8 + 0x182;
        iStack_108 = iVar8 + 0x1d4;
        piVar13 = &uStack_110;
        iVar8 = 3;
        do {
          cVar2 = FUN_0040cce0((int)this);
          pcVar18 = (char *)*piVar13;
          *pcVar18 = cVar2;
          if (cVar2 != '\0') {
            cVar2 = FUN_0040cce0((int)this);
            pcVar18[1] = cVar2;
            cVar2 = FUN_0040cce0((int)this);
            pcVar18[2] = cVar2;
            cVar2 = FUN_0040cce0((int)this);
            pcVar18[3] = cVar2;
            cVar2 = FUN_0040cce0((int)this);
            pcVar18[4] = cVar2;
            cVar2 = FUN_0040cce0((int)this);
            pcVar18[5] = cVar2;
            FUN_0040cd30(this,pcVar18 + 6,(uint)(byte)pcVar18[1] * 3);
          }
          piVar13 = piVar13 + 1;
          iVar8 = iVar8 + -1;
        } while (iVar8 != 0);
      }
      uStack_118 = uStack_118 + 1;
    } while ((int)uStack_118 < (int)(uint)*(ushort *)((int)this + 0x22));
  }
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x24) << 2);
  *(void **)((int)this + 0xd0) = pvVar7;
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x24) << 2);
  *(void **)((int)this + 0xd4) = pvVar7;
  uStack_118 = 0;
  if (*(short *)((int)this + 0x24) != 0) {
    do {
      uVar14 = uStack_11c;
      pvVar7 = operator_new(0x50);
      *(void **)(*(int *)((int)this + 0xd0) + uStack_118 * 4) = pvVar7;
      *(undefined4 *)(*(int *)((int)this + 0xd4) + uStack_118 * 4) = 0;
      iVar8 = *(int *)(*(int *)((int)this + 0xd0) + uStack_118 * 4);
      cVar2 = FUN_0040cce0((int)this);
      if (cVar2 == 's') {
        *(undefined1 *)(iVar8 + 0x12) = 0;
      }
      else {
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x11) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x12) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x13) = uVar3;
        uVar10 = FUN_0040cd10((int)this);
        *(undefined4 *)(iVar8 + 0x30) = uVar10;
        uVar10 = FUN_0040cd10((int)this);
        *(undefined4 *)(iVar8 + 0x34) = uVar10;
        uVar10 = FUN_0040cd10((int)this);
        *(undefined4 *)(iVar8 + 0x38) = uVar10;
        uVar10 = FUN_0040cd10((int)this);
        *(undefined4 *)(iVar8 + 0x40) = uVar10;
        uVar10 = FUN_0040cd10((int)this);
        *(undefined4 *)(iVar8 + 0x44) = uVar10;
        uVar10 = FUN_0040cd10((int)this);
        *(undefined4 *)(iVar8 + 0x3c) = uVar10;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x4c) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x4d) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x4e) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x4f) = uVar3;
        uVar3 = FUN_0040cce0((int)this);
        *(undefined1 *)(iVar8 + 0x2f) = uVar3;
        FUN_0040cd30(this,(void *)(iVar8 + 4),0xd);
        iVar8 = *(int *)(*(int *)((int)this + 0xd0) + uStack_118 * 4);
        uVar16 = *(uint *)(iVar8 + 0x30);
        bVar4 = *(byte *)(iVar8 + 0x12);
        if ((bVar4 & 2) != 0) {
          uVar16 = uVar16 << 1;
        }
        if ((bVar4 & 4) != 0) {
          FUN_0040c4b0();
        }
        if (**(char **)((int)this + 0xfae0) == '\0') {
          pvVar7 = operator_new(uVar16);
          *(void **)(*(int *)((int)this + 0xd4) + uStack_118 * 4) = pvVar7;
          if (param_2 != (int *)0x0) {
            strncpy((char *)&uStack_110,
                    (char *)(*(int *)(*(int *)((int)this + 0xd0) + uStack_118 * 4) + 4),0xd);
            uStack_103 = 0;
            uStack_11c = uStack_11c & 0xffffff;
            pbVar17 = &DAT_0041d3d8;
            pbVar11 = (byte *)&uStack_110;
            do {
              bVar4 = *pbVar11;
              bVar20 = bVar4 < *pbVar17;
              if (bVar4 != *pbVar17) {
LAB_0040c209:
                iVar8 = (1 - (uint)bVar20) - (uint)(bVar20 != 0);
                goto LAB_0040c20e;
              }
              if (bVar4 == 0) break;
              bVar4 = pbVar11[1];
              bVar20 = bVar4 < pbVar17[1];
              if (bVar4 != pbVar17[1]) goto LAB_0040c209;
              pbVar11 = pbVar11 + 2;
              pbVar17 = pbVar17 + 2;
            } while (bVar4 != 0);
            iVar8 = 0;
LAB_0040c20e:
            if ((iVar8 == 0) &&
               (puVar12 = (undefined4 *)FUN_0040c4c0((LPCSTR)0x320,&DAT_0041d3d0),
               puVar12 != (undefined4 *)0x0)) {
              uStack_11c._0_3_ = (undefined3)uVar14;
              uStack_11c = CONCAT13(1,(undefined3)uStack_11c);
              puVar19 = *(undefined4 **)(*(int *)((int)this + 0xd4) + uStack_118 * 4);
              for (uVar14 = uVar16 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                *puVar19 = *puVar12;
                puVar12 = puVar12 + 1;
                puVar19 = puVar19 + 1;
              }
              for (uVar14 = uVar16 & 3; uVar14 != 0; uVar14 = uVar14 - 1) {
                *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                puVar12 = (undefined4 *)((int)puVar12 + 1);
                puVar19 = (undefined4 *)((int)puVar19 + 1);
              }
            }
            pbVar17 = &DAT_0041d3c4;
            pbVar11 = (byte *)&uStack_110;
            do {
              bVar4 = *pbVar11;
              bVar20 = bVar4 < *pbVar17;
              if (bVar4 != *pbVar17) {
LAB_0040c276:
                iVar8 = (1 - (uint)bVar20) - (uint)(bVar20 != 0);
                goto LAB_0040c27b;
              }
              if (bVar4 == 0) break;
              bVar4 = pbVar11[1];
              bVar20 = bVar4 < pbVar17[1];
              if (bVar4 != pbVar17[1]) goto LAB_0040c276;
              pbVar11 = pbVar11 + 2;
              pbVar17 = pbVar17 + 2;
            } while (bVar4 != 0);
            iVar8 = 0;
LAB_0040c27b:
            if ((iVar8 == 0) &&
               (puVar12 = (undefined4 *)FUN_0040c4c0((LPCSTR)0x321,&DAT_0041d3d0),
               puVar12 != (undefined4 *)0x0)) {
              uStack_11c = CONCAT13(1,(undefined3)uStack_11c);
              puVar19 = *(undefined4 **)(*(int *)((int)this + 0xd4) + uStack_118 * 4);
              for (uVar14 = uVar16 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                *puVar19 = *puVar12;
                puVar12 = puVar12 + 1;
                puVar19 = puVar19 + 1;
              }
              for (uVar14 = uVar16 & 3; uVar14 != 0; uVar14 = uVar14 - 1) {
                *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                puVar12 = (undefined4 *)((int)puVar12 + 1);
                puVar19 = (undefined4 *)((int)puVar19 + 1);
              }
            }
            pcVar18 = s_CRASH_WAV_0041d3b8;
            pbVar11 = (byte *)&uStack_110;
            do {
              bVar4 = *pbVar11;
              bVar20 = bVar4 < (byte)*pcVar18;
              if (bVar4 != *pcVar18) {
LAB_0040c2e3:
                iVar8 = (1 - (uint)bVar20) - (uint)(bVar20 != 0);
                goto LAB_0040c2e8;
              }
              if (bVar4 == 0) break;
              bVar4 = pbVar11[1];
              bVar20 = bVar4 < (byte)pcVar18[1];
              if (bVar4 != pcVar18[1]) goto LAB_0040c2e3;
              pbVar11 = pbVar11 + 2;
              pcVar18 = pcVar18 + 2;
            } while (bVar4 != 0);
            iVar8 = 0;
LAB_0040c2e8:
            if ((iVar8 == 0) &&
               (puVar12 = (undefined4 *)FUN_0040c4c0((LPCSTR)0x322,&DAT_0041d3d0),
               puVar12 != (undefined4 *)0x0)) {
              puVar19 = *(undefined4 **)(*(int *)((int)this + 0xd4) + uStack_118 * 4);
              for (uVar14 = uVar16 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                *puVar19 = *puVar12;
                puVar12 = puVar12 + 1;
                puVar19 = puVar19 + 1;
              }
              for (uVar16 = uVar16 & 3; uVar16 != 0; uVar16 = uVar16 - 1) {
                *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                puVar12 = (undefined4 *)((int)puVar12 + 1);
                puVar19 = (undefined4 *)((int)puVar19 + 1);
              }
            }
            else if (uStack_11c._3_1_ == '\0') {
              piVar13 = (int *)(**(code **)(*param_2 + 4))(param_2,&uStack_110);
              if (piVar13 == (int *)0x0) {
                sprintf(acStack_100,s_Itmodule_cpp__void_TModule__Read_0041d36c,&uStack_110);
                MessageBoxA((HWND)0x0,acStack_100,s_Error_0041d364,0x10);
              }
              else {
                puVar12 = (undefined4 *)(**(code **)(*piVar13 + 0x18))(piVar13);
                puVar19 = *(undefined4 **)(*(int *)((int)this + 0xd4) + uStack_11c * 4);
                for (uVar14 = uStack_118 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                  *puVar19 = *puVar12;
                  puVar12 = puVar12 + 1;
                  puVar19 = puVar19 + 1;
                }
                for (uVar14 = uStack_118 & 3; uVar14 != 0; uVar14 = uVar14 - 1) {
                  *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                  puVar12 = (undefined4 *)((int)puVar12 + 1);
                  puVar19 = (undefined4 *)((int)puVar19 + 1);
                }
                iVar8 = *(int *)(*(int *)((int)this + 0xd0) + uStack_11c * 4);
                *(byte *)(iVar8 + 0x12) = *(byte *)(iVar8 + 0x12) & 0xf7;
                (**(code **)(*piVar13 + 0x1c))(piVar13);
              }
            }
          }
        }
      }
      uStack_118 = uStack_118 + 1;
    } while ((int)uStack_118 < (int)(uint)*(ushort *)((int)this + 0x24));
  }
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x26) << 2);
  *(void **)((int)this + 0xd8) = pvVar7;
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x26) << 2);
  iVar8 = 0;
  *(void **)((int)this + 0xdc) = pvVar7;
  *(undefined4 *)((int)this + 0xfaec) = 0xffffffff;
  if (*(short *)((int)this + 0x26) != 0) {
    do {
      pvVar7 = operator_new(8);
      *(void **)(*(int *)((int)this + 0xd8) + iVar8 * 4) = pvVar7;
      puVar1 = *(ushort **)(*(int *)((int)this + 0xd8) + iVar8 * 4);
      *(undefined4 *)(*(int *)((int)this + 0xdc) + iVar8 * 4) = 0;
      cVar2 = FUN_0040cce0((int)this);
      if (cVar2 != 'p') {
        uVar6 = FUN_0040ccf0((int)this);
        *puVar1 = uVar6;
        uVar6 = FUN_0040ccf0((int)this);
        puVar1[1] = uVar6;
        pvVar7 = operator_new((uint)*puVar1);
        *(void **)(*(int *)((int)this + 0xdc) + iVar8 * 4) = pvVar7;
        FUN_0040cd30(this,*(void **)(*(int *)((int)this + 0xdc) + iVar8 * 4),(uint)*puVar1);
      }
      iVar8 = iVar8 + 1;
    } while (iVar8 < (int)(uint)*(ushort *)((int)this + 0x26));
  }
  return 1;
}


// ==== FUN_0040be38 @ 0040be38 ====

undefined4
FUN_0040be38(uint param_1,uint param_2,undefined4 param_3,int param_4,int param_5,int param_6,
            undefined4 param_7)

{
  ushort *puVar1;
  undefined1 uVar2;
  char cVar3;
  byte bVar4;
  undefined2 uVar5;
  ushort uVar6;
  void *pvVar7;
  int iVar8;
  int iVar9;
  undefined4 uVar10;
  byte *pbVar11;
  undefined4 *puVar12;
  int *piVar13;
  uint uVar14;
  void *unaff_EBP;
  undefined1 *puVar15;
  uint uVar16;
  byte *pbVar17;
  char *pcVar18;
  undefined4 *puVar19;
  bool bVar20;
  int *in_stack_00000128;
  
  uVar5 = FUN_0040ccf0((int)unaff_EBP);
  *(undefined2 *)((int)unaff_EBP + 0x20) = uVar5;
  uVar5 = FUN_0040ccf0((int)unaff_EBP);
  *(undefined2 *)((int)unaff_EBP + 0x22) = uVar5;
  uVar5 = FUN_0040ccf0((int)unaff_EBP);
  *(undefined2 *)((int)unaff_EBP + 0x24) = uVar5;
  uVar5 = FUN_0040ccf0((int)unaff_EBP);
  *(undefined2 *)((int)unaff_EBP + 0x26) = uVar5;
  uVar2 = FUN_0040cce0((int)unaff_EBP);
  *(undefined1 *)((int)unaff_EBP + 0x30) = uVar2;
  uVar2 = FUN_0040cce0((int)unaff_EBP);
  *(undefined1 *)((int)unaff_EBP + 0x31) = uVar2;
  uVar2 = FUN_0040cce0((int)unaff_EBP);
  *(undefined1 *)((int)unaff_EBP + 0x32) = uVar2;
  uVar2 = FUN_0040cce0((int)unaff_EBP);
  *(undefined1 *)((int)unaff_EBP + 0x33) = uVar2;
  FUN_0040cd30(unaff_EBP,(void *)((int)unaff_EBP + 4),0x1a);
  FUN_0040cd30(unaff_EBP,(void *)((int)unaff_EBP + 0x80),0x40);
  FUN_0040cd30(unaff_EBP,(void *)((int)unaff_EBP + 0x40),0x40);
  pvVar7 = operator_new((uint)*(ushort *)((int)unaff_EBP + 0x20));
  *(void **)((int)unaff_EBP + 200) = pvVar7;
  FUN_0040cd30(unaff_EBP,pvVar7,(uint)*(ushort *)((int)unaff_EBP + 0x20));
  pvVar7 = operator_new((uint)*(ushort *)((int)unaff_EBP + 0x22) << 2);
  *(void **)((int)unaff_EBP + 0xcc) = pvVar7;
  param_2 = 0;
  if (*(short *)((int)unaff_EBP + 0x22) != 0) {
    do {
      pvVar7 = operator_new(0x22d);
      *(void **)(*(int *)((int)unaff_EBP + 0xcc) + param_2 * 4) = pvVar7;
      iVar8 = *(int *)(*(int *)((int)unaff_EBP + 0xcc) + param_2 * 4);
      cVar3 = FUN_0040cce0((int)unaff_EBP);
      if (cVar3 == 'i') {
        puVar15 = (undefined1 *)(iVar8 + 0x41);
        iVar8 = 0x78;
        do {
          *puVar15 = 0;
          puVar15 = puVar15 + 2;
          iVar8 = iVar8 + -1;
        } while (iVar8 != 0);
      }
      else {
        uVar5 = FUN_0040ccf0((int)unaff_EBP);
        *(undefined2 *)(iVar8 + 0x14) = uVar5;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x18) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x19) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x40) = uVar2;
        bVar4 = FUN_0040cce0((int)unaff_EBP);
        *(byte *)(iVar8 + 0x41) = bVar4;
        if ((bVar4 & 0x80) == 0) {
          FUN_0040cd30(unaff_EBP,(void *)(iVar8 + 0x42),0xee);
        }
        else {
          puVar15 = (undefined1 *)(iVar8 + 0x43);
          *(byte *)(iVar8 + 0x41) = bVar4 & 0x7f;
          iVar9 = 1;
          do {
            puVar15[-1] = (char)iVar9;
            *puVar15 = *(undefined1 *)(iVar8 + 0x41);
            iVar9 = iVar9 + 1;
            puVar15 = puVar15 + 2;
          } while (iVar9 < 0x78);
        }
        param_4 = iVar8 + 0x130;
        param_5 = iVar8 + 0x182;
        param_6 = iVar8 + 0x1d4;
        piVar13 = &param_4;
        iVar8 = 3;
        do {
          cVar3 = FUN_0040cce0((int)unaff_EBP);
          pcVar18 = (char *)*piVar13;
          *pcVar18 = cVar3;
          if (cVar3 != '\0') {
            cVar3 = FUN_0040cce0((int)unaff_EBP);
            pcVar18[1] = cVar3;
            cVar3 = FUN_0040cce0((int)unaff_EBP);
            pcVar18[2] = cVar3;
            cVar3 = FUN_0040cce0((int)unaff_EBP);
            pcVar18[3] = cVar3;
            cVar3 = FUN_0040cce0((int)unaff_EBP);
            pcVar18[4] = cVar3;
            cVar3 = FUN_0040cce0((int)unaff_EBP);
            pcVar18[5] = cVar3;
            FUN_0040cd30(unaff_EBP,pcVar18 + 6,(uint)(byte)pcVar18[1] * 3);
          }
          piVar13 = piVar13 + 1;
          iVar8 = iVar8 + -1;
        } while (iVar8 != 0);
      }
      param_2 = param_2 + 1;
    } while ((int)param_2 < (int)(uint)*(ushort *)((int)unaff_EBP + 0x22));
  }
  pvVar7 = operator_new((uint)*(ushort *)((int)unaff_EBP + 0x24) << 2);
  *(void **)((int)unaff_EBP + 0xd0) = pvVar7;
  pvVar7 = operator_new((uint)*(ushort *)((int)unaff_EBP + 0x24) << 2);
  *(void **)((int)unaff_EBP + 0xd4) = pvVar7;
  param_2 = 0;
  if (*(short *)((int)unaff_EBP + 0x24) != 0) {
    do {
      uVar14 = param_1;
      pvVar7 = operator_new(0x50);
      *(void **)(*(int *)((int)unaff_EBP + 0xd0) + param_2 * 4) = pvVar7;
      *(undefined4 *)(*(int *)((int)unaff_EBP + 0xd4) + param_2 * 4) = 0;
      iVar8 = *(int *)(*(int *)((int)unaff_EBP + 0xd0) + param_2 * 4);
      cVar3 = FUN_0040cce0((int)unaff_EBP);
      if (cVar3 == 's') {
        *(undefined1 *)(iVar8 + 0x12) = 0;
      }
      else {
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x11) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x12) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x13) = uVar2;
        uVar10 = FUN_0040cd10((int)unaff_EBP);
        *(undefined4 *)(iVar8 + 0x30) = uVar10;
        uVar10 = FUN_0040cd10((int)unaff_EBP);
        *(undefined4 *)(iVar8 + 0x34) = uVar10;
        uVar10 = FUN_0040cd10((int)unaff_EBP);
        *(undefined4 *)(iVar8 + 0x38) = uVar10;
        uVar10 = FUN_0040cd10((int)unaff_EBP);
        *(undefined4 *)(iVar8 + 0x40) = uVar10;
        uVar10 = FUN_0040cd10((int)unaff_EBP);
        *(undefined4 *)(iVar8 + 0x44) = uVar10;
        uVar10 = FUN_0040cd10((int)unaff_EBP);
        *(undefined4 *)(iVar8 + 0x3c) = uVar10;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x4c) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x4d) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x4e) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x4f) = uVar2;
        uVar2 = FUN_0040cce0((int)unaff_EBP);
        *(undefined1 *)(iVar8 + 0x2f) = uVar2;
        FUN_0040cd30(unaff_EBP,(void *)(iVar8 + 4),0xd);
        iVar8 = *(int *)(*(int *)((int)unaff_EBP + 0xd0) + param_2 * 4);
        uVar16 = *(uint *)(iVar8 + 0x30);
        bVar4 = *(byte *)(iVar8 + 0x12);
        if ((bVar4 & 2) != 0) {
          uVar16 = uVar16 << 1;
        }
        if ((bVar4 & 4) != 0) {
          FUN_0040c4b0();
        }
        if (**(char **)((int)unaff_EBP + 0xfae0) == '\0') {
          pvVar7 = operator_new(uVar16);
          *(void **)(*(int *)((int)unaff_EBP + 0xd4) + param_2 * 4) = pvVar7;
          if (in_stack_00000128 != (int *)0x0) {
            strncpy((char *)&param_4,
                    (char *)(*(int *)(*(int *)((int)unaff_EBP + 0xd0) + param_2 * 4) + 4),0xd);
            param_7._0_2_ = (ushort)(byte)param_7;
            param_1 = param_1 & 0xffffff;
            pbVar17 = &DAT_0041d3d8;
            pbVar11 = (byte *)&param_4;
            do {
              bVar4 = *pbVar11;
              bVar20 = bVar4 < *pbVar17;
              if (bVar4 != *pbVar17) {
LAB_0040c209:
                iVar8 = (1 - (uint)bVar20) - (uint)(bVar20 != 0);
                goto LAB_0040c20e;
              }
              if (bVar4 == 0) break;
              bVar4 = pbVar11[1];
              bVar20 = bVar4 < pbVar17[1];
              if (bVar4 != pbVar17[1]) goto LAB_0040c209;
              pbVar11 = pbVar11 + 2;
              pbVar17 = pbVar17 + 2;
            } while (bVar4 != 0);
            iVar8 = 0;
LAB_0040c20e:
            if ((iVar8 == 0) &&
               (puVar12 = (undefined4 *)FUN_0040c4c0((LPCSTR)0x320,&DAT_0041d3d0),
               puVar12 != (undefined4 *)0x0)) {
              param_1._0_3_ = (undefined3)uVar14;
              param_1 = CONCAT13(1,(undefined3)param_1);
              puVar19 = *(undefined4 **)(*(int *)((int)unaff_EBP + 0xd4) + param_2 * 4);
              for (uVar14 = uVar16 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                *puVar19 = *puVar12;
                puVar12 = puVar12 + 1;
                puVar19 = puVar19 + 1;
              }
              for (uVar14 = uVar16 & 3; uVar14 != 0; uVar14 = uVar14 - 1) {
                *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                puVar12 = (undefined4 *)((int)puVar12 + 1);
                puVar19 = (undefined4 *)((int)puVar19 + 1);
              }
            }
            pbVar17 = &DAT_0041d3c4;
            pbVar11 = (byte *)&param_4;
            do {
              bVar4 = *pbVar11;
              bVar20 = bVar4 < *pbVar17;
              if (bVar4 != *pbVar17) {
LAB_0040c276:
                iVar8 = (1 - (uint)bVar20) - (uint)(bVar20 != 0);
                goto LAB_0040c27b;
              }
              if (bVar4 == 0) break;
              bVar4 = pbVar11[1];
              bVar20 = bVar4 < pbVar17[1];
              if (bVar4 != pbVar17[1]) goto LAB_0040c276;
              pbVar11 = pbVar11 + 2;
              pbVar17 = pbVar17 + 2;
            } while (bVar4 != 0);
            iVar8 = 0;
LAB_0040c27b:
            if ((iVar8 == 0) &&
               (puVar12 = (undefined4 *)FUN_0040c4c0((LPCSTR)0x321,&DAT_0041d3d0),
               puVar12 != (undefined4 *)0x0)) {
              param_1 = CONCAT13(1,(undefined3)param_1);
              puVar19 = *(undefined4 **)(*(int *)((int)unaff_EBP + 0xd4) + param_2 * 4);
              for (uVar14 = uVar16 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                *puVar19 = *puVar12;
                puVar12 = puVar12 + 1;
                puVar19 = puVar19 + 1;
              }
              for (uVar14 = uVar16 & 3; uVar14 != 0; uVar14 = uVar14 - 1) {
                *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                puVar12 = (undefined4 *)((int)puVar12 + 1);
                puVar19 = (undefined4 *)((int)puVar19 + 1);
              }
            }
            pcVar18 = s_CRASH_WAV_0041d3b8;
            pbVar11 = (byte *)&param_4;
            do {
              bVar4 = *pbVar11;
              bVar20 = bVar4 < (byte)*pcVar18;
              if (bVar4 != *pcVar18) {
LAB_0040c2e3:
                iVar8 = (1 - (uint)bVar20) - (uint)(bVar20 != 0);
                goto LAB_0040c2e8;
              }
              if (bVar4 == 0) break;
              bVar4 = pbVar11[1];
              bVar20 = bVar4 < (byte)pcVar18[1];
              if (bVar4 != pcVar18[1]) goto LAB_0040c2e3;
              pbVar11 = pbVar11 + 2;
              pcVar18 = pcVar18 + 2;
            } while (bVar4 != 0);
            iVar8 = 0;
LAB_0040c2e8:
            if ((iVar8 == 0) &&
               (puVar12 = (undefined4 *)FUN_0040c4c0((LPCSTR)0x322,&DAT_0041d3d0),
               puVar12 != (undefined4 *)0x0)) {
              puVar19 = *(undefined4 **)(*(int *)((int)unaff_EBP + 0xd4) + param_2 * 4);
              for (uVar14 = uVar16 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                *puVar19 = *puVar12;
                puVar12 = puVar12 + 1;
                puVar19 = puVar19 + 1;
              }
              for (uVar16 = uVar16 & 3; uVar16 != 0; uVar16 = uVar16 - 1) {
                *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                puVar12 = (undefined4 *)((int)puVar12 + 1);
                puVar19 = (undefined4 *)((int)puVar19 + 1);
              }
            }
            else if (param_1._3_1_ == '\0') {
              piVar13 = (int *)(**(code **)(*in_stack_00000128 + 4))(in_stack_00000128,&param_4);
              if (piVar13 == (int *)0x0) {
                sprintf(&stack0x00000020,s_Itmodule_cpp__void_TModule__Read_0041d36c,&param_4);
                MessageBoxA((HWND)0x0,&stack0x00000020,s_Error_0041d364,0x10);
              }
              else {
                puVar12 = (undefined4 *)(**(code **)(*piVar13 + 0x18))(piVar13);
                puVar19 = *(undefined4 **)(*(int *)((int)unaff_EBP + 0xd4) + param_1 * 4);
                for (uVar14 = param_2 >> 2; uVar14 != 0; uVar14 = uVar14 - 1) {
                  *puVar19 = *puVar12;
                  puVar12 = puVar12 + 1;
                  puVar19 = puVar19 + 1;
                }
                for (uVar14 = param_2 & 3; uVar14 != 0; uVar14 = uVar14 - 1) {
                  *(undefined1 *)puVar19 = *(undefined1 *)puVar12;
                  puVar12 = (undefined4 *)((int)puVar12 + 1);
                  puVar19 = (undefined4 *)((int)puVar19 + 1);
                }
                iVar8 = *(int *)(*(int *)((int)unaff_EBP + 0xd0) + param_1 * 4);
                *(byte *)(iVar8 + 0x12) = *(byte *)(iVar8 + 0x12) & 0xf7;
                (**(code **)(*piVar13 + 0x1c))(piVar13);
              }
            }
          }
        }
      }
      param_2 = param_2 + 1;
    } while ((int)param_2 < (int)(uint)*(ushort *)((int)unaff_EBP + 0x24));
  }
  pvVar7 = operator_new((uint)*(ushort *)((int)unaff_EBP + 0x26) << 2);
  *(void **)((int)unaff_EBP + 0xd8) = pvVar7;
  pvVar7 = operator_new((uint)*(ushort *)((int)unaff_EBP + 0x26) << 2);
  iVar8 = 0;
  *(void **)((int)unaff_EBP + 0xdc) = pvVar7;
  *(undefined4 *)((int)unaff_EBP + 0xfaec) = 0xffffffff;
  if (*(short *)((int)unaff_EBP + 0x26) != 0) {
    do {
      pvVar7 = operator_new(8);
      *(void **)(*(int *)((int)unaff_EBP + 0xd8) + iVar8 * 4) = pvVar7;
      puVar1 = *(ushort **)(*(int *)((int)unaff_EBP + 0xd8) + iVar8 * 4);
      *(undefined4 *)(*(int *)((int)unaff_EBP + 0xdc) + iVar8 * 4) = 0;
      cVar3 = FUN_0040cce0((int)unaff_EBP);
      if (cVar3 != 'p') {
        uVar6 = FUN_0040ccf0((int)unaff_EBP);
        *puVar1 = uVar6;
        uVar6 = FUN_0040ccf0((int)unaff_EBP);
        puVar1[1] = uVar6;
        pvVar7 = operator_new((uint)*puVar1);
        *(void **)(*(int *)((int)unaff_EBP + 0xdc) + iVar8 * 4) = pvVar7;
        FUN_0040cd30(unaff_EBP,*(void **)(*(int *)((int)unaff_EBP + 0xdc) + iVar8 * 4),(uint)*puVar1
                    );
      }
      iVar8 = iVar8 + 1;
    } while (iVar8 < (int)(uint)*(ushort *)((int)unaff_EBP + 0x26));
  }
  return 1;
}


// ==== FUN_0040c4b0 @ 0040c4b0 ====

undefined4 FUN_0040c4b0(void)

{
  return 0;
}


// ==== FUN_0040c4c0 @ 0040c4c0 ====

void FUN_0040c4c0(LPCSTR param_1,LPCSTR param_2)

{
  HMODULE hModule;
  HRSRC hResInfo;
  HGLOBAL hResData;
  
  hModule = GetModuleHandleA((LPCSTR)0x0);
  hResInfo = FindResourceA(hModule,param_1,param_2);
  if (hResInfo == (HRSRC)0x0) {
    return;
  }
  hResData = LoadResource(hModule,hResInfo);
  if (hResData == (HGLOBAL)0x0) {
    return;
  }
  LockResource(hResData);
  return;
}


// ==== FUN_0040c500 @ 0040c500 ====

undefined4 __thiscall FUN_0040c500(void *this,void *param_1)

{
  char *pcVar1;
  char *pcVar2;
  size_t _Size;
  int iVar3;
  undefined4 uVar4;
  void *pvVar5;
  void *pvVar6;
  void *pvVar7;
  void *pvVar8;
  int iVar9;
  int iVar10;
  
  *(void **)((int)this + 0xc0) = param_1;
  FUN_0040ccb0(this,this,0xc0);
  _Size = *(size_t *)this;
  if (_Size != 0x4d504d49) {
    param_1 = malloc(_Size);
    *(void **)((int)this + 0xc0) = param_1;
    FUN_0040ccb0(this,this,0xc0);
  }
  if ((*(byte *)((int)this + 0x2c) & 4) == 0) {
    uVar4 = FUN_0040c4b0();
    return uVar4;
  }
  pvVar5 = operator_new((uint)*(ushort *)((int)this + 0x20));
  *(void **)((int)this + 200) = pvVar5;
  FUN_0040ccb0(this,pvVar5,(uint)*(ushort *)((int)this + 0x20));
  pvVar5 = operator_new((uint)*(ushort *)((int)this + 0x22) << 2);
  pvVar6 = operator_new((uint)*(ushort *)((int)this + 0x24) << 2);
  pvVar7 = operator_new((uint)*(ushort *)((int)this + 0x26) << 2);
  FUN_0040ccb0(this,pvVar5,(uint)*(ushort *)((int)this + 0x22) << 2);
  FUN_0040ccb0(this,pvVar6,(uint)*(ushort *)((int)this + 0x24) << 2);
  FUN_0040ccb0(this,pvVar7,(uint)*(ushort *)((int)this + 0x26) << 2);
  pvVar8 = operator_new((uint)*(ushort *)((int)this + 0x22) << 2);
  iVar10 = 0;
  *(void **)((int)this + 0xcc) = pvVar8;
  if (*(short *)((int)this + 0x22) != 0) {
    do {
      pvVar8 = operator_new(0x22d);
      *(void **)(*(int *)((int)this + 0xcc) + iVar10 * 4) = pvVar8;
      FUN_0040cc90(this,(int)param_1,*(int *)((int)pvVar5 + iVar10 * 4));
      FUN_0040ccb0(this,*(void **)(*(int *)((int)this + 0xcc) + iVar10 * 4),0x22d);
      iVar9 = 0;
      do {
        iVar3 = *(int *)(*(int *)((int)this + 0xcc) + iVar10 * 4);
        *(char *)(iVar3 + 0x188 + iVar9) = *(char *)(iVar3 + 0x188 + iVar9) + ' ';
        iVar3 = *(int *)(*(int *)((int)this + 0xcc) + iVar10 * 4);
        pcVar1 = (char *)(iVar3 + 0x1da + iVar9);
        pcVar2 = (char *)(iVar3 + 0x1da + iVar9);
        iVar9 = iVar9 + 3;
        *pcVar2 = *pcVar1 + ' ';
      } while (iVar9 < 0x4b);
      iVar10 = iVar10 + 1;
    } while (iVar10 < (int)(uint)*(ushort *)((int)this + 0x22));
  }
  pvVar5 = operator_new((uint)*(ushort *)((int)this + 0x24) << 2);
  *(void **)((int)this + 0xd0) = pvVar5;
  pvVar5 = operator_new((uint)*(ushort *)((int)this + 0x24) << 2);
  iVar10 = 0;
  *(void **)((int)this + 0xd4) = pvVar5;
  if (*(short *)((int)this + 0x24) != 0) {
    do {
      pvVar5 = operator_new(0x50);
      *(void **)(*(int *)((int)this + 0xd0) + iVar10 * 4) = pvVar5;
      *(undefined4 *)(*(int *)((int)this + 0xd4) + iVar10 * 4) = 0;
      FUN_0040cc90(this,(int)param_1,*(int *)((int)pvVar6 + iVar10 * 4));
      FUN_0040ccb0(this,*(void **)(*(int *)((int)this + 0xd0) + iVar10 * 4),0x50);
      iVar9 = *(int *)(*(int *)((int)this + 0xd0) + iVar10 * 4);
      if ((*(int *)(iVar9 + 0x30) != 0) && ((*(byte *)(iVar9 + 0x12) & 1) != 0)) {
        *(undefined4 *)(*(int *)((int)this + 0xd4) + iVar10 * 4) = 0;
        FUN_0040cc90(this,(int)param_1,
                     *(int *)(*(int *)(*(int *)((int)this + 0xd0) + iVar10 * 4) + 0x48));
        FUN_0040cac0(this,iVar10);
      }
      iVar10 = iVar10 + 1;
    } while (iVar10 < (int)(uint)*(ushort *)((int)this + 0x24));
  }
  pvVar5 = operator_new((uint)*(ushort *)((int)this + 0x26) << 2);
  *(void **)((int)this + 0xd8) = pvVar5;
  pvVar5 = operator_new((uint)*(ushort *)((int)this + 0x26) << 2);
  iVar10 = 0;
  *(void **)((int)this + 0xdc) = pvVar5;
  *(undefined4 *)((int)this + 0xfaec) = 0xffffffff;
  if (*(short *)((int)this + 0x26) != 0) {
    do {
      pvVar5 = operator_new(8);
      *(void **)(*(int *)((int)this + 0xd8) + iVar10 * 4) = pvVar5;
      *(undefined4 *)(*(int *)((int)this + 0xdc) + iVar10 * 4) = 0;
      iVar9 = *(int *)((int)pvVar7 + iVar10 * 4);
      if (iVar9 != 0) {
        FUN_0040cc90(this,(int)param_1,iVar9);
        FUN_0040ccb0(this,*(void **)(*(int *)((int)this + 0xd8) + iVar10 * 4),8);
        pvVar5 = operator_new((uint)**(ushort **)(*(int *)((int)this + 0xd8) + iVar10 * 4));
        *(void **)(*(int *)((int)this + 0xdc) + iVar10 * 4) = pvVar5;
        FUN_0040ccb0(this,*(void **)(*(int *)((int)this + 0xdc) + iVar10 * 4),
                     (uint)**(ushort **)(*(int *)((int)this + 0xd8) + iVar10 * 4));
      }
      iVar10 = iVar10 + 1;
    } while (iVar10 < (int)(uint)*(ushort *)((int)this + 0x26));
  }
  if (_Size != 0x4d504d49) {
    free(param_1);
  }
  return 1;
}


// ==== FUN_0040c880 @ 0040c880 ====

undefined4 * __thiscall FUN_0040c880(void *this,int param_1)

{
  undefined4 *puVar1;
  undefined1 uVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  undefined1 *puVar6;
  int iVar7;
  int iVar8;
  undefined4 *puVar9;
  int local_190;
  uint local_18c;
  uint local_184;
  byte local_180;
  undefined4 local_17f;
  undefined4 local_140;
  undefined1 auStack_13c [316];
  
  if (*(int *)((int)this + 0xfaec) == param_1) {
    return (undefined4 *)((int)this + 0xe0);
  }
  *(int *)((int)this + 0xfaec) = param_1;
  puVar1 = (undefined4 *)((int)this + 0xe0);
  iVar3 = *(int *)(*(int *)((int)this + 0xd8) + param_1 * 4);
  iVar4 = *(int *)(*(int *)((int)this + 0xdc) + param_1 * 4);
  puVar9 = puVar1;
  for (iVar5 = 16000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = 0;
    puVar9 = puVar9 + 1;
  }
  if (iVar4 != 0) {
    iVar5 = 0;
    if (*(short *)(iVar3 + 2) != 0) {
      puVar6 = (undefined1 *)((int)this + 0xe2);
      do {
        *puVar6 = 0xff;
        iVar5 = iVar5 + 1;
        puVar6 = puVar6 + 5;
      } while (iVar5 < (int)((uint)*(ushort *)(iVar3 + 2) * 0x40));
    }
    local_180 = 0;
    puVar9 = &local_17f;
    for (iVar5 = 0xf; iVar5 != 0; iVar5 = iVar5 + -1) {
      *puVar9 = 0;
      puVar9 = puVar9 + 1;
    }
    *(undefined2 *)puVar9 = 0;
    *(undefined1 *)((int)puVar9 + 2) = 0;
    puVar9 = &local_140;
    for (iVar5 = 0x50; iVar5 != 0; iVar5 = iVar5 + -1) {
      *puVar9 = 0;
      puVar9 = puVar9 + 1;
    }
    local_18c = 0;
    puVar6 = (undefined1 *)((int)&local_140 + 2);
    iVar5 = 0x40;
    do {
      *puVar6 = 0xff;
      puVar6 = puVar6 + 5;
      iVar5 = iVar5 + -1;
    } while (iVar5 != 0);
    local_190 = 0;
    iVar5 = 0;
    do {
      iVar7 = iVar5 + 1;
      if (*(char *)(iVar5 + iVar4) == '\0') {
        local_18c = local_18c + 1;
        local_190 = local_190 + 0x40;
      }
      else {
        local_184 = (uint)(*(char *)(iVar5 + iVar4) - 1U & 0x3f);
        iVar8 = iVar7;
        if ((*(byte *)(iVar5 + iVar4) & 0x80) != 0) {
          iVar8 = iVar5 + 2;
          (&local_180)[local_184] = *(byte *)(iVar7 + iVar4);
        }
        iVar5 = local_190 + local_184;
        if (((&local_180)[local_184] & 1) != 0) {
          uVar2 = *(undefined1 *)(iVar8 + iVar4);
          iVar8 = iVar8 + 1;
          *(undefined1 *)((int)puVar1 + iVar5 * 5) = uVar2;
          auStack_13c[local_184 * 5 + -4] = uVar2;
        }
        if (((&local_180)[local_184] & 2) != 0) {
          uVar2 = *(undefined1 *)(iVar8 + iVar4);
          iVar8 = iVar8 + 1;
          *(undefined1 *)(iVar5 * 5 + 1 + (int)puVar1) = uVar2;
          auStack_13c[local_184 * 5 + -3] = uVar2;
        }
        if (((&local_180)[local_184] & 4) != 0) {
          uVar2 = *(undefined1 *)(iVar8 + iVar4);
          iVar8 = iVar8 + 1;
          *(undefined1 *)(iVar5 * 5 + 2 + (int)puVar1) = uVar2;
          auStack_13c[local_184 * 5 + -2] = uVar2;
        }
        iVar7 = iVar8;
        if (((&local_180)[local_184] & 8) != 0) {
          iVar7 = iVar8 + 2;
          uVar2 = *(undefined1 *)(iVar8 + iVar4);
          auStack_13c[local_184 * 5 + -1] = uVar2;
          *(undefined1 *)((int)puVar1 + iVar5 * 5 + 3) = uVar2;
          uVar2 = *(undefined1 *)(iVar8 + 1 + iVar4);
          *(undefined1 *)((int)puVar1 + iVar5 * 5 + 4) = uVar2;
          auStack_13c[local_184 * 5] = uVar2;
        }
        if (((&local_180)[local_184] & 0x10) != 0) {
          *(undefined1 *)((int)puVar1 + iVar5 * 5) = auStack_13c[local_184 * 5 + -4];
        }
        if (((&local_180)[local_184] & 0x20) != 0) {
          *(undefined1 *)(iVar5 * 5 + 1 + (int)puVar1) = auStack_13c[local_184 * 5 + -3];
        }
        if (((&local_180)[local_184] & 0x40) != 0) {
          *(undefined1 *)(iVar5 * 5 + 2 + (int)puVar1) = auStack_13c[local_184 * 5 + -2];
        }
        if (((&local_180)[local_184] & 0x80) != 0) {
          uVar2 = auStack_13c[local_184 * 5];
          *(undefined1 *)((int)puVar1 + iVar5 * 5 + 3) = auStack_13c[local_184 * 5 + -1];
          *(undefined1 *)((int)puVar1 + iVar5 * 5 + 4) = uVar2;
        }
      }
      iVar5 = iVar7;
    } while (local_18c < *(ushort *)(iVar3 + 2));
    return puVar1;
  }
  return puVar1;
}


// ==== FUN_0040cac0 @ 0040cac0 ====

void __thiscall FUN_0040cac0(void *this,int param_1)

{
  byte bVar1;
  int iVar2;
  int iVar3;
  void *pvVar4;
  int *piVar5;
  undefined4 *puVar6;
  short *psVar7;
  uint uVar8;
  char cVar9;
  short sVar10;
  int *unaff_ESI;
  uint uVar11;
  undefined4 *puVar12;
  char local_110 [8];
  char acStack_108 [5];
  undefined1 local_103;
  
  iVar2 = *(int *)(*(int *)((int)this + 0xd0) + param_1 * 4);
  uVar11 = *(uint *)(iVar2 + 0x30);
  bVar1 = *(byte *)(iVar2 + 0x12);
  if ((bVar1 & 2) != 0) {
    uVar11 = uVar11 << 1;
  }
  if ((bVar1 & 4) != 0) {
    FUN_0040c4b0();
  }
  if (**(char **)((int)this + 0xfae0) == '\0') {
    pvVar4 = operator_new(uVar11);
    *(void **)(*(int *)((int)this + 0xd4) + param_1 * 4) = pvVar4;
    FUN_0040ccb0(this,*(void **)(*(int *)((int)this + 0xd4) + param_1 * 4),uVar11);
    if (*(int *)((int)this + 0xfae4) != 0) {
      strncpy(local_110,(char *)(*(int *)(*(int *)((int)this + 0xd0) + param_1 * 4) + 4),0xd);
      local_103 = 0;
      piVar5 = (int *)(**(code **)(**(int **)((int)this + 0xfae4) + 4))
                                (*(int **)((int)this + 0xfae4),local_110);
      if (piVar5 == (int *)0x0) {
        sprintf(acStack_108,s_Itmodule_cpp__void_TModule__Read_0041d36c,&stack0xfffffee8);
        MessageBoxA((HWND)0x0,acStack_108,s_Error_0041d364,0x10);
      }
      else {
        puVar6 = (undefined4 *)(**(code **)(*piVar5 + 0x18))(piVar5);
        puVar12 = *(undefined4 **)(*(int *)((int)this + 0xd4) + param_1 * 4);
        for (uVar8 = uVar11 >> 2; uVar8 != 0; uVar8 = uVar8 - 1) {
          *puVar12 = *puVar6;
          puVar6 = puVar6 + 1;
          puVar12 = puVar12 + 1;
        }
        for (uVar11 = uVar11 & 3; uVar11 != 0; uVar11 = uVar11 - 1) {
          *(undefined1 *)puVar12 = *(undefined1 *)puVar6;
          puVar6 = (undefined4 *)((int)puVar6 + 1);
          puVar12 = (undefined4 *)((int)puVar12 + 1);
        }
        iVar2 = *(int *)(*(int *)((int)this + 0xd0) + param_1 * 4);
        *(byte *)(iVar2 + 0x12) = *(byte *)(iVar2 + 0x12) & 0xf7;
        (**(code **)(*unaff_ESI + 0x1c))(unaff_ESI);
      }
    }
  }
  else {
    *(undefined4 *)(*(int *)((int)this + 0xd4) + param_1 * 4) = 0;
    *(uint *)((int)this + 0xc0) = *(int *)((int)this + 0xc0) + uVar11;
  }
  iVar2 = *(int *)(*(int *)((int)this + 0xd0) + param_1 * 4);
  if (((*(byte *)(iVar2 + 0x12) & 8) != 0) && (**(char **)((int)this + 0xfae0) == '\0')) {
    if ((*(byte *)(iVar2 + 0x12) & 2) == 0) {
      cVar9 = '\0';
      iVar3 = *(int *)(*(int *)((int)this + 0xd4) + param_1 * 4);
      uVar11 = 0;
      if (*(int *)(iVar2 + 0x30) != 0) {
        do {
          cVar9 = cVar9 + *(char *)(uVar11 + iVar3);
          uVar8 = uVar11 + 1;
          *(char *)(uVar11 + iVar3) = cVar9;
          uVar11 = uVar8;
        } while (uVar8 < *(uint *)(*(int *)(*(int *)((int)this + 0xd0) + param_1 * 4) + 0x30));
      }
    }
    else {
      sVar10 = 0;
      uVar11 = 0;
      psVar7 = *(short **)(*(int *)((int)this + 0xd4) + param_1 * 4);
      if (*(int *)(iVar2 + 0x30) != 0) {
        do {
          sVar10 = sVar10 + *psVar7;
          uVar11 = uVar11 + 1;
          *psVar7 = sVar10;
          psVar7 = psVar7 + 1;
        } while (uVar11 < *(uint *)(*(int *)(*(int *)((int)this + 0xd0) + param_1 * 4) + 0x30));
        return;
      }
    }
  }
  return;
}


// ==== FUN_0040cc90 @ 0040cc90 ====

void __thiscall FUN_0040cc90(void *this,int param_1,int param_2)

{
  *(int *)((int)this + 0xc0) = param_1 + param_2;
  return;
}


// ==== FUN_0040ccb0 @ 0040ccb0 ====

void __thiscall FUN_0040ccb0(void *this,void *param_1,size_t param_2)

{
  memmove(param_1,*(void **)((int)this + 0xc0),param_2);
  *(size_t *)((int)this + 0xc0) = *(int *)((int)this + 0xc0) + param_2;
  return;
}


// ==== FUN_0040cce0 @ 0040cce0 ====

undefined1 __fastcall FUN_0040cce0(int param_1)

{
  undefined1 uVar1;
  
  uVar1 = **(undefined1 **)(param_1 + 0xc0);
  *(undefined1 **)(param_1 + 0xc0) = *(undefined1 **)(param_1 + 0xc0) + 1;
  return uVar1;
}


// ==== FUN_0040ccf0 @ 0040ccf0 ====

undefined2 __fastcall FUN_0040ccf0(int param_1)

{
  undefined2 uVar1;
  
  uVar1 = **(undefined2 **)(param_1 + 0xc0);
  *(undefined2 **)(param_1 + 0xc0) = *(undefined2 **)(param_1 + 0xc0) + 1;
  return uVar1;
}


// ==== FUN_0040cd10 @ 0040cd10 ====

undefined4 __fastcall FUN_0040cd10(int param_1)

{
  undefined4 uVar1;
  
  uVar1 = **(undefined4 **)(param_1 + 0xc0);
  *(undefined4 **)(param_1 + 0xc0) = *(undefined4 **)(param_1 + 0xc0) + 1;
  return uVar1;
}


// ==== FUN_0040cd30 @ 0040cd30 ====

void __thiscall FUN_0040cd30(void *this,void *param_1,size_t param_2)

{
  FUN_0040ccb0(this,param_1,param_2);
  return;
}


// ==== FUN_0040cd50 @ 0040cd50 ====

void __thiscall FUN_0040cd50(void *this,undefined1 param_1)

{
  undefined1 *puVar1;
  
  puVar1 = *(undefined1 **)((int)this + 0xfae8);
  *puVar1 = param_1;
  *(undefined1 **)((int)this + 0xfae8) = puVar1 + 1;
  return;
}


// ==== FUN_0040cd70 @ 0040cd70 ====

void __thiscall FUN_0040cd70(void *this,undefined2 param_1)

{
  undefined2 *puVar1;
  
  puVar1 = *(undefined2 **)((int)this + 0xfae8);
  *puVar1 = param_1;
  *(undefined2 **)((int)this + 0xfae8) = puVar1 + 1;
  return;
}


// ==== FUN_0040cd90 @ 0040cd90 ====

void __thiscall FUN_0040cd90(void *this,undefined4 param_1)

{
  undefined4 *puVar1;
  
  puVar1 = *(undefined4 **)((int)this + 0xfae8);
  *puVar1 = param_1;
  *(undefined4 **)((int)this + 0xfae8) = puVar1 + 1;
  return;
}


// ==== FUN_0040cdb0 @ 0040cdb0 ====

void __thiscall FUN_0040cdb0(void *this,undefined4 *param_1,uint param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  undefined4 *puVar3;
  
  puVar1 = *(undefined4 **)((int)this + 0xfae8);
  puVar3 = puVar1;
  for (uVar2 = param_2 >> 2; uVar2 != 0; uVar2 = uVar2 - 1) {
    *puVar3 = *param_1;
    param_1 = param_1 + 1;
    puVar3 = puVar3 + 1;
  }
  for (uVar2 = param_2 & 3; uVar2 != 0; uVar2 = uVar2 - 1) {
    *(undefined1 *)puVar3 = *(undefined1 *)param_1;
    param_1 = (undefined4 *)((int)param_1 + 1);
    puVar3 = (undefined4 *)((int)puVar3 + 1);
  }
  *(undefined1 **)((int)this + 0xfae8) = (undefined1 *)((int)puVar1 + param_2);
  return;
}


// ==== FUN_0040cdf0 @ 0040cdf0 ====

void __fastcall FUN_0040cdf0(void *param_1)

{
  byte bVar1;
  int iVar2;
  char *pcVar3;
  bool bVar4;
  void *_Memory;
  undefined4 *puVar5;
  uint uVar6;
  int *piVar7;
  int iVar8;
  byte *pbVar9;
  size_t _NewSize;
  undefined1 local_16;
  byte local_15;
  int local_14;
  void *local_10;
  int local_c [3];
  
  _Memory = malloc(0x100000);
  *(void **)((int)param_1 + 0xfae8) = _Memory;
  local_10 = _Memory;
  FUN_0040cd90(param_1,0);
  FUN_0040cd50(param_1,0x21);
  FUN_0040cd70(param_1,*(undefined2 *)((int)param_1 + 0x20));
  FUN_0040cd70(param_1,*(undefined2 *)((int)param_1 + 0x22));
  FUN_0040cd70(param_1,*(undefined2 *)((int)param_1 + 0x24));
  FUN_0040cd70(param_1,*(undefined2 *)((int)param_1 + 0x26));
  FUN_0040cd50(param_1,*(undefined1 *)((int)param_1 + 0x30));
  FUN_0040cd50(param_1,*(undefined1 *)((int)param_1 + 0x31));
  FUN_0040cd50(param_1,*(undefined1 *)((int)param_1 + 0x32));
  FUN_0040cd50(param_1,*(undefined1 *)((int)param_1 + 0x33));
  FUN_0040cdb0(param_1,(undefined4 *)((int)param_1 + 4),0x1a);
  FUN_0040cdb0(param_1,(undefined4 *)((int)param_1 + 0x80),0x40);
  FUN_0040cdb0(param_1,(undefined4 *)((int)param_1 + 0x40),0x40);
  FUN_0040cdb0(param_1,*(undefined4 **)((int)param_1 + 200),(uint)*(ushort *)((int)param_1 + 0x20));
  iVar8 = 0;
  if (*(short *)((int)param_1 + 0x22) != 0) {
    do {
      bVar4 = true;
      iVar2 = *(int *)(*(int *)((int)param_1 + 0xcc) + iVar8 * 4);
      uVar6 = 0;
      bVar1 = *(byte *)(iVar2 + 0x41);
      pbVar9 = (byte *)(iVar2 + 0x40);
      do {
        if ((pbVar9[1] != bVar1) && (*pbVar9 != uVar6)) {
          bVar4 = false;
        }
        uVar6 = uVar6 + 1;
        pbVar9 = pbVar9 + 2;
      } while ((int)uVar6 < 0x78);
      if ((bVar4) && (bVar1 == 0)) {
        FUN_0040cd50(param_1,0x69);
      }
      else {
        FUN_0040cd50(param_1,0x49);
        FUN_0040cd70(param_1,*(undefined2 *)
                              (*(int *)(*(int *)((int)param_1 + 0xcc) + iVar8 * 4) + 0x14));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xcc) + iVar8 * 4) + 0x18));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xcc) + iVar8 * 4) + 0x19));
        if (bVar4) {
          local_15 = bVar1 | 0x80;
          puVar5 = (undefined4 *)&local_16;
          uVar6 = 2;
          local_16 = 0;
        }
        else {
          uVar6 = 0xf0;
          puVar5 = (undefined4 *)(*(int *)(*(int *)((int)param_1 + 0xcc) + iVar8 * 4) + 0x40);
        }
        FUN_0040cdb0(param_1,puVar5,uVar6);
        piVar7 = local_c;
        local_14 = 3;
        iVar2 = *(int *)(*(int *)((int)param_1 + 0xcc) + iVar8 * 4);
        local_c[0] = iVar2 + 0x130;
        local_c[1] = iVar2 + 0x182;
        local_c[2] = iVar2 + 0x1d4;
        do {
          pcVar3 = (char *)*piVar7;
          if (*pcVar3 == '\0') {
            FUN_0040cd50(param_1,0);
          }
          else {
            FUN_0040cd50(param_1,*pcVar3);
            FUN_0040cd50(param_1,pcVar3[1]);
            FUN_0040cd50(param_1,pcVar3[2]);
            FUN_0040cd50(param_1,pcVar3[3]);
            FUN_0040cd50(param_1,pcVar3[4]);
            FUN_0040cd50(param_1,pcVar3[5]);
            FUN_0040cdb0(param_1,(undefined4 *)(pcVar3 + 6),(uint)(byte)pcVar3[1] * 3);
          }
          piVar7 = piVar7 + 1;
          local_14 = local_14 + -1;
        } while (local_14 != 0);
      }
      iVar8 = iVar8 + 1;
      _Memory = local_10;
    } while (iVar8 < (int)(uint)*(ushort *)((int)param_1 + 0x22));
  }
  iVar8 = 0;
  if (*(short *)((int)param_1 + 0x24) != 0) {
    do {
      if ((*(byte *)(*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x12) & 1) == 0) {
        FUN_0040cd50(param_1,0x73);
      }
      else {
        FUN_0040cd50(param_1,0x53);
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x11));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x12));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x13));
        FUN_0040cd90(param_1,*(undefined4 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x30));
        FUN_0040cd90(param_1,*(undefined4 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x34));
        FUN_0040cd90(param_1,*(undefined4 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x38));
        FUN_0040cd90(param_1,*(undefined4 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x40));
        FUN_0040cd90(param_1,*(undefined4 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x44));
        FUN_0040cd90(param_1,*(undefined4 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x3c));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x4c));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x4d));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x4e));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x4f));
        FUN_0040cd50(param_1,*(undefined1 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x2f));
        FUN_0040cdb0(param_1,(undefined4 *)
                             (*(int *)(*(int *)((int)param_1 + 0xd0) + iVar8 * 4) + 0x14),0xd);
      }
      iVar8 = iVar8 + 1;
    } while (iVar8 < (int)(uint)*(ushort *)((int)param_1 + 0x24));
  }
  iVar8 = 0;
  if (*(short *)((int)param_1 + 0x26) != 0) {
    do {
      if (*(int *)(*(int *)((int)param_1 + 0xdc) + iVar8 * 4) == 0) {
        FUN_0040cd50(param_1,0x70);
      }
      else {
        FUN_0040cd50(param_1,0x50);
        FUN_0040cd70(param_1,**(undefined2 **)(*(int *)((int)param_1 + 0xd8) + iVar8 * 4));
        FUN_0040cd70(param_1,*(undefined2 *)
                              (*(int *)(*(int *)((int)param_1 + 0xd8) + iVar8 * 4) + 2));
        FUN_0040cdb0(param_1,*(undefined4 **)(*(int *)((int)param_1 + 0xdc) + iVar8 * 4),
                     (uint)**(ushort **)(*(int *)((int)param_1 + 0xd8) + iVar8 * 4));
      }
      iVar8 = iVar8 + 1;
    } while (iVar8 < (int)(uint)*(ushort *)((int)param_1 + 0x26));
  }
  _NewSize = *(int *)((int)param_1 + 0xfae8) - (int)_Memory;
  *(void **)((int)param_1 + 0xfae8) = _Memory;
  FUN_0040cd90(param_1,_NewSize);
  realloc(_Memory,_NewSize);
  return;
}


// ==== FUN_0040d270 @ 0040d270 ====

void __fastcall FUN_0040d270(undefined4 *param_1)

{
  param_1[7] = 0;
  param_1[9] = 0x3f800000;
  *param_1 = &PTR_LAB_0041aa98;
  return;
}


// ==== FUN_0040d290 @ 0040d290 ====

void __thiscall FUN_0040d290(void *this,uint param_1,undefined4 param_2)

{
  int iVar1;
  void *pvVar2;
  int iVar3;
  
  *(uint *)((int)this + 4) = param_1;
  iVar3 = (((param_1 & 8) != 0) + 1) * (param_1 & 3);
  *(undefined4 *)((int)this + 8) = param_2;
  *(undefined4 *)((int)this + 0x10) = 0;
  *(undefined4 *)((int)this + 0x18) = 0;
  *(undefined4 *)((int)this + 0x3c) = 0;
  *(int *)((int)this + 0x2c) = iVar3;
  iVar1 = ftol();
  iVar1 = iVar1 * iVar3;
  *(int *)((int)this + 0xc) = iVar1;
  pvVar2 = operator_new(iVar1 * 2);
  *(void **)((int)this + 0x20) = pvVar2;
  iVar1 = (int)(0x80000 / (longlong)*(int *)((int)this + 0xc));
  *(int *)((int)this + 0x28) = iVar1;
  pvVar2 = operator_new(iVar1 * 0x14);
  *(void **)((int)this + 0x38) = pvVar2;
  iVar1 = 0;
  if (0 < *(int *)((int)this + 0x28)) {
    iVar3 = 0;
    do {
      iVar1 = iVar1 + 1;
      *(undefined4 *)(*(int *)((int)this + 0x38) + iVar3) = 0;
      *(undefined4 *)(*(int *)((int)this + 0x38) + 4 + iVar3) = 0;
      iVar3 = iVar3 + 0x14;
    } while (iVar1 < *(int *)((int)this + 0x28));
  }
  return;
}


// ==== FUN_0040d330 @ 0040d330 ====

void __fastcall FUN_0040d330(undefined4 *param_1)

{
  *param_1 = &PTR_LAB_0041aa98;
  operator_delete((void *)param_1[0xe]);
  operator_delete((void *)param_1[8]);
  GlobalFree((HGLOBAL)param_1[7]);
  return;
}


// ==== FUN_0040d360 @ 0040d360 ====

void __fastcall FUN_0040d360(int param_1)

{
  int iVar1;
  
  iVar1 = ftol();
  *(int *)(param_1 + 0x14) = iVar1 * *(int *)(param_1 + 0x2c);
  return;
}


// ==== FUN_0040d390 @ 0040d390 ====

void __thiscall FUN_0040d390(void *this,uint param_1)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  
  iVar3 = 0;
  if (0 < *(int *)((int)this + 0x28)) {
    iVar2 = 0;
    do {
      piVar1 = (int *)(*(int *)((int)this + 0x38) + iVar2);
      if ((*piVar1 != 0) && ((uint)(piVar1[2] + piVar1[1]) < param_1)) {
        *piVar1 = 0;
      }
      iVar3 = iVar3 + 1;
      iVar2 = iVar2 + 0x14;
    } while (iVar3 < *(int *)((int)this + 0x28));
  }
  return;
}


// ==== FUN_0040d3e0 @ 0040d3e0 ====

uint __thiscall FUN_0040d3e0(void *this,int param_1)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  int *piVar5;
  int iVar6;
  
  iVar6 = -1;
  iVar3 = 0;
  if (0 < *(int *)((int)this + 0x28)) {
    piVar1 = *(int **)((int)this + 0x38);
    iVar4 = param_1;
    piVar5 = piVar1;
    do {
      if (((*piVar5 != 0) && (iVar2 = piVar5[1], iVar2 < param_1)) && (iVar6 < iVar2)) {
        iVar4 = iVar3;
        iVar6 = iVar2;
      }
      iVar3 = iVar3 + 1;
      piVar5 = piVar5 + 5;
    } while (iVar3 < *(int *)((int)this + 0x28));
    if (iVar6 != -1) {
      return piVar1[iVar4 * 5 + 3] << 8 | piVar1[iVar4 * 5 + 4];
    }
  }
  return 0;
}


// ==== FUN_0040d440 @ 0040d440 ====

int __thiscall FUN_0040d440(void *this,uint param_1)

{
  int iVar1;
  uint uVar2;
  int iVar3;
  uint uVar4;
  int *piVar5;
  
  iVar1 = -1;
  uVar4 = 0xffffffff;
  iVar3 = 0;
  if (0 < *(int *)((int)this + 0x28)) {
    piVar5 = *(int **)((int)this + 0x38);
    do {
      uVar2 = piVar5[2] + piVar5[1];
      if (((uVar2 < param_1) && (uVar2 < uVar4)) && (*piVar5 == 0)) {
        iVar1 = iVar3;
        uVar4 = uVar2;
      }
      iVar3 = iVar3 + 1;
      piVar5 = piVar5 + 5;
    } while (iVar3 < *(int *)((int)this + 0x28));
  }
  return iVar1;
}


// ==== FUN_0040d4f0 @ 0040d4f0 ====

void __thiscall FUN_0040d4f0(void *this,int param_1)

{
  uint uVar1;
  int iVar2;
  ushort local_c;
  
  iVar2 = param_1 * 0x14;
  *(int *)(iVar2 + 4 + *(int *)((int)this + 0x38)) =
       *(int *)((int)this + 0x18) * 0x80000 + *(int *)((int)this + 0x10);
  *(undefined4 *)(iVar2 + 8 + *(int *)((int)this + 0x38)) = *(undefined4 *)((int)this + 0x14);
  *(undefined4 *)(iVar2 + *(int *)((int)this + 0x38)) = 1;
  uVar1 = *(uint *)((int)this + 4);
  local_c = (-(ushort)((uVar1 & 2) != 0) & 0xff80) + 0x8080;
  if ((uVar1 & 0x10) != 0) {
    local_c = 0;
  }
  if ((uVar1 & 2) != 0) {
    FUN_0040d597(6,local_c);
    FUN_0040d5cf();
    return;
  }
  FUN_0040d5b5(6,(byte)local_c);
  FUN_0040d5cf();
  return;
}


// ==== FUN_0040d597 @ 0040d597 ====

void __fastcall FUN_0040d597(undefined4 param_1,ushort param_2)

{
  ushort uVar1;
  int iVar2;
  uint unaff_EBX;
  int unaff_EBP;
  ushort *unaff_ESI;
  int unaff_EDI;
  
  iVar2 = *(int *)(unaff_EBP + -4);
  do {
    uVar1 = *unaff_ESI;
    unaff_ESI = unaff_ESI + 1;
    unaff_EBX = (unaff_EBX & 0x7ffff) + 2;
    iVar2 = iVar2 + -1;
    *(ushort *)(unaff_EDI + -2 + unaff_EBX) = uVar1 ^ param_2;
  } while (iVar2 != 0);
  return;
}


// ==== FUN_0040d5b5 @ 0040d5b5 ====

void __fastcall FUN_0040d5b5(undefined4 param_1,byte param_2)

{
  undefined2 uVar1;
  int iVar2;
  uint unaff_EBX;
  int unaff_EBP;
  undefined2 *unaff_ESI;
  int unaff_EDI;
  
  iVar2 = *(int *)(unaff_EBP + -4);
  do {
    uVar1 = *unaff_ESI;
    unaff_ESI = unaff_ESI + 1;
    unaff_EBX = (unaff_EBX & 0x7ffff) + 1;
    iVar2 = iVar2 + -1;
    *(byte *)(unaff_EDI + -1 + unaff_EBX) = (byte)((ushort)uVar1 >> 8) ^ param_2;
  } while (iVar2 != 0);
  return;
}


// ==== FUN_0040d5cf @ 0040d5cf ====

void FUN_0040d5cf(void)

{
  int iVar1;
  int iVar2;
  undefined4 unaff_EBX;
  int unaff_EBP;
  
  *(undefined4 *)(unaff_EBP + 8) = unaff_EBX;
  iVar1 = *(int *)(unaff_EBP + -0x18);
  iVar2 = *(int *)(unaff_EBP + 8);
  if (iVar2 < *(int *)(iVar1 + 0x10)) {
    *(int *)(iVar1 + 0x18) = *(int *)(iVar1 + 0x18) + 1;
  }
  *(int *)(iVar1 + 0x10) = iVar2;
  return;
}


// ==== FUN_0040d640 @ 0040d640 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040d640(void *this,uint *param_1)

{
  uint uVar1;
  uint uVar2;
  uint uVar3;
  uint uVar4;
  uint uVar5;
  uint uVar6;
  int iVar7;
  uint *puVar8;
  longlong lVar9;
  longlong lVar10;
  undefined8 uVar11;
  int local_14;
  uint *local_10;
  uint local_c;
  int local_8;
  
  if (param_1[6] != 0xff) {
    local_14 = *(int *)((int)this + 0x14) / *(int *)((int)this + 0x2c);
    uVar3 = ftol();
    uVar1 = param_1[1];
    local_10 = *(uint **)((int)this + 0x20);
    uVar4 = ftol();
    uVar6 = (int)uVar4 >> 0x1f;
    lVar9 = __allshl(0x10,uVar6);
    lVar9 = __allshl(0x10,(uint)((ulonglong)lVar9 >> 0x20) | uVar6);
    lVar9 = __allshl(0x10,(uint)((ulonglong)lVar9 >> 0x20) | uVar6);
    uVar4 = (uint)lVar9 | uVar4;
    uVar6 = (uint)((ulonglong)lVar9 >> 0x20) | uVar6;
    if (0 < local_14) {
      do {
        uVar5 = *param_1;
        if (param_1[2] == 0xffffffff) {
          if ((int)uVar5 <= (int)param_1[7]) {
            param_1[2] = 1;
            *param_1 = param_1[7] * 2 - uVar5;
          }
        }
        else {
          uVar2 = param_1[8];
          if ((int)uVar2 <= (int)uVar5) {
            if (param_1[6] == 0) {
              param_1[6] = 0xff;
              return;
            }
            if (param_1[6] == 2) {
              param_1[2] = 0xff;
              *param_1 = uVar2 * 2 - uVar5;
            }
            else {
              *param_1 = (param_1[7] - uVar2) + uVar5;
            }
          }
        }
        iVar7 = (int)uVar3 >> 0x1f;
        if (param_1[2] == 0xffffffff) {
          uVar5 = *param_1 - param_1[7];
          lVar9 = __allmul(uVar5 + uVar3,((int)uVar5 >> 0x1f) + iVar7 + (uint)CARRY4(uVar5,uVar3),
                           0x100,0);
          lVar9 = lVar9 - (int)uVar3;
          lVar10 = __allshl(8,iVar7);
          local_c = -uVar3;
        }
        else {
          uVar5 = param_1[8] - *param_1;
          lVar9 = __allmul(uVar5 + uVar3,((int)uVar5 >> 0x1f) + iVar7 + (uint)CARRY4(uVar5,uVar3),
                           0x100,0);
          lVar9 = lVar9 - (int)uVar3;
          lVar10 = __allshl(8,iVar7);
          local_c = uVar3;
        }
        uVar11 = __alldiv((uint)lVar9,(uint)((ulonglong)lVar9 >> 0x20),(uint)lVar10,
                          (uint)((ulonglong)lVar10 >> 0x20));
        local_8 = (int)uVar11;
        if (local_8 == 0) {
          local_8 = 1;
        }
        if (local_14 < local_8) {
          local_8 = local_14;
        }
        local_14 = local_14 - local_8;
        uVar5 = *param_1;
        *param_1 = local_8 * local_c + uVar5;
        if (param_1[3] == 8) {
          do {
            uVar11 = pmulhw((*(uint *)(uVar1 + (uVar5 >> 8)) & _DAT_0041d430) << 8,
                            CONCAT44(uVar6,uVar4));
            uVar5 = uVar5 + local_c;
            puVar8 = (uint *)((int)local_10 + 2);
            uVar11 = paddsw((ulonglong)*local_10,uVar11);
            *local_10 = (uint)uVar11;
            local_8 = local_8 + -1;
            local_10 = puVar8;
          } while (local_8 != 0);
        }
        else {
          do {
            uVar11 = pmulhw(*(uint *)(uVar1 + (uVar5 >> 8) * 2) & _DAT_0041d428,
                            CONCAT44(uVar6,uVar4));
            uVar11 = paddsw((ulonglong)*local_10,uVar11);
            *local_10 = (uint)uVar11;
            uVar5 = uVar5 + local_c;
            local_10 = (uint *)((int)local_10 + 2);
            local_8 = local_8 + -1;
          } while (local_8 != 0);
        }
      } while (0 < local_14);
      return;
    }
  }
  return;
}


// ==== FUN_0040d8c0 @ 0040d8c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040d8c0(void *this,uint *param_1)

{
  uint uVar1;
  bool bVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  uint uVar7;
  uint uVar8;
  uint *puVar9;
  ulonglong uVar10;
  longlong lVar11;
  longlong lVar12;
  undefined8 uVar13;
  int local_20;
  uint local_1c;
  uint local_18;
  uint local_14;
  int local_10;
  uint *local_c;
  
  if (param_1[6] != 0xff) {
    local_20 = *(int *)((int)this + 0x14) / *(int *)((int)this + 0x2c);
    uVar3 = ftol();
    uVar1 = param_1[1];
    local_c = *(uint **)((int)this + 0x20);
    iVar4 = ftol();
    uVar5 = ftol();
    lVar11 = __allshl(0x10,iVar4 >> 0x1f);
    lVar11 = __allshl(0x10,(uint)((ulonglong)lVar11 >> 0x20) | (int)uVar5 >> 0x1f);
    lVar11 = __allshl(0x10,(uint)((ulonglong)lVar11 >> 0x20) | iVar4 >> 0x1f);
    uVar6 = (uint)lVar11 | uVar5;
    uVar5 = (uint)((ulonglong)lVar11 >> 0x20) | (int)uVar5 >> 0x1f;
    if (0 < local_20) {
      do {
        uVar7 = *param_1;
        if (param_1[2] == 0xffffffff) {
          if ((int)uVar7 <= (int)param_1[7]) {
            param_1[2] = 1;
            *param_1 = param_1[7] * 2 - uVar7;
          }
        }
        else {
          uVar8 = param_1[8];
          if ((int)uVar8 <= (int)uVar7) {
            if (param_1[6] == 0) {
              param_1[6] = 0xff;
              return;
            }
            if (param_1[6] == 2) {
              param_1[2] = 0xff;
              *param_1 = uVar8 * 2 - uVar7;
            }
            else {
              *param_1 = (param_1[7] - uVar8) + uVar7;
            }
          }
        }
        iVar4 = (int)uVar3 >> 0x1f;
        if (param_1[2] == 0xffffffff) {
          uVar7 = *param_1 - param_1[7];
          lVar11 = __allmul(uVar7 + uVar3,((int)uVar7 >> 0x1f) + iVar4 + (uint)CARRY4(uVar7,uVar3),
                            0x100,0);
          lVar11 = lVar11 - (int)uVar3;
          lVar12 = __allshl(8,iVar4);
          local_14 = -uVar3;
        }
        else {
          uVar7 = param_1[8] - *param_1;
          lVar11 = __allmul(uVar7 + uVar3,((int)uVar7 >> 0x1f) + iVar4 + (uint)CARRY4(uVar7,uVar3),
                            0x100,0);
          lVar11 = lVar11 - (int)uVar3;
          lVar12 = __allshl(8,iVar4);
          local_14 = uVar3;
        }
        uVar13 = __alldiv((uint)lVar11,(uint)((ulonglong)lVar11 >> 0x20),(uint)lVar12,
                          (uint)((ulonglong)lVar12 >> 0x20));
        local_10 = (int)uVar13;
        if (local_10 == 0) {
          local_10 = 1;
        }
        if (local_20 < local_10) {
          local_10 = local_20;
        }
        local_20 = local_20 - local_10;
        uVar7 = *param_1;
        uVar8 = uVar7 + local_10 * local_14;
        *param_1 = uVar8;
        bVar2 = false;
        if (local_10 != 0) {
          if (param_1[2] == 0xffffffff) {
            if ((int)uVar8 <= (int)param_1[7]) {
LAB_0040dacc:
              local_10 = local_10 + -1;
              bVar2 = true;
            }
          }
          else if ((int)param_1[8] <= (int)uVar8) goto LAB_0040dacc;
          if (local_10 != 0) {
            if (param_1[3] == 8) {
              do {
                uVar10 = *(uint *)(uVar1 + (uVar7 >> 8)) & _DAT_0041d440;
                uVar13 = pmulhw(uVar10 << 8 | uVar10 << 0x18,CONCAT44(uVar5,uVar6));
                uVar7 = uVar7 + local_14;
                puVar9 = local_c + 1;
                uVar13 = paddsw((ulonglong)*local_c,uVar13);
                *local_c = (uint)uVar13;
                local_10 = local_10 + -1;
                local_c = puVar9;
              } while (local_10 != 0);
            }
            else {
              uRam0040dba1 = (undefined1)(param_1[2] << 1);
              do {
                iVar4 = (uVar7 & 0xff) * 0x40;
                uVar13 = pmaddwd(*(uint *)(uVar1 + (uVar7 >> 8) * 2) & _DAT_0041d438 |
                                 (*(uint *)(uVar1 + 2 + (uVar7 >> 8) * 2) & _DAT_0041d438) << 0x20,
                                 CONCAT44(iVar4,-(iVar4 + -0x4000)));
                uVar10 = CONCAT44((int)((longlong)uVar13 >> 0x2e),(int)uVar13 >> 0xe) &
                         0xffff0000ffff;
                uVar10 = pmulhw(uVar10 | uVar10 << 0x10,CONCAT44(uVar5,uVar6));
                uVar13 = paddsw(uVar10 & 0xffffffff,uVar10 >> 0x20);
                uVar13 = paddsw((ulonglong)*local_c,uVar13);
                *local_c = (uint)uVar13;
                uVar7 = uVar7 + local_14;
                local_c = local_c + 1;
                local_10 = local_10 + -1;
              } while (local_10 != 0);
            }
          }
          if (bVar2) {
            if (param_1[2] == 0xffffffff) {
              local_18 = *param_1 - local_14;
              local_1c = param_1[7] * 2 - *param_1;
            }
            else {
              uVar7 = param_1[6];
              if (uVar7 == 0) {
                local_1c = *param_1 - local_14;
                local_18 = local_1c;
              }
              else if (uVar7 == 2) {
                local_18 = *param_1 - local_14;
                local_1c = param_1[8] * 2 - *param_1;
              }
              else if (uVar7 == 1) {
                local_18 = *param_1 - local_14;
                local_1c = (param_1[7] - param_1[8]) + *param_1;
              }
            }
            if (param_1[3] == 8) {
              uVar10 = (int)*(char *)(((int)local_1c >> 8) + uVar1) * (0x100 - (local_18 & 0xff)) +
                       (int)*(char *)(((int)local_18 >> 8) + uVar1) * (local_18 & 0xff) &
                       _DAT_0041d438;
              uVar13 = pmulhw(uVar10 << 8 | uVar10 << 0x18,CONCAT44(uVar5,uVar6));
              uVar13 = paddsw((ulonglong)*local_c,uVar13);
              *local_c = (uint)uVar13;
              local_c = local_c + 1;
            }
            else {
              uVar10 = (uint)(((int)*(short *)(uVar1 + ((int)local_18 >> 8) * 2) << 8) >> 8) &
                       _DAT_0041d438;
              uVar13 = pmulhw(uVar10 | uVar10 << 0x10,CONCAT44(uVar5,uVar6));
              uVar13 = paddsw((ulonglong)*local_c,uVar13);
              *local_c = (uint)uVar13;
              local_c = local_c + 1;
            }
          }
        }
        if (local_20 < 1) {
          return;
        }
      } while( true );
    }
  }
  return;
}


// ==== FUN_0040dd50 @ 0040dd50 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040dd50(void *this,uint *param_1)

{
  uint uVar1;
  uint uVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  int iVar6;
  uint *puVar7;
  longlong lVar8;
  longlong lVar9;
  undefined8 uVar10;
  int local_14;
  uint *local_10;
  uint local_c;
  int local_8;
  
  if (param_1[6] != 0xff) {
    local_14 = *(int *)((int)this + 0x14) / *(int *)((int)this + 0x2c);
    uVar3 = ftol();
    uVar1 = param_1[1];
    local_10 = *(uint **)((int)this + 0x20);
    iVar4 = ftol();
    if (0 < local_14) {
      do {
        uVar5 = *param_1;
        if (param_1[2] == 0xffffffff) {
          if ((int)uVar5 <= (int)param_1[7]) {
            param_1[2] = 1;
            *param_1 = param_1[7] * 2 - uVar5;
          }
        }
        else {
          uVar2 = param_1[8];
          if ((int)uVar2 <= (int)uVar5) {
            if (param_1[6] == 0) {
              param_1[6] = 0xff;
              return;
            }
            if (param_1[6] == 2) {
              param_1[2] = 0xff;
              *param_1 = uVar2 * 2 - uVar5;
            }
            else {
              *param_1 = (param_1[7] - uVar2) + uVar5;
            }
          }
        }
        iVar6 = (int)uVar3 >> 0x1f;
        if (param_1[2] == 0xffffffff) {
          uVar5 = *param_1 - param_1[7];
          lVar8 = __allmul(uVar5 + uVar3,((int)uVar5 >> 0x1f) + iVar6 + (uint)CARRY4(uVar5,uVar3),
                           0x100,0);
          lVar8 = lVar8 - (int)uVar3;
          lVar9 = __allshl(8,iVar6);
          local_c = -uVar3;
        }
        else {
          uVar5 = param_1[8] - *param_1;
          lVar8 = __allmul(uVar5 + uVar3,((int)uVar5 >> 0x1f) + iVar6 + (uint)CARRY4(uVar5,uVar3),
                           0x100,0);
          lVar8 = lVar8 - (int)uVar3;
          lVar9 = __allshl(8,iVar6);
          local_c = uVar3;
        }
        uVar10 = __alldiv((uint)lVar8,(uint)((ulonglong)lVar8 >> 0x20),(uint)lVar9,
                          (uint)((ulonglong)lVar9 >> 0x20));
        local_8 = (int)uVar10;
        if (local_8 == 0) {
          local_8 = 1;
        }
        if (local_14 < local_8) {
          local_8 = local_14;
        }
        local_14 = local_14 - local_8;
        uVar5 = *param_1;
        *param_1 = local_8 * local_c + uVar5;
        if (param_1[3] == 8) {
          do {
            uVar10 = pmulhw((*(uint *)(uVar1 + (uVar5 >> 8)) & _DAT_0041d450) << 8,(longlong)iVar4);
            uVar5 = uVar5 + local_c;
            puVar7 = (uint *)((int)local_10 + 2);
            uVar10 = paddsw((ulonglong)*local_10,uVar10);
            *local_10 = (uint)uVar10;
            local_8 = local_8 + -1;
            local_10 = puVar7;
          } while (local_8 != 0);
        }
        else {
          do {
            uVar10 = pmulhw(*(uint *)(uVar1 + (uVar5 >> 8) * 2) & _DAT_0041d448,(longlong)iVar4);
            uVar10 = paddsw((ulonglong)*local_10,uVar10);
            *local_10 = (uint)uVar10;
            uVar5 = uVar5 + local_c;
            local_10 = (uint *)((int)local_10 + 2);
            local_8 = local_8 + -1;
          } while (local_8 != 0);
        }
      } while (0 < local_14);
      return;
    }
  }
  return;
}


// ==== FUN_0040dfa0 @ 0040dfa0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040dfa0(void *this,uint *param_1)

{
  uint uVar1;
  uint uVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  uint *puVar7;
  ulonglong uVar8;
  longlong lVar9;
  longlong lVar10;
  undefined8 uVar11;
  int local_14;
  uint *local_10;
  uint local_c;
  int local_8;
  
  if (param_1[6] != 0xff) {
    local_14 = *(int *)((int)this + 0x14) / *(int *)((int)this + 0x2c);
    uVar3 = ftol();
    uVar1 = param_1[1];
    local_10 = *(uint **)((int)this + 0x20);
    iVar4 = ftol();
    uVar5 = ftol();
    uVar5 = uVar5 | iVar4 << 0x10;
    if (0 < local_14) {
      do {
        uVar6 = *param_1;
        if (param_1[2] == 0xffffffff) {
          if ((int)uVar6 <= (int)param_1[7]) {
            param_1[2] = 1;
            *param_1 = param_1[7] * 2 - uVar6;
          }
        }
        else {
          uVar2 = param_1[8];
          if ((int)uVar2 <= (int)uVar6) {
            if (param_1[6] == 0) {
              param_1[6] = 0xff;
              return;
            }
            if (param_1[6] == 2) {
              param_1[2] = 0xff;
              *param_1 = uVar2 * 2 - uVar6;
            }
            else {
              *param_1 = (param_1[7] - uVar2) + uVar6;
            }
          }
        }
        iVar4 = (int)uVar3 >> 0x1f;
        if (param_1[2] == 0xffffffff) {
          uVar6 = *param_1 - param_1[7];
          lVar9 = __allmul(uVar6 + uVar3,((int)uVar6 >> 0x1f) + iVar4 + (uint)CARRY4(uVar6,uVar3),
                           0x100,0);
          lVar9 = lVar9 - (int)uVar3;
          lVar10 = __allshl(8,iVar4);
          local_c = -uVar3;
        }
        else {
          uVar6 = param_1[8] - *param_1;
          lVar9 = __allmul(uVar6 + uVar3,((int)uVar6 >> 0x1f) + iVar4 + (uint)CARRY4(uVar6,uVar3),
                           0x100,0);
          lVar9 = lVar9 - (int)uVar3;
          lVar10 = __allshl(8,iVar4);
          local_c = uVar3;
        }
        uVar11 = __alldiv((uint)lVar9,(uint)((ulonglong)lVar9 >> 0x20),(uint)lVar10,
                          (uint)((ulonglong)lVar10 >> 0x20));
        local_8 = (int)uVar11;
        if (local_8 == 0) {
          local_8 = 1;
        }
        if (local_14 < local_8) {
          local_8 = local_14;
        }
        local_14 = local_14 - local_8;
        uVar6 = *param_1;
        *param_1 = local_8 * local_c + uVar6;
        if (local_8 != 0) {
          if (param_1[3] == 8) {
            do {
              uVar8 = *(uint *)(uVar1 + (uVar6 >> 8)) & _DAT_0041d460;
              uVar11 = pmulhw(uVar8 << 8 | uVar8 << 0x18,(longlong)(int)uVar5);
              uVar6 = uVar6 + local_c;
              puVar7 = local_10 + 1;
              uVar11 = paddsw((ulonglong)*local_10,uVar11);
              *local_10 = (uint)uVar11;
              local_8 = local_8 + -1;
              local_10 = puVar7;
            } while (local_8 != 0);
          }
          else {
            do {
              uVar8 = *(uint *)(uVar1 + (uVar6 >> 8) * 2) & _DAT_0041d458;
              uVar11 = pmulhw(uVar8 | uVar8 << 0x10,(longlong)(int)uVar5);
              uVar11 = paddsw((ulonglong)*local_10,uVar11);
              *local_10 = (uint)uVar11;
              uVar6 = uVar6 + local_c;
              local_10 = local_10 + 1;
              local_8 = local_8 + -1;
            } while (local_8 != 0);
          }
        }
      } while (0 < local_14);
      return;
    }
  }
  return;
}


// ==== FUN_0040e230 @ 0040e230 ====

/* WARNING: Restarted to delay deadcode elimination for space: stack */

void __thiscall FUN_0040e230(void *this,uint *param_1)

{
  uint uVar1;
  short *psVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  short *psVar7;
  int local_c;
  int local_8;
  
  if (param_1[6] != 0xff) {
    local_c = *(int *)((int)this + 0x14) / *(int *)((int)this + 0x2c);
    iVar3 = ftol();
    uVar1 = param_1[1];
    psVar2 = *(short **)((int)this + 0x20);
    iVar4 = ftol();
    if ((DAT_0041f3f8 & 1) == 0) {
      DAT_0041f3f8 = DAT_0041f3f8 | 1;
      DAT_0041f3f4 = iVar4;
    }
    if (0 < local_c) {
      do {
        if ((DAT_0041f3f8 & 2) == 0) {
          DAT_0041f3f8 = DAT_0041f3f8 | 2;
          DAT_0041f3fc = iVar3;
        }
        uVar5 = *param_1;
        if (param_1[2] == 0xffffffff) {
          if ((int)uVar5 < (int)param_1[7]) {
            param_1[2] = 1;
            *param_1 = param_1[7] * 2 - uVar5;
          }
        }
        else {
          uVar6 = param_1[8];
          if ((int)uVar6 < (int)uVar5) {
            if (param_1[6] == 0) {
              param_1[6] = 0xff;
              return;
            }
            if (param_1[6] == 2) {
              param_1[2] = 0xff;
              *param_1 = uVar6 * 2 - uVar5;
            }
            else {
              *param_1 = (param_1[7] - uVar6) + uVar5;
            }
          }
        }
        if (param_1[2] == 0xffffffff) {
          iVar4 = *param_1 - param_1[7];
          DAT_0041f3fc = -iVar3;
        }
        else {
          iVar4 = param_1[8] - *param_1;
          DAT_0041f3fc = iVar3;
        }
        floor((double)iVar4 / (double)iVar3);
        local_8 = ftol();
        if (local_8 == 0) {
          local_8 = 1;
        }
        if (local_c < local_8) {
          local_8 = local_c;
        }
        local_c = local_c - local_8;
        uVar5 = *param_1;
        *param_1 = DAT_0041f3fc * local_8 + uVar5;
        psVar7 = psVar2;
        if (param_1[3] == 8) {
          do {
            uVar6 = uVar5 >> 8;
            uVar5 = uVar5 + DAT_0041f3fc;
            *psVar7 = *psVar7 + (short)((uint)(*(char *)(uVar6 + uVar1) * DAT_0041f3f4) >> 8);
            local_8 = local_8 + -1;
            psVar7 = psVar7 + 1;
          } while (local_8 != 0);
        }
        else {
          do {
            uVar6 = uVar5 >> 8;
            uVar5 = uVar5 + DAT_0041f3fc;
            *psVar7 = *psVar7 + (short)((uint)(*(short *)(uVar1 + uVar6 * 2) * DAT_0041f3f4) >> 0x10
                                       );
            local_8 = local_8 + -1;
            psVar7 = psVar7 + 1;
          } while (local_8 != 0);
        }
      } while (0 < local_c);
      return;
    }
  }
  return;
}


// ==== FUN_0040e450 @ 0040e450 ====

/* WARNING: Restarted to delay deadcode elimination for space: stack */

void __thiscall FUN_0040e450(void *this,uint *param_1)

{
  uint uVar1;
  short *psVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  short *psVar7;
  int local_c;
  int local_8;
  
  if (param_1[6] != 0xff) {
    local_c = *(int *)((int)this + 0x14) / *(int *)((int)this + 0x2c);
    iVar3 = ftol();
    uVar1 = param_1[1];
    psVar2 = *(short **)((int)this + 0x20);
    DAT_0041f400 = ftol();
    DAT_0041f3ec = ftol();
    if (0 < local_c) {
      do {
        if ((DAT_0041f3f0 & 1) == 0) {
          DAT_0041f3f0 = DAT_0041f3f0 | 1;
          DAT_0041f3e8 = iVar3;
        }
        uVar5 = *param_1;
        if (param_1[2] == 0xffffffff) {
          if ((int)uVar5 < (int)param_1[7]) {
            param_1[2] = 1;
            *param_1 = param_1[7] * 2 - uVar5;
          }
        }
        else {
          uVar6 = param_1[8];
          if ((int)uVar6 < (int)uVar5) {
            if (param_1[6] == 0) {
              param_1[6] = 0xff;
              return;
            }
            if (param_1[6] == 2) {
              param_1[2] = 0xff;
              uVar5 = uVar6 * 2 - uVar5;
            }
            else {
              uVar5 = (param_1[7] - uVar6) + uVar5;
            }
            *param_1 = uVar5;
          }
        }
        if (param_1[2] == 0xffffffff) {
          iVar4 = *param_1 - param_1[7];
          DAT_0041f3e8 = -iVar3;
        }
        else {
          iVar4 = param_1[8] - *param_1;
          DAT_0041f3e8 = iVar3;
        }
        floor((double)iVar4 / (double)iVar3);
        local_8 = ftol();
        if (local_8 == 0) {
          local_8 = 1;
        }
        if (local_c < local_8) {
          local_8 = local_c;
        }
        local_c = local_c - local_8;
        uVar5 = *param_1;
        *param_1 = DAT_0041f3e8 * local_8 + uVar5;
        psVar7 = psVar2;
        if (param_1[3] == 8) {
          do {
            uVar6 = uVar5 >> 8;
            uVar5 = uVar5 + DAT_0041f3e8;
            *psVar7 = *psVar7 + (short)((uint)(*(char *)(uVar6 + uVar1) * DAT_0041f3ec) >> 8);
            psVar7[1] = psVar7[1] + (short)((uint)(*(char *)(uVar6 + uVar1) * DAT_0041f400) >> 8);
            local_8 = local_8 + -1;
            psVar7 = psVar7 + 2;
          } while (local_8 != 0);
        }
        else {
          do {
            uVar6 = uVar5 >> 8;
            uVar5 = uVar5 + DAT_0041f3e8;
            *psVar7 = *psVar7 + (short)((uint)(*(short *)(uVar1 + uVar6 * 2) * DAT_0041f3ec) >> 0x10
                                       );
            psVar7[1] = psVar7[1] +
                        (short)((uint)(*(short *)(uVar1 + uVar6 * 2) * DAT_0041f400) >> 0x10);
            local_8 = local_8 + -1;
            psVar7 = psVar7 + 2;
          } while (local_8 != 0);
        }
      } while (0 < local_c);
      return;
    }
  }
  return;
}


// ==== FUN_0040e6b0 @ 0040e6b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_0040e6b0(void)

{
  float10 fVar1;
  
  fVar1 = (float10)_CIfmod();
  if (fVar1 < (float10)_DAT_0041a408) {
    fVar1 = fVar1 + (float10)_DAT_0041aac8;
  }
  fVar1 = fVar1 * (float10)_DAT_0041aac0;
  if ((float10)_DAT_0041a310 <= fVar1) {
    fVar1 = fVar1 - (float10)_DAT_0041a990;
  }
  return fVar1;
}


// ==== FUN_0040e6f0 @ 0040e6f0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __cdecl FUN_0040e6f0(undefined4 param_1,undefined4 param_2,int param_3,undefined4 param_4)

{
  double dVar1;
  float10 fVar2;
  
  if ((double)CONCAT44(param_4,param_3) < _DAT_0041aad8) {
    param_3 = 0x7ae147ae;
    param_4 = 0xbfefae14;
  }
  fVar2 = (float10)_CIfmod();
  if (fVar2 < (float10)_DAT_0041a408) {
    fVar2 = fVar2 + (float10)_DAT_0041aac8;
  }
  dVar1 = (double)CONCAT44(param_4,param_3);
  param_3 = 1;
  if (fVar2 <= ((float10)dVar1 + (float10)_DAT_0041a310) * (float10)_DAT_0041a308 *
               (float10)_DAT_0041aad0) {
    param_3 = -1;
  }
  return (float10)param_3;
}


// ==== FUN_0040e770 @ 0040e770 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __thiscall FUN_0040e770(void *this,float *param_1)

{
  double *pdVar1;
  float *pfVar2;
  float fVar3;
  int iVar4;
  int iVar5;
  void *pvVar6;
  double dVar7;
  float fVar8;
  float fVar9;
  int iVar10;
  void *pvVar11;
  int iVar12;
  undefined4 *puVar13;
  ushort extraout_var;
  ushort extraout_var_00;
  ushort uVar16;
  ushort extraout_var_01;
  undefined4 uVar14;
  void *pvVar15;
  undefined4 extraout_EAX;
  double *pdVar17;
  undefined4 *puVar18;
  float10 fVar19;
  float10 fVar20;
  float *pfStack_64;
  int iStack_60;
  int iStack_5c;
  undefined4 uStack_58;
  undefined4 uStack_54;
  double dStack_50;
  double dStack_48;
  double dStack_40;
  double dStack_38;
  double dStack_30;
  double dStack_28;
  undefined1 uStack_20;
  undefined4 uStack_1c;
  int iStack_18;
  double dStack_10;
  
  *(float **)((int)this + 0xc4) = param_1;
  iVar10 = *(int *)((int)this + 0xb8) * *(int *)((int)this + 0xbc);
  *(int *)((int)this + 0x1c) = iVar10;
  pvVar11 = operator_new(iVar10 * 4);
  *(void **)((int)this + 0x14) = pvVar11;
  pvVar11 = operator_new(*(int *)((int)this + 0x1c) << 2);
  *(void **)((int)this + 0x18) = pvVar11;
  pvVar11 = operator_new(0x100);
  *(void **)((int)this + 0x20) = pvVar11;
  pvVar11 = operator_new(0x100);
  *(void **)((int)this + 0x24) = pvVar11;
  iVar10 = 0;
  if (0 < *(int *)((int)this + 0x1c)) {
    do {
      iVar10 = iVar10 + 1;
      *(undefined4 *)(*(int *)((int)this + 0x14) + -4 + iVar10 * 4) = 0;
      *(undefined4 *)(*(int *)((int)this + 0x18) + -4 + iVar10 * 4) = 0;
    } while (iVar10 < *(int *)((int)this + 0x1c));
  }
  *(undefined4 *)((int)this + 0x1e8) = 0;
  *(undefined4 *)((int)this + 0x1ec) = 0;
  *(undefined4 *)((int)this + 0x1e0) = 0;
  *(undefined4 *)((int)this + 0x1e4) = 0;
  *(undefined4 *)((int)this + 0x1d8) = 0;
  *(undefined4 *)((int)this + 0x1dc) = 0;
  *(undefined4 *)((int)this + 0x1d0) = 0;
  *(undefined4 *)((int)this + 0x1d4) = 0;
  *(undefined4 *)((int)this + 0x1c8) = 0;
  *(undefined4 *)((int)this + 0x1cc) = 0;
  *(undefined4 *)((int)this + 0x1c0) = 0;
  *(undefined4 *)((int)this + 0x1c4) = 0;
  *(undefined4 *)((int)this + 0x2d0) = 0;
  *(undefined4 *)((int)this + 0x2d4) = 0;
  *(undefined4 *)((int)this + 0x2c8) = 0;
  *(undefined4 *)((int)this + 0x2cc) = 0;
  *(undefined4 *)((int)this + 0x2c0) = 0;
  *(undefined4 *)((int)this + 0x2c4) = 0;
  *(undefined4 *)((int)this + 0x2b8) = 0;
  *(undefined4 *)((int)this + 700) = 0;
  fVar19 = (float10)_CIpow();
  pfStack_64 = param_1 + 0x32;
  iVar12 = 0;
  *(double *)((int)this + 0x2e8) = (double)(fVar19 * (float10)_DAT_0041ab28);
  fVar19 = (float10)log2((float10)_DAT_0041ab20);
  fVar20 = (float10)1.4426950408889634 *
           (float10)0.6931471805599453 * fVar19 * (float10)param_1[0x58];
  fVar19 = ROUND(fVar20);
  fVar20 = (float10)f2xm1(fVar20 - fVar19);
  fVar20 = (float10)fscale((float10)1 + fVar20,fVar19);
  iVar10 = *(int *)((int)this + 0xb8);
  fVar19 = (float10)_DAT_0041ab18;
  do {
    iVar12 = iVar12 + 8;
    *(double *)(*(int *)((int)this + 0x24) + -8 + iVar12) =
         (double)((float10)*pfStack_64 * (float10)iVar10 * fVar19 * fVar20 + (float10)_DAT_0041a310)
    ;
    iVar4 = *(int *)((int)this + 0x24);
    iVar5 = *(int *)((int)this + 0x20);
    *(undefined4 *)(iVar5 + -8 + iVar12) = *(undefined4 *)(iVar4 + -8 + iVar12);
    pfStack_64 = pfStack_64 + 1;
    *(undefined4 *)(iVar5 + -4 + iVar12) = *(undefined4 *)(iVar4 + -4 + iVar12);
  } while (iVar12 < 0x100);
  *(bool *)((int)this + 0xcc) = param_1[0x24] < _DAT_0041a494;
  *(bool *)((int)this + 0xcd) = param_1[0x55] < _DAT_0041a494;
  FUN_0040f980();
  *(undefined4 *)((int)this + 200) = 0;
  if (0 < *(int *)((int)this + 0xb8)) {
    do {
      FUN_0040f990(this,param_1);
      fVar3 = (param_1[0x15] + _DAT_0041a418) * _DAT_0041aa68;
      *(double *)((int)this + 0x2a8) = (double)fVar3;
      if (param_1[0x16] != _DAT_0041a494) {
        fVar19 = (float10)_CIpow();
        *(double *)((int)this + 0x2a8) = (double)(fVar19 * (float10)fVar3);
      }
      fVar19 = (float10)_CIpow();
      *(double *)((int)this + 0x2e0) = (double)(fVar19 * (float10)_DAT_0041ab28);
      iVar10 = *(int *)((int)this + 200) * *(int *)((int)this + 0xbc);
      *(undefined4 *)((int)this + 0x2f0) = *(undefined4 *)((int)this + 0x2e8);
      *(undefined4 *)((int)this + 0x2f4) = *(undefined4 *)((int)this + 0x2ec);
      *(undefined4 *)((int)this + 0x1f0) = *(undefined4 *)((int)this + 0x118);
      *(undefined4 *)((int)this + 500) = *(undefined4 *)((int)this + 0x11c);
      *(undefined4 *)((int)this + 0x220) = *(undefined4 *)((int)this + 0x120);
      *(undefined4 *)((int)this + 0x224) = *(undefined4 *)((int)this + 0x124);
      *(undefined4 *)((int)this + 0x250) = *(undefined4 *)((int)this + 0x128);
      *(undefined4 *)((int)this + 0x254) = *(undefined4 *)((int)this + 300);
      *(undefined4 *)((int)this + 0x1f8) = *(undefined4 *)((int)this + 0x130);
      *(undefined4 *)((int)this + 0x1fc) = *(undefined4 *)((int)this + 0x134);
      *(undefined4 *)((int)this + 0x228) = *(undefined4 *)((int)this + 0x138);
      *(undefined4 *)((int)this + 0x22c) = *(undefined4 *)((int)this + 0x13c);
      *(undefined4 *)((int)this + 600) = *(undefined4 *)((int)this + 0x140);
      *(undefined4 *)((int)this + 0x25c) = *(undefined4 *)((int)this + 0x144);
      *(undefined4 *)((int)this + 0x200) = *(undefined4 *)((int)this + 0x148);
      *(undefined4 *)((int)this + 0x204) = *(undefined4 *)((int)this + 0x14c);
      *(undefined4 *)((int)this + 0x230) = *(undefined4 *)((int)this + 0x150);
      *(undefined4 *)((int)this + 0x234) = *(undefined4 *)((int)this + 0x154);
      *(undefined4 *)((int)this + 0x260) = *(undefined4 *)((int)this + 0x158);
      *(undefined4 *)((int)this + 0x264) = *(undefined4 *)((int)this + 0x15c);
      *(undefined4 *)((int)this + 0x208) = *(undefined4 *)((int)this + 0x160);
      *(undefined4 *)((int)this + 0x20c) = *(undefined4 *)((int)this + 0x164);
      *(undefined4 *)((int)this + 0x238) = *(undefined4 *)((int)this + 0x168);
      *(undefined4 *)((int)this + 0x23c) = *(undefined4 *)((int)this + 0x16c);
      *(undefined4 *)((int)this + 0x268) = *(undefined4 *)((int)this + 0x170);
      *(undefined4 *)((int)this + 0x26c) = *(undefined4 *)((int)this + 0x174);
      *(undefined4 *)((int)this + 0x210) = *(undefined4 *)((int)this + 0x178);
      *(undefined4 *)((int)this + 0x214) = *(undefined4 *)((int)this + 0x17c);
      *(undefined4 *)((int)this + 0x240) = *(undefined4 *)((int)this + 0x180);
      *(undefined4 *)((int)this + 0x244) = *(undefined4 *)((int)this + 0x184);
      *(undefined4 *)((int)this + 0x270) = *(undefined4 *)((int)this + 0x188);
      *(undefined4 *)((int)this + 0x274) = *(undefined4 *)((int)this + 0x18c);
      *(undefined4 *)((int)this + 0x218) = *(undefined4 *)((int)this + 400);
      *(undefined4 *)((int)this + 0x21c) = *(undefined4 *)((int)this + 0x194);
      *(undefined4 *)((int)this + 0x248) = *(undefined4 *)((int)this + 0x198);
      *(undefined4 *)((int)this + 0x24c) = *(undefined4 *)((int)this + 0x19c);
      *(undefined4 *)((int)this + 0x278) = *(undefined4 *)((int)this + 0x1a0);
      *(undefined4 *)((int)this + 0x27c) = *(undefined4 *)((int)this + 0x1a4);
      *(undefined4 *)((int)this + 0x280) = *(undefined4 *)((int)this + 0x290);
      *(undefined4 *)((int)this + 0x284) = *(undefined4 *)((int)this + 0x294);
      iStack_60 = 0;
      if (0 < *(int *)((int)this + 0xbc)) {
        pfStack_64 = (float *)(iVar10 * 4);
        do {
          iVar12 = 0;
          do {
            pdVar17 = (double *)(*(int *)((int)this + 0x20) + iVar12);
            pdVar1 = (double *)(*(int *)((int)this + 0x24) + iVar12);
            iVar12 = iVar12 + 8;
            *pdVar17 = *pdVar1 * *pdVar17;
          } while (iVar12 < 0x100);
          *(double *)((int)this + 0x118) =
               **(double **)((int)this + 0x20) * *(double *)((int)this + 0x1f0);
          *(double *)((int)this + 0x120) =
               *(double *)(*(int *)((int)this + 0x20) + 8) * *(double *)((int)this + 0x220);
          *(double *)((int)this + 0x128) =
               *(double *)(*(int *)((int)this + 0x20) + 0x10) * *(double *)((int)this + 0x250);
          *(double *)((int)this + 0x130) =
               *(double *)(*(int *)((int)this + 0x20) + 0x18) * *(double *)((int)this + 0x1f8);
          *(double *)((int)this + 0x138) =
               *(double *)(*(int *)((int)this + 0x20) + 0x20) * *(double *)((int)this + 0x228);
          *(double *)((int)this + 0x140) =
               *(double *)(*(int *)((int)this + 0x20) + 0x28) * *(double *)((int)this + 600);
          *(double *)((int)this + 0x148) =
               *(double *)(*(int *)((int)this + 0x20) + 0x30) * *(double *)((int)this + 0x200);
          *(double *)((int)this + 0x150) =
               *(double *)(*(int *)((int)this + 0x20) + 0x38) * *(double *)((int)this + 0x230);
          *(double *)((int)this + 0x158) =
               *(double *)(*(int *)((int)this + 0x20) + 0x40) * *(double *)((int)this + 0x260);
          *(double *)((int)this + 0x160) =
               *(double *)(*(int *)((int)this + 0x20) + 0x48) * *(double *)((int)this + 0x208);
          *(double *)((int)this + 0x168) =
               *(double *)(*(int *)((int)this + 0x20) + 0x50) * *(double *)((int)this + 0x238);
          *(double *)((int)this + 0x170) =
               *(double *)(*(int *)((int)this + 0x20) + 0x58) * *(double *)((int)this + 0x268);
          iVar12 = *(int *)((int)this + 0x20);
          *(double *)((int)this + 0x178) =
               *(double *)(iVar12 + 0x60) * *(double *)((int)this + 0x210);
          *(double *)((int)this + 0x180) =
               *(double *)(iVar12 + 0x68) * *(double *)((int)this + 0x240);
          *(double *)((int)this + 0x188) =
               *(double *)(iVar12 + 0x70) * *(double *)((int)this + 0x270);
          *(double *)((int)this + 400) = *(double *)(iVar12 + 0x78) * *(double *)((int)this + 0x218)
          ;
          *(double *)((int)this + 0x198) =
               *(double *)(iVar12 + 0x80) * *(double *)((int)this + 0x248);
          *(double *)((int)this + 0x1a0) =
               *(double *)(iVar12 + 0x88) * *(double *)((int)this + 0x278);
          *(double *)((int)this + 0x290) =
               *(double *)(iVar12 + 0xd8) * *(double *)((int)this + 0x280);
          *(double *)((int)this + 0x1a8) =
               *(double *)(iVar12 + 0x90) * *(double *)((int)this + 0x1a8);
          *(double *)((int)this + 0x1b0) =
               *(double *)(iVar12 + 0x98) * *(double *)((int)this + 0x1b0);
          *(double *)((int)this + 0x1b8) =
               *(double *)(iVar12 + 0xa0) * *(double *)((int)this + 0x1b8);
          if (*(char *)(*(int *)((int)this + 200) + 0x68 + (int)this) == '\0') {
            *(undefined4 *)((int)this + 0x2f0) = *(undefined4 *)((int)this + 0x2e0);
            *(undefined4 *)((int)this + 0x2f4) = *(undefined4 *)((int)this + 0x2e4);
          }
          else {
            FUN_0040f800((int)this);
          }
          *(double *)((int)this + 0x1a0) =
               *(double *)((int)this + 0x2f0) * *(double *)((int)this + 0x198) * _DAT_0041ab10;
          FUN_0040f7e0((double *)((int)this + 0x1e8));
          fVar19 = (float10)fsin((float10)*(double *)((int)this + 0x1a0) +
                                 (float10)*(double *)((int)this + 0x110) +
                                 (float10)*(double *)((int)this + 0x1e8));
          *(double *)((int)this + 0xf8) =
               (double)(fVar19 * (float10)*(double *)((int)this + 0x2a8) *
                       (float10)*(double *)((int)this + 400));
          *(double *)((int)this + 0x188) =
               *(double *)((int)this + 0x2f0) * *(double *)((int)this + 0x180) * _DAT_0041ab10;
          FUN_0040f7e0((double *)((int)this + 0x1e0));
          fVar19 = (float10)fsin((float10)*(double *)((int)this + 0x188) *
                                 (float10)*(double *)((int)this + 0xf8) +
                                 (float10)*(double *)((int)this + 0x1e0));
          *(double *)((int)this + 0xf0) =
               (double)(fVar19 * (float10)*(double *)((int)this + 0x2a8) *
                       (float10)*(double *)((int)this + 0x178));
          *(double *)((int)this + 0x170) =
               *(double *)((int)this + 0x168) * *(double *)((int)this + 0x2f0) * _DAT_0041ab10;
          FUN_0040f7e0((double *)((int)this + 0x1d8));
          fVar19 = (float10)fsin(((float10)*(double *)((int)this + 0x108) +
                                 (float10)*(double *)((int)this + 0xf0)) *
                                 (float10)*(double *)((int)this + 0x170) +
                                 (float10)*(double *)((int)this + 0x1d8));
          *(double *)((int)this + 0xe8) =
               (double)(fVar19 * (float10)*(double *)((int)this + 0x160) *
                       (float10)*(double *)((int)this + 0x2a8));
          *(double *)((int)this + 0x158) =
               *(double *)((int)this + 0x2f0) * *(double *)((int)this + 0x150) * _DAT_0041ab10;
          FUN_0040f7e0((double *)((int)this + 0x1d0));
          fVar19 = (float10)fsin((float10)*(double *)((int)this + 0x158) *
                                 (float10)*(double *)((int)this + 0xe8) +
                                 (float10)*(double *)((int)this + 0x1d0));
          *(double *)((int)this + 0xe0) = (double)(fVar19 * (float10)*(double *)((int)this + 0x148))
          ;
          *(double *)((int)this + 0x140) =
               *(double *)((int)this + 0x2f0) * *(double *)((int)this + 0x138) * _DAT_0041ab10;
          FUN_0040f7e0((double *)((int)this + 0x1c8));
          fVar19 = (float10)fsin((float10)*(double *)((int)this + 0x100) *
                                 (float10)*(double *)((int)this + 0x140) +
                                 (float10)*(double *)((int)this + 0x1c8));
          *(double *)((int)this + 0xd8) =
               (double)(fVar19 * (float10)*(double *)((int)this + 0x2a8) *
                       (float10)*(double *)((int)this + 0x130));
          *(double *)((int)this + 0x128) =
               *(double *)((int)this + 0x2f0) * *(double *)((int)this + 0x120) * _DAT_0041ab10;
          FUN_0040f7e0((double *)((int)this + 0x1c0));
          dVar7 = *(double *)((int)this + 0x128) * *(double *)((int)this + 0xd8) +
                  *(double *)((int)this + 0x1c0);
          uStack_58 = SUB84(dVar7,0);
          uStack_54 = (undefined4)((ulonglong)dVar7 >> 0x20);
          if ((float)_DAT_0041ab08 <= param_1[0x5b]) {
            if (param_1[0x5b] <= (float)_DAT_0041ab00) {
              fVar19 = (float10)fsin((float10)dVar7);
            }
            else {
              fVar19 = FUN_0040e6f0(uStack_58,uStack_54,SUB84((double)param_1[0x5a],0),
                                    (int)((ulonglong)(double)param_1[0x5a] >> 0x20));
            }
          }
          else {
            fVar19 = FUN_0040e6b0();
          }
          *(double *)((int)this + 0xd0) = (double)fVar19;
          dVar7 = *(double *)((int)this + 0x118) * *(double *)((int)this + 0xd0);
          *(double *)((int)this + 0xd0) = dVar7;
          *(double *)((int)this + 0x100) =
               dVar7 * *(double *)((int)this + 0x1a8) * *(double *)((int)this + 0x2a8);
          *(double *)((int)this + 0x108) =
               *(double *)((int)this + 0xe0) * *(double *)((int)this + 0x2a8) *
               *(double *)((int)this + 0x1b0);
          *(double *)((int)this + 0x110) =
               *(double *)((int)this + 0xe0) * *(double *)((int)this + 0x2a8) *
               *(double *)((int)this + 0x1b8);
          dVar7 = (dVar7 + *(double *)((int)this + 0xe0)) *
                  (double)*(float *)((int)this + *(int *)((int)this + 200) * 4 + 0x78);
          *(double *)((int)this + 0x2b0) = dVar7;
          fVar19 = FUN_0040f6e0((int)this,dVar7,
                                (double)CONCAT44(*(undefined4 *)((int)this + 0x294),
                                                 *(undefined4 *)((int)this + 0x290)),
                                (double)CONCAT44(*(undefined4 *)((int)this + 0x29c),
                                                 *(undefined4 *)((int)this + 0x298)),
                                *(char *)((int)this + 0xcc));
          *(float *)((int)pfStack_64 + *(int *)((int)this + 0x14)) =
               (float)(fVar19 * (float10)_DAT_0041a308);
          FUN_0040f780(this,iStack_60 + iVar10);
          *(double *)((int)this + 0x1f0) =
               *(double *)((int)this + 0x1f0) * *(double *)((int)this + 0x250);
          *(double *)((int)this + 0x1f8) =
               *(double *)((int)this + 600) * *(double *)((int)this + 0x1f8);
          *(double *)((int)this + 0x200) =
               *(double *)((int)this + 0x260) * *(double *)((int)this + 0x200);
          *(double *)((int)this + 0x208) =
               *(double *)((int)this + 0x208) * *(double *)((int)this + 0x268);
          *(double *)((int)this + 0x210) =
               *(double *)((int)this + 0x210) * *(double *)((int)this + 0x270);
          *(double *)((int)this + 0x218) =
               *(double *)((int)this + 0x278) * *(double *)((int)this + 0x218);
          *(double *)((int)this + 0x280) =
               ((_DAT_0041a310 - *(double *)((int)this + 0x288)) + _DAT_0041a310) *
               *(double *)((int)this + 0x280);
          FUN_0040fd30();
          iStack_60 = iStack_60 + 1;
          pfStack_64 = (float *)((int)pfStack_64 + 4);
        } while (iStack_60 < *(int *)((int)this + 0xbc));
      }
      if (_DAT_0041a494 <= param_1[0x56]) {
        *(undefined4 *)((int)this + 0x2e8) = *(undefined4 *)((int)this + 0x2e0);
        *(undefined4 *)((int)this + 0x2ec) = *(undefined4 *)((int)this + 0x2e4);
      }
      else {
        *(undefined4 *)((int)this + 0x2e8) = *(undefined4 *)((int)this + 0x2f0);
        *(undefined4 *)((int)this + 0x2ec) = *(undefined4 *)((int)this + 0x2f4);
      }
      iVar10 = *(int *)((int)this + 200) + 1;
      *(int *)((int)this + 200) = iVar10;
    } while (iVar10 < *(int *)((int)this + 0xb8));
  }
  if (_DAT_0041a494 < param_1[0x1e]) {
    FUN_0040f910(this,1000);
    puVar13 = operator_new(*(int *)((int)this + 0x1c) << 2);
    iVar10 = *(int *)((int)this + 0x1c);
    iVar12 = 0;
    puVar18 = puVar13;
    if (0 < iVar10) {
      do {
        iVar10 = iVar10 - iVar12;
        iVar12 = iVar12 + 1;
        *puVar18 = *(undefined4 *)(*(int *)((int)this + 0x14) + -4 + iVar10 * 4);
        iVar10 = *(int *)((int)this + 0x1c);
        puVar18 = puVar18 + 1;
      } while (iVar12 < iVar10);
    }
    operator_delete(*(void **)((int)this + 0x14));
    *(undefined4 **)((int)this + 0x14) = puVar13;
  }
  FUN_0040f910(this,1000);
  dStack_50 = (double)((param_1[0x5c] - (float)_DAT_0041a310) * (float)_DAT_0041aa88);
  dStack_48 = (double)((param_1[0x5d] - (float)_DAT_0041a310) * (float)_DAT_0041aa88);
  iStack_18 = ftol();
  if (param_1[0x57] < _DAT_0041a494) {
    iVar10 = ftol();
    iStack_18 = iStack_18 * iVar10;
  }
  dStack_40 = (double)((param_1[0x5f] - (float)_DAT_0041a310) * (float)_DAT_0041aa88);
  dStack_38 = (double)((param_1[0x60] - (float)_DAT_0041a310) * (float)_DAT_0041aa88);
  dStack_30 = (double)-((param_1[0x61] - (float)_DAT_0041a310) * (float)_DAT_0041a308 *
                        (float)_DAT_0041aae8 + (float)_DAT_0041a310);
  dStack_28 = (double)((param_1[0x62] - (float)_DAT_0041a310) * (float)_DAT_0041aa88);
  uStack_1c = ftol();
  uStack_20 = (float)_DAT_0041a408 < param_1[0x1f];
  if (_DAT_0041a494 <= param_1[0x21]) {
    dStack_10 = -1.0;
  }
  else {
    dStack_10 = (double)(_DAT_0041a340 - param_1[0x21] * _DAT_0041a340);
  }
  if (param_1[0x54] < _DAT_0041a494) {
    iVar10 = ftol();
    iStack_60 = 0;
    if (0 < iVar10) {
      do {
        fVar3 = (float)iStack_60;
        pfVar2 = (float *)(*(int *)((int)this + 0x14) + iStack_60 * 4);
        iStack_60 = iStack_60 + 1;
        *pfVar2 = (fVar3 / (float)iVar10) * (fVar3 / (float)iVar10) * *pfVar2;
      } while (iStack_60 < iVar10);
    }
  }
  if (*(char *)((int)this + 0x10) == '\0') {
    if (param_1[0x17] < _DAT_0041a494) {
      FUN_0040f910(this,(int)(*(int *)((int)this + 0x1c) + (*(int *)((int)this + 0x1c) >> 0x1f & 3U)
                             ) >> 2);
    }
    if (_DAT_0041a494 < param_1[0x17]) {
      FUN_0040f910(this,*(int *)((int)this + 0x1c));
    }
    iVar10 = 0;
    if (0 < *(int *)((int)this + 0x1c)) {
      do {
        *(undefined4 *)(*(int *)((int)this + 0x18) + iVar10 * 4) =
             *(undefined4 *)(*(int *)((int)this + 0x14) + iVar10 * 4);
        iVar10 = iVar10 + 1;
      } while (iVar10 < *(int *)((int)this + 0x1c));
    }
  }
  else {
    FUN_0040fd40(&dStack_50);
    uVar16 = extraout_var;
    if ((param_1[0x1f] <= _DAT_0041a494) && (dStack_10 < _DAT_0041a408)) {
      FUN_0040f910(this,1000);
      uVar16 = extraout_var_00;
    }
    if (param_1[0x17] < _DAT_0041a494) {
      FUN_0040f910(this,(int)(*(int *)((int)this + 0x1c) + (*(int *)((int)this + 0x1c) >> 0x1f & 3U)
                             ) >> 2);
      uVar16 = extraout_var_01;
    }
    iVar10 = (uint)uVar16 << 0x10;
    if (_DAT_0041a494 < param_1[0x17]) {
      iVar10 = FUN_0040f910(this,*(int *)((int)this + 0x1c));
    }
  }
  iVar10 = (uint)CONCAT21((short)((uint)iVar10 >> 0x10),param_1[0x22] < _DAT_0041a494) << 8;
  if (param_1[0x22] < _DAT_0041a494) {
    fVar3 = param_1[0x22] * _DAT_0041aae0;
    iVar10 = *(int *)((int)this + 0x1c);
    iVar12 = 0;
    if (0 < iVar10) {
      do {
        fVar8 = fVar3 * *(float *)(*(int *)((int)this + 0x14) + iVar12 * 4);
        fVar9 = _DAT_0041a418;
        if ((fVar8 <= _DAT_0041a418) && (fVar9 = fVar8, fVar8 < _DAT_0041a90c)) {
          fVar9 = _DAT_0041a90c;
        }
        *(float *)(*(int *)((int)this + 0x14) + iVar12 * 4) = fVar9;
        fVar8 = fVar3 * *(float *)(*(int *)((int)this + 0x18) + iVar12 * 4);
        fVar9 = _DAT_0041a418;
        if ((fVar8 <= _DAT_0041a418) && (fVar9 = fVar8, fVar8 < _DAT_0041a90c)) {
          fVar9 = _DAT_0041a90c;
        }
        *(float *)(*(int *)((int)this + 0x18) + iVar12 * 4) = fVar9;
        iVar10 = *(int *)((int)this + 0x1c);
        iVar12 = iVar12 + 1;
      } while (iVar12 < iVar10);
    }
  }
  fVar3 = param_1[0x53];
  uVar14 = CONCAT22((short)((uint)iVar10 >> 0x10),
                    (ushort)(fVar3 < _DAT_0041a494) << 8 |
                    (ushort)(NAN(fVar3) || NAN(_DAT_0041a494)) << 10 |
                    (ushort)(fVar3 == _DAT_0041a494) << 0xe);
  if (fVar3 < _DAT_0041a494 != 0) {
    iVar12 = *(int *)((int)this + 0x1c);
    pvVar11 = *(void **)((int)this + 0x18);
    pvVar6 = *(void **)((int)this + 0x14);
    iVar10 = ftol();
    *(int *)((int)this + 0xc0) = iVar10;
    iVar10 = *(int *)((int)this + 0x1c) + iVar10;
    *(int *)((int)this + 0x1c) = iVar10;
    pvVar15 = operator_new(iVar10 * 4);
    *(void **)((int)this + 0x14) = pvVar15;
    pvVar15 = operator_new(*(int *)((int)this + 0x1c) << 2);
    iVar10 = *(int *)((int)this + 0xc0);
    *(void **)((int)this + 0x18) = pvVar15;
    iStack_5c = 0;
    if (0 < *(int *)((int)this + 0x1c)) {
      do {
        iVar4 = *(int *)((int)this + 0xc0);
        if (iVar4 < iStack_5c) {
          *(undefined4 *)(*(int *)((int)this + 0x14) + iStack_5c * 4) =
               *(undefined4 *)((int)pvVar6 + (iStack_5c - iVar4) * 4);
          *(undefined4 *)(*(int *)((int)this + 0x18) + iStack_5c * 4) =
               *(undefined4 *)((int)pvVar11 + (iStack_5c - *(int *)((int)this + 0xc0)) * 4);
        }
        else {
          fVar3 = (float)iStack_5c / (float)iVar10;
          fVar3 = fVar3 * fVar3;
          *(float *)(*(int *)((int)this + 0x14) + iStack_5c * 4) =
               fVar3 * *(float *)((int)pvVar6 + ((iVar12 - iVar4) + iStack_5c) * 4 + -4);
          *(float *)(*(int *)((int)this + 0x18) + iStack_5c * 4) =
               fVar3 * *(float *)((int)pvVar11 +
                                 ((iVar12 - *(int *)((int)this + 0xc0)) + iStack_5c) * 4 + -4);
        }
        iStack_5c = iStack_5c + 1;
      } while (iStack_5c < *(int *)((int)this + 0x1c));
    }
    operator_delete(pvVar6);
    operator_delete(pvVar11);
    uVar14 = extraout_EAX;
  }
  return CONCAT31((int3)((uint)uVar14 >> 8),1);
}


// ==== FUN_0040f6e0 @ 0040f6e0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __thiscall
FUN_0040f6e0(int param_1,double param_2,double param_3,double param_4,char param_5)

{
  float10 fVar1;
  
  fVar1 = (float10)param_3;
  if (fVar1 < (float10)_DAT_0041a310) {
    fVar1 = (float10)_DAT_0041a310;
  }
  fVar1 = ((float10)*(double *)(param_1 + 0x2c0) -
          ((float10)param_2 + (float10)*(double *)(param_1 + 0x2d0)) / fVar1) * (float10)param_4;
  *(double *)(param_1 + 0x2c0) = (double)fVar1;
  fVar1 = fVar1 + (float10)*(double *)(param_1 + 0x2d0);
  *(double *)(param_1 + 0x2d0) = (double)fVar1;
  if (param_5 != '\0') {
    fVar1 = fVar1 + (float10)param_2;
  }
  return fVar1;
}


// ==== FUN_0040f730 @ 0040f730 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __thiscall
FUN_0040f730(int param_1,double param_2,double param_3,double param_4,char param_5)

{
  float10 fVar1;
  
  fVar1 = (float10)param_3;
  if (fVar1 < (float10)_DAT_0041a310) {
    fVar1 = (float10)_DAT_0041a310;
  }
  fVar1 = ((float10)*(double *)(param_1 + 0x2b8) -
          ((float10)param_2 + (float10)*(double *)(param_1 + 0x2c8)) / fVar1) * (float10)param_4;
  *(double *)(param_1 + 0x2b8) = (double)fVar1;
  fVar1 = fVar1 + (float10)*(double *)(param_1 + 0x2c8);
  *(double *)(param_1 + 0x2c8) = (double)fVar1;
  if (param_5 != '\0') {
    fVar1 = fVar1 + (float10)param_2;
  }
  return fVar1;
}


// ==== FUN_0040f780 @ 0040f780 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f780(void *this,int param_1)

{
  float *pfVar1;
  
  pfVar1 = (float *)(*(int *)((int)this + 0x14) + param_1 * 4);
  *pfVar1 = (float)(((float10)*(double *)((int)this + 0x2d8) * (float10)_DAT_0041a368 +
                    (float10)_DAT_0041a310) * (float10)*pfVar1);
  if (_DAT_0041a418 < *(float *)(*(int *)((int)this + 0x14) + param_1 * 4)) {
    *(undefined4 *)(*(int *)((int)this + 0x14) + param_1 * 4) = 0x3f800000;
  }
  if (*(float *)(*(int *)((int)this + 0x14) + param_1 * 4) < _DAT_0041a90c) {
    *(undefined4 *)(*(int *)((int)this + 0x14) + param_1 * 4) = 0xbf800000;
  }
  return;
}


// ==== FUN_0040f7e0 @ 0040f7e0 ====

void FUN_0040f7e0(double *param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)_CIfmod();
  *param_1 = (double)fVar1;
  return;
}


// ==== FUN_0040f800 @ 0040f800 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_0040f800(int param_1)

{
  double dVar1;
  
  if (((*(double *)(param_1 + 0x2e8) < *(double *)(param_1 + 0x2e0)) &&
      (*(double *)(param_1 + 0x2f0) < *(double *)(param_1 + 0x2e0))) &&
     (dVar1 = (*(double *)(param_1 + 0x2a0) + _DAT_0041a310) * *(double *)(param_1 + 0x2f0),
     *(double *)(param_1 + 0x2f0) = dVar1, *(double *)(param_1 + 0x2e0) <= dVar1)) {
    *(undefined4 *)(param_1 + 0x2f0) = *(undefined4 *)(param_1 + 0x2e0);
    *(undefined4 *)(param_1 + 0x2f4) = *(undefined4 *)(param_1 + 0x2e4);
  }
  if (((*(double *)(param_1 + 0x2e0) < *(double *)(param_1 + 0x2e8)) &&
      (*(double *)(param_1 + 0x2e0) < *(double *)(param_1 + 0x2f0))) &&
     (dVar1 = (_DAT_0041a310 - *(double *)(param_1 + 0x2a0)) * *(double *)(param_1 + 0x2f0),
     *(double *)(param_1 + 0x2f0) = dVar1, dVar1 <= *(double *)(param_1 + 0x2e0))) {
    *(undefined4 *)(param_1 + 0x2f0) = *(undefined4 *)(param_1 + 0x2e0);
    *(undefined4 *)(param_1 + 0x2f4) = *(undefined4 *)(param_1 + 0x2e4);
  }
  if ((*(double *)(param_1 + 0x2e8) < *(double *)(param_1 + 0x2e0)) &&
     (*(double *)(param_1 + 0x2e0) < *(double *)(param_1 + 0x2f0))) {
    *(undefined4 *)(param_1 + 0x2f0) = *(undefined4 *)(param_1 + 0x2e0);
    *(undefined4 *)(param_1 + 0x2f4) = *(undefined4 *)(param_1 + 0x2e4);
  }
  return;
}


// ==== FUN_0040f910 @ 0040f910 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f910(void *this,int param_1)

{
  float *pfVar1;
  float fVar2;
  int iVar3;
  int iVar4;
  
  iVar4 = *(int *)((int)this + 0x1c);
  if (iVar4 < param_1) {
    param_1 = iVar4;
  }
  iVar3 = iVar4 - param_1;
  fVar2 = _DAT_0041a418 / (float)param_1;
  if (iVar3 < iVar4) {
    do {
      pfVar1 = (float *)(*(int *)((int)this + 0x14) + iVar3 * 4);
      *pfVar1 = (float)(iVar4 - iVar3) * fVar2 * *pfVar1;
      iVar4 = *(int *)((int)this + 0x1c) - iVar3;
      pfVar1 = (float *)(*(int *)((int)this + 0x18) + iVar3 * 4);
      iVar3 = iVar3 + 1;
      *pfVar1 = (float)iVar4 * fVar2 * *pfVar1;
      iVar4 = *(int *)((int)this + 0x1c);
    } while (iVar3 < iVar4);
  }
  return;
}


// ==== FUN_0040f980 @ 0040f980 ====

void FUN_0040f980(void)

{
  return;
}


// ==== FUN_0040f990 @ 0040f990 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f990(void *this,float *param_1)

{
  char *pcVar1;
  float fVar2;
  
  fVar2 = param_1[0x20] + _DAT_0041a418;
  *(undefined4 *)((int)this + 0xf0) = 0;
  *(undefined4 *)((int)this + 0xf8) = 0;
  *(undefined4 *)((int)this + 0x110) = 0;
  fVar2 = fVar2 * _DAT_0041aa6c;
  pcVar1 = (char *)(*(int *)((int)this + 200) + 0x68 + (int)this);
  *(undefined4 *)((int)this + 0x108) = 0;
  *(undefined4 *)((int)this + 0x100) = 0;
  *(undefined4 *)((int)this + 0xf4) = 0;
  *(undefined4 *)((int)this + 0xfc) = 0;
  *(undefined4 *)((int)this + 0x114) = 0;
  *(double *)((int)this + 0x2a0) = (double)fVar2;
  *(undefined4 *)((int)this + 0xd0) = 0;
  *(undefined4 *)((int)this + 0xd4) = 0;
  *(undefined4 *)((int)this + 0xd8) = 0;
  *(undefined4 *)((int)this + 0xdc) = 0;
  *(undefined4 *)((int)this + 0xe0) = 0;
  *(undefined4 *)((int)this + 0xe4) = 0;
  *(undefined4 *)((int)this + 0xe8) = 0;
  *(undefined4 *)((int)this + 0xec) = 0;
  *(undefined4 *)((int)this + 0x10c) = 0;
  *(undefined4 *)((int)this + 0x104) = 0;
  if (*pcVar1 == '\0') {
    *(double *)((int)this + 0x118) = (double)((*param_1 - _DAT_0041a418) * _DAT_0041a340);
    *(double *)((int)this + 0x130) = (double)((param_1[3] - _DAT_0041a418) * _DAT_0041a340);
    *(double *)((int)this + 0x148) = (double)((param_1[6] - _DAT_0041a418) * _DAT_0041a340);
    *(double *)((int)this + 0x160) = (double)((param_1[9] - _DAT_0041a418) * _DAT_0041a340);
    *(double *)((int)this + 0x178) = (double)((param_1[0xc] - _DAT_0041a418) * _DAT_0041a340);
    *(double *)((int)this + 400) = (double)((param_1[0xf] - _DAT_0041a418) * _DAT_0041a340);
  }
  *(double *)((int)this + 0x120) = (double)((param_1[1] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x138) = (double)((param_1[4] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x150) = (double)((param_1[7] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x168) = (double)((param_1[10] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x180) = (double)((param_1[0xd] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x198) = (double)((param_1[0x10] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x128) = (double)((param_1[2] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x140) = (double)((param_1[5] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x158) = (double)((param_1[8] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x170) = (double)((param_1[0xb] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x188) = (double)((param_1[0xe] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x1a0) = (double)((param_1[0x11] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x288) = (double)((param_1[0x1a] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x1a8) = (double)((param_1[0x12] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x1b0) = (double)((param_1[0x13] - _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x1b8) = (double)((param_1[0x14] - _DAT_0041a418) * _DAT_0041a340);
  if (*pcVar1 == '\0') {
    fVar2 = (param_1[0x1b] + _DAT_0041a418) * _DAT_0041a340;
    *(double *)((int)this + 0x290) =
         (double)(fVar2 * fVar2 * (float)_DAT_0041aae8 + (float)_DAT_0041a310);
  }
  *(double *)((int)this + 0x298) = (double)((param_1[0x1c] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x2d8) = (double)((param_1[0x19] + _DAT_0041a418) * _DAT_0041a340);
  *(double *)((int)this + 0x128) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x128))))))))));
  *(double *)((int)this + 0x140) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x140))))))))));
  *(double *)((int)this + 0x158) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x158))))))))));
  *(double *)((int)this + 0x170) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x170))))))))));
  *(double *)((int)this + 0x188) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x188))))))))));
  *(double *)((int)this + 0x1a0) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x1a0))))))))));
  *(double *)((int)this + 0x288) =
       SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(SQRT(*(double *)((int)this + 0x288))))))))));
  return;
}


// ==== FUN_0040fd30 @ 0040fd30 ====

void FUN_0040fd30(void)

{
  return;
}


// ==== FUN_0040fd40 @ 0040fd40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040fd40(double *param_1)

{
  void *pvVar1;
  float fVar2;
  float fVar3;
  double *pdVar4;
  void *pvVar5;
  int iVar6;
  undefined4 uVar7;
  undefined4 uVar8;
  int iVar9;
  int *piVar10;
  void *pvVar11;
  int extraout_ECX;
  float *pfVar12;
  double *pdVar13;
  int iVar14;
  undefined4 *puVar15;
  float10 fVar16;
  int iStack0000000c;
  undefined4 *puStack00000014;
  int iStack00000018;
  void *pvStack0000001c;
  int local_8;
  
  pdVar4 = param_1;
  FUN_00418980();
  pvStack0000001c = *(void **)(extraout_ECX + 0x14);
  iStack00000018 = *(int *)(extraout_ECX + 0x1c);
  iVar6 = *(int *)(param_1 + 7);
  *(int *)(extraout_ECX + 0x1c) = iVar6 * iStack00000018;
  pvVar5 = operator_new(iVar6 * iStack00000018 * 4);
  *(void **)(extraout_ECX + 0x14) = pvVar5;
  operator_delete(*(void **)(extraout_ECX + 0x18));
  pvVar5 = operator_new(*(int *)(extraout_ECX + 0x1c) << 2);
  *(void **)(extraout_ECX + 0x18) = pvVar5;
  iVar6 = 0;
  if (0 < *(int *)(extraout_ECX + 0x1c)) {
    do {
      iVar6 = iVar6 + 1;
      *(undefined4 *)(*(int *)(extraout_ECX + 0x14) + -4 + iVar6 * 4) = 0;
      *(undefined4 *)(*(int *)(extraout_ECX + 0x18) + -4 + iVar6 * 4) = 0;
    } while (iVar6 < *(int *)(extraout_ECX + 0x1c));
  }
  puStack00000014 = operator_new(0x60000);
  puVar15 = puStack00000014;
  for (iVar6 = 0x18000; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar15 = 0;
    puVar15 = puVar15 + 1;
  }
  iVar6 = ftol();
  srand(0xdead - iVar6);
  local_8 = 0;
  param_1 = (double *)0x0;
  do {
    iStack0000000c = 0;
    iVar6 = local_8;
    pdVar13 = param_1;
    if (0 < *(int *)((int)pdVar4 + 0x34)) {
      do {
        rand();
        uVar7 = ftol();
        *(undefined4 *)(&stack0x00000340 + (int)pdVar13) = uVar7;
        rand();
        uVar8 = ftol();
        *(undefined4 *)(&stack0x00000fc0 + iVar6) = *(undefined4 *)(pdVar4 + 3);
        uVar7 = *(undefined4 *)((int)pdVar4 + 0x14);
        *(undefined4 *)(&stack0x00000020 + (int)pdVar13) = uVar8;
        uVar8 = *(undefined4 *)(pdVar4 + 2);
        *(undefined4 *)(&stack0x00000fc4 + iVar6) = *(undefined4 *)((int)pdVar4 + 0x1c);
        *(undefined4 *)(&stack0x00001600 + iVar6) = uVar8;
        *(undefined4 *)(&stack0x00001604 + iVar6) = uVar7;
        rand();
        uVar7 = ftol();
        *(undefined4 *)(&stack0x00000660 + iVar6) = 0;
        *(undefined4 *)(&stack0x00000664 + iVar6) = 0x3ff00000;
        *(undefined4 *)(&stack0x00000ca0 + (int)pdVar13) = uVar7;
        iVar9 = rand();
        if ((float)_DAT_0041a308 < (float)iVar9 * _DAT_0041ab34) {
          *(undefined4 *)(&stack0x00000660 + iVar6) = 0;
          *(undefined4 *)(&stack0x00000664 + iVar6) = 0xbff00000;
        }
        iStack0000000c = iStack0000000c + 1;
        iVar6 = iVar6 + 0x10;
        pdVar13 = pdVar13 + 1;
      } while (iStack0000000c < *(int *)((int)pdVar4 + 0x34));
    }
    param_1 = (double *)((int)param_1 + 4);
    local_8 = local_8 + 8;
  } while ((int)param_1 < 8);
  iVar6 = 0;
  if (0 < *(int *)(extraout_ECX + 0x1c)) {
    do {
      fVar3 = _DAT_0041a494;
      if (iVar6 < iStack00000018) {
        fVar3 = *(float *)((int)pvStack0000001c + iVar6 * 4);
      }
      iStack0000000c = 0;
      param_1 = (double *)0x0;
      do {
        local_8 = 0;
        iVar9 = iStack0000000c;
        pdVar13 = param_1;
        if (0 < *(int *)((int)pdVar4 + 0x34)) {
          do {
            iVar14 = *(int *)(&stack0x00000340 + (int)pdVar13);
            *(int *)(&stack0x00000340 + (int)pdVar13) = iVar14 + 1;
            if (*(int *)(&stack0x00000ca0 + (int)pdVar13) < iVar14 + 1) {
              *(undefined4 *)(&stack0x00000340 + (int)pdVar13) = 0;
            }
            iVar14 = *(int *)(&stack0x00000020 + (int)pdVar13);
            *(int *)(&stack0x00000020 + (int)pdVar13) = iVar14 + 1;
            if (*(int *)(&stack0x00000ca0 + (int)pdVar13) < iVar14 + 1) {
              *(undefined4 *)(&stack0x00000020 + (int)pdVar13) = 0;
            }
            puStack00000014[*(int *)(&stack0x00000340 + (int)pdVar13)] =
                 (float)((float10)(float)puStack00000014[*(int *)(&stack0x00000340 + (int)pdVar13)]
                         * (float10)*(double *)(&stack0x00001600 + iVar9) +
                        (float10)fVar3 *
                        (float10)*(double *)(&stack0x00000660 + iVar9) *
                        (float10)*(double *)(&stack0x00000fc0 + iVar9));
            local_8 = local_8 + 1;
            iVar9 = iVar9 + 0x10;
            pdVar13 = pdVar13 + 1;
          } while (local_8 < *(int *)((int)pdVar4 + 0x34));
        }
        param_1 = (double *)((int)param_1 + 4);
        iStack0000000c = iStack0000000c + 8;
      } while ((int)param_1 < 8);
      iVar9 = *(int *)((int)pdVar4 + 0x34);
      fVar3 = _DAT_0041a418 / (float)iVar9;
      fVar2 = (float)_DAT_0041a408;
      if (0 < iVar9) {
        piVar10 = (int *)&stack0x00000020;
        do {
          iVar14 = *piVar10;
          piVar10 = piVar10 + 2;
          iVar9 = iVar9 + -1;
          fVar2 = (float)puStack00000014[iVar14] * (float)pdVar4[1] + fVar2;
        } while (iVar9 != 0);
      }
      *(float *)(*(int *)(extraout_ECX + 0x14) + iVar6 * 4) = fVar3 * fVar2;
      iVar9 = *(int *)((int)pdVar4 + 0x34);
      fVar2 = (float)_DAT_0041a408;
      if (0 < iVar9) {
        piVar10 = (int *)&stack0x00000024;
        do {
          iVar14 = *piVar10;
          piVar10 = piVar10 + 2;
          iVar9 = iVar9 + -1;
          fVar2 = (float)puStack00000014[iVar14] * (float)pdVar4[1] + fVar2;
        } while (iVar9 != 0);
      }
      iVar6 = iVar6 + 1;
      *(float *)(*(int *)(extraout_ECX + 0x18) + -4 + iVar6 * 4) = fVar3 * fVar2;
    } while (iVar6 < *(int *)(extraout_ECX + 0x1c));
  }
  if (*(char *)(pdVar4 + 6) != '\0') {
    pvVar5 = *(void **)(extraout_ECX + 0x14);
    pvVar1 = *(void **)(extraout_ECX + 0x18);
    *(int *)(extraout_ECX + 0x1c) = iStack00000018;
    pvVar11 = operator_new(iStack00000018 << 2);
    *(void **)(extraout_ECX + 0x14) = pvVar11;
    pvVar11 = operator_new(*(int *)(extraout_ECX + 0x1c) << 2);
    *(void **)(extraout_ECX + 0x18) = pvVar11;
    iVar6 = 0;
    if (0 < *(int *)(extraout_ECX + 0x1c)) {
      do {
        *(undefined4 *)(*(int *)(extraout_ECX + 0x14) + iVar6 * 4) = 0;
        *(undefined4 *)(*(int *)(extraout_ECX + 0x18) + iVar6 * 4) = 0;
        iVar9 = 0;
        if (0 < *(int *)(pdVar4 + 7)) {
          do {
            pfVar12 = (float *)(*(int *)(extraout_ECX + 0x14) + iVar6 * 4);
            *pfVar12 = *(float *)((int)pvVar5 + (*(int *)(extraout_ECX + 0x1c) * iVar9 + iVar6) * 4)
                       + *pfVar12;
            pfVar12 = (float *)(*(int *)(extraout_ECX + 0x18) + iVar6 * 4);
            iVar14 = *(int *)(extraout_ECX + 0x1c) * iVar9;
            iVar9 = iVar9 + 1;
            *pfVar12 = *(float *)((int)pvVar1 + (iVar14 + iVar6) * 4) + *pfVar12;
          } while (iVar9 < *(int *)(pdVar4 + 7));
        }
        iVar6 = iVar6 + 1;
      } while (iVar6 < *(int *)(extraout_ECX + 0x1c));
    }
    operator_delete(pvVar5);
    operator_delete(pvVar1);
  }
  iVar6 = 0;
  *(undefined4 *)(extraout_ECX + 0x2c8) = 0;
  *(undefined4 *)(extraout_ECX + 0x2d0) = 0;
  *(undefined4 *)(extraout_ECX + 0x2cc) = 0;
  *(undefined4 *)(extraout_ECX + 0x2d4) = 0;
  if (0 < *(int *)(extraout_ECX + 0x1c)) {
    do {
      fVar16 = FUN_0040f6e0(extraout_ECX,
                            (double)*(float *)(*(int *)(extraout_ECX + 0x14) + iVar6 * 4),pdVar4[4],
                            pdVar4[5],*(char *)(extraout_ECX + 0xcd));
      *(float *)(*(int *)(extraout_ECX + 0x14) + iVar6 * 4) = (float)fVar16;
      fVar16 = FUN_0040f730(extraout_ECX,
                            (double)*(float *)(*(int *)(extraout_ECX + 0x18) + iVar6 * 4),pdVar4[4],
                            pdVar4[5],*(char *)(extraout_ECX + 0xcd));
      iVar6 = iVar6 + 1;
      *(float *)(*(int *)(extraout_ECX + 0x18) + -4 + iVar6 * 4) = (float)fVar16;
    } while (iVar6 < *(int *)(extraout_ECX + 0x1c));
  }
  iVar6 = 0;
  if (0 < *(int *)(extraout_ECX + 0x1c)) {
    do {
      fVar3 = _DAT_0041a494;
      if (iVar6 < iStack00000018) {
        fVar3 = *(float *)((int)pvStack0000001c + iVar6 * 4);
      }
      pfVar12 = (float *)(*(int *)(extraout_ECX + 0x14) + iVar6 * 4);
      *pfVar12 = fVar3 * (float)*pdVar4 + *pfVar12;
      pfVar12 = (float *)(*(int *)(extraout_ECX + 0x18) + iVar6 * 4);
      iVar6 = iVar6 + 1;
      *pfVar12 = fVar3 * (float)*pdVar4 + *pfVar12;
    } while (iVar6 < *(int *)(extraout_ECX + 0x1c));
  }
  if (_DAT_0041a408 < pdVar4[8]) {
    iVar6 = *(int *)(extraout_ECX + 0x1c);
    iVar9 = ftol();
    iVar6 = iVar6 - iVar9;
    *(int *)(extraout_ECX + 0x1c) = iVar9;
    local_8 = 0;
    if (0 < iVar6) {
      do {
        iVar9 = *(int *)(extraout_ECX + 0x14);
        fVar3 = (float)local_8 / (float)iVar6;
        fVar2 = _DAT_0041a418 - fVar3;
        *(float *)(iVar9 + local_8 * 4) =
             fVar3 * *(float *)(iVar9 + local_8 * 4) +
             fVar2 * *(float *)(iVar9 + (*(int *)(extraout_ECX + 0x1c) + local_8) * 4);
        iVar9 = *(int *)(extraout_ECX + 0x18);
        iVar14 = *(int *)(extraout_ECX + 0x1c) + local_8;
        local_8 = local_8 + 1;
        *(float *)(iVar9 + -4 + local_8 * 4) =
             fVar3 * *(float *)(iVar9 + -4 + local_8 * 4) + fVar2 * *(float *)(iVar9 + iVar14 * 4);
      } while (local_8 < iVar6);
    }
  }
  iVar6 = *(int *)(extraout_ECX + 0x1c);
  *(undefined4 *)(extraout_ECX + 0x2c0) = 0;
  fVar3 = _DAT_0041a494;
  *(undefined4 *)(extraout_ECX + 0x2d0) = 0;
  *(undefined4 *)(extraout_ECX + 0x2b8) = 0;
  *(undefined4 *)(extraout_ECX + 0x2c8) = 0;
  *(undefined4 *)(extraout_ECX + 0x2c4) = 0;
  *(undefined4 *)(extraout_ECX + 0x2d4) = 0;
  *(undefined4 *)(extraout_ECX + 700) = 0;
  *(undefined4 *)(extraout_ECX + 0x2cc) = 0;
  if (0 < iVar6) {
    pfVar12 = *(float **)(extraout_ECX + 0x18);
    iVar14 = *(int *)(extraout_ECX + 0x14) - (int)pfVar12;
    iVar9 = iVar6;
    do {
      fVar2 = ABS(*(float *)(iVar14 + (int)pfVar12));
      if (fVar3 < fVar2) {
        fVar3 = fVar2;
      }
      if (fVar3 < ABS(*pfVar12)) {
        fVar3 = ABS(*pfVar12);
      }
      pfVar12 = pfVar12 + 1;
      iVar9 = iVar9 + -1;
    } while (iVar9 != 0);
  }
  fVar3 = _DAT_0041a418 / fVar3;
  iVar9 = 0;
  if (0 < iVar6) {
    do {
      *(float *)(*(int *)(extraout_ECX + 0x14) + iVar9 * 4) =
           fVar3 * *(float *)(*(int *)(extraout_ECX + 0x14) + iVar9 * 4);
      iVar6 = iVar9 * 4;
      iVar14 = iVar9 * 4;
      iVar9 = iVar9 + 1;
      *(float *)(*(int *)(extraout_ECX + 0x18) + iVar14) =
           fVar3 * *(float *)(*(int *)(extraout_ECX + 0x18) + iVar6);
    } while (iVar9 < *(int *)(extraout_ECX + 0x1c));
  }
  operator_delete(puStack00000014);
  operator_delete(pvStack0000001c);
  return;
}


// ==== FUN_00410400 @ 00410400 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __cdecl FUN_00410400(float param_1,float param_2,float param_3,float param_4,float param_5)

{
  float fVar1;
  float10 fVar2;
  float10 fVar3;
  
  fVar2 = (float10)_CIfmod();
  param_1 = (float)fVar2;
  if (param_2 <= param_1) {
    fVar2 = (float10)_DAT_0041a418 - (float10)param_2;
    param_1 = _DAT_0041a418 - param_1;
    fVar1 = _DAT_0041ab38;
  }
  else {
    fVar2 = (float10)param_2;
    fVar1 = _DAT_0041ab3c;
  }
  if (fVar2 <= (float10)param_1) {
    fVar2 = (float10)_DAT_0041a418;
  }
  else {
    fVar2 = (float10)param_1 / fVar2;
  }
  if ((float10)param_3 <= fVar2) {
    if ((float10)(_DAT_0041a418 - param_3) <= (float10)_DAT_0041a418 - fVar2) {
      fVar2 = (float10)_DAT_0041a418;
    }
    else {
      fVar2 = ((float10)_DAT_0041a418 - fVar2) / (float10)(_DAT_0041a418 - param_3);
    }
  }
  else {
    fVar2 = fVar2 / (float10)param_3;
  }
  if ((float10)_DAT_0041a418 - (float10)param_4 <= fVar2) {
    fVar2 = (float10)_DAT_0041a418;
  }
  else {
    fVar2 = fVar2 / ((float10)_DAT_0041a418 - (float10)param_4);
  }
  fVar3 = (float10)fsin(fVar2 * (float10)_DAT_0041a7ec);
  return (((float10)_DAT_0041a418 - (float10)param_5) * fVar2 + fVar3 * (float10)param_5) *
         (float10)fVar1;
}


// ==== FUN_00410500 @ 00410500 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00410500(undefined4 *param_1,short *param_2,uint param_3,int param_4,undefined4 param_5,
            int param_6,int param_7,uint param_8)

{
  short sVar1;
  undefined4 *_Memory;
  int iVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  int iVar6;
  int iVar7;
  undefined4 *puVar8;
  short *psVar9;
  undefined4 *puVar10;
  float10 extraout_ST0;
  float10 fVar11;
  float10 extraout_ST1;
  int local_4;
  
  if ((0 < param_7) && (param_7 < 0x3e9)) {
    iVar4 = param_7;
    if (0 < param_7) {
      do {
        iVar4 = iVar4 + -1;
      } while (iVar4 != 0);
    }
    psVar9 = param_2;
    for (iVar4 = param_4; iVar4 != 0; iVar4 = iVar4 + -1) {
      psVar9[0] = 0;
      psVar9[1] = 0;
      psVar9 = psVar9 + 2;
    }
    _Memory = malloc(param_3 * 4 + 4);
    puVar8 = param_1;
    puVar10 = _Memory;
    for (uVar5 = param_3 & 0x3fffffff; uVar5 != 0; uVar5 = uVar5 - 1) {
      *puVar10 = *puVar8;
      puVar8 = puVar8 + 1;
      puVar10 = puVar10 + 1;
    }
    for (iVar4 = 0; iVar4 != 0; iVar4 = iVar4 + -1) {
      *(undefined1 *)puVar10 = *(undefined1 *)puVar8;
      puVar8 = (undefined4 *)((int)puVar8 + 1);
      puVar10 = (undefined4 *)((int)puVar10 + 1);
    }
    *(undefined2 *)(_Memory + param_3) = *(undefined2 *)param_1;
    *(undefined2 *)(param_3 * 4 + 2 + (int)_Memory) = *(undefined2 *)((int)param_1 + 2);
    if (0 < param_7) {
      iVar4 = param_6 + 0xc;
      param_6 = param_7;
      do {
        uVar5 = ftol();
        ftol();
        iVar2 = ftol();
        iVar3 = ftol();
        param_1 = (undefined4 *)0x1;
        fVar11 = ((float10)*(float *)(iVar4 + 8) * (float10)_DAT_0041ab48) / extraout_ST0;
        param_7 = 0;
        psVar9 = param_2;
        if (0 < param_4) {
          do {
            param_1 = (undefined4 *)((int)param_1 + -1);
            if (param_1 == (undefined4 *)0x0) {
              fsin((float10)param_7 * fVar11);
              local_4 = ftol();
              param_1 = (undefined4 *)0x40;
              fVar11 = extraout_ST1;
            }
            for (; (int)(param_3 * 0x400) <= (int)uVar5; uVar5 = uVar5 + param_3 * -0x400) {
            }
            iVar6 = (int)uVar5 >> 10;
            iVar7 = (int)*(short *)((int)_Memory + iVar6 * 4 + 2);
            sVar1 = *(short *)((int)_Memory + iVar6 * 4 + 6);
            *psVar9 = *psVar9 + (short)((((int)(((int)*(short *)(_Memory + iVar6 + 1) -
                                                (int)*(short *)(_Memory + iVar6)) * (uVar5 & 0x3ff))
                                         >> 10) + (int)*(short *)(_Memory + iVar6)) * iVar3 >> 10);
            psVar9[1] = psVar9[1] +
                        (short)((((int)((sVar1 - iVar7) * (uVar5 & 0x3ff)) >> 10) + iVar7) * iVar2
                               >> 10);
            uVar5 = uVar5 + local_4;
            param_7 = param_7 + 1;
            psVar9 = psVar9 + 2;
          } while (param_7 < param_4);
        }
        iVar4 = iVar4 + 0x18;
        param_6 = param_6 + -1;
      } while (param_6 != 0);
    }
    free(_Memory);
    FUN_00410a80(param_2,param_4,param_8);
  }
  return;
}


// ==== FUN_004107b0 @ 004107b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_004107b0(undefined4 *param_1,short *param_2,uint param_3,uint param_4,int param_5,int param_6,
            float *param_7,uint param_8)

{
  short sVar1;
  float10 fVar2;
  longlong lVar3;
  int iVar4;
  undefined4 *_Memory;
  uint uVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  int iVar9;
  undefined4 *puVar10;
  short *psVar11;
  undefined4 *puVar12;
  int iVar13;
  float10 fVar14;
  float10 fVar15;
  longlong lVar16;
  longlong lVar17;
  undefined8 uVar18;
  int local_3c;
  int local_28;
  float *local_24;
  uint local_20;
  int local_c;
  
  psVar11 = param_2;
  for (uVar5 = param_4; uVar5 != 0; uVar5 = uVar5 - 1) {
    psVar11[0] = 0;
    psVar11[1] = 0;
    psVar11 = psVar11 + 2;
  }
  iVar4 = (int)(0x10000 / (longlong)param_6);
  _Memory = malloc(param_3 * 4 + 4);
  puVar10 = param_1;
  puVar12 = _Memory;
  for (uVar5 = param_3 & 0x3fffffff; uVar5 != 0; uVar5 = uVar5 - 1) {
    *puVar12 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar12 = puVar12 + 1;
  }
  for (iVar6 = 0; iVar6 != 0; iVar6 = iVar6 + -1) {
    *(undefined1 *)puVar12 = *(undefined1 *)puVar10;
    puVar10 = (undefined4 *)((int)puVar10 + 1);
    puVar12 = (undefined4 *)((int)puVar12 + 1);
  }
  *(undefined2 *)(_Memory + param_3) = *(undefined2 *)param_1;
  *(undefined2 *)(param_3 * 4 + 2 + (int)_Memory) = *(undefined2 *)((int)param_1 + 2);
  if (0 < param_6) {
    local_28 = 0;
    fVar2 = (float10)log2((float10)_DAT_0041a990);
    local_24 = param_7;
    local_3c = param_6;
    do {
      fVar15 = (float10)1.4426950408889634 *
               (float10)*local_24 * (float10)(double)((float10)0.6931471805599453 * fVar2) *
               (float10)_DAT_0041aab0;
      fVar14 = ROUND(fVar15);
      fVar15 = (float10)f2xm1(fVar15 - fVar14);
      fscale((float10)1 + fVar15,fVar14);
      lVar16 = ftol();
      lVar17 = __allmul(param_4,(int)param_4 >> 0x1f,(uint)lVar16,(int)((ulonglong)lVar16 >> 0x20));
      local_20 = local_28 / param_6;
      uVar18 = ftol();
      local_c = 0;
      lVar3 = CONCAT44((int)((ulonglong)uVar18 >> 0x20) % (int)param_3,(int)uVar18);
      if (0 < (int)param_4) {
        do {
          local_20 = local_20 + 1;
          if (local_20 == param_4) {
            local_20 = 0;
          }
          lVar3 = lVar16 + lVar3;
          iVar7 = (int)((ulonglong)lVar3 >> 0x20) % (int)param_3;
          uVar5 = (int)lVar3 >> 0x10 & 0xffff;
          iVar6 = (int)*(short *)((int)_Memory + iVar7 * 4 + 2);
          iVar13 = ((int)(((int)*(short *)(_Memory + iVar7 + 1) - (int)*(short *)(_Memory + iVar7))
                         * uVar5) >> 0x10) + (int)*(short *)(_Memory + iVar7);
          iVar6 = ((int)((*(short *)((int)_Memory + iVar7 * 4 + 6) - iVar6) * uVar5) >> 0x10) +
                  iVar6;
          if (local_c < param_5) {
            iVar8 = (int)((ulonglong)(lVar3 + lVar17) >> 0x20) % (int)param_3;
            uVar5 = (int)(lVar3 + lVar17) >> 0x10 & 0xffff;
            sVar1 = *(short *)(_Memory + iVar8);
            iVar9 = (int)*(short *)((int)_Memory + iVar8 * 4 + 2);
            iVar7 = ftol();
            iVar6 = (((int)((*(short *)((int)_Memory + iVar8 * 4 + 6) - iVar9) * uVar5) >> 0x10) +
                    iVar9) * (0x4000 - iVar7) + iVar7 * iVar6 >> 0xe;
            iVar13 = (((int)(((int)*(short *)(_Memory + iVar8 + 1) - (int)sVar1) * uVar5) >> 0x10) +
                     (int)sVar1) * (0x4000 - iVar7) + iVar7 * iVar13 >> 0xe;
          }
          param_2[local_20 * 2] = param_2[local_20 * 2] + (short)((uint)(iVar13 * iVar4) >> 0x10);
          param_2[local_20 * 2 + 1] =
               param_2[local_20 * 2 + 1] + (short)((uint)(iVar6 * iVar4) >> 0x10);
          local_c = local_c + 1;
        } while (local_c < (int)param_4);
      }
      local_24 = local_24 + 1;
      local_28 = local_28 + param_4;
      local_3c = local_3c + -1;
    } while (local_3c != 0);
  }
  free(_Memory);
  FUN_00410a80(param_2,param_4,param_8);
  return;
}


// ==== FUN_00410a80 @ 00410a80 ====

void __cdecl FUN_00410a80(short *param_1,int param_2,uint param_3)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  uint uVar4;
  int iVar5;
  uint uVar6;
  uint uVar7;
  uint uVar8;
  short *psVar9;
  int iVar10;
  uint uVar11;
  int iVar12;
  uint local_c;
  uint local_8;
  int local_4;
  
  if (param_3 != 0) {
    uVar8 = 0x7fff;
    uVar7 = 0xffff8001;
    uVar11 = 0x7fff;
    uVar6 = 0xffff8001;
    local_8 = 0x7fff;
    local_c = 0xffff8001;
    if (0 < param_2) {
      local_4 = param_2;
      psVar9 = param_1;
      do {
        uVar1 = (uint)*psVar9;
        uVar4 = (uint)psVar9[1];
        psVar9 = psVar9 + 2;
        if ((int)uVar1 < (int)uVar8) {
          uVar8 = uVar1;
        }
        if ((int)uVar7 < (int)uVar1) {
          uVar7 = uVar1;
        }
        if ((int)uVar4 < (int)uVar11) {
          uVar11 = uVar4;
          local_8 = uVar4;
        }
        if ((int)uVar6 < (int)uVar4) {
          uVar6 = uVar4;
          local_c = uVar4;
        }
        local_4 = local_4 + -1;
      } while (local_4 != 0);
    }
    uVar1 = uVar7;
    if ((param_3 & 4) != 0) {
      if ((int)uVar8 < (int)uVar11) {
        uVar11 = uVar8;
        local_8 = uVar8;
      }
      uVar1 = uVar6;
      uVar8 = uVar11;
      if ((int)uVar6 < (int)uVar7) {
        uVar1 = uVar7;
        local_c = uVar7;
      }
    }
    iVar10 = 0;
    iVar12 = 0;
    iVar5 = (int)(uVar1 + uVar8) / 2;
    iVar2 = (int)(local_c + local_8) / 2;
    if ((param_3 & 1) != 0) {
      uVar8 = uVar8 - iVar5;
      uVar1 = uVar1 - iVar5;
      local_8 = local_8 - iVar2;
      iVar10 = -iVar5;
      iVar12 = -iVar2;
      local_c = local_c - iVar2;
    }
    if ((param_3 & 2) == 0) {
      if (0 < param_2) {
        do {
          *param_1 = *param_1 + (short)iVar10;
          param_1[1] = param_1[1] + (short)iVar12;
          param_1 = param_1 + 2;
          param_2 = param_2 + -1;
        } while (param_2 != 0);
      }
    }
    else {
      iVar5 = (uVar1 ^ (int)uVar1 >> 0x1f) - ((int)uVar1 >> 0x1f);
      iVar2 = (uVar8 ^ (int)uVar8 >> 0x1f) - ((int)uVar8 >> 0x1f);
      if (iVar2 <= iVar5) {
        iVar2 = iVar5;
      }
      iVar5 = (local_c ^ (int)local_c >> 0x1f) - ((int)local_c >> 0x1f);
      iVar3 = (local_8 ^ (int)local_8 >> 0x1f) - ((int)local_8 >> 0x1f);
      if (iVar5 < iVar3) {
        iVar5 = iVar3;
      }
      if (iVar2 == 0) {
        param_3 = 0;
      }
      else {
        param_3 = (uint)(0x1fffffff / (longlong)iVar2);
      }
      if (iVar5 == 0) {
        iVar2 = 0;
      }
      else {
        iVar2 = (int)(0x1fffffff / (longlong)iVar5);
      }
      if (0 < param_2) {
        do {
          *param_1 = (short)((int)((*param_1 + iVar10) * param_3) >> 0xe);
          param_1[1] = (short)((param_1[1] + iVar12) * iVar2 >> 0xe);
          param_1 = param_1 + 2;
          param_2 = param_2 + -1;
        } while (param_2 != 0);
        return;
      }
    }
  }
  return;
}


// ==== FUN_00410c20 @ 00410c20 ====

uint __cdecl FUN_00410c20(byte *param_1,undefined4 *param_2)

{
  byte bVar1;
  byte bVar2;
  ushort uVar3;
  uint uVar4;
  
  bVar1 = *param_1;
  uVar4 = (uint)bVar1;
  *param_2 = 1;
  if ((bVar1 & 0xc0) == 0xc0) {
    bVar2 = param_1[1];
    *param_2 = 2;
    uVar4 = (bVar2 & 0x7f) * 0x40 + (bVar1 & 0x3f);
    if ((bVar2 & 0x80) != 0) {
      uVar3 = *(ushort *)(param_1 + 2);
      *param_2 = 4;
      return uVar4 | (uint)uVar3 << 0xd;
    }
  }
  return uVar4;
}


// ==== FUN_00410c80 @ 00410c80 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

uint __cdecl FUN_00410c80(char *param_1,byte *param_2,int *param_3)

{
  byte *pbVar1;
  char cVar2;
  undefined1 uVar3;
  short sVar4;
  float fVar5;
  uint3 uVar6;
  uint3 uVar7;
  ushort uVar8;
  float fVar9;
  undefined4 uVar10;
  undefined2 uVar11;
  uint uVar12;
  undefined4 *puVar13;
  int iVar14;
  short *psVar15;
  int *piVar16;
  short *psVar17;
  float *pfVar18;
  int iVar19;
  short *psVar20;
  int iVar21;
  uint uVar22;
  int iVar23;
  uint uVar24;
  ushort *puVar25;
  int iVar26;
  uint3 *puVar27;
  char *pcVar28;
  undefined1 *puVar29;
  uint local_e4;
  uint local_e0;
  uint local_dc;
  uint local_d8;
  uint local_d4;
  uint local_d0;
  short *local_cc;
  byte local_c8;
  undefined3 uStack_c7;
  uint local_c4;
  int local_c0;
  uint local_bc;
  uint local_b8;
  int local_b4;
  short *local_b0;
  undefined4 *local_ac;
  float *local_a8;
  uint local_a4;
  int local_a0;
  byte *local_9c;
  float *local_98;
  uint local_94;
  float local_90 [3];
  undefined4 local_84;
  undefined1 auStack_81 [64];
  undefined1 auStack_41 [53];
  int *piStack_c;
  
  local_b8 = 7;
  local_d0 = 7;
  local_d8 = 0;
  local_b4 = 0;
  local_d4 = 0;
  local_c0 = 0;
  local_c4 = 0;
  local_bc = 0;
  uVar12 = FUN_00410c20(param_2,&local_e0);
  uVar24 = local_e0;
  local_9c = param_2 + local_e0;
  if (uVar12 != 0) {
    return local_e0;
  }
  local_a4 = FUN_00410c20(local_9c,&local_e0);
  local_9c = local_9c + local_e0;
  iVar23 = 0;
  local_a0 = uVar24 + local_a4 + local_e0;
  if (0 < (int)local_a4) {
    do {
      pbVar1 = local_9c;
      uVar12 = FUN_00410c20(local_9c + iVar23,&local_e0);
      iVar23 = iVar23 + local_e0;
      local_94 = FUN_00410c20(pbVar1 + iVar23,&local_e0);
      uVar24 = iVar23 + local_e0;
      puVar25 = (ushort *)(pbVar1 + uVar24);
      local_dc = uVar24;
      switch(uVar12) {
      case 1:
        iVar23 = 0;
        pfVar18 = local_90;
        do {
          pbVar1 = (byte *)(iVar23 + (int)puVar25);
          iVar23 = iVar23 + 1;
          *pfVar18 = (float)*pbVar1 * _DAT_0041ab68;
          pfVar18 = pfVar18 + 1;
        } while (iVar23 < 4);
        uVar12 = (uint)(byte)puVar25[2];
        local_d8 = uVar12 << 2;
        puVar13 = operator_new(uVar12 * 0x10);
        uVar10 = local_84;
        fVar9 = local_90[1];
        local_e4 = 0;
        uVar24 = local_dc;
        local_ac = puVar13;
        if (uVar12 != 0) {
          fVar5 = (float)(int)local_d8;
          do {
            FUN_00410400((float)(int)local_e4 / fVar5,fVar9,(float)uVar10,local_90[2],local_90[0]);
            uVar11 = ftol();
            *(undefined2 *)puVar13 = uVar11;
            *(undefined2 *)((int)puVar13 + 2) = uVar11;
            local_e4 = local_e4 + 1;
            puVar13 = puVar13 + 1;
            uVar24 = local_dc;
          } while ((int)local_e4 < (int)local_d8);
        }
        break;
      default:
        local_d0 = local_d0 & 0xff;
        break;
      case 3:
        puVar27 = (uint3 *)(puVar25 + 1);
        local_dc = (uint)*puVar25;
        iVar21 = (int)((local_94 - 2) + ((int)(local_94 - 2) >> 0x1f & 7U)) >> 3;
        local_b4 = iVar21;
        local_98 = operator_new(iVar21 * 0x18);
        pfVar18 = local_98;
        iVar23 = iVar21;
        if (0 < iVar21) {
          do {
            uVar6 = *puVar27;
            puVar27 = (uint3 *)((int)puVar27 + 2);
            iVar23 = iVar23 + -1;
            *pfVar18 = (float)(ushort)uVar6 * _DAT_0041a370;
            pfVar18 = pfVar18 + 6;
          } while (iVar23 != 0);
          pfVar18 = local_98 + 1;
          iVar23 = iVar21;
          do {
            uVar6 = *puVar27;
            puVar27 = (uint3 *)((int)puVar27 + 1);
            iVar23 = iVar23 + -1;
            *pfVar18 = (float)((int)((byte)uVar6 * local_d8 + 8) >> 8);
            pfVar18 = pfVar18 + 6;
          } while (iVar23 != 0);
          pfVar18 = local_98 + 2;
          iVar23 = iVar21;
          do {
            uVar6 = *puVar27;
            puVar27 = (uint3 *)((int)puVar27 + 1);
            iVar23 = iVar23 + -1;
            *pfVar18 = (float)((int)(char)(byte)uVar6 << 1);
            pfVar18 = pfVar18 + 6;
          } while (iVar23 != 0);
          pfVar18 = local_98 + 3;
          iVar23 = iVar21;
          do {
            uVar6 = *puVar27;
            puVar27 = (uint3 *)((int)puVar27 + 1);
            iVar23 = iVar23 + -1;
            *pfVar18 = (float)(byte)uVar6;
            pfVar18 = pfVar18 + 6;
          } while (iVar23 != 0);
          pfVar18 = local_98 + 5;
          do {
            uVar7 = *puVar27;
            pbVar1 = (byte *)((int)puVar27 + 1);
            uVar6 = *puVar27;
            _local_c8 = CONCAT31(uStack_c7,*(byte *)((int)puVar27 + 2));
            puVar27 = (uint3 *)((int)puVar27 + 3);
            local_d4 = (int)(uint)uVar6 >> 0xc;
            local_e4 = (uint)(byte)uVar7 | (*pbVar1 & 0xf) << 8;
            if (0xc00 < local_e4) {
              local_e4 = local_e4 - 0x1000;
            }
            if (0xc00 < local_d4) {
              local_d4 = local_d4 - 0x1000;
            }
            iVar21 = iVar21 + -1;
            pfVar18[-1] = (float)(int)local_e4;
            *pfVar18 = (float)(int)local_d4;
            pfVar18 = pfVar18 + 6;
          } while (iVar21 != 0);
        }
        local_d4 = local_dc * local_d8;
        local_b0 = operator_new(local_d4 * 4);
        break;
      case 4:
        iVar23 = (uint)*(byte *)((int)puVar25 + 1) + (uint)(byte)*puVar25;
        local_c4 = (uint)(byte)*puVar25 * 0x400;
        local_bc = iVar23 * 0x400;
        puVar25 = puVar25 + 1;
        if (local_bc <= local_c4) {
          local_c4 = iVar23 * 0x1c00 >> 3;
        }
        iVar21 = local_94 - 2;
        local_c0 = iVar21;
        pfVar18 = operator_new(iVar21 * 4);
        local_a8 = pfVar18;
        local_cc = operator_new(iVar23 * 0x1000);
        uVar24 = local_dc;
        if (0 < iVar21) {
          do {
            uVar8 = *puVar25;
            puVar25 = (ushort *)((int)puVar25 + 1);
            iVar21 = iVar21 + -1;
            *pfVar18 = (float)(int)(char)(byte)uVar8;
            pfVar18 = pfVar18 + 1;
          } while (iVar21 != 0);
        }
        break;
      case 5:
        local_b8 = (byte)*puVar25 & 7;
        local_d0 = (int)(uint)(byte)*puVar25 >> 4 & 7;
      }
      iVar23 = uVar24 + local_94;
    } while (iVar23 < (int)local_a4);
  }
  pfVar18 = local_98;
  puVar13 = local_ac;
  psVar17 = local_b0;
  uVar24 = 0xffffffff;
  iVar23 = 0;
  pcVar28 = param_1;
  do {
    if (uVar24 == 0) break;
    uVar24 = uVar24 - 1;
    cVar2 = *pcVar28;
    pcVar28 = pcVar28 + 1;
  } while (cVar2 != '\0');
  iVar19 = ~uVar24 - 1;
  iVar26 = -1;
  iVar21 = iVar19;
  if (0 < iVar19) {
    do {
      if (param_1[iVar23] == '\\') {
        iVar26 = iVar23;
      }
      if (param_1[iVar23] == '.') {
        iVar21 = iVar23;
      }
      iVar23 = iVar23 + 1;
    } while (iVar23 < iVar19);
  }
  iVar21 = iVar21 - iVar26;
  iVar23 = iVar21 + -1;
  if (0 < iVar23) {
    iVar19 = 0;
    do {
      iVar14 = iVar19 + 1;
      uVar3 = ((undefined1 *)((int)register0x00000010 + -0x81) + iVar19 + 1)
              [(int)(param_1 +
                    ((iVar26 + 1) - (int)((undefined1 *)((int)register0x00000010 + -0x81) + 1)))];
      auStack_41[iVar19 + 1] = uVar3;
      ((undefined1 *)((int)register0x00000010 + -0x81))[iVar19 + 1] = uVar3;
      iVar19 = iVar14;
    } while (iVar14 < iVar23);
  }
  auStack_41[iVar21] = 0x4c;
  ((undefined1 *)((int)register0x00000010 + -0x81))[iVar21] = 0x52;
  iVar26 = 5;
  iVar21 = iVar23;
  do {
    uVar3 = (&DAT_0041d35c)[iVar21 - iVar23];
    auStack_41[iVar21 + 2] = uVar3;
    ((undefined1 *)((int)register0x00000010 + -0x81))[iVar21 + 2] = uVar3;
    iVar21 = iVar21 + 1;
    iVar26 = iVar26 + -1;
  } while (iVar26 != 0);
  FUN_00410500(local_ac,local_b0,local_d8,local_d4,0x3f800000,(int)local_98,local_b4,local_b8);
  uVar12 = local_bc;
  FUN_004107b0((undefined4 *)psVar17,local_cc,local_d4,local_bc,local_c4,local_c0,local_a8,local_d0)
  ;
  operator_delete(pfVar18);
  operator_delete(puVar13);
  operator_delete(psVar17);
  uVar24 = uVar12 * 2;
  psVar15 = operator_new(uVar24);
  psVar17 = local_cc;
  psVar20 = psVar15;
  uVar22 = uVar12;
  if (0 < (int)uVar12) {
    do {
      *psVar20 = *psVar17;
      uVar22 = uVar22 - 1;
      psVar17 = psVar17 + 2;
      psVar20 = psVar20 + 1;
    } while (uVar22 != 0);
  }
  puVar29 = auStack_41 + 1;
  piVar16 = (int *)(**(code **)(*param_3 + 8))(param_3);
  (**(code **)(*piVar16 + 4))(piVar16,psVar15,uVar24);
  (**(code **)(*piVar16 + 0x1c))(piVar16);
  if (0 < (int)uVar12) {
    psVar17 = (short *)(local_e4 + 2);
    psVar20 = psVar15;
    do {
      sVar4 = *psVar17;
      psVar17 = psVar17 + 2;
      *psVar20 = sVar4;
      psVar20 = psVar20 + 1;
      uVar12 = uVar12 - 1;
    } while (uVar12 != 0);
  }
  piVar16 = (int *)(**(code **)(*piStack_c + 8))(piStack_c,&local_98);
  (**(code **)(*piVar16 + 4))(piVar16,psVar15,uVar24);
  (**(code **)(*piVar16 + 0x1c))(piVar16);
  operator_delete(psVar15);
  operator_delete(puVar29);
  return local_d0;
}


// ==== FUN_004111f0 @ 004111f0 ====

void __cdecl FUN_004111f0(byte *param_1,int *param_2)

{
  char *pcVar1;
  undefined1 *puVar2;
  uint uVar3;
  byte *pbVar4;
  uint uVar5;
  byte local_c8 [200];
  
  uVar5 = (uint)*param_1;
  pbVar4 = param_1 + 1;
  if (uVar5 != 0) {
    puVar2 = &stack0xffffff37;
    do {
      do {
        puVar2[1] = *pbVar4;
        pcVar1 = puVar2 + 1;
        pbVar4 = pbVar4 + 1;
        puVar2 = puVar2 + 1;
      } while (*pcVar1 != '\0');
      uVar3 = FUN_00410c80((char *)local_c8,pbVar4,param_2);
      pbVar4 = pbVar4 + uVar3;
      FUN_0040b540();
      uVar5 = uVar5 - 1;
      puVar2 = &stack0xffffff37;
    } while (uVar5 != 0);
  }
  return;
}


// ==== FUN_00411250 @ 00411250 ====

undefined4 * __thiscall FUN_00411250(void *this,char *param_1,int param_2,int param_3)

{
  int *piVar1;
  char cVar2;
  int iVar3;
  uint uVar4;
  uint uVar5;
  int iVar6;
  char *pcVar7;
  char *pcVar8;
  
  *(undefined ***)this = &PTR_LAB_0041ab6c;
  *(int *)((int)this + 8) = param_2;
  *(undefined4 *)((int)this + 0x10) = 0;
  iVar6 = *(int *)(param_2 + 8);
  *(int *)((int)this + 4) = param_2 + 0xc;
  for (; 0 < iVar6; iVar6 = iVar6 + -1) {
    iVar3 = _stricmp(*(char **)((int)this + 4),param_1);
    if (iVar3 == 0) {
      return this;
    }
    *(int *)((int)this + 4) =
         *(int *)(*(int *)((int)this + 4) + 0x100) + 0x104 + *(int *)((int)this + 4);
  }
  if (param_3 == 0) {
    *(undefined4 *)((int)this + 4) = 0;
    return this;
  }
  uVar4 = 0xffffffff;
  do {
    pcVar7 = param_1;
    if (uVar4 == 0) break;
    uVar4 = uVar4 - 1;
    pcVar7 = param_1 + 1;
    cVar2 = *param_1;
    param_1 = pcVar7;
  } while (cVar2 != '\0');
  uVar4 = ~uVar4;
  pcVar7 = pcVar7 + -uVar4;
  pcVar8 = *(char **)((int)this + 4);
  for (uVar5 = uVar4 >> 2; uVar5 != 0; uVar5 = uVar5 - 1) {
    *(undefined4 *)pcVar8 = *(undefined4 *)pcVar7;
    pcVar7 = pcVar7 + 4;
    pcVar8 = pcVar8 + 4;
  }
  for (uVar4 = uVar4 & 3; uVar4 != 0; uVar4 = uVar4 - 1) {
    *pcVar8 = *pcVar7;
    pcVar7 = pcVar7 + 1;
    pcVar8 = pcVar8 + 1;
  }
  *(undefined4 *)(*(int *)((int)this + 4) + 0x100) = 0;
  *(int *)(*(int *)((int)this + 8) + 8) = *(int *)(*(int *)((int)this + 8) + 8) + 1;
  piVar1 = (int *)(*(int *)((int)this + 8) + 4);
  *piVar1 = *piVar1 + 0x104;
  return this;
}


// ==== FUN_00411310 @ 00411310 ====

void __fastcall FUN_00411310(undefined4 *param_1)

{
  *param_1 = &PTR_LAB_0041ab6c;
  return;
}


// ==== FUN_00411480 @ 00411480 ====

void FUN_00411480(undefined4 *param_1)

{
  if (param_1 != (undefined4 *)0x0) {
    FUN_00411310(param_1);
    operator_delete(param_1);
  }
  return;
}


// ==== FUN_004114a0 @ 004114a0 ====

void __thiscall FUN_004114a0(void *this,undefined4 param_1)

{
  *(undefined ***)this = &PTR_LAB_0041ab8c;
  *(undefined4 *)((int)this + 4) = param_1;
  return;
}


// ==== FUN_00411590 @ 00411590 ====

undefined4 FUN_00411590(int *param_1)

{
  void *this;
  undefined4 uVar1;
  
  if (*param_1 != 0x49584653) {
    *param_1 = 0x49584653;
    param_1[2] = 0;
    param_1[1] = 0;
  }
  this = operator_new(8);
  if (this != (void *)0x0) {
    uVar1 = FUN_004114a0(this,param_1);
    return uVar1;
  }
  return 0;
}


// ==== FUN_004115e0 @ 004115e0 ====

void FUN_004115e0(int *param_1)

{
  int *piVar1;
  
  piVar1 = (int *)(**(code **)(*param_1 + 0x18))(param_1);
  FUN_00411590(piVar1);
  return;
}


// ==== FUN_00411600 @ 00411600 ====

undefined4 * __thiscall FUN_00411600(void *this,LPCSTR param_1,int param_2)

{
  HANDLE pvVar1;
  
  *(undefined ***)this = &PTR_LAB_0041aba0;
  if (param_2 == 0) {
    pvVar1 = CreateFileA(param_1,0xc0000000,1,(LPSECURITY_ATTRIBUTES)0x0,3,0x80,(HANDLE)0x0);
    *(HANDLE *)((int)this + 4) = pvVar1;
    if (pvVar1 != (HANDLE)0xffffffff) goto LAB_0041166a;
    pvVar1 = CreateFileA(param_1,0x80000000,1,(LPSECURITY_ATTRIBUTES)0x0,3,0x80,(HANDLE)0x0);
  }
  else {
    pvVar1 = CreateFileA(param_1,0xc0000000,1,(LPSECURITY_ATTRIBUTES)0x0,4,0x80,(HANDLE)0x0);
  }
  *(HANDLE *)((int)this + 4) = pvVar1;
LAB_0041166a:
  *(undefined4 *)((int)this + 0xc) = 0;
  *(undefined4 *)((int)this + 8) = 0;
  return this;
}


// ==== FUN_00411680 @ 00411680 ====

void __fastcall FUN_00411680(undefined4 *param_1)

{
  *param_1 = &PTR_LAB_0041aba0;
  if ((HANDLE)param_1[2] != (HANDLE)0x0) {
    CloseHandle((HANDLE)param_1[2]);
  }
  if ((LPCVOID)param_1[3] != (LPCVOID)0x0) {
    UnmapViewOfFile((LPCVOID)param_1[3]);
  }
  CloseHandle((HANDLE)param_1[1]);
  return;
}


// ==== FUN_00411780 @ 00411780 ====

void FUN_00411780(int param_1)

{
  HANDLE pvVar1;
  LPVOID pvVar2;
  
  pvVar1 = CreateFileMappingA(*(HANDLE *)(param_1 + 4),(LPSECURITY_ATTRIBUTES)0x0,0x8000004,0,0,
                              (LPCSTR)0x0);
  *(HANDLE *)(param_1 + 8) = pvVar1;
  if (pvVar1 == (HANDLE)0x0) {
    pvVar1 = CreateFileMappingA(*(HANDLE *)(param_1 + 4),(LPSECURITY_ATTRIBUTES)0x0,0x8000002,0,0,
                                (LPCSTR)0x0);
    *(HANDLE *)(param_1 + 8) = pvVar1;
    pvVar2 = MapViewOfFile(pvVar1,4,0,0,0);
    *(LPVOID *)(param_1 + 0xc) = pvVar2;
    return;
  }
  pvVar2 = MapViewOfFile(pvVar1,2,0,0,0);
  *(LPVOID *)(param_1 + 0xc) = pvVar2;
  return;
}


// ==== FUN_004117f0 @ 004117f0 ====

void FUN_004117f0(undefined4 *param_1)

{
  if (param_1 != (undefined4 *)0x0) {
    FUN_00411680(param_1);
    operator_delete(param_1);
  }
  return;
}


// ==== FUN_004118a0 @ 004118a0 ====

undefined4 * FUN_004118a0(void)

{
  undefined4 *puVar1;
  
  puVar1 = operator_new(4);
  if (puVar1 != (undefined4 *)0x0) {
    *puVar1 = &PTR_LAB_0041abc0;
    return puVar1;
  }
  return (undefined4 *)0x0;
}


// ==== FUN_004118c0 @ 004118c0 ====

void __cdecl FUN_004118c0(LPCSTR param_1)

{
  FUN_00411a00();
  ShowWindow(DAT_0041f430,0);
  MessageBoxA((HWND)0x0,param_1,DAT_0041f420,0);
                    /* WARNING: Subroutine does not return */
  ExitProcess(0);
}


// ==== FUN_00411900 @ 00411900 ====

void FUN_00411900(void)

{
  FUN_00411a00();
                    /* WARNING: Subroutine does not return */
  ExitProcess(0);
}


// ==== FUN_00411910 @ 00411910 ====

void __cdecl FUN_00411910(char *param_1,undefined4 param_2)

{
  undefined4 uVar1;
  char *pcVar2;
  undefined4 extraout_ECX;
  undefined4 extraout_EDX;
  undefined4 *puVar3;
  undefined8 uVar4;
  
  DAT_0041f420 = s_asysgl_64_0041d4b4;
  uVar1 = FUN_00411ab0();
  if ((char)uVar1 == '\0') {
    MessageBoxA((HWND)0x0,s_sorry__this_production_requires_M_0041d490,DAT_0041f420,0);
                    /* WARNING: Subroutine does not return */
    ExitProcess(1);
  }
  DAT_0041f428 = param_1;
  DAT_0041f42c = param_2;
  puVar3 = &DAT_0041f834;
  uVar1 = extraout_EDX;
  do {
    uVar4 = FUN_004119a0(param_2,uVar1);
    uVar1 = (undefined4)((ulonglong)uVar4 >> 0x20);
    *puVar3 = (int)uVar4;
    puVar3 = puVar3 + 1;
    param_2 = extraout_ECX;
  } while ((int)puVar3 < 0x41fc34);
  pcVar2 = strstr(param_1,&DAT_0041d48c);
  if (pcVar2 != (char *)0x0) {
    DAT_004201ac = 1;
  }
  DAT_0041f41c = 0;
  DAT_0041f41e = 1;
  return;
}


// ==== FUN_004119a0 @ 004119a0 ====

undefined8 __fastcall FUN_004119a0(undefined4 param_1,undefined4 param_2)

{
  DAT_0041d488 = DAT_0041d488 * 0x41c64e6d + 0x3093;
  return CONCAT44(param_2,DAT_0041d488 >> 0x10);
}


// ==== FUN_004119d0 @ 004119d0 ====

int FUN_004119d0(void)

{
  DWORD DVar1;
  
  if (DAT_0041fc34 == 0) {
    DAT_0041fc34 = timeGetTime();
  }
  DVar1 = timeGetTime();
  return (DVar1 + DAT_0041fc34 * 0x3fffffff) * 4;
}


// ==== FUN_00411a00 @ 00411a00 ====

void FUN_00411a00(void)

{
  if (DAT_0041fc38 == '\0') {
    DAT_0041fc38 = '\x01';
    FUN_004094d0();
    ChangeDisplaySettingsA((DEVMODEA *)0x0,0);
  }
  return;
}


// ==== FUN_00411a20 @ 00411a20 ====

/* WARNING: Removing unreachable block (ram,0x00411a44) */
/* WARNING: Removing unreachable block (ram,0x00411a56) */

bool FUN_00411a20(void)

{
  return true;
}


// ==== FUN_00411a80 @ 00411a80 ====

/* WARNING: Removing unreachable block (ram,0x00411a91) */

bool FUN_00411a80(void)

{
  int iVar1;
  
  iVar1 = cpuid_Version_info(1);
  return (*(uint *)(iVar1 + 8) & 0x800000) == 0x800000;
}


// ==== FUN_00411ab0 @ 00411ab0 ====

undefined4 FUN_00411ab0(void)

{
  bool bVar1;
  undefined3 extraout_var;
  undefined3 extraout_var_00;
  
  bVar1 = FUN_00411a20();
  if (CONCAT31(extraout_var,bVar1) != 0) {
    bVar1 = FUN_00411a80();
    if (CONCAT31(extraout_var_00,bVar1) != 0) {
      return CONCAT31(extraout_var_00,1);
    }
  }
  return 0;
}


// ==== FUN_00411ad0 @ 00411ad0 ====

void FUN_00411ad0(void)

{
  int iVar1;
  tagMSG local_1c;
  
  iVar1 = PeekMessageA(&local_1c,(HWND)0x0,0,0,1);
  while (iVar1 != 0) {
    TranslateMessage(&local_1c);
    DispatchMessageA(&local_1c);
    iVar1 = PeekMessageA(&local_1c,(HWND)0x0,0,0,1);
  }
  return;
}


// ==== FUN_00411b30 @ 00411b30 ====

undefined4 FUN_00411b30(void)

{
  int format;
  char *pcVar1;
  PROC pPVar2;
  char *pcVar3;
  tagRECT local_38;
  PIXELFORMATDESCRIPTOR local_28;
  
  local_28.nSize = 0x28;
  local_28.nVersion = 1;
  local_28.dwFlags = 0x1025;
  local_28.iPixelType = '\0';
  local_28.cColorBits = (BYTE)DAT_0041d4c0;
  local_28.cRedBits = '\0';
  local_28.cRedShift = '\0';
  local_28.cGreenBits = '\0';
  local_28.cGreenShift = '\0';
  local_28.cBlueBits = '\0';
  local_28.cBlueShift = '\0';
  local_28.cAlphaBits = '\0';
  local_28.cAlphaShift = '\0';
  local_28.cAccumBits = '\0';
  local_28.cAccumRedBits = '\0';
  local_28.cAccumGreenBits = '\0';
  local_28.cAccumBlueBits = '\0';
  local_28.cAccumAlphaBits = '\0';
  local_28.cDepthBits = DAT_0041d4c8;
  local_28.cStencilBits = '\0';
  local_28.cAuxBuffers = '\0';
  local_28.iLayerType = '\0';
  local_28.bReserved = '\0';
  local_28.dwLayerMask = 0;
  local_28.dwVisibleMask = 0;
  local_28.dwDamageMask = 0;
  DAT_0041fc5c = GetDC(DAT_0041f430);
  format = ChoosePixelFormat(DAT_0041fc5c,&local_28);
  SetPixelFormat(DAT_0041fc5c,format,&local_28);
  DescribePixelFormat(DAT_0041fc5c,format,0x28,&local_28);
  DAT_0041fc60 = wglCreateContext(DAT_0041fc5c);
  wglMakeCurrent(DAT_0041fc5c,DAT_0041fc60);
  GetClientRect(DAT_0041f430,&local_38);
  glEnable(0xde1);
  glDisable(0xb41);
  glDisable(0xb20);
  glEnable(0xb71);
  glDepthFunc(0x203);
  glClearColor(0,0,0,0x3f800000);
  pcVar3 = (char *)0x1f03;
  pcVar1 = (char *)glGetString(0x1f03,s_GL_ARB_multitexture_0041d524);
  pcVar1 = strstr(pcVar1,pcVar3);
  pPVar2 = (PROC)0x0;
  if (pcVar1 != (char *)0x0) {
    pcVar3 = s_GL_EXT_texture_env_combine_0041d508;
    pcVar1 = (char *)glGetString(0x1f03);
    pcVar1 = strstr(pcVar1,pcVar3);
    pPVar2 = (PROC)0x0;
    if (pcVar1 != (char *)0x0) {
      DAT_0041fca0 = 1;
      DAT_0041fc9c = wglGetProcAddress(s_glActiveTextureARB_0041d4f4);
      pPVar2 = wglGetProcAddress(s_glMultiTexCoord2fARB_0041d4dc);
      DAT_0041fc48 = pPVar2;
    }
  }
  if (DAT_0041f41c == '\0') {
    pPVar2 = (PROC)ShowCursor(0);
  }
  return CONCAT31((int3)((uint)pPVar2 >> 8),1);
}


// ==== FUN_00411e20 @ 00411e20 ====

undefined4 __cdecl FUN_00411e20(int param_1,int param_2)

{
  uint dwStyle;
  undefined4 uVar1;
  HWND pHVar2;
  int iVar3;
  int iVar4;
  WNDCLASSEXA *pWVar5;
  tagRECT local_40;
  WNDCLASSEXA local_30;
  
  DAT_0041f430 = FindWindowA(PTR_DAT_0041d4cc,DAT_0041f420);
  iVar4 = 0;
  if (DAT_0041f430 != (HWND)0x0) {
    SetForegroundWindow(DAT_0041f430);
                    /* WARNING: Subroutine does not return */
    ExitProcess(0);
  }
  pWVar5 = &local_30;
  for (iVar3 = 0xc; iVar3 != 0; iVar3 = iVar3 + -1) {
    pWVar5->cbSize = 0;
    pWVar5 = (WNDCLASSEXA *)&pWVar5->style;
  }
  local_30.cbSize = 0x30;
  local_30.style = 0x23;
  local_30.lpfnWndProc = (WNDPROC)&LAB_00411cf0;
  local_30.hInstance = DAT_0041f42c;
  local_30.hCursor = LoadCursorA((HINSTANCE)0x0,&DAT_00007f00);
  local_30.hbrBackground = GetStockObject(4);
  local_30.lpszMenuName = (LPCSTR)0x0;
  local_30.lpszClassName = PTR_DAT_0041d4cc;
  local_30.hIcon = (HICON)0x0;
  RegisterClassExA(&local_30);
  dwStyle = (-(uint)(DAT_0041f41c != '\0') & 0x80420000) + 0x80880000;
  iVar3 = 0;
  if (DAT_0041f41c != '\0') {
    local_40.right = param_1;
    local_40.left = 0;
    local_40.top = 0;
    local_40.bottom = param_2;
    AdjustWindowRect(&local_40,dwStyle,0);
    iVar4 = GetSystemMetrics(0);
    iVar4 = (iVar4 + (local_40.left - local_40.right)) / 2;
    iVar3 = GetSystemMetrics(1);
    iVar3 = (iVar3 + (local_40.top - local_40.bottom)) / 2;
    param_1 = local_40.right - local_40.left;
    param_2 = local_40.bottom - local_40.top;
  }
  DAT_0041f430 = CreateWindowExA(0x40008,PTR_DAT_0041d4cc,DAT_0041f420,dwStyle | 0x6000000,iVar4,
                                 iVar3,param_1,param_2,(HWND)0x0,(HMENU)0x0,DAT_0041f42c,(LPVOID)0x0
                                );
  uVar1 = FUN_00411b30();
  if ((char)uVar1 == '\0') {
    return uVar1;
  }
  ShowWindow(DAT_0041f430,5);
  UpdateWindow(DAT_0041f430);
  SetForegroundWindow(DAT_0041f430);
  pHVar2 = SetFocus(DAT_0041f430);
  return CONCAT31((int3)((uint)pHVar2 >> 8),1);
}


// ==== FUN_00411fd0 @ 00411fd0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __cdecl FUN_00411fd0(DWORD param_1,DWORD param_2)

{
  bool bVar1;
  char *pcVar2;
  BOOL BVar3;
  undefined4 uVar4;
  int iVar5;
  DWORD iModeNum;
  DEVMODEA *pDVar6;
  DWORD *pDVar7;
  DEVMODEA local_128;
  undefined4 local_6c;
  int local_1c;
  
  local_1c = (-(uint)(DAT_0041d4d0 != '\0') & 0xfffffc19) + 999;
  bVar1 = false;
  pcVar2 = strstr(DAT_0041f428,&DAT_0041d540);
  if (pcVar2 != (char *)0x0) {
    DAT_0041d4c4 = 0x10;
  }
  pcVar2 = strstr(DAT_0041f428,&DAT_0041d53c);
  if (pcVar2 != (char *)0x0) {
    DAT_0041d4c0 = 0x20;
  }
  pcVar2 = strstr(DAT_0041f428,&DAT_0041d538);
  if (pcVar2 != (char *)0x0) {
    _DAT_0041d4c8 = 0x20;
  }
  if (DAT_0041f41c != '\0') {
LAB_00412124:
    uVar4 = FUN_00411e20(param_1,param_2);
    if ((char)uVar4 == '\0') {
      return uVar4;
    }
    FUN_00412260();
    FUN_004121f0();
    FUN_00412260();
    FUN_004121f0();
    BVar3 = SwapBuffers(DAT_0041fc5c);
    if (BVar3 == 0) {
      return 0;
    }
    _DAT_0041f408 = param_1;
    _DAT_0041f40c = param_2;
    return CONCAT31((int3)((uint)BVar3 >> 8),1);
  }
  BVar3 = EnumDisplaySettingsA((LPCSTR)0x0,0,&local_128);
  iModeNum = 1;
  if (BVar3 != 0) {
    do {
      if (((local_128.dmPelsWidth == param_1) && (local_128.dmPelsHeight == param_2)) &&
         (local_128.dmBitsPerPel == DAT_0041d4c0)) {
        if (DAT_0041d4d0 != '\0') {
          pDVar6 = &local_128;
          pDVar7 = &local_128.dmPanningWidth;
          for (iVar5 = 0x25; iVar5 != 0; iVar5 = iVar5 + -1) {
            *pDVar7 = *(DWORD *)pDVar6->dmDeviceName;
            pDVar6 = (DEVMODEA *)(pDVar6->dmDeviceName + 4);
            pDVar7 = pDVar7 + 1;
          }
        }
        bVar1 = true;
      }
      BVar3 = EnumDisplaySettingsA((LPCSTR)0x0,iModeNum,&local_128);
      iModeNum = iModeNum + 1;
    } while (BVar3 != 0);
    if (bVar1) {
      local_6c = 0x7c0000;
      ChangeDisplaySettingsA((DEVMODEA *)&local_128.dmPanningWidth,4);
      goto LAB_00412124;
    }
  }
  return 0;
}


// ==== FUN_004121a0 @ 004121a0 ====

void FUN_004121a0(void)

{
  if (DAT_0041fc60 != (HGLRC)0x0) {
    wglMakeCurrent((HDC)0x0,(HGLRC)0x0);
    wglDeleteContext(DAT_0041fc60);
  }
  if (DAT_0041fc5c != (HDC)0x0) {
    ReleaseDC(DAT_0041fc58,DAT_0041fc5c);
  }
  ChangeDisplaySettingsA((DEVMODEA *)0x0,0);
  ShowCursor(1);
  return;
}


// ==== FUN_004121f0 @ 004121f0 ====

void FUN_004121f0(void)

{
  char cVar1;
  
  FUN_004122c0();
  FUN_00411ad0();
  glFinish();
  SwapBuffers(DAT_0041fc5c);
  glClearColor(0,0,0,0x3f800000);
  cVar1 = glIsEnabled(0xc11);
  glDisable(0xc11);
  glClear(0x4100);
  if (cVar1 != '\0') {
    glEnable(0xc11);
  }
  FUN_00412270();
  return;
}


// ==== FUN_00412260 @ 00412260 ====

void FUN_00412260(void)

{
  glClear(0x4100);
  return;
}


// ==== FUN_00412270 @ 00412270 ====

void FUN_00412270(void)

{
  glMatrixMode(0x1700);
  glLoadIdentity();
  glPushMatrix();
  glTranslatef(0,0,0xbdcccccd);
  glDisable(0xb50);
  glColorMaterial(0x408,0x1602);
  glEnable(0xb57);
  return;
}


// ==== FUN_004122c0 @ 004122c0 ====

void FUN_004122c0(void)

{
  glPopMatrix();
  glMatrixMode(0x1701);
  glLoadIdentity();
  gluPerspective(0,0x40568000,0,0x3ff00000,0,0,0,0x40e00000);
  return;
}


// ==== FUN_00412300 @ 00412300 ====

undefined4 FUN_00412300(void)

{
  undefined4 unaff_EDI;
  undefined4 uVar1;
  undefined4 uVar2;
  undefined1 *puVar3;
  undefined1 local_4 [4];
  
  puVar3 = local_4;
  uVar2 = 1;
  glGenTextures(1,local_4);
  glBindTexture(0xde1,unaff_EDI);
  glPixelStorei(0xcf5,4);
  if (DAT_0041d4c4 == 0x10) {
    uVar1 = 0x8057;
  }
  else {
    uVar1 = 0x8058;
  }
  glTexImage2D(0xde1,0,uVar1,puVar3,unaff_EDI,0,0x80e1,0x1401,uVar2);
  glTexParameterf(0xde1,0x2802,0x46240400);
  glTexParameterf(0xde1,0x2803,0x46240400);
  glTexParameterf(0xde1,0x2800,0x46180400);
  glTexParameterf(0xde1,0x2801,0x46180400);
  glColor3f(0x3f800000,0x3f800000,0x3f800000);
  glEnable();
  glBindTexture(0xde1,0);
  return 0xde1;
}


// ==== FUN_004123f0 @ 004123f0 ====

void __cdecl FUN_004123f0(undefined4 param_1)

{
  glBindTexture(0xde1,param_1);
  glEnable(0xde1);
  return;
}


// ==== FUN_00412410 @ 00412410 ====

void FUN_00412410(void)

{
  glMatrixMode(0x1701);
  glPushMatrix();
  glLoadIdentity();
  glOrtho(0,0,0,0x3ff00000,0,0,0,0x3ff00000,0,0xbff00000,0,0x3ff00000);
  glMatrixMode(0x1700);
  glPushMatrix();
  glLoadIdentity();
  glTranslatef(0,0,0xbdcccccd);
  return;
}


// ==== FUN_00412480 @ 00412480 ====

void FUN_00412480(void)

{
  glPopMatrix();
  glMatrixMode(0x1701);
  glPopMatrix();
  return;
}


// ==== FUN_004124a0 @ 004124a0 ====

void __cdecl FUN_004124a0(float param_1,float param_2,float param_3,float param_4)

{
  undefined4 uVar1;
  undefined4 uVar2;
  
  glMatrixMode(0x1701);
  glPushMatrix();
  glLoadIdentity();
  glOrtho(0,0,0,0x3ff00000,0,0,0,0x3ff00000,0,0xbff00000,0,0x3ff00000);
  glMatrixMode(0x1700);
  glPushMatrix();
  glLoadIdentity();
  glTranslatef(0,0,0xbdcccccd);
  glBegin(7);
  uVar2 = 0;
  glTexCoord2f(0,0);
  glVertex2f(param_1,param_2 + param_4);
  uVar1 = 0;
  glTexCoord2f(0x3f800000,0);
  glVertex2f(param_1 + param_3,uVar2);
  glTexCoord2f(0x3f800000,0x3f800000);
  glVertex2f(uVar1,param_2);
  glTexCoord2f(0,0x3f800000);
  glVertex2f(param_1,param_2);
  glEnd();
  glPopMatrix();
  glMatrixMode(0x1701);
  glPopMatrix();
  return;
}


// ==== FUN_004125b0 @ 004125b0 ====

void FUN_004125b0(void)

{
  undefined4 uVar1;
  undefined4 uVar2;
  undefined4 uVar3;
  undefined4 uVar4;
  undefined4 uVar5;
  undefined4 uVar6;
  undefined4 uVar7;
  undefined4 uVar8;
  undefined4 uVar9;
  undefined4 uVar10;
  undefined4 uVar11;
  undefined4 uVar12;
  
  glMatrixMode(0x1701);
  glPushMatrix();
  glLoadIdentity();
  uVar12 = 0;
  uVar11 = 0x3ff00000;
  uVar10 = 0;
  uVar9 = 0;
  uVar8 = 0;
  uVar7 = 0x3ff00000;
  uVar6 = 0;
  uVar5 = 0;
  glOrtho(0,0,0,0x3ff00000,0,0,0,0x3ff00000,0,0xbff00000,0,0x3ff00000);
  glMatrixMode(0x1700);
  glPushMatrix();
  glLoadIdentity();
  uVar4 = 0xbdcccccd;
  uVar3 = 0;
  uVar2 = 0;
  glTranslatef(0,0,0xbdcccccd);
  uVar1 = 7;
  glBegin(7);
  glTexCoord2f(uVar11,uVar12);
  glVertex2f(uVar3,uVar4);
  glTexCoord2f(uVar9,uVar10);
  glVertex2f(uVar1,uVar2);
  glTexCoord2f(uVar7,uVar8);
  glVertex2f(uVar11,uVar12);
  glTexCoord2f(uVar5,uVar6);
  glVertex2f(uVar3,uVar4);
  glEnd();
  glPopMatrix();
  glMatrixMode(0x1701);
  glPopMatrix();
  return;
}


// ==== FUN_004126b0 @ 004126b0 ====

void __cdecl FUN_004126b0(int param_1,int param_2,char param_3,uint param_4)

{
  int cWeight;
  
  cWeight = 0;
  if (param_3 != '\0') {
    cWeight = 700;
  }
  DAT_0041fcd8 = CreateFontA(param_2,0,0,0,cWeight,param_4 & 0xff,0,0,0,0,0,4,0,
                             (&PTR_s_Arial_0041d544)[param_1]);
  return;
}


// ==== FUN_00412700 @ 00412700 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00412700(LPCSTR param_1,int param_2,int param_3,int param_4,int param_5,int param_6,char param_7
            )

{
  char cVar1;
  HDC pHVar2;
  undefined4 *puVar3;
  HDC hdc;
  HBITMAP hbm;
  HBRUSH hbr;
  uint uVar4;
  int iVar5;
  uint uVar6;
  LPCSTR pCVar7;
  undefined4 *puVar8;
  int cy;
  UINT align;
  RECT local_10;
  
  pHVar2 = GetDC((HWND)0x0);
  pHVar2 = CreateCompatibleDC(pHVar2);
  SelectObject(pHVar2,DAT_0041fcd8);
  SetBkMode(pHVar2,1);
  uVar6 = param_5 * param_6 * 4;
  puVar3 = operator_new(uVar6);
  puVar8 = puVar3;
  for (uVar4 = param_5 * param_6 & 0x3fffffff; uVar4 != 0; uVar4 = uVar4 - 1) {
    *puVar8 = 0;
    puVar8 = puVar8 + 1;
  }
  for (iVar5 = 0; iVar5 != 0; iVar5 = iVar5 + -1) {
    *(undefined1 *)puVar8 = 0;
    puVar8 = (undefined4 *)((int)puVar8 + 1);
  }
  iVar5 = param_5;
  cy = param_6;
  hdc = GetDC((HWND)0x0);
  hbm = CreateCompatibleBitmap(hdc,iVar5,cy);
  SelectObject(pHVar2,hbm);
  SetTextColor(pHVar2,0xffffff);
  if (param_7 == '\0') {
    align = 0;
  }
  else {
    align = 6;
  }
  SetTextAlign(pHVar2,align);
  local_10.right = param_5;
  local_10.left = 0;
  local_10.top = 0;
  local_10.bottom = param_6;
  hbr = CreateSolidBrush(0);
  FillRect(pHVar2,&local_10,hbr);
  uVar4 = 0xffffffff;
  pCVar7 = param_1;
  do {
    if (uVar4 == 0) break;
    uVar4 = uVar4 - 1;
    cVar1 = *pCVar7;
    pCVar7 = pCVar7 + 1;
  } while (cVar1 != '\0');
  TextOutA(pHVar2,param_3,param_4,param_1,~uVar4 - 1);
  puVar8 = &DAT_0041fcb0;
  for (iVar5 = 10; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = 0;
    puVar8 = puVar8 + 1;
  }
  DAT_0041fcb0 = 0x28;
  DAT_0041fcb4 = param_5;
  _DAT_0041fcb8 = param_6;
  _DAT_0041fcbc = 1;
  _DAT_0041fcbe = 0x20;
  _DAT_0041fcc0 = 0;
  DAT_0041fca8 = 0;
  if (0 < param_6) {
    do {
      GetDIBits(pHVar2,hbm,param_6 - DAT_0041fca8,1,puVar3 + DAT_0041fca8 * param_5,
                (LPBITMAPINFO)&DAT_0041fcb0,0);
      DAT_0041fca8 = DAT_0041fca8 + 1;
    } while (DAT_0041fca8 < param_6);
  }
  DAT_0041fca8 = 0;
  if (0 < (int)uVar6) {
    do {
      uVar4 = (uint)*(byte *)(DAT_0041fca8 + (int)puVar3) + (uint)*(byte *)(DAT_0041fca8 + param_2);
      if (0xff < uVar4) {
        uVar4 = 0xff;
      }
      *(char *)(DAT_0041fca8 + param_2) = (char)uVar4;
      DAT_0041fca8 = DAT_0041fca8 + 1;
    } while (DAT_0041fca8 < (int)uVar6);
  }
  operator_delete(puVar3);
  DeleteObject(hbm);
  DeleteDC(pHVar2);
  return;
}


// ==== FUN_004128d0 @ 004128d0 ====

void FUN_004128d0(void)

{
  undefined1 uVar1;
  void *pvVar2;
  int iVar3;
  int iVar4;
  undefined4 *puVar5;
  int iVar6;
  
  DAT_004201a4 = operator_new(0x40000);
  DAT_004201a8 = operator_new(0x40000);
  puVar5 = &DAT_0041fd38;
  do {
    pvVar2 = operator_new(0x40000);
    *puVar5 = pvVar2;
    puVar5 = puVar5 + 1;
  } while ((int)puVar5 < 0x41fd48);
  DAT_0041fd50 = operator_new(0x10000);
  DAT_0041fce0 = operator_new(0x400);
  iVar4 = 0;
  do {
    iVar3 = 0;
    iVar6 = 0;
    do {
      iVar3 = iVar3 + 1;
      *(char *)((int)DAT_0041fd50 + iVar3 + iVar4 * 0x100 + -1) =
           ((char)(iVar6 / 0x7f) + (char)(iVar6 >> 0x1f)) -
           (char)((longlong)iVar6 * 0x81020409 >> 0x3f);
      iVar6 = iVar6 + iVar4;
    } while (iVar3 < 0x100);
    iVar4 = iVar4 + 1;
  } while (iVar4 < 0x80);
  iVar4 = 0x8000;
  do {
    iVar6 = 0;
    do {
      uVar1 = ftol();
      iVar6 = iVar6 + 1;
      *(undefined1 *)((int)DAT_0041fd50 + iVar6 + iVar4 + -1) = uVar1;
    } while (iVar6 < 0x100);
    iVar4 = iVar4 + 0x100;
  } while (iVar4 < 0x10000);
  iVar4 = 0;
  do {
    if (iVar4 < 0x100) {
      *(char *)((int)DAT_0041fce0 + iVar4) = (char)iVar4;
    }
    else {
      *(undefined1 *)((int)DAT_0041fce0 + iVar4) = 0xff;
    }
    iVar4 = iVar4 + 1;
  } while (iVar4 < 0x400);
  DAT_004201ad = 1;
  return;
}


// ==== FUN_00412a20 @ 00412a20 ====

void __cdecl FUN_00412a20(int param_1)

{
  HANDLE hFile;
  int iVar1;
  LPCVOID lpBuffer;
  DWORD local_18;
  undefined1 local_14;
  undefined1 local_13;
  undefined1 local_12;
  undefined1 local_11;
  undefined1 local_10;
  undefined1 local_f;
  undefined1 local_e;
  undefined1 local_d;
  undefined1 local_c;
  undefined1 local_b;
  undefined1 local_a;
  undefined1 local_9;
  undefined1 local_8;
  undefined1 local_7;
  undefined1 local_6;
  undefined1 local_5;
  undefined1 local_4;
  undefined1 local_3;
  
  iVar1 = DAT_004201b0;
  DAT_004201b0 = DAT_004201b0 + 1;
  wsprintfA(&DAT_0041fd54,PTR_s_tex_03i_tga_0041d580,iVar1);
  hFile = CreateFileA(&DAT_0041fd54,0x40000000,0,(LPSECURITY_ATTRIBUTES)0x0,2,0x80,(HANDLE)0x0);
  if (hFile != (HANDLE)0xffffffff) {
    local_14 = 0;
    local_13 = 0;
    local_12 = 2;
    local_11 = 0;
    local_10 = 0;
    local_f = 0;
    local_e = 0;
    local_d = 0;
    local_c = 0;
    local_b = 0;
    local_a = 0;
    local_9 = 0;
    local_8 = 0;
    local_7 = 1;
    local_6 = 0;
    local_5 = 1;
    local_4 = 0x20;
    local_3 = 0;
    WriteFile(hFile,&local_14,0x12,&local_18,(LPOVERLAPPED)0x0);
    iVar1 = 0x100;
    lpBuffer = (LPCVOID)(param_1 + 0x3fc00);
    do {
      WriteFile(hFile,lpBuffer,0x400,&local_18,(LPOVERLAPPED)0x0);
      lpBuffer = (LPCVOID)((int)lpBuffer + -0x400);
      iVar1 = iVar1 + -1;
    } while (iVar1 != 0);
    CloseHandle(hFile);
  }
  return;
}


// ==== FUN_00412b10 @ 00412b10 ====

undefined4 __cdecl FUN_00412b10(int param_1)

{
  HANDLE hFile;
  int iVar1;
  LPVOID lpBuffer;
  DWORD local_4;
  
  wsprintfA(&DAT_0041fce4,PTR_s_tex_03i_tga_0041d580,DAT_004201b0);
  hFile = CreateFileA(&DAT_0041fce4,0x80000000,0,(LPSECURITY_ATTRIBUTES)0x0,3,0x80,(HANDLE)0x0);
  if (hFile == (HANDLE)0xffffffff) {
    return 0xffffff00;
  }
  SetFilePointer(hFile,0x12,(PLONG)0x0,0);
  iVar1 = 0x100;
  lpBuffer = (LPVOID)(param_1 + 0x3fc00);
  do {
    ReadFile(hFile,lpBuffer,0x400,&local_4,(LPOVERLAPPED)0x0);
    lpBuffer = (LPVOID)((int)lpBuffer + -0x400);
    iVar1 = iVar1 + -1;
  } while (iVar1 != 0);
  CloseHandle(hFile);
  DAT_004201b0 = DAT_004201b0 + 1;
  return CONCAT31((int3)((uint)DAT_004201b0 >> 8),1);
}


// ==== FUN_00412bb0 @ 00412bb0 ====

void FUN_00412bb0(void)

{
  undefined4 *puVar1;
  
  DAT_004201ad = 0;
  if (DAT_004201a8 != (void *)0x0) {
    operator_delete(DAT_004201a8);
  }
  if (DAT_004201a4 != (void *)0x0) {
    operator_delete(DAT_004201a4);
  }
  puVar1 = &DAT_0041fd38;
  do {
    if ((void *)*puVar1 != (void *)0x0) {
      operator_delete((void *)*puVar1);
    }
    puVar1 = puVar1 + 1;
  } while ((int)puVar1 < 0x41fd48);
  return;
}


// ==== FUN_00412c00 @ 00412c00 ====

undefined4 * __cdecl FUN_00412c00(int *param_1,undefined4 param_2)

{
  int *piVar1;
  int *piVar2;
  undefined4 *puVar3;
  undefined4 *puVar4;
  int iVar5;
  undefined4 *puVar6;
  int iVar7;
  
  if (DAT_004201ad == '\0') {
    FUN_004128d0();
  }
  DAT_0041fcdc = param_2;
  iVar7 = 0;
  piVar2 = param_1;
  do {
    piVar1 = piVar2 + 1;
    piVar2 = piVar2 + 1;
    iVar7 = iVar7 + 1;
  } while (*piVar1 != 0);
  DAT_0041fd4c = 1;
  DAT_0041fd34 = 1;
  piVar2 = param_1;
  iVar5 = iVar7;
  if (0 < iVar7) {
    do {
      DAT_0041fd4c = DAT_0041fd4c + (uint)*(byte *)(*piVar2 + 3);
      iVar5 = iVar5 + -1;
      piVar2 = piVar2 + 1;
    } while (iVar5 != 0);
  }
  puVar3 = operator_new(iVar7 * 4);
  if (0 < iVar7) {
    puVar6 = puVar3;
    do {
      puVar4 = FUN_00412ca0(*(char **)(((int)param_1 - (int)puVar3) + (int)puVar6));
      *puVar6 = puVar4;
      puVar6 = puVar6 + 1;
      iVar7 = iVar7 + -1;
    } while (iVar7 != 0);
  }
  FUN_00412bb0();
  return puVar3;
}


// ==== FUN_00412ca0 @ 00412ca0 ====

undefined4 * __cdecl FUN_00412ca0(char *param_1)

{
  byte bVar1;
  undefined4 *puVar2;
  undefined4 uVar3;
  byte *pbVar4;
  uint uVar5;
  int iVar6;
  undefined4 *puVar7;
  undefined4 *puVar8;
  int local_8c;
  uint local_88;
  CHAR aCStack_80 [128];
  
  if (DAT_004201ad == '\0') {
    FUN_004128d0();
  }
  puVar2 = operator_new(0x40000);
  if ((param_1 != (char *)0x0) && (puVar2 != (undefined4 *)0x0)) {
    if ((DAT_004201ac != '\0') && (uVar3 = FUN_00412b10((int)puVar2), (char)uVar3 != '\0')) {
      DAT_0041fd34 = DAT_0041fd34 + (uint)(byte)param_1[3];
      if (DAT_0041fcdc != (code *)0x0) {
        (*DAT_0041fcdc)((float)DAT_0041fd34 / (float)DAT_0041fd4c);
      }
      return puVar2;
    }
    FUN_004133e0(DAT_004201a4);
    FUN_004133e0(DAT_004201a8);
    FUN_004133e0(DAT_0041fd38);
    FUN_004133e0(DAT_0041fd3c);
    FUN_004133e0(DAT_0041fd40);
    FUN_004133e0(DAT_0041fd44);
    if (((*param_1 == 'A') && (param_1[1] == 'T')) && (param_1[2] == 'G')) {
      local_88 = (uint)(byte)param_1[3];
      iVar6 = 4;
      if (local_88 != 0) {
        local_8c = 0;
        do {
          pbVar4 = (byte *)(param_1 + local_8c + iVar6);
          uVar5 = (uint)*pbVar4;
          bVar1 = pbVar4[1];
          if (bVar1 < 4) {
            if (uVar5 == 1) {
              FUN_00413a00((uint)bVar1,pbVar4[2],(uint)pbVar4[4],(uint)pbVar4[5],(uint)pbVar4[6],
                           (uint)pbVar4[7]);
            }
            else if (uVar5 == 2) {
              FUN_00413d00((uint)bVar1,pbVar4[8],(uint)pbVar4[2],(uint)pbVar4[3],(uint)pbVar4[4],
                           (uint)pbVar4[5]);
            }
            else if (uVar5 == 3) {
              FUN_00413b00((uint)bVar1,pbVar4[2],(uint)pbVar4[3],(uint)pbVar4[4],(uint)pbVar4[5],
                           (uint)pbVar4[6],(uint)pbVar4[7],(uint)pbVar4[8]);
            }
            else if (uVar5 == 4) {
              FUN_00413df0((uint)bVar1,(uint)pbVar4[2],pbVar4[3]);
            }
            else if (uVar5 == 5) {
              FUN_00413710((uint)bVar1,pbVar4[2],(uint)pbVar4[3],(uint)pbVar4[4],(uint)pbVar4[5],
                           (uint)pbVar4[6],(uint)pbVar4[7]);
            }
            else if (uVar5 == 6) {
              FUN_004133e0((&DAT_0041fd38)[bVar1]);
            }
            else if (uVar5 == 10) {
              FUN_004141b0((uint)bVar1,(uint)pbVar4[2],(uint)pbVar4[3],(uint)pbVar4[4],
                           (uint)pbVar4[5],(uint)pbVar4[6],(uint)pbVar4[7]);
            }
            else if (uVar5 == 0xb) {
              FUN_00414430((uint)bVar1,(uint)pbVar4[2],(uint)pbVar4[3]);
            }
            else if (uVar5 == 0xc) {
              FUN_004142f0((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0xe) {
              FUN_004144b0((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0xf) {
              FUN_00414bf0((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0x11) {
              FUN_00414560((uint)bVar1,(uint)pbVar4[2],pbVar4[3],(uint)pbVar4[4],(uint)pbVar4[5],
                           pbVar4[6],(uint)pbVar4[7]);
            }
            else if (uVar5 == 0x12) {
              FUN_00414dd0((uint)bVar1,(uint)pbVar4[2],pbVar4[3],(uint)pbVar4[4]);
            }
            else if (uVar5 == 0x14) {
              FUN_004146c0((uint)bVar1,pbVar4[2],(uint)pbVar4[3],pbVar4[4]);
            }
            else if (uVar5 == 0x15) {
              FUN_004147e0((uint)bVar1,pbVar4[2]);
            }
            else if (uVar5 == 0x17) {
              FUN_004148d0((uint)bVar1,pbVar4[2],(uint)pbVar4[3],pbVar4[4]);
            }
            else if (uVar5 == 0x18) {
              FUN_00414990((uint)bVar1,(uint)pbVar4[2],(uint)pbVar4[3]);
            }
            else if (uVar5 == 0x19) {
              FUN_00414a30((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0x1a) {
              FUN_00414ab0((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0x1b) {
              FUN_00414b50((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0x1e) {
              FUN_00414fb0((uint)bVar1);
            }
            else if (uVar5 == 0x1f) {
              FUN_00414f80((uint)bVar1);
            }
            else if (uVar5 == 0x20) {
              FUN_00414830((uint)bVar1,(uint)pbVar4[2],pbVar4[3]);
            }
            else if (uVar5 == 0x21) {
              FUN_004150b0((uint)bVar1,(uint)pbVar4[2]);
            }
            else if (uVar5 == 0x22) {
              FUN_00415110((uint)bVar1,pbVar4[2],(uint)pbVar4[3]);
            }
            else if (uVar5 == 0x23) {
              FUN_004151b0((uint)bVar1,pbVar4[2]);
            }
            else if (uVar5 == 0x24) {
              FUN_004155d0((float)(uint)bVar1,(float)(uint)pbVar4[2],(uint)pbVar4[3]);
            }
            else if (uVar5 == 0x25) {
              FUN_004156b0((uint)bVar1,pbVar4[2]);
            }
            else if (uVar5 == 0x26) {
              FUN_004157d0((uint)bVar1);
            }
            else if (uVar5 == 0x27) {
              FUN_00415900((uint)bVar1);
            }
            else if (uVar5 == 0x28) {
              FUN_00413f10((uint)bVar1,(int)(pbVar4 + 9),
                           (uint)CONCAT21(CONCAT11(pbVar4[2],pbVar4[3]),pbVar4[4]),
                           (uint)CONCAT21(CONCAT11(pbVar4[5],pbVar4[6]),pbVar4[7]));
              iVar6 = iVar6 + 0x2000;
            }
            else {
              if (uVar5 != 0x29) goto LAB_0041333c;
              FUN_00413f60((uint)bVar1,(LPCSTR)(pbVar4 + 9),(uint)pbVar4[2],(uint)pbVar4[3],
                           (uint)pbVar4[5],(uint)pbVar4[6],(uint)pbVar4[4],(uint)pbVar4[7]);
              iVar6 = iVar6 + 0x80;
            }
          }
          else {
LAB_0041333c:
            wsprintfA(aCStack_80,s_UNKNOWN_FILTER___i_0041d598,uVar5);
            MessageBoxA((HWND)0x0,aCStack_80,s_error_0041d590,0);
          }
          DAT_0041fd34 = DAT_0041fd34 + 1;
          if (DAT_0041fcdc != (code *)0x0) {
            (*DAT_0041fcdc)((float)DAT_0041fd34 / (float)DAT_0041fd4c);
          }
          local_8c = local_8c + 9;
          local_88 = local_88 - 1;
        } while (local_88 != 0);
      }
      puVar7 = DAT_0041fd38;
      puVar8 = puVar2;
      for (iVar6 = 0x10000; iVar6 != 0; iVar6 = iVar6 + -1) {
        *puVar8 = *puVar7;
        puVar7 = puVar7 + 1;
        puVar8 = puVar8 + 1;
      }
      if (DAT_004201ac != '\0') {
        FUN_00412a20((int)puVar2);
      }
      return puVar2;
    }
  }
  return (undefined4 *)0x0;
}


// ==== FUN_004133e0 @ 004133e0 ====

void __cdecl FUN_004133e0(undefined4 *param_1)

{
  int iVar1;
  
  for (iVar1 = 0x10000; iVar1 != 0; iVar1 = iVar1 + -1) {
    *param_1 = 0;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_004133f0 @ 004133f0 ====

int __cdecl FUN_004133f0(uint param_1)

{
  uint uVar1;
  
  uVar1 = param_1 << 0xd ^ param_1;
  return (int)((uVar1 * uVar1 * 0x3d73 + 0xc0ae5) * (DAT_0041fd48 + uVar1) + 0x5208dd0d) / 0x3047;
}


// ==== FUN_00413440 @ 00413440 ====

float10 __cdecl
FUN_00413440(float param_1,float param_2,float param_3,float param_4,float param_5,float param_6)

{
  float10 fVar1;
  float10 fVar2;
  
  fVar1 = (float10)param_5 / (float10)param_6;
  fVar2 = ((float10)param_4 - (float10)param_3) - ((float10)param_1 - (float10)param_2);
  return ((float10)param_3 - (float10)param_1) * fVar1 +
         fVar1 * fVar1 * fVar1 * fVar2 +
         (((float10)param_1 - (float10)param_2) - fVar2) * fVar1 * fVar1 + (float10)param_2;
}


// ==== FUN_00413490 @ 00413490 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00413490(float *param_1,int param_2,float *param_3)

{
  float fVar1;
  float *pfVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  float *pfVar7;
  float *pfVar8;
  float10 fVar9;
  float *local_1c;
  float *local_18;
  float *local_14;
  float *local_10;
  int local_c;
  
  pfVar2 = param_1;
  fVar1 = (float)param_3 * (float)_DAT_0041abe0;
  local_14 = (float *)0x0;
  for (iVar4 = 0x10000; iVar4 != 0; iVar4 = iVar4 + -1) {
    *param_1 = 0.0;
    param_1 = param_1 + 1;
  }
  param_1 = (float *)0x0;
  param_3 = pfVar2;
  do {
    iVar4 = 0;
    pfVar7 = param_3;
    do {
      uVar5 = (int)local_14 + 1;
      uVar3 = FUN_004133f0((uint)local_14);
      iVar4 = iVar4 + param_2;
      *pfVar7 = (float)(uVar3 & 0xff) * fVar1;
      pfVar7 = pfVar7 + param_2;
      local_14 = (float *)uVar5;
    } while (iVar4 < 0x100);
    param_1 = (float *)((int)param_1 + param_2);
    param_3 = param_3 + param_2 * 0x100;
  } while ((int)param_1 < 0x100);
  iVar4 = 0;
  do {
    uVar3 = 0;
    do {
      if (uVar3 != 0) {
        uVar5 = 0x100U - param_2 & uVar3;
        uVar6 = uVar5 + param_2 & 0xff;
        fVar9 = FUN_00413440(pfVar2[(uVar5 - param_2 & 0xff) + iVar4],pfVar2[uVar5 + iVar4],
                             pfVar2[iVar4 + uVar6],pfVar2[(uVar6 + param_2 & 0xff) + iVar4],
                             (float)(int)(param_2 - 1U & uVar3),(float)param_2);
        pfVar2[iVar4 + uVar3] = (float)fVar9;
      }
      uVar3 = uVar3 + 1;
    } while ((int)uVar3 < 0x100);
    iVar4 = iVar4 + param_2 * 0x100;
  } while (iVar4 < 0x10000);
  local_14 = pfVar2;
  param_1 = (float *)0x0;
  do {
    if (param_1 != (float *)0x0) {
      uVar3 = 0x100U - param_2 & (uint)param_1;
      uVar5 = uVar3 + param_2 & 0xff;
      local_1c = pfVar2 + uVar5 * 0x100;
      local_18 = pfVar2 + (uVar5 + param_2 & 0xff) * 0x100;
      local_10 = local_14;
      pfVar7 = pfVar2 + uVar3 * 0x100;
      pfVar8 = pfVar2 + (uVar3 - param_2 & 0xff) * 0x100;
      local_c = 0x100;
      do {
        fVar9 = FUN_00413440(*pfVar8,*pfVar7,*local_1c,*local_18,
                             (float)(int)(param_2 - 1U & (uint)param_1),(float)param_2);
        *local_10 = (float)fVar9;
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


// ==== FUN_00413710 @ 00413710 ====

void __cdecl
FUN_00413710(int param_1,char param_2,int param_3,int param_4,uint param_5,uint param_6,uint param_7
            )

{
  uint uVar1;
  float *pfVar2;
  int iVar3;
  byte bVar4;
  uint *puVar5;
  
  if (param_3 != 0) {
    DAT_0041fd48 = ((param_4 << 8 | param_5) << 8 | param_6) << 8 | param_7;
    pfVar2 = operator_new(0x40000);
    FUN_00413490(pfVar2,param_3,(float *)0x437f0000);
    bVar4 = ('\x02' - param_2) * '\b';
    param_3 = 0x10000;
    puVar5 = (uint *)(&DAT_0041fd38)[param_1];
    do {
      uVar1 = *puVar5;
      iVar3 = ftol();
      if (iVar3 < 0x100) {
        if (iVar3 < 0) {
          iVar3 = 0;
        }
      }
      else {
        iVar3 = 0xff;
      }
      *puVar5 = iVar3 << (bVar4 & 0x1f) | uVar1 & 0xffffffU - (0xff << (bVar4 & 0x1f));
      param_3 = param_3 + -1;
      puVar5 = puVar5 + 1;
    } while (param_3 != 0);
    operator_delete(pfVar2);
  }
  return;
}


// ==== FUN_004137f0 @ 004137f0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_004137f0(int *param_1,int *param_2)

{
  int *piVar1;
  int *piVar2;
  int iVar3;
  undefined4 uVar4;
  int *piVar5;
  uint uVar6;
  uint uVar7;
  int *piVar8;
  int iVar9;
  uint uVar10;
  uint uVar11;
  int *piVar12;
  undefined4 *puVar13;
  float10 fVar14;
  float10 extraout_ST0;
  int *piStack0000000c;
  uint local_10;
  int local_c;
  
  piVar2 = param_2;
  piVar1 = param_1;
  local_10 = 0;
  for (iVar9 = 0x10000; iVar9 != 0; iVar9 = iVar9 + -1) {
    *param_1 = 0;
    param_1 = param_1 + 1;
  }
  param_1 = (int *)0x0;
  piStack0000000c = piVar1;
  do {
    iVar9 = 0;
    piVar5 = piStack0000000c;
    do {
      uVar10 = local_10 + 1;
      FUN_004133f0(local_10);
      iVar3 = ftol();
      *piVar5 = iVar3 << 0x10;
      iVar9 = iVar9 + (int)param_2;
      piVar5 = piVar5 + (int)param_2;
      local_10 = uVar10;
    } while (iVar9 < 0x100);
    param_1 = (int *)((int)param_1 + (int)param_2);
    piStack0000000c = piStack0000000c + (int)param_2 * 0x100;
  } while ((int)param_1 < 0x100);
  param_1 = (int *)0x0;
  if (0 < (int)param_2) {
    fVar14 = (float10)(int)param_2;
    puVar13 = &DAT_0041fda4;
    do {
      fcos(((float10)(int)param_1 * (float10)_DAT_0041abf0) / fVar14);
      uVar4 = ftol();
      *puVar13 = uVar4;
      param_1 = (int *)((int)param_1 + 1);
      puVar13 = puVar13 + 1;
      fVar14 = extraout_ST0;
    } while ((int)param_1 < (int)param_2);
  }
  iVar3 = 0;
  uVar10 = 0x100 - (int)param_2;
  iVar9 = (int)param_2 * 0x100;
  piVar5 = piVar1;
  do {
    uVar11 = 0;
    param_2 = piVar5;
    do {
      uVar6 = uVar10 & uVar11;
      uVar7 = (int)piVar2 - 1U & uVar11;
      uVar11 = uVar11 + 1;
      *param_2 = ((piVar1[(uVar6 + (int)piVar2 & 0xff) + iVar3] - piVar1[iVar3 + uVar6]) *
                  (&DAT_0041fda4)[uVar7] >> 8) + piVar1[iVar3 + uVar6];
      param_2 = param_2 + 1;
    } while ((int)uVar11 < 0x100);
    iVar3 = iVar3 + iVar9;
    piVar5 = piVar5 + (int)piVar2 * 0x100;
  } while (iVar3 < 0x10000);
  param_2 = piVar1;
  param_1 = (int *)0x0;
  do {
    if (param_1 != (int *)0x0) {
      uVar11 = uVar10 & (uint)param_1;
      local_c = 0x100;
      piVar5 = piVar1 + (uVar11 + (int)piVar2 & 0xff) * 0x100;
      piVar8 = piVar1 + uVar11 * 0x100;
      piVar12 = param_2;
      do {
        iVar9 = *piVar5;
        piVar5 = piVar5 + 1;
        *piVar12 = ((iVar9 - *piVar8) * (&DAT_0041fda4)[(int)piVar2 - 1U & (uint)param_1] >> 8) +
                   *piVar8;
        local_c = local_c + -1;
        piVar8 = piVar8 + 1;
        piVar12 = piVar12 + 1;
      } while (local_c != 0);
    }
    param_1 = (int *)((int)param_1 + 1);
    param_2 = param_2 + 0x100;
  } while ((int)param_1 < 0x100);
  return;
}


// ==== FUN_00413a00 @ 00413a00 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00413a00(int param_1,char param_2,int param_3,uint param_4,uint param_5,uint param_6)

{
  int iVar1;
  int iVar2;
  int iVar3;
  byte bVar4;
  int *piVar5;
  
  iVar1 = (&DAT_0041fd38)[param_1];
  DAT_0041fd48 = ((param_3 << 8 | param_4) << 8 | param_5) << 8 | param_6;
  bVar4 = ('\x02' - param_2) * '\b';
  FUN_004137f0(DAT_004201a4,(int *)0x80);
  piVar5 = (int *)0x40;
  do {
    FUN_004137f0(DAT_004201a8,piVar5);
    iVar2 = 0;
    do {
      *(int *)(iVar2 + (int)DAT_004201a4) =
           *(int *)(iVar2 + (int)DAT_004201a4) + *(int *)(iVar2 + (int)DAT_004201a8);
      iVar2 = iVar2 + 4;
    } while (iVar2 < 0x40000);
    piVar5 = (int *)((int)piVar5 / 2);
  } while (0 < (int)piVar5);
  iVar2 = 0;
  do {
    iVar3 = iVar2 + 4;
    *(uint *)(iVar2 + iVar1) =
         (*(uint *)(iVar2 + (int)DAT_004201a4) >> 0x10) << (bVar4 & 0x1f) |
         0xffffffU - (0xff << (bVar4 & 0x1f)) & *(uint *)(iVar2 + iVar1);
    iVar2 = iVar3;
  } while (iVar3 < 0x40000);
  return;
}


// ==== FUN_00413b00 @ 00413b00 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00413b00(int param_1,char param_2,int param_3,int param_4,int param_5,uint param_6,uint param_7,
            uint param_8)

{
  int iVar1;
  int *piVar2;
  uint *puVar3;
  uint uVar4;
  undefined4 *puVar5;
  undefined4 uVar6;
  int iVar7;
  uint uVar8;
  uint uVar9;
  int iVar10;
  byte bVar11;
  uint *puVar12;
  undefined4 *puVar13;
  uint uVar14;
  uint uVar15;
  int local_c;
  
  puVar5 = operator_new(0x40000);
  local_c = 0;
  puVar13 = puVar5;
  do {
    param_4 = 0;
    do {
      uVar6 = ftol();
      *puVar13 = uVar6;
      param_4 = param_4 + 1;
      puVar13 = puVar13 + 1;
    } while (param_4 < 0x100);
    local_c = local_c + 1;
  } while (local_c < 0x100);
  DAT_0041fd48 = ((param_5 << 8 | param_6) << 8 | param_7) << 8 | param_8;
  iVar10 = 0;
  do {
    iVar7 = iVar10 + 4;
    *(undefined4 *)(iVar10 + DAT_004201a4) = 0xff;
    iVar10 = iVar7;
  } while (iVar7 < 0x40000);
  uVar14 = 0;
  if (0 < param_3) {
    param_4 = param_3;
    do {
      uVar15 = uVar14 + 1;
      uVar8 = FUN_004133f0(uVar14);
      uVar14 = uVar14 + 2;
      uVar9 = FUN_004133f0(uVar15);
      iVar7 = 0;
      uVar15 = (uVar9 & 0xff) - 0x80;
      iVar10 = (uVar9 & 0xff) + 0x80;
      if ((int)uVar15 < iVar10) {
        uVar9 = (uVar8 & 0xff) - 0x80;
        iVar1 = (uVar8 & 0xff) + 0x80;
        do {
          if ((int)uVar9 < iVar1) {
            puVar12 = puVar5 + iVar7;
            iVar7 = iVar7 + (iVar1 - uVar9);
            uVar8 = uVar9;
            do {
              uVar4 = *puVar12;
              puVar12 = puVar12 + 1;
              puVar3 = (uint *)(DAT_004201a4 + ((uVar8 & 0xff) + (uVar15 & 0xff) * 0x100) * 4);
              if (uVar4 < *puVar3) {
                *puVar3 = uVar4;
              }
              uVar8 = uVar8 + 1;
            } while ((int)uVar8 < iVar1);
          }
          uVar15 = uVar15 + 1;
        } while ((int)uVar15 < iVar10);
      }
      param_4 = param_4 + -1;
    } while (param_4 != 0);
  }
  bVar11 = ('\x02' - param_2) * '\b';
  iVar10 = 0;
  do {
    *(uint *)((&DAT_0041fd38)[param_1] + iVar10) =
         *(uint *)((&DAT_0041fd38)[param_1] + iVar10) & 0xffffffU - (0xff << (bVar11 & 0x1f));
    piVar2 = (int *)(iVar10 + DAT_004201a4);
    puVar12 = (uint *)((&DAT_0041fd38)[param_1] + iVar10);
    iVar10 = iVar10 + 4;
    *puVar12 = *puVar12 | *piVar2 << (bVar11 & 0x1f);
  } while (iVar10 < 0x40000);
  operator_delete(puVar5);
  return;
}


// ==== FUN_00413d00 @ 00413d00 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00413d00(int param_1,char param_2,int param_3,int param_4,int param_5,int param_6)

{
  int iVar1;
  int iVar2;
  byte bVar3;
  uint uVar4;
  int iVar5;
  int iVar6;
  float10 fVar7;
  float10 fVar8;
  float10 extraout_ST1;
  
  fVar7 = (float10)param_3;
  iVar1 = (&DAT_0041fd38)[param_1];
  bVar3 = param_2 * -8 + 0x10;
  fVar8 = (float10)param_4;
  iVar6 = 0;
  _param_2 = 0;
  do {
    iVar5 = 0;
    fsin((float10)(_param_2 + param_6) * fVar8 * (float10)_DAT_0041ac08);
    do {
      fsin((float10)(iVar5 + param_5) * fVar7 * (float10)_DAT_0041ac08);
      fVar7 = fVar8;
      iVar2 = ftol();
      iVar6 = iVar6 + 1;
      iVar5 = iVar5 + 1;
      *(int *)(DAT_004201a4 + -4 + iVar6 * 4) = iVar2 << (bVar3 & 0x1f);
      fVar8 = extraout_ST1;
    } while (iVar5 < 0x100);
    _param_2 = _param_2 + 1;
  } while (_param_2 < 0x100);
  iVar6 = 0;
  do {
    iVar5 = iVar6 + 4;
    uVar4 = *(uint *)(iVar6 + iVar1) & 0xffffffU - (0xff << (bVar3 & 0x1f));
    *(uint *)(iVar6 + iVar1) = uVar4;
    *(uint *)(iVar6 + iVar1) = *(uint *)(iVar6 + DAT_004201a4) | uVar4;
    iVar6 = iVar5;
  } while (iVar5 < 0x40000);
  return;
}


// ==== FUN_00413df0 @ 00413df0 ====

void __cdecl FUN_00413df0(int param_1,int param_2,char param_3)

{
  uint uVar1;
  byte bVar2;
  uint *puVar3;
  int iVar4;
  uint *puStack00000010;
  
  puStack00000010 = (uint *)(&DAT_0041fd38)[param_1];
  bVar2 = ('\x02' - param_3) * '\b';
  param_1 = 0;
  do {
    iVar4 = 0;
    puVar3 = puStack00000010;
    puStack00000010 = puStack00000010 + 0x100;
    do {
      uVar1 = ftol();
      if ((int)uVar1 < 0) {
        uVar1 = 0;
      }
      else if (0xff < (int)uVar1) {
        uVar1 = 0xff;
      }
      if (param_2 == 0) {
        *puVar3 = (uVar1 << 8 | uVar1) << 8 | uVar1;
      }
      else if (param_2 == 1) {
        *puVar3 = *puVar3 & 0xffffffU - (0xff << (bVar2 & 0x1f)) | uVar1 << (bVar2 & 0x1f);
      }
      puVar3 = puVar3 + 1;
      iVar4 = iVar4 + 1;
    } while (iVar4 < 0x100);
    param_1 = param_1 + 1;
  } while (param_1 < 0x100);
  return;
}


// ==== FUN_00413f10 @ 00413f10 ====

void __cdecl FUN_00413f10(int param_1,int param_2,undefined4 param_3,undefined4 param_4)

{
  int iVar1;
  undefined4 *puVar2;
  int iVar3;
  byte bVar4;
  undefined4 uVar5;
  int iVar6;
  int iVar7;
  
  iVar1 = (&DAT_0041fd38)[param_1];
  iVar3 = 0;
  iVar7 = 0;
  do {
    puVar2 = (undefined4 *)(iVar1 + iVar3 * 4);
    iVar6 = 8;
    bVar4 = *(byte *)(iVar7 + param_2);
    do {
      uVar5 = param_3;
      if ((bVar4 & 1) != 0) {
        uVar5 = param_4;
      }
      *puVar2 = uVar5;
      iVar3 = iVar3 + 1;
      puVar2 = puVar2 + 1;
      bVar4 = bVar4 >> 1;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
    iVar7 = iVar7 + 1;
  } while (iVar7 < 0x2000);
  return;
}


// ==== FUN_00413f60 @ 00413f60 ====

void __cdecl
FUN_00413f60(int param_1,LPCSTR param_2,int param_3,int param_4,int param_5,int param_6,uint param_7
            ,int param_8)

{
  char cVar1;
  byte *pbVar2;
  undefined4 *puVar3;
  HDC pHVar4;
  HDC hdc;
  HBITMAP hbm;
  HFONT h;
  HBRUSH hbr;
  byte *pbVar5;
  int iVar6;
  uint uVar7;
  undefined4 *puVar8;
  LPCSTR pCVar9;
  DWORD *pDVar10;
  int cy;
  char *local_48 [4];
  RECT local_38;
  DWORD local_28 [3];
  WORD local_1c;
  WORD local_1a;
  DWORD local_18;
  
  puVar3 = DAT_004201a4;
  pbVar2 = (byte *)(&DAT_0041fd38)[param_1];
  puVar8 = DAT_004201a4;
  for (iVar6 = 0x10000; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar8 = 0;
    puVar8 = puVar8 + 1;
  }
  local_48[0] = s_Arial_0041d578;
  local_48[1] = s_Courier_New_0041d56c;
  local_48[2] = s_Times_New_Roman_0041d55c;
  local_48[3] = s_Symbol_0041d554;
  pHVar4 = GetDC((HWND)0x0);
  pHVar4 = CreateCompatibleDC(pHVar4);
  cy = 0x100;
  iVar6 = 0x100;
  hdc = GetDC((HWND)0x0);
  hbm = CreateCompatibleBitmap(hdc,iVar6,cy);
  SelectObject(pHVar4,hbm);
  h = CreateFontA(param_4 * 2,0,0,0,(param_7 & 0xf) * 100,(int)param_7 >> 4,0,0,0,0,0,4,0,
                  local_48[param_3]);
  SelectObject(pHVar4,h);
  SetBkMode(pHVar4,1);
  SetTextColor(pHVar4,0xffffff);
  local_38.right = 0x100;
  local_38.left = 0;
  local_38.top = 0;
  local_38.bottom = 0x100;
  hbr = CreateSolidBrush(0);
  FillRect(pHVar4,&local_38,hbr);
  uVar7 = 0xffffffff;
  pCVar9 = param_2;
  do {
    if (uVar7 == 0) break;
    uVar7 = uVar7 - 1;
    cVar1 = *pCVar9;
    pCVar9 = pCVar9 + 1;
  } while (cVar1 != '\0');
  TextOutA(pHVar4,param_5,param_6,param_2,~uVar7 - 1);
  if (param_8 != 0) {
    uVar7 = 0xffffffff;
    pCVar9 = param_2;
    do {
      if (uVar7 == 0) break;
      uVar7 = uVar7 - 1;
      cVar1 = *pCVar9;
      pCVar9 = pCVar9 + 1;
    } while (cVar1 != '\0');
    TextOutA(pHVar4,param_5 + -0x100,param_6,param_2,~uVar7 - 1);
    uVar7 = 0xffffffff;
    pCVar9 = param_2;
    do {
      if (uVar7 == 0) break;
      uVar7 = uVar7 - 1;
      cVar1 = *pCVar9;
      pCVar9 = pCVar9 + 1;
    } while (cVar1 != '\0');
    TextOutA(pHVar4,param_5 + -0x100,param_6 + -0x100,param_2,~uVar7 - 1);
    uVar7 = 0xffffffff;
    pCVar9 = param_2;
    do {
      if (uVar7 == 0) break;
      uVar7 = uVar7 - 1;
      cVar1 = *pCVar9;
      pCVar9 = pCVar9 + 1;
    } while (cVar1 != '\0');
    TextOutA(pHVar4,param_5,param_6 + -0x100,param_2,~uVar7 - 1);
  }
  pDVar10 = local_28;
  for (iVar6 = 10; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pDVar10 = 0;
    pDVar10 = pDVar10 + 1;
  }
  iVar6 = 0;
  local_28[0] = 0x28;
  local_28[2] = 0x100;
  local_28[1] = 0x100;
  local_1c = 1;
  local_1a = 0x20;
  local_18 = 0;
  puVar8 = puVar3;
  do {
    GetDIBits(pHVar4,hbm,0xff - iVar6,1,puVar8,(LPBITMAPINFO)local_28,0);
    iVar6 = iVar6 + 1;
    puVar8 = puVar8 + 0x100;
  } while (iVar6 < 0x100);
  param_5 = 0x40000;
  pbVar5 = pbVar2;
  do {
    *pbVar5 = *(byte *)((uint)*pbVar5 + DAT_0041fce0 + (uint)pbVar5[(int)puVar3 - (int)pbVar2]);
    param_5 = param_5 + -1;
    pbVar5 = pbVar5 + 1;
  } while (param_5 != 0);
  DeleteObject(h);
  DeleteObject(hbm);
  DeleteDC(pHVar4);
  return;
}


// ==== FUN_004141b0 @ 004141b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_004141b0(int param_1,int param_2,int param_3,int param_4,int param_5,int param_6,int param_7)

{
  undefined4 uVar1;
  float *pfVar2;
  int iVar3;
  int iVar4;
  undefined4 *puVar5;
  undefined4 *puVar6;
  float10 fVar7;
  float local_41c;
  int local_418;
  float local_414;
  float local_400 [256];
  
  puVar6 = (undefined4 *)(&DAT_0041fd38)[param_1];
  iVar3 = 0;
  local_41c = 0.0;
  pfVar2 = local_400;
  do {
    fVar7 = (float10)(int)local_41c;
    local_41c = (float)((int)local_41c + 1);
    fVar7 = (float10)fcos((float10)param_3 * (fVar7 + (float10)param_7) * (float10)_DAT_0041ac08);
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
                          (float10)_DAT_0041ac08);
    do {
      uVar1 = FUN_00415a80((int)puVar6,local_414 + (float)(fVar7 * (float10)param_4),
                           local_41c + *pfVar2);
      local_414 = local_414 + _DAT_0041a418;
      DAT_004201a4[iVar3] = uVar1;
      iVar3 = iVar3 + 1;
      pfVar2 = pfVar2 + 1;
      iVar4 = iVar4 + -1;
    } while (iVar4 != 0);
    local_41c = local_41c + _DAT_0041a418;
    local_418 = local_418 + 1;
  } while (local_418 < 0x100);
  puVar5 = DAT_004201a4;
  for (iVar3 = 0x10000; iVar3 != 0; iVar3 = iVar3 + -1) {
    *puVar6 = *puVar5;
    puVar5 = puVar5 + 1;
    puVar6 = puVar6 + 1;
  }
  return;
}


// ==== FUN_004142f0 @ 004142f0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_004142f0(int param_1,int param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  undefined4 uVar4;
  int iVar5;
  undefined4 *puVar6;
  undefined4 *puVar7;
  float10 fVar8;
  float10 fVar9;
  float local_8;
  
  puVar7 = (undefined4 *)(&DAT_0041fd38)[param_1];
  local_8 = -1.0;
  fVar2 = ((float)param_2 - (float)_DAT_0041ac28) * (float)_DAT_0041ac20;
  if (fVar2 <= _DAT_0041a494) {
    local_8 = 1.0;
  }
  iVar5 = 0;
  param_2 = 0;
  do {
    param_1 = 0;
    fVar3 = (float)param_2 - (float)_DAT_0041ac28;
    do {
      fVar8 = (float10)param_1 - (float10)_DAT_0041ac28;
      fVar1 = (float)SQRT(fVar8 * fVar8 + (float10)(fVar3 * fVar3));
      fVar8 = (float10)fpatan(fVar8,(float10)fVar3);
      if ((float10)_DAT_0041a494 <= (float10)_DAT_0041a824 - (float10)fVar1) {
        fVar9 = (float10)fcos(((float10)_DAT_0041a824 - (float10)fVar1) * (float10)fVar2 *
                              (float10)_DAT_0041ac10);
        fVar9 = fVar9 * (float10)_DAT_0041a828 + (float10)_DAT_0041a828;
      }
      else {
        fVar9 = (float10)_DAT_0041a494;
      }
      fVar8 = (fVar9 * (float10)local_8 + fVar8 * (float10)_DAT_0041ac18) * (float10)_DAT_0041ac08;
      fVar9 = (float10)fcos(fVar8);
      fVar8 = (float10)fsin(fVar8);
      uVar4 = FUN_00415a80((int)puVar7,(float)(fVar8 * (float10)fVar1 + (float10)_DAT_0041a828),
                           (float)(fVar9 * (float10)fVar1 + (float10)_DAT_0041a828));
      DAT_004201a4[iVar5] = uVar4;
      iVar5 = iVar5 + 1;
      param_1 = param_1 + 1;
    } while (param_1 < 0x100);
    param_2 = param_2 + 1;
  } while (param_2 < 0x100);
  puVar6 = DAT_004201a4;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar7 = *puVar6;
    puVar6 = puVar6 + 1;
    puVar7 = puVar7 + 1;
  }
  return;
}


// ==== FUN_00414430 @ 00414430 ====

void __cdecl FUN_00414430(int param_1,int param_2,int param_3)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  
  puVar5 = (undefined4 *)(&DAT_0041fd38)[param_1];
  param_1 = 0;
  do {
    iVar2 = 0;
    iVar3 = param_1 << 10;
    do {
      uVar1 = iVar2 + param_2;
      iVar2 = iVar2 + 1;
      *(undefined4 *)(iVar3 + (int)DAT_004201a4) =
           puVar5[(uVar1 & 0xff) + (param_3 + param_1 & 0xffU) * 0x100];
      iVar3 = iVar3 + 4;
    } while (iVar2 < 0x100);
    param_1 = param_1 + 1;
  } while (param_1 < 0x100);
  puVar4 = DAT_004201a4;
  for (iVar3 = 0x10000; iVar3 != 0; iVar3 = iVar3 + -1) {
    *puVar5 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar5 = puVar5 + 1;
  }
  return;
}


// ==== FUN_004144b0 @ 004144b0 ====

void __cdecl FUN_004144b0(int param_1,int param_2)

{
  uint uVar1;
  uint uVar2;
  int iVar3;
  uint uVar4;
  int iVar5;
  undefined4 *puVar6;
  undefined4 *puVar7;
  
  puVar7 = (undefined4 *)(&DAT_0041fd38)[param_1];
  iVar5 = 0;
  do {
    uVar2 = puVar7[param_2 * 0x101 + iVar5 & 0xffff];
    uVar1 = puVar7[iVar5];
    iVar3 = (uVar2 >> 0x10 & 0xff) - (uVar1 >> 0x10 & 0xff);
    uVar4 = (uVar2 >> 8 & 0xff) - (uVar1 >> 8 & 0xff);
    uVar2 = (uVar2 & 0xff) - (uVar1 & 0xff);
    if (iVar3 < 0) {
      iVar3 = 0;
    }
    if ((int)uVar4 < 0) {
      uVar4 = 0;
    }
    if ((int)uVar2 < 0) {
      uVar2 = 0;
    }
    DAT_004201a4[iVar5] = (iVar3 << 8 | uVar4) << 8 | uVar2;
    iVar5 = iVar5 + 1;
  } while (iVar5 < 0x10000);
  puVar6 = DAT_004201a4;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar7 = *puVar6;
    puVar6 = puVar6 + 1;
    puVar7 = puVar7 + 1;
  }
  return;
}


// ==== FUN_00414560 @ 00414560 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00414560(int param_1,int param_2,char param_3,int param_4,int param_5,char param_6,int param_7)

{
  int iVar1;
  float fVar2;
  float fVar3;
  undefined4 uVar4;
  int iVar5;
  int iVar6;
  uint *puVar7;
  undefined4 *puVar8;
  undefined4 *puVar9;
  
  puVar9 = (undefined4 *)(&DAT_0041fd38)[param_1];
  iVar5 = (&DAT_0041fd38)[param_2];
  iVar1 = (&DAT_0041fd38)[param_5];
  fVar2 = (float)_DAT_0041abe0;
  fVar3 = (float)_DAT_0041abe0;
  iVar6 = 0;
  param_1 = 0;
  do {
    param_2 = 0;
    puVar7 = (uint *)(iVar1 + iVar6 * 4);
    do {
      uVar4 = FUN_00415a80((int)puVar9,
                           (float)(*(uint *)((iVar5 - iVar1) + (int)puVar7) >>
                                   (param_3 * -8 + 0x10U & 0x1f) & 0xff) * (float)param_4 * fVar2 +
                           (float)param_2,
                           (float)(*puVar7 >> (param_6 * -8 + 0x10U & 0x1f) & 0xff) *
                           (float)param_7 * fVar3 + (float)param_1);
      puVar7 = puVar7 + 1;
      DAT_004201a4[iVar6] = uVar4;
      iVar6 = iVar6 + 1;
      param_2 = param_2 + 1;
    } while (param_2 < 0x100);
    param_1 = param_1 + 1;
  } while (param_1 < 0x100);
  puVar8 = DAT_004201a4;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar9 = puVar9 + 1;
  }
  return;
}


// ==== FUN_004146c0 @ 004146c0 ====

void __cdecl FUN_004146c0(int param_1,char param_2,int param_3,char param_4)

{
  uint *puVar1;
  byte bVar2;
  byte bVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  uint uVar7;
  uint *puVar8;
  
  iVar6 = (&DAT_0041fd38)[param_1];
  bVar2 = param_2 * -8 + 0x10;
  bVar3 = param_4 * -8 + 0x10;
  iVar5 = 0;
  do {
    iVar4 = iVar5 + 4;
    *(uint *)(iVar5 + DAT_004201a4) =
         (*(uint *)((&DAT_0041fd38)[param_3] + -4 + iVar4) >> (bVar3 & 0x1f) & 0xff) <<
         (bVar2 & 0x1f);
    iVar5 = iVar4;
  } while (iVar4 < 0x40000);
  iVar5 = 0;
  do {
    iVar4 = iVar5 + 4;
    *(uint *)(iVar5 + DAT_004201a8) =
         (*(uint *)(iVar5 + iVar6) >> (bVar2 & 0x1f) & 0xff) << (bVar3 & 0x1f);
    iVar5 = iVar4;
  } while (iVar4 < 0x40000);
  iVar5 = 0;
  do {
    iVar4 = iVar5 + 4;
    uVar7 = *(uint *)(iVar5 + iVar6) & 0xffffffU - (0xff << (bVar2 & 0x1f));
    *(uint *)(iVar5 + iVar6) = uVar7;
    *(uint *)(iVar5 + iVar6) = *(uint *)(iVar5 + DAT_004201a4) | uVar7;
    iVar5 = iVar4;
  } while (iVar4 < 0x40000);
  iVar6 = 0;
  do {
    *(uint *)((&DAT_0041fd38)[param_3] + iVar6) =
         *(uint *)((&DAT_0041fd38)[param_3] + iVar6) & 0xffffffU - (0xff << (bVar3 & 0x1f));
    puVar8 = (uint *)((&DAT_0041fd38)[param_3] + iVar6);
    puVar1 = (uint *)(iVar6 + DAT_004201a8);
    iVar6 = iVar6 + 4;
    *puVar8 = *puVar8 | *puVar1;
  } while (iVar6 < 0x40000);
  return;
}


// ==== FUN_004147e0 @ 004147e0 ====

void __cdecl FUN_004147e0(int param_1,char param_2)

{
  uint uVar1;
  uint *puVar2;
  int iVar3;
  
  iVar3 = 0x10000;
  puVar2 = (uint *)(&DAT_0041fd38)[param_1];
  do {
    uVar1 = *puVar2 >> (param_2 * -8 + 0x10U & 0x1f) & 0xff;
    iVar3 = iVar3 + -1;
    *puVar2 = (uVar1 << 8 | uVar1) << 8 | uVar1;
    puVar2 = puVar2 + 1;
  } while (iVar3 != 0);
  return;
}


// ==== FUN_00414830 @ 00414830 ====

void __cdecl FUN_00414830(int param_1,int param_2,char param_3)

{
  uint *puVar1;
  int iVar2;
  uint uVar3;
  int iVar4;
  uint *puVar5;
  
  puVar1 = (uint *)(&DAT_0041fd38)[param_1];
  iVar2 = (&DAT_0041fd38)[param_2];
  param_1 = 0x10000;
  puVar5 = puVar1;
  do {
    uVar3 = *puVar5;
    iVar4 = (*(uint *)((iVar2 - (int)puVar1) + (int)puVar5) >> (param_3 * -8 + 0x10U & 0x1f) & 0xff)
            * 0x100;
    *puVar5 = (uint)CONCAT21(CONCAT11(*(undefined1 *)((uVar3 >> 0x10 & 0xff) + iVar4 + DAT_0041fd50)
                                      ,*(undefined1 *)((uVar3 >> 8 & 0xff) + iVar4 + DAT_0041fd50)),
                             *(undefined1 *)((uVar3 & 0xff) + iVar4 + DAT_0041fd50));
    param_1 = param_1 + -1;
    puVar5 = puVar5 + 1;
  } while (param_1 != 0);
  return;
}


// ==== FUN_004148d0 @ 004148d0 ====

void __cdecl FUN_004148d0(int param_1,char param_2,uint param_3,char param_4)

{
  int iVar1;
  byte bVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  
  iVar1 = (&DAT_0041fd38)[param_1];
  bVar2 = param_2 * -8 + 0x10;
  iVar4 = 0;
  do {
    iVar3 = iVar4 + 4;
    *(uint *)(iVar4 + DAT_004201a4) =
         (*(uint *)(iVar4 + (&DAT_0041fd38)[param_3 & 0xff]) >> (param_4 * -8 + 0x10U & 0x1f) & 0xff
         ) << (bVar2 & 0x1f);
    iVar4 = iVar3;
  } while (iVar3 < 0x40000);
  iVar4 = 0;
  do {
    iVar3 = iVar4 + 4;
    uVar5 = *(uint *)(iVar4 + iVar1) & 0xffffffU - (0xff << (bVar2 & 0x1f));
    *(uint *)(iVar4 + iVar1) = uVar5;
    *(uint *)(iVar4 + iVar1) = *(uint *)(iVar4 + DAT_004201a4) | uVar5;
    iVar4 = iVar3;
  } while (iVar3 < 0x40000);
  return;
}


// ==== FUN_00414990 @ 00414990 ====

void __cdecl FUN_00414990(int param_1,int param_2,uint param_3)

{
  byte *pbVar1;
  byte *pbVar2;
  byte *pbVar3;
  int iVar4;
  byte *pbVar5;
  byte *pbVar6;
  int iVar7;
  
  pbVar2 = (byte *)(&DAT_0041fd38)[param_1];
  pbVar6 = (byte *)(&DAT_0041fd38)[param_2];
  iVar7 = (param_3 & 0xfffffffe) * 0x80 + DAT_0041fd50;
  iVar4 = DAT_0041fd50 + (param_3 & 0xfffffffe) * -0x80 + 0x7f00;
  param_1 = 0x10000;
  pbVar3 = pbVar2;
  do {
    *pbVar3 = *(char *)((uint)*pbVar6 + iVar4) + *(char *)((uint)*pbVar2 + iVar7);
    pbVar1 = pbVar2 + 2;
    pbVar5 = pbVar6 + 2;
    pbVar3[1] = *(char *)((uint)pbVar6[1] + iVar4) + *(char *)((uint)pbVar2[1] + iVar7);
    pbVar2 = pbVar2 + 4;
    pbVar6 = pbVar6 + 4;
    pbVar3[2] = *(char *)((uint)*pbVar5 + iVar4) + *(char *)((uint)*pbVar1 + iVar7);
    param_1 = param_1 + -1;
    pbVar3 = pbVar3 + 4;
  } while (param_1 != 0);
  return;
}


// ==== FUN_00414a30 @ 00414a30 ====

void __cdecl FUN_00414a30(int param_1,int param_2)

{
  uint *puVar1;
  int iVar2;
  uint uVar3;
  uint uVar4;
  uint *puVar5;
  
  puVar1 = (uint *)(&DAT_0041fd38)[param_1];
  iVar2 = (&DAT_0041fd38)[param_2];
  param_1 = 0x10000;
  puVar5 = puVar1;
  do {
    uVar3 = *puVar5;
    uVar4 = *(uint *)((iVar2 - (int)puVar1) + (int)puVar5);
    *puVar5 = ((int)((uVar4 >> 8 & 0xff) * (uVar3 >> 8 & 0xff)) >> 8 |
              (((int)uVar4 >> 0x10) * ((int)uVar3 >> 0x10) >> 8) << 8) << 8 |
              (int)((uVar4 & 0xff) * (uVar3 & 0xff)) >> 8;
    param_1 = param_1 + -1;
    puVar5 = puVar5 + 1;
  } while (param_1 != 0);
  return;
}


// ==== FUN_00414ab0 @ 00414ab0 ====

void __cdecl FUN_00414ab0(int param_1,int param_2)

{
  uint *puVar1;
  int iVar2;
  uint uVar3;
  uint uVar4;
  uint uVar5;
  int iVar6;
  uint *puVar7;
  
  puVar1 = (uint *)(&DAT_0041fd38)[param_1];
  iVar2 = (&DAT_0041fd38)[param_2];
  param_1 = 0x10000;
  puVar7 = puVar1;
  do {
    uVar4 = *puVar7;
    uVar3 = *(uint *)((int)puVar7 + (iVar2 - (int)puVar1));
    iVar6 = ((int)uVar3 >> 0x10) + ((int)uVar4 >> 0x10);
    uVar5 = (uVar3 >> 8 & 0xff) + (uVar4 >> 8 & 0xff);
    uVar4 = (uVar3 & 0xff) + (uVar4 & 0xff);
    if (0xff < iVar6) {
      iVar6 = 0xff;
    }
    if (0xff < uVar5) {
      uVar5 = 0xff;
    }
    if (0xff < uVar4) {
      uVar4 = 0xff;
    }
    *puVar7 = (iVar6 << 8 | uVar5) << 8 | uVar4;
    param_1 = param_1 + -1;
    puVar7 = puVar7 + 1;
  } while (param_1 != 0);
  return;
}


// ==== FUN_00414b50 @ 00414b50 ====

void __cdecl FUN_00414b50(int param_1,int param_2)

{
  uint uVar1;
  uint uVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  uint uVar7;
  uint *puVar8;
  
  puVar8 = (uint *)(&DAT_0041fd38)[param_1];
  iVar4 = (&DAT_0041fd38)[param_2] - (int)puVar8;
  param_1 = 0x10000;
  do {
    uVar1 = *puVar8;
    uVar2 = *(uint *)(iVar4 + (int)puVar8);
    uVar5 = uVar1 >> 0x10 & 0xff;
    uVar6 = uVar1 >> 8 & 0xff;
    uVar7 = uVar2 >> 0x10 & 0xff;
    uVar3 = uVar2 >> 8 & 0xff;
    if (uVar7 < uVar5) {
      uVar7 = uVar5;
    }
    if (uVar3 < uVar6) {
      uVar3 = uVar6;
    }
    uVar5 = uVar2 & 0xff;
    if ((uVar2 & 0xff) < (uVar1 & 0xff)) {
      uVar5 = uVar1 & 0xff;
    }
    *puVar8 = (uVar7 << 8 | uVar3) << 8 | uVar5;
    puVar8 = puVar8 + 1;
    param_1 = param_1 + -1;
  } while (param_1 != 0);
  return;
}


// ==== FUN_00414bf0 @ 00414bf0 ====

void __cdecl FUN_00414bf0(int param_1,int param_2)

{
  uint *puVar1;
  uint uVar2;
  uint uVar3;
  uint uVar4;
  uint uVar5;
  uint uVar6;
  bool bVar7;
  uint *puVar8;
  uint *puVar9;
  int iVar10;
  uint uVar11;
  uint *puVar12;
  int local_2c;
  int local_20;
  uint local_10;
  int local_c;
  
  puVar1 = (uint *)(&DAT_0041fd38)[param_1];
  if (0 < param_2) {
    local_c = param_2;
    do {
      local_20 = 0;
      local_10 = 1;
      local_2c = 0;
      puVar12 = puVar1;
      do {
        puVar9 = puVar1 + (local_10 - 2 & 0xff) * 0x100;
        puVar8 = puVar1 + (local_10 & 0xff) * 0x100;
        uVar11 = 1;
        do {
          uVar2 = *puVar9;
          uVar3 = *puVar8;
          uVar4 = puVar1[(uVar11 - 2 & 0xff) + local_2c];
          uVar5 = puVar1[(uVar11 & 0xff) + local_2c];
          uVar6 = *puVar12;
          DAT_004201a4[local_20] =
               ((uVar5 >> 0x10 & 0xff) + (uVar6 >> 0x10 & 0xff) * 4 + (uVar2 >> 0x10 & 0xff) +
                (uVar4 >> 0x10 & 0xff) + (uVar3 >> 0x10 & 0xff)) * 0x2000 & 0xffff00ff |
               ((uVar5 >> 8 & 0xff) + (uVar6 >> 8 & 0xff) * 4 + (uVar2 >> 8 & 0xff) +
                (uVar4 >> 8 & 0xff) + (uVar3 >> 8 & 0xff)) * 0x20 & 0xffffff00 |
               (int)((uVar5 & 0xff) + (uVar6 & 0xff) * 4 + (uVar2 & 0xff) + (uVar4 & 0xff) +
                    (uVar3 & 0xff)) >> 3;
          local_20 = local_20 + 1;
          puVar9 = puVar9 + 1;
          puVar8 = puVar8 + 1;
          puVar12 = puVar12 + 1;
          bVar7 = (int)uVar11 < 0x100;
          uVar11 = uVar11 + 1;
        } while (bVar7);
        local_2c = local_2c + 0x100;
        bVar7 = (int)local_10 < 0x100;
        local_10 = local_10 + 1;
      } while (bVar7);
      local_c = local_c + -1;
      puVar12 = DAT_004201a4;
      puVar8 = puVar1;
      for (iVar10 = 0x10000; iVar10 != 0; iVar10 = iVar10 + -1) {
        *puVar8 = *puVar12;
        puVar12 = puVar12 + 1;
        puVar8 = puVar8 + 1;
      }
    } while (local_c != 0);
  }
  return;
}


// ==== FUN_00414dd0 @ 00414dd0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00414dd0(int param_1,int param_2,char param_3,int param_4)

{
  uint uVar1;
  uint uVar2;
  int iVar3;
  int iVar4;
  undefined4 *puVar5;
  undefined4 *puVar6;
  float10 fVar7;
  int local_18;
  int local_14;
  
  iVar3 = (&DAT_0041fd38)[param_2];
  puVar6 = (undefined4 *)(&DAT_0041fd38)[param_1];
  local_14 = 0;
  local_18 = 0;
  do {
    param_2 = 0;
    do {
      fVar7 = (float10)(*(uint *)(iVar3 + local_14 * 4) >> (('\x02' - param_3) * '\b' & 0x1fU) &
                       0xff) * (float10)_DAT_0041ac08;
      fsin(fVar7);
      fcos(fVar7);
      iVar4 = param_4;
      if (0 < param_4) {
        do {
          ftol();
          ftol();
          iVar4 = iVar4 + -1;
        } while (iVar4 != 0);
      }
      iVar4 = ftol();
      uVar1 = ftol();
      uVar2 = ftol();
      DAT_004201a4[local_14] = (iVar4 << 8 | uVar1) << 8 | uVar2;
      local_14 = local_14 + 1;
      param_2 = param_2 + 1;
    } while (param_2 < 0x100);
    local_18 = local_18 + 1;
  } while (local_18 < 0x100);
  puVar5 = DAT_004201a4;
  for (iVar3 = 0x10000; iVar3 != 0; iVar3 = iVar3 + -1) {
    *puVar6 = *puVar5;
    puVar5 = puVar5 + 1;
    puVar6 = puVar6 + 1;
  }
  FUN_00414bf0(param_1,2);
  return;
}


// ==== FUN_00414f80 @ 00414f80 ====

void __cdecl FUN_00414f80(int param_1)

{
  int iVar1;
  byte *pbVar2;
  
  pbVar2 = (byte *)(&DAT_0041fd38)[param_1];
  iVar1 = 0x10000;
  do {
    *pbVar2 = *pbVar2 ^ 0xff;
    pbVar2 = pbVar2 + 4;
    iVar1 = iVar1 + -1;
  } while (iVar1 != 0);
  return;
}


// ==== FUN_00414fb0 @ 00414fb0 ====

void __cdecl FUN_00414fb0(int param_1)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  uint *puVar5;
  int iStack00000008;
  
  puVar5 = (uint *)(&DAT_0041fd38)[param_1];
  param_1 = 0x10000;
  do {
    uVar1 = *puVar5;
    iStack00000008 = (uVar1 >> 0x10 & 0xff) - 0x80;
    iVar2 = ftol();
    iStack00000008 = (uVar1 >> 8 & 0xff) - 0x80;
    iVar3 = ftol();
    iStack00000008 = (uVar1 & 0xff) - 0x80;
    iVar4 = ftol();
    if (0x7f < iVar2) {
      iVar2 = 0x7f;
    }
    if (0x7f < iVar3) {
      iVar3 = 0x7f;
    }
    if (0x7f < iVar4) {
      iVar4 = 0x7f;
    }
    if (iVar2 < -0x7f) {
      iVar2 = -0x7f;
    }
    if (iVar3 < -0x7f) {
      iVar3 = -0x7f;
    }
    if (iVar4 < -0x7f) {
      iVar4 = -0x7f;
    }
    *puVar5 = (iVar3 + 0x80) * 0x100 | (iVar2 + 0x80) * 0x10000 | iVar4 + 0x80U;
    puVar5 = puVar5 + 1;
    param_1 = param_1 + -1;
  } while (param_1 != 0);
  return;
}


// ==== FUN_004150b0 @ 004150b0 ====

void __cdecl FUN_004150b0(int param_1,int param_2)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  uint *puVar4;
  
  iVar2 = 0x10000;
  iVar3 = param_2 * 0x100;
  puVar4 = (uint *)(&DAT_0041fd38)[param_1];
  do {
    uVar1 = *puVar4;
    iVar2 = iVar2 + -1;
    *puVar4 = (uint)CONCAT21(CONCAT11(*(undefined1 *)((uVar1 >> 0x10 & 0xff) + DAT_0041fd50 + iVar3)
                                      ,*(undefined1 *)((uVar1 >> 8 & 0xff) + DAT_0041fd50 + iVar3)),
                             *(undefined1 *)((uVar1 & 0xff) + DAT_0041fd50 + iVar3));
    puVar4 = puVar4 + 1;
  } while (iVar2 != 0);
  return;
}


// ==== FUN_00415110 @ 00415110 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00415110(int param_1,char param_2,int param_3)

{
  undefined4 *puVar1;
  uint uVar2;
  int iVar3;
  byte bVar4;
  uint *puVar5;
  float10 fVar6;
  float10 extraout_ST0;
  
  bVar4 = param_2 * -8 + 0x10;
  puVar1 = &DAT_0041fd38 + param_1;
  param_1 = 0x10000;
  fVar6 = (float10)param_3 * (float10)_DAT_0041ab48 * (float10)_DAT_0041abe0;
  puVar5 = (uint *)*puVar1;
  do {
    uVar2 = *puVar5;
    fcos((float10)(uVar2 >> (bVar4 & 0x1f) & 0xff) * fVar6);
    iVar3 = ftol();
    *puVar5 = uVar2 & 0xffffffU - (0xff << (bVar4 & 0x1f)) | iVar3 << (bVar4 & 0x1f);
    param_1 = param_1 + -1;
    puVar5 = puVar5 + 1;
    fVar6 = extraout_ST0;
  } while (param_1 != 0);
  return;
}


// ==== FUN_004151b0 @ 004151b0 ====

void __cdecl FUN_004151b0(int param_1,char param_2)

{
  uint uVar1;
  int iVar2;
  byte bVar3;
  uint *puVar4;
  int iStack0000000c;
  
  bVar3 = param_2 * -8 + 0x10;
  iStack0000000c = 0x10000;
  puVar4 = (uint *)(&DAT_0041fd38)[param_1];
  do {
    uVar1 = *puVar4;
    iVar2 = ftol();
    *puVar4 = iVar2 << (bVar3 & 0x1f) | uVar1 & 0xffffffU - (0xff << (bVar3 & 0x1f));
    iStack0000000c = iStack0000000c + -1;
    puVar4 = puVar4 + 1;
  } while (iStack0000000c != 0);
  return;
}


// ==== FUN_00415260 @ 00415260 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

uint __cdecl FUN_00415260(float param_1,float param_2,float param_3)

{
  float fVar1;
  undefined4 uVar2;
  int iVar3;
  uint uVar4;
  uint uVar5;
  undefined4 unaff_ESI;
  undefined4 unaff_EDI;
  double dVar6;
  undefined8 uVar7;
  
  if (param_2 != (float)_DAT_0041a408) {
    if ((float)_DAT_0041ac30 <= param_1) {
      do {
        param_1 = param_1 - (float)_DAT_0041ac30;
      } while ((float)_DAT_0041ac30 <= param_1);
    }
    if (param_1 < (float)_DAT_0041a408) {
      do {
        param_1 = param_1 + (float)_DAT_0041ac30;
      } while (param_1 < (float)_DAT_0041a408);
    }
    fVar1 = (float)_DAT_0041a9b0;
    dVar6 = floor((double)(param_1 * fVar1));
    uVar2 = ftol(((float)_DAT_0041a310 - param_2) * param_3,
                 ((float)_DAT_0041a310 - (param_1 * fVar1 - (float)dVar6) * param_2) * param_3);
    switch(uVar2) {
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
  uVar7 = CONCAT44(unaff_ESI,unaff_EDI);
  iVar3 = ftol();
  uVar4 = ftol(uVar7);
  uVar5 = ftol();
  if (0xff < iVar3) {
    iVar3 = 0xff;
  }
  if (0xff < (int)uVar4) {
    uVar4 = 0xff;
  }
  if (0xff < (int)uVar5) {
    uVar5 = 0xff;
  }
  return (iVar3 << 8 | uVar4) << 8 | uVar5;
}


// ==== FUN_00415440 @ 00415440 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00415440(float param_1,float param_2,float param_3,float *param_4,float *param_5,float *param_6)

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
  fVar3 = (float)_DAT_0041a408;
  *param_5 = 0.0;
  if (fVar2 != fVar3) {
    *param_5 = (fVar2 - fVar1) / fVar2;
  }
  if (*param_5 == (float)_DAT_0041a408) {
    *param_4 = -1.0;
    return;
  }
  fVar1 = fVar2 - fVar1;
  if (param_1 == fVar2) {
    fVar1 = ((fVar2 - param_3) - (fVar2 - param_2)) / fVar1;
  }
  else if (param_2 == fVar2) {
    fVar1 = ((fVar2 - param_1) - (fVar2 - param_3)) / fVar1 + (float)_DAT_0041a990;
  }
  else {
    if (param_3 != fVar2) goto LAB_00415574;
    fVar1 = ((fVar2 - param_2) - (fVar2 - param_1)) / fVar1 + (float)_DAT_0041a4e8;
  }
  *param_4 = fVar1;
LAB_00415574:
  fVar2 = *param_4;
  fVar1 = (float)_DAT_0041a848;
  *param_4 = fVar2 * fVar1;
  if (fVar2 * fVar1 < (float)_DAT_0041a408) {
    do {
      fVar2 = *param_4;
      fVar1 = (float)_DAT_0041ac30;
      *param_4 = fVar2 + fVar1;
    } while (fVar2 + fVar1 < (float)_DAT_0041a408);
  }
  if ((float)_DAT_0041ac30 <= *param_4) {
    do {
      fVar2 = *param_4;
      fVar1 = (float)_DAT_0041ac30;
      *param_4 = fVar2 - fVar1;
    } while ((float)_DAT_0041ac30 <= fVar2 - fVar1);
  }
  return;
}


// ==== FUN_004155d0 @ 004155d0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_004155d0(float param_1,float param_2,uint param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  uint uVar5;
  uint *puVar6;
  int iVar7;
  float local_4;
  
  fVar2 = (float)(int)param_2;
  puVar6 = (uint *)(&DAT_0041fd38)[(int)param_1];
  fVar1 = (float)_DAT_0041ac40;
  param_1 = (float)(0xff - param_3);
  iVar7 = 0x10000;
  fVar4 = (float)(int)param_1;
  fVar3 = (float)_DAT_0041ac38;
  do {
    uVar5 = *puVar6;
    param_3 = uVar5 >> 0x10 & 0xff;
    FUN_00415440((float)param_3,(float)(uVar5 >> 8 & 0xff),(float)(uVar5 & 0xff),&param_2,&param_1,
                 &local_4);
    param_2 = param_2 + fVar2 * fVar1;
    param_1 = param_1 * fVar4 * fVar3;
    uVar5 = FUN_00415260(param_2,param_1,local_4);
    *puVar6 = uVar5;
    puVar6 = puVar6 + 1;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  return;
}


// ==== FUN_004156b0 @ 004156b0 ====

void __cdecl FUN_004156b0(int param_1,char param_2)

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
    iVar2 = ftol();
    uVar3 = ftol();
    uVar4 = ftol();
    iVar6 = iVar6 + 1;
    *puVar5 = (iVar2 << 8 | uVar3) << 8 | uVar4;
    puVar5 = puVar5 + 1;
  } while (iVar6 < 0x100);
  iVar6 = 0;
  do {
    puVar5 = (uint *)((&DAT_0041fd38)[param_1] + iVar6);
    puVar1 = (uint *)((&DAT_0041fd38)[param_1] + iVar6);
    iVar6 = iVar6 + 4;
    *puVar1 = local_400[*puVar5 >> (('\x02' - param_2) * '\b' & 0x1fU) & 0xff];
  } while (iVar6 < 0x40000);
  return;
}


// ==== FUN_004157d0 @ 004157d0 ====

void __cdecl FUN_004157d0(int param_1)

{
  int iVar1;
  uint uVar2;
  uint uVar3;
  uint *puVar4;
  int iStack0000000c;
  
  puVar4 = (uint *)(&DAT_0041fd38)[param_1];
  iStack0000000c = 0x10000;
  do {
    iVar1 = ftol();
    uVar2 = ftol();
    uVar3 = ftol();
    *puVar4 = (iVar1 << 8 | uVar2) << 8 | uVar3;
    puVar4 = puVar4 + 1;
    iStack0000000c = iStack0000000c + -1;
  } while (iStack0000000c != 0);
  return;
}


// ==== FUN_00415900 @ 00415900 ====

void __cdecl FUN_00415900(int param_1)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  undefined4 *puVar6;
  undefined4 *puVar7;
  char local_20 [4];
  int local_1c;
  int local_18;
  int local_14;
  int local_10;
  int local_c;
  int local_8;
  int local_4;
  
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
      local_4 = (&DAT_0041fd38)[param_1];
      do {
        uVar1 = local_1c - 1;
        do {
          iVar4 = (int)local_20[uVar1 + local_c];
          uVar5 = *(uint *)((&DAT_0041fd38)[param_1] +
                           ((uVar1 & 0xff) + (local_18 + -1 + local_10 & 0xffU) * 0x100) * 4);
          iVar3 = iVar3 + (uVar5 >> 0x10) * iVar4;
          iVar2 = iVar2 + (uVar5 >> 8 & 0xff) * iVar4;
          local_14 = local_14 + (uVar5 & 0xff) * iVar4;
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
      DAT_004201a4[iVar2] = (iVar3 << 8 | uVar1) << 8 | uVar5;
    } while (-0xff < local_c);
    local_8 = local_8 + 0x100;
    local_18 = local_18 + 1;
  } while (local_8 < 0x10000);
  puVar6 = DAT_004201a4;
  puVar7 = (undefined4 *)(&DAT_0041fd38)[param_1];
  for (iVar2 = 0x10000; iVar2 != 0; iVar2 = iVar2 + -1) {
    *puVar7 = *puVar6;
    puVar6 = puVar6 + 1;
    puVar7 = puVar7 + 1;
  }
  return;
}


// ==== FUN_00415a80 @ 00415a80 ====

undefined4 __cdecl FUN_00415a80(int param_1,float param_2,float param_3)

{
  undefined4 uVar1;
  undefined4 uVar2;
  undefined4 uVar3;
  undefined4 uVar4;
  int iVar5;
  int iVar6;
  uint uVar7;
  uint uVar8;
  uint uVar9;
  uint uVar10;
  short sVar11;
  unkbyte10 in_ST0;
  short sVar12;
  unkbyte10 in_ST1;
  short sVar15;
  short sVar16;
  short sVar17;
  unkbyte10 in_ST2;
  unkbyte10 Var13;
  short sVar18;
  short sVar19;
  ushort uVar20;
  unkbyte10 in_ST4;
  unkbyte10 in_ST5;
  ushort uVar21;
  ushort uVar22;
  ushort uVar23;
  ushort uVar24;
  ushort uVar25;
  ushort uVar26;
  ushort uVar27;
  unkbyte10 Var14;
  
  iVar5 = ((int)ROUND(param_2 * 256.0) & 0xffU) * 0x10101;
  iVar6 = ((int)ROUND(param_3 * 256.0) & 0xffU) * 0x10101;
  uVar10 = (int)ROUND(param_3 * 256.0) & 0xff00;
  uVar8 = ((int)ROUND(param_2 * 256.0) & 0xff00U) >> 8;
  uVar1 = *(undefined4 *)(param_1 + (uVar8 + uVar10) * 4);
  uVar7 = CONCAT31((uint3)(ushort)((unkuint10)in_ST4 >> 0x40) << 8,(char)((uint)uVar1 >> 0x18));
  uVar9 = uVar8 + 1 & 0xff;
  uVar2 = *(undefined4 *)(param_1 + (uVar9 + uVar10) * 4);
  uVar25 = (ushort)((unkuint10)in_ST5 >> 0x40);
  uVar10 = uVar10 + 0x100 & 0xff00;
  uVar3 = *(undefined4 *)(param_1 + (uVar9 + uVar10) * 4);
  uVar4 = *(undefined4 *)(param_1 + (uVar8 + uVar10) * 4);
  uVar8 = CONCAT31((uint3)(ushort)((unkuint10)in_ST0 >> 0x40) << 8,(char)((uint)iVar5 >> 0x18));
  uVar21 = (ushort)(byte)iVar5;
  Var14 = CONCAT37((int3)(((unkuint10)(ushort)((unkuint10)in_ST2 >> 0x40) << 0x40) >> 0x38),
                   0xff0000ffffffff);
  Var13 = CONCAT55((int5)(((unkuint10)(uint)((unkuint10)Var14 >> 0x30) << 0x30) >> 0x28),
                   0xffffffffff);
  uVar9 = CONCAT31((uint3)(ushort)((unkuint10)in_ST1 >> 0x40) << 8,(char)((uint)iVar6 >> 0x18));
  uVar23 = (ushort)(byte)iVar6;
  uVar22 = (ushort)(byte)((uint)iVar5 >> 8);
  sVar18 = (short)(CONCAT73((int7)(((unkuint10)(uint6)((unkuint10)Var13 >> 0x20) << 0x20) >> 0x18),
                            0xffffff) >> 0x10);
  sVar15 = sVar18 - uVar22;
  sVar11 = (short)(CONCAT55((uint5)uVar8 << 8,CONCAT14((char)((uint)iVar5 >> 0x10),iVar5)) >> 0x20);
  sVar19 = (short)((unkuint10)Var13 >> 0x20);
  sVar16 = sVar19 - sVar11;
  sVar17 = (short)((unkuint10)Var14 >> 0x30);
  uVar24 = (ushort)(byte)((uint)iVar6 >> 8);
  sVar18 = sVar18 - uVar24;
  sVar12 = (short)(CONCAT55((uint5)uVar9 << 8,CONCAT14((char)((uint)iVar6 >> 0x10),iVar6)) >> 0x20);
  sVar19 = sVar19 - sVar12;
  uVar20 = ((ushort)((short)uVar7 * (sVar17 - (short)uVar8)) >> 8) * (sVar17 - (short)uVar9);
  uVar21 = ((ushort)((byte)uVar3 * uVar21) >> 8) * uVar23 +
           ((ushort)((byte)uVar4 * uVar23) >> 8) * (0xff - uVar21) +
           ((ushort)((byte)uVar2 * uVar21) >> 8) * (0xff - uVar23) +
           ((ushort)((ushort)(byte)uVar1 * (0xff - uVar21)) >> 8) * (0xff - uVar23);
  uVar23 = ((ushort)((byte)((uint)uVar3 >> 8) * uVar22) >> 8) * uVar24 +
           ((ushort)((byte)((uint)uVar4 >> 8) * uVar24) >> 8) * sVar15 +
           ((ushort)((byte)((uint)uVar2 >> 8) * uVar22) >> 8) * sVar18 +
           ((ushort)((ushort)(byte)((uint)uVar1 >> 8) * sVar15) >> 8) * sVar18;
  uVar25 = ((ushort)((short)(CONCAT55((uint5)uVar25 << 0x18,
                                      CONCAT14((char)((uint)uVar3 >> 0x10),uVar3)) >> 0x20) * sVar11
                    ) >> 8) * sVar12 +
           ((ushort)((short)(CONCAT55((uint5)uVar25 << 0x18,
                                      CONCAT14((char)((uint)uVar4 >> 0x10),uVar4)) >> 0x20) * sVar12
                    ) >> 8) * sVar16 +
           ((ushort)((short)(CONCAT55((uint5)uVar25 << 0x18,
                                      CONCAT14((char)((uint)uVar2 >> 0x10),uVar2)) >> 0x20) * sVar11
                    ) >> 8) * sVar19 +
           ((ushort)((short)(CONCAT55((uint5)uVar7 << 8,CONCAT14((char)((uint)uVar1 >> 0x10),uVar1))
                            >> 0x20) * sVar16) >> 8) * sVar19;
  uVar22 = uVar21 >> 8;
  uVar24 = uVar23 >> 8;
  uVar26 = uVar25 >> 8;
  uVar27 = uVar20 >> 8;
  return CONCAT13((uVar27 != 0) * (uVar27 < 0x100) * (char)(uVar20 >> 8) - (0xff < uVar27),
                  CONCAT12((uVar26 != 0) * (uVar26 < 0x100) * (char)(uVar25 >> 8) - (0xff < uVar26),
                           CONCAT11((uVar24 != 0) * (uVar24 < 0x100) * (char)(uVar23 >> 8) -
                                    (0xff < uVar24),
                                    (uVar22 != 0) * (uVar22 < 0x100) * (char)(uVar21 >> 8) -
                                    (0xff < uVar22))));
}


// ==== FUN_00415b90 @ 00415b90 ====

undefined4 __cdecl FUN_00415b90(uint param_1)

{
  LPCSTR lpName;
  HMODULE hModule;
  HRSRC hResInfo;
  HGLOBAL hResData;
  void *this;
  undefined4 *puVar1;
  undefined4 uVar2;
  LPCSTR lpType;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041927b;
  local_c = ExceptionList;
  lpName = (LPCSTR)(param_1 & 0xffff);
  lpType = (LPCSTR)0xa;
  ExceptionList = &local_c;
  hModule = GetModuleHandleA((LPCSTR)0x0);
  hResInfo = FindResourceA(hModule,lpName,lpType);
  hResData = LoadResource((HMODULE)0x0,hResInfo);
  this = operator_new(0x10);
  local_4 = 0;
  if (this != (void *)0x0) {
    puVar1 = LockResource(hResData);
    uVar2 = FUN_00415c20(this,puVar1);
    ExceptionList = local_c;
    return uVar2;
  }
  ExceptionList = local_c;
  return 0;
}


// ==== FUN_00415c20 @ 00415c20 ====

void __thiscall FUN_00415c20(void *this,undefined4 *param_1)

{
  *(undefined4 *)((int)this + 8) = 0;
  *(undefined1 *)this = 1;
  if (param_1 != (undefined4 *)0x0) {
    *(undefined4 *)((int)this + 4) = *param_1;
    *(undefined4 **)((int)this + 0xc) = param_1 + 1;
    *(undefined4 **)((int)this + 8) = param_1 + *(int *)((int)this + 4) * 0x22 + 1;
  }
  return;
}


// ==== FUN_00415c60 @ 00415c60 ====

void __thiscall FUN_00415c60(void *this,undefined4 *param_1,LPCSTR param_2)

{
  bool bVar1;
  HANDLE hFile;
  int iVar2;
  int iVar3;
  DWORD nNumberOfBytesToRead;
  void *lpBuffer;
  DWORD local_104;
  CHAR local_100 [256];
  
  nNumberOfBytesToRead = 0;
  lpBuffer = (void *)0x0;
  bVar1 = false;
  if (*(char *)this != '\0') {
    hFile = CreateFileA(param_2,0x80000000,0,(LPSECURITY_ATTRIBUTES)0x0,3,0x80,(HANDLE)0x0);
    if (hFile != (HANDLE)0xffffffff) {
      nNumberOfBytesToRead = GetFileSize(hFile,&local_104);
      lpBuffer = operator_new(nNumberOfBytesToRead + 0x20);
      ReadFile(hFile,lpBuffer,nNumberOfBytesToRead,&local_104,(LPOVERLAPPED)0x0);
      CloseHandle(hFile);
      bVar1 = true;
    }
  }
  iVar3 = 0;
  if ((*(int *)((int)this + 8) != 0) && (local_104 = 0, 0 < *(int *)((int)this + 4))) {
    do {
      if (bVar1) goto LAB_00415d69;
      iVar2 = _stricmp(param_2,(char *)(*(int *)((int)this + 0xc) + iVar3));
      if (iVar2 == 0) {
        bVar1 = true;
        iVar2 = *(int *)((int)this + 0xc) + iVar3;
        nNumberOfBytesToRead = *(DWORD *)(iVar2 + 0x80);
        lpBuffer = (void *)(*(int *)(iVar2 + 0x84) + *(int *)((int)this + 8));
      }
      local_104 = local_104 + 1;
      iVar3 = iVar3 + 0x88;
    } while ((int)local_104 < *(int *)((int)this + 4));
  }
  if (!bVar1) {
    wsprintfA(local_100,s_file__s_not_found_0041d5ac,param_2);
    FUN_004118c0(local_100);
  }
LAB_00415d69:
  *param_1 = lpBuffer;
  param_1[1] = nNumberOfBytesToRead;
  param_1[2] = 0;
  return;
}


// ==== FUN_00415d90 @ 00415d90 ====

void FUN_00415d90(int *param_1,undefined4 *param_2,uint param_3)

{
  uint uVar1;
  undefined4 *puVar2;
  
  uVar1 = param_1[1] - param_1[2];
  if (uVar1 < param_3) {
    param_3 = uVar1;
  }
  puVar2 = (undefined4 *)(*param_1 + param_1[2]);
  for (uVar1 = param_3 >> 2; uVar1 != 0; uVar1 = uVar1 - 1) {
    *param_2 = *puVar2;
    puVar2 = puVar2 + 1;
    param_2 = param_2 + 1;
  }
  for (uVar1 = param_3 & 3; uVar1 != 0; uVar1 = uVar1 - 1) {
    *(undefined1 *)param_2 = *(undefined1 *)puVar2;
    puVar2 = (undefined4 *)((int)puVar2 + 1);
    param_2 = (undefined4 *)((int)param_2 + 1);
  }
  param_1[2] = param_1[2] + param_3;
  return;
}


// ==== FUN_00415dd0 @ 00415dd0 ====

undefined4 FUN_00415dd0(undefined4 *param_1)

{
  undefined4 extraout_EAX;
  
  operator_delete((void *)*param_1);
  operator_delete(param_1);
  return CONCAT31((int3)((uint)extraout_EAX >> 8),1);
}


// ==== FUN_00415df0 @ 00415df0 ====

void __cdecl FUN_00415df0(undefined4 param_1,uint param_2)

{
  uint uVar1;
  
  uVar1 = param_2 & 0xff;
  (&DAT_004201b8)[uVar1] = param_1;
  if (DAT_00441ef0 <= uVar1) {
    DAT_00441ef0 = uVar1;
  }
  return;
}


// ==== FUN_00415e20 @ 00415e20 ====

void __cdecl FUN_00415e20(undefined4 param_1,undefined4 param_2)

{
  int iVar1;
  
  iVar1 = DAT_00441edc * 0x10;
  *(undefined4 *)(&DAT_004206c0 + iVar1) = param_1;
  *(undefined4 *)(&DAT_004206c4 + iVar1) = param_2;
  *(undefined4 *)(&DAT_004206c8 + iVar1) = 0xffffffff;
  (&DAT_004206cc)[iVar1] = 0;
  DAT_00441edc = DAT_00441edc + 1;
  return;
}


// ==== FUN_00415e60 @ 00415e60 ====

void __cdecl FUN_00415e60(int *param_1)

{
  char cVar1;
  uint uVar2;
  int iVar3;
  int *piVar4;
  
  piVar4 = param_1 + 1;
  for (iVar3 = *param_1; iVar3 != 0; iVar3 = iVar3 + -1) {
    FUN_00415e20(*piVar4,piVar4[1]);
    piVar4 = piVar4 + 2;
  }
  uVar2 = 0;
  piVar4 = &DAT_004201b8;
  do {
    if (((int *)*piVar4 != (int *)0x0) &&
       (cVar1 = (**(code **)(*(int *)*piVar4 + 4))(), cVar1 == '\0')) {
      wsprintfA(&DAT_004205c0,s_error_initializing_effect___d__0041d5c0,uVar2);
      FUN_004118c0(&DAT_004205c0);
    }
    uVar2 = uVar2 + 1;
    piVar4 = piVar4 + 1;
  } while (uVar2 <= DAT_00441ef0);
  return;
}


// ==== FUN_00415ed0 @ 00415ed0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00415ed0(void)

{
  undefined4 uVar1;
  undefined4 uVar2;
  bool bVar3;
  uint uVar4;
  uint uVar5;
  uint uVar6;
  undefined4 *puVar7;
  int iVar8;
  uint uVar9;
  undefined4 *puVar10;
  int iVar11;
  uint uVar12;
  byte *pbVar13;
  int *piVar14;
  undefined4 *puVar15;
  int iVar16;
  int local_18;
  uint *local_14;
  uint *local_10;
  uint local_c;
  
  DAT_00441eec = &DAT_00440ed8;
  DAT_00441ee8 = &DAT_004416d8;
  local_18 = 0;
  puVar10 = &DAT_00440ed8;
  puVar15 = &DAT_004416d8;
  for (iVar8 = 0x200; uVar4 = 0, iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  do {
    uVar5 = uVar4 + 8;
    *(undefined4 *)(uVar4 + 4 + (int)DAT_00441eec) = 0;
    uVar4 = uVar5;
  } while (uVar5 < 0x800);
  iVar8 = FUN_004119d0();
  FUN_00409500((undefined1 *)&DAT_00441ee0,(undefined1 *)&DAT_004406c0);
  local_c = 0;
  if (DAT_00441edc != 0) {
    local_14 = &DAT_004406dc;
    local_10 = &DAT_004406d8;
    pbVar13 = &DAT_004206c6;
    do {
      uVar4 = (uint)pbVar13[-6];
      if (((int *)(&DAT_004201b8)[uVar4] != (int *)0x0) || (pbVar13[-6] == 0xff)) {
        uVar5 = (uint)pbVar13[-4];
        DAT_004406d0 = (uint)pbVar13[-3];
        DAT_00441ed8 = (uint)pbVar13[-1];
        uVar9 = (uint)pbVar13[-2];
        uVar6 = (uint)*pbVar13;
        DAT_004205bc = uVar5;
        DAT_004406cc = uVar9;
        _DAT_00441ee4 = uVar6;
        switch(pbVar13[-5]) {
        case 0x12:
          if ((uVar5 <= (DAT_00441ee0 & 0xff)) &&
             ((DAT_004406d0 <= (DAT_004406c0 & 0xff) || (uVar5 < (DAT_00441ee0 & 0xff))))) {
            FUN_00411900();
          }
          break;
        case 0xfb:
          if (uVar5 == (DAT_004406c8 & 0xff)) {
            if (DAT_00441ee8[uVar6 * 2 + 1] == uVar4) {
              DAT_00441eec[uVar6 * 2 + 1] = uVar4;
            }
            uVar9 = DAT_004406cc;
            uVar5 = DAT_004205bc;
            uVar4 = (uint)pbVar13[-6];
            uVar6 = (uint)*pbVar13;
            *local_10 = uVar4;
            *local_14 = uVar6;
            local_10 = local_10 + 2;
            local_18 = local_18 + 1;
            local_14 = local_14 + 2;
          }
        case 0xfe:
          bVar3 = false;
          uVar12 = DAT_00441ee0 & 0xff;
          if (((uVar5 <= uVar12) && (bVar3 = uVar12 <= uVar9, uVar12 == uVar5)) &&
             ((DAT_004406c0 & 0xff) < DAT_004406d0)) {
            bVar3 = false;
          }
          if (((uVar12 != uVar9) || ((DAT_004406c0 & 0xff) < DAT_00441ed8)) && (bVar3)) {
            if (DAT_00441ee8[uVar6 * 2 + 1] == uVar4) {
              DAT_00441eec[uVar6 * 2 + 1] = uVar4;
            }
            *local_10 = (uint)pbVar13[-6];
            local_18 = local_18 + 1;
            *local_14 = (uint)*pbVar13;
            local_10 = local_10 + 2;
            local_14 = local_14 + 2;
          }
          break;
        case 0xfc:
          if ((uVar5 <= (DAT_00441ee0 & 0xff)) &&
             ((DAT_004406d0 <= (DAT_004406c0 & 0xff) || (uVar5 < (DAT_00441ee0 & 0xff))))) {
            (**(code **)(*(int *)(&DAT_004201b8)[uVar4] + 0xc))(CONCAT11(pbVar13[-2],pbVar13[-1]));
            pbVar13[-5] = 0xff;
          }
          break;
        case 0xfd:
          if ((uVar5 <= (DAT_00441ee0 & 0xff)) &&
             ((DAT_004406d0 <= (DAT_004406c0 & 0xff) || (uVar5 < (DAT_00441ee0 & 0xff))))) {
            DAT_00441ee8[uVar6 * 2 + 1] = 0;
            DAT_00441eec[(uint)*pbVar13 * 2 + 1] = 0;
            pbVar13[-5] = 0xff;
          }
        }
      }
      local_c = local_c + 1;
      pbVar13 = pbVar13 + 0x10;
    } while (local_c < DAT_00441edc);
    if ((1 < local_18) && (local_18 != 1 && -1 < local_18 + -1)) {
      puVar10 = &DAT_004406d8;
      iVar11 = 1;
      do {
        if (iVar11 < local_18) {
          iVar16 = local_18 - iVar11;
          puVar15 = puVar10;
          do {
            puVar7 = puVar15 + 2;
            if ((uint)puVar15[3] < (uint)puVar10[1]) {
              uVar1 = *puVar10;
              uVar2 = puVar10[1];
              *puVar10 = *puVar7;
              puVar10[1] = puVar15[3];
              *puVar7 = uVar1;
              puVar15[3] = uVar2;
            }
            iVar16 = iVar16 + -1;
            puVar15 = puVar7;
          } while (iVar16 != 0);
        }
        puVar10 = puVar10 + 2;
        bVar3 = iVar11 < local_18 + -1;
        iVar11 = iVar11 + 1;
      } while (bVar3);
    }
    if (0 < local_18) {
      piVar14 = &DAT_004406d8;
      do {
        iVar11 = piVar14[1];
        iVar16 = *piVar14;
        if (iVar16 != DAT_00441eec[iVar11 * 2 + 1]) {
          DAT_00441eec[iVar11 * 2] = iVar8;
          DAT_00441eec[iVar11 * 2 + 1] = iVar16;
        }
        (**(code **)(*(int *)(&DAT_004201b8)[iVar16] + 8))(iVar8 - DAT_00441eec[iVar11 * 2]);
        piVar14 = piVar14 + 2;
        local_18 = local_18 + -1;
      } while (local_18 != 0);
    }
  }
  return;
}


// ==== FUN_00416370 @ 00416370 ====

void __fastcall FUN_00416370(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac48;
  return;
}


// ==== FUN_00416380 @ 00416380 ====

undefined4 * __thiscall FUN_00416380(void *this,byte param_1)

{
  FUN_004163a0(this);
  if ((param_1 & 1) != 0) {
    operator_delete(this);
  }
  return this;
}


// ==== FUN_004163a0 @ 004163a0 ====

void __fastcall FUN_004163a0(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac48;
  return;
}


// ==== FUN_004163c0 @ 004163c0 ====

undefined4 * __fastcall FUN_004163c0(undefined4 *param_1)

{
  undefined4 *puVar1;
  void *pvVar2;
  int iVar3;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041929b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  *param_1 = &PTR_FUN_0041ac58;
  FUN_00418800();
  *(undefined1 *)(param_1 + 4) = 0;
  puVar1 = operator_new(0x24);
  local_4 = 0;
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_00416e70(puVar1);
  }
  local_4 = 0xffffffff;
  param_1[1] = puVar1;
  pvVar2 = operator_new(0x1000);
  param_1[2] = pvVar2;
  pvVar2 = operator_new(0x400);
  param_1[3] = pvVar2;
  puVar1 = (undefined4 *)param_1[2];
  for (iVar3 = 0x400; iVar3 != 0; iVar3 = iVar3 + -1) {
    *puVar1 = 0;
    puVar1 = puVar1 + 1;
  }
  puVar1 = (undefined4 *)param_1[2];
  for (iVar3 = 0x100; iVar3 != 0; iVar3 = iVar3 + -1) {
    *puVar1 = 0;
    puVar1 = puVar1 + 1;
  }
  param_1[5] = 0;
  param_1[6] = 0;
  ExceptionList = local_c;
  return param_1;
}


// ==== FUN_00416470 @ 00416470 ====

undefined4 * __thiscall FUN_00416470(void *this,byte param_1)

{
  FUN_00416490(this);
  if ((param_1 & 1) != 0) {
    operator_delete(this);
  }
  return this;
}


// ==== FUN_00416490 @ 00416490 ====

void __fastcall FUN_00416490(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac58;
  operator_delete((void *)param_1[2]);
  operator_delete((void *)param_1[3]);
  return;
}


// ==== FUN_004164b0 @ 004164b0 ====

void __thiscall FUN_004164b0(void *this,undefined4 param_1)

{
  if (*(int *)((int)this + 0x14) < 0x400) {
    *(undefined4 *)(*(int *)((int)this + 8) + *(int *)((int)this + 0x14) * 4) = param_1;
    *(int *)((int)this + 0x14) = *(int *)((int)this + 0x14) + 1;
  }
  return;
}


// ==== FUN_004164d0 @ 004164d0 ====

void __fastcall FUN_004164d0(int param_1)

{
  void *this;
  int iVar1;
  
  DAT_00441ef4 = *(undefined1 *)(param_1 + 0x10);
  glHint(0xc54,0x1101);
  glHint(0xc52,0x1102);
  glHint(0xc50,0x1101);
  glHint(0xc51,0x1102);
  glHint(0xc53,0x1101);
  iVar1 = 0;
  if (0 < *(int *)(param_1 + 0x14)) {
    do {
      this = *(void **)(*(int *)(param_1 + 8) + iVar1 * 4);
      if (this != (void *)0x0) {
        FUN_00416b40(this,*(int *)(param_1 + 4));
      }
      iVar1 = iVar1 + 1;
    } while (iVar1 < *(int *)(param_1 + 0x14));
  }
  return;
}


// ==== FUN_00416550 @ 00416550 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00416550(void *this,float param_1)

{
  int iVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float *pfVar6;
  float *pfVar7;
  int iVar8;
  int iVar9;
  int iVar10;
  float local_24;
  int local_20;
  int local_1c;
  float local_18;
  float local_14;
  float local_10 [4];
  
  FUN_00418830((uint)param_1,&local_18,&local_14,local_10,(float *)0x0);
  local_1c = 0;
  if (0 < *(int *)((int)this + 0x14)) {
    do {
      iVar8 = 0;
      iVar1 = *(int *)(*(int *)((int)this + 8) + local_1c * 4);
      if (((iVar1 != 0) && (*(int *)(iVar1 + 0x40) != 0)) &&
         (local_20 = 0, 0 < *(int *)(iVar1 + 0x28))) {
        iVar9 = 0;
        do {
          pfVar6 = (float *)(iVar8 + *(int *)(iVar1 + 0x24));
          iVar10 = *(int *)((int)this + 0x18);
          param_1 = local_14;
          local_24 = local_10[0];
          fVar2 = local_18;
          if (0 < iVar10) {
            pfVar7 = *(float **)((int)this + 0xc);
            do {
              if (pfVar7[7] != _DAT_0041a494) {
                fVar5 = pfVar7[4] - (*pfVar6 + *(float *)(iVar1 + 4));
                fVar4 = pfVar7[5] - (pfVar6[1] + *(float *)(iVar1 + 8));
                fVar3 = pfVar7[6] - (pfVar6[2] + *(float *)(iVar1 + 0xc));
                fVar3 = _DAT_0041a418 -
                        SQRT(fVar5 * fVar5 + fVar4 * fVar4 + fVar3 * fVar3) / pfVar7[7];
                if (fVar3 < _DAT_0041a494) {
                  fVar3 = _DAT_0041a494;
                }
                fVar2 = fVar3 * *pfVar7 + fVar2;
                param_1 = fVar3 * pfVar7[1] + param_1;
                local_24 = fVar3 * pfVar7[2] + local_24;
              }
              pfVar7 = pfVar7 + 8;
              iVar10 = iVar10 + -1;
            } while (iVar10 != 0);
          }
          iVar8 = iVar8 + 0xc;
          *(float *)(*(int *)(iVar1 + 0x1c) + iVar9) = fVar2;
          iVar9 = iVar9 + 0x10;
          *(float *)(*(int *)(iVar1 + 0x1c) + -0xc + iVar9) = param_1;
          local_20 = local_20 + 1;
          *(float *)(*(int *)(iVar1 + 0x1c) + -8 + iVar9) = local_24;
        } while (local_20 < *(int *)(iVar1 + 0x28));
      }
      local_1c = local_1c + 1;
    } while (local_1c < *(int *)((int)this + 0x14));
  }
  return;
}


// ==== FUN_004166d0 @ 004166d0 ====

void __thiscall
FUN_004166d0(void *this,float param_1,float param_2,float param_3,float param_4,uint param_5)

{
  float *pfVar1;
  
  if (*(int *)((int)this + 0x18) < 0x20) {
    pfVar1 = (float *)(*(int *)((int)this + 0x18) * 0x20 + *(int *)((int)this + 0xc));
    pfVar1[4] = param_1;
    pfVar1[5] = param_2;
    pfVar1[6] = param_3;
    pfVar1[7] = param_4;
    FUN_00418830(param_5,pfVar1,pfVar1 + 1,pfVar1 + 2,(float *)0x0);
    *(int *)((int)this + 0x18) = *(int *)((int)this + 0x18) + 1;
  }
  return;
}


// ==== FUN_00416730 @ 00416730 ====

undefined4 * __fastcall FUN_00416730(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac5c;
  FUN_00416820((int)param_1);
  return param_1;
}


// ==== FUN_00416750 @ 00416750 ====

undefined4 * __thiscall FUN_00416750(void *this,byte param_1)

{
  FUN_00416890(this);
  if ((param_1 & 1) != 0) {
    operator_delete(this);
  }
  return this;
}


// ==== FUN_00416770 @ 00416770 ====

undefined4 * __thiscall FUN_00416770(void *this,int param_1,int param_2,undefined4 param_3)

{
  void *pvVar1;
  int iVar2;
  
  *(undefined ***)this = &PTR_FUN_0041ac5c;
  FUN_00416820((int)this);
  *(int *)((int)this + 0x34) = param_2;
  *(int *)((int)this + 0x28) = param_1;
  pvVar1 = operator_new(param_2 * 0xc);
  *(void **)((int)this + 0x2c) = pvVar1;
  pvVar1 = operator_new(param_2 * 0x30);
  *(void **)((int)this + 0x30) = pvVar1;
  pvVar1 = operator_new(param_1 << 4);
  *(void **)((int)this + 0x1c) = pvVar1;
  pvVar1 = operator_new(param_1 * 0xc);
  *(void **)((int)this + 0x20) = pvVar1;
  pvVar1 = operator_new(param_1 * 0xc);
  *(void **)((int)this + 0x24) = pvVar1;
  if (0 < param_1) {
    iVar2 = 0;
    do {
      param_1 = param_1 + -1;
      *(undefined4 *)(iVar2 + 8 + *(int *)((int)this + 0x1c)) = 0x3f800000;
      *(undefined4 *)(iVar2 + 4 + *(int *)((int)this + 0x1c)) = 0x3f800000;
      *(undefined4 *)(iVar2 + *(int *)((int)this + 0x1c)) = 0x3f800000;
      *(undefined4 *)(iVar2 + 0xc + *(int *)((int)this + 0x1c)) = 0x3f800000;
      iVar2 = iVar2 + 0x10;
    } while (param_1 != 0);
    *(undefined4 *)((int)this + 0x38) = param_3;
    return this;
  }
  *(undefined4 *)((int)this + 0x38) = param_3;
  return this;
}


// ==== FUN_00416820 @ 00416820 ====

void __fastcall FUN_00416820(int param_1)

{
  FUN_00418800();
  *(undefined4 *)(param_1 + 0x3c) = 0xffffffff;
  *(undefined1 *)(param_1 + 0x48) = 0;
  *(undefined1 *)(param_1 + 0x47) = 0;
  *(undefined1 *)(param_1 + 0x46) = 0;
  *(undefined1 *)(param_1 + 0x58) = 0;
  *(undefined4 *)(param_1 + 0x54) = 0;
  *(undefined4 *)(param_1 + 0x50) = 0;
  *(undefined4 *)(param_1 + 0x4c) = 0;
  *(undefined4 *)(param_1 + 0x38) = 0;
  *(undefined4 *)(param_1 + 0x28) = 0;
  *(undefined4 *)(param_1 + 0xc) = 0;
  *(undefined4 *)(param_1 + 8) = 0;
  *(undefined4 *)(param_1 + 4) = 0;
  *(undefined4 *)(param_1 + 0x18) = 0;
  *(undefined4 *)(param_1 + 0x14) = 0;
  *(undefined4 *)(param_1 + 0x10) = 0;
  *(undefined4 *)(param_1 + 0x34) = 0;
  *(undefined4 *)(param_1 + 0x40) = 4;
  *(undefined1 *)(param_1 + 0x44) = 0;
  *(undefined1 *)(param_1 + 0x45) = 0;
  *(undefined1 *)(param_1 + 0x49) = 0;
  return;
}


// ==== FUN_00416890 @ 00416890 ====

void __fastcall FUN_00416890(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac5c;
  operator_delete((void *)param_1[0xc]);
  operator_delete((void *)param_1[0xb]);
  operator_delete((void *)param_1[9]);
  operator_delete((void *)param_1[8]);
  operator_delete((void *)param_1[7]);
  return;
}


// ==== FUN_004168d0 @ 004168d0 ====

void __thiscall FUN_004168d0(void *this,undefined4 param_1,undefined4 param_2,undefined4 param_3)

{
  *(undefined4 *)((int)this + 0x10) = param_1;
  *(undefined4 *)((int)this + 0x14) = param_2;
  *(undefined4 *)((int)this + 0x18) = param_3;
  return;
}


// ==== FUN_004168f0 @ 004168f0 ====

void __fastcall FUN_004168f0(int param_1)

{
  int *piVar1;
  float *pfVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  float fVar9;
  float fVar10;
  float fVar11;
  int *piVar12;
  float *pfVar13;
  int iVar14;
  
  if ((*(char *)(param_1 + 0x58) == '\0') || (*(char *)(param_1 + 0x46) != '\0')) {
    piVar12 = *(int **)(param_1 + 0x30);
    pfVar13 = *(float **)(param_1 + 0x2c);
    iVar14 = 0;
    iVar3 = *(int *)(param_1 + 0x24);
    if (0 < *(int *)(param_1 + 0x34)) {
      do {
        iVar4 = piVar12[1];
        iVar5 = *piVar12;
        piVar1 = piVar12 + 2;
        piVar12 = piVar12 + 0xc;
        iVar14 = iVar14 + 1;
        fVar6 = *(float *)(iVar3 + iVar4 * 0xc) - *(float *)(iVar3 + iVar5 * 0xc);
        pfVar2 = (float *)(iVar3 + iVar5 * 0xc);
        fVar9 = *(float *)(iVar3 + 4 + iVar4 * 0xc) - pfVar2[1];
        fVar7 = *(float *)(iVar3 + iVar4 * 0xc + 8) - pfVar2[2];
        fVar10 = *(float *)(iVar3 + *piVar1 * 0xc) - *pfVar2;
        iVar4 = iVar3 + *piVar1 * 0xc;
        fVar11 = *(float *)(iVar4 + 4) - pfVar2[1];
        fVar8 = *(float *)(iVar4 + 8) - pfVar2[2];
        *pfVar13 = fVar8 * fVar9 - fVar11 * fVar7;
        pfVar13[1] = fVar10 * fVar7 - fVar8 * fVar6;
        pfVar13[2] = fVar11 * fVar6 - fVar10 * fVar9;
        pfVar13 = pfVar13 + 3;
      } while (iVar14 < *(int *)(param_1 + 0x34));
    }
    FUN_004169d0(param_1);
    *(undefined1 *)(param_1 + 0x58) = 1;
  }
  return;
}


// ==== FUN_004169d0 @ 004169d0 ====

void __fastcall FUN_004169d0(int param_1)

{
  int *piVar1;
  float *pfVar2;
  undefined4 *puVar3;
  int iVar4;
  undefined4 *puVar5;
  int iVar6;
  int iVar7;
  
  piVar1 = *(int **)(param_1 + 0x30);
  pfVar2 = *(float **)(param_1 + 0x2c);
  iVar6 = *(int *)(param_1 + 0x28);
  puVar5 = *(undefined4 **)(param_1 + 0x20);
  iVar7 = 0;
  if (0 < iVar6) {
    puVar3 = &DAT_00441ef8;
    do {
      *puVar5 = 0;
      puVar5[1] = 0;
      puVar5[2] = 0;
      puVar5 = puVar5 + 3;
      *puVar3 = 0;
      iVar7 = iVar7 + 1;
      puVar3 = puVar3 + 1;
    } while (iVar7 < *(int *)(param_1 + 0x28));
  }
  iVar7 = *(int *)(param_1 + 0x20);
  iVar4 = 0;
  if (0 < *(int *)(param_1 + 0x34)) {
    do {
      *(float *)(iVar7 + *piVar1 * 0xc) = *(float *)(iVar7 + *piVar1 * 0xc) + *pfVar2;
      *(float *)(iVar7 + 4 + *piVar1 * 0xc) = pfVar2[1] + *(float *)(iVar7 + 4 + *piVar1 * 0xc);
      *(float *)(iVar7 + 8 + *piVar1 * 0xc) = pfVar2[2] + *(float *)(iVar7 + 8 + *piVar1 * 0xc);
      (&DAT_00441ef8)[*piVar1] = (&DAT_00441ef8)[*piVar1] + 1;
      *(float *)(iVar7 + piVar1[1] * 0xc) = *pfVar2 + *(float *)(iVar7 + piVar1[1] * 0xc);
      *(float *)(iVar7 + 4 + piVar1[1] * 0xc) = *(float *)(iVar7 + 4 + piVar1[1] * 0xc) + pfVar2[1];
      *(float *)(iVar7 + 8 + piVar1[1] * 0xc) = *(float *)(iVar7 + 8 + piVar1[1] * 0xc) + pfVar2[2];
      (&DAT_00441ef8)[piVar1[1]] = (&DAT_00441ef8)[piVar1[1]] + 1;
      *(float *)(iVar7 + piVar1[2] * 0xc) = *(float *)(iVar7 + piVar1[2] * 0xc) + *pfVar2;
      *(float *)(iVar7 + 4 + piVar1[2] * 0xc) = *(float *)(iVar7 + 4 + piVar1[2] * 0xc) + pfVar2[1];
      *(float *)(iVar7 + 8 + piVar1[2] * 0xc) = *(float *)(iVar7 + 8 + piVar1[2] * 0xc) + pfVar2[2];
      (&DAT_00441ef8)[piVar1[2]] = (&DAT_00441ef8)[piVar1[2]] + 1;
      iVar4 = iVar4 + 1;
      piVar1 = piVar1 + 0xc;
      pfVar2 = pfVar2 + 3;
    } while (iVar4 < *(int *)(param_1 + 0x34));
  }
  pfVar2 = *(float **)(param_1 + 0x20);
  if (0 < iVar6) {
    piVar1 = &DAT_00441ef8;
    do {
      if (*piVar1 != 0) {
        *pfVar2 = *pfVar2 / (float)*piVar1;
        pfVar2[1] = pfVar2[1] / (float)*piVar1;
        pfVar2[2] = pfVar2[2] / (float)*piVar1;
      }
      pfVar2 = pfVar2 + 3;
      piVar1 = piVar1 + 1;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
  }
  return;
}


// ==== FUN_00416b40 @ 00416b40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00416b40(void *this,int param_1)

{
  float fVar1;
  undefined4 uVar2;
  undefined4 uVar3;
  float fStack_6c;
  float fStack_68;
  float afStack_64 [4];
  double dStack_54;
  undefined4 uStack_4c;
  undefined4 uStack_48;
  undefined4 uStack_44;
  undefined4 uStack_40;
  undefined4 uStack_3c;
  undefined4 uStack_38;
  undefined4 uStack_34;
  
  if ((*(uint *)((int)this + 0x40) < 0x10) || (0x800 < *(uint *)((int)this + 0x40))) {
    uStack_34 = 0x416b64;
    FUN_004168f0((int)this);
  }
  uStack_34 = 0x416b6a;
  glPushMatrix();
  uStack_34 = 0x1701;
  uStack_38 = 0x416b75;
  glMatrixMode();
  uStack_38 = 0x416b7b;
  glLoadIdentity();
  uStack_38 = 0x40e00000;
  uStack_3c = 0;
  uStack_40 = 0x40000000;
  uStack_44 = 0;
  uStack_48 = 0x3ff00000;
  uStack_4c = 0;
  dStack_54 = (double)*(float *)(param_1 + 0x20);
  afStack_64[3] = 6.007917e-39;
  gluPerspective();
  afStack_64[3] = 1.14794e-41;
  afStack_64[2] = 6.007933e-39;
  glPushAttrib();
  afStack_64[2] = 4.26275e-42;
  afStack_64[1] = 6.007951e-39;
  glDisable();
  afStack_64[1] = 4.1044e-42;
  afStack_64[0] = 6.007969e-39;
  glEnable();
  afStack_64[0] = 7.21669e-43;
  fStack_68 = 6.007984e-39;
  glDepthFunc();
  if (*(char *)((int)this + 0x48) != '\0') {
    fStack_68 = 4.26275e-42;
    fStack_6c = 6.008004e-39;
    glEnable();
    fStack_6c = 4.1044e-42;
    glDisable();
    glBlendFunc(1,1);
  }
  if (*(char *)((int)this + 0x47) != '\0') {
    fStack_68 = 4.26275e-42;
    fStack_6c = 6.008048e-39;
    glEnable();
    fStack_6c = 1.0804e-42;
    glBlendFunc(0x302);
    glDisable(0xb44);
  }
  if (*(char *)((int)this + 0x45) == '\0') {
    fStack_68 = 4.04134e-42;
    fStack_6c = 6.008147e-39;
    glEnable();
    fStack_6c = 3.22859e-42;
  }
  else {
    fStack_68 = 4.04134e-42;
    if (*(char *)((int)this + 0x45) != '\x01') {
      fStack_6c = 6.008108e-39;
      glDisable();
      uVar3 = 0x408;
      goto LAB_00416c65;
    }
    fStack_6c = 6.008127e-39;
    glEnable();
    fStack_6c = 3.22999e-42;
  }
  glFrontFace();
  glCullFace(0x405);
  uVar3 = 0x404;
LAB_00416c65:
  fStack_6c = 9.68858e-42;
  glPolygonMode(uVar3);
  if (*(float *)((int)this + 0x50) != _DAT_0041a494) {
    glEnable(0xb60);
    glFogf(0xb62,_DAT_0041a418 / *(float *)((int)this + 0x50));
    glFogf(0xb64,*(undefined4 *)((int)this + 0x50));
    FUN_00418830(*(uint *)((int)this + 0x54),&fStack_6c,&fStack_68,afStack_64,(float *)0x0);
    afStack_64[1] = 1.0;
    glFogfv(0xb66,&fStack_6c);
  }
  glMatrixMode(0x1700);
  glPushMatrix();
  glLoadIdentity();
  glRotatef(*(undefined4 *)(param_1 + 0x1c),0,0,0xbf800000);
  fStack_6c = *(float *)(param_1 + 4);
  fVar1 = *(float *)(param_1 + 0x10);
  fStack_68 = *(float *)(param_1 + 8);
  afStack_64[0] = *(float *)(param_1 + 0xc);
  if (DAT_00441ef4 == '\0') {
    if ((fVar1 - fStack_6c == _DAT_0041a494) &&
       (*(float *)(param_1 + 0x18) - afStack_64[0] == _DAT_0041a494)) {
      uVar2 = 0;
      uVar3 = 0;
      fVar1 = fVar1 + _DAT_0041ab54;
    }
    else {
      uVar2 = 0;
      uVar3 = 0;
    }
  }
  else {
    uVar2 = 0x3ff00000;
    uVar3 = 0x3ff00000;
  }
  gluLookAt((double)fStack_6c,(double)fStack_68,(double)afStack_64[0],(double)fVar1,
            (double)*(float *)(param_1 + 0x14),(double)*(float *)(param_1 + 0x18),0,uVar3,0,
            0x3ff00000,0,uVar2);
  glTranslatef(*(undefined4 *)((int)this + 4),*(undefined4 *)((int)this + 8),
               *(undefined4 *)((int)this + 0xc));
  glRotatef(*(undefined4 *)((int)this + 0x10),0x3f800000,0,0);
  glRotatef(*(undefined4 *)((int)this + 0x14),0,0x3f800000,0);
  glRotatef(*(undefined4 *)((int)this + 0x18),0,0,0x3f800000);
  FUN_00418610((int)this);
  glPopMatrix();
  glPopAttrib();
  glPopMatrix();
  return;
}


// ==== FUN_00416e70 @ 00416e70 ====

undefined4 * __fastcall FUN_00416e70(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac60;
  FUN_00416ee0(param_1,0xc2c80000,0xc2c80000,0xc2c80000);
  FUN_004168d0(param_1,0,0,0);
  param_1[7] = 0;
  param_1[8] = 0x42b40000;
  return param_1;
}


// ==== FUN_00416eb0 @ 00416eb0 ====

undefined4 * __thiscall FUN_00416eb0(void *this,byte param_1)

{
  FUN_00416ed0(this);
  if ((param_1 & 1) != 0) {
    operator_delete(this);
  }
  return this;
}


// ==== FUN_00416ed0 @ 00416ed0 ====

void __fastcall FUN_00416ed0(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041ac60;
  return;
}


// ==== FUN_00416ee0 @ 00416ee0 ====

void __thiscall FUN_00416ee0(void *this,undefined4 param_1,undefined4 param_2,undefined4 param_3)

{
  *(undefined4 *)((int)this + 4) = param_1;
  *(undefined4 *)((int)this + 8) = param_2;
  *(undefined4 *)((int)this + 0xc) = param_3;
  return;
}


// ==== FUN_00416f00 @ 00416f00 ====

void __cdecl FUN_00416f00(float param_1,undefined4 param_2)

{
  float fVar1;
  void *this;
  undefined4 *puVar2;
  int iVar3;
  int iVar4;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004192bb;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  this = operator_new(0x5c);
  local_4 = 0;
  if (this == (void *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_00416770(this,8,6,param_2);
  }
  fVar1 = -param_1;
  *(undefined1 *)((int)puVar2 + 0x49) = 1;
  *(float *)puVar2[9] = fVar1;
  *(float *)(puVar2[9] + 4) = fVar1;
  *(float *)(puVar2[9] + 8) = fVar1;
  *(float *)(puVar2[9] + 0xc) = fVar1;
  *(float *)(puVar2[9] + 0x10) = fVar1;
  *(float *)(puVar2[9] + 0x14) = param_1;
  *(float *)(puVar2[9] + 0x18) = fVar1;
  *(float *)(puVar2[9] + 0x1c) = param_1;
  *(float *)(puVar2[9] + 0x20) = fVar1;
  *(float *)(puVar2[9] + 0x24) = fVar1;
  *(float *)(puVar2[9] + 0x28) = param_1;
  *(float *)(puVar2[9] + 0x2c) = param_1;
  *(float *)(puVar2[9] + 0x30) = param_1;
  *(float *)(puVar2[9] + 0x34) = fVar1;
  *(float *)(puVar2[9] + 0x38) = fVar1;
  *(float *)(puVar2[9] + 0x3c) = param_1;
  *(float *)(puVar2[9] + 0x40) = fVar1;
  *(float *)(puVar2[9] + 0x44) = param_1;
  *(float *)(puVar2[9] + 0x48) = param_1;
  *(float *)(puVar2[9] + 0x4c) = param_1;
  *(float *)(puVar2[9] + 0x50) = fVar1;
  *(float *)(puVar2[9] + 0x54) = param_1;
  *(float *)(puVar2[9] + 0x58) = param_1;
  *(float *)(puVar2[9] + 0x5c) = param_1;
  *(undefined4 *)puVar2[0xc] = 2;
  *(undefined4 *)(puVar2[0xc] + 4) = 3;
  *(undefined4 *)(puVar2[0xc] + 8) = 1;
  *(undefined4 *)(puVar2[0xc] + 0xc) = 0;
  *(undefined4 *)(puVar2[0xc] + 0x30) = 4;
  *(undefined4 *)(puVar2[0xc] + 0x34) = 5;
  *(undefined4 *)(puVar2[0xc] + 0x38) = 7;
  *(undefined4 *)(puVar2[0xc] + 0x3c) = 6;
  *(undefined4 *)(puVar2[0xc] + 0x60) = 6;
  *(undefined4 *)(puVar2[0xc] + 100) = 7;
  *(undefined4 *)(puVar2[0xc] + 0x68) = 3;
  *(undefined4 *)(puVar2[0xc] + 0x6c) = 2;
  *(undefined4 *)(puVar2[0xc] + 0x90) = 4;
  *(undefined4 *)(puVar2[0xc] + 0x94) = 6;
  *(undefined4 *)(puVar2[0xc] + 0x98) = 2;
  *(undefined4 *)(puVar2[0xc] + 0x9c) = 0;
  *(undefined4 *)(puVar2[0xc] + 0xc0) = 3;
  *(undefined4 *)(puVar2[0xc] + 0xc4) = 7;
  *(undefined4 *)(puVar2[0xc] + 200) = 5;
  *(undefined4 *)(puVar2[0xc] + 0xcc) = 1;
  *(undefined4 *)(puVar2[0xc] + 0xf0) = 4;
  *(undefined4 *)(puVar2[0xc] + 0xf4) = 0;
  *(undefined4 *)(puVar2[0xc] + 0xf8) = 1;
  iVar4 = 0;
  *(undefined4 *)(puVar2[0xc] + 0xfc) = 5;
  if (0 < (int)puVar2[0xd]) {
    iVar3 = 0;
    do {
      iVar4 = iVar4 + 1;
      *(undefined4 *)(puVar2[0xc] + 0x10 + iVar3) = 0;
      *(undefined4 *)(puVar2[0xc] + 0x14 + iVar3) = 0;
      *(undefined4 *)(puVar2[0xc] + 0x18 + iVar3) = 0x3f800000;
      *(undefined4 *)(puVar2[0xc] + 0x1c + iVar3) = 0;
      *(undefined4 *)(puVar2[0xc] + 0x20 + iVar3) = 0x3f800000;
      *(undefined4 *)(puVar2[0xc] + 0x24 + iVar3) = 0x3f800000;
      *(undefined4 *)(puVar2[0xc] + 0x28 + iVar3) = 0;
      *(undefined4 *)(puVar2[0xc] + 0x2c + iVar3) = 0x3f800000;
      iVar3 = iVar3 + 0x30;
    } while (iVar4 < (int)puVar2[0xd]);
  }
  ExceptionList = local_c;
  return;
}


// ==== FUN_00417140 @ 00417140 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __cdecl FUN_00417140(int param_1,float param_2,int param_3)

{
  int iVar1;
  int iVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  int iVar9;
  void *this;
  undefined4 *puVar10;
  int iVar11;
  int iVar12;
  int iVar13;
  int iVar14;
  float10 fVar15;
  float10 fVar16;
  float10 fVar17;
  float10 fVar18;
  int local_30;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  iVar9 = param_1;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004192db;
  local_c = ExceptionList;
  fVar3 = (float)param_1;
  fVar8 = _DAT_0041a490 / fVar3;
  iVar1 = param_1 + -1;
  fVar4 = _DAT_0041a7e8 / (float)iVar1;
  ExceptionList = &local_c;
  this = operator_new(0x5c);
  local_4 = 0;
  if (this == (void *)0x0) {
    puVar10 = (undefined4 *)0x0;
  }
  else {
    puVar10 = FUN_00416770(this,param_1 * param_1,iVar1 * param_1 * 2,param_3);
  }
  param_1 = 0;
  if (0 < iVar9) {
    iVar12 = 0;
    do {
      param_3 = 0;
      fVar15 = (float10)param_1 * (float10)fVar4;
      fVar16 = (float10)fcos(fVar15);
      fVar15 = (float10)fsin(fVar15);
      iVar14 = iVar12;
      do {
        fVar17 = (float10)param_3;
        param_3 = param_3 + 1;
        fVar17 = fVar17 * (float10)fVar8;
        fVar18 = (float10)fcos(fVar17);
        *(float *)(iVar14 + puVar10[9]) = (float)(fVar18 * fVar15 * (float10)param_2);
        *(float *)(iVar14 + 4 + puVar10[9]) = (float)(fVar16 * (float10)param_2);
        fVar17 = (float10)fsin(fVar17);
        *(float *)(iVar14 + 8 + puVar10[9]) = (float)(fVar17 * fVar15 * (float10)param_2);
        iVar14 = iVar14 + 0xc;
      } while (param_3 < iVar9);
      param_1 = param_1 + 1;
      iVar12 = iVar12 + iVar9 * 0xc;
    } while (param_1 < iVar9);
  }
  fVar3 = _DAT_0041a418 / fVar3;
  param_2 = 0.0;
  param_3 = 0;
  fVar8 = _DAT_0041a418 / (float)iVar1;
  if (0 < iVar1) {
    local_30 = 0;
    do {
      param_1 = 0;
      if (0 < iVar9) {
        fVar4 = (float)param_3 * fVar8;
        fVar5 = (float)(param_3 + 1) * fVar8;
        iVar12 = (int)param_2 * 0x30;
        iVar14 = local_30;
        do {
          iVar2 = param_1 + 1;
          fVar6 = (float)param_1 * fVar3;
          *(int *)(iVar12 + puVar10[0xc]) = iVar14;
          iVar11 = (param_3 + 1) * iVar9;
          iVar13 = iVar2 % iVar9 + iVar11;
          *(int *)(iVar12 + 4 + puVar10[0xc]) = iVar13;
          *(int *)(iVar12 + 8 + puVar10[0xc]) = local_30 + iVar2 % iVar9;
          *(undefined4 *)(iVar12 + 0xc + puVar10[0xc]) = 7;
          *(float *)(iVar12 + 0x10 + puVar10[0xc]) = fVar6;
          *(float *)(iVar12 + 0x14 + puVar10[0xc]) = fVar4;
          fVar7 = (float)iVar2 * fVar3;
          *(float *)(iVar12 + 0x18 + puVar10[0xc]) = fVar7;
          *(float *)(iVar12 + 0x1c + puVar10[0xc]) = fVar5;
          *(float *)(iVar12 + 0x20 + puVar10[0xc]) = fVar7;
          *(float *)(iVar12 + 0x24 + puVar10[0xc]) = fVar4;
          *(int *)(iVar12 + 0x30 + puVar10[0xc]) = iVar14;
          *(int *)(iVar12 + 0x34 + puVar10[0xc]) = iVar11 + param_1;
          *(int *)(iVar12 + 0x38 + puVar10[0xc]) = iVar13;
          *(undefined4 *)(iVar12 + 0x3c + puVar10[0xc]) = 7;
          *(float *)(iVar12 + 0x40 + puVar10[0xc]) = fVar6;
          *(float *)(iVar12 + 0x44 + puVar10[0xc]) = fVar4;
          *(float *)(iVar12 + 0x48 + puVar10[0xc]) = fVar6;
          *(float *)(iVar12 + 0x4c + puVar10[0xc]) = fVar5;
          *(float *)(iVar12 + 0x50 + puVar10[0xc]) = fVar7;
          *(float *)(iVar12 + 0x54 + puVar10[0xc]) = fVar5;
          param_2 = (float)((int)param_2 + 2);
          iVar14 = iVar14 + 1;
          iVar12 = iVar12 + 0x60;
          param_1 = iVar2;
        } while (iVar2 < iVar9);
      }
      param_3 = param_3 + 1;
      local_30 = local_30 + iVar9;
    } while (param_3 < iVar1);
  }
  ExceptionList = local_c;
  return puVar10;
}


// ==== FUN_00417400 @ 00417400 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00417400(int param_1,float param_2,int param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  void *this;
  undefined4 *puVar6;
  int iVar7;
  int iVar8;
  float fVar9;
  int iVar10;
  int iVar11;
  int iVar12;
  int local_24;
  int local_14;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_004192fb;
  local_c = ExceptionList;
  fVar1 = param_2 / (float)param_1;
  iVar11 = param_1 + 1;
  fVar5 = _DAT_0041a418 / (float)param_1;
  ExceptionList = &local_c;
  this = operator_new(0x5c);
  local_4 = 0;
  if (this == (void *)0x0) {
    puVar6 = (undefined4 *)0x0;
  }
  else {
    puVar6 = FUN_00416770(this,iVar11 * iVar11,param_1 * param_1 * 2,param_3);
  }
  param_3 = 0;
  if (0 < iVar11) {
    iVar7 = 0;
    do {
      fVar2 = param_2 * _DAT_0041a340;
      local_24 = 0;
      iVar12 = iVar7;
      do {
        iVar8 = local_24 + 1;
        *(float *)(iVar12 + puVar6[9]) = (float)param_3 * fVar1 - fVar2;
        *(undefined4 *)(iVar12 + 4 + puVar6[9]) = 0;
        *(float *)(iVar12 + 8 + puVar6[9]) = (float)local_24 * fVar1 - fVar2;
        iVar12 = iVar12 + 0xc;
        local_24 = iVar8;
      } while (iVar8 < iVar11);
      param_3 = param_3 + 1;
      iVar7 = iVar7 + iVar11 * 0xc;
    } while (param_3 < iVar11);
  }
  param_3 = 0;
  if (0 < param_1) {
    param_2 = 0.0;
    iVar11 = param_1 + 2;
    local_14 = 0;
    do {
      iVar8 = param_3 + 1;
      local_24 = 0;
      fVar1 = (float)iVar8 * fVar5;
      fVar2 = (float)param_3 * fVar5;
      iVar7 = local_14;
      fVar9 = param_2;
      iVar12 = iVar11;
      do {
        iVar10 = local_24 + 1;
        *(float *)(iVar7 + puVar6[0xc]) = fVar9;
        *(int *)(iVar7 + 4 + puVar6[0xc]) = param_1 + 1 + (int)fVar9;
        *(int *)(iVar7 + 8 + puVar6[0xc]) = iVar12;
        fVar3 = (float)local_24 * fVar5;
        *(float *)(iVar7 + 0x30 + puVar6[0xc]) = fVar9;
        *(int *)(iVar7 + 0x34 + puVar6[0xc]) = iVar12;
        *(int *)(iVar7 + 0x38 + puVar6[0xc]) = (int)fVar9 + 1;
        *(float *)(iVar7 + 0x10 + puVar6[0xc]) = fVar3;
        fVar9 = (float)((int)fVar9 + 1);
        iVar12 = iVar12 + 1;
        *(float *)(iVar7 + 0x14 + puVar6[0xc]) = fVar2;
        *(float *)(iVar7 + 0x18 + puVar6[0xc]) = fVar3;
        *(float *)(iVar7 + 0x1c + puVar6[0xc]) = fVar1;
        fVar4 = (float)iVar10 * fVar5;
        *(float *)(iVar7 + 0x20 + puVar6[0xc]) = fVar4;
        *(float *)(iVar7 + 0x24 + puVar6[0xc]) = fVar1;
        *(float *)(iVar7 + 0x40 + puVar6[0xc]) = fVar3;
        *(float *)(iVar7 + 0x44 + puVar6[0xc]) = fVar2;
        *(float *)(iVar7 + 0x48 + puVar6[0xc]) = fVar4;
        *(float *)(iVar7 + 0x4c + puVar6[0xc]) = fVar1;
        *(float *)(iVar7 + 0x50 + puVar6[0xc]) = fVar4;
        *(float *)(iVar7 + 0x54 + puVar6[0xc]) = fVar2;
        iVar7 = iVar7 + 0x60;
        local_24 = iVar10;
      } while (iVar10 < param_1);
      param_2 = (float)((int)param_2 + param_1 + 1);
      iVar11 = iVar11 + param_1 + 1;
      local_14 = local_14 + param_1 * 0x60;
      param_3 = iVar8;
    } while (iVar8 < param_1);
  }
  ExceptionList = local_c;
  return;
}


// ==== FUN_00417650 @ 00417650 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __cdecl FUN_00417650(int param_1,int param_2,float param_3,float param_4,int param_5)

{
  int iVar1;
  int iVar2;
  int iVar3;
  float10 fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  float fVar9;
  float fVar10;
  void *this;
  undefined4 *puVar11;
  float *pfVar12;
  float *pfVar13;
  int *piVar14;
  int *piVar15;
  float10 fVar16;
  float10 fVar17;
  int local_14;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  iVar1 = param_2;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0041931b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  this = operator_new(0x5c);
  local_4 = 0;
  if (this == (void *)0x0) {
    puVar11 = (undefined4 *)0x0;
  }
  else {
    puVar11 = FUN_00416770(this,param_1 * param_2,(param_2 + -1) * param_1 * 2,param_5);
  }
  pfVar13 = (float *)puVar11[9];
  param_2 = 0;
  if (0 < iVar1) {
    do {
      param_5 = 0;
      if (0 < param_1) {
        fVar9 = param_4 * _DAT_0041a340;
        fVar4 = (float10)_DAT_0041a490;
        pfVar12 = pfVar13;
        do {
          fVar16 = (float10)param_5;
          pfVar13 = pfVar12 + 3;
          param_5 = param_5 + 1;
          fVar16 = fVar16 * (fVar4 / (float10)param_1);
          fVar17 = (float10)fsin(fVar16);
          *pfVar12 = (float)(fVar17 * (float10)param_3);
          pfVar12[1] = (param_4 / (float)(iVar1 + -1)) * (float)param_2 - fVar9;
          fVar16 = (float10)fcos(fVar16);
          pfVar12[2] = (float)(fVar16 * (float10)param_3);
          pfVar12 = pfVar13;
        } while (param_5 < param_1);
      }
      param_2 = param_2 + 1;
    } while (param_2 < iVar1);
  }
  iVar1 = iVar1 + -1;
  piVar15 = (int *)puVar11[0xc];
  param_2 = 0;
  fVar9 = _DAT_0041a418 / (float)iVar1;
  fVar10 = _DAT_0041a418 / (float)param_1;
  if (0 < iVar1) {
    local_14 = 0;
    do {
      param_5 = 0;
      if (0 < param_1) {
        fVar5 = (float)param_2 * fVar9;
        fVar6 = (float)(param_2 + 1) * fVar9;
        piVar14 = piVar15;
        do {
          param_3 = (float)(param_1 + local_14);
          iVar2 = param_5 + 1;
          fVar7 = (float)param_5 * fVar10;
          piVar14[4] = (int)fVar7;
          piVar14[5] = (int)fVar5;
          piVar14[6] = (int)fVar7;
          piVar14[7] = (int)fVar6;
          fVar8 = (float)iVar2 * fVar10;
          piVar14[8] = (int)fVar8;
          piVar14[9] = (int)fVar5;
          piVar15 = piVar14 + 0x18;
          iVar3 = iVar2 % param_1 + local_14;
          piVar14[2] = iVar3;
          *piVar14 = param_5 + local_14;
          piVar14[1] = (int)param_3 + param_5;
          piVar14[0xc] = iVar3;
          piVar14[0x10] = (int)fVar8;
          piVar14[0xd] = (int)param_3 + param_5;
          piVar14[0x11] = (int)fVar5;
          piVar14[0x12] = (int)fVar7;
          piVar14[0xe] = iVar2 % param_1 + param_1 + local_14;
          piVar14[0x13] = (int)fVar6;
          piVar14[0x15] = (int)fVar6;
          piVar14[0x14] = (int)fVar8;
          piVar14 = piVar15;
          param_5 = iVar2;
        } while (iVar2 < param_1);
      }
      param_2 = param_2 + 1;
      local_14 = local_14 + param_1;
    } while (param_2 < iVar1);
  }
  ExceptionList = local_c;
  return puVar11;
}


// ==== FUN_00417860 @ 00417860 ====

void FUN_00417860(void)

{
  int *piVar1;
  undefined4 *puVar2;
  int iVar3;
  undefined4 unaff_EBP;
  code *pcVar4;
  int iVar5;
  int unaff_ESI;
  int iVar6;
  int iVar7;
  int iVar8;
  code *pcVar9;
  char cVar10;
  float unaff_retaddr;
  int iVar11;
  int iVar12;
  int iVar13;
  float fStack_c;
  float fStack_8;
  int iStack_4;
  
  pcVar4 = glEnable_exref;
  iVar12 = 0xde1;
  glEnable(0xde1);
  cVar10 = (*(byte *)((int)unaff_retaddr + 0x44) & 4) != 0;
  if ((bool)cVar10) {
    FUN_00418830(*(uint *)((int)unaff_retaddr + 0x3c),&fStack_c,&fStack_8,(float *)&stack0x00000000,
                 (float *)0x0);
    glColor4f(fStack_c,fStack_8,unaff_retaddr,0x3f800000);
  }
  if (*(char *)((int)unaff_retaddr + 0x49) == '\x01') {
    glBegin(7);
    iVar13 = 0;
    if (0 < *(int *)((int)unaff_retaddr + 0x34)) {
      iStack_4 = 0;
      do {
        piVar1 = (int *)(*(int *)((int)unaff_retaddr + 0x30) + iStack_4);
        iVar7 = piVar1[1];
        fStack_c = (float)piVar1[2];
        iVar6 = *piVar1 * 0xc;
        puVar2 = (undefined4 *)(iVar6 + *(int *)((int)unaff_retaddr + 0x20));
        glNormal3f(*puVar2,puVar2[1],
                   *(undefined4 *)(iVar6 + 8 + *(int *)((int)unaff_retaddr + 0x20)));
        puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x24) + iVar6);
        iVar6 = puVar2[2];
        glVertex3f(*puVar2,puVar2[1]);
        iVar7 = iVar7 * 0xc;
        puVar2 = (undefined4 *)(iVar7 + *(int *)((int)unaff_retaddr + 0x20));
        glNormal3f(*puVar2,puVar2[1],
                   *(undefined4 *)(iVar7 + 8 + *(int *)((int)unaff_retaddr + 0x20)));
        puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x24) + iVar7);
        iVar7 = puVar2[1];
        glVertex3f(*puVar2,iVar7,puVar2[2]);
        iVar6 = iVar6 * 0xc;
        puVar2 = (undefined4 *)(iVar6 + *(int *)((int)unaff_retaddr + 0x20));
        glNormal3f(*puVar2,puVar2[1],
                   *(undefined4 *)(iVar6 + 8 + *(int *)((int)unaff_retaddr + 0x20)));
        puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x24) + iVar6);
        glVertex3f(*puVar2,puVar2[1],puVar2[2]);
        iVar7 = iVar7 * 0xc;
        puVar2 = (undefined4 *)(iVar7 + *(int *)((int)unaff_retaddr + 0x20));
        glNormal3f(*puVar2,puVar2[1],
                   *(undefined4 *)(iVar7 + 8 + *(int *)((int)unaff_retaddr + 0x20)));
        puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x24) + iVar7);
        glVertex3f(*puVar2,puVar2[1],puVar2[2]);
        iVar13 = iVar13 + 1;
        iStack_4 = iStack_4 + 0x30;
      } while (iVar13 < *(int *)((int)unaff_retaddr + 0x34));
      cVar10 = (char)((uint)unaff_EBP >> 0x18);
      pcVar4 = glEnable_exref;
    }
    glEnd();
  }
  if (*(char *)((int)unaff_retaddr + 0x49) == '\0') {
    if ((*(char *)((int)unaff_retaddr + 0x44) == '\0') ||
       (*(char *)((int)unaff_retaddr + 0x44) == '\x04')) {
      glBegin(4);
      fStack_c = 0.0;
      if (0 < *(int *)((int)unaff_retaddr + 0x34)) {
        iStack_4 = 0;
        do {
          iVar7 = *(int *)((int)unaff_retaddr + 0x30) + iStack_4;
          iVar13 = *(int *)(iVar7 + 0x14);
          glTexCoord2f(*(undefined4 *)(iVar7 + 0x10),iVar13);
          if (cVar10 == '\0') {
            glColor4fv(unaff_ESI * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
          }
          glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + unaff_ESI * 0xc);
          glTexCoord2f(*(undefined4 *)(iVar7 + 0x18),*(undefined4 *)(iVar7 + 0x1c));
          if (cVar10 == '\0') {
            glColor4fv(iVar12 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
          }
          glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar12 * 0xc);
          glTexCoord2f(*(undefined4 *)(iVar7 + 0x20),*(undefined4 *)(iVar7 + 0x24));
          if (cVar10 == '\0') {
            glColor4fv(iVar13 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
          }
          glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar13 * 0xc);
          fStack_c = (float)((int)fStack_c + 1);
          iStack_4 = iStack_4 + 0x30;
        } while ((int)fStack_c < *(int *)((int)unaff_retaddr + 0x34));
      }
      glEnd();
    }
    pcVar9 = glTexGeni_exref;
    if ((*(byte *)((int)unaff_retaddr + 0x44) & 2) != 0) {
      glTexGeni(0x2000,0x2500,0x2402);
      iVar13 = 0x2402;
      glTexGeni(0x2001,0x2500,0x2402);
      iVar12 = 0xc60;
      (*pcVar4)(0xc60);
      (*pcVar4)(0xc61);
      glBegin(4);
      iVar7 = 0;
      if (0 < *(int *)((int)unaff_retaddr + 0x34)) {
        iVar6 = 0;
        do {
          iVar3 = *(int *)(*(int *)((int)unaff_retaddr + 0x30) + iVar6);
          iVar8 = iVar3 * 0xc;
          glNormal3fv(*(int *)((int)unaff_retaddr + 0x20) + iVar8);
          iVar11 = iVar12;
          iVar5 = iVar13;
          if (cVar10 == '\0') {
            glColor4fv(iVar3 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            iVar11 = iVar12;
            iVar5 = iVar13;
          }
          glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar8);
          iVar13 = iVar5;
          glNormal3fv(*(int *)((int)unaff_retaddr + 0x20) + iVar5 * 0xc);
          if (cVar10 == '\0') {
            glColor4fv(iVar5 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
          }
          glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar5 * 0xc);
          iVar12 = iVar11;
          glNormal3fv(*(int *)((int)unaff_retaddr + 0x20) + iVar11 * 0xc);
          if (cVar10 == '\0') {
            glColor4fv(iVar11 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
          }
          glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar11 * 0xc);
          iVar7 = iVar7 + 1;
          iVar6 = iVar6 + 0x30;
          pcVar4 = glEnable_exref;
          pcVar9 = glTexGeni_exref;
        } while (iVar7 < *(int *)((int)unaff_retaddr + 0x34));
      }
      glEnd();
    }
    if ((*(byte *)((int)unaff_retaddr + 0x44) & 1) != 0) {
      if (DAT_0041fca0 == '\0') {
        glBegin(4);
        iStack_4 = 0;
        if (0 < *(int *)((int)unaff_retaddr + 0x34)) {
          iVar12 = 0;
          do {
            piVar1 = (int *)(*(int *)((int)unaff_retaddr + 0x30) + iVar12);
            fStack_c = (float)piVar1[1];
            iVar13 = piVar1[5];
            iVar7 = *piVar1;
            glTexCoord2f(piVar1[4],iVar13);
            if (cVar10 == '\0') {
              glColor4fv(iVar7 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar7 * 0xc);
            glTexCoord2f(piVar1[6],piVar1[7]);
            if (cVar10 == '\0') {
              glColor4fv(unaff_ESI * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + unaff_ESI * 0xc);
            glTexCoord2f(piVar1[8],piVar1[9]);
            if (cVar10 == '\0') {
              glColor4fv(iVar13 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar13 * 0xc);
            iStack_4 = iStack_4 + 1;
            iVar12 = iVar12 + 0x30;
            pcVar4 = glEnable_exref;
            pcVar9 = glTexGeni_exref;
          } while (iStack_4 < *(int *)((int)unaff_retaddr + 0x34));
        }
        glEnd();
        (*pcVar4)(0xbe2);
        glBlendFunc(1,1);
        (*pcVar9)(0x2000,0x2500,0x2402);
        iVar13 = 0x2001;
        (*pcVar9)(0x2001,0x2500,0x2402);
        (*pcVar4)(0xc60);
        (*pcVar4)(0xc61);
        iVar12 = DAT_00481f18;
        if (*(int *)((int)unaff_retaddr + 0x4c) != 0) {
          iVar12 = *(int *)((int)unaff_retaddr + 0x4c);
        }
        FUN_004123f0(iVar12);
        iVar12 = 0x3f800000;
        glColor3f(0x3f800000,0x3f800000,0x3f800000);
        glBegin(4);
        iVar7 = 0;
        if (0 < *(int *)((int)unaff_retaddr + 0x34)) {
          iVar6 = 0;
          do {
            iVar3 = *(int *)(iVar6 + *(int *)((int)unaff_retaddr + 0x30));
            iVar8 = iVar3 * 0xc;
            glNormal3fv(*(int *)((int)unaff_retaddr + 0x20) + iVar8);
            iVar11 = iVar12;
            iVar5 = iVar13;
            if (cVar10 == '\0') {
              glColor4fv(iVar3 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
              iVar11 = iVar12;
              iVar5 = iVar13;
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar8);
            iVar13 = iVar5;
            glNormal3fv(*(int *)((int)unaff_retaddr + 0x20) + iVar5 * 0xc);
            if (cVar10 == '\0') {
              glColor4fv(iVar5 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar5 * 0xc);
            iVar12 = iVar11;
            glNormal3fv(*(int *)((int)unaff_retaddr + 0x20) + iVar11 * 0xc);
            if (cVar10 == '\0') {
              glColor4fv(iVar11 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar11 * 0xc);
            iVar7 = iVar7 + 1;
            iVar6 = iVar6 + 0x30;
          } while (iVar7 < *(int *)((int)unaff_retaddr + 0x34));
        }
        glEnd();
      }
      else {
        (*DAT_0041fc9c)(0x84c0);
        glBindTexture(0xde1,*(undefined4 *)((int)unaff_retaddr + 0x38));
        glTexEnvi(0x2300,0x2200,0x2100);
        (*pcVar4)(0xde1);
        (*DAT_0041fc9c)(0x84c1);
        iVar12 = *(int *)((int)unaff_retaddr + 0x4c);
        if (*(int *)((int)unaff_retaddr + 0x4c) == 0) {
          iVar12 = DAT_00481f18;
        }
        glBindTexture(0xde1,iVar12);
        (*pcVar4)(0xde1);
        glTexEnvi(0x2300,0x2200,0x8570);
        glTexEnvi(0x2300,0x8571,0x104);
        (*pcVar9)(0x2000,0x2500,0x2402);
        (*pcVar9)(0x2001,0x2500,0x2402);
        (*pcVar4)(0xc60);
        iVar7 = 0xc61;
        (*pcVar4)();
        iVar13 = 4;
        glBegin(4);
        iVar12 = 0;
        if (0 < *(int *)((int)unaff_retaddr + 0x34)) {
          iVar6 = 0;
          do {
            piVar1 = (int *)(iVar6 + *(int *)((int)unaff_retaddr + 0x30));
            iVar3 = *piVar1;
            puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x20) + iVar3 * 0xc);
            glNormal3f(*puVar2,puVar2[1],puVar2[2]);
            iVar11 = piVar1[4];
            (*DAT_0041fc48)(0x84c0,iVar11,piVar1[5]);
            if (cVar10 == '\0') {
              glColor4fv(iVar13 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            iVar3 = *(int *)((int)unaff_retaddr + 0x24) + iVar3 * 0xc;
            glVertex3fv();
            iVar5 = iVar7 * 0xc;
            puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x20) + iVar5);
            glNormal3f(*puVar2,puVar2[1],
                       *(undefined4 *)(*(int *)((int)unaff_retaddr + 0x20) + 8 + iVar5));
            iVar8 = 0x84c0;
            (*DAT_0041fc48)(0x84c0,piVar1[6],piVar1[7]);
            if (cVar10 == '\0') {
              glColor4fv(iVar11 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar5);
            puVar2 = (undefined4 *)(*(int *)((int)unaff_retaddr + 0x20) + iVar3 * 0xc);
            glNormal3f(*puVar2,puVar2[1],puVar2[2]);
            (*DAT_0041fc48)(0x84c0,piVar1[8],piVar1[9]);
            if (cVar10 == '\0') {
              glColor4fv(iVar8 * 0x10 + *(int *)((int)unaff_retaddr + 0x1c));
            }
            glVertex3fv(*(int *)((int)unaff_retaddr + 0x24) + iVar3 * 0xc);
            iVar12 = iVar12 + 1;
            iVar6 = iVar6 + 0x30;
          } while (iVar12 < *(int *)((int)unaff_retaddr + 0x34));
        }
        glEnd();
        (*DAT_0041fc9c)(0x84c1);
        glDisable(0xde1);
        (*DAT_0041fc9c)(0x84c0);
        glDisable(0xde1);
        glPopAttrib();
      }
    }
  }
  glColor4f(0x3f800000,0x3f800000,0x3f800000,0x3f800000);
  return;
}


// ==== FUN_00418170 @ 00418170 ====

void __cdecl FUN_00418170(int param_1)

{
  int *piVar1;
  undefined4 *puVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int unaff_EDI;
  undefined4 uVar7;
  undefined4 uVar8;
  undefined4 uVar9;
  int iVar10;
  float local_18;
  float local_14;
  float local_10;
  float local_c [3];
  
  FUN_00418830(*(uint *)(param_1 + 0x3c),local_c,&local_10,&local_14,&local_18);
  glColor4f(local_c[0],local_10,local_14,local_18);
  glDisable(0xde1);
  glBegin(1);
  iVar10 = 0;
  if (0 < *(int *)(param_1 + 0x34)) {
    local_14 = 0.0;
    do {
      piVar1 = (int *)((int)local_14 + *(int *)(param_1 + 0x30));
      iVar4 = piVar1[1];
      iVar3 = *piVar1 * 0xc;
      puVar2 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar3);
      glVertex3f(*puVar2,puVar2[1],puVar2[2]);
      iVar4 = iVar4 * 0xc;
      puVar2 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar4);
      iVar6 = puVar2[1];
      glVertex3f(*puVar2,iVar6,*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar4));
      puVar2 = (undefined4 *)(iVar4 + *(int *)(param_1 + 0x24));
      glVertex3f(*puVar2,puVar2[1],puVar2[2]);
      iVar5 = unaff_EDI * 0xc;
      puVar2 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar5);
      glVertex3f(*puVar2,puVar2[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar5));
      iVar4 = *(int *)(param_1 + 0x24);
      if (*(char *)(param_1 + 0x49) == '\0') {
        glVertex3f(*(undefined4 *)(iVar4 + iVar5),*(undefined4 *)(iVar4 + 4 + iVar5),
                   *(undefined4 *)(iVar4 + 8 + iVar5));
        uVar9 = *(undefined4 *)(iVar3 + 8 + *(int *)(param_1 + 0x24));
        puVar2 = (undefined4 *)(iVar3 + *(int *)(param_1 + 0x24));
        uVar8 = puVar2[1];
        uVar7 = *puVar2;
      }
      else {
        glVertex3f(*(undefined4 *)(iVar4 + iVar5),*(undefined4 *)(iVar4 + 4 + iVar5),
                   *(undefined4 *)(iVar4 + 8 + iVar5));
        iVar6 = iVar6 * 0xc;
        puVar2 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar6);
        glVertex3f(*puVar2,puVar2[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar6));
        puVar2 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar6);
        glVertex3f(*puVar2,puVar2[1],puVar2[2]);
        puVar2 = (undefined4 *)(iVar3 + *(int *)(param_1 + 0x24));
        uVar9 = puVar2[2];
        uVar8 = puVar2[1];
        uVar7 = *puVar2;
      }
      glVertex3f(uVar7,uVar8,uVar9);
      iVar10 = iVar10 + 1;
      local_14 = (float)((int)local_14 + 0x30);
    } while (iVar10 < *(int *)(param_1 + 0x34));
  }
  glEnd();
  glColor4f(0x3f800000,0x3f800000,0x3f800000,0x3f800000);
  return;
}


// ==== FUN_00418330 @ 00418330 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00418330(int param_1)

{
  undefined4 *puVar1;
  uint uVar2;
  int iVar3;
  int iVar4;
  int *piVar5;
  undefined4 uVar6;
  int iVar7;
  int iVar8;
  int iVar9;
  
  uVar2 = *(uint *)(param_1 + 0x3c);
  glColor4f((float)(uVar2 >> 0x10 & 0xff) * _DAT_0041aa6c,(float)(uVar2 >> 8 & 0xff) * _DAT_0041aa6c
            ,(float)(uVar2 & 0xff) * _DAT_0041aa6c,(float)(uVar2 >> 0x18) * _DAT_0041aa6c);
  glDisable(0xde1);
  if (*(char *)(param_1 + 0x49) == '\0') {
    uVar6 = 4;
  }
  else {
    uVar6 = 7;
  }
  glBegin(uVar6);
  iVar7 = 0;
  if (0 < *(int *)(param_1 + 0x34)) {
    iVar9 = 0;
    do {
      piVar5 = (int *)(*(int *)(param_1 + 0x30) + iVar9);
      iVar3 = piVar5[1];
      iVar4 = piVar5[2];
      iVar8 = piVar5[3];
      puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + *piVar5 * 0xc);
      glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + *piVar5 * 0xc));
      puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar3 * 0xc);
      glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar3 * 0xc));
      puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar4 * 0xc);
      glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar4 * 0xc));
      if (*(char *)(param_1 + 0x49) == '\x01') {
        puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar8 * 0xc);
        glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar8 * 0xc));
      }
      iVar7 = iVar7 + 1;
      iVar9 = iVar9 + 0x30;
    } while (iVar7 < *(int *)(param_1 + 0x34));
  }
  glEnd();
  glColor4f(0x3f800000,0x3f800000,0x3f800000,0x3f800000);
  return;
}


// ==== FUN_004184c0 @ 004184c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_004184c0(int param_1)

{
  undefined4 *puVar1;
  uint uVar2;
  int iVar3;
  int iVar4;
  int *piVar5;
  int iVar6;
  int iVar7;
  
  uVar2 = *(uint *)(param_1 + 0x3c);
  glColor4f((float)(uVar2 >> 0x10 & 0xff) * _DAT_0041aa6c,(float)(uVar2 >> 8 & 0xff) * _DAT_0041aa6c
            ,(float)(uVar2 & 0xff) * _DAT_0041aa6c,(float)(uVar2 >> 0x18) * _DAT_0041aa6c);
  glDisable(0xde1);
  glBegin(0);
  iVar6 = 0;
  if (0 < *(int *)(param_1 + 0x34)) {
    iVar7 = 0;
    do {
      piVar5 = (int *)(*(int *)(param_1 + 0x30) + iVar7);
      iVar3 = piVar5[1];
      iVar4 = piVar5[2];
      puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + *piVar5 * 0xc);
      glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + *piVar5 * 0xc));
      puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar3 * 0xc);
      glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar3 * 0xc));
      puVar1 = (undefined4 *)(*(int *)(param_1 + 0x24) + iVar4 * 0xc);
      glVertex3f(*puVar1,puVar1[1],*(undefined4 *)(*(int *)(param_1 + 0x24) + 8 + iVar4 * 0xc));
      iVar6 = iVar6 + 1;
      iVar7 = iVar7 + 0x30;
    } while (iVar6 < *(int *)(param_1 + 0x34));
  }
  glEnd();
  glColor4f(0x3f800000,0x3f800000,0x3f800000,0x3f800000);
  return;
}


// ==== FUN_00418610 @ 00418610 ====

void __cdecl FUN_00418610(int param_1)

{
  FUN_004123f0(*(undefined4 *)(param_1 + 0x38));
  if ((*(byte *)(param_1 + 0x40) & 4) != 0) {
    FUN_00417860();
  }
  if ((*(byte *)(param_1 + 0x40) & 2) != 0) {
    FUN_00418330(param_1);
  }
  if ((*(byte *)(param_1 + 0x40) & 8) != 0) {
    FUN_004184c0(param_1);
  }
  if (((*(byte *)(param_1 + 0x40) & 0x10) != 0) && (DAT_00481ef8 != (code *)0x0)) {
    (*DAT_00481ef8)(param_1);
  }
  if (((*(byte *)(param_1 + 0x40) & 0x20) != 0) && (DAT_00481efc != (code *)0x0)) {
    (*DAT_00481efc)(param_1);
  }
  if (((*(byte *)(param_1 + 0x40) & 0x40) != 0) && (DAT_00481f00 != (code *)0x0)) {
    (*DAT_00481f00)(param_1);
  }
  if (((*(byte *)(param_1 + 0x40) & 0x80) != 0) && (DAT_00481f04 != (code *)0x0)) {
    (*DAT_00481f04)(param_1);
  }
  if (((*(uint *)(param_1 + 0x40) & 0x100) != 0) && (DAT_00481f08 != (code *)0x0)) {
    (*DAT_00481f08)(param_1);
  }
  if (((*(uint *)(param_1 + 0x40) & 0x200) != 0) && (DAT_00481f0c != (code *)0x0)) {
    (*DAT_00481f0c)(param_1);
  }
  if (((*(uint *)(param_1 + 0x40) & 0x400) != 0) && (DAT_00481f10 != (code *)0x0)) {
    (*DAT_00481f10)(param_1);
  }
  if (((*(uint *)(param_1 + 0x40) & 0x800) != 0) && (DAT_00481f14 != (code *)0x0)) {
    (*DAT_00481f14)(param_1);
  }
  if ((*(byte *)(param_1 + 0x40) & 1) != 0) {
    FUN_00418170(param_1);
  }
  return;
}


// ==== FUN_00418700 @ 00418700 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00418700(int param_1)

{
  uint *puVar1;
  uint uVar2;
  uint *puVar3;
  int iVar4;
  int local_14;
  
  puVar1 = operator_new(param_1 * param_1 * 4);
  local_14 = 0;
  if (0 < param_1) {
    do {
      iVar4 = 0;
      puVar3 = puVar1;
      do {
        uVar2 = ftol();
        if ((int)uVar2 < 0) {
          uVar2 = 0;
        }
        else if (0xff < (int)uVar2) {
          uVar2 = 0xff;
        }
        iVar4 = iVar4 + 1;
        *puVar3 = ((((int)uVar2 >> 2) << 8 | uVar2) << 8 | uVar2) << 8 | uVar2;
        puVar3 = puVar3 + 1;
      } while (iVar4 < param_1);
      local_14 = local_14 + 1;
      puVar1 = puVar1 + param_1;
    } while (local_14 < param_1);
  }
  FUN_00412300();
  return;
}


// ==== FUN_00418800 @ 00418800 ====

void FUN_00418800(void)

{
  if (DAT_00481f1c == '\0') {
    DAT_00481f18 = FUN_00418700(0x80);
    DAT_00481f1c = '\x01';
  }
  return;
}


// ==== FUN_00418830 @ 00418830 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00418830(uint param_1,float *param_2,float *param_3,float *param_4,float *param_5)

{
  *param_2 = (float)(param_1 >> 0x10 & 0xff) * _DAT_0041aa6c;
  *param_3 = (float)(param_1 >> 8 & 0xff) * _DAT_0041aa6c;
  *param_4 = (float)(param_1 & 0xff) * _DAT_0041aa6c;
  if (param_5 != (float *)0x0) {
    *param_5 = (float)(param_1 >> 0x18) * _DAT_0041aa6c;
  }
  return;
}


// ==== FUN_00418980 @ 00418980 ====

/* WARNING: Unable to track spacebase fully for stack */

void FUN_00418980(void)

{
  uint in_EAX;
  undefined1 *puVar1;
  undefined4 unaff_retaddr;
  
  puVar1 = &stack0x00000004;
  for (; 0xfff < in_EAX; in_EAX = in_EAX - 0x1000) {
    puVar1 = puVar1 + -0x1000;
  }
  *(undefined4 *)(puVar1 + (-4 - in_EAX)) = unaff_retaddr;
  return;
}


// ==== FUN_00418a76 @ 00418a76 ====

void FUN_00418a76(undefined4 param_1,undefined4 param_2,int param_3,undefined *param_4)

{
  void *local_14;
  undefined *puStack_10;
  undefined *puStack_c;
  undefined4 local_8;
  
  puStack_c = &DAT_0041ac78;
  puStack_10 = &DAT_00418e1c;
  local_14 = ExceptionList;
  local_8 = 0;
  ExceptionList = &local_14;
  while( true ) {
    param_3 = param_3 + -1;
    if (param_3 < 0) break;
    (*(code *)param_4)();
  }
  local_8 = 0xffffffff;
  FUN_00418ade();
  ExceptionList = local_14;
  return;
}


// ==== FUN_00418ade @ 00418ade ====

void FUN_00418ade(void)

{
  int unaff_EBP;
  
  if (*(int *)(unaff_EBP + -0x1c) == 0) {
    FUN_00418af6(*(undefined4 *)(unaff_EBP + 8),*(undefined4 *)(unaff_EBP + 0xc),
                 *(int *)(unaff_EBP + 0x10),*(undefined **)(unaff_EBP + 0x14));
  }
  return;
}


// ==== FUN_00418af6 @ 00418af6 ====

void FUN_00418af6(undefined4 param_1,undefined4 param_2,int param_3,undefined *param_4)

{
  void *local_14;
  undefined *puStack_10;
  undefined *puStack_c;
  undefined4 local_8;
  
  puStack_c = &DAT_0041ac88;
  puStack_10 = &DAT_00418e1c;
  local_14 = ExceptionList;
  local_8 = 0;
  ExceptionList = &local_14;
  while( true ) {
    param_3 = param_3 + -1;
    if (param_3 < 0) break;
    (*(code *)param_4)();
  }
  ExceptionList = local_14;
  return;
}


// ==== entry @ 00418b6a ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void entry(void)

{
  undefined4 *puVar1;
  HMODULE pHVar2;
  byte *pbVar3;
  char **local_74;
  _startupinfo local_70;
  int local_6c;
  char **local_68;
  int local_64;
  _STARTUPINFOA local_60;
  undefined1 *local_1c;
  void *pvStack_14;
  undefined *puStack_10;
  undefined *puStack_c;
  undefined4 local_8;
  
  puStack_c = &DAT_0041ac98;
  puStack_10 = &DAT_00418e1c;
  pvStack_14 = ExceptionList;
  local_1c = &stack0xffffff78;
  local_8 = 0;
  ExceptionList = &pvStack_14;
  __set_app_type(2);
  _DAT_00481f34 = 0xffffffff;
  _DAT_00481f38 = 0xffffffff;
  puVar1 = (undefined4 *)__p__fmode();
  *puVar1 = DAT_00481f2c;
  puVar1 = (undefined4 *)__p__commode();
  *puVar1 = DAT_00481f28;
  _DAT_00481f30 = *(undefined4 *)_adjust_fdiv_exref;
  FUN_00418e4f();
  if (DAT_0041d5e0 == 0) {
    __setusermatherr(&LAB_00418e4c);
  }
  FUN_00418e3a();
  initterm(&DAT_0041d010,&DAT_0041d014);
  local_70.newmode = DAT_00481f24;
  __getmainargs(&local_64,&local_74,&local_68,DAT_00481f20,&local_70);
  initterm(&DAT_0041d000,&DAT_0041d00c);
  pbVar3 = *(byte **)_acmdln_exref;
  if (*pbVar3 != 0x22) {
    do {
      if (*pbVar3 < 0x21) goto LAB_00418c5d;
      pbVar3 = pbVar3 + 1;
    } while( true );
  }
  do {
    pbVar3 = pbVar3 + 1;
    if (*pbVar3 == 0) break;
  } while (*pbVar3 != 0x22);
  if (*pbVar3 != 0x22) goto LAB_00418c5d;
  do {
    pbVar3 = pbVar3 + 1;
LAB_00418c5d:
  } while ((*pbVar3 != 0) && (*pbVar3 < 0x21));
  local_60.dwFlags = 0;
  GetStartupInfoA(&local_60);
  pHVar2 = GetModuleHandleA((LPCSTR)0x0);
  local_6c = FUN_00403820(pHVar2);
                    /* WARNING: Subroutine does not return */
  exit(local_6c);
}


// ==== __alldiv @ 00418d00 ====

/* Library Function - Single Match
    __alldiv
   
   Library: Visual Studio */

undefined8 __alldiv(uint param_1,uint param_2,uint param_3,uint param_4)

{
  ulonglong uVar1;
  longlong lVar2;
  uint uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  uint uVar7;
  uint uVar8;
  bool bVar10;
  char cVar11;
  uint uVar9;
  
  cVar11 = (int)param_2 < 0;
  if ((bool)cVar11) {
    bVar10 = param_1 != 0;
    param_1 = -param_1;
    param_2 = -(uint)bVar10 - param_2;
  }
  if ((int)param_4 < 0) {
    cVar11 = cVar11 + '\x01';
    bVar10 = param_3 != 0;
    param_3 = -param_3;
    param_4 = -(uint)bVar10 - param_4;
  }
  uVar3 = param_1;
  uVar5 = param_3;
  uVar6 = param_2;
  uVar9 = param_4;
  if (param_4 == 0) {
    uVar3 = param_2 / param_3;
    iVar4 = (int)(((ulonglong)param_2 % (ulonglong)param_3 << 0x20 | (ulonglong)param_1) /
                 (ulonglong)param_3);
  }
  else {
    do {
      uVar8 = uVar9 >> 1;
      uVar5 = uVar5 >> 1 | (uint)((uVar9 & 1) != 0) << 0x1f;
      uVar7 = uVar6 >> 1;
      uVar3 = uVar3 >> 1 | (uint)((uVar6 & 1) != 0) << 0x1f;
      uVar6 = uVar7;
      uVar9 = uVar8;
    } while (uVar8 != 0);
    uVar1 = CONCAT44(uVar7,uVar3) / (ulonglong)uVar5;
    iVar4 = (int)uVar1;
    lVar2 = (ulonglong)param_3 * (uVar1 & 0xffffffff);
    uVar3 = (uint)((ulonglong)lVar2 >> 0x20);
    uVar5 = uVar3 + iVar4 * param_4;
    if (((CARRY4(uVar3,iVar4 * param_4)) || (param_2 < uVar5)) ||
       ((param_2 <= uVar5 && (param_1 < (uint)lVar2)))) {
      iVar4 = iVar4 + -1;
    }
    uVar3 = 0;
  }
  if (cVar11 == '\x01') {
    bVar10 = iVar4 != 0;
    iVar4 = -iVar4;
    uVar3 = -(uint)bVar10 - uVar3;
  }
  return CONCAT44(uVar3,iVar4);
}


// ==== __allmul @ 00418db0 ====

/* Library Function - Single Match
    __allmul
   
   Library: Visual Studio */

longlong __allmul(uint param_1,int param_2,uint param_3,int param_4)

{
  if (param_4 == 0 && param_2 == 0) {
    return (ulonglong)param_1 * (ulonglong)param_3;
  }
  return CONCAT44((int)((ulonglong)param_1 * (ulonglong)param_3 >> 0x20) +
                  param_2 * param_3 + param_1 * param_4,
                  (int)((ulonglong)param_1 * (ulonglong)param_3));
}


// ==== __allshl @ 00418df0 ====

/* Library Function - Single Match
    __allshl
   
   Library: Visual Studio */

longlong __fastcall __allshl(byte param_1,int param_2)

{
  uint in_EAX;
  
  if (0x3f < param_1) {
    return 0;
  }
  if (param_1 < 0x20) {
    return CONCAT44(param_2 << (param_1 & 0x1f) | in_EAX >> 0x20 - (param_1 & 0x1f),
                    in_EAX << (param_1 & 0x1f));
  }
  return (ulonglong)(in_EAX << (param_1 & 0x1f)) << 0x20;
}


// ==== FUN_00418e3a @ 00418e3a ====

void FUN_00418e3a(void)

{
  _controlfp(0x10000,0x30000);
  return;
}


// ==== FUN_00418e4f @ 00418e4f ====

void FUN_00418e4f(void)

{
  return;
}


// ==== Unwind@00418e60 @ 00418e60 ====

void Unwind_00418e60(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418e6b @ 00418e6b ====

void Unwind_00418e6b(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418e80 @ 00418e80 ====

void Unwind_00418e80(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x14));
  return;
}


// ==== Unwind@00418ea0 @ 00418ea0 ====

void Unwind_00418ea0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418ec0 @ 00418ec0 ====

void Unwind_00418ec0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418ecb @ 00418ecb ====

void Unwind_00418ecb(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418ee0 @ 00418ee0 ====

void Unwind_00418ee0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418eeb @ 00418eeb ====

void Unwind_00418eeb(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418f00 @ 00418f00 ====

void Unwind_00418f00(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418f0b @ 00418f0b ====

void Unwind_00418f0b(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00418f20 @ 00418f20 ====

void Unwind_00418f20(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f2b @ 00418f2b ====

void Unwind_00418f2b(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f36 @ 00418f36 ====

void Unwind_00418f36(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f41 @ 00418f41 ====

void Unwind_00418f41(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f4c @ 00418f4c ====

void Unwind_00418f4c(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f57 @ 00418f57 ====

void Unwind_00418f57(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f62 @ 00418f62 ====

void Unwind_00418f62(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f6d @ 00418f6d ====

void Unwind_00418f6d(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f78 @ 00418f78 ====

void Unwind_00418f78(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f83 @ 00418f83 ====

void Unwind_00418f83(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f8e @ 00418f8e ====

void Unwind_00418f8e(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418f99 @ 00418f99 ====

void Unwind_00418f99(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418fa4 @ 00418fa4 ====

void Unwind_00418fa4(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418faf @ 00418faf ====

void Unwind_00418faf(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418fba @ 00418fba ====

void Unwind_00418fba(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418fc5 @ 00418fc5 ====

void Unwind_00418fc5(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418fd0 @ 00418fd0 ====

void Unwind_00418fd0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418fdb @ 00418fdb ====

void Unwind_00418fdb(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418fe6 @ 00418fe6 ====

void Unwind_00418fe6(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418ff1 @ 00418ff1 ====

void Unwind_00418ff1(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00418ffc @ 00418ffc ====

void Unwind_00418ffc(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@00419007 @ 00419007 ====

void Unwind_00419007(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@00419012 @ 00419012 ====

void Unwind_00419012(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@0041901d @ 0041901d ====

void Unwind_0041901d(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@00419028 @ 00419028 ====

void Unwind_00419028(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@00419033 @ 00419033 ====

void Unwind_00419033(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@0041903e @ 0041903e ====

void Unwind_0041903e(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x30));
  return;
}


// ==== Unwind@00419049 @ 00419049 ====

void Unwind_00419049(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00419060 @ 00419060 ====

void Unwind_00419060(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@0041906b @ 0041906b ====

void Unwind_0041906b(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419080 @ 00419080 ====

void Unwind_00419080(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004190a0 @ 004190a0 ====

void Unwind_004190a0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004190c0 @ 004190c0 ====

void Unwind_004190c0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004190e0 @ 004190e0 ====

void Unwind_004190e0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419100 @ 00419100 ====

void Unwind_00419100(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x14));
  return;
}


// ==== Unwind@00419120 @ 00419120 ====

void Unwind_00419120(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419140 @ 00419140 ====

void Unwind_00419140(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x68));
  return;
}


// ==== Unwind@00419160 @ 00419160 ====

void Unwind_00419160(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419180 @ 00419180 ====

void Unwind_00419180(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x14));
  return;
}


// ==== Unwind@0041918b @ 0041918b ====

void Unwind_0041918b(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x14));
  return;
}


// ==== Unwind@004191a0 @ 004191a0 ====

void Unwind_004191a0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004191c0 @ 004191c0 ====

void Unwind_004191c0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004191e0 @ 004191e0 ====

void Unwind_004191e0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419200 @ 00419200 ====

void Unwind_00419200(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 8));
  return;
}


// ==== Unwind@0041920b @ 0041920b ====

void Unwind_0041920b(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 8));
  return;
}


// ==== Unwind@00419216 @ 00419216 ====

void Unwind_00419216(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 8));
  return;
}


// ==== Unwind@00419221 @ 00419221 ====

void Unwind_00419221(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 8));
  return;
}


// ==== Unwind@0041922c @ 0041922c ====

void Unwind_0041922c(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 8));
  return;
}


// ==== Unwind@00419250 @ 00419250 ====

void Unwind_00419250(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419270 @ 00419270 ====

void Unwind_00419270(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@00419290 @ 00419290 ====

void Unwind_00419290(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004192b0 @ 004192b0 ====

void Unwind_004192b0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@004192d0 @ 004192d0 ====

void Unwind_004192d0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + 4));
  return;
}


// ==== Unwind@004192f0 @ 004192f0 ====

void Unwind_004192f0(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


// ==== Unwind@00419310 @ 00419310 ====

void Unwind_00419310(void)

{
  int unaff_EBP;
  
  operator_delete(*(void **)(unaff_EBP + -0x10));
  return;
}


