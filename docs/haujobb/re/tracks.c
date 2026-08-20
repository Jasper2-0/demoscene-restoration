// ==== FUN_00415360 @ 00415360 ====

void __thiscall FUN_00415360(void *this,int *param_1)

{
  int *piVar1;
  undefined4 *puVar2;
  
  piVar1 = FUN_00416360(param_1);
  *(int **)((int)this + 8) = piVar1;
  piVar1 = FUN_00416360(param_1);
  if (0 < (int)piVar1) {
    do {
      puVar2 = FUN_00432916(0x28);
      if (puVar2 == (undefined4 *)0x0) {
        puVar2 = (undefined4 *)0x0;
      }
      else {
        *puVar2 = &PTR_FUN_0043ce18;
      }
      (**(code **)*puVar2)(param_1);
      FUN_00431fe7((void *)((int)this + 0xc),*(int *)((int)this + 0x14),puVar2);
      piVar1 = (int *)((int)piVar1 + -1);
    } while (piVar1 != (int *)0x0);
  }
  return;
}


// ==== forced_0x409a10 @ 00409a10 ====

void __thiscall forced_0x409a10(int param_1,int *param_2)

{
  int iVar1;
  int *piVar2;
  undefined4 *puVar3;
  int *piVar4;
  undefined4 *puVar5;
  void *this;
  int iVar6;
  undefined4 *puVar7;
  int *piVar8;
  
  piVar2 = FUN_00416360(param_2);
  *(int **)(param_1 + 8) = piVar2;
  piVar2 = FUN_00416360(param_2);
  if (piVar2 == (int *)0x0) {
    this = *(void **)(param_1 + 0x10);
    if (this != (void *)0x0) {
      for (iVar6 = *(int *)(param_1 + 0x14); iVar6 != 0; iVar6 = iVar6 + -1) {
        FUN_0040bbb0(this,0);
        this = (void *)((int)this + 0x58);
      }
      FUN_0043293f(*(undefined **)(param_1 + 0x10));
      *(undefined4 *)(param_1 + 0x10) = 0;
    }
    *(undefined4 *)(param_1 + 0x18) = 0;
    *(undefined4 *)(param_1 + 0x14) = 0;
  }
  else {
    iVar6 = *(int *)(param_1 + 0x10);
    if (iVar6 == 0) {
      puVar3 = FUN_00432916((int)piVar2 * 0x58);
      *(undefined4 **)(param_1 + 0x10) = puVar3;
      FUN_0040b9a0(puVar3,(int)piVar2);
      *(int **)(param_1 + 0x18) = piVar2;
      *(int **)(param_1 + 0x14) = piVar2;
    }
    else if (*(int *)(param_1 + 0x18) < (int)piVar2) {
      iVar6 = *(int *)(param_1 + 0x1c);
      if (iVar6 == 0) {
        iVar6 = (int)(*(int *)(param_1 + 0x14) + (*(int *)(param_1 + 0x14) >> 0x1f & 7U)) >> 3;
        if (iVar6 < 4) {
          iVar6 = 4;
        }
        else if (0x400 < iVar6) {
          iVar6 = 0x400;
        }
      }
      piVar4 = (int *)(iVar6 + *(int *)(param_1 + 0x18));
      piVar8 = piVar2;
      if ((int)piVar2 < (int)piVar4) {
        piVar8 = piVar4;
      }
      puVar5 = FUN_00432916((int)piVar8 * 0x58);
      puVar3 = *(undefined4 **)(param_1 + 0x10);
      puVar7 = puVar5;
      for (iVar6 = (*(int *)(param_1 + 0x14) * 0xb & 0x1fffffffU) << 1; iVar6 != 0;
          iVar6 = iVar6 + -1) {
        *puVar7 = *puVar3;
        puVar3 = puVar3 + 1;
        puVar7 = puVar7 + 1;
      }
      for (iVar6 = 0; iVar6 != 0; iVar6 = iVar6 + -1) {
        *(undefined1 *)puVar7 = *(undefined1 *)puVar3;
        puVar3 = (undefined4 *)((int)puVar3 + 1);
        puVar7 = (undefined4 *)((int)puVar7 + 1);
      }
      FUN_0040b9a0(puVar5 + *(int *)(param_1 + 0x14) * 0x16,(int)piVar2 - *(int *)(param_1 + 0x14));
      FUN_0043293f(*(undefined **)(param_1 + 0x10));
      *(undefined4 **)(param_1 + 0x10) = puVar5;
      *(int **)(param_1 + 0x14) = piVar2;
      *(int **)(param_1 + 0x18) = piVar8;
    }
    else {
      iVar1 = *(int *)(param_1 + 0x14);
      if (iVar1 < (int)piVar2) {
        FUN_0040b9a0((undefined4 *)(iVar6 + iVar1 * 0x58),(int)piVar2 - iVar1);
        *(int **)(param_1 + 0x14) = piVar2;
      }
      else {
        if ((int)piVar2 < iVar1) {
          FUN_0040b970(iVar6 + (int)piVar2 * 0x58,iVar1 - (int)piVar2);
        }
        *(int **)(param_1 + 0x14) = piVar2;
      }
    }
  }
  if (0 < (int)piVar2) {
    iVar6 = 0;
    piVar8 = piVar2;
    do {
      (*(code *)**(undefined4 **)(iVar6 + *(int *)(param_1 + 0x10)))(param_2);
      iVar6 = iVar6 + 0x58;
      piVar8 = (int *)((int)piVar8 + -1);
    } while (piVar8 != (int *)0x0);
  }
  if (1 < (int)piVar2) {
    FUN_0040b4e0((void *)(param_1 + 0x20),*(int *)(*(int *)(param_1 + 0x10) + 0x38),-1);
  }
  return;
}


// ==== FUN_004081b0 @ 004081b0 ====

void __thiscall FUN_004081b0(void *this,int *param_1)

{
  int *piVar1;
  int *piVar2;
  undefined4 *puVar3;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  piVar1 = param_1;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043ac1b;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  piVar2 = FUN_00416360(param_1);
  *(int **)((int)this + 8) = piVar2;
  param_1 = FUN_00416360(param_1);
  if (0 < (int)param_1) {
    do {
      puVar3 = FUN_00432916(0x4c);
      local_4 = 0;
      if (puVar3 == (undefined4 *)0x0) {
        puVar3 = (undefined4 *)0x0;
      }
      else {
        *puVar3 = &PTR_LAB_0043cc18;
        FUN_0040d020(puVar3 + 8);
        puVar3[7] = 0;
        FUN_0040d020(puVar3 + 0xc);
        puVar3[0xb] = 0;
        FUN_0040d020(puVar3 + 0x10);
        puVar3[0xf] = 0;
        *puVar3 = &PTR_FUN_0043cc10;
      }
      local_4 = 0xffffffff;
      (**(code **)*puVar3)(piVar1);
      FUN_00431fe7((void *)((int)this + 0xc),*(int *)((int)this + 0x14),puVar3);
      param_1 = (int *)((int)param_1 + -1);
    } while (param_1 != (int *)0x0);
  }
  ExceptionList = local_c;
  return;
}


// ==== forced_0x4149b0 @ 004149b0 ====

void __thiscall forced_0x4149b0(int param_1,int *param_2)

{
  int *piVar1;
  undefined4 *puVar2;
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 uStack_4;
  
  uStack_4 = 0xffffffff;
  puStack_8 = &LAB_0043b45b;
  pvStack_c = ExceptionList;
  ExceptionList = &pvStack_c;
  piVar1 = FUN_00416360(param_2);
  *(int **)(param_1 + 8) = piVar1;
  piVar1 = FUN_00416360(param_2);
  if (0 < (int)piVar1) {
    do {
      puVar2 = FUN_00432916(0x40);
      uStack_4 = 0;
      if (puVar2 == (undefined4 *)0x0) {
        puVar2 = (undefined4 *)0x0;
      }
      else {
        *puVar2 = &PTR_LAB_0043cc18;
        FUN_0040d020(puVar2 + 7);
        FUN_0040d020(puVar2 + 10);
        FUN_0040d020(puVar2 + 0xd);
        *puVar2 = &PTR_FUN_0043ce10;
      }
      uStack_4 = 0xffffffff;
      (**(code **)*puVar2)(param_2);
      FUN_00431fe7((void *)(param_1 + 0xc),*(int *)(param_1 + 0x14),puVar2);
      piVar1 = (int *)((int)piVar1 + -1);
    } while (piVar1 != (int *)0x0);
  }
  ExceptionList = pvStack_c;
  return;
}


// ==== FUN_00415720 @ 00415720 ====

undefined4 * __thiscall FUN_00415720(void *this,byte param_1)

{
  FUN_00414050(this);
  if ((param_1 & 1) != 0) {
    FUN_0043293f(this);
  }
  return this;
}


// ==== FUN_0040b8a0 @ 0040b8a0 ====

undefined4 * __thiscall FUN_0040b8a0(void *this,byte param_1)

{
  FUN_0040b620(this);
  if ((param_1 & 1) != 0) {
    FUN_0043293f(this);
  }
  return this;
}


