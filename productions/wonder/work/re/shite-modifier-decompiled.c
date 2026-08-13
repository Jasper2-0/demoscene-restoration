// ==== forced_0040e490 @ 0040e490 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0040e490(int param_1,float param_2)

{
  float fVar1;
  float fVar2;
  double dVar3;
  double dVar4;
  float *pfVar5;
  float *pfVar6;
  int iVar7;
  float *pfVar8;
  int iVar9;
  undefined4 unaff_ESI;
  float *pfVar10;
  int iVar11;
  undefined4 unaff_EDI;
  int iVar12;
  float10 fVar13;
  float10 fVar14;
  float fStack_23c;
  float afStack_1fc [12];
  undefined4 uStack_1cc;
  int iStack_1a4;
  float afStack_19c [19];
  float afStack_150 [22];
  float fStack_f8;
  float fStack_f4;
  float fStack_f0;
  float fStack_e8;
  float fStack_e4;
  float fStack_e0;
  float fStack_d8;
  float fStack_d4;
  float fStack_d0;
  float fStack_c8;
  float fStack_c4;
  float fStack_c0;
  float fStack_bc;
  float fStack_b8;
  float fStack_b4;
  float fStack_a4;
  float afStack_88 [2];
  float afStack_80 [16];
  float afStack_40 [15];
  float fStack_4;
  
  pfVar6 = &fStack_c0;
  iVar7 = 4;
  do {
    pfVar6[-2] = 0.0;
    pfVar6[-1] = 0.0;
    *pfVar6 = 0.0;
    pfVar6 = pfVar6 + 3;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  afStack_19c[0xe] = 0.0;
  afStack_19c[10] = 0.0;
  afStack_19c[6] = 0.0;
  afStack_19c[2] = 0.0;
  fVar13 = (float10)fcos((float10)param_2 * (float10)_DAT_00433328);
  afStack_19c[0xf] = 0.0;
  afStack_19c[0xb] = 0.0;
  afStack_19c[7] = 0.0;
  afStack_19c[3] = 0.0;
  afStack_19c[0x10] = 0.0;
  afStack_19c[0xc] = 0.0;
  afStack_19c[8] = 0.0;
  afStack_19c[4] = 0.0;
  afStack_19c[0x11] = 0.0;
  afStack_19c[0xd] = 0.0;
  afStack_19c[9] = 0.0;
  afStack_19c[5] = 0.0;
  afStack_150[0xe] = 0.0;
  afStack_150[10] = 0.0;
  afStack_150[6] = 0.0;
  afStack_150[2] = 0.0;
  afStack_150[0xf] = 0.0;
  afStack_150[0xb] = 0.0;
  afStack_150[7] = 0.0;
  afStack_150[3] = 0.0;
  afStack_150[0x10] = 0.0;
  afStack_150[0xc] = 0.0;
  afStack_150[8] = 0.0;
  afStack_150[4] = 0.0;
  afStack_150[0x11] = 0.0;
  afStack_150[0xd] = 0.0;
  afStack_150[9] = 0.0;
  afStack_150[5] = 0.0;
  afStack_19c[0] = (float)fVar13;
  fVar13 = (float10)fsin((float10)param_2 * (float10)_DAT_00433328);
  fVar1 = (float)fVar13;
  FUN_004022f0(afStack_19c + 2);
  afStack_19c[8] = -fVar1;
  afStack_19c[7] = afStack_19c[0];
  afStack_19c[0xc] = afStack_19c[0];
  fStack_c8 = afStack_19c[2] * DAT_0043f488 +
              afStack_19c[6] * DAT_0043f48c + afStack_19c[10] * DAT_0043f490 + afStack_19c[0xe];
  fStack_c4 = afStack_19c[0] * DAT_0043f48c + fVar1 * DAT_0043f490 + afStack_19c[3] * DAT_0043f488 +
              afStack_19c[0xf];
  fStack_c0 = afStack_19c[0] * DAT_0043f490 +
              afStack_19c[4] * DAT_0043f488 + afStack_19c[8] * DAT_0043f48c + afStack_19c[0x10];
  fVar13 = (float10)fcos((float10)param_2 * (float10)_DAT_004335c8);
  afStack_19c[0] = (float)fVar13;
  fVar13 = (float10)fsin((float10)param_2 * (float10)_DAT_004335c8);
  afStack_19c[0xb] = fVar1;
  FUN_004022f0(afStack_150 + 2);
  afStack_150[8] = -(float)fVar13;
  afStack_150[0xb] = (float)fVar13;
  afStack_150[7] = afStack_19c[0];
  afStack_150[0xc] = afStack_19c[0];
  pfVar6 = afStack_150 + 2;
  pfVar10 = afStack_80;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  pfVar6 = afStack_19c + 2;
  pfVar10 = afStack_40;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  FUN_004011d0(afStack_150 + 0x12);
  iVar7 = 0;
  do {
    pfVar10 = afStack_40;
    pfVar6 = (float *)((int)afStack_150 + iVar7 + 0x48);
    iStack_1a4 = 4;
    do {
      fVar1 = *pfVar6;
      pfVar8 = (float *)((int)afStack_80 + iVar7);
      iVar9 = 4;
      pfVar5 = pfVar10;
      do {
        fVar2 = *pfVar8;
        pfVar8 = pfVar8 + 1;
        iVar9 = iVar9 + -1;
        fVar1 = fVar2 * *pfVar5 + fVar1;
        pfVar5 = pfVar5 + 4;
      } while (iVar9 != 0);
      *pfVar6 = fVar1;
      pfVar6 = pfVar6 + 1;
      pfVar10 = pfVar10 + 1;
      iStack_1a4 = iStack_1a4 + -1;
    } while (iStack_1a4 != 0);
    iVar7 = iVar7 + 0x10;
  } while (iVar7 < 0x40);
  pfVar6 = afStack_150 + 0x12;
  pfVar10 = afStack_19c + 2;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  fStack_bc = fStack_e8 * DAT_0043f49c + fStack_f8 * DAT_0043f498 + afStack_150[0x12] * DAT_0043f494
              + fStack_d8;
  fStack_b8 = fStack_e4 * DAT_0043f49c + fStack_f4 * DAT_0043f498 + afStack_150[0x13] * DAT_0043f494
              + fStack_d4;
  fStack_b4 = fStack_e0 * DAT_0043f49c + fStack_f0 * DAT_0043f498 + afStack_150[0x14] * DAT_0043f494
              + fStack_d0;
  fVar13 = (float10)fcos((float10)param_2 * (float10)_DAT_004335c0);
  fVar14 = (float10)fsin((float10)param_2 * (float10)_DAT_004335c0);
  FUN_00403b10(afStack_150 + 2,'\x02',(float)fVar14,(float)fVar13);
  pfVar6 = afStack_150 + 2;
  pfVar10 = afStack_1fc + 2;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  pfVar6 = afStack_19c + 2;
  pfVar10 = (float *)&stack0xfffffdcc;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  fStack_23c = 5.960716e-39;
  pfVar6 = (float *)FUN_00403c60(afStack_80);
  pfVar10 = afStack_19c + 2;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  func_0x0040e9d0();
  fVar13 = (float10)fcos((float10)fStack_4 * (float10)_DAT_004335b8);
  fVar14 = (float10)fsin((float10)fStack_4 * (float10)_DAT_004335b8);
  uStack_1cc = 0x40e86a;
  FUN_00403b10(afStack_150,'\x03',(float)fVar14,(float)fVar13);
  pfVar6 = afStack_150;
  pfVar10 = afStack_1fc;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  pfVar6 = afStack_19c;
  pfVar10 = &fStack_23c;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  pfVar6 = (float *)FUN_00403c60(afStack_88);
  pfVar10 = afStack_19c;
  for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar10 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar10 = pfVar10 + 1;
  }
  func_0x0040e9d0();
  iVar7 = *(int *)(param_1 + 0x10);
  iVar9 = 0;
  if (0 < *(int *)(iVar7 + 0xd4)) {
    iVar12 = 0;
    dVar3 = (double)CONCAT44(unaff_ESI,unaff_EDI) * _DAT_004334f8;
    dVar4 = (double)CONCAT44(unaff_ESI,unaff_EDI) * _DAT_004335b0;
    do {
      iVar11 = *(int *)(iVar7 + 0x80) + iVar12;
      func_0x004010d0();
      iVar7 = *(int *)(param_1 + 0xc) + iVar12;
      afStack_19c[0xe] = *(float *)(iVar7 + 0x3c);
      afStack_19c[0xf] = *(float *)(iVar7 + 0x40);
      afStack_19c[0x10] = *(float *)(iVar7 + 0x44);
      iVar9 = iVar9 + 1;
      iVar12 = iVar12 + 0x74;
      fVar13 = (float10)fsin((float10)afStack_19c[0xe] * (float10)_DAT_004335a8 + (float10)dVar3);
      fVar14 = (float10)fcos((float10)afStack_19c[0xf] * (float10)_DAT_004335a8 + (float10)dVar4 +
                             (float10)_DAT_00433598);
      fStack_a4 = (float)(fVar14 * fVar14 * fVar14 * fVar14 + (float10)_DAT_004334d8);
      *(float *)(iVar11 + 0x30) =
           (float)((fVar13 * fVar13 * fVar13 * fVar13 * (float10)_DAT_004335a0 +
                   (float10)_DAT_004334d8) * (float10)*(float *)(iVar7 + 0x30));
      *(float *)(iVar11 + 0x34) = fStack_a4 * *(float *)(*(int *)(param_1 + 0xc) + -0x40 + iVar12);
      *(undefined4 *)(iVar11 + 0x38) = *(undefined4 *)(*(int *)(param_1 + 0xc) + -0x3c + iVar12);
      iVar7 = *(int *)(param_1 + 0x10);
    } while (iVar9 < *(int *)(iVar7 + 0xd4));
  }
  FUN_00406e20(*(int *)(param_1 + 0x10));
  return;
}


// ==== forced_0040e9d0 @ 0040e9d0 ====

void __thiscall forced_0040e9d0(float *param_1,float *param_2,float *param_3)

{
  *param_3 = *param_2 * *param_1 + param_1[8] * param_2[2] + param_1[4] * param_2[1] + param_1[0xc];
  param_3[1] = param_1[9] * param_2[2] + param_1[5] * param_2[1] + param_1[1] * *param_2 +
               param_1[0xd];
  param_3[2] = param_1[10] * param_2[2] + param_1[6] * param_2[1] + param_1[2] * *param_2 +
               param_1[0xe];
  return;
}


