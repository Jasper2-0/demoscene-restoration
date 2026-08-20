// ==== FUN_0040ba20 @ 0040ba20 ====

void __thiscall FUN_0040ba20(void *this,int *param_1)

{
  int *piVar1;
  undefined4 *puVar2;
  int *piVar3;
  int *piVar4;
  undefined4 *puVar5;
  uint uVar6;
  int iVar7;
  undefined4 *puVar8;
  float10 fVar9;
  
  piVar1 = FUN_00416360(param_1);
  *(int **)((int)this + 4) = piVar1;
  fVar9 = FUN_004163a0(param_1);
  *(float *)((int)this + 8) = (float)fVar9;
  fVar9 = FUN_004163a0(param_1);
  *(float *)((int)this + 0xc) = (float)fVar9;
  fVar9 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x10) = (float)fVar9;
  fVar9 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x14) = (float)fVar9;
  fVar9 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x18) = (float)fVar9;
  piVar1 = FUN_00416360(param_1);
  if (piVar1 == (int *)0x0) {
    if (*(undefined **)((int)this + 0x34) != (undefined *)0x0) {
      FUN_0043293f(*(undefined **)((int)this + 0x34));
      *(undefined4 *)((int)this + 0x34) = 0;
    }
    *(undefined4 *)((int)this + 0x3c) = 0;
    *(undefined4 *)((int)this + 0x38) = 0;
  }
  else if (*(int *)((int)this + 0x34) == 0) {
    puVar2 = FUN_00432916((int)piVar1 * 0xc);
    *(undefined4 **)((int)this + 0x34) = puVar2;
    FUN_0040b8f0(puVar2,(int)piVar1);
    *(int **)((int)this + 0x3c) = piVar1;
    *(int **)((int)this + 0x38) = piVar1;
  }
  else if (*(int *)((int)this + 0x3c) < (int)piVar1) {
    iVar7 = *(int *)((int)this + 0x40);
    if (iVar7 == 0) {
      iVar7 = (int)(*(int *)((int)this + 0x38) + (*(int *)((int)this + 0x38) >> 0x1f & 7U)) >> 3;
      if (iVar7 < 4) {
        iVar7 = 4;
      }
      else if (0x400 < iVar7) {
        iVar7 = 0x400;
      }
    }
    piVar3 = (int *)(iVar7 + *(int *)((int)this + 0x3c));
    piVar4 = piVar1;
    if ((int)piVar1 < (int)piVar3) {
      piVar4 = piVar3;
    }
    puVar5 = FUN_00432916((int)piVar4 * 0xc);
    puVar2 = *(undefined4 **)((int)this + 0x34);
    puVar8 = puVar5;
    for (uVar6 = *(int *)((int)this + 0x38) * 3 & 0x3fffffff; uVar6 != 0; uVar6 = uVar6 - 1) {
      *puVar8 = *puVar2;
      puVar2 = puVar2 + 1;
      puVar8 = puVar8 + 1;
    }
    for (iVar7 = 0; iVar7 != 0; iVar7 = iVar7 + -1) {
      *(undefined1 *)puVar8 = *(undefined1 *)puVar2;
      puVar2 = (undefined4 *)((int)puVar2 + 1);
      puVar8 = (undefined4 *)((int)puVar8 + 1);
    }
    FUN_0040b8f0(puVar5 + *(int *)((int)this + 0x38) * 3,(int)piVar1 - *(int *)((int)this + 0x38));
    FUN_0043293f(*(undefined **)((int)this + 0x34));
    *(undefined4 **)((int)this + 0x34) = puVar5;
    *(int **)((int)this + 0x38) = piVar1;
    *(int **)((int)this + 0x3c) = piVar4;
  }
  else {
    iVar7 = *(int *)((int)this + 0x38);
    if (iVar7 < (int)piVar1) {
      FUN_0040b8f0((undefined4 *)(*(int *)((int)this + 0x34) + iVar7 * 0xc),(int)piVar1 - iVar7);
    }
    *(int **)((int)this + 0x38) = piVar1;
  }
  if (0 < (int)piVar1) {
    iVar7 = 0;
    do {
      FUN_004163e0(param_1,*(int *)((int)this + 0x34) + iVar7,0xc);
      iVar7 = iVar7 + 0xc;
      piVar1 = (int *)((int)piVar1 + -1);
    } while (piVar1 != (int *)0x0);
  }
  return;
}


