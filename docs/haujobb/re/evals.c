// ==== forced_0x40f660 @ 0040f660 ====

void __thiscall forced_0x40f660(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  int iVar3;
  undefined4 uStack_4;
  
  puVar1 = param_2;
  uStack_4 = *(undefined4 *)(param_1 + 0x14);
  if (param_2[1] == 0) {
    uVar2 = FUN_0041de21((char *)&uStack_4,4,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 8);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  iVar3 = 0;
  if (0 < *(int *)(param_1 + 0x14)) {
    do {
      (**(code **)(**(int **)(*(int *)(param_1 + 0x10) + iVar3 * 4) + 4))(puVar1);
      iVar3 = iVar3 + 1;
    } while (iVar3 < *(int *)(param_1 + 0x14));
  }
  return;
}


// ==== forced_0x4035c0 @ 004035c0 ====

void __thiscall forced_0x4035c0(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  int iVar3;
  undefined4 uStack_4;
  
  puVar1 = param_2;
  uStack_4 = *(undefined4 *)(param_1 + 0x14);
  if (param_2[1] == 0) {
    uVar2 = FUN_0041de21((char *)&uStack_4,4,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 8);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  iVar3 = 0;
  if (0 < *(int *)(param_1 + 0x14)) {
    do {
      (**(code **)(**(int **)(*(int *)(param_1 + 0x10) + iVar3 * 4) + 4))(puVar1);
      iVar3 = iVar3 + 1;
    } while (iVar3 < *(int *)(param_1 + 0x14));
  }
  return;
}


// ==== forced_0x40efe0 @ 0040efe0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall forced_0x40efe0(int param_1)

{
  undefined4 uVar1;
  undefined4 uVar2;
  int iVar3;
  int *piVar4;
  int iVar5;
  float fVar6;
  float fVar7;
  void *pvVar8;
  undefined4 *puVar9;
  float *pfVar10;
  float *pfVar11;
  float *pfVar12;
  int iVar13;
  float *pfVar14;
  float *pfVar15;
  float *pfVar16;
  float *pfVar17;
  float *pfVar18;
  float *pfVar19;
  float *pfVar20;
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
  float fStack_80;
  float fStack_7c;
  float afStack_78 [3];
  float afStack_6c [3];
  float fStack_60;
  float fStack_5c;
  float fStack_58;
  float afStack_54 [3];
  float afStack_48 [3];
  float afStack_3c [3];
  float afStack_30 [3];
  float afStack_24 [3];
  float afStack_18 [3];
  float afStack_c [3];
  
  FUN_00409d60(&fStack_60);
  if (*(int *)(param_1 + 0x14) != 1) {
    if (*(int *)(param_1 + 0x14) == 2) {
      pfVar11 = &fStack_ac;
      pfVar20 = &fStack_9c;
      iVar13 = **(int **)(param_1 + 0x10);
      fStack_ac = _DAT_00438638 - *(float *)(iVar13 + 8);
      pvVar8 = (void *)FUN_00405860((void *)((*(int **)(param_1 + 0x10))[1] + 0x28),&fStack_90,
                                    (float *)(iVar13 + 0x28));
      puVar9 = (undefined4 *)FUN_00405810(pvVar8,pfVar20,pfVar11);
      iVar13 = **(int **)(param_1 + 0x10);
      uVar1 = puVar9[1];
      uVar2 = puVar9[2];
      *(undefined4 *)(iVar13 + 0x34) = *puVar9;
      *(undefined4 *)(iVar13 + 0x38) = uVar1;
      *(undefined4 *)(iVar13 + 0x3c) = uVar2;
      iVar13 = (*(int **)(param_1 + 0x10))[1];
      iVar3 = **(int **)(param_1 + 0x10);
      FUN_00409d60(&fStack_90);
      fStack_ac = _DAT_00438638 - *(float *)(iVar13 + 8);
      pfVar11 = &fStack_ac;
      pfVar20 = &fStack_9c;
      pvVar8 = (void *)FUN_00405860((void *)(iVar13 + 0x28),afStack_30,(float *)(iVar3 + 0x28));
      puVar9 = (undefined4 *)FUN_00405810(pvVar8,pfVar20,pfVar11);
      iVar13 = *(int *)(*(int *)(param_1 + 0x10) + 4);
      uVar1 = puVar9[1];
      uVar2 = puVar9[2];
      *(undefined4 *)(iVar13 + 0x1c) = *puVar9;
      *(undefined4 *)(iVar13 + 0x20) = uVar1;
      *(undefined4 *)(iVar13 + 0x24) = uVar2;
      return;
    }
    piVar4 = *(int **)(param_1 + 0x10);
    iVar13 = piVar4[2];
    iVar3 = piVar4[1];
    iVar5 = *piVar4;
    FUN_00409d60(&fStack_90);
    fVar6 = (float)(*(int *)(iVar3 + 4) - *(int *)(iVar5 + 4));
    pfVar11 = &fStack_ac;
    pfVar12 = afStack_30;
    pfVar20 = &fStack_80;
    pfVar19 = afStack_24;
    pfVar18 = &fStack_84;
    pfVar15 = afStack_c;
    pfVar17 = &fStack_a0;
    pfVar16 = afStack_18;
    fStack_ac = (fVar6 / ((float)(*(int *)(iVar13 + 4) - *(int *)(iVar3 + 4)) + fVar6) -
                _DAT_0043863c) * (_DAT_00438638 - ABS(*(float *)(iVar3 + 0xc))) + _DAT_0043863c;
    fStack_80 = _DAT_00438638 - *(float *)(iVar3 + 8);
    fStack_a8 = *(float *)(iVar3 + 0x10) + _DAT_00438638;
    fStack_a4 = _DAT_00438638 - *(float *)(iVar3 + 0x10);
    fStack_a0 = fStack_a4;
    fStack_84 = fStack_a8;
    pvVar8 = (void *)FUN_00405860((void *)(iVar13 + 0x28),afStack_6c,(float *)(iVar3 + 0x28));
    pvVar8 = (void *)FUN_00405810(pvVar8,pfVar16,pfVar17);
    pfVar10 = (float *)FUN_00405810(pvVar8,pfVar15,pfVar18);
    pfVar18 = afStack_54;
    pfVar17 = &fStack_a4;
    pfVar16 = afStack_3c;
    pfVar15 = &fStack_a8;
    pfVar14 = afStack_48;
    pvVar8 = (void *)FUN_00405860((float *)(iVar3 + 0x28),afStack_78,(float *)(iVar5 + 0x28));
    pvVar8 = (void *)FUN_00405810(pvVar8,pfVar14,pfVar15);
    pvVar8 = (void *)FUN_00405810(pvVar8,pfVar16,pfVar17);
    pvVar8 = (void *)FUN_00406040(pvVar8,pfVar18,pfVar10);
    pvVar8 = (void *)FUN_00405810(pvVar8,pfVar19,pfVar20);
    pfVar11 = (float *)FUN_00405810(pvVar8,pfVar12,pfVar11);
    fStack_90 = *pfVar11;
    fStack_8c = pfVar11[1];
    fStack_88 = pfVar11[2];
    fStack_60 = *pfVar11;
    fStack_5c = pfVar11[1];
    fStack_58 = pfVar11[2];
    fStack_9c = *pfVar11;
    iVar13 = (*(int **)(param_1 + 0x10))[1];
    iVar3 = **(int **)(param_1 + 0x10);
    fStack_98 = pfVar11[1];
    fStack_94 = pfVar11[2];
    FUN_00409d60(&fStack_90);
    fStack_a8 = _DAT_00438638 - *(float *)(iVar3 + 8);
    pfVar11 = &fStack_a8;
    pfVar20 = afStack_78;
    fStack_a4 = 0.5;
    fStack_a0 = 1.5;
    pfVar12 = (float *)FUN_00405810(&fStack_9c,afStack_48,&fStack_a4);
    pfVar15 = afStack_3c;
    pfVar18 = &fStack_a0;
    pfVar17 = afStack_54;
    pvVar8 = (void *)FUN_00405860((void *)(iVar13 + 0x28),afStack_6c,(float *)(iVar3 + 0x28));
    pvVar8 = (void *)FUN_00405810(pvVar8,pfVar17,pfVar18);
    pvVar8 = (void *)FUN_00405860(pvVar8,pfVar15,pfVar12);
    pfVar11 = (float *)FUN_00405810(pvVar8,pfVar20,pfVar11);
    fStack_90 = *pfVar11;
    fStack_8c = pfVar11[1];
    fStack_88 = pfVar11[2];
    iVar13 = **(int **)(param_1 + 0x10);
    fVar6 = pfVar11[1];
    fVar7 = pfVar11[2];
    *(float *)(iVar13 + 0x34) = *pfVar11;
    *(float *)(iVar13 + 0x38) = fVar6;
    *(float *)(iVar13 + 0x3c) = fVar7;
    iVar13 = 1;
    if (1 < *(int *)(param_1 + 0x14) + -1) {
      do {
        iVar3 = *(int *)(param_1 + 0x10);
        fStack_ac = *(float *)(iVar3 + -4 + iVar13 * 4);
        iVar5 = *(int *)(iVar3 + 4 + iVar13 * 4);
        iVar3 = *(int *)(iVar3 + iVar13 * 4);
        FUN_00409d60(&fStack_9c);
        pfVar11 = afStack_78;
        fVar6 = (float)(*(int *)(iVar3 + 4) - *(int *)((int)fStack_ac + 4));
        pfVar20 = &fStack_a8;
        pfVar18 = &fStack_a4;
        pfVar17 = afStack_48;
        pfVar15 = &fStack_a0;
        pfVar19 = afStack_3c;
        pfVar12 = &fStack_84;
        pfVar16 = afStack_54;
        fStack_a8 = (fVar6 / ((float)(*(int *)(iVar5 + 4) - *(int *)(iVar3 + 4)) + fVar6) -
                    _DAT_0043863c) * (_DAT_00438638 - ABS(*(float *)(iVar3 + 0xc))) + _DAT_0043863c;
        fStack_a4 = _DAT_00438638 - *(float *)(iVar3 + 8);
        fStack_a0 = *(float *)(iVar3 + 0x10) + _DAT_00438638;
        fStack_84 = _DAT_00438638 - *(float *)(iVar3 + 0x10);
        fStack_80 = fStack_84;
        fStack_7c = fStack_a0;
        pvVar8 = (void *)FUN_00405860((void *)(iVar5 + 0x28),afStack_6c,(float *)(iVar3 + 0x28));
        pvVar8 = (void *)FUN_00405810(pvVar8,pfVar16,pfVar12);
        pfVar10 = (float *)FUN_00405810(pvVar8,pfVar19,pfVar15);
        pfVar19 = afStack_18;
        pfVar15 = &fStack_80;
        pfVar16 = afStack_c;
        pfVar12 = &fStack_7c;
        pfVar14 = afStack_24;
        pvVar8 = (void *)FUN_00405860((float *)(iVar3 + 0x28),afStack_30,
                                      (float *)((int)fStack_ac + 0x28));
        pvVar8 = (void *)FUN_00405810(pvVar8,pfVar14,pfVar12);
        pvVar8 = (void *)FUN_00405810(pvVar8,pfVar16,pfVar15);
        pvVar8 = (void *)FUN_00406040(pvVar8,pfVar19,pfVar10);
        pvVar8 = (void *)FUN_00405810(pvVar8,pfVar17,pfVar18);
        pfVar11 = (float *)FUN_00405810(pvVar8,pfVar11,pfVar20);
        fStack_9c = *pfVar11;
        fStack_98 = pfVar11[1];
        fStack_94 = pfVar11[2];
        iVar3 = *(int *)(*(int *)(param_1 + 0x10) + iVar13 * 4);
        fVar6 = pfVar11[1];
        fVar7 = pfVar11[2];
        *(float *)(iVar3 + 0x1c) = *pfVar11;
        *(float *)(iVar3 + 0x20) = fVar6;
        *(float *)(iVar3 + 0x24) = fVar7;
        iVar3 = *(int *)(param_1 + 0x10);
        puVar9 = (undefined4 *)
                 FUN_00410420(&fStack_90,*(int *)(iVar3 + -4 + iVar13 * 4),
                              *(int *)(iVar3 + iVar13 * 4),*(int *)(iVar3 + 4 + iVar13 * 4));
        iVar3 = *(int *)(iVar3 + iVar13 * 4);
        iVar13 = iVar13 + 1;
        *(undefined4 *)(iVar3 + 0x34) = *puVar9;
        *(undefined4 *)(iVar3 + 0x38) = puVar9[1];
        *(undefined4 *)(iVar3 + 0x3c) = puVar9[2];
      } while (iVar13 < *(int *)(param_1 + 0x14) + -1);
    }
    fStack_a8 = 0.5;
    fStack_a4 = 1.5;
    iVar3 = *(int *)(*(int *)(param_1 + 0x10) + -4 + iVar13 * 4);
    iVar5 = *(int *)(*(int *)(param_1 + 0x10) + iVar13 * 4);
    fStack_9c = *(float *)(iVar3 + 0x34);
    pfVar11 = &fStack_7c;
    fStack_98 = *(float *)(iVar3 + 0x38);
    pfVar20 = afStack_78;
    fStack_94 = *(float *)(iVar3 + 0x3c);
    fStack_7c = _DAT_00438638 - *(float *)(iVar5 + 8);
    pfVar12 = (float *)FUN_00405810(&fStack_9c,afStack_48,&fStack_a8);
    pfVar15 = afStack_3c;
    pfVar18 = &fStack_a4;
    pfVar17 = afStack_54;
    pvVar8 = (void *)FUN_00405860((void *)(iVar5 + 0x28),afStack_6c,(float *)(iVar3 + 0x28));
    pvVar8 = (void *)FUN_00405810(pvVar8,pfVar17,pfVar18);
    pvVar8 = (void *)FUN_00405860(pvVar8,pfVar15,pfVar12);
    puVar9 = (undefined4 *)FUN_00405810(pvVar8,pfVar20,pfVar11);
    iVar13 = *(int *)(*(int *)(param_1 + 0x10) + iVar13 * 4);
    uVar1 = puVar9[1];
    uVar2 = puVar9[2];
    *(undefined4 *)(iVar13 + 0x1c) = *puVar9;
    *(undefined4 *)(iVar13 + 0x20) = uVar1;
    *(undefined4 *)(iVar13 + 0x24) = uVar2;
  }
  return;
}


// ==== forced_0x403650 @ 00403650 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall forced_0x403650(int param_1)

{
  int *piVar1;
  int iVar2;
  float fVar3;
  int iVar4;
  undefined4 *puVar5;
  int iVar6;
  float fStack_50;
  float fStack_4c;
  float fStack_48;
  float fStack_44;
  float fStack_40;
  float fStack_3c;
  float fStack_38;
  float fStack_34;
  float fStack_30;
  float fStack_2c;
  float fStack_28;
  float fStack_24;
  float afStack_20 [4];
  undefined4 auStack_10 [4];
  
  FUN_00409d60(&fStack_3c);
  fStack_40 = 0.0;
  FUN_00409d60(&fStack_4c);
  FUN_00409d60(&fStack_2c);
  fStack_30 = 0.0;
  if (*(int *)(param_1 + 0x14) != 1) {
    piVar1 = *(int **)(param_1 + 0x10);
    if (*(int *)(param_1 + 0x14) == 2) {
      iVar2 = *piVar1;
      fStack_40 = *(float *)(iVar2 + 0x2c);
      fStack_3c = *(float *)(iVar2 + 0x30);
      fStack_38 = *(float *)(iVar2 + 0x34);
      fStack_34 = *(float *)(iVar2 + 0x38);
      iVar2 = piVar1[1];
      fVar3 = *(float *)(iVar2 + 0x2c);
      fStack_4c = *(float *)(iVar2 + 0x30);
      fStack_48 = *(float *)(iVar2 + 0x34);
      fStack_44 = *(float *)(iVar2 + 0x38);
      puVar5 = (undefined4 *)
               FUN_00404520(afStack_20,fStack_40,fStack_3c,fStack_38,fStack_34,
                            *(float *)(iVar2 + 0x2c),*(float *)(iVar2 + 0x30),
                            *(float *)(iVar2 + 0x34),*(float *)(iVar2 + 0x38),
                            (_DAT_00438638 - *(float *)(*piVar1 + 8)) * _DAT_00438830);
      iVar2 = *piVar1;
      *(undefined4 *)(iVar2 + 0x3c) = *puVar5;
      *(undefined4 *)(iVar2 + 0x40) = puVar5[1];
      *(undefined4 *)(iVar2 + 0x44) = puVar5[2];
      *(undefined4 *)(iVar2 + 0x48) = puVar5[3];
      iVar2 = *(int *)(param_1 + 0x10);
      puVar5 = (undefined4 *)
               FUN_00404520(afStack_20,fVar3,fStack_4c,fStack_48,fStack_44,fStack_40,fStack_3c,
                            fStack_38,fStack_34,
                            (_DAT_00438638 - *(float *)(*(int *)(iVar2 + 4) + 8)) * _DAT_00438830);
      iVar2 = *(int *)(iVar2 + 4);
      *(undefined4 *)(iVar2 + 0x1c) = *puVar5;
      *(undefined4 *)(iVar2 + 0x20) = puVar5[1];
      *(undefined4 *)(iVar2 + 0x24) = puVar5[2];
      *(undefined4 *)(iVar2 + 0x28) = puVar5[3];
      return;
    }
    iVar2 = *piVar1;
    fStack_40 = *(float *)(iVar2 + 0x2c);
    fStack_3c = *(float *)(iVar2 + 0x30);
    fStack_38 = *(float *)(iVar2 + 0x34);
    fStack_34 = *(float *)(iVar2 + 0x38);
    iVar2 = piVar1[1];
    fStack_50 = *(float *)(iVar2 + 0x2c);
    fStack_4c = *(float *)(iVar2 + 0x30);
    fStack_48 = *(float *)(iVar2 + 0x34);
    fStack_44 = *(float *)(iVar2 + 0x38);
    puVar5 = (undefined4 *)
             FUN_00403de0(afStack_20,fStack_40,fStack_3c,fStack_38,fStack_34,
                          *(float *)(iVar2 + 0x2c),*(float *)(iVar2 + 0x30),*(float *)(iVar2 + 0x34)
                          ,*(float *)(iVar2 + 0x38),*piVar1);
    iVar2 = *piVar1;
    iVar6 = 1;
    *(undefined4 *)(iVar2 + 0x3c) = *puVar5;
    *(undefined4 *)(iVar2 + 0x40) = puVar5[1];
    *(undefined4 *)(iVar2 + 0x44) = puVar5[2];
    *(undefined4 *)(iVar2 + 0x48) = puVar5[3];
    if (1 < *(int *)(param_1 + 0x14) + -1) {
      do {
        iVar2 = *(int *)(param_1 + 0x10);
        iVar4 = *(int *)(iVar2 + -4 + iVar6 * 4);
        fStack_40 = *(float *)(iVar4 + 0x2c);
        fStack_3c = *(float *)(iVar4 + 0x30);
        fStack_38 = *(float *)(iVar4 + 0x34);
        fStack_34 = *(float *)(iVar4 + 0x38);
        iVar4 = *(int *)(iVar2 + iVar6 * 4);
        fStack_50 = *(float *)(iVar4 + 0x2c);
        fStack_4c = *(float *)(iVar4 + 0x30);
        fStack_48 = *(float *)(iVar4 + 0x34);
        fStack_44 = *(float *)(iVar4 + 0x38);
        iVar4 = *(int *)(iVar2 + 4 + iVar6 * 4);
        fStack_30 = *(float *)(iVar4 + 0x2c);
        fStack_2c = *(float *)(iVar4 + 0x30);
        fStack_28 = *(float *)(iVar4 + 0x34);
        fStack_24 = *(float *)(iVar4 + 0x38);
        puVar5 = (undefined4 *)
                 FUN_00403f20(afStack_20,fStack_40,fStack_3c,fStack_38,fStack_34,fStack_50,fStack_4c
                              ,fStack_48,fStack_44,*(float *)(iVar4 + 0x2c),*(float *)(iVar4 + 0x30)
                              ,*(float *)(iVar4 + 0x34),*(float *)(iVar4 + 0x38),
                              *(float *)(iVar2 + -4 + iVar6 * 4),*(float *)(iVar2 + iVar6 * 4),
                              *(int *)(iVar2 + 4 + iVar6 * 4));
        iVar2 = *(int *)(iVar2 + iVar6 * 4);
        *(undefined4 *)(iVar2 + 0x1c) = *puVar5;
        *(undefined4 *)(iVar2 + 0x20) = puVar5[1];
        *(undefined4 *)(iVar2 + 0x24) = puVar5[2];
        *(undefined4 *)(iVar2 + 0x28) = puVar5[3];
        iVar2 = *(int *)(param_1 + 0x10);
        puVar5 = (undefined4 *)
                 FUN_00404220(auStack_10,fStack_40,fStack_3c,fStack_38,fStack_34,fStack_50,fStack_4c
                              ,fStack_48,fStack_44,fStack_30,fStack_2c,fStack_28,fStack_24,
                              *(float *)(iVar2 + -4 + iVar6 * 4),*(float *)(iVar2 + iVar6 * 4),
                              *(int *)(iVar2 + 4 + iVar6 * 4));
        iVar2 = *(int *)(iVar2 + iVar6 * 4);
        iVar6 = iVar6 + 1;
        *(undefined4 *)(iVar2 + 0x3c) = *puVar5;
        *(undefined4 *)(iVar2 + 0x40) = puVar5[1];
        *(undefined4 *)(iVar2 + 0x44) = puVar5[2];
        *(undefined4 *)(iVar2 + 0x48) = puVar5[3];
      } while (iVar6 < *(int *)(param_1 + 0x14) + -1);
    }
    iVar2 = *(int *)(param_1 + 0x10);
    puVar5 = (undefined4 *)
             FUN_00403e80(auStack_10,fStack_50,fStack_4c,fStack_48,fStack_44,fStack_30,fStack_2c,
                          fStack_28,fStack_24,*(int *)(iVar2 + iVar6 * 4));
    iVar2 = *(int *)(iVar2 + iVar6 * 4);
    *(undefined4 *)(iVar2 + 0x1c) = *puVar5;
    *(undefined4 *)(iVar2 + 0x20) = puVar5[1];
    *(undefined4 *)(iVar2 + 0x24) = puVar5[2];
    *(undefined4 *)(iVar2 + 0x28) = puVar5[3];
  }
  return;
}


// ==== forced_0x410b00 @ 00410b00 ====

void __thiscall forced_0x410b00(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  undefined4 uStack_4;
  
  puVar1 = param_2;
  uStack_4 = *(undefined4 *)(param_1 + 4);
  if (param_2[1] == 0) {
    uVar2 = FUN_0041de21((char *)&uStack_4,4,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 0x14);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 0x18);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
    if ((uVar2 == 0) == 0) {
      uVar2 = FUN_0041de21((char *)(param_1 + 0x28),0xc,1,(int *)*puVar1);
      puVar1[1] = (uint)(uVar2 == 0);
    }
  }
  return;
}


// ==== forced_0x410fe0 @ 00410fe0 ====

void __thiscall forced_0x410fe0(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  undefined4 uStack_4;
  
  puVar1 = param_2;
  uStack_4 = *(undefined4 *)(param_1 + 4);
  if (param_2[1] == 0) {
    uVar2 = FUN_0041de21((char *)&uStack_4,4,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 0x14);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 0x18);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
    if ((uVar2 == 0) == 0) {
      uVar2 = FUN_0041de21((char *)(param_1 + 0x20),4,1,(int *)*puVar1);
      puVar1[1] = (uint)(uVar2 == 0);
    }
  }
  return;
}


// ==== forced_0x406cf0 @ 00406cf0 ====

void __thiscall forced_0x406cf0(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  undefined4 uStack_4;
  
  puVar1 = param_2;
  uStack_4 = *(undefined4 *)(param_1 + 4);
  if (param_2[1] == 0) {
    uVar2 = FUN_0041de21((char *)&uStack_4,4,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 0x14);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  param_2 = *(undefined4 **)(param_1 + 0x18);
  if (puVar1[1] == 0) {
    uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
    puVar1[1] = (uint)(uVar2 == 0);
    if ((uVar2 == 0) == 0) {
      uVar2 = FUN_0041de21((char *)(param_1 + 0x2c),0x10,1,(int *)*puVar1);
      puVar1[1] = (uint)(uVar2 == 0);
    }
  }
  return;
}


// ==== forced_0x4047e0 @ 004047e0 ====

void __thiscall forced_0x4047e0(int param_1,undefined4 param_2)

{
  undefined4 *puVar1;
  int unaff_EBX;
  int iVar2;
  
  puVar1 = FUN_0042d756(8);
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    *puVar1 = &PTR_FUN_00438854;
  }
  (**(code **)*puVar1)(param_2);
  iVar2 = param_1;
  if (puVar1[1] != -1) {
    do {
      FUN_0042ce27((void *)(param_1 + 0xc),*(int *)(param_1 + 0x14),puVar1);
      puVar1 = FUN_0042d756(8);
      if (puVar1 == (undefined4 *)0x0) {
        puVar1 = (undefined4 *)0x0;
      }
      else {
        *puVar1 = &PTR_FUN_00438854;
      }
      (**(code **)*puVar1)(param_2);
      iVar2 = unaff_EBX;
    } while (puVar1[1] != -1);
  }
  FUN_0042d77f(puVar1);
  *(undefined1 *)(iVar2 + 0x20) = 1;
  return;
}


// ==== forced_0x404e40 @ 00404e40 ====

void __thiscall forced_0x404e40(int param_1,undefined4 *param_2)

{
  uint uVar1;
  undefined4 *puVar2;
  int iVar3;
  void *this;
  int iVar4;
  undefined4 *puVar5;
  int iVar6;
  int iStack_c;
  int iStack_8;
  undefined4 *puStack_4;
  
  if (param_2[1] == 0) {
    uVar1 = FUN_0041dd0a((char *)(param_1 + 8),4,1,(int *)*param_2);
    param_2[1] = (uint)(uVar1 == 0);
    if ((uVar1 == 0) == 0) {
      uVar1 = FUN_0041dd0a((char *)&iStack_c,4,1,(int *)*param_2);
      param_2[1] = (uint)(uVar1 == 0);
    }
  }
  iVar4 = iStack_c;
  iStack_8 = iStack_c;
  if (iStack_c == 0) {
    this = *(void **)(param_1 + 0x10);
    if (this != (void *)0x0) {
      for (iVar4 = *(int *)(param_1 + 0x14); iVar4 != 0; iVar4 = iVar4 + -1) {
        FUN_004071c0(this,0);
        this = (void *)((int)this + 0x58);
      }
      FUN_0042d77f(*(LPVOID *)(param_1 + 0x10));
      *(undefined4 *)(param_1 + 0x10) = 0;
    }
    *(undefined4 *)(param_1 + 0x18) = 0;
    *(undefined4 *)(param_1 + 0x14) = 0;
  }
  else {
    iVar6 = *(int *)(param_1 + 0x10);
    if (iVar6 == 0) {
      puVar2 = FUN_0042d756(iStack_c * 0x58);
      *(undefined4 **)(param_1 + 0x10) = puVar2;
      FUN_00406eb0(puVar2,iVar4);
      *(int *)(param_1 + 0x18) = iVar4;
      *(int *)(param_1 + 0x14) = iVar4;
    }
    else if (*(int *)(param_1 + 0x18) < iStack_c) {
      iVar4 = *(int *)(param_1 + 0x1c);
      if (iVar4 == 0) {
        iVar4 = (int)(*(int *)(param_1 + 0x14) + (*(int *)(param_1 + 0x14) >> 0x1f & 7U)) >> 3;
        if (iVar4 < 4) {
          iVar4 = 4;
        }
        else if (0x400 < iVar4) {
          iVar4 = 0x400;
        }
      }
      iVar4 = *(int *)(param_1 + 0x18) + iVar4;
      if (iVar4 <= iStack_c) {
        iVar4 = iStack_c;
      }
      puStack_4 = FUN_0042d756(iVar4 * 0x58);
      iVar6 = iStack_8;
      puVar2 = *(undefined4 **)(param_1 + 0x10);
      puVar5 = puStack_4;
      for (iVar3 = (*(int *)(param_1 + 0x14) * 0xb & 0x1fffffffU) << 1; iVar3 != 0;
          iVar3 = iVar3 + -1) {
        *puVar5 = *puVar2;
        puVar2 = puVar2 + 1;
        puVar5 = puVar5 + 1;
      }
      for (iVar3 = 0; iVar3 != 0; iVar3 = iVar3 + -1) {
        *(undefined1 *)puVar5 = *(undefined1 *)puVar2;
        puVar2 = (undefined4 *)((int)puVar2 + 1);
        puVar5 = (undefined4 *)((int)puVar5 + 1);
      }
      FUN_00406eb0(puStack_4 + *(int *)(param_1 + 0x14) * 0x16,iStack_8 - *(int *)(param_1 + 0x14));
      FUN_0042d77f(*(LPVOID *)(param_1 + 0x10));
      *(int *)(param_1 + 0x18) = iVar4;
      *(undefined4 **)(param_1 + 0x10) = puStack_4;
      *(int *)(param_1 + 0x14) = iVar6;
    }
    else {
      iVar3 = *(int *)(param_1 + 0x14);
      if (iVar3 < iStack_c) {
        FUN_00406eb0((undefined4 *)(iVar6 + iVar3 * 0x58),iStack_c - iVar3);
        *(int *)(param_1 + 0x14) = iVar4;
      }
      else {
        if (iStack_c < iVar3) {
          FUN_00406e80(iVar6 + iStack_c * 0x58,iVar3 - iStack_c);
        }
        *(int *)(param_1 + 0x14) = iVar4;
      }
    }
  }
  iVar4 = 0;
  if (0 < iStack_c) {
    iVar6 = 0;
    do {
      (*(code *)**(undefined4 **)(*(int *)(param_1 + 0x10) + iVar6))(param_2);
      iVar4 = iVar4 + 1;
      iVar6 = iVar6 + 0x58;
    } while (iVar4 < iStack_c);
  }
  if (1 < iStack_c) {
    FUN_004068c0((void *)(param_1 + 0x20),*(int *)(*(int *)(param_1 + 0x10) + 0x38),-1);
  }
  return;
}


// ==== forced_0x4048f0 @ 004048f0 ====

void forced_0x4048f0(void)

{
  return;
}


// ==== forced_0x404870 @ 00404870 ====

void __thiscall forced_0x404870(int param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  uint uVar2;
  int iVar3;
  char cStack_1;
  
  puVar1 = param_2;
  if (param_2[1] == 0) {
    uVar2 = FUN_0041de21(&cStack_1,1,1,(int *)*param_2);
    puVar1[1] = (uint)(uVar2 == 0);
  }
  iVar3 = 0;
  if (0 < *(int *)(param_1 + 0x14)) {
    do {
      param_2 = *(undefined4 **)(*(int *)(*(int *)(param_1 + 0x10) + iVar3 * 4) + 4);
      if (puVar1[1] == 0) {
        uVar2 = FUN_0041de21((char *)&param_2,4,1,(int *)*puVar1);
        puVar1[1] = (uint)(uVar2 == 0);
      }
      iVar3 = iVar3 + 1;
    } while (iVar3 < *(int *)(param_1 + 0x14));
  }
  return;
}


// ==== forced_0x404a30 @ 00404a30 ====

void __fastcall forced_0x404a30(int param_1)

{
  LPVOID pvVar1;
  undefined4 *puVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  undefined4 *puVar6;
  int iStack_58;
  int iStack_54;
  int iStack_50;
  undefined4 auStack_4c [3];
  undefined4 auStack_40 [3];
  undefined **ppuStack_34;
  LPVOID pvStack_30;
  int iStack_2c;
  undefined4 uStack_28;
  undefined4 uStack_24;
  undefined **ppuStack_20;
  LPVOID pvStack_1c;
  undefined4 uStack_18;
  undefined4 uStack_14;
  undefined4 uStack_10;
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 uStack_4;
  
  puStack_8 = &LAB_00436950;
  pvStack_c = ExceptionList;
  if (1 < *(int *)(param_1 + 0x14)) {
    if (*(int *)(param_1 + 0x14) == 2) {
      iVar3 = 0;
      ppuStack_34 = &PTR_LAB_0043885c;
      pvStack_30 = (LPVOID)0x0;
      uStack_24 = 0;
      uStack_28 = 0;
      iStack_2c = 0;
      uStack_4 = 0;
      ExceptionList = &pvStack_c;
      FUN_00405060((int)&ppuStack_34,*(int *)(param_1 + 0x10),*(int *)(param_1 + 0x10) + 0x58);
      iVar4 = *(int *)(param_1 + 0x10);
      FUN_004068c0((void *)(iVar4 + 0x44),iStack_2c,-1);
      if (0 < iStack_2c) {
        iStack_58 = 0;
        do {
          puVar6 = (undefined4 *)(iStack_58 + *(int *)(iVar4 + 0x48));
          puVar2 = (undefined4 *)FUN_00406dd0(&ppuStack_34,auStack_4c,iVar3);
          iVar3 = iVar3 + 1;
          *puVar6 = *puVar2;
          puVar6[1] = puVar2[1];
          iStack_58 = iStack_58 + 0xc;
          puVar6[2] = puVar2[2];
        } while (iVar3 < iStack_2c);
      }
      iVar3 = 0;
      FUN_004052a0((int)&ppuStack_34,*(int *)(param_1 + 0x10),*(int *)(param_1 + 0x10) + 0x58);
      iVar4 = *(int *)(param_1 + 0x10);
      FUN_004068c0((void *)(iVar4 + 0x74),iStack_2c,-1);
      if (0 < iStack_2c) {
        iVar5 = 0;
        do {
          puVar6 = (undefined4 *)(iVar5 + *(int *)(iVar4 + 0x78));
          puVar2 = (undefined4 *)FUN_00406dd0(&ppuStack_34,auStack_4c,iVar3);
          iVar3 = iVar3 + 1;
          *puVar6 = *puVar2;
          iVar5 = iVar5 + 0xc;
          puVar6[1] = puVar2[1];
          puVar6[2] = puVar2[2];
        } while (iVar3 < iStack_2c);
      }
      ppuStack_34 = &PTR_LAB_0043885c;
      uStack_4 = 1;
      pvVar1 = pvStack_30;
    }
    else {
      iVar3 = 0;
      ppuStack_20 = &PTR_LAB_0043885c;
      pvStack_1c = (LPVOID)0x0;
      uStack_10 = 0;
      uStack_14 = 0;
      uStack_18 = 0;
      iVar4 = *(int *)(param_1 + 0x10);
      uStack_4 = 2;
      ExceptionList = &pvStack_c;
      FUN_00405be0((int)&ppuStack_20,iVar4,iVar4 + 0x58,iVar4 + 0xb0);
      ppuStack_34 = &PTR_LAB_0043885c;
      pvStack_30 = (LPVOID)0x0;
      uStack_24 = 0;
      uStack_28 = 0;
      iStack_2c = 0;
      uStack_4 = CONCAT31(uStack_4._1_3_,3);
      FUN_004054e0((int)&ppuStack_34,&ppuStack_20,*(int *)(param_1 + 0x10),
                   *(int *)(param_1 + 0x10) + 0x58);
      iVar4 = *(int *)(param_1 + 0x10);
      FUN_004068c0((void *)(iVar4 + 0x44),iStack_2c,-1);
      if (0 < iStack_2c) {
        iStack_58 = 0;
        do {
          puVar6 = (undefined4 *)(iStack_58 + *(int *)(iVar4 + 0x48));
          puVar2 = (undefined4 *)FUN_00406dd0(&ppuStack_34,auStack_4c,iVar3);
          iVar3 = iVar3 + 1;
          *puVar6 = *puVar2;
          iStack_58 = iStack_58 + 0xc;
          puVar6[1] = puVar2[1];
          puVar6[2] = puVar2[2];
        } while (iVar3 < iStack_2c);
      }
      iVar4 = 1;
      iStack_50 = 1;
      if (1 < *(int *)(param_1 + 0x14) + -1) {
        iVar3 = 0x58;
        do {
          iVar4 = iVar3 + *(int *)(param_1 + 0x10);
          FUN_00405be0((int)&ppuStack_34,iVar4 + -0x58,iVar4,iVar3 + 0x58 + *(int *)(param_1 + 0x10)
                      );
          iVar4 = iVar3 + *(int *)(param_1 + 0x10);
          FUN_004068c0((void *)(iVar4 + 0x1c),iStack_2c,-1);
          iStack_58 = 0;
          if (0 < iStack_2c) {
            iStack_54 = 0;
            do {
              puVar6 = (undefined4 *)(iStack_54 + *(int *)(iVar4 + 0x20));
              puVar2 = (undefined4 *)FUN_00406dd0(&ppuStack_34,auStack_4c,iStack_58);
              *puVar6 = *puVar2;
              puVar6[1] = puVar2[1];
              iStack_54 = iStack_54 + 0xc;
              puVar6[2] = puVar2[2];
              iStack_58 = iStack_58 + 1;
            } while (iStack_58 < iStack_2c);
          }
          iVar4 = iVar3 + *(int *)(param_1 + 0x10);
          FUN_00406090((int)&ppuStack_34,iVar4 + -0x58,iVar4,iVar3 + 0x58 + *(int *)(param_1 + 0x10)
                      );
          iVar4 = iVar3 + *(int *)(param_1 + 0x10);
          FUN_004068c0((void *)(iVar4 + 0x44),iStack_2c,-1);
          iVar5 = 0;
          if (0 < iStack_2c) {
            iStack_54 = 0;
            do {
              puVar2 = (undefined4 *)FUN_00406dd0(&ppuStack_34,auStack_40,iVar5);
              puVar6 = (undefined4 *)(iStack_54 + *(int *)(iVar4 + 0x48));
              iVar5 = iVar5 + 1;
              *puVar6 = *puVar2;
              puVar6[1] = puVar2[1];
              puVar6[2] = puVar2[2];
              iStack_54 = iStack_54 + 0xc;
            } while (iVar5 < iStack_2c);
          }
          iVar4 = iStack_50 + 1;
          iVar3 = iVar3 + 0x58;
          iStack_50 = iVar4;
        } while (iVar4 < *(int *)(param_1 + 0x14) + -1);
      }
      iVar3 = iVar4 * 0x58 + *(int *)(param_1 + 0x10);
      FUN_004058b0((int)&ppuStack_34,(void *)(iVar3 + -0x14),iVar3 + -0x58,iVar3);
      iVar4 = iVar4 * 0x58 + *(int *)(param_1 + 0x10);
      FUN_004068c0((void *)(iVar4 + 0x1c),iStack_2c,-1);
      iVar3 = 0;
      if (0 < iStack_2c) {
        iVar5 = 0;
        do {
          puVar2 = (undefined4 *)FUN_00406dd0(&ppuStack_34,auStack_40,iVar3);
          puVar6 = (undefined4 *)(iVar5 + *(int *)(iVar4 + 0x20));
          iVar3 = iVar3 + 1;
          *puVar6 = *puVar2;
          puVar6[1] = puVar2[1];
          puVar6[2] = puVar2[2];
          iVar5 = iVar5 + 0xc;
        } while (iVar3 < iStack_2c);
      }
      ppuStack_34 = &PTR_LAB_0043885c;
      uStack_4 = CONCAT31(uStack_4._1_3_,4);
      if (pvStack_30 != (LPVOID)0x0) {
        FUN_0042d77f(pvStack_30);
      }
      ppuStack_20 = &PTR_LAB_0043885c;
      uStack_4 = 5;
      pvVar1 = pvStack_1c;
    }
    if (pvVar1 != (LPVOID)0x0) {
      FUN_0042d77f(pvVar1);
    }
  }
  ExceptionList = pvStack_c;
  return;
}


// ==== forced_0x404e40 @ 00404e40 ====

void __thiscall forced_0x404e40(int param_1,undefined4 *param_2)

{
  uint uVar1;
  undefined4 *puVar2;
  int iVar3;
  void *this;
  int iVar4;
  undefined4 *puVar5;
  int iVar6;
  int iStack_c;
  int iStack_8;
  undefined4 *puStack_4;
  
  if (param_2[1] == 0) {
    uVar1 = FUN_0041dd0a((char *)(param_1 + 8),4,1,(int *)*param_2);
    param_2[1] = (uint)(uVar1 == 0);
    if ((uVar1 == 0) == 0) {
      uVar1 = FUN_0041dd0a((char *)&iStack_c,4,1,(int *)*param_2);
      param_2[1] = (uint)(uVar1 == 0);
    }
  }
  iVar4 = iStack_c;
  iStack_8 = iStack_c;
  if (iStack_c == 0) {
    this = *(void **)(param_1 + 0x10);
    if (this != (void *)0x0) {
      for (iVar4 = *(int *)(param_1 + 0x14); iVar4 != 0; iVar4 = iVar4 + -1) {
        FUN_004071c0(this,0);
        this = (void *)((int)this + 0x58);
      }
      FUN_0042d77f(*(LPVOID *)(param_1 + 0x10));
      *(undefined4 *)(param_1 + 0x10) = 0;
    }
    *(undefined4 *)(param_1 + 0x18) = 0;
    *(undefined4 *)(param_1 + 0x14) = 0;
  }
  else {
    iVar6 = *(int *)(param_1 + 0x10);
    if (iVar6 == 0) {
      puVar2 = FUN_0042d756(iStack_c * 0x58);
      *(undefined4 **)(param_1 + 0x10) = puVar2;
      FUN_00406eb0(puVar2,iVar4);
      *(int *)(param_1 + 0x18) = iVar4;
      *(int *)(param_1 + 0x14) = iVar4;
    }
    else if (*(int *)(param_1 + 0x18) < iStack_c) {
      iVar4 = *(int *)(param_1 + 0x1c);
      if (iVar4 == 0) {
        iVar4 = (int)(*(int *)(param_1 + 0x14) + (*(int *)(param_1 + 0x14) >> 0x1f & 7U)) >> 3;
        if (iVar4 < 4) {
          iVar4 = 4;
        }
        else if (0x400 < iVar4) {
          iVar4 = 0x400;
        }
      }
      iVar4 = *(int *)(param_1 + 0x18) + iVar4;
      if (iVar4 <= iStack_c) {
        iVar4 = iStack_c;
      }
      puStack_4 = FUN_0042d756(iVar4 * 0x58);
      iVar6 = iStack_8;
      puVar2 = *(undefined4 **)(param_1 + 0x10);
      puVar5 = puStack_4;
      for (iVar3 = (*(int *)(param_1 + 0x14) * 0xb & 0x1fffffffU) << 1; iVar3 != 0;
          iVar3 = iVar3 + -1) {
        *puVar5 = *puVar2;
        puVar2 = puVar2 + 1;
        puVar5 = puVar5 + 1;
      }
      for (iVar3 = 0; iVar3 != 0; iVar3 = iVar3 + -1) {
        *(undefined1 *)puVar5 = *(undefined1 *)puVar2;
        puVar2 = (undefined4 *)((int)puVar2 + 1);
        puVar5 = (undefined4 *)((int)puVar5 + 1);
      }
      FUN_00406eb0(puStack_4 + *(int *)(param_1 + 0x14) * 0x16,iStack_8 - *(int *)(param_1 + 0x14));
      FUN_0042d77f(*(LPVOID *)(param_1 + 0x10));
      *(int *)(param_1 + 0x18) = iVar4;
      *(undefined4 **)(param_1 + 0x10) = puStack_4;
      *(int *)(param_1 + 0x14) = iVar6;
    }
    else {
      iVar3 = *(int *)(param_1 + 0x14);
      if (iVar3 < iStack_c) {
        FUN_00406eb0((undefined4 *)(iVar6 + iVar3 * 0x58),iStack_c - iVar3);
        *(int *)(param_1 + 0x14) = iVar4;
      }
      else {
        if (iStack_c < iVar3) {
          FUN_00406e80(iVar6 + iStack_c * 0x58,iVar3 - iStack_c);
        }
        *(int *)(param_1 + 0x14) = iVar4;
      }
    }
  }
  iVar4 = 0;
  if (0 < iStack_c) {
    iVar6 = 0;
    do {
      (*(code *)**(undefined4 **)(*(int *)(param_1 + 0x10) + iVar6))(param_2);
      iVar4 = iVar4 + 1;
      iVar6 = iVar6 + 0x58;
    } while (iVar4 < iStack_c);
  }
  if (1 < iStack_c) {
    FUN_004068c0((void *)(param_1 + 0x20),*(int *)(*(int *)(param_1 + 0x10) + 0x38),-1);
  }
  return;
}


// ==== FUN_00405050 @ 00405050 ====

void FUN_00405050(void)

{
  return;
}


