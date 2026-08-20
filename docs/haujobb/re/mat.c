// ==== FUN_00413250 @ 00413250 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00413250(int param_1)

{
  void *pvVar1;
  LPCSTR pCVar2;
  undefined4 *this;
  uint uVar3;
  undefined4 *this_00;
  undefined4 *puVar4;
  int *piVar5;
  float10 fVar6;
  undefined4 uVar7;
  undefined4 uVar8;
  undefined4 uVar9;
  undefined4 local_c8;
  int *local_c4;
  undefined4 local_c0 [2];
  undefined4 local_b8 [2];
  undefined4 local_b0 [2];
  undefined4 local_a8 [2];
  undefined4 local_a0 [2];
  undefined4 local_98 [2];
  undefined4 local_90 [2];
  undefined4 local_88 [2];
  undefined4 local_80 [2];
  undefined4 local_78 [2];
  undefined4 local_70 [2];
  undefined4 local_68 [2];
  int local_60 [3];
  int local_54 [3];
  int local_48 [3];
  int local_3c [3];
  int local_30 [3];
  int local_24 [3];
  int local_18 [3];
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043b266;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  FUN_00416360(*(int **)(param_1 + 0xb8));
  local_c4 = FUN_00416360(*(int **)(param_1 + 0xb8));
  if (0 < (int)local_c4) {
    do {
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_80);
      local_4 = 0;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      FUN_004166d0(local_80);
      pvVar1 = FUN_00432916(0x88);
      local_4 = 1;
      if (pvVar1 == (void *)0x0) {
        this = (undefined4 *)0x0;
      }
      else {
        this = FUN_0040ce70(pvVar1,pCVar2);
      }
      local_4 = 0xffffffff;
      uVar7 = 0x413312;
      FUN_00431fe7((void *)(param_1 + 0xc4),*(int *)(param_1 + 0xcc),this);
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x413331;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_88);
      local_4 = 2;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x413355;
      FUN_004166d0(local_88);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_004139d0(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x4133a0;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_a8);
      local_4 = 3;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x4133c4;
      FUN_004166d0(local_a8);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413a30(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x41340f;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_78);
      local_4 = 4;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x413433;
      FUN_004166d0(local_78);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413a90(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x41347e;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_98);
      local_4 = 5;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x4134a2;
      FUN_004166d0(local_98);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413af0(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x4134ed;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_68);
      local_4 = 6;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x413511;
      FUN_004166d0(local_68);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413b50(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x41355c;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_70);
      local_4 = 7;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x413580;
      FUN_004166d0(local_70);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413bb0(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x4135cb;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_c0);
      local_4 = 8;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x4135ef;
      FUN_004166d0(local_c0);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413c10(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x41363a;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_90);
      local_4 = 9;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x41365e;
      FUN_004166d0(local_90);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413c70(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x4136a9;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_b8);
      local_4 = 10;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x4136cd;
      FUN_004166d0(local_b8);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413cd0(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x413718;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_b0);
      local_4 = 0xb;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x41373c;
      FUN_004166d0(local_b0);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413d30(this,uVar7,uVar8,uVar9);
      }
      fVar6 = FUN_004163a0(*(int **)(param_1 + 0xb8));
      uVar8 = 0x413787;
      pvVar1 = FUN_00416420(*(void **)(param_1 + 0xb8),local_a0);
      local_4 = 0xc;
      pCVar2 = (LPCSTR)FUN_004167c0((int)pvVar1);
      local_4 = 0xffffffff;
      uVar9 = 0x4137ab;
      FUN_004166d0(local_a0);
      if ((float)_DAT_0043c8a0 < (float)fVar6) {
        FUN_004168f0(&stack0xffffff14,pCVar2,(int)(float)fVar6);
        FUN_00413d90(this,uVar7,uVar8,uVar9);
      }
      uVar3 = FUN_0040cfd0((int)this);
      this_00 = FUN_0040be20(uVar3);
      uVar3 = FUN_0040cfd0((int)this);
      if (uVar3 == 8) {
        pvVar1 = FUN_00413df0(this,local_30);
        local_4 = 0xd;
        local_c8 = FUN_00416970(pvVar1);
        local_4 = 0xffffffff;
        FUN_00433623(local_30);
        FUN_0040bf50(this_00,1,&local_c8);
        pvVar1 = FUN_00413df0(this,local_18);
        this_00[6] = *(undefined4 *)((int)pvVar1 + 4);
        piVar5 = local_18;
LAB_0041398b:
        FUN_00433623(piVar5);
      }
      else {
        if (uVar3 == 0x10) {
          pvVar1 = FUN_00413e20(this,local_54);
          local_4 = 0xe;
          local_c8 = FUN_00416970(pvVar1);
          local_4 = 0xffffffff;
          FUN_00433623(local_54);
          FUN_0040bf50(this_00,1,&local_c8);
          pvVar1 = FUN_00413e20(this,local_48);
          this_00[6] = *(undefined4 *)((int)pvVar1 + 4);
          piVar5 = local_48;
          goto LAB_0041398b;
        }
        if (uVar3 == 0x18) {
          puVar4 = FUN_00432916(8);
          pvVar1 = FUN_00413df0(this,local_60);
          local_4 = 0xf;
          uVar7 = FUN_00416970(pvVar1);
          *puVar4 = uVar7;
          local_4 = 0xffffffff;
          FUN_00433623(local_60);
          pvVar1 = FUN_00413e20(this,local_24);
          local_4 = 0x10;
          uVar7 = FUN_00416970(pvVar1);
          puVar4[1] = uVar7;
          local_4 = 0xffffffff;
          FUN_00433623(local_24);
          FUN_0040bf50(this_00,2,puVar4);
          pvVar1 = FUN_00413df0(this,local_3c);
          this_00[6] = *(undefined4 *)((int)pvVar1 + 4);
          FUN_00433623(local_3c);
          FUN_0043293f((undefined *)puVar4);
        }
      }
      FUN_00431fe7((void *)(param_1 + 0xec),*(int *)(param_1 + 0xf4),this_00);
      local_c4 = (int *)((int)local_c4 + -1);
    } while (local_c4 != (int *)0x0);
  }
  ExceptionList = local_c;
  return;
}


