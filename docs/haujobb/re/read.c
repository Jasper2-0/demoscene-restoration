// ==== FUN_0040fe20 @ 0040fe20 ====

void __thiscall FUN_0040fe20(void *this,int *param_1)

{
  int *piVar1;
  void *pvVar2;
  LPCSTR pCVar3;
  int *piVar4;
  void *unaff_EDI;
  undefined4 local_14 [2];
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  piVar1 = param_1;
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043af40;
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
  FUN_0040fa30(this,piVar1);
  FUN_0040fc20(this,piVar1);
  (**(code **)(*(int *)((int)this + 0x28) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0x130) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0x150) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0x94) + 4))(piVar1);
  (**(code **)(*(int *)((int)this + 0xd4) + 4))(piVar1);
  ExceptionList = unaff_EDI;
  return;
}


// ==== FUN_004109d0 @ 004109d0 ====

void __thiscall FUN_004109d0(void *this,void *param_1)

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
  puStack_8 = &LAB_0043afc0;
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
  (**(code **)(*(int *)((int)this + 0xd8) + 4))(pvVar1);
  (**(code **)(*(int *)((int)this + 0xb8) + 4))(pvVar1);
  (**(code **)(*(int *)((int)this + 0x94) + 4))(pvVar1);
  ExceptionList = unaff_ESI;
  return;
}


