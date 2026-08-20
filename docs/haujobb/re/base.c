// ==== FUN_0040f570 @ 0040f570 ====

undefined4 * __fastcall FUN_0040f570(undefined4 *param_1)

{
  undefined4 *puVar1;
  undefined1 local_18 [12];
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  puStack_8 = &LAB_0043adff;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  param_1[1] = PTR_DAT_00447090;
  local_4 = 0;
  FUN_00431e6e(param_1 + 5);
  param_1[5] = &PTR_LAB_0043cccc;
  local_4._0_1_ = 1;
  FUN_00408110(param_1 + 10);
  FUN_00431e6e(param_1 + 0xd);
  param_1[0xd] = &PTR_LAB_0043ccc0;
  param_1[10] = &PTR_LAB_0043ccb4;
  local_4._0_1_ = 2;
  FUN_0040d020(param_1 + 0x12);
  FUN_0040d050(param_1 + 0x15);
  FUN_00408110(param_1 + 0x25);
  FUN_00431e6e(param_1 + 0x28);
  param_1[0x28] = &PTR_LAB_0043cca8;
  param_1[0x25] = &PTR_LAB_0043cc38;
  local_4 = CONCAT31(local_4._1_3_,3);
  *param_1 = &PTR_LAB_0043cc94;
  param_1[2] = 0;
  puVar1 = (undefined4 *)FUN_0040d030(local_18,0,0,0);
  param_1[0x12] = *puVar1;
  param_1[0x13] = puVar1[1];
  param_1[0x14] = puVar1[2];
  ExceptionList = local_c;
  return param_1;
}


