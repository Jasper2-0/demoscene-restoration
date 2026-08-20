// ==== FUN_00415f70 @ 00415f70 ====

void __thiscall FUN_00415f70(void *this,int *param_1)

{
  int *piVar1;
  float10 fVar2;
  
  piVar1 = FUN_00416360(param_1);
  *(int **)((int)this + 4) = piVar1;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 8) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0xc) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x10) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x14) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x18) = (float)fVar2;
  FUN_004163e0(param_1,(int)this + 0x20,4);
  return;
}


// ==== FUN_0040b800 @ 0040b800 ====

void __thiscall FUN_0040b800(void *this,int *param_1)

{
  int *piVar1;
  float10 fVar2;
  
  piVar1 = FUN_00416360(param_1);
  *(int **)((int)this + 4) = piVar1;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 8) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0xc) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x10) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x14) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x18) = (float)fVar2;
  FUN_004163e0(param_1,(int)this + 0x2c,0x10);
  return;
}


// ==== FUN_00415d50 @ 00415d50 ====

void __thiscall FUN_00415d50(void *this,int *param_1)

{
  int *piVar1;
  float10 fVar2;
  
  piVar1 = FUN_00416360(param_1);
  *(int **)((int)this + 4) = piVar1;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 8) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0xc) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x10) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x14) = (float)fVar2;
  fVar2 = FUN_004163a0(param_1);
  *(float *)((int)this + 0x18) = (float)fVar2;
  FUN_004163e0(param_1,(int)this + 0x28,0xc);
  return;
}


// ==== FUN_0040bbb0 @ 0040bbb0 ====

undefined * __thiscall FUN_0040bbb0(void *this,byte param_1)

{
  FUN_0040bbd0((int)this);
  if ((param_1 & 1) != 0) {
    FUN_0043293f(this);
  }
  return this;
}


