// ==== forced_0x402620 @ 00402620 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined2 __thiscall forced_0x402620(int param_1,void *param_2)

{
  undefined4 uVar1;
  float10 fVar2;
  
  uVar1 = FUN_0040bb80(param_2,0x1b);
  if ((char)uVar1 != '\0') {
    return 0;
  }
  *(void **)(param_1 + 0xc) = param_2;
  if (DAT_00468f08 == 2) {
    fVar2 = FUN_004089f0(param_1 + 0x28);
    if ((float10)_DAT_0045a324 < fVar2) {
      return 0;
    }
  }
  return 1;
}


// ==== forced_0x402670 @ 00402670 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall forced_0x402670(void *param_1)

{
  int *piVar1;
  float fVar2;
  uint uVar3;
  float fVar4;
  int iVar5;
  uint uVar6;
  int iVar7;
  int iVar8;
  float10 fVar9;
  float fStack_10;
  
  fVar9 = FUN_004089f0((int)param_1 + 0x28);
  fVar2 = (float)fVar9;
  fVar9 = FUN_00408a30((int)param_1 + 0x28);
  iVar5 = *(int *)((int)param_1 + 0x54);
  iVar8 = -1;
  iVar7 = 0;
  fVar4 = _DAT_0045a30c;
  if (iVar5 == *(int *)((int)param_1 + 0x58)) {
LAB_00402772:
    FUN_0040b790();
    FUN_0040ab50(*(int *)((int)param_1 + 0x60));
    fStack_10 = (fVar2 - _DAT_0045a330) * _DAT_0045a330;
    if (fStack_10 <= _DAT_0045a30c) {
      fStack_10 = 0.0;
    }
    iVar5 = **(int **)((int)param_1 + 0x6c);
  }
  else {
    do {
      *(float *)(iVar5 + 4) = fVar4;
      if (fVar4 <= fVar2) {
        iVar8 = iVar7;
      }
      fVar4 = fVar4 + *(float *)(iVar5 + 8);
      iVar5 = iVar5 + 0x20;
      iVar7 = iVar7 + 1;
    } while (iVar5 != *(int *)((int)param_1 + 0x58));
    if (iVar8 < 0) goto LAB_00402772;
    iVar5 = iVar8 * 0x20;
    uVar3 = *(uint *)(iVar5 + *(int *)((int)param_1 + 0x54));
    iVar7 = iVar5 + *(int *)((int)param_1 + 0x54);
    if ((int)uVar3 < 0) goto LAB_004027dc;
    if (*(int *)((int)param_1 + 0x44) == 0) {
      uVar6 = 0;
    }
    else {
      uVar6 = *(int *)((int)param_1 + 0x48) - *(int *)((int)param_1 + 0x44) >> 2;
    }
    if (uVar6 <= uVar3) goto LAB_004027dc;
    (**(code **)(**(int **)(*(int *)((int)param_1 + 0x44) + uVar3 * 4) + 8))
              (*(undefined4 *)(iVar7 + 0xc),(float)fVar9);
    *(float *)(iVar5 + 0xc + *(int *)((int)param_1 + 0x54)) =
         (float)fVar9 + *(float *)(iVar5 + 0xc + *(int *)((int)param_1 + 0x54));
    if (*(int *)(iVar7 + 0x10) != 0) {
      (**(code **)(**(int **)(iVar5 + 0x10 + *(int *)((int)param_1 + 0x54)) + 4))
                ((fVar2 - *(float *)(iVar7 + 4)) / *(float *)(iVar7 + 0x14));
    }
    if (*(int **)(iVar7 + 0x18) == (int *)0x0) goto LAB_004027dc;
    iVar5 = **(int **)(iVar7 + 0x18);
    fStack_10 = (fVar2 - ((*(float *)(iVar7 + 8) + *(float *)(iVar7 + 4)) - *(float *)(iVar7 + 0x1c)
                         )) / *(float *)(iVar7 + 0x1c);
  }
  (**(code **)(iVar5 + 4))(fStack_10);
LAB_004027dc:
  iVar5 = *(int *)((int)param_1 + 100) + 1;
  *(int *)((int)param_1 + 100) = iVar5;
  if (iVar5 == 2) {
    Sleep(4000);
    FUN_00408950((int)param_1 + 0x28);
  }
  if ((_DAT_0045a32c < fVar2) && (DAT_00468f08 == 0)) {
    FUN_00402860(param_1,(undefined4 *)0x1);
  }
  if (((-1 < iVar8) &&
      (piVar1 = (int *)(*(int *)((int)param_1 + 0x54) + iVar8 * 0x20), *piVar1 == 0xc)) &&
     (_DAT_0045a328 <= (float)piVar1[3])) {
    FUN_00402860(param_1,(undefined4 *)0x2);
  }
  return;
}


// ==== forced_0x402290 @ 00402290 ====

void __fastcall forced_0x402290(int param_1)

{
  FUN_0040b790();
  FUN_0040ab50(*(int *)(param_1 + 4));
  return;
}


// ==== forced_0x402470 @ 00402470 ====

void __fastcall forced_0x402470(int param_1)

{
  if (*(undefined4 **)(param_1 + 4) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 4))(1);
  }
  return;
}


// ==== forced_0x401e00 @ 00401e00 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x401e00(void *param_1,float param_2)

{
  int iVar1;
  
  if (param_2 < _DAT_0045a310) {
    if (param_2 <= _DAT_0045a30c) {
      param_2 = 0.0;
    }
    iVar1 = _rand();
    if ((float)iVar1 * _DAT_0045a308 <= param_2) {
      FUN_00404970(param_1,1.0);
      return;
    }
    FUN_00404970(param_1,param_2);
  }
  return;
}


// ==== forced_0x401ea0 @ 00401ea0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x401ea0(void *param_1,float param_2)

{
  int iVar1;
  
  if (param_2 < _DAT_0045a310) {
    if (param_2 <= _DAT_0045a30c) {
      param_2 = 0.0;
    }
    iVar1 = _rand();
    if ((float)iVar1 * _DAT_0045a308 <= param_2) {
      FUN_00404a60(param_1,1.0);
      return;
    }
    FUN_00404a60(param_1,param_2);
  }
  return;
}


// ==== forced_0x4057b0 @ 004057b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x4057b0(int param_1,float param_2)

{
  float10 fVar1;
  float fVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  float10 extraout_ST0;
  longlong lVar6;
  longlong lVar7;
  
  if (DAT_00468f1c == 0) {
    FUN_0040b790();
    DAT_00468f1c = 1;
  }
  if (_DAT_0045a3cc <= *(float *)(param_1 + 0xc)) {
    if (*(float *)(param_1 + 0x10) < _DAT_0045a3c8) {
      (**(code **)(**(int **)(param_1 + 0x18) + 4))(0x3f666666);
      *(float *)(param_1 + 0x10) = param_2 + *(float *)(param_1 + 0x10);
      _rand();
      lVar6 = __ftol();
      _rand();
      lVar7 = __ftol();
      iVar3 = *(int *)(param_1 + 8);
      *(int *)(iVar3 + 0x14) = (int)lVar6;
      *(int *)(iVar3 + 0x18) = (int)lVar7;
      *(undefined4 *)(*(int *)(*(int *)(param_1 + 8) + 0x1c) + 0x58) = 3;
      iVar3 = *(int *)(*(int *)(param_1 + 8) + 0x1c);
      iVar5 = _rand();
      *(float *)(iVar3 + 0x38) = (float)iVar5 * _DAT_0045a308;
      FUN_0040ab50(*(int *)(param_1 + 8));
      return;
    }
    (**(code **)(**(int **)(param_1 + 0x18) + 4))
              (_DAT_0045a3b0 - *(float *)(param_1 + 0x14) * _DAT_0045a3b4);
    *(float *)(param_1 + 0x14) = param_2 + *(float *)(param_1 + 0x14);
    lVar6 = __ftol();
    iVar3 = (int)lVar6;
    if (iVar3 < 2) {
      iVar3 = 1;
    }
    if (0 < iVar3) {
      fVar1 = (float10)_DAT_0045a3b4;
      do {
        iVar5 = _rand();
        fVar2 = ((float)iVar5 * _DAT_0045a308 - _DAT_0045a330) * _DAT_0045a398 + _DAT_0045a394;
        _rand();
        fcos((float10)fVar2);
        lVar6 = __ftol();
        fsin((float10)fVar2);
        lVar7 = __ftol();
        *(undefined4 *)(*(int *)(*(int *)(param_1 + 8) + 0x1c) + 0x58) = 3;
        iVar5 = _rand();
        fVar2 = _DAT_0045a30c;
        if (_DAT_0045a30c < (float)iVar5 * _DAT_0045a308 + (float)(extraout_ST0 * fVar1)) {
          iVar5 = _rand();
          fVar2 = (float)iVar5 * _DAT_0045a308 + (float)(extraout_ST0 * fVar1);
        }
        *(float *)(*(int *)(*(int *)(param_1 + 8) + 0x1c) + 0x38) = fVar2;
        iVar5 = *(int *)(param_1 + 8);
        *(int *)(iVar5 + 0x14) = (int)lVar6;
        *(int *)(iVar5 + 0x18) = (int)lVar7;
        FUN_0040ab50(*(int *)(param_1 + 8));
        iVar3 = iVar3 + -1;
      } while (iVar3 != 0);
      return;
    }
  }
  else {
    (**(code **)(**(int **)(param_1 + 0x18) + 4))(0x3f666666);
    *(float *)(param_1 + 0xc) = param_2 + *(float *)(param_1 + 0xc);
    lVar6 = __ftol();
    iVar3 = (int)lVar6;
    if (iVar3 < 2) {
      iVar3 = 1;
    }
    if (0 < iVar3) {
      do {
        _rand();
        lVar6 = __ftol();
        _rand();
        lVar7 = __ftol();
        iVar5 = *(int *)(param_1 + 8);
        *(int *)(iVar5 + 0x14) = (int)lVar6;
        *(int *)(iVar5 + 0x18) = (int)lVar7;
        *(undefined4 *)(*(int *)(*(int *)(param_1 + 8) + 0x1c) + 0x58) = 3;
        iVar5 = *(int *)(*(int *)(param_1 + 8) + 0x1c);
        iVar4 = _rand();
        *(float *)(iVar5 + 0x38) = (float)iVar4 * _DAT_0045a308;
        FUN_0040ab50(*(int *)(param_1 + 8));
        iVar3 = iVar3 + -1;
      } while (iVar3 != 0);
      return;
    }
  }
  return;
}


// ==== forced_0x40ba40 @ 0040ba40 ====

void __fastcall forced_0x40ba40(int param_1)

{
  undefined1 *puVar1;
  
  if (*(int *)(param_1 + 4) == 1) {
    *(undefined4 *)(param_1 + 8) = 0;
    *(undefined4 *)(param_1 + 0xc) = 0;
    *(float *)(param_1 + 0x10) = (float)(*(int *)(DAT_004a8f5c + 8) / 2);
    *(float *)(param_1 + 0x14) = (float)(*(int *)(DAT_004a8f5c + 0xc) / 2);
  }
  puVar1 = (undefined1 *)(param_1 + 0x124);
  do {
    *puVar1 = puVar1[-0x100];
    puVar1 = puVar1 + 1;
  } while ((int)(puVar1 + (-0x124 - param_1)) < 0x100);
  *(undefined1 *)(param_1 + 0x22) = *(undefined1 *)(param_1 + 0x20);
  *(undefined1 *)(param_1 + 0x23) = *(undefined1 *)(param_1 + 0x21);
  return;
}


// ==== forced_0x40b820 @ 0040b820 ====

void forced_0x40b820(void)

{
  int iVar1;
  char cVar2;
  undefined1 *puVar3;
  
  FUN_0040ba10(DAT_004a8f54);
  cVar2 = (**(code **)(*DAT_004a8f58 + 8))(DAT_004a8f54);
  if (cVar2 == '\0') {
    FUN_004316f8(0);
  }
  (**(code **)(*DAT_004a8f58 + 0xc))();
  glutSwapBuffers();
  iVar1 = DAT_004a8f54;
  if (*(int *)(DAT_004a8f54 + 4) == 1) {
    *(undefined4 *)(DAT_004a8f54 + 8) = 0;
    *(undefined4 *)(iVar1 + 0xc) = 0;
    *(float *)(iVar1 + 0x10) = (float)(*(int *)(DAT_004a8f5c + 8) / 2);
    *(float *)(iVar1 + 0x14) = (float)(*(int *)(DAT_004a8f5c + 0xc) / 2);
  }
  puVar3 = (undefined1 *)(iVar1 + 0x124);
  do {
    *puVar3 = puVar3[-0x100];
    puVar3 = puVar3 + 1;
  } while ((int)(puVar3 + (-0x124 - iVar1)) < 0x100);
  *(undefined1 *)(iVar1 + 0x22) = *(undefined1 *)(iVar1 + 0x20);
  *(undefined1 *)(iVar1 + 0x23) = *(undefined1 *)(iVar1 + 0x21);
  return;
}


// ==== forced_0x40b870 @ 0040b870 ====

void forced_0x40b870(undefined4 param_1,undefined4 param_2)

{
  *(undefined4 *)(DAT_004a8f5c + 8) = param_1;
  *(undefined4 *)(DAT_004a8f5c + 0xc) = param_2;
  glViewport(0,0,param_1,param_2);
  return;
}


