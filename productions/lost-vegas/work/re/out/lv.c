// ==== FUN_00401000 @ 00401000 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00401000(float *param_1)

{
  float fVar1;
  float *pfVar2;
  float *pfVar3;
  uint uVar4;
  int iVar5;
  int iVar6;
  float *pfVar7;
  float10 fVar8;
  float local_8;
  
  pfVar7 = param_1;
  uVar4 = 0;
  pfVar3 = param_1;
  do {
    param_1 = (float *)0x0;
    pfVar2 = (float *)&DAT_0041a284;
    local_8 = 0.0;
    do {
      fVar8 = (float10)fcos((float10)((float)(int)param_1 * _DAT_00412080));
      fVar1 = *pfVar2;
      param_1 = (float *)((int)param_1 + uVar4);
      pfVar2 = pfVar2 + 1;
      local_8 = (float)fVar8 * fVar1 + local_8;
    } while ((int)pfVar2 < 0x41a2a4);
    if ((uVar4 & 0x40) != 0) {
      local_8 = -local_8;
    }
    *pfVar3 = local_8;
    uVar4 = uVar4 + 1;
    pfVar3 = pfVar3 + 1;
  } while ((int)uVar4 < 0x200);
  pfVar3 = pfVar7 + 0x200;
  iVar6 = 1;
  pfVar2 = (float *)0xfffffff0;
  do {
    iVar5 = 0x40;
    param_1 = pfVar2;
    do {
      fVar8 = (float10)fcos((float10)((float)(int)param_1 * (float)_DAT_00412078));
      param_1 = (float *)((int)param_1 + iVar6);
      *pfVar3 = (float)fVar8;
      pfVar3 = pfVar3 + 1;
      iVar5 = iVar5 + -1;
    } while (iVar5 != 0);
    pfVar2 = pfVar2 + -8;
    iVar6 = iVar6 + 2;
  } while (-0x410 < (int)pfVar2);
  pfVar7 = pfVar7 + 0xa00;
  for (iVar6 = 0x800; iVar6 != 0; iVar6 = iVar6 + -1) {
    *(undefined1 *)pfVar7 = 0;
    pfVar7 = (float *)((int)pfVar7 + 1);
  }
  return;
}


// ==== FUN_004010c0 @ 004010c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

int __cdecl FUN_004010c0(int param_1,uint *param_2,int param_3)

{
  uint uVar1;
  uint uVar2;
  uint uVar3;
  uint *puVar4;
  uint *puVar5;
  uint uVar6;
  float *pfVar7;
  uint uVar8;
  int iVar9;
  int iVar10;
  uint uVar11;
  int iStack_34;
  int local_14;
  int local_c;
  float *local_8;
  
  puVar4 = param_2;
  uVar1 = *param_2;
  local_c = 0;
  uVar2 = param_2[1];
  uVar3 = param_2[2];
  puVar5 = param_2 + 3;
  local_8 = (float *)(param_1 + 0x3000);
  do {
    iVar9 = 4;
    uVar8 = 1 << ((byte)local_c & 0x1f);
    uVar6 = uVar8 & uVar1;
    if ((uVar6 == 0) || (iStack_34 = iVar9, (uVar2 & uVar8) == 0)) {
      if ((uVar6 != 0) && ((uVar3 & uVar8) != 0)) {
        iStack_34 = 3;
        goto LAB_0040115d;
      }
      uVar11 = uVar8 & uVar2;
      if ((uVar11 != 0) && ((uVar3 & uVar8) != 0)) {
        iStack_34 = 2;
        goto LAB_0040115d;
      }
      if (uVar6 != 0) {
        iVar9 = 2;
        iStack_34 = iVar9;
        goto LAB_0040115d;
      }
      if (uVar11 != 0) {
        iVar9 = 2;
        iStack_34 = 1;
        goto LAB_0040115d;
      }
      if ((uVar3 & uVar8) != 0) {
        iVar9 = 2;
        iStack_34 = 0;
        goto LAB_0040115d;
      }
      pfVar7 = local_8;
      iVar9 = param_3;
      if (0 < param_3) {
        do {
          *pfVar7 = 0.0;
          iVar9 = iVar9 + -1;
          pfVar7 = pfVar7 + 0x20;
        } while (iVar9 != 0);
      }
    }
    else {
LAB_0040115d:
      param_1 = 0;
      if (0 < param_3) {
        local_14 = param_3;
        pfVar7 = local_8;
        do {
          if (param_1 == 0) {
            param_2._3_1_ = (char)*puVar5;
            puVar5 = (uint *)((int)puVar5 + 1);
            param_1 = 8;
          }
          iVar10 = (int)param_2._3_1_;
          param_1 = param_1 - iVar9;
          param_2 = (uint *)((uint)(byte)(param_2._3_1_ << (sbyte)iVar9) << 0x18);
          *pfVar7 = (float)(CONCAT31((int3)((uint)(iVar10 << (sbyte)iVar9) >> 8),0x80) <<
                           (sbyte)iStack_34) * (float)_DAT_00412088;
          pfVar7 = pfVar7 + 0x20;
          local_14 = local_14 + -1;
        } while (local_14 != 0);
      }
    }
    local_c = local_c + 1;
    local_8 = local_8 + 1;
    if (0x1f < local_c) {
      return (int)puVar5 - (int)puVar4;
    }
  } while( true );
}


// ==== FUN_004011e9 @ 004011e9 ====

void __cdecl FUN_004011e9(int param_1,float *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  float *pfVar7;
  int iVar8;
  
  pfVar7 = (float *)(param_1 + 0x2800);
  iVar6 = 0x40;
  do {
    fVar3 = 0.0;
    pfVar4 = pfVar7 + -0x800;
    iVar8 = 0x20;
    pfVar5 = param_2;
    do {
      fVar1 = *pfVar5;
      fVar2 = *pfVar4;
      pfVar4 = pfVar4 + 0x40;
      pfVar5 = pfVar5 + 1;
      iVar8 = iVar8 + -1;
      fVar3 = fVar1 * fVar2 + fVar3;
    } while (iVar8 != 0);
    iVar8 = 8;
    pfVar4 = pfVar7;
    do {
      *pfVar4 = fVar3 * pfVar4[-0xa00] + *pfVar4;
      pfVar4 = pfVar4 + 0x40;
      iVar8 = iVar8 + -1;
    } while (iVar8 != 0);
    pfVar7 = pfVar7 + 1;
    iVar6 = iVar6 + -1;
  } while (iVar6 != 0);
  return;
}


// ==== FUN_0040123d @ 0040123d ====

void __cdecl FUN_0040123d(float *param_1,int *param_2,undefined1 *param_3)

{
  float *pfVar1;
  undefined1 *puVar2;
  int iVar3;
  float *pfVar4;
  int iVar5;
  int iVar6;
  undefined1 *puVar7;
  uint *local_8;
  
  pfVar1 = param_1;
  iVar6 = *param_2;
  local_8 = (uint *)(param_2 + 1);
  puVar2 = (undefined1 *)FUN_004051c3(iVar6 << 5);
  FUN_00401000(param_1);
  param_1 = (float *)0x10;
  puVar7 = puVar2;
  while (0 < iVar6) {
    if (param_1 == (float *)0x10) {
      iVar3 = 0x10;
      if (iVar6 < 0x11) {
        iVar3 = iVar6;
      }
      iVar3 = FUN_004010c0((int)pfVar1,local_8,iVar3);
      local_8 = (uint *)((int)local_8 + iVar3);
      param_1 = (float *)0x0;
    }
    FUN_004011e9((int)pfVar1,pfVar1 + (int)(param_1 + 0x18) * 0x20);
    pfVar4 = pfVar1 + 0xbff;
    iVar3 = 0x20;
    do {
      iVar5 = (int)ROUND(*pfVar4);
      if (0x7f < iVar5) {
        iVar5 = 0x7f;
      }
      if (iVar5 < -0x80) {
        iVar5 = -0x80;
      }
      *puVar7 = (char)iVar5;
      puVar7 = puVar7 + 1;
      pfVar4 = pfVar4 + -1;
      iVar3 = iVar3 + -1;
    } while (iVar3 != 0);
    pfVar4 = pfVar1 + 0xbff;
    iVar3 = 0x1e0;
    do {
      *pfVar4 = pfVar4[-0x20];
      pfVar4 = pfVar4 + -1;
      iVar3 = iVar3 + -1;
    } while (iVar3 != 0);
    param_1 = (float *)((int)param_1 + 1);
    iVar6 = iVar6 + -1;
    pfVar4 = pfVar1 + 0xa00;
    for (iVar3 = 0x20; iVar3 != 0; iVar3 = iVar3 + -1) {
      *pfVar4 = 0.0;
      pfVar4 = pfVar4 + 1;
    }
  }
  puVar2 = puVar2 + 0x1e0;
  iVar6 = (int)puVar7 - (int)puVar2;
  puVar7 = puVar2;
  for (; iVar6 != 0; iVar6 = iVar6 + -1) {
    *param_3 = *puVar7;
    puVar7 = puVar7 + 1;
    param_3 = param_3 + 1;
  }
  FUN_004051d7(puVar2);
  return;
}


// ==== FUN_0040133c @ 0040133c ====

undefined1 * FUN_0040133c(void)

{
  undefined1 *puVar1;
  int iVar2;
  undefined1 *puVar3;
  undefined1 *puVar4;
  
  puVar1 = (undefined1 *)FUN_004051c3(0x100000);
  puVar3 = &DAT_00413000;
  puVar4 = puVar1;
  for (iVar2 = 0x5007; iVar2 != 0; iVar2 = iVar2 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar4 = puVar4 + 1;
  }
  FUN_0040123d((float *)&DAT_00421668,(int *)&DAT_00418008,puVar1 + 0x5007);
  return puVar1;
}


// ==== FUN_00401390 @ 00401390 ====

void __cdecl
FUN_00401390(int param_1,undefined4 param_2,undefined4 param_3,undefined4 param_4,undefined4 param_5
            ,undefined4 param_6,undefined4 param_7,undefined4 param_8)

{
  undefined4 *puVar1;
  undefined2 *puVar2;
  
  puVar1 = *(undefined4 **)(param_1 + 0x60);
  puVar2 = *(undefined2 **)(param_1 + 0x6c);
  *puVar1 = param_2;
  puVar1[1] = param_3;
  puVar1[2] = param_4;
  puVar1[3] = param_8;
  puVar1[8] = param_5;
  puVar1[9] = param_3;
  puVar1[10] = param_4;
  puVar1[0xb] = param_8;
  puVar1[0x10] = param_2;
  puVar1[0x11] = param_6;
  puVar1[0x12] = param_4;
  puVar1[0x13] = param_8;
  puVar1[0x18] = param_5;
  puVar1[0x19] = param_6;
  puVar1[0x1a] = param_4;
  puVar1[0x1b] = param_8;
  puVar1[0x20] = param_2;
  puVar1[0x21] = param_3;
  puVar1[0x22] = param_7;
  puVar1[0x23] = param_8;
  puVar1[0x28] = param_5;
  puVar1[0x29] = param_3;
  puVar1[0x2a] = param_7;
  puVar1[0x2b] = param_8;
  puVar1[0x30] = param_2;
  puVar1[0x31] = param_6;
  puVar1[0x32] = param_7;
  puVar1[0x33] = param_8;
  puVar1[0x38] = param_5;
  puVar1[0x39] = param_6;
  puVar1[0x3a] = param_7;
  puVar1[0x3b] = param_8;
  *puVar2 = 2;
  puVar2[1] = 6;
  puVar2[2] = 0;
  puVar2[3] = 6;
  puVar2[4] = 4;
  puVar2[5] = 0;
  puVar2[6] = 6;
  puVar2[7] = 7;
  puVar2[8] = 4;
  puVar2[9] = 7;
  puVar2[10] = 5;
  puVar2[0xb] = 4;
  puVar2[0xc] = 7;
  puVar2[0xd] = 3;
  puVar2[0xe] = 5;
  puVar2[0xf] = 3;
  puVar2[0x10] = 1;
  puVar2[0x11] = 5;
  puVar2[0x12] = 3;
  puVar2[0x13] = 2;
  puVar2[0x14] = 1;
  puVar2[0x15] = 2;
  puVar2[0x16] = 0;
  puVar2[0x17] = 1;
  puVar2[0x18] = 0;
  puVar2[0x19] = 4;
  puVar2[0x1a] = 1;
  puVar2[0x1b] = 4;
  puVar2[0x1c] = 5;
  puVar2[0x1d] = 1;
  puVar2[0x1e] = 3;
  puVar2[0x1f] = 7;
  puVar2[0x20] = 2;
  puVar2[0x21] = 7;
  puVar2[0x22] = 6;
  puVar2[0x23] = 2;
  return;
}


// ==== FUN_00401590 @ 00401590 ====

undefined4 * __cdecl
FUN_00401590(undefined4 param_1,undefined4 param_2,undefined4 param_3,undefined4 param_4,
            undefined4 param_5,undefined4 param_6,undefined4 param_7)

{
  undefined4 *puVar1;
  
  puVar1 = FUN_00402040(8,0xc);
  FUN_00401390((int)puVar1,param_1,param_2,param_3,param_4,param_5,param_6,param_7);
  return puVar1;
}


// ==== FUN_004015f0 @ 004015f0 ====

void __cdecl FUN_004015f0(float *param_1,float *param_2,float *param_3)

{
  int iVar1;
  float *pfVar2;
  float local_40 [5];
  float local_2c;
  float local_28;
  undefined4 local_24;
  float local_20;
  float local_1c;
  float local_18;
  undefined4 local_14;
  undefined4 local_10;
  undefined4 local_c;
  undefined4 local_8;
  undefined4 local_4;
  
  local_14 = 0;
  local_24 = 0;
  local_40[3] = 0.0;
  local_8 = 0;
  local_c = 0;
  local_10 = 0;
  local_4 = 0x3f800000;
  local_40[0] = param_2[2] * param_3[8] + *param_2 * *param_3 + param_2[1] * param_3[4];
  local_40[1] = param_3[1] * *param_2 + param_2[1] * param_3[5] + param_3[9] * param_2[2];
  local_40[2] = *param_2 * param_3[2] + param_3[6] * param_2[1] + param_3[10] * param_2[2];
  local_40[4] = param_2[5] * param_3[4] + param_2[6] * param_3[8] + param_2[4] * *param_3;
  local_2c = param_2[4] * param_3[1] + param_2[5] * param_3[5] + param_2[6] * param_3[9];
  local_28 = param_3[6] * param_2[5] + param_3[10] * param_2[6] + param_2[4] * param_3[2];
  local_20 = param_2[9] * param_3[4] + param_2[10] * param_3[8] + param_2[8] * *param_3;
  local_1c = param_2[8] * param_3[1] + param_2[9] * param_3[5] + param_2[10] * param_3[9];
  local_18 = param_3[6] * param_2[9] + param_3[10] * param_2[10] + param_2[8] * param_3[2];
  pfVar2 = local_40;
  for (iVar1 = 0x10; iVar1 != 0; iVar1 = iVar1 + -1) {
    *param_1 = *pfVar2;
    pfVar2 = pfVar2 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_00401730 @ 00401730 ====

void __cdecl FUN_00401730(float *param_1,float param_2,undefined4 param_3,undefined4 param_4)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  float *pfVar7;
  float *pfVar8;
  float *pfVar9;
  int iVar10;
  int local_88;
  float local_80 [5];
  undefined4 local_6c;
  undefined4 local_58;
  float local_40 [16];
  
  FUN_00401a10(local_80);
  local_80[0] = param_2;
  local_6c = param_3;
  local_58 = param_4;
  local_88 = 4;
  pfVar8 = param_1;
  do {
    pfVar7 = local_80;
    pfVar9 = (float *)(((int)local_40 - (int)param_1) + (int)pfVar8);
    iVar10 = 4;
    do {
      *pfVar9 = 0.0;
      fVar1 = *pfVar9;
      iVar6 = 4;
      pfVar4 = pfVar7;
      pfVar5 = pfVar8;
      do {
        fVar2 = *pfVar5;
        fVar3 = *pfVar4;
        pfVar4 = pfVar4 + 4;
        pfVar5 = pfVar5 + 1;
        iVar6 = iVar6 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar6 != 0);
      *pfVar9 = fVar1;
      pfVar9 = pfVar9 + 1;
      pfVar7 = pfVar7 + 1;
      iVar10 = iVar10 + -1;
    } while (iVar10 != 0);
    pfVar8 = pfVar8 + 4;
    local_88 = local_88 + -1;
  } while (local_88 != 0);
  pfVar8 = local_40;
  for (iVar10 = 0x10; iVar10 != 0; iVar10 = iVar10 + -1) {
    *param_1 = *pfVar8;
    pfVar8 = pfVar8 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_004017f0 @ 004017f0 ====

void __cdecl FUN_004017f0(float *param_1,float param_2,float param_3,float param_4)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  float *pfVar7;
  int iVar8;
  float *pfVar9;
  float *pfVar10;
  int local_88;
  float local_80 [16];
  float local_40 [16];
  
  FUN_00401f50(param_1,param_2);
  FUN_00401fa0(local_80,param_3);
  local_88 = 4;
  pfVar7 = param_1;
  do {
    pfVar10 = local_80;
    pfVar9 = (float *)(((int)local_40 - (int)param_1) + (int)pfVar7);
    iVar8 = 4;
    do {
      *pfVar9 = 0.0;
      fVar1 = *pfVar9;
      iVar6 = 4;
      pfVar4 = pfVar10;
      pfVar5 = pfVar7;
      do {
        fVar2 = *pfVar5;
        fVar3 = *pfVar4;
        pfVar4 = pfVar4 + 4;
        pfVar5 = pfVar5 + 1;
        iVar6 = iVar6 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar6 != 0);
      *pfVar9 = fVar1;
      pfVar9 = pfVar9 + 1;
      pfVar10 = pfVar10 + 1;
      iVar8 = iVar8 + -1;
    } while (iVar8 != 0);
    pfVar7 = pfVar7 + 4;
    local_88 = local_88 + -1;
  } while (local_88 != 0);
  pfVar7 = local_40;
  pfVar10 = param_1;
  for (iVar8 = 0x10; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar10 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar10 = pfVar10 + 1;
  }
  FUN_00401ff0(local_80,param_4);
  local_88 = 4;
  pfVar7 = param_1;
  do {
    pfVar10 = local_80;
    pfVar9 = (float *)(((int)local_40 - (int)param_1) + (int)pfVar7);
    iVar8 = 4;
    do {
      *pfVar9 = 0.0;
      fVar1 = *pfVar9;
      iVar6 = 4;
      pfVar4 = pfVar10;
      pfVar5 = pfVar7;
      do {
        fVar2 = *pfVar5;
        fVar3 = *pfVar4;
        pfVar4 = pfVar4 + 4;
        pfVar5 = pfVar5 + 1;
        iVar6 = iVar6 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar6 != 0);
      *pfVar9 = fVar1;
      pfVar9 = pfVar9 + 1;
      pfVar10 = pfVar10 + 1;
      iVar8 = iVar8 + -1;
    } while (iVar8 != 0);
    pfVar7 = pfVar7 + 4;
    local_88 = local_88 + -1;
  } while (local_88 != 0);
  pfVar7 = local_40;
  for (iVar8 = 0x10; iVar8 != 0; iVar8 = iVar8 + -1) {
    *param_1 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_00401930 @ 00401930 ====

void __cdecl FUN_00401930(float *param_1,float *param_2,float *param_3)

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
  float fVar15;
  
  fVar15 = param_3[7] * param_2[1] + param_3[3] * *param_2 + param_3[0xb] * param_2[2] +
           param_3[0xf];
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
  *param_1 = (*param_2 * *param_3 + param_3[4] * param_2[1] + param_3[8] * param_2[2] + param_3[0xc]
             ) / fVar15;
  param_1[1] = (fVar5 * fVar6 + fVar3 * fVar4 + fVar1 * fVar2 + fVar7) / fVar15;
  param_1[2] = (fVar12 * fVar13 + fVar10 * fVar11 + fVar8 * fVar9 + fVar14) / fVar15;
  return;
}


// ==== FUN_004019d0 @ 004019d0 ====

void __cdecl FUN_004019d0(undefined4 *param_1)

{
  param_1[0xe] = 0;
  param_1[0xd] = 0;
  param_1[0xc] = 0;
  param_1[0xb] = 0;
  param_1[9] = 0;
  param_1[8] = 0;
  param_1[7] = 0;
  param_1[6] = 0;
  param_1[4] = 0;
  param_1[3] = 0;
  param_1[2] = 0;
  param_1[1] = 0;
  param_1[0xf] = 0;
  param_1[10] = 0;
  param_1[5] = 0;
  *param_1 = 0;
  return;
}


// ==== FUN_00401a10 @ 00401a10 ====

void __cdecl FUN_00401a10(undefined4 *param_1)

{
  param_1[0xe] = 0;
  param_1[0xd] = 0;
  param_1[0xc] = 0;
  param_1[0xb] = 0;
  param_1[9] = 0;
  param_1[8] = 0;
  param_1[7] = 0;
  param_1[6] = 0;
  param_1[4] = 0;
  param_1[3] = 0;
  param_1[2] = 0;
  param_1[1] = 0;
  param_1[0xf] = 0x3f800000;
  param_1[10] = 0x3f800000;
  param_1[5] = 0x3f800000;
  *param_1 = 0x3f800000;
  return;
}


// ==== FUN_00401a50 @ 00401a50 ====

void __cdecl FUN_00401a50(int param_1,undefined4 param_2,undefined4 param_3,undefined4 param_4)

{
  *(undefined4 *)(param_1 + 0x30) = param_2;
  *(undefined4 *)(param_1 + 0x34) = param_3;
  *(undefined4 *)(param_1 + 0x38) = param_4;
  return;
}


// ==== FUN_00401a70 @ 00401a70 ====

void __cdecl FUN_00401a70(float *param_1,float param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float10 fVar7;
  
  FUN_00401a10(param_1);
  fVar7 = (float10)fsin((float10)0.0);
  fVar1 = (float)fVar7;
  fVar7 = (float10)fcos((float10)0.0);
  fVar2 = (float)fVar7;
  fVar7 = (float10)fsin((float10)0.0);
  fVar3 = (float)fVar7;
  fVar7 = (float10)fcos((float10)0.0);
  fVar4 = (float)fVar7;
  fVar7 = (float10)fsin((float10)param_2);
  fVar5 = (float)fVar7;
  fVar7 = (float10)fcos((float10)param_2);
  fVar6 = (float)fVar7;
  param_1[9] = fVar3;
  *param_1 = fVar6 * fVar2 + fVar5 * fVar3 * fVar1;
  param_1[1] = fVar5 * fVar4;
  param_1[2] = fVar6 * fVar1 - fVar5 * fVar3 * fVar2;
  param_1[4] = fVar6 * fVar3 * fVar1 - fVar5 * fVar2;
  param_1[5] = fVar6 * fVar4;
  param_1[6] = -(fVar6 * fVar3 * fVar2) - fVar5 * fVar1;
  param_1[8] = -(fVar4 * fVar1);
  param_1[10] = fVar4 * fVar2;
  return;
}


// ==== FUN_00401b50 @ 00401b50 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl
FUN_00401b50(float *param_1,float param_2,float param_3,float param_4,float param_5,float param_6,
            float param_7)

{
  float *pfVar1;
  float10 fVar2;
  float local_28;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  local_24 = param_3;
  local_28 = param_2;
  local_20 = param_4;
  pfVar1 = (float *)FUN_00402210(&param_2,param_5 - param_2,param_6 - param_3,param_7 - param_4);
  local_1c = *pfVar1;
  local_18 = pfVar1[1];
  local_14 = pfVar1[2];
  param_4 = local_18 * local_18 + local_14 * local_14 + local_1c * local_1c;
  param_7 = SQRT(param_4);
  if (param_7 < _DAT_00412094) {
    return;
  }
  local_1c = local_1c / param_7;
  local_18 = local_18 / param_7;
  local_14 = local_14 / param_7;
  pfVar1 = (float *)FUN_00402210(&param_5,local_1c * local_18,local_18 * local_18,
                                 local_14 * local_18);
  param_2 = *pfVar1;
  param_3 = pfVar1[1];
  param_4 = pfVar1[2];
  pfVar1 = (float *)FUN_00402210(&param_2,-param_2,_DAT_00412090 - param_3,-param_4);
  local_10 = *pfVar1;
  local_c = pfVar1[1];
  local_8 = pfVar1[2];
  param_4 = local_10 * local_10 + local_c * local_c + local_8 * local_8;
  param_7 = SQRT(param_4);
  if (param_7 < _DAT_00412094) {
    pfVar1 = (float *)FUN_00402210(&param_5,local_1c * local_18,local_18 * local_18,
                                   local_14 * local_18);
    param_2 = *pfVar1;
    param_3 = pfVar1[1];
    param_4 = pfVar1[2];
    pfVar1 = (float *)FUN_00402210(&param_2,-param_2,_DAT_00412090 - param_3,-param_4);
    local_10 = *pfVar1;
    local_c = pfVar1[1];
    local_8 = pfVar1[2];
    param_4 = local_10 * local_10 + local_c * local_c + local_8 * local_8;
    param_7 = SQRT(param_4);
    if (param_7 < _DAT_00412094) {
      pfVar1 = (float *)FUN_00402210(&param_5,local_1c * local_14,local_14 * local_18,
                                     local_14 * local_14);
      param_2 = *pfVar1;
      param_3 = pfVar1[1];
      param_4 = pfVar1[2];
      pfVar1 = (float *)FUN_00402210(&param_2,-param_2,-param_3,_DAT_00412090 - param_4);
      local_10 = *pfVar1;
      local_c = pfVar1[1];
      local_8 = pfVar1[2];
      param_4 = local_10 * local_10 + local_c * local_c + local_8 * local_8;
      param_7 = SQRT(param_4);
      if (param_7 < _DAT_00412094) {
        return;
      }
    }
  }
  local_10 = local_10 / param_7;
  local_c = local_c / param_7;
  local_8 = local_8 / param_7;
  pfVar1 = (float *)FUN_00402930(&param_5,&local_10,&local_1c);
  param_2 = *pfVar1;
  param_3 = pfVar1[1];
  param_4 = pfVar1[2];
  FUN_00401a10(param_1);
  *param_1 = param_2;
  param_1[1] = local_10;
  param_1[4] = param_3;
  param_1[5] = local_c;
  param_1[2] = local_1c;
  param_1[8] = param_4;
  param_1[9] = local_8;
  param_1[6] = local_18;
  param_1[0xc] = -(local_28 * param_2 + local_24 * param_3 + local_20 * param_4);
  param_1[10] = local_14;
  fVar2 = FUN_00402910(&local_28,&local_10);
  param_1[0xd] = (float)-fVar2;
  fVar2 = FUN_00402910(&local_28,&local_1c);
  param_1[0xe] = (float)-fVar2;
  return;
}


// ==== FUN_00401eb0 @ 00401eb0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00401eb0(float *param_1,float param_2,float param_3,float param_4)

{
  float fVar1;
  float10 fVar2;
  float10 fVar3;
  float10 fVar4;
  float10 fVar5;
  
  fVar1 = param_4 * _DAT_004120a0;
  fVar2 = (float10)fcos((float10)fVar1);
  fVar3 = (float10)fsin((float10)fVar1);
  fVar4 = (float10)fcos((float10)fVar1);
  fVar5 = (float10)fsin((float10)fVar1);
  fVar1 = param_3 / (param_3 - param_2);
  FUN_004019d0(param_1);
  param_1[10] = fVar1;
  param_1[0xb] = 1.0;
  *param_1 = (float)fVar2 / (float)fVar3;
  param_1[5] = ((float)fVar4 / (float)fVar5) * (float)_DAT_00412098;
  param_1[0xe] = -(fVar1 * param_2);
  return;
}


// ==== FUN_00401f50 @ 00401f50 ====

void __cdecl FUN_00401f50(undefined4 *param_1,float param_2)

{
  float10 fVar1;
  
  FUN_00401a10(param_1);
  fVar1 = (float10)fcos((float10)param_2);
  param_1[5] = (float)fVar1;
  fVar1 = (float10)fsin((float10)param_2);
  param_1[6] = (float)fVar1;
  fVar1 = (float10)fsin((float10)param_2);
  param_1[9] = -(float)fVar1;
  fVar1 = (float10)fcos((float10)param_2);
  param_1[10] = (float)fVar1;
  return;
}


// ==== FUN_00401fa0 @ 00401fa0 ====

void __cdecl FUN_00401fa0(float *param_1,float param_2)

{
  float10 fVar1;
  
  FUN_00401a10(param_1);
  fVar1 = (float10)fcos((float10)param_2);
  *param_1 = (float)fVar1;
  fVar1 = (float10)fsin((float10)param_2);
  param_1[2] = -(float)fVar1;
  fVar1 = (float10)fsin((float10)param_2);
  param_1[8] = (float)fVar1;
  fVar1 = (float10)fcos((float10)param_2);
  param_1[10] = (float)fVar1;
  return;
}


// ==== FUN_00401ff0 @ 00401ff0 ====

void __cdecl FUN_00401ff0(float *param_1,float param_2)

{
  float10 fVar1;
  
  FUN_00401a10(param_1);
  fVar1 = (float10)fcos((float10)param_2);
  *param_1 = (float)fVar1;
  fVar1 = (float10)fsin((float10)param_2);
  param_1[1] = (float)fVar1;
  fVar1 = (float10)fsin((float10)param_2);
  param_1[4] = -(float)fVar1;
  fVar1 = (float10)fcos((float10)param_2);
  param_1[5] = (float)fVar1;
  return;
}


// ==== FUN_00402040 @ 00402040 ====

undefined4 * __cdecl FUN_00402040(ushort param_1,ushort param_2)

{
  undefined4 *puVar1;
  int iVar2;
  uint uVar3;
  
  puVar1 = (undefined4 *)FUN_004051c3(0x78);
  FUN_00401a10(puVar1);
  puVar1[0x10] = 0;
  puVar1[0x11] = 0;
  puVar1[0x12] = 0;
  puVar1[0x14] = 0;
  puVar1[0x15] = 0;
  puVar1[0x13] = 0x3f800000;
  puVar1[0x16] = 0;
  FUN_00402100((int)puVar1,param_1);
  FUN_00402140((int)puVar1,param_2);
  uVar3 = (uint)param_1;
  if (param_1 != 0) {
    iVar2 = 0;
    do {
      iVar2 = iVar2 + 0x20;
      uVar3 = uVar3 - 1;
      *(undefined4 *)(puVar1[0x18] + -0x14 + iVar2) = 0xffffffff;
    } while (uVar3 != 0);
  }
  return puVar1;
}


// ==== FUN_00402100 @ 00402100 ====

void __cdecl FUN_00402100(int param_1,ushort param_2)

{
  undefined4 uVar1;
  
  uVar1 = FUN_004051c3((uint)param_2 << 5);
  *(undefined4 *)(param_1 + 0x60) = uVar1;
  uVar1 = FUN_004051c3((uint)param_2 << 4);
  *(undefined4 *)(param_1 + 100) = uVar1;
  *(ushort *)(param_1 + 0x68) = param_2;
  return;
}


// ==== FUN_00402140 @ 00402140 ====

void __cdecl FUN_00402140(int param_1,ushort param_2)

{
  undefined4 uVar1;
  
  uVar1 = FUN_004051c3((uint)param_2 * 6);
  *(undefined4 *)(param_1 + 0x6c) = uVar1;
  uVar1 = FUN_004051c3((uint)param_2 * 0xc);
  *(undefined4 *)(param_1 + 0x70) = uVar1;
  *(ushort *)(param_1 + 0x74) = param_2;
  return;
}


// ==== FUN_00402180 @ 00402180 ====

void __cdecl FUN_00402180(float *param_1)

{
  if (((uint)param_1[0x17] & 1) != 0) {
    FUN_00402230(param_1,param_1[0x14],param_1[0x15],param_1[0x16]);
  }
  FUN_00401a50((int)param_1,param_1[0x10],param_1[0x11],param_1[0x12]);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))(*(int **)(DAT_004b4eb8 + 0xc),1,param_1);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x68))
            (*(int **)(DAT_004b4eb8 + 0xc),4,0x242,param_1[0x18],*(undefined2 *)(param_1 + 0x1a),
             param_1[0x1b],(uint)*(ushort *)(param_1 + 0x1d) * 3,0);
  return;
}


// ==== FUN_00402210 @ 00402210 ====

void __thiscall FUN_00402210(void *this,undefined4 param_1,undefined4 param_2,undefined4 param_3)

{
  *(undefined4 *)this = param_1;
  *(undefined4 *)((int)this + 4) = param_2;
  *(undefined4 *)((int)this + 8) = param_3;
  return;
}


// ==== FUN_00402230 @ 00402230 ====

void __cdecl FUN_00402230(float *param_1,float param_2,float param_3,float param_4)

{
  param_1[0x14] = param_2;
  param_1[0x15] = param_3;
  param_1[0x16] = param_4;
  FUN_004017f0(param_1,param_2,param_3,param_4);
  FUN_00401730(param_1,param_1[0x13],param_1[0x13],param_1[0x13]);
  return;
}


// ==== FUN_004022a0 @ 004022a0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_004022a0(float *param_1,float *param_2,float param_3,char param_4)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  undefined4 *puVar5;
  float *pfVar6;
  float *pfVar7;
  int iVar8;
  ushort *puVar9;
  float *pfVar10;
  uint uVar11;
  float *pfVar12;
  float local_ac [16];
  float local_6c [4];
  float local_5c;
  float local_58;
  float local_4c;
  float local_48;
  float local_2c;
  float local_28;
  int local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  pfVar4 = param_1;
  iVar8 = 0;
  puVar5 = (undefined4 *)param_1[0x19];
  if (*(short *)(param_1 + 0x1a) != 0) {
    do {
      puVar5[3] = 0;
      puVar5[2] = 0;
      puVar5[1] = 0;
      *puVar5 = 0;
      puVar5 = puVar5 + 4;
      iVar8 = iVar8 + 1;
    } while (iVar8 < (int)(uint)*(ushort *)(param_1 + 0x1a));
  }
  local_1c = param_1[0x18];
  if ((uint)*(ushort *)(param_1 + 0x1d) * 3 != 0) {
    uVar11 = ((uint)*(ushort *)(param_1 + 0x1d) * 3 + 2) / 3;
    puVar9 = (ushort *)((int)param_1[0x1b] + 4);
    param_1 = (float *)param_1[0x1c];
    do {
      iVar8 = (uint)puVar9[-1] * 0x20;
      fVar1 = *(float *)(iVar8 + (int)local_1c) -
              *(float *)((uint)puVar9[-2] * 0x20 + (int)local_1c);
      pfVar6 = (float *)((uint)puVar9[-2] * 0x20 + (int)local_1c);
      fVar3 = *(float *)(iVar8 + 4 + (int)local_1c) - pfVar6[1];
      fVar2 = *(float *)(iVar8 + (int)local_1c + 8) - pfVar6[2];
      pfVar12 = (float *)((uint)*puVar9 * 0x20 + (int)local_1c);
      local_2c = *pfVar12 - *pfVar6;
      local_28 = pfVar12[1] - pfVar6[1];
      local_10 = -((pfVar12[2] - pfVar6[2]) * fVar3 - local_28 * fVar2);
      local_c = -(local_2c * fVar2 - (pfVar12[2] - pfVar6[2]) * fVar1);
      fVar1 = -(local_28 * fVar1 - local_2c * fVar3);
      local_18 = local_10 * local_10 + local_c * local_c + fVar1 * fVar1;
      local_14 = SQRT(local_18);
      local_8 = (float)_DAT_004120b0 / local_14;
      local_10 = local_8 * local_10;
      local_c = local_8 * local_c;
      local_8 = local_8 * fVar1;
      *param_1 = local_10;
      param_1[1] = local_c;
      param_1[2] = local_8;
      pfVar6 = (float *)((uint)puVar9[-2] * 0x10 + (int)pfVar4[0x19]);
      *pfVar6 = local_10 + *pfVar6;
      pfVar6[1] = local_c + pfVar6[1];
      pfVar6[2] = local_8 + pfVar6[2];
      pfVar6[3] = pfVar6[3] + _DAT_00412090;
      pfVar6 = (float *)((uint)puVar9[-1] * 0x10 + (int)pfVar4[0x19]);
      *pfVar6 = local_10 + *pfVar6;
      pfVar6[1] = local_c + pfVar6[1];
      pfVar6[2] = local_8 + pfVar6[2];
      pfVar6[3] = pfVar6[3] + _DAT_00412090;
      pfVar6 = (float *)((uint)*puVar9 * 0x10 + (int)pfVar4[0x19]);
      uVar11 = uVar11 - 1;
      *pfVar6 = local_10 + *pfVar6;
      pfVar6[1] = local_c + pfVar6[1];
      pfVar6[2] = local_8 + pfVar6[2];
      pfVar6[3] = pfVar6[3] + _DAT_00412090;
      puVar9 = puVar9 + 3;
      param_1 = param_1 + 3;
    } while (uVar11 != 0);
  }
  FUN_00401a10(local_6c);
  local_20 = (int)local_ac - (int)pfVar4;
  local_18 = 5.60519e-45;
  param_1 = pfVar4;
  do {
    pfVar12 = (float *)(local_20 + (int)param_1);
    local_14 = 5.60519e-45;
    pfVar6 = param_2;
    do {
      *pfVar12 = 0.0;
      fVar1 = *pfVar12;
      iVar8 = 4;
      pfVar7 = pfVar6;
      pfVar10 = param_1;
      do {
        fVar2 = *pfVar10;
        fVar3 = *pfVar7;
        pfVar7 = pfVar7 + 4;
        pfVar10 = pfVar10 + 1;
        iVar8 = iVar8 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar8 != 0);
      *pfVar12 = fVar1;
      pfVar12 = pfVar12 + 1;
      pfVar6 = pfVar6 + 1;
      local_14 = (float)((int)local_14 + -1);
    } while (local_14 != 0.0);
    param_1 = param_1 + 4;
    local_18 = (float)((int)local_18 + -1);
  } while (local_18 != 0.0);
  pfVar6 = (float *)pfVar4[0x19];
  pfVar12 = local_ac;
  pfVar7 = local_6c;
  for (iVar8 = 0x10; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar7 = *pfVar12;
    pfVar12 = pfVar12 + 1;
    pfVar7 = pfVar7 + 1;
  }
  if (param_4 == '\0') {
    iVar8 = 0;
    if (*(short *)(pfVar4 + 0x1a) != 0) {
      pfVar12 = (float *)((int)local_1c + 0x1c);
      do {
        fVar1 = (float)_DAT_004120b0 / pfVar6[3];
        iVar8 = iVar8 + 1;
        fVar2 = fVar1 * *pfVar6;
        *pfVar6 = fVar2;
        fVar3 = fVar1 * pfVar6[1];
        pfVar6[1] = fVar3;
        fVar1 = fVar1 * pfVar6[2];
        pfVar6[2] = fVar1;
        pfVar12[-1] = ((fVar2 * local_6c[0] + fVar3 * local_5c + fVar1 * local_4c) *
                       (float)_DAT_004120a8 + (float)_DAT_004120a8) * param_3;
        *pfVar12 = ((fVar1 * local_48 + fVar2 * local_6c[1] + fVar3 * local_58) *
                    (float)_DAT_004120a8 + (float)_DAT_004120a8) * param_3;
        pfVar6 = pfVar6 + 4;
        pfVar12 = pfVar12 + 8;
      } while (iVar8 < (int)(uint)*(ushort *)(pfVar4 + 0x1a));
    }
  }
  else {
    iVar8 = 0;
    if (*(short *)(pfVar4 + 0x1a) != 0) {
      pfVar12 = (float *)((int)local_1c + 0x18);
      do {
        fVar1 = (float)_DAT_004120b0 / pfVar6[3];
        iVar8 = iVar8 + 1;
        fVar2 = fVar1 * *pfVar6;
        *pfVar6 = fVar2;
        fVar3 = fVar1 * pfVar6[1];
        pfVar6[1] = fVar3;
        fVar1 = fVar1 * pfVar6[2];
        pfVar6[2] = fVar1;
        *pfVar12 = (fVar2 * local_6c[0] + fVar3 * local_5c + fVar1 * local_4c) *
                   (float)_DAT_004120a8 + (float)_DAT_004120a8;
        fVar1 = (fVar2 * local_6c[1] + fVar3 * local_58 + fVar1 * local_48) * (float)_DAT_004120a8 +
                (float)_DAT_004120a8;
        pfVar12[1] = fVar1;
        pfVar12[-2] = param_3 * *pfVar12;
        pfVar12[-1] = fVar1 * param_3;
        pfVar6 = pfVar6 + 4;
        pfVar12 = pfVar12 + 8;
      } while (iVar8 < (int)(uint)*(ushort *)(pfVar4 + 0x1a));
      return;
    }
  }
  return;
}


// ==== FUN_00402680 @ 00402680 ====

float * __cdecl
FUN_00402680(float param_1,float param_2,float param_3,float param_4,float param_5,float param_6)

{
  float *pfVar1;
  
  pfVar1 = (float *)FUN_004051c3(100);
  FUN_00401a10(pfVar1);
  FUN_004026f0(pfVar1,param_1,param_2,param_3,param_4,param_5,param_6);
  pfVar1[0x16] = 135.0;
  pfVar1[0x17] = 0.0;
  pfVar1[0x18] = 1000.0;
  return pfVar1;
}


// ==== FUN_004026f0 @ 004026f0 ====

void __cdecl
FUN_004026f0(float *param_1,float param_2,float param_3,float param_4,float param_5,float param_6,
            float param_7)

{
  param_1[0x10] = param_2;
  param_1[0x11] = param_3;
  param_1[0x12] = param_4;
  param_1[0x13] = param_5;
  param_1[0x14] = param_6;
  param_1[0x15] = param_7;
  FUN_00401b50(param_1,param_2,param_3,param_4,param_5,param_6,param_7);
  return;
}


// ==== FUN_00402760 @ 00402760 ====

void __cdecl FUN_00402760(float *param_1)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  float *pfVar7;
  int iVar8;
  float *pfVar9;
  float *pfVar10;
  int local_88;
  float local_80 [16];
  float local_40 [16];
  
  FUN_004026f0(param_1,param_1[0x10],param_1[0x11],param_1[0x12],param_1[0x13],param_1[0x14],
               param_1[0x15]);
  FUN_00402860((int)param_1,param_1[0x16]);
  FUN_00401a70(local_80,param_1[0x17]);
  local_88 = 4;
  pfVar7 = param_1;
  do {
    pfVar10 = local_80;
    pfVar9 = (float *)(((int)local_40 - (int)param_1) + (int)pfVar7);
    iVar8 = 4;
    do {
      *pfVar9 = 0.0;
      fVar1 = *pfVar9;
      iVar6 = 4;
      pfVar4 = pfVar10;
      pfVar5 = pfVar7;
      do {
        fVar2 = *pfVar5;
        fVar3 = *pfVar4;
        pfVar4 = pfVar4 + 4;
        pfVar5 = pfVar5 + 1;
        iVar6 = iVar6 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar6 != 0);
      *pfVar9 = fVar1;
      pfVar9 = pfVar9 + 1;
      pfVar10 = pfVar10 + 1;
      iVar8 = iVar8 + -1;
    } while (iVar8 != 0);
    pfVar7 = pfVar7 + 4;
    local_88 = local_88 + -1;
  } while (local_88 != 0);
  pfVar7 = local_40;
  pfVar10 = param_1;
  for (iVar8 = 0x10; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar10 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar10 = pfVar10 + 1;
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))(*(int **)(DAT_004b4eb8 + 0xc),2,param_1);
  return;
}


// ==== FUN_00402860 @ 00402860 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00402860(int param_1,float param_2)

{
  int iVar1;
  undefined4 *puVar2;
  undefined4 *puVar3;
  undefined4 local_c0 [16];
  float local_80 [16];
  undefined4 local_40 [16];
  
  *(float *)(param_1 + 0x58) = param_2;
  FUN_00401eb0(local_80,0.2,*(float *)(param_1 + 0x60),param_2 * (float)_DAT_004120b8);
  FUN_00401a10(local_c0);
  puVar2 = local_c0;
  puVar3 = local_40;
  for (iVar1 = 0x10; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar3 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar3 = puVar3 + 1;
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))(*(int **)(DAT_004b4eb8 + 0xc),2);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))
            (*(int **)(DAT_004b4eb8 + 0xc),1,&stack0xffffff28);
  return;
}


// ==== FUN_00402910 @ 00402910 ====

float10 __cdecl FUN_00402910(float *param_1,float *param_2)

{
  return (float10)*param_1 * (float10)*param_2 +
         (float10)param_1[1] * (float10)param_2[1] + (float10)param_1[2] * (float10)param_2[2];
}


// ==== FUN_00402930 @ 00402930 ====

void __cdecl FUN_00402930(float *param_1,float *param_2,float *param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  
  fVar1 = param_2[2];
  fVar2 = *param_3;
  fVar3 = param_3[2];
  fVar4 = *param_2;
  fVar5 = *param_2;
  fVar6 = param_3[1];
  fVar7 = *param_3;
  fVar8 = param_2[1];
  *param_1 = param_3[2] * param_2[1] - param_2[2] * param_3[1];
  param_1[1] = fVar1 * fVar2 - fVar3 * fVar4;
  param_1[2] = fVar5 * fVar6 - fVar7 * fVar8;
  return;
}


// ==== FUN_00402990 @ 00402990 ====

undefined4 * __cdecl FUN_00402990(ushort param_1)

{
  uint uVar1;
  undefined4 *puVar2;
  undefined4 uVar3;
  int iVar4;
  short sVar5;
  int iVar6;
  
  puVar2 = (undefined4 *)FUN_004051c3(0x58);
  uVar1 = (uint)param_1;
  uVar3 = FUN_004051c3(uVar1 << 7);
  puVar2[0x13] = uVar3;
  uVar3 = FUN_004051c3(uVar1 * 0xc);
  iVar6 = 0;
  puVar2[0x14] = uVar3;
  if (param_1 != 0) {
    iVar4 = 0;
    do {
      sVar5 = (short)iVar6 * 4;
      iVar6 = iVar6 + 1;
      *(short *)(iVar4 + puVar2[0x14]) = sVar5;
      *(short *)(iVar4 + 2 + puVar2[0x14]) = sVar5 + 1;
      *(short *)(iVar4 + 4 + puVar2[0x14]) = sVar5 + 2;
      *(short *)(iVar4 + 6 + puVar2[0x14]) = sVar5 + 2;
      *(short *)(iVar4 + 8 + puVar2[0x14]) = sVar5 + 3;
      *(short *)(iVar4 + 10 + puVar2[0x14]) = sVar5;
      iVar4 = iVar4 + 0xc;
    } while (iVar6 < (int)uVar1);
  }
  uVar3 = FUN_004051c3(uVar1 * 0xc);
  puVar2[0x10] = uVar3;
  uVar3 = FUN_004051c3(uVar1 << 2);
  puVar2[0x11] = uVar3;
  uVar3 = FUN_004051c3(uVar1 << 2);
  puVar2[0x12] = uVar3;
  FUN_00401a10(puVar2);
  *(ushort *)(puVar2 + 0x15) = param_1;
  return puVar2;
}


// ==== FUN_00402a60 @ 00402a60 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00402a60(void)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float *pfVar6;
  float *pfVar7;
  float *pfVar8;
  int iVar9;
  float *pfVar10;
  float *pfVar11;
  int iVar12;
  int iVar13;
  float fStack_b0;
  float fStack_ac;
  float fStack_a8;
  float afStack_a4 [3];
  float afStack_98 [3];
  undefined1 auStack_8c [12];
  undefined4 local_80 [10];
  float afStack_58 [10];
  undefined4 uStack_30;
  float *pfStack_14;
  float *pfStack_10;
  
  FUN_00401a10(local_80);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))(*(int **)(DAT_004b4eb8 + 0xc),1,local_80);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))(*(int **)(DAT_004b4eb8 + 0xc),2,auStack_8c);
  iVar12 = 4;
  pfVar7 = pfStack_14;
  do {
    pfVar10 = (float *)(((int)afStack_58 - (int)pfStack_14) + (int)pfVar7);
    iVar13 = 4;
    pfVar11 = pfStack_10;
    do {
      *pfVar10 = 0.0;
      fVar1 = *pfVar10;
      iVar9 = 4;
      pfVar6 = pfVar11;
      pfVar8 = pfVar7;
      do {
        fVar2 = *pfVar8;
        fVar3 = *pfVar6;
        pfVar6 = pfVar6 + 4;
        pfVar8 = pfVar8 + 1;
        iVar9 = iVar9 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar9 != 0);
      *pfVar10 = fVar1;
      pfVar10 = pfVar10 + 1;
      pfVar11 = pfVar11 + 1;
      iVar13 = iVar13 + -1;
    } while (iVar13 != 0);
    pfVar7 = pfVar7 + 4;
    iVar12 = iVar12 + -1;
  } while (iVar12 != 0);
  iVar13 = 0;
  pfVar7 = afStack_58;
  pfVar11 = afStack_98;
  for (iVar12 = 0x10; iVar12 != 0; iVar12 = iVar12 + -1) {
    *pfVar11 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar11 = pfVar11 + 1;
  }
  iVar12 = 0;
  if (*(short *)(pfStack_14 + 0x15) != 0) {
    iVar9 = 0;
    do {
      pfVar11 = (float *)(iVar13 + (int)pfStack_14[0x13]);
      pfVar11[2] = 0.0;
      pfVar11[4] = 0.0;
      pfVar11[5] = 0.0;
      pfVar11[10] = 0.0;
      pfVar11[0xc] = 1.0;
      pfVar11[0xd] = 0.0;
      pfVar11[0x12] = 0.0;
      pfVar11[0x14] = 1.0;
      pfVar11[0x15] = 1.0;
      pfVar11[0x1a] = 0.0;
      pfVar11[0x1c] = 0.0;
      pfVar11[0x1d] = 1.0;
      pfVar7 = (float *)(iVar9 + (int)pfStack_14[0x10]);
      fStack_b0 = *pfVar7;
      fStack_ac = pfVar7[1];
      fStack_a8 = pfVar7[2];
      pfVar7 = (float *)FUN_00401930(afStack_a4,&fStack_b0,afStack_98);
      fVar1 = *pfVar7;
      fVar2 = pfVar7[1];
      fVar3 = pfVar7[2];
      fVar4 = *(float *)((int)pfStack_14[0x11] + iVar12 * 4);
      pfVar11[0x1b] = fVar4;
      pfVar11[0x13] = fVar4;
      pfVar11[0xb] = fVar4;
      pfVar11[3] = fVar4;
      fVar4 = *(float *)((int)pfStack_14[0x12] + iVar12 * 4) * (float)_DAT_004120a8;
      fVar5 = -fVar4;
      *pfVar11 = fVar5 + fVar1;
      pfVar11[1] = fVar2 + fVar5;
      pfVar11[2] = fVar3;
      pfVar11[10] = fVar3;
      pfVar11[8] = fVar1 + fVar4;
      pfVar11[9] = fVar2 + fVar5;
      pfVar11[0x12] = fVar3;
      iVar12 = iVar12 + 1;
      iVar13 = iVar13 + 0x80;
      pfVar11[0x10] = fVar1 + fVar4;
      pfVar11[0x11] = fVar2 + fVar4;
      pfVar11[0x1a] = fVar3;
      pfVar11[0x18] = fVar5 + fVar1;
      pfVar11[0x19] = fVar2 + fVar4;
      iVar9 = iVar9 + 0xc;
    } while (iVar12 < (int)(uint)*(ushort *)(pfStack_14 + 0x15));
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x68))
            (*(int **)(DAT_004b4eb8 + 0xc),4,0x242,pfStack_14[0x13],
             (uint)*(ushort *)(pfStack_14 + 0x15) << 2,pfStack_14[0x14],
             (uint)*(ushort *)(pfStack_14 + 0x15) * 6,0);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))(*(int **)(DAT_004b4eb8 + 0xc),2,uStack_30);
  return;
}


// ==== FUN_00402d00 @ 00402d00 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00402d00(int param_1,float param_2,int param_3,int *param_4,int param_5)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  int iVar5;
  int iVar6;
  float *pfVar7;
  float *pfVar8;
  float10 fVar9;
  float10 fVar10;
  float local_8c [8];
  float local_6c [8];
  float local_4c [8];
  float local_2c;
  float local_28;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  float local_14;
  undefined4 local_10;
  int iStack_c;
  int local_8;
  
  if (param_5 < 2) {
    return;
  }
  iVar6 = *(int *)(param_1 + 0x60);
  pfVar7 = (float *)((int)param_2 * 0x20 + iVar6);
  pfVar8 = local_4c;
  for (iVar5 = 8; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar8 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar8 = pfVar8 + 1;
  }
  fVar1 = local_4c[2] * local_4c[2] + local_4c[1] * local_4c[1] + local_4c[0] * local_4c[0];
  pfVar7 = (float *)(param_3 * 0x20 + iVar6);
  pfVar8 = local_6c;
  for (iVar5 = 8; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar8 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar8 = pfVar8 + 1;
  }
  if (fVar1 == _DAT_004120c8) {
    if (param_5 < 2) {
      return;
    }
    iVar6 = param_5 + -1;
    do {
      pfVar7 = local_4c;
      pfVar8 = (float *)(*param_4 * 0x20 + *(int *)(param_1 + 0x60));
      for (iVar5 = 8; iVar5 != 0; iVar5 = iVar5 + -1) {
        *pfVar8 = *pfVar7;
        pfVar7 = pfVar7 + 1;
        pfVar8 = pfVar8 + 1;
      }
      iVar6 = iVar6 + -1;
      *param_4 = *param_4 + 1;
    } while (iVar6 != 0);
    return;
  }
  param_2 = (local_6c[2] * local_4c[2] + local_6c[1] * local_4c[1] + local_6c[0] * local_4c[0]) /
            fVar1;
  if (param_2 < (float)_DAT_004120c0) {
    param_2 = -1.0;
  }
  if (param_2 <= (float)_DAT_004120b0) {
    if (param_2 < _DAT_004120c8) {
      local_10 = 0x7f3321d2;
      iStack_c = 0x4012d97c;
      goto LAB_00402df4;
    }
  }
  else {
    param_2 = 1.0;
  }
  local_10 = 0x54442d18;
  iStack_c = 0xbff921fb;
LAB_00402df4:
  fVar10 = (float10)fpatan((float10)param_2,(float10)-SQRT((float)_DAT_004120b0 - param_2 * param_2)
                          );
  fVar2 = (float)fVar10 + (float)(double)CONCAT44(iStack_c,local_10);
  fVar10 = (float10)fsin((float10)fVar2);
  fVar1 = (float)fVar10;
  iStack_c = 1;
  if (1 < param_5) {
    local_24 = (float)param_5;
    local_8 = param_5 + -1;
    do {
      fVar3 = ((float)iStack_c * fVar2) / local_24;
      fVar4 = ((float)local_8 * fVar2) / local_24;
      fVar10 = (float10)fsin((float10)fVar4);
      local_1c = (float)fVar10;
      fVar9 = (float10)fsin((float10)fVar3);
      local_20 = (float)fVar9;
      local_8c[0] = ((float)fVar10 * local_4c[0] + (float)fVar9 * local_6c[0]) / fVar1;
      fVar10 = (float10)fsin((float10)fVar4);
      local_14 = (float)fVar10;
      fVar9 = (float10)fsin((float10)fVar3);
      local_28 = (float)fVar9;
      local_8c[1] = ((float)fVar10 * local_4c[1] + (float)fVar9 * local_6c[1]) / fVar1;
      fVar10 = (float10)fsin((float10)fVar4);
      local_18 = (float)fVar10;
      fVar9 = (float10)fsin((float10)fVar3);
      local_2c = (float)fVar9;
      local_8c[2] = ((float)fVar10 * local_4c[2] + (float)fVar9 * local_6c[2]) / fVar1;
      pfVar7 = local_8c;
      pfVar8 = (float *)(*param_4 * 0x20 + *(int *)(param_1 + 0x60));
      for (iVar6 = 8; iVar6 != 0; iVar6 = iVar6 + -1) {
        *pfVar8 = *pfVar7;
        pfVar7 = pfVar7 + 1;
        pfVar8 = pfVar8 + 1;
      }
      iStack_c = iStack_c + 1;
      *param_4 = *param_4 + 1;
      local_8 = local_8 + -1;
    } while (iStack_c < param_5);
  }
  return;
}


// ==== FUN_00402f40 @ 00402f40 ====

int __cdecl FUN_00402f40(int param_1,int param_2,int param_3,int param_4)

{
  if (param_3 == 0) {
    if (param_2 < 5) {
      return 0;
    }
    if (0xe < param_2) {
      return 0xb;
    }
    return param_2 + -4;
  }
  if (param_3 == param_1) {
    if (param_4 == 0) {
      if (param_2 < 5) {
        return param_2 + 1;
      }
      if (param_2 < 10) {
        return (param_2 + 4) % 5 + 6;
      }
      if (param_2 < 0xf) {
        return (param_2 + 1) % 5 + 1;
      }
      return (param_2 + 1) % 5 + 6;
    }
    if (param_4 != param_1) {
      if (param_2 < 5) {
        return (param_1 + -1) * (param_2 + 5) + 0xb + param_4;
      }
      if (param_2 < 10) {
        return ((param_2 + 4) % 5 + 0x14) * (param_1 + -1) + 0xb + param_4;
      }
      if (param_2 < 0xf) {
        return ((param_1 + -1) * (param_2 + -5) - param_4) + 0xb + param_1;
      }
      return ((param_1 + -1) * (param_2 + 5) - param_4) + 0xb + param_1;
    }
    if (param_2 < 5) {
      return (param_2 + 1) % 5 + 1;
    }
    if (param_2 < 10) {
      return param_2 + 1;
    }
    return param_2 + -9;
  }
  if (param_4 == 0) {
    if (param_2 < 5) {
      return (param_1 + -1) * param_2 + 0xb + param_3;
    }
    if (param_2 < 10) {
      return (param_2 % 5 + 0xf) * (param_1 + -1) + 0xb + param_3;
    }
    if (param_2 < 0xf) {
      return (((param_2 + 1) % 5 + 0xf) * (param_1 + -1) - param_3) + 0xb + param_1;
    }
    param_2 = param_2 + 1;
  }
  else {
    if (param_4 != param_3) {
      return ((param_3 + -2) * (param_3 + -1)) / 2 + param_4 +
             ((param_1 + -2) * (param_1 + -1) * param_2) / 2 + -0x13 + param_1 * 0x1e;
    }
    if (param_2 < 5) {
      return ((param_2 + 1) % 5) * (param_1 + -1) + 0xb + param_3;
    }
    if (param_2 < 10) {
      return (param_2 % 5 + 10) * (param_1 + -1) + 0xb + param_3;
    }
    if (param_2 < 0xf) {
      return ((param_2 % 5 + 10) * (param_1 + -1) - param_3) + 0xb + param_1;
    }
  }
  return (param_2 % 5 + 0x19) * (param_1 + -1) + 0xb + param_3;
}


// ==== FUN_00403150 @ 00403150 ====

void __cdecl
FUN_00403150(int param_1,int param_2,undefined4 param_3,undefined4 param_4,undefined4 param_5)

{
  int iVar1;
  
  iVar1 = param_2 * 0x20;
  *(undefined4 *)(iVar1 + *(int *)(param_1 + 0x60)) = param_3;
  *(undefined4 *)(iVar1 + 4 + *(int *)(param_1 + 0x60)) = param_4;
  *(undefined4 *)(iVar1 + 8 + *(int *)(param_1 + 0x60)) = param_5;
  return;
}


// ==== FUN_00403180 @ 00403180 ====

void __cdecl FUN_00403180(float param_1,float *param_2,float *param_3)

{
  float10 fVar1;
  
  fVar1 = (float10)fsin((float10)param_1);
  *param_2 = (float)fVar1;
  fVar1 = (float10)fcos((float10)param_1);
  *param_3 = (float)fVar1;
  return;
}


// ==== FUN_004031b0 @ 004031b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __cdecl FUN_004031b0(byte param_1,float param_2,float param_3,int param_4)

{
  bool bVar1;
  float fVar2;
  float fVar3;
  byte bVar4;
  ushort uVar5;
  uint uVar6;
  undefined4 *puVar7;
  int iVar8;
  int iVar9;
  undefined4 *puVar10;
  short sVar11;
  float fVar12;
  int iVar13;
  undefined4 *puVar14;
  undefined4 *puVar15;
  float10 fVar16;
  undefined4 local_8c [4];
  float local_7c;
  float local_78;
  undefined4 local_6c [4];
  float local_5c;
  float local_58;
  undefined4 local_4c [4];
  float local_3c;
  float local_38;
  int local_2c;
  float local_28;
  float local_24;
  float local_20;
  uint local_1c;
  float local_18;
  uint local_14;
  float local_10;
  int local_c;
  float local_8;
  
  bVar4 = param_1;
  _param_1 = (uint)param_1;
  local_2c = 0;
  local_c = 0;
  if (bVar4 == 0) {
    _param_1 = 1;
  }
  else if (200 < bVar4) {
    _param_1 = 200;
  }
  if (_DAT_004120c8 <= param_2) {
    if (_DAT_004120f0 < param_2) {
      param_2 = 1e+30;
    }
  }
  else {
    param_2 = 0.0;
  }
  local_1c = _param_1;
  uVar6 = _param_1 * _param_1 * 0x14;
  puVar7 = FUN_00402040((short)(uVar6 / 2) + 2,(ushort)uVar6);
  iVar8 = local_c;
  local_c = local_c + 1;
  FUN_00403150((int)puVar7,iVar8,0,0,param_2);
  local_18 = 0.4472136;
  fVar12 = param_2 * 0.4472136;
  _param_1 = 0;
  local_8 = fVar12 + fVar12;
  local_10 = fVar12;
  do {
    FUN_00403180((float)(int)_param_1 * (float)_DAT_004120e8,&local_20,&local_24);
    iVar8 = local_c;
    local_c = local_c + 1;
    FUN_00403150((int)puVar7,iVar8,local_24 * local_8,local_20 * local_8,fVar12);
    _param_1 = _param_1 + 1;
  } while ((int)_param_1 < 5);
  fVar12 = -local_10;
  _param_1 = 1;
  local_18 = fVar12;
  do {
    FUN_00403180((float)(int)_param_1 * (float)_DAT_004120e0,&local_20,&local_24);
    iVar8 = local_c;
    local_c = local_c + 1;
    FUN_00403150((int)puVar7,iVar8,local_24 * local_8,local_20 * local_8,fVar12);
    iVar8 = local_c;
    _param_1 = _param_1 + 2;
  } while ((int)_param_1 < 0xb);
  local_c = local_c + 1;
  FUN_00403150((int)puVar7,iVar8,0,0,-param_2);
  uVar6 = local_1c;
  iVar8 = 0;
  do {
    iVar8 = iVar8 + 1;
    FUN_00402d00((int)puVar7,0.0,iVar8,&local_c,uVar6);
  } while (iVar8 < 5);
  fVar12 = 1.4013e-45;
  do {
    FUN_00402d00((int)puVar7,fVar12,(int)fVar12 % 5 + 1,&local_c,uVar6);
    bVar1 = (int)fVar12 < 5;
    fVar12 = (float)((int)fVar12 + 1);
  } while (bVar1);
  fVar12 = 1.4013e-45;
  do {
    FUN_00402d00((int)puVar7,fVar12,(int)fVar12 + 5,&local_c,uVar6);
    bVar1 = (int)fVar12 < 5;
    fVar12 = (float)((int)fVar12 + 1);
  } while (bVar1);
  fVar12 = 1.4013e-45;
  do {
    FUN_00402d00((int)puVar7,fVar12,((int)fVar12 + 3) % 5 + 6,&local_c,uVar6);
    bVar1 = (int)fVar12 < 5;
    fVar12 = (float)((int)fVar12 + 1);
  } while (bVar1);
  fVar12 = 8.40779e-45;
  do {
    FUN_00402d00((int)puVar7,fVar12,((int)fVar12 + -5) % 5 + 6,&local_c,uVar6);
    iVar8 = (int)fVar12 + -5;
    fVar12 = (float)((int)fVar12 + 1);
  } while (iVar8 < 5);
  iVar8 = 0;
  do {
    FUN_00402d00((int)puVar7,1.54143e-44,iVar8 + 6,&local_c,uVar6);
    iVar8 = iVar8 + 1;
  } while (iVar8 < 5);
  _param_1 = 0;
  iVar8 = uVar6 - 1;
  local_8 = 1.82169e-44;
  do {
    local_14 = 1;
    if (1 < iVar8) {
      local_10 = local_8;
      iVar13 = ((int)(_param_1 + 1) % 5) * iVar8 + 0xd;
      do {
        local_14 = local_14 + 1;
        FUN_00402d00((int)puVar7,local_10,iVar13,&local_c,local_14);
        iVar13 = iVar13 + 1;
        local_10 = (float)((int)local_10 + 1);
      } while ((int)local_14 < iVar8);
    }
    _param_1 = _param_1 + 1;
    local_8 = (float)((int)local_8 + iVar8);
  } while ((int)_param_1 < 5);
  local_18 = 7.00649e-45;
  fVar12 = (float)(iVar8 * 10);
  local_14 = (int)fVar12 + 0xd;
  local_8 = (float)(iVar8 * 0xf + 0xd);
  local_28 = fVar12;
  do {
    iVar13 = 1;
    if (1 < iVar8) {
      local_10 = local_8;
      _param_1 = local_14;
      do {
        iVar13 = iVar13 + 1;
        FUN_00402d00((int)puVar7,local_10,_param_1,&local_c,iVar13);
        _param_1 = _param_1 + 1;
        local_10 = (float)((int)local_10 + 1);
        fVar12 = local_28;
      } while (iVar13 < iVar8);
    }
    local_8 = (float)((int)local_8 + iVar8);
    local_14 = local_14 + iVar8;
    local_18 = (float)((int)local_18 + -1);
  } while (local_18 != 0.0);
  _param_1 = 0;
  local_8 = (float)(local_1c + 9 + (int)fVar12);
  local_18 = 0.0;
  do {
    iVar13 = 1;
    if (1 < iVar8) {
      local_10 = (float)(((int)(_param_1 + 1) % 5 + 0xf) * iVar8 + 9 + local_1c);
      local_14 = (uint)local_8;
      do {
        iVar13 = iVar13 + 1;
        FUN_00402d00((int)puVar7,local_10,local_14,&local_c,iVar13);
        local_14 = local_14 + -1;
        local_10 = (float)((int)local_10 + -1);
      } while (iVar13 < iVar8);
    }
    _param_1 = _param_1 + 1;
    local_8 = (float)((int)local_8 + iVar8);
  } while ((int)_param_1 < 5);
  _param_1 = 0;
  local_8 = (float)(iVar8 * 0x19 + 0xd);
  do {
    if (1 < iVar8) {
      local_10 = local_8;
      fVar12 = (float)(((int)(_param_1 + 1) % 5 + 0x19) * iVar8 + 0xd);
      local_14 = 1;
      do {
        local_14 = local_14 + 1;
        FUN_00402d00((int)puVar7,fVar12,(int)local_10,&local_c,local_14);
        local_10 = (float)((int)local_10 + 1);
        fVar12 = (float)((int)fVar12 + 1);
      } while ((int)local_14 < iVar8);
    }
    _param_1 = _param_1 + 1;
    local_8 = (float)((int)local_8 + iVar8);
  } while ((int)_param_1 < 5);
  _param_1 = 0;
  do {
    local_8 = 0.0;
    if (0 < (int)local_1c) {
      do {
        if (-1 < (int)local_8) {
          iVar8 = local_2c * 6;
          uVar6 = 0;
          do {
            local_18 = (float)FUN_00402f40(local_1c,_param_1,(int)local_8,uVar6);
            local_28 = (float)FUN_00402f40(local_1c,_param_1,(int)local_8 + 1,uVar6);
            local_14 = uVar6 + 1;
            local_10 = (float)FUN_00402f40(local_1c,_param_1,(int)local_8 + 1,local_14);
            *(undefined2 *)(iVar8 + puVar7[0x1b]) = local_18._0_2_;
            *(undefined2 *)(iVar8 + 2 + puVar7[0x1b]) = local_28._0_2_;
            *(short *)(iVar8 + 4 + puVar7[0x1b]) = SUB42(local_10,0);
            local_2c = local_2c + 1;
            iVar13 = iVar8 + 6;
            if ((int)uVar6 < (int)local_8) {
              iVar9 = FUN_00402f40(local_1c,_param_1,(int)local_8,local_14);
              *(undefined2 *)(iVar13 + puVar7[0x1b]) = local_18._0_2_;
              *(undefined2 *)(iVar8 + 8 + puVar7[0x1b]) = local_10._0_2_;
              *(short *)(iVar8 + 10 + puVar7[0x1b]) = (short)iVar9;
              local_2c = local_2c + 1;
              iVar13 = iVar8 + 0xc;
            }
            iVar8 = iVar13;
            uVar6 = local_14;
          } while ((int)local_14 <= (int)local_8);
        }
        local_8 = (float)((int)local_8 + 1);
      } while ((int)local_8 < (int)local_1c);
    }
    _param_1 = _param_1 + 1;
  } while ((int)_param_1 < 0x14);
  iVar8 = 0;
  if (*(short *)(puVar7 + 0x1a) != 0) {
    iVar13 = 0;
    do {
      ((float *)(puVar7[0x18] + iVar13))[4] =
           (*(float *)(puVar7[0x18] + iVar13) / param_2) * param_3;
      local_28 = *(float *)(puVar7[0x18] + iVar13 + 8) / param_2;
      fVar16 = (float10)fpatan((float10)local_28,
                               (float10)(*(float *)(puVar7[0x18] + iVar13 + 4) / param_2));
      local_18 = (float)fVar16;
      iVar8 = iVar8 + 1;
      *(float *)(iVar13 + 0x14 + puVar7[0x18]) = local_18 * (float)_DAT_004120d8 * param_3;
      *(undefined4 *)(iVar13 + 0xc + puVar7[0x18]) = 0xffffffff;
      iVar13 = iVar13 + 0x20;
    } while (iVar8 < (int)(uint)*(ushort *)(puVar7 + 0x1a));
  }
  if (param_4 == 0) {
    return puVar7;
  }
  puVar10 = FUN_00402040(*(ushort *)(puVar7 + 0x1d) * 3 + *(short *)(puVar7 + 0x1a),
                         *(ushort *)(puVar7 + 0x1d));
  iVar8 = 0;
  if (*(short *)(puVar7 + 0x1a) != 0) {
    iVar13 = 0;
    do {
      puVar14 = (undefined4 *)(puVar7[0x18] + iVar13);
      puVar15 = (undefined4 *)(iVar13 + puVar10[0x18]);
      iVar8 = iVar8 + 1;
      iVar13 = iVar13 + 0x20;
      for (iVar9 = 8; iVar9 != 0; iVar9 = iVar9 + -1) {
        *puVar15 = *puVar14;
        puVar14 = puVar14 + 1;
        puVar15 = puVar15 + 1;
      }
    } while (iVar8 < (int)(uint)*(ushort *)(puVar7 + 0x1a));
  }
  iVar8 = 0;
  if ((uint)*(ushort *)(puVar7 + 0x1d) * 3 != 0) {
    do {
      *(undefined2 *)(puVar10[0x1b] + iVar8 * 2) = *(undefined2 *)(puVar7[0x1b] + iVar8 * 2);
      iVar8 = iVar8 + 1;
    } while (iVar8 < (int)((uint)*(ushort *)(puVar7 + 0x1d) * 3));
  }
  uVar5 = *(ushort *)(puVar7 + 0x1a);
  _param_1 = 0;
  local_14 = (uint)uVar5;
  if (*(short *)(puVar7 + 0x1d) != 0) {
    param_2 = 0.0;
    param_4 = (uVar5 + 2) * 0x20;
    do {
      iVar8 = (int)param_2 + puVar7[0x1b];
      iVar13 = puVar7[0x18];
      puVar14 = (undefined4 *)((uint)*(ushort *)((int)param_2 + puVar7[0x1b]) * 0x20 + iVar13);
      puVar15 = local_4c;
      for (iVar9 = 8; iVar9 != 0; iVar9 = iVar9 + -1) {
        *puVar15 = *puVar14;
        puVar14 = puVar14 + 1;
        puVar15 = puVar15 + 1;
      }
      puVar14 = (undefined4 *)((uint)*(ushort *)(iVar8 + 2) * 0x20 + iVar13);
      puVar15 = local_6c;
      for (iVar9 = 8; fVar3 = local_3c, fVar12 = local_5c, iVar9 != 0; iVar9 = iVar9 + -1) {
        *puVar15 = *puVar14;
        puVar14 = puVar14 + 1;
        puVar15 = puVar15 + 1;
      }
      fVar2 = local_3c - local_5c;
      puVar14 = (undefined4 *)((uint)*(ushort *)(iVar8 + 4) * 0x20 + iVar13);
      puVar15 = local_8c;
      for (iVar9 = 8; iVar9 != 0; iVar9 = iVar9 + -1) {
        *puVar15 = *puVar14;
        puVar14 = puVar14 + 1;
        puVar15 = puVar15 + 1;
      }
      bVar1 = false;
      if ((float)_DAT_004120d0 < fVar2) {
        bVar1 = true;
        do {
          fVar3 = fVar3 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < fVar3 - fVar12);
        local_3c = fVar3;
      }
      if ((float)_DAT_004120d0 < local_3c - local_7c) {
        bVar1 = true;
        do {
          local_3c = local_3c - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_3c - local_7c);
      }
      if ((float)_DAT_004120d0 < fVar12 - local_3c) {
        bVar1 = true;
        do {
          fVar12 = fVar12 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < fVar12 - local_3c);
        local_5c = fVar12;
      }
      if ((float)_DAT_004120d0 < fVar12 - local_7c) {
        bVar1 = true;
        do {
          fVar12 = fVar12 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < fVar12 - local_7c);
        local_5c = fVar12;
      }
      if ((float)_DAT_004120d0 < local_7c - local_3c) {
        bVar1 = true;
        do {
          local_7c = local_7c - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_7c - local_3c);
      }
      if ((float)_DAT_004120d0 < local_7c - fVar12) {
        bVar1 = true;
        do {
          local_7c = local_7c - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_7c - fVar12);
      }
      if ((float)_DAT_004120d0 < local_38 - local_58) {
        bVar1 = true;
        do {
          local_38 = local_38 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_38 - local_58);
      }
      if ((float)_DAT_004120d0 < local_38 - local_78) {
        bVar1 = true;
        do {
          local_38 = local_38 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_38 - local_78);
      }
      if ((float)_DAT_004120d0 < local_58 - local_38) {
        bVar1 = true;
        do {
          local_58 = local_58 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_58 - local_38);
      }
      if ((float)_DAT_004120d0 < local_58 - local_78) {
        bVar1 = true;
        do {
          local_58 = local_58 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_58 - local_78);
      }
      if ((float)_DAT_004120d0 < local_78 - local_38) {
        bVar1 = true;
        do {
          local_78 = local_78 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_78 - local_38);
      }
      if (local_78 - local_58 <= (float)_DAT_004120d0) {
        if (bVar1) goto LAB_00403ae8;
      }
      else {
        do {
          local_78 = local_78 - _DAT_00412090;
        } while ((float)_DAT_004120d0 < local_78 - local_58);
LAB_00403ae8:
        puVar14 = local_4c;
        puVar15 = (undefined4 *)(param_4 + -0x40 + puVar10[0x18]);
        for (iVar8 = 8; iVar8 != 0; iVar8 = iVar8 + -1) {
          *puVar15 = *puVar14;
          puVar14 = puVar14 + 1;
          puVar15 = puVar15 + 1;
        }
        puVar14 = local_6c;
        puVar15 = (undefined4 *)(param_4 + -0x20 + puVar10[0x18]);
        for (iVar8 = 8; iVar8 != 0; iVar8 = iVar8 + -1) {
          *puVar15 = *puVar14;
          puVar14 = puVar14 + 1;
          puVar15 = puVar15 + 1;
        }
        puVar14 = local_8c;
        puVar15 = (undefined4 *)(param_4 + puVar10[0x18]);
        for (iVar8 = 8; iVar8 != 0; iVar8 = iVar8 + -1) {
          *puVar15 = *puVar14;
          puVar14 = puVar14 + 1;
          puVar15 = puVar15 + 1;
        }
        sVar11 = (short)local_14;
        *(short *)(puVar10[0x1b] + (int)param_2) = sVar11;
        *(short *)(puVar10[0x1b] + 2 + (int)param_2) = sVar11 + 1;
        *(short *)(puVar10[0x1b] + 4 + (int)param_2) = sVar11 + 2;
        param_4 = param_4 + 0x60;
        local_14 = local_14 + 3;
      }
      _param_1 = _param_1 + 1;
      param_2 = (float)((int)param_2 + 6);
    } while ((int)_param_1 < (int)(uint)*(ushort *)(puVar7 + 0x1d));
    uVar5 = (ushort)local_14;
  }
  *(ushort *)(puVar10 + 0x1a) = uVar5;
  FUN_004051d7(puVar7);
  return puVar10;
}


// ==== FUN_00403ba0 @ 00403ba0 ====

void __cdecl FUN_00403ba0(undefined4 param_1)

{
  DAT_0041a2a6 = (short)param_1;
  DAT_0041a2a4 = (short)((uint)param_1 >> 0x10);
  return;
}


// ==== FUN_00403bb7 @ 00403bb7 ====

void __cdecl FUN_00403bb7(undefined4 *param_1,uint param_2)

{
  uint uVar1;
  
  if (0 < (int)param_2) {
    for (uVar1 = param_2 >> 2; uVar1 != 0; uVar1 = uVar1 - 1) {
      *param_1 = 0;
      param_1 = param_1 + 1;
    }
    for (uVar1 = param_2 & 3; uVar1 != 0; uVar1 = uVar1 - 1) {
      *(undefined1 *)param_1 = 0;
      param_1 = (undefined4 *)((int)param_1 + 1);
    }
  }
  return;
}


// ==== FUN_00403bd6 @ 00403bd6 ====

void __cdecl
FUN_00403bd6(undefined4 *param_1,uint *param_2,uint *param_3,uint *param_4,uint param_5)

{
  uint *puVar1;
  uint *puVar2;
  ushort uVar3;
  ushort uVar4;
  uint uVar5;
  uint uVar6;
  int iVar7;
  ushort uVar8;
  uint uVar9;
  ushort uVar10;
  int *piVar11;
  uint uVar12;
  uint *puVar13;
  uint **ppuVar14;
  int *piVar15;
  undefined4 local_d0;
  undefined4 local_cc;
  uint *local_c8;
  uint *local_c4;
  uint *local_ac;
  int local_88 [4];
  uint local_78;
  uint local_74;
  uint local_70;
  uint local_6c;
  undefined4 local_68;
  undefined4 local_64;
  uint local_58;
  int local_54;
  uint *local_50;
  uint local_4c;
  uint local_48;
  uint *local_44;
  uint *local_40;
  int *local_3c;
  int local_38;
  uint *local_34;
  uint *local_30;
  float local_2c;
  uint *local_28;
  float local_24;
  uint *local_20;
  int *local_1c;
  uint *local_18;
  uint *local_14;
  float fStack_10;
  uint *local_c;
  uint *local_8;
  
  puVar13 = param_4;
  puVar2 = param_3;
  local_50 = param_2;
  local_4c = param_5;
  local_3c = (int *)0x0;
  local_48 = param_5 >> 3 & 1;
  local_44 = param_3;
  local_40 = param_4;
  FUN_00403bb7(&local_d0,0x7c);
  local_58 = local_48;
  local_d0 = 0x7c;
  local_cc = 0x101007;
  local_c4 = puVar2;
  local_c8 = puVar13;
  if (DAT_0041a2b0 < puVar2) {
    local_c4 = DAT_0041a2b0;
  }
  if (DAT_0041a2b4 < puVar13) {
    local_c8 = DAT_0041a2b4;
  }
  local_68 = 0x1000;
  local_64 = 0x10;
  piVar11 = &DAT_004b4f38;
  piVar15 = local_88;
  for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
    *piVar15 = *piVar11;
    piVar11 = piVar11 + 1;
    piVar15 = piVar15 + 1;
  }
  if ((param_5 & 4) != 0) {
    piVar11 = &DAT_004b4ed8;
    piVar15 = local_88;
    for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
      *piVar15 = *piVar11;
      piVar11 = piVar11 + 1;
      piVar15 = piVar15 + 1;
    }
  }
  if ((param_5 & 2) != 0) {
    piVar11 = &DAT_004b4f18;
    piVar15 = local_88;
    for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
      *piVar15 = *piVar11;
      piVar11 = piVar11 + 1;
      piVar15 = piVar15 + 1;
    }
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x24))(*(int **)(DAT_004b4eb8 + 0xc),&param_3);
  (**(code **)(*param_3 + 0x90))(param_3,&local_1c);
  (**(code **)(*param_3 + 8))(param_3);
  (**(code **)(*local_1c + 0x18))(local_1c,&local_d0,&local_3c,0);
  if (local_3c != (int *)0x0) {
    (**(code **)(*local_1c + 8))(local_1c);
    FUN_00403bb7(&local_d0,0x7c);
    local_d0 = 0x7c;
    (**(code **)(*local_3c + 100))(local_3c,0,&local_d0,0x820,0);
    puVar13 = local_c8;
    param_5 = param_5 & 0xffffff;
    local_30 = local_c4;
    local_34 = local_c8;
    local_20 = param_2;
    if ((local_c4 != puVar2) || (local_c8 != param_4)) {
      local_20 = (uint *)FUN_004051c3((int)local_c8 * (int)local_c4 * 4);
      local_24 = (float)puVar2 / (float)(int)local_30;
      param_5 = CONCAT13(1,(undefined3)param_5);
      local_14 = puVar13;
      fStack_10 = (float)param_4 / (float)(int)puVar13;
      local_2c = 0.0;
      if (puVar13 != (uint *)0x0) {
        local_c = puVar13;
        local_8 = local_20;
        do {
          param_4 = (uint *)0x0;
          if (local_30 != (uint *)0x0) {
            local_18 = local_30;
            local_28 = local_8;
            do {
              local_38 = (int)ROUND((float)param_4);
              local_54 = (int)ROUND(local_2c);
              param_4 = (uint *)((float)param_4 + local_24);
              puVar1 = local_28 + 1;
              local_18 = (uint *)((int)local_18 - 1);
              *local_28 = param_2[local_54 * (int)puVar2 + local_38];
              local_28 = puVar1;
            } while (local_18 != (uint *)0x0);
          }
          local_2c = local_2c + fStack_10;
          local_8 = local_8 + (int)local_30;
          local_c = (uint *)((int)local_c - 1);
        } while (local_c != (uint *)0x0);
      }
    }
    if (local_88[3] == 0x20) {
      param_4 = local_20;
      local_8 = local_ac;
      iVar7 = FUN_0040404a(local_6c,0xff000000);
      fStack_10 = (float)FUN_0040404a(local_78,0xff0000);
      local_24 = (float)FUN_0040404a(local_74,0xff00);
      local_38 = FUN_0040404a(local_70,0xff);
      if (puVar13 != (uint *)0x0) {
        local_18 = puVar13;
        do {
          if (local_30 != (uint *)0x0) {
            local_c = local_30;
            do {
              uVar9 = *param_4;
              if (iVar7 < 0) {
                uVar12 = (uVar9 & 0xff000000) >> (-(byte)iVar7 & 0x1f);
              }
              else {
                uVar12 = (uVar9 & 0xff000000) << ((byte)iVar7 & 0x1f);
              }
              if ((int)fStack_10 < 0) {
                uVar5 = (uVar9 & 0xff0000) >> (-SUB41(fStack_10,0) & 0x1f);
              }
              else {
                uVar5 = (uVar9 & 0xff0000) << (SUB41(fStack_10,0) & 0x1f);
              }
              if ((int)local_24 < 0) {
                uVar6 = (uVar9 & 0xff00) >> (-SUB41(local_24,0) & 0x1f);
              }
              else {
                uVar6 = (uVar9 & 0xff00) << (SUB41(local_24,0) & 0x1f);
              }
              if (local_38 < 0) {
                uVar9 = (uVar9 & 0xff) >> (-(byte)local_38 & 0x1f);
              }
              else {
                uVar9 = (uVar9 & 0xff) << ((byte)local_38 & 0x1f);
              }
              puVar2 = local_8 + 1;
              param_4 = param_4 + 1;
              local_c = (uint *)((int)local_c - 1);
              *local_8 = uVar12 & local_6c | uVar5 & local_78 | uVar6 & local_74 | uVar9 & local_70;
              local_8 = puVar2;
            } while (local_c != (uint *)0x0);
            local_c = (uint *)0x0;
            puVar13 = local_34;
          }
          local_18 = (uint *)((int)local_18 - 1);
        } while (local_18 != (uint *)0x0);
      }
    }
    if (local_88[3] == 0x10) {
      param_4 = local_20;
      local_8 = local_ac;
      iVar7 = FUN_0040404a(local_6c,0xff000000);
      local_34 = (uint *)FUN_0040404a(local_78,0xff0000);
      fStack_10 = (float)FUN_0040404a(local_74,0xff00);
      local_24 = (float)FUN_0040404a(local_70,0xff);
      while (puVar13 != (uint *)0x0) {
        if (local_30 != (uint *)0x0) {
          local_c = local_30;
          do {
            uVar9 = *param_4;
            if (iVar7 < 0) {
              uVar10 = (ushort)((uVar9 & 0xff000000) >> (-(byte)iVar7 & 0x1f));
            }
            else {
              uVar10 = (ushort)((uVar9 & 0xff000000) << ((byte)iVar7 & 0x1f));
            }
            if ((int)local_34 < 0) {
              uVar3 = (ushort)((uVar9 & 0xff0000) >> (-(byte)local_34 & 0x1f));
            }
            else {
              uVar3 = (ushort)((uVar9 & 0xff0000) << ((byte)local_34 & 0x1f));
            }
            if ((int)fStack_10 < 0) {
              uVar4 = (ushort)((uVar9 & 0xff00) >> (-SUB41(fStack_10,0) & 0x1f));
            }
            else {
              uVar4 = (ushort)((uVar9 & 0xff00) << (SUB41(fStack_10,0) & 0x1f));
            }
            if ((int)local_24 < 0) {
              uVar8 = (ushort)((uVar9 & 0xff) >> (-SUB41(local_24,0) & 0x1f));
            }
            else {
              uVar8 = (ushort)((uVar9 & 0xff) << (SUB41(local_24,0) & 0x1f));
            }
            puVar2 = (uint *)((int)local_8 + 2);
            param_4 = param_4 + 1;
            local_c = (uint *)((int)local_c - 1);
            *(ushort *)local_8 =
                 uVar10 & (ushort)local_6c | uVar3 & (ushort)local_78 | uVar4 & (ushort)local_74 |
                 uVar8 & (ushort)local_70;
            local_8 = puVar2;
          } while (local_c != (uint *)0x0);
        }
        puVar13 = (uint *)((int)puVar13 - 1);
        local_18 = puVar13;
      }
    }
    if (param_5._3_1_ != '\0') {
      FUN_004051d7(local_20);
    }
    (**(code **)(*local_3c + 0x80))(local_3c,0);
  }
  ppuVar14 = &local_50;
  for (iVar7 = 6; iVar7 != 0; iVar7 = iVar7 + -1) {
    *param_1 = *ppuVar14;
    ppuVar14 = ppuVar14 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_0040404a @ 0040404a ====

int __cdecl FUN_0040404a(uint param_1,uint param_2)

{
  int iVar1;
  int iVar2;
  
  iVar1 = 0;
  for (; param_1 != 0; param_1 = param_1 >> 1) {
    iVar1 = iVar1 + 1;
  }
  iVar2 = 0;
  for (; param_2 != 0; param_2 = param_2 >> 1) {
    iVar2 = iVar2 + 1;
  }
  return iVar1 - iVar2;
}


// ==== FUN_0040406d @ 0040406d ====

void __cdecl FUN_0040406d(int param_1)

{
  int *piVar1;
  int unaff_ESI;
  
  FUN_0040484a('\x01','\0');
  piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
  if (param_1 == 0) {
    (**(code **)(*piVar1 + 0x8c))(piVar1,0,0);
  }
  else {
    (**(code **)(*piVar1 + 0x8c))(piVar1,0,*(undefined4 *)(param_1 + 0x14));
  }
  piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
  if (unaff_ESI != 0) {
    (**(code **)(*piVar1 + 0x8c))(piVar1,1,*(undefined4 *)(unaff_ESI + 0x14));
    return;
  }
  (**(code **)(*piVar1 + 0x8c))(piVar1,1,0);
  return;
}


// ==== FUN_004040d2 @ 004040d2 ====

undefined4 FUN_004040d2(undefined4 *param_1)

{
  undefined4 uVar1;
  int iVar2;
  undefined4 *puVar3;
  
  if (param_1[3] == 0x10) {
    puVar3 = &DAT_004b4ef8;
    for (iVar2 = 8; iVar2 != 0; iVar2 = iVar2 + -1) {
      *puVar3 = *param_1;
      param_1 = param_1 + 1;
      puVar3 = puVar3 + 1;
    }
    uVar1 = 0;
  }
  else {
    uVar1 = 1;
  }
  return uVar1;
}


// ==== FUN_004040f4 @ 004040f4 ====

undefined4 FUN_004040f4(undefined4 *param_1)

{
  uint uVar1;
  int iVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  
  uVar1 = param_1[1];
  if (((((uVar1 & 1) == 0) || ((uVar1 & 0x40) == 0)) || ((uint)param_1[3] <= DAT_004b4f24)) ||
     (0x20 < (uint)param_1[3])) {
    if ((((uVar1 & 1) == 0) || ((uVar1 & 0x40) == 0)) || (param_1[3] != DAT_004b4f24))
    goto LAB_0040414f;
    iVar2 = FUN_004041a1(param_1[7]);
    iVar3 = FUN_004041a1(DAT_004b4f34);
    if (iVar2 <= iVar3) goto LAB_0040414f;
  }
  puVar4 = param_1;
  puVar5 = &DAT_004b4f18;
  for (iVar2 = 8; iVar2 != 0; iVar2 = iVar2 + -1) {
    *puVar5 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar5 = puVar5 + 1;
  }
LAB_0040414f:
  if ((((*(byte *)(param_1 + 1) & 0x40) != 0) && (DAT_004b4f44 < (uint)param_1[3])) &&
     ((uint)param_1[3] < 0x21)) {
    puVar4 = param_1;
    puVar5 = &DAT_004b4f38;
    for (iVar2 = 8; iVar2 != 0; iVar2 = iVar2 + -1) {
      *puVar5 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar5 = puVar5 + 1;
    }
  }
  if (((((param_1[1] & 1) != 0) && ((param_1[1] & 0x40) != 0)) && (DAT_004b4ee4 < (uint)param_1[3]))
     && ((uint)param_1[3] < 0x21)) {
    puVar4 = &DAT_004b4ed8;
    for (iVar2 = 8; iVar2 != 0; iVar2 = iVar2 + -1) {
      *puVar4 = *param_1;
      param_1 = param_1 + 1;
      puVar4 = puVar4 + 1;
    }
  }
  return 1;
}


// ==== FUN_004041a1 @ 004041a1 ====

int __cdecl FUN_004041a1(uint param_1)

{
  int iVar1;
  
  iVar1 = 0;
  for (; param_1 != 0; param_1 = param_1 >> 1) {
    if ((param_1 & 1) != 0) {
      iVar1 = iVar1 + 1;
    }
  }
  return iVar1;
}


// ==== FUN_004041b6 @ 004041b6 ====

undefined4 FUN_004041b6(undefined4 *param_1)

{
  if (param_1 == (undefined4 *)0x0) {
    DAT_004b4ebc = (undefined4 *)0x0;
  }
  else {
    DAT_004b4ebc = &DAT_004b4ec8;
    DAT_004b4ec8 = *param_1;
    DAT_004b4ecc = param_1[1];
    DAT_004b4ed0 = param_1[2];
    DAT_004b4ed4 = param_1[3];
  }
  return 1;
}


// ==== FUN_004041df @ 004041df ====

undefined4 FUN_004041df(void)

{
  int *piVar1;
  uint uVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  undefined1 local_1d8 [132];
  undefined4 local_154;
  undefined4 local_150;
  undefined4 local_ec;
  undefined4 local_e8;
  undefined4 local_e4;
  undefined4 local_e0;
  undefined4 local_d8;
  undefined4 local_a4 [8];
  undefined4 local_84;
  undefined4 local_70;
  undefined4 local_6c;
  undefined4 local_68;
  undefined4 local_60;
  undefined4 local_5c;
  undefined4 local_58;
  undefined4 local_2c [4];
  undefined4 local_1c;
  undefined4 local_18;
  undefined4 local_14;
  undefined4 local_10;
  undefined4 local_c;
  undefined4 local_8;
  
  DAT_004b4f58 = 0;
  DAT_004b4eb8 = (undefined4 *)FUN_004051c3(0x18);
  DAT_004b4eb8[4] = 0;
  DAT_004b4eb8[2] = 0;
  DAT_004b4eb8[5] = 0;
  DAT_004b4eb8[3] = 0;
  (*DAT_004f4f88)(FUN_004041b6,0);
  (*DAT_004f4f8c)(DAT_004b4ebc,&DAT_004b4f5c,&DAT_00412158,0);
  (**(code **)(*DAT_004b4f5c + 0x50))(DAT_004b4f5c,DAT_004f4fbc,0x813);
  (**(code **)(*DAT_004b4f5c + 0x54))(DAT_004b4f5c,0x280,0x1e0,0x10,0,0);
  FUN_00403bb7(&local_ec,0x7c);
  local_ec = 0x7c;
  local_e8 = 0x21;
  local_84 = 0x6218;
  local_d8 = 1;
  (**(code **)(*DAT_004b4f5c + 0x18))(DAT_004b4f5c,&local_ec,&DAT_004b4f60,0);
  FUN_00403bb7(local_2c,0x10);
  local_2c[0] = 4;
  (**(code **)(*DAT_004b4f60 + 0x30))(DAT_004b4f60,local_2c,DAT_004b4eb8 + 4);
  (**(code **)*DAT_004b4f5c)(DAT_004b4f5c,&DAT_00412228,DAT_004b4eb8 + 2);
  piVar1 = (int *)DAT_004b4eb8[2];
  if ((piVar1 != (int *)0x0) &&
     ((**(code **)(*piVar1 + 0x10))(piVar1,&DAT_00412258,DAT_004b4eb8[4],DAT_004b4eb8 + 3),
     DAT_004b4eb8[3] != 0)) {
    (**(code **)(*(int *)DAT_004b4eb8[2] + 0x18))
              ((int *)DAT_004b4eb8[2],&DAT_00412258,FUN_004040d2,0);
    FUN_00403bb7(&local_ec,0x7c);
    local_ec = 0x7c;
    local_e8 = 0x1007;
    local_e0 = 0x280;
    local_e4 = 0x1e0;
    puVar4 = &DAT_004b4ef8;
    puVar5 = local_a4;
    for (iVar3 = 8; iVar3 != 0; iVar3 = iVar3 + -1) {
      *puVar5 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar5 = puVar5 + 1;
    }
    local_84 = 0x20000;
    (**(code **)(*DAT_004b4f5c + 0x18))(DAT_004b4f5c,&local_ec,DAT_004b4eb8 + 5,0);
    (**(code **)(*(int *)DAT_004b4eb8[4] + 0xc))((int *)DAT_004b4eb8[4],DAT_004b4eb8[5]);
    if (DAT_004b4eb8[5] != 0) {
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x20))((int *)DAT_004b4eb8[3],DAT_004b4eb8[4],0);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x10))((int *)DAT_004b4eb8[3],FUN_004040f4,0);
      *DAT_004b4eb8 = 0x280;
      DAT_004b4eb8[1] = 0x1e0;
      local_10 = 0x1e0;
      local_c = 0;
      local_1c = 0;
      local_18 = 0;
      local_14 = 0x280;
      local_8 = 0x3f800000;
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x34))((int *)DAT_004b4eb8[3],&local_1c);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x89,0);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x8b,0xffffffff);
      FUN_00403bb7(&local_70,0x44);
      local_60 = 0x3f800000;
      local_5c = 0x3f800000;
      local_58 = 0x3f800000;
      local_70 = 0x3f800000;
      local_6c = 0x3f800000;
      local_68 = 0x3f800000;
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x40))((int *)DAT_004b4eb8[3],&local_70);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],7,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0xe,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x17,4);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x1a,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],4,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x13,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x14,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,0x12,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,0x12,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,0xb,0);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,0xb,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,2,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,3,0);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,1,4);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,0x10,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,0x11,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,2,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,3,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,1,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,0x10,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,0x11,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x1b,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x13,5);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x14,6);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,2,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,3,0);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,1,4);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,5,2);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,6,0);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],0,4,4);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,1,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x94))((int *)DAT_004b4eb8[3],1,4,1);
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0xc))((int *)DAT_004b4eb8[3],local_1d8);
      DAT_0041a2b0 = local_154;
      DAT_0041a2b4 = local_150;
      FUN_00404984();
      (**(code **)(*(int *)DAT_004b4eb8[3] + 0x14))((int *)DAT_004b4eb8[3]);
      FUN_0040484a('\x02','\x01');
      FUN_0040484a('\x03','\0');
      FUN_0040406d(0);
      uVar2 = (**(code **)(*(int *)DAT_004b4eb8[3] + 0x50))((int *)DAT_004b4eb8[3],0x89,0);
      return uVar2 & 0xffffff00;
    }
  }
  return CONCAT31((int3)((uint)DAT_004b4eb8 >> 8),1);
}


// ==== FUN_00404780 @ 00404780 ====

void FUN_00404780(void)

{
  int *piVar1;
  
  (**(code **)(*DAT_004b4f5c + 0x50))(DAT_004b4f5c,DAT_004f4fbc,8);
  piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
  if (piVar1 != (int *)0x0) {
    (**(code **)(*piVar1 + 8))(piVar1);
  }
  piVar1 = *(int **)(DAT_004b4eb8 + 0x10);
  if (piVar1 != (int *)0x0) {
    (**(code **)(*piVar1 + 8))(piVar1);
  }
  if (*(int *)(DAT_004b4eb8 + 0x10) != 0) {
    (**(code **)(**(int **)(DAT_004b4eb8 + 0x14) + 8))(*(int **)(DAT_004b4eb8 + 0x14));
  }
  piVar1 = *(int **)(DAT_004b4eb8 + 8);
  if (piVar1 != (int *)0x0) {
    (**(code **)(*piVar1 + 8))(piVar1);
  }
  if (DAT_004b4f5c != (int *)0x0) {
    (**(code **)(*DAT_004b4f5c + 8))(DAT_004b4f5c);
  }
  DestroyWindow(DAT_004f4fbc);
  return;
}


// ==== FUN_004047f9 @ 004047f9 ====

void FUN_004047f9(void)

{
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))(*(int **)(DAT_004b4eb8 + 0xc),0x1c,1);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))
            (*(int **)(DAT_004b4eb8 + 0xc),0x22,DAT_0041a2a8);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))(*(int **)(DAT_004b4eb8 + 0xc),0x23,1);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))
            (*(int **)(DAT_004b4eb8 + 0xc),0x26,DAT_0041a2ac);
  return;
}


// ==== FUN_0040484a @ 0040484a ====

void __cdecl FUN_0040484a(char param_1,char param_2)

{
  int *piVar1;
  int iVar2;
  undefined4 uVar3;
  undefined4 uVar4;
  
  uVar4 = 1;
  if (param_1 == '\x01') {
    if (param_2 == '\0') {
      (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))(*(int **)(DAT_004b4eb8 + 0xc),1,1,1);
    }
    if (param_2 == '\x01') {
      (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))(*(int **)(DAT_004b4eb8 + 0xc),1,1,7);
    }
    if (param_2 != '\x02') {
      return;
    }
    uVar4 = 4;
    uVar3 = 1;
    piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
    iVar2 = *piVar1;
  }
  else {
    if (param_1 != '\x02') {
      if (param_1 == '\x03') {
        if (param_2 == '\0') {
          uVar4 = 1;
          piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
          iVar2 = *piVar1;
        }
        else if (param_2 == '\x01') {
          uVar4 = 3;
          piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
          iVar2 = *piVar1;
        }
        else {
          if (param_2 != '\x02') {
            return;
          }
          uVar4 = 2;
          piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
          iVar2 = *piVar1;
        }
        uVar3 = 0x16;
LAB_00404923:
        (**(code **)(iVar2 + 0x50))(piVar1,uVar3,uVar4);
        return;
      }
      if (param_1 == '\x04') {
        if (param_2 != '\0') {
          FUN_004047f9();
          return;
        }
        uVar4 = 0x1c;
        piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
        iVar2 = *piVar1;
      }
      else {
        if (param_1 != '\x05') {
          return;
        }
        piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
        if (param_2 != '\0') {
          iVar2 = *piVar1;
          uVar3 = 0x1b;
          goto LAB_00404923;
        }
        iVar2 = *piVar1;
        uVar4 = 0x1b;
      }
      (**(code **)(iVar2 + 0x50))(piVar1,uVar4,0);
      return;
    }
    piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
    if (param_2 == '\0') {
      (**(code **)(*piVar1 + 0x94))(piVar1,0,0xc,3);
      uVar4 = 3;
      piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
      iVar2 = *piVar1;
    }
    else {
      (**(code **)(*piVar1 + 0x94))(piVar1,0,0xc,1);
      uVar4 = 1;
      piVar1 = *(int **)(DAT_004b4eb8 + 0xc);
      iVar2 = *piVar1;
    }
    uVar3 = 0xc;
  }
  (**(code **)(iVar2 + 0x94))(piVar1,1,uVar3,uVar4);
  return;
}


// ==== FUN_00404984 @ 00404984 ====

void FUN_00404984(void)

{
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x28))
            (*(int **)(DAT_004b4eb8 + 0xc),0,0,3,DAT_004b4f64,0x3f800000,0);
  return;
}


// ==== FUN_004049a6 @ 004049a6 ====

void FUN_004049a6(void)

{
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x18))(*(int **)(DAT_004b4eb8 + 0xc));
  (**(code **)(*DAT_004b4f60 + 0x2c))(DAT_004b4f60,0,1);
  FUN_00404984();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x14))(*(int **)(DAT_004b4eb8 + 0xc));
  FUN_0040484a('\x02','\x01');
  FUN_0040484a('\x03','\0');
  FUN_0040406d(0);
  return;
}


// ==== FUN_004049f5 @ 004049f5 ====

void FUN_004049f5(void)

{
  int iVar1;
  undefined4 *puVar2;
  undefined4 *puVar3;
  undefined4 local_70 [9];
  undefined4 local_4c [9];
  undefined4 local_28 [9];
  
  puVar3 = local_70;
  puVar2 = (undefined4 *)register0x00000010;
  for (iVar1 = 9; puVar2 = puVar2 + 1, iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar3 = *puVar2;
    puVar3 = puVar3 + 1;
  }
  puVar2 = (undefined4 *)&stack0x00000028;
  puVar3 = local_4c;
  for (iVar1 = 9; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar3 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar3 = puVar3 + 1;
  }
  puVar2 = (undefined4 *)&stack0x0000004c;
  puVar3 = local_28;
  for (iVar1 = 9; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar3 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar3 = puVar3 + 1;
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 100))
            (*(int **)(DAT_004b4eb8 + 0xc),4,0x244,local_70,3,0x18);
  return;
}


// ==== FUN_00404a3f @ 00404a3f ====

void FUN_00404a3f(void)

{
  int iVar1;
  int iVar2;
  undefined4 *puVar3;
  undefined4 *puVar4;
  undefined4 local_94 [9];
  undefined4 local_70 [9];
  undefined4 local_4c [9];
  undefined4 local_28 [9];
  
  iVar2 = 9;
  puVar4 = local_94;
  puVar3 = (undefined4 *)register0x00000010;
  for (iVar1 = iVar2; puVar3 = puVar3 + 1, iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar4 = *puVar3;
    puVar4 = puVar4 + 1;
  }
  puVar3 = (undefined4 *)&stack0x00000028;
  puVar4 = local_70;
  for (iVar1 = iVar2; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar4 = puVar4 + 1;
  }
  puVar3 = (undefined4 *)&stack0x0000004c;
  puVar4 = local_4c;
  for (iVar1 = iVar2; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar4 = puVar4 + 1;
  }
  puVar3 = (undefined4 *)&stack0x00000070;
  puVar4 = local_28;
  for (; iVar2 != 0; iVar2 = iVar2 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar4 = puVar4 + 1;
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 100))
            (*(int **)(DAT_004b4eb8 + 0xc),6,0x244,local_94,4,0x18);
  return;
}


// ==== FUN_00404aa0 @ 00404aa0 ====

void FUN_00404aa0(void)

{
  uint *puVar1;
  uint *puVar2;
  uint uVar3;
  
  uVar3 = 0;
  puVar1 = &DAT_004b4f68;
  do {
    puVar1[0x8000] = (uint)SQRT((float)((uVar3 | 0x3f8000) << 8)) & 0x7fffff;
    puVar2 = puVar1 + 1;
    *puVar1 = (uint)SQRT((float)((uVar3 | 0x400000) << 8)) & 0x7fffff;
    uVar3 = uVar3 + 1;
    puVar1 = puVar2;
  } while (puVar2 < (uint *)0x4d4f65);
  return;
}


// ==== FUN_00404b10 @ 00404b10 ====

void FUN_00404b10(void)

{
  byte bVar1;
  uint uVar2;
  undefined4 *puVar3;
  int iVar4;
  undefined1 *puVar5;
  int iVar6;
  uint *puVar7;
  int iVar8;
  undefined4 *puVar9;
  undefined4 local_18 [6];
  
  DAT_004f4f68 = (uint *)FUN_004051c3(0x40000);
  iVar6 = 0;
  puVar7 = DAT_004f4f68;
  for (iVar4 = 0x10000; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar7 = 0;
    puVar7 = puVar7 + 1;
  }
  puVar5 = &DAT_0041a2b8;
  do {
    iVar8 = 0;
    iVar4 = iVar6;
    do {
      iVar6 = iVar4 + 0x10;
      bVar1 = puVar5[iVar8];
      uVar2 = (uint)bVar1;
      *(int *)(iVar4 + (int)DAT_004f4f68) = ((int)uVar2 >> 6) * 0x55000000 + 0xffffff;
      *(uint *)(iVar4 + 4 + (int)DAT_004f4f68) = ((int)uVar2 >> 4 & 3U) * 0x55000000 + 0xffffff;
      *(uint *)(iVar4 + 8 + (int)DAT_004f4f68) = ((int)uVar2 >> 2 & 3U) * 0x55000000 + 0xffffff;
      iVar8 = iVar8 + 1;
      *(uint *)(iVar4 + 0xc + (int)DAT_004f4f68) = (bVar1 & 3) * 0x55000000 + 0xffffff;
      iVar4 = iVar6;
    } while (iVar8 < 0x40);
    puVar5 = puVar5 + 0x40;
  } while ((int)puVar5 < 0x41b638);
  puVar3 = (undefined4 *)FUN_00403bd6(local_18,DAT_004f4f68,(uint *)0x100,(uint *)0x100,2);
  puVar9 = local_18;
  for (iVar4 = 6; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar9 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar3 = local_18;
  puVar9 = &DAT_004f4f70;
  for (iVar4 = 6; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar9 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar9 = puVar9 + 1;
  }
  return;
}


// ==== FUN_00404c30 @ 00404c30 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00404c30(float *param_1,char param_2,float param_3)

{
  float fVar1;
  int iVar2;
  float *pfVar3;
  float local_1c [5];
  float local_8;
  float local_4;
  
  local_4 = _DAT_004120c8;
  iVar2 = (int)param_2;
  if (param_2 == ' ') {
    local_1c[0] = 0.85;
    local_1c[1] = 0.85;
    local_1c[2] = 0.85;
    local_1c[3] = 0.85;
    local_1c[4] = param_3 * (float)_DAT_00412088 * (float)_DAT_004123c0;
    local_8 = 0.0;
  }
  else {
    if (('`' < param_2) && (param_2 < '{')) {
      iVar2 = iVar2 + -0x61;
    }
    if (('/' < param_2) && (param_2 < ':')) {
      iVar2 = iVar2 + -0x16;
    }
    if (param_2 == '#') {
      iVar2 = 0x24;
    }
    else if (param_2 == '+') {
      iVar2 = 0x25;
    }
    local_1c[0] = (float)(byte)(&DAT_0041b638)[iVar2 * 4] * _DAT_004123b8;
    local_1c[2] = (float)(byte)(&DAT_0041b639)[iVar2 * 4] * _DAT_004123b8;
    local_1c[1] = (float)(byte)(&DAT_0041b63a)[iVar2 * 4] * _DAT_004123b8;
    local_1c[3] = (float)(byte)(&DAT_0041b63b)[iVar2 * 4] * _DAT_004123b8;
    fVar1 = _DAT_004123b4;
    if ((((param_2 != 'a') && (fVar1 = _DAT_004123b0, param_2 != 'e')) &&
        (fVar1 = _DAT_004123b4, param_2 != 'g')) && (fVar1 = _DAT_004123ac, param_2 != 'h')) {
      if ((param_2 == 'c') || (fVar1 = _DAT_004120c8, param_2 == 'i')) {
        fVar1 = _DAT_004123ac;
      }
      if (((param_2 == 'k') || (param_2 == 'p')) || ((param_2 == 'x' || (param_2 == 'z')))) {
        fVar1 = _DAT_004123a8;
      }
    }
    local_4 = fVar1 * param_3 * (float)_DAT_00412088;
    local_1c[4] = ((float)(byte)(&DAT_0041b63a)[iVar2 * 4] * _DAT_004123b8 -
                  (float)(byte)(&DAT_0041b638)[iVar2 * 4] * _DAT_004123b8) * param_3;
    local_8 = ((float)(byte)(&DAT_0041b63b)[iVar2 * 4] * _DAT_004123b8 -
              (float)(byte)(&DAT_0041b639)[iVar2 * 4] * _DAT_004123b8) * param_3;
  }
  pfVar3 = local_1c;
  for (iVar2 = 7; iVar2 != 0; iVar2 = iVar2 + -1) {
    *param_1 = *pfVar3;
    pfVar3 = pfVar3 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_00404dd0 @ 00404dd0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00404dd0(char *param_1,undefined4 param_2,undefined4 param_3,float param_4)

{
  char cVar1;
  undefined4 *puVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 local_38 [7];
  float local_1c [7];
  
  cVar1 = *param_1;
  while (cVar1 != '\0') {
    puVar2 = (undefined4 *)FUN_00404c30(local_1c,cVar1,param_4);
    cVar1 = param_1[1];
    puVar4 = local_38;
    for (iVar3 = 7; iVar3 != 0; iVar3 = iVar3 + -1) {
      *puVar4 = *puVar2;
      puVar2 = puVar2 + 1;
      puVar4 = puVar4 + 1;
    }
    param_1 = param_1 + 1;
  }
  FUN_00404f10();
  return;
}


// ==== FUN_00404e70 @ 00404e70 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00404e70(char *param_1,undefined4 param_2,undefined4 param_3,float param_4)

{
  char cVar1;
  undefined4 *puVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 local_38 [7];
  float local_1c [7];
  
  cVar1 = *param_1;
  while (cVar1 != '\0') {
    puVar2 = (undefined4 *)FUN_00404c30(local_1c,cVar1,param_4);
    cVar1 = param_1[1];
    puVar4 = local_38;
    for (iVar3 = 7; iVar3 != 0; iVar3 = iVar3 + -1) {
      *puVar4 = *puVar2;
      puVar2 = puVar2 + 1;
      puVar4 = puVar4 + 1;
    }
    param_1 = param_1 + 1;
  }
  FUN_00404f10();
  return;
}


// ==== FUN_00404f10 @ 00404f10 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00404f10(void)

{
  float fVar1;
  float fVar2;
  char cVar3;
  undefined4 *puVar4;
  int iVar5;
  char *pcVar6;
  float *pfVar7;
  undefined4 *puVar8;
  float *pfVar9;
  float afStackY_194 [9];
  float afStackY_170 [9];
  float afStackY_14c [9];
  float afStackY_128 [5];
  undefined4 uStackY_114;
  float fVar10;
  float fStack_dc;
  float fStack_d8;
  float fStack_d4;
  float afStack_c4 [5];
  float afStack_a0 [5];
  float afStack_7c [5];
  float afStack_58 [5];
  float afStack_34 [8];
  char *pcStack_14;
  float fStack_10;
  float fStack_c;
  float fStack_8;
  undefined4 uStack_4;
  
  FUN_0040484a('\x03','\0');
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x4f4f70);
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  cVar3 = *pcStack_14;
  if (cVar3 != '\0') {
    fVar1 = fStack_8 * (float)_DAT_00412088;
    fVar2 = (float)_DAT_004123c8;
    pcVar6 = pcStack_14;
    fVar10 = fStack_10;
    do {
      uStackY_114 = 0x404fc2;
      puVar4 = (undefined4 *)FUN_00404c30(afStack_34,cVar3,fStack_8);
      puVar8 = (undefined4 *)&stack0xffffff14;
      for (iVar5 = 7; iVar5 != 0; iVar5 = iVar5 + -1) {
        *puVar8 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar8 = puVar8 + 1;
      }
      afStack_a0[1] = fStack_d8 + fStack_d4 + fStack_c;
      afStack_58[1] = fStack_d4 + fStack_c;
      afStack_58[0] = fVar10;
      afStack_7c[0] = fStack_dc + fVar10;
      afStack_c4[0] = fVar10;
      afStack_7c[1] = fStack_d4 + fStack_c;
      afStack_a0[0] = fStack_dc + fVar10;
      afStack_c4[1] = afStack_a0[1];
      afStack_c4[2] = 0.01;
      afStack_c4[3] = 100.0;
      afStack_c4[4] = (float)uStack_4;
      pfVar7 = afStack_c4;
      pfVar9 = afStackY_128;
      for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
        *pfVar9 = *pfVar7;
        pfVar7 = pfVar7 + 1;
        pfVar9 = pfVar9 + 1;
      }
      afStack_a0[2] = 0.01;
      afStack_a0[3] = 100.0;
      afStack_a0[4] = (float)uStack_4;
      pfVar7 = afStack_a0;
      pfVar9 = afStackY_14c;
      for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
        *pfVar9 = *pfVar7;
        pfVar7 = pfVar7 + 1;
        pfVar9 = pfVar9 + 1;
      }
      afStack_7c[2] = 0.01;
      afStack_7c[3] = 100.0;
      afStack_7c[4] = (float)uStack_4;
      pfVar7 = afStack_7c;
      pfVar9 = afStackY_170;
      for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
        *pfVar9 = *pfVar7;
        pfVar7 = pfVar7 + 1;
        pfVar9 = pfVar9 + 1;
      }
      afStack_58[2] = 0.01;
      afStack_58[3] = 100.0;
      afStack_58[4] = (float)uStack_4;
      pfVar7 = afStack_58;
      pfVar9 = afStackY_194;
      for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
        *pfVar9 = *pfVar7;
        pfVar7 = pfVar7 + 1;
        pfVar9 = pfVar9 + 1;
      }
      FUN_00404a3f();
      cVar3 = pcVar6[1];
      pcVar6 = pcVar6 + 1;
      fVar10 = fStack_dc + fVar1 * fVar2 + fVar10;
    } while (cVar3 != '\0');
  }
  return;
}


// ==== FUN_00405170 @ 00405170 ====

void __cdecl FUN_00405170(int *param_1)

{
  HMODULE hModule;
  LPCSTR lpProcName;
  FARPROC pFVar1;
  int iVar2;
  
  iVar2 = *param_1;
  while (iVar2 != 0) {
    hModule = LoadLibraryA((LPCSTR)*param_1);
    if (*(int *)param_1[1] != 0) {
      iVar2 = 0;
      lpProcName = *(LPCSTR *)param_1[1];
      do {
        pFVar1 = GetProcAddress(hModule,lpProcName);
        iVar2 = iVar2 + 8;
        **(undefined4 **)(param_1[1] + -4 + iVar2) = pFVar1;
        lpProcName = *(LPCSTR *)(param_1[1] + iVar2);
      } while (lpProcName != (LPCSTR)0x0);
    }
    param_1 = param_1 + 2;
    iVar2 = *param_1;
  }
  return;
}


// ==== FUN_004051c3 @ 004051c3 ====

void __cdecl FUN_004051c3(SIZE_T param_1)

{
  VirtualAlloc((LPVOID)0x0,param_1,0x1000,0x40);
  return;
}


// ==== FUN_004051d7 @ 004051d7 ====

void __cdecl FUN_004051d7(LPVOID param_1)

{
  VirtualFree(param_1,0,0x8000);
  return;
}


// ==== FUN_004051ef @ 004051ef ====

int FUN_004051ef(void)

{
  undefined2 uVar1;
  undefined2 extraout_var;
  int iVar2;
  
  uVar1 = FUN_00410678();
  iVar2 = CONCAT22(extraout_var,uVar1) + -1;
  if (0x3000 < (ushort)iVar2) {
    iVar2 = 0;
  }
  if (0x1ff < (ushort)iVar2) {
    iVar2 = iVar2 + 0x200;
  }
  return iVar2;
}


// ==== FUN_0040520a @ 0040520a ====

LRESULT FUN_0040520a(HWND param_1,UINT param_2,WPARAM param_3,LPARAM param_4)

{
  LRESULT LVar1;
  
  if (param_2 == 2) {
LAB_00405263:
    LVar1 = 0;
  }
  else {
    if (param_2 == 0xf) {
      ValidateRect(param_1,(RECT *)0x0);
    }
    else {
      if (param_2 == 0x10) {
LAB_0040522e:
        DAT_004f4fb8 = 1;
        goto LAB_00405263;
      }
      if (param_2 == 0x20) {
        SetCursor((HCURSOR)0x0);
      }
      else if ((param_2 == 0x100) && (param_3 == 0x1b)) goto LAB_0040522e;
    }
    LVar1 = DefWindowProcA(param_1,param_2,param_3,param_4);
  }
  return LVar1;
}


// ==== FUN_00405269 @ 00405269 ====

void FUN_00405269(void)

{
  tagRECT local_14;
  
  DAT_004f4fbc = CreateWindowExA(0,s_3state___lost_vegas_0041b6f8,s_3state___lost_vegas_0041b6f8,
                                 0xcf0000,0,0,0,0,(HWND)0x0,(HMENU)0x0,DAT_004f4fa0,(LPVOID)0x0);
  local_14.top = 0;
  local_14.left = 0;
  local_14.right = 0x140;
  local_14.bottom = 200;
  AdjustWindowRect(&local_14,0xcf0000,0);
  SetWindowPos(DAT_004f4fbc,(HWND)0x0,0,0,0x140,200,0x40);
  UpdateWindow(DAT_004f4fbc);
  return;
}


// ==== FUN_004052e4 @ 004052e4 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004052e4(void)

{
  _DAT_004f4f90 = 3;
  _DAT_004f4f94 = FUN_0040520a;
  _DAT_004f4f98 = 0;
  _DAT_004f4f9c = 0;
  DAT_004f4fa0 = GetModuleHandleA((LPCSTR)0x0);
  _DAT_004f4fa4 = 0;
  _DAT_004f4fa8 = 0;
  _DAT_004f4fac = 0;
  _DAT_004f4fb0 = s_3state___lost_vegas_0041b6f8;
  _DAT_004f4fb4 = s_3state___lost_vegas_0041b6f8;
  RegisterClassA((WNDCLASSA *)&DAT_004f4f90);
  FUN_00405269();
  return;
}


// ==== FUN_00405346 @ 00405346 ====

void FUN_00405346(void)

{
  BOOL BVar1;
  tagMSG local_20;
  
  BVar1 = PeekMessageA(&local_20,(HWND)0x0,0,0,0);
  if (BVar1 != 0) {
    GetMessageA(&local_20,DAT_004f4fbc,0,0);
    TranslateMessage(&local_20);
    DispatchMessageA(&local_20);
  }
  FUN_004049a6();
  return;
}


// ==== FUN_0040538f @ 0040538f ====

void FUN_0040538f(void)

{
  undefined4 extraout_ECX;
  undefined4 extraout_EDX;
  
  FUN_004111b1();
  FUN_004115fa(extraout_ECX,extraout_EDX);
  FUN_00404780();
                    /* WARNING: Subroutine does not return */
  ExitProcess(0);
}


// ==== FUN_004053ae @ 004053ae ====

void FUN_004053ae(void)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  undefined4 extraout_ECX;
  undefined4 extraout_EDX;
  
  FUN_00405170((int *)&PTR_s_DDRAW_DLL_0041b6e8);
  FUN_004052e4();
  uVar1 = FUN_004041df();
  if ((char)uVar1 != '\0') {
    FUN_0040538f();
    return;
  }
  FUN_00404b10();
  FUN_00404aa0();
  puVar2 = (undefined4 *)FUN_0040133c();
  FUN_004114f1(extraout_ECX,extraout_EDX,DAT_004f4fbc,puVar2);
  FUN_0040f285();
  FUN_0040538f();
  return;
}


// ==== FUN_004053f1 @ 004053f1 ====

uint __cdecl FUN_004053f1(char param_1)

{
  uint uVar1;
  
  uVar1 = *(uint *)((DAT_0050ffdc >> 3) + DAT_0050ffe0);
  return ((uVar1 >> 0x18 | (uVar1 & 0xff0000) >> 8 | (uVar1 & 0xff00) << 8 | uVar1 << 0x18) <<
         ((byte)DAT_0050ffdc & 7)) >> (0x20U - param_1 & 0x1f);
}


// ==== FUN_00405429 @ 00405429 ====

void __cdecl FUN_00405429(int param_1)

{
  DAT_0050ffdc = DAT_0050ffdc + param_1;
  return;
}


// ==== FUN_00405434 @ 00405434 ====

uint __cdecl FUN_00405434(int param_1)

{
  uint uVar1;
  byte bVar2;
  
  uVar1 = *(uint *)((DAT_0050ffdc >> 3) + DAT_0050ffe0);
  bVar2 = (byte)DAT_0050ffdc;
  DAT_0050ffdc = DAT_0050ffdc + param_1;
  return ((uVar1 >> 0x18 | (uVar1 & 0xff0000) >> 8 | (uVar1 & 0xff00) << 8 | uVar1 << 0x18) <<
         (bVar2 & 7)) >> (0x20U - (char)param_1 & 0x1f);
}


// ==== FUN_00405474 @ 00405474 ====

byte FUN_00405474(void)

{
  byte bVar1;
  int iVar2;
  
  bVar1 = (byte)DAT_0050ffdc & 7;
  iVar2 = DAT_0050ffdc >> 3;
  DAT_0050ffdc = DAT_0050ffdc + 1;
  return *(byte *)(iVar2 + DAT_0050ffe0) >> (7 - bVar1 & 0x1f) & 1;
}


// ==== FUN_0040549d @ 0040549d ====

void FUN_0040549d(void)

{
  uint uVar1;
  
  DAT_0050ffdc = DAT_0050ffdc + 7 & 0xfffffff8;
  uVar1 = FUN_004053f1('\x18');
  while (uVar1 != 1) {
    FUN_00405429(8);
    uVar1 = FUN_004053f1('\x18');
  }
  return;
}


// ==== FUN_004054cb @ 004054cb ====

void __cdecl FUN_004054cb(int *param_1)

{
  int iVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  int iVar9;
  int iVar10;
  
  iVar2 = (param_1[0x38] + param_1[8]) * 0x46a;
  iVar5 = param_1[8] * 0x11c7 + iVar2;
  iVar2 = iVar2 + param_1[0x38] * -0x1a9b;
  iVar3 = (param_1[0x18] + param_1[0x28]) * 0x12d0;
  iVar6 = iVar3 + param_1[0x28] * -0x63e;
  iVar3 = iVar3 + param_1[0x18] * -0x1f62;
  iVar7 = (param_1[0x10] + param_1[0x30]) * 0x8a9;
  iVar8 = iVar7 + param_1[0x30] * -0x1d91;
  iVar7 = param_1[0x10] * 0xc3f + iVar7;
  iVar4 = (param_1[0x20] + *param_1) * 0x1000 + 0x10;
  iVar1 = iVar6 + iVar5;
  iVar5 = iVar5 - iVar6;
  iVar6 = iVar3 + iVar2;
  iVar2 = iVar2 - iVar3;
  iVar9 = iVar7 + iVar4;
  iVar4 = iVar4 - iVar7;
  iVar10 = (*param_1 - param_1[0x20]) * 0x1000 + 0x10;
  iVar7 = iVar8 + iVar10;
  iVar10 = iVar10 - iVar8;
  iVar3 = (iVar5 - iVar2) * 0xb5 + 0x80 >> 8;
  iVar2 = (iVar2 + iVar5) * 0xb5 + 0x80 >> 8;
  *param_1 = iVar1 + iVar9 >> 5;
  param_1[8] = iVar7 + iVar2 >> 5;
  param_1[0x10] = iVar3 + iVar10 >> 5;
  param_1[0x20] = iVar4 - iVar6 >> 5;
  param_1[0x28] = iVar10 - iVar3 >> 5;
  param_1[0x18] = iVar6 + iVar4 >> 5;
  param_1[0x30] = iVar7 - iVar2 >> 5;
  param_1[0x38] = iVar9 - iVar1 >> 5;
  return;
}


// ==== FUN_0040563b @ 0040563b ====

void __cdecl FUN_0040563b(int *param_1,int *param_2)

{
  int iVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  int iVar9;
  int iVar10;
  
  iVar4 = (param_1[7] + param_1[1]) * 0x46a + 0x800;
  iVar5 = iVar4 + param_1[7] * -0x1a9b >> 0xc;
  iVar6 = (param_1[3] + param_1[5]) * 0x12d0 + 0x800;
  iVar1 = iVar6 + param_1[5] * -0x63e >> 0xc;
  iVar7 = iVar6 + param_1[3] * -0x1f62 >> 0xc;
  iVar6 = param_1[4] + *param_1;
  iVar3 = *param_1 - param_1[4];
  iVar2 = (param_1[2] + param_1[6]) * 0x8a9 + 0x800;
  iVar8 = iVar2 + param_1[6] * -0x1d91 >> 0xc;
  iVar10 = param_1[1] * 0x11c7 + iVar4 >> 0xc;
  iVar4 = param_1[2] * 0xc3f + iVar2 >> 0xc;
  iVar2 = iVar1 + iVar10;
  iVar10 = iVar10 - iVar1;
  iVar9 = iVar5 - iVar7;
  iVar5 = iVar5 + iVar7;
  iVar1 = iVar6 + 0x200 + iVar4;
  iVar6 = iVar6 + (0x200 - iVar4);
  iVar4 = iVar8 + 0x200 + iVar3;
  iVar3 = iVar3 + (0x200 - iVar8);
  iVar7 = (iVar10 - iVar9) * 0xb5 + 0x80 >> 8;
  *param_2 = iVar1 + iVar2 >> 10;
  iVar9 = (iVar9 + iVar10) * 0xb5 + 0x80 >> 8;
  param_2[1] = iVar4 + iVar9 >> 10;
  param_2[2] = iVar7 + iVar3 >> 10;
  param_2[5] = iVar3 - iVar7 >> 10;
  param_2[3] = iVar5 + iVar6 >> 10;
  param_2[7] = iVar1 - iVar2 >> 10;
  param_2[4] = iVar6 - iVar5 >> 10;
  param_2[6] = iVar4 - iVar9 >> 10;
  return;
}


// ==== FUN_004057bc @ 004057bc ====

undefined4 __cdecl FUN_004057bc(int *param_1,int param_2,int param_3,int param_4,int param_5)

{
  char cVar1;
  byte bVar2;
  uint uVar3;
  undefined3 extraout_var;
  int iVar4;
  int iVar5;
  byte *pbVar6;
  char *pcVar7;
  int *piVar8;
  bool bVar9;
  
  if (param_2 < 4) {
    iVar5 = 0;
  }
  else {
    iVar5 = param_2 + -3;
  }
  piVar8 = param_1;
  for (iVar4 = 0x40; iVar4 != 0; iVar4 = iVar4 + -1) {
    *piVar8 = 0;
    piVar8 = piVar8 + 1;
  }
  uVar3 = FUN_004053f1('\n');
  if (iVar5 == 0) {
    if ((int)uVar3 < 0x3e0) {
      pbVar6 = &DAT_0041b7c4 + ((int)uVar3 >> 5) * 2;
    }
    else {
      pbVar6 = &DAT_0041b424 + ((int)uVar3 >> 1) * 2;
    }
  }
  else if ((int)uVar3 < 0x3e0) {
    pbVar6 = &DAT_0041b824 + ((int)uVar3 >> 5) * 2;
  }
  else {
    pbVar6 = &DAT_0041b0a4 + uVar3 * 2;
  }
  FUN_00405429((int)(char)pbVar6[1]);
  bVar2 = *pbVar6;
  if ((char)bVar2 == 0) {
    uVar3 = 0;
  }
  else {
    uVar3 = FUN_00405434((int)(char)bVar2);
    if ((uVar3 & 1 << (bVar2 - 1 & 0x1f)) == 0) {
      uVar3 = uVar3 + (1 - (1 << (bVar2 & 0x1f)));
    }
  }
  piVar8 = (int *)(param_3 + iVar5 * 4);
  *piVar8 = *piVar8 + uVar3;
  iVar4 = 1;
  *param_1 = *(int *)(param_3 + iVar5 * 4) << 3;
  while( true ) {
    uVar3 = FUN_004053f1('\x10');
    if ((int)uVar3 < 0x4000) {
      if ((int)uVar3 < 0x400) {
        if ((int)uVar3 < 0x200) {
          if ((int)uVar3 < 0x100) {
            if ((int)uVar3 < 0x80) {
              if ((int)uVar3 < 0x40) {
                if ((int)uVar3 < 0x20) {
                  if ((int)uVar3 < 0x10) {
                    return 0;
                  }
                  pcVar7 = &DAT_0041ba24 + uVar3 * 3;
                }
                else {
                  pcVar7 = &DAT_0041ba24 + (((int)uVar3 >> 1) + -0x10) * 3;
                }
              }
              else {
                pcVar7 = &DAT_0041b9f4 + (((int)uVar3 >> 2) + -0x10) * 3;
              }
            }
            else {
              pcVar7 = &DAT_0041b9c4 + (((int)uVar3 >> 3) + -0x10) * 3;
            }
          }
          else {
            pcVar7 = &DAT_0041b994 + (((int)uVar3 >> 4) + -0x10) * 3;
          }
        }
        else {
          pcVar7 = &DAT_0041b97c + (((int)uVar3 >> 6) + -8) * 3;
        }
      }
      else {
        pcVar7 = &DAT_0041b8c8 + (((int)uVar3 >> 8) + -4) * 3;
      }
    }
    else {
      pcVar7 = &DAT_0041b8a4 + (((int)uVar3 >> 0xc) + -4) * 3;
    }
    FUN_00405429((int)pcVar7[2]);
    cVar1 = *pcVar7;
    if (cVar1 == '@') break;
    if (cVar1 == 'A') {
      uVar3 = FUN_00405434(6);
      iVar5 = iVar4 + uVar3;
      uVar3 = FUN_00405434(8);
      cVar1 = (char)uVar3;
      if (cVar1 == '\0') {
        uVar3 = FUN_00405434(8);
      }
      else if (cVar1 == -0x80) {
        uVar3 = FUN_00405434(8);
        uVar3 = uVar3 - 0x100;
      }
      else {
        uVar3 = (uint)cVar1;
      }
    }
    else {
      uVar3 = (uint)pcVar7[1];
      iVar5 = iVar4 + cVar1;
      bVar2 = FUN_00405474();
      if (CONCAT31(extraout_var,bVar2) != 0) {
        uVar3 = -uVar3;
      }
    }
    if (0x3f < iVar5) {
      return 0;
    }
    bVar9 = (int)uVar3 < 0;
    if (bVar9) {
      uVar3 = -uVar3;
    }
    uVar3 = ((int)(*(int *)(param_4 + iVar5 * 4) * uVar3 * param_5) >> 3) - 1U | 1;
    if (bVar9) {
      uVar3 = -uVar3;
    }
    iVar4 = iVar5 + 1;
    param_1[*(byte *)(iVar5 + 0x41b784)] = uVar3;
  }
  return 1;
}


// ==== FUN_004059cf @ 004059cf ====

uint __cdecl FUN_004059cf(int param_1,uint param_2,uint param_3)

{
  int iVar1;
  
  if ((int)param_3 < 0) {
    param_3 = 0;
  }
  else if (0xff < (int)param_3) {
    param_3 = 0xff;
  }
  if ((int)param_2 < 0) {
    param_2 = 0;
  }
  else if (0xff < (int)param_2) {
    param_2 = 0xff;
  }
  if (param_1 < 0) {
    iVar1 = 0;
  }
  else {
    iVar1 = 0xff;
    if (param_1 < 0x100) {
      iVar1 = param_1;
    }
  }
  return (iVar1 << 8 | param_2) << 8 | param_3;
}


// ==== FUN_00405a17 @ 00405a17 ====

undefined4 __cdecl FUN_00405a17(undefined4 param_1)

{
  byte bVar1;
  uint uVar2;
  undefined3 extraout_var;
  undefined3 extraout_var_00;
  undefined3 extraout_var_01;
  int iVar3;
  
  DAT_004f4fc4 = -0x200;
  do {
    *(int *)(PTR_DAT_0041ba84 + DAT_004f4fc4 * 4) = DAT_004f4fc4 * 0xe2d >> 0xb;
    *(int *)(PTR_DAT_0041ba88 + DAT_004f4fc4 * 4) = DAT_004f4fc4 * -0xb >> 5;
    *(int *)(PTR_DAT_0041ba8c + DAT_004f4fc4 * 4) = DAT_004f4fc4 * 0x2cdd >> 0xd;
    *(int *)(PTR_DAT_0041ba90 + DAT_004f4fc4 * 4) = DAT_004f4fc4 * -0xb6d >> 0xc;
    DAT_004f4fc4 = DAT_004f4fc4 + 1;
  } while (DAT_004f4fc4 < 0x200);
  DAT_004f4fc4 = 0;
  do {
    *(uint *)(PTR_DAT_0041ba98 + DAT_004f4fc4 * 4) = (uint)(byte)(&DAT_0041b744)[DAT_004f4fc4];
    DAT_004f4fc4 = DAT_004f4fc4 + 1;
  } while (DAT_004f4fc4 < 0x40);
  DAT_0050ffdc = 0;
  DAT_0050ffe0 = param_1;
  uVar2 = FUN_00405434(0x20);
  if (uVar2 == 0x1b3) {
    DAT_0050ffd8 = FUN_00405434(0xc);
    DAT_004f4fd0 = FUN_00405434(0xc);
    FUN_00405429(0x26);
    bVar1 = FUN_00405474();
    if (CONCAT31(extraout_var,bVar1) != 0) {
      DAT_004f4fc4 = 0;
      do {
        uVar2 = FUN_00405434(8);
        *(uint *)(PTR_DAT_0041ba98 + DAT_004f4fc4 * 4) = uVar2;
        DAT_004f4fc4 = DAT_004f4fc4 + 1;
      } while (DAT_004f4fc4 < 0x40);
    }
    bVar1 = FUN_00405474();
    if (CONCAT31(extraout_var_00,bVar1) != 0) {
      FUN_00405429(0x200);
    }
    DAT_004f4fcc = (int)(DAT_0050ffd8 + 0xf) >> 4;
    DAT_004f4fd4 = (int)(DAT_004f4fd0 + 0xf) >> 4;
    do {
      while( true ) {
        FUN_0040549d();
        uVar2 = FUN_00405434(0x20);
        if (uVar2 == 0x100) {
          FUN_00405429(10);
          uVar2 = FUN_00405434(3);
          if (uVar2 != 1) {
            return 0;
          }
          iVar3 = 0x10;
          while( true ) {
            FUN_00405429(iVar3);
            bVar1 = FUN_00405474();
            if (CONCAT31(extraout_var_01,bVar1) == 0) break;
            iVar3 = 8;
          }
          while( true ) {
            FUN_0040549d();
            uVar2 = FUN_004053f1(' ');
            if (uVar2 != 0x1b2) break;
            FUN_00405429(0x20);
          }
          DAT_004f4fc0 = DAT_004f4fd4 * DAT_004f4fcc;
          return 0;
        }
        if (uVar2 != 0x1b8) break;
        FUN_00405429(0x1b);
      }
    } while (uVar2 == 0x1b2);
  }
  return 0;
}


// ==== FUN_00405bee @ 00405bee ====

void __cdecl FUN_00405bee(uint *param_1,uint *param_2,int param_3)

{
  undefined *puVar1;
  uint *puVar2;
  byte bVar3;
  uint uVar4;
  undefined3 extraout_var;
  undefined3 extraout_var_00;
  undefined3 extraout_var_01;
  undefined3 extraout_var_02;
  int iVar5;
  uint uVar6;
  uint *puVar7;
  uint uVar8;
  uint *puVar9;
  int iVar10;
  uint uVar11;
  uint *puVar12;
  undefined4 local_28;
  undefined4 local_24;
  undefined4 local_20;
  int local_1c;
  int local_18;
  uint local_14;
  uint *local_10;
  uint *local_c;
  int local_8;
  
  puVar2 = param_2;
  local_10 = (uint *)0x0;
  while( true ) {
    puVar12 = local_10;
    uVar4 = FUN_004053f1('\x17');
    if (uVar4 == 0) {
      if (DAT_004f4fc0 <= (int)puVar12) {
        if (8 < param_3) {
          puVar12 = param_1 + (int)param_2 * 7;
          uVar4 = param_3 - 1U >> 3;
          local_10 = param_1;
          do {
            local_10 = local_10 + (int)param_2 * 8;
            puVar7 = local_10;
            puVar9 = puVar12;
            local_c = param_2;
            if (0 < (int)param_2) {
              do {
                uVar8 = *puVar7 >> 1 & 0x7f7f7f;
                uVar6 = *puVar9 >> 1 & 0x7f7f7f;
                uVar11 = uVar6 + uVar8 >> 1 & 0x7f7f7f;
                *puVar9 = uVar6 + uVar11;
                *puVar7 = uVar11 + uVar8;
                local_c = (uint *)((int)local_c + -1);
                puVar7 = puVar7 + 1;
                puVar9 = puVar9 + 1;
              } while (local_c != (uint *)0x0);
            }
            puVar12 = puVar12 + (int)param_2 * 8;
            uVar4 = uVar4 - 1;
          } while (uVar4 != 0);
        }
        if (0 < param_3) {
          param_2 = param_1 + 8;
          param_1 = (uint *)param_3;
          do {
            if (8 < (int)puVar2) {
              uVar4 = (int)puVar2 - 1U >> 3;
              puVar12 = param_2;
              do {
                uVar6 = *puVar12 >> 1 & 0x7f7f7f;
                *puVar12 = ((puVar12[-1] >> 1 & 0x7f7f7f) + uVar6 >> 1 & 0x7f7f7f) + uVar6;
                puVar12 = puVar12 + 8;
                uVar4 = uVar4 - 1;
              } while (uVar4 != 0);
            }
            param_2 = param_2 + (int)puVar2;
            param_1 = (uint *)((int)param_1 + -1);
          } while (param_1 != (uint *)0x0);
        }
        return;
      }
      FUN_0040549d();
      uVar4 = FUN_00405434(0x20);
      if (uVar4 < 0x101) {
        return;
      }
      if (0x1af < uVar4) {
        return;
      }
      local_14 = FUN_00405434(5);
      while (bVar3 = FUN_00405474(), CONCAT31(extraout_var,bVar3) != 0) {
        FUN_00405429(8);
      }
      puVar12 = (uint *)((uVar4 - 0x101) * DAT_004f4fcc);
      local_20 = 0;
      local_24 = 0;
      local_28 = 0;
      local_10 = puVar12;
    }
    if (DAT_004f4fc0 <= (int)puVar12) {
      return;
    }
    bVar3 = FUN_00405474();
    if (CONCAT31(extraout_var_00,bVar3) == 0) break;
    bVar3 = FUN_00405474();
    if (CONCAT31(extraout_var_01,bVar3) == 0) {
      bVar3 = FUN_00405474();
      if (CONCAT31(extraout_var_02,bVar3) == 0) {
        return;
      }
      local_14 = FUN_00405434(5);
    }
    DAT_004f4fc4 = 0;
    do {
      iVar5 = FUN_004057bc((int *)(PTR_DAT_0041ba94 + 0x500),DAT_004f4fc4,(int)&local_28,
                           (int)PTR_DAT_0041ba98,local_14);
      if (iVar5 == 0) {
        return;
      }
      DAT_004f4fc8 = 0;
      do {
        FUN_004054cb((int *)(PTR_DAT_0041ba94 + DAT_004f4fc8 * 4 + 0x500));
        puVar1 = PTR_DAT_0041ba94;
        DAT_004f4fc8 = DAT_004f4fc8 + 1;
      } while (DAT_004f4fc8 < 8);
      if ((int)DAT_004f4fc4 < 4) {
        iVar5 = 0x10;
        iVar10 = ((DAT_004f4fc4 & 1) + (DAT_004f4fc4 & 2) * 8) * 0x20;
      }
      else {
        iVar10 = DAT_004f4fc4 * 0x100;
        iVar5 = 8;
      }
      DAT_004f4fc8 = 0;
      do {
        FUN_0040563b((int *)(PTR_DAT_0041ba94 + (DAT_004f4fc8 + 0x28) * 0x20),
                     (int *)(puVar1 + DAT_004f4fc8 * iVar5 * 4 + iVar10));
        DAT_004f4fc8 = DAT_004f4fc8 + 1;
      } while (DAT_004f4fc8 < 8);
      DAT_004f4fc4 = DAT_004f4fc4 + 1;
    } while ((int)DAT_004f4fc4 < 6);
    local_1c = (int)puVar12 % DAT_004f4fcc << 4;
    local_18 = (int)puVar12 / DAT_004f4fcc << 4;
    DAT_004f4fc8 = 0;
    do {
      DAT_004f4fc4 = 0;
      do {
        local_c = *(uint **)(PTR_DAT_0041ba8c +
                            *(int *)(PTR_DAT_0041ba94 +
                                    (DAT_004f4fc4 + 0x140 + DAT_004f4fc8 * 8) * 4) * 4);
        iVar10 = *(int *)(PTR_DAT_0041ba88 +
                         *(int *)(PTR_DAT_0041ba94 + (DAT_004f4fc4 + 0x100 + DAT_004f4fc8 * 8) * 4)
                         * 4) +
                 *(int *)(PTR_DAT_0041ba90 +
                         *(int *)(PTR_DAT_0041ba94 + (DAT_004f4fc4 + 0x140 + DAT_004f4fc8 * 8) * 4)
                         * 4);
        local_8 = *(int *)(PTR_DAT_0041ba84 +
                          *(int *)(PTR_DAT_0041ba94 + (DAT_004f4fc4 + 0x100 + DAT_004f4fc8 * 8) * 4)
                          * 4);
        puVar12 = (uint *)(PTR_DAT_0041ba94 + (DAT_004f4fc8 * 0x10 + DAT_004f4fc4) * 8);
        iVar5 = *puVar12 + 0x80;
        uVar4 = FUN_004059cf(iVar5 + (int)local_c,iVar5 + iVar10,local_8 + iVar5);
        *puVar12 = uVar4;
        iVar5 = puVar12[1] + 0x80;
        uVar4 = FUN_004059cf(iVar5 + (int)local_c,iVar5 + iVar10,local_8 + iVar5);
        puVar12[1] = uVar4;
        iVar5 = puVar12[0x10] + 0x80;
        uVar4 = FUN_004059cf(iVar5 + (int)local_c,iVar5 + iVar10,local_8 + iVar5);
        puVar12[0x10] = uVar4;
        iVar5 = puVar12[0x11] + 0x80;
        uVar4 = FUN_004059cf(iVar5 + (int)local_c,iVar5 + iVar10,local_8 + iVar5);
        puVar12[0x11] = uVar4;
        DAT_004f4fc4 = DAT_004f4fc4 + 1;
      } while ((int)DAT_004f4fc4 < 8);
      DAT_004f4fc8 = DAT_004f4fc8 + 1;
    } while (DAT_004f4fc8 < 8);
    DAT_004f4fc8 = 0;
    do {
      DAT_004f4fc4 = 0;
      do {
        param_1[local_18 * (int)param_2 + local_1c + DAT_004f4fc8 * (int)param_2 + DAT_004f4fc4] =
             *(uint *)(PTR_DAT_0041ba94 + (DAT_004f4fc8 * 0x10 + DAT_004f4fc4) * 4);
        DAT_004f4fc4 = DAT_004f4fc4 + 1;
      } while ((int)DAT_004f4fc4 < 0x10);
      DAT_004f4fc8 = DAT_004f4fc8 + 1;
    } while (DAT_004f4fc8 < 0x10);
    local_10 = (uint *)((int)local_10 + 1);
  }
  return;
}


// ==== FUN_00405fe6 @ 00405fe6 ====

void __cdecl
FUN_00405fe6(undefined4 *param_1,undefined4 param_2,uint *param_3,uint *param_4,uint param_5)

{
  uint *puVar1;
  undefined4 *puVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 local_1c [6];
  
  puVar1 = (uint *)FUN_004051c3((int)param_3 * (int)param_4 * 4);
  FUN_00405a17(param_2);
  FUN_00405bee(puVar1,param_3,(int)param_4);
  puVar2 = (undefined4 *)FUN_00403bd6(local_1c,puVar1,param_3,param_4,param_5);
  puVar4 = local_1c;
  for (iVar3 = 6; iVar3 != 0; iVar3 = iVar3 + -1) {
    *puVar4 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar4 = puVar4 + 1;
  }
  FUN_004051d7(puVar1);
  puVar2 = local_1c;
  for (iVar3 = 6; iVar3 != 0; iVar3 = iVar3 + -1) {
    *param_1 = *puVar2;
    puVar2 = puVar2 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_0040604d @ 0040604d ====

uint * __cdecl FUN_0040604d(undefined4 param_1,uint *param_2,int param_3)

{
  uint *puVar1;
  
  puVar1 = (uint *)FUN_004051c3((int)param_2 * param_3 * 4);
  FUN_00405a17(param_1);
  FUN_00405bee(puVar1,param_2,param_3);
  return puVar1;
}


// ==== FUN_0040607f @ 0040607f ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040607f(undefined4 *param_1,float param_2,uint param_3)

{
  uint *puVar1;
  int iVar2;
  undefined4 *puVar3;
  int iVar4;
  int iVar5;
  undefined4 *puVar6;
  undefined4 local_2c [6];
  uint *local_14;
  int local_10;
  float local_c;
  float local_8;
  
  local_14 = (uint *)FUN_004051c3(0x40000);
  puVar1 = local_14;
  iVar4 = -0x80;
  do {
    iVar5 = -0x80;
    do {
      local_c = SQRT((float)(iVar5 * iVar5 + iVar4 * iVar4));
      local_8 = (_DAT_004123d0 - (local_c + local_c)) * param_2;
      local_10 = (int)ROUND(local_8);
      iVar2 = local_10;
      if (0 < local_10) {
        iVar2 = local_10 * local_10 >> 8;
      }
      if (iVar2 < 0) {
        iVar2 = 0;
      }
      if (0xff < iVar2) {
        iVar2 = 0xff;
      }
      *puVar1 = iVar2 * 0x10101 - 0x1000000;
      puVar1 = puVar1 + 1;
      iVar2 = iVar5 + 0x81;
      iVar5 = iVar5 + 1;
    } while (iVar2 < 0x100);
    iVar5 = iVar4 + 0x81;
    iVar4 = iVar4 + 1;
  } while (iVar5 < 0x100);
  puVar3 = (undefined4 *)FUN_00403bd6(local_2c,local_14,(uint *)0x100,(uint *)0x100,param_3);
  puVar1 = local_14;
  puVar6 = local_2c;
  for (iVar4 = 6; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar6 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar6 = puVar6 + 1;
  }
  FUN_004051d7(puVar1);
  puVar3 = local_2c;
  for (iVar4 = 6; iVar4 != 0; iVar4 = iVar4 + -1) {
    *param_1 = *puVar3;
    puVar3 = puVar3 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_00406160 @ 00406160 ====

void FUN_00406160(void)

{
  byte bVar1;
  uint *puVar2;
  uint uVar3;
  undefined4 *puVar4;
  int iVar5;
  undefined1 *puVar6;
  uint *puVar7;
  uint *puVar8;
  undefined4 *puVar9;
  undefined4 local_18 [6];
  
  puVar2 = (uint *)FUN_004051c3(0x100000);
  puVar7 = puVar2;
  for (iVar5 = 0x40000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar7 = 0;
    puVar7 = puVar7 + 1;
  }
  puVar6 = &DAT_0041eb74;
  puVar7 = puVar2 + 2;
  do {
    iVar5 = 0;
    puVar8 = puVar7;
    do {
      bVar1 = puVar6[iVar5];
      uVar3 = (uint)bVar1;
      puVar8[-2] = ((int)uVar3 >> 6) * 0x55000000 + 0xffffff;
      puVar8[-1] = ((int)uVar3 >> 4 & 3U) * 0x55000000 + 0xffffff;
      *puVar8 = ((int)uVar3 >> 2 & 3U) * 0x55000000 + 0xffffff;
      iVar5 = iVar5 + 1;
      puVar8[1] = (bVar1 & 3) * 0x55000000 + 0xffffff;
      puVar8 = puVar8 + 4;
    } while (iVar5 < 0x54);
    puVar6 = puVar6 + 0x54;
    puVar7 = puVar7 + 0x200;
  } while ((int)puVar6 < 0x420704);
  puVar4 = (undefined4 *)FUN_00403bd6(local_18,puVar2,(uint *)0x200,(uint *)0x200,2);
  puVar9 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_18;
  puVar9 = &DAT_00510068;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  FUN_004051d7(puVar2);
  return;
}


// ==== FUN_00406280 @ 00406280 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406280(void)

{
  undefined2 *puVar1;
  uint *puVar2;
  uint *puVar3;
  undefined4 *puVar4;
  int iVar5;
  int iVar6;
  uint *puVar7;
  undefined4 *puVar8;
  undefined4 local_18 [6];
  
  local_18[0] = 0xc3480000;
  local_18[1] = 0x43b40000;
  local_18[2] = 0xc3c80000;
  DAT_00510000 = FUN_00402680(-200.0,360.0,-400.0,0.0,0.0,0.0);
  puVar2 = (uint *)FUN_004051c3(0x40000);
  puVar3 = puVar2;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar3 = 0;
    puVar3 = puVar3 + 1;
  }
  iVar5 = 0x10;
  puVar3 = puVar2;
  do {
    iVar5 = iVar5 + -1;
    puVar7 = puVar3;
    for (iVar6 = 0x100; iVar6 != 0; iVar6 = iVar6 + -1) {
      *puVar7 = 0xffffffff;
      puVar7 = puVar7 + 1;
    }
    puVar3 = puVar3 + 0x1000;
  } while (iVar5 != 0);
  iVar5 = 0x100;
  puVar3 = puVar2;
  do {
    iVar6 = 0x10;
    do {
      *puVar3 = 0xffffffff;
      puVar3 = puVar3 + 0x10;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
    iVar5 = iVar5 + -1;
  } while (iVar5 != 0);
  puVar4 = (undefined4 *)FUN_00403bd6(local_18,puVar2,(uint *)0x100,(uint *)0x100,0);
  puVar8 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar4 = local_18;
  puVar8 = &DAT_0050ffe8;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar8 = puVar8 + 1;
  }
  DAT_0051009c = FUN_00402040(4,2);
  puVar4 = (undefined4 *)DAT_0051009c[0x18];
  puVar1 = (undefined2 *)DAT_0051009c[0x1b];
  *puVar4 = 0xc47a0000;
  puVar4[1] = 0xc1200000;
  puVar4[2] = 0xc47a0000;
  puVar4[4] = 0;
  puVar4[5] = 0;
  puVar4[3] = 0xffffffff;
  puVar4[10] = 0xc47a0000;
  puVar4[8] = 0x447a0000;
  puVar4[9] = 0xc1200000;
  puVar4[0xc] = 0x40a00000;
  puVar4[0xd] = 0;
  puVar4[0xb] = 0xffffffff;
  puVar4[0x10] = 0x447a0000;
  puVar4[0x11] = 0xc1200000;
  puVar4[0x12] = 0x447a0000;
  puVar4[0x14] = 0x40a00000;
  puVar4[0x15] = 0x40a00000;
  puVar4[0x13] = 0xffffffff;
  puVar4[0x18] = 0xc47a0000;
  puVar4[0x19] = 0xc1200000;
  puVar4[0x1a] = 0x447a0000;
  puVar4[0x1c] = 0;
  puVar4[0x1d] = 0x40a00000;
  puVar4[0x1b] = 0xffffffff;
  *puVar1 = 0;
  puVar1[1] = 1;
  puVar1[2] = 2;
  puVar1[3] = 2;
  puVar1[4] = 3;
  puVar1[5] = 0;
  puVar4 = (undefined4 *)FUN_0040607f(local_18,1.0,0);
  puVar8 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar4 = local_18;
  puVar8 = &DAT_00510028;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar8 = puVar8 + 1;
  }
  local_18[0] = 0x41200000;
  local_18[1] = 0x43480000;
  local_18[2] = 0x41200000;
  DAT_00510008 = FUN_00401590(0xc1200000,0,0xc1200000,0x41200000,0x43480000,0x41200000,0x3f9681b7);
  DAT_00510010 = 0x428c0000;
  DAT_00510014 = 0x432a0000;
  _DAT_00510018 = 0x42dc0000;
  _DAT_0051001c = 0x437a0000;
  _DAT_00510020 = 0x42480000;
  FUN_00406160();
  return;
}


// ==== FUN_00406500 @ 00406500 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406500(void)

{
  _DAT_005100a0 = timeGetTime();
  _DAT_00510098 = _DAT_005100a0 - 99999;
  return;
}


// ==== FUN_00406520 @ 00406520 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406520(void)

{
  DWORD DVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  float fVar5;
  float *pfVar6;
  int **ppiVar7;
  float *pfVar8;
  float10 fVar9;
  float afStackY_1e4 [4];
  float afStack_1c0 [7];
  undefined4 uStack_1a4;
  float afStack_1a0 [4];
  float afStack_188 [9];
  float afStack_164 [2];
  int *apiStack_154 [2];
  int *apiStack_140 [2];
  float fStack_134;
  int *piStack_130;
  undefined4 uStack_12c;
  undefined4 uStack_128;
  undefined4 uStack_124;
  int *piStack_120;
  int *apiStack_11c [4];
  float local_a8 [4];
  int local_98;
  undefined4 local_94;
  undefined4 local_90;
  float local_84 [4];
  int local_74;
  undefined4 local_70;
  undefined4 local_6c;
  float local_60 [4];
  int local_50;
  undefined4 local_4c;
  undefined4 local_48;
  float local_3c [4];
  int local_2c;
  undefined4 local_28;
  undefined4 local_24;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040484a('\x03','\0');
  DAT_004b4f64 = 0xff7dafc8;
  DAT_0041a2a8 = 0xff7dafc8;
  DAT_0041a2ac = 0x3a83126f;
  FUN_0040484a('\x04','\x01');
  DAT_00510000[0x16] = 80.0;
  DVar1 = timeGetTime();
  local_18 = (float)(int)DVar1 * _DAT_0041245c;
  fVar9 = (float10)fsin((float10)local_18);
  local_c = (float)fVar9;
  DAT_00510000[0x10] = local_c * _DAT_00412458 - _DAT_00412454;
  DVar1 = timeGetTime();
  local_18 = (float)(int)DVar1 * _DAT_00412450;
  fVar9 = (float10)fcos((float10)local_18);
  local_c = (float)fVar9;
  DAT_00510000[0x11] = local_c * _DAT_0041244c + _DAT_00412448;
  DAT_00510000[0x12] = -350.0;
  DAT_00510000[0x13] = -100.0;
  DAT_00510000[0x14] = 90.0;
  DAT_00510000[0x15] = 0.0;
  FUN_00402760(DAT_00510000);
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x510028);
  DVar1 = timeGetTime();
  local_18 = (float)_DAT_00412438 - (float)(int)(DVar1 - _DAT_00510098) * (float)_DAT_00412440;
  if (local_18 < _DAT_004120c8) {
    local_18 = 0.0;
  }
  iVar2 = FUN_004051ef();
  if (((byte)iVar2 & 0xf) == 4) {
    _DAT_00510098 = timeGetTime();
  }
  iVar2 = FUN_004051ef();
  if (((byte)iVar2 & 0xf) == 6) {
    _DAT_00510098 = timeGetTime();
  }
  iVar2 = FUN_004051ef();
  if (((byte)iVar2 & 0xf) == 7) {
    _DAT_00510098 = timeGetTime();
  }
  local_c = local_18 * (float)_DAT_00412430 + (float)_DAT_004120b0;
  if (local_c < _DAT_00412090) {
    local_c = 1.0;
  }
  iVar2 = (int)ROUND(local_c * _DAT_00412428);
  iVar4 = (int)ROUND(local_c * _DAT_00412424);
  iVar3 = (int)ROUND(local_c * _DAT_00412420);
  if (0xff < iVar2) {
    iVar2 = 0xff;
  }
  if (0xff < iVar4) {
    iVar4 = 0xff;
  }
  if (0xff < iVar3) {
    iVar3 = 0xff;
  }
  DAT_00510080 = ((iVar2 + -0x100) * 0x100 + iVar4) * 0x100 + iVar3;
  iVar2 = (int)ROUND(local_c * _DAT_0041241c);
  iVar4 = (int)ROUND(local_c * _DAT_00412418);
  iVar3 = (int)ROUND(local_c * _DAT_00412414);
  if (0xff < iVar2) {
    iVar2 = 0xff;
  }
  if (0xff < iVar4) {
    iVar4 = 0xff;
  }
  if (0xff < iVar3) {
    iVar3 = 0xff;
  }
  DAT_00510084 = ((iVar2 + -0x100) * 0x100 + iVar4) * 0x100 + iVar3;
  iVar2 = (int)ROUND(local_c * _DAT_00412410);
  iVar4 = (int)ROUND(local_c * _DAT_0041240c);
  iVar3 = (int)ROUND(local_c * _DAT_00412414);
  if (0xff < iVar2) {
    iVar2 = 0xff;
  }
  if (0xff < iVar4) {
    iVar4 = 0xff;
  }
  if (0xff < iVar3) {
    iVar3 = 0xff;
  }
  local_14 = local_c * _DAT_00412408;
  DAT_00510088 = ((iVar2 + -0x100) * 0x100 + iVar4) * 0x100 + iVar3;
  iVar2 = (int)ROUND(local_14);
  iVar4 = (int)ROUND(local_c * _DAT_00412404);
  iVar3 = (int)ROUND(local_c * _DAT_00412400);
  if (0xff < iVar2) {
    iVar2 = 0xff;
  }
  if (0xff < iVar4) {
    iVar4 = 0xff;
  }
  if (0xff < iVar3) {
    iVar3 = 0xff;
  }
  DAT_0051008c = ((iVar2 + -0x100) * 0x100 + iVar4) * 0x100 + iVar3;
  iVar2 = (int)ROUND(local_c * _DAT_004123fc);
  iVar4 = (int)ROUND(local_14);
  local_10 = local_c * _DAT_004123f8;
  local_8 = (float)(int)ROUND(local_10);
  if (0xff < iVar2) {
    iVar2 = 0xff;
  }
  if (0xff < iVar4) {
    iVar4 = 0xff;
  }
  fVar5 = local_8;
  if (0xff < (int)local_8) {
    fVar5 = 3.57331e-43;
  }
  DAT_00510090 = ((iVar2 + -0x100) * 0x100 + iVar4) * 0x100 + (int)fVar5;
  iVar2 = 0;
  do {
    DVar1 = timeGetTime();
    local_10 = (float)(int)DVar1 * (float)_DAT_004123f0;
    fVar9 = (float10)fcos((float10)local_10);
    local_14 = (float)fVar9;
    fVar9 = (float10)fsin((float10)local_14);
    local_c = (float)fVar9;
    iVar4 = iVar2 + 4;
    *(float *)((int)&DAT_00510050 + iVar2) =
         local_c * _DAT_00412458 + local_18 + *(float *)((int)&DAT_00510010 + iVar2);
    iVar2 = iVar4;
    local_8 = local_14;
  } while (iVar4 < 0x14);
  local_18 = -NAN;
  iVar2 = 0;
  do {
    fVar5 = local_18;
    FUN_00401390((int)DAT_00510008,0xc2480000,0,0xc2480000,0x42480000,
                 *(undefined4 *)((int)&DAT_00510050 + iVar2),0x42480000,
                 *(undefined4 *)((int)&DAT_00510080 + iVar2));
    DAT_00510008[0x10] = (float)(int)local_18;
    FUN_004022a0(DAT_00510008,DAT_00510000,1.0,'\x01');
    apiStack_11c[3] = (int *)0x406a3d;
    FUN_00402180(DAT_00510008);
    local_18 = (float)((int)fVar5 + 0x6e);
    iVar2 = iVar2 + 4;
  } while ((int)local_18 < 0xdc);
  FUN_0040406d(0x50ffe8);
  FUN_00402180(DAT_0051009c);
  FUN_0040484a('\x03','\0');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  FUN_0040406d(0);
  local_3c[0] = 334.0;
  local_3c[1] = 376.0;
  local_3c[2] = 0.01;
  local_3c[3] = 100.0;
  local_2c = 0xff000000;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_11c;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_60[0] = 620.0;
  local_60[1] = 376.0;
  local_60[2] = 0.01;
  local_60[3] = 100.0;
  local_50 = 0xff000000;
  pfVar6 = local_60;
  ppiVar7 = apiStack_140;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_a8[0] = 620.0;
  local_a8[1] = 342.0;
  local_a8[2] = 0.01;
  local_a8[3] = 100.0;
  local_98 = 0xff000000;
  pfVar6 = local_a8;
  pfVar8 = afStack_164;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 334.0;
  local_84[1] = 342.0;
  local_84[2] = 0.01;
  local_84[3] = 100.0;
  local_74 = 0xff000000;
  pfVar6 = local_84;
  pfVar8 = afStack_188;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_84[0] = 534.0;
  local_84[1] = 303.0;
  local_a8[0] = 620.0;
  local_a8[1] = 303.0;
  local_60[0] = 620.0;
  local_60[1] = 331.0;
  local_3c[0] = 534.0;
  local_3c[1] = 331.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_11c;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  pfVar6 = local_60;
  ppiVar7 = apiStack_140;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  pfVar6 = local_a8;
  pfVar8 = afStack_164;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_84;
  pfVar8 = afStack_188;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  afStack_1a0[3] = 5.91624e-39;
  FUN_0040406d(0x510068);
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  apiStack_11c[3] = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_11c[2] = (int *)0x406c4a;
  (**(code **)(*apiStack_11c[3] + 0x50))();
  local_3c[0] = 284.0;
  local_3c[1] = 376.0;
  local_3c[2] = 0.01;
  local_3c[3] = 100.0;
  local_2c = 0xffd7b45a;
  local_28 = 0;
  local_24 = 0x3e280000;
  pfVar6 = local_3c;
  pfVar8 = &fStack_134;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_60[0] = 620.0;
  local_60[1] = 376.0;
  local_60[2] = 0.01;
  local_60[3] = 100.0;
  local_50 = 0xffd7b45a;
  local_4c = 0x3f280000;
  local_48 = 0x3e280000;
  local_84[0] = 284.0;
  local_84[1] = 292.0;
  local_84[2] = 0.01;
  local_84[3] = 100.0;
  local_74 = 0xffd7b45a;
  local_70 = 0;
  local_6c = 0;
  local_a8[0] = 620.0;
  local_a8[1] = 292.0;
  local_a8[2] = 0.01;
  local_a8[3] = 100.0;
  local_98 = 0xffd7b45a;
  local_94 = 0x3f280000;
  local_90 = 0;
  pfVar6 = local_60;
  pfVar8 = (float *)&stack0xfffffea8;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_a8;
  pfVar8 = afStack_188 + 3;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_84;
  pfVar8 = afStack_1a0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  uStack_1a4 = 0x406d5c;
  FUN_00404a3f();
  piStack_120 = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_11c[2] = (int *)0x2;
  apiStack_11c[1] = (int *)0x10;
  apiStack_11c[0] = (int *)0x0;
  uStack_124 = 0x406d7a;
  (**(code **)(*piStack_120 + 0x94))();
  uStack_124 = 2;
  uStack_128 = 0x11;
  uStack_12c = 0;
  piStack_130 = *(int **)(DAT_004b4eb8 + 0xc);
  fStack_134 = 5.916778e-39;
  (**(code **)(*piStack_130 + 0x94))();
  fStack_134 = 0.0;
  apiStack_140[1] = (int *)0x406d9b;
  FUN_0040406d(0);
  local_2c = DAT_00510080;
  local_3c[0] = 320.0;
  local_3c[1] = 365.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = DAT_00510080;
  local_60[0] = 334.0;
  local_60[1] = 365.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_98 = DAT_00510080;
  local_a8[0] = 334.0;
  local_a8[1] = 351.0;
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 320.0;
  local_84[1] = 351.0;
  local_74 = DAT_00510080;
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_2c = DAT_00510084;
  local_3c[0] = 379.0;
  local_84[0] = 379.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = DAT_00510084;
  local_98 = DAT_00510084;
  local_74 = DAT_00510084;
  local_a8[0] = 393.0;
  local_60[0] = 393.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_2c = DAT_00510088;
  local_3c[0] = 435.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = DAT_00510088;
  local_60[0] = 449.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_98 = DAT_00510088;
  local_a8[0] = 449.0;
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 435.0;
  local_74 = DAT_00510088;
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_2c = DAT_0051008c;
  local_3c[0] = 492.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = DAT_0051008c;
  local_60[0] = 506.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_98 = DAT_0051008c;
  local_a8[0] = 506.0;
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 492.0;
  local_74 = DAT_0051008c;
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_84[0] = 552.0;
  local_2c = DAT_00510090;
  local_50 = DAT_00510090;
  local_98 = DAT_00510090;
  local_74 = DAT_00510090;
  local_a8[0] = 566.0;
  local_60[0] = 566.0;
  local_3c[0] = 552.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_2c = 0xffd7b45a;
  local_3c[0] = 382.0;
  local_3c[1] = 402.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = 0xffd7b45a;
  local_60[0] = 620.0;
  local_60[1] = 402.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_98 = 0xffd7b45a;
  local_a8[0] = 620.0;
  local_a8[1] = 425.0;
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 382.0;
  local_84[1] = 425.0;
  local_74 = 0xffd7b45a;
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_2c = 0xffd7b45a;
  local_3c[0] = 216.0;
  local_3c[1] = 410.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = 0xffd7b45a;
  local_60[0] = 374.0;
  local_60[1] = 410.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 216.0;
  local_84[1] = 425.0;
  local_98 = 0xffd7b45a;
  local_74 = 0xffd7b45a;
  local_a8[0] = 374.0;
  local_a8[1] = 425.0;
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  local_2c = 0xffd7b45a;
  local_3c[0] = 216.0;
  local_3c[1] = 376.0;
  pfVar6 = local_3c;
  ppiVar7 = apiStack_154;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *ppiVar7 = (int *)*pfVar6;
    pfVar6 = pfVar6 + 1;
    ppiVar7 = ppiVar7 + 1;
  }
  local_50 = 0xffd7b45a;
  local_60[0] = 620.0;
  local_60[1] = 376.0;
  pfVar6 = local_60;
  pfVar8 = afStack_188 + 4;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_98 = 0xffd7b45a;
  local_a8[0] = 620.0;
  local_a8[1] = 402.0;
  pfVar6 = local_a8;
  pfVar8 = afStack_1a0 + 1;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  local_84[0] = 216.0;
  local_84[1] = 402.0;
  local_74 = 0xffd7b45a;
  pfVar6 = local_84;
  pfVar8 = afStack_1c0;
  for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
    *pfVar8 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar8 = pfVar8 + 1;
  }
  FUN_00404a3f();
  afStackY_1e4[3] = 5.91832e-39;
  FUN_00404e70(s_hard_facts___we_are_better_00420704,0x441b0000,0x43c00000,140.0);
  apiStack_140[1] = *(int **)(DAT_004b4eb8 + 0xc);
  fStack_134 = 1.4013e-45;
  apiStack_140[0] = (int *)0x4071f7;
  (**(code **)(*apiStack_140[1] + 0x50))();
  apiStack_140[0] = (int *)0x0;
  FUN_0040406d(0x510028);
  apiStack_154[1] = (int *)0x40720c;
  FUN_0040484a('\x05','\x01');
  apiStack_140[0] = (int *)0x2;
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  apiStack_154[1] = (int *)0x14;
  apiStack_154[0] = *(int **)(DAT_004b4eb8 + 0xc);
  (**(code **)(*apiStack_154[0] + 0x50))();
  DVar1 = timeGetTime();
  local_10 = (float)(DVar1 - _DAT_005100a0);
  fVar5 = (float)_DAT_004123e0 - (float)(int)local_10 * (float)_DAT_004123e8;
  if (_DAT_004120c8 < fVar5) {
    local_2c = 0xffffffff;
    local_50 = 0xffffffff;
    local_c = fVar5 * fVar5 * _DAT_004123dc;
    local_98 = 0xffffffff;
    local_74 = 0xffffffff;
    local_28 = 0;
    local_24 = 0x3f800000;
    local_4c = 0x3f800000;
    local_48 = 0x3f800000;
    local_94 = 0x3f800000;
    local_90 = 0;
    local_84[0] = _DAT_004123d8 - local_c;
    local_70 = 0;
    local_6c = 0;
    local_84[1] = _DAT_004123d4 - local_c;
    local_a8[0] = local_c + _DAT_004123d8;
    local_a8[1] = _DAT_004123d4 - local_c;
    local_10 = local_c + _DAT_004123d4;
    local_60[0] = local_c + _DAT_004123d8;
    local_60[1] = local_10;
    local_3c[0] = _DAT_004123d8 - local_c;
    local_3c[1] = local_10;
    pfVar6 = local_3c;
    pfVar8 = afStack_188 + 4;
    for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar8 = *pfVar6;
      pfVar6 = pfVar6 + 1;
      pfVar8 = pfVar8 + 1;
    }
    pfVar6 = local_60;
    pfVar8 = afStack_1a0 + 1;
    for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar8 = *pfVar6;
      pfVar6 = pfVar6 + 1;
      pfVar8 = pfVar8 + 1;
    }
    pfVar6 = local_a8;
    pfVar8 = afStack_1c0;
    for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar8 = *pfVar6;
      pfVar6 = pfVar6 + 1;
      pfVar8 = pfVar8 + 1;
    }
    pfVar6 = local_84;
    pfVar8 = afStackY_1e4;
    for (iVar2 = 9; iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar8 = *pfVar6;
      pfVar6 = pfVar6 + 1;
      pfVar8 = pfVar8 + 1;
    }
    FUN_00404a3f();
    afStack_164[1] = 5.918862e-39;
    FUN_0040484a('\x05','\0');
    return;
  }
  afStack_164[1] = 5.918891e-39;
  FUN_0040484a('\x05','\0');
  return;
}


// ==== FUN_00407380 @ 00407380 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00407380(void)

{
  undefined2 *puVar1;
  uint uVar2;
  ushort uVar3;
  float fVar4;
  short sVar5;
  float *pfVar6;
  int iVar7;
  undefined4 *puVar8;
  float *pfVar9;
  int iVar10;
  float local_38 [10];
  int local_10;
  int local_c;
  int local_8;
  
  local_38[6] = 0.0;
  local_38[7] = 0.0;
  local_38[8] = 0.0;
  local_38[3] = 0.0;
  local_38[4] = 0.0;
  local_38[5] = 0.0;
  DAT_005100a8 = FUN_00402680(0.0,0.0,0.0,0.0,0.0,0.0);
  pfVar6 = (float *)FUN_0040607f(local_38,1.0,0);
  pfVar9 = local_38;
  for (iVar7 = 6; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar9 = pfVar9 + 1;
  }
  pfVar6 = local_38;
  pfVar9 = (float *)&DAT_005100c0;
  for (iVar7 = 6; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar9 = pfVar9 + 1;
  }
  DAT_005100b0 = FUN_00402040(8,0xc);
  *(byte *)(DAT_005100b0 + 0x17) = *(byte *)(DAT_005100b0 + 0x17) | 1;
  puVar8 = (undefined4 *)DAT_005100b0[0x18];
  puVar1 = (undefined2 *)DAT_005100b0[0x1b];
  *puVar8 = 0xc2480000;
  puVar8[1] = 0x42f00000;
  puVar8[2] = 0xc2480000;
  puVar8[4] = 0;
  puVar8[5] = 0;
  puVar8[3] = 0x3f9681b7;
  puVar8[9] = 0x42f00000;
  puVar8[8] = 0x42480000;
  puVar8[10] = 0xc2480000;
  puVar8[0xc] = 0x3f800000;
  puVar8[0xd] = 0;
  puVar8[0xb] = 0x3f9681b7;
  puVar8[0x10] = 0xc2480000;
  puVar8[0x11] = 0x435c0000;
  puVar8[0x12] = 0xc2480000;
  puVar8[0x14] = 0;
  puVar8[0x15] = 0;
  puVar8[0x13] = 0x3f9681b7;
  puVar8[0x18] = 0x42480000;
  puVar8[0x19] = 0x435c0000;
  puVar8[0x1a] = 0xc2480000;
  puVar8[0x1c] = 0x3f800000;
  puVar8[0x1d] = 0;
  puVar8[0x1b] = 0x3f9681b7;
  puVar8[0x20] = 0xc2480000;
  puVar8[0x21] = 0x42f00000;
  puVar8[0x22] = 0x42480000;
  puVar8[0x24] = 0;
  puVar8[0x25] = 0x3f800000;
  puVar8[0x23] = 0x3f9681b7;
  puVar8[0x28] = 0x42480000;
  puVar8[0x29] = 0x42f00000;
  puVar8[0x2a] = 0x42480000;
  puVar8[0x2c] = 0x3f800000;
  puVar8[0x2d] = 0x3f800000;
  puVar8[0x2b] = 0x3f9681b7;
  puVar8[0x30] = 0xc2480000;
  puVar8[0x31] = 0x435c0000;
  puVar8[0x32] = 0x42480000;
  puVar8[0x34] = 0;
  puVar8[0x35] = 0x3f800000;
  puVar8[0x33] = 0x3f9681b7;
  puVar8[0x38] = 0x42480000;
  puVar8[0x39] = 0x435c0000;
  puVar8[0x3a] = 0x42480000;
  puVar8[0x3c] = 0x3f800000;
  puVar8[0x3d] = 0x3f800000;
  puVar8[0x3b] = 0x3f9681b7;
  *puVar1 = 2;
  puVar1[1] = 6;
  puVar1[2] = 0;
  puVar1[3] = 6;
  puVar1[4] = 4;
  puVar1[5] = 0;
  puVar1[6] = 6;
  puVar1[7] = 7;
  puVar1[8] = 4;
  puVar1[9] = 7;
  puVar1[10] = 5;
  puVar1[0xb] = 4;
  puVar1[0xc] = 7;
  puVar1[0xd] = 3;
  puVar1[0xe] = 5;
  puVar1[0xf] = 3;
  puVar1[0x10] = 1;
  puVar1[0x11] = 5;
  puVar1[0x12] = 3;
  puVar1[0x13] = 2;
  puVar1[0x14] = 1;
  puVar1[0x15] = 2;
  puVar1[0x16] = 0;
  puVar1[0x17] = 1;
  puVar1[0x18] = 0;
  puVar1[0x19] = 4;
  puVar1[0x1a] = 1;
  puVar1[0x1b] = 4;
  puVar1[0x1c] = 5;
  puVar1[0x1d] = 1;
  puVar1[0x1e] = 3;
  puVar1[0x1f] = 7;
  puVar1[0x20] = 2;
  puVar1[0x21] = 7;
  puVar1[0x22] = 6;
  puVar1[0x23] = 2;
  DAT_005100ec = 200;
  DAT_005100ac = FUN_004051c3(800);
  DAT_005100f0 = FUN_004051c3(DAT_005100ec * 4);
  DAT_005100b8 = FUN_004051c3(DAT_005100ec * 4);
  DAT_005100d8 = FUN_004051c3(DAT_005100ec * 4);
  DAT_005100e4 = FUN_004051c3(DAT_005100ec * 4);
  DAT_005100e0 = FUN_004051c3(DAT_005100ec * 0xc);
  local_10 = -1000;
  local_38[5] = -1000.0;
  local_c = 0;
  local_8 = 0;
  iVar7 = 0;
  while( true ) {
    do {
      puVar8 = (undefined4 *)(local_8 + DAT_005100e0);
      *puVar8 = 0;
      puVar8[1] = 0;
      puVar8[2] = local_38[5];
      sVar5 = DAT_0041a2a6 * 0x15a;
      uVar2 = (uint)DAT_0041a2a6;
      uVar3 = (ushort)(uVar2 * 0x4e35);
      DAT_0041a2a6 = uVar3 + 1;
      DAT_0041a2a4 = (short)(uVar2 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                     (ushort)(0xfffe < uVar3);
      *(float *)(iVar7 + DAT_005100f0) =
           (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_00412470 -
           (float)_DAT_00412468;
      sVar5 = DAT_0041a2a6 * 0x15a;
      uVar2 = (uint)DAT_0041a2a6;
      uVar3 = (ushort)(uVar2 * 0x4e35);
      DAT_0041a2a6 = uVar3 + 1;
      DAT_0041a2a4 = (short)(uVar2 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                     (ushort)(0xfffe < uVar3);
      local_8 = local_8 + 0xc;
      iVar10 = iVar7 + 4;
      *(float *)(iVar7 + DAT_005100ac) =
           (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 + (float)_DAT_004120a8;
      *(undefined4 *)(iVar7 + DAT_005100b8) = 0;
      fVar4 = (float)_DAT_00412460;
      *(undefined4 *)(iVar7 + DAT_005100d8) = 0;
      *(float *)(iVar7 + DAT_005100e4) = (float)local_c * fVar4;
      local_c = local_c + 1;
      iVar7 = iVar10;
    } while (local_c < 10);
    local_10 = local_10 + 100;
    if (999 < local_10) break;
    local_38[5] = (float)local_10;
    local_c = 0;
  }
  return;
}


// ==== FUN_00407880 @ 00407880 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00407880(void)

{
  DAT_005100f8 = timeGetTime();
  _DAT_005100f4 = DAT_005100f8 - 99999;
  return;
}


// ==== FUN_004078a0 @ 004078a0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004078a0(void)

{
  float fVar1;
  float fVar2;
  DWORD DVar3;
  int iVar4;
  float *pfVar5;
  int iVar6;
  int iVar7;
  undefined4 *puVar8;
  float *pfVar9;
  undefined4 *puVar10;
  float10 fVar11;
  float afStackY_314 [9];
  undefined4 auStackY_2f0 [9];
  float afStackY_2cc [3];
  float local_26c [9];
  undefined4 local_248 [9];
  undefined4 local_224 [9];
  undefined4 local_200 [9];
  undefined4 local_1dc [9];
  undefined4 local_1b8 [99];
  double local_2c;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  FUN_0040484a('\x05','\x01');
  iVar7 = 0;
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040484a('\x03','\0');
  DAT_004b4f64 = 0xff7dafc8;
  DAT_0041a2a8 = 0xff7dafc8;
  DAT_0041a2ac = 0x3b03126f;
  FUN_0040484a('\x04','\0');
  DVar3 = timeGetTime();
  local_10 = (float)(DVar3 - DAT_005100f8);
  _DAT_005100b4 = (float)(int)local_10 * (float)_DAT_004123f0;
  DAT_005100a8[0x17] = _DAT_005100b4 * _DAT_004124c8;
  DAT_005100a8[0x16] = 135.0;
  FUN_00402760(DAT_005100a8);
  DAT_005100a8[0x12] = 50.0;
  DAT_005100a8[0x11] = -350.0;
  DAT_005100a8[0x10] = 200.0;
  FUN_0040484a('\x01','\0');
  afStackY_2cc[2] = 5.921093e-39;
  FUN_0040406d(0x5100c0);
  DVar3 = timeGetTime();
  local_10 = (float)(DVar3 - _DAT_005100f4);
  local_c = (float)_DAT_00412438 - (float)(int)local_10 * (float)_DAT_00412440;
  if (local_c < _DAT_004120c8) {
    local_c = 0.0;
  }
  iVar4 = FUN_004051ef();
  if (((byte)iVar4 & 0xf) == 4) {
    _DAT_005100f4 = timeGetTime();
  }
  iVar4 = FUN_004051ef();
  if (((byte)iVar4 & 0xf) == 6) {
    _DAT_005100f4 = timeGetTime();
  }
  iVar4 = FUN_004051ef();
  if (((byte)iVar4 & 0xf) == 7) {
    _DAT_005100f4 = timeGetTime();
  }
  local_10 = 0.0;
  iVar4 = 0;
  do {
    iVar6 = 10;
    local_2c = (double)(int)local_10 * _DAT_004124c0;
    do {
      fVar1 = DAT_005100b0[0x18];
      fVar11 = (float10)fsin((float10)(_DAT_005100b4 * *(float *)(iVar7 + DAT_005100ac)));
      local_18 = (float)fVar11;
      fVar2 = local_18 * _DAT_004124bc + _DAT_004124bc + local_c + _DAT_004124b8;
      *(float *)((int)fVar1 + 0x44) = fVar2;
      *(float *)((int)fVar1 + 100) = fVar2;
      *(float *)((int)fVar1 + 0xc4) = fVar2;
      *(float *)((int)fVar1 + 0xe4) = fVar2;
      pfVar5 = DAT_005100b0;
      local_8 = _DAT_005100b4 + (float)local_2c;
      fVar11 = (float10)fsin((float10)local_8);
      local_14 = (float)fVar11;
      local_24 = *(float *)(iVar7 + DAT_005100b8);
      local_20 = *(float *)(iVar7 + DAT_005100d8);
      local_1c = local_14 * (float)_DAT_00412468 + *(float *)(iVar7 + DAT_005100e4);
      DAT_005100b0[0x14] = local_24;
      pfVar5[0x15] = local_20;
      pfVar5[0x16] = local_1c;
      pfVar9 = DAT_005100b0;
      pfVar5 = (float *)(iVar4 + DAT_005100e0);
      DAT_005100b0[0x10] = *pfVar5;
      pfVar9[0x11] = pfVar5[1];
      pfVar9[0x12] = pfVar5[2];
      FUN_004022a0(DAT_005100b0,DAT_005100a8,1.0,'\x01');
      FUN_00402180(DAT_005100b0);
      iVar7 = iVar7 + 4;
      iVar4 = iVar4 + 0xc;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
    local_10 = (float)((int)local_10 + 1);
  } while (iVar4 < 0x960);
  FUN_0040484a('\x05','\0');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040406d(0);
  pfVar5 = local_26c + 3;
  iVar7 = 0x10;
  do {
    pfVar5[-1] = 0.01;
    *pfVar5 = 100.0;
    pfVar5[1] = -NAN;
    pfVar5[2] = 0.0;
    pfVar5[3] = 0.0;
    pfVar5 = pfVar5 + 9;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  local_c = (float)_DAT_004124a8 - _DAT_005100b4 * (float)_DAT_004124b0;
  local_10 = -local_c * (float)_DAT_004124a0;
  if (_DAT_004120c8 <= local_10) {
    if (_DAT_00412498 < local_10) {
      local_10 = 175.0;
    }
  }
  else {
    local_10 = 0.0;
  }
  if (local_c < _DAT_004120c8) {
    local_c = 0.0;
  }
  local_8 = 60.0;
  iVar7 = FUN_004051ef();
  if ((ushort)iVar7 < 0x538) {
    _DAT_005100e8 = timeGetTime();
  }
  else {
    DVar3 = timeGetTime();
    local_14 = (float)(DVar3 - _DAT_005100e8);
    local_8 = (float)(int)(DVar3 - _DAT_005100e8) * (float)_DAT_004124c0 + (float)_DAT_00412490;
  }
  local_26c[0] = 29.0;
  local_26c[1] = 287.0;
  local_248[0] = 0x43808000;
  local_248[1] = 0x438f8000;
  local_224[0] = 0x43a40000;
  local_224[1] = 0x43cd0000;
  local_200[0] = 0x41e80000;
  local_200[1] = 0x43cd0000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = *pfVar5 - local_c;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  local_26c[0] = 303.0;
  local_26c[1] = 287.0;
  local_248[0] = 0x44180000;
  local_248[1] = 0x438f8000;
  local_224[0] = 0x44180000;
  local_224[1] = 0x43c10000;
  local_200[0] = 0x43ff8000;
  local_200[1] = 0x43c10000;
  local_1dc[0] = 0x43f38000;
  local_1dc[1] = 0x43cd0000;
  local_1b8[0] = 0x43ba8000;
  local_1b8[1] = 0x43cd0000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_c + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  puVar8 = local_200;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_224;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  puVar8 = local_1dc;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  puVar8 = local_1b8;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_1dc;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  local_26c[0] = 614.0;
  local_26c[1] = 287.0;
  local_248[0] = 0x441b4000;
  local_248[1] = 0x438f8000;
  local_224[0] = 0x441b4000;
  local_224[1] = 0x43c10000;
  local_200[0] = 0x44198000;
  local_200[1] = 0x43c10000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_c + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  local_26c[0] = 511.0;
  local_26c[1] = 392.0;
  local_248[0] = 0x441b4000;
  local_248[1] = 0x43c40000;
  local_224[0] = 0x441b4000;
  local_224[1] = 0x43cd0000;
  local_200[0] = 0x43ff8000;
  local_200[1] = 0x43cd0000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_c + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c + 3;
  iVar7 = 0x10;
  do {
    pfVar5[-1] = 0.01;
    *pfVar5 = 100.0;
    pfVar5[1] = -NAN;
    pfVar5[2] = 0.0;
    pfVar5[3] = 0.0;
    pfVar5 = pfVar5 + 9;
    iVar7 = iVar7 + -1;
  } while (iVar7 != 0);
  local_26c[0] = 119.0;
  local_26c[1] = 317.0;
  local_248[0] = 0x430a0000;
  local_248[1] = 0x43948000;
  local_224[0] = 0x431f0000;
  local_224[1] = 0x439e8000;
  local_200[0] = 0x430a0000;
  local_200[1] = 0x43a88000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = *pfVar5 - local_c;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  local_26c[0] = 119.0;
  local_26c[1] = 376.0;
  local_248[0] = 0x430a0000;
  local_248[1] = 0x43b20000;
  local_224[0] = 0x431f0000;
  local_224[1] = 0x43bc0000;
  local_200[0] = 0x430a0000;
  local_200[1] = 0x43c58000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = *pfVar5 - local_c;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  local_26c[0] = 91.0;
  local_26c[1] = 347.0;
  local_248[0] = 0x42dc0000;
  local_248[1] = 0x43a38000;
  local_224[0] = 0x43010000;
  local_224[1] = 0x43ad8000;
  local_200[0] = 0x42dc0000;
  local_200[1] = 0x43b70000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = *pfVar5 - local_c;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  local_26c[0] = 148.0;
  local_26c[1] = 347.0;
  local_248[0] = 0x43280000;
  local_248[1] = 0x43a38000;
  local_224[0] = 0x433c0000;
  local_224[1] = 0x43ad8000;
  local_200[0] = 0x43280000;
  local_200[1] = 0x43b70000;
  iVar7 = 0x10;
  pfVar5 = local_26c;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = *pfVar5 - local_c;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  iVar7 = 0x10;
  pfVar5 = local_26c + 1;
  do {
    iVar7 = iVar7 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar7 != 0);
  puVar8 = local_224;
  pfVar5 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  puVar8 = local_248;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  pfVar5 = local_26c;
  pfVar9 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_26c;
  pfVar9 = afStackY_2cc;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar9 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar9 = pfVar9 + 1;
  }
  puVar8 = local_200;
  puVar10 = auStackY_2f0;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar10 = *puVar8;
    puVar8 = puVar8 + 1;
    puVar10 = puVar10 + 1;
  }
  puVar8 = local_224;
  pfVar5 = afStackY_314;
  for (iVar7 = 9; iVar7 != 0; iVar7 = iVar7 + -1) {
    *pfVar5 = (float)*puVar8;
    puVar8 = puVar8 + 1;
    pfVar5 = pfVar5 + 1;
  }
  FUN_004049f5();
  local_14 = local_8 + _DAT_0041248c;
  FUN_00404f10();
  FUN_00404f10();
  FUN_00404f10();
  return;
}


// ==== FUN_00408550 @ 00408550 ====

void FUN_00408550(void)

{
  byte bVar1;
  uint *puVar2;
  uint uVar3;
  undefined4 *puVar4;
  int iVar5;
  uint *puVar6;
  undefined1 *puVar7;
  uint *puVar8;
  undefined4 *puVar9;
  undefined4 local_18 [6];
  
  puVar2 = (uint *)FUN_004051c3(0x40000);
  puVar8 = puVar2;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = 0;
    puVar8 = puVar8 + 1;
  }
  puVar7 = &DAT_00420734;
  puVar8 = puVar2;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = 0xffffff;
    puVar8 = puVar8 + 1;
  }
  puVar8 = puVar2 + 2;
  do {
    iVar5 = 0;
    puVar6 = puVar8;
    do {
      bVar1 = puVar7[iVar5];
      uVar3 = (uint)bVar1;
      puVar6[-2] = ((int)uVar3 >> 7) * -0x1000000 + 0xffffff;
      puVar6[-1] = ((int)uVar3 >> 6 & 1U) * -0x1000000 + 0xffffff;
      *puVar6 = ((int)uVar3 >> 5 & 1U) * -0x1000000 + 0xffffff;
      puVar6[1] = ((int)uVar3 >> 4 & 1U) * -0x1000000 + 0xffffff;
      puVar6[2] = ((int)uVar3 >> 3 & 1U) * -0x1000000 + 0xffffff;
      puVar6[3] = ((int)uVar3 >> 2 & 1U) * -0x1000000 + 0xffffff;
      puVar6[4] = ((int)uVar3 >> 1 & 1U) * -0x1000000 + 0xffffff;
      puVar6[5] = (bVar1 & 1) * -0x1000000 + 0xffffff;
      iVar5 = iVar5 + 1;
      puVar6 = puVar6 + 8;
    } while (iVar5 < 7);
    puVar7 = puVar7 + 7;
    puVar8 = puVar8 + 0x100;
  } while ((int)puVar7 < 0x420830);
  puVar4 = (undefined4 *)FUN_00403bd6(local_18,puVar2,(uint *)0x100,(uint *)0x100,2);
  puVar9 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_18;
  puVar9 = &DAT_00510130;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  FUN_004051d7(puVar2);
  return;
}


// ==== FUN_004086b0 @ 004086b0 ====

void FUN_004086b0(void)

{
  byte bVar1;
  uint *puVar2;
  uint uVar3;
  undefined4 *puVar4;
  int iVar5;
  undefined1 *puVar6;
  uint *puVar7;
  uint *puVar8;
  undefined4 *puVar9;
  undefined4 local_18 [6];
  
  puVar2 = (uint *)FUN_004051c3(0x100000);
  puVar7 = puVar2;
  for (iVar5 = 0x40000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar7 = 0;
    puVar7 = puVar7 + 1;
  }
  puVar6 = &DAT_00420830;
  puVar7 = puVar2;
  for (iVar5 = 0x40000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar7 = 0xffffff;
    puVar7 = puVar7 + 1;
  }
  puVar7 = puVar2 + 2;
  do {
    iVar5 = 0;
    puVar8 = puVar7;
    do {
      bVar1 = puVar6[iVar5];
      uVar3 = (uint)bVar1;
      puVar8[-2] = ((int)uVar3 >> 6) * 0x55000000;
      puVar8[-1] = ((int)uVar3 >> 4 & 3U) * 0x55000000;
      *puVar8 = ((int)uVar3 >> 2 & 3U) * 0x55000000;
      puVar8[1] = (bVar1 & 3) * 0x55000000;
      iVar5 = iVar5 + 1;
      puVar8 = puVar8 + 4;
    } while (iVar5 < 6);
    puVar6 = puVar6 + 6;
    puVar7 = puVar7 + 0x200;
  } while ((int)puVar6 < 0x420f98);
  puVar4 = (undefined4 *)FUN_00403bd6(local_18,puVar2,(uint *)0x200,(uint *)0x200,2);
  puVar9 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_18;
  puVar9 = &DAT_00510170;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  FUN_004051d7(puVar2);
  return;
}


// ==== FUN_004087c0 @ 004087c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004087c0(void)

{
  ushort uVar1;
  float fVar2;
  short sVar3;
  short sVar4;
  float *pfVar5;
  int iVar6;
  short *psVar7;
  int iVar8;
  short sVar9;
  short sVar10;
  uint uVar11;
  float *pfVar12;
  float10 fVar13;
  float local_3c [10];
  float local_14;
  uint local_10;
  int local_c;
  bool local_5;
  
  FUN_00408550();
  FUN_004086b0();
  local_3c[6] = 0.0;
  local_3c[7] = 0.0;
  local_3c[8] = 0.0;
  local_3c[3] = 0.0;
  local_3c[4] = 0.0;
  local_3c[5] = 0.0;
  DAT_00510100 = FUN_00402680(0.0,0.0,0.0,0.0,0.0,0.0);
  pfVar5 = (float *)FUN_00405fe6(local_3c,&DAT_0041d0e4,(uint *)0x40,(uint *)0x40,0);
  pfVar12 = local_3c;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar12 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar12 = pfVar12 + 1;
  }
  pfVar5 = local_3c;
  pfVar12 = (float *)&DAT_00510188;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar12 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar12 = pfVar12 + 1;
  }
  pfVar5 = (float *)FUN_0040607f(local_3c,1.0,8);
  pfVar12 = local_3c;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar12 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar12 = pfVar12 + 1;
  }
  pfVar5 = local_3c;
  pfVar12 = (float *)&DAT_00510118;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar12 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar12 = pfVar12 + 1;
  }
  pfVar5 = (float *)FUN_0040607f(local_3c,1.0,0);
  pfVar12 = local_3c;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar12 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar12 = pfVar12 + 1;
  }
  pfVar5 = local_3c;
  pfVar12 = (float *)&DAT_00510150;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *pfVar12 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar12 = pfVar12 + 1;
  }
  DAT_0051010c = FUN_00402040(0x1900,0x31e0);
  iVar8 = 0;
  local_10 = 0;
  do {
    local_c = 0;
    do {
      fVar2 = (float)_DAT_004124e8;
      fVar13 = (float10)fsin((float10)((float)local_c * fVar2));
      local_14 = (float)fVar13;
      *(float *)(DAT_0051010c[0x18] + iVar8) = local_14 * _DAT_00412458;
      fVar13 = (float10)fcos((float10)((float)local_c * fVar2));
      local_3c[9] = (float)fVar13;
      *(float *)(DAT_0051010c[0x18] + 4 + iVar8) = local_3c[9] * _DAT_00412458;
      *(float *)(DAT_0051010c[0x18] + 8 + iVar8) = (float)(int)local_10;
      fVar2 = *(float *)(DAT_0051010c[0x18] + iVar8) * _DAT_004124e0;
      if (fVar2 < _DAT_004120c8) {
        fVar2 = -fVar2;
      }
      *(float *)(DAT_0051010c[0x18] + iVar8 + 0x10) = fVar2;
      iVar6 = DAT_0051010c[0x18] + iVar8;
      local_c = local_c + 1;
      iVar8 = iVar8 + 0x20;
      *(float *)(iVar6 + 0x14) = *(float *)(iVar6 + 8) * _DAT_004124e0;
    } while (local_c < 0x10);
    local_10 = local_10 + 10;
  } while ((int)local_10 < 4000);
  local_5 = false;
  local_c = 0;
  psVar7 = (short *)DAT_0051010c[0x1b];
  do {
    local_10 = 0;
    do {
      sVar4 = (short)local_10;
      sVar3 = (short)local_c;
      if (local_5) {
        sVar9 = sVar3 * 0x10 + sVar4;
        *psVar7 = sVar9;
        uVar11 = local_10 + 1 & 0x8000000f;
        if ((int)uVar11 < 0) {
          uVar11 = (uVar11 - 1 | 0xfffffff0) + 1;
        }
        psVar7[1] = sVar3 * 0x10 + (short)uVar11;
        sVar3 = (sVar3 + 1) * 0x10;
        sVar10 = (short)uVar11 + sVar3;
        psVar7[2] = sVar10;
        psVar7[3] = sVar9;
        psVar7[4] = sVar10;
        psVar7[5] = sVar3 + sVar4;
      }
      else {
        local_3c[9] = (float)(local_c * 0x10 + local_10);
        *psVar7 = SUB42(local_3c[9],0);
        uVar11 = local_10 + 1 & 0x8000000f;
        if ((int)uVar11 < 0) {
          uVar11 = (uVar11 - 1 | 0xfffffff0) + 1;
        }
        sVar3 = (sVar3 + 1) * 0x10;
        sVar9 = sVar3 + (short)uVar11;
        psVar7[1] = sVar9;
        psVar7[2] = (short)(local_c * 0x10) + (short)uVar11;
        psVar7[3] = SUB42(local_3c[9],0);
        psVar7[4] = sVar3 + sVar4;
        psVar7[5] = sVar9;
      }
      local_10 = local_10 + 1;
      psVar7 = psVar7 + 6;
      local_5 = local_5 == false;
    } while ((int)local_10 < 0x10);
    local_c = local_c + 1;
  } while (local_c < 399);
  DAT_0051014c = FUN_004051c3(0x6000);
  DAT_00510104 = FUN_00402990(0x800);
  iVar8 = 0;
  local_c = 0;
  do {
    sVar4 = DAT_0041a2a6 * 0x15a;
    uVar11 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar11 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar11 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar4 +
                   (ushort)(0xfffe < uVar1);
    fVar2 = (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478;
    *(float *)(iVar8 + DAT_0051014c) = (fVar2 + fVar2) - (float)_DAT_004120b0;
    sVar4 = DAT_0041a2a6 * 0x15a;
    uVar11 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar11 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar11 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar4 +
                   (ushort)(0xfffe < uVar1);
    fVar2 = (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478;
    *(float *)(iVar8 + 4 + DAT_0051014c) = (fVar2 + fVar2) - (float)_DAT_004120b0;
    sVar4 = DAT_0041a2a6 * 0x15a;
    uVar11 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar11 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar11 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar4 +
                   (ushort)(0xfffe < uVar1);
    *(float *)(iVar8 + 8 + DAT_0051014c) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_004124d8;
    *(undefined4 *)(DAT_00510104[0x11] + local_c) = 0xffffffff;
    sVar4 = DAT_0041a2a6 * 0x15a;
    uVar11 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar11 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar11 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar4 +
                   (ushort)(0xfffe < uVar1);
    local_10 = (int)DAT_0041a2a4 & 0x7fff;
    iVar8 = iVar8 + 0xc;
    local_c = local_c + 4;
    *(float *)(DAT_00510104[0x12] + -4 + local_c) =
         (float)local_10 * (float)_PTR_DAT_00412478 * (float)_DAT_004123c0 + (float)_DAT_004124d0;
  } while (iVar8 < 0x6000);
  FUN_00408cc0();
  return;
}


// ==== FUN_00408cc0 @ 00408cc0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00408cc0(void)

{
  _DAT_005101a4 = timeGetTime();
  _DAT_00510148 = _DAT_005101a4;
  _DAT_00510168 = 0;
  return;
}


// ==== FUN_00408ce0 @ 00408ce0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00408ce0(int param_1)

{
  float fVar1;
  float fVar2;
  int iVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  float10 fVar7;
  float10 fVar8;
  float local_8;
  
  iVar6 = param_1;
  local_8 = _DAT_00510110 * _DAT_00412518;
  iVar3 = 0;
  do {
    fVar7 = (float10)fsin((float10)(local_8 * (float)_DAT_00412510));
    fVar7 = (float10)fsin((float10)((float)fVar7 * (float)_DAT_00412508));
    param_1 = 0;
    fVar1 = (float)fVar7 * _DAT_00412504 + _DAT_00412500;
    do {
      fVar7 = (float10)fsin((float10)local_8);
      fVar2 = (float)fVar7 * (float)_DAT_00412468 + (float)param_1 * (float)_DAT_004124e8;
      fVar7 = (float10)fsin((float10)fVar2);
      *(float *)(*(int *)(iVar6 + 0x60) + iVar3) = (float)fVar7 * fVar1;
      fVar7 = (float10)fcos((float10)fVar2);
      param_1 = param_1 + 1;
      iVar3 = iVar3 + 0x20;
      *(float *)(*(int *)(iVar6 + 0x60) + -0x1c + iVar3) = (float)fVar7 * fVar1;
    } while (param_1 < 0x10);
    local_8 = local_8 + (float)_DAT_004124f8;
  } while (iVar3 < 0x32000);
  iVar6 = 0x800;
  pfVar4 = (float *)(DAT_0051014c + 8);
  pfVar5 = *(float **)(DAT_00510104 + 0x40);
  do {
    fVar1 = _DAT_00510110 * _DAT_00412518 + *pfVar4 * _DAT_004124f4 * (float)_DAT_004124f8;
    fsin((float10)fVar1);
    fVar7 = (float10)fsin((float10)(fVar1 * (float)_DAT_00412510));
    fVar7 = (float10)fsin((float10)((float)fVar7 * (float)_DAT_00412508));
    fVar2 = (float)fVar7 * _DAT_004124f0 + _DAT_00412448;
    fVar7 = (float10)fcos((float10)fVar1);
    fVar8 = (float10)fsin((float10)fVar1);
    *pfVar5 = (float)fVar8 * pfVar4[-1] * fVar2 + (float)fVar7 * pfVar4[-2] * fVar2;
    fVar7 = (float10)fsin((float10)fVar1);
    fVar8 = (float10)fcos((float10)fVar1);
    iVar6 = iVar6 + -1;
    pfVar5[1] = (float)fVar8 * pfVar4[-1] * fVar2 + -((float)fVar7 * pfVar4[-2] * fVar2);
    pfVar5[2] = *pfVar4;
    pfVar4 = pfVar4 + 3;
    pfVar5 = pfVar5 + 3;
  } while (iVar6 != 0);
  return;
}


// ==== FUN_00408e90 @ 00408e90 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00408e90(void)

{
  float fVar1;
  float fVar2;
  DWORD DVar3;
  int iVar4;
  float *pfVar5;
  int *piVar6;
  undefined4 *puVar7;
  undefined4 *puVar8;
  int **ppiVar9;
  undefined **ppuVar10;
  float *pfVar11;
  float10 fVar12;
  float afStack_2e8 [9];
  float afStack_2c4 [8];
  undefined4 uStack_2a4;
  undefined *apuStack_2a0 [2];
  float fStack_298;
  int *apiStack_27c [10];
  undefined4 uStack_254;
  int *apiStack_244 [4];
  int iStack_234;
  float local_1e4 [9];
  undefined4 local_1c0 [9];
  undefined4 local_19c [9];
  undefined4 local_178 [9];
  undefined4 local_154 [9];
  undefined4 local_130 [9];
  undefined4 local_10c [9];
  undefined4 local_e8 [9];
  undefined4 local_c4 [9];
  float local_a0 [9];
  float local_7c [9];
  float local_58 [9];
  float local_34 [9];
  float local_10;
  float local_c;
  float local_8;
  
  DVar3 = timeGetTime();
  local_8 = (float)(DVar3 - _DAT_005101a4);
  _DAT_00510110 = (float)(int)local_8 * (float)_DAT_004125b0;
  DVar3 = timeGetTime();
  local_8 = (float)(DVar3 - _DAT_00510148);
  _DAT_00510168 = (float)(int)local_8 * (float)_DAT_004123f0;
  _DAT_00510148 = timeGetTime();
  DAT_004b4f64 = 0xff7dafc8;
  DAT_0041a2a8 = 0xff7dafc8;
  DAT_0041a2ac = 0x3b449ba6;
  FUN_0040484a('\x04','\x01');
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x510188);
  FUN_0040484a('\x01','\x02');
  fVar12 = (float10)fsin((float10)(_DAT_00510110 * (float)_DAT_004125a8));
  DAT_00510100[0x16] = (float)fVar12 * _DAT_004124f0 + _DAT_004124b8;
  local_c = _DAT_00510110 * (float)_DAT_004125a0;
  fVar12 = (float10)fsin((float10)local_c);
  local_8 = (float)fVar12;
  DAT_00510100[0x17] = local_8;
  iVar4 = FUN_004051ef();
  if ((ushort)iVar4 < 0x1000) {
    _DAT_005101a0 = timeGetTime();
  }
  DVar3 = timeGetTime();
  _DAT_00510114 = (float)(int)(DVar3 - _DAT_005101a0) * (float)_DAT_00412598;
  if (_DAT_004120c8 <= _DAT_00510114) {
    if (_DAT_00412090 < _DAT_00510114) {
      _DAT_00510114 = 1.0;
    }
  }
  else {
    _DAT_00510114 = 0.0;
  }
  fVar12 = (float10)fsin((float10)(_DAT_00510110 * (float)_DAT_00412590));
  local_8 = (float)fVar12;
  fVar12 = (float10)fsin((float10)(_DAT_00510110 * (float)_DAT_00412588));
  DAT_00510100[0x10] =
       (float)fVar12 * _DAT_00412580 * _DAT_00510114 +
       (_DAT_00412090 - _DAT_00510114) * local_8 * _DAT_004124f0;
  fVar12 = (float10)fcos((float10)(_DAT_00510110 * (float)_DAT_00412588));
  DAT_00510100[0x11] = (float)fVar12 * _DAT_00412580 * _DAT_00510114;
  local_10 = _DAT_00510110 * (float)_DAT_00412578;
  fVar12 = (float10)fsin((float10)local_10);
  local_c = (float)fVar12;
  DAT_00510100[0x12] =
       local_c * _DAT_00510114 * _DAT_00412454 +
       (_DAT_00510114 * (float)_DAT_00412570 + (float)_DAT_00412568) * (float)_DAT_004124d8;
  DAT_00510100[0x13] = (_DAT_00412090 - _DAT_00510114) * _DAT_00412560;
  DAT_00510100[0x14] = 0.0;
  DAT_00510100[0x15] = 2000.0;
  FUN_00402760(DAT_00510100);
  FUN_00408ce0((int)DAT_0051010c);
  FUN_004022a0(DAT_0051010c,DAT_00510100,1.0,'\0');
  FUN_0040484a('\x05','\0');
  FUN_0040484a('\x03','\x01');
  FUN_00401a10(DAT_0051010c);
  FUN_00402180(DAT_0051010c);
  iVar4 = 0x800;
  pfVar5 = (float *)(DAT_0051014c + 8);
  piVar6 = *(int **)(DAT_00510104 + 0x44);
  do {
    fVar1 = *pfVar5 - DAT_00510100[0x12];
    if (fVar1 < _DAT_004120c8) {
      fVar1 = -fVar1;
    }
    fVar2 = fVar1 * _DAT_00412450;
    if (_DAT_00412090 < fVar1 * _DAT_00412450) {
      fVar2 = _DAT_00412090;
    }
    local_10 = (_DAT_00412090 - fVar2) * (float)_DAT_00412558;
    local_c = (float)(int)ROUND(local_10);
    pfVar5 = pfVar5 + 3;
    *piVar6 = (int)local_c * 0x1000000 + 0x6f6f6f;
    iVar4 = iVar4 + -1;
    piVar6 = piVar6 + 1;
  } while (iVar4 != 0);
  FUN_0040484a('\x04','\0');
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040484a('\x03','\0');
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x510150);
  iStack_234 = DAT_00510104;
  apiStack_244[3] = (int *)0x409233;
  FUN_00402a60();
  local_8 = 0.0;
  iVar4 = FUN_004051ef();
  if (0xfff < (ushort)iVar4) {
    DVar3 = timeGetTime();
    local_10 = (float)(DVar3 - _DAT_005101a0);
    local_8 = (float)(int)local_10 * (float)_DAT_004120a8;
    if (_DAT_004120c8 <= local_8) {
      if (_DAT_00412550 < local_8) {
        local_8 = 400.0;
      }
    }
    else {
      local_8 = 0.0;
    }
  }
  local_7c[0] = local_8 + _DAT_0041254c;
  local_7c[1] = 395.0;
  local_a0[0] = local_8 + _DAT_00412548;
  local_7c[2] = 0.01;
  local_7c[3] = 100.0;
  local_7c[4] = -NAN;
  local_7c[5] = 0.0;
  local_7c[6] = 0.0;
  local_58[1] = 395.0;
  local_58[2] = 0.01;
  local_58[3] = 100.0;
  local_58[4] = -NAN;
  local_58[5] = 0.21484375;
  local_58[6] = 0.0;
  local_a0[1] = 430.0;
  local_a0[2] = 0.01;
  local_a0[3] = 100.0;
  local_a0[4] = -NAN;
  local_a0[5] = 0.21484375;
  local_a0[6] = 0.13671875;
  local_34[1] = 430.0;
  local_34[2] = 0.01;
  local_34[3] = 100.0;
  local_34[4] = -NAN;
  local_34[5] = 0.0;
  local_34[6] = 0.13671875;
  local_58[0] = local_a0[0];
  local_34[0] = local_7c[0];
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040406d(0);
  iStack_234 = 0x409381;
  FUN_0040484a('\x05','\0');
  pfVar5 = local_1e4 + 3;
  iVar4 = 9;
  do {
    pfVar5[-1] = 0.01;
    *pfVar5 = 100.0;
    pfVar5[1] = -NAN;
    pfVar5[2] = 0.0;
    pfVar5[3] = 0.0;
    pfVar5 = pfVar5 + 9;
    iVar4 = iVar4 + -1;
  } while (iVar4 != 0);
  local_1e4[0] = 246.0;
  local_1e4[1] = 37.0;
  local_1c0[0] = 0x441c4000;
  local_1c0[1] = 0x42140000;
  local_19c[0] = 0x441c4000;
  local_19c[1] = 0x43c60000;
  local_178[0] = 0x43760000;
  local_178[1] = 0x43c60000;
  local_154[0] = 0x43838000;
  local_154[1] = 0x425c0000;
  local_130[0] = 0x44180000;
  local_130[1] = 0x425c0000;
  local_10c[0] = 0x44180000;
  local_10c[1] = 0x43bf8000;
  local_e8[0] = 0x43838000;
  local_e8[1] = 0x43bf8000;
  iVar4 = 9;
  pfVar5 = local_1e4;
  do {
    iVar4 = iVar4 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar4 != 0);
  puVar7 = local_154;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_e8;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_178;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_1e4;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*pfVar5;
    pfVar5 = pfVar5 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_154;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_178;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_130;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_1c0;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar5 = local_1e4;
  pfVar11 = (float *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  FUN_004049f5();
  puVar7 = local_130;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_154;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar5 = local_1e4;
  pfVar11 = (float *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  FUN_004049f5();
  puVar7 = local_19c;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_130;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_1c0;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_10c;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_19c;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_130;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_178;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_19c;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_10c;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_178;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_e8;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_10c;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  local_1e4[0] = 299.0;
  local_1e4[1] = 395.0;
  local_1c0[0] = 0x441c4000;
  local_1c0[1] = 0x43c58000;
  local_19c[0] = 0x441c4000;
  local_19c[1] = 0x43d70000;
  local_178[0] = 0x43958000;
  local_178[1] = 0x43d70000;
  iVar4 = 9;
  pfVar5 = local_1e4;
  do {
    iVar4 = iVar4 + -1;
    *pfVar5 = local_8 + *pfVar5;
    pfVar5 = pfVar5 + 9;
  } while (iVar4 != 0);
  puVar7 = local_19c;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_1c0;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar5 = local_1e4;
  pfVar11 = (float *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  FUN_004049f5();
  pfVar5 = local_1e4;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*pfVar5;
    pfVar5 = pfVar5 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_178;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_19c;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  local_1e4[0] = 288.0;
  local_1e4[1] = 220.0;
  local_1c0[0] = 0x43d28000;
  local_1c0[1] = 0x42ac0000;
  local_19c[0] = 0x43d28000;
  local_19c[1] = 0x43b08000;
  local_178[0] = 0x43d28000;
  local_178[1] = 0x433a0000;
  local_154[0] = 0x43d28000;
  local_154[1] = 0x437d0000;
  local_130[0] = 0x44114000;
  local_130[1] = 0x437d0000;
  local_10c[0] = 0x44008000;
  local_10c[1] = 0x433a0000;
  local_e8[0] = 0x44008000;
  local_e8[1] = 0x431e0000;
  local_c4[0] = 0x44114000;
  local_c4[1] = 0x431e0000;
  DVar3 = timeGetTime();
  local_10 = (float)(int)(DVar3 - _DAT_005101a4) * (float)_DAT_00412540;
  fVar12 = (float10)fsin((float10)local_10);
  local_c = (float)fVar12;
  iVar4 = 9;
  pfVar5 = local_1e4;
  do {
    iVar4 = iVar4 + -1;
    *pfVar5 = (float)fVar12 * _DAT_004124f0 + *pfVar5 + local_8;
    pfVar5 = pfVar5 + 9;
  } while (iVar4 != 0);
  puVar7 = local_19c;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_1c0;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar5 = local_1e4;
  pfVar11 = (float *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  FUN_004049f5();
  puVar7 = local_10c;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_154;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_178;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_130;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_154;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_10c;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_c4;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_10c;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_130;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  puVar7 = local_c4;
  ppiVar9 = apiStack_244;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_10c;
  ppiVar9 = apiStack_27c + 5;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_e8;
  puVar8 = (undefined4 *)&stack0xfffffd74;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  FUN_004049f5();
  iStack_234 = 0x40995e;
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  iStack_234 = 1;
  apiStack_244[3] = (int *)0x11;
  apiStack_244[2] = (int *)0x0;
  apiStack_244[1] = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_244[0] = (int *)0x409975;
  (**(code **)(*apiStack_244[1] + 0x94))();
  apiStack_244[0] = (int *)0x0;
  FUN_0040406d(0x510130);
  uStack_254 = 0x409989;
  FUN_0040484a('\x05','\x01');
  apiStack_244[0] = (int *)0x5;
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  uStack_254 = 0x14;
  apiStack_27c[9] = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_27c[8] = (int *)0x4099b2;
  (**(code **)(*apiStack_27c[9] + 0x50))();
  pfVar5 = local_34;
  ppiVar9 = apiStack_27c;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*pfVar5;
    pfVar5 = pfVar5 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar5 = local_a0;
  ppuVar10 = apuStack_2a0;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppuVar10 = (undefined *)*pfVar5;
    pfVar5 = pfVar5 + 1;
    ppuVar10 = ppuVar10 + 1;
  }
  pfVar5 = local_58;
  pfVar11 = afStack_2c4;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  pfVar5 = local_7c;
  pfVar11 = afStack_2e8;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  FUN_00404a3f();
  FUN_0040406d(0x510170);
  local_7c[1] = 40.0;
  local_58[1] = 40.0;
  local_a0[1] = 356.0;
  local_34[1] = 356.0;
  local_7c[5] = 0.0;
  local_7c[0] = local_8 + _DAT_0041253c;
  local_7c[6] = 0.0;
  local_58[5] = 0.046875;
  local_58[6] = 0.0;
  local_a0[5] = 0.046875;
  local_a0[6] = 0.6171875;
  local_34[5] = 0.0;
  local_58[0] = local_8 + _DAT_00412538;
  local_34[6] = 0.6171875;
  local_a0[0] = local_8 + _DAT_00412538;
  local_34[0] = local_8 + _DAT_0041253c;
  pfVar5 = local_34;
  ppiVar9 = apiStack_27c;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppiVar9 = (int *)*pfVar5;
    pfVar5 = pfVar5 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar5 = local_a0;
  ppuVar10 = apuStack_2a0;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *ppuVar10 = (undefined *)*pfVar5;
    pfVar5 = pfVar5 + 1;
    ppuVar10 = ppuVar10 + 1;
  }
  pfVar5 = local_58;
  pfVar11 = afStack_2c4;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  pfVar5 = local_7c;
  pfVar11 = afStack_2e8;
  for (iVar4 = 9; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar11 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    pfVar11 = pfVar11 + 1;
  }
  FUN_00404a3f();
  apiStack_27c[5] = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_27c[8] = (int *)0x2;
  apiStack_27c[7] = (int *)0x10;
  apiStack_27c[6] = (int *)0x0;
  apiStack_27c[4] = (int *)0x409ae6;
  (**(code **)(*apiStack_27c[5] + 0x94))();
  apiStack_27c[4] = (int *)0x2;
  apiStack_27c[3] = (int *)0x11;
  apiStack_27c[2] = (int *)0x0;
  apiStack_27c[1] = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_27c[0] = (int *)0x409afd;
  (**(code **)(*apiStack_27c[1] + 0x94))();
  apiStack_27c[0] = (int *)0xff000000;
  fVar1 = local_8 * (float)_DAT_00412530 + (float)_DAT_00412528;
  local_10 = fVar1;
  FUN_00404e70(s_effect_of_the_year_00420fb0,0x441c4000,fVar1,160.0);
  apuStack_2a0[1] = (undefined *)0x43760000;
  apuStack_2a0[0] = &DAT_00420fa8;
  uStack_2a4 = 0x409b43;
  fStack_298 = fVar1;
  FUN_00404f10();
  apiStack_27c[0] = (int *)0xff000000;
  FUN_00404f10();
  fStack_298 = 5.93325e-39;
  FUN_0040484a('\x05','\0');
  apiStack_27c[0] = (int *)0x1;
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  return;
}


// ==== FUN_00409bb0 @ 00409bb0 ====

void FUN_00409bb0(void)

{
  uint *puVar1;
  undefined4 *puVar2;
  uint *puVar3;
  uint *puVar4;
  short *psVar5;
  short sVar6;
  uint *puVar7;
  uint uVar8;
  uint uVar9;
  int iVar10;
  undefined4 *puVar11;
  undefined4 local_24 [6];
  int local_c;
  uint *local_8;
  
  puVar1 = FUN_0040604d(&DAT_0041ba9c,(uint *)0x100,0x100);
  local_c = 0x100;
  puVar4 = puVar1;
  local_8 = puVar1;
  do {
    iVar10 = 0x20;
    puVar3 = local_8;
    do {
      puVar3[0x100] = 0;
      puVar4[1] = 0;
      *puVar3 = 0;
      *puVar4 = 0;
      puVar4 = puVar4 + 8;
      puVar3 = puVar3 + 0x800;
      iVar10 = iVar10 + -1;
    } while (iVar10 != 0);
    local_8 = local_8 + 1;
    local_c = local_c + -1;
  } while (local_c != 0);
  puVar2 = (undefined4 *)FUN_00403bd6(local_24,puVar1,(uint *)0x100,(uint *)0x100,0);
  puVar11 = local_24;
  for (iVar10 = 6; iVar10 != 0; iVar10 = iVar10 + -1) {
    *puVar11 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar11 = puVar11 + 1;
  }
  puVar2 = local_24;
  puVar11 = &DAT_005101e0;
  for (iVar10 = 6; iVar10 != 0; iVar10 = iVar10 + -1) {
    *puVar11 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar11 = puVar11 + 1;
  }
  FUN_004051d7(puVar1);
  puVar3 = FUN_0040604d(&DAT_0041c4e8,(uint *)0x40,0x40);
  local_8 = (uint *)0x40;
  puVar4 = puVar3;
  puVar1 = puVar3;
  do {
    local_c = 0x10;
    puVar7 = puVar1;
    do {
      puVar7[0x40] = 0;
      puVar4[1] = 0;
      *puVar7 = 0;
      *puVar4 = 0;
      puVar4 = puVar4 + 4;
      puVar7 = puVar7 + 0x100;
      local_c = local_c + -1;
    } while (local_c != 0);
    puVar1 = puVar1 + 1;
    local_8 = (uint *)((int)local_8 + -1);
  } while (local_8 != (uint *)0x0);
  puVar2 = (undefined4 *)FUN_00403bd6(local_24,puVar3,(uint *)0x40,(uint *)0x40,0);
  puVar11 = local_24;
  for (iVar10 = 6; iVar10 != 0; iVar10 = iVar10 + -1) {
    *puVar11 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar11 = puVar11 + 1;
  }
  puVar2 = local_24;
  puVar11 = &DAT_005101c0;
  for (iVar10 = 6; iVar10 != 0; iVar10 = iVar10 + -1) {
    *puVar11 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar11 = puVar11 + 1;
  }
  FUN_004051d7(puVar3);
  DAT_005101b4 = FUN_004051c3(0x1200);
  uVar9 = 0;
  puVar2 = (undefined4 *)(DAT_005101b4 + 0x14);
  do {
    puVar2[-3] = 0x3f7fff58;
    uVar8 = uVar9 & 3;
    puVar2[-2] = 0x3f800054;
    puVar2[-1] = 0x1f1f1f1f;
    if (uVar8 == 0) {
      *puVar2 = 0;
      puVar2[1] = 0;
    }
    if (uVar8 == 1) {
      *puVar2 = DAT_00420fc8;
      puVar2[1] = 0;
    }
    if (uVar8 == 2) {
      *puVar2 = DAT_00420fc8;
      puVar2[1] = DAT_00420fc8;
    }
    if (uVar8 == 3) {
      *puVar2 = 0;
      puVar2[1] = DAT_00420fc8;
    }
    puVar2 = puVar2 + 9;
    uVar9 = uVar9 + 1;
  } while ((int)uVar9 < 0x80);
  psVar5 = (short *)FUN_004051c3(0x180);
  iVar10 = 0;
  DAT_005101b8 = psVar5;
  do {
    sVar6 = (short)(iVar10 << 2);
    *psVar5 = sVar6;
    psVar5[1] = sVar6 + 1;
    psVar5[2] = sVar6 + 2;
    psVar5[3] = sVar6 + 2;
    psVar5[4] = sVar6 + 3;
    psVar5[5] = sVar6;
    psVar5 = psVar5 + 6;
    iVar10 = iVar10 + 1;
  } while (iVar10 < 0x20);
  DAT_005101a8 = FUN_004051c3(0x80);
  iVar10 = 0;
  do {
    *(undefined4 *)(iVar10 + DAT_005101a8) = 0;
    iVar10 = iVar10 + 4;
  } while (iVar10 < 0x80);
  FUN_00409d8d();
  return;
}


// ==== FUN_00409d8d @ 00409d8d ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00409d8d(void)

{
  _DAT_00510200 = timeGetTime();
  DAT_005101b0 = 0;
  DAT_005101fc = 0;
  return;
}


// ==== FUN_00409da6 @ 00409da6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00409da6(char param_1)

{
  DWORD DVar1;
  int iVar2;
  float *pfVar3;
  undefined4 *puVar4;
  int iVar5;
  float fVar6;
  int iVar7;
  int **ppiVar8;
  undefined4 *puVar9;
  float10 fVar10;
  undefined4 auStack_334 [9];
  undefined4 auStack_310 [8];
  undefined4 uStack_2f0;
  int *apiStack_2ec [4];
  char *pcStack_2dc;
  float fStack_2d8;
  int *piStack_2d4;
  undefined4 local_284 [9];
  undefined4 local_260 [9];
  undefined4 local_23c [9];
  undefined4 local_218 [9];
  undefined4 local_1f4 [9];
  undefined4 local_1d0 [9];
  undefined4 local_1ac [9];
  undefined4 local_188 [9];
  undefined4 local_164 [9];
  undefined4 local_140 [9];
  undefined4 local_11c [9];
  undefined4 local_f8 [9];
  undefined4 local_d4 [9];
  undefined4 local_b0 [9];
  undefined4 local_8c [9];
  undefined4 local_68 [9];
  float local_44;
  float local_40;
  float local_3c;
  float local_38;
  float local_34;
  float local_30;
  float local_2c;
  float local_28;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  iVar5 = 0;
  iVar7 = 0;
  do {
    DVar1 = timeGetTime();
    iVar2 = DVar1 - iVar7;
    iVar7 = iVar7 + 0x32;
    local_8 = (float)(iVar2 - _DAT_00510200);
    *(float *)(iVar5 + DAT_005101a8) = (float)(int)local_8 * (float)_DAT_004125b0;
    iVar5 = iVar5 + 4;
  } while (iVar7 < 0x640);
  iVar5 = FUN_004051ef();
  if (((byte)iVar5 & 0x1f) == 0x14) {
    DAT_005101b0 = '\x01';
    _DAT_005101f8 = timeGetTime();
  }
  iVar5 = FUN_004051ef();
  if (((byte)iVar5 & 0x1f) == 0x16) {
    DAT_005101b0 = '\x01';
    _DAT_005101f8 = timeGetTime();
  }
  iVar5 = FUN_004051ef();
  if (((byte)iVar5 & 0x1f) == 0x17) {
    DAT_005101b0 = '\x01';
    _DAT_005101f8 = timeGetTime();
  }
  FUN_0040406d(0x5101e0);
  if (param_1 != '\0') {
    FUN_0040406d(0x5101c0);
  }
  FUN_0040484a('\x01','\0');
  FUN_0040484a('\x03','\0');
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  local_14 = 100.0;
  local_1c = DAT_00420fcc;
  if (DAT_005101b0 != '\0') {
    DVar1 = timeGetTime();
    local_1c = (float)_DAT_004124b0 - (float)(int)(DVar1 - _DAT_005101f8) * (float)_DAT_00412570;
    if (local_1c < DAT_00420fcc) {
      DAT_005101b0 = '\0';
      local_1c = DAT_00420fcc;
    }
  }
  local_8 = _DAT_005101bc * _DAT_00412644;
  local_10 = (float)(int)ROUND(local_8);
  if (DAT_005101b0 != '\0') {
    DVar1 = timeGetTime();
    local_8 = (float)(int)(DVar1 - _DAT_005101f8) * (float)_DAT_00412570;
    local_10 = (float)(int)ROUND(local_8);
  }
  fVar6 = local_10;
  if (0x1f < (int)local_10) {
    fVar6 = 4.34403e-44;
  }
  if (param_1 != '\0') {
    iVar5 = FUN_004051ef();
    if (((byte)iVar5 & 0x1f) == 4) {
      DAT_005101fc = '\x01';
      _DAT_005101d8 = timeGetTime();
    }
    iVar5 = FUN_004051ef();
    if (((byte)iVar5 & 0x1f) == 6) {
      DAT_005101fc = '\x01';
      _DAT_005101d8 = timeGetTime();
    }
    iVar5 = FUN_004051ef();
    if (((byte)iVar5 & 0x1f) == 7) {
      DAT_005101fc = '\x01';
      _DAT_005101d8 = timeGetTime();
    }
    if (DAT_005101fc != '\0') {
      DVar1 = timeGetTime();
      fVar6 = (float)((int)fVar6 + (0xe0 - (int)ROUND((float)(int)(DVar1 - _DAT_005101d8))));
      if (0xe0 < (int)ROUND((float)(int)(DVar1 - _DAT_005101d8))) {
        DAT_005101fc = '\0';
      }
    }
    if (0xff < (int)fVar6) {
      fVar6 = 3.57331e-43;
    }
  }
  fVar6 = (float)((int)fVar6 * 0x1010101);
  if (param_1 != '\0') {
    local_1c = local_1c * _DAT_00412640;
  }
  iVar5 = 0;
  pfVar3 = DAT_005101b4;
  do {
    fVar10 = (float10)fsin((float10)*(float *)(iVar5 + DAT_005101a8));
    local_18 = (float)fVar10;
    fVar10 = (float10)fsin((float10)(*(float *)(iVar5 + DAT_005101a8) * (float)_DAT_00412638));
    local_40 = (float)fVar10;
    local_10 = local_40 * _DAT_00412630 + _DAT_004123d8;
    fVar10 = (float10)fcos((float10)(*(float *)(iVar5 + DAT_005101a8) * (float)_DAT_00412628));
    local_2c = (float)fVar10;
    local_8 = local_2c * _DAT_00412500;
    pfVar3[4] = fVar6;
    local_8 = local_8 + _DAT_004123d4;
    fVar10 = (float10)fsin((float10)(local_18 + _DAT_005101ac));
    local_24 = (float)fVar10;
    *pfVar3 = local_24 * local_14 + local_10;
    fVar10 = (float10)fcos((float10)(local_18 + _DAT_005101ac));
    local_3c = (float)fVar10;
    pfVar3[1] = local_3c * local_14 + local_8;
    pfVar3[0xd] = fVar6;
    fVar10 = (float10)fsin((float10)(local_18 + _DAT_005101ac + (float)_DAT_00412620));
    local_34 = (float)fVar10;
    pfVar3[9] = local_34 * local_14 + local_10;
    fVar10 = (float10)fcos((float10)(local_18 + _DAT_005101ac + (float)_DAT_00412620));
    local_44 = (float)fVar10;
    pfVar3[10] = local_44 * local_14 + local_8;
    pfVar3[0x16] = fVar6;
    fVar10 = (float10)fsin((float10)(local_18 + _DAT_005101ac + (float)_DAT_00412508));
    local_28 = (float)fVar10;
    pfVar3[0x12] = local_28 * local_14 + local_10;
    fVar10 = (float10)fcos((float10)(local_18 + _DAT_005101ac + (float)_DAT_00412508));
    local_30 = (float)fVar10;
    pfVar3[0x13] = local_30 * local_14 + local_8;
    pfVar3[0x1f] = fVar6;
    fVar10 = (float10)fsin((float10)(local_18 + _DAT_005101ac + (float)_DAT_00412618));
    local_38 = (float)fVar10;
    pfVar3[0x1b] = local_38 * local_14 + local_10;
    local_c = local_18 + _DAT_005101ac + (float)_DAT_00412618;
    fVar10 = (float10)fcos((float10)local_c);
    local_20 = (float)fVar10;
    iVar5 = iVar5 + 4;
    pfVar3[0x1c] = local_20 * local_14 + local_8;
    local_14 = local_1c + local_14;
    pfVar3 = pfVar3 + 0x24;
  } while (iVar5 < 0x80);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x68))();
  if (param_1 != '\0') {
    piStack_2d4 = *(int **)(DAT_004b4eb8 + 0xc);
    fStack_2d8 = 5.935581e-39;
    (**(code **)(*piStack_2d4 + 0x50))();
    fStack_2d8 = 8.40779e-45;
    pcStack_2dc = (char *)0x14;
    apiStack_2ec[3] = *(int **)(DAT_004b4eb8 + 0xc);
    apiStack_2ec[2] = (int *)0x40a20e;
    (**(code **)(*apiStack_2ec[3] + 0x50))();
    apiStack_2ec[2] = (int *)0x1;
    apiStack_2ec[1] = (int *)0xe;
    apiStack_2ec[0] = *(int **)(DAT_004b4eb8 + 0xc);
    uStack_2f0 = 0x40a21f;
    (**(code **)(*apiStack_2ec[0] + 0x50))();
    piStack_2d4 = (int *)0x40a227;
    FUN_0040484a('\x05','\x01');
    DVar1 = timeGetTime();
    local_20 = (float)(int)ROUND((float)(int)(DVar1 - _DAT_00510200) * (float)_DAT_00412610);
    _param_1 = (int)local_20 + -100;
    if (_param_1 < 0) {
      _param_1 = 0;
    }
    if (0xff < _param_1) {
      _param_1 = 0xff;
    }
    piStack_2d4 = (int *)0x40a26d;
    FUN_0040406d(0);
    puVar4 = local_284 + 3;
    iVar5 = 0x10;
    do {
      puVar4[-1] = 0x3c23d70a;
      *puVar4 = 0x42c80000;
      puVar4[1] = _param_1 * 0x1000000 + 0xd7b45a;
      puVar4[2] = 0;
      puVar4[3] = 0;
      puVar4 = puVar4 + 9;
      iVar5 = iVar5 + -1;
    } while (iVar5 != 0);
    local_284[1] = 0x43ad8000;
    local_284[0] = _DAT_00412608;
    local_260[0] = _DAT_00412608;
    local_260[1] = 0x43c28000;
    local_23c[0] = 0x42000000;
    local_23c[1] = _DAT_00412604;
    local_218[1] = _DAT_00412604;
    local_218[0] = 0x42860000;
    local_1f4[0] = 0x42860000;
    local_1f4[1] = _DAT_00412600;
    local_1d0[1] = _DAT_00412600;
    local_1d0[0] = 0x43150000;
    local_188[0] = 0x435b0000;
    local_1ac[0] = _DAT_004125fc;
    local_164[0] = 0x435b0000;
    local_11c[1] = 0x43ad8000;
    local_1ac[1] = _DAT_004125f8;
    local_188[1] = _DAT_004125f8;
    local_d4[0] = 0x43650000;
    local_b0[0] = 0x43650000;
    local_164[1] = _DAT_004125f4;
    local_b0[1] = 0x43b50000;
    local_8c[1] = 0x43b50000;
    local_140[0] = _DAT_004125fc;
    puVar4 = local_284 + 1;
    iVar5 = 0x10;
    local_140[1] = _DAT_004125f4;
    local_11c[0] = _DAT_004125fc;
    local_f8[0] = _DAT_004125f0;
    local_f8[1] = _DAT_004125ec;
    local_d4[1] = _DAT_004125ec;
    local_8c[0] = _DAT_004125f0;
    do {
      *puVar4 = *puVar4;
      puVar4 = puVar4 + 9;
      iVar5 = iVar5 + -1;
    } while (iVar5 != 0);
    uStack_2f0 = 9;
    iVar5 = 9;
    puVar4 = local_23c;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_260;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_284;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_23c;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_11c;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_284;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_11c;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_218;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_23c;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_140;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_11c;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_218;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_1ac;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_140;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_218;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_1d0;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_1f4;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_218;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_1ac;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_1d0;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_218;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_164;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_140;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_1ac;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_164;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_188;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_1ac;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_b0;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_d4;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_f8;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_f8;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_8c;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_b0;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    local_f8[0] = _DAT_004125e8;
    local_f8[1] = _DAT_004125e4;
    local_d4[1] = _DAT_004125e4;
    local_d4[0] = 0x42640000;
    local_b0[0] = 0x42640000;
    local_8c[0] = _DAT_004125e8;
    local_b0[1] = 0x43eb8000;
    local_8c[1] = 0x43eb8000;
    puVar4 = local_b0;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_d4;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_f8;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_f8;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_8c;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_b0;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    FUN_0040406d(0);
    puVar4 = local_284 + 3;
    iVar7 = 0x10;
    do {
      puVar4[-1] = 0x3c23d70a;
      *puVar4 = 0x42c80000;
      puVar4[1] = _param_1 << 0x18;
      puVar4[2] = 0;
      puVar4[3] = 0;
      puVar4 = puVar4 + 9;
      iVar7 = iVar7 + -1;
    } while (iVar7 != 0);
    local_1f4[0] = 0x43220000;
    local_284[0] = _DAT_00412608;
    local_188[0] = 0x43220000;
    local_8c[0] = 0x43230000;
    local_284[1] = _DAT_004125e0;
    local_8c[1] = 0x43ac0000;
    local_68[1] = 0x43ac0000;
    local_260[0] = _DAT_004125dc;
    puVar4 = local_284 + 1;
    iVar7 = 0x10;
    local_260[1] = _DAT_004125e0;
    local_23c[0] = _DAT_004125dc;
    local_23c[1] = _DAT_004125d8;
    local_218[0] = _DAT_00412608;
    local_218[1] = _DAT_004125d8;
    local_1f4[1] = _DAT_004125e0;
    local_1d0[0] = _DAT_004125fc;
    local_1d0[1] = _DAT_004125e0;
    local_1ac[0] = _DAT_004125fc;
    local_1ac[1] = _DAT_004125d8;
    local_188[1] = _DAT_004125d8;
    local_164[0] = _DAT_004125d4;
    local_164[1] = _DAT_004125e0;
    local_140[0] = _DAT_004125d0;
    local_140[1] = _DAT_004125e0;
    local_11c[0] = _DAT_004125d0;
    local_11c[1] = _DAT_004125d8;
    local_f8[0] = _DAT_004125d4;
    local_f8[1] = _DAT_004125d8;
    local_d4[0] = _DAT_00412608;
    local_d4[1] = _DAT_004125d8;
    local_b0[0] = _DAT_004125fc;
    local_b0[1] = _DAT_004125d8;
    local_68[0] = _DAT_00412608;
    do {
      *puVar4 = *puVar4;
      puVar4 = puVar4 + 9;
      iVar7 = iVar7 + -1;
    } while (iVar7 != 0);
    puVar4 = local_23c;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_260;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_284;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_284;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_218;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_23c;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_1ac;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_1d0;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_1f4;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_1f4;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_188;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_1ac;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_11c;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_140;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_164;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_164;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_f8;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_11c;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_8c;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_b0;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_d4;
    puVar9 = auStack_334;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    puVar4 = local_d4;
    ppiVar8 = apiStack_2ec;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *ppiVar8 = (int *)*puVar4;
      puVar4 = puVar4 + 1;
      ppiVar8 = ppiVar8 + 1;
    }
    puVar4 = local_68;
    puVar9 = auStack_310;
    for (iVar7 = iVar5; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    puVar4 = local_8c;
    puVar9 = auStack_334;
    for (; iVar5 != 0; iVar5 = iVar5 + -1) {
      *puVar9 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar9 = puVar9 + 1;
    }
    FUN_004049f5();
    piStack_2d4 = (int *)_DAT_004125c8;
    fStack_2d8 = (float)_DAT_004125c4;
    pcStack_2dc = s_cheap_00420fe4;
    apiStack_2ec[3] = (int *)0x40a9ca;
    FUN_00404f10();
    piStack_2d4 = (int *)_DAT_004125c0;
    fStack_2d8 = (float)_DAT_004125c4;
    pcStack_2dc = s_imitations_00420fd8;
    apiStack_2ec[3] = (int *)0x40a9f8;
    FUN_00404f10();
    piStack_2d4 = (int *)_DAT_004125b8;
    fStack_2d8 = _DAT_00412630;
    pcStack_2dc = &DAT_00420fd0;
    apiStack_2ec[3] = (int *)0x40aa26;
    FUN_00404f10();
  }
  piStack_2d4 = (int *)0x40aa33;
  FUN_0040484a('\x05','\0');
  return;
}


// ==== FUN_0040aa40 @ 0040aa40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040aa40(byte *param_1)

{
  byte *pbVar1;
  byte bVar2;
  int iVar3;
  undefined4 *puVar4;
  float *pfVar5;
  ushort *puVar6;
  ushort uVar7;
  uint uVar8;
  
  DAT_00510204 = param_1;
  bVar2 = param_1[1];
  uVar7 = (ushort)*param_1;
  DAT_00510208 = 2;
  puVar4 = FUN_00402040(uVar7,(ushort)bVar2);
  iVar3 = puVar4[0x1b];
  pfVar5 = (float *)puVar4[0x18];
  uVar8 = (uint)uVar7;
  if (uVar7 != 0) {
    do {
      pbVar1 = DAT_00510204 + DAT_00510208;
      DAT_00510208 = DAT_00510208 + 2;
      *pfVar5 = (float)(int)*(short *)pbVar1 * (float)_DAT_00412088;
      pbVar1 = DAT_00510204 + DAT_00510208;
      DAT_00510208 = DAT_00510208 + 2;
      pfVar5[1] = (float)(int)*(short *)pbVar1 * (float)_DAT_00412088;
      pbVar1 = DAT_00510204 + DAT_00510208;
      DAT_00510208 = DAT_00510208 + 2;
      uVar8 = uVar8 - 1;
      pfVar5[2] = (float)(int)*(short *)pbVar1 * (float)_DAT_00412088;
      pfVar5 = pfVar5 + 8;
    } while (uVar8 != 0);
  }
  uVar8 = (uint)bVar2;
  if (bVar2 != 0) {
    puVar6 = (ushort *)(iVar3 + 4);
    do {
      pbVar1 = DAT_00510204 + DAT_00510208;
      DAT_00510208 = DAT_00510208 + 1;
      puVar6[-2] = (ushort)*pbVar1;
      pbVar1 = DAT_00510204 + DAT_00510208;
      DAT_00510208 = DAT_00510208 + 1;
      puVar6[-1] = (ushort)*pbVar1;
      pbVar1 = DAT_00510204 + DAT_00510208;
      uVar8 = uVar8 - 1;
      DAT_00510208 = DAT_00510208 + 1;
      *puVar6 = (ushort)*pbVar1;
      puVar6 = puVar6 + 3;
    } while (uVar8 != 0);
  }
  return;
}


// ==== FUN_0040aba0 @ 0040aba0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040aba0(float param_1,float param_2,float param_3)

{
  int iVar1;
  int iVar2;
  float *pfVar3;
  
  pfVar3 = DAT_0051022c;
  iVar1 = (int)ROUND(_DAT_00510230 + param_1 + _DAT_0041264c);
  iVar2 = (int)ROUND(_DAT_00510244 + param_3 + _DAT_00412648);
  DAT_0051022c[0x10] = param_1;
  pfVar3[0x11] = param_2;
  pfVar3[0x12] = param_3;
  DAT_0051022c[0x10] =
       (float)(int)(((-1 < iVar1) - 1 & 0xfffffffe) + 1) * (float)(iVar1 % 0x3cf) - _DAT_0041264c;
  DAT_0051022c[0x12] =
       (float)(int)(((-1 < iVar2) - 1 & 0xfffffffe) + 1) * (float)(iVar2 % 0x348) - _DAT_00412648;
  FUN_00402180(DAT_0051022c);
  return;
}


// ==== FUN_0040ac70 @ 0040ac70 ====

void __cdecl FUN_0040ac70(float param_1,float param_2,float param_3)

{
  float *pfVar1;
  
  pfVar1 = DAT_00510238;
  DAT_00510238[0x10] = param_1;
  pfVar1[0x11] = param_2;
  pfVar1[0x12] = param_3;
  FUN_00402180(DAT_00510238);
  return;
}


// ==== FUN_0040aca0 @ 0040aca0 ====

void FUN_0040aca0(void)

{
  undefined2 *puVar1;
  undefined4 *puVar2;
  uint *puVar3;
  uint *puVar4;
  int iVar5;
  int iVar6;
  uint *puVar7;
  undefined4 *puVar8;
  undefined4 local_18 [6];
  
  local_18[0] = 0xc3480000;
  local_18[1] = 0x43200000;
  local_18[2] = 0x43d20000;
  DAT_00510228 = FUN_00402680(-200.0,160.0,420.0,-70.0,-180.0,100.0);
  DAT_00510228[0x17] = 0.0;
  puVar2 = (undefined4 *)FUN_0040607f(local_18,1.1,0);
  puVar8 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar2 = local_18;
  puVar8 = &DAT_00510248;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar8 = puVar8 + 1;
  }
  DAT_0051022c = (float *)FUN_0040aa40(&DAT_00421394);
  *(byte *)(DAT_0051022c + 0x17) = *(byte *)(DAT_0051022c + 0x17) | 1;
  DAT_0051022c[0x13] = 0.25;
  DAT_00510238 = (float *)FUN_0040aa40(&DAT_00421394);
  iVar5 = 0;
  *(byte *)(DAT_00510238 + 0x17) = *(byte *)(DAT_00510238 + 0x17) | 1;
  DAT_00510238[0x13] = 2.0;
  if (*(short *)(DAT_0051022c + 0x1a) != 0) {
    puVar2 = (undefined4 *)((int)DAT_0051022c[0x18] + 0xc);
    do {
      *puVar2 = 0xffd7b45a;
      iVar5 = iVar5 + 1;
      puVar2 = puVar2 + 8;
    } while (iVar5 < (int)(uint)*(ushort *)(DAT_0051022c + 0x1a));
  }
  iVar5 = 0;
  if (*(short *)(DAT_00510238 + 0x1a) != 0) {
    puVar2 = (undefined4 *)((int)DAT_00510238[0x18] + 0xc);
    do {
      *puVar2 = 0xff7dafc8;
      iVar5 = iVar5 + 1;
      puVar2 = puVar2 + 8;
    } while (iVar5 < (int)(uint)*(ushort *)(DAT_00510238 + 0x1a));
  }
  FUN_004022a0(DAT_0051022c,DAT_00510228,1.0,'\x01');
  FUN_004022a0(DAT_00510238,DAT_00510228,1.0,'\x01');
  puVar3 = (uint *)FUN_004051c3(0x40000);
  puVar4 = puVar3;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar4 = 0;
    puVar4 = puVar4 + 1;
  }
  iVar5 = 0x10;
  puVar4 = puVar3;
  do {
    iVar5 = iVar5 + -1;
    puVar7 = puVar4;
    for (iVar6 = 0x100; iVar6 != 0; iVar6 = iVar6 + -1) {
      *puVar7 = 0xffffffff;
      puVar7 = puVar7 + 1;
    }
    puVar4 = puVar4 + 0x1000;
  } while (iVar5 != 0);
  iVar5 = 0x100;
  puVar4 = puVar3;
  do {
    iVar6 = 0x10;
    do {
      *puVar4 = 0xffffffff;
      puVar4 = puVar4 + 0x10;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
    iVar5 = iVar5 + -1;
  } while (iVar5 != 0);
  puVar2 = (undefined4 *)FUN_00403bd6(local_18,puVar3,(uint *)0x100,(uint *)0x100,0);
  puVar8 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar2 = local_18;
  puVar8 = &DAT_00510210;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar8 = puVar8 + 1;
  }
  DAT_00510260 = FUN_00402040(4,2);
  puVar2 = (undefined4 *)DAT_00510260[0x18];
  puVar1 = (undefined2 *)DAT_00510260[0x1b];
  *puVar2 = 0xc47a0000;
  puVar2[1] = 0xc1200000;
  puVar2[2] = 0xc47a0000;
  puVar2[4] = 0;
  puVar2[5] = 0;
  puVar2[3] = 0xffffffff;
  puVar2[10] = 0xc47a0000;
  puVar2[8] = 0x447a0000;
  puVar2[9] = 0xc1200000;
  puVar2[0xc] = 0x40a00000;
  puVar2[0xd] = 0;
  puVar2[0xb] = 0xffffffff;
  puVar2[0x10] = 0x447a0000;
  puVar2[0x11] = 0xc1200000;
  puVar2[0x12] = 0x447a0000;
  puVar2[0x14] = 0x40a00000;
  puVar2[0x15] = 0x40a00000;
  puVar2[0x13] = 0xffffffff;
  puVar2[0x18] = 0xc47a0000;
  puVar2[0x19] = 0xc1200000;
  puVar2[0x1a] = 0x447a0000;
  puVar2[0x1c] = 0;
  puVar2[0x1d] = 0x40a00000;
  puVar2[0x1b] = 0xffffffff;
  *puVar1 = 0;
  puVar1[1] = 1;
  puVar1[2] = 2;
  puVar1[3] = 2;
  puVar1[4] = 3;
  puVar1[5] = 0;
  return;
}


// ==== FUN_0040af60 @ 0040af60 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040af60(void)

{
  _DAT_00510264 = timeGetTime();
  _DAT_00510234 = timeGetTime();
  return;
}


// ==== FUN_0040af80 @ 0040af80 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040af80(void)

{
  float fVar1;
  float *pfVar2;
  DWORD DVar3;
  undefined4 *puVar4;
  int iVar5;
  int iVar6;
  undefined4 *puVar7;
  float10 fVar8;
  undefined4 auStackY_300 [9];
  undefined4 auStackY_2dc [9];
  undefined4 auStackY_2b8 [2];
  undefined4 local_264 [9];
  undefined4 local_240 [9];
  undefined4 local_21c [9];
  undefined4 local_1f8 [9];
  undefined4 local_1d4 [9];
  undefined4 local_1b0 [9];
  undefined4 local_18c [9];
  undefined4 local_168 [9];
  undefined4 local_144 [72];
  undefined4 local_24;
  undefined4 local_20;
  undefined4 local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  FUN_0040484a('\x03','\x01');
  DAT_004b4f64 = 0xff7dafc8;
  DAT_0041a2a8 = 0xff7dafc8;
  DAT_0041a2ac = 0x3b449ba6;
  FUN_0040484a('\x04','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  DVar3 = timeGetTime();
  local_8 = (float)(DVar3 - _DAT_00510234);
  _DAT_0051023c = (float)(int)local_8 * (float)_DAT_00412698 + _DAT_0051023c;
  DVar3 = timeGetTime();
  local_8 = (float)(DVar3 - _DAT_00510234);
  _DAT_00510240 = (float)(int)local_8 * (float)_DAT_00412698 + _DAT_00510240;
  _DAT_00510234 = timeGetTime();
  fVar8 = (float10)fsin((float10)(_DAT_0051023c * (float)_DAT_00412690));
  _DAT_00510230 = (float)fVar8 * _DAT_00412688 + _DAT_00412688;
  fVar8 = (float10)fcos((float10)(_DAT_00510240 * (float)_DAT_00412680));
  _DAT_00510244 = (float)fVar8 * _DAT_00412688 + _DAT_00412688;
  DAT_00510228[0x16] = 88.0;
  local_18 = _DAT_0051023c * (float)_DAT_00412510;
  fVar8 = (float10)fsin((float10)local_18);
  local_8 = (float)fVar8;
  DAT_00510228[0x17] = local_8;
  pfVar2 = DAT_00510228;
  DAT_00510228[0x10] = -200.0;
  pfVar2[0x11] = 160.0;
  pfVar2[0x12] = 420.0;
  pfVar2 = DAT_00510228;
  local_14 = -70.0;
  local_10 = -180.0;
  local_c = 100.0;
  DAT_00510228[0x13] = -70.0;
  pfVar2[0x14] = -180.0;
  pfVar2[0x15] = 100.0;
  FUN_00402760(DAT_00510228);
  FUN_0040484a('\x01','\0');
  fVar1 = DAT_00510260[0x18];
  *(float *)((int)fVar1 + 0x10) = -(_DAT_00510230 * (float)_DAT_00412678);
  *(float *)((int)fVar1 + 0x14) = -(_DAT_00510244 * (float)_DAT_00412678);
  *(float *)((int)fVar1 + 0x30) = (float)_DAT_00412470 - _DAT_00510230 * (float)_DAT_00412678;
  *(float *)((int)fVar1 + 0x34) = -(_DAT_00510244 * (float)_DAT_00412678);
  *(float *)((int)fVar1 + 0x50) = (float)_DAT_00412470 - _DAT_00510230 * (float)_DAT_00412678;
  *(float *)((int)fVar1 + 0x54) = (float)_DAT_00412470 - _DAT_00510244 * (float)_DAT_00412678;
  *(float *)((int)fVar1 + 0x70) = -(_DAT_00510230 * (float)_DAT_00412678);
  *(float *)((int)fVar1 + 0x74) = (float)_DAT_00412470 - _DAT_00510244 * (float)_DAT_00412678;
  FUN_0040484a('\x03','\0');
  FUN_0040406d(0x510210);
  FUN_00402180(DAT_00510260);
  FUN_0040406d(0x510248);
  local_c = -420.0;
  iVar6 = 0;
  do {
    fVar1 = local_c;
    local_14 = -450.0;
    iVar5 = 0;
    do {
      DVar3 = timeGetTime();
      local_18 = (float)(DVar3 + iVar6 + iVar5);
      fVar8 = (float10)fcos((float10)(int)local_18 * (float10)_DAT_00412670);
      local_10 = (float)(ABS(((float10)_DAT_00412660 -
                             ((fVar8 + (float10)_DAT_004120b0) * (float10)_DAT_004120a8 *
                              (float10)_DAT_00412668 + (float10)_DAT_004120b0)) -
                             (float10)_DAT_00412658) + (float10)_DAT_00412658);
      FUN_0040aba0(local_14,local_10,fVar1);
      local_14 = local_14 + _DAT_00412654;
      iVar5 = iVar5 + 900;
    } while (iVar5 < 0x2db4);
    local_c = local_c + _DAT_00412650;
    iVar6 = iVar6 + 0xdc;
    local_14 = -450.0;
  } while (iVar6 < 0x14a0);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040406d(0);
  puVar4 = local_264 + 3;
  iVar6 = 0x10;
  do {
    puVar4[-1] = 0x3c23d70a;
    *puVar4 = 0x42c80000;
    puVar4[1] = 0xffd7b45a;
    puVar4[2] = 0;
    puVar4[3] = 0;
    puVar4 = puVar4 + 9;
    iVar6 = iVar6 + -1;
  } while (iVar6 != 0);
  local_264[0] = 0x44200000;
  local_264[1] = 0x43cb8000;
  local_240[0] = 0x42480000;
  local_240[1] = 0x43cb8000;
  local_21c[0] = 0x422c0000;
  local_21c[1] = 0x43cf0000;
  local_1f8[0] = 0x422c0000;
  local_1f8[1] = 0x43e10000;
  local_1d4[0] = 0x44200000;
  local_1d4[1] = 0x43e10000;
  local_1b0[0] = 0x42c80000;
  local_1b0[1] = 0x43e10000;
  local_18c[0] = 0x44200000;
  local_18c[1] = 0x43e10000;
  local_168[0] = 0x44200000;
  local_168[1] = 0x43e60000;
  local_144[0] = 0x42c80000;
  local_144[1] = 0x43e60000;
  puVar4 = local_240;
  puVar7 = auStackY_2b8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_264;
  puVar7 = auStackY_2dc;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_21c;
  puVar7 = auStackY_300;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  FUN_004049f5();
  puVar4 = local_264;
  puVar7 = auStackY_2b8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_1d4;
  puVar7 = auStackY_2dc;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_21c;
  puVar7 = auStackY_300;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  FUN_004049f5();
  puVar4 = local_1d4;
  puVar7 = auStackY_2b8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_1f8;
  puVar7 = auStackY_2dc;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_21c;
  puVar7 = auStackY_300;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  FUN_004049f5();
  puVar4 = local_168;
  puVar7 = auStackY_2b8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_18c;
  puVar7 = auStackY_2dc;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_1b0;
  puVar7 = auStackY_300;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  FUN_004049f5();
  puVar4 = local_1b0;
  puVar7 = auStackY_2b8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_144;
  puVar7 = auStackY_2dc;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  puVar4 = local_168;
  puVar7 = auStackY_300;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar7 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar7 = puVar7 + 1;
  }
  FUN_004049f5();
  FUN_00404f10();
  FUN_0040406d(0x510248);
  local_24 = 0;
  local_20 = 0x3f82b0b5;
  local_1c = 0;
  local_14 = 140.0;
  local_10 = -100.0;
  local_c = 0.0;
  FUN_00402230(DAT_00510238,0.0,1.0210177,0.0);
  pfVar2 = DAT_00510228;
  DAT_00510228[0x10] = -75.0;
  local_24 = 0;
  pfVar2[0x11] = 75.0;
  local_20 = 0x420c0000;
  local_1c = 0;
  pfVar2[0x12] = -100.0;
  pfVar2 = DAT_00510228;
  DAT_00510228[0x13] = 0.0;
  pfVar2[0x14] = 35.0;
  pfVar2[0x15] = 0.0;
  DAT_00510228[0x17] = 0.0;
  DAT_00510228[0x16] = 100.0;
  FUN_00402760(DAT_00510228);
  auStackY_2b8[1] = 0x40b5dd;
  FUN_0040484a('\x03','\x01');
  FUN_0040ac70(local_14,local_10,local_c);
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  return;
}


// ==== FUN_0040b630 @ 0040b630 ====

void FUN_0040b630(void)

{
  byte bVar1;
  uint *puVar2;
  uint uVar3;
  undefined4 *puVar4;
  int iVar5;
  uint *puVar6;
  undefined1 *puVar7;
  uint *puVar8;
  undefined4 *puVar9;
  undefined4 local_18 [6];
  
  puVar2 = (uint *)FUN_004051c3(0x40000);
  puVar8 = puVar2;
  for (iVar5 = 0x10000; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = 0;
    puVar8 = puVar8 + 1;
  }
  puVar7 = &DAT_00420ff8;
  puVar8 = puVar2 + 2;
  do {
    iVar5 = 0;
    puVar6 = puVar8;
    do {
      bVar1 = puVar7[iVar5];
      uVar3 = (uint)bVar1;
      puVar6[-2] = ((int)uVar3 >> 7) * -0x1000000 + 0xffffff;
      puVar6[-1] = ((int)uVar3 >> 6 & 1U) * -0x1000000 + 0xffffff;
      *puVar6 = ((int)uVar3 >> 5 & 1U) * -0x1000000 + 0xffffff;
      puVar6[1] = ((int)uVar3 >> 4 & 1U) * -0x1000000 + 0xffffff;
      puVar6[2] = ((int)uVar3 >> 3 & 1U) * -0x1000000 + 0xffffff;
      puVar6[3] = ((int)uVar3 >> 2 & 1U) * -0x1000000 + 0xffffff;
      puVar6[4] = ((int)uVar3 >> 1 & 1U) * -0x1000000 + 0xffffff;
      puVar6[5] = (bVar1 & 1) * -0x1000000 + 0xffffff;
      iVar5 = iVar5 + 1;
      puVar6 = puVar6 + 8;
    } while (iVar5 < 9);
    puVar7 = puVar7 + 9;
    puVar8 = puVar8 + 0x100;
  } while ((int)puVar7 < 0x421346);
  puVar4 = (undefined4 *)FUN_00403bd6(local_18,puVar2,(uint *)0x100,(uint *)0x100,2);
  puVar9 = local_18;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_18;
  puVar9 = &DAT_005102b0;
  for (iVar5 = 6; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  FUN_004051d7(puVar2);
  return;
}


// ==== FUN_0040b780 @ 0040b780 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040b780(float *param_1)

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
  float fVar15;
  float fVar16;
  float fVar17;
  float fVar18;
  float fVar19;
  float fVar20;
  float fVar21;
  float fVar22;
  int iVar23;
  int iVar24;
  float *pfVar25;
  float *pfVar26;
  uint uVar27;
  
  iVar24 = 0;
  if (*(short *)(param_1 + 0x1a) != 0) {
    iVar23 = 0;
    do {
      iVar24 = iVar24 + 1;
      *(float *)(iVar23 + 0x10 + DAT_005102f0) =
           (*(float *)(iVar23 + DAT_005102f0) * (float)_DAT_004123e8 + (float)_DAT_004120a8) *
           (float)_DAT_004120a8;
      *(float *)(iVar23 + 0x14 + DAT_005102f0) =
           (*(float *)(iVar23 + 8 + DAT_005102f0) * (float)_DAT_004123e8 + (float)_DAT_004120a8) *
           (float)_DAT_004120a8;
      iVar23 = iVar23 + 0x20;
    } while (iVar24 < (int)(uint)*(ushort *)(param_1 + 0x1a));
  }
  uVar27 = (uint)*(ushort *)(param_1 + 0x1a);
  if (uVar27 != 0) {
    fVar1 = _DAT_005102f4 * (float)_DAT_00412728;
    fVar11 = (float)_DAT_00412720;
    fVar2 = _DAT_005102f4 * (float)_DAT_00412718;
    fVar3 = _DAT_005102f4 * (float)_DAT_00412710;
    fVar4 = _DAT_005102f4 * (float)_DAT_00412708;
    fVar10 = (float)_DAT_00412700;
    fVar12 = -_DAT_005102f4;
    fVar13 = (float)_DAT_004126f8;
    fVar5 = _DAT_005102f4 * (float)_DAT_004126f0;
    fVar9 = (float)_DAT_004126e8;
    fVar6 = _DAT_005102f4 * (float)_DAT_004126e0;
    fVar8 = (float)_DAT_004126d8;
    fVar7 = _DAT_005102f4 * (float)_DAT_004126d0;
    pfVar25 = (float *)(DAT_005102f0 + 0x14);
    pfVar26 = (float *)param_1[0x18];
    do {
      _DAT_005102f8 = pfVar25[-1] * (float)_DAT_00412558;
      _DAT_005102fc = *pfVar25 * (float)_DAT_00412558;
      fVar14 = fVar1 + fVar11 + _DAT_005102f8;
      fVar15 = fVar2 + _DAT_005102fc;
      fVar15 = ((fVar15 - (float)(int)ROUND(fVar15)) + (float)((int)ROUND(fVar15) & 0x7f)) -
               _DAT_004126c8;
      fVar14 = ((fVar14 - (float)(int)ROUND(fVar14)) + (float)((int)ROUND(fVar14) & 0x7f)) -
               _DAT_004126c8;
      fVar14 = fVar15 * fVar15 + fVar14 * fVar14;
      fVar15 = _DAT_004120c8;
      if (fVar14 != 0.0) {
        fVar15 = (float)((&DAT_004b4f68)[(uint)fVar14 >> 8 & 0xffff] |
                        ((int)fVar14 + 0xc0800000U >> 1) + 0x3f800000 & 0x7f800000);
      }
      fVar14 = (float)_DAT_00412558 - fVar15 * (float)_DAT_004126c0 * (float)_DAT_004126b8;
      if (fVar14 < _DAT_004120c8) {
        fVar14 = _DAT_004120c8;
      }
      fVar14 = fVar14 * (float)_DAT_004126b0 * (float)_DAT_004124c0;
      fVar15 = (float)_DAT_00412568;
      fVar16 = fVar3 + _DAT_005102f8;
      fVar17 = (fVar4 - fVar10) + _DAT_005102fc;
      fVar17 = ((fVar17 - (float)(int)ROUND(fVar17)) + (float)((int)ROUND(fVar17) & 0x7f)) -
               _DAT_004126c8;
      fVar16 = ((fVar16 - (float)(int)ROUND(fVar16)) + (float)((int)ROUND(fVar16) & 0x7f)) -
               _DAT_004126c8;
      fVar16 = fVar17 * fVar17 + fVar16 * fVar16;
      fVar17 = _DAT_004120c8;
      if (fVar16 != 0.0) {
        fVar17 = (float)((&DAT_004b4f68)[(uint)fVar16 >> 8 & 0xffff] |
                        ((int)fVar16 + 0xc0800000U >> 1) + 0x3f800000 & 0x7f800000);
      }
      fVar16 = (float)_DAT_00412558 - fVar17 * (float)_DAT_004126c0 * (float)_DAT_004126b8;
      if (fVar16 < _DAT_004120c8) {
        fVar16 = _DAT_004120c8;
      }
      fVar16 = fVar16 * (float)_DAT_004126b0 * (float)_DAT_004124c0 + fVar14;
      fVar17 = (float)_DAT_00412568;
      fVar18 = (float)_DAT_004126a0;
      fVar19 = fVar12 * fVar13 + _DAT_005102f8;
      fVar20 = (fVar9 - fVar5) + _DAT_005102fc;
      fVar20 = ((fVar20 - (float)(int)ROUND(fVar20)) + (float)((int)ROUND(fVar20) & 0x7f)) -
               _DAT_004126c8;
      fVar19 = ((fVar19 - (float)(int)ROUND(fVar19)) + (float)((int)ROUND(fVar19) & 0x7f)) -
               _DAT_004126c8;
      fVar19 = fVar20 * fVar20 + fVar19 * fVar19;
      fVar20 = _DAT_004120c8;
      if (fVar19 != 0.0) {
        fVar20 = (float)((&DAT_004b4f68)[(uint)fVar19 >> 8 & 0xffff] |
                        ((int)fVar19 + 0xc0800000U >> 1) + 0x3f800000 & 0x7f800000);
      }
      fVar19 = (float)_DAT_00412558 - fVar20 * (float)_DAT_004126c0 * (float)_DAT_004126b8;
      if (fVar19 < _DAT_004120c8) {
        fVar19 = _DAT_004120c8;
      }
      fVar19 = fVar19 * (float)_DAT_004126b0 * (float)_DAT_004124c0 + fVar16;
      fVar20 = (float)_DAT_004126a8;
      fVar21 = (fVar8 - fVar6) + _DAT_005102f8;
      fVar22 = fVar7 + _DAT_005102fc;
      fVar22 = ((fVar22 - (float)(int)ROUND(fVar22)) + (float)((int)ROUND(fVar22) & 0x7f)) -
               _DAT_004126c8;
      fVar21 = ((fVar21 - (float)(int)ROUND(fVar21)) + (float)((int)ROUND(fVar21) & 0x7f)) -
               _DAT_004126c8;
      fVar21 = fVar22 * fVar22 + fVar21 * fVar21;
      fVar22 = _DAT_004120c8;
      if (fVar21 != 0.0) {
        fVar22 = (float)((&DAT_004b4f68)[(uint)fVar21 >> 8 & 0xffff] |
                        ((int)fVar21 + 0xc0800000U >> 1) + 0x3f800000 & 0x7f800000);
      }
      fVar21 = (float)_DAT_00412558 - fVar22 * (float)_DAT_004126c0 * (float)_DAT_004126b8;
      if (fVar21 < _DAT_004120c8) {
        fVar21 = _DAT_004120c8;
      }
      uVar27 = uVar27 - 1;
      fVar21 = fVar21 * (float)_DAT_004126b0 * (float)_DAT_004124c0 + fVar19;
      fVar22 = fVar21 * (float)_DAT_00412568;
      *pfVar26 = (fVar19 * (float)_DAT_004126a0 + fVar14 * (float)_DAT_004126a8 + fVar16 * fVar17 +
                 fVar22) * pfVar25[-5] * (float)_DAT_00412568;
      pfVar26[1] = (fVar21 * (float)_DAT_004126a0 +
                   fVar14 * fVar15 + fVar16 * fVar17 + fVar19 * fVar20) * pfVar25[-4] *
                   (float)_DAT_00412568;
      pfVar26[2] = (fVar22 + fVar16 * fVar18 + fVar14 * fVar15 + fVar19 * fVar20) * pfVar25[-3] *
                   (float)_DAT_00412568;
      pfVar25 = pfVar25 + 8;
      pfVar26 = pfVar26 + 8;
    } while (uVar27 != 0);
  }
  FUN_004022a0(param_1,DAT_00510268,3.0,'\0');
  return;
}


// ==== FUN_0040bd10 @ 0040bd10 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040bd10(void)

{
  uint uVar1;
  ushort uVar2;
  short sVar3;
  uint *puVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  undefined4 *puVar8;
  uint *puVar9;
  undefined4 *puVar10;
  uint local_2c [10];
  
  FUN_0040b630();
  local_2c[6] = 0;
  local_2c[7] = 0;
  local_2c[8] = 0;
  local_2c[3] = 0;
  local_2c[4] = 0;
  local_2c[5] = 0;
  DAT_00510268 = FUN_00402680(0.0,0.0,0.0,0.0,0.0,0.0);
  puVar4 = (uint *)FUN_00405fe6(local_2c,&DAT_0041d0e4,(uint *)0x40,(uint *)0x40,0);
  puVar9 = local_2c;
  for (iVar6 = 6; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_2c;
  puVar9 = &DAT_005102d8;
  for (iVar6 = 6; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = (uint *)FUN_0040607f(local_2c,1.0,8);
  puVar9 = local_2c;
  for (iVar6 = 6; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_2c;
  puVar9 = &DAT_00510278;
  for (iVar6 = 6; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = (uint *)FUN_0040607f(local_2c,1.0,0);
  puVar9 = local_2c;
  for (iVar6 = 6; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar4 = local_2c;
  puVar9 = &DAT_00510298;
  for (iVar6 = 6; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar4;
    puVar4 = puVar4 + 1;
    puVar9 = puVar9 + 1;
  }
  DAT_0051026c = FUN_004031b0(0xe,100.0,1.0,0);
  DAT_00510274 = 0x3fcccccd;
  DAT_005102f0 = FUN_004051c3((uint)*(ushort *)(DAT_0051026c + 0x1a) << 5);
  iVar6 = 0;
  if (*(short *)(DAT_0051026c + 0x1a) != 0) {
    iVar5 = 0;
    do {
      iVar6 = iVar6 + 1;
      puVar8 = (undefined4 *)(DAT_0051026c[0x18] + iVar5);
      puVar10 = (undefined4 *)(iVar5 + DAT_005102f0);
      for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
        *puVar10 = *puVar8;
        puVar8 = puVar8 + 1;
        puVar10 = puVar10 + 1;
      }
      iVar5 = iVar5 + 0x20;
    } while (iVar6 < (int)(uint)*(ushort *)(DAT_0051026c + 0x1a));
  }
  DAT_00510290 = FUN_00402990(*(ushort *)(DAT_0051026c + 0x1a));
  iVar6 = 0;
  if (*(short *)(DAT_0051026c + 0x1a) != 0) {
    do {
      *(undefined4 *)(DAT_00510290[0x11] + iVar6 * 4) = 0xffffffff;
      sVar3 = DAT_0041a2a6 * 0x15a;
      uVar1 = (uint)DAT_0041a2a6;
      uVar2 = (ushort)(uVar1 * 0x4e35);
      DAT_0041a2a6 = uVar2 + 1;
      DAT_0041a2a4 = (short)(uVar1 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                     (ushort)(0xfffe < uVar2);
      local_2c[9] = (int)DAT_0041a2a4 & 0x7fff;
      iVar6 = iVar6 + 1;
      *(float *)(DAT_00510290[0x12] + -4 + iVar6 * 4) =
           (float)local_2c[9] * (float)_PTR_DAT_00412478 +
           (float)local_2c[9] * (float)_PTR_DAT_00412478 + (float)_DAT_004120b0;
    } while (iVar6 < (int)(uint)*(ushort *)(DAT_0051026c + 0x1a));
  }
  FUN_0040bf50();
  return;
}


// ==== FUN_0040bf50 @ 0040bf50 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040bf50(void)

{
  DAT_00510300 = timeGetTime();
  _DAT_005102c8 = 0;
  _DAT_00510294 = timeGetTime();
  _DAT_005102f4 = 0;
  return;
}


// ==== FUN_0040bf80 @ 0040bf80 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040bf80(void)

{
  float fVar1;
  DWORD DVar2;
  int iVar3;
  float *pfVar4;
  int iVar5;
  int iVar6;
  undefined4 *puVar7;
  undefined4 *puVar8;
  int **ppiVar9;
  float *pfVar10;
  float10 fVar11;
  float afStack_3e4 [9];
  float afStack_3c0 [5];
  undefined4 uStack_3ac;
  float afStack_3a8 [9];
  int *apiStack_384 [7];
  undefined4 uStack_368;
  float local_2e8 [9];
  undefined4 local_2c4 [9];
  undefined4 local_2a0 [9];
  undefined4 local_27c [9];
  undefined4 local_258 [9];
  undefined4 local_234 [9];
  undefined4 local_210 [90];
  float local_a8 [9];
  float local_84 [9];
  float local_60 [9];
  float local_3c [9];
  float local_18;
  float local_14;
  undefined4 local_10;
  float local_c;
  float local_8;
  
  DVar2 = timeGetTime();
  local_8 = (float)(DVar2 - DAT_00510300);
  _DAT_00510270 = (float)(int)local_8 * (float)_DAT_00412770;
  if (DAT_00510304 == '\0') {
    DVar2 = timeGetTime();
    local_8 = (float)(int)(DVar2 - _DAT_00510294) * (float)_DAT_00412768;
    fVar11 = (float10)fsin((float10)local_8);
    local_c = (float)fVar11;
    _DAT_005102f4 = local_c * (float)_DAT_00412760 + _DAT_005102f4 + (float)_DAT_004123e8;
  }
  DVar2 = timeGetTime();
  local_c = (float)(DVar2 - _DAT_00510294);
  _DAT_005102cc = (float)(int)local_c * (float)_DAT_00412698 + _DAT_005102cc;
  DVar2 = timeGetTime();
  local_c = (float)(DVar2 - _DAT_00510294);
  _DAT_005102d0 = (float)(int)local_c * (float)_DAT_00412698 + _DAT_005102d0;
  _DAT_00510294 = timeGetTime();
  local_c = _DAT_00510270 * _DAT_004124f0;
  local_8 = (float)(int)ROUND(local_c);
  DAT_00510304 = 0x5f < (SUB41(local_8,0) & 0x7f);
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x5102d8);
  FUN_0040484a('\x01','\x02');
  DAT_00510268[0x16] = _DAT_005101bc * _DAT_00412758 + _DAT_004124b8;
  fVar11 = (float10)fsin((float10)(_DAT_005102cc * (float)_DAT_004125a0));
  DAT_00510268[0x17] = (float)fVar11;
  DAT_00510268[0x13] = 0.0;
  DAT_00510268[0x14] = 0.0;
  DAT_00510268[0x15] = 0.0;
  fVar11 = (float10)fcos((float10)(_DAT_005102cc * (float)_DAT_00412750));
  DAT_00510268[0x10] = (float)fVar11 * _DAT_00412748;
  DAT_00510268[0x11] = 0.0;
  local_c = _DAT_005102cc * (float)_DAT_00412740;
  fVar11 = (float10)fsin((float10)local_c);
  local_8 = (float)fVar11;
  DAT_00510268[0x12] = local_8 * _DAT_00412748;
  FUN_00402760(DAT_00510268);
  local_18 = _DAT_005102cc;
  local_10 = 0;
  local_14 = _DAT_005102d0;
  FUN_00402230(DAT_0051026c,_DAT_005102cc,_DAT_005102d0,0.0);
  FUN_0040b780(DAT_0051026c);
  iVar6 = 0;
  if (*(short *)(DAT_0051026c + 0x1a) != 0) {
    iVar5 = 0;
    iVar3 = 0;
    do {
      iVar6 = iVar6 + 1;
      iVar5 = iVar5 + 0xc;
      puVar7 = (undefined4 *)((int)DAT_0051026c[0x18] + iVar3);
      iVar3 = iVar3 + 0x20;
      *(undefined4 *)((int)DAT_00510290[0x10] + -0xc + iVar5) = *puVar7;
      *(undefined4 *)((int)DAT_00510290[0x10] + -8 + iVar5) =
           *(undefined4 *)((int)DAT_0051026c[0x18] + -0x1c + iVar3);
      *(undefined4 *)((int)DAT_00510290[0x10] + -4 + iVar5) =
           *(undefined4 *)((int)DAT_0051026c[0x18] + -0x18 + iVar3);
    } while (iVar6 < (int)(uint)*(ushort *)(DAT_0051026c + 0x1a));
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040484a('\x03','\0');
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_00402180(DAT_0051026c);
  pfVar4 = DAT_0051026c;
  pfVar10 = DAT_00510290;
  for (iVar6 = 0x10; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar10 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar10 = pfVar10 + 1;
  }
  FUN_0040484a('\x03','\0');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x510298);
  FUN_00402a60();
  FUN_0040484a('\x05','\0');
  uStack_368 = 0x40c2e6;
  FUN_0040406d(0);
  pfVar4 = local_2e8 + 3;
  iVar6 = 0x10;
  do {
    pfVar4[-1] = 0.01;
    *pfVar4 = 100.0;
    pfVar4[1] = -NAN;
    pfVar4[2] = 0.0;
    pfVar4[3] = 0.0;
    pfVar4 = pfVar4 + 9;
    iVar6 = iVar6 + -1;
  } while (iVar6 != 0);
  local_2e8[0] = 633.0;
  local_2e8[1] = 314.0;
  local_2c4[0] = 0x44078000;
  local_2c4[1] = 0x439d0000;
  local_2a0[0] = 0x44010000;
  local_2a0[1] = 0x43aa0000;
  local_27c[0] = 0x42580000;
  local_27c[1] = 0x43aa0000;
  local_258[0] = 0x41e00000;
  local_258[1] = 0x43b70000;
  local_8 = _DAT_005101bc * _DAT_00412580 + _DAT_004124f0;
  local_234[0] = 0x41e00000;
  local_234[1] = 0x43d10000;
  local_210[0] = 0x441e4000;
  local_210[1] = 0x43d10000;
  iVar6 = 0x10;
  pfVar4 = local_2e8 + 1;
  do {
    iVar6 = iVar6 + -1;
    *pfVar4 = local_8 + *pfVar4;
    pfVar4 = pfVar4 + 9;
  } while (iVar6 != 0);
  puVar7 = local_210;
  puVar8 = (undefined4 *)&stack0xfffffca0;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_2c4;
  ppiVar9 = apiStack_384;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  pfVar4 = local_2e8;
  pfVar10 = afStack_3a8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar10 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar10 = pfVar10 + 1;
  }
  uStack_3ac = 0x40c40b;
  FUN_004049f5();
  puVar7 = local_210;
  puVar8 = (undefined4 *)&stack0xfffffca0;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_2a0;
  ppiVar9 = apiStack_384;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_2c4;
  pfVar4 = afStack_3a8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  uStack_3ac = 0x40c446;
  FUN_004049f5();
  puVar7 = local_210;
  puVar8 = (undefined4 *)&stack0xfffffca0;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_27c;
  ppiVar9 = apiStack_384;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_2a0;
  pfVar4 = afStack_3a8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  uStack_3ac = 0x40c481;
  FUN_004049f5();
  puVar7 = local_210;
  puVar8 = (undefined4 *)&stack0xfffffca0;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_258;
  ppiVar9 = apiStack_384;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_27c;
  pfVar4 = afStack_3a8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  uStack_3ac = 0x40c4bc;
  FUN_004049f5();
  puVar7 = local_210;
  puVar8 = (undefined4 *)&stack0xfffffca0;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_234;
  ppiVar9 = apiStack_384;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppiVar9 = (int *)*puVar7;
    puVar7 = puVar7 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  puVar7 = local_258;
  pfVar4 = afStack_3a8;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  uStack_3ac = 0x40c4f7;
  FUN_004049f5();
  FUN_00404e70(s_we_lost_our_explosive_0042137c,0x44070000,local_8 + _DAT_00412738,192.0);
  FUN_00404e70(s_please_return_it_00421368,0x44070000,local_8 + _DAT_00412734,128.0);
  FUN_00404e70(s_parnassiaveld_____00421354,0x44070000,local_8 + _DAT_00412550,64.0);
  FUN_00404e70(s_amsterdam_00421348,0x44070000,local_8 + _DAT_00412730,64.0);
  FUN_0040406d(0x5102b0);
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  local_84[1] = local_8 + _DAT_004123d8;
  fVar1 = local_8 + _DAT_004125e4;
  local_84[0] = 550.0;
  local_84[2] = 0.01;
  local_84[3] = 100.0;
  local_84[4] = -NAN;
  local_84[5] = 0.0;
  local_8 = fVar1;
  local_84[6] = 0.0;
  local_60[0] = 621.0;
  local_60[1] = local_84[1];
  local_60[2] = 0.01;
  local_60[3] = 100.0;
  local_60[4] = -NAN;
  local_60[5] = 0.28125;
  local_60[6] = 0.0;
  local_a8[0] = 621.0;
  local_3c[1] = fVar1;
  local_3c[0] = 550.0;
  local_3c[2] = 0.01;
  local_3c[3] = 100.0;
  local_3c[4] = -NAN;
  local_3c[5] = 0.0;
  local_3c[6] = 0.3671875;
  pfVar4 = local_3c;
  ppiVar9 = apiStack_384 + 3;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *ppiVar9 = (int *)*pfVar4;
    pfVar4 = pfVar4 + 1;
    ppiVar9 = ppiVar9 + 1;
  }
  local_a8[1] = fVar1;
  local_a8[2] = 0.01;
  local_a8[3] = 100.0;
  local_a8[4] = -NAN;
  local_a8[5] = 0.28125;
  local_a8[6] = 0.3671875;
  pfVar4 = local_a8;
  pfVar10 = afStack_3a8 + 3;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar10 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar10 = pfVar10 + 1;
  }
  pfVar4 = local_60;
  pfVar10 = afStack_3c0;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar10 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar10 = pfVar10 + 1;
  }
  pfVar4 = local_84;
  pfVar10 = afStack_3e4;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *pfVar10 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar10 = pfVar10 + 1;
  }
  FUN_00404a3f();
  FUN_0040484a('\x05','\0');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  uStack_368 = 0xe;
  apiStack_384[6] = *(int **)(DAT_004b4eb8 + 0xc);
  apiStack_384[5] = (int *)0x40c725;
  (**(code **)(*apiStack_384[6] + 0x50))();
  return;
}


// ==== FUN_0040c730 @ 0040c730 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040c730(void)

{
  undefined4 *puVar1;
  undefined2 *puVar2;
  uint uVar3;
  ushort uVar4;
  short sVar5;
  uint *puVar6;
  int iVar7;
  uint *puVar8;
  int iVar9;
  uint local_2c [10];
  
  local_2c[6] = 0;
  local_2c[7] = 0;
  local_2c[8] = 0;
  local_2c[3] = 0;
  local_2c[4] = 0;
  local_2c[5] = 0;
  DAT_00510308 = FUN_00402680(0.0,0.0,0.0,0.0,0.0,0.0);
  puVar6 = (uint *)FUN_00405fe6(local_2c,&DAT_0041d0e4,(uint *)0x40,(uint *)0x40,0);
  puVar8 = local_2c;
  for (iVar7 = 6; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar8 = *puVar6;
    puVar6 = puVar6 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar6 = local_2c;
  puVar8 = &DAT_00510320;
  for (iVar7 = 6; iVar7 != 0; iVar7 = iVar7 + -1) {
    *puVar8 = *puVar6;
    puVar6 = puVar6 + 1;
    puVar8 = puVar8 + 1;
  }
  DAT_0051030c = FUN_00402040(3,1);
  *(byte *)(DAT_0051030c + 0x17) = *(byte *)(DAT_0051030c + 0x17) | 1;
  puVar1 = (undefined4 *)DAT_0051030c[0x18];
  puVar2 = (undefined2 *)DAT_0051030c[0x1b];
  *puVar1 = 0xc1c80000;
  puVar1[1] = 0xc1c80000;
  puVar1[2] = 0;
  puVar1[4] = 0;
  puVar1[5] = 0;
  puVar1[3] = 0x7fffffff;
  puVar1[8] = 0;
  puVar1[9] = 0x41c80000;
  puVar1[10] = 0;
  puVar1[0xc] = 0x3f000000;
  puVar1[0xd] = 0x3f800000;
  puVar1[0xb] = 0x7fffffff;
  puVar1[0x10] = 0x41c80000;
  puVar1[0x11] = 0xc1c80000;
  puVar1[0x12] = 0;
  puVar1[0x14] = 0x3f800000;
  puVar1[0x15] = 0;
  puVar1[0x13] = 0x7fffffff;
  *puVar2 = 0;
  puVar2[1] = 1;
  puVar2[2] = 2;
  DAT_00510318 = FUN_004051c3(0x3000);
  DAT_00510314 = FUN_004051c3(0x3000);
  DAT_0051031c = FUN_004051c3(0x3000);
  iVar7 = 0;
  do {
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + DAT_00510318) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_00412780 -
         (float)_DAT_00412720;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + 4 + DAT_00510318) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_00412780 -
         (float)_DAT_00412720;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + 8 + DAT_00510318) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_00412778;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + DAT_00510314) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_004120a8;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + 4 + DAT_00510314) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_004120a8;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + 8 + DAT_00510314) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_004120a8;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + DAT_0051031c) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_00412508;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    *(float *)(iVar7 + 4 + DAT_0051031c) =
         (float)((int)DAT_0041a2a4 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_00412508;
    sVar5 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar4 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar4 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar5 +
                   (ushort)(0xfffe < uVar4);
    local_2c[9] = (int)DAT_0041a2a4 & 0x7fff;
    iVar9 = iVar7 + 0xc;
    *(float *)(iVar7 + 8 + DAT_0051031c) =
         (float)local_2c[9] * (float)_PTR_DAT_00412478 * (float)_DAT_00412508;
    iVar7 = iVar9;
  } while (iVar9 < 0x3000);
  FUN_0040ccd0();
  return;
}


// ==== FUN_0040ccd0 @ 0040ccd0 ====

void FUN_0040ccd0(void)

{
  DAT_00510338 = timeGetTime();
  return;
}


// ==== FUN_0040cce0 @ 0040cce0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040cce0(void)

{
  float fVar1;
  DWORD DVar2;
  uint uVar3;
  float *pfVar4;
  int iVar5;
  float *pfVar6;
  undefined4 *puVar7;
  undefined4 *puVar8;
  float10 fVar9;
  float afStackY_354 [6];
  undefined4 uStackY_33c;
  float local_2ac [9];
  undefined4 local_288 [9];
  undefined4 local_264 [9];
  undefined4 local_240 [9];
  undefined4 local_21c [9];
  undefined4 local_1f8 [9];
  undefined4 local_1d4 [9];
  undefined4 local_1b0 [9];
  undefined4 local_18c [9];
  undefined4 local_168 [9];
  undefined4 local_144 [9];
  undefined4 local_120 [9];
  undefined4 local_fc [9];
  undefined4 local_d8 [9];
  undefined4 local_b4 [9];
  undefined4 local_90 [9];
  float local_6c [17];
  float local_28;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  char local_6 [2];
  
  DVar2 = timeGetTime();
  local_c = (float)(DVar2 - DAT_00510338);
  DAT_004b4f64 = 0xff7dafc8;
  DAT_0041a2a8 = 0xff7dafc8;
  DAT_0041a2ac = 0x3c23d70a;
  _DAT_00510310 = (float)(int)local_c * (float)_DAT_004125b0;
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x510320);
  DAT_00510308[0x16] = 120.0;
  fVar9 = (float10)fsin((float10)(_DAT_00510310 * (float)_DAT_004125a0));
  DAT_00510308[0x17] = (float)fVar9;
  fVar9 = (float10)fsin((float10)(_DAT_00510310 * (float)_DAT_004127e8));
  DAT_00510308[0x10] = (float)fVar9 * _DAT_00412458;
  fVar9 = (float10)fcos((float10)(_DAT_00510310 * (float)_DAT_004127e0));
  DAT_00510308[0x11] = (float)fVar9 * _DAT_00412458;
  DAT_00510308[0x12] = 80.0;
  fVar9 = (float10)fsin((float10)(_DAT_00510310 * (float)_DAT_004127d8));
  DAT_00510308[0x13] = (float)fVar9 * _DAT_00412548;
  local_10 = _DAT_00510310 * (float)_DAT_004127d0;
  fVar9 = (float10)fsin((float10)local_10);
  local_c = (float)fVar9;
  DAT_00510308[0x14] = local_c * _DAT_00412548;
  DAT_00510308[0x15] = 511.0;
  FUN_00402760(DAT_00510308);
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  FUN_0040484a('\x03','\0');
  puVar7 = (undefined4 *)(DAT_00510318 + 4);
  pfVar4 = (float *)(DAT_0051031c + 8);
  local_c = 1.43493e-42;
  pfVar6 = DAT_00510314;
  do {
    local_28 = _DAT_00510310 * (float)_DAT_004127c0;
    local_24 = _DAT_00510310 * (float)_DAT_004127b8;
    local_20 = _DAT_00510310 * (float)_DAT_004127c8 + pfVar4[-2];
    local_1c = local_28 + pfVar4[-1];
    local_18 = local_24 + *pfVar4;
    FUN_004017f0(local_6c,local_20,local_1c,local_18);
    **(float **)(DAT_0051030c + 0x60) = *pfVar6 * _DAT_004127b0;
    *(float *)(*(int *)(DAT_0051030c + 0x60) + 0x40) = *pfVar6 * _DAT_004127ac;
    *(float *)(*(int *)(DAT_0051030c + 0x60) + 0x44) = pfVar6[1] * _DAT_004127b0;
    *(undefined4 *)(*(int *)(DAT_0051030c + 0x60) + 4) =
         *(undefined4 *)(*(int *)(DAT_0051030c + 0x60) + 0x44);
    *(float *)(*(int *)(DAT_0051030c + 0x60) + 0x24) = pfVar6[1] * _DAT_004127ac;
    local_14 = (float)(int)ROUND((float)puVar7[1] - _DAT_00510310 * _DAT_004127a8);
    local_10 = (float)((uint)local_14 & 0x1ff);
    uVar3 = (-1 - ((int)local_10 >> 1)) * 0x1000000 | 0xffffff;
    *(uint *)(*(int *)(DAT_0051030c + 0x60) + 0x4c) = uVar3;
    *(uint *)(*(int *)(DAT_0051030c + 0x60) + 0x2c) = uVar3;
    *(uint *)(*(int *)(DAT_0051030c + 0x60) + 0xc) = uVar3;
    FUN_00401a50((int)local_6c,puVar7[-1],*puVar7,(float)(int)local_10);
    (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x2c))();
    (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 100))();
    puVar7 = puVar7 + 3;
    pfVar6 = pfVar6 + 3;
    pfVar4 = pfVar4 + 3;
    local_c = (float)((int)local_c + -1);
  } while (local_c != 0.0);
  FUN_0040406d(0);
  FUN_0040484a('\x05','\0');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  DVar2 = timeGetTime();
  local_14 = (float)(DVar2 - DAT_00510338);
  local_c = (float)_DAT_00412780 - (float)(int)(DVar2 - DAT_00510338) * (float)_DAT_004127a0;
  if (local_c < _DAT_004120c8) {
    local_c = 0.0;
  }
  pfVar4 = local_2ac + 3;
  iVar5 = 0x10;
  do {
    pfVar4[-1] = 0.01;
    *pfVar4 = 100.0;
    pfVar4[1] = -NAN;
    pfVar4[2] = 0.0;
    pfVar4[3] = 0.0;
    pfVar4 = pfVar4 + 9;
    iVar5 = iVar5 + -1;
  } while (iVar5 != 0);
  local_2ac[0] = 115.0;
  local_2ac[1] = 368.0;
  local_288[0] = 0x42e60000;
  local_288[1] = 0x43900000;
  local_264[0] = 0x43660000;
  local_264[1] = 0x43900000;
  local_240[0] = 0x43760000;
  local_240[1] = 0x43a00000;
  local_21c[0] = 0x43bc8000;
  local_21c[1] = 0x43a00000;
  local_1f8[0] = 0x43c30000;
  local_1f8[1] = 0x43900000;
  local_1d4[0] = 0x43ee8000;
  local_1d4[1] = 0x43900000;
  local_1b0[0] = 0x43ee8000;
  local_1b0[1] = 0x43898000;
  local_18c[0] = 0x441dc000;
  local_18c[1] = 0x43898000;
  local_168[0] = 0x441dc000;
  local_168[1] = 0x43cb8000;
  local_144[0] = 0x43ee8000;
  local_144[1] = 0x43cb8000;
  local_120[0] = 0x43ee8000;
  local_120[1] = 0x43b90000;
  local_fc[0] = 0x43be0000;
  local_fc[1] = 0x43b90000;
  local_d8[0] = 0x43b80000;
  local_d8[1] = 0x43c40000;
  local_b4[0] = 0x437e0000;
  local_b4[1] = 0x43c40000;
  local_90[0] = 0x43720000;
  local_90[1] = 0x43b80000;
  iVar5 = 0x10;
  pfVar4 = local_2ac + 1;
  do {
    iVar5 = iVar5 + -1;
    *pfVar4 = local_c + *pfVar4 + _DAT_00412448;
    pfVar4 = pfVar4 + 9;
  } while (iVar5 != 0);
  puVar7 = local_264;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_288;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  pfVar4 = local_2ac;
  pfVar6 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar6 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar6 = pfVar6 + 1;
  }
  FUN_004049f5();
  puVar7 = local_90;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_264;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  pfVar4 = local_2ac;
  pfVar6 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar6 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar6 = pfVar6 + 1;
  }
  FUN_004049f5();
  puVar7 = local_90;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_240;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_264;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_21c;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_240;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_90;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_d8;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_90;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_21c;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_b4;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_d8;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_90;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_fc;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_d8;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_21c;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_21c;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_1f8;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_fc;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_fc;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_1d4;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_1f8;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_120;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_fc;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_1d4;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_18c;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_120;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_1b0;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_168;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_120;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_18c;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  puVar7 = local_144;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_168;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_120;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  local_2ac[0] = 448.0;
  local_2ac[1] = 373.0;
  local_288[0] = 0x43ed0000;
  local_288[1] = 0x43ba8000;
  local_264[0] = 0x43ed0000;
  local_264[1] = 0x43c78000;
  local_240[0] = 0x43e00000;
  local_240[1] = 0x43c78000;
  iVar5 = 0x10;
  pfVar4 = local_2ac + 1;
  do {
    iVar5 = iVar5 + -1;
    *pfVar4 = local_c + *pfVar4 + _DAT_00412448;
    pfVar4 = pfVar4 + 9;
  } while (iVar5 != 0);
  puVar7 = local_264;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_288;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  pfVar4 = local_2ac;
  pfVar6 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar6 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar6 = pfVar6 + 1;
  }
  FUN_004049f5();
  pfVar4 = local_2ac;
  pfVar6 = (float *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar6 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar6 = pfVar6 + 1;
  }
  puVar7 = local_240;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_264;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  local_2ac[0] = 471.0;
  local_2ac[1] = 404.0;
  local_288[0] = 0x43ee8000;
  local_288[1] = 0x43ca0000;
  local_264[0] = 0x43ee8000;
  local_264[1] = 0x43cb8000;
  local_240[0] = 0x43eb8000;
  local_240[1] = 0x43cb8000;
  iVar5 = 0x10;
  pfVar4 = local_2ac + 1;
  do {
    iVar5 = iVar5 + -1;
    *pfVar4 = local_c + *pfVar4 + _DAT_00412448;
    pfVar4 = pfVar4 + 9;
  } while (iVar5 != 0);
  puVar7 = local_264;
  puVar8 = (undefined4 *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_288;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  pfVar4 = local_2ac;
  pfVar6 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar6 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar6 = pfVar6 + 1;
  }
  FUN_004049f5();
  pfVar4 = local_2ac;
  pfVar6 = (float *)&stack0xfffffcf4;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar6 = *pfVar4;
    pfVar4 = pfVar4 + 1;
    pfVar6 = pfVar6 + 1;
  }
  puVar7 = local_240;
  puVar8 = (undefined4 *)&stack0xfffffcd0;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar8 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar7 = local_264;
  pfVar4 = afStackY_354;
  for (iVar5 = 9; iVar5 != 0; iVar5 = iVar5 + -1) {
    *pfVar4 = (float)*puVar7;
    puVar7 = puVar7 + 1;
    pfVar4 = pfVar4 + 1;
  }
  FUN_004049f5();
  FUN_00404f10();
  FUN_00404f10();
  FUN_00404f10();
  FUN_00404f10();
  DVar2 = timeGetTime();
  iVar5 = (int)ROUND((float)(int)(DVar2 - DAT_00510338) * (float)_DAT_00412570);
  local_6[1] = 0;
  fVar1 = local_c + _DAT_00412788;
  local_6[0] = (char)((iVar5 / 1000) % 10) + '0';
  local_14 = fVar1;
  local_10 = (float)iVar5;
  FUN_00404e70(local_6,0x4400c000,fVar1,256.0);
  local_6[0] = (char)((iVar5 / 100) % 10) + '0';
  FUN_00404e70(local_6,0x44084000,fVar1,256.0);
  local_6[0] = (char)((iVar5 / 10) % 10) + '0';
  uStackY_33c = 0x40d856;
  FUN_00404e70(local_6,0x440fc000,fVar1,256.0);
  local_6[0] = (char)(iVar5 % 10) + '0';
  FUN_00404e70(local_6,0x44174000,fVar1,256.0);
  return;
}


// ==== FUN_0040d890 @ 0040d890 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040d890(float *param_1,int param_2)

{
  ushort uVar1;
  int iVar2;
  short sVar3;
  float fVar4;
  float *pfVar5;
  uint uVar6;
  int iVar7;
  float *pfVar8;
  float fVar9;
  float fVar10;
  float local_94 [16];
  float local_54;
  undefined4 local_50;
  undefined4 local_4c;
  undefined4 local_48;
  float local_44;
  float local_40;
  undefined4 local_3c;
  undefined4 local_38;
  undefined4 local_34;
  float local_30;
  float local_2c;
  undefined4 local_28;
  undefined4 local_24;
  undefined4 local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  int local_8;
  
  local_8 = param_2 + 1;
  do {
    while( true ) {
      fVar4 = param_1[0x16];
      if (fVar4 != 0.0) break;
      FUN_00401a10(param_1 + 3);
      local_3c = 0;
      local_38 = 0x42a00000;
      local_34 = 0;
      *param_1 = 0.0;
      param_1[0x13] = 1.0;
      param_1[1] = 80.0;
      param_1[2] = 0.0;
      sVar3 = DAT_0041a2a6 * 0x15a;
      uVar6 = (uint)DAT_0041a2a6;
      uVar1 = (ushort)(uVar6 * 0x4e35);
      DAT_0041a2a6 = uVar1 + 1;
      DAT_0041a2a4 = (short)(uVar6 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                     (ushort)(0xfffe < uVar1);
      param_1[0x1b] = (float)((int)(short)DAT_0041a2a4 & 0x1f);
      fVar4 = (float)FUN_004051c3(0x70);
      iVar2 = local_8;
      param_1[0x17] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      FUN_0040d890((float *)param_1[0x17],local_8);
      fVar4 = (float)FUN_004051c3(0x70);
      param_1[0x18] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      FUN_0040d890((float *)param_1[0x18],iVar2);
      fVar4 = (float)FUN_004051c3(0x70);
      param_1[0x19] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      FUN_0040d890((float *)param_1[0x19],iVar2);
      fVar4 = (float)FUN_004051c3(0x70);
      param_1[0x1a] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      param_1 = (float *)param_1[0x1a];
      local_8 = iVar2 + 1;
    }
    if (param_1 == *(float **)((int)fVar4 + 0x5c)) {
      local_c = -1.0;
      param_2 = 0x1000000;
    }
    if (param_1 == *(float **)((int)fVar4 + 0x60)) {
      local_c = 1.0;
      param_2 = 0x1000000;
    }
    if (param_1 == *(float **)((int)fVar4 + 100)) {
      local_c = -1.0;
      param_2 = 0;
    }
    if (param_1 == *(float **)((int)fVar4 + 0x68)) {
      local_c = 1.0;
      param_2 = 0;
LAB_0040d9fd:
      local_50 = 0x3e4ccccd;
      fVar9 = -(_DAT_005106b8 * local_c);
      local_4c = 0;
      fVar4 = 0.2;
      fVar10 = 0.0;
      local_54 = fVar9;
    }
    else {
      if (param_2._3_1_ == '\0') goto LAB_0040d9fd;
      local_24 = 0;
      local_20 = 0;
      fVar4 = 0.0;
      fVar10 = -(_DAT_005106b8 * local_c);
      fVar9 = 0.0;
      local_1c = fVar10;
    }
    pfVar8 = param_1 + 3;
    FUN_004017f0(pfVar8,fVar9,fVar4,fVar10);
    pfVar5 = (float *)FUN_004015f0(local_94,(float *)((int)param_1[0x16] + 0xc),pfVar8);
    iVar2 = local_8;
    for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
      *pfVar8 = *pfVar5;
      pfVar5 = pfVar5 + 1;
      pfVar8 = pfVar8 + 1;
    }
    if (param_2._3_1_ == '\0') {
      local_48 = 0;
      pfVar5 = (float *)param_1[0x16];
      local_18 = 0.0;
      local_44 = pfVar5[0x13] * _DAT_00412630;
      local_40 = local_c * pfVar5[0x13] * _DAT_004127f8;
      local_14 = local_44;
      local_10 = local_40;
    }
    else {
      local_28 = 0;
      pfVar5 = (float *)param_1[0x16];
      local_30 = local_c * pfVar5[0x13] * _DAT_00412458;
      local_2c = pfVar5[0x13] * _DAT_00412630;
      local_10 = 0.0;
      local_18 = local_30;
      local_14 = local_2c;
    }
    *param_1 = local_18 * pfVar5[3] + local_14 * pfVar5[7] + local_10 * pfVar5[0xb];
    param_1[1] = local_18 * pfVar5[4] + local_14 * pfVar5[8] + local_10 * pfVar5[0xc];
    param_1[2] = local_18 * pfVar5[5] + local_14 * pfVar5[9] + local_10 * pfVar5[0xd];
    *param_1 = *pfVar5 + *param_1;
    param_1[1] = pfVar5[1] + param_1[1];
    param_1[2] = pfVar5[2] + param_1[2];
    param_1[0x13] = pfVar5[0x13] * (float)_DAT_004127f0;
    sVar3 = DAT_0041a2a6 * 0x15a;
    uVar6 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar6 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar6 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                   (ushort)(0xfffe < uVar1);
    uVar6 = (uint)(short)DAT_0041a2a4;
    param_1[0x17] = 0.0;
    param_1[0x1b] = (float)(uVar6 & 0x1f);
    param_1[0x18] = 0.0;
    param_1[0x19] = 0.0;
    param_1[0x1a] = 0.0;
    sVar3 = DAT_0041a2a6 * 0x15a;
    uVar6 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar6 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar6 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                   (ushort)(0xfffe < uVar1);
    if (((DAT_0041a2a4 & 0x7fff) < 25000) && (local_8 < 7)) {
      fVar4 = (float)FUN_004051c3(0x70);
      param_1[0x17] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      FUN_0040d890((float *)param_1[0x17],iVar2);
    }
    iVar2 = local_8;
    sVar3 = DAT_0041a2a6 * 0x15a;
    uVar6 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar6 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar6 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                   (ushort)(0xfffe < uVar1);
    if (((DAT_0041a2a4 & 0x7fff) < 25000) && (local_8 < 7)) {
      fVar4 = (float)FUN_004051c3(0x70);
      param_1[0x18] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      FUN_0040d890((float *)param_1[0x18],iVar2);
    }
    iVar2 = local_8;
    sVar3 = DAT_0041a2a6 * 0x15a;
    uVar6 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar6 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar6 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                   (ushort)(0xfffe < uVar1);
    if (((DAT_0041a2a4 & 0x7fff) < 25000) && (local_8 < 7)) {
      fVar4 = (float)FUN_004051c3(0x70);
      param_1[0x19] = fVar4;
      *(float **)((int)fVar4 + 0x58) = param_1;
      FUN_0040d890((float *)param_1[0x19],iVar2);
    }
    sVar3 = DAT_0041a2a6 * 0x15a;
    uVar6 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar6 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar6 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar3 +
                   (ushort)(0xfffe < uVar1);
    if ((24999 < (DAT_0041a2a4 & 0x7fff)) || (6 < local_8)) {
      return;
    }
    fVar4 = (float)FUN_004051c3(0x70);
    param_1[0x1a] = fVar4;
    *(float **)((int)fVar4 + 0x58) = param_1;
    local_8 = local_8 + 1;
    param_1 = (float *)param_1[0x1a];
  } while( true );
}


// ==== FUN_0040de40 @ 0040de40 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040de40(int param_1)

{
  ushort uVar1;
  short sVar2;
  uint uVar3;
  
  if (param_1 != 0) {
    if (*(int *)(param_1 + 0x5c) != 0) {
      FUN_0040de40(*(int *)(param_1 + 0x5c));
    }
    if (*(int *)(param_1 + 0x60) != 0) {
      FUN_0040de40(*(int *)(param_1 + 0x60));
    }
    if (*(int *)(param_1 + 100) != 0) {
      FUN_0040de40(*(int *)(param_1 + 100));
    }
    if (*(int *)(param_1 + 0x68) != 0) {
      FUN_0040de40(*(int *)(param_1 + 0x68));
    }
    *(undefined4 *)(param_1 + 0x50) = *(undefined4 *)(param_1 + 0x4c);
    sVar2 = DAT_0041a2a6 * 0x15a;
    uVar3 = (uint)DAT_0041a2a6;
    uVar1 = (ushort)(uVar3 * 0x4e35);
    DAT_0041a2a6 = uVar1 + 1;
    DAT_0041a2a4 = (short)(uVar3 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar2 +
                   (ushort)(0xfffe < uVar1);
    uVar3 = (uint)DAT_0041a2a4;
    *(undefined4 *)(param_1 + 0x4c) = 0;
    *(float *)(param_1 + 0x54) =
         (float)(uVar3 & 0x7fff) * (float)_PTR_DAT_00412478 * (float)_DAT_004123e8 +
         (float)_DAT_00412760;
  }
  return;
}


// ==== FUN_0040df20 @ 0040df20 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040df20(int param_1)

{
  float fVar1;
  
  if (param_1 != 0) {
    while (*(float *)(param_1 + 0x50) <= *(float *)(param_1 + 0x4c)) {
      FUN_0040df20(*(int *)(param_1 + 0x5c));
      FUN_0040df20(*(int *)(param_1 + 0x60));
      FUN_0040df20(*(int *)(param_1 + 100));
      param_1 = *(int *)(param_1 + 0x68);
      if (param_1 == 0) {
        return;
      }
    }
    fVar1 = *(float *)(param_1 + 0x54) * *(float *)(param_1 + 0x50) * _DAT_0051034c +
            *(float *)(param_1 + 0x4c);
    *(float *)(param_1 + 0x4c) = fVar1;
    if (*(float *)(param_1 + 0x50) < fVar1) {
      *(undefined4 *)(param_1 + 0x4c) = *(undefined4 *)(param_1 + 0x50);
    }
  }
  return;
}


// ==== FUN_0040df90 @ 0040df90 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040df90(void)

{
  int iVar1;
  int iVar2;
  undefined2 *puVar3;
  ushort uVar4;
  float fVar5;
  short sVar6;
  short sVar7;
  int iVar8;
  uint *puVar9;
  undefined4 *puVar10;
  undefined4 uVar11;
  uint uVar12;
  short sVar13;
  float *pfVar14;
  undefined4 *puVar15;
  undefined4 local_5c [9];
  undefined4 local_38;
  undefined4 local_34;
  undefined4 local_30;
  uint local_2c;
  float local_28;
  undefined4 *local_24;
  uint local_20;
  int local_1c;
  uint local_18;
  uint *local_14;
  int local_10;
  uint *local_c;
  int local_8;
  
  local_38 = 0;
  local_34 = 0x43160000;
  local_30 = 0;
  local_5c[3] = 0x438c0000;
  local_5c[4] = 0x41a00000;
  local_5c[5] = 0;
  DAT_00510340 = FUN_00402680(280.0,20.0,0.0,0.0,150.0,0.0);
  local_14 = (uint *)FUN_004051c3(0x4000);
  local_8 = 0;
  local_24 = &DAT_00510398;
  do {
    iVar8 = s_threestate__in___lost___vegas___004215e8[local_8] + -0x61;
    if (s_threestate__in___lost___vegas___004215e8[local_8] != '*') {
      local_28 = (float)(uint)(byte)(&DAT_0041b639)[iVar8 * 4];
      local_2c = (uint)(byte)(&DAT_0041b638)[iVar8 * 4];
      local_1c = (byte)(&DAT_0041b63a)[iVar8 * 4] - local_2c;
      local_20 = (uint)(byte)(&DAT_0041b63b)[iVar8 * 4] - (int)local_28;
    }
    local_10 = 0;
    puVar9 = local_14 + 0xfff;
    do {
      iVar8 = 0;
      local_c = puVar9;
      do {
        sVar7 = DAT_0041a2a6 * 0x15a;
        uVar12 = (uint)DAT_0041a2a6;
        uVar4 = (ushort)(uVar12 * 0x4e35);
        DAT_0041a2a6 = uVar4 + 1;
        DAT_0041a2a4 = (short)(uVar12 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar7 +
                       (ushort)(0xfffe < uVar4);
        local_18 = (int)DAT_0041a2a4 & 0x7fff;
        uVar12 = 0;
        if (s_threestate__in___lost___vegas___004215e8[local_8] != '*') {
          iVar1 = local_1c / 2 + -0x20 + iVar8;
          iVar2 = (int)local_20 / 2 + -0x20 + local_10;
          if ((((-1 < iVar1) && (iVar1 < local_1c)) && (-1 < iVar2)) && (iVar2 < (int)local_20)) {
            uVar12 = *(uint *)(DAT_004f4f68 +
                              ((iVar2 + (int)local_28) * 0x100 + iVar1 + local_2c) * 4) >> 0x18;
          }
        }
        uVar12 = uVar12 + ((int)DAT_0041a2a4 & 0x3fU);
        if (0xff < uVar12) {
          uVar12 = 0xff;
        }
        puVar9 = local_c + -1;
        iVar8 = iVar8 + 1;
        *local_c = uVar12 * 0x1010101;
        local_c = puVar9;
      } while (iVar8 < 0x40);
      local_10 = local_10 + 1;
    } while (local_10 < 0x40);
    puVar10 = (undefined4 *)FUN_00403bd6(local_5c + 6,local_14,(uint *)0x40,(uint *)0x40,0);
    puVar15 = local_5c;
    for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
      *puVar15 = *puVar10;
      puVar10 = puVar10 + 1;
      puVar15 = puVar15 + 1;
    }
    puVar10 = local_5c;
    puVar15 = local_24;
    for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
      *puVar15 = *puVar10;
      puVar10 = puVar10 + 1;
      puVar15 = puVar15 + 1;
    }
    local_24 = local_24 + 6;
    local_8 = local_8 + 1;
  } while ((int)local_24 < 0x510698);
  FUN_004051d7(local_14);
  puVar10 = (undefined4 *)FUN_0040607f(local_5c,1.0,0);
  puVar15 = local_5c;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  puVar10 = local_5c;
  puVar15 = &DAT_005106a0;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  puVar10 = (undefined4 *)FUN_0040607f(local_5c,1.0,8);
  puVar15 = local_5c;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  puVar10 = local_5c;
  puVar15 = &DAT_00510350;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  DAT_00510344 = FUN_00402040(8,0xc);
  puVar10 = (undefined4 *)DAT_00510344[0x18];
  puVar3 = (undefined2 *)DAT_00510344[0x1b];
  *puVar10 = 0xc2480000;
  puVar10[1] = 0;
  puVar10[2] = 0xc1a00000;
  puVar10[3] = 0xffd7b45a;
  puVar10[10] = 0xc1a00000;
  puVar10[8] = 0x42480000;
  puVar10[9] = 0;
  puVar10[0xb] = 0xffd7b45a;
  puVar10[0x10] = 0xc2480000;
  puVar10[0x11] = 0x42a00000;
  puVar10[0x12] = 0xc1a00000;
  puVar10[0x13] = 0xffd7b45a;
  puVar10[0x18] = 0x42480000;
  puVar10[0x19] = 0x42a00000;
  puVar10[0x1a] = 0xc1a00000;
  puVar10[0x1b] = 0xffd7b45a;
  puVar10[0x20] = 0xc2480000;
  puVar10[0x21] = 0;
  puVar10[0x22] = 0x41a00000;
  puVar10[0x23] = 0xffd7b45a;
  puVar10[0x28] = 0x42480000;
  puVar10[0x29] = 0;
  puVar10[0x2a] = 0x41a00000;
  puVar10[0x2b] = 0xffd7b45a;
  puVar10[0x30] = 0xc2480000;
  puVar10[0x31] = 0x42a00000;
  puVar10[0x32] = 0x41a00000;
  puVar10[0x33] = 0xffd7b45a;
  puVar10[0x38] = 0x42480000;
  puVar10[0x39] = 0x42a00000;
  puVar10[0x3a] = 0x41a00000;
  puVar10[0x3b] = 0xffd7b45a;
  *puVar3 = 2;
  puVar3[1] = 6;
  puVar3[2] = 0;
  puVar3[3] = 6;
  puVar3[4] = 4;
  puVar3[5] = 0;
  puVar3[6] = 6;
  puVar3[7] = 7;
  puVar3[8] = 4;
  puVar3[9] = 7;
  puVar3[10] = 5;
  puVar3[0xb] = 4;
  puVar3[0xc] = 7;
  puVar3[0xd] = 3;
  puVar3[0xe] = 5;
  puVar3[0xf] = 3;
  puVar3[0x10] = 1;
  puVar3[0x11] = 5;
  puVar3[0x12] = 3;
  puVar3[0x13] = 2;
  puVar3[0x14] = 1;
  puVar3[0x15] = 2;
  puVar3[0x16] = 0;
  puVar3[0x17] = 1;
  puVar3[0x18] = 0;
  puVar3[0x19] = 4;
  puVar3[0x1a] = 1;
  puVar3[0x1b] = 4;
  puVar3[0x1c] = 5;
  puVar3[0x1d] = 1;
  puVar3[0x1e] = 3;
  puVar3[0x1f] = 7;
  puVar3[0x20] = 2;
  puVar3[0x21] = 7;
  puVar3[0x22] = 6;
  puVar3[0x23] = 2;
  DAT_00510388 = FUN_00402040(8,0xc);
  puVar10 = (undefined4 *)DAT_00510388[0x18];
  puVar3 = (undefined2 *)DAT_00510388[0x1b];
  *puVar10 = 0xc2340000;
  puVar10[1] = 0x40a00000;
  puVar10[2] = 0x41a00000;
  puVar10[4] = 0;
  puVar10[5] = 0;
  puVar10[3] = 0xffffffff;
  puVar10[9] = 0x40a00000;
  puVar10[8] = 0x42340000;
  puVar10[10] = 0x41a00000;
  puVar10[0xc] = 0x3f800000;
  puVar10[0xd] = 0;
  puVar10[0xb] = 0xffffffff;
  puVar10[0x10] = 0xc2340000;
  puVar10[0x11] = 0x42960000;
  puVar10[0x12] = 0x41a00000;
  puVar10[0x14] = 0;
  puVar10[0x15] = 0x3f800000;
  puVar10[0x13] = 0xffffffff;
  puVar10[0x18] = 0x42340000;
  puVar10[0x19] = 0x42960000;
  puVar10[0x1a] = 0x41a00000;
  puVar10[0x1c] = 0x3f800000;
  puVar10[0x1d] = 0x3f800000;
  puVar10[0x1b] = 0xffffffff;
  puVar10[0x20] = 0xc20c0000;
  puVar10[0x21] = 0x41700000;
  puVar10[0x22] = 0x41f00000;
  puVar10[0x24] = 0x3df5c28f;
  puVar10[0x25] = 0x3df5c28f;
  puVar10[0x23] = 0xffffffff;
  puVar10[0x2a] = 0x41f00000;
  puVar10[0x28] = 0x420c0000;
  puVar10[0x29] = 0x41700000;
  puVar10[0x2c] = 0x3f6147ae;
  puVar10[0x2d] = 0x3df5c28f;
  puVar10[0x2b] = 0xffffffff;
  puVar10[0x30] = 0xc20c0000;
  puVar10[0x31] = 0x42820000;
  puVar10[0x32] = 0x41f00000;
  puVar10[0x34] = 0x3df5c28f;
  puVar10[0x35] = 0x3f6147ae;
  puVar10[0x33] = 0xffffffff;
  puVar10[0x38] = 0x420c0000;
  puVar10[0x39] = 0x42820000;
  puVar10[0x3a] = 0x41f00000;
  puVar10[0x3c] = 0x3f6147ae;
  puVar10[0x3d] = 0x3f6147ae;
  puVar10[0x3b] = 0xffffffff;
  *puVar3 = 2;
  puVar3[1] = 6;
  puVar3[2] = 0;
  puVar3[3] = 6;
  puVar3[4] = 4;
  puVar3[5] = 0;
  puVar3[6] = 6;
  puVar3[7] = 7;
  puVar3[8] = 4;
  puVar3[9] = 7;
  puVar3[10] = 5;
  puVar3[0xb] = 4;
  puVar3[0xc] = 7;
  puVar3[0xd] = 3;
  puVar3[0xe] = 5;
  puVar3[0xf] = 3;
  puVar3[0x10] = 1;
  puVar3[0x11] = 5;
  puVar3[0x12] = 3;
  puVar3[0x13] = 2;
  puVar3[0x14] = 1;
  puVar3[0x15] = 2;
  puVar3[0x16] = 0;
  puVar3[0x17] = 1;
  puVar3[0x18] = 0;
  puVar3[0x19] = 4;
  puVar3[0x1a] = 1;
  puVar3[0x1b] = 4;
  puVar3[0x1c] = 5;
  puVar3[0x1d] = 1;
  puVar3[0x1e] = 3;
  puVar3[0x1f] = 7;
  puVar3[0x20] = 2;
  puVar3[0x21] = 7;
  puVar3[0x22] = 6;
  puVar3[0x23] = 2;
  FUN_00403ba0(0x839b7);
  _DAT_005106b8 = 0x3f3ae148;
  DAT_00510394 = (undefined4 *)FUN_004051c3(0x70);
  DAT_00510394[0x16] = 0;
  DAT_00510394[0x1a] = 0;
  DAT_00510394[0x19] = 0;
  DAT_00510394[0x18] = 0;
  FUN_00401a10(DAT_00510394 + 3);
  puVar10 = DAT_00510394;
  *DAT_00510394 = 0;
  local_5c[3] = 0;
  local_5c[4] = 0;
  local_5c[5] = 0;
  puVar10[1] = 0;
  puVar10[2] = 0;
  DAT_00510394[0x13] = 0x3f800000;
  uVar11 = FUN_004051c3(0x70);
  DAT_00510394[0x17] = uVar11;
  *(undefined4 *)(DAT_00510394[0x17] + 0x58) = 0;
  FUN_0040d890((float *)DAT_00510394[0x17],1);
  FUN_0040de40((int)DAT_00510394);
  DAT_00510698 = FUN_00402040(0x100,0x1c2);
  local_8 = 0;
  do {
    local_10 = 0;
    local_28 = (float)local_8 * _DAT_0041280c - _DAT_00412808;
    local_18 = local_8 << 9;
    do {
      pfVar14 = (float *)(DAT_00510698[0x18] + local_18);
      fVar5 = (float)local_10 * _DAT_0041280c;
      pfVar14[2] = local_28;
      pfVar14[5] = (float)local_8;
      pfVar14[3] = -NAN;
      *pfVar14 = fVar5 - _DAT_00412808;
      pfVar14[4] = (float)local_10;
      fVar5 = (float)((local_10 + -8) * (local_10 + -8) + (local_8 + -8) * (local_8 + -8));
      if (fVar5 == 0.0) {
        local_c = (uint *)0x0;
      }
      else {
        local_c = (uint *)((&DAT_004b4f68)[(uint)fVar5 >> 8 & 0xffff] |
                          ((int)fVar5 + 0xc0800000U >> 1) + 0x3f800000 & 0x7f800000);
      }
      sVar7 = DAT_0041a2a6 * 0x15a;
      uVar12 = (uint)DAT_0041a2a6;
      uVar4 = (ushort)(uVar12 * 0x4e35);
      DAT_0041a2a6 = uVar4 + 1;
      DAT_0041a2a4 = (short)(uVar12 * 0x4e35 >> 0x10) + DAT_0041a2a4 * 0x4e35 + sVar7 +
                     (ushort)(0xfffe < uVar4);
      local_20 = (int)DAT_0041a2a4 & 0x7fff;
      pfVar14[1] = (float)local_c * (float)local_c * _DAT_004127fc *
                   ((float)local_20 * (float)_PTR_DAT_00412478 * (float)_DAT_004127a0 +
                   (float)_DAT_00412800);
      if ((float)local_c < _DAT_004123a8) {
        pfVar14[1] = 0.0;
      }
      local_10 = local_10 + 1;
      local_18 = local_18 + 0x20;
    } while (local_10 < 0x10);
    local_8 = local_8 + 1;
  } while (local_8 < 0x10);
  local_8 = 0;
  local_24 = (undefined4 *)0x0;
  do {
    iVar8 = 0;
    local_2c = (local_8 + 1) * 0x10;
    puVar10 = local_24;
    do {
      sVar7 = (short)(local_8 << 4);
      sVar6 = (short)iVar8;
      puVar10 = (undefined4 *)((int)puVar10 + 0xc);
      *(short *)(DAT_00510698[0x1b] + -0xc + (int)puVar10) = sVar7 + sVar6;
      *(short *)(DAT_00510698[0x1b] + -10 + (int)puVar10) = sVar7 + 1 + sVar6;
      sVar13 = sVar7 + 0x11 + sVar6;
      *(short *)(DAT_00510698[0x1b] + -8 + (int)puVar10) = sVar13;
      *(short *)(DAT_00510698[0x1b] + -6 + (int)puVar10) = sVar13;
      iVar8 = iVar8 + 1;
      *(short *)(DAT_00510698[0x1b] + -4 + (int)puVar10) = (short)local_2c + sVar6;
      *(short *)(DAT_00510698[0x1b] + -2 + (int)puVar10) = sVar7 + sVar6;
    } while (iVar8 < 0xf);
    local_24 = (undefined4 *)((int)local_24 + 0xc0);
    local_8 = local_8 + 1;
  } while ((int)local_24 < 0xb40);
  local_14 = local_c;
  puVar10 = (undefined4 *)FUN_00405fe6(local_5c,&DAT_0041df74,(uint *)0x40,(uint *)0x40,0);
  puVar15 = local_5c;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  puVar10 = local_5c;
  puVar15 = &DAT_00510370;
  for (iVar8 = 6; iVar8 != 0; iVar8 = iVar8 + -1) {
    *puVar15 = *puVar10;
    puVar10 = puVar10 + 1;
    puVar15 = puVar15 + 1;
  }
  return;
}


// ==== FUN_0040e940 @ 0040e940 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040e940(void)

{
  _DAT_0051069c = timeGetTime();
  _DAT_00510368 = timeGetTime();
  DAT_00510348 = timeGetTime();
  return;
}


// ==== FUN_0040e960 @ 0040e960 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040e960(float param_1,float param_2,float param_3)

{
  float *pfVar1;
  int iVar2;
  float *pfVar3;
  float *pfVar4;
  float in_stack_00000050;
  
  if (in_stack_00000050 != _DAT_004120c8) {
    pfVar3 = (float *)&stack0x00000010;
    pfVar4 = DAT_00510344;
    for (iVar2 = 0x10; pfVar1 = DAT_00510344, iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar4 = *pfVar3;
      pfVar3 = pfVar3 + 1;
      pfVar4 = pfVar4 + 1;
    }
    DAT_00510344[0x10] = param_1;
    pfVar1[0x11] = param_2;
    pfVar1[0x12] = param_3;
    FUN_00401730(DAT_00510344,in_stack_00000050,in_stack_00000050,in_stack_00000050);
    FUN_004022a0(DAT_00510344,DAT_00510340,1.0,'\x01');
    FUN_00402180(DAT_00510344);
  }
  return;
}


// ==== FUN_0040ea00 @ 0040ea00 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_0040ea00(float param_1,float param_2,float param_3)

{
  float *pfVar1;
  int iVar2;
  float *pfVar3;
  float *pfVar4;
  float in_stack_00000050;
  int in_stack_00000054;
  
  if (in_stack_00000050 != _DAT_004120c8) {
    pfVar3 = (float *)&stack0x00000010;
    pfVar4 = DAT_00510388;
    for (iVar2 = 0x10; pfVar1 = DAT_00510388, iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar4 = *pfVar3;
      pfVar3 = pfVar3 + 1;
      pfVar4 = pfVar4 + 1;
    }
    DAT_00510388[0x10] = param_1;
    pfVar1[0x11] = param_2;
    pfVar1[0x12] = param_3;
    FUN_00401730(DAT_00510388,in_stack_00000050,in_stack_00000050,in_stack_00000050);
    FUN_0040406d((int)(&DAT_00510398 + (DAT_0051038c + in_stack_00000054 & 0x1fU) * 6));
    FUN_0040484a('\x01','\x02');
    FUN_004022a0(DAT_00510388,DAT_00510340,1.0,'\0');
    FUN_00402180(DAT_00510388);
  }
  return;
}


// ==== FUN_0040ead0 @ 0040ead0 ====

void __cdecl FUN_0040ead0(float *param_1,undefined4 param_2)

{
  float fVar1;
  int iVar2;
  float *pfVar3;
  float *pfVar4;
  float afStack_54 [8];
  undefined4 uStack_34;
  
  if (param_1 != (float *)0x0) {
    FUN_0040ead0((float *)param_1[0x17],param_2);
    FUN_0040ead0((float *)param_1[0x18],param_2);
    FUN_0040ead0((float *)param_1[0x19],param_2);
    uStack_34 = 0x40eb0c;
    FUN_0040ead0((float *)param_1[0x1a],param_2);
    if ((char)param_2 == '\0') {
      fVar1 = *param_1;
      pfVar3 = param_1 + 3;
      pfVar4 = afStack_54;
      for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
        *pfVar4 = *pfVar3;
        pfVar3 = pfVar3 + 1;
        pfVar4 = pfVar4 + 1;
      }
      FUN_0040e960(fVar1,param_1[1],param_1[2]);
      return;
    }
    fVar1 = param_1[1];
    pfVar3 = param_1 + 3;
    pfVar4 = (float *)&stack0xffffffa8;
    for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
      *pfVar4 = *pfVar3;
      pfVar3 = pfVar3 + 1;
      pfVar4 = pfVar4 + 1;
    }
    FUN_0040ea00(*param_1,fVar1,param_1[2]);
  }
  return;
}


// ==== FUN_0040eb90 @ 0040eb90 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040eb90(void)

{
  int iVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  DWORD DVar5;
  int iVar6;
  undefined4 *puVar7;
  int iVar8;
  undefined4 *puVar9;
  float10 fVar10;
  undefined4 auStackY_364 [9];
  undefined4 auStackY_340 [9];
  undefined4 auStackY_31c [4];
  undefined4 local_298 [9];
  undefined4 local_274 [9];
  undefined4 local_250 [9];
  undefined4 local_22c [117];
  undefined4 local_58 [16];
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  FUN_0040484a('\x03','\x02');
  DAT_004b4f64 = 0xff7dafc8;
  DAT_0041a2a8 = 0xff7dafc8;
  DAT_0041a2ac = 0x3b449ba6;
  FUN_0040484a('\x04','\x01');
  DVar5 = timeGetTime();
  local_8 = (float)(DVar5 - _DAT_00510368);
  _DAT_0051034c = (float)(int)local_8 * (float)_DAT_00412830;
  _DAT_00510368 = timeGetTime();
  DVar5 = timeGetTime();
  local_8 = (float)(int)(DVar5 - _DAT_0051069c) * (float)_DAT_00412760;
  DAT_0051038c = (int)ROUND(local_8);
  local_14 = (float)DAT_0051038c;
  DVar5 = timeGetTime();
  local_8 = (float)(DVar5 - _DAT_0051069c);
  local_14 = (float)(int)local_8 * (float)_DAT_00412828;
  if (_DAT_004120c8 <= local_14) {
    if (_DAT_00412090 < local_14) {
      local_14 = 1.0;
    }
  }
  else {
    local_14 = 0.0;
  }
  DAT_00510340[0x16] = 135.0;
  DVar5 = timeGetTime();
  local_8 = (float)(int)DVar5 * _DAT_00412820;
  fVar10 = (float10)fcos((float10)local_8);
  local_c = (float)fVar10;
  DVar5 = timeGetTime();
  fVar10 = (float10)fsin((float10)((float)(int)DVar5 * _DAT_0041245c));
  local_18 = (float)fVar10;
  local_8 = _DAT_00412090 - local_14;
  DAT_00510340[0x10] = local_c * _DAT_0041280c * local_8 + local_18 * _DAT_0041280c * local_14;
  DVar5 = timeGetTime();
  local_c = (float)(int)DVar5 * _DAT_00412450;
  fVar10 = (float10)fcos((float10)local_c);
  local_18 = (float)fVar10;
  DAT_00510340[0x11] =
       local_8 * _DAT_00412448 + (local_18 * _DAT_00412650 + _DAT_00412448) * local_14;
  DAT_00510340[0x12] = local_14 * _DAT_00412454 + local_8 * _DAT_0041281c;
  FUN_00402760(DAT_00510340);
  FUN_00401a10(local_58);
  iVar6 = FUN_004051ef();
  if ((0x16ff < (ushort)iVar6) && (iVar6 = FUN_004051ef(), (ushort)iVar6 < 0x1a00)) {
    FUN_0040484a('\x01','\0');
    FUN_0040406d(0x5106a0);
    FUN_0040ead0(DAT_00510394,0);
    FUN_0040ead0(DAT_00510394,1);
    FUN_0040df20((int)DAT_00510394);
  }
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x94))();
  FUN_0040484a('\x01','\0');
  FUN_0040406d(0x510370);
  FUN_00402180(DAT_00510698);
  iVar6 = FUN_004051ef();
  if ((ushort)iVar6 < 0x1900) {
    DAT_00510348 = timeGetTime();
    return;
  }
  FUN_0040484a('\x03','\0');
  FUN_0040406d(0);
  FUN_0040484a('\x05','\x01');
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  (**(code **)(**(int **)(DAT_004b4eb8 + 0xc) + 0x50))();
  DVar5 = timeGetTime();
  iVar6 = 0x7dafc8;
  fVar2 = (float)(int)(DVar5 - DAT_00510348) * (float)_DAT_00412598;
  if (_DAT_00412818 < fVar2) {
    fVar3 = fVar2 - _DAT_00412818;
    fVar4 = _DAT_00412090;
    if ((fVar3 <= _DAT_00412090) && (fVar4 = fVar3, fVar3 < _DAT_004120c8)) {
      fVar4 = _DAT_004120c8;
    }
    fVar4 = _DAT_00412090 - fVar4;
    local_18 = (float)(int)ROUND(fVar4 * _DAT_0041280c);
    local_14 = (float)(int)ROUND(fVar4 * _DAT_00412498);
    local_8 = (float)(int)ROUND(fVar4 * _DAT_004125cc);
    iVar6 = ((int)ROUND(fVar4 * _DAT_0041280c) * 0x100 + (int)ROUND(fVar4 * _DAT_00412498)) * 0x100
            + (int)ROUND(fVar4 * _DAT_004125cc);
  }
  fVar3 = _DAT_004120c8;
  if ((_DAT_004120c8 <= fVar2) && (fVar3 = fVar2, _DAT_00412090 < fVar2)) {
    fVar3 = _DAT_00412090;
  }
  local_10 = fVar3 * _DAT_004123d0;
  iVar1 = (int)ROUND(fVar3 * _DAT_004123d0);
  local_c = (float)iVar1;
  puVar7 = local_298 + 3;
  iVar8 = 0x10;
  do {
    puVar7[-1] = 0x3c23d70a;
    *puVar7 = 0x42c80000;
    puVar7[1] = iVar1 * 0x1000000 + iVar6;
    puVar7[2] = 0;
    puVar7[3] = 0;
    puVar7 = puVar7 + 9;
    iVar8 = iVar8 + -1;
  } while (iVar8 != 0);
  local_298[0] = 0;
  local_298[1] = 0;
  local_274[0] = 0x44200000;
  local_274[1] = 0;
  local_250[0] = 0x44200000;
  local_250[1] = 0x43f00000;
  local_22c[0] = 0;
  local_22c[1] = 0x43f00000;
  puVar7 = local_250;
  puVar9 = auStackY_31c;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar7 = local_274;
  puVar9 = auStackY_340;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar7 = local_298;
  puVar9 = auStackY_364;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar9 = puVar9 + 1;
  }
  FUN_004049f5();
  puVar7 = local_298;
  puVar9 = auStackY_31c;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar7 = local_22c;
  puVar9 = auStackY_340;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar9 = puVar9 + 1;
  }
  puVar7 = local_250;
  puVar9 = auStackY_364;
  for (iVar6 = 9; iVar6 != 0; iVar6 = iVar6 + -1) {
    *puVar9 = *puVar7;
    puVar7 = puVar7 + 1;
    puVar9 = puVar9 + 1;
  }
  FUN_004049f5();
  DVar5 = timeGetTime();
  fVar2 = (float)(int)(DVar5 + (-4000 - DAT_00510348)) * (float)_DAT_00412810;
  local_10 = _DAT_004120c8;
  if ((_DAT_004120c8 <= fVar2) && (local_10 = fVar2, _DAT_00412090 < fVar2)) {
    local_10 = _DAT_00412090;
  }
  local_10 = local_10 * _DAT_004123d0;
  local_c = (float)(int)ROUND(local_10);
  auStackY_31c[3] = 0x40f0d0;
  FUN_00404dd0(s_sagacity_00421624,0x43a00000,0x433e0000,256.0);
  DVar5 = timeGetTime();
  fVar2 = (float)(int)(DVar5 + (-5000 - DAT_00510348)) * (float)_DAT_00412810;
  local_10 = _DAT_004120c8;
  if ((_DAT_004120c8 <= fVar2) && (local_10 = fVar2, _DAT_00412090 < fVar2)) {
    local_10 = _DAT_00412090;
  }
  local_10 = local_10 * _DAT_004123d0;
  local_c = (float)(int)ROUND(local_10);
  auStackY_31c[3] = 0x40f14e;
  FUN_00404dd0(s_sarix_0042161c,0x43a00000,0x435c0000,256.0);
  DVar5 = timeGetTime();
  fVar2 = (float)(int)(DVar5 + (-6000 - DAT_00510348)) * (float)_DAT_00412810;
  local_10 = _DAT_004120c8;
  if ((_DAT_004120c8 <= fVar2) && (local_10 = fVar2, _DAT_00412090 < fVar2)) {
    local_10 = _DAT_00412090;
  }
  local_10 = local_10 * _DAT_004123d0;
  local_c = (float)(int)ROUND(local_10);
  auStackY_31c[3] = 0x40f1cc;
  FUN_00404dd0(s_stevie_00421614,0x43a00000,0x437a0000,256.0);
  DVar5 = timeGetTime();
  fVar2 = (float)(int)(DVar5 + (-7000 - DAT_00510348)) * (float)_DAT_00412810;
  local_10 = _DAT_004120c8;
  if ((_DAT_004120c8 <= fVar2) && (local_10 = fVar2, _DAT_00412090 < fVar2)) {
    local_10 = _DAT_00412090;
  }
  local_10 = local_10 * _DAT_004123d0;
  local_c = (float)(int)ROUND(local_10);
  auStackY_31c[3] = 0x40f24a;
  FUN_00404dd0(s_distance_00421608,0x43a00000,0x438c0000,256.0);
  return;
}


// ==== FUN_0040f270 @ 0040f270 ====

undefined4 FUN_0040f270(void)

{
  undefined4 in_EAX;
  
  FUN_00411147();
  return in_EAX;
}


// ==== FUN_0040f285 @ 0040f285 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0040f285(void)

{
  float fVar1;
  DWORD DVar2;
  DWORD DVar3;
  uint uVar4;
  DWORD local_10;
  int local_8;
  
  FUN_0040df90();
  FUN_004087c0();
  FUN_0040bd10();
  FUN_00409bb0();
  FUN_00407380();
  FUN_0040c730();
  FUN_00406280();
  FUN_0040aca0();
  DVar2 = timeGetTime();
  do {
    DVar3 = timeGetTime();
  } while ((double)(int)(DVar3 - DVar2) < _DAT_00412840);
  FUN_0040f270();
  DAT_004f4fb8 = 0;
  DAT_004b4f64 = 0xff7dafc8;
  DVar2 = timeGetTime();
  local_10 = timeGetTime();
  local_8 = 0;
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x114))) {
    FUN_004051ef();
    if (local_8 == 0xc) {
      local_10 = timeGetTime();
      local_8 = 0;
    }
    uVar4 = FUN_004051ef();
    if ((5 < (uVar4 & 0xf)) && (local_8 == 0)) {
      local_10 = timeGetTime();
      local_8 = 6;
    }
    uVar4 = FUN_004051ef();
    if ((0xb < (uVar4 & 0xf)) && (local_8 == 6)) {
      local_10 = timeGetTime();
      local_8 = 0xc;
    }
    DVar3 = timeGetTime();
    fVar1 = (float)(int)(DVar3 - DVar2) / _DAT_004124f0 + _DAT_004123dc;
    DVar3 = timeGetTime();
    FUN_0040f790((float)(int)(DVar3 - local_10) / _DAT_004127fc);
    uVar4 = FUN_004051ef();
    if ((uVar4 & 0xffff) < 0x20) {
      FUN_00404dd0(s_threestate_00421630,0x43a00000,0x435c0000,fVar1);
    }
    else {
      FUN_00404dd0(s_lost_vegas_0042163c,0x43a00000,0x435c0000,fVar1);
    }
    FUN_00405346();
  }
  timeGetTime();
  timeGetTime();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x200))) {
    uVar4 = FUN_004051ef();
    if (0x113 < (uVar4 & 0xffff)) {
      FUN_00404dd0(s_threestate_00421648,0x43a00000,0x433e0000,256.0);
    }
    uVar4 = FUN_004051ef();
    if ((uVar4 & 0xffff) == 0x116) {
      FUN_00404dd0(&DAT_00421654,0x43a00000,0x437a0000,256.0);
    }
    uVar4 = FUN_004051ef();
    if (0x116 < (uVar4 & 0xffff)) {
      FUN_00404dd0(s_lost_vegas_0042165c,0x43a00000,0x437a0000,256.0);
    }
    FUN_00405346();
  }
  timeGetTime();
  FUN_00407880();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x600))) {
    FUN_004078a0();
    FUN_00405346();
  }
  FUN_0040ccd0();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x800))) {
    FUN_0040cce0();
    FUN_00405346();
  }
  FUN_0040af60();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0xa00))) {
    FUN_0040af80();
    FUN_00405346();
  }
  FUN_0040bf50();
  FUN_00409d8d();
  local_10 = timeGetTime();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0xc00))) {
    DVar2 = timeGetTime();
    _DAT_005101bc = (float)(int)(DVar2 - local_10) / (float)_DAT_00412838;
    if (_DAT_005101bc < _DAT_004120c8) {
      _DAT_005101bc = 0.0;
    }
    if (_DAT_00412090 < _DAT_005101bc) {
      _DAT_005101bc = 1.0;
    }
    uVar4 = FUN_004051ef();
    if ((uVar4 & 0xffff) < 0xb38) {
      local_10 = timeGetTime();
      _DAT_005101bc = 0.0;
    }
    FUN_0040bf80();
    uVar4 = FUN_004051ef();
    if ((uVar4 & 0xffff) < 0xb38) {
      local_10 = timeGetTime();
    }
    else {
      FUN_00409da6('\0');
    }
    FUN_00405346();
  }
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0xe00))) {
    FUN_00409da6('\0');
    FUN_00405346();
  }
  FUN_00408cc0();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x1200))) {
    FUN_00408e90();
    FUN_00405346();
  }
  _DAT_005101bc = 1.0;
  FUN_00409d8d();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x1400))) {
    FUN_00409da6('\x01');
    FUN_00405346();
  }
  FUN_00406500();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x1600))) {
    FUN_00406520();
    FUN_00405346();
  }
  FUN_0040e940();
  while ((DAT_004f4fb8 == 0 && (uVar4 = FUN_004051ef(), (uVar4 & 0xffff) < 0x1a20))) {
    FUN_0040eb90();
    FUN_00405346();
  }
  return;
}


// ==== FUN_0040f790 @ 0040f790 ====

int FUN_0040f790(float param_1)

{
  return (int)ROUND(param_1);
}


// ==== FUN_00410000 @ 00410000 ====

void __fastcall FUN_00410000(int param_1)

{
  byte bVar1;
  undefined4 uVar2;
  uint uVar3;
  uint uVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  uint uVar9;
  int unaff_EBP;
  char *pcVar10;
  undefined4 *unaff_EDI;
  int *piVar11;
  
  *(int *)(unaff_EBP + 0x4b8b) = param_1;
  *(undefined4 **)(unaff_EBP + 0x4b8f) = unaff_EDI;
  for (iVar6 = param_1 * 2; iVar6 != 0; iVar6 = iVar6 + -1) {
    *unaff_EDI = 0;
    unaff_EDI = unaff_EDI + 1;
  }
  iVar6 = 0x20;
  pcVar10 = (char *)(unaff_EBP + 0x277b);
  do {
    if (*pcVar10 != '\0') {
      if (*(int *)(pcVar10 + 0x10) != -1) {
        uVar2 = *(undefined4 *)(pcVar10 + 0x10);
        pcVar10[0x10] = -1;
        pcVar10[0x11] = -1;
        pcVar10[0x12] = -1;
        pcVar10[0x13] = -1;
        *(undefined4 *)(pcVar10 + 0x19) = uVar2;
        pcVar10[0x1d] = '\0';
        pcVar10[0x1e] = '\0';
        pcVar10[0x1f] = '\0';
        pcVar10[0x20] = '\0';
      }
      *(undefined4 *)(unaff_EBP + 0x4b93) = *(undefined4 *)(unaff_EBP + 0x4b8b);
      piVar11 = *(int **)(unaff_EBP + 0x4b8f);
LAB_00410057:
      while (*(int *)(unaff_EBP + 0x4b93) != 0) {
        uVar9 = (uint)(*(ushort *)(pcVar10 + 0x14) >> 10);
        uVar3 = (uint)*(ushort *)(pcVar10 + 0x14) << 0x16;
        if ((pcVar10[0xd] & 0x20U) != 0) {
          uVar4 = ~uVar3;
          uVar3 = uVar4 + 1;
          uVar9 = ~uVar9 + (uint)(0xfffffffe < uVar4);
        }
        *(uint *)(unaff_EBP + 0x4b87) = uVar9;
        *(uint *)(unaff_EBP + 0x4b83) = uVar3;
        iVar7 = (*(int *)(pcVar10 + 5) - *(int *)(pcVar10 + 0x19)) -
                (uint)(*(int *)(pcVar10 + 0x1d) != 0);
        uVar9 = (uint)*(ushort *)(pcVar10 + 0x14);
        if ((pcVar10[0xd] & 0x20U) != 0) {
          uVar9 = -uVar9;
        }
        uVar3 = (((uint)-*(int *)(pcVar10 + 0x1d) >> 0x16 | iVar7 * 0x400) + uVar9) - 1;
        if (uVar9 != 0) {
          uVar3 = (uint)(CONCAT44(iVar7 >> 0x16,uVar3) / (longlong)(int)uVar9);
        }
        if (*(uint *)(unaff_EBP + 0x4b93) < uVar3) {
          uVar3 = *(uint *)(unaff_EBP + 0x4b93);
        }
        *(int *)(unaff_EBP + 0x4b93) = *(int *)(unaff_EBP + 0x4b93) - uVar3;
        if ((uVar3 != 0) && (-1 < (int)uVar3)) {
          if ((pcVar10[0xd] & 4U) == 0) {
            bVar1 = pcVar10[0x18];
            *(uint *)(unaff_EBP + 0x4b9b) = (uint)*(ushort *)(pcVar10 + 0x16) * (uint)bVar1 * 0x100;
            *(uint *)(unaff_EBP + 0x4b97) =
                 (uint)*(ushort *)(pcVar10 + 0x16) * (bVar1 ^ 0xff) * 0x100;
            iVar7 = *(int *)(pcVar10 + 1);
            do {
              iVar5 = (int)*(char *)(iVar7 + *(int *)(pcVar10 + 0x19));
              iVar5 = iVar5 + ((int)((*(char *)(iVar7 + 1 + *(int *)(pcVar10 + 0x19)) - iVar5) *
                                    (*(uint *)(pcVar10 + 0x1d) >> 0x10)) >> 0x10);
              *piVar11 = *piVar11 + (iVar5 * *(int *)(unaff_EBP + 0x4b97) >> 0x10);
              piVar11[1] = piVar11[1] + (iVar5 * *(int *)(unaff_EBP + 0x4b9b) >> 0x10);
              uVar9 = *(uint *)(pcVar10 + 0x1d);
              uVar4 = *(uint *)(unaff_EBP + 0x4b83);
              *(uint *)(pcVar10 + 0x1d) = uVar9 + *(uint *)(unaff_EBP + 0x4b83);
              *(uint *)(pcVar10 + 0x19) =
                   *(int *)(pcVar10 + 0x19) + *(int *)(unaff_EBP + 0x4b87) +
                   (uint)CARRY4(uVar9,uVar4);
              piVar11 = piVar11 + 2;
              uVar3 = uVar3 - 1;
            } while (uVar3 != 0);
          }
          else {
            bVar1 = pcVar10[0x18];
            *(uint *)(unaff_EBP + 0x4b9b) = (uint)*(ushort *)(pcVar10 + 0x16) * (uint)bVar1;
            *(uint *)(unaff_EBP + 0x4b97) = (uint)*(ushort *)(pcVar10 + 0x16) * (bVar1 ^ 0xff);
            iVar7 = *(int *)(pcVar10 + 1);
            iVar5 = *(int *)(pcVar10 + 0x19);
            do {
              iVar8 = (int)*(short *)(iVar7 + iVar5 * 2);
              iVar8 = iVar8 + ((int)((*(short *)(iVar7 + 2 + iVar5 * 2) - iVar8) *
                                    (*(uint *)(pcVar10 + 0x1d) >> 0x10)) >> 0x10);
              *piVar11 = *piVar11 + (iVar8 * *(int *)(unaff_EBP + 0x4b97) >> 0x10);
              piVar11[1] = piVar11[1] + (iVar8 * *(int *)(unaff_EBP + 0x4b9b) >> 0x10);
              uVar9 = *(uint *)(pcVar10 + 0x1d);
              uVar4 = *(uint *)(unaff_EBP + 0x4b83);
              *(uint *)(pcVar10 + 0x1d) = uVar9 + *(uint *)(unaff_EBP + 0x4b83);
              iVar5 = *(int *)(pcVar10 + 0x19) + *(int *)(unaff_EBP + 0x4b87) +
                      (uint)CARRY4(uVar9,uVar4);
              *(int *)(pcVar10 + 0x19) = iVar5;
              piVar11 = piVar11 + 2;
              uVar3 = uVar3 - 1;
            } while (uVar3 != 0);
          }
        }
        iVar7 = *(int *)(pcVar10 + 0x19);
        if ((pcVar10[0xd] & 0x20U) == 0) goto LAB_0041021d;
        if (iVar7 < *(int *)(pcVar10 + 5)) goto LAB_00410226;
      }
    }
LAB_0041026a:
    pcVar10 = pcVar10 + 0x100;
    iVar6 = iVar6 + -1;
    if (iVar6 == 0) {
      return;
    }
  } while( true );
LAB_0041021d:
  if (*(int *)(pcVar10 + 5) <= iVar7) {
LAB_00410226:
    if ((pcVar10[0xd] & 0x18U) == 0) {
      *pcVar10 = '\0';
      goto LAB_0041026a;
    }
    if ((pcVar10[0xd] & 0x10U) == 0) {
      *(int *)(pcVar10 + 0x19) = iVar7 - (*(int *)(pcVar10 + 5) - *(int *)(pcVar10 + 9));
    }
    else {
      iVar7 = *(int *)(pcVar10 + 0x1d);
      *(int *)(pcVar10 + 0x1d) = -*(int *)(pcVar10 + 0x1d);
      *(uint *)(pcVar10 + 0x19) =
           (*(int *)(pcVar10 + 5) * 2 - *(int *)(pcVar10 + 0x19)) - (uint)(iVar7 != 0);
      pcVar10[0xd] = pcVar10[0xd] ^ 0x20;
      LOCK();
      uVar2 = *(undefined4 *)(pcVar10 + 9);
      *(undefined4 *)(pcVar10 + 9) = *(undefined4 *)(pcVar10 + 5);
      UNLOCK();
      *(undefined4 *)(pcVar10 + 5) = uVar2;
    }
  }
  goto LAB_00410057;
}


// ==== FUN_00410289 @ 00410289 ====

undefined8 __fastcall FUN_00410289(undefined4 param_1,undefined4 param_2)

{
  undefined4 in_EAX;
  int iVar1;
  undefined4 uVar2;
  uint uVar3;
  undefined4 extraout_ECX;
  undefined4 uVar4;
  undefined4 extraout_EDX;
  int unaff_EBP;
  undefined4 *unaff_EDI;
  undefined8 uVar5;
  
  uVar5 = thunk_FUN_0041032e();
  uVar4 = (undefined4)((ulonglong)uVar5 >> 0x20);
  *(undefined4 *)(unaff_EBP + 0x4ba0) = *(undefined4 *)(unaff_EBP + 6);
  uVar2 = *(undefined4 *)(unaff_EBP + 0x12);
  *(undefined4 *)(unaff_EBP + 0x4ba4) = uVar2;
  *(int *)(unaff_EBP + 0x4b7b) = (int)uVar5;
  if (*(char *)(unaff_EBP + 0x4b9f) == '\0') {
    for (iVar1 = (int)uVar5 << 1; iVar1 != 0; iVar1 = iVar1 + -1) {
      *unaff_EDI = 0;
      unaff_EDI = unaff_EDI + 1;
    }
  }
  else {
    while (*(int *)(unaff_EBP + 0x4b7b) != 0) {
      if (*(uint *)(unaff_EBP + 0x4b7f) < 0x100) {
        FUN_00410dc0(uVar2,uVar4);
        *(int *)(unaff_EBP + 0x4b7f) =
             *(int *)(unaff_EBP + 0x4b7f) +
             (int)(0x541d3400 / (longlong)(*(int *)(unaff_EBP + 0x25) * 0x32));
      }
      uVar3 = *(uint *)(unaff_EBP + 0x4b7f) >> 8;
      if (*(uint *)(unaff_EBP + 0x4b7b) < uVar3) {
        uVar3 = *(uint *)(unaff_EBP + 0x4b7b);
      }
      *(int *)(unaff_EBP + 0x4b7f) = *(int *)(unaff_EBP + 0x4b7f) + uVar3 * -0x100;
      *(int *)(unaff_EBP + 0x4b7b) = *(int *)(unaff_EBP + 0x4b7b) - uVar3;
      FUN_00410000(uVar3);
      uVar2 = extraout_ECX;
      uVar4 = extraout_EDX;
    }
  }
  return CONCAT44(param_2,in_EAX);
}


// ==== FUN_0041032e @ 0041032e ====

void FUN_0041032e(void)

{
  return;
}


// ==== FUN_0041033b @ 0041033b ====

void FUN_0041033b(void)

{
  char cVar1;
  char cVar2;
  byte bVar3;
  int iVar4;
  int unaff_EBP;
  char *pcVar5;
  undefined4 *puVar6;
  char *pcVar7;
  char *pcVar8;
  int unaff_retaddr;
  
  pcVar5 = (char *)(unaff_retaddr + 0xe8d);
  puVar6 = (undefined4 *)(unaff_EBP + 0x477b);
  for (iVar4 = 0x10; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar6 = *(undefined4 *)pcVar5;
    pcVar5 = pcVar5 + 4;
    puVar6 = puVar6 + 1;
  }
  *(undefined1 *)puVar6 = 0x40;
  cVar1 = '?';
  pcVar8 = (char *)((int)puVar6 + 1);
  do {
    pcVar5 = pcVar5 + -1;
    pcVar7 = pcVar8 + 1;
    *pcVar8 = *pcVar5;
    cVar1 = cVar1 + -1;
    pcVar8 = pcVar7;
  } while (cVar1 != '\0');
  cVar1 = -0x80;
  pcVar5 = (char *)(unaff_EBP + 0x477b);
  do {
    *pcVar7 = -*pcVar5;
    cVar1 = cVar1 + -1;
    cVar2 = '\0';
    pcVar5 = pcVar5 + 1;
    pcVar8 = pcVar7 + 1;
    pcVar7 = pcVar7 + 1;
  } while (cVar1 != '\0');
  do {
    *pcVar8 = -(cVar2 >> 1);
    cVar2 = cVar2 + -1;
    bVar3 = 0;
    pcVar5 = pcVar8 + 1;
    pcVar8 = pcVar8 + 1;
  } while (cVar2 != '\0');
  do {
    *pcVar5 = (bVar3 & 0x80) - 0x40;
    bVar3 = bVar3 - 1;
    cVar1 = '\0';
    pcVar8 = pcVar5 + 1;
    pcVar5 = pcVar5 + 1;
  } while (bVar3 != 0);
  do {
    *pcVar8 = cVar1 >> 1;
    cVar1 = cVar1 + -1;
    pcVar8 = pcVar8 + 1;
  } while (cVar1 != '\0');
  return;
}


// ==== FUN_0041038c @ 0041038c ====

undefined8 __fastcall FUN_0041038c(undefined4 param_1,undefined4 param_2)

{
  char cVar1;
  short sVar2;
  undefined4 in_EAX;
  int iVar3;
  int iVar4;
  undefined4 *unaff_ESI;
  int unaff_EDI;
  undefined4 *puVar5;
  int *piVar6;
  
  iVar4 = 0x4000;
  DAT_00424e68 = unaff_EDI;
  do {
    iVar4 = iVar4 + -1;
    *(undefined1 *)(unaff_EDI + iVar4) = 0;
  } while (iVar4 != 0);
  *(undefined1 *)(unaff_EDI + 1) = 0x40;
  if ((undefined *)*unaff_ESI == &DAT_004d584d) {
    puVar5 = (undefined4 *)(unaff_EDI + 0x2b);
    for (iVar4 = 0x9d4; iVar4 != 0; iVar4 = iVar4 + -1) {
      *puVar5 = *unaff_ESI;
      unaff_ESI = unaff_ESI + 1;
      puVar5 = puVar5 + 1;
    }
    piVar6 = puVar5 + -0x980;
    iVar4 = 0x980;
    do {
      *piVar6 = (int)unaff_ESI + *piVar6 + -0x2750;
      piVar6 = piVar6 + 1;
      iVar4 = iVar4 + -1;
    } while (iVar4 != 0);
    if ((*(byte *)((int)unaff_ESI + -0x2736) & 4) != 0) {
      *(ushort *)((int)unaff_ESI + -0x2736) = *(ushort *)((int)unaff_ESI + -0x2736) & 0xfffb;
      iVar4 = unaff_ESI[-0x9cd];
      cVar1 = '\0';
      for (iVar3 = unaff_ESI[-0x9cc]; iVar3 != 0; iVar3 = iVar3 + -1) {
        cVar1 = cVar1 + *(char *)((int)unaff_ESI + iVar4 + -0x2750);
        *(char *)((int)unaff_ESI + iVar4 + -0x2750) = cVar1;
        iVar4 = iVar4 + 1;
      }
      sVar2 = 0;
      for (iVar3 = unaff_ESI[-0x9cb]; iVar3 != 0; iVar3 = iVar3 + -1) {
        sVar2 = sVar2 + *(short *)((int)unaff_ESI + iVar4 + -0x2750);
        *(short *)((int)unaff_ESI + iVar4 + -0x2750) = sVar2;
        iVar4 = iVar4 + 2;
      }
    }
    thunk_FUN_0041033b();
  }
  *(undefined1 *)(unaff_EDI + 0x4b9f) = 0;
  return CONCAT44(param_2,in_EAX);
}


// ==== FUN_0041042c @ 0041042c ====

undefined8 __fastcall FUN_0041042c(undefined4 param_1,undefined4 param_2)

{
  longlong lVar1;
  int in_EAX;
  uint uVar2;
  
  uVar2 = in_EAX + 0x8000;
  lVar1 = (ulonglong)
          ((uint)((ulonglong)*(uint *)(&DAT_00411268 + (uVar2 >> 0xc & 0xf) * 4) *
                 (ulonglong)*(ushort *)(&DAT_00411248 + (uVar2 >> 8 & 0xf) * 2)) >> 0xf |
          (int)((ulonglong)*(uint *)(&DAT_00411268 + (uVar2 >> 0xc & 0xf) * 4) *
                (ulonglong)*(ushort *)(&DAT_00411248 + (uVar2 >> 8 & 0xf) * 2) >> 0x20) << 0x11) *
          (ulonglong)*(ushort *)(&DAT_00411228 + (uVar2 >> 4 & 0xf) * 2);
  lVar1 = (ulonglong)((uint)lVar1 >> 0xf | (int)((ulonglong)lVar1 >> 0x20) << 0x11) *
          (ulonglong)*(ushort *)(&DAT_00411208 + (uVar2 & 0xf) * 2);
  return CONCAT44(param_2,(uint)lVar1 >> 0xf | (int)((ulonglong)lVar1 >> 0x20) << 0x11);
}


// ==== FUN_00410488 @ 00410488 ====

void __fastcall FUN_00410488(undefined4 param_1,undefined4 param_2)

{
  uint *puVar1;
  char cVar2;
  byte bVar3;
  short sVar4;
  short sVar5;
  int iVar6;
  uint *puVar7;
  uint uVar8;
  int unaff_EBP;
  undefined1 *unaff_EDI;
  undefined8 uVar9;
  
  *(undefined1 *)(unaff_EBP + 0x29) = 0;
  *(undefined1 *)(unaff_EBP + 0x2a) = 0;
  if (*(char *)(unaff_EBP + 0x22) == '\x03') {
    *(undefined1 *)(unaff_EBP + 0x29) = 1;
  }
  if (*(char *)(unaff_EBP + 0x22) == '\x05') {
    *(undefined1 *)(unaff_EBP + 0x29) = 1;
  }
  if (0xef < *(byte *)(unaff_EBP + 0x21)) {
    *(undefined1 *)(unaff_EBP + 0x29) = 1;
  }
  if ((*(char *)(unaff_EBP + 0x22) != '\x14') || (*(char *)(unaff_EBP + 0x23) != '\0')) {
    if (*(char *)(unaff_EBP + 0x1f) != 'a') goto LAB_004104cc;
    *(undefined1 *)(unaff_EBP + 0x1f) = 0;
  }
  *(undefined1 *)(unaff_EBP + 0x2a) = 1;
  unaff_EDI[0x34] = 0;
LAB_004104cc:
  bVar3 = *(byte *)(unaff_EBP + 0x20);
  if ((bVar3 != 0) && ((uint)bVar3 <= *(uint *)(unaff_EBP + 0x3f))) {
    unaff_EDI[0x2d] = bVar3;
  }
  if (unaff_EDI[0x2d] != '\0') {
    cVar2 = *(char *)(unaff_EBP + 0x1f);
    if (cVar2 != '\0') {
      if (*(char *)(unaff_EBP + 0x20) != '\0') {
        unaff_EDI[0x34] = 1;
      }
      unaff_EDI[0x75] = cVar2;
      if ((*(char *)(unaff_EBP + 0x22) == '1') && (*(char *)(unaff_EBP + 0x23) != '\0')) {
        return;
      }
      bVar3 = cVar2 - 1;
      if (*(char *)(unaff_EBP + 0x29) == '\x01') {
        sVar5 = -((ushort)bVar3 * 0x100 + *(short *)(unaff_EDI + 0x32));
        iVar6 = (int)CONCAT11((char)((ushort)sVar5 >> 8) + '0',(char)sVar5);
        if ((*(byte *)(unaff_EBP + 0x45) & 1) == 0) {
          uVar9 = FUN_0041042c(param_1,param_2);
          iVar6 = (int)uVar9;
        }
        *(int *)(unaff_EDI + 0x49) = iVar6;
      }
      else {
        unaff_EDI[0xe] = 1;
        puVar7 = *(uint **)(unaff_EBP + 0x177 + (uint)(byte)unaff_EDI[0x2d] * 4);
        uVar8 = (uint)*(byte *)((int)puVar7 + bVar3 + 4);
        if (*puVar7 <= uVar8) {
          return;
        }
        puVar1 = puVar7 + uVar8 * 4 + 0x40;
        *unaff_EDI = 1;
        unaff_EDI[0xf] = 1;
        *(undefined4 *)(unaff_EDI + 1) =
             *(undefined4 *)(unaff_EBP + 0x77b + (uint)*(ushort *)((int)puVar1 + 0xd) * 4);
        *(uint *)(unaff_EDI + 9) = *puVar1;
        *(uint *)(unaff_EDI + 5) = puVar1[1];
        unaff_EDI[0xd] = (char)puVar1[2];
        if (*(char *)(unaff_EBP + 0x20) != '\0') {
          *(uint **)(unaff_EDI + 0x2e) = puVar7;
          unaff_EDI[0x45] = *(undefined1 *)((int)puVar1 + 9);
          puVar7 = (uint *)CONCAT31((int3)((uint)puVar7 >> 8),*(undefined1 *)((int)puVar1 + 10));
          unaff_EDI[0x46] = *(undefined1 *)((int)puVar1 + 10);
        }
        sVar5 = *(short *)((int)puVar1 + 0xb);
        *(short *)(unaff_EDI + 0x32) = sVar5;
        sVar4 = -((ushort)bVar3 * 0x100 + sVar5);
        iVar6 = (int)CONCAT11((char)((ushort)sVar4 >> 8) + '0',(char)sVar4);
        if ((*(byte *)(unaff_EBP + 0x45) & 1) == 0) {
          uVar9 = FUN_0041042c(param_1,CONCAT22((short)((uint)puVar7 >> 0x10),sVar5));
          iVar6 = (int)uVar9;
        }
        *(int *)(unaff_EDI + 0x25) = iVar6;
        *(int *)(unaff_EDI + 0x29) = iVar6;
        *(int *)(unaff_EDI + 0x49) = iVar6;
        iVar6 = 0;
        if (*(char *)(unaff_EBP + 0x22) == '\t') {
          if (*(char *)(unaff_EBP + 0x23) != '\0') {
            unaff_EDI[0x76] = *(char *)(unaff_EBP + 0x23);
          }
          iVar6 = (uint)(byte)unaff_EDI[0x76] << 8;
        }
        *(int *)(unaff_EDI + 0x10) = iVar6;
        unaff_EDI[100] = 0;
        unaff_EDI[0x68] = 0;
        unaff_EDI[0x6d] = 0;
        unaff_EDI[0x72] = 0;
        unaff_EDI[0x78] = 0;
      }
    }
    if ((unaff_EDI[0x34] != '\0') && (*(char *)(unaff_EBP + 0x20) != '\0')) {
      if (*(char *)(unaff_EBP + 0x24) != '\x01') {
        unaff_EDI[0x21] = unaff_EDI[0x45];
        unaff_EDI[0x22] = unaff_EDI[0x45];
        if ((*(byte *)(unaff_EBP + 0x45) & 2) == 0) {
          unaff_EDI[0x23] = unaff_EDI[0x46];
          unaff_EDI[0x24] = unaff_EDI[0x46];
        }
      }
      *(undefined2 *)(unaff_EDI + 0x35) = 0x8000;
      unaff_EDI[0x37] = 0;
      unaff_EDI[0x38] = 0;
      *(undefined4 *)(unaff_EDI + 0x39) = 0;
      *(undefined2 *)(unaff_EDI + 0x3d) = 0;
      *(undefined4 *)(unaff_EDI + 0x3f) = 0;
      *(undefined2 *)(unaff_EDI + 0x43) = 0;
    }
    if (((*(char *)(unaff_EBP + 0x2a) != '\0') && (*(char *)(unaff_EBP + 0x20) == '\0')) &&
       (*(char *)(*(int *)(unaff_EDI + 0x2e) + 0x6a) == '\0')) {
      *(undefined2 *)(unaff_EDI + 0x35) = 0;
    }
  }
  return;
}


// ==== FUN_00410678 @ 00410678 ====

undefined2 FUN_00410678(void)

{
  int unaff_EBP;
  
  thunk_FUN_0041032e();
  return CONCAT11(*(undefined1 *)(unaff_EBP + 0x4ba4),*(undefined1 *)(unaff_EBP + 0x4ba0));
}


// ==== FUN_0041068c @ 0041068c ====

void FUN_0041068c(void)

{
  return;
}


// ==== FUN_00410daf @ 00410daf ====

void FUN_00410daf(void)

{
  int in_EAX;
  int unaff_retaddr;
  
                    /* WARNING: Could not recover jumptable at 0x00410dbe. Too many branches */
                    /* WARNING: Treating indirect jump as call */
  (*(code *)(*(int *)(unaff_retaddr + 0x4f9 + in_EAX * 4) + -0x712 + unaff_retaddr))();
  return;
}


// ==== FUN_00410dc0 @ 00410dc0 ====

void __fastcall FUN_00410dc0(undefined4 param_1,undefined4 param_2)

{
  ushort *puVar1;
  byte bVar2;
  ushort uVar3;
  undefined4 *puVar4;
  int iVar5;
  ushort uVar6;
  uint uVar7;
  int iVar8;
  int extraout_ECX;
  int extraout_ECX_00;
  int extraout_ECX_01;
  int extraout_ECX_02;
  int extraout_ECX_03;
  int extraout_ECX_04;
  undefined4 extraout_EDX;
  undefined4 extraout_EDX_00;
  undefined4 extraout_EDX_01;
  undefined4 extraout_EDX_02;
  undefined4 uVar9;
  byte *unaff_EBP;
  byte *pbVar10;
  byte *pbVar11;
  byte *pbVar12;
  undefined8 uVar13;
  
  unaff_EBP[5] = 0;
  pbVar12 = unaff_EBP + 0x277b;
  iVar8 = 0;
  do {
    pbVar12[0x22] = pbVar12[0x21];
    pbVar12[0x24] = pbVar12[0x23];
    *(undefined4 *)(pbVar12 + 0x29) = *(undefined4 *)(pbVar12 + 0x25);
    pbVar12 = pbVar12 + 0x100;
    iVar8 = iVar8 + 1;
  } while (iVar8 != *(int *)(unaff_EBP + 0x37));
  unaff_EBP[3] = unaff_EBP[3] + 1;
  if (unaff_EBP[3] != unaff_EBP[4]) goto LAB_00410f4c;
  unaff_EBP[3] = 0;
  if (unaff_EBP[0x1e] != 0) {
    unaff_EBP[0x1e] = unaff_EBP[0x1e] - 1;
    goto LAB_00410f4c;
  }
  unaff_EBP[5] = 1;
  *(int *)(unaff_EBP + 6) = *(int *)(unaff_EBP + 6) + 1;
  if (*(int *)(unaff_EBP + 0x16) == -1) {
    if (*(uint *)(unaff_EBP + 0xe) <= *(uint *)(unaff_EBP + 6)) {
      *(int *)(unaff_EBP + 0x16) = *(int *)(unaff_EBP + 0x12) + 1;
      unaff_EBP[0x1a] = 0;
      unaff_EBP[0x1b] = 0;
      unaff_EBP[0x1c] = 0;
      unaff_EBP[0x1d] = 0;
      goto LAB_00410e35;
    }
  }
  else {
LAB_00410e35:
    if (*(int *)(unaff_EBP + 0x12) != *(int *)(unaff_EBP + 0x16)) {
      pbVar12 = unaff_EBP + 0x277b;
      iVar8 = 0;
      do {
        pbVar12[0x6b] = 0;
        pbVar12[0x6c] = 0;
        pbVar12 = pbVar12 + 0x100;
        iVar8 = iVar8 + 1;
      } while (iVar8 != *(int *)(unaff_EBP + 0x37));
    }
    uVar7 = *(uint *)(unaff_EBP + 0x16);
    if (*(uint *)(unaff_EBP + 0x2f) <= uVar7) {
      uVar7 = *(uint *)(unaff_EBP + 0x33);
    }
    *(uint *)(unaff_EBP + 0x12) = uVar7;
    *(undefined4 *)(unaff_EBP + 6) = *(undefined4 *)(unaff_EBP + 0x1a);
    unaff_EBP[0x16] = 0xff;
    unaff_EBP[0x17] = 0xff;
    unaff_EBP[0x18] = 0xff;
    unaff_EBP[0x19] = 0xff;
    puVar4 = *(undefined4 **)
              (unaff_EBP + (uint)unaff_EBP[*(int *)(unaff_EBP + 0x12) + 0x7b] * 4 + 0x37b);
    *(undefined4 *)(unaff_EBP + 0xe) = *puVar4;
    iVar8 = *(int *)(unaff_EBP + 0x1a);
    pbVar12 = (byte *)(puVar4 + 1);
    while (iVar8 != 0) {
      while( true ) {
        bVar2 = *pbVar12;
        if (bVar2 == 0) break;
        pbVar11 = pbVar12 + 1;
        if ((bVar2 & 0x20) != 0) {
          pbVar11 = pbVar12 + 3;
        }
        pbVar12 = pbVar11;
        if ((bVar2 & 0x40) != 0) {
          pbVar12 = pbVar12 + 1;
        }
        if ((bVar2 & 0x80) != 0) {
          pbVar12 = pbVar12 + 2;
        }
      }
      pbVar11 = unaff_EBP + 0x1a;
      *(int *)pbVar11 = *(int *)pbVar11 + -1;
      pbVar12 = pbVar12 + 1;
      iVar8 = *(int *)pbVar11;
    }
    *(byte **)(unaff_EBP + 10) = pbVar12;
  }
  pbVar11 = *(byte **)(unaff_EBP + 10);
  pbVar12 = unaff_EBP + 0x277b;
  iVar8 = 0;
  do {
    unaff_EBP[0x1f] = 0;
    unaff_EBP[0x20] = 0;
    unaff_EBP[0x21] = 0;
    unaff_EBP[0x22] = 0;
    unaff_EBP[0x23] = 0;
    pbVar12[0x47] = 0xff;
    if ((*pbVar11 != 0) && ((*pbVar11 & 0x1f) == (byte)iVar8)) {
      pbVar10 = pbVar11 + 1;
      bVar2 = *pbVar11;
      if ((bVar2 & 0x20) != 0) {
        unaff_EBP[0x1f] = *pbVar10;
        pbVar10 = pbVar11 + 3;
        unaff_EBP[0x20] = pbVar11[2];
      }
      pbVar11 = pbVar10;
      if ((bVar2 & 0x40) != 0) {
        pbVar11 = pbVar10 + 1;
        unaff_EBP[0x21] = *pbVar10;
      }
      if ((bVar2 & 0x80) != 0) {
        pbVar10 = pbVar11 + 1;
        unaff_EBP[0x22] = *pbVar11;
        pbVar11 = pbVar11 + 2;
        unaff_EBP[0x23] = *pbVar10;
      }
      unaff_EBP[0x24] = 0;
      FUN_00410488(iVar8,param_2);
      bVar2 = unaff_EBP[0x21];
      unaff_EBP[0x21] = unaff_EBP[0x21] & 0xf;
      pbVar12[0x48] = bVar2 >> 4;
      thunk_FUN_00410daf();
      iVar8 = extraout_ECX;
      param_2 = extraout_EDX;
      if (unaff_EBP[0x22] < 0x34) {
        pbVar12[0x47] = unaff_EBP[0x22];
        thunk_FUN_00410daf();
        iVar8 = extraout_ECX_00;
        param_2 = extraout_EDX_00;
      }
    }
    pbVar12 = pbVar12 + 0x100;
    iVar8 = iVar8 + 1;
  } while (iVar8 != *(int *)(unaff_EBP + 0x37));
  *(byte **)(unaff_EBP + 10) = pbVar11 + 1;
LAB_00410f4c:
  pbVar12 = unaff_EBP + 0x277b;
  do {
    thunk_FUN_00410daf();
    iVar8 = extraout_ECX_01;
    uVar9 = extraout_EDX_01;
    if (pbVar12[0x47] < 0x34) {
      thunk_FUN_00410daf();
      iVar8 = extraout_ECX_02;
      uVar9 = extraout_EDX_02;
    }
    iVar5 = *(int *)(pbVar12 + 0x2e);
    if (iVar5 != 0) {
      pbVar12[0x22] =
           (byte)((uint)(ushort)(((ushort)((ushort)pbVar12[0x22] * (ushort)unaff_EBP[1]) >> 6 & 0xff
                                 ) * (ushort)*unaff_EBP) * (uint)*(ushort *)(pbVar12 + 0x35) >> 0x14
                 );
      if (pbVar12[0x34] == 0) {
        uVar3 = *(ushort *)(iVar5 + 100);
        puVar1 = (ushort *)(pbVar12 + 0x35);
        uVar6 = *puVar1;
        *puVar1 = *puVar1 - uVar3;
        if (uVar6 < uVar3) {
          pbVar12[0x35] = 0;
          pbVar12[0x36] = 0;
        }
      }
      iVar8 = *(int *)(pbVar12 + 0x39);
      if ((*(short *)(pbVar12 + 0x3d) != 0) && ((char)iVar8 == *(char *)(iVar5 + 0x6d))) {
        iVar8 = CONCAT31((int3)((uint)iVar8 >> 8),*(undefined1 *)(iVar5 + 0x6c));
        *(int *)(pbVar12 + 0x39) = iVar8;
      }
      puVar1 = (ushort *)(iVar5 + 0x6e + iVar8 * 4);
      if ((char)iVar8 == *(char *)(iVar5 + 0x6a)) {
        pbVar12[0x22] = (byte)((ushort)((ushort)(byte)puVar1[1] * (ushort)pbVar12[0x22]) >> 6);
      }
      else {
        pbVar12[0x22] =
             (byte)((ushort)((ushort)(byte)((char)(((int)(short)(puVar1[3] - puVar1[1]) *
                                                   (int)*(short *)(pbVar12 + 0x3d)) /
                                                  (int)(short)*puVar1) + (char)puVar1[1]) *
                            (ushort)pbVar12[0x22]) >> 6);
        if ((((*(short *)(pbVar12 + 0x3d) != 0) || (pbVar12[0x34] == 0)) ||
            (uVar6 = 0, (char)*(undefined4 *)(pbVar12 + 0x39) != *(char *)(iVar5 + 0x6b))) &&
           (uVar6 = *(short *)(pbVar12 + 0x3d) + 1, *puVar1 <= uVar6)) {
          uVar6 = 0;
          *(int *)(pbVar12 + 0x39) = *(int *)(pbVar12 + 0x39) + 1;
        }
        *(ushort *)(pbVar12 + 0x3d) = uVar6;
      }
      iVar8 = *(int *)(pbVar12 + 0x3f);
      if ((*(short *)(pbVar12 + 0x43) != 0) && ((char)iVar8 == *(char *)(iVar5 + 0xa1))) {
        iVar8 = CONCAT31((int3)((uint)iVar8 >> 8),*(undefined1 *)(iVar5 + 0xa0));
        *(int *)(pbVar12 + 0x3f) = iVar8;
      }
      puVar1 = (ushort *)(iVar5 + 0xa2 + iVar8 * 4);
      if ((char)iVar8 == *(char *)(iVar5 + 0x9e)) {
        pbVar12[0x24] =
             pbVar12[0x24] +
             (char)((ushort)((short)(char)((char)puVar1[1] + -0x20) *
                            (short)(char)(pbVar12[0x24] ^ (char)pbVar12[0x24] >> 7)) >> 5);
      }
      else {
        pbVar12[0x24] =
             pbVar12[0x24] +
             (char)((ushort)((short)(char)((char)((short)((puVar1[3] - puVar1[1]) *
                                                         *(short *)(pbVar12 + 0x43)) /
                                                 (short)(char)*puVar1) + (char)puVar1[1] + -0x20) *
                            (short)(char)(pbVar12[0x24] ^ (char)pbVar12[0x24] >> 7)) >> 5);
        if ((((*(short *)(pbVar12 + 0x43) != 0) || (pbVar12[0x34] == 0)) ||
            (uVar6 = 0, (char)*(undefined4 *)(pbVar12 + 0x3f) != *(char *)(iVar5 + 0x9f))) &&
           (uVar6 = *(short *)(pbVar12 + 0x43) + 1, *puVar1 <= uVar6)) {
          uVar6 = 0;
          *(int *)(pbVar12 + 0x3f) = *(int *)(pbVar12 + 0x3f) + 1;
        }
        *(ushort *)(pbVar12 + 0x43) = uVar6;
      }
      if (pbVar12[0x38] < *(byte *)(iVar5 + 0x67)) {
        pbVar12[0x38] = pbVar12[0x38] + 1;
      }
      uVar13 = FUN_0041068c();
      uVar9 = (undefined4)((ulonglong)uVar13 >> 0x20);
      *(int *)(pbVar12 + 0x29) = (int)uVar13;
      pbVar12[0x37] = pbVar12[0x37] + *(char *)(iVar5 + 0x69);
      iVar8 = extraout_ECX_03;
    }
    *(ushort *)(pbVar12 + 0x16) = (ushort)pbVar12[0x22];
    pbVar12[0x18] = pbVar12[0x24];
    uVar7 = *(uint *)(pbVar12 + 0x29);
    if ((unaff_EBP[0x45] & 1) == 0) {
      if (99 < uVar7) {
        uVar7 = (uint)(0x14476e / (ulonglong)uVar7);
      }
    }
    else {
      uVar13 = FUN_0041042c(iVar8,uVar9);
      uVar7 = (uint)((int)uVar13 * 0xe) / 0x1ee;
      iVar8 = extraout_ECX_04;
    }
    *(ushort *)(pbVar12 + 0x14) = (ushort)uVar7 & 0xfffe;
    pbVar12 = pbVar12 + 0x100;
  } while (iVar8 + 1 != *(int *)(unaff_EBP + 0x37));
  return;
}


// ==== FUN_00411147 @ 00411147 ====

void FUN_00411147(void)

{
  undefined4 uVar1;
  int iVar2;
  undefined1 *unaff_EBP;
  undefined4 *puVar3;
  undefined1 *puVar4;
  
  uVar1 = thunk_FUN_0041032e();
  if (unaff_EBP[0x4b9f] == '\0') {
    *(undefined4 *)(unaff_EBP + 0x16) = uVar1;
    *(undefined4 *)(unaff_EBP + 0x12) = uVar1;
    *(undefined4 *)(unaff_EBP + 6) = 0;
    puVar3 = (undefined4 *)(unaff_EBP + 0x277b);
    for (iVar2 = 0x800; iVar2 != 0; iVar2 = iVar2 + -1) {
      *puVar3 = 0;
      puVar3 = puVar3 + 1;
    }
    puVar4 = unaff_EBP + 0x277b;
    iVar2 = 0;
    do {
      puVar4[0x23] = unaff_EBP[iVar2 + 0x5b];
      puVar4 = puVar4 + 0x100;
      iVar2 = iVar2 + 1;
    } while ((char)iVar2 != ' ');
    *unaff_EBP = 0x40;
    *(undefined4 *)(unaff_EBP + 0x1a) = 0;
    unaff_EBP[2] = 0;
    unaff_EBP[4] = unaff_EBP[0x43];
    unaff_EBP[3] = unaff_EBP[0x43] + -1;
    *(uint *)(unaff_EBP + 0x25) = (uint)(byte)unaff_EBP[0x44];
    unaff_EBP[0x4b9f] = unaff_EBP[0x4b9f] + '\x01';
  }
  return;
}


// ==== FUN_004111b1 @ 004111b1 ====

void FUN_004111b1(void)

{
  int unaff_EBP;
  
  thunk_FUN_0041032e();
  if (*(char *)(unaff_EBP + 0x4b9f) != '\0') {
    *(char *)(unaff_EBP + 0x4b9f) = *(char *)(unaff_EBP + 0x4b9f) + -1;
  }
  return;
}


// ==== FUN_004114d0 @ 004114d0 ====

void __fastcall FUN_004114d0(uint param_1)

{
  int iVar1;
  uint uVar2;
  int *unaff_ESI;
  undefined2 *unaff_EDI;
  
  uVar2 = param_1 >> 1;
  if (uVar2 != 0) {
    do {
      iVar1 = *unaff_ESI;
      if (0x7ef4 < iVar1) {
        iVar1 = 0x7ef4;
      }
      if (iVar1 < -0x7ef4) {
        iVar1 = -0x7ef4;
      }
      *unaff_EDI = (short)iVar1;
      uVar2 = uVar2 - 1;
      unaff_ESI = unaff_ESI + 1;
      unaff_EDI = unaff_EDI + 1;
    } while (uVar2 != 0);
  }
  return;
}


// ==== FUN_004114f1 @ 004114f1 ====

undefined8 __fastcall
FUN_004114f1(undefined4 param_1,undefined4 param_2,undefined4 param_3,undefined4 *param_4)

{
  int *piVar1;
  undefined4 *puVar2;
  int iVar3;
  undefined4 extraout_ECX;
  undefined4 extraout_ECX_00;
  undefined4 extraout_ECX_01;
  undefined4 extraout_ECX_02;
  int iVar4;
  undefined4 extraout_ECX_03;
  int iVar5;
  int iVar6;
  undefined4 extraout_ECX_04;
  undefined4 extraout_ECX_05;
  undefined4 uVar7;
  undefined4 uVar8;
  undefined4 *unaff_EBP;
  undefined4 *puVar9;
  undefined1 *puVar10;
  undefined *puVar11;
  undefined1 *puVar12;
  byte bVar13;
  bool bVar14;
  bool bVar15;
  undefined8 uVar16;
  
  puVar9 = &DAT_00424e6c;
  for (iVar3 = 0x90046; iVar3 != 0; iVar3 = iVar3 + -1) {
    *(undefined1 *)puVar9 = 0;
    puVar9 = (undefined4 *)((int)puVar9 + 1);
  }
  puVar11 = &DAT_00424eb2;
  uVar16 = FUN_0041038c(0,param_2);
  iVar3 = (int)uVar16;
  uVar16 = Ordinal_1(iVar3,&DAT_00424e74,iVar3);
  puVar2 = DAT_00424e74;
  bVar14 = false;
  uVar7 = extraout_ECX;
  puVar9 = unaff_EBP;
  if ((int)uVar16 == 0) {
    puVar11 = (undefined *)*DAT_00424e74;
    uVar16 = (**(code **)(puVar11 + 0x18))(DAT_00424e74,param_1,3);
    bVar14 = false;
    uVar7 = extraout_ECX_00;
    param_4 = puVar2;
    if ((int)uVar16 == 0) {
      puVar9 = &DAT_00424e70;
      uVar16 = (**(code **)(puVar11 + 0xc))(puVar2,&DAT_00411727,&DAT_00424e70,0);
      bVar14 = (int)uVar16 == 0;
      uVar7 = extraout_ECX_01;
    }
  }
  bVar15 = false;
  if (bVar14) {
    uVar16 = (**(code **)(puVar11 + 0xc))(param_4,&DAT_00411713,&DAT_00424e6c,(int)uVar16);
    bVar15 = (int)uVar16 == 0;
    uVar7 = extraout_ECX_02;
  }
  uVar8 = (undefined4)((ulonglong)uVar16 >> 0x20);
  if (bVar15) {
    puVar10 = &DAT_004116ff;
    puVar12 = &DAT_00424ea0;
    for (iVar4 = (int)uVar16 + 0x12; iVar4 != 0; iVar4 = iVar4 + -1) {
      *puVar12 = *puVar10;
      puVar10 = puVar10 + 1;
      puVar12 = puVar12 + 1;
    }
    (**(code **)(*(int *)*puVar9 + 0x38))((int *)*puVar9,&DAT_00424ea0);
    piVar1 = DAT_00424e6c;
    iVar4 = *DAT_00424e6c;
    uVar16 = (**(code **)(iVar4 + 0x2c))
                       (DAT_00424e6c,0,0,&DAT_00424e80,&DAT_00424e84,&DAT_00424e88,&DAT_00424e8c,2);
    uVar8 = (undefined4)((ulonglong)uVar16 >> 0x20);
    uVar7 = extraout_ECX_03;
    iVar5 = DAT_00424e84;
    puVar10 = DAT_00424e80;
    if ((int)uVar16 == 0) {
      for (; iVar6 = DAT_00424e8c, puVar12 = DAT_00424e88, iVar5 != 0; iVar5 = iVar5 + -1) {
        *puVar10 = 0;
        puVar10 = puVar10 + 1;
      }
      for (; iVar6 != 0; iVar6 = iVar6 + -1) {
        *puVar12 = 0;
        puVar12 = puVar12 + 1;
      }
      uVar16 = (**(code **)(iVar4 + 0x4c))
                         (piVar1,DAT_00424e80,DAT_00424e84,DAT_00424e88,DAT_00424e8c);
      uVar8 = (undefined4)((ulonglong)uVar16 >> 0x20);
      uVar7 = extraout_ECX_04;
      if ((int)uVar16 == 0) {
        uVar16 = (**(code **)(iVar4 + 0x30))(piVar1,0,0,1,1);
        uVar8 = (undefined4)((ulonglong)uVar16 >> 0x20);
        uVar7 = extraout_ECX_05;
        if ((int)uVar16 == 0) {
          DAT_00424e7c = CreateThread((LPSECURITY_ATTRIBUTES)0x0,0,
                                      (LPTHREAD_START_ROUTINE)&LAB_00411631,(LPVOID)0x0,0,
                                      (LPDWORD)&DAT_00424e9c);
          SetThreadPriority(DAT_00424e7c,iVar3 + 1);
          bVar13 = 1;
          unaff_EBP = (undefined4 *)register0x00000010;
          goto LAB_004115f5;
        }
      }
    }
  }
  FUN_004115fa(uVar7,uVar8);
  bVar13 = 0;
LAB_004115f5:
  return CONCAT44(unaff_EBP,-(uint)bVar13);
}


// ==== FUN_004115fa @ 004115fa ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined8 __fastcall FUN_004115fa(undefined4 param_1,undefined4 param_2)

{
  undefined4 in_EAX;
  
  _DAT_00424e78 = _DAT_00424e78 + 1;
  if (DAT_00424e7c != (HANDLE)0x0) {
    WaitForSingleObject(DAT_00424e7c,1000);
  }
  (*(code *)&LAB_00411623_1)();
  (*(code *)&LAB_00411623_1)();
  if (DAT_00424e74 != (int *)0x0) {
    (**(code **)(*DAT_00424e74 + 8))(DAT_00424e74);
  }
  return CONCAT44(param_2,in_EAX);
}


