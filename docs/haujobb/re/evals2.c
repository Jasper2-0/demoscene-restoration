// ==== forced_0x40ffc0 @ 0040ffc0 ====

void __thiscall forced_0x40ffc0(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  undefined4 *puVar3;
  int iVar4;
  
  puVar1 = param_2;
  if (param_2[1] == 0) {
    uVar2 = FUN_0041dd0a((char *)(param_1 + 8),4,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
    if ((uVar2 == 0) == 0) {
      uVar2 = FUN_0041dd0a((char *)&param_2,4,1,(int *)*puVar1);
      puVar1[1] = (uint)(uVar2 == 0);
    }
  }
  iVar4 = 0;
  if (0 < (int)param_2) {
    do {
      puVar3 = FUN_0042d756(0x28);
      if (puVar3 == (undefined4 *)0x0) {
        puVar3 = (undefined4 *)0x0;
      }
      else {
        *puVar3 = &PTR_FUN_00438af8;
      }
      (**(code **)*puVar3)(puVar1);
      FUN_0042ce27((void *)(param_1 + 0xc),*(int *)(param_1 + 0x14),puVar3);
      iVar4 = iVar4 + 1;
    } while (iVar4 < (int)param_2);
  }
  return;
}


// ==== forced_0x40fd50 @ 0040fd50 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall forced_0x40fd50(int param_1)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  float fVar5;
  int iVar6;
  
  if (*(int *)(param_1 + 0x14) != 1) {
    if (*(int *)(param_1 + 0x14) == 2) {
      iVar6 = **(int **)(param_1 + 0x10);
      *(float *)(iVar6 + 0x24) =
           (_DAT_00438638 - *(float *)(iVar6 + 8)) *
           (*(float *)((*(int **)(param_1 + 0x10))[1] + 0x20) - *(float *)(iVar6 + 0x20));
      iVar6 = (*(int **)(param_1 + 0x10))[1];
      *(float *)(iVar6 + 0x1c) =
           (_DAT_00438638 - *(float *)(iVar6 + 8)) *
           (*(float *)(iVar6 + 0x20) - *(float *)(**(int **)(param_1 + 0x10) + 0x20));
      return;
    }
    piVar1 = *(int **)(param_1 + 0x10);
    iVar6 = piVar1[1];
    iVar2 = *piVar1;
    fVar5 = (float)(*(int *)(iVar6 + 4) - *(int *)(iVar2 + 4));
    *(float *)(iVar2 + 0x24) =
         (_DAT_00438638 - *(float *)(iVar2 + 8)) *
         ((*(float *)(iVar6 + 0x20) - *(float *)(iVar2 + 0x20)) * _DAT_00438868 -
         (_DAT_00438638 - *(float *)(iVar6 + 8)) *
         (*(float *)(iVar6 + 0x10) + _DAT_00438638) *
         (_DAT_00438638 - *(float *)(iVar6 + 0x10)) *
         ((*(float *)(piVar1[2] + 0x20) - *(float *)(iVar6 + 0x20)) +
         (*(float *)(iVar6 + 0x20) - *(float *)(iVar2 + 0x20))) *
         ((fVar5 / ((float)(*(int *)(piVar1[2] + 4) - *(int *)(iVar6 + 4)) + fVar5) - _DAT_0043863c)
          * (_DAT_00438638 - ABS(*(float *)(iVar6 + 0xc))) + _DAT_0043863c) * _DAT_0043863c);
    iVar6 = 1;
    if (1 < *(int *)(param_1 + 0x14) + -1) {
      do {
        iVar2 = *(int *)(param_1 + 0x10);
        iVar3 = *(int *)(iVar2 + iVar6 * 4);
        iVar4 = *(int *)(iVar2 + 4 + iVar6 * 4);
        iVar2 = *(int *)(iVar2 + -4 + iVar6 * 4);
        fVar5 = (float)(*(int *)(iVar3 + 4) - *(int *)(iVar2 + 4));
        *(float *)(iVar3 + 0x1c) =
             (_DAT_00438638 - *(float *)(iVar3 + 8)) *
             (_DAT_00438638 - *(float *)(iVar3 + 0x10)) *
             (*(float *)(iVar3 + 0x10) + _DAT_00438638) *
             ((*(float *)(iVar4 + 0x20) - *(float *)(iVar3 + 0x20)) +
             (*(float *)(iVar3 + 0x20) - *(float *)(iVar2 + 0x20))) *
             ((fVar5 / ((float)(*(int *)(iVar4 + 4) - *(int *)(iVar3 + 4)) + fVar5) - _DAT_0043863c)
              * (_DAT_00438638 - ABS(*(float *)(iVar3 + 0xc))) + _DAT_0043863c);
        iVar2 = *(int *)(param_1 + 0x10);
        iVar3 = *(int *)(iVar2 + 4 + iVar6 * 4);
        iVar4 = *(int *)(iVar2 + iVar6 * 4);
        iVar2 = *(int *)(iVar2 + -4 + iVar6 * 4);
        fVar5 = (float)(*(int *)(iVar3 + 4) - *(int *)(iVar4 + 4));
        iVar6 = iVar6 + 1;
        *(float *)(iVar4 + 0x24) =
             (_DAT_00438638 - *(float *)(iVar4 + 8)) *
             ((_DAT_00438638 - *(float *)(iVar4 + 0xc)) *
              (_DAT_00438638 - *(float *)(iVar4 + 0x10)) *
              (*(float *)(iVar3 + 0x20) - *(float *)(iVar4 + 0x20)) +
             (*(float *)(iVar4 + 0xc) + _DAT_00438638) *
             (*(float *)(iVar4 + 0x10) + _DAT_00438638) *
             (*(float *)(iVar4 + 0x20) - *(float *)(iVar2 + 0x20))) *
             ((fVar5 / ((float)(*(int *)(iVar4 + 4) - *(int *)(iVar2 + 4)) + fVar5) - _DAT_0043863c)
              * (_DAT_00438638 - ABS(*(float *)(iVar4 + 0xc))) + _DAT_0043863c);
      } while (iVar6 < *(int *)(param_1 + 0x14) + -1);
    }
    iVar2 = *(int *)(*(int *)(param_1 + 0x10) + iVar6 * 4);
    iVar6 = *(int *)(*(int *)(param_1 + 0x10) + iVar6 * 4 + -4);
    *(float *)(iVar2 + 0x1c) =
         (_DAT_00438638 - *(float *)(iVar2 + 8)) *
         ((*(float *)(iVar2 + 0x20) - *(float *)(iVar6 + 0x20)) * _DAT_00438868 -
         *(float *)(iVar6 + 0x24) * _DAT_0043863c);
  }
  return;
}


// ==== forced_0x40a990 @ 0040a990 ====

void __thiscall forced_0x40a990(void *param_1,undefined4 *param_2)

{
  FUN_0040a840(param_1,param_2);
  FUN_00405050();
  (**(code **)(*(int *)((int)param_1 + 0x28) + 8))(param_2);
  (**(code **)(*(int *)((int)param_1 + 0x130) + 8))(param_2);
  (**(code **)(*(int *)((int)param_1 + 0x150) + 8))(param_2);
  (**(code **)(*(int *)((int)param_1 + 0x94) + 8))(param_2);
  return;
}


// ==== FUN_0040ad70 @ 0040ad70 ====

void __fastcall FUN_0040ad70(int param_1)

{
  (*(code *)**(undefined4 **)(param_1 + 0xd4))();
  (*(code *)**(undefined4 **)(param_1 + 0x28))();
  (*(code *)**(undefined4 **)(param_1 + 0x130))();
  (*(code *)**(undefined4 **)(param_1 + 0x150))();
  return;
}


// ==== forced_0x40adb0 @ 0040adb0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 __thiscall forced_0x40adb0(int param_1,float param_2,undefined4 param_3,char param_4)

{
  int iVar1;
  int iVar2;
  undefined4 uVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  undefined4 uVar7;
  float *pfVar8;
  float *pfVar9;
  void *pvVar10;
  undefined4 *puVar11;
  float *pfVar12;
  float *pfVar13;
  float *pfVar14;
  float *pfVar15;
  float fStack_b0;
  float fStack_ac;
  float fStack_a8;
  float fStack_a4;
  float fStack_a0;
  float fStack_9c;
  float fStack_98;
  float fStack_94;
  float fStack_90;
  float fStack_8c;
  float fStack_88;
  float fStack_84;
  float fStack_7c;
  float fStack_78;
  float fStack_74;
  float fStack_70;
  float fStack_6c;
  float fStack_68;
  undefined4 uStack_64;
  undefined4 uStack_60;
  undefined4 uStack_5c;
  undefined4 uStack_58;
  undefined4 uStack_54;
  undefined4 uStack_50;
  undefined4 uStack_4c;
  undefined4 uStack_48;
  undefined4 uStack_44;
  float afStack_40 [4];
  float afStack_30 [3];
  float afStack_24 [3];
  float afStack_18 [3];
  float afStack_c [3];
  
  if ((param_4 != '\0') &&
     (uVar7 = FUN_00404900((void *)(param_1 + 0x94),param_2), (char)uVar7 == '\0')) {
    return uVar7;
  }
  *(float *)(param_1 + 0xbc) = param_2;
  if (*(int *)(param_1 + 0x2c) < *(int *)(param_1 + 0x3c) + -1) {
    do {
      iVar1 = *(int *)(param_1 + 0x2c) + 1;
      if (param_2 < (float)*(int *)(*(int *)(*(int *)(param_1 + 0x38) + 4 +
                                            *(int *)(param_1 + 0x2c) * 4) + 4)) break;
      *(int *)(param_1 + 0x2c) = iVar1;
    } while (iVar1 < *(int *)(param_1 + 0x3c) + -1);
  }
  iVar1 = *(int *)(param_1 + 0x2c);
  while ((0 < iVar1 &&
         (param_2 < (float)*(int *)(*(int *)(*(int *)(param_1 + 0x38) + *(int *)(param_1 + 0x2c) * 4
                                            ) + 4)))) {
    iVar1 = *(int *)(param_1 + 0x2c) + -1;
    *(int *)(param_1 + 0x2c) = iVar1;
  }
  if ((*(int *)(param_1 + 0x3c) == 1) ||
     (iVar1 = *(int *)(param_1 + 0x2c), iVar1 == *(int *)(param_1 + 0x3c) + -1)) {
    puVar11 = (undefined4 *)
              (*(int *)(*(int *)(param_1 + 0x38) + *(int *)(param_1 + 0x2c) * 4) + 0x28);
  }
  else {
    iVar2 = *(int *)(*(int *)(param_1 + 0x38) + iVar1 * 4);
    iVar1 = *(int *)(*(int *)(param_1 + 0x38) + 4 + iVar1 * 4);
    fStack_7c = *(float *)(iVar1 + 0x1c);
    fStack_78 = *(float *)(iVar1 + 0x20);
    fStack_a8 = (param_2 - (float)*(int *)(iVar2 + 4)) /
                (float)(*(int *)(iVar1 + 4) - *(int *)(iVar2 + 4));
    fStack_74 = *(float *)(iVar1 + 0x24);
    uStack_4c = *(undefined4 *)(iVar1 + 0x28);
    uStack_48 = *(undefined4 *)(iVar1 + 0x2c);
    uStack_44 = *(undefined4 *)(iVar1 + 0x30);
    uStack_58 = *(undefined4 *)(iVar2 + 0x34);
    uStack_54 = *(undefined4 *)(iVar2 + 0x38);
    uStack_64 = *(undefined4 *)(iVar2 + 0x28);
    uStack_50 = *(undefined4 *)(iVar2 + 0x3c);
    uStack_60 = *(undefined4 *)(iVar2 + 0x2c);
    uStack_5c = *(undefined4 *)(iVar2 + 0x30);
    fVar4 = fStack_a8 * fStack_a8;
    fVar5 = fVar4 * fStack_a8;
    fStack_a4 = fVar5 - fVar4;
    fStack_84 = fVar5 + fVar5;
    fStack_ac = fVar4 * _DAT_0043886c - fStack_84;
    fStack_a8 = (fVar5 - (fVar4 + fVar4)) + fStack_a8;
    fStack_b0 = (fStack_84 - fVar4 * _DAT_0043886c) + _DAT_00438638;
    FUN_00409d60(&fStack_a0);
    fStack_a0 = fStack_7c * fStack_a4;
    fStack_9c = fStack_a4 * fStack_78;
    fStack_98 = fStack_a4 * fStack_74;
    pfVar12 = &fStack_70;
    pfVar15 = afStack_24;
    fStack_70 = fStack_a0;
    fStack_6c = fStack_9c;
    fStack_68 = fStack_98;
    pfVar8 = (float *)FUN_00405810(&uStack_4c,afStack_30,&fStack_ac);
    pfVar14 = afStack_c;
    pfVar9 = (float *)FUN_00405810(&uStack_58,afStack_18,&fStack_a8);
    pfVar13 = &fStack_94;
    pvVar10 = (void *)FUN_00405810(&uStack_64,afStack_40,&fStack_b0);
    pvVar10 = (void *)FUN_00406040(pvVar10,pfVar13,pfVar9);
    pvVar10 = (void *)FUN_00406040(pvVar10,pfVar14,pfVar8);
    puVar11 = (undefined4 *)FUN_00406040(pvVar10,pfVar15,pfVar12);
  }
  uVar7 = puVar11[1];
  uVar3 = puVar11[2];
  *(undefined4 *)(param_1 + 0x48) = *puVar11;
  *(undefined4 *)(param_1 + 0x4c) = uVar7;
  *(undefined4 *)(param_1 + 0x50) = uVar3;
  pfVar12 = (float *)FUN_00403ac0((void *)(param_1 + 0x130),afStack_40,param_2);
  fStack_94 = *pfVar12;
  fStack_90 = pfVar12[1];
  fStack_8c = pfVar12[2];
  fStack_88 = pfVar12[3];
  pfVar12 = (float *)FUN_0040f6f0((void *)(param_1 + 0x150),afStack_40,param_2);
  fStack_90 = _DAT_00438970 * fStack_90;
  fStack_8c = _DAT_00438970 * fStack_8c;
  fVar4 = *pfVar12;
  fVar5 = pfVar12[1];
  fStack_88 = _DAT_00438970 * fStack_88;
  fVar6 = pfVar12[2];
  fStack_94 = _DAT_00438970 * fStack_94;
  *(float *)(param_1 + 0x54) =
       ((_DAT_00438638 - fStack_8c * fStack_8c) - fStack_88 * fStack_88) * fVar4;
  *(float *)(param_1 + 0x58) = (fStack_8c * fStack_90 - fStack_94 * fStack_88) * fVar4;
  *(float *)(param_1 + 0x5c) = (fStack_94 * fStack_8c + fStack_88 * fStack_90) * fVar4;
  *(undefined4 *)(param_1 + 0x84) = *(undefined4 *)(param_1 + 0x48);
  *(undefined4 *)(param_1 + 0x88) = *(undefined4 *)(param_1 + 0x4c);
  *(undefined4 *)(param_1 + 0x8c) = *(undefined4 *)(param_1 + 0x50);
  *(float *)(param_1 + 100) = (fStack_94 * fStack_88 + fStack_8c * fStack_90) * fVar5;
  fVar4 = _DAT_00438638 - fStack_90 * fStack_90;
  *(float *)(param_1 + 0x68) = (fVar4 - fStack_88 * fStack_88) * fVar5;
  *(float *)(param_1 + 0x6c) = (fStack_88 * fStack_8c - fStack_90 * fStack_94) * fVar5;
  *(float *)(param_1 + 0x74) = (fStack_88 * fStack_90 - fStack_94 * fStack_8c) * fVar6;
  *(float *)(param_1 + 0x78) = (fStack_90 * fStack_94 + fStack_88 * fStack_8c) * fVar6;
  *(float *)(param_1 + 0x7c) = (fVar4 - fStack_8c * fStack_8c) * fVar6;
  DAT_00450f94 = DAT_00450f94 + 1;
  return CONCAT31((int3)((uint)DAT_00450f94 >> 8),1);
}


// ==== FUN_0040b1d0 @ 0040b1d0 ====

void __thiscall FUN_0040b1d0(void *this,undefined4 param_1)

{
  int iVar1;
  int iVar2;
  int iVar3;
  
  if (*(char *)((int)this + 0xb4) != '\0') {
    if (*(char *)((int)this + 0x178) != '\0') {
      if ((char)param_1 == '\0') {
        glCallList(*(undefined4 *)((int)this + 0x170));
        DAT_00450f90 = DAT_00450f90 + 1;
        return;
      }
      glCallList(*(undefined4 *)((int)this + 0x174));
      DAT_00450f90 = DAT_00450f90 + 1;
      return;
    }
    if (*(int *)((int)this + 0xe8) == 0) {
      iVar2 = 0;
      if (0 < *(int *)((int)this + 0x124)) {
        do {
          iVar3 = *(int *)(*(int *)((int)this + 0x120) + iVar2 * 4);
          (**(code **)**(undefined4 **)(iVar3 + 0x18))
                    ((int)this + 0xc0,iVar3 + 4,(int)this + 0x108,param_1);
          iVar2 = iVar2 + 1;
        } while (iVar2 < *(int *)((int)this + 0x124));
        DAT_00450f90 = DAT_00450f90 + 1;
        return;
      }
    }
    else {
      iVar2 = FUN_00404950((void *)((int)this + 0xd4),*(float *)((int)this + 0xbc));
      iVar3 = 0;
      if (0 < *(int *)((int)this + 0x124)) {
        do {
          iVar1 = *(int *)(*(int *)((int)this + 0x120) + iVar3 * 4);
          (**(code **)**(undefined4 **)(iVar1 + 0x18))(iVar2,iVar1 + 4,(int)this + 0x108,param_1);
          iVar3 = iVar3 + 1;
        } while (iVar3 < *(int *)((int)this + 0x124));
      }
    }
    DAT_00450f90 = DAT_00450f90 + 1;
  }
  return;
}


// ==== forced_0x40a120 @ 0040a120 ====

undefined1 forced_0x40a120(void)

{
  return 1;
}


// ==== FUN_0040b530 @ 0040b530 ====

void __thiscall FUN_0040b530(void *this,undefined4 param_1)

{
  (**(code **)(*(int *)((int)this + 0x28) + 8))(param_1);
  (**(code **)(*(int *)((int)this + 0xb8) + 8))(param_1);
  (**(code **)(*(int *)((int)this + 0xd8) + 8))(param_1);
  (**(code **)(**(int **)((int)this + 0xf8) + 4))(param_1);
  (**(code **)(*(int *)((int)this + 0x94) + 8))(param_1);
  return;
}


// ==== FUN_0040ce00 @ 0040ce00 ====

void __fastcall FUN_0040ce00(int param_1)

{
  (*(code *)**(undefined4 **)(param_1 + 0x28))();
  (*(code *)**(undefined4 **)(param_1 + 0xb8))();
  (*(code *)**(undefined4 **)(param_1 + 0xd8))();
  return;
}


// ==== forced_0x40be10 @ 0040be10 ====

void __fastcall forced_0x40be10(int param_1)

{
                    /* WARNING: Could not recover jumptable at 0x0040be16. Too many branches */
                    /* WARNING: Treating indirect jump as call */
  (*(code *)**(undefined4 **)(param_1 + 0x28))();
  return;
}


// ==== FUN_0040cc10 @ 0040cc10 ====

void __fastcall FUN_0040cc10(int param_1)

{
  (*(code *)**(undefined4 **)(param_1 + 0x28))();
  (*(code *)**(undefined4 **)(param_1 + 0xd0))();
  (*(code *)**(undefined4 **)(param_1 + 0xf0))();
  return;
}


// ==== FUN_0040c4d0 @ 0040c4d0 ====

void __fastcall FUN_0040c4d0(int param_1)

{
  (*(code *)**(undefined4 **)(param_1 + 0x28))();
  (*(code *)**(undefined4 **)(param_1 + 0xd4))();
  (*(code *)**(undefined4 **)(param_1 + 0xf4))();
  return;
}


// ==== FUN_0040cdd0 @ 0040cdd0 ====

void __thiscall FUN_0040cdd0(void *this,undefined4 param_1)

{
  (**(code **)(*(int *)((int)this + 0x28) + 8))(param_1);
  (**(code **)(*(int *)((int)this + 0x94) + 8))(param_1);
  return;
}


// ==== forced_0x40bdf0 @ 0040bdf0 ====

void __thiscall forced_0x40bdf0(int param_1,undefined4 param_2)

{
  (**(code **)(*(int *)(param_1 + 0x28) + 8))(param_2);
  return;
}


