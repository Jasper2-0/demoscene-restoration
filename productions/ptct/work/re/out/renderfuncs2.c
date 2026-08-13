// ==== 407570 ====

/* WARNING: Removing unreachable block (ram,0x00407670) */
/* WARNING: Removing unreachable block (ram,0x004076dd) */
/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00407570(uint param_1)

{
  uint uVar1;
  int in_ECX;
  int *piVar2;
  uint uVar3;
  int iVar4;
  float10 fVar5;
  float10 fVar6;
  float10 fVar7;
  char acStack_e [2];
  uint uStack_c;
  uint uStack_8;
  undefined4 uStack_4;
  
  iVar4 = 0;
  FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0,0x45834000,0);
  *(float *)(*(int *)(*(int *)(in_ECX + 4) + 4) + 0x1c) = (float)param_1 * 0.014285714;
  uVar3 = param_1;
  do {
    uStack_4 = 0;
    fVar5 = (float10)fsin((float10)uVar3 * (float10)0.0001);
    fVar6 = fVar5 * fVar5 * fVar5;
    if ((float10)0.0 <= fVar5) {
      fVar6 = fVar6 * fVar5;
    }
    else {
      fVar6 = -(fVar6 * fVar5);
    }
    fVar5 = (float10)fcos((float10)(float)((float10)uVar3 * (float10)0.0001));
    fVar7 = fVar5 * fVar5 * fVar5;
    if ((float10)0.0 <= fVar5) {
      fVar7 = fVar7 * fVar5;
    }
    else {
      fVar7 = -(fVar7 * fVar5);
    }
    uStack_8 = uVar3;
    FUN_004168d0(*(void **)(*(int *)(*(int *)(in_ECX + 4) + 8) + iVar4),
                 (float)(fVar6 * (float10)250.0),(float)(fVar7 * (float10)208.0),
                 (float)(fVar5 * (float10)331.0));
    iVar4 = iVar4 + 4;
    uVar3 = uVar3 + 200;
  } while (iVar4 < 0x58);
  FUN_00409500(acStack_e,(undefined1 *)&uStack_c);
  uVar3 = uStack_c;
  if ((uStack_c & 0xf) == 0) {
    _DAT_0041e988 = (double)param_1;
  }
  uStack_8 = param_1;
  uStack_4 = 0;
  uVar1 = ftol();
  if ((int)uVar1 < 100) {
    uVar1 = 100;
  }
  if (((uVar3 & 0x1f) < 0x10) && (acStack_e[0] == '\x1a')) {
    FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0,(float)(int)((uVar1 * 5 + -100) * 10),0);
  }
  if (((byte)uStack_c < 0x10) && (acStack_e[0] == '\x1b')) {
    FUN_00416ee0(*(void **)(*(int *)(in_ECX + 4) + 4),0,(float)(int)((uVar1 * 5 + -100) * 10),0);
  }
  piVar2 = &DAT_0041e990;
  do {
    iVar4 = *piVar2;
    piVar2 = piVar2 + 1;
    *(uint *)(iVar4 + 0x3c) = ((uVar1 << 8 | uVar1) << 8 | uVar1) << 8 | uVar1;
  } while ((int)piVar2 < 0x41e9e8);
  FUN_004164d0(*(int *)(in_ECX + 4));
  return;
}


// ==== 406280 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406280(void)

{
  int iVar1;
  int iVar2;
  int iVar3;
  uint uVar4;
  uint uVar5;
  int unaff_EBX;
  uint uVar6;
  float unaff_EDI;
  float10 extraout_ST0;
  float10 fVar7;
  float fVar8;
  float fVar9;
  float fVar10;
  float fVar11;
  float *pfVar12;
  float *pfVar13;
  float *pfVar14;
  float *pfVar15;
  undefined4 uVar16;
  undefined4 uVar17;
  float fVar18;
  int iStack_88;
  float fStack_7c;
  float fStack_78;
  float fStack_74;
  undefined4 uStack_70;
  undefined4 uStack_6c;
  uint uStack_68;
  undefined4 uStack_64;
  undefined4 uStack_60;
  undefined4 uStack_5c;
  uint uStack_58;
  undefined4 uStack_54;
  uint uStack_50;
  undefined4 uStack_4c;
  uint uStack_48;
  undefined4 uStack_44;
  uint uStack_40;
  undefined4 uStack_3c;
  uint uStack_38;
  undefined4 uStack_34;
  undefined4 uStack_30;
  undefined4 uStack_2c;
  uint uStack_28;
  undefined4 uStack_24;
  uint uStack_20;
  undefined4 uStack_1c;
  
  FUN_004123f0(DAT_0041e968);
  glEnable(0xde1);
  glDisable(0xb71);
  glEnable(0xbe2);
  glBlendFunc(1,1);
  fStack_7c = 0.0;
  iVar1 = ftol();
  iVar1 = iVar1 % 7 + 7;
  fVar7 = extraout_ST0;
  if ((float10)2.0 < extraout_ST0) {
    do {
      fVar7 = fVar7 - (float10)2.0;
    } while ((float10)2.0 < fVar7);
  }
  iStack_88 = *(int *)(DAT_0041d934 + iVar1 * 4);
  if (iVar1 == 0xd) {
    iStack_88 = 0;
  }
  uVar16 = 7;
  glBegin(7);
  fVar18 = 0.0;
  iVar1 = iStack_88;
  do {
    uStack_34 = 0;
    uStack_38 = DAT_0041e964;
    uStack_24 = 0;
    uStack_28 = (&DAT_0041f834)[(uint)fVar18 & 0xff] * (int)fVar18;
    fsin((float10)(int)fVar18 + (float10)DAT_0041e964 * (float10)3.030303e-05);
    fcos((float10)uStack_28 + (float10)DAT_0041e964 * (float10)3.030303e-05);
    iVar2 = ftol();
    iVar3 = ftol();
    iVar3 = iVar2 * 0x100 + iVar3;
    if (iVar1 == 0) {
      uVar5 = 0;
    }
    else {
      uVar5 = *(uint *)(iVar1 + iVar3 * 4);
    }
    if (iStack_88 == 0) {
      uVar6 = 0;
    }
    else {
      uVar6 = *(uint *)(iStack_88 + iVar3 * 4);
    }
    if ((uVar5 != 0) || (uVar17 = uVar16, uVar6 != 0)) {
      pfVar14 = &fStack_74;
      pfVar15 = (float *)0x0;
      uStack_58 = uVar5 >> 0x10 & 0xff;
      uStack_54 = 0;
      pfVar13 = &fStack_78;
      pfVar12 = &fStack_7c;
      uStack_70 = ftol();
      uStack_6c = 0;
      uStack_48 = uVar6 >> 0x10 & 0xff;
      uStack_44 = 0;
      iVar1 = ftol();
      uStack_68 = uVar5 >> 8 & 0xff;
      uStack_64 = 0;
      uStack_60 = ftol();
      uStack_5c = 0;
      uStack_50 = uVar6 >> 8 & 0xff;
      uStack_4c = 0;
      uVar4 = ftol();
      uStack_40 = uVar5 & 0xff;
      uStack_3c = 0;
      uStack_30 = ftol();
      uStack_2c = 0;
      uStack_20 = uVar6 & 0xff;
      uStack_1c = 0;
      uVar5 = ftol();
      FUN_00418830((iVar1 << 8 | uVar4) << 8 | uVar5,pfVar12,pfVar13,pfVar14,pfVar15);
      fVar8 = fStack_74;
      glColor3f(fStack_7c,fStack_78,fStack_74);
      fVar11 = 0.0;
      _DAT_0041e970 = 10.0;
      _DAT_0041e96c = 10.0;
      fVar18 = (float)_DAT_0041e978;
      glTexCoord2f(0,0);
      fVar10 = unaff_EDI;
      uVar17 = uVar16;
      glVertex3f(uVar16,_DAT_0041e970 + fVar8,unaff_EDI);
      fVar9 = 1.0;
      glTexCoord2f(0x3f800000,0);
      fVar8 = unaff_EDI;
      glVertex3f(_DAT_0041e96c + fVar11,_DAT_0041e970 + fVar10,unaff_EDI);
      glTexCoord2f(0x3f800000,0x3f800000);
      glVertex3f(_DAT_0041e96c + fVar9,fVar8,unaff_EDI);
      glTexCoord2f(0,0x3f800000);
      glVertex3f(uVar16,fVar8,unaff_EDI);
    }
    fVar18 = (float)((int)fVar18 + 1);
    iVar1 = unaff_EBX;
    uVar16 = uVar17;
  } while ((int)fVar18 < 11000);
  glEnd();
  return;
}


// ==== 402750 ====

void FUN_00402750(void)

{
  uint uVar1;
  float *pfVar2;
  float10 fVar3;
  float10 fVar4;
  float10 fVar5;
  float10 fVar6;
  undefined4 uVar7;
  float fVar8;
  undefined4 uVar9;
  float fVar10;
  float fVar11;
  float fVar12;
  float fVar13;
  float fVar14;
  float fVar15;
  int iVar16;
  int iVar17;
  float fStack_48;
  float fStack_44;
  int iStack_40;
  float fStack_3c;
  float fStack_34;
  
  FUN_004123f0(DAT_0041e968);
  glEnable(0xde1);
  fVar14 = 4.1044e-42;
  glDisable(0xb71);
  fVar13 = 4.26275e-42;
  glEnable(0xbe2);
  fVar12 = 1.4013e-45;
  fVar11 = 1.4013e-45;
  glBlendFunc(1,1);
  glBegin(7);
  uVar1 = FUN_004119d0();
  fStack_48 = 0.0;
  fVar15 = (float)((float10)uVar1 * (float10)0.1);
  fVar3 = (float10)fsin((float10)uVar1 * (float10)0.1 * (float10)0.001);
  ftol();
  iStack_40 = 0;
  fStack_44 = 0.0;
  pfVar2 = (float *)&DAT_0041d5f8;
  do {
    iVar17 = 0;
    iVar16 = 0;
    fStack_34 = (float)(int)fStack_48 * 0.033333335;
    fStack_3c = (float)iStack_40;
    do {
      fVar10 = ((float)iVar17 * 0.011904762 + fStack_34) * fVar14;
      glColor3f(fVar10,((float)iVar17 * 0.011904762 + 0.2) * fVar14,
                ((float)iVar17 * 0.01 + 0.5) * fVar14);
      fStack_34 = fStack_3c;
      fVar4 = (float10)iVar16 +
              (float10)(float)((fVar3 * (float10)4.0 + (float10)10.0) * (float10)0.5) +
              (float10)fVar12;
      fVar5 = (float10)fsin(((float10)(int)fVar13 + (float10)fStack_48 + (float10)fVar12) *
                            (float10)0.0021123);
      fVar6 = (float10)fsin(fVar4 * (float10)*pfVar2 * (float10)0.002);
      fVar14 = (float)((fVar6 * fVar5 * (float10)(int)pfVar2[-2] +
                       (float10)(float)(&DAT_0041d730)[iVar17]) - (float10)fStack_44);
      fVar5 = (float10)fcos(((float10)(int)fVar15 + (float10)fStack_48 + (float10)fVar12) *
                            (float10)0.0026123);
      fVar4 = (float10)fcos(fVar4 * (float10)pfVar2[1] * (float10)0.002443);
      fVar13 = (float)((fVar4 * fVar5 * (float10)(int)pfVar2[-1] +
                       (float10)(float)(&DAT_0041d830)[iVar17]) - (float10)fStack_44);
      glTexCoord2f(0,0);
      fStack_3c = (float)(int)fStack_3c + fVar11;
      glVertex3f(fVar12,fStack_3c,0);
      uVar9 = 0;
      glTexCoord2f(0x3f800000,0);
      fVar10 = fStack_48 + fVar10;
      fVar8 = fVar10;
      glVertex3f(fVar10,fStack_3c,0);
      uVar7 = 0x3f800000;
      glTexCoord2f(0x3f800000,0x3f800000);
      glVertex3f(fVar10,uVar9,0);
      glTexCoord2f(0,0x3f800000);
      glVertex3f(fVar8,uVar7,0);
      iVar16 = iVar16 + 7;
      iVar17 = iVar17 + 1;
    } while (iVar16 < 0x1c0);
    pfVar2 = pfVar2 + 4;
    fStack_48 = (float)((int)fStack_48 + 1);
    fStack_44 = (float)((int)fStack_44 + 0x2851);
    iStack_40 = iStack_40 + 1000;
  } while ((int)pfVar2 < 0x41d738);
  glEnd();
  return;
}


// ==== 4035c0 ====

void FUN_004035c0(float param_1)

{
  FUN_00406d80(DAT_0041e938,(param_1 + 1.0) * 0.5);
  FUN_004121f0();
  return;
}


// ==== 4035f0 ====

void FUN_004035f0(float param_1)

{
  FUN_00406d80(DAT_0041e938,param_1 * 0.5);
  FUN_004121f0();
  return;
}


// ==== 405840 ====

void FUN_00405840(void)

{
  glDisable(0xde1);
  glDisable();
  glEnable(0xbe2);
  glBlendFunc(0x302,0x303);
  glColor4f(0x3f800000,0x3f800000,0x3f800000,0x3ed41206);
  FUN_004124a0(0.0,0.0,1.0,1.0);
  return;
}


