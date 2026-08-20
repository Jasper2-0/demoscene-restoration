// ==== FUN_00413060 @ 00413060 ====

void __thiscall FUN_00413060(void *this,undefined4 *param_1)

{
  int *piVar1;
  void *pvVar2;
  undefined4 *puVar3;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043b1b2;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  piVar1 = FUN_00416360(*(int **)((int)this + 0xb8));
  puVar3 = param_1;
  do {
    if (piVar1 == (int *)0xffffffff) {
      ExceptionList = local_c;
      return;
    }
    switch(piVar1) {
    case (int *)0x0:
      pvVar2 = FUN_00432916(0x180);
      local_4 = 0;
      if (pvVar2 == (void *)0x0) {
LAB_004131c0:
        puVar3 = (undefined4 *)0x0;
      }
      else {
        puVar3 = FUN_0040f6d0(pvVar2,param_1);
      }
      break;
    case (int *)0x1:
      pvVar2 = FUN_00432916(0xfc);
      local_4 = 1;
      if (pvVar2 == (void *)0x0) goto LAB_004131c0;
      puVar3 = FUN_00410870(pvVar2,param_1);
      break;
    case (int *)0x2:
      pvVar2 = FUN_00432916(0xb8);
      local_4 = 2;
      if (pvVar2 == (void *)0x0) goto LAB_004131c0;
      puVar3 = FUN_004112f0(pvVar2,param_1);
      break;
    case (int *)0x3:
      pvVar2 = FUN_00432916(0x114);
      local_4 = 3;
      if (pvVar2 == (void *)0x0) goto LAB_004131c0;
      puVar3 = FUN_00411e60(pvVar2,param_1);
      break;
    case (int *)0x4:
      pvVar2 = FUN_00432916(0x128);
      local_4 = 4;
      if (pvVar2 == (void *)0x0) {
        puVar3 = (undefined4 *)0x0;
      }
      else {
        puVar3 = FUN_004117a0(pvVar2,param_1);
      }
      local_4 = 0xffffffff;
      *(int *)((int)this + 0x110) = *(int *)((int)this + 0x110) + 1;
      goto switchD_0041309f_default;
    case (int *)0x5:
      pvVar2 = FUN_00432916(0xf8);
      local_4 = 5;
      if (pvVar2 == (void *)0x0) goto LAB_004131c0;
      puVar3 = FUN_00412110(pvVar2,param_1);
      break;
    default:
      goto switchD_0041309f_default;
    }
    local_4 = 0xffffffff;
switchD_0041309f_default:
    (**(code **)*puVar3)(*(undefined4 *)((int)this + 0xb8));
    FUN_00431fe7(param_1 + 5,param_1[7],puVar3);
    puVar3[4] = param_1;
    piVar1 = FUN_00416360(*(int **)((int)this + 0xb8));
    if (piVar1 != (int *)0xffffffff) {
      FUN_004162f0(*(void **)((int)this + 0xb8),-4);
      FUN_00413060(this,puVar3);
    }
    piVar1 = FUN_00416360(*(int **)((int)this + 0xb8));
  } while( true );
}


// ==== FUN_00416360 @ 00416360 ====

int * __fastcall FUN_00416360(int *param_1)

{
  int *local_4;
  
  local_4 = param_1;
  if (*param_1 == 1) {
    FUN_004226e5((char *)&local_4,1,4,(int *)param_1[1]);
  }
  if (*param_1 == 2) {
    FUN_004160a0(param_1,(undefined1 *)&local_4,1,4,param_1[2]);
  }
  return local_4;
}


