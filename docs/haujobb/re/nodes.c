// ==== FUN_0040f6d0 @ 0040f6d0 ====

undefined4 * __thiscall FUN_0040f6d0(void *this,undefined4 param_1)

{
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043ae69;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  FUN_0040f570(this);
  *(undefined ***)this = &PTR_LAB_0043cd20;
  *(undefined ***)((int)this + 0xc0) = &PTR_LAB_0043cc4c;
  *(undefined4 *)((int)this + 0xc4) = 0;
  *(undefined4 *)((int)this + 0xd0) = 0;
  *(undefined4 *)((int)this + 0xcc) = 0;
  *(undefined4 *)((int)this + 200) = 0;
  local_4._0_1_ = 1;
  local_4._1_3_ = 0;
  FUN_00408110((undefined4 *)((int)this + 0xd4));
  *(undefined ***)((int)this + 0xe0) = &PTR_LAB_0043cd14;
  *(undefined4 *)((int)this + 0xe4) = 0;
  *(undefined4 *)((int)this + 0xf0) = 0;
  *(undefined4 *)((int)this + 0xec) = 0;
  *(undefined4 *)((int)this + 0xe8) = 0;
  local_4._0_1_ = 2;
  FUN_00414030((undefined4 *)((int)this + 0xf4));
  *(undefined4 *)((int)this + 0xd4) = &PTR_LAB_0043cd08;
  *(undefined ***)((int)this + 0x108) = &PTR_LAB_0043cc4c;
  *(undefined4 *)((int)this + 0x10c) = 0;
  *(undefined4 *)((int)this + 0x118) = 0;
  *(undefined4 *)((int)this + 0x114) = 0;
  *(undefined4 *)((int)this + 0x110) = 0;
  local_4._0_1_ = 4;
  FUN_00431e6e((undefined4 *)((int)this + 0x11c));
  *(undefined4 *)((int)this + 0x11c) = &PTR_LAB_0043ccfc;
  local_4._0_1_ = 5;
  FUN_00408110((undefined4 *)((int)this + 0x130));
  FUN_00431e6e((undefined4 *)((int)this + 0x13c));
  *(undefined4 *)((int)this + 0x13c) = &PTR_LAB_0043ccf0;
  *(undefined4 *)((int)this + 0x130) = &PTR_LAB_0043cc04;
  local_4 = CONCAT31(local_4._1_3_,6);
  FUN_00408110((undefined4 *)((int)this + 0x150));
  FUN_00431e6e((undefined4 *)((int)this + 0x15c));
  *(undefined4 *)((int)this + 0x15c) = &PTR_LAB_0043ccc0;
  *(undefined4 *)((int)this + 0x150) = &PTR_LAB_0043ccb4;
  *(undefined ***)this = &PTR_FUN_0043ccd8;
  *(undefined4 *)((int)this + 0xc) = 1;
  *(undefined4 *)((int)this + 0x10) = param_1;
  *(undefined1 *)((int)this + 0xb8) = 0;
  *(undefined1 *)((int)this + 0x178) = 0;
  *(uint *)((int)this + 0x17c) =
       ((DAT_0048e4d8 | 0xffffff00) << 8 | DAT_0048e4d4) << 8 | DAT_0048e4d0;
  DAT_0048e4d0 = DAT_0048e4d0 + 1;
  ExceptionList = local_c;
  return this;
}


// ==== FUN_00410870 @ 00410870 ====

undefined4 * __thiscall FUN_00410870(void *this,undefined4 param_1)

{
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043af66;
  local_c = ExceptionList;
  ExceptionList = &local_c;
  FUN_0040f570(this);
  local_4 = 0;
  FUN_00408110((undefined4 *)((int)this + 0xb8));
  FUN_00431e6e((undefined4 *)((int)this + 0xc4));
  *(undefined4 *)((int)this + 0xc4) = &PTR_LAB_0043cd64;
  *(undefined4 *)((int)this + 0xb8) = &PTR_LAB_0043cd58;
  local_4 = CONCAT31(local_4._1_3_,1);
  FUN_00408110((undefined4 *)((int)this + 0xd8));
  FUN_00431e6e((undefined4 *)((int)this + 0xe4));
  *(undefined4 *)((int)this + 0xe4) = &PTR_LAB_0043cd64;
  *(undefined4 *)((int)this + 0xd8) = &PTR_LAB_0043cd58;
  *(undefined4 *)((int)this + 0x10) = param_1;
  *(undefined ***)this = &PTR_FUN_0043cd44;
  *(undefined4 *)((int)this + 0xc) = 2;
  ExceptionList = local_c;
  return this;
}


