// ==== forced_0x4093f0 @ 004093f0 ====

void __thiscall forced_0x4093f0(int param_1,undefined4 param_2)

{
  undefined4 *puVar1;
  int unaff_EBX;
  int iVar2;
  
  puVar1 = FUN_00432916(8);
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    *puVar1 = &PTR_FUN_0043cc44;
  }
  (**(code **)*puVar1)(param_2);
  iVar2 = param_1;
  if (puVar1[1] != -1) {
    do {
      FUN_00431fe7((void *)(param_1 + 0xc),*(int *)(param_1 + 0x14),puVar1);
      puVar1 = FUN_00432916(8);
      if (puVar1 == (undefined4 *)0x0) {
        puVar1 = (undefined4 *)0x0;
      }
      else {
        *puVar1 = &PTR_FUN_0043cc44;
      }
      (**(code **)*puVar1)(param_2);
      iVar2 = unaff_EBX;
    } while (puVar1[1] != -1);
  }
  FUN_0043293f((undefined *)puVar1);
  *(undefined1 *)(iVar2 + 0x20) = 1;
  return;
}


// ==== FUN_0040fa30 @ 0040fa30 ====

void __thiscall FUN_0040fa30(void *this,int *param_1)

{
  int *piVar1;
  int *piVar2;
  int *piVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  uint uVar6;
  int iVar7;
  undefined4 *puVar8;
  float10 fVar9;
  float10 fVar10;
  float10 fVar11;
  undefined4 local_c;
  undefined4 local_8;
  undefined4 local_4;
  
  piVar1 = FUN_00416360(param_1);
  if (piVar1 == (int *)0x0) {
    if (*(undefined **)((int)this + 0xc4) != (undefined *)0x0) {
      FUN_0043293f(*(undefined **)((int)this + 0xc4));
      *(undefined4 *)((int)this + 0xc4) = 0;
    }
    *(undefined4 *)((int)this + 0xcc) = 0;
    *(undefined4 *)((int)this + 200) = 0;
  }
  else if (*(int *)((int)this + 0xc4) == 0) {
    puVar5 = FUN_00432916((int)piVar1 * 0xc);
    *(undefined4 **)((int)this + 0xc4) = puVar5;
    FUN_0040b8f0(puVar5,(int)piVar1);
    *(int **)((int)this + 0xcc) = piVar1;
    *(int **)((int)this + 200) = piVar1;
  }
  else if (*(int *)((int)this + 0xcc) < (int)piVar1) {
    iVar7 = *(int *)((int)this + 0xd0);
    if (iVar7 == 0) {
      iVar7 = (int)(*(int *)((int)this + 200) + (*(int *)((int)this + 200) >> 0x1f & 7U)) >> 3;
      if (iVar7 < 4) {
        iVar7 = 4;
      }
      else if (0x400 < iVar7) {
        iVar7 = 0x400;
      }
    }
    piVar2 = (int *)(iVar7 + *(int *)((int)this + 0xcc));
    piVar3 = piVar1;
    if ((int)piVar1 < (int)piVar2) {
      piVar3 = piVar2;
    }
    puVar4 = FUN_00432916((int)piVar3 * 0xc);
    puVar5 = *(undefined4 **)((int)this + 0xc4);
    puVar8 = puVar4;
    for (uVar6 = *(int *)((int)this + 200) * 3 & 0x3fffffff; uVar6 != 0; uVar6 = uVar6 - 1) {
      *puVar8 = *puVar5;
      puVar5 = puVar5 + 1;
      puVar8 = puVar8 + 1;
    }
    for (iVar7 = 0; iVar7 != 0; iVar7 = iVar7 + -1) {
      *(undefined1 *)puVar8 = *(undefined1 *)puVar5;
      puVar5 = (undefined4 *)((int)puVar5 + 1);
      puVar8 = (undefined4 *)((int)puVar8 + 1);
    }
    FUN_0040b8f0(puVar4 + *(int *)((int)this + 200) * 3,(int)piVar1 - *(int *)((int)this + 200));
    FUN_0043293f(*(undefined **)((int)this + 0xc4));
    *(undefined4 **)((int)this + 0xc4) = puVar4;
    *(int **)((int)this + 200) = piVar1;
    *(int **)((int)this + 0xcc) = piVar3;
  }
  else {
    iVar7 = *(int *)((int)this + 200);
    if (iVar7 < (int)piVar1) {
      FUN_0040b8f0((undefined4 *)(*(int *)((int)this + 0xc4) + iVar7 * 0xc),(int)piVar1 - iVar7);
    }
    *(int **)((int)this + 200) = piVar1;
  }
  FUN_0040b4e0((void *)((int)this + 0x108),(int)piVar1,-1);
  if (0 < (int)piVar1) {
    iVar7 = 0;
    do {
      fVar9 = FUN_004163a0(param_1);
      fVar10 = FUN_004163a0(param_1);
      fVar11 = FUN_004163a0(param_1);
      FUN_0040d030(&local_c,(float)fVar9,(float)fVar10,(float)fVar11);
      puVar5 = (undefined4 *)(*(int *)((int)this + 0xc4) + iVar7);
      iVar7 = iVar7 + 0xc;
      piVar1 = (int *)((int)piVar1 + -1);
      *puVar5 = local_c;
      puVar5[1] = local_8;
      puVar5[2] = local_4;
    } while (piVar1 != (int *)0x0);
  }
  return;
}


// ==== FUN_0040fc20 @ 0040fc20 ====

void __thiscall FUN_0040fc20(void *this,int *param_1)

{
  int *piVar1;
  int *piVar2;
  int iVar3;
  float *pfVar4;
  undefined4 *puVar5;
  int iVar6;
  float *pfVar7;
  undefined4 *puVar8;
  float10 fVar9;
  int *local_58;
  int *local_50;
  undefined **local_4c;
  undefined *local_48;
  int local_44;
  undefined4 local_40;
  undefined4 local_3c;
  float local_38 [11];
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  piVar1 = param_1;
  puStack_8 = &LAB_0043af20;
  local_c = ExceptionList;
  local_4c = &PTR_LAB_0043cd38;
  local_48 = (undefined *)0x0;
  local_3c = 0;
  local_40 = 0;
  local_44 = 0;
  local_4 = 0;
  ExceptionList = &local_c;
  param_1 = FUN_00416360(param_1);
  if (0 < (int)param_1) {
    do {
      pfVar4 = local_38;
      iVar6 = 3;
      do {
        pfVar4 = pfVar4 + 3;
        piVar2 = FUN_00416360(piVar1);
        pfVar4[-1] = (float)piVar2;
        fVar9 = FUN_004163a0(piVar1);
        *pfVar4 = (float)fVar9;
        fVar9 = FUN_004163a0(piVar1);
        iVar3 = local_44;
        pfVar4[1] = (float)fVar9;
        iVar6 = iVar6 + -1;
      } while (iVar6 != 0);
      FUN_00415df0(&local_4c,local_44 + 1,-1);
      param_1 = (int *)((int)param_1 + -1);
      pfVar4 = local_38;
      pfVar7 = (float *)(local_48 + iVar3 * 0x2c);
      for (iVar6 = 0xb; iVar6 != 0; iVar6 = iVar6 + -1) {
        *pfVar7 = *pfVar4;
        pfVar4 = pfVar4 + 1;
        pfVar7 = pfVar7 + 1;
      }
    } while (param_1 != (int *)0x0);
  }
  FUN_0040ff80(this,(int)&local_4c);
  local_50 = FUN_00416360(piVar1);
  if (0 < (int)local_50) {
    do {
      piVar2 = FUN_00416360(piVar1);
      local_58 = FUN_00416360(piVar1);
      param_1 = FUN_00432916(0x1c);
      if (param_1 == (int *)0x0) {
        param_1 = (int *)0x0;
      }
      else {
        param_1[1] = (int)&PTR_LAB_0043cd38;
        param_1[2] = 0;
        param_1[5] = 0;
        param_1[4] = 0;
        param_1[3] = 0;
        param_1[6] = 0;
      }
      *param_1 = (int)piVar2;
      if (0 < (int)local_58) {
        do {
          piVar2 = FUN_00416360(piVar1);
          iVar6 = param_1[3];
          puVar5 = (undefined4 *)(local_48 + (int)piVar2 * 0x2c);
          FUN_00415df0(param_1 + 1,iVar6 + 1,-1);
          local_58 = (int *)((int)local_58 + -1);
          puVar8 = (undefined4 *)(param_1[2] + iVar6 * 0x2c);
          for (iVar3 = 0xb; iVar3 != 0; iVar3 = iVar3 + -1) {
            *puVar8 = *puVar5;
            puVar5 = puVar5 + 1;
            puVar8 = puVar8 + 1;
          }
        } while (local_58 != (int *)0x0);
      }
      FUN_00431fe7((void *)((int)this + 0x11c),*(int *)((int)this + 0x124),param_1);
      local_50 = (int *)((int)local_50 + -1);
    } while (local_50 != (int *)0x0);
  }
  FUN_00415df0(&local_4c,0,-1);
  local_4c = &PTR_LAB_0043cd38;
  local_4 = 1;
  if (local_48 != (undefined *)0x0) {
    FUN_0043293f(local_48);
  }
  ExceptionList = local_c;
  return;
}


