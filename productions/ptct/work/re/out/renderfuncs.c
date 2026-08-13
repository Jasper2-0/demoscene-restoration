// ==== 401000 ====

undefined4 FUN_00401000(void)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  void *this;
  int in_ECX;
  undefined4 *this_00;
  void *pvStack_c;
  undefined *puStack_8;
  undefined4 uStack_4;
  
  uVar1 = DAT_0041d938;
  uStack_4 = 0xffffffff;
  puStack_8 = &DAT_00418e76;
  pvStack_c = ExceptionList;
  ExceptionList = &pvStack_c;
  puVar2 = operator_new(0x1c);
  this_00 = (undefined4 *)0x0;
  uStack_4 = 0;
  if (puVar2 != (undefined4 *)0x0) {
    this_00 = FUN_004163c0(puVar2);
  }
  uStack_4 = 0xffffffff;
  this = operator_new(0x5c);
  uStack_4 = 1;
  if (this == (void *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_00416770(this,1000,2000,uVar1);
  }
  uStack_4 = 0xffffffff;
  FUN_004164b0(this_00,puVar2);
  puVar2[0x10] = 4;
  *(undefined1 *)(puVar2 + 0x11) = 1;
  uVar1 = DAT_0041d93c;
  puVar2[0x13] = DAT_0041d93c;
  *(undefined1 *)((int)puVar2 + 0x45) = 0;
  *(undefined1 *)((int)puVar2 + 0x46) = 1;
  *(undefined4 **)(in_ECX + 4) = this_00;
  ExceptionList = pvStack_c;
  return CONCAT31((int3)((uint)uVar1 >> 8),1);
}


// ==== 4013d0 ====

void FUN_004013d0(void)

{
  double dVar1;
  int iVar2;
  void *this;
  int in_ECX;
  float10 fVar3;
  uint unaff_retaddr;
  
  glClear(0x100);
  iVar2 = *(int *)(in_ECX + 4);
  this = (void *)**(undefined4 **)(iVar2 + 8);
  fVar3 = (float10)fsin((float10)unaff_retaddr * (float10)0.0005);
  dVar1 = (double)(fVar3 + fVar3 + (float10)8.0);
  FUN_004010c0((int)this,SUB84(dVar1,0),(int)((ulonglong)dVar1 >> 0x20),
               SUB84((double)unaff_retaddr,0),(int)((ulonglong)(double)unaff_retaddr >> 0x20));
  *(undefined1 *)((int)this + 0x46) = 1;
  FUN_004168d0(this,0x42b40000,0,0);
  FUN_004168d0(*(void **)(iVar2 + 4),0xc2c80000,0,0);
  FUN_00416ee0(*(void **)(iVar2 + 4),0xc2c80000,0,0x43960000);
  *(undefined4 *)(*(int *)(iVar2 + 4) + 0x20) = 0x42700000;
  FUN_004164d0(iVar2);
  return;
}


// ==== 4016e0 ====

void FUN_004016e0(uint param_1)

{
  float fVar1;
  int iVar2;
  int in_ECX;
  float10 fVar3;
  float10 fVar4;
  
  iVar2 = *(int *)(in_ECX + 4);
  fVar3 = (float10)fsin((float10)param_1 * (float10)0.00011111111);
  fVar1 = (float)(fVar3 * (float10)50.0 + (float10)500.0);
  fVar3 = (float10)param_1 * (float10)0.000125;
  fVar4 = (float10)fsin(fVar3);
  fVar3 = (float10)fcos(fVar3);
  FUN_004168d0(*(void **)(iVar2 + 4),-(float)(fVar4 * (float10)fVar1),0x43480000,
               (float)-(fVar3 * (float10)fVar1));
  FUN_00416ee0(*(void **)(iVar2 + 4),(float)(fVar4 * (float10)fVar1),
               SQRT(fVar1 * fVar1 + fVar1 * fVar1) * 0.8,(float)(fVar3 * (float10)fVar1));
  FUN_004168d0(*(void **)(*(int *)(iVar2 + 8) + 4),0,(float)param_1 * 0.0033333334,0);
  fVar3 = (float10)fsin((float10)param_1 * (float10)0.0001);
  *(undefined4 *)(*(int *)(iVar2 + 4) + 0x20) = 0x43020000;
  *(float *)(*(int *)(iVar2 + 4) + 0x1c) = (float)(fVar3 * (float10)13.0);
  *(undefined4 *)(**(int **)(iVar2 + 8) + 0x50) = 0x44480000;
  *(undefined4 *)(**(int **)(iVar2 + 8) + 0x54) = 0xff0000;
  FUN_004164d0(iVar2);
  return;
}


// ==== 401b70 ====

void FUN_00401b70(uint param_1)

{
  float fVar1;
  float fVar2;
  float fVar3;
  int iVar4;
  float fVar5;
  float *pfVar6;
  int in_ECX;
  int iVar7;
  int iVar8;
  float10 fVar9;
  float10 fVar10;
  float10 fVar11;
  float10 fVar12;
  float10 fVar13;
  
  fVar5 = (float)param_1;
  iVar8 = 0;
  iVar4 = **(int **)(*(int *)(in_ECX + 4) + 8);
  if (0 < *(int *)(iVar4 + 0x28)) {
    fVar9 = (float10)fsin((float10)param_1 * (float10)0.0001);
    fVar9 = fVar9 * (float10)20.0 + (float10)30.0;
    fVar10 = (float10)param_1 * (float10)0.00033333333;
    pfVar6 = *(float **)(iVar4 + 0x24);
    iVar7 = 0;
    do {
      iVar8 = iVar8 + 1;
      fVar1 = *(float *)(iVar7 + 4 + DAT_0041d5ec);
      fVar2 = *(float *)(iVar7 + 8 + DAT_0041d5ec);
      fVar11 = (float10)fcos((float10)fVar2 / fVar9 + fVar10);
      fVar12 = (float10)fcos((float10)fVar1 / fVar9 + fVar10);
      fVar13 = (float10)fcos((float10)*(float *)(iVar7 + DAT_0041d5ec) / fVar9 + fVar10);
      fVar11 = ((fVar13 + fVar12 + fVar11) * (float10)3.0 * (float10)0.24390243902439027 +
               (float10)1.5) * (float10)0.6;
      fVar3 = (float)fVar11;
      *pfVar6 = (float)(fVar11 * (float10)*(float *)(iVar7 + DAT_0041d5ec));
      pfVar6[1] = fVar3 * fVar1;
      pfVar6[2] = fVar3 * fVar2;
      pfVar6 = pfVar6 + 3;
      iVar7 = iVar7 + 0xc;
    } while (iVar8 < *(int *)(iVar4 + 0x28));
  }
  FUN_004168d0((void *)**(undefined4 **)(*(int *)(in_ECX + 4) + 8),fVar5 * 0.016666668,fVar5 * 0.02,
               fVar5 * 0.011111111);
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0,0,0x43610000);
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 401929 ====

void FUN_00401929(void)

{
  return;
}


// ==== 4020d0 ====

undefined4 FUN_004020d0(void)

{
  LPCSTR pCVar1;
  undefined4 *puVar2;
  undefined4 uVar3;
  int in_ECX;
  int iVar4;
  undefined4 extraout_ECX;
  undefined4 extraout_ECX_00;
  undefined4 in_EDX;
  undefined4 *puVar5;
  undefined4 *puVar6;
  float *pfVar7;
  undefined8 uVar8;
  int iStack_404;
  undefined4 auStack_400 [256];
  
  puVar6 = auStack_400;
  for (iVar4 = 0x100; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar6 = 0;
    puVar6 = puVar6 + 1;
  }
  iVar4 = 0x100;
  uVar3 = 0;
  pfVar7 = (float *)(in_ECX + 0x404);
  do {
    uVar8 = FUN_004119a0(uVar3,in_EDX);
    pfVar7[-0x100] = (float)((uint)uVar8 & 0xff) * 0.001953125 + 0.25;
    uVar8 = FUN_004119a0(extraout_ECX,(int)((ulonglong)uVar8 >> 0x20));
    in_EDX = (undefined4)((ulonglong)uVar8 >> 0x20);
    iVar4 = iVar4 + -1;
    *pfVar7 = (float)((uint)uVar8 & 0xff) * 0.001953125 + 0.25;
    pfVar7[0x200] = 0.0;
    pfVar7[0x100] = 0.0;
    uVar3 = extraout_ECX_00;
    pfVar7 = pfVar7 + 1;
  } while (iVar4 != 0);
  FUN_004126b0(0,0x40,'\x01',0);
  puVar6 = auStack_400;
  puVar5 = (undefined4 *)(in_ECX + 0xc04);
  iStack_404 = 0x100;
  do {
    pCVar1 = (LPCSTR)*puVar6;
    if (pCVar1 != (LPCSTR)0x0) {
      puVar2 = operator_new(0x10000);
      RtlZeroMemory(puVar2,0x10000);
      FUN_00412700(pCVar1,(int)puVar2,0x80,-10,0x100,0x40,'\x01');
      FUN_00401f90(puVar2,0x100,0x40);
      uVar3 = FUN_00412300();
      *puVar5 = uVar3;
    }
    puVar6 = puVar6 + 1;
    puVar5 = puVar5 + 1;
    iStack_404 = iStack_404 + -1;
  } while (iStack_404 != 0);
  return 1;
}


// ==== 402210 ====

void FUN_00402210(void)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  int iVar5;
  int iVar6;
  int in_ECX;
  int iVar7;
  int *piVar8;
  float10 fVar9;
  
  glEnable(0xbe2);
  glBlendFunc(1,1);
  iVar5 = FUN_004119d0();
  piVar8 = (int *)(in_ECX + 0x804);
  iVar7 = 0x100;
  do {
    if (((*piVar8 != 0) && (iVar6 = iVar5 - *piVar8, 0 < iVar6)) && (piVar8[0x100] != 0)) {
      fVar1 = (float)iVar6;
      fVar9 = (float10)1.0 - (float10)iVar6 * (float10)0.000125;
      if ((float10)0.0 < fVar9) {
        fVar9 = (float10)fcos(fVar9 * (float10)6.2831855);
        fVar2 = (float)((float10)0.5 - fVar9 * (float10)0.5);
        FUN_004123f0(piVar8[0x100]);
        fVar3 = (float)piVar8[-0x200];
        fVar4 = (float)piVar8[-0x100];
        glColor3f(fVar2,fVar2,fVar2);
        FUN_004124a0(fVar3 - (fVar1 + fVar1),fVar4 - fVar1 * 0.7,fVar1 * 4.0,fVar1 * 1.4);
      }
      else {
        *piVar8 = 0;
      }
    }
    piVar8 = piVar8 + 1;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  return;
}


// ==== 402330 ====

undefined4 FUN_00402330(void)

{
  LPCSTR pCVar1;
  char **ppcVar2;
  undefined4 *puVar3;
  undefined4 uVar4;
  int in_ECX;
  int iVar5;
  undefined4 extraout_ECX;
  undefined4 extraout_ECX_00;
  undefined4 in_EDX;
  undefined4 *puVar6;
  float *pfVar7;
  undefined8 uVar8;
  int iStack_404;
  char *apcStack_400 [4];
  char *pcStack_3f0;
  char *pcStack_3ec;
  char *pcStack_3e8;
  char *pcStack_3e4;
  char *pcStack_3e0;
  char *pcStack_3dc;
  char *apcStack_3d8 [10];
  char *apcStack_3b0 [10];
  char *apcStack_388 [226];
  
  ppcVar2 = apcStack_400;
  for (iVar5 = 0x100; iVar5 != 0; iVar5 = iVar5 + -1) {
    *ppcVar2 = (char *)0x0;
    ppcVar2 = ppcVar2 + 1;
  }
  iVar5 = 0x100;
  uVar4 = 0;
  pfVar7 = (float *)(in_ECX + 0x404);
  do {
    uVar8 = FUN_004119a0(uVar4,in_EDX);
    pfVar7[-0x100] = (float)((uint)uVar8 & 0xff) * 0.001953125 + 0.25;
    uVar8 = FUN_004119a0(extraout_ECX,(int)((ulonglong)uVar8 >> 0x20));
    in_EDX = (undefined4)((ulonglong)uVar8 >> 0x20);
    iVar5 = iVar5 + -1;
    *pfVar7 = (float)((uint)uVar8 & 0xff) * 0.001953125 + 0.25;
    pfVar7[0x200] = 0.0;
    pfVar7[0x100] = 0.0;
    uVar4 = extraout_ECX_00;
    pfVar7 = pfVar7 + 1;
  } while (iVar5 != 0);
  iVar5 = 10;
  apcStack_400[0] = s_p_l_e_a_s_e_i_t_0041d0f8;
  apcStack_400[1] = s_p_l_e_a_s_e_i_t_0041d0f8;
  apcStack_400[2] = s_p_l_e_a_s_e_i_t_0041d0f8;
  apcStack_400[3] = s_p_l_e_a_s_e_i_t_0041d0f8;
  pcStack_3f0 = s_p_l_e_a_s_e_i_t_0041d0f8;
  pcStack_3ec = s_p_l_e_a_s_e_i_t_0041d0f8;
  pcStack_3e8 = s_p_l_e_a_s_e_i_t_0041d0f8;
  pcStack_3e4 = s_p_l_e_a_s_e_i_t_0041d0f8;
  pcStack_3e0 = s_p_l_e_a_s_e_i_t_0041d0f8;
  pcStack_3dc = s_p_l_e_a_s_e_i_t_0041d0f8;
  ppcVar2 = apcStack_400;
  do {
    ppcVar2[10] = *ppcVar2;
    ppcVar2[0x14] = *ppcVar2;
    ppcVar2[0x1e] = *ppcVar2;
    ppcVar2 = ppcVar2 + 1;
    iVar5 = iVar5 + -1;
  } while (iVar5 != 0);
  FUN_004126b0(0,0x20,'\0',0);
  ppcVar2 = apcStack_400;
  puVar6 = (undefined4 *)(in_ECX + 0xc04);
  iStack_404 = 0x100;
  do {
    pCVar1 = *ppcVar2;
    if (pCVar1 != (LPCSTR)0x0) {
      puVar3 = operator_new(0x8000);
      RtlZeroMemory(puVar3,0x8000);
      FUN_00412700(pCVar1,(int)puVar3,0,-4,0x100,0x20,'\0');
      FUN_00401f90(puVar3,0x100,0x20);
      uVar4 = FUN_00412300();
      *puVar6 = uVar4;
    }
    ppcVar2 = ppcVar2 + 1;
    puVar6 = puVar6 + 1;
    iStack_404 = iStack_404 + -1;
  } while (iStack_404 != 0);
  return 1;
}


// ==== 402490 ====

void FUN_00402490(void)

{
  float fVar1;
  float fVar2;
  float fVar3;
  int iVar4;
  int in_ECX;
  int iVar5;
  int iVar6;
  int *piVar7;
  float10 fVar8;
  
  glEnable(0xbe2);
  glBlendFunc(1,1);
  iVar4 = FUN_004119d0();
  piVar7 = (int *)(in_ECX + 0x804);
  iVar5 = 0x100;
  do {
    if (*piVar7 != 0) {
      iVar6 = (iVar4 - *piVar7) * 2;
      if ((0 < iVar6) && (piVar7[0x100] != 0)) {
        fVar8 = (float10)1.0 - (float10)iVar6 * (float10)0.000125;
        if ((float10)0.0 < fVar8) {
          fVar8 = (float10)fcos(fVar8 * (float10)6.2831855);
          fVar1 = (float)((float10)0.5 - fVar8 * (float10)0.5);
          FUN_004123f0(piVar7[0x100]);
          fVar2 = (float)piVar7[-0x200];
          fVar3 = (float)piVar7[-0x100];
          glColor3f(fVar1,fVar1,fVar1);
          fVar1 = 800.0 / (float)(iVar6 + 8);
          FUN_004124a0(fVar2 - (fVar1 + fVar1),fVar3 - fVar1 * 0.35,fVar1 * 4.0,fVar1 * 0.7);
        }
        else {
          *piVar7 = 0;
        }
      }
    }
    piVar7 = piVar7 + 1;
    iVar5 = iVar5 + -1;
  } while (iVar5 != 0);
  return;
}


// ==== 402a50 ====

void FUN_00402a50(undefined4 param_1)

{
  int in_ECX;
  
  DAT_0041d930 = param_1;
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0,0,0x43480000);
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 4) + 4),0,0,0);
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 402de0 ====

void FUN_00402de0(void)

{
  double dVar1;
  int iVar2;
  void *this;
  float fVar3;
  int in_ECX;
  float10 fVar4;
  uint unaff_retaddr;
  
  glClear(0x100);
  iVar2 = *(int *)(in_ECX + 4);
  this = (void *)**(undefined4 **)(iVar2 + 8);
  fVar4 = (float10)fsin((float10)unaff_retaddr * (float10)0.0005);
  dVar1 = (double)(fVar4 + fVar4 + (float10)8.0);
  FUN_00402b50((int)this,SUB84(dVar1,0),(int)((ulonglong)dVar1 >> 0x20),
               (double)((float10)unaff_retaddr * (float10)0.0005));
  fVar3 = (float)unaff_retaddr * 0.005;
  *(undefined1 *)((int)this + 0x46) = 1;
  FUN_004168d0(this,fVar3 * 1.5,fVar3 * 1.9,fVar3 * 1.212);
  FUN_004168d0(*(void **)(iVar2 + 4),0x41200000,0x41200000,0x41200000);
  FUN_00416ee0(*(void **)(iVar2 + 4),0x437f0000,0x437f0000,0x437f0000);
  *(undefined4 *)(*(int *)(iVar2 + 4) + 0x20) = 0x42700000;
  FUN_004164d0(iVar2);
  return;
}


// ==== 404fb0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00404fb0(uint param_1)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float *pfVar6;
  int iVar7;
  int iVar8;
  int *piVar9;
  int iVar10;
  int iVar11;
  float10 fVar12;
  float10 fVar13;
  float10 fVar14;
  byte abStack_1f [2];
  undefined1 uStack_1d;
  float fStack_1c;
  float fStack_18;
  float fStack_14;
  float fStack_10;
  undefined4 uStack_c;
  float fStack_8;
  undefined4 uStack_4;
  
  iVar11 = 0;
  uStack_c = 0;
  fStack_14 = (float)param_1;
  *(undefined4 *)(DAT_0041e944 + 0x28) = 0;
  *(undefined4 *)(DAT_0041e944 + 0x34) = 0;
  _DAT_0041d280 = 4.0 - fStack_14 * 0.00033333333;
  if (_DAT_0041d280 < 0.1) {
    _DAT_0041d280 = 0.1;
  }
  fVar4 = fStack_14 * 8.333333e-05;
  fStack_10 = fVar4;
  FUN_00404d30(0.0,fVar4);
  FUN_00404550();
  iVar10 = *(int *)(DAT_0041e944 + 0x28);
  if (0 < iVar10) {
    iVar7 = 0;
    do {
      pfVar6 = (float *)(*(int *)(DAT_0041e944 + 0x24) + iVar7);
      fVar2 = pfVar6[1];
      fVar1 = *pfVar6;
      fVar3 = pfVar6[2];
      fStack_10 = SQRT(fVar1 * fVar1 + fVar2 * fVar2 + fVar3 * fVar3);
      fVar5 = _DAT_0041d288;
      if (iVar11 < iVar10 / 2) {
        fVar5 = _DAT_0041d284;
      }
      fStack_1c = fVar5 * (fVar2 / fStack_10);
      fStack_18 = fVar5 * (fVar3 / fStack_10);
      iVar11 = iVar11 + 1;
      iVar7 = iVar7 + 0xc;
      *pfVar6 = (fVar1 / fStack_10) * fVar5;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -8 + iVar7) = fStack_1c;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar7) = fStack_18;
    } while (iVar11 < iVar10);
  }
  FUN_00404d30(1.4013e-45,fVar4);
  FUN_00404550();
  iVar11 = *(int *)(DAT_0041e944 + 0x28);
  iVar7 = (iVar11 - iVar10) / 2 + iVar10;
  if (iVar10 < iVar11) {
    iVar8 = iVar10 * 0xc;
    do {
      pfVar6 = (float *)(*(int *)(DAT_0041e944 + 0x24) + iVar8);
      fVar2 = pfVar6[1];
      fVar1 = *pfVar6;
      fVar3 = pfVar6[2];
      fStack_10 = SQRT(fVar1 * fVar1 + fVar2 * fVar2 + fVar3 * fVar3);
      fVar5 = _DAT_0041d288;
      if (iVar10 < iVar7) {
        fVar5 = _DAT_0041d284;
      }
      fStack_18 = fVar5 * (fVar2 / fStack_10);
      fStack_1c = fVar5 * (fVar3 / fStack_10);
      iVar10 = iVar10 + 1;
      iVar8 = iVar8 + 0xc;
      *pfVar6 = (fVar1 / fStack_10) * fVar5;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -8 + iVar8) = fStack_18;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar8) = -fStack_1c;
    } while (iVar10 < iVar11);
  }
  FUN_00404d30(2.8026e-45,fVar4);
  FUN_00404550();
  iVar10 = *(int *)(DAT_0041e944 + 0x28);
  iVar7 = (iVar10 - iVar11) / 2 + iVar11;
  if (iVar11 < iVar10) {
    iVar8 = iVar11 * 0xc;
    do {
      pfVar6 = (float *)(*(int *)(DAT_0041e944 + 0x24) + iVar8);
      fVar2 = pfVar6[1];
      fVar1 = *pfVar6;
      fVar3 = pfVar6[2];
      fStack_10 = SQRT(fVar1 * fVar1 + fVar2 * fVar2 + fVar3 * fVar3);
      fVar5 = _DAT_0041d288;
      if (iVar11 < iVar7) {
        fVar5 = _DAT_0041d284;
      }
      fStack_1c = fVar5 * (fVar2 / fStack_10);
      fStack_18 = fVar5 * (fVar3 / fStack_10);
      iVar11 = iVar11 + 1;
      iVar8 = iVar8 + 0xc;
      *pfVar6 = (fVar1 / fStack_10) * fVar5;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -8 + iVar8) = fStack_18;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar8) = fStack_1c;
    } while (iVar11 < iVar10);
  }
  FUN_00404d30(4.2039e-45,fVar4);
  FUN_00404550();
  iVar11 = *(int *)(DAT_0041e944 + 0x28);
  iVar7 = (iVar11 - iVar10) / 2 + iVar10;
  if (iVar10 < iVar11) {
    iVar8 = iVar10 * 0xc;
    do {
      pfVar6 = (float *)(*(int *)(DAT_0041e944 + 0x24) + iVar8);
      fVar2 = pfVar6[1];
      fVar1 = *pfVar6;
      fVar3 = pfVar6[2];
      fStack_10 = SQRT(fVar1 * fVar1 + fVar2 * fVar2 + fVar3 * fVar3);
      fVar5 = _DAT_0041d288;
      if (iVar10 < iVar7) {
        fVar5 = _DAT_0041d284;
      }
      fStack_1c = fVar5 * (fVar2 / fStack_10);
      fStack_18 = fVar5 * (fVar3 / fStack_10);
      iVar10 = iVar10 + 1;
      iVar8 = iVar8 + 0xc;
      *pfVar6 = (fVar1 / fStack_10) * fVar5;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -8 + iVar8) = -fStack_18;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar8) = fStack_1c;
    } while (iVar10 < iVar11);
  }
  FUN_00404d30(5.60519e-45,fVar4);
  FUN_00404550();
  iVar10 = *(int *)(DAT_0041e944 + 0x28);
  iVar7 = (iVar10 - iVar11) / 2 + iVar11;
  if (iVar11 < iVar10) {
    iVar8 = iVar11 * 0xc;
    do {
      pfVar6 = (float *)(*(int *)(DAT_0041e944 + 0x24) + iVar8);
      fStack_18 = pfVar6[1];
      fVar1 = *pfVar6;
      fStack_1c = pfVar6[2];
      fStack_10 = SQRT(fVar1 * fVar1 + fStack_18 * fStack_18 + fStack_1c * fStack_1c);
      fStack_18 = fStack_18 / fStack_10;
      fStack_1c = fStack_1c / fStack_10;
      fVar2 = _DAT_0041d288;
      if (iVar11 < iVar7) {
        fVar2 = _DAT_0041d284;
      }
      iVar11 = iVar11 + 1;
      iVar8 = iVar8 + 0xc;
      *pfVar6 = fVar2 * fStack_1c;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -8 + iVar8) = fVar2 * fStack_18;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar8) = (fVar1 / fStack_10) * fVar2;
    } while (iVar11 < iVar10);
  }
  FUN_00404d30(7.00649e-45,fVar4);
  FUN_00404550();
  fVar4 = fStack_8;
  iVar11 = *(int *)(DAT_0041e944 + 0x28);
  iVar7 = (iVar11 - iVar10) / 2 + iVar10;
  if (iVar10 < iVar11) {
    iVar8 = iVar10 * 0xc;
    do {
      pfVar6 = (float *)(*(int *)(DAT_0041e944 + 0x24) + iVar8);
      fStack_18 = pfVar6[1];
      fVar1 = *pfVar6;
      fStack_1c = pfVar6[2];
      fStack_10 = SQRT(fVar1 * fVar1 + fStack_18 * fStack_18 + fStack_1c * fStack_1c);
      fStack_18 = fStack_18 / fStack_10;
      fStack_1c = fStack_1c / fStack_10;
      fVar2 = _DAT_0041d288;
      if (iVar10 < iVar7) {
        fVar2 = _DAT_0041d284;
      }
      *pfVar6 = -(fStack_1c * fVar2);
      iVar10 = iVar10 + 1;
      iVar8 = iVar8 + 0xc;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -8 + iVar8) = fStack_18 * fVar2;
      *(float *)(*(int *)(DAT_0041e944 + 0x24) + -4 + iVar8) = (fVar1 / fStack_10) * fVar2;
    } while (iVar10 < iVar11);
  }
  iVar11 = 0;
  if (0 < *(int *)(DAT_0041e944 + 0x34)) {
    iVar10 = 0;
    do {
      piVar9 = (int *)(*(int *)(DAT_0041e944 + 0x30) + iVar10);
      piVar9[4] = (int)(*(float *)(*(int *)(DAT_0041e944 + 0x24) + *piVar9 * 0xc) * 0.00125);
      *(float *)(*(int *)(DAT_0041e944 + 0x30) + iVar10 + 0x14) =
           *(float *)(*(int *)(DAT_0041e944 + 0x24) + 4 +
                     *(int *)(*(int *)(DAT_0041e944 + 0x30) + iVar10) * 0xc) * 0.00125;
      iVar7 = *(int *)(DAT_0041e944 + 0x30) + iVar10;
      *(float *)(iVar7 + 0x18) =
           *(float *)(*(int *)(DAT_0041e944 + 0x24) + *(int *)(iVar7 + 4) * 0xc) * 0.00125;
      iVar7 = *(int *)(DAT_0041e944 + 0x30) + iVar10;
      *(float *)(iVar7 + 0x1c) =
           *(float *)(*(int *)(DAT_0041e944 + 0x24) + 4 + *(int *)(iVar7 + 4) * 0xc) * 0.00125;
      iVar7 = *(int *)(DAT_0041e944 + 0x30) + iVar10;
      *(float *)(iVar7 + 0x20) =
           *(float *)(*(int *)(DAT_0041e944 + 0x24) + *(int *)(iVar7 + 8) * 0xc) * 0.00125;
      iVar7 = *(int *)(DAT_0041e944 + 0x30) + iVar10;
      iVar11 = iVar11 + 1;
      iVar10 = iVar10 + 0x30;
      *(float *)(iVar7 + 0x24) =
           *(float *)(*(int *)(DAT_0041e944 + 0x24) + 4 + *(int *)(iVar7 + 8) * 0xc) * 0.00125;
    } while (iVar11 < *(int *)(DAT_0041e944 + 0x34));
  }
  FUN_004168d0(*(void **)(*(int *)((int)fStack_8 + 4) + 4),0,0,0);
  uStack_4 = 0;
  iVar11 = 0;
  fVar12 = (float10)fsin((float10)fStack_14 * (float10)0.00021739131);
  fVar1 = (float)(fVar12 * (float10)200.0);
  fVar12 = (float10)fcos((float10)fStack_14 * (float10)0.00021739131);
  fVar12 = fVar12 * (float10)200.0;
  fVar13 = (float10)fsin((float10)(param_1 + 0x5eaa) * (float10)0.00021739131);
  fVar2 = (float)(fVar13 * (float10)200.0);
  fVar3 = (float)SQRT((float10)fVar1 * (float10)fVar1 +
                      fVar12 * fVar12 + fVar13 * (float10)200.0 * (float10)fVar2);
  fStack_18 = (fVar1 / fVar3) * 950.0;
  fStack_10 = 0.0;
  do {
    fVar13 = (float10)(int)fStack_10;
    fStack_10 = (float)((int)fStack_10 + 100);
    iVar11 = iVar11 + 0x20;
    fVar13 = fVar13 + (float10)fStack_14 * (float10)0.0005;
    fVar14 = (float10)fsin(fVar13);
    *(float *)(*(int *)(*(int *)((int)fStack_8 + 4) + 0xc) + -0x10 + iVar11) =
         (float)((float10)_DAT_0041d288 * fVar14);
    *(float *)(*(int *)(*(int *)((int)fStack_8 + 4) + 0xc) + -0x10 + iVar11) =
         (float)(fVar14 * (float10)_DAT_0041d288);
    fVar13 = (float10)fcos(fVar13);
    *(float *)(*(int *)(*(int *)((int)fStack_8 + 4) + 0xc) + -0x10 + iVar11) =
         (float)(fVar13 * (float10)_DAT_0041d288);
  } while ((int)fStack_10 < 300);
  fStack_8 = (float)((fVar12 / (float10)fVar3) * (float10)950.0);
  FUN_00409500(abStack_1f,&uStack_1d);
  FUN_00416ee0(*(void **)(*(int *)((int)fVar4 + 4) + 4),fStack_18,fStack_8,(fVar2 / fVar3) * 950.0);
  if (abStack_1f[0] < 0x10) {
    *(undefined1 *)(DAT_0041e944 + 0x48) = 0;
  }
  else {
    *(undefined1 *)(DAT_0041e944 + 0x48) = 1;
  }
  *(undefined4 *)(DAT_0041e944 + 0x40) = 4;
  *(undefined4 *)(*(int *)(*(int *)((int)fVar4 + 4) + 4) + 0x20) = 0x43020000;
  FUN_004164d0(*(int *)((int)fVar4 + 4));
  FUN_004164d0(*(int *)((int)fVar4 + 4));
  return;
}


// ==== 4058e0 ====

void FUN_004058e0(void)

{
  glDisable(0xde1);
  glDisable();
  glEnable(0xbe2);
  glBlendFunc(0x302,0x303);
  glColor4f(0x3f800000,0x3f800000,0x3f800000,0x3de9e1b0);
  FUN_004124a0(0.0,0.0,1.0,1.0);
  return;
}


// ==== 405980 ====

void FUN_00405980(void)

{
  glDisable(0xde1);
  glDisable();
  glEnable(0xbe2);
  glBlendFunc(0x302,0x303);
  glColor4f(0,0,0,0x3ed41206);
  FUN_004124a0(0.0,0.0,1.0,1.0);
  return;
}


// ==== 405a10 ====

void FUN_00405a10(void)

{
  glDisable(0xde1);
  glDisable();
  glEnable(0xbe2);
  glBlendFunc(0x302,0x303);
  glColor4f(0,0,0,0x3f788073);
  FUN_004124a0(0.0,0.0,1.0,1.0);
  return;
}


// ==== 405aa0 ====

void FUN_00405aa0(void)

{
  glDisable(0xde1);
  glDisable();
  glEnable(0xbe2);
  glBlendFunc(0x302,0x303);
  glColor4f(0,0,0,0x3de9e1b0);
  FUN_004124a0(0.0,0.0,1.0,1.0);
  return;
}


// ==== 405b30 ====

void FUN_00405b30(void)

{
  float fVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  float10 fVar5;
  float10 fVar6;
  float fVar7;
  float fVar8;
  float fVar9;
  undefined4 uStack_8;
  
  if (DAT_0041e95c == 0) {
    DAT_0041e960 = operator_new(0x1000);
    RtlZeroMemory(DAT_0041e960,0x400);
    iVar4 = 0;
    iVar3 = 0;
    do {
      iVar2 = iVar4 + 0x40;
      *(undefined4 *)(iVar4 + (int)DAT_0041e960) = 0xafafafaf;
      *(undefined4 *)(iVar3 + (int)DAT_0041e960) = 0xafafafaf;
      iVar4 = iVar2;
      iVar3 = iVar3 + 4;
    } while (iVar2 < 0x400);
    DAT_0041e95c = FUN_00412300();
  }
  glEnable(0xbe2);
  glBlendFunc(1,1);
  FUN_004123f0(DAT_0041e95c);
  fVar8 = 1.0;
  iVar4 = 0;
  do {
    fVar5 = ((float10)1.0 - (float10)uStack_8 * (float10)0.00037509378) / (float10)fVar8;
    fVar1 = (float)fVar5;
    if (fVar5 <= (float10)0.0) {
      return;
    }
    fVar5 = (float10)uStack_8 * (float10)0.00025;
    fVar7 = (float)fVar5;
    fsin(fVar5);
    fVar5 = (float10)fVar7;
    fsin(fVar5 + (float10)1.5707964);
    fVar6 = (float10)fVar7;
    fsin(fVar6 + (float10)3.1415927);
    fVar9 = (float)((float10)fVar7 + (float10)4.712389);
    fsin((float10)fVar7 + (float10)4.712389);
    glColor3f(fVar1,fVar1,fVar1);
    fcos((float10)fVar9);
    fcos((float10)(float)(fVar6 + (float10)3.1415927));
    fcos((float10)(float)(fVar5 + (float10)1.5707964));
    fcos((float10)fVar7);
    FUN_004125b0();
    fVar8 = fVar8 * 1.5;
    uStack_8 = uStack_8 - 200;
    iVar4 = iVar4 + 1;
  } while (iVar4 < 3);
  return;
}


// ==== 405d70 ====

void FUN_00405d70(void)

{
  uint uVar1;
  float fVar2;
  float fVar3;
  
  uVar1 = ftol();
  fVar2 = (float)uVar1 * 2e-05 - 0.5;
  fVar2 = 1.0 - (fVar2 + fVar2);
  if (0.0 <= fVar2) {
    glEnable(0xbe2);
    fVar3 = 1.4013e-45;
    glBlendFunc(1,1);
    FUN_004123f0(DAT_0041d940);
    glColor3f(fVar2,fVar2);
    FUN_004124a0(fVar2,fVar2,fVar3,fVar3);
    FUN_004124a0(fVar2,fVar2,fVar3,fVar3);
  }
  return;
}


// ==== 405e60 ====

void FUN_00405e60(undefined1 param_1)

{
  int in_ECX;
  
  *(undefined1 *)(in_ECX + 4) = param_1;
  return;
}


// ==== 405f80 ====

void FUN_00405f80(uint param_1)

{
  float fVar1;
  int *piVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  float *pfVar6;
  int in_ECX;
  int iVar7;
  float *pfVar8;
  int iVar9;
  int iVar10;
  float10 fVar11;
  float10 fVar12;
  float10 fVar13;
  
  iVar9 = 0;
  fVar1 = (float)((float10)param_1 * (float10)1.7);
  fVar11 = (float10)fsin((float10)param_1 * (float10)1.7 * (float10)0.000125);
  fVar12 = (float10)fsin((float10)fVar1 * (float10)0.00011111111);
  fVar13 = (float10)fcos((float10)fVar1 * (float10)7.6923076e-05);
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 4) + 4),(float)(fVar11 * (float10)100.0),
               (float)(fVar12 * (float10)100.0),(float)(fVar13 * (float10)100.0));
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),-(float)(fVar11 * (float10)100.0),
               -(float)(fVar12 * (float10)100.0),-(float)(fVar13 * (float10)100.0));
  iVar10 = 0;
  *(float *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x1c) = -fVar1 * 0.005882353;
  piVar2 = *(int **)(*(int *)(in_ECX + 4) + 8);
  fVar1 = (float)param_1 * 0.0005;
  iVar3 = *piVar2;
  iVar4 = piVar2[1];
  if (0 < *(int *)(iVar3 + 0x34)) {
    do {
      iVar7 = *(int *)(iVar4 + 0x30) + iVar9;
      iVar5 = *(int *)(iVar3 + 0x30) + iVar9;
      iVar10 = iVar10 + 1;
      iVar9 = iVar9 + 0x30;
      *(float *)(iVar5 + 0x14) = *(float *)(iVar7 + 0x14) * 4.0 - fVar1;
      *(float *)(iVar5 + 0x1c) = *(float *)(iVar7 + 0x1c) * 4.0 - fVar1;
      *(float *)(iVar5 + 0x24) = *(float *)(iVar7 + 0x24) * 4.0 - fVar1;
      *(float *)(iVar5 + 0x2c) = *(float *)(iVar7 + 0x2c) * 4.0 - fVar1;
    } while (iVar10 < *(int *)(iVar3 + 0x34));
  }
  iVar9 = 0;
  if (0 < *(int *)(iVar3 + 0x28)) {
    iVar10 = 0;
    do {
      pfVar6 = (float *)(*(int *)(iVar4 + 0x24) + iVar10);
      pfVar8 = (float *)(*(int *)(iVar3 + 0x24) + iVar10);
      iVar9 = iVar9 + 1;
      iVar10 = iVar10 + 0xc;
      fVar11 = (float10)fsin((float10)*pfVar6 * (float10)0.005882353 +
                             (float10)pfVar6[2] * (float10)0.01 + (float10)fVar1);
      fVar12 = (float10)fsin((float10)pfVar6[2] * (float10)0.008333334 +
                             (float10)*pfVar6 * (float10)0.0076923077 + (float10)fVar1);
      *pfVar8 = (float)((fVar12 * (float10)0.35 + (float10)1.0) * (float10)*pfVar6);
      pfVar8[2] = (float)((fVar11 * (float10)0.35 + (float10)1.0) * (float10)pfVar6[2]);
    } while (iVar9 < *(int *)(iVar3 + 0x28));
  }
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 406660 ====

void FUN_00406660(uint param_1)

{
  int in_ECX;
  float10 fVar1;
  float10 fVar2;
  float10 fVar3;
  
  fVar1 = (float10)param_1;
  DAT_0041e964 = param_1;
  fVar2 = (float10)fcos(fVar1 * (float10)5.2631578e-05);
  fVar3 = (float10)fsin(fVar1 * (float10)6.57419e-05);
  fVar1 = (float10)fcos(fVar1 * (float10)5.5555556e-05);
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),(float)(fVar1 * (float10)60.0),
               (float)(fVar3 * (float10)30.0),(float)(fVar2 * (float10)10.0 - (float10)120.0));
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 4) + 4),0x40a00000,0,0);
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 406960 ====

void FUN_00406960(ushort param_1)

{
  int *piVar1;
  int in_ECX;
  
  if (param_1 < 0x10) {
    *(undefined4 *)(*(int *)(*(int *)(*(int *)(in_ECX + 8) + 8) + 4) + 0x38) =
         (&DAT_0041d938)[param_1];
    piVar1 = *(int **)(*(int *)(in_ECX + 8) + 8);
    *(undefined4 *)(*piVar1 + 0x38) = *(undefined4 *)(piVar1[1] + 0x38);
  }
  if (param_1 == 0x10) {
    *(undefined4 *)(in_ECX + 4) = 0x463b8000;
    return;
  }
  if (param_1 == 0x11) {
    *(undefined4 *)(in_ECX + 4) = 0x45bb8000;
  }
  return;
}


// ==== 4069c0 ====

void FUN_004069c0(uint param_1)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  uint uVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  int iVar8;
  int iVar9;
  int in_ECX;
  int iVar10;
  uint *puVar11;
  int iVar12;
  int iVar13;
  int iVar14;
  int iVar15;
  float10 fVar16;
  float10 fVar17;
  float10 fVar18;
  int iStack_18;
  
  iVar15 = 0;
  piVar1 = *(int **)(*(int *)(in_ECX + 8) + 8);
  iVar13 = piVar1[1];
  iVar9 = *piVar1;
  iVar2 = piVar1[3];
  iVar3 = piVar1[2];
  fVar5 = (float)param_1;
  iStack_18 = 0;
  fVar6 = fVar5 / (*(float *)(in_ECX + 4) * 1.5);
  fVar7 = fVar5 / (*(float *)(in_ECX + 4) * 0.66);
  if (0 < *(int *)(iVar9 + 0x34)) {
    do {
      iVar8 = iVar15 + *(int *)(iVar9 + 0x30);
      iVar10 = iVar15 + *(int *)(iVar13 + 0x30);
      iVar12 = iVar15 + *(int *)(iVar3 + 0x30);
      iVar14 = iVar15 + *(int *)(iVar2 + 0x30);
      iVar15 = iVar15 + 0x30;
      *(float *)(iVar8 + 0x10) = fVar6 + *(float *)(iVar12 + 0x10);
      *(float *)(iVar8 + 0x14) = fVar7 + *(float *)(iVar12 + 0x14);
      *(float *)(iVar8 + 0x18) = fVar6 + *(float *)(iVar12 + 0x18);
      *(float *)(iVar8 + 0x1c) = fVar7 + *(float *)(iVar12 + 0x1c);
      *(float *)(iVar8 + 0x20) = fVar6 + *(float *)(iVar12 + 0x20);
      *(float *)(iVar8 + 0x24) = fVar7 + *(float *)(iVar12 + 0x24);
      *(float *)(iVar8 + 0x28) = fVar6 + *(float *)(iVar12 + 0x28);
      *(float *)(iVar8 + 0x2c) = fVar7 + *(float *)(iVar12 + 0x2c);
      iStack_18 = iStack_18 + 1;
      *(float *)(iVar10 + 0x10) = fVar6 + *(float *)(iVar14 + 0x10);
      *(float *)(iVar10 + 0x14) = fVar7 + *(float *)(iVar14 + 0x14);
      *(float *)(iVar10 + 0x18) = fVar6 + *(float *)(iVar14 + 0x18);
      *(float *)(iVar10 + 0x1c) = fVar7 + *(float *)(iVar14 + 0x1c);
      *(float *)(iVar10 + 0x20) = fVar6 + *(float *)(iVar14 + 0x20);
      *(float *)(iVar10 + 0x24) = fVar7 + *(float *)(iVar14 + 0x24);
      *(float *)(iVar10 + 0x28) = fVar6 + *(float *)(iVar14 + 0x28);
      *(float *)(iVar10 + 0x2c) = fVar7 + *(float *)(iVar14 + 0x2c);
    } while (iStack_18 < *(int *)(iVar9 + 0x34));
  }
  fVar16 = (float10)param_1 / (float10)*(float *)(in_ECX + 4);
  fVar17 = (float10)fsin(fVar16);
  fVar18 = (float10)fcos(fVar16 + (float10)2.0);
  fVar16 = (float10)fcos(fVar16);
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 8) + 4),(float)fVar17 * -4.0,(float)fVar18 * -4.0,
               (float)(fVar16 * (float10)-4.0));
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 8) + 4),(float)fVar17 * 100.0,(float)fVar18 * 100.0,
               (float)fVar16 * 100.0);
  *(undefined4 *)(*(int *)(*(int *)(in_ECX + 8) + 4) + 0x20) = 0x430c0000;
  puVar11 = &DAT_0041f834;
  *(float *)(*(int *)(*(int *)(in_ECX + 8) + 4) + 0x1c) = fVar5 * 0.005;
  iVar13 = 0;
  do {
    uVar4 = *puVar11;
    puVar11 = puVar11 + 1;
    fVar16 = (float10)((uVar4 & 0x7f) + 10);
    iVar9 = *(int *)(*(int *)(in_ECX + 8) + 0xc) + iVar13;
    iVar13 = iVar13 + 0x20;
    fVar17 = fVar16 + (float10)param_1 * (float10)0.00066666666;
    fVar18 = (float10)fsin(fVar17);
    *(float *)(iVar9 + 0x10) = (float)(fVar16 * fVar18);
    *(float *)(iVar9 + 0x14) = (float)(fVar18 * (float10)20.0);
    fVar17 = (float10)fcos(fVar17);
    *(float *)(iVar9 + 0x18) = (float)(fVar16 * fVar17);
  } while ((int)puVar11 < 0x41f858);
  FUN_00416550(*(void **)(in_ECX + 8),0.0);
  FUN_004164d0(*(int *)(in_ECX + 8));
  glClear(0x100);
  return;
}


// ==== 4078b0 ====

void FUN_004078b0(uint param_1)

{
  int in_ECX;
  
  *(undefined4 *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x38) = (&DAT_0041d938)[param_1 & 0xffff];
  return;
}


// ==== 4078d0 ====

void FUN_004078d0(uint param_1)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  float fVar4;
  float fVar5;
  int iVar6;
  int in_ECX;
  int iVar7;
  int iVar8;
  int iVar9;
  
  iVar9 = 0;
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0,0x459c4000,0);
  fVar4 = (float)param_1;
  *(float *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x1c) = fVar4 * 0.011111111;
  fVar5 = fVar4 * 6.666667e-05;
  piVar1 = *(int **)(*(int *)(in_ECX + 4) + 8);
  iVar2 = *piVar1;
  iVar3 = piVar1[1];
  fVar4 = fVar4 * 6.169031e-05;
  if (0 < *(int *)(iVar2 + 0x34)) {
    iVar8 = 0;
    do {
      iVar6 = iVar8 + *(int *)(iVar2 + 0x30);
      iVar7 = iVar8 + *(int *)(iVar3 + 0x30);
      iVar9 = iVar9 + 1;
      iVar8 = iVar8 + 0x30;
      *(float *)(iVar6 + 0x10) = fVar5 + *(float *)(iVar7 + 0x10);
      *(float *)(iVar6 + 0x14) = fVar4 + *(float *)(iVar7 + 0x14);
      *(float *)(iVar6 + 0x18) = fVar5 + *(float *)(iVar7 + 0x18);
      *(float *)(iVar6 + 0x1c) = fVar4 + *(float *)(iVar7 + 0x1c);
      *(float *)(iVar6 + 0x20) = fVar5 + *(float *)(iVar7 + 0x20);
      *(float *)(iVar6 + 0x24) = fVar4 + *(float *)(iVar7 + 0x24);
      *(float *)(iVar6 + 0x28) = fVar5 + *(float *)(iVar7 + 0x28);
      *(float *)(iVar6 + 0x2c) = fVar4 + *(float *)(iVar7 + 0x2c);
    } while (iVar9 < *(int *)(iVar2 + 0x34));
  }
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 407e40 ====

void FUN_00407e40(uint param_1)

{
  int iVar1;
  int iVar2;
  int iVar3;
  float fVar4;
  int in_ECX;
  float *pfVar5;
  float10 fVar6;
  float10 fVar7;
  float10 fVar8;
  float fStack_80;
  float fStack_7c;
  float fStack_78;
  float fStack_74;
  float fStack_70;
  int iStack_6c;
  int iStack_60;
  float fStack_58;
  float fStack_54;
  float fStack_50;
  float fStack_4c;
  float fStack_48;
  float fStack_44;
  float afStack_40 [16];
  
  param_1 = param_1 >> 2;
  iStack_6c = 0;
  fStack_80 = (float)param_1 * 0.6;
  do {
    fStack_74 = 0.0;
    fStack_78 = 0.0;
    fStack_7c = 0.0;
    iStack_60 = 0;
    pfVar5 = *(float **)(*(int *)(*(int *)(*(int *)(in_ECX + 4) + 8) + iStack_6c) + 0x24);
    do {
      iVar1 = iStack_60;
      if (2 < iStack_60) {
        fVar6 = (float10)fsin((float10)fStack_80 * (float10)-0.00083333335);
        fStack_74 = (float)(fVar6 * (float10)5.0 + (float10)fStack_74);
        fVar6 = (float10)fcos((float10)fStack_80 * (float10)0.00066666666);
        fStack_78 = (float)(fVar6 * (float10)5.0 + (float10)fStack_78);
        fVar6 = (float10)fsin((float10)fStack_80 * (float10)0.0005);
        fStack_7c = (float)(fVar6 * (float10)5.0 + (float10)fStack_7c);
        fStack_80 = fStack_80 - 300.0;
      }
      fVar4 = (float)iStack_60;
      fStack_70 = 0.35 - fVar4 * 0.002631579;
      if (iStack_60 < 2) {
        fStack_70 = 0.5;
      }
      FUN_00407b80(afStack_40,fStack_74 * 0.017453292,fStack_78 * 0.017453292,
                   fStack_7c * 0.017453292);
      iStack_60 = 0;
      do {
        fVar6 = (float10)fsin((float10)iStack_60 * (float10)1.5707963);
        fStack_58 = (float)(fVar6 * (float10)fStack_70);
        fVar6 = (float10)fcos((float10)iStack_60 * (float10)1.5707963);
        fStack_50 = (float)(fVar6 * (float10)fStack_70);
        fStack_54 = fVar4 * 1.5;
        FUN_00407a40(&fStack_4c,&fStack_58,afStack_40);
        *pfVar5 = fStack_4c;
        pfVar5[1] = fStack_48;
        pfVar5[2] = fStack_44;
        pfVar5 = pfVar5 + 3;
        iStack_60 = iStack_60 + 1;
      } while (iStack_60 < 5);
      iStack_60 = iVar1 + 1;
    } while (iStack_60 < 0x14);
    fStack_80 = fStack_80 - 43467.0;
    iStack_6c = iStack_6c + 4;
  } while (iStack_6c < 0x5c);
  iVar1 = *(int *)(*(int *)(*(int *)(in_ECX + 4) + 8) + 0x28);
  iVar2 = *(int *)(iVar1 + 0x28);
  iVar3 = *(int *)(iVar1 + 0x24);
  iVar1 = iVar3 + iVar2 * 0xc;
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),*(float *)(iVar1 + -0xc) * 0.8333333,
               *(float *)(iVar1 + -8) * 0.8333333,*(float *)(iVar3 + -4 + iVar2 * 0xc) * 0.8333333);
  fVar6 = (float10)fsin((float10)param_1 * (float10)0.001);
  *(float *)(*(int *)(*(int *)(in_ECX + 4) + 0xc) + 0x10) = (float)(fVar6 * (float10)20.0);
  fVar6 = (float10)fcos((float10)param_1 * (float10)0.001);
  *(undefined4 *)(*(int *)(*(int *)(in_ECX + 4) + 0xc) + 0x14) = 0x41f00000;
  *(float *)(*(int *)(*(int *)(in_ECX + 4) + 0xc) + 0x18) = (float)(fVar6 * (float10)20.0);
  fVar6 = (float10)fcos((float10)-param_1 * (float10)0.00018518518);
  fVar7 = (float10)fsin((float10)param_1 * (float10)0.00025);
  fVar8 = (float10)fcos((float10)param_1 * (float10)0.00025);
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 4) + 4),(float)(fVar8 * (float10)6.0),
               (float)(fVar7 * (float10)5.0),(float)(fVar6 * (float10)6.0));
  FUN_00416550(*(void **)(in_ECX + 4),0.0);
  *(undefined4 *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x20) = 0x428c0000;
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 408300 ====

void FUN_00408300(void)

{
  int iVar1;
  int iVar2;
  int in_ECX;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int *piVar7;
  float10 fVar8;
  float10 fVar9;
  float fVar10;
  uint uStack_10;
  float fStack_c;
  float fStack_8;
  float fStack_4;
  
  iVar6 = 0;
  FUN_00418830(*(uint *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x54),&fStack_4,&fStack_8,&fStack_c,
               (float *)0x0);
  glClearColor(fStack_4,fStack_8,fStack_c,0);
  glClear(0x4100);
  fVar8 = (float10)uStack_10 * (float10)0.8 * (float10)0.0005;
  fVar9 = (float10)fsin(fVar8);
  fVar10 = (float)(fVar9 * (float10)170.0);
  fVar8 = (float10)fcos(fVar8);
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),fVar10,0x453b8000,
               (float)(fVar8 * (float10)170.0));
  fVar8 = (float10)(float)((float10)uStack_10 * (float10)0.8) * (float10)5.8435107e-05;
  fVar9 = (float10)fsin(fVar8);
  fVar10 = (float)((float10)fVar10 - fVar9 * (float10)300.0);
  fVar8 = (float10)fcos(fVar8);
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 4) + 4),fVar10,
               (float)((float10)3000.0 - fVar8 * (float10)300.0),
               (float)((float10)fVar10 - fVar8 * (float10)300.0));
  *(undefined4 *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x20) = 0x42f00000;
  *(float *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x1c) = (float)uStack_10 * 0.014285714;
  piVar7 = *(int **)(*(int *)(in_ECX + 4) + 8);
  fVar10 = (float)uStack_10 * 0.00033333333;
  iVar4 = *piVar7;
  iVar1 = piVar7[2];
  if (0 < *(int *)(iVar4 + 0x34)) {
    iVar5 = 0;
    do {
      iVar2 = iVar5 + *(int *)(iVar4 + 0x30);
      iVar3 = iVar5 + *(int *)(iVar1 + 0x30);
      iVar6 = iVar6 + 1;
      iVar5 = iVar5 + 0x30;
      *(float *)(iVar2 + 0x14) = *(float *)(iVar3 + 0x14) * 5.0 - fVar10;
      *(float *)(iVar2 + 0x1c) = *(float *)(iVar3 + 0x1c) * 5.0 - fVar10;
      *(float *)(iVar2 + 0x24) = *(float *)(iVar3 + 0x24) * 5.0 - fVar10;
      *(float *)(iVar2 + 0x2c) = *(float *)(iVar3 + 0x2c) * 5.0 - fVar10;
    } while (iVar6 < *(int *)(iVar4 + 0x34));
  }
  iVar6 = 0;
  iVar4 = *(int *)(*(int *)(in_ECX + 4) + 8);
  iVar1 = *(int *)(iVar4 + 4);
  iVar4 = *(int *)(iVar4 + 0xc);
  if (0 < *(int *)(iVar1 + 0x34)) {
    iVar5 = 0;
    do {
      iVar2 = iVar5 + *(int *)(iVar1 + 0x30);
      iVar3 = iVar5 + *(int *)(iVar4 + 0x30);
      iVar6 = iVar6 + 1;
      iVar5 = iVar5 + 0x30;
      *(float *)(iVar2 + 0x14) = *(float *)(iVar3 + 0x14) * 5.0 - fVar10;
      *(float *)(iVar2 + 0x1c) = *(float *)(iVar3 + 0x1c) * 5.0 - fVar10;
      *(float *)(iVar2 + 0x24) = *(float *)(iVar3 + 0x24) * 5.0 - fVar10;
      *(float *)(iVar2 + 0x2c) = *(float *)(iVar3 + 0x2c) * 5.0 - fVar10;
    } while (iVar6 < *(int *)(iVar1 + 0x34));
  }
  iVar4 = 0;
  piVar7 = &DAT_0041f834;
  do {
    iVar1 = *piVar7;
    piVar7 = piVar7 + 1;
    iVar4 = iVar4 + 0x20;
    iVar1 = uStack_10 + iVar1 * 0x51;
    fVar8 = (float10)iVar1 * (float10)0.0013679891;
    *(float *)(*(int *)(*(int *)(in_ECX + 4) + 0xc) + -0xc + iVar4) =
         (float)(6000 - (iVar1 / 6) % 6000);
    fVar9 = (float10)fsin(fVar8);
    *(float *)(*(int *)(*(int *)(in_ECX + 4) + 0xc) + -0x10 + iVar4) =
         (float)(fVar9 * (float10)300.0);
    fVar8 = (float10)fcos(fVar8);
    *(float *)(*(int *)(*(int *)(in_ECX + 4) + 0xc) + -8 + iVar4) = (float)(fVar8 * (float10)300.0);
  } while ((int)piVar7 < 0x41f844);
  *(undefined4 *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x50) = 0x44480000;
  *(undefined4 *)(*(int *)(*(int *)(*(int *)(in_ECX + 4) + 8) + 4) + 0x50) = 0x44480000;
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 408f30 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00408f30(uint param_1)

{
  double dVar1;
  int iVar2;
  void *this;
  int iVar3;
  int iVar4;
  float fVar5;
  int iVar6;
  uint uVar7;
  int in_ECX;
  int *piVar8;
  int iVar9;
  float10 fVar10;
  float10 fVar11;
  float10 fVar12;
  float10 fVar13;
  float fVar14;
  float fVar15;
  ulonglong uStack_18;
  
  uStack_18 = (ulonglong)param_1;
  iVar9 = 0;
  fVar5 = (float)uStack_18 * 0.016666668;
  iVar2 = *(int *)(in_ECX + 4);
  do {
    fVar10 = (float10)fcos(((float10)*(float *)((int)&DAT_0041e9e8 + iVar9) + (float10)fVar5) *
                           (float10)0.0314159);
    iVar6 = ftol();
    fVar14 = *(float *)((int)&DAT_0041efe8 + iVar9);
    fVar15 = (float)iVar6 * _DAT_0041d2f0 + (float)iVar6 * _DAT_0041d2f0 +
             *(float *)((int)&DAT_0041f028 + iVar9);
    uVar7 = ftol();
    FUN_00408610(*(int *)(*(int *)(iVar2 + 8) + iVar9),ABS((float)fVar10),uVar7 & 1,fVar14,fVar15);
    iVar9 = iVar9 + 4;
  } while (iVar9 < 0x40);
  fVar14 = fVar5 * 12.0;
  this = *(void **)(*(int *)(*(int *)(in_ECX + 4) + 8) + 0x40);
  FUN_00416ee0(this,0,0,fVar14);
  param_1 = 0;
  if (0 < *(int *)((int)this + 0x34)) {
    iVar9 = 0;
    do {
      piVar8 = (int *)(*(int *)((int)this + 0x30) + iVar9);
      iVar9 = iVar9 + 0x30;
      iVar6 = *piVar8;
      iVar3 = piVar8[1];
      iVar4 = piVar8[2];
      piVar8[4] = (int)(*(float *)(iVar6 * 0xc + *(int *)((int)this + 0x24)) * 4e-05);
      *(float *)(*(int *)((int)this + 0x30) + -0x18 + iVar9) =
           *(float *)(iVar3 * 0xc + *(int *)((int)this + 0x24)) * 4e-05;
      *(float *)(*(int *)((int)this + 0x30) + -0x10 + iVar9) =
           *(float *)(iVar4 * 0xc + *(int *)((int)this + 0x24)) * 4e-05;
      *(float *)(*(int *)((int)this + 0x30) + -0x1c + iVar9) =
           (*(float *)(iVar6 * 0xc + 8 + *(int *)((int)this + 0x24)) + fVar14) * 4e-05;
      *(float *)(*(int *)((int)this + 0x30) + -0x14 + iVar9) =
           (*(float *)(iVar3 * 0xc + 8 + *(int *)((int)this + 0x24)) + fVar14) * 4e-05;
      *(float *)(*(int *)((int)this + 0x30) + -0xc + iVar9) =
           (*(float *)(iVar4 * 0xc + 8 + *(int *)((int)this + 0x24)) + fVar14) * 4e-05;
      param_1 = param_1 + 1;
    } while ((int)param_1 < *(int *)((int)this + 0x34));
  }
  fVar10 = (float10)fsin((float10)fVar5 * (float10)0.013888888888888888);
  fVar10 = fVar10 * (float10)150.0;
  fVar11 = (float10)fcos((float10)fVar5 * (float10)0.011764705882352941);
  fVar11 = fVar11 * (float10)150.0;
  fVar12 = (float10)fsin((float10)fVar5 * (float10)0.011111111111111112);
  fVar12 = fVar12 * (float10)150.0;
  fVar13 = SQRT(fVar10 * fVar10 + fVar11 * fVar11 + fVar12 * fVar12);
  dVar1 = (double)(fVar13 + (float10)5000.0);
  FUN_004168d0(*(void **)(iVar2 + 4),0,0,fVar14);
  FUN_00416ee0(*(void **)(iVar2 + 4),(float)((float10)dVar1 * (float10)(double)(fVar10 / fVar13)),
               (float)((float10)dVar1 * (float10)(double)((float10)(double)fVar11 / fVar13) +
                      (float10)8000.0),
               (float)((float10)dVar1 * (float10)(double)((float10)(double)fVar12 / fVar13) +
                      (float10)fVar14));
  *(undefined4 *)(*(int *)(iVar2 + 4) + 0x20) = 0x42700000;
  FUN_004164d0(iVar2);
  return;
}


// ==== 4092a0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004092a0(void)

{
  uint uVar1;
  int iVar2;
  int in_ECX;
  float10 fVar3;
  float10 fVar4;
  
  if (DAT_0041d2f4 == -1) {
    DAT_0041d2f4 = FUN_004119d0();
  }
  glEnable(0xbe2);
  glClear(0x100);
  *(undefined1 *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x48) = 1;
  *(undefined4 *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x3c) = 0xffffffff;
  *(undefined1 *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x44) = 4;
  _DAT_0041d2f8 = 1;
  FUN_004119d0();
  uVar1 = ftol();
  *(uint *)(**(int **)(*(int *)(in_ECX + 4) + 8) + 0x3c) = (uVar1 << 8 | uVar1) << 8 | uVar1;
  iVar2 = FUN_004119d0();
  fVar3 = (float10)(uint)(iVar2 - DAT_0041d2f4) * (float10)0.00015738118;
  fVar4 = (float10)fcos(fVar3 * (float10)1.123 + (float10)2.0);
  fVar3 = (float10)fsin(fVar3);
  FUN_004168d0((void *)**(undefined4 **)(*(int *)(in_ECX + 4) + 8),(float)(fVar3 * (float10)-30.0),
               (float)(fVar4 * (float10)30.0 + (float10)90.0),(float)(fVar4 * (float10)-30.0));
  FUN_004168d0(*(void **)(*(int *)(in_ECX + 4) + 4),0,0,0);
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0x41200000,0xc28c0000,0x41200000);
  *(undefined4 *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x20) = 0x43200000;
  *(undefined4 *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x1c) = 0x42340000;
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 409410 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00409410(uint param_1)

{
  DAT_0041d2f4 = FUN_004119d0();
  _DAT_0041d2f8 = param_1 & 0xffff;
  return;
}


