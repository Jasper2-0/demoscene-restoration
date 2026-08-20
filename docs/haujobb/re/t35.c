// ==== FUN_00411f20 @ 00411f20 ====

void __thiscall FUN_00411f20(void *this,int *param_1)

{
  int *piVar1;
  void *pvVar2;
  LPCSTR pCVar3;
  int *piVar4;
  void *unaff_ESI;
  float10 fVar5;
  undefined4 local_14 [2];
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  piVar1 = param_1;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043b060;
  pvStack_c = ExceptionList;
  ExceptionList = &pvStack_c;
  pvVar2 = FUN_00416420(param_1,local_14);
  local_4 = 0;
  pCVar3 = (LPCSTR)FUN_004167c0((int)pvVar2);
  local_4 = 0xffffffff;
  FUN_004166d0(local_14);
  piVar4 = FUN_00433691(&param_1,pCVar3);
  local_4 = 1;
  FUN_00433710((int *)((int)this + 4),piVar4);
  local_4 = 0xffffffff;
  FUN_00433623((int *)&param_1);
  FUN_00433914((int *)((int)this + 4));
  fVar5 = FUN_004163a0(piVar1);
  *(float *)((int)this + 0xc4) = (float)fVar5;
  fVar5 = FUN_004163a0(piVar1);
  *(float *)((int)this + 200) = (float)fVar5;
  fVar5 = FUN_004163a0(piVar1);
  *(float *)((int)this + 0xcc) = (float)fVar5;
  (**(code **)(*(int *)((int)this + 0x28) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0xd0) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0xf0) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0x94) + 4))(piVar1);
  ExceptionList = unaff_ESI;
  return;
}


// ==== FUN_004121c0 @ 004121c0 ====

void __thiscall FUN_004121c0(void *this,void *param_1)

{
  void *pvVar1;
  void *pvVar2;
  LPCSTR pCVar3;
  int *piVar4;
  void *unaff_ESI;
  undefined4 local_14 [2];
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  pvVar1 = param_1;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043b0a0;
  pvStack_c = ExceptionList;
  ExceptionList = &pvStack_c;
  pvVar2 = FUN_00416420(param_1,local_14);
  local_4 = 0;
  pCVar3 = (LPCSTR)FUN_004167c0((int)pvVar2);
  local_4 = 0xffffffff;
  FUN_004166d0(local_14);
  piVar4 = FUN_00433691(&param_1,pCVar3);
  local_4 = 1;
  FUN_00433710((int *)((int)this + 4),piVar4);
  local_4 = 0xffffffff;
  FUN_00433623((int *)&param_1);
  FUN_00433914((int *)((int)this + 4));
  (**(code **)(*(int *)((int)this + 0x28) + 4))(pvVar1);
  (**(code **)(*(int *)((int)this + 0xb8) + 4))(pvVar1);
  (**(code **)(*(int *)((int)this + 0xd8) + 4))(pvVar1);
  (**(code **)(*(int *)((int)this + 0x94) + 4))(pvVar1);
  ExceptionList = unaff_ESI;
  return;
}


