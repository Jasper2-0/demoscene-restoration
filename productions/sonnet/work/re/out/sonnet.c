// ==== FUN_00401000 @ 00401000 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00401000(void)

{
  void *pvVar1;
  
  pvVar1 = (void *)FUN_004042e0(60000);
  if (pvVar1 == (void *)0x0) {
    DAT_00474614 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar1,0xc,5000,FUN_00401555);
    DAT_00474614 = pvVar1;
  }
  _DAT_00474650 = 0x42c80000;
  return;
}


// ==== `vector_constructor_iterator' @ 0040103f ====

/* Library Function - Single Match
    void __stdcall `vector constructor iterator'(void *,unsigned int,int,void * (__thiscall*)(void
   *))
   
   Library: Visual Studio 2003 Release */

void _vector_constructor_iterator_
               (void *param_1,uint param_2,int param_3,_func_void_ptr_void_ptr *param_4)

{
  void *unaff_EDI;
  
  if (-1 < param_3 + -1) {
    do {
      (*param_4)(unaff_EDI);
      param_3 = param_3 + -1;
    } while (param_3 != 0);
  }
  return;
}


// ==== FUN_00401061 @ 00401061 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00401061(float param_1,float param_2,float param_3,float *param_4,float param_5)

{
  float fVar1;
  int iVar2;
  
  fVar1 = _DAT_004170bc;
  iVar2 = 0;
  do {
    *param_4 = param_1;
    param_4[1] = param_2;
    param_4[2] = param_3;
    if (iVar2 == 0) {
      *param_4 = *param_4 - _DAT_004170b8 * fVar1;
    }
    if (iVar2 == 1) {
      *param_4 = _DAT_004170b8 * fVar1 + *param_4;
    }
    if (iVar2 == 2) {
      param_4[1] = param_4[1] - _DAT_004170b8 * fVar1;
    }
    if (iVar2 == 3) {
      param_4[1] = _DAT_004170b8 * fVar1 + param_4[1];
    }
    param_4[2] = param_5;
    DAT_0047461c = DAT_0047461c + 1;
    param_4 = param_4 + 3;
    iVar2 = iVar2 + 1;
  } while (iVar2 < 4);
  return;
}


// ==== FUN_004010dc @ 004010dc ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004010dc(void)

{
  float fVar1;
  undefined4 *puVar2;
  undefined4 *puVar3;
  undefined4 *puVar4;
  float *pfVar5;
  int iVar6;
  int iVar7;
  uint uVar8;
  longlong lVar9;
  float local_cc;
  float local_c8;
  undefined4 local_c4 [9];
  float local_a0;
  float local_9c;
  float local_74;
  float local_70;
  float local_48;
  float local_44;
  undefined1 local_1c [12];
  int local_10;
  int local_c;
  int local_8;
  
  DAT_00474790 = 0;
  FUN_00402c72('\0');
  FUN_0040184c();
  FUN_00401bd0();
  if (_DAT_004170cc < _DAT_00474650) {
    FUN_00402362(0,2,3);
    FUN_00402362(0,1,2);
    FUN_00402362(0,5,3);
    FUN_00402362(0,4,2);
    FUN_004019e6(2);
    puVar3 = (undefined4 *)FUN_00401558(local_1c,0,0,0x3f800000);
    puVar2 = DAT_00474614;
    puVar4 = DAT_00474614 + 1;
    *DAT_00474614 = *puVar3;
    *puVar4 = puVar3[1];
    puVar2[2] = puVar3[2];
    DAT_0047461c = 1;
    lVar9 = FUN_00404224();
    local_c = (int)lVar9;
    local_8 = 0;
    iVar7 = 1;
    if (0 < local_c) {
      local_10 = 0;
      do {
        fVar1 = 1.0;
        if (local_8 == local_c + -1) {
          fVar1 = _DAT_00474650 - (float)local_c;
          if (fVar1 < _DAT_004170c8) {
            fVar1 = 0.0;
          }
          if (_DAT_004170c4 < fVar1) {
            fVar1 = 1.0;
          }
        }
        pfVar5 = (float *)(local_10 + (int)DAT_00474614);
        FUN_00401061(*pfVar5,pfVar5[1],pfVar5[2],(float *)(DAT_00474614 + iVar7 * 3),fVar1);
        local_8 = local_8 + 1;
        local_10 = local_10 + 0xc;
        iVar7 = DAT_0047461c;
      } while (local_8 < local_c);
    }
    uVar8 = 0;
    if (0 < iVar7) {
      iVar7 = 0;
      do {
        puVar4 = local_c4;
        iVar6 = 4;
        do {
          *puVar4 = 0;
          puVar4 = puVar4 + 0xb;
          iVar6 = iVar6 + -1;
        } while (iVar6 != 0);
        local_44 = _DAT_004170b8 * *(float *)((int)DAT_00474614 + iVar7 + 8);
        pfVar5 = (float *)((int)DAT_00474614 + iVar7);
        local_cc = *(float *)((int)DAT_00474614 + iVar7) - local_44;
        local_c8 = pfVar5[1] - local_44;
        local_a0 = local_44 + *pfVar5;
        local_9c = pfVar5[1] - local_44;
        local_74 = local_44 + *pfVar5;
        local_70 = local_44 + pfVar5[1];
        local_48 = *pfVar5 - local_44;
        local_44 = local_44 + pfVar5[1];
        FUN_00402349(0x3c,(&DAT_0041a9c0)[uVar8 & 3] | 0x1f000000);
        (**(code **)(*DAT_004747ac + 0x120))(DAT_004747ac,6,2,&local_cc,0x2c);
        uVar8 = uVar8 + 1;
        iVar7 = iVar7 + 0xc;
      } while ((int)uVar8 < DAT_0047461c);
    }
    _DAT_00474650 = _DAT_00474650 - _DAT_004170c0 / _DAT_004170b4;
  }
  FUN_00402362(0,2,2);
  FUN_00402362(0,1,4);
  FUN_00402362(0,5,2);
  FUN_00402362(0,4,4);
  iVar7 = DAT_00478918;
  *(undefined1 *)(DAT_00478918 + 8) = 1;
  *(undefined4 *)(iVar7 + 0xc) = 0x3f800000;
  if (DAT_00478920 != (int *)0x0) {
    (**(code **)*DAT_00478920)();
    (**(code **)(*DAT_00478920 + 4))(0);
    (**(code **)*DAT_00478920)();
    (**(code **)(*DAT_00478920 + 4))(0);
  }
  *(undefined1 *)(iVar7 + 8) = 0;
  *(undefined4 *)(iVar7 + 0xc) = 0;
  FUN_0040149b();
  return;
}


// ==== FUN_00401341 @ 00401341 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_00401341(void)

{
  uint uVar1;
  
  uVar1 = FUN_00404258();
  return (float10)(int)uVar1 * (float10)_DAT_004170d0;
}


// ==== FUN_00401358 @ 00401358 ====

float10 FUN_00401358(ushort *param_1)

{
  return (float10)(float)((uint)*param_1 << 0x10);
}


// ==== FUN_00401372 @ 00401372 ====

undefined4 FUN_00401372(undefined4 param_1,int param_2,int param_3,undefined4 param_4)

{
  undefined4 uVar1;
  
  if (param_2 == 2) {
LAB_004013c8:
    uVar1 = 0;
  }
  else {
    if (param_2 == 0xf) {
      (*DAT_00417058)(param_1,0);
    }
    else {
      if (param_2 == 0x10) {
LAB_00401396:
        DAT_00474620 = 1;
        goto LAB_004013c8;
      }
      if (param_2 == 0x20) {
        (*DAT_0041705c)(0);
      }
      else if ((param_2 == 0x100) && (param_3 == 0x1b)) goto LAB_00401396;
    }
    uVar1 = (*DAT_00417054)(param_1,param_2,param_3,param_4);
  }
  return uVar1;
}


// ==== FUN_004013ce @ 004013ce ====

void FUN_004013ce(undefined4 param_1)

{
  undefined4 local_14;
  undefined4 local_10;
  undefined4 local_c;
  undefined4 local_8;
  
  DAT_00474654 = (*DAT_00417068)(0,&DAT_004170b0,param_1,0xc80000,0,0,0,0,0,0,DAT_00474638,0);
  local_c = DAT_00474610;
  local_8 = DAT_00474618;
  local_10 = 0;
  local_14 = 0;
  (*DAT_00417064)(&local_14,0xc80000,0);
  (*DAT_00417060)(DAT_00474654);
  return;
}


// ==== FUN_00401433 @ 00401433 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00401433(void)

{
  undefined4 unaff_ESI;
  
  _DAT_00474628 = 3;
  _DAT_0047462c = FUN_00401372;
  _DAT_00474630 = 0;
  _DAT_00474634 = 0;
  DAT_00474638 = (*DAT_0041704c)(0);
  _DAT_0047463c = 0;
  _DAT_00474640 = 0;
  _DAT_00474644 = 0;
  _DAT_00474648 = &DAT_004170b0;
  _DAT_0047464c = &DAT_004170b0;
  (*DAT_0041706c)(&DAT_00474628);
  FUN_004013ce(unaff_ESI);
  return;
}


// ==== FUN_0040149b @ 0040149b ====

void FUN_0040149b(void)

{
  int iVar1;
  undefined1 local_20 [28];
  
  iVar1 = (*DAT_0041707c)(local_20,0,0,0,0);
  if (iVar1 != 0) {
    (*DAT_00417078)(local_20,0,0,0);
    (*DAT_00417074)(local_20);
    (*DAT_00417070)(local_20);
  }
  (**(code **)(*DAT_004747ac + 0x3c))(DAT_004747ac,0,0,0,0);
  FUN_00402c72('\0');
  return;
}


// ==== FUN_004014ef @ 004014ef ====

undefined4 FUN_004014ef(undefined4 param_1,undefined4 param_2)

{
  undefined4 uVar1;
  
  DAT_00474620 = 0;
  DAT_00474621 = 0;
  DAT_00474610 = param_1;
  DAT_00474618 = param_2;
  FUN_00401571();
  FUN_00401433();
  uVar1 = FUN_00401575();
  if ((char)uVar1 != '\0') {
    FUN_00403dad();
    FUN_00401c1f();
    uVar1 = FUN_00401000();
    uVar1 = CONCAT31((int3)((uint)uVar1 >> 8),1);
  }
  return uVar1;
}


// ==== FUN_0040153c @ 0040153c ====

void FUN_0040153c(void)

{
  FUN_00401c3a();
  FUN_00401c3a();
  FUN_004030d3();
  FUN_00401823();
  return;
}


// ==== FUN_00401555 @ 00401555 ====

undefined4 __fastcall FUN_00401555(undefined4 param_1)

{
  return param_1;
}


// ==== FUN_00401558 @ 00401558 ====

void __thiscall FUN_00401558(void *this,undefined4 param_1,undefined4 param_2,undefined4 param_3)

{
  *(undefined4 *)this = param_1;
  *(undefined4 *)((int)this + 4) = param_2;
  *(undefined4 *)((int)this + 8) = param_3;
  return;
}


// ==== FUN_00401571 @ 00401571 ====

void FUN_00401571(void)

{
  return;
}


// ==== FUN_00401575 @ 00401575 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

uint FUN_00401575(void)

{
  uint uVar1;
  int iVar2;
  undefined1 uVar3;
  undefined4 uVar4;
  undefined4 local_60;
  undefined4 local_5c;
  undefined4 local_58;
  undefined4 local_50;
  undefined4 local_4c;
  undefined4 local_48;
  int local_1c;
  int local_18;
  int local_14;
  int local_10;
  int local_c;
  int local_8;
  
  uVar4 = 0x78;
  DAT_004747a8 = (int *)FUN_004161bc();
  uVar1 = (**(code **)(*DAT_004747a8 + 0x20))(DAT_004747a8,0,&DAT_004746a8,uVar4);
  if (-1 < (int)uVar1) {
    DAT_00474798 = DAT_004746a8;
    DAT_0047479c = DAT_004746ac;
    DAT_004747a0 = DAT_004746b0;
    DAT_004747a4 = DAT_004746b4;
    if (DAT_00474621 == 0) {
      local_14 = 0;
      local_18 = 0;
      local_1c = 0;
      local_10 = 0;
      local_c = (**(code **)(*DAT_004747a8 + 0x18))(DAT_004747a8,0);
      local_8 = 0;
      if (0 < local_c) {
        do {
          (**(code **)(*DAT_004747a8 + 0x1c))(DAT_004747a8,0,local_8,&local_1c);
          if ((((local_1c == DAT_00474610) && (local_18 == DAT_00474618)) && (local_14 == 0)) &&
             (((local_10 == 0x15 || (local_10 == 0x14)) || (local_10 == 0x16)))) {
            DAT_00474798 = local_1c;
            DAT_0047479c = local_18;
            DAT_004747a0 = local_14;
            DAT_004747a4 = local_10;
          }
          local_8 = local_8 + 1;
        } while (local_8 < local_c);
      }
    }
    FUN_00404282((undefined4 *)&DAT_00474660,0,0x34);
    _DAT_0047467c = (uint)DAT_00474621;
    _DAT_00474660 = DAT_00474610;
    _DAT_00474664 = DAT_00474618;
    _DAT_00474674 = 1;
    _DAT_00474668 = DAT_004747a4;
    _DAT_00474680 = 0;
    DAT_0047478c = 0;
    iVar2 = (**(code **)(*DAT_004747a8 + 0x28))(DAT_004747a8,0,1,DAT_004747a4,2,1,0x4d);
    if (iVar2 == 0) {
      DAT_0047478c = 0x4d;
    }
    else {
      iVar2 = (**(code **)(*DAT_004747a8 + 0x28))(DAT_004747a8,0,1,DAT_004747a4,2,1,0x47);
      if (iVar2 == 0) {
        DAT_0047478c = 0x47;
      }
    }
    uVar1 = (**(code **)(*DAT_004747a8 + 0x28))(DAT_004747a8,0,1,DAT_004747a4,2,1,0x4b);
    if (uVar1 == 0) {
      DAT_0047478c = 0x4b;
      uVar1 = (**(code **)(*DAT_004747a8 + 0x3c))
                        (DAT_004747a8,0,1,DAT_00474654,0x20,&DAT_00474660,&DAT_004747ac);
      if (-1 < (int)uVar1) {
        (**(code **)(*DAT_004747ac + 0x1c))(DAT_004747ac,&DAT_004746b8);
        FUN_00402349(7,1);
        FUN_00402349(0xe,1);
        FUN_00402349(0x17,4);
        FUN_00404282(&local_60,0,0x44);
        local_50 = 0x3f800000;
        local_4c = 0x3f800000;
        local_48 = 0x3f800000;
        local_60 = 0x3f800000;
        local_5c = 0x3f800000;
        local_58 = 0x3f800000;
        (**(code **)(*DAT_004747ac + 0xa8))(DAT_004747ac,&local_60);
        iVar2 = 0;
        do {
          uVar3 = (undefined1)iVar2;
          FUN_00402362(uVar3,0x12,2);
          FUN_00402362(uVar3,0xb,iVar2);
          FUN_00402362(uVar3,0x10,2);
          FUN_00402362(uVar3,0x11,2);
          FUN_00402362(uVar3,2,2);
          FUN_00402362(uVar3,3,0);
          FUN_00402362(uVar3,1,4);
          FUN_00402362(uVar3,5,2);
          FUN_00402362(uVar3,6,0);
          FUN_00402362(uVar3,4,4);
          iVar2 = iVar2 + 1;
        } while (iVar2 < 2);
        FUN_00402362(1,3,1);
        FUN_00402362(1,6,1);
        (**(code **)(*DAT_004747ac + 0x130))(DAT_004747ac,0x252);
        FUN_00402bc9();
        FUN_004026be();
        uVar4 = FUN_0040184c();
        return CONCAT31((int3)((uint)uVar4 >> 8),1);
      }
    }
  }
  return uVar1 & 0xffffff00;
}


// ==== FUN_00401823 @ 00401823 ====

void FUN_00401823(void)

{
  FUN_00402c45();
  FUN_00402756();
  if (DAT_004747ac != (int *)0x0) {
    (**(code **)(*DAT_004747ac + 8))(DAT_004747ac);
  }
  if (DAT_004747a8 != (int *)0x0) {
    (**(code **)(*DAT_004747a8 + 8))(DAT_004747a8);
  }
  return;
}


// ==== FUN_0040184c @ 0040184c ====

void FUN_0040184c(void)

{
  int iVar1;
  undefined4 local_44 [16];
  
  DAT_00474790 = 0;
  DAT_00474794 = 0x80;
  FUN_00401b45('\0');
  FUN_004018ec(0);
  FUN_004019e6(0);
  FUN_004019a0(0);
  iVar1 = 0;
  do {
    FUN_0040191b((byte)iVar1,'\x01');
    (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,iVar1,0);
    FUN_00401a3f((byte)iVar1,0);
    iVar1 = iVar1 + 1;
  } while (iVar1 < 2);
  FUN_00401abf(0,0xffffffff,0,0x3f800000);
  FUN_00401b86(0,0xffffffff);
  FUN_0040190f(local_44);
  FUN_00402317(2,local_44);
  FUN_00402317(0x100,local_44);
  FUN_00402349(0x17,4);
  return;
}


// ==== FUN_004018ec @ 004018ec ====

void FUN_004018ec(int param_1)

{
  undefined4 uVar1;
  
  if (param_1 == 0) {
    uVar1 = 1;
  }
  else if (param_1 == 1) {
    uVar1 = 2;
  }
  else {
    if (param_1 != 2) {
      return;
    }
    uVar1 = 3;
  }
  FUN_00402349(0x16,uVar1);
  return;
}


// ==== FUN_0040190f @ 0040190f ====

undefined4 * __fastcall FUN_0040190f(undefined4 *param_1)

{
  FUN_00401950(param_1);
  return param_1;
}


// ==== FUN_0040191b @ 0040191b ====

void FUN_0040191b(undefined1 param_1,char param_2)

{
  undefined4 uVar1;
  
  if (param_2 == '\0') {
    FUN_00402362(param_1,0xd,3);
    uVar1 = 3;
  }
  else {
    FUN_00402362(param_1,0xd,1);
    uVar1 = 1;
  }
  FUN_00402362(param_1,0xe,uVar1);
  return;
}


// ==== FUN_00401950 @ 00401950 ====

void __fastcall FUN_00401950(undefined4 *param_1)

{
  param_1[0xe] = 0;
  param_1[0xd] = 0;
  param_1[0xc] = 0;
  param_1[0xb] = 0;
  param_1[9] = 0;
  param_1[8] = 0;
  param_1[7] = 0;
  param_1[6] = 0;
  param_1[4] = 0;
  param_1[3] = 0;
  param_1[2] = 0;
  param_1[1] = 0;
  param_1[0xf] = 0x3f800000;
  param_1[10] = 0x3f800000;
  param_1[5] = 0x3f800000;
  *param_1 = 0x3f800000;
  return;
}


// ==== FUN_004019a0 @ 004019a0 ====

void FUN_004019a0(int param_1)

{
  undefined4 uVar1;
  
  if (param_1 == 0) {
    FUN_00402362(1,1,1);
    uVar1 = 1;
  }
  else if (param_1 == 1) {
    FUN_00402362(1,1,7);
    uVar1 = 7;
  }
  else {
    if (param_1 != 2) {
      return;
    }
    FUN_00402362(1,1,4);
    uVar1 = 4;
  }
  FUN_00402362(1,4,uVar1);
  return;
}


// ==== FUN_004019e6 @ 004019e6 ====

void FUN_004019e6(int param_1)

{
  undefined4 uVar1;
  
  if (param_1 == 0) {
    FUN_00402349(0x1b,0);
    uVar1 = 1;
  }
  else {
    if (param_1 == 1) {
      FUN_00402349(0x1b,1);
      FUN_00402349(0x13,5);
      uVar1 = 2;
    }
    else {
      if (param_1 != 2) {
        return;
      }
      FUN_00402349(0x1b,1);
      FUN_00402349(0x13,5);
      uVar1 = 6;
    }
    FUN_00402349(0x14,uVar1);
    uVar1 = 0;
  }
  FUN_00402349(0xe,uVar1);
  return;
}


// ==== FUN_00401a3f @ 00401a3f ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00401a3f(byte param_1,int param_2)

{
  undefined4 uVar1;
  undefined4 local_44 [5];
  undefined4 local_30;
  undefined4 local_14;
  undefined4 local_10;
  
  if (param_2 == 0) {
    FUN_00402362(param_1,0x18,0);
    FUN_00402362(param_1,0xb,(uint)param_1);
  }
  else if (param_2 == 1) {
    FUN_00402362(param_1,0x18,2);
    FUN_00402362(param_1,0xb,0x10000);
    FUN_0040190f(local_44);
    local_44[0] = _DAT_004170d4;
    local_14 = _DAT_004170d4;
    local_10 = _DAT_004170d4;
    local_30 = 0xbf000000;
    if (param_1 == 0) {
      uVar1 = 0x10;
    }
    else {
      uVar1 = 0x11;
    }
    FUN_00402317(uVar1,local_44);
  }
  return;
}


// ==== FUN_00401abf @ 00401abf ====

void FUN_00401abf(int param_1,undefined4 param_2,undefined4 param_3,undefined4 param_4)

{
  undefined4 uVar1;
  undefined4 uVar2;
  
  DAT_004746a0 = param_3;
  DAT_00474698 = param_1;
  DAT_0047469c = param_2;
  DAT_004746a4 = param_4;
  if (param_1 == 0) {
    uVar2 = 0;
    uVar1 = 0x1c;
  }
  else {
    if (param_1 != 1) {
      return;
    }
    FUN_00402349(0x1c,1);
    FUN_00402349(0x22,param_2);
    FUN_00402349(0x23,0);
    FUN_00402349(0x8c,3);
    FUN_00402349(0x24,param_3);
    FUN_00402349(0x25,param_4);
    if ((DAT_004746de & 1) == 0) {
      return;
    }
    uVar2 = 1;
    uVar1 = 0x30;
  }
  FUN_00402349(uVar1,uVar2);
  return;
}


// ==== FUN_00401b45 @ 00401b45 ====

void FUN_00401b45(char param_1)

{
  uint uVar1;
  
  if (param_1 == '\0') {
    FUN_00402349(0xf,0);
    FUN_00402349(0x19,8);
    uVar1 = 0;
  }
  else {
    FUN_00402349(0xf,1);
    FUN_00402349(0x19,5);
    uVar1 = (uint)DAT_00474794;
  }
  FUN_00402349(0x18,uVar1);
  return;
}


// ==== FUN_00401b86 @ 00401b86 ====

undefined4 FUN_00401b86(byte param_1,undefined4 param_2)

{
  undefined4 local_8;
  
  (**(code **)(*DAT_004747ac + 0xcc))(DAT_004747ac,0x8b,&local_8);
  DAT_004747b0 = param_1;
  FUN_00402349(0x89,(uint)param_1);
  FUN_00402349(0x8b,param_2);
  return local_8;
}


// ==== FUN_00401bca @ 00401bca ====

undefined1 FUN_00401bca(void)

{
  return DAT_004747b0;
}


// ==== FUN_00401bd0 @ 00401bd0 ====

void FUN_00401bd0(void)

{
  undefined4 local_44 [16];
  
  FUN_0040190f(local_44);
  FUN_00402317(2,local_44);
  FUN_00402317(3,local_44);
  FUN_00402317(0x100,local_44);
  return;
}


// ==== FUN_00401c04 @ 00401c04 ====

void FUN_00401c04(undefined4 param_1)

{
  (**(code **)(*DAT_004747ac + 0x120))(DAT_004747ac,6,2,param_1,0x2c);
  return;
}


// ==== FUN_00401c1f @ 00401c1f ====

void FUN_00401c1f(void)

{
  DAT_004747b8 = &DAT_004170d8;
  FUN_004042b5(0x4747bc,0x4170d8,2);
  return;
}


// ==== FUN_00401c3a @ 00401c3a ====

void FUN_00401c3a(void)

{
  return;
}


// ==== FUN_00401c3b @ 00401c3b ====

int * FUN_00401c3b(byte param_1,int *param_2)

{
  int *piVar1;
  uint uVar2;
  
  piVar1 = (int *)(DAT_004747b8 + 2);
  for (uVar2 = (uint)param_1; uVar2 != 0; uVar2 = uVar2 - 1) {
    piVar1 = (int *)((int)piVar1 + *piVar1 + 4);
  }
  if (param_2 != (int *)0x0) {
    *param_2 = *piVar1;
  }
  return piVar1 + 1;
}


// ==== FUN_00401c67 @ 00401c67 ====

undefined1 * __thiscall FUN_00401c67(void *this,int param_1,int param_2,undefined2 param_3)

{
  *(undefined1 *)this = 0;
  *(undefined4 *)((int)this + 0x28) = 0;
  *(int *)((int)this + 4) = param_1;
  *(int *)((int)this + 8) = param_2;
  *(undefined2 *)((int)this + 0xc) = param_3;
  *(undefined1 *)((int)this + 0x14) = 0x80;
  if (param_1 != 0) {
    FUN_00402010(param_1);
  }
  if (param_2 != 0) {
    FUN_00402010(param_2);
  }
  return this;
}


// ==== FUN_00401ca8 @ 00401ca8 ====

undefined1 * __thiscall FUN_00401ca8(void *this,int param_1,int param_2,undefined2 param_3)

{
  *(undefined4 *)((int)this + 0x28) = 0;
  *(int *)((int)this + 4) = param_1;
  *(undefined1 *)this = 1;
  *(int *)((int)this + 8) = param_2;
  *(undefined2 *)((int)this + 0xc) = param_3;
  *(undefined1 *)((int)this + 0x14) = 0x80;
  if (param_1 != 0) {
    FUN_00402041(param_1);
  }
  if (param_2 != 0) {
    FUN_00402010(param_2);
  }
  return this;
}


// ==== FUN_00401ce9 @ 00401ce9 ====

void __fastcall FUN_00401ce9(char *param_1)

{
  void *pvVar1;
  
  pvVar1 = *(void **)(param_1 + 4);
  if (pvVar1 != (void *)0x0) {
    if (*param_1 == '\0') {
      FUN_00402014(pvVar1);
    }
    else {
      FUN_00402045(pvVar1);
    }
  }
  if (*(void **)(param_1 + 8) != (void *)0x0) {
    FUN_00402014(*(void **)(param_1 + 8));
    return;
  }
  return;
}


// ==== FUN_00401d12 @ 00401d12 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00401d12(char *param_1)

{
  ushort uVar1;
  undefined4 *puVar2;
  char cVar3;
  int iVar4;
  undefined4 uVar5;
  undefined4 local_40 [5];
  undefined4 local_2c;
  undefined4 local_10;
  undefined4 local_c;
  
  if ((param_1[0xc] & 0x80U) == 0) {
    FUN_00402349(0xe,1);
    FUN_00402349(0x17,4);
  }
  else {
    FUN_00402349(0xe,0);
    FUN_00402349(0x17,8);
  }
  uVar1 = *(ushort *)(param_1 + 0xc);
  if ((uVar1 & 0x40) == 0) {
    if ((uVar1 & 0x4000) == 0) {
      if ((uVar1 & 1) == 0) {
        iVar4 = 0;
      }
      else {
        iVar4 = 1;
      }
      goto LAB_00401d7f;
    }
    FUN_004019e6(2);
    FUN_00402349(0xe,1);
    FUN_00402349(0x17,4);
  }
  else {
    iVar4 = 2;
LAB_00401d7f:
    FUN_004019e6(iVar4);
  }
  if ((param_1[0xd] & 1U) == 0) {
    FUN_00401b45('\0');
  }
  else {
    DAT_00474794 = param_1[0x14];
    FUN_00401b45('\x01');
    FUN_00402349(0x1b,1);
    FUN_00402349(0x13,5);
    if ((param_1[0xc] & 1U) == 0) {
      uVar5 = 6;
    }
    else {
      uVar5 = 2;
    }
    FUN_00402349(0x14,uVar5);
  }
  if ((param_1[0xc] & 0x10U) == 0) {
    iVar4 = 2;
  }
  else {
    iVar4 = 0;
  }
  FUN_004018ec(iVar4);
  if ((param_1[0xc] & 0x20U) == 0) {
    iVar4 = 0;
LAB_00401e22:
    FUN_00401a3f(0,iVar4);
  }
  else {
    iVar4 = 1;
    if (*(int *)(param_1 + 8) == 0) goto LAB_00401e22;
    FUN_00401a3f(1,1);
    if ((param_1[0xc] & 2U) != 0) {
      FUN_0040190f(local_40);
      local_40[0] = 0x40000000;
      local_10 = _DAT_004170d4;
      local_c = _DAT_004170d4;
      local_2c = 0xc0000000;
      FUN_00402317(0x11,local_40);
    }
  }
  puVar2 = *(undefined4 **)(param_1 + 4);
  if (puVar2 == (undefined4 *)0x0) {
    (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,0);
  }
  else {
    if (*param_1 == '\0') {
      uVar5 = puVar2[3];
    }
    else {
      uVar5 = *puVar2;
    }
    (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,uVar5);
  }
  if (*(int *)(param_1 + 8) == 0) {
    uVar5 = 0;
    iVar4 = *DAT_004747ac;
  }
  else {
    if ((*(ushort *)(param_1 + 0xc) & 4) == 0) {
      if ((*(ushort *)(param_1 + 0xc) & 8) != 0) goto LAB_00401e82;
      iVar4 = 0;
LAB_00401e8a:
      FUN_004019a0(iVar4);
    }
    else {
      FUN_004019a0(1);
LAB_00401e82:
      if ((param_1[0xc] & 8U) != 0) {
        iVar4 = 2;
        goto LAB_00401e8a;
      }
    }
    iVar4 = *DAT_004747ac;
    uVar5 = *(undefined4 *)(*(int *)(param_1 + 8) + 0xc);
  }
  (**(code **)(iVar4 + 0xf4))(DAT_004747ac,1,uVar5);
  if ((*(ushort *)(param_1 + 0xc) & 0x200) == 0) {
    if ((*(ushort *)(param_1 + 0xc) & 0x400) != 0) {
      FUN_00402362(0,0xd,2);
      FUN_00402362(0,0xe,2);
      goto LAB_00401edc;
    }
    cVar3 = '\x01';
  }
  else {
    cVar3 = '\0';
  }
  FUN_0040191b(0,cVar3);
LAB_00401edc:
  if ((param_1[0xd] & 0x10U) != 0) {
    cVar3 = FUN_00401bca();
    param_1[0xe] = cVar3;
    if (cVar3 != '\0') {
      uVar5 = FUN_00401b86(0,0xffffffff);
      *(undefined4 *)(param_1 + 0x10) = uVar5;
    }
  }
  if ((param_1[0xd] & 8U) != 0) {
    *(int *)(param_1 + 0x18) = DAT_00474698;
    *(undefined4 *)(param_1 + 0x1c) = DAT_0047469c;
    *(undefined4 *)(param_1 + 0x20) = DAT_004746a0;
    *(undefined4 *)(param_1 + 0x24) = DAT_004746a4;
    if (DAT_00474698 != 0) {
      FUN_00401abf(0,0xffffffff,0,0x3f800000);
    }
  }
  if ((param_1[0xd] & 0x20U) != 0) {
    FUN_00402349(0xf,1);
    FUN_00402349(0x19,5);
    FUN_00402349(0x18,3);
    FUN_00402362(0,4,10);
  }
  if ((param_1[0xd] & 0x80U) != 0) {
    FUN_00402349(0x3c,(uint)(byte)param_1[0x14] << 0x18 | 0xffffff);
    FUN_00402362(1,5,3);
    FUN_00402362(1,4,2);
  }
  return;
}


// ==== FUN_00401f8b @ 00401f8b ====

void __fastcall FUN_00401f8b(int param_1)

{
  if ((*(byte *)(param_1 + 0xd) & 0x80) != 0) {
    FUN_00402362(1,5,2);
    FUN_00402362(1,4,4);
  }
  if (((*(byte *)(param_1 + 0xd) & 0x10) != 0) && (*(char *)(param_1 + 0xe) != '\0')) {
    FUN_00401b86(1,*(undefined4 *)(param_1 + 0x10));
  }
  if (((*(byte *)(param_1 + 0xd) & 8) != 0) && (*(int *)(param_1 + 0x18) != 0)) {
    FUN_00401abf(*(int *)(param_1 + 0x18),*(undefined4 *)(param_1 + 0x1c),
                 *(undefined4 *)(param_1 + 0x20),*(undefined4 *)(param_1 + 0x24));
  }
  if ((*(byte *)(param_1 + 0xd) & 0x20) != 0) {
    FUN_00402349(0xf,0);
    FUN_00402362(0,4,4);
  }
  FUN_00401a3f(0,0);
  FUN_00401a3f(1,0);
  return;
}


// ==== FUN_00402010 @ 00402010 ====

void __fastcall FUN_00402010(int param_1)

{
  *(int *)(param_1 + 0x14) = *(int *)(param_1 + 0x14) + 1;
  return;
}


// ==== FUN_00402014 @ 00402014 ====

void __fastcall FUN_00402014(void *param_1)

{
  int *piVar1;
  
  piVar1 = (int *)((int)param_1 + 0x14);
  *piVar1 = *piVar1 + -1;
  if ((*piVar1 == 0) && (param_1 != (void *)0x0)) {
    FUN_00402025(param_1,1);
  }
  return;
}


// ==== FUN_00402025 @ 00402025 ====

int __thiscall FUN_00402025(void *this,byte param_1)

{
  FUN_00403e3a((int)this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return (int)this;
}


// ==== FUN_00402041 @ 00402041 ====

void __fastcall FUN_00402041(int param_1)

{
  *(int *)(param_1 + 8) = *(int *)(param_1 + 8) + 1;
  return;
}


// ==== FUN_00402045 @ 00402045 ====

void __fastcall FUN_00402045(void *param_1)

{
  int *piVar1;
  
  piVar1 = (int *)((int)param_1 + 8);
  *piVar1 = *piVar1 + -1;
  if ((*piVar1 == 0) && (param_1 != (void *)0x0)) {
    FUN_00402056(param_1,1);
  }
  return;
}


// ==== FUN_00402056 @ 00402056 ====

int __thiscall FUN_00402056(void *this,byte param_1)

{
  FUN_00401c3a();
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return (int)this;
}


// ==== FUN_00402072 @ 00402072 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00402072(void *this,float *param_1,float *param_2)

{
  float *pfVar1;
  float *pfVar2;
  float10 fVar3;
  undefined1 local_70 [12];
  undefined1 local_64 [12];
  undefined1 local_58 [12];
  float local_4c;
  float fStack_48;
  float fStack_44;
  float local_40 [3];
  float local_34;
  float fStack_30;
  float fStack_2c;
  float local_28;
  undefined4 local_24;
  undefined4 local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  local_34 = *param_1;
  fStack_30 = param_1[1];
  fStack_2c = param_1[2];
  local_4c = *param_2;
  fStack_48 = param_2[1];
  fStack_44 = param_2[2];
  FUN_00401558(local_40,0,0x3f800000,0);
  FUN_00402626(&local_10,&local_4c,&local_34);
  fVar3 = (float10)FUN_0040258d(&local_10);
  param_1 = (float *)(float)fVar3;
  if ((float10)_DAT_004181fc <= fVar3) {
    pfVar1 = FUN_0040265a(local_58,&local_10,(float *)&param_1);
    local_10 = *pfVar1;
    local_c = pfVar1[1];
    local_8 = pfVar1[2];
    fVar3 = FUN_004025b6(local_40,&local_10);
    param_2 = (float *)(float)fVar3;
    pfVar1 = FUN_0040268c(local_58,&local_10,(float *)&param_2);
    FUN_00402626(&local_1c,local_40,pfVar1);
    fVar3 = (float10)FUN_0040258d(&local_1c);
    param_1 = (float *)(float)fVar3;
    if (fVar3 < (float10)_DAT_004181fc) {
      pfVar1 = FUN_0040268c(local_58,&local_10,&local_c);
      pfVar2 = (float *)FUN_00401558(local_64,0,0x3f800000,0);
      pfVar1 = FUN_00402626(local_70,pfVar2,pfVar1);
      local_1c = *pfVar1;
      local_18 = pfVar1[1];
      local_14 = pfVar1[2];
      fVar3 = (float10)FUN_0040258d(&local_1c);
      param_1 = (float *)(float)fVar3;
      if (fVar3 < (float10)_DAT_004181fc) {
        pfVar1 = FUN_0040268c(local_70,&local_10,&local_8);
        pfVar2 = (float *)FUN_00401558(local_64,0,0,0x3f800000);
        pfVar1 = FUN_00402626(local_58,pfVar2,pfVar1);
        local_1c = *pfVar1;
        local_18 = pfVar1[1];
        local_14 = pfVar1[2];
        fVar3 = (float10)FUN_0040258d(&local_1c);
        param_1 = (float *)(float)fVar3;
        if (fVar3 < (float10)_DAT_004181fc) {
          return;
        }
      }
    }
    pfVar1 = FUN_0040265a(local_70,&local_1c,(float *)&param_1);
    local_1c = *pfVar1;
    local_18 = pfVar1[1];
    local_14 = pfVar1[2];
    FUN_004025d1(&local_1c,&local_28,&local_10);
    FUN_00401950(this);
    *(float *)this = local_28;
    *(float *)((int)this + 4) = local_1c;
    *(float *)((int)this + 8) = local_10;
    *(undefined4 *)((int)this + 0x10) = local_24;
    *(float *)((int)this + 0x14) = local_18;
    *(float *)((int)this + 0x18) = local_c;
    *(undefined4 *)((int)this + 0x20) = local_20;
    *(float *)((int)this + 0x24) = local_14;
    *(float *)((int)this + 0x28) = local_8;
    fVar3 = FUN_004025b6(&local_34,&local_28);
    *(float *)((int)this + 0x30) = (float)-fVar3;
    fVar3 = FUN_004025b6(&local_34,&local_1c);
    *(float *)((int)this + 0x34) = (float)-fVar3;
    fVar3 = FUN_004025b6(&local_34,&local_10);
    *(float *)((int)this + 0x38) = (float)-fVar3;
  }
  return;
}


// ==== FUN_00402280 @ 00402280 ====

void __thiscall FUN_00402280(void *this,float *param_1)

{
  FUN_00401950(this);
  FUN_00402381(this,*param_1);
  FUN_004023ed(this,param_1[1]);
  FUN_00402459(this,param_1[2]);
  return;
}


// ==== FUN_004022bb @ 004022bb ====

void __thiscall FUN_004022bb(void *this,float *param_1)

{
  undefined4 *puVar1;
  int iVar2;
  undefined4 local_84 [16];
  float local_44 [5];
  float local_30;
  float local_1c;
  
  FUN_0040190f(local_44);
  local_44[0] = *param_1;
  local_30 = param_1[1];
  local_1c = param_1[2];
  puVar1 = (undefined4 *)FUN_004024c5(local_84,this,local_44);
  for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
    *(undefined4 *)this = *puVar1;
    puVar1 = puVar1 + 1;
    this = (undefined4 *)((int)this + 4);
  }
  return;
}


// ==== FUN_004022ff @ 004022ff ====

void __thiscall FUN_004022ff(void *this,undefined4 *param_1)

{
  *(undefined4 *)((int)this + 0x30) = *param_1;
  *(undefined4 *)((int)this + 0x34) = param_1[1];
  *(undefined4 *)((int)this + 0x38) = param_1[2];
  return;
}


// ==== FUN_00402317 @ 00402317 ====

void FUN_00402317(undefined4 param_1,undefined4 param_2)

{
  (**(code **)(*DAT_004747ac + 0x94))(DAT_004747ac,param_1,param_2);
  return;
}


// ==== FUN_00402330 @ 00402330 ====

void FUN_00402330(undefined4 param_1,undefined4 param_2)

{
  (**(code **)(*DAT_004747ac + 0x98))(DAT_004747ac,param_1,param_2);
  return;
}


// ==== FUN_00402349 @ 00402349 ====

void FUN_00402349(undefined4 param_1,undefined4 param_2)

{
  (**(code **)(*DAT_004747ac + 200))(DAT_004747ac,param_1,param_2);
  return;
}


// ==== FUN_00402362 @ 00402362 ====

void FUN_00402362(undefined1 param_1,undefined4 param_2,undefined4 param_3)

{
  (**(code **)(*DAT_004747ac + 0xfc))(DAT_004747ac,param_1,param_2,param_3);
  return;
}


// ==== FUN_00402381 @ 00402381 ====

void __thiscall FUN_00402381(void *this,float param_1)

{
  undefined4 *puVar1;
  int iVar2;
  float10 fVar3;
  undefined4 local_84 [16];
  float local_44 [5];
  float local_30;
  float local_2c;
  float local_20;
  float local_1c;
  
  FUN_0040190f(local_44);
  fVar3 = FUN_004041ee(param_1);
  local_30 = (float)fVar3;
  fVar3 = FUN_004041dd(param_1);
  local_2c = (float)fVar3;
  fVar3 = FUN_004041dd(param_1);
  local_20 = (float)-fVar3;
  fVar3 = FUN_004041ee(param_1);
  local_1c = (float)fVar3;
  puVar1 = (undefined4 *)FUN_004024c5(local_84,this,local_44);
  for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
    *(undefined4 *)this = *puVar1;
    puVar1 = puVar1 + 1;
    this = (undefined4 *)((int)this + 4);
  }
  return;
}


// ==== FUN_004023ed @ 004023ed ====

void __thiscall FUN_004023ed(void *this,float param_1)

{
  undefined4 *puVar1;
  int iVar2;
  float10 fVar3;
  undefined4 local_84 [16];
  float local_44 [2];
  float local_3c;
  float local_24;
  float local_1c;
  
  FUN_0040190f(local_44);
  fVar3 = FUN_004041ee(param_1);
  local_44[0] = (float)fVar3;
  fVar3 = FUN_004041dd(param_1);
  local_3c = (float)-fVar3;
  fVar3 = FUN_004041dd(param_1);
  local_24 = (float)fVar3;
  fVar3 = FUN_004041ee(param_1);
  local_1c = (float)fVar3;
  puVar1 = (undefined4 *)FUN_004024c5(local_84,this,local_44);
  for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
    *(undefined4 *)this = *puVar1;
    puVar1 = puVar1 + 1;
    this = (undefined4 *)((int)this + 4);
  }
  return;
}


// ==== FUN_00402459 @ 00402459 ====

void __thiscall FUN_00402459(void *this,float param_1)

{
  undefined4 *puVar1;
  int iVar2;
  float10 fVar3;
  undefined4 local_84 [16];
  float local_44;
  float local_40;
  float local_34;
  float local_30;
  
  FUN_0040190f(&local_44);
  fVar3 = FUN_004041ee(param_1);
  local_44 = (float)fVar3;
  fVar3 = FUN_004041dd(param_1);
  local_40 = (float)fVar3;
  fVar3 = FUN_004041dd(param_1);
  local_34 = (float)-fVar3;
  fVar3 = FUN_004041ee(param_1);
  local_30 = (float)fVar3;
  puVar1 = (undefined4 *)FUN_004024c5(local_84,this,&local_44);
  for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
    *(undefined4 *)this = *puVar1;
    puVar1 = puVar1 + 1;
    this = (undefined4 *)((int)this + 4);
  }
  return;
}


// ==== FUN_004024c5 @ 004024c5 ====

void FUN_004024c5(undefined4 *param_1,float *param_2,float *param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  float *pfVar6;
  int iVar7;
  undefined4 *puVar8;
  float *pfVar9;
  undefined4 local_50 [16];
  int local_10;
  int local_c;
  int local_8;
  
  FUN_0040190f(local_50);
  FUN_0040253d(local_50);
  local_10 = (int)local_50 - (int)param_2;
  local_c = 4;
  pfVar9 = param_2;
  do {
    pfVar4 = (float *)(local_10 + (int)pfVar9);
    param_2 = param_3;
    local_8 = 4;
    do {
      fVar1 = *pfVar4;
      pfVar5 = param_2;
      pfVar6 = pfVar9;
      iVar7 = 4;
      do {
        fVar2 = *pfVar6;
        fVar3 = *pfVar5;
        pfVar5 = pfVar5 + 4;
        pfVar6 = pfVar6 + 1;
        iVar7 = iVar7 + -1;
        fVar1 = fVar2 * fVar3 + fVar1;
      } while (iVar7 != 0);
      *pfVar4 = fVar1;
      param_2 = param_2 + 1;
      pfVar4 = pfVar4 + 1;
      local_8 = local_8 + -1;
    } while (local_8 != 0);
    iVar7 = 0x10;
    pfVar9 = pfVar9 + 4;
    local_c = local_c + -1;
  } while (local_c != 0);
  puVar8 = local_50;
  for (; iVar7 != 0; iVar7 = iVar7 + -1) {
    *param_1 = *puVar8;
    puVar8 = puVar8 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_0040253d @ 0040253d ====

void __fastcall FUN_0040253d(undefined4 *param_1)

{
  param_1[0xe] = 0;
  param_1[0xd] = 0;
  param_1[0xc] = 0;
  param_1[0xb] = 0;
  param_1[9] = 0;
  param_1[8] = 0;
  param_1[7] = 0;
  param_1[6] = 0;
  param_1[4] = 0;
  param_1[3] = 0;
  param_1[2] = 0;
  param_1[1] = 0;
  param_1[0xf] = 0;
  param_1[10] = 0;
  param_1[5] = 0;
  *param_1 = 0;
  return;
}


// ==== FUN_0040258d @ 0040258d ====

void __fastcall FUN_0040258d(float *param_1)

{
  FUN_00404213(param_1[2] * param_1[2] + param_1[1] * param_1[1] + *param_1 * *param_1);
  return;
}


// ==== FUN_004025b6 @ 004025b6 ====

float10 __thiscall FUN_004025b6(float *param_1,float *param_2)

{
  return (float10)*param_2 * (float10)*param_1 +
         (float10)param_2[1] * (float10)param_1[1] + (float10)param_2[2] * (float10)param_1[2];
}


// ==== FUN_004025d1 @ 004025d1 ====

void __thiscall FUN_004025d1(void *this,float *param_1,float *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  undefined1 local_10 [12];
  
  FUN_00401555(local_10);
  fVar1 = *param_2;
  fVar2 = *(float *)((int)this + 8);
  fVar3 = *(float *)this;
  fVar4 = param_2[2];
  fVar5 = param_2[1];
  fVar6 = *(float *)this;
  fVar7 = *(float *)((int)this + 4);
  fVar8 = *param_2;
  *param_1 = *(float *)((int)this + 4) * param_2[2] - param_2[1] * *(float *)((int)this + 8);
  param_1[1] = fVar1 * fVar2 - fVar3 * fVar4;
  param_1[2] = fVar5 * fVar6 - fVar7 * fVar8;
  return;
}


// ==== FUN_00402626 @ 00402626 ====

void * FUN_00402626(void *param_1,float *param_2,float *param_3)

{
  FUN_00401558(param_1,*param_2 - *param_3,param_2[1] - param_3[1],param_2[2] - param_3[2]);
  return param_1;
}


// ==== FUN_0040265a @ 0040265a ====

void * FUN_0040265a(void *param_1,float *param_2,float *param_3)

{
  FUN_00401558(param_1,*param_2 / *param_3,param_2[1] / *param_3,param_2[2] / *param_3);
  return param_1;
}


// ==== FUN_0040268c @ 0040268c ====

void * FUN_0040268c(void *param_1,float *param_2,float *param_3)

{
  FUN_00401558(param_1,*param_2 * *param_3,param_2[1] * *param_3,param_2[2] * *param_3);
  return param_1;
}


// ==== FUN_004026be @ 004026be ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004026be(void)

{
  void *this;
  
  this = (void *)FUN_004042e0(0x2c);
  if (this == (void *)0x0) {
    DAT_00474880 = (undefined1 *)0x0;
  }
  else {
    DAT_00474880 = FUN_00401c67(this,0,0,0x1810);
  }
  (**(code **)(*DAT_004747ac + 0x6c))(DAT_004747ac,4,4,DAT_004747a4,&DAT_0047487c);
  _DAT_00474870 = 0;
  _DAT_0047487a = 0;
  _DAT_004747c8 = 0x3f800000;
  _DAT_00474872 = 1;
  _DAT_00474874 = 2;
  _DAT_004747f4 = 0x3f800000;
  _DAT_00474876 = 2;
  _DAT_00474878 = 3;
  _DAT_00474820 = 0x3f800000;
  _DAT_0047484c = 0x3f800000;
  return;
}


// ==== FUN_00402756 @ 00402756 ====

void FUN_00402756(void)

{
  if (DAT_00474880 != (void *)0x0) {
    FUN_00402afa(DAT_00474880,1);
  }
  (**(code **)(*DAT_0047487c + 8))(DAT_0047487c);
  return;
}


// ==== FUN_00402773 @ 00402773 ====

void FUN_00402773(void)

{
  DAT_0041a000 = DAT_00474790 - 0x20304U | 0xff000000;
  return;
}


// ==== FUN_00402788 @ 00402788 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00402788(void *this,int *param_1)

{
  float fVar1;
  undefined4 uVar2;
  undefined4 *puVar3;
  float *pfVar4;
  float local_20;
  float local_1c;
  float local_18;
  undefined1 local_14 [4];
  uint local_10;
  undefined4 uStack_c;
  void *local_8;
  
  local_8 = this;
  FUN_00402a6f(&local_20,(float *)&stack0x00000008,(float *)(param_1 + 2));
  uVar2 = _DAT_004170cc;
  if (_DAT_004170c8 <= local_18) {
    FUN_00402773();
    puVar3 = &DAT_004747d8;
    do {
      *puVar3 = DAT_0041a000;
      puVar3 = puVar3 + 0xb;
    } while ((int)puVar3 < 0x474888);
    pfVar4 = FUN_00402a6f(local_14,&local_20,(float *)(param_1 + 0x33));
    fVar1 = _DAT_004170c4;
    local_20 = *pfVar4;
    local_1c = pfVar4[1];
    local_18 = pfVar4[2];
    uStack_c = 0;
    *(float *)((int)local_8 + 4) =
         (local_20 + _DAT_004170c4) * _DAT_004170d4 * (float)(int)DAT_00474610;
    local_10 = DAT_00474618;
    *(float *)((int)local_8 + 8) =
         (fVar1 - (local_1c + fVar1) * _DAT_004170d4) * (float)DAT_00474618;
    FUN_00401d12(DAT_00474880);
    FUN_00401bd0();
    uStack_c = 0;
    local_10 = DAT_00474610;
    _DAT_0047481c = (_DAT_00418200 / (float)DAT_00474610) * _DAT_004170bc;
    _DAT_004747c0 = local_20 - _DAT_0047481c;
    _DAT_004747c4 = local_1c - _DAT_0047481c;
    _DAT_004747ec = _DAT_0047481c + local_20;
    _DAT_0047481c = _DAT_0047481c + local_1c;
    _DAT_004747f0 = _DAT_004747c4;
    _DAT_00474818 = _DAT_004747ec;
    _DAT_00474844 = _DAT_004747c0;
    _DAT_00474848 = _DAT_0047481c;
    local_8 = (void *)_DAT_004747ec;
    (**(code **)(*DAT_004747ac + 0x124))(DAT_004747ac,4,0,4,2,&DAT_00474870,0x65,&DAT_004747c0,0x2c)
    ;
    FUN_00401f8b((int)DAT_00474880);
    (**(code **)(*param_1 + 4))(0);
  }
  else {
    *(undefined4 *)((int)this + 4) = _DAT_004170cc;
    *(undefined4 *)((int)this + 8) = uVar2;
  }
  return;
}


// ==== FUN_00402907 @ 00402907 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined1 __fastcall FUN_00402907(int param_1)

{
  uint uVar1;
  int iVar2;
  uint *puVar3;
  longlong lVar4;
  longlong lVar5;
  int local_40;
  int local_3c;
  int local_38;
  int local_34;
  int local_30;
  uint *local_2c;
  undefined4 local_28;
  undefined4 local_24;
  uint local_20;
  int iStack_1c;
  uint *local_18;
  int *local_14;
  int local_10;
  int local_c;
  undefined1 local_5;
  
  local_5 = 1;
  if (((_DAT_00418200 <= *(float *)(param_1 + 4)) && (_DAT_00418200 <= *(float *)(param_1 + 8))) &&
     (*(float *)(param_1 + 4) < (float)(DAT_00474610 - 2))) {
    iStack_1c = 0;
    local_20 = DAT_00474618 - 2;
    if (*(float *)(param_1 + 8) < (float)local_20) {
      lVar4 = FUN_00404224();
      local_40 = (int)lVar4;
      lVar5 = FUN_00404224();
      local_3c = (int)lVar5;
      local_34 = local_3c + 4;
      local_38 = (int)lVar4 + 4;
      local_28 = 0;
      local_24 = 0;
      (**(code **)(*DAT_004747ac + 0x40))(DAT_004747ac,0,0,&local_14);
      iVar2 = (**(code **)(*DAT_004747ac + 0x70))
                        (DAT_004747ac,local_14,&local_40,1,DAT_0047487c,&local_28);
      if (iVar2 == 0) {
        iVar2 = (**(code **)(*DAT_0047487c + 0x24))(DAT_0047487c,&local_30,0,0x10);
        if (iVar2 == 0) {
          local_10 = 4;
          iStack_1c = local_30 / 4;
          do {
            local_18 = local_2c;
            local_c = 4;
            puVar3 = local_18;
            do {
              uVar1 = *puVar3;
              puVar3 = puVar3 + 1;
              if ((((DAT_004747a4 == 0x15) || (DAT_004747a4 == 0x16)) || (DAT_004747a4 == 0x14)) &&
                 ((uVar1 & 0xffffff) == (DAT_0041a000 & 0xffffff))) {
                local_5 = 0;
              }
              local_c = local_c + -1;
            } while (local_c != 0);
            local_10 = local_10 + -1;
            local_c = 0;
            local_2c = local_18 + iStack_1c;
          } while (local_10 != 0);
        }
        (**(code **)(*DAT_0047487c + 0x28))(DAT_0047487c);
      }
      (**(code **)(*local_14 + 8))(local_14);
      return local_5;
    }
  }
  return 1;
}


// ==== FUN_00402a6f @ 00402a6f ====

void * FUN_00402a6f(void *param_1,float *param_2,float *param_3)

{
  float fVar1;
  
  fVar1 = param_3[7] * param_2[1] + param_3[3] * *param_2 + param_3[0xb] * param_2[2] + param_3[0xf]
  ;
  FUN_00401558(param_1,(*param_2 * *param_3 + param_3[4] * param_2[1] + param_3[8] * param_2[2] +
                       param_3[0xc]) / fVar1,
               (param_3[5] * param_2[1] + param_3[1] * *param_2 + param_3[9] * param_2[2] +
               param_3[0xd]) / fVar1,
               (param_3[6] * param_2[1] + param_3[2] * *param_2 + param_3[10] * param_2[2] +
               param_3[0xe]) / fVar1);
  return param_1;
}


// ==== FUN_00402afa @ 00402afa ====

char * __thiscall FUN_00402afa(void *this,byte param_1)

{
  FUN_00401ce9(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_00402b16 @ 00402b16 ====

undefined4 * __thiscall FUN_00402b16(void *this,undefined4 param_1,undefined4 param_2,char param_3)

{
  undefined4 uVar1;
  
  *(undefined4 *)((int)this + 8) = 0;
  *(undefined4 *)this = 0;
  *(undefined4 *)((int)this + 4) = 0;
  if (param_3 == '\0') {
    uVar1 = 0x16;
  }
  else {
    uVar1 = 0x15;
  }
  (**(code **)(*DAT_004747ac + 0x50))(DAT_004747ac,param_1,param_2,1,1,uVar1,0,this);
  return this;
}


// ==== FUN_00402b4f @ 00402b4f ====

void __fastcall FUN_00402b4f(undefined4 *param_1)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  char cStack_1c;
  
  (**(code **)(*DAT_004747ac + 0x8c))(DAT_004747ac);
  puVar2 = param_1 + 1;
  DAT_0047488c = param_1;
  (**(code **)(*(int *)*param_1 + 0x3c))((int *)*param_1,0,puVar2);
  uVar1 = DAT_00474888;
  (**(code **)(*DAT_004747ac + 0x7c))(DAT_004747ac,*puVar2);
  (**(code **)(*(int *)*puVar2 + 8))((int *)*puVar2);
  cStack_1c = (char)uVar1;
  if (cStack_1c != '\0') {
    (**(code **)(*DAT_004747ac + 0x90))(DAT_004747ac,0,0,3,DAT_00474790,0x3f800000,0);
  }
  (**(code **)(*DAT_004747ac + 0x88))(DAT_004747ac);
  return;
}


// ==== FUN_00402bc9 @ 00402bc9 ====

void FUN_00402bc9(void)

{
  int iVar1;
  int iVar2;
  int iVar3;
  undefined4 uVar4;
  undefined4 uVar5;
  undefined4 *puVar6;
  
  (**(code **)(*DAT_004747ac + 0x80))(DAT_004747ac,&DAT_00474884);
  puVar6 = &DAT_00474888;
  uVar5 = 0;
  iVar1 = *DAT_004747ac;
  uVar4 = DAT_0047478c;
  iVar2 = FUN_00402c29(DAT_00474618);
  iVar3 = FUN_00402c29(DAT_00474610);
  (**(code **)(iVar1 + 0x68))(DAT_004747ac,iVar3,iVar2,uVar4,uVar5,puVar6);
  (**(code **)(*DAT_004747ac + 0x88))(DAT_004747ac);
  FUN_00402c72('\0');
  return;
}


// ==== FUN_00402c29 @ 00402c29 ====

int FUN_00402c29(uint param_1)

{
  int iVar1;
  
  iVar1 = 0x1f;
  if (param_1 != 0) {
    for (; param_1 >> iVar1 == 0; iVar1 = iVar1 + -1) {
    }
  }
  return 1 << ((char)iVar1 + 1U & 0x1f);
}


// ==== FUN_00402c45 @ 00402c45 ====

void FUN_00402c45(void)

{
  if (DAT_00474884 != (int *)0x0) {
    (**(code **)(*DAT_00474884 + 8))(DAT_00474884);
    DAT_00474884 = (int *)0x0;
  }
  if (DAT_00474888 != (int *)0x0) {
    (**(code **)(*DAT_00474888 + 8))(DAT_00474888);
    DAT_00474888 = (int *)0x0;
  }
  return;
}


// ==== FUN_00402c72 @ 00402c72 ====

void FUN_00402c72(char param_1)

{
  if ((param_1 == '\0') || (DAT_0047488c != 0)) {
    (**(code **)(*DAT_004747ac + 0x8c))(DAT_004747ac);
    DAT_0047488c = 0;
    (**(code **)(*DAT_004747ac + 0x7c))(DAT_004747ac,DAT_00474884,DAT_00474888);
    (**(code **)(*DAT_004747ac + 0x90))(DAT_004747ac,0,0,3,DAT_00474790,0x3f800000,0);
    (**(code **)(*DAT_004747ac + 0x88))(DAT_004747ac);
  }
  return;
}


// ==== FUN_00402cf6 @ 00402cf6 ====

undefined4 * FUN_00402cf6(void)

{
  undefined4 *puVar1;
  
  puVar1 = (undefined4 *)FUN_004042e0(0xe4);
  if (puVar1 != (undefined4 *)0x0) {
    puVar1 = FUN_0040617b(puVar1);
    return puVar1;
  }
  return (undefined4 *)0x0;
}


// ==== FUN_00402d10 @ 00402d10 ====

undefined4 * FUN_00402d10(void)

{
  undefined4 *puVar1;
  
  puVar1 = (undefined4 *)FUN_004042e0(0x1c);
  if (puVar1 != (undefined4 *)0x0) {
    puVar1 = FUN_004069ed(puVar1);
    return puVar1;
  }
  return (undefined4 *)0x0;
}


// ==== FUN_00402d46 @ 00402d46 ====

void __fastcall FUN_00402d46(undefined4 *param_1)

{
  *param_1 = 0;
  param_1[2] = 0;
  param_1[3] = 0;
  param_1[1] = 0;
  return;
}


// ==== FUN_00402d56 @ 00402d56 ====

void __fastcall FUN_00402d56(int *param_1)

{
  int iVar1;
  int iVar2;
  
  if (*param_1 != 0) {
    iVar2 = 0;
    if (0 < param_1[1]) {
      do {
        iVar1 = *(int *)(*param_1 + iVar2 * 4);
        if (iVar1 != 0) {
          FUN_004042eb(iVar1);
        }
        iVar2 = iVar2 + 1;
      } while (iVar2 < param_1[1]);
    }
    FUN_004042eb(*param_1);
  }
  return;
}


// ==== FUN_00402d87 @ 00402d87 ====

void __thiscall FUN_00402d87(void *this,ushort param_1)

{
  int iVar1;
  uint uVar2;
  
  if (*(int *)((int)this + 8) < *(int *)((int)this + 0xc)) {
    if (param_1 == 0) {
      param_1 = FUN_004030ef();
    }
    while ((iVar1 = *(int *)((int)this + 8), *(ushort *)(&DAT_0041a048 + iVar1 * 8) <= param_1 &&
           (iVar1 < *(int *)((int)this + 0xc)))) {
      if ((param_1 != 0xffff) || (*(short *)(&DAT_0041a048 + iVar1 * 8) == -1)) {
        iVar1 = iVar1 * 8;
        (**(code **)(**(int **)(*(int *)this + (uint)(byte)(&DAT_0041a04a)[iVar1] * 4) + 8))
                  (CONCAT31((int3)((uint)iVar1 >> 8),(&DAT_0041a04b)[iVar1]),
                   *(undefined4 *)(&DAT_0041a04c + iVar1));
      }
      *(int *)((int)this + 8) = *(int *)((int)this + 8) + 1;
    }
  }
  uVar2 = 0;
  do {
    iVar1 = 0;
    if (0 < *(int *)((int)this + 4)) {
      do {
        if (*(byte *)(*(int *)(*(int *)this + iVar1 * 4) + 0x14) == uVar2) {
          FUN_0040184c();
          (**(code **)(*DAT_004747ac + 0x90))(DAT_004747ac,0,0,2,DAT_00474790,0x3f800000,0);
          (**(code **)(**(int **)(*(int *)this + iVar1 * 4) + 4))(uVar2);
        }
        iVar1 = iVar1 + 1;
      } while (iVar1 < *(int *)((int)this + 4));
    }
    uVar2 = uVar2 + 1;
  } while ((int)uVar2 < 0x10);
  return;
}


// ==== FUN_00402e4e @ 00402e4e ====

void __fastcall FUN_00402e4e(int *param_1)

{
  int iVar1;
  undefined4 uVar2;
  int iVar3;
  
  param_1[1] = 0xb;
  param_1[3] = 0x125;
  iVar1 = FUN_004042e0(0x2c);
  iVar3 = 0;
  *param_1 = iVar1;
  if (0 < param_1[1]) {
    do {
      uVar2 = (*(code *)(&PTR_LAB_0041a00c)[(uint)(byte)(&DAT_0041a038)[iVar3] * 3])();
      *(undefined4 *)(*param_1 + iVar3 * 4) = uVar2;
      *(undefined4 *)(*(int *)(*param_1 + iVar3 * 4) + 0xc) = 0x41f00000;
      (**(code **)**(undefined4 **)(*param_1 + iVar3 * 4))();
      iVar3 = iVar3 + 1;
    } while (iVar3 < param_1[1]);
  }
  return;
}


// ==== FUN_00402f01 @ 00402f01 ====

undefined4 FUN_00402f01(void)

{
  undefined4 uVar1;
  
  if (DAT_004748b8 == '\0') {
    return 0;
  }
  uVar1 = FUN_004100db(DAT_004748b4);
  return uVar1;
}


// ==== FUN_00402f19 @ 00402f19 ====

void FUN_00402f19(undefined1 *param_1,uint param_2,int param_3)

{
  int iVar1;
  int iVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  undefined4 auStackY_98 [14];
  undefined4 uStackY_60;
  undefined4 local_48 [3];
  int local_3a;
  int local_32;
  int local_2a;
  uint local_8;
  
  FUN_004010dc();
  uStackY_60 = 0x402f38;
  FUN_00404282(DAT_00474894,0,0x100000);
  if (param_3 == 0x10) {
    param_2 = (int)param_2 >> 1;
  }
  iVar3 = *DAT_004748a8;
  iVar1 = DAT_004748a8[1];
  DAT_004748a8 = DAT_004748a8 + 2;
  if (iVar3 == 0) {
    local_8 = 0;
    uStackY_60 = 0x402f7d;
    FUN_00403ca6(DAT_004748a8,(int)DAT_00474894,&local_8);
    uStackY_60 = 0x402f8c;
    FUN_004042b5((int)param_1,(int)DAT_00474894,param_2);
    if ((param_3 != 0x10) || (iVar2 = 0, (int)param_2 < 1)) goto LAB_0040302a;
    do {
      param_1[1] = *(undefined1 *)((int)DAT_00474894 + iVar2);
      *param_1 = 0;
      iVar2 = iVar2 + 1;
      param_1 = param_1 + 2;
    } while (iVar2 < (int)param_2);
  }
  if (iVar3 == 1) {
    FUN_00403157(local_48);
    local_32 = FUN_004042e0(0x400);
    local_2a = FUN_004042e0(0x400);
    uStackY_60 = 0x402ff4;
    FUN_004039ac(local_48,DAT_004748a8);
    FUN_004031b8(local_3a);
    puVar4 = local_48;
    puVar5 = auStackY_98;
    for (iVar3 = 0xf; iVar3 != 0; iVar3 = iVar3 + -1) {
      *puVar5 = *puVar4;
      puVar4 = puVar4 + 1;
      puVar5 = puVar5 + 1;
    }
    *(undefined1 *)puVar5 = *(undefined1 *)puVar4;
    FUN_00403580();
    FUN_004042eb(local_32);
    FUN_004042eb(local_2a);
  }
LAB_0040302a:
  DAT_004748a8 = (int *)((int)DAT_004748a8 + iVar1);
  return;
}


// ==== FUN_00403039 @ 00403039 ====

uint FUN_00403039(void)

{
  uint uVar1;
  undefined4 uVar2;
  
  FUN_00412087(0x402ea5,0x402eef,0x402ef2,0x402ef9,0x402efc);
  uVar1 = FUN_004100fb(0xac44);
  if ((char)uVar1 != '\0') {
    DAT_00474894 = FUN_004042e0(0x100000);
    DAT_004748a8 = DAT_004748ac;
    DAT_0047489c = DAT_004748b0;
    DAT_004748b4 = FUN_0040fd38(0,0x402f19);
    uVar1 = 0;
    if (DAT_004748b4 != (int *)0x0) {
      uVar2 = FUN_004042eb(DAT_00474894);
      DAT_004748b8 = 0;
      return CONCAT31((int3)((uint)uVar2 >> 8),1);
    }
  }
  return uVar1 & 0xffffff00;
}


// ==== FUN_004030ba @ 004030ba ====

void FUN_004030ba(uint param_1)

{
  FUN_0040fe5f(DAT_004748b4,param_1);
  DAT_004748b8 = 1;
  return;
}


// ==== FUN_004030d3 @ 004030d3 ====

void FUN_004030d3(void)

{
  if (DAT_004748b4 != (int *)0x0) {
    FUN_0040fd8d(DAT_004748b4);
  }
  FUN_00410236();
  DAT_004748b8 = 0;
  return;
}


// ==== FUN_004030ef @ 004030ef ====

short FUN_004030ef(void)

{
  byte bVar1;
  undefined1 uVar2;
  undefined3 extraout_var;
  
  if (DAT_004748b8 == '\0') {
    return 0;
  }
  bVar1 = FUN_0041009a(DAT_004748b4);
  uVar2 = FUN_004100ba(DAT_004748b4);
  return (ushort)bVar1 * 0x100 + (short)CONCAT31(extraout_var,uVar2);
}


// ==== FUN_0040311f @ 0040311f ====

uint FUN_0040311f(uint *param_1)

{
  uint uVar1;
  int iVar2;
  
  uVar1 = *param_1;
  iVar2 = ((int)uVar1 >> 0x17 & 0xffU) - 0x7f;
  return (((uVar1 | 0xff800000) << 8) >> (0x1fU - (char)iVar2 & 0x1f) ^ (int)uVar1 >> 0x1f) -
         ((int)uVar1 >> 0x1f) & ~(iVar2 >> 0x1f);
}


// ==== FUN_00403157 @ 00403157 ====

undefined4 * __fastcall FUN_00403157(undefined4 *param_1)

{
  FUN_00403163(param_1);
  return param_1;
}


// ==== FUN_00403163 @ 00403163 ====

void __fastcall FUN_00403163(undefined4 *param_1)

{
  *(undefined1 *)((int)param_1 + 5) = 1;
  *param_1 = 0;
  *(undefined1 *)(param_1 + 1) = 0;
  *(undefined4 *)((int)param_1 + 0xe) = 0x10;
  *(undefined4 *)((int)param_1 + 0x25) = 0x3f800000;
  *(undefined1 *)((int)param_1 + 0x22) = 1;
  *(undefined1 *)((int)param_1 + 0x23) = 1;
  *(undefined4 *)((int)param_1 + 0x31) = 0;
  *(undefined1 *)(param_1 + 9) = 1;
  *(undefined4 *)((int)param_1 + 0x12) = 0;
  *(undefined4 *)((int)param_1 + 0x29) = 0;
  *(undefined4 *)((int)param_1 + 0x16) = 0;
  *(undefined4 *)((int)param_1 + 0x1a) = 0;
  *(undefined4 *)((int)param_1 + 0x35) = 0;
  *(undefined4 *)((int)param_1 + 0x1e) = 0;
  *(undefined4 *)((int)param_1 + 0x2d) = 0;
  *(undefined4 *)((int)param_1 + 0x39) = 0;
  *(undefined4 *)((int)param_1 + 6) = 0;
  *(undefined4 *)((int)param_1 + 10) = 0;
  return;
}


// ==== FUN_004031b8 @ 004031b8 ====

int FUN_004031b8(int param_1)

{
  return param_1 * 0xac4;
}


// ==== FUN_004031c5 @ 004031c5 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_004031c5(float param_1)

{
  float10 fVar1;
  
  fVar1 = FUN_0040416c(_DAT_00418200,param_1 / (float)_DAT_00418208);
  return fVar1 * (float10)_DAT_00418204;
}


// ==== FUN_004031f6 @ 004031f6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __thiscall FUN_004031f6(void *this,undefined4 param_1)

{
  undefined4 uVar1;
  float *pfVar2;
  float10 fVar3;
  int local_8;
  
  local_8 = 0;
  pfVar2 = (float *)&DAT_004748bc;
  do {
    fVar3 = FUN_004041ff(((float)local_8 * (float)_DAT_00418220) / (float)_DAT_00418218);
    *pfVar2 = (float)fVar3;
    local_8 = local_8 + 1;
    pfVar2 = pfVar2 + 1;
  } while ((int)pfVar2 < 0x4750bc);
  *(undefined4 *)((int)this + 0x78) = 0x3f800000;
  uVar1 = _DAT_00418210;
  *(undefined4 *)((int)this + 100) = param_1;
  *(undefined4 *)((int)this + 0x7c) = uVar1;
  *(undefined4 *)((int)this + 0xc) = 0;
  *(undefined4 *)((int)this + 8) = 0;
  *(undefined4 *)((int)this + 4) = 0;
  *(undefined4 *)this = 0;
  return this;
}


// ==== FUN_0040326d @ 0040326d ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040326d(void *this,float param_1,float param_2)

{
  float fVar1;
  double dVar2;
  float fVar3;
  double dVar4;
  float fVar5;
  float10 fVar6;
  
  fVar6 = FUN_00403393(param_1);
  *(double *)((int)this + 0x68) = (double)(fVar6 + fVar6);
  *(double *)((int)this + 0x70) = 1.0 / (double)(fVar6 + fVar6);
  fVar6 = FUN_00404213(param_2);
  fVar1 = (float)_DAT_00418258 / (float)fVar6;
  dVar2 = *(double *)((int)this + 0x70) * _DAT_00418250;
  fVar3 = (float)_DAT_00418248 /
          ((fVar1 + fVar1 + (float)dVar2) * (float)*(double *)((int)this + 0x70) +
          (float)_DAT_00418248);
  dVar4 = _DAT_00418238 -
          *(double *)((int)this + 0x70) * *(double *)((int)this + 0x70) * _DAT_00418240;
  *(float *)((int)this + 0x14) = (float)dVar4 * fVar3;
  *(float *)((int)this + 0x18) =
       (float)_DAT_00418248 - fVar1 * _DAT_00418230 * (float)*(double *)((int)this + 0x70) * fVar3;
  *(undefined4 *)((int)this + 0x1c) = _DAT_00418200;
  *(undefined4 *)((int)this + 0x20) = 0x3f800000;
  fVar1 = (float)_DAT_00418228 / (float)fVar6;
  fVar5 = (float)_DAT_00418248 /
          ((fVar1 + fVar1 + (float)dVar2) * (float)*(double *)((int)this + 0x70) +
          (float)_DAT_00418248);
  *(float *)((int)this + 0x24) = (float)dVar4 * fVar5;
  *(float *)((int)this + 0x28) =
       (float)_DAT_00418248 - fVar1 * _DAT_00418230 * (float)*(double *)((int)this + 0x70) * fVar5;
  *(undefined4 *)((int)this + 0x2c) = _DAT_00418200;
  *(undefined4 *)((int)this + 0x30) = 0x3f800000;
  *(float *)((int)this + 0x10) = fVar3 * fVar5 * *(float *)((int)this + 0x78);
  return;
}


// ==== FUN_00403393 @ 00403393 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_00403393(float param_1)

{
  float fVar1;
  int iVar2;
  longlong lVar3;
  
  fVar1 = (float)_DAT_00418218;
  lVar3 = FUN_00404224();
  iVar2 = (int)lVar3;
  return ((float10)*(float *)(&DAT_004748c0 + iVar2 * 4) - (float10)(float)(&DAT_004748bc)[iVar2]) *
         (float10)(param_1 * fVar1 - (float)iVar2) + (float10)(float)(&DAT_004748bc)[iVar2];
}


// ==== FUN_004033d7 @ 004033d7 ====

void __thiscall FUN_004033d7(void *this,int param_1,int *param_2,int param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  longlong lVar8;
  int local_c;
  
  iVar7 = param_1;
  lVar8 = FUN_00404224();
  iVar5 = (int)lVar8;
  if (0 < param_3) {
    param_1 = param_3;
    iVar7 = iVar7 - (int)param_2;
    do {
      local_c = -iVar5;
      fVar4 = ((float)*(int *)(iVar7 + (int)param_2) * *(float *)((int)this + 0x10) -
              *(float *)((int)this + 0x14) * *(float *)this) -
              *(float *)((int)this + 4) * *(float *)((int)this + 0x18);
      fVar1 = *(float *)this;
      fVar2 = *(float *)((int)this + 4);
      *(undefined4 *)((int)this + 4) = *(undefined4 *)this;
      *(float *)this = fVar4;
      fVar3 = *(float *)((int)this + 0xc);
      *(undefined4 *)((int)this + 0xc) = *(undefined4 *)((int)this + 8);
      *(float *)((int)this + 8) =
           ((fVar1 + fVar1 + fVar2 + fVar4) -
           *(float *)((int)this + 8) * *(float *)((int)this + 0x24)) -
           fVar3 * *(float *)((int)this + 0x28);
      lVar8 = FUN_00404224();
      iVar6 = (int)lVar8;
      if (iVar5 < (int)lVar8) {
        iVar6 = iVar5;
      }
      if (iVar6 < local_c) {
        iVar6 = -iVar5;
      }
      *param_2 = iVar6;
      param_2 = param_2 + 1;
      param_1 = param_1 + -1;
    } while (param_1 != 0);
  }
  return;
}


// ==== FUN_0040349f @ 0040349f ====

void __thiscall FUN_0040349f(void *this,int param_1,int *param_2,int param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  longlong lVar8;
  int local_10;
  int local_c;
  
  lVar8 = FUN_00404224();
  iVar5 = (int)lVar8;
  if (0 < param_3) {
    local_10 = param_3;
    iVar7 = param_1 - (int)param_2;
    do {
      local_c = -iVar5;
      fVar4 = ((float)*(int *)(iVar7 + (int)param_2) * *(float *)((int)this + 0x10) -
              *(float *)((int)this + 0x14) * *(float *)this) -
              *(float *)((int)this + 4) * *(float *)((int)this + 0x18);
      fVar1 = *(float *)((int)this + 4);
      fVar2 = *(float *)this;
      *(undefined4 *)((int)this + 4) = *(undefined4 *)this;
      *(float *)this = fVar4;
      fVar3 = *(float *)((int)this + 0xc);
      *(undefined4 *)((int)this + 0xc) = *(undefined4 *)((int)this + 8);
      *(float *)((int)this + 8) =
           ((fVar2 * *(float *)((int)this + 0x1c) + fVar1 * *(float *)((int)this + 0x20) + fVar4) -
           *(float *)((int)this + 8) * *(float *)((int)this + 0x24)) -
           fVar3 * *(float *)((int)this + 0x28);
      lVar8 = FUN_00404224();
      iVar6 = (int)lVar8;
      if (iVar5 < (int)lVar8) {
        iVar6 = iVar5;
      }
      if (iVar6 < local_c) {
        iVar6 = -iVar5;
      }
      *param_2 = iVar6;
      param_2 = param_2 + 1;
      local_10 = local_10 + -1;
    } while (local_10 != 0);
  }
  return;
}


// ==== FUN_00403580 @ 00403580 ====
// DECOMPILE FAILED
// ==== FUN_004039ac @ 004039ac ====

void FUN_004039ac(undefined4 *param_1,undefined4 *param_2)

{
  int *piVar1;
  int iVar2;
  
  *param_1 = *param_2;
  *(byte *)(param_1 + 1) = *(byte *)(param_2 + 1) & 1;
  *(undefined4 *)((int)param_1 + 6) = *(undefined4 *)((int)param_2 + 5);
  *(undefined4 *)((int)param_1 + 10) = *(undefined4 *)((int)param_2 + 9);
  *(undefined4 *)((int)param_1 + 0xe) = *(undefined4 *)((int)param_2 + 0xd);
  iVar2 = *(int *)((int)param_2 + 0x11);
  *(int *)((int)param_1 + 0x12) = iVar2;
  FUN_004042b5(*(int *)((int)param_1 + 0x16),(int)param_2 + 0x15,iVar2 * 2);
  piVar1 = (int *)((int)param_2 + *(int *)((int)param_1 + 0x12) * 2 + 0x15);
  iVar2 = *piVar1;
  *(int *)((int)param_1 + 0x1a) = iVar2;
  FUN_004042b5(*(int *)((int)param_1 + 0x1e),(int)(piVar1 + 1),iVar2 * 2);
  iVar2 = (int)piVar1 + *(int *)((int)param_1 + 0x1a) * 2 + 4;
  FUN_004042b5((int)param_1 + 0x22,iVar2,3);
  FUN_004042b5((int)param_1 + 0x25,iVar2 + 3,0xc);
  FUN_004042b5((int)param_1 + 0x31,iVar2 + 0xf,0xc);
  return;
}


// ==== FUN_00403a3d @ 00403a3d ====

float10 FUN_00403a3d(double param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)fcos((float10)param_1);
  return (float10)(double)fVar1;
}


// ==== FUN_00403a51 @ 00403a51 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00403a51(void)

{
  float fVar1;
  float *pfVar2;
  int iVar3;
  float *pfVar4;
  int iVar5;
  undefined4 *puVar6;
  float10 fVar7;
  float local_10;
  int local_c;
  uint local_8;
  
  local_8 = 0;
  pfVar2 = (float *)&DAT_004750c0;
  do {
    local_c = 0;
    pfVar4 = (float *)&DAT_0041a998;
    local_10 = 0.0;
    do {
      fVar7 = FUN_00403a3d((double)((float)local_c * _DAT_00418280));
      fVar1 = *pfVar4;
      pfVar4 = pfVar4 + 1;
      local_c = local_c + local_8;
      fVar7 = fVar7 * (float10)fVar1 + (float10)local_10;
      local_10 = (float)fVar7;
    } while ((int)pfVar4 < 0x41a9b8);
    if ((local_8 & 0x40) != 0) {
      fVar7 = -fVar7;
    }
    *pfVar2 = (float)fVar7;
    local_8 = local_8 + 1;
    pfVar2 = pfVar2 + 1;
  } while ((int)pfVar2 < 0x4758c0);
  pfVar2 = (float *)&DAT_004758c0;
  local_8 = 1;
  iVar5 = -0x10;
  do {
    iVar3 = 0x40;
    local_c = iVar5;
    do {
      fVar7 = FUN_00403a3d((double)local_c * _DAT_00418278);
      *pfVar2 = (float)fVar7;
      local_c = local_c + local_8;
      pfVar2 = pfVar2 + 1;
      iVar3 = iVar3 + -1;
    } while (iVar3 != 0);
    local_8 = local_8 + 2;
    iVar5 = iVar5 + -0x20;
  } while (-0x410 < iVar5);
  FUN_00404282(&DAT_004778c0,0,0x800);
  puVar6 = &DAT_004780c0;
  for (iVar5 = 0x200; iVar5 != 0; iVar5 = iVar5 + -1) {
    *puVar6 = 0;
    puVar6 = puVar6 + 1;
  }
  return;
}


// ==== FUN_00403b25 @ 00403b25 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

int FUN_00403b25(int param_1,uint *param_2,int param_3)

{
  uint uVar1;
  uint uVar2;
  uint uVar3;
  uint *puVar4;
  uint *puVar5;
  uint uVar6;
  float *pfVar7;
  uint uVar8;
  int iVar9;
  int iVar10;
  uint uVar11;
  int iStack_34;
  int local_14;
  int local_c;
  float *local_8;
  
  puVar4 = param_2;
  uVar1 = *param_2;
  local_c = 0;
  uVar2 = param_2[1];
  uVar3 = param_2[2];
  puVar5 = param_2 + 3;
  local_8 = (float *)(param_1 + 0x3000);
  do {
    iVar9 = 4;
    uVar8 = 1 << ((byte)local_c & 0x1f);
    uVar6 = uVar8 & uVar1;
    if ((uVar6 == 0) || (iStack_34 = iVar9, (uVar2 & uVar8) == 0)) {
      if ((uVar6 != 0) && ((uVar3 & uVar8) != 0)) {
        iStack_34 = 3;
        goto LAB_00403bc2;
      }
      uVar11 = uVar8 & uVar2;
      if ((uVar11 != 0) && ((uVar3 & uVar8) != 0)) {
        iStack_34 = 2;
        goto LAB_00403bc2;
      }
      if (uVar6 != 0) {
        iVar9 = 2;
        iStack_34 = iVar9;
        goto LAB_00403bc2;
      }
      if (uVar11 != 0) {
        iVar9 = 2;
        iStack_34 = 1;
        goto LAB_00403bc2;
      }
      if ((uVar3 & uVar8) != 0) {
        iVar9 = 2;
        iStack_34 = 0;
        goto LAB_00403bc2;
      }
      pfVar7 = local_8;
      iVar9 = param_3;
      if (0 < param_3) {
        do {
          *pfVar7 = 0.0;
          iVar9 = iVar9 + -1;
          pfVar7 = pfVar7 + 0x20;
        } while (iVar9 != 0);
      }
    }
    else {
LAB_00403bc2:
      param_1 = 0;
      if (0 < param_3) {
        local_14 = param_3;
        pfVar7 = local_8;
        do {
          if (param_1 == 0) {
            param_2._3_1_ = (char)*puVar5;
            puVar5 = (uint *)((int)puVar5 + 1);
            param_1 = 8;
          }
          iVar10 = (int)param_2._3_1_;
          param_1 = param_1 - iVar9;
          param_2 = (uint *)((uint)(byte)(param_2._3_1_ << (sbyte)iVar9) << 0x18);
          *pfVar7 = (float)(CONCAT31((int3)((uint)(iVar10 << (sbyte)iVar9) >> 8),0x80) <<
                           (sbyte)iStack_34) * _DAT_00418284;
          pfVar7 = pfVar7 + 0x20;
          local_14 = local_14 + -1;
        } while (local_14 != 0);
      }
    }
    local_c = local_c + 1;
    local_8 = local_8 + 1;
    if (0x1f < local_c) {
      return (int)puVar5 - (int)puVar4;
    }
  } while( true );
}


// ==== FUN_00403c50 @ 00403c50 ====

void FUN_00403c50(int param_1,float *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float *pfVar4;
  float *pfVar5;
  int iVar6;
  float *pfVar7;
  int iVar8;
  
  pfVar7 = (float *)(param_1 + 0x2800);
  iVar6 = 0x40;
  do {
    fVar3 = 0.0;
    pfVar4 = pfVar7 + -0x800;
    iVar8 = 0x20;
    pfVar5 = param_2;
    do {
      fVar1 = *pfVar5;
      fVar2 = *pfVar4;
      pfVar4 = pfVar4 + 0x40;
      pfVar5 = pfVar5 + 1;
      iVar8 = iVar8 + -1;
      fVar3 = fVar1 * fVar2 + fVar3;
    } while (iVar8 != 0);
    iVar8 = 8;
    pfVar4 = pfVar7;
    do {
      *pfVar4 = fVar3 * pfVar4[-0xa00] + *pfVar4;
      pfVar4 = pfVar4 + 0x40;
      iVar8 = iVar8 + -1;
    } while (iVar8 != 0);
    pfVar7 = pfVar7 + 1;
    iVar6 = iVar6 + -1;
  } while (iVar6 != 0);
  return;
}


// ==== FUN_00403ca6 @ 00403ca6 ====

void FUN_00403ca6(int *param_1,int param_2,uint *param_3)

{
  undefined1 *puVar1;
  undefined1 *puVar2;
  int iVar3;
  uint uVar4;
  int iVar5;
  undefined4 *puVar6;
  longlong lVar7;
  uint *local_c;
  undefined1 *local_8;
  
  local_c = (uint *)(param_1 + 1);
  iVar5 = *param_1 + 0xf;
  puVar2 = (undefined1 *)FUN_004042e0(iVar5 * 0x20);
  FUN_00403a51();
  param_1 = (int *)0x10;
  puVar1 = puVar2;
  while (0 < iVar5) {
    if (param_1 == (int *)0x10) {
      iVar3 = 0x10;
      if (iVar5 < 0x11) {
        iVar3 = iVar5;
      }
      iVar3 = FUN_00403b25(0x4750c0,local_c,iVar3);
      local_c = (uint *)((int)local_c + iVar3);
      param_1 = (int *)0x0;
    }
    FUN_00403c50(0x4750c0,(float *)(&DAT_004780c0 + (int)param_1 * 0x20));
    puVar6 = &DAT_004780bc;
    local_8 = puVar1;
    do {
      lVar7 = FUN_00404224();
      iVar3 = (int)lVar7;
      if (0x7f < iVar3) {
        iVar3 = 0x7f;
      }
      if (iVar3 < -0x80) {
        iVar3 = -0x80;
      }
      puVar1 = local_8 + 1;
      puVar6 = puVar6 + -1;
      *local_8 = (char)iVar3;
      local_8 = puVar1;
    } while (0x47803c < (int)puVar6);
    puVar6 = &DAT_004780bc;
    do {
      *puVar6 = puVar6[-0x20];
      puVar6 = puVar6 + -1;
    } while (0x47793f < (int)puVar6);
    param_1 = (int *)((int)param_1 + 1);
    iVar5 = iVar5 + -1;
    puVar6 = &DAT_004778c0;
    for (iVar3 = 0x20; iVar3 != 0; iVar3 = iVar3 + -1) {
      *puVar6 = 0;
      puVar6 = puVar6 + 1;
    }
  }
  uVar4 = (int)puVar1 - (int)(puVar2 + 0x1e0);
  FUN_004042b5(param_2,(int)(puVar2 + 0x1e0),uVar4);
  *param_3 = uVar4;
  FUN_004042eb((int)puVar2);
  return;
}


// ==== FUN_00403dad @ 00403dad ====

void FUN_00403dad(void)

{
  DAT_004788c0 = 0;
  DAT_004788c8 = 0x15;
  DAT_004788c4 = 0x1a;
  DAT_004788cc = 4;
  return;
}


// ==== FUN_00403dd3 @ 00403dd3 ====

uint * __thiscall
FUN_00403dd3(void *this,uint param_1,uint param_2,uint param_3,char param_4,char param_5)

{
  undefined4 uVar1;
  
  *(uint *)this = param_1;
  *(uint *)((int)this + 8) = param_3;
  *(undefined4 *)((int)this + 0xc) = 0;
  *(undefined4 *)((int)this + 0x14) = 0;
  *(uint *)((int)this + 4) = param_2;
  *(char *)((int)this + 0x10) = param_5;
  uVar1 = DAT_004788c4;
  if (param_5 == '\0') {
    uVar1 = DAT_004788c8;
  }
  (**(code **)(*DAT_004747ac + 0x50))
            (DAT_004747ac,param_2,param_3,param_4 != '\0',0,uVar1,1,(undefined4 *)((int)this + 0xc))
  ;
  FUN_00403e48(this);
  return this;
}


// ==== FUN_00403e3a @ 00403e3a ====

void __fastcall FUN_00403e3a(int param_1)

{
  int *piVar1;
  
  piVar1 = *(int **)(param_1 + 0xc);
  if (piVar1 != (int *)0x0) {
    (**(code **)(*piVar1 + 8))(piVar1);
  }
  return;
}


// ==== FUN_00403e48 @ 00403e48 ====

void __fastcall FUN_00403e48(uint *param_1)

{
  int iVar1;
  int *piVar2;
  short *psVar3;
  int *piVar4;
  undefined1 local_5c [24];
  uint local_44;
  uint local_40;
  int local_3c;
  uint local_38;
  uint *local_34;
  uint local_30;
  uint local_2c;
  int local_28;
  int local_24;
  uint local_20;
  uint local_1c;
  uint local_18;
  uint local_14;
  uint local_10;
  int *local_c;
  uint local_8;
  
  local_28 = DAT_004788c0;
  piVar2 = (int *)*param_1;
  if ((char)param_1[4] != '\0') {
    local_28 = DAT_004788cc;
  }
  local_34 = param_1;
  local_20 = (**(code **)(*(int *)param_1[3] + 0x34))((int *)param_1[3]);
  if (1 < local_20) {
    piVar2 = (int *)FUN_004042e0(param_1[2] * param_1[1] * 4);
    FUN_004042b5((int)piVar2,*param_1,param_1[2] * param_1[1] * 4);
  }
  local_10 = 0;
  if (local_20 != 0) {
    do {
      (**(code **)(*(int *)param_1[3] + 0x38))((int *)param_1[3],local_10,local_5c);
      (**(code **)(*(int *)param_1[3] + 0x40))((int *)param_1[3],local_10,&local_3c,0,0);
      local_8 = 0;
      local_30 = local_38;
      local_c = piVar2;
      if (local_40 != 0) {
        do {
          psVar3 = (short *)(local_3c * local_8 + local_30);
          if (local_28 == 0) {
            FUN_004042b5((int)psVar3,(int)local_c,local_44 << 2);
            local_c = local_c + local_44;
          }
          else {
            local_1c = 0;
            if (local_44 != 0) {
              do {
                piVar4 = local_c + 1;
                local_24 = *local_c;
                *psVar3 = (((short)(char)((uint)local_24 >> 0x18) & 0xf0U) * 0x10 +
                          ((ushort)((uint)local_24 >> 0x10) & 0xf0)) * 0x10 +
                          ((ushort)((uint)local_24 >> 8) & 0xf0) + ((ushort)(local_24 >> 4) & 0xf);
                psVar3 = psVar3 + 1;
                local_1c = local_1c + 1;
                local_c = piVar4;
              } while (local_1c < local_44);
            }
          }
          local_8 = local_8 + 1;
        } while (local_8 < local_40);
      }
      if ((1 < local_20) && (local_8 = 0, (local_40 & 0xfffffffe) != 0)) {
        local_24 = 1;
        do {
          local_c = (int *)0x0;
          if (local_44 >> 1 != 0) {
            do {
              local_30 = local_44 >> 1;
              piVar4 = (int *)(local_44 * local_8 + (int)local_c);
              local_1c = piVar2[(int)piVar4 * 2];
              local_18 = piVar2[(int)piVar4 * 2 + 1];
              iVar1 = local_24 * local_44 + (int)local_c * 2;
              local_14 = piVar2[iVar1];
              local_2c = piVar2[iVar1 + 1];
              piVar4 = (int *)(local_30 * local_8 + (int)local_c);
              local_c = (int *)((int)local_c + 1);
              piVar2[(int)piVar4] =
                   ((((int)((local_2c >> 0x18) + (local_14 >> 0x18) + (local_18 >> 0x18) +
                           (local_1c >> 0x18)) >> 2) * 0x100 +
                    ((int)((local_2c >> 0x10 & 0xff) + (local_14 >> 0x10 & 0xff) +
                           (local_18 >> 0x10 & 0xff) + (local_1c >> 0x10 & 0xff)) >> 2)) * 0x100 +
                   ((int)((local_2c >> 8 & 0xff) + (local_14 >> 8 & 0xff) + (local_18 >> 8 & 0xff) +
                         (local_1c >> 8 & 0xff)) >> 2)) * 0x100 +
                   ((int)((local_2c & 0xff) + (local_14 & 0xff) + (local_18 & 0xff) +
                         (local_1c & 0xff)) >> 2);
              param_1 = local_34;
            } while (local_c < (int *)(local_44 >> 1));
          }
          local_30 = local_44 >> 1;
          local_8 = local_8 + 1;
          local_24 = local_24 + 2;
        } while (local_8 < local_40 >> 1);
      }
      (**(code **)(*(int *)param_1[3] + 0x44))((int *)param_1[3],local_10);
      local_10 = local_10 + 1;
    } while (local_10 < local_20);
  }
  if (1 < local_20) {
    FUN_004042eb((int)piVar2);
  }
  return;
}


// ==== FUN_004040d5 @ 004040d5 ====

int __cdecl FUN_004040d5(char *param_1)

{
  int iVar1;
  
  iVar1 = 0;
  for (; *param_1 != '\0'; param_1 = param_1 + 1) {
    iVar1 = iVar1 + 1;
  }
  return iVar1;
}


// ==== FUN_004040e5 @ 004040e5 ====

void __cdecl FUN_004040e5(undefined4 param_1)

{
  (*DAT_00417038)(0,param_1,0x1000,4);
  return;
}


// ==== FUN_004040f9 @ 004040f9 ====

undefined4 * __cdecl FUN_004040f9(int param_1,int param_2)

{
  undefined4 *puVar1;
  
  puVar1 = (undefined4 *)FUN_004040e5(param_1 * param_2);
  FUN_00404282(puVar1,0,param_1 * param_2);
  return puVar1;
}


// ==== FUN_0040411d @ 0040411d ====

void __cdecl FUN_0040411d(int param_1)

{
  if (param_1 != 0) {
    (*DAT_00417034)(param_1,0,0x8000);
  }
  return;
}


// ==== FUN_00404136 @ 00404136 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __cdecl FUN_00404136(float param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)param_1;
  if (fVar1 < (float10)_DAT_004170c8) {
    fVar1 = -fVar1;
  }
  return fVar1;
}


// ==== FUN_00404148 @ 00404148 ====

int __cdecl FUN_00404148(int param_1)

{
  if (param_1 < 0) {
    param_1 = -param_1;
  }
  return param_1;
}


// ==== FUN_00404153 @ 00404153 ====

float10 __cdecl FUN_00404153(float param_1,float param_2)

{
  return (float10)(float)((float10)param_1 -
                         (float10)(unkint10)((float10)param_1 / (float10)param_2) * (float10)param_2
                         );
}


// ==== FUN_0040416c @ 0040416c ====

float10 __cdecl FUN_0040416c(float param_1,float param_2)

{
  float10 fVar1;
  float10 fVar2;
  float10 fVar3;
  
  fVar3 = (float10)log2((float10)param_1);
  fVar3 = (float10)param_2 * fVar3;
  fVar2 = (float10)1;
  fVar1 = (float10)f2xm1(fVar3 - (float10)(unkint10)(fVar3 / fVar2) * fVar2);
  fVar2 = (float10)fscale(fVar1 + fVar2,fVar3);
  return (float10)(float)fVar2;
}


// ==== FUN_00404191 @ 00404191 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00404191(float param_1)

{
  FUN_0040416c(_DAT_0041828c,param_1);
  return;
}


// ==== FUN_004041ab @ 004041ab ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __cdecl FUN_004041ab(float param_1)

{
  float10 fVar1;
  longlong lVar2;
  
  lVar2 = FUN_00404224();
  fVar1 = (float10)param_1 - (float10)(int)lVar2;
  if (param_1 < _DAT_004170c8) {
    fVar1 = fVar1 + (float10)_DAT_004170c4;
  }
  return (float10)param_1 - fVar1;
}


// ==== FUN_004041dd @ 004041dd ====

float10 __cdecl FUN_004041dd(float param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)fsin((float10)param_1);
  return (float10)(float)fVar1;
}


// ==== FUN_004041ee @ 004041ee ====

float10 __cdecl FUN_004041ee(float param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)fcos((float10)param_1);
  return (float10)(float)fVar1;
}


// ==== FUN_004041ff @ 004041ff ====

float10 __cdecl FUN_004041ff(float param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)fptan((float10)param_1);
  return (float10)(float)fVar1;
}


// ==== FUN_00404213 @ 00404213 ====

float10 __cdecl FUN_00404213(float param_1)

{
  return (float10)SQRT(param_1);
}


// ==== FUN_00404224 @ 00404224 ====

longlong FUN_00404224(void)

{
  float10 in_ST0;
  
  return (longlong)ROUND(in_ST0);
}


// ==== FUN_0040424e @ 0040424e ====

void __cdecl FUN_0040424e(undefined4 param_1)

{
  DAT_0041a9b8 = param_1;
  return;
}


// ==== FUN_00404258 @ 00404258 ====

uint FUN_00404258(void)

{
  DAT_0041a9b8 = DAT_0041a9b8 * 0x343fd + 0x269ec3;
  return DAT_0041a9b8 >> 0x10 & 0x7fff;
}


// ==== FUN_00404282 @ 00404282 ====

undefined4 * __cdecl FUN_00404282(undefined4 *param_1,undefined1 param_2,uint param_3)

{
  uint uVar1;
  undefined4 *puVar2;
  
  if (param_3 != 0) {
    puVar2 = param_1;
    for (uVar1 = param_3 >> 2; uVar1 != 0; uVar1 = uVar1 - 1) {
      *puVar2 = CONCAT22(CONCAT11(param_2,param_2),CONCAT11(param_2,param_2));
      puVar2 = puVar2 + 1;
    }
    for (uVar1 = param_3 & 3; uVar1 != 0; uVar1 = uVar1 - 1) {
      *(undefined1 *)puVar2 = param_2;
      puVar2 = (undefined4 *)((int)puVar2 + 1);
    }
  }
  return param_1;
}


// ==== FUN_004042b5 @ 004042b5 ====

void __cdecl FUN_004042b5(int param_1,int param_2,uint param_3)

{
  uint uVar1;
  
  uVar1 = 0;
  if (param_3 != 0) {
    do {
      *(undefined1 *)(uVar1 + param_1) = *(undefined1 *)(uVar1 + param_2);
      uVar1 = uVar1 + 1;
    } while (uVar1 < param_3);
  }
  return;
}


// ==== entry @ 004042d3 ====

void entry(void)

{
  undefined4 uVar1;
  
  uVar1 = FUN_004160ff();
  (*DAT_0041703c)(uVar1);
  return;
}


// ==== FUN_004042e0 @ 004042e0 ====

void __cdecl FUN_004042e0(undefined4 param_1)

{
  FUN_004040e5(param_1);
  return;
}


// ==== FUN_004042eb @ 004042eb ====

void __cdecl FUN_004042eb(int param_1)

{
  FUN_0040411d(param_1);
  return;
}


// ==== FUN_004042f6 @ 004042f6 ====

undefined4 * __thiscall FUN_004042f6(void *this,int param_1,int param_2,undefined1 param_3)

{
  FUN_00404b2d(this);
  *(undefined1 *)((int)this + 200) = param_3;
  *(int *)((int)this + 0xac) = param_1;
  *(undefined ***)this = &PTR_FUN_00418290;
  *(undefined4 *)((int)this + 0xa4) = 8;
  *(undefined4 *)((int)this + 0xc4) = 0;
  *(int *)((int)this + 0xb4) = param_2;
  *(undefined4 *)((int)this + 0xb0) = 0;
  *(undefined4 *)((int)this + 0xbc) = 0;
  *(undefined4 *)((int)this + 0xb8) = 0;
  *(undefined4 *)((int)this + 0xc0) = 0;
  FUN_00404380(this,param_1);
  FUN_004043d2(this,param_2);
  return this;
}


// ==== FUN_00404364 @ 00404364 ====

undefined4 * __thiscall FUN_00404364(void *this,byte param_1)

{
  FUN_004045b0(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_00404380 @ 00404380 ====

void __thiscall FUN_00404380(void *this,int param_1)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  
  FUN_00404429((int)this);
  *(int *)((int)this + 0xac) = param_1;
  uVar1 = FUN_004042e0(param_1 * 0x2c);
  *(undefined4 *)((int)this + 0xb0) = uVar1;
  uVar1 = FUN_004042e0(param_1 << 2);
  *(undefined4 *)((int)this + 0xbc) = uVar1;
  if (0 < param_1) {
    puVar2 = (undefined4 *)(*(int *)((int)this + 0xb0) + 0x18);
    do {
      *puVar2 = 0xffffffff;
      puVar2 = puVar2 + 0xb;
      param_1 = param_1 + -1;
    } while (param_1 != 0);
  }
  return;
}


// ==== FUN_004043d2 @ 004043d2 ====

void __thiscall FUN_004043d2(void *this,int param_1)

{
  undefined4 uVar1;
  void *pvVar2;
  
  FUN_00404464((int)this);
  *(int *)((int)this + 0xb4) = param_1;
  uVar1 = FUN_004042e0(param_1 * 6);
  *(undefined4 *)((int)this + 0xb8) = uVar1;
  pvVar2 = (void *)FUN_004042e0(param_1 * 0xc);
  if (pvVar2 == (void *)0x0) {
    pvVar2 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar2,0xc,param_1,FUN_00401555);
  }
  *(void **)((int)this + 0xc0) = pvVar2;
  return;
}


// ==== FUN_00404429 @ 00404429 ====

void __fastcall FUN_00404429(int param_1)

{
  if (*(int *)(param_1 + 0xb0) != 0) {
    FUN_004042eb(*(int *)(param_1 + 0xb0));
    *(undefined4 *)(param_1 + 0xb0) = 0;
  }
  if (*(int *)(param_1 + 0xbc) != 0) {
    FUN_004042eb(*(int *)(param_1 + 0xbc));
    *(undefined4 *)(param_1 + 0xbc) = 0;
  }
  return;
}


// ==== FUN_00404464 @ 00404464 ====

void __fastcall FUN_00404464(int param_1)

{
  if (*(int *)(param_1 + 0xb8) != 0) {
    FUN_004042eb(*(int *)(param_1 + 0xb8));
    *(undefined4 *)(param_1 + 0xb8) = 0;
  }
  if (*(int *)(param_1 + 0xc0) != 0) {
    FUN_004042eb(*(int *)(param_1 + 0xc0));
    *(undefined4 *)(param_1 + 0xc0) = 0;
  }
  return;
}


// ==== FUN_0040449f @ 0040449f ====

void __fastcall FUN_0040449f(int param_1)

{
  int iVar1;
  int iVar2;
  void *pvVar3;
  
  iVar1 = FUN_004042e0(*(int *)(param_1 + 0xac) * 0x2c);
  iVar2 = FUN_004042e0(*(int *)(param_1 + 0xac) << 2);
  FUN_004042b5(iVar1,*(int *)(param_1 + 0xb0),*(int *)(param_1 + 0xac) * 0x2c);
  FUN_004042b5(iVar2,*(int *)(param_1 + 0xbc),*(int *)(param_1 + 0xac) << 2);
  FUN_004042eb(*(int *)(param_1 + 0xb0));
  FUN_004042eb(*(int *)(param_1 + 0xbc));
  *(int *)(param_1 + 0xb0) = iVar1;
  *(int *)(param_1 + 0xbc) = iVar2;
  iVar2 = FUN_004042e0(*(int *)(param_1 + 0xb4) * 6);
  iVar1 = *(int *)(param_1 + 0xb4);
  pvVar3 = (void *)FUN_004042e0(iVar1 * 0xc);
  if (pvVar3 == (void *)0x0) {
    pvVar3 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar3,0xc,iVar1,FUN_00401555);
  }
  FUN_004042b5(iVar2,*(int *)(param_1 + 0xb8),*(int *)(param_1 + 0xb4) * 6);
  FUN_004042b5((int)pvVar3,*(int *)(param_1 + 0xc0),*(int *)(param_1 + 0xb4) * 0xc);
  FUN_004042eb(*(int *)(param_1 + 0xb8));
  FUN_004042eb(*(int *)(param_1 + 0xc0));
  *(int *)(param_1 + 0xb8) = iVar2;
  *(void **)(param_1 + 0xc0) = pvVar3;
  return;
}


// ==== FUN_004045b0 @ 004045b0 ====

void __fastcall FUN_004045b0(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_00418290;
  FUN_00404429((int)param_1);
  FUN_00404464((int)param_1);
  if ((void *)param_1[0x31] != (void *)0x0) {
    FUN_00404ae4((void *)param_1[0x31]);
  }
  FUN_00404af5(param_1);
  return;
}


// ==== FUN_004045dd @ 004045dd ====

void __thiscall FUN_004045dd(void *this,int param_1)

{
  *(int *)((int)this + 0xc4) = param_1;
  FUN_00404ae0(param_1);
  return;
}


// ==== FUN_004045f1 @ 004045f1 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_004045f1(int param_1)

{
  float fVar1;
  float fVar2;
  float fVar3;
  ushort uVar4;
  float fVar5;
  undefined4 *puVar6;
  float *pfVar7;
  undefined4 *puVar8;
  float *pfVar9;
  int iVar10;
  float10 fVar11;
  float local_38;
  float local_34;
  float local_30;
  float local_2c;
  float local_28;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  uint local_14;
  ushort *local_10;
  float *local_c;
  int local_8;
  
  local_8 = *(int *)(param_1 + 0xb0);
  FUN_00401555(&local_38);
  FUN_00401555(&local_2c);
  FUN_00401555(&local_20);
  puVar8 = *(undefined4 **)(param_1 + 0xbc);
  iVar10 = 0;
  if (0 < *(int *)(param_1 + 0xac)) {
    puVar6 = (undefined4 *)(*(int *)(param_1 + 0xb0) + 0x10);
    do {
      *puVar8 = 0;
      puVar8 = puVar8 + 1;
      puVar6[1] = 0;
      *puVar6 = 0;
      puVar6[-1] = 0;
      puVar6 = puVar6 + 0xb;
      iVar10 = iVar10 + 1;
    } while (iVar10 < *(int *)(param_1 + 0xac));
  }
  iVar10 = *(int *)(param_1 + 0xb4) * 3;
  if (0 < iVar10) {
    local_10 = (ushort *)(*(int *)(param_1 + 0xb8) + 4);
    local_14 = (iVar10 + 2U) / 3;
    local_c = *(float **)(param_1 + 0xc0);
    do {
      pfVar9 = (float *)((uint)local_10[-1] * 0x2c + local_8);
      pfVar7 = (float *)((uint)local_10[-2] * 0x2c + local_8);
      local_38 = *pfVar9 - *pfVar7;
      local_34 = pfVar9[1] - pfVar7[1];
      local_30 = pfVar9[2] - pfVar7[2];
      pfVar9 = (float *)((uint)*local_10 * 0x2c + local_8);
      local_2c = *pfVar9 - *pfVar7;
      local_28 = pfVar9[1] - pfVar7[1];
      local_24 = pfVar9[2] - pfVar7[2];
      local_20 = -(local_24 * local_34 - local_28 * local_30);
      local_1c = -(local_2c * local_30 - local_24 * local_38);
      local_18 = -(local_28 * local_38 - local_2c * local_34);
      fVar11 = FUN_00404213(local_20 * local_20 + local_1c * local_1c + local_18 * local_18);
      fVar11 = (float10)_DAT_00418248 / fVar11;
      fVar1 = (float)(fVar11 * (float10)local_20);
      fVar2 = (float)(fVar11 * (float10)local_1c);
      fVar3 = (float)(fVar11 * (float10)local_18);
      *local_c = fVar1;
      local_c[1] = fVar2;
      local_c[2] = fVar3;
      iVar10 = (uint)local_10[-2] * 0x2c + *(int *)(param_1 + 0xb0);
      *(float *)(iVar10 + 0xc) = fVar1 + *(float *)(iVar10 + 0xc);
      *(float *)(iVar10 + 0x10) = fVar2 + *(float *)(iVar10 + 0x10);
      *(float *)(iVar10 + 0x14) = fVar3 + *(float *)(iVar10 + 0x14);
      fVar5 = _DAT_004170c4;
      *(float *)(*(int *)(param_1 + 0xbc) + (uint)local_10[-2] * 4) =
           *(float *)(*(int *)(param_1 + 0xbc) + (uint)local_10[-2] * 4) + _DAT_004170c4;
      iVar10 = (uint)local_10[-1] * 0x2c + *(int *)(param_1 + 0xb0);
      *(float *)(iVar10 + 0xc) = fVar1 + *(float *)(iVar10 + 0xc);
      *(float *)(iVar10 + 0x10) = fVar2 + *(float *)(iVar10 + 0x10);
      *(float *)(iVar10 + 0x14) = fVar3 + *(float *)(iVar10 + 0x14);
      *(float *)(*(int *)(param_1 + 0xbc) + (uint)local_10[-1] * 4) =
           *(float *)(*(int *)(param_1 + 0xbc) + (uint)local_10[-1] * 4) + fVar5;
      iVar10 = (uint)*local_10 * 0x2c + *(int *)(param_1 + 0xb0);
      *(float *)(iVar10 + 0xc) = fVar1 + *(float *)(iVar10 + 0xc);
      *(float *)(iVar10 + 0x10) = fVar2 + *(float *)(iVar10 + 0x10);
      *(float *)(iVar10 + 0x14) = fVar3 + *(float *)(iVar10 + 0x14);
      uVar4 = *local_10;
      local_10 = local_10 + 3;
      local_14 = local_14 - 1;
      *(float *)(*(int *)(param_1 + 0xbc) + (uint)uVar4 * 4) =
           *(float *)(*(int *)(param_1 + 0xbc) + (uint)uVar4 * 4) + fVar5;
      local_c = local_c + 3;
    } while (local_14 != 0);
  }
  pfVar7 = *(float **)(param_1 + 0xbc);
  iVar10 = 0;
  if (0 < *(int *)(param_1 + 0xac)) {
    pfVar9 = (float *)(*(int *)(param_1 + 0xb0) + 0x10);
    do {
      fVar1 = _DAT_004170cc / *pfVar7;
      pfVar7 = pfVar7 + 1;
      pfVar9[-1] = fVar1 * pfVar9[-1];
      *pfVar9 = fVar1 * *pfVar9;
      iVar10 = iVar10 + 1;
      pfVar9[1] = fVar1 * pfVar9[1];
      pfVar9 = pfVar9 + 0xb;
    } while (iVar10 < *(int *)(param_1 + 0xac));
  }
  return;
}


// ==== FUN_00404875 @ 00404875 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_00404875(void *this,undefined4 param_1,float param_2,undefined4 param_3,float param_4,
            float param_5,float param_6,float param_7,float param_8,undefined4 param_9,
            float param_10,float param_11,undefined4 param_12,int param_13)

{
  int iVar1;
  short sVar2;
  short sVar3;
  short sVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  int iVar8;
  float *pfVar9;
  float *pfVar10;
  short *psVar11;
  int iVar12;
  short sVar13;
  short sVar14;
  longlong lVar15;
  longlong lVar16;
  int local_10;
  int local_c;
  int local_8;
  
  lVar15 = FUN_00404224();
  iVar8 = (int)lVar15;
  lVar16 = FUN_00404224();
  iVar12 = (int)lVar16;
  FUN_00404380(this,iVar12 * iVar8);
  iVar1 = iVar12 + -1;
  FUN_004043d2(this,(iVar8 * 2 + -2) * iVar1);
  fVar7 = _DAT_00418200;
  pfVar10 = *(float **)((int)this + 0xb0);
  local_8 = 0;
  if (0 < iVar12) {
    local_10 = 0;
    do {
      local_c = 0;
      if (0 < iVar8) {
        fVar6 = (float)local_8 / (float)iVar12;
        pfVar9 = pfVar10;
        do {
          fVar5 = (float)local_c / (float)iVar8;
          *pfVar9 = fVar5 * param_4 * fVar7 + -param_4;
          if (param_13 == 0) {
            pfVar9[1] = param_2;
          }
          else {
            pfVar9[1] = (float)*(uint *)(param_13 + (local_10 + local_c) * 4) * _DAT_00418298 *
                        param_5;
          }
          pfVar9[6] = -NAN;
          pfVar9[2] = -param_6 + fVar6 * param_6 * fVar7;
          pfVar9[8] = param_8 * fVar6;
          pfVar9[7] = param_7 * fVar5;
          pfVar10 = pfVar9 + 0xb;
          local_c = local_c + 1;
          pfVar9[9] = param_10 * fVar5;
          pfVar9[10] = fVar6 * param_11;
          pfVar9 = pfVar10;
        } while (local_c < iVar8);
      }
      local_8 = local_8 + 1;
      local_10 = local_10 + iVar8;
    } while (local_8 < iVar12);
  }
  psVar11 = *(short **)((int)this + 0xb8);
  local_8 = 0;
  if (0 < iVar1) {
    do {
      iVar12 = 0;
      if (0 < iVar8 + -1) {
        sVar4 = ((short)local_8 + 1) * (short)lVar15;
        sVar3 = (short)local_8 * (short)lVar15;
        do {
          sVar2 = (short)iVar12;
          sVar14 = sVar2 + sVar3;
          *psVar11 = sVar14;
          psVar11[1] = sVar2 + sVar4;
          sVar13 = sVar2 + 1 + sVar4;
          psVar11[2] = sVar13;
          psVar11[3] = sVar13;
          psVar11[4] = sVar2 + 1 + sVar3;
          psVar11[5] = sVar14;
          psVar11 = psVar11 + 6;
          iVar12 = iVar12 + 1;
        } while (iVar12 < iVar8 + -1);
      }
      local_8 = local_8 + 1;
    } while (local_8 < iVar1);
  }
  FUN_004045f1((int)this);
  return;
}


// ==== FUN_00404a10 @ 00404a10 ====

void __fastcall FUN_00404a10(int param_1)

{
  undefined4 *puVar1;
  int iVar2;
  undefined4 *puVar3;
  undefined4 local_84 [16];
  float local_44 [16];
  
  if ((*(byte *)(param_1 + 200) & 2) == 0) {
    if (*(char **)(param_1 + 0xc4) != (char *)0x0) {
      FUN_00401d12(*(char **)(param_1 + 0xc4));
    }
    if ((*(byte *)(param_1 + 200) & 1) != 0) {
      FUN_004045f1(param_1);
    }
    FUN_004022ff((float *)(param_1 + 8),(undefined4 *)(param_1 + 0x88));
    FUN_0040190f(local_44);
    FUN_004022bb(local_44,(float *)(param_1 + 0x94));
    puVar1 = (undefined4 *)FUN_004024c5(local_84,local_44,(float *)(param_1 + 8));
    puVar3 = (undefined4 *)(param_1 + 0x48);
    for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
      *puVar3 = *puVar1;
      puVar1 = puVar1 + 1;
      puVar3 = puVar3 + 1;
    }
    FUN_00402317(0x100,param_1 + 0x48);
    (**(code **)(*DAT_004747ac + 0x124))
              (DAT_004747ac,4,0,*(undefined4 *)(param_1 + 0xac),*(undefined4 *)(param_1 + 0xb4),
               *(undefined4 *)(param_1 + 0xb8),0x65,*(undefined4 *)(param_1 + 0xb0),0x2c);
    if (*(int *)(param_1 + 0xc4) != 0) {
      FUN_00401f8b(*(int *)(param_1 + 0xc4));
    }
  }
  return;
}


// ==== FUN_00404ae0 @ 00404ae0 ====

void __fastcall FUN_00404ae0(int param_1)

{
  *(int *)(param_1 + 0x28) = *(int *)(param_1 + 0x28) + 1;
  return;
}


// ==== FUN_00404ae4 @ 00404ae4 ====

void __fastcall FUN_00404ae4(void *param_1)

{
  int *piVar1;
  
  piVar1 = (int *)((int)param_1 + 0x28);
  *piVar1 = *piVar1 + -1;
  if ((*piVar1 == 0) && (param_1 != (void *)0x0)) {
    FUN_00402afa(param_1,1);
  }
  return;
}


// ==== FUN_00404af5 @ 00404af5 ====

void __fastcall FUN_00404af5(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_0041829c;
  return;
}


// ==== FUN_00404b11 @ 00404b11 ====

undefined4 * __thiscall FUN_00404b11(void *this,byte param_1)

{
  FUN_00404af5(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_00404b2d @ 00404b2d ====

undefined4 * __fastcall FUN_00404b2d(undefined4 *param_1)

{
  undefined4 *puVar1;
  undefined1 local_10 [12];
  
  FUN_0040190f(param_1 + 2);
  FUN_0040190f(param_1 + 0x12);
  FUN_00401555(param_1 + 0x22);
  FUN_00401555(param_1 + 0x25);
  param_1[0x29] = 0;
  *param_1 = &PTR_FUN_0041829c;
  puVar1 = (undefined4 *)FUN_00401558(local_10,0x3f800000,0x3f800000,0x3f800000);
  param_1[0x25] = *puVar1;
  param_1[0x26] = puVar1[1];
  param_1[0x27] = puVar1[2];
  puVar1 = (undefined4 *)FUN_00401558(local_10,0,0,0);
  param_1[0x22] = *puVar1;
  param_1[0x23] = puVar1[1];
  param_1[0x24] = puVar1[2];
  return param_1;
}


// ==== FUN_00404bb8 @ 00404bb8 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __thiscall FUN_00404bb8(void *this,undefined4 *param_1,undefined1 param_2)

{
  void *pvVar1;
  undefined4 uVar2;
  undefined4 *puVar3;
  undefined4 *puVar4;
  float10 fVar5;
  float fVar6;
  float fVar7;
  undefined1 local_34 [12];
  undefined1 local_28 [12];
  undefined1 local_1c;
  undefined1 local_1b;
  undefined1 local_1a;
  undefined1 local_19;
  undefined1 local_18;
  undefined1 local_17;
  undefined4 *local_14;
  int local_10;
  undefined4 *local_c;
  int local_8;
  
  local_14 = this;
  FUN_00404b2d(this);
  *(undefined4 *)((int)this + 200) = 0;
  *(undefined ***)this = &PTR_FUN_004182ac;
  *(undefined4 *)((int)this + 0xa4) = 8;
  *(undefined1 *)((int)this + 0xad) = param_2;
  *(undefined1 *)((int)this + 0xac) = 1;
  *(undefined4 **)((int)this + 0xb0) = param_1;
  if (param_1 != (undefined4 *)0x0) {
    pvVar1 = (void *)FUN_004042e0((int)param_1 << 5);
    if (pvVar1 == (void *)0x0) {
      pvVar1 = (void *)0x0;
    }
    else {
      _vector_constructor_iterator_(pvVar1,0x20,(int)param_1,FUN_00408d4b);
    }
    *(void **)((int)this + 0xb4) = pvVar1;
  }
  *(int *)((int)this + 0xb8) = (int)param_1 * 4;
  *(int *)((int)this + 0xc0) = (int)param_1 * 2;
  uVar2 = FUN_004042e0((int)param_1 * 0xb0);
  *(undefined4 *)((int)this + 0xbc) = uVar2;
  local_10 = FUN_004042e0(*(int *)((int)this + 0xc0) * 6);
  *(int *)((int)this + 0xc4) = local_10;
  if (0 < (int)param_1) {
    puVar4 = (undefined4 *)(*(int *)((int)this + 0xbc) + 0x20);
    local_8 = 0;
    local_c = param_1;
    param_1 = *(undefined4 **)((int)this + 0xb4);
    _param_2 = *(undefined4 **)((int)this + 0xb4) + 3;
    do {
      local_1c = 0;
      local_17 = 0;
      local_1b = 1;
      local_1a = 2;
      local_19 = 2;
      local_18 = 3;
      FUN_00409ca6(&local_10,(short)local_8,(int)&local_1c);
      puVar4[-1] = 0;
      *puVar4 = 0;
      puVar4[10] = 0x3f800000;
      puVar4[0xb] = 0;
      puVar4[0x15] = 0x3f800000;
      puVar4[0x16] = 0x3f800000;
      puVar4[0x20] = 0;
      puVar4[0x21] = 0x3f800000;
      puVar4 = puVar4 + 0x2c;
      _param_2[3] = 0x42000000;
      fVar5 = FUN_00401341();
      fVar7 = (float)(fVar5 * (float10)_DAT_004182a8 - (float10)_DAT_004182a4);
      fVar5 = FUN_00401341();
      fVar6 = (float)(fVar5 * (float10)_DAT_004182a8 - (float10)_DAT_004182a4);
      fVar5 = FUN_00401341();
      puVar3 = (undefined4 *)
               FUN_00401558(local_28,(float)(fVar5 * (float10)_DAT_004182a8 - (float10)_DAT_004182a4
                                            ),fVar6,fVar7);
      *param_1 = *puVar3;
      param_1[1] = puVar3[1];
      param_1[2] = puVar3[2];
      puVar3 = (undefined4 *)FUN_00401558(local_34,0,0,0);
      *_param_2 = *puVar3;
      param_1 = param_1 + 8;
      local_8 = local_8 + 4;
      _param_2[1] = puVar3[1];
      _param_2[2] = puVar3[2];
      _param_2[4] = 0xffffffff;
      local_c = (undefined4 *)((int)local_c + -1);
      this = local_14;
      _param_2 = _param_2 + 8;
    } while (local_c != (undefined4 *)0x0);
  }
  return this;
}


// ==== FUN_00404d8b @ 00404d8b ====

undefined4 * __thiscall FUN_00404d8b(void *this,byte param_1)

{
  thunk_FUN_00404af5(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_00404da7 @ 00404da7 ====

void __thiscall FUN_00404da7(void *this,int param_1)

{
  *(int *)((int)this + 200) = param_1;
  FUN_00404ae0(param_1);
  return;
}


// ==== FUN_00404dbb @ 00404dbb ====

void __fastcall FUN_00404dbb(int param_1)

{
  float *pfVar1;
  float *pfVar2;
  float *pfVar3;
  float *pfVar4;
  undefined4 *puVar5;
  int iVar6;
  int iVar7;
  undefined4 *puVar8;
  float *pfVar9;
  undefined1 local_f8 [12];
  undefined1 local_ec [12];
  undefined1 local_e0 [12];
  undefined1 local_d4 [12];
  undefined1 local_c8 [12];
  undefined1 local_bc [12];
  undefined1 local_b0 [12];
  undefined1 local_a4 [12];
  undefined1 local_98 [12];
  undefined1 local_8c [12];
  undefined1 local_80 [12];
  undefined1 local_74 [12];
  float local_68 [16];
  float local_28 [3];
  int local_1c;
  undefined4 local_18;
  undefined4 local_14;
  undefined4 local_10;
  int local_c;
  float *local_8;
  
  if (*(char *)(param_1 + 0xac) != '\0') {
    local_c = param_1;
    if (*(char **)(param_1 + 200) != (char *)0x0) {
      FUN_00401d12(*(char **)(param_1 + 200));
    }
    FUN_0040190f(local_68);
    if (*(char *)(param_1 + 0xad) == '\0') {
      FUN_00402317(2,local_68);
      FUN_00402317(0x100,local_68);
      pfVar4 = (float *)(*(int *)(*(int *)(param_1 + 0xa0) + 8) + 8);
      pfVar3 = local_68;
      for (iVar6 = 0x10; iVar6 != 0; iVar6 = iVar6 + -1) {
        *pfVar3 = *pfVar4;
        pfVar4 = pfVar4 + 1;
        pfVar3 = pfVar3 + 1;
      }
    }
    pfVar4 = *(float **)(param_1 + 0xb4);
    local_1c = 0;
    puVar8 = *(undefined4 **)(param_1 + 0xbc);
    local_8 = pfVar4;
    if (0 < *(int *)(local_c + 0xb0)) {
      do {
        iVar6 = local_c;
        local_8 = pfVar4;
        FUN_00401555(&local_18);
        pfVar3 = local_68;
        pfVar2 = (float *)(iVar6 + 0x88);
        pfVar9 = (float *)(iVar6 + 0x94);
        pfVar1 = FUN_00405271(local_ec,pfVar4,pfVar9);
        pfVar2 = FUN_0040523d(local_f8,pfVar1,pfVar2);
        pfVar3 = FUN_00402a6f(local_8c,pfVar2,pfVar3);
        pfVar2 = FUN_00405271(local_74,pfVar4 + 3,pfVar9);
        FUN_0040523d(local_28,pfVar2,pfVar3);
        pfVar4 = (float *)FUN_00401558(local_a4,-pfVar4[6],-pfVar4[6],0);
        puVar5 = FUN_0040523d(local_d4,local_28,pfVar4);
        local_18 = *puVar5;
        local_14 = puVar5[1];
        local_10 = puVar5[2];
        *puVar8 = local_18;
        puVar8[1] = local_14;
        puVar8[2] = local_10;
        puVar8[6] = local_8[7];
        pfVar4 = (float *)FUN_00401558(local_bc,local_8[6],-local_8[6],0);
        puVar5 = FUN_0040523d(local_80,local_28,pfVar4);
        local_18 = *puVar5;
        local_14 = puVar5[1];
        local_10 = puVar5[2];
        puVar8[0xb] = local_18;
        puVar8[0xc] = local_14;
        puVar8[0xd] = local_10;
        puVar8[0x11] = local_8[7];
        pfVar4 = (float *)FUN_00401558(local_98,local_8[6],local_8[6],0);
        puVar5 = FUN_0040523d(local_b0,local_28,pfVar4);
        local_18 = *puVar5;
        local_14 = puVar5[1];
        local_10 = puVar5[2];
        puVar8[0x16] = local_18;
        puVar8[0x17] = local_14;
        puVar8[0x18] = local_10;
        puVar8[0x1c] = local_8[7];
        pfVar4 = (float *)FUN_00401558(local_c8,-local_8[6],local_8[6],0);
        puVar5 = FUN_0040523d(local_e0,local_28,pfVar4);
        local_18 = *puVar5;
        local_14 = puVar5[1];
        local_10 = puVar5[2];
        puVar8[0x21] = local_18;
        puVar8[0x22] = local_14;
        puVar8[0x23] = local_10;
        pfVar4 = local_8 + 8;
        local_1c = local_1c + 1;
        puVar8[0x27] = local_8[7];
        puVar8 = puVar8 + 0x2c;
        local_8 = pfVar4;
      } while (local_1c < *(int *)(local_c + 0xb0));
    }
    iVar6 = local_c;
    (**(code **)(*DAT_004747ac + 0x124))
              (DAT_004747ac,4,0,*(undefined4 *)(local_c + 0xb8),*(undefined4 *)(local_c + 0xc0),
               *(undefined4 *)(local_c + 0xc4),0x65,*(undefined4 *)(local_c + 0xbc),0x2c);
    if (*(char *)(iVar6 + 0xad) == '\0') {
      pfVar4 = (float *)(*(int *)(*(int *)(iVar6 + 0xa0) + 8) + 8);
      pfVar3 = local_68;
      for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
        *pfVar3 = *pfVar4;
        pfVar4 = pfVar4 + 1;
        pfVar3 = pfVar3 + 1;
      }
      FUN_00402317(2,local_68);
      iVar6 = local_c;
    }
    if (*(int *)(iVar6 + 200) != 0) {
      FUN_00401f8b(*(int *)(iVar6 + 200));
    }
  }
  return;
}


// ==== FUN_00405082 @ 00405082 ====

undefined4 * __thiscall FUN_00405082(void *this,undefined4 param_1,undefined4 param_2)

{
  FUN_00404bb8(this,(undefined4 *)0x1,0);
  *(undefined1 *)((int)this + 0xe4) = 0;
  *(undefined4 *)((int)this + 0xd8) = param_1;
  *(undefined4 *)((int)this + 0xdc) = param_1;
  *(undefined4 *)((int)this + 0xe0) = param_2;
  *(undefined ***)this = &PTR_FUN_004182b4;
  *(undefined4 *)((int)this + 0xa4) = 4;
  *(undefined1 *)((int)this + 0xe5) = 1;
  return this;
}


// ==== FUN_004050cc @ 004050cc ====

undefined4 * __thiscall FUN_004050cc(void *this,byte param_1)

{
  thunk_FUN_00404af5(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_004050ed @ 004050ed ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_004050ed(void *this,float param_1)

{
  char *pcVar1;
  char cVar2;
  
  if (*(char *)((int)this + 0xac) != '\0') {
    cVar2 = FUN_00402907((int)this + 0xcc);
    pcVar1 = (char *)((int)this + 0xe4);
    if (cVar2 == '\0') {
      if (*pcVar1 != '\0') {
        *pcVar1 = '\0';
      }
      if (*(float *)((int)this + 0xdc) < *(float *)((int)this + 0xd8)) {
        *(float *)((int)this + 0xdc) =
             param_1 * *(float *)((int)this + 0xe0) + *(float *)((int)this + 0xdc);
      }
      if (*(float *)((int)this + 0xd8) < *(float *)((int)this + 0xdc)) {
        *(undefined4 *)((int)this + 0xdc) = *(undefined4 *)((int)this + 0xd8);
      }
    }
    else {
      if (*pcVar1 == '\0') {
        *pcVar1 = '\x01';
      }
      if (_DAT_004170c8 < *(float *)((int)this + 0xdc)) {
        *(float *)((int)this + 0xdc) =
             *(float *)((int)this + 0xdc) - param_1 * *(float *)((int)this + 0xe0);
      }
      if (*(float *)((int)this + 0xdc) < _DAT_004170c8) {
        *(undefined4 *)((int)this + 0xdc) = 0;
      }
    }
  }
  return;
}


// ==== FUN_004051ac @ 004051ac ====

void __fastcall FUN_004051ac(int param_1)

{
  longlong lVar1;
  
  if (*(char *)(param_1 + 0xac) != '\0') {
    *(undefined4 *)(*(int *)(param_1 + 0xb4) + 0x18) = *(undefined4 *)(param_1 + 0xdc);
    lVar1 = FUN_00404224();
    *(uint *)(*(int *)(param_1 + 0xb4) + 0x1c) = (int)lVar1 << 0x18 | 0xffffff;
    if (*(char *)(param_1 + 0xe5) != '\0') {
      FUN_00404dbb(param_1);
    }
  }
  return;
}


// ==== FUN_0040520d @ 0040520d ====

void __fastcall FUN_0040520d(int param_1)

{
  if (*(char *)(param_1 + 0xac) != '\0') {
    FUN_00402788((void *)(param_1 + 0xcc),*(int **)(*(int *)(param_1 + 0xa0) + 8));
  }
  return;
}


// ==== FUN_0040523d @ 0040523d ====

void * FUN_0040523d(void *param_1,float *param_2,float *param_3)

{
  FUN_00401558(param_1,*param_2 + *param_3,param_2[1] + param_3[1],param_2[2] + param_3[2]);
  return param_1;
}


// ==== FUN_00405271 @ 00405271 ====

void * FUN_00405271(void *param_1,float *param_2,float *param_3)

{
  FUN_00401558(param_1,*param_2 * *param_3,param_2[1] * param_3[1],param_2[2] * param_3[2]);
  return param_1;
}


// ==== FUN_004052a5 @ 004052a5 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __fastcall FUN_004052a5(undefined4 *param_1)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  undefined1 local_10 [12];
  
  FUN_00404b2d(param_1);
  FUN_00401555(param_1 + 0x2b);
  FUN_0040190f(param_1 + 0x33);
  FUN_00401555(param_1 + 0x45);
  FUN_00401555(param_1 + 0x48);
  *param_1 = &PTR_FUN_004182c0;
  param_1[0x29] = 1;
  puVar2 = (undefined4 *)FUN_00401558(local_10,0,0,0);
  uVar1 = _DAT_004182bc;
  param_1[0x22] = *puVar2;
  param_1[0x23] = puVar2[1];
  param_1[0x24] = puVar2[2];
  puVar2 = (undefined4 *)FUN_00401558(local_10,0,0,uVar1);
  param_1[0x2b] = *puVar2;
  param_1[0x2c] = puVar2[1];
  param_1[0x2d] = puVar2[2];
  param_1[0x30] = 0x3f800000;
  param_1[0x2e] = 0;
  param_1[0x44] = 0;
  param_1[0x2f] = 0x42b40000;
  param_1[0x31] = 0x447a0000;
  param_1[0x32] = 0x3faaaaab;
  *(undefined1 *)(param_1 + 0x43) = 0;
  param_1[0x4b] = 0;
  param_1[0x4c] = 0;
  puVar2 = (undefined4 *)FUN_00401558(local_10,0,0,0);
  param_1[0x45] = *puVar2;
  param_1[0x46] = puVar2[1];
  param_1[0x47] = puVar2[2];
  puVar2 = (undefined4 *)FUN_00401558(local_10,0,0,0);
  param_1[0x48] = *puVar2;
  param_1[0x49] = puVar2[1];
  param_1[0x4a] = puVar2[2];
  return param_1;
}


// ==== FUN_004053da @ 004053da ====

undefined4 * __thiscall FUN_004053da(void *this,byte param_1)

{
  FUN_004053f6(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_004053f6 @ 004053f6 ====

void __fastcall FUN_004053f6(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_004182c0;
  if (param_1[0x4b] != 0) {
    FUN_004042eb(param_1[0x4b]);
  }
  FUN_00404af5(param_1);
  return;
}


// ==== FUN_00405419 @ 00405419 ====

int __fastcall FUN_00405419(int param_1)

{
  FUN_00401555(param_1 + 4);
  FUN_00401555(param_1 + 0x10);
  return param_1;
}


// ==== FUN_00405430 @ 00405430 ====

float10 FUN_00405430(float param_1,int param_2)

{
  int iVar1;
  float10 fVar2;
  
  fVar2 = (float10)param_1;
  if (1 < param_2) {
    iVar1 = param_2 + -1;
    do {
      fVar2 = fVar2 * (float10)param_1;
      iVar1 = iVar1 + -1;
    } while (iVar1 != 0);
  }
  return fVar2;
}


// ==== FUN_0040544c @ 0040544c ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040544c(void *this,float *param_1,float param_2)

{
  float fVar1;
  undefined4 *puVar2;
  int iVar3;
  int iVar4;
  float *pfVar5;
  float *pfVar6;
  float *pfVar7;
  float *pfVar8;
  float local_e4;
  undefined4 local_e0;
  undefined4 uStack_dc;
  undefined4 uStack_d8;
  undefined4 local_d4;
  undefined4 uStack_d0;
  undefined4 uStack_cc;
  float local_c8 [4];
  float local_b8 [3];
  float local_ac;
  undefined4 uStack_a8;
  undefined4 uStack_a4;
  float local_a0;
  undefined4 uStack_9c;
  undefined4 uStack_98;
  undefined4 local_94;
  undefined4 uStack_90;
  undefined4 uStack_8c;
  undefined4 local_88;
  undefined4 uStack_84;
  undefined4 uStack_80;
  float local_7c [4];
  float local_6c [3];
  undefined1 local_60 [12];
  float local_54 [4];
  float local_44;
  undefined4 uStack_40;
  undefined4 uStack_3c;
  float local_38 [4];
  float local_28;
  undefined4 uStack_24;
  undefined4 uStack_20;
  undefined1 local_1c [12];
  float local_10;
  float *local_c;
  float *local_8;
  
  local_10 = 0.5;
  FUN_00405419((int)&local_e4);
  FUN_00405419((int)local_38);
  FUN_00405419((int)local_54);
  FUN_00405419((int)local_c8);
  FUN_00405419((int)local_7c);
  pfVar5 = *(float **)this;
  iVar4 = 7;
  pfVar6 = pfVar5;
  pfVar7 = local_38;
  for (iVar3 = iVar4; iVar3 != 0; iVar3 = iVar3 + -1) {
    *pfVar7 = *pfVar6;
    pfVar6 = pfVar6 + 1;
    pfVar7 = pfVar7 + 1;
  }
  pfVar6 = *(float **)((int)this + 4);
  pfVar7 = pfVar5;
  pfVar8 = local_54;
  for (iVar3 = iVar4; iVar3 != 0; iVar3 = iVar3 + -1) {
    *pfVar8 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar7 = pfVar5;
  pfVar8 = local_c8;
  for (iVar3 = iVar4; iVar3 != 0; iVar3 = iVar3 + -1) {
    *pfVar8 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar7 = pfVar5;
  pfVar8 = local_7c;
  for (; iVar4 != 0; iVar4 = iVar4 + -1) {
    *pfVar8 = *pfVar7;
    pfVar7 = pfVar7 + 1;
    pfVar8 = pfVar8 + 1;
  }
  pfVar7 = pfVar5;
  local_c = pfVar6;
  if (0 < (int)pfVar6) {
    do {
      local_8 = pfVar7;
      if ((*pfVar7 <= param_2) && (local_38[0] < *pfVar7)) {
        pfVar8 = local_38;
        for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
          *pfVar8 = *pfVar7;
          pfVar7 = pfVar7 + 1;
          pfVar8 = pfVar8 + 1;
        }
      }
      local_8 = local_8 + 7;
      local_c = (float *)((int)local_c + -1);
      pfVar7 = local_8;
    } while (local_c != (float *)0x0);
    local_c = pfVar5;
    pfVar7 = pfVar6;
    if (0 < (int)pfVar6) {
      do {
        local_8 = pfVar7;
        if ((*local_c < local_38[0]) && (local_c8[0] <= *local_c)) {
          pfVar7 = local_c;
          pfVar8 = local_c8;
          for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
            *pfVar8 = *pfVar7;
            pfVar7 = pfVar7 + 1;
            pfVar8 = pfVar8 + 1;
          }
        }
        local_8 = (float *)((int)local_8 + -1);
        local_c = local_c + 7;
        pfVar7 = local_8;
      } while (local_8 != (float *)0x0);
      local_c = pfVar6;
      pfVar7 = pfVar5;
      if (0 < (int)pfVar6) {
        do {
          local_8 = pfVar7;
          if (local_54[0] < *local_8) {
            pfVar7 = local_8;
            pfVar8 = local_54;
            for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
              *pfVar8 = *pfVar7;
              pfVar7 = pfVar7 + 1;
              pfVar8 = pfVar8 + 1;
            }
          }
          local_8 = local_8 + 7;
          local_c = (float *)((int)local_c + -1);
          pfVar7 = local_8;
        } while (local_c != (float *)0x0);
        local_c = pfVar5;
        pfVar7 = pfVar6;
        if (0 < (int)pfVar6) {
          do {
            local_8 = pfVar7;
            if ((local_38[0] < *local_c) && (*local_c < local_54[0])) {
              pfVar7 = local_c;
              pfVar8 = local_54;
              for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
                *pfVar8 = *pfVar7;
                pfVar7 = pfVar7 + 1;
                pfVar8 = pfVar8 + 1;
              }
            }
            local_8 = (float *)((int)local_8 + -1);
            local_c = local_c + 7;
            pfVar7 = local_8;
          } while (local_8 != (float *)0x0);
          local_c = pfVar6;
          pfVar7 = pfVar5;
          if (0 < (int)pfVar6) {
            do {
              local_8 = pfVar7;
              if (local_7c[0] < *local_8) {
                pfVar7 = local_8;
                pfVar8 = local_7c;
                for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
                  *pfVar8 = *pfVar7;
                  pfVar7 = pfVar7 + 1;
                  pfVar8 = pfVar8 + 1;
                }
              }
              local_8 = local_8 + 7;
              local_c = (float *)((int)local_c + -1);
              pfVar7 = local_8;
            } while (local_c != (float *)0x0);
            if (0 < (int)pfVar6) {
              do {
                if ((local_54[0] < *pfVar5) && (*pfVar5 < local_7c[0])) {
                  pfVar7 = pfVar5;
                  pfVar8 = local_7c;
                  for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
                    *pfVar8 = *pfVar7;
                    pfVar7 = pfVar7 + 1;
                    pfVar8 = pfVar8 + 1;
                  }
                }
                pfVar5 = pfVar5 + 7;
                pfVar6 = (float *)((int)pfVar6 + -1);
              } while (pfVar6 != (float *)0x0);
            }
          }
        }
      }
    }
  }
  local_c = (float *)(param_2 - local_38[0]);
  fVar1 = local_54[0] - local_38[0];
  if (fVar1 == _DAT_004170c8) {
    pfVar5 = local_38;
  }
  else {
    _vector_constructor_iterator_(&local_ac,0xc,4,FUN_00401555);
    local_ac = local_38[1];
    uStack_a8 = local_38[2];
    uStack_a4 = local_38[3];
    pfVar5 = &local_10;
    local_a0 = local_54[1];
    uStack_9c = local_54[2];
    uStack_98 = local_54[3];
    pfVar6 = FUN_00402626(local_60,local_54 + 1,local_c8 + 1);
    puVar2 = FUN_0040268c(local_1c,pfVar6,pfVar5);
    pfVar5 = &local_10;
    local_94 = *puVar2;
    uStack_90 = puVar2[1];
    uStack_8c = puVar2[2];
    pfVar6 = FUN_00402626(local_1c,local_7c + 1,local_38 + 1);
    puVar2 = FUN_0040268c(local_60,pfVar6,pfVar5);
    local_88 = *puVar2;
    uStack_84 = puVar2[1];
    uStack_80 = puVar2[2];
    puVar2 = FUN_00405778(local_1c,&local_ac,(float)local_c,fVar1);
    local_e0 = *puVar2;
    uStack_dc = puVar2[1];
    uStack_d8 = puVar2[2];
    local_ac = local_28;
    uStack_a8 = uStack_24;
    uStack_a4 = uStack_20;
    local_a0 = local_44;
    uStack_9c = uStack_40;
    pfVar5 = &local_10;
    uStack_98 = uStack_3c;
    pfVar6 = FUN_00402626(local_1c,&local_44,local_b8);
    puVar2 = FUN_0040268c(local_60,pfVar6,pfVar5);
    pfVar5 = &local_10;
    local_94 = *puVar2;
    uStack_90 = puVar2[1];
    uStack_8c = puVar2[2];
    pfVar6 = FUN_00402626(local_1c,local_6c,&local_28);
    puVar2 = FUN_0040268c(local_60,pfVar6,pfVar5);
    local_88 = *puVar2;
    uStack_84 = puVar2[1];
    uStack_80 = puVar2[2];
    puVar2 = FUN_00405778(local_1c,&local_ac,(float)local_c,fVar1);
    local_d4 = *puVar2;
    uStack_d0 = puVar2[1];
    uStack_cc = puVar2[2];
    pfVar5 = &local_e4;
  }
  for (iVar4 = 7; iVar4 != 0; iVar4 = iVar4 + -1) {
    *param_1 = *pfVar5;
    pfVar5 = pfVar5 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_00405778 @ 00405778 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void * FUN_00405778(void *param_1,float *param_2,float param_3,float param_4)

{
  float fVar1;
  float *pfVar2;
  float *pfVar3;
  float *pfVar4;
  float *pfVar5;
  float10 fVar6;
  float10 fVar7;
  float10 fVar8;
  undefined1 local_5c [12];
  undefined1 local_50 [12];
  undefined1 local_44 [12];
  undefined1 local_38 [12];
  undefined1 local_2c [12];
  undefined1 local_20 [12];
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  fVar1 = param_3 / param_4;
  fVar6 = FUN_00405430(fVar1,3);
  fVar7 = FUN_00405430(fVar1,2);
  local_14 = (float)(((float10)(float)(fVar6 + fVar6) - fVar7 * (float10)_DAT_004182cc) +
                    (float10)_DAT_004170c4);
  fVar7 = FUN_00405430(fVar1,3);
  fVar6 = (float10)_DAT_004182c8;
  fVar8 = FUN_00405430(fVar1,2);
  local_10 = (float)(fVar8 * (float10)_DAT_004182cc + (float10)(float)(fVar7 * fVar6));
  fVar6 = FUN_00405430(fVar1,3);
  fVar7 = FUN_00405430(fVar1,2);
  local_c = (float)(((float10)(float)fVar6 - (fVar7 + fVar7)) + (float10)fVar1);
  fVar6 = FUN_00405430(fVar1,3);
  fVar7 = FUN_00405430(fVar1,2);
  local_8 = (float)((float10)(float)fVar6 - fVar7);
  pfVar2 = FUN_0040268c(local_20,param_2 + 9,&local_8);
  pfVar3 = FUN_0040268c(local_2c,param_2 + 6,&local_c);
  pfVar4 = FUN_0040268c(local_38,param_2 + 3,&local_10);
  pfVar5 = FUN_0040268c(local_44,param_2,&local_14);
  pfVar4 = FUN_0040523d(local_50,pfVar5,pfVar4);
  pfVar3 = FUN_0040523d(local_5c,pfVar4,pfVar3);
  FUN_0040523d(param_1,pfVar3,pfVar2);
  return param_1;
}


// ==== FUN_004058a6 @ 004058a6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_004058a6(int param_1)

{
  float *pfVar1;
  float *pfVar2;
  undefined4 *puVar3;
  uint uVar4;
  longlong lVar5;
  float local_94 [16];
  undefined1 local_54 [12];
  undefined1 local_48 [12];
  float local_3c;
  undefined4 local_38;
  undefined4 uStack_34;
  undefined4 uStack_30;
  undefined4 local_2c;
  undefined4 uStack_28;
  undefined4 uStack_24;
  undefined1 local_20 [12];
  float local_14;
  float fStack_10;
  float fStack_c;
  float *local_8;
  
  if (*(float *)(param_1 + 0x110) < _DAT_004170c8) {
    *(undefined4 *)(param_1 + 0x110) = 0;
  }
  if ((*(char *)(param_1 + 0x10c) != '\0') && (*(int *)(param_1 + 300) != 0)) {
    FUN_0040544c((void *)(param_1 + 300),&local_3c,*(float *)(param_1 + 0x110));
    *(undefined4 *)(param_1 + 0x114) = local_38;
    *(undefined4 *)(param_1 + 0x118) = uStack_34;
    *(undefined4 *)(param_1 + 0x11c) = uStack_30;
    *(undefined4 *)(param_1 + 0x120) = local_2c;
    *(undefined4 *)(param_1 + 0x124) = uStack_28;
    *(undefined4 *)(param_1 + 0x128) = uStack_24;
  }
  local_8 = (float *)(param_1 + 0x114);
  *(float *)(param_1 + 0x88) = *local_8;
  *(undefined4 *)(param_1 + 0x8c) = *(undefined4 *)(param_1 + 0x118);
  *(undefined4 *)(param_1 + 0x90) = *(undefined4 *)(param_1 + 0x11c);
  FUN_0040190f(local_94);
  FUN_00402280(local_94,(float *)(param_1 + 0x120));
  pfVar2 = local_94;
  pfVar1 = (float *)FUN_00401558(local_54,0,0,_DAT_004182bc);
  pfVar2 = FUN_00402a6f(local_48,pfVar1,pfVar2);
  puVar3 = FUN_0040523d(local_20,(float *)(param_1 + 0x88),pfVar2);
  *(undefined4 *)(param_1 + 0xac) = *puVar3;
  *(undefined4 *)(param_1 + 0xb0) = puVar3[1];
  *(undefined4 *)(param_1 + 0xb4) = puVar3[2];
  lVar5 = FUN_00404224();
  uVar4 = (uint)lVar5 & 0xffff;
  if ((uVar4 < 0x4000) || (0xc000 < uVar4)) {
    *(undefined4 *)(param_1 + 0xb8) = 0;
  }
  else {
    *(undefined4 *)(param_1 + 0xb8) = 0x40490fdb;
  }
  *(float *)(param_1 + 0xb8) = *(float *)(param_1 + 0x128) + *(float *)(param_1 + 0xb8);
  FUN_00401558(&local_14,0,0,0);
  pfVar1 = FUN_00402a6f(local_20,&local_14,local_94);
  pfVar2 = local_8;
  local_14 = *pfVar1;
  fStack_10 = pfVar1[1];
  fStack_c = pfVar1[2];
  pfVar1 = FUN_0040523d(local_20,local_8,&local_14);
  *pfVar2 = *pfVar1;
  pfVar2[1] = pfVar1[1];
  pfVar2[2] = pfVar1[2];
  return;
}


// ==== FUN_00405a29 @ 00405a29 ====

void __thiscall FUN_00405a29(void *this,int param_1)

{
  undefined1 uVar1;
  void *pvVar2;
  byte *pbVar3;
  int iVar4;
  float10 fVar5;
  
  pbVar3 = (byte *)(param_1 + 2);
  *(uint *)((int)this + 0x130) = (uint)*pbVar3;
  if (*(int *)((int)this + 300) != 0) {
    FUN_004042eb(*(int *)((int)this + 300));
  }
  iVar4 = *(int *)((int)this + 0x130);
  pvVar2 = (void *)FUN_004042e0(iVar4 * 0x1c);
  if (pvVar2 == (void *)0x0) {
    pvVar2 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar2,0x1c,iVar4,FUN_00405419);
  }
  iVar4 = 0;
  *(void **)((int)this + 300) = pvVar2;
  param_1 = 0;
  if (0 < *(int *)((int)this + 0x130)) {
    do {
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 1));
      *(float *)(*(int *)((int)this + 300) + iVar4) = (float)fVar5;
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 3));
      *(float *)(*(int *)((int)this + 300) + 4 + iVar4) = (float)fVar5;
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 5));
      *(float *)(*(int *)((int)this + 300) + 8 + iVar4) = (float)fVar5;
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 7));
      *(float *)(*(int *)((int)this + 300) + 0xc + iVar4) = (float)fVar5;
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 9));
      *(float *)(*(int *)((int)this + 300) + 0x10 + iVar4) = (float)fVar5;
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 0xb));
      *(float *)(*(int *)((int)this + 300) + 0x14 + iVar4) = (float)fVar5;
      fVar5 = FUN_00401358((ushort *)(pbVar3 + 0xd));
      pbVar3 = pbVar3 + 0xe;
      param_1 = param_1 + 1;
      *(float *)(*(int *)((int)this + 300) + 0x18 + iVar4) = (float)fVar5;
      iVar4 = iVar4 + 0x1c;
    } while (param_1 < *(int *)((int)this + 0x130));
  }
  uVar1 = *(undefined1 *)((int)this + 0x10c);
  *(undefined1 *)((int)this + 0x10c) = 1;
  FUN_004058a6((int)this);
  FUN_004058a6((int)this);
  *(undefined1 *)((int)this + 0x10c) = uVar1;
  return;
}


// ==== FUN_00405b5d @ 00405b5d ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00405b5d(int param_1)

{
  void *this;
  undefined4 local_44 [16];
  
  this = (void *)(param_1 + 8);
  FUN_00402072(this,(float *)(param_1 + 0x88),(float *)(param_1 + 0xac));
  if (*(float *)(param_1 + 0xb8) != _DAT_004170c8) {
    FUN_00405c98(this,-*(float *)(param_1 + 0xb8));
  }
  FUN_00402317(2,this);
  FUN_0040190f(local_44);
  FUN_00405c0c((void *)(param_1 + 0xcc),*(float *)(param_1 + 0xc0),*(float *)(param_1 + 0xc4),
               *(float *)(param_1 + 0xbc) * (float)_DAT_004182e0,*(float *)(param_1 + 200));
  FUN_00402317(3,(void *)(param_1 + 0xcc));
  FUN_00402317(0x100,local_44);
  return;
}


// ==== FUN_00405c0c @ 00405c0c ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00405c0c(void *this,float param_1,float param_2,float param_3,float param_4)

{
  float fVar1;
  float10 fVar2;
  float10 fVar3;
  float10 fVar4;
  float10 fVar5;
  
  fVar1 = param_3 * _DAT_004170d4;
  fVar2 = FUN_004041ee(fVar1);
  fVar3 = FUN_004041dd(fVar1);
  fVar4 = FUN_004041ee(fVar1);
  fVar5 = FUN_004041dd(fVar1);
  fVar1 = param_2 / (param_2 - param_1);
  FUN_0040253d(this);
  *(float *)this = (float)(((float10)(float)fVar2 / fVar3) / (float10)param_4);
  *(float *)((int)this + 0x38) = -(fVar1 * param_1);
  *(float *)((int)this + 0x14) = (float)((float10)(float)fVar4 / fVar5);
  *(float *)((int)this + 0x28) = fVar1;
  *(undefined4 *)((int)this + 0x2c) = 0x3f800000;
  return;
}


// ==== FUN_00405c98 @ 00405c98 ====

void __thiscall FUN_00405c98(void *this,float param_1)

{
  undefined4 *puVar1;
  int iVar2;
  float10 fVar3;
  undefined4 local_88 [16];
  float local_48;
  float local_44;
  undefined4 local_40;
  float local_38;
  float local_34;
  undefined4 local_30;
  undefined4 local_28;
  undefined4 local_24;
  undefined4 local_20;
  float local_8;
  
  FUN_0040190f(&local_48);
  fVar3 = FUN_004041dd(param_1);
  local_8 = (float)fVar3;
  fVar3 = FUN_004041ee(param_1);
  local_48 = (float)fVar3;
  local_40 = 0;
  local_38 = -local_8;
  local_44 = local_8;
  local_34 = (float)fVar3;
  local_30 = 0;
  local_28 = 0;
  local_24 = 0;
  local_20 = 0x3f800000;
  puVar1 = (undefined4 *)FUN_004024c5(local_88,this,&local_48);
  for (iVar2 = 0x10; iVar2 != 0; iVar2 = iVar2 + -1) {
    *(undefined4 *)this = *puVar1;
    puVar1 = puVar1 + 1;
    this = (undefined4 *)((int)this + 4);
  }
  return;
}


// ==== FUN_00405d13 @ 00405d13 ====

undefined4 * __fastcall FUN_00405d13(undefined4 *param_1)

{
  FUN_00404b2d(param_1);
  param_1[0x45] = 0xffffffff;
  *param_1 = &PTR_FUN_004182e8;
  param_1[0x29] = 2;
  param_1[0x46] = 0x44fa0000;
  FUN_00404282(param_1 + 0x2b,0,0x68);
  *(undefined1 *)(param_1 + 0x48) = 0;
  param_1[0x49] = 0xffffffff;
  param_1[0x2c] = 0x3f800000;
  param_1[0x2b] = 1;
  param_1[0x2d] = 0x3f800000;
  param_1[0x3e] = 0x44fa0000;
  param_1[0x2e] = 0x3f800000;
  param_1[0x2f] = 0x3f800000;
  param_1[0x3f] = 0x3f800000;
  param_1[0x41] = 0x3f800000;
  return param_1;
}


// ==== FUN_00405da8 @ 00405da8 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00405da8(int param_1)

{
  float *pfVar1;
  uint uVar2;
  float fVar3;
  int iVar4;
  int iVar5;
  undefined4 uVar6;
  
  fVar3 = _DAT_00418298;
  iVar5 = *(int *)(param_1 + 0x124);
  if (iVar5 != -1) {
    if (*(char *)(param_1 + 0x120) == '\0') {
      uVar6 = 0;
      iVar4 = *DAT_004747ac;
    }
    else {
      uVar2 = *(uint *)(param_1 + 0x114);
      *(float *)(param_1 + 0xbc) = (float)(uVar2 >> 0x18) * _DAT_00418298;
      pfVar1 = (float *)(param_1 + 0x11c);
      *(float *)(param_1 + 0xb0) = (float)(uVar2 >> 0x10 & 0xff) * fVar3;
      *(float *)(param_1 + 0xb4) = (float)(uVar2 >> 8 & 0xff) * fVar3;
      *(float *)(param_1 + 0xb8) = (float)(uVar2 & 0xff) * fVar3;
      if (*pfVar1 < _DAT_004182f0) {
        *pfVar1 = _DAT_004182f0;
      }
      *(float *)(param_1 + 0x104) = *pfVar1;
      *(undefined4 *)(param_1 + 0xf8) = *(undefined4 *)(param_1 + 0x118);
      *(undefined4 *)(param_1 + 0xe0) = *(undefined4 *)(param_1 + 0x88);
      *(undefined4 *)(param_1 + 0xe4) = *(undefined4 *)(param_1 + 0x8c);
      *(undefined4 *)(param_1 + 0xe8) = *(undefined4 *)(param_1 + 0x90);
      (**(code **)(*DAT_004747ac + 0xb0))(DAT_004747ac,iVar5,param_1 + 0xac);
      uVar6 = 1;
      iVar5 = *(int *)(param_1 + 0x124);
      iVar4 = *DAT_004747ac;
    }
    (**(code **)(iVar4 + 0xb8))(DAT_004747ac,iVar5,uVar6);
  }
  return;
}


// ==== FUN_00405ec9 @ 00405ec9 ====

void __fastcall FUN_00405ec9(undefined4 *param_1)

{
  param_1[5] = 0xffffffff;
  *param_1 = 0;
  param_1[1] = 0;
  param_1[2] = 0;
  param_1[4] = 0;
  return;
}


// ==== FUN_00405edd @ 00405edd ====

void __fastcall FUN_00405edd(int *param_1)

{
  undefined4 *puVar1;
  int iVar2;
  
  if (param_1[1] != 0) {
    iVar2 = 0;
    if (0 < param_1[1]) {
      do {
        puVar1 = *(undefined4 **)(*param_1 + iVar2 * 4);
        if (puVar1 != (undefined4 *)0x0) {
          (**(code **)*puVar1)(1);
        }
        iVar2 = iVar2 + 1;
      } while (iVar2 < param_1[1]);
    }
    FUN_004042eb(*param_1);
  }
  return;
}


// ==== FUN_00405f0e @ 00405f0e ====

void __thiscall FUN_00405f0e(void *this,int param_1)

{
  int iVar1;
  int iVar2;
  
  iVar1 = FUN_004042e0(*(int *)((int)this + 4) * 4 + 4);
  if (*(int *)((int)this + 4) != 0) {
    iVar2 = 0;
    if (0 < *(int *)((int)this + 4)) {
      do {
        *(undefined4 *)(iVar1 + iVar2 * 4) = *(undefined4 *)(*(int *)this + iVar2 * 4);
        iVar2 = iVar2 + 1;
      } while (iVar2 < *(int *)((int)this + 4));
    }
    FUN_004042eb(*(int *)this);
  }
  *(int *)this = iVar1;
  *(int *)(iVar1 + *(int *)((int)this + 4) * 4) = param_1;
  *(int *)((int)this + 4) = *(int *)((int)this + 4) + 1;
  *(void **)(param_1 + 0xa0) = this;
  if (((*(byte *)(param_1 + 0xa4) & 1) != 0) && (*(int *)((int)this + 8) == 0)) {
    *(int *)((int)this + 8) = param_1;
  }
  if ((*(byte *)(param_1 + 0xa4) & 2) != 0) {
    *(undefined4 *)(param_1 + 0x124) = *(undefined4 *)((int)this + 0x10);
    *(int *)((int)this + 0x10) = *(int *)((int)this + 0x10) + 1;
  }
  return;
}


// ==== FUN_00405f8b @ 00405f8b ====

void __thiscall FUN_00405f8b(void *this,uint param_1,float param_2,char param_3)

{
  uint uVar1;
  int *this_00;
  int iVar2;
  undefined4 *puVar3;
  
  iVar2 = 0;
  puVar3 = *(undefined4 **)this;
  if (0 < *(int *)((int)this + 4)) {
    do {
      this_00 = (int *)*puVar3;
      uVar1 = this_00[0x29];
      if ((param_1 & uVar1) != 0) {
        if ((uVar1 & 4) == 0) {
          if ((uVar1 & 1) == 0) {
            if ((uVar1 & 2) != 0) {
              *(undefined1 *)(this_00 + 0x48) = *(undefined1 *)((int)this + 0xc);
              this_00 = (int *)*puVar3;
            }
          }
          else if (this_00 != *(int **)((int)this + 8)) goto LAB_00405ff4;
LAB_00405fe8:
          (**(code **)(*this_00 + 4))(param_2);
        }
        else if (param_3 == '\0') {
          FUN_0040520d((int)this_00);
        }
        else {
          if (param_3 != '\x01') goto LAB_00405fe8;
          FUN_004050ed(this_00,param_2);
        }
      }
LAB_00405ff4:
      puVar3 = puVar3 + 1;
      iVar2 = iVar2 + 1;
    } while (iVar2 < *(int *)((int)this + 4));
  }
  return;
}


// ==== FUN_00406004 @ 00406004 ====

void __thiscall FUN_00406004(void *this,float param_1)

{
  FUN_00405f8b(this,1,param_1,'\0');
  FUN_00405f8b(this,4,param_1,'\0');
  (**(code **)(**(int **)((int)this + 8) + 4))(param_1);
  if (*(int *)((int)this + 0x14) != -1) {
    FUN_00401b86(1,*(int *)((int)this + 0x14));
  }
  *(undefined1 *)((int)this + 0xc) = 1;
  FUN_00405f8b(this,2,param_1,'\0');
  FUN_00405f8b(this,0xc,param_1,'\x01');
  if (*(int *)((int)this + 0x14) != -1) {
    FUN_00401b86(0,0xffffffff);
  }
  *(undefined1 *)((int)this + 0xc) = 0;
  FUN_00405f8b(this,2,0.0,'\0');
  FUN_00405f8b(this,4,param_1,'\x02');
  return;
}


// ==== FUN_004060ac @ 004060ac ====

void __fastcall FUN_004060ac(undefined4 *param_1)

{
  *(undefined1 *)((int)param_1 + 0x15) = 0;
  *(undefined1 *)(param_1 + 5) = 0;
  param_1[2] = 0;
  *param_1 = &PTR_FUN_004182f4;
  param_1[3] = 0x41f00000;
  return;
}


// ==== FUN_004060c9 @ 004060c9 ====

void __fastcall FUN_004060c9(int param_1)

{
  undefined4 uVar1;
  
  *(undefined4 *)(param_1 + 4) = 0;
  uVar1 = FUN_00402f01();
  *(undefined4 *)(param_1 + 0x10) = uVar1;
  return;
}


// ==== FUN_004060db @ 004060db ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_004060db(int param_1)

{
  bool bVar1;
  int iVar2;
  undefined4 uVar3;
  
  iVar2 = FUN_00402f01();
  *(float *)(param_1 + 4) =
       (float)(iVar2 - *(int *)(param_1 + 0x10)) / (_DAT_00418300 / *(float *)(param_1 + 0xc));
  uVar3 = FUN_00402f01();
  bVar1 = *(float *)(param_1 + 8) != _DAT_004170c8;
  *(undefined4 *)(param_1 + 0x10) = uVar3;
  if (bVar1) {
    *(float *)(param_1 + 4) = *(float *)(param_1 + 4) + *(float *)(param_1 + 8);
    *(undefined4 *)(param_1 + 8) = 0;
  }
  return;
}


// ==== FUN_00406127 @ 00406127 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00406127(void *this,char param_1,float param_2)

{
  longlong lVar1;
  
  if (param_1 == -4) {
    lVar1 = FUN_00404224();
    *(char *)((int)this + 0x14) = (char)lVar1;
  }
  else if (param_1 == -3) {
    *(float *)((int)this + 8) = param_2;
  }
  else if (param_1 == -2) {
    *(float *)((int)this + 0xc) = param_2;
  }
  else if (param_1 == -1) {
    if (param_2 == _DAT_004170c8) {
      *(undefined1 *)((int)this + 0x15) = 0;
    }
    else {
      *(undefined1 *)((int)this + 0x15) = 1;
    }
  }
  return;
}


// ==== FUN_0040617b @ 0040617b ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __fastcall FUN_0040617b(undefined4 *param_1)

{
  undefined4 uVar1;
  
  FUN_004060ac(param_1);
  uVar1 = _DAT_004170cc;
  *param_1 = &PTR_FUN_00418304;
  param_1[10] = uVar1;
  param_1[0xb] = uVar1;
  param_1[6] = 0;
  *(undefined2 *)(param_1 + 0x36) = 0;
  param_1[0xc] = 0;
  *(undefined2 *)((int)param_1 + 0xe2) = 0;
  *(undefined2 *)((int)param_1 + 0xda) = 1;
  param_1[0x15] = 0x3f800000;
  *(undefined2 *)(param_1 + 0x37) = 2;
  *(undefined2 *)((int)param_1 + 0xde) = 2;
  param_1[0x16] = uVar1;
  *(undefined2 *)(param_1 + 0x38) = 3;
  param_1[0x17] = 0;
  param_1[0x20] = 0x3f800000;
  param_1[0x21] = 0x3f800000;
  param_1[0x22] = 0;
  param_1[0x2b] = uVar1;
  param_1[0x2c] = 0x3f800000;
  param_1[0x2d] = 0;
  return param_1;
}


// ==== FUN_00406210 @ 00406210 ====

void __fastcall FUN_00406210(int param_1)

{
  FUN_004060c9(param_1);
  *(undefined1 *)(param_1 + 0x20) = 0;
  *(undefined4 *)(param_1 + 0x1c) = 0;
  return;
}


// ==== FUN_00406222 @ 00406222 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00406222(int param_1)

{
  float fVar1;
  uint *puVar2;
  uint uVar3;
  uint uVar4;
  int iVar5;
  longlong lVar6;
  longlong lVar7;
  longlong lVar8;
  
  FUN_004060db(param_1);
  if (*(char *)(param_1 + 0x15) != '\0') {
    uVar4 = *(uint *)(param_1 + 0x18);
    uVar3 = uVar4 >> 0x18;
    if (*(char *)(param_1 + 0x20) != '\0') {
      fVar1 = *(float *)(param_1 + 4) * _DAT_00418260 + *(float *)(param_1 + 0x24);
      *(float *)(param_1 + 0x24) = fVar1;
      if (_DAT_004170c4 < fVar1) {
        *(undefined4 *)(param_1 + 0x18) = *(undefined4 *)(param_1 + 0x1c);
        *(undefined4 *)(param_1 + 0x24) = 0;
      }
      lVar6 = FUN_00404224();
      uVar3 = (uint)lVar6;
      lVar6 = FUN_00404224();
      lVar7 = FUN_00404224();
      lVar8 = FUN_00404224();
      uVar4 = (((uint)lVar6 | uVar3 << 8) << 8 | (uint)lVar7) << 8 | (uint)lVar8;
    }
    puVar2 = (uint *)(param_1 + 0x40);
    iVar5 = 4;
    do {
      *puVar2 = uVar4;
      puVar2 = puVar2 + 0xb;
      iVar5 = iVar5 + -1;
    } while (iVar5 != 0);
    if (uVar3 != 0) {
      if ((int)uVar3 < 0xff) {
        FUN_004019e6(2);
      }
      FUN_004018ec(0);
      FUN_00401bd0();
      (**(code **)(*DAT_004747ac + 0x124))
                (DAT_004747ac,4,0,4,2,param_1 + 0xd8,0x65,param_1 + 0x28,0x2c);
    }
  }
  return;
}


// ==== FUN_00406438 @ 00406438 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406438(float *param_1)

{
  float fVar1;
  uint uVar2;
  int iVar3;
  float *pfVar4;
  int iVar5;
  float local_8;
  
  iVar5 = 0;
  pfVar4 = param_1;
  do {
    param_1 = (float *)0x2;
    local_8 = 1.0;
    iVar3 = 0x10;
    do {
      uVar2 = FUN_00404258();
      if ((int)uVar2 < 0x3000) {
        uVar2 = FUN_00404258();
        if ((int)uVar2 < 0x4000) {
          param_1 = (float *)((int)param_1 + -1);
          if ((int)param_1 < 0) {
            param_1 = (float *)0x0;
          }
        }
        else {
          param_1 = (float *)((int)param_1 + 1);
          if (3 < (int)param_1) {
            param_1 = (float *)0x3;
          }
        }
      }
      fVar1 = (float)(int)param_1 * _DAT_00418318 + _DAT_00418260;
      if (iVar5 == 0) {
        *pfVar4 = -1.0;
        pfVar4[1] = local_8;
        pfVar4[0xb] = fVar1 - _DAT_004170c4;
        pfVar4[0xc] = local_8;
      }
      if (iVar5 == 1) {
        *pfVar4 = 1.0;
        pfVar4[1] = local_8;
        pfVar4[0xb] = 1.0 - fVar1;
        pfVar4[0xc] = local_8;
      }
      if (iVar5 == 2) {
        *pfVar4 = local_8;
        pfVar4[1] = 1.0;
        pfVar4[0xb] = local_8;
        pfVar4[0xc] = _DAT_004170c4 - fVar1 * _DAT_00418314;
      }
      if (iVar5 == 3) {
        *pfVar4 = local_8;
        pfVar4[0xb] = local_8;
        pfVar4[1] = -1.0;
        pfVar4[0xc] = fVar1 * _DAT_00418314 - _DAT_004170c4;
      }
      local_8 = local_8 - _DAT_00418310;
      pfVar4 = pfVar4 + 0x16;
      iVar3 = iVar3 + -1;
    } while (iVar3 != 0);
    iVar5 = iVar5 + 1;
  } while (iVar5 < 4);
  return;
}


// ==== FUN_00406539 @ 00406539 ====

undefined4 * __fastcall FUN_00406539(undefined4 *param_1)

{
  short sVar1;
  int *piVar2;
  void *this;
  uint *puVar3;
  undefined4 uVar4;
  short *psVar5;
  short sVar6;
  short sVar7;
  int iVar8;
  int iVar9;
  float10 fVar10;
  int local_c;
  int local_8;
  
  FUN_004060ac(param_1);
  *param_1 = &PTR_FUN_0041831c;
  piVar2 = (int *)FUN_004042e0(0x1000);
  FUN_00416036(0xc,0x20,0x20,piVar2);
  this = (void *)FUN_004042e0(0x18);
  if (this == (void *)0x0) {
    puVar3 = (uint *)0x0;
  }
  else {
    puVar3 = FUN_00403dd3(this,(uint)piVar2,0x20,0x20,'\0','\0');
  }
  param_1[6] = puVar3;
  FUN_004042eb((int)piVar2);
  uVar4 = FUN_004042e0(0x1600);
  param_1[7] = uVar4;
  uVar4 = FUN_004042e0(0x1600);
  param_1[8] = uVar4;
  uVar4 = FUN_004042e0(0x1600);
  iVar9 = param_1[7];
  param_1[9] = uVar4;
  iVar8 = 4;
  do {
    local_c = 0x10;
    do {
      fVar10 = FUN_00401341();
      *(float *)(iVar9 + 0x1c) = (float)fVar10;
      *(undefined4 *)(iVar9 + 0x18) = 0;
      *(undefined4 *)(iVar9 + 0x20) = 0xc0a00000;
      *(undefined4 *)(iVar9 + 8) = 0;
      fVar10 = FUN_00401341();
      *(float *)(iVar9 + 0x48) = (float)fVar10;
      *(undefined4 *)(iVar9 + 0x44) = 0;
      *(undefined4 *)(iVar9 + 0x4c) = 0x3f800000;
      *(undefined4 *)(iVar9 + 0x34) = 0;
      iVar9 = iVar9 + 0x58;
      local_c = local_c + -1;
    } while (local_c != 0);
    iVar8 = iVar8 + -1;
  } while (iVar8 != 0);
  FUN_0040424e(4000);
  FUN_00406438((float *)param_1[8]);
  FUN_0040424e(5000);
  FUN_00406438((float *)param_1[9]);
  psVar5 = (short *)FUN_004042e0(0x2d0);
  local_c = 0;
  param_1[10] = psVar5;
  do {
    local_8 = 0;
    sVar1 = (short)local_c * 0x10;
    do {
      sVar6 = ((short)local_8 + sVar1) * 2;
      *psVar5 = sVar6;
      sVar7 = ((short)local_8 + 1 + sVar1) * 2;
      psVar5[1] = sVar6 + 1;
      psVar5[2] = sVar7;
      psVar5[3] = sVar7;
      psVar5[4] = sVar6 + 3;
      psVar5[5] = sVar6 + 1;
      psVar5 = psVar5 + 6;
      local_8 = local_8 + 1;
    } while (local_8 < 0xf);
    local_c = local_c + 1;
  } while (local_c < 4);
  return param_1;
}


// ==== FUN_0040668c @ 0040668c ====

void __fastcall FUN_0040668c(int param_1)

{
  FUN_004060c9(param_1);
  *(undefined1 *)(param_1 + 0x34) = 0;
  *(undefined4 *)(param_1 + 0x30) = 0;
  *(undefined4 *)(param_1 + 0x2c) = 0;
  return;
}


// ==== FUN_004067c0 @ 004067c0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004067c0(void)

{
  byte bVar1;
  ushort uVar2;
  int iVar3;
  undefined4 *puVar4;
  undefined4 uVar5;
  uint uVar6;
  int iVar7;
  byte *pbVar8;
  ushort *puVar9;
  ushort *puVar10;
  int local_14;
  int local_c;
  
  DAT_004788f8 = DAT_00418328;
  puVar9 = &DAT_0041832a;
  iVar3 = FUN_004042e0((uint)DAT_00418328 << 6);
  local_14 = 0;
  DAT_00478918 = iVar3;
  if (DAT_004788f8 != 0) {
    local_c = 0;
    do {
      if (local_c != 0) {
        FUN_004042b5(iVar3,local_c + -0x40 + DAT_00478918,0x40);
      }
      *(undefined1 *)(iVar3 + 8) = 0;
      *(undefined4 *)(iVar3 + 0xc) = 0;
      *(undefined4 *)(iVar3 + 0x10) = 0;
      puVar4 = (undefined4 *)FUN_004042e0(0x200);
      *(undefined4 **)(iVar3 + 0x18) = puVar4;
      FUN_00404282(puVar4,0,0x200);
      uVar5 = FUN_004042e0(0x200);
      *(undefined4 *)(iVar3 + 0x1c) = uVar5;
      uVar5 = FUN_004042e0(0x800);
      *(undefined4 *)(iVar3 + 0x20) = uVar5;
      puVar4 = (undefined4 *)FUN_004042e0(0x800);
      *(undefined4 **)(iVar3 + 4) = puVar4;
      FUN_00404282(puVar4,0,0x200);
      uVar2 = *puVar9;
      puVar10 = puVar9 + 1;
      if ((uVar2 & 1) != 0) {
        *(ushort *)(iVar3 + 10) = *puVar10;
        puVar10 = puVar9 + 2;
      }
      if ((uVar2 & 2) != 0) {
        *(undefined4 *)(iVar3 + 0x14) = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
      }
      if ((uVar2 & 4) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x24) = uVar5;
      }
      if ((uVar2 & 8) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x28) = uVar5;
      }
      if ((uVar2 & 0x10) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x2c) = uVar5;
      }
      if ((uVar2 & 0x20) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x30) = uVar5;
      }
      if ((uVar2 & 0x40) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x34) = uVar5;
      }
      if ((uVar2 & 0x80) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x38) = uVar5;
      }
      if ((uVar2 & 0x100) != 0) {
        uVar5 = *(undefined4 *)puVar10;
        puVar10 = puVar10 + 2;
        *(undefined4 *)(iVar3 + 0x3c) = uVar5;
      }
      bVar1 = (byte)*puVar10;
      puVar9 = (ushort *)((int)puVar10 + 1);
      if ((uVar2 & 0x200) == 0) {
        FUN_004042b5(*(int *)(iVar3 + 0x18),*(int *)(local_c + -0x28 + DAT_00478918),0x200);
      }
      else {
        FUN_004042b5(*(int *)(iVar3 + 0x18),(int)puVar9,(uint)bVar1);
        puVar9 = (ushort *)((int)puVar9 + (uint)bVar1);
      }
      if ((uVar2 & 0x400) == 0) {
        FUN_004042b5(*(int *)(iVar3 + 0x1c),*(int *)(local_c + -0x24 + DAT_00478918),0x200);
        FUN_004042b5(*(int *)(iVar3 + 0x20),*(int *)(local_c + -0x20 + DAT_00478918),0x200);
      }
      else {
        uVar6 = (uint)bVar1;
        FUN_004042b5(*(int *)(iVar3 + 0x1c),(int)puVar9,uVar6);
        puVar9 = (ushort *)((int)puVar9 + uVar6);
        iVar7 = 0;
        if (uVar6 != 0) {
          do {
            *(float *)(*(int *)(iVar3 + 0x20) + iVar7 * 4) =
                 (float)(*(byte *)(*(int *)(iVar3 + 0x1c) + iVar7) >> 2) * _DAT_00418dd8;
            pbVar8 = (byte *)(*(int *)(iVar3 + 0x1c) + iVar7);
            *pbVar8 = *pbVar8 & 3;
            iVar7 = iVar7 + 1;
          } while (iVar7 < (int)uVar6);
        }
      }
      iVar7 = 0;
      if (bVar1 != 0) {
        do {
          if ((*(byte *)(*(int *)(iVar3 + 0x1c) + iVar7) & 1) != 0) {
            pbVar8 = (byte *)(*(int *)(iVar3 + 0x18) + iVar7);
            *pbVar8 = *pbVar8 | 0x80;
          }
          iVar7 = iVar7 + 1;
        } while (iVar7 < (int)(uint)bVar1);
      }
      local_c = local_c + 0x40;
      iVar3 = iVar3 + 0x40;
      local_14 = local_14 + 1;
    } while (local_14 < (int)(uint)DAT_004788f8);
  }
  return;
}


// ==== FUN_004069ed @ 004069ed ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined4 * __fastcall FUN_004069ed(undefined4 *param_1)

{
  float fVar1;
  float *pfVar2;
  undefined1 local_b8 [28];
  float local_9c [37];
  int local_8;
  
  FUN_004060ac(param_1);
  *param_1 = &PTR_FUN_00418de0;
  FUN_00406a7d();
  (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,*(undefined4 *)(DAT_0047891c + 0xc));
  local_8 = 0;
  pfVar2 = local_9c;
  do {
    fVar1 = (float)local_8;
    local_8 = local_8 + 1;
    fVar1 = fVar1 * _DAT_00418ddc;
    pfVar2[1] = fVar1;
    *pfVar2 = fVar1;
    pfVar2[-5] = fVar1;
    pfVar2[-6] = fVar1;
    pfVar2[-7] = fVar1;
    pfVar2 = pfVar2 + 0xb;
  } while (local_8 < 4);
  FUN_00401bd0();
  FUN_00401c04(local_b8);
  (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,0);
  DAT_00478920 = param_1;
  return param_1;
}


// ==== FUN_00406a7d @ 00406a7d ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406a7d(void)

{
  undefined4 uVar1;
  int iVar2;
  char *pcVar3;
  uint *puVar4;
  uint *puVar5;
  void *this;
  int iVar6;
  
  _DAT_00478928 = _DAT_00478928 + 1;
  if (DAT_00478924 == '\0') {
    FUN_004067c0();
    DAT_004788f4 = FUN_004042e0(0x16000);
    DAT_004788f0 = FUN_004042e0(0x1800);
    DAT_00478924 = '\x01';
    DAT_004788fc = FUN_004042e0(0x800);
    DAT_004788d0 = FUN_004042e0(0x100);
    uVar1 = _DAT_00418df0;
    *(undefined1 *)(DAT_004788d0 + 0x20) = 0xff;
    *(undefined4 *)(DAT_004788fc + 0x3f8) = uVar1;
    *(undefined4 *)(DAT_004788fc + 0x3fc) = _DAT_00418dec;
    *(undefined4 *)(DAT_004788fc + 0x7f8) = _DAT_00418df0;
    *(undefined4 *)(DAT_004788fc + 0x7fc) = _DAT_00418dec;
    iVar2 = 0;
    do {
      *(char *)(DAT_004788d0 + 0x61 + iVar2) = (char)iVar2;
      iVar2 = iVar2 + 1;
    } while (iVar2 < 0x1a);
    iVar2 = 0;
    do {
      *(char *)(DAT_004788d0 + 0x41 + iVar2) = (char)iVar2 + '(';
      iVar2 = iVar2 + 1;
    } while (iVar2 < 0x1a);
    iVar2 = 0;
    do {
      *(char *)(DAT_004788d0 + 0x30 + iVar2) = (char)iVar2 + '\x1a';
      iVar2 = iVar2 + 1;
    } while (iVar2 < 10);
    iVar2 = 0;
    *(undefined1 *)(DAT_004788d0 + 0x2c) = 0x24;
    *(undefined1 *)(DAT_004788d0 + 0x21) = 0x25;
    *(undefined1 *)(DAT_004788d0 + 0x3f) = 0x26;
    *(undefined1 *)(DAT_004788d0 + 0x27) = 0x27;
    *(undefined1 *)(DAT_004788d0 + 0x28) = 0x42;
    *(undefined1 *)(DAT_004788d0 + 0x29) = 0x43;
    *(undefined1 *)(DAT_004788d0 + 0x5b) = 0x44;
    *(undefined1 *)(DAT_004788d0 + 0x5d) = 0x45;
    *(undefined1 *)(DAT_004788d0 + 0x3a) = 0x46;
    *(undefined1 *)(DAT_004788d0 + 0x2e) = 0x47;
    do {
      pcVar3 = (char *)(DAT_004788d0 + iVar2);
      iVar2 = iVar2 + 1;
      pcVar3[0x80] = *pcVar3 + -0x80;
    } while (iVar2 < 0x80);
    puVar4 = (uint *)FUN_004042e0(0x400000);
    FUN_00416036(0xb,0x800,0x200,(int *)puVar4);
    iVar6 = 0x100000;
    iVar2 = 0x100000;
    puVar5 = puVar4;
    do {
      *puVar5 = *puVar5 & 0xff;
      puVar5 = puVar5 + 1;
      iVar2 = iVar2 + -1;
    } while (iVar2 != 0);
    FUN_00406c98((int)puVar4,0,0x28,0);
    FUN_00406c98((int)puVar4,0x80,0xa8,0x100);
    FUN_00406c98((int)puVar4,0x28,0x48,0x80);
    FUN_00406c98((int)puVar4,0xa8,200,0x180);
    puVar5 = puVar4;
    do {
      *puVar5 = *puVar5 << 0x18 | 0xffffff;
      puVar5 = puVar5 + 1;
      iVar6 = iVar6 + -1;
    } while (iVar6 != 0);
    this = (void *)FUN_004042e0(0x18);
    if (this == (void *)0x0) {
      DAT_0047891c = (uint *)0x0;
    }
    else {
      DAT_0047891c = FUN_00403dd3(this,(uint)puVar4,0x800,0x200,'\0','\0');
    }
    FUN_004042eb((int)puVar4);
  }
  return;
}


// ==== FUN_00406c98 @ 00406c98 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406c98(int param_1,int param_2,int param_3,int param_4)

{
  bool bVar1;
  float fVar2;
  int iVar3;
  int *piVar4;
  int iVar5;
  int local_c;
  int local_8;
  
  fVar2 = _DAT_00418df4;
  local_c = 0;
  do {
    iVar5 = local_c;
    local_8 = local_c;
    if (param_3 <= param_2) {
      return;
    }
    for (; iVar3 = local_8, iVar5 < 0x800; iVar5 = iVar5 + 1) {
      bVar1 = false;
      if (param_4 < param_4 + 0x80) {
        iVar3 = (param_4 + 0x80) - param_4;
        piVar4 = (int *)(param_1 + (param_4 * 0x800 + iVar5) * 4);
        do {
          if (*piVar4 != 0) {
            bVar1 = true;
            local_8 = iVar5;
          }
          piVar4 = piVar4 + 0x800;
          iVar3 = iVar3 + -1;
        } while (iVar3 != 0);
        if (bVar1) {
          iVar5 = 0x800;
        }
      }
    }
    for (; iVar3 < 0x800; iVar3 = iVar3 + 1) {
      bVar1 = false;
      if (param_4 < param_4 + 0x80) {
        iVar5 = (param_4 + 0x80) - param_4;
        piVar4 = (int *)(param_1 + (param_4 * 0x800 + iVar3) * 4);
        do {
          if (*piVar4 != 0) {
            bVar1 = true;
          }
          piVar4 = piVar4 + 0x800;
          iVar5 = iVar5 + -1;
        } while (iVar5 != 0);
        if (!bVar1) goto LAB_00406d44;
      }
      else {
LAB_00406d44:
        local_c = iVar3 + 1;
        iVar3 = 0x800;
      }
    }
    *(float *)(DAT_004788fc + param_2 * 8) = (float)(local_8 + -1) * fVar2;
    param_2 = param_2 + 1;
    *(float *)(DAT_004788fc + -4 + param_2 * 8) = (float)local_c * fVar2;
  } while( true );
}


// ==== FUN_00406d90 @ 00406d90 ====

void __fastcall FUN_00406d90(int param_1)

{
  int iVar1;
  undefined4 *puVar2;
  
  FUN_004060c9(param_1);
  *(undefined4 *)(param_1 + 0x18) = 0;
  puVar2 = &DAT_004788d4;
  for (iVar1 = 7; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar2 = 0;
    puVar2 = puVar2 + 1;
  }
  puVar2 = &DAT_00478900;
  for (iVar1 = 6; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar2 = 0;
    puVar2 = puVar2 + 1;
  }
  return;
}


// ==== FUN_00406db7 @ 00406db7 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406db7(float param_1,float param_2,float param_3,char *param_4,uint param_5,
                 undefined4 param_6,float param_7,float param_8,float param_9,float param_10)

{
  uint *puVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  byte *pbVar8;
  float *pfVar9;
  int iVar10;
  uint uVar11;
  uint uVar12;
  uint *puVar13;
  longlong lVar14;
  uint local_2c;
  undefined4 uStack_28;
  int local_24;
  uint local_20;
  int local_1c;
  int local_18;
  float local_14;
  float local_10;
  int local_c;
  float local_8;
  
  fVar7 = param_1;
  if (_DAT_004170c4 < param_9) {
    param_9 = 1.0;
  }
  local_8 = param_9;
  if (((uint)param_10 & 0x1004) != 0) {
    if (((((uint)param_10 & 4) == 0) || (*(char *)((int)param_1 + 8) == '\0')) &&
       ((((uint)param_10 & 0x1000) == 0 || (*(char *)((int)param_1 + 8) != '\0')))) {
      local_8 = 1.0;
    }
    else {
      param_7 = (_DAT_00418200 - param_9) * param_7;
    }
  }
  if (((uint)param_10 & 0x2008) != 0) {
    if (((((uint)param_10 & 8) == 0) || (*(char *)((int)param_1 + 8) == '\0')) &&
       ((((uint)param_10 & 0x2000) == 0 || (*(char *)((int)param_1 + 8) != '\0')))) {
      local_8 = 1.0;
    }
    else {
      param_7 = param_7 * param_9;
    }
  }
  local_18 = FUN_004040d5(param_4);
  lVar14 = FUN_004071d3(param_1,param_7);
  local_10 = (float)(int)lVar14;
  uVar11 = (uint)param_10 & 0x10;
  local_14 = param_7 * _DAT_00418e20;
  fVar2 = local_14 * *(float *)((int)param_1 + 0x30) * _DAT_00418e1c;
  param_10 = local_10 * *(float *)((int)param_1 + 0x2c) * _DAT_00418e1c;
  uVar12 = param_5;
  if (uVar11 != 0) {
    uStack_28 = 0;
    local_2c = param_5 >> 0x18;
    lVar14 = FUN_00404224();
    uVar12 = (int)lVar14 << 0x18 | param_5 & 0xffffff;
  }
  param_5 = 0;
  local_24 = DAT_004788f0;
  local_c = 0;
  uVar11 = 0;
  if (0 < local_18) {
    puVar13 = (uint *)(DAT_004788f4 + 0x18);
    param_1 = fVar2;
    do {
      local_1c = local_c * 4;
      fVar2 = *(float *)(local_1c + *(int *)((int)fVar7 + 0x20));
      if ((param_4[local_c] & 0x7fU) == 10) {
        param_10 = local_10 * *(float *)((int)fVar7 + 0x2c) * _DAT_00418e1c;
        param_1 = param_7 * *(float *)((int)fVar7 + 0x30) * _DAT_00418e18 + param_1;
      }
      else {
        local_20 = (uint)*(byte *)((uint)(byte)param_4[local_c] + DAT_004788d0);
        puVar1 = (uint *)(DAT_004788fc + local_20 * 8);
        fVar4 = (*(float *)(DAT_004788fc + 4 + local_20 * 8) -
                *(float *)(DAT_004788fc + local_20 * 8)) * fVar2 * param_7 * _DAT_00418e14;
        fVar5 = fVar4 * _DAT_00418e1c;
        puVar13[-6] = (uint)fVar5;
        fVar3 = fVar2 * local_14 * _DAT_00418e1c;
        puVar13[-5] = (uint)fVar3;
        uVar11 = *puVar1;
        *puVar13 = uVar12;
        fVar6 = fVar4 * _DAT_004170d4;
        puVar13[1] = uVar11;
        puVar13[5] = (uint)fVar6;
        puVar13[6] = (uint)fVar3;
        uVar11 = puVar1[1];
        puVar13[0xb] = uVar12;
        fVar3 = fVar2 * local_14 * _DAT_004170d4;
        puVar13[0xc] = uVar11;
        puVar13[0x10] = (uint)fVar6;
        puVar13[0x11] = (uint)fVar3;
        uVar11 = puVar1[1];
        puVar13[0x16] = uVar12;
        puVar13[0x1b] = (uint)fVar5;
        puVar13[0x17] = uVar11;
        puVar13[0x1c] = (uint)fVar3;
        puVar13[0x22] = *puVar1;
        puVar13[0x21] = uVar12;
        param_9 = fVar4 * *(float *)((int)fVar7 + 0x2c);
        pbVar8 = (byte *)(*(int *)((int)fVar7 + 0x1c) + local_c);
        if ((*pbVar8 & 2) == 0) {
          if ((0 < local_c) && ((pbVar8[-1] & 2) != 0)) {
            pfVar9 = (float *)(puVar13 + -6);
            iVar10 = 4;
            fVar2 = fVar2 * param_7 * _DAT_00418e04;
            do {
              *pfVar9 = fVar2 + *pfVar9;
              pfVar9 = pfVar9 + 0xb;
              iVar10 = iVar10 + -1;
            } while (iVar10 != 0);
            param_9 = fVar2 + param_9;
          }
        }
        else {
          if ((0 < local_c) && ((pbVar8[-1] & 2) == 0)) {
            pfVar9 = (float *)(puVar13 + -6);
            iVar10 = 4;
            fVar3 = fVar2 * param_7 * _DAT_00418e10;
            do {
              *pfVar9 = *pfVar9 - fVar3;
              pfVar9 = pfVar9 + 0xb;
              iVar10 = iVar10 + -1;
            } while (iVar10 != 0);
            param_9 = param_9 - fVar2 * param_7 * _DAT_00418e0c;
          }
          fVar2 = fVar2 * param_7 * _DAT_00418e08;
          puVar13[-6] = (uint)(fVar2 + (float)puVar13[-6]);
          puVar13[5] = (uint)(fVar2 + (float)puVar13[5]);
        }
        FUN_0040727a((float *)(puVar13 + -6),
                     (1.0 - local_8) * *(float *)(*(int *)((int)fVar7 + 4) + local_1c));
        fVar2 = param_9 * _DAT_004170d4;
        iVar10 = 4;
        pfVar9 = (float *)(puVar13 + -6);
        do {
          *pfVar9 = fVar2 + *pfVar9 + param_10;
          iVar10 = iVar10 + -1;
          pfVar9[1] = param_1 + pfVar9[1];
          pfVar9 = pfVar9 + 0xb;
        } while (iVar10 != 0);
        FUN_0040727a((float *)(puVar13 + -6),param_8);
        pfVar9 = (float *)(puVar13 + -5);
        iVar10 = 4;
        do {
          pfVar9[-1] = param_2 + pfVar9[-1];
          *pfVar9 = param_3 + *pfVar9;
          pfVar9[1] = 1.0;
          uVar11 = _DAT_00418ddc;
          pfVar9 = pfVar9 + 0xb;
          iVar10 = iVar10 + -1;
        } while (iVar10 != 0);
        if (((byte)local_20 & 0x7f) < 0x28) {
          puVar13[0xd] = 0;
          puVar13[2] = 0;
          uVar11 = _DAT_00418e00;
        }
        else {
          puVar13[0xd] = _DAT_00418ddc;
          puVar13[2] = uVar11;
          uVar11 = _DAT_00418264;
        }
        pfVar9 = (float *)(puVar13 + 2);
        puVar13[0x23] = uVar11;
        puVar13[0x18] = uVar11;
        if ((*(byte *)(local_c + *(int *)((int)fVar7 + 0x1c)) & 1) != 0) {
          iVar10 = 4;
          do {
            *pfVar9 = *pfVar9 + _DAT_004170d4;
            pfVar9 = pfVar9 + 0xb;
            iVar10 = iVar10 + -1;
          } while (iVar10 != 0);
        }
        fVar2 = _DAT_004170c4;
        iVar10 = 4;
        pfVar9 = (float *)(puVar13 + -6);
        do {
          *pfVar9 = *pfVar9 * _DAT_00418dfc - fVar2;
          iVar10 = iVar10 + -1;
          pfVar9[1] = fVar2 - pfVar9[1] * _DAT_00418df8;
          pfVar9 = pfVar9 + 0xb;
        } while (iVar10 != 0);
        uVar11 = (uint)uStack_28 >> 8;
        local_2c = 0x2020100;
        uStack_28 = CONCAT31((uint3)uVar11 & 0xffff00,3);
        FUN_00409ca6(&local_24,(short)(param_5 << 2),(int)&local_2c);
        param_10 = param_9 + param_10;
        puVar13 = puVar13 + 0x2c;
        param_5 = param_5 + 1;
      }
      local_c = local_c + 1;
      uVar11 = param_5;
    } while (local_c < local_18);
  }
  (**(code **)(*DAT_004747ac + 0x124))
            (DAT_004747ac,4,0,uVar11 << 2,uVar11 * 2,DAT_004788f0,0x65,DAT_004788f4,0x2c);
  return;
}


// ==== FUN_004071d3 @ 004071d3 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

longlong FUN_004071d3(float param_1,float param_2)

{
  byte bVar1;
  char *pcVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  byte bVar6;
  int iVar7;
  uint uVar8;
  int iVar9;
  longlong lVar10;
  
  fVar5 = param_1;
  pcVar2 = *(char **)((int)param_1 + 0x18);
  param_1 = 0.0;
  iVar7 = FUN_004040d5(pcVar2);
  iVar9 = 0;
  if (0 < iVar7) {
    fVar3 = 0.0;
    do {
      bVar1 = pcVar2[iVar9];
      bVar6 = bVar1 & 0x7f;
      if (bVar6 == 0x20) {
        fVar4 = param_2 * _DAT_00418e24;
LAB_00407255:
        fVar3 = fVar4 + fVar3;
      }
      else {
        if (bVar6 != 10) {
          uVar8 = (uint)*(byte *)((uint)bVar1 + DAT_004788d0);
          fVar4 = (*(float *)(DAT_004788fc + 4 + uVar8 * 8) - *(float *)(DAT_004788fc + uVar8 * 8))
                  * *(float *)(*(int *)((int)fVar5 + 0x20) + iVar9 * 4) * param_2 * _DAT_00418e14;
          goto LAB_00407255;
        }
        if (param_1 < fVar3) {
          param_1 = fVar3;
        }
        fVar3 = 0.0;
      }
      iVar9 = iVar9 + 1;
    } while (iVar9 < iVar7);
  }
  lVar10 = FUN_00404224();
  return lVar10;
}


// ==== FUN_0040727a @ 0040727a ====

void FUN_0040727a(float *param_1,float param_2)

{
  float fVar1;
  float fVar2;
  int iVar3;
  float10 fVar4;
  float10 fVar5;
  
  iVar3 = 4;
  do {
    fVar1 = *param_1;
    fVar2 = param_1[1];
    fVar4 = FUN_004041ee(param_2);
    fVar5 = FUN_004041dd(param_2);
    *param_1 = (float)((float10)(float)(fVar4 * (float10)fVar1) - fVar5 * (float10)fVar2);
    fVar4 = FUN_004041ee(param_2);
    fVar5 = FUN_004041dd(param_2);
    iVar3 = iVar3 + -1;
    param_1[1] = (float)(fVar5 * (float10)fVar1 + (float10)(float)(fVar4 * (float10)fVar2));
    param_1 = param_1 + 0xb;
  } while (iVar3 != 0);
  return;
}


// ==== FUN_004072e9 @ 004072e9 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_004072e9(int param_1)

{
  float *pfVar1;
  float fVar2;
  float fVar3;
  undefined4 uVar4;
  float fVar5;
  ushort uVar6;
  float *pfVar7;
  int iVar8;
  float fVar9;
  float10 fVar10;
  longlong lVar11;
  int iStack00000004;
  undefined4 local_144 [16];
  undefined1 local_104 [12];
  undefined4 local_f8;
  undefined4 local_f4;
  undefined4 local_f0;
  undefined4 local_cc;
  undefined4 local_c8;
  undefined4 local_c4;
  undefined4 local_a0;
  undefined4 local_9c;
  undefined4 local_98;
  undefined4 local_74;
  undefined4 local_70;
  undefined4 local_6c;
  float afStack_48 [7];
  float local_2c [7];
  int local_10;
  float local_c;
  float local_8;
  
  local_10 = param_1;
  FUN_004060db(param_1);
  FUN_00401bd0();
  FUN_004019e6(2);
  (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,*(undefined4 *)(DAT_0047891c + 0xc));
  iStack00000004 = 0;
  fVar9 = DAT_00478918;
  if (DAT_004788f8 != 0) {
    do {
      if ((*(char *)((int)fVar9 + 8) != '\0') || (*(float *)((int)fVar9 + 0xc) != _DAT_004170c8)) {
        if ((*(byte *)((int)fVar9 + 0xb) & 0x40) != 0) {
          uVar6 = FUN_004030ef();
          if (uVar6 < 0x400) {
            local_2c[1] = 0.007;
            local_2c[2] = 0.013;
            local_2c[0] = _DAT_00418260;
            local_2c[3] = _DAT_00418260;
            local_2c[5] = 0.015;
            iVar8 = 0;
            local_2c[4] = (float)_DAT_00418e4c;
            local_2c[6] = (float)_DAT_00418e4c;
            do {
              pfVar1 = (float *)((int)local_2c + iVar8);
              pfVar7 = (float *)((int)&DAT_004788d4 + iVar8);
              iVar8 = iVar8 + 4;
              *pfVar7 = *pfVar1 * *(float *)(param_1 + 4) * _DAT_00418230 + *pfVar7;
            } while (iVar8 < 0x1c);
            (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,0);
            FUN_00402362(0,2,3);
            FUN_00402362(0,1,2);
            FUN_00402362(0,5,3);
            FUN_00402362(0,4,2);
            FUN_0040190f(local_144);
            pfVar7 = (float *)FUN_00401558(local_104,0x3f800000,_DAT_00418314,0x3f800000);
            FUN_004022bb(local_144,pfVar7);
            FUN_00402317(3,local_144);
            local_f8 = _DAT_004170cc;
            local_f4 = _DAT_004170cc;
            local_8 = 0.0;
            local_f0 = 0x3f800000;
            local_cc = 0x3f800000;
            local_c8 = _DAT_004170cc;
            local_c4 = 0x3f800000;
            local_a0 = 0x3f800000;
            local_9c = 0x3f800000;
            local_98 = 0x3f800000;
            local_74 = _DAT_004170cc;
            local_70 = 0x3f800000;
            local_6c = 0x3f800000;
            do {
              fVar5 = local_8;
              fVar3 = 0.0;
              if (2 < (int)local_8) {
                fVar3 = _DAT_00418e48;
              }
              fVar2 = (float)(int)local_8;
              local_c = ((float)(int)local_8 * _DAT_00418e44 * _DAT_00418e40 + fVar3) -
                        _DAT_00418e3c;
              afStack_48[(int)local_8] = local_c;
              if ((0 < (int)local_8) && ((int)local_8 < 6)) {
                pfVar7 = (float *)(&DAT_004788d4 + (int)local_8);
                local_8 = fVar2;
                fVar10 = FUN_004041dd(fVar2 + *pfVar7);
                afStack_48[(int)fVar5] = (float)(fVar10 * (float10)_DAT_00418e38 + (float10)local_c)
                ;
              }
              local_8 = (float)((int)fVar5 + 1);
            } while ((int)local_8 < 7);
            iVar8 = 0;
            do {
              local_f8 = *(undefined4 *)((int)afStack_48 + iVar8);
              local_8 = 1.79366e-43;
              local_cc = *(undefined4 *)((int)afStack_48 + iVar8 + 4);
              local_a0 = local_cc;
              local_74 = local_f8;
              if (*(float *)((int)&DAT_00478900 + iVar8) <= _DAT_004170c8) {
                fVar3 = 0.0;
              }
              else {
                lVar11 = FUN_00404224();
                local_8 = (float)lVar11;
                fVar3 = *(float *)((int)&DAT_00478900 + iVar8) -
                        *(float *)(local_10 + 4) * _DAT_00418e2c;
              }
              *(float *)((int)&DAT_00478900 + iVar8) = fVar3;
              lVar11 = FUN_00404224();
              FUN_00402349(0x3c,(int)lVar11 << 0x18 | *(uint *)((int)&DAT_0041a9bc + iVar8));
              (**(code **)(*DAT_004747ac + 0x120))(DAT_004747ac,6,2,&local_f8,0x2c);
              iVar8 = iVar8 + 4;
            } while (iVar8 < 0x18);
            FUN_00402362(0,2,2);
            FUN_00402362(0,1,4);
            FUN_00402362(0,5,2);
            FUN_00402362(0,4,4);
            (**(code **)(*DAT_004747ac + 0xf4))(DAT_004747ac,0,*(undefined4 *)(DAT_0047891c + 0xc));
            FUN_00401bd0();
            param_1 = local_10;
          }
        }
        fVar3 = *(float *)((int)fVar9 + 0xc);
        if (_DAT_004170c4 < fVar3) {
          fVar3 = 1.0;
        }
        FUN_00406db7(fVar9,*(float *)((int)fVar9 + 0x24),*(float *)((int)fVar9 + 0x28),
                     *(char **)((int)fVar9 + 0x18),*(uint *)((int)fVar9 + 0x38),0x3f800000,
                     *(float *)((int)fVar9 + 0x34),*(float *)((int)fVar9 + 0x14),fVar3,
                     (float)(uint)*(ushort *)((int)fVar9 + 10));
        if (*(char *)((int)fVar9 + 8) == '\0') {
          if ((*(ushort *)((int)fVar9 + 10) & 0x3010) == 0) {
            *(undefined4 *)((int)fVar9 + 0xc) = 0;
          }
          fVar3 = *(float *)((int)fVar9 + 0xc) -
                  *(float *)(param_1 + 4) * _DAT_00418260 * *(float *)((int)fVar9 + 0x3c);
          *(float *)((int)fVar9 + 0xc) = fVar3;
          if (fVar3 < _DAT_004170c8) {
            uVar4 = 0;
            goto LAB_004076a4;
          }
        }
        else {
          local_c = *(float *)(param_1 + 4) * _DAT_00418260 * *(float *)((int)fVar9 + 0x3c) +
                    *(float *)((int)fVar9 + 0x10);
          *(float *)((int)fVar9 + 0x10) = local_c;
          *(float *)((int)fVar9 + 0xc) = local_c;
          if (_DAT_004170c4 < local_c) {
            uVar4 = 0x3f800000;
LAB_004076a4:
            *(undefined4 *)((int)fVar9 + 0xc) = uVar4;
          }
        }
      }
      fVar9 = (float)((int)fVar9 + 0x40);
      iStack00000004 = iStack00000004 + 1;
    } while (iStack00000004 < (int)(uint)DAT_004788f8);
  }
  return;
}


// ==== FUN_004076c4 @ 004076c4 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_004076c4(void *this,char param_1,float param_2)

{
  int iVar1;
  int iVar2;
  int iVar3;
  float10 fVar4;
  longlong lVar5;
  
  FUN_00406127(this,param_1,param_2);
  if (param_1 == '\0') {
    lVar5 = FUN_00404224();
    iVar2 = (int)lVar5 * 0x40 + DAT_00478918;
    iVar3 = 0;
    *(undefined4 *)(iVar2 + 0xc) = 0;
    *(undefined1 *)(iVar2 + 8) = 1;
    do {
      if ((*(ushort *)(iVar2 + 10) & 0x300c) == 0) {
        iVar1 = *(int *)(iVar2 + 4);
        fVar4 = (float10)0;
      }
      else {
        fVar4 = FUN_00401341();
        iVar1 = *(int *)(iVar2 + 4);
        fVar4 = fVar4 * (float10)_DAT_00418e50 - (float10)_DAT_004182cc;
      }
      *(float *)(iVar1 + iVar3) = (float)fVar4;
      iVar3 = iVar3 + 4;
    } while (iVar3 < 0x800);
  }
  else if (param_1 == '\x01') {
    lVar5 = FUN_00404224();
    *(undefined1 *)((int)lVar5 * 0x40 + 8 + DAT_00478918) = 0;
  }
  else if (param_1 == '\x02') {
    lVar5 = FUN_00404224();
    (&DAT_00478900)[(int)lVar5] = 0x3f800000;
  }
  return;
}


// ==== FUN_00407767 @ 00407767 ====

void __thiscall FUN_00407767(void *this,undefined4 param_1,undefined4 *param_2)

{
  int iVar1;
  undefined4 *puVar2;
  undefined4 *puVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  
  puVar2 = param_2;
  param_2 = (undefined4 *)0x0;
  puVar3 = puVar2;
  puVar4 = this;
  for (iVar1 = 0x14; iVar1 != 0; iVar1 = iVar1 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar4 = puVar4 + 1;
  }
  *(undefined2 *)puVar4 = *(undefined2 *)puVar3;
  *(undefined1 *)((int)puVar4 + 2) = *(undefined1 *)((int)puVar3 + 2);
  puVar2 = (undefined4 *)((int)puVar2 + 0x53);
  if (*(char *)((int)this + 1) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x53);
    do {
      puVar4 = puVar2;
      puVar5 = puVar3;
      for (iVar1 = 8; iVar1 != 0; iVar1 = iVar1 + -1) {
        *puVar5 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar5 = puVar5 + 1;
      }
      *(undefined2 *)puVar5 = *(undefined2 *)puVar4;
      puVar2 = (undefined4 *)((int)puVar2 + 0x22);
      param_2 = (undefined4 *)((int)param_2 + 1);
      puVar3 = (undefined4 *)((int)puVar3 + 0x22);
    } while ((int)param_2 < (int)(uint)*(byte *)((int)this + 1));
  }
  param_2 = (undefined4 *)0x0;
  if (*(char *)((int)this + 6) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x8d3);
    do {
      puVar4 = puVar2;
      puVar5 = puVar3;
      for (iVar1 = 8; iVar1 != 0; iVar1 = iVar1 + -1) {
        *puVar5 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar5 = puVar5 + 1;
      }
      puVar2 = puVar2 + 8;
      param_2 = (undefined4 *)((int)param_2 + 1);
      puVar3 = puVar3 + 8;
    } while ((int)param_2 < (int)(uint)*(byte *)((int)this + 6));
  }
  param_2 = (undefined4 *)0x0;
  if (*(char *)((int)this + 7) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x10d3);
    do {
      puVar4 = puVar2;
      puVar5 = puVar3;
      for (iVar1 = 8; iVar1 != 0; iVar1 = iVar1 + -1) {
        *puVar5 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar5 = puVar5 + 1;
      }
      *(undefined2 *)puVar5 = *(undefined2 *)puVar4;
      puVar2 = (undefined4 *)((int)puVar2 + 0x22);
      param_2 = (undefined4 *)((int)param_2 + 1);
      puVar3 = (undefined4 *)((int)puVar3 + 0x22);
    } while ((int)param_2 < (int)(uint)*(byte *)((int)this + 7));
  }
  param_2 = (undefined4 *)0x0;
  if (*(char *)((int)this + 8) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x1953);
    do {
      puVar4 = puVar2;
      puVar5 = puVar3;
      for (iVar1 = 7; iVar1 != 0; iVar1 = iVar1 + -1) {
        *puVar5 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar5 = puVar5 + 1;
      }
      *(undefined2 *)puVar5 = *(undefined2 *)puVar4;
      puVar2 = (undefined4 *)((int)puVar2 + 0x1e);
      param_2 = (undefined4 *)((int)param_2 + 1);
      puVar3 = (undefined4 *)((int)puVar3 + 0x1e);
    } while ((int)param_2 < (int)(uint)*(byte *)((int)this + 8));
  }
  param_2 = (undefined4 *)0x0;
  if (*(char *)((int)this + 9) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x20d3);
    do {
      puVar4 = puVar2;
      puVar5 = puVar3;
      for (iVar1 = 7; iVar1 != 0; iVar1 = iVar1 + -1) {
        *puVar5 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar5 = puVar5 + 1;
      }
      *(undefined2 *)puVar5 = *(undefined2 *)puVar4;
      puVar2 = (undefined4 *)((int)puVar2 + 0x1e);
      param_2 = (undefined4 *)((int)param_2 + 1);
      puVar3 = (undefined4 *)((int)puVar3 + 0x1e);
    } while ((int)param_2 < (int)(uint)*(byte *)((int)this + 9));
  }
  iVar1 = 0;
  if (*(char *)((int)this + 0xe) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x2853);
    do {
      *puVar3 = *puVar2;
      puVar3[1] = puVar2[1];
      puVar3[2] = puVar2[2];
      puVar3[3] = puVar2[3];
      puVar2 = puVar2 + 4;
      iVar1 = iVar1 + 1;
      puVar3 = puVar3 + 4;
    } while (iVar1 < (int)(uint)*(byte *)((int)this + 0xe));
  }
  param_2 = (undefined4 *)0x0;
  if (*(char *)((int)this + 0xf) != '\0') {
    puVar3 = (undefined4 *)((int)this + 0x2c53);
    do {
      puVar4 = puVar2;
      puVar5 = puVar3;
      for (iVar1 = 5; iVar1 != 0; iVar1 = iVar1 + -1) {
        *puVar5 = *puVar4;
        puVar4 = puVar4 + 1;
        puVar5 = puVar5 + 1;
      }
      *(undefined2 *)puVar5 = *(undefined2 *)puVar4;
      *(undefined1 *)((int)puVar5 + 2) = *(undefined1 *)((int)puVar4 + 2);
      puVar2 = (undefined4 *)((int)puVar2 + 0x17);
      param_2 = (undefined4 *)((int)param_2 + 1);
      puVar3 = (undefined4 *)((int)puVar3 + 0x17);
    } while ((int)param_2 < (int)(uint)*(byte *)((int)this + 0xf));
  }
  return;
}


// ==== FUN_004078b6 @ 004078b6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004078b6(float *param_1)

{
  bool bVar1;
  float *pfVar2;
  float10 fVar3;
  undefined4 uStack0000000c;
  int in_stack_00000014;
  float in_stack_00000018;
  float in_stack_00000020;
  int in_stack_00000024;
  char in_stack_00000028;
  undefined4 uVar4;
  float fVar5;
  undefined1 local_20 [12];
  undefined1 local_14 [12];
  int local_8;
  
  uStack0000000c = 0;
  FUN_0040424e(in_stack_00000024);
  if (0 < in_stack_00000014) {
    in_stack_00000024 = in_stack_00000014;
    do {
      bVar1 = _DAT_00418e58 < *(float *)(*(int *)(local_8 + 0x28) + 0x10);
      while (bVar1) {
        fVar3 = FUN_00401341();
        fVar5 = (float)((fVar3 * (float10)in_stack_00000020 + fVar3 * (float10)in_stack_00000020) -
                       (float10)in_stack_00000020);
        uVar4 = 0;
        fVar3 = FUN_00401341();
        pfVar2 = (float *)FUN_00401558(local_14,(float)((fVar3 * (float10)in_stack_00000018 +
                                                        fVar3 * (float10)in_stack_00000018) -
                                                       (float10)in_stack_00000018),uVar4,fVar5);
        pfVar2 = FUN_0040523d(local_20,(float *)&stack0x00000008,pfVar2);
        *param_1 = *pfVar2;
        param_1[1] = pfVar2[1];
        param_1[2] = pfVar2[2];
        fVar3 = FUN_0040e8d2((void *)(local_8 + 0x4c),*param_1,param_1[2]);
        if (in_stack_00000028 != '\0') {
          param_1[1] = (float)fVar3;
        }
        bVar1 = fVar3 + (float10)_DAT_00418e54 <
                (float10)*(float *)(*(int *)(local_8 + 0x28) + 0x10);
      }
      param_1 = param_1 + 3;
      in_stack_00000024 = in_stack_00000024 + -1;
    } while (in_stack_00000024 != 0);
  }
  return;
}


// ==== FUN_00407983 @ 00407983 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00407983(void *this,char param_1)

{
  byte *pbVar1;
  int iVar2;
  undefined4 *puVar3;
  void *pvVar4;
  undefined4 *puVar5;
  float *pfVar6;
  undefined4 uVar7;
  float fVar8;
  int iVar9;
  uint uVar10;
  char cVar11;
  longlong lVar12;
  undefined4 uVar13;
  undefined4 uVar14;
  uint *puVar15;
  float fVar16;
  byte bVar17;
  float fVar18;
  int *piVar19;
  undefined1 local_38 [12];
  undefined1 local_2c [12];
  undefined1 local_20 [12];
  int local_14;
  int *local_10;
  uint *local_c;
  int *local_8;
  
  local_c = (uint *)FUN_004042e0(0x10000);
  FUN_00416036(*(byte *)(*(int *)((int)this + 0x28) + 0x3f),0x80,0x80,(int *)local_c);
  iVar9 = 0x4000;
  puVar15 = local_c;
  do {
    *puVar15 = *puVar15 & 0xff;
    puVar15 = puVar15 + 1;
    iVar9 = iVar9 + -1;
  } while (iVar9 != 0);
  local_8 = (int *)FUN_004042e0(0x40000);
  local_10 = (int *)FUN_004042e0(0x40000);
  FUN_00416036(*(byte *)(*(int *)((int)this + 0x28) + 0x4d),0x100,0x100,local_8);
  FUN_00416036(*(byte *)(*(int *)((int)this + 0x28) + 0x4e),0x100,0x100,local_10);
  uVar10 = *(uint *)(*(int *)((int)this + 0x28) + 0x4f);
  cVar11 = (uVar10 & 0x100) != 0;
  bVar17 = ~(byte)(uVar10 >> 0x18) & 1;
  puVar3 = FUN_00408c48((void *)(*(int *)((int)this + 0x28) + 0x40),local_20);
  pfVar6 = *(float **)(*(int *)((int)this + 0x3c) + 0xb4);
  FUN_0040e058((void *)((int)this + 0x4c),param_1,*(void **)((int)this + 0x2c),
               (uint)*(byte *)(*(int *)((int)this + 0x28) + 0x4c),(int)local_c,(int)local_8,
               (uint)local_10,*pfVar6,pfVar6[1],pfVar6[2],*puVar3,puVar3[1],puVar3[2],bVar17,cVar11)
  ;
  DAT_0047895c = 0xffa4ff9d;
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x51) & 0x80) != 0) {
    DAT_0047895c = 0xffff0032;
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x4f) & 8) != 0) {
    uVar10 = (uint)*(byte *)(*(int *)((int)this + 0x28) + 9);
    pvVar4 = (void *)FUN_004042e0(uVar10 * 0x28);
    if (pvVar4 == (void *)0x0) {
      pvVar4 = (void *)0x0;
    }
    else {
      _vector_constructor_iterator_(pvVar4,0x28,uVar10,FUN_00408d5f);
    }
    *(void **)((int)this + 0xb8) = pvVar4;
    local_c = (uint *)0x0;
    if (*(char *)(*(int *)((int)this + 0x28) + 9) != '\0') {
      local_8 = (int *)0x0;
      _param_1 = (float *)0x0;
      do {
        iVar9 = *(int *)((int)this + 0x24) + (int)_param_1;
        fVar18 = 1.0;
        cVar11 = '\x01';
        local_10 = (int *)(uint)*(byte *)(iVar9 + 0x20eb);
        fVar16 = (float)*(byte *)(iVar9 + 0x20ec) * _DAT_00418298;
        puVar3 = (undefined4 *)(float)(int)local_10;
        puVar15 = (uint *)0x3f800000;
        puVar5 = FUN_00408c48((void *)(iVar9 + 0x20df),local_20);
        uVar7 = *puVar5;
        uVar13 = puVar5[1];
        uVar14 = puVar5[2];
        pfVar6 = FUN_00408c48((void *)((int)_param_1 + 0x20d3 + *(int *)((int)this + 0x24)),local_2c
                             );
        piVar19 = local_8;
        FUN_00409d45((void *)((int)local_8 + *(int *)((int)this + 0xb8)),
                     *(void **)((int)this + 0x2c),(void *)((int)this + 0x4c),*pfVar6,pfVar6[1],
                     pfVar6[2],uVar7,uVar13,uVar14,puVar15,puVar3,(int)fVar16,cVar11,fVar18);
        uVar7 = *(undefined4 *)((int)_param_1 + 0x20ed + *(int *)((int)this + 0x24));
        puVar3 = (undefined4 *)FUN_00401558(local_38,uVar7,uVar7,uVar7);
        iVar9 = *(int *)((int)piVar19 + *(int *)((int)this + 0xb8) + 0x14);
        *(undefined4 *)(iVar9 + 0x94) = *puVar3;
        *(undefined4 *)(iVar9 + 0x98) = puVar3[1];
        *(undefined4 *)(iVar9 + 0x9c) = puVar3[2];
        iVar9 = *(int *)((int)local_8 + *(int *)((int)this + 0xb8) + 0x14);
        iVar2 = *(int *)((int)local_8 + *(int *)((int)this + 0xb8) + 0x10);
        *(undefined4 *)(iVar2 + 0x94) = *(undefined4 *)(iVar9 + 0x94);
        local_c = (uint *)((int)local_c + 1);
        _param_1 = (float *)((int)_param_1 + 0x1e);
        *(undefined4 *)(iVar2 + 0x98) = *(undefined4 *)(iVar9 + 0x98);
        *(undefined4 *)(iVar2 + 0x9c) = *(undefined4 *)(iVar9 + 0x9c);
        local_8 = local_8 + 10;
      } while ((int)local_c < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 9));
    }
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x4f) & 4) != 0) {
    uVar7 = FUN_004042e0((uint)*(byte *)(*(int *)((int)this + 0x28) + 6) * 0x14);
    local_8 = (int *)0x0;
    *(undefined4 *)((int)this + 300) = uVar7;
    if (*(char *)(*(int *)((int)this + 0x28) + 6) != '\0') {
      local_c = (uint *)0x0;
      _param_1 = (float *)0x0;
      do {
        puVar15 = (uint *)0x10;
        iVar9 = (int)_param_1 + *(int *)((int)this + 0x24);
        lVar12 = FUN_00404224();
        fVar8 = (float)lVar12;
        fVar16 = *(float *)(iVar9 + 0x8eb);
        fVar18 = *(float *)(iVar9 + 0x8e7);
        pvVar4 = *(void **)(iVar9 + 0x8e3);
        puVar3 = FUN_00408c48((void *)(iVar9 + 0x8d3),local_38);
        FUN_0040c1b2((void *)((int)local_c + *(int *)((int)this + 300)),
                     *(undefined4 *)((int)this + 0x2c),(void *)((int)this + 0x4c),*puVar3,
                     (float)puVar3[1],puVar3[2],pvVar4,fVar18,fVar16,fVar8,puVar15);
        local_8 = (int *)((int)local_8 + 1);
        _param_1 = (float *)((int)_param_1 + 0x20);
        local_c = local_c + 5;
      } while ((int)local_8 < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 6));
    }
  }
  _param_1 = (float *)FUN_004042e0(0xc000);
  if (_param_1 == (float *)0x0) {
    _param_1 = (float *)0x0;
  }
  else {
    _vector_constructor_iterator_(_param_1,0xc,0x1000,FUN_00401555);
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x4f) & 0x10) != 0) {
    uVar7 = FUN_004042e0((uint)*(byte *)(*(int *)((int)this + 0x28) + 7) * 0x30);
    *(undefined4 *)((int)this + 0x124) = uVar7;
    local_c = (uint *)0x0;
    if (*(char *)(*(int *)((int)this + 0x28) + 7) != '\0') {
      local_10 = (int *)0x0;
      local_8 = (int *)0x0;
      do {
        local_14 = *(int *)((int)this + 0x24) + (int)local_8;
        FUN_00408c48((void *)((int)local_8 + *(int *)((int)this + 0x24) + 0x10e1),local_38);
        FUN_00408c48((void *)(local_14 + 0x10d5),local_2c);
        FUN_004078b6(_param_1);
        iVar9 = *(int *)((int)this + 0x24);
        FUN_0040b0b0((void *)((int)local_10 + *(int *)((int)this + 0x124)),
                     *(void **)((int)this + 0x2c),0,(void *)((int)this + 0x4c),
                     (uint)*(ushort *)((int)local_8 + iVar9 + 0x10d3),2,_param_1,
                     *(float *)((int)local_8 + iVar9 + 0x10ed) * _DAT_00418e60,
                     *(undefined4 *)((int)local_8 + iVar9 + 0x10f1),
                     (*(uint *)(*(int *)((int)this + 0x28) + 0x4f) & 0x40000) != 0);
        local_c = (uint *)((int)local_c + 1);
        local_8 = (int *)((int)local_8 + 0x22);
        local_10 = local_10 + 0xc;
      } while ((int)local_c < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 7));
    }
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x4f) & 0x20) != 0) {
    uVar7 = FUN_004042e0((uint)*(byte *)(*(int *)((int)this + 0x28) + 8) * 0x30);
    *(undefined4 *)((int)this + 0x128) = uVar7;
    local_8 = (int *)0x0;
    if (*(char *)(*(int *)((int)this + 0x28) + 8) != '\0') {
      local_10 = (int *)0x0;
      local_c = (uint *)0x0;
      do {
        local_14 = *(int *)((int)this + 0x24) + (int)local_c;
        FUN_00408c48((void *)((int)local_c + *(int *)((int)this + 0x24) + 0x1961),local_38);
        FUN_00408c48((void *)(local_14 + 0x1955),local_2c);
        FUN_004078b6(_param_1);
        FUN_0040b0b0((void *)(*(int *)((int)this + 0x128) + (int)local_10),
                     *(void **)((int)this + 0x2c),1,(void *)((int)this + 0x4c),
                     (uint)*(ushort *)((int)local_c + *(int *)((int)this + 0x24) + 0x1953),2,
                     _param_1,*(float *)((int)local_c + *(int *)((int)this + 0x24) + 0x196d) *
                              _DAT_00418230,_DAT_00418e5c,'\0');
        local_8 = (int *)((int)local_8 + 1);
        local_c = (uint *)((int)local_c + 0x1e);
        local_10 = local_10 + 0xc;
      } while ((int)local_8 < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 8));
    }
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x50) & 0x80) != 0) {
    uVar7 = FUN_004042e0((uint)*(byte *)(*(int *)((int)this + 0x28) + 0xe) << 5);
    *(undefined4 *)((int)this + 0xbc) = uVar7;
    local_8 = (int *)0x0;
    if (*(char *)(*(int *)((int)this + 0x28) + 0xe) != '\0') {
      local_c = (uint *)0x0;
      local_10 = (int *)0x0;
      do {
        piVar19 = *(int **)((int)local_10 + *(int *)((int)this + 0x24) + 0x285f);
        pfVar6 = FUN_00408c48((void *)((int)local_10 + *(int *)((int)this + 0x24) + 0x2853),local_38
                             );
        FUN_0040c721((void *)(*(int *)((int)this + 0xbc) + (int)local_c),
                     *(void **)((int)this + 0x2c),(void *)((int)this + 0x4c),*pfVar6,pfVar6[1],
                     pfVar6[2],piVar19);
        local_8 = (int *)((int)local_8 + 1);
        local_10 = local_10 + 4;
        local_c = local_c + 8;
      } while ((int)local_8 < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 0xe));
    }
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x4f) & 2) != 0) {
    uVar7 = FUN_004042e0((uint)*(byte *)(*(int *)((int)this + 0x28) + 1) * 0x24);
    *(undefined4 *)((int)this + 0x130) = uVar7;
    local_8 = (int *)0x0;
    if (*(char *)(*(int *)((int)this + 0x28) + 1) != '\0') {
      local_10 = (int *)0x0;
      local_c = (uint *)0x0;
      do {
        local_14 = *(int *)((int)this + 0x24) + (int)local_c;
        FUN_00408c48((void *)((int)local_c + *(int *)((int)this + 0x24) + 0x61),local_38);
        FUN_00408c48((void *)(local_14 + 0x55),local_2c);
        FUN_004078b6(_param_1);
        iVar9 = *(int *)((int)this + 0x24);
        FUN_0040bc63((void *)((int)local_10 + *(int *)((int)this + 0x130)),
                     *(void **)((int)this + 0x2c),*(float *)((int)local_c + iVar9 + 0x6d),
                     *(float *)((int)local_c + iVar9 + 0x71),
                     (uint)*(ushort *)((int)local_c + iVar9 + 0x53),(undefined4 *)0x10,8,_param_1);
        local_8 = (int *)((int)local_8 + 1);
        local_c = (uint *)((int)local_c + 0x22);
        local_10 = local_10 + 9;
      } while ((int)local_8 < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 1));
    }
  }
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x50) & 0x40) != 0) {
    uVar7 = FUN_004042e0((uint)*(byte *)(*(int *)((int)this + 0x28) + 0xf) * 0x1c);
    *(undefined4 *)((int)this + 0x138) = uVar7;
    local_8 = (int *)0x0;
    if (*(char *)(*(int *)((int)this + 0x28) + 0xf) != '\0') {
      local_10 = (int *)0x0;
      local_c = (uint *)0x0;
      do {
        FUN_00408c48((void *)((int)local_c + *(int *)((int)this + 0x24) + 0x2c53),local_38);
        FUN_0040f803((void *)((int)local_10 + *(int *)((int)this + 0x138)),
                     *(void **)((int)this + 0x2c),
                     (uint)*(ushort *)((int)local_c + *(int *)((int)this + 0x24) + 0x2c5f));
        local_8 = (int *)((int)local_8 + 1);
        local_c = (uint *)((int)local_c + 0x17);
        local_10 = local_10 + 7;
      } while ((int)local_8 < (int)(uint)*(byte *)(*(int *)((int)this + 0x28) + 0xf));
    }
  }
  FUN_004042eb((int)_param_1);
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x51) & 1) == 0) {
    pbVar1 = (byte *)(*(int *)((int)this + 0x6c) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  return;
}


// ==== FUN_004080e0 @ 004080e0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_004080e0(int param_1)

{
  void *pvVar1;
  undefined4 *puVar2;
  undefined1 *puVar3;
  undefined4 uVar4;
  uint uVar5;
  undefined4 *puVar6;
  float10 fVar7;
  float fVar8;
  undefined1 local_24 [12];
  undefined1 local_18 [12];
  int local_c;
  int local_8;
  
  pvVar1 = (void *)FUN_004042e0(0xcc);
  if (pvVar1 == (void *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_00404bb8(pvVar1,(undefined4 *)0x80,0);
  }
  *(undefined4 **)(param_1 + 0x40) = puVar2;
  pvVar1 = (void *)FUN_004042e0(0x2c);
  if (pvVar1 == (void *)0x0) {
    puVar3 = (undefined1 *)0x0;
  }
  else {
    puVar3 = FUN_00401c67(pvVar1,*(int *)(param_1 + 0x38),0,0x891);
  }
  FUN_00404da7(*(void **)(param_1 + 0x40),(int)puVar3);
  uVar4 = FUN_004042e0(0x200);
  *(undefined4 *)(param_1 + 0x48) = uVar4;
  local_c = 0;
  *(undefined1 *)(*(int *)(param_1 + 0x40) + 0xac) = 0;
  local_8 = 0;
  do {
    puVar2 = *(undefined4 **)(*(int *)(param_1 + 0x3c) + 0xb4);
    puVar6 = (undefined4 *)(*(int *)(*(int *)(param_1 + 0x40) + 0xb4) + local_8);
    *puVar6 = *puVar2;
    puVar6[1] = puVar2[1];
    puVar6[2] = puVar2[2];
    *(undefined4 *)(*(int *)(*(int *)(param_1 + 0x40) + 0xb4) + 4 + local_8) = 0;
    uVar5 = FUN_00404258();
    uVar4 = 0;
    if ((int)uVar5 < 0x4000) {
      fVar7 = FUN_00401341();
      fVar8 = (float)(fVar7 * (float10)_DAT_00418300 - (float10)_DAT_00418300);
      fVar7 = FUN_00401341();
      puVar3 = local_18;
      fVar7 = fVar7 * (float10)_DAT_00418e64 - (float10)_DAT_00418e24;
    }
    else {
      fVar7 = FUN_00401341();
      fVar8 = (float)(fVar7 * (float10)_DAT_00418300 - (float10)_DAT_00418300);
      fVar7 = FUN_00401341();
      puVar3 = local_24;
      fVar7 = fVar7 * (float10)_DAT_00418e5c - (float10)_DAT_00418e54;
    }
    puVar6 = (undefined4 *)FUN_00401558(puVar3,(float)fVar7,fVar8,uVar4);
    uVar4 = _DAT_00418200;
    puVar2 = (undefined4 *)(*(int *)(*(int *)(param_1 + 0x40) + 0xb4) + 0xc + local_8);
    *puVar2 = *puVar6;
    puVar2[1] = puVar6[1];
    puVar2[2] = puVar6[2];
    *(undefined4 *)(*(int *)(*(int *)(param_1 + 0x40) + 0xb4) + 0x18 + local_8) = uVar4;
    fVar7 = FUN_00401341();
    local_8 = local_8 + 0x20;
    *(float *)(local_c + *(int *)(param_1 + 0x48)) =
         (float)((fVar7 + fVar7) * (float10)_DAT_00418220);
    local_c = local_c + 4;
  } while (local_8 < 0x1000);
  return;
}


// ==== FUN_00408251 @ 00408251 ====

undefined4 * __fastcall FUN_00408251(undefined4 *param_1)

{
  FUN_004060ac(param_1);
  FUN_00408d4b((int)(param_1 + 0x13));
  FUN_00408292((int)(param_1 + 0x30));
  *param_1 = &PTR_FUN_00418e68;
  return param_1;
}


// ==== FUN_00408276 @ 00408276 ====

undefined4 * __thiscall FUN_00408276(void *this,byte param_1)

{
  FUN_00408d6b(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_00408292 @ 00408292 ====

int __fastcall FUN_00408292(int param_1)

{
  FUN_00401555(param_1 + 0xc);
  FUN_00401555(param_1 + 0x20);
  return param_1;
}


// ==== FUN_004082a9 @ 004082a9 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_004082a9(void *this,uint param_1)

{
  byte *pbVar1;
  char cVar2;
  int iVar3;
  int *piVar4;
  undefined4 *puVar5;
  void *pvVar6;
  uint *puVar7;
  undefined4 uVar8;
  undefined1 *puVar9;
  float *pfVar10;
  uint uVar11;
  uint uVar12;
  void *this_00;
  undefined4 *puVar13;
  int iVar14;
  char cVar15;
  longlong lVar16;
  float fVar17;
  float fVar18;
  float fVar19;
  float fVar20;
  float fVar21;
  float fVar22;
  float fVar23;
  undefined4 uVar24;
  float fVar25;
  undefined4 uVar26;
  float fVar27;
  undefined1 local_3c [12];
  undefined1 local_30 [12];
  undefined1 local_24 [12];
  undefined4 local_18;
  undefined4 local_14;
  undefined4 local_10;
  float local_c;
  int local_8;
  
  iVar3 = FUN_004042e0(0x3213);
  if (iVar3 == 0) {
    iVar3 = 0;
  }
  else {
    iVar3 = FUN_00408c6c(iVar3);
  }
  *(int *)((int)this + 0x24) = iVar3;
  *(int *)((int)this + 0x28) = iVar3;
  local_18 = 0x3020100;
  local_14 = 0x6000504;
  local_10 = CONCAT31(local_10._1_3_,7);
  piVar4 = FUN_00401c3b(*(char *)((int)&local_18 + (param_1 & 0xff)) + 0x1c,(int *)0x0);
  FUN_00407767(*(void **)((int)this + 0x24),param_1,piVar4);
  if ((char)param_1 == '\x01') {
    *(undefined4 *)(*(int *)((int)this + 0x28) + 0x36) = 0x43bb8000;
  }
  puVar5 = (undefined4 *)FUN_004042e0(0x18);
  if (puVar5 == (undefined4 *)0x0) {
    iVar3 = 0;
  }
  else {
    iVar3 = FUN_00405ec9(puVar5);
  }
  *(int *)((int)this + 0x2c) = iVar3;
  *(undefined4 *)(iVar3 + 0x14) = 0x1f1f1f1f;
  uVar11 = *(uint *)(*(int *)((int)this + 0x28) + 0x4f);
  if (((uVar11 & 0x40) != 0) && ((uVar11 & 0x80) != 0)) {
    pvVar6 = (void *)FUN_004042e0(0xc);
    if (pvVar6 == (void *)0x0) {
      puVar5 = (undefined4 *)0x0;
    }
    else {
      puVar5 = FUN_00402b16(pvVar6,0x40,0x40,'\0');
    }
    *(undefined4 **)((int)this + 0x30) = puVar5;
  }
  piVar4 = (int *)FUN_004042e0(0x40000);
  FUN_00416036(0xd,0x100,0x100,piVar4);
  pvVar6 = (void *)FUN_004042e0(0x18);
  if (pvVar6 == (void *)0x0) {
    puVar7 = (uint *)0x0;
  }
  else {
    puVar7 = FUN_00403dd3(pvVar6,(uint)piVar4,0x100,0x100,'\0','\0');
  }
  *(uint **)((int)this + 0x34) = puVar7;
  FUN_00416036(0xe,0x100,0x100,piVar4);
  pvVar6 = (void *)FUN_004042e0(0x18);
  if (pvVar6 == (void *)0x0) {
    puVar7 = (uint *)0x0;
  }
  else {
    puVar7 = FUN_00403dd3(pvVar6,(uint)piVar4,0x100,0x100,'\0','\0');
  }
  *(uint **)((int)this + 0x38) = puVar7;
  FUN_004042eb((int)piVar4);
  uVar8 = FUN_004042e0(0x100);
  local_8 = 0;
  *(undefined4 *)((int)this + 0x18) = uVar8;
  do {
    puVar5 = (undefined4 *)FUN_004042e0(0x134);
    if (puVar5 == (undefined4 *)0x0) {
      puVar5 = (undefined4 *)0x0;
    }
    else {
      puVar5 = FUN_004052a5(puVar5);
    }
    iVar3 = local_8 * 4;
    *(undefined4 **)(iVar3 + *(int *)((int)this + 0x18)) = puVar5;
    FUN_00405f0e(*(void **)((int)this + 0x2c),*(int *)(iVar3 + *(int *)((int)this + 0x18)));
    if (local_8 < (int)(uint)**(byte **)((int)this + 0x28)) {
      local_18 = 0x6030100;
      local_14 = 0xc000a07;
      local_10 = CONCAT31(local_10._1_3_,0xe);
      piVar4 = FUN_00401c3b(*(char *)((int)&local_18 + (param_1 & 0xff)) + (char)local_8 + 0x24,
                            (int *)0x0);
      FUN_00405a29(*(void **)(iVar3 + *(int *)((int)this + 0x18)),(int)piVar4);
    }
    local_8 = local_8 + 1;
  } while (local_8 < 0x40);
  FUN_004058a6(**(int **)((int)this + 0x18));
  pvVar6 = (void *)FUN_004042e0(0xe8);
  if (pvVar6 == (void *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    local_c = (float)(uint)*(ushort *)(*(int *)((int)this + 0x28) + 0x2e);
    puVar5 = FUN_00405082(pvVar6,(float)(int)local_c,
                          (float)*(ushort *)(*(int *)((int)this + 0x28) + 0x30));
  }
  *(undefined4 **)((int)this + 0x3c) = puVar5;
  pvVar6 = (void *)FUN_004042e0(0x2c);
  if (pvVar6 == (void *)0x0) {
    puVar9 = (undefined1 *)0x0;
  }
  else {
    puVar9 = FUN_00401c67(pvVar6,*(int *)((int)this + 0x38),0,0x1891);
  }
  FUN_00404da7(*(void **)((int)this + 0x3c),(int)puVar9);
  FUN_00408c48((void *)(*(int *)((int)this + 0x28) + 0x32),&local_18);
  puVar5 = *(undefined4 **)(*(int *)((int)this + 0x3c) + 0xb4);
  *puVar5 = local_18;
  puVar5[1] = local_14;
  puVar5[2] = local_10;
  FUN_00407983(this,(char)param_1);
  if (_DAT_004170c8 < *(float *)(*(int *)((int)this + 0x28) + 0x10)) {
    pvVar6 = (void *)FUN_004042e0(0xcc);
    if (pvVar6 == (void *)0x0) {
      puVar5 = (undefined4 *)0x0;
    }
    else {
      puVar5 = FUN_004042f6(pvVar6,0,0,0);
    }
    *(undefined4 **)((int)this + 0x44) = puVar5;
    iVar3 = 0;
    puVar5[0x25] = *(undefined4 *)((int)this + 0x4c);
    puVar5[0x26] = *(undefined4 *)((int)this + 0x50);
    puVar5[0x27] = *(undefined4 *)((int)this + 0x54);
    if ((*(byte *)(*(int *)((int)this + 0x28) + 0x50) & 0x20) == 0) {
      pfVar10 = (float *)FUN_00401558(local_3c,0x3f800000,0x3f800000,0);
      fVar23 = *pfVar10;
      fVar25 = pfVar10[1];
      fVar27 = pfVar10[2];
      pfVar10 = (float *)FUN_00401558(local_30,_DAT_00418e7c,_DAT_00418e7c,0);
      fVar20 = *pfVar10;
      fVar21 = pfVar10[1];
      fVar22 = pfVar10[2];
      pfVar10 = (float *)FUN_00401558(local_24,_DAT_00418e78,0,_DAT_00418e78);
      fVar17 = *pfVar10;
      fVar18 = pfVar10[1];
      fVar19 = pfVar10[2];
      puVar5 = (undefined4 *)FUN_00401558(&local_18,_DAT_00418230,0,_DAT_00418230);
      FUN_00404875(*(void **)((int)this + 0x44),*puVar5,(float)puVar5[1],puVar5[2],fVar17,fVar18,
                   fVar19,fVar20,fVar21,fVar22,fVar23,fVar25,fVar27,iVar3);
      uVar11 = FUN_004042e0(0x40000);
      iVar3 = 0;
      do {
        uVar12 = (*(uint *)(iVar3 + *(int *)((int)this + 0x70)) >> 1) + 0x40;
        *(uint *)(iVar3 + uVar11) = ((uVar12 | 0xffffff00) << 8 | uVar12) << 8 | uVar12;
        iVar3 = iVar3 + 4;
      } while (iVar3 < 0x40000);
      pvVar6 = (void *)FUN_004042e0(0x2c);
      if (pvVar6 == (void *)0x0) {
        puVar9 = (undefined1 *)0x0;
      }
      else {
        this_00 = (void *)FUN_004042e0(0x18);
        if (this_00 == (void *)0x0) {
          puVar7 = (uint *)0x0;
        }
        else {
          puVar7 = FUN_00403dd3(this_00,uVar11,0x100,0x100,'\0','\0');
        }
        puVar9 = FUN_00401c67(pvVar6,*(int *)((int)this + 0x34),(int)puVar7,0x1019);
      }
      FUN_004045dd(*(void **)((int)this + 0x44),(int)puVar9);
      FUN_004042eb(uVar11);
    }
    else {
      pfVar10 = (float *)FUN_00401558(&local_18,0x3f800000,0x3f800000,0);
      fVar23 = *pfVar10;
      fVar25 = pfVar10[1];
      fVar27 = pfVar10[2];
      pfVar10 = (float *)FUN_00401558(local_24,_DAT_00418e54,_DAT_00418e54,0);
      fVar20 = *pfVar10;
      fVar21 = pfVar10[1];
      fVar22 = pfVar10[2];
      pfVar10 = (float *)FUN_00401558(local_30,_DAT_00418e88,0,_DAT_00418e88);
      fVar17 = *pfVar10;
      fVar18 = pfVar10[1];
      fVar19 = pfVar10[2];
      puVar5 = (undefined4 *)FUN_00401558(local_3c,_DAT_00418e84,0,_DAT_00418e84);
      FUN_00404875(*(void **)((int)this + 0x44),*puVar5,(float)puVar5[1],puVar5[2],fVar17,fVar18,
                   fVar19,fVar20,fVar21,fVar22,fVar23,fVar25,fVar27,iVar3);
      local_8 = 0;
      puVar5 = *(undefined4 **)(*(int *)((int)this + 0x6c) + 0xb0);
      iVar3 = *(int *)((int)this + 100);
      if (0 < iVar3) {
        do {
          iVar14 = 0;
          if (0 < iVar3) {
            do {
              FUN_00401558(&local_18,*puVar5,puVar5[1],puVar5[2]);
              pfVar10 = (float *)FUN_00401558(local_3c,0,puVar5[1],0);
              FUN_00408c11(&local_18,pfVar10);
              lVar16 = FUN_00404224();
              iVar3 = (int)lVar16;
              if (0xff < iVar3) {
                iVar3 = 0xff;
              }
              if (iVar3 < 0x40) {
                iVar3 = 0;
              }
              if ((float)puVar5[1] <= *(float *)(*(int *)((int)this + 0x28) + 0x10)) {
                puVar5[6] = (iVar3 + 1) * -0x1000000 | 0xffffff;
              }
              puVar5 = puVar5 + 0xb;
              iVar14 = iVar14 + 1;
            } while (iVar14 < *(int *)((int)this + 100));
          }
          local_8 = local_8 + 1;
          iVar3 = *(int *)((int)this + 100);
        } while (local_8 < iVar3);
      }
      local_8 = 0x20;
      puVar5 = *(undefined4 **)(*(int *)((int)this + 0x44) + 0xb0);
      do {
        local_c = 4.48416e-44;
        do {
          FUN_00401558(&local_18,*puVar5,puVar5[1],puVar5[2]);
          pfVar10 = (float *)FUN_00401558(local_3c,0,puVar5[1],0);
          FUN_00408c11(&local_18,pfVar10);
          lVar16 = FUN_00404224();
          iVar3 = (int)lVar16;
          if (0xff < iVar3) {
            iVar3 = 0xff;
          }
          puVar5[6] = iVar3 << 0x18 | 0x3f3f3f;
          puVar5 = puVar5 + 0xb;
          local_c = (float)((int)local_c + -1);
        } while (local_c != 0.0);
        local_8 = local_8 + -1;
      } while (local_8 != 0);
      pbVar1 = (byte *)(*(int *)(*(int *)((int)this + 0x6c) + 0xc4) + 0xd);
      *pbVar1 = *pbVar1 | 0x40;
      pvVar6 = (void *)FUN_004042e0(0x2c);
      if (pvVar6 == (void *)0x0) {
        puVar9 = (undefined1 *)0x0;
      }
      else {
        puVar9 = FUN_00401c67(pvVar6,*(int *)((int)this + 0x34),0,0x1011);
      }
      FUN_004045dd(*(void **)((int)this + 0x44),(int)puVar9);
      pvVar6 = (void *)FUN_004042e0(0xd00);
      if (pvVar6 == (void *)0x0) {
        pvVar6 = (void *)0x0;
      }
      else {
        _vector_constructor_iterator_(pvVar6,0x68,0x20,FUN_00408d06);
      }
      *(void **)((int)this + 0x134) = pvVar6;
      local_c = 0.0;
      local_8 = 0;
      do {
        iVar14 = local_8;
        FUN_0040f42f((void *)(local_8 + *(int *)((int)this + 0x134)),*(void **)((int)this + 0x2c),
                     local_c);
        iVar3 = local_8 + 0x68;
        iVar14 = *(int *)(iVar14 + 100 + *(int *)((int)this + 0x134));
        local_c = (float)((int)local_c + 1);
        *(undefined4 *)(iVar14 + 0x94) = *(undefined4 *)((int)this + 0x4c);
        *(undefined4 *)(iVar14 + 0x98) = *(undefined4 *)((int)this + 0x50);
        *(undefined4 *)(iVar14 + 0x9c) = *(undefined4 *)((int)this + 0x54);
        *(float *)(*(int *)(local_8 + 100 + *(int *)((int)this + 0x134)) + 0x8c) =
             *(float *)(*(int *)((int)this + 0x28) + 0x10) + _DAT_004170d4;
        local_8 = iVar3;
      } while (iVar3 < 0xd00);
    }
  }
  FUN_004080e0((int)this);
  FUN_00405f0e(*(void **)((int)this + 0x2c),*(int *)((int)this + 0x40));
  FUN_00405f0e(*(void **)((int)this + 0x2c),*(int *)((int)this + 0x3c));
  iVar3 = *(int *)((int)this + 0x28);
  local_c = (float)(uint)*(ushort *)(iVar3 + 0x20);
  FUN_0040ec28((void *)((int)this + 0x94),*(void **)((int)this + 0x2c),*(int *)(iVar3 + 0x17),
               (float)(int)local_c,*(undefined1 *)(iVar3 + 0x1b),*(uint *)(iVar3 + 0x1c),'\x01',
               ~(byte)(*(uint *)(iVar3 + 0x4f) >> 10) & 1,(*(uint *)(iVar3 + 0x4f) & 0x800) != 0);
  uVar11 = *(uint *)(*(int *)((int)this + 0x28) + 0x4f);
  if (((uVar11 & 0x10000) != 0) && ((uVar11 & 0x400) == 0)) {
    local_c = _DAT_00418200;
    puVar5 = FUN_0040268c(local_3c,(float *)((int)this + 0x4c),&local_c);
    iVar3 = *(int *)((int)this + 0xa8);
    *(undefined4 *)(iVar3 + 0x94) = *puVar5;
    *(undefined4 *)(iVar3 + 0x98) = puVar5[1];
    *(undefined4 *)(iVar3 + 0x9c) = puVar5[2];
    pfVar10 = (float *)(*(int *)((int)this + 0xa8) + 0x98);
    *pfVar10 = *pfVar10 * _DAT_004170d4;
  }
  fVar23 = _DAT_00418200;
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x50) & 2) == 0) {
    pbVar1 = (byte *)(*(int *)((int)this + 0xa8) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  if ((char)param_1 == '\b') {
    pfVar10 = (float *)(*(int *)((int)this + 0xa8) + 0x94);
    *pfVar10 = *pfVar10 * fVar23;
    pfVar10 = (float *)(*(int *)((int)this + 0xa8) + 0x9c);
    *pfVar10 = *pfVar10 * fVar23;
  }
  iVar3 = *(int *)((int)this + 0x28);
  if ((*(byte *)(iVar3 + 0x4f) & 0x40) != 0) {
    if (*(char *)(iVar3 + 0x16) == '\0') {
      fVar23 = 1.0;
    }
    local_8 = *(int *)((int)this + 0x28);
    cVar2 = *(char *)(local_8 + 0x16);
    cVar15 = (*(uint *)(iVar3 + 0x4f) & 0x80000) != 0;
    local_c = (float)(int)((-(uint)(cVar2 != '\0') & 0xfffffff6) + 0x3c);
    iVar3 = *(int *)((int)this + 0x30);
    puVar5 = (undefined4 *)FUN_00401558(local_3c,0x3f800000,fVar23,0x3f800000);
    puVar13 = (undefined4 *)(uint)*(ushort *)(local_8 + 0x14);
    uVar8 = *puVar5;
    uVar24 = puVar5[1];
    uVar26 = puVar5[2];
    pfVar10 = (float *)FUN_00401558(local_30,local_c,(float)((-(uint)(cVar2 != '\0') & 0x80) + 0x80)
                                    ,local_c);
    FUN_0040d1f1((void *)((int)this + 0xc0),*(undefined4 *)((int)this + 0x2c),(int)this + 0x4c,
                 *(char *)(*(int *)((int)this + 0x28) + 0x16),*pfVar10,pfVar10[1],pfVar10[2],puVar13
                 ,uVar8,uVar24,uVar26,iVar3,cVar15);
  }
  puVar5 = (undefined4 *)FUN_004042e0(0x128);
  if (puVar5 == (undefined4 *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    puVar5 = FUN_00405d13(puVar5);
  }
  *(undefined4 **)((int)this + 0xb4) = puVar5;
  puVar13 = *(undefined4 **)(*(int *)((int)this + 0x3c) + 0xb4);
  local_18 = *puVar13;
  local_14 = puVar13[1];
  local_10 = puVar13[2];
  puVar5[0x22] = local_18;
  puVar5[0x23] = local_14;
  puVar5[0x24] = local_10;
  *(undefined4 *)(*(int *)((int)this + 0xb4) + 0x118) = 0x44bb8000;
  *(float *)(*(int *)((int)this + 0xb4) + 0x11c) =
       (float)(int)(0xff - (uint)*(byte *)(*(int *)((int)this + 0x28) + 0x3e)) * _DAT_00418298;
  pfVar10 = (float *)(*(int *)((int)this + 0xb4) + 0x11c);
  *pfVar10 = *pfVar10 * *pfVar10 * *pfVar10;
  if ((*(byte *)(*(int *)((int)this + 0x28) + 0x50) & 1) == 0) {
    FUN_00405f0e(*(void **)((int)this + 0x2c),*(int *)((int)this + 0xb4));
  }
  else {
    *(undefined4 *)(*(int *)((int)this + 0x2c) + 0x14) = 0xffffffff;
  }
  (*(code *)**(undefined4 **)this)();
  *(undefined1 *)((int)this + 0x15) = 1;
  (**(code **)(*(int *)this + 4))(0);
  *(undefined1 *)((int)this + 0x15) = 0;
  return;
}


// ==== FUN_00408c11 @ 00408c11 ====

void __thiscall FUN_00408c11(void *this,float *param_1)

{
  float fVar1;
  float fVar2;
  
  fVar1 = *(float *)((int)this + 8) - param_1[2];
  fVar2 = *(float *)((int)this + 4) - param_1[1];
  FUN_00404213(fVar1 * fVar1 +
               fVar2 * fVar2 + (*(float *)this - *param_1) * (*(float *)this - *param_1));
  return;
}


// ==== FUN_00408c48 @ 00408c48 ====

void * __thiscall FUN_00408c48(void *this,void *param_1)

{
  FUN_00401558(param_1,*(undefined4 *)this,*(undefined4 *)((int)this + 4),
               *(undefined4 *)((int)this + 8));
  return param_1;
}


// ==== FUN_00408c6c @ 00408c6c ====

int __fastcall FUN_00408c6c(int param_1)

{
  FUN_00408d1d(param_1);
  _vector_constructor_iterator_((void *)(param_1 + 0x53),0x22,0x40,FUN_00408d34);
  _vector_constructor_iterator_((void *)(param_1 + 0x8d3),0x20,0x40,FUN_00408d5f);
  _vector_constructor_iterator_((void *)(param_1 + 0x10d3),0x22,0x40,FUN_00408d34);
  _vector_constructor_iterator_((void *)(param_1 + 0x1953),0x1e,0x40,FUN_00408d34);
  _vector_constructor_iterator_((void *)(param_1 + 0x20d3),0x1e,0x40,FUN_00408d4b);
  _vector_constructor_iterator_((void *)(param_1 + 0x2853),0x10,0x40,FUN_00408d5f);
  _vector_constructor_iterator_((void *)(param_1 + 0x2c53),0x17,0x40,FUN_00408d5f);
  return param_1;
}


// ==== FUN_00408d06 @ 00408d06 ====

int __fastcall FUN_00408d06(int param_1)

{
  FUN_0040190f((undefined4 *)(param_1 + 0xc));
  FUN_00401555(param_1 + 0x58);
  return param_1;
}


// ==== FUN_00408d1d @ 00408d1d ====

int __fastcall FUN_00408d1d(int param_1)

{
  FUN_00401555(param_1 + 0x32);
  FUN_00401555(param_1 + 0x40);
  return param_1;
}


// ==== FUN_00408d34 @ 00408d34 ====

int __fastcall FUN_00408d34(int param_1)

{
  FUN_00401555(param_1 + 2);
  FUN_00401555(param_1 + 0xe);
  return param_1;
}


// ==== FUN_00408d4b @ 00408d4b ====

int __fastcall FUN_00408d4b(int param_1)

{
  FUN_00401555(param_1);
  FUN_00401555(param_1 + 0xc);
  return param_1;
}


// ==== FUN_00408d5f @ 00408d5f ====

undefined4 __fastcall FUN_00408d5f(undefined4 param_1)

{
  FUN_00401555(param_1);
  return param_1;
}


// ==== FUN_00408d6b @ 00408d6b ====

void __fastcall FUN_00408d6b(undefined4 *param_1)

{
  *param_1 = &PTR_FUN_00418e68;
  return;
}


// ==== FUN_00408d72 @ 00408d72 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00408d72(int param_1)

{
  FUN_004060c9(param_1);
  *(undefined4 *)(param_1 + 0x13c) = 0;
  *(undefined1 *)(param_1 + 0x20) = 0;
  *(undefined1 *)(param_1 + 0x144) = 0;
  *(undefined1 *)(param_1 + 0x145) = 0;
  *(undefined1 *)(param_1 + 0x14c) = 0;
  *(float *)(param_1 + 0x1c) = (1.0 / *(float *)(param_1 + 0xc)) * _DAT_00418e8c;
  *(undefined4 *)(param_1 + 0x140) = 0;
  *(undefined4 *)(param_1 + 0x148) = 0;
  *(undefined4 *)(param_1 + 0x150) = 0;
  *(undefined4 *)(param_1 + 0x154) = 0;
  *(undefined4 *)(param_1 + 0x158) = 0;
  return;
}


// ==== FUN_00408dd1 @ 00408dd1 ====

void __thiscall FUN_00408dd1(void *this,int param_1)

{
  float *pfVar1;
  float fVar2;
  
  *(float *)(param_1 + 0x98) = -*(float *)(param_1 + 0x98);
  pfVar1 = (float *)(param_1 + 0x8c);
  fVar2 = *(float *)(*(int *)((int)this + 0x28) + 0x10) - *pfVar1;
  *pfVar1 = fVar2 + fVar2 + *pfVar1;
  return;
}


// ==== FUN_00408dfc @ 00408dfc ====

void __fastcall FUN_00408dfc(void *param_1)

{
  int iVar1;
  int iVar2;
  int iVar3;
  undefined4 local_8;
  
  FUN_00408dd1(param_1,*(int *)((int)param_1 + 0xa0));
  FUN_00408dd1(param_1,*(int *)((int)param_1 + 0x6c));
  if (((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 4) != 0) &&
     (iVar1 = 0, *(char *)(*(int *)((int)param_1 + 0x28) + 6) != '\0')) {
    iVar2 = 0;
    do {
      FUN_00408dd1(param_1,*(int *)(*(int *)((int)param_1 + 300) + 0xc + iVar2));
      iVar1 = iVar1 + 1;
      iVar2 = iVar2 + 0x14;
    } while (iVar1 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 6));
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x10) != 0) {
    iVar1 = 0;
    local_8 = 0;
    if (*(char *)(*(int *)((int)param_1 + 0x28) + 7) != '\0') {
      do {
        iVar3 = 0;
        iVar2 = *(int *)((int)param_1 + 0x124) + iVar1;
        if (0 < *(int *)(iVar2 + 0x10)) {
          do {
            FUN_00408dd1(param_1,*(int *)(*(int *)(iVar2 + 0x14) + iVar3 * 4));
            iVar3 = iVar3 + 1;
            iVar2 = *(int *)((int)param_1 + 0x124) + iVar1;
          } while (iVar3 < *(int *)(iVar2 + 0x10));
        }
        local_8 = local_8 + 1;
        iVar1 = iVar1 + 0x30;
      } while (local_8 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 7));
    }
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 0x40) != 0) {
    iVar1 = 0;
    local_8 = 0;
    if (*(char *)(*(int *)((int)param_1 + 0x28) + 0xf) != '\0') {
      do {
        iVar3 = 0;
        iVar2 = *(int *)((int)param_1 + 0x138) + iVar1;
        if (0 < *(int *)(iVar2 + 0xc)) {
          do {
            FUN_00408dd1(param_1,*(int *)(*(int *)(iVar2 + 0x14) + iVar3 * 4));
            iVar3 = iVar3 + 1;
            iVar2 = *(int *)((int)param_1 + 0x138) + iVar1;
          } while (iVar3 < *(int *)(iVar2 + 0xc));
        }
        local_8 = local_8 + 1;
        iVar1 = iVar1 + 0x1c;
      } while (local_8 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 0xf));
    }
  }
  return;
}


// ==== FUN_00408eef @ 00408eef ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_00408eef(void *param_1)

{
  byte *pbVar1;
  uint *puVar2;
  int *piVar3;
  undefined4 uVar4;
  float fVar5;
  ushort uVar6;
  uint uVar7;
  undefined4 *puVar8;
  int *piVar9;
  int iVar10;
  int iVar11;
  int iVar12;
  float10 fVar13;
  longlong lVar14;
  longlong lVar15;
  longlong lVar16;
  float local_10 [2];
  int local_8;
  float local_4;
  
  FUN_004060db((int)param_1);
  if (*(char *)((int)param_1 + 0x15) == '\0') {
    return;
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x40) != 0) {
    uVar6 = FUN_004030ef();
    if (0x19ff < uVar6) {
      *(float *)((int)param_1 + 0x154) =
           *(float *)((int)param_1 + 4) * _DAT_00418ecc + *(float *)((int)param_1 + 0x154);
    }
    if (_DAT_004170c4 < *(float *)((int)param_1 + 0x154)) {
      *(undefined4 *)((int)param_1 + 0x154) = 0x3f800000;
    }
    uVar6 = FUN_004030ef();
    if ((0x16ff < uVar6) && (uVar6 = FUN_004030ef(), uVar6 < 0x1e00)) {
      lVar14 = FUN_00404224();
      *(char *)((int)param_1 + 0x94) = (char)lVar14;
      lVar14 = FUN_00404224();
      lVar15 = FUN_00404224();
      lVar16 = FUN_00404224();
      *(int *)(*(int *)((int)param_1 + 0x28) + 0x22) =
           (((int)lVar14 + 0xff00) * 0x100 + (int)lVar15) * 0x100 + (int)lVar16;
    }
    *(undefined4 *)((int)param_1 + 0x11c) = 0;
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0xc4) + 200);
    *pbVar1 = *pbVar1 | 2;
    uVar6 = FUN_004030ef();
    if (((0x1aff < uVar6) && (uVar6 = FUN_004030ef(), uVar6 < 0x1e00)) ||
       (uVar6 = FUN_004030ef(), 0x1fff < uVar6)) {
      pbVar1 = (byte *)(*(int *)((int)param_1 + 0xc4) + 200);
      *pbVar1 = *pbVar1 & 0xfd;
      fVar5 = _DAT_00418260;
      if (*(char *)(*(int *)((int)param_1 + 0x28) + 0x16) != '\0') {
        fVar5 = _DAT_00418ebc;
      }
      fVar5 = fVar5 * *(float *)((int)param_1 + 4) + *(float *)((int)param_1 + 0x158);
      *(float *)((int)param_1 + 0x158) = fVar5;
      if (_DAT_004170c4 < fVar5) {
        *(undefined4 *)((int)param_1 + 0x158) = 0x3f800000;
      }
      lVar14 = FUN_00404224();
      *(int *)((int)param_1 + 0x11c) = (int)lVar14;
    }
  }
  if (*(char *)((int)param_1 + 0x145) != '\0') {
    lVar14 = FUN_00404224();
    lVar15 = FUN_00404224();
    lVar16 = FUN_00404224();
    *(int *)(*(int *)((int)param_1 + 0x28) + 0x22) =
         (((int)lVar14 + 0xff00) * 0x100 + (int)lVar15) * 0x100 + (int)lVar16;
  }
  *(float *)((int)param_1 + 0x13c) =
       *(float *)((int)param_1 + 4) * _DAT_00418260 + *(float *)((int)param_1 + 0x13c);
  piVar3 = *(int **)(*(int *)((int)param_1 + 0x2c) + 8);
  if (*(char *)((int)param_1 + 0x20) != '\0') {
    *(undefined1 *)(piVar3 + 0x43) = 1;
  }
  piVar3[0x2f] = 0x42b40000;
  FUN_004058a6((int)piVar3);
  if (*(char *)((int)param_1 + 0x20) != '\0') {
    piVar3[0x44] = (int)(*(float *)((int)param_1 + 0x1c) * *(float *)((int)param_1 + 4) +
                        (float)piVar3[0x44]);
  }
  fVar13 = FUN_0040e8d2((void *)((int)param_1 + 0x4c),(float)piVar3[0x45],(float)piVar3[0x47]);
  if ((float10)(float)piVar3[0x46] <= fVar13) {
    piVar3[0x46] = (int)(float)fVar13;
  }
  DAT_00474790 = *(undefined4 *)(*(int *)((int)param_1 + 0x28) + 0x22);
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x200) == 0) {
    FUN_00402c72('\0');
  }
  FUN_00401abf(1,DAT_00474790,*(undefined4 *)(*(int *)((int)param_1 + 0x28) + 0x26),
               *(undefined4 *)(*(int *)((int)param_1 + 0x28) + 0x2a));
  piVar3[0x31] = *(int *)(*(int *)((int)param_1 + 0x28) + 0x2a);
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x51) & 2) != 0) {
    uVar6 = FUN_004030ef();
    if (uVar6 < 0x820) {
      uVar4 = 0;
    }
    else {
      uVar4 = 0x3f800000;
    }
    *(undefined4 *)(*(int *)((int)param_1 + 0x28) + 0x10) = uVar4;
  }
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x200) != 0) {
    FUN_0040f27e((void *)((int)param_1 + 0x94),*(float *)((int)param_1 + 4) * _DAT_00418260);
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 8) != 0) {
    if (*(float *)((int)param_1 + 0x150) < _DAT_004170c8) {
      *(undefined4 *)((int)param_1 + 0x150) = 0;
    }
    if (_DAT_004170c4 < *(float *)((int)param_1 + 0x150)) {
      *(undefined4 *)((int)param_1 + 0x150) = 0x3f800000;
    }
    lVar14 = FUN_00404224();
    uVar7 = (uint)lVar14;
    iVar12 = *(int *)((int)param_1 + 0xa8);
    iVar10 = 0;
    if (0 < *(int *)(iVar12 + 0xac)) {
      iVar11 = 0;
      do {
        puVar2 = (uint *)(*(int *)(iVar12 + 0xb0) + 0x18 + iVar11);
        iVar11 = iVar11 + 0x2c;
        iVar10 = iVar10 + 1;
        *puVar2 = *puVar2 & 0xff000000 | (uVar7 << 8 | uVar7) << 8 | uVar7;
        iVar12 = *(int *)((int)param_1 + 0xa8);
      } while (iVar10 < *(int *)(iVar12 + 0xac));
    }
    fVar5 = (*(float *)((int)param_1 + 0x150) - _DAT_00418eb0) * _DAT_00418230;
    if (fVar5 < _DAT_004170c8) {
      fVar5 = 0.0;
    }
    *(float *)(*(int *)((int)param_1 + 0x3c) + 0xd8) = fVar5 * _DAT_00418eac + _DAT_00418e78;
    *(undefined4 *)(*(int *)((int)param_1 + 0x3c) + 0xdc) =
         *(undefined4 *)(*(int *)((int)param_1 + 0x3c) + 0xd8);
    if (*(char *)((int)param_1 + 0x14c) != '\0') {
      *(float *)((int)param_1 + 0x150) =
           *(float *)((int)param_1 + 4) * _DAT_00418ea8 + *(float *)((int)param_1 + 0x150);
    }
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 0x20) != 0) {
    iVar12 = 0;
    do {
      FUN_0040f5a8((void *)(iVar12 + *(int *)((int)param_1 + 0x134)),
                   *(float *)((int)param_1 + 4) * _DAT_00418260);
      iVar10 = iVar12 + 0x68;
      pbVar1 = (byte *)(*(int *)(iVar12 + 100 + *(int *)((int)param_1 + 0x134)) + 200);
      *pbVar1 = *pbVar1 | 2;
      iVar12 = iVar10;
    } while (iVar10 < 0xd00);
  }
  iVar12 = *(int *)((int)param_1 + 0x28);
  if (((*(byte *)(iVar12 + 0x4f) & 8) != 0) && (iVar10 = 0, *(char *)(iVar12 + 9) != '\0')) {
    iVar11 = 0;
    do {
      FUN_0040a9ad((void *)(iVar11 + *(int *)((int)param_1 + 0xb8)),
                   *(float *)(iVar12 + 10) * *(float *)((int)param_1 + 4) * _DAT_00418260);
      iVar12 = *(int *)((int)param_1 + 0x28);
      iVar10 = iVar10 + 1;
      iVar11 = iVar11 + 0x28;
    } while (iVar10 < (int)(uint)*(byte *)(iVar12 + 9));
  }
  if (((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 0x80) != 0) &&
     (iVar12 = 0, *(char *)(*(int *)((int)param_1 + 0x28) + 0xe) != '\0')) {
    iVar10 = 0;
    do {
      FUN_0040cfed((void *)(iVar10 + *(int *)((int)param_1 + 0xbc)),
                   (float *)(*(float *)((int)param_1 + 4) * _DAT_00418260));
      iVar12 = iVar12 + 1;
      iVar10 = iVar10 + 0x20;
    } while (iVar12 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 0xe));
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x40) != 0) {
    FUN_0040d5c6((void *)((int)param_1 + 0xc0),*(float *)((int)param_1 + 4) * _DAT_00418260);
  }
  iVar12 = *(int *)((int)param_1 + 0x28);
  if (((*(byte *)(iVar12 + 0x4f) & 2) != 0) && (iVar10 = 0, *(char *)(iVar12 + 1) != '\0')) {
    iVar11 = 0;
    do {
      FUN_0040bfc1((void *)(iVar11 + *(int *)((int)param_1 + 0x130)),
                   *(float *)(iVar12 + 2) * *(float *)((int)param_1 + 4) * _DAT_00418260);
      iVar12 = *(int *)((int)param_1 + 0x28);
      iVar10 = iVar10 + 1;
      iVar11 = iVar11 + 0x24;
    } while (iVar10 < (int)(uint)*(byte *)(iVar12 + 1));
  }
  if (((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 4) != 0) &&
     (iVar12 = 0, *(char *)(*(int *)((int)param_1 + 0x28) + 6) != '\0')) {
    iVar10 = 0;
    do {
      FUN_0040c674((void *)(iVar10 + *(int *)((int)param_1 + 300)),
                   *(float *)((int)param_1 + 4) * _DAT_00418260);
      iVar12 = iVar12 + 1;
      iVar10 = iVar10 + 0x14;
    } while (iVar12 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 6));
  }
  if (((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x20) != 0) &&
     (iVar12 = 0, *(char *)(*(int *)((int)param_1 + 0x28) + 8) != '\0')) {
    iVar10 = 0;
    do {
      FUN_0040bb14((void *)(iVar10 + *(int *)((int)param_1 + 0x128)),
                   (float *)(*(float *)((int)param_1 + 4) * _DAT_00418ea4));
      iVar12 = iVar12 + 1;
      iVar10 = iVar10 + 0x30;
    } while (iVar12 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 8));
  }
  if (((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 0x40) != 0) &&
     (iVar12 = 0, *(char *)(*(int *)((int)param_1 + 0x28) + 0xf) != '\0')) {
    iVar10 = 0;
    do {
      FUN_0040fba1((void *)(iVar10 + *(int *)((int)param_1 + 0x138)),*(float *)((int)param_1 + 4),
                   0xffff);
      iVar12 = iVar12 + 1;
      iVar10 = iVar10 + 0x1c;
    } while (iVar12 < (int)(uint)*(byte *)(*(int *)((int)param_1 + 0x28) + 0xf));
  }
  if (_DAT_004170c8 < *(float *)(*(int *)((int)param_1 + 0x28) + 0x10)) {
    *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xac) = 0;
    FUN_00408dfc(param_1);
    local_10[1] = -1.0;
    local_10[0] = 0.0;
    local_8 = 0;
    local_4 = *(float *)(*(int *)((int)param_1 + 0x28) + 0x10) * _DAT_00418ea0;
    (**(code **)(*DAT_004747ac + 0xc0))(DAT_004747ac,0,local_10);
    FUN_00402349(0x98,1);
    FUN_00406004(*(void **)((int)param_1 + 0x2c),0.0);
    FUN_00402349(0x98,0);
    FUN_00408dfc(param_1);
    local_10[0] = -*(float *)(*(int *)((int)param_1 + 0x28) + 0x10);
    (**(code **)(*DAT_004747ac + 0xc0))(DAT_004747ac,0,&stack0xffffffe4);
    FUN_00402349(0x98,1);
  }
  *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xac) = 1;
  uVar4 = DAT_00474790;
  uVar7 = *(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f);
  if (((uVar7 & 0x40) != 0) && ((uVar7 & 0x80) != 0)) {
    if ((uVar7 & 0x200) != 0) {
      pbVar1 = (byte *)(*(int *)((int)param_1 + 0xa8) + 200);
      *pbVar1 = *pbVar1 | 2;
    }
    DAT_00474790 = 0;
    *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xe5) = 0;
    *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xac) = 0;
    FUN_00402b4f(*(undefined4 **)((int)param_1 + 0x30));
    FUN_00406004(*(void **)((int)param_1 + 0x2c),*(float *)((int)param_1 + 4));
    *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xac) = 1;
    *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xe5) = 1;
    if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x200) != 0) {
      pbVar1 = (byte *)(*(int *)((int)param_1 + 0xa8) + 200);
      *pbVar1 = *pbVar1 & 0xfd;
    }
  }
  DAT_00474790 = uVar4;
  if (*(float *)((int)param_1 + 0x148) < _DAT_004170c8) {
    *(undefined4 *)((int)param_1 + 0x148) = 0;
  }
  if (_DAT_004170c4 < *(float *)((int)param_1 + 0x148)) {
    *(undefined4 *)((int)param_1 + 0x148) = 0x3f800000;
  }
  if (*(char *)((int)param_1 + 0x145) != '\0') {
    *(float *)(*(int *)(*(int *)((int)param_1 + 0x3c) + 0xb4) + 4) =
         _DAT_00418eb8 - *(float *)((int)param_1 + 0x148) * _DAT_00418e9c;
    *(float *)((int)param_1 + 0x148) =
         *(float *)((int)param_1 + 4) * _DAT_00418e98 + *(float *)((int)param_1 + 0x148);
  }
  iVar12 = *(int *)((int)param_1 + 0x28);
  if ((*(byte *)(iVar12 + 0x51) & 2) != 0) {
    if (*(char *)((int)param_1 + 0x144) != '\0') {
      *(float *)((int)param_1 + 0x140) =
           *(float *)((int)param_1 + 4) * _DAT_00418260 + *(float *)((int)param_1 + 0x140);
    }
    if (*(float *)((int)param_1 + 0x140) < _DAT_004170c8) {
      *(undefined4 *)((int)param_1 + 0x140) = 0;
    }
    if (_DAT_004170c4 < *(float *)((int)param_1 + 0x140)) {
      *(undefined4 *)((int)param_1 + 0x140) = 0x3f800000;
    }
    if ((*(byte *)(iVar12 + 0x51) & 1) != 0) {
      *(float *)(*(int *)((int)param_1 + 0x6c) + 0x98) =
           *(float *)(iVar12 + 0x44) * *(float *)((int)param_1 + 0x140);
    }
  }
  if (*(float *)(*(int *)((int)param_1 + 0x28) + 0x10) <= _DAT_004170c8) {
    FUN_00402c72('\0');
  }
  else {
    (**(code **)(*DAT_004747ac + 0x90))(DAT_004747ac,0,0,2,DAT_00474790,0x3f800000,0);
  }
  (**(code **)(*piVar3 + 4))(0);
  *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xac) = 0;
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 0x20) != 0) {
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0x6c) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x200) != 0) {
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0xa8) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x51) & 1) == 0) {
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0x6c) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x1000000) != 0) {
    lVar14 = FUN_00404224();
    *(char *)(*(int *)((int)param_1 + 0x8c) + 0x14) = (char)lVar14;
    if (*(char *)(*(int *)((int)param_1 + 0x8c) + 0x14) == -1) goto LAB_004097d4;
  }
  FUN_00406004(*(void **)((int)param_1 + 0x2c),*(float *)((int)param_1 + 4));
LAB_004097d4:
  uVar7 = *(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f);
  if (((uVar7 & 0x40) != 0) && ((uVar7 & 0x80000) != 0)) {
    puVar8 = (undefined4 *)(*(int *)((int)param_1 + 0x6c) + 0xc4);
    uVar4 = *puVar8;
    *puVar8 = *(undefined4 *)((int)param_1 + 0x114);
    (**(code **)(**(int **)((int)param_1 + 0x6c) + 4))(0);
    *(undefined4 *)(*(int *)((int)param_1 + 0x6c) + 0xc4) = uVar4;
  }
  if (((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x1000000) != 0) &&
     (*(char *)(*(int *)((int)param_1 + 0x8c) + 0x14) != '\0')) {
    piVar9 = (int *)(*(int *)((int)param_1 + 0x6c) + 0xc4);
    iVar12 = *piVar9;
    *piVar9 = *(int *)((int)param_1 + 0x8c);
    (**(code **)(**(int **)((int)param_1 + 0x6c) + 4))(0);
    *(int *)(*(int *)((int)param_1 + 0x6c) + 0xc4) = iVar12;
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 2) != 0) {
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0xa8) + 200);
    *pbVar1 = *pbVar1 & 0xfd;
  }
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x2000) != 0) {
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0x6c) + 200);
    *pbVar1 = *pbVar1 & 0xfd;
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x51) & 1) == 0) {
    pbVar1 = (byte *)(*(int *)((int)param_1 + 0x6c) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xac) = 1;
  if (_DAT_004170c8 < *(float *)(*(int *)((int)param_1 + 0x28) + 0x10)) {
    FUN_00402349(0x98,0);
    *(undefined4 *)(*(int *)((int)param_1 + 0x44) + 0x8c) =
         *(undefined4 *)(*(int *)((int)param_1 + 0x28) + 0x10);
    (**(code **)(**(int **)((int)param_1 + 0x44) + 4))(0);
    if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 1) != 0) {
      *(undefined1 *)(*(int *)((int)param_1 + 0x40) + 0xac) = 1;
      (**(code **)(**(int **)((int)param_1 + 0x40) + 4))(0);
      iVar10 = 0;
      *(undefined1 *)(*(int *)((int)param_1 + 0x40) + 0xac) = 0;
      iVar12 = 0;
      do {
        fVar13 = FUN_004041dd(*(float *)((int)param_1 + 0x13c) * _DAT_00418e5c +
                              *(float *)(*(int *)((int)param_1 + 0x48) + iVar12));
        *(float *)(*(int *)(*(int *)((int)param_1 + 0x40) + 0xb4) + 0x18 + iVar10) =
             (float)((fVar13 * (float10)_DAT_004170d4 + (float10)_DAT_004170d4) *
                     (float10)_DAT_00418e94 + (float10)_DAT_00418e84);
        lVar14 = FUN_00404224();
        iVar12 = iVar12 + 4;
        *(uint *)(*(int *)(*(int *)((int)param_1 + 0x40) + 0xb4) + 0x1c + iVar10) =
             (int)lVar14 << 0x18 | 0xffffff;
        iVar10 = iVar10 + 0x20;
      } while (iVar12 < 0x200);
    }
  }
  *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xe5) = 0;
  FUN_0040520d(*(int *)((int)param_1 + 0x3c));
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x2000) != 0) {
    (**(code **)(**(int **)((int)param_1 + 0x6c) + 4))(0);
  }
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 4) != 0) {
    (**(code **)(*piVar3 + 4))(0);
    (**(code **)(**(int **)(*(int *)((int)param_1 + 300) + 0xc) + 4))(0);
  }
  *(undefined1 *)(*(int *)((int)param_1 + 0x3c) + 0xe5) = 1;
  FUN_004050ed(*(void **)((int)param_1 + 0x3c),*(float *)((int)param_1 + 4));
  if ((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x50) & 2) != 0) {
    (**(code **)(**(int **)((int)param_1 + 0xa8) + 4))(0);
  }
  piVar3[0x31] = 0x461c4000;
  (**(code **)(*piVar3 + 4))(0);
  (**(code **)(**(int **)((int)param_1 + 0x3c) + 4))(0);
  piVar3[0x31] = local_8;
  (**(code **)(*piVar3 + 4))(0);
  if ((((*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x40) != 0) &&
      ((**(code **)(**(int **)((int)param_1 + 0xc4) + 4))(0),
      (*(byte *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x80) != 0)) &&
     (uVar6 = FUN_004030ef(), 0x1aff < uVar6)) {
    FUN_0040de4e((int)param_1 + 0xc0);
  }
  if ((*(uint *)(*(int *)((int)param_1 + 0x28) + 0x4f) & 0x2000) != 0) {
    iVar12 = 0;
    do {
      pbVar1 = (byte *)(*(int *)(*(int *)((int)param_1 + 0x134) + 100 + iVar12) + 200);
      *pbVar1 = *pbVar1 & 0xfd;
      (**(code **)(**(int **)(*(int *)((int)param_1 + 0x134) + 100 + iVar12) + 4))(0);
      iVar12 = iVar12 + 0x68;
    } while (iVar12 < 0xd00);
  }
  return;
}


// ==== FUN_00409acb @ 00409acb ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00409acb(void *this,char param_1,float param_2)

{
  int iVar1;
  int iVar2;
  longlong lVar3;
  
  FUN_00406127(this,param_1,param_2);
  switch(param_1) {
  case '\x01':
    iVar1 = *(int *)((int)this + 0x28);
    if ((*(byte *)(iVar1 + 0x4f) & 2) != 0) {
      lVar3 = FUN_00404224();
      iVar2 = (int)lVar3;
      if ((-1 < iVar2) && (iVar2 < (int)(uint)*(byte *)(iVar1 + 1))) {
        *(undefined1 *)(*(int *)((int)this + 0x130) + 0x20 + iVar2 * 0x24) = 1;
      }
    }
    break;
  case '\x02':
    iVar1 = *(int *)((int)this + 0x28);
    if ((*(byte *)(iVar1 + 0x50) & 0x80) != 0) {
      lVar3 = FUN_00404224();
      iVar2 = (int)lVar3;
      if ((-1 < iVar2) && (iVar2 < (int)(uint)*(byte *)(iVar1 + 0xe))) {
        *(undefined1 *)(*(int *)((int)this + 0xbc) + 0x10 + iVar2 * 0x20) = 1;
      }
    }
    break;
  case '\x03':
    lVar3 = FUN_00404224();
    FUN_004082a9(this,(uint)lVar3);
    break;
  case '\x04':
    if (*(char *)((int)this + 0x20) != '\0') {
      lVar3 = FUN_00404224();
      *(undefined4 *)(*(int *)((int)this + 0x2c) + 8) =
           *(undefined4 *)(*(int *)((int)this + 0x18) + (int)lVar3 * 4);
    }
    break;
  case '\x05':
    if (*(char *)((int)this + 0x20) != '\0') {
      *(float *)((int)this + 0x1c) = (1.0 / *(float *)((int)this + 0xc)) * param_2 * _DAT_00418ed0;
    }
    break;
  case '\x06':
    if (param_2 == _DAT_004170c8) {
      *(undefined1 *)((int)this + 0x20) = 0;
    }
    else {
      *(undefined1 *)((int)this + 0x20) = 1;
    }
    break;
  case '\a':
    *(undefined1 *)((int)this + 0x144) = 1;
    break;
  case '\b':
    *(undefined1 *)((int)this + 0x145) = 1;
    break;
  case '\t':
    iVar1 = *(int *)((int)this + 0x28);
    if ((*(byte *)(iVar1 + 0x4f) & 8) != 0) {
      lVar3 = FUN_00404224();
      iVar2 = (int)lVar3;
      if ((-1 < iVar2) && (iVar2 < (int)(uint)*(byte *)(iVar1 + 9))) {
        *(undefined1 *)(*(int *)((int)this + 0xb8) + 0x24 + iVar2 * 0x28) = 1;
      }
    }
    break;
  case '\n':
    *(undefined1 *)((int)this + 0x14c) = 1;
  }
  return;
}


// ==== FUN_00409c71 @ 00409c71 ====

void FUN_00409c71(int param_1)

{
  *(undefined4 *)(param_1 + 0x1c) = 0;
  *(undefined4 *)(param_1 + 0x20) = 0;
  *(undefined4 *)(param_1 + 0x48) = 0x3f800000;
  *(undefined4 *)(param_1 + 0x4c) = 0;
  *(undefined4 *)(param_1 + 0x74) = 0x3f800000;
  *(undefined4 *)(param_1 + 0x78) = 0x3f800000;
  *(undefined4 *)(param_1 + 0xa0) = 0;
  *(undefined4 *)(param_1 + 0xa4) = 0x3f800000;
  return;
}


// ==== FUN_00409ca6 @ 00409ca6 ====

void FUN_00409ca6(int *param_1,short param_2,int param_3)

{
  int iVar1;
  
  iVar1 = 0;
  do {
    *(ushort *)(*param_1 + iVar1 * 2) = (ushort)*(byte *)(iVar1 + param_3) + param_2;
    iVar1 = iVar1 + 1;
  } while (iVar1 < 6);
  *param_1 = *param_1 + 0xc;
  return;
}


// ==== FUN_00409ccd @ 00409ccd ====

void FUN_00409ccd(int *param_1,short param_2,int param_3,int param_4,short param_5)

{
  short sVar1;
  short sVar2;
  short sVar3;
  
  sVar1 = (short)param_4 * param_5;
  sVar3 = sVar1 + (short)param_3 + param_2;
  *(short *)*param_1 = sVar3;
  sVar2 = (short)((param_3 + 1) % param_4);
  *(short *)(*param_1 + 2) = sVar1 + sVar2 + param_2;
  sVar1 = (param_5 + 1) * (short)param_4;
  sVar2 = sVar2 + sVar1 + param_2;
  *(short *)(*param_1 + 4) = sVar2;
  *(short *)(*param_1 + 6) = sVar2;
  *(short *)(*param_1 + 8) = sVar1 + (short)param_3 + param_2;
  *(short *)(*param_1 + 10) = sVar3;
  *param_1 = *param_1 + 0xc;
  return;
}


// ==== FUN_00409d45 @ 00409d45 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_00409d45(void *this,void *param_1,void *param_2,float param_3,float param_4,float param_5,
            undefined4 param_6,undefined4 param_7,undefined4 param_8,uint *param_9,
            undefined4 *param_10,int param_11,char param_12,float param_13)

{
  byte *pbVar1;
  void *pvVar2;
  undefined4 *puVar3;
  int *piVar4;
  uint *puVar5;
  float fVar6;
  uint *puVar7;
  undefined1 *puVar8;
  int iVar9;
  float10 fVar10;
  float fVar11;
  
  FUN_004010dc();
  *(undefined4 *)((int)this + 0x1c) = 0;
  _DAT_00478930 = param_13 * _DAT_00418e5c;
  DAT_00478950 = param_6;
  _DAT_00478944 = 0x41a00000;
  DAT_00478954 = param_7;
  DAT_00478958 = param_8;
  _DAT_00478934 = param_10;
  _DAT_00478948 = param_11;
  *(void **)((int)this + 0xc) = param_2;
  *(float *)this = param_3;
  *(float *)((int)this + 4) = param_4;
  *(char *)((int)this + 0x25) = param_12;
  *(float *)((int)this + 8) = param_5;
  if (param_2 != (void *)0x0) {
    fVar10 = FUN_0040e8d2(param_2,*(float *)this,*(float *)((int)this + 8));
    *(float *)((int)this + 4) = (float)(fVar10 + (float10)*(float *)((int)this + 4));
  }
  pvVar2 = (void *)FUN_004042e0(0xcc);
  if (pvVar2 == (void *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004042f6(pvVar2,0xffff,0xffff,0);
  }
  *(undefined4 **)((int)this + 0x10) = puVar3;
  puVar3[0x2d] = 0;
  *(undefined4 *)(*(int *)((int)this + 0x10) + 0xac) = 0;
  pvVar2 = (void *)FUN_004042e0(0xcc);
  if (pvVar2 == (void *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004042f6(pvVar2,0xffff,0xffff,0);
  }
  *(undefined4 **)((int)this + 0x14) = puVar3;
  puVar3[0x2d] = 0;
  *(undefined4 *)(*(int *)((int)this + 0x14) + 0xac) = 0;
  puVar3 = (undefined4 *)FUN_00401558(&param_6,param_9,param_9,param_9);
  iVar9 = *(int *)((int)this + 0x10);
  *(undefined4 *)(iVar9 + 0x94) = *puVar3;
  *(undefined4 *)(iVar9 + 0x98) = puVar3[1];
  *(undefined4 *)(iVar9 + 0x9c) = puVar3[2];
  puVar3 = (undefined4 *)FUN_00401558(&param_6,param_9,param_9,param_9);
  iVar9 = *(int *)((int)this + 0x14);
  *(undefined4 *)(iVar9 + 0x94) = *puVar3;
  *(undefined4 *)(iVar9 + 0x98) = puVar3[1];
  *(undefined4 *)(iVar9 + 0x9c) = puVar3[2];
  pvVar2 = (void *)FUN_004042e0(0x38);
  if (pvVar2 == (void *)0x0) {
    piVar4 = (int *)0x0;
  }
  else {
    piVar4 = FUN_0040a186(pvVar2,*(int *)((int)this + 0x10),*(int *)((int)this + 0x14));
  }
  *(int **)((int)this + 0x20) = piVar4;
  FUN_0040449f(*(int *)((int)this + 0x10));
  FUN_0040449f(*(int *)((int)this + 0x14));
  FUN_004045f1(*(int *)((int)this + 0x10));
  FUN_004045f1(*(int *)((int)this + 0x14));
  iVar9 = *(int *)(*(int *)((int)this + 0x14) + 0xac) >> 3;
  puVar5 = (uint *)FUN_004042e0(iVar9 << 7);
  if (puVar5 == (uint *)0x0) {
    puVar5 = (uint *)0x0;
  }
  else {
    _vector_constructor_iterator_(puVar5,0x80,iVar9,(_func_void_ptr_void_ptr *)&LAB_0040a987);
  }
  *(uint **)((int)this + 0x18) = puVar5;
  fVar6 = 0.0;
  param_11 = 0;
  param_9 = puVar5;
  if (0 < (int)(*(uint *)(*(int *)((int)this + 0x14) + 0xac) & 0xfffffff8)) {
    do {
      param_10 = param_9;
      param_2 = (void *)0x8;
      param_13 = fVar6;
      do {
        puVar3 = (undefined4 *)(*(int *)(*(int *)((int)this + 0x14) + 0xb0) + (int)param_13);
        puVar3 = (undefined4 *)FUN_00401558(&param_6,*puVar3,puVar3[1],puVar3[2]);
        *param_10 = *puVar3;
        param_10[1] = puVar3[1];
        param_10[2] = puVar3[2];
        fVar10 = FUN_00401341();
        param_9[0x1f] = (uint)(float)(fVar10 + fVar10);
        param_9[0x18] = DAT_00478938;
        param_9[0x19] = DAT_0047893c;
        param_9[0x1a] = DAT_00478940;
        fVar10 = FUN_00401341();
        fVar6 = (float)((fVar10 + fVar10) - (float10)_DAT_004170c4);
        fVar10 = FUN_00401341();
        fVar11 = (float)((fVar10 + fVar10) - (float10)_DAT_004170c4);
        fVar10 = FUN_00401341();
        puVar5 = (uint *)FUN_00401558(&param_3,(float)((fVar10 + fVar10) - (float10)_DAT_004170c4),
                                      fVar11,fVar6);
        fVar6 = (float)((int)param_13 + 0x2c);
        param_10 = param_10 + 3;
        param_2 = (void *)((int)param_2 + -1);
        param_9[0x1b] = *puVar5;
        param_9[0x1c] = puVar5[1];
        param_9[0x1d] = puVar5[2];
        *(undefined1 *)(param_9 + 0x1e) = 1;
        param_13 = fVar6;
      } while (param_2 != (void *)0x0);
      param_9 = param_9 + 0x20;
      param_11 = param_11 + 1;
    } while (param_11 < *(int *)(*(int *)((int)this + 0x14) + 0xac) >> 3);
  }
  iVar9 = *(int *)((int)this + 0x10);
  *(undefined4 *)(iVar9 + 0x88) = *(undefined4 *)this;
  *(undefined4 *)(iVar9 + 0x8c) = *(undefined4 *)((int)this + 4);
  *(undefined4 *)(iVar9 + 0x90) = *(undefined4 *)((int)this + 8);
  iVar9 = *(int *)((int)this + 0x14);
  *(undefined4 *)(iVar9 + 0x88) = *(undefined4 *)this;
  *(undefined4 *)(iVar9 + 0x8c) = *(undefined4 *)((int)this + 4);
  *(undefined4 *)(iVar9 + 0x90) = *(undefined4 *)((int)this + 8);
  FUN_00405f0e(param_1,*(int *)((int)this + 0x10));
  FUN_00405f0e(param_1,*(int *)((int)this + 0x14));
  puVar5 = (uint *)FUN_004042e0(0x40000);
  FUN_00416036(0,0x100,0x100,(int *)puVar5);
  param_9 = (uint *)FUN_004042e0(0x2c);
  if (param_9 == (uint *)0x0) {
    puVar8 = (undefined1 *)0x0;
  }
  else {
    pvVar2 = (void *)FUN_004042e0(0x18);
    if (pvVar2 == (void *)0x0) {
      puVar7 = (uint *)0x0;
    }
    else {
      puVar7 = FUN_00403dd3(pvVar2,(uint)puVar5,0x100,0x100,'\0','\0');
    }
    puVar8 = FUN_00401c67(param_9,(int)puVar7,0,0);
  }
  FUN_004045dd(*(void **)((int)this + 0x10),(int)puVar8);
  FUN_00416036(1,0x100,0x100,(int *)puVar5);
  param_10 = (undefined4 *)0x10000;
  param_9 = puVar5;
  do {
    param_13 = (float)*param_9;
    puVar7 = param_9 + 1;
    param_10 = (undefined4 *)((int)param_10 + -1);
    *param_9 = ((uint)param_13 >> 8 & 0xff0000) * (DAT_0047895c >> 0x18) & 0xff00ffff |
               ((uint)param_13 >> 0x10 & 0xff) * 0x100 * (DAT_0047895c >> 0x10 & 0xff) & 0xffff00ff
               | ((uint)param_13 >> 8 & 0xff) * (DAT_0047895c >> 8 & 0xff) & 0xffffff00 |
               ((uint)param_13 & 0xff) * (DAT_0047895c & 0xff) >> 8;
    param_9 = puVar7;
  } while (param_10 != (undefined4 *)0x0);
  param_9 = (uint *)FUN_004042e0(0x2c);
  if (param_9 == (uint *)0x0) {
    puVar8 = (undefined1 *)0x0;
  }
  else {
    pvVar2 = (void *)FUN_004042e0(0x18);
    if (pvVar2 == (void *)0x0) {
      puVar7 = (uint *)0x0;
    }
    else {
      puVar7 = FUN_00403dd3(pvVar2,(uint)puVar5,0x100,0x100,'\0','\0');
    }
    puVar8 = FUN_00401c67(param_9,(int)puVar7,0,0x300);
  }
  FUN_004045dd(*(void **)((int)this + 0x14),(int)puVar8);
  *(undefined1 *)(*(int *)(*(int *)((int)this + 0x14) + 0xc4) + 0x14) = 0xf0;
  if (param_12 == '\0') {
    pbVar1 = (byte *)(*(int *)((int)this + 0x14) + 200);
    *pbVar1 = *pbVar1 | 2;
  }
  FUN_004042eb((int)puVar5);
  *(undefined1 *)((int)this + 0x24) = 0;
  return;
}


// ==== FUN_0040a186 @ 0040a186 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

int * __thiscall FUN_0040a186(void *this,int param_1,int param_2)

{
  undefined4 uVar1;
  undefined4 uVar2;
  float *pfVar3;
  undefined4 *puVar4;
  float *pfVar5;
  uint uVar6;
  undefined1 *this_00;
  int iVar7;
  float10 fVar8;
  int in_stack_00000018;
  undefined4 local_264 [16];
  undefined4 local_224 [16];
  float local_1e4 [16];
  undefined1 local_1a4 [12];
  undefined1 local_198 [12];
  undefined1 local_18c [12];
  undefined1 local_180 [12];
  undefined1 local_174 [12];
  undefined1 local_168 [12];
  undefined1 local_15c [12];
  undefined1 local_150 [12];
  undefined1 local_144 [12];
  undefined1 local_138 [12];
  float local_12c [3];
  undefined1 local_120 [12];
  undefined1 local_114 [12];
  undefined1 local_108 [12];
  float local_fc [16];
  float local_bc [16];
  undefined1 local_7c [12];
  int *local_70;
  int local_6c;
  float local_68;
  undefined4 uStack_64;
  undefined4 uStack_60;
  float local_5c [3];
  float local_50;
  float local_4c;
  undefined4 local_48;
  float local_44;
  float local_40;
  float local_3c;
  float *local_38;
  int local_34;
  float local_30;
  float local_2c;
  float local_28;
  float local_24;
  byte local_20 [8];
  float local_18;
  float local_14;
  float local_10;
  int local_c;
  float local_8;
  
  local_70 = this;
  FUN_00401555((int)this + 0x1c);
  FUN_00401555((int)this + 0x28);
  iVar7 = in_stack_00000018;
  *(int *)this = in_stack_00000018;
  *(undefined4 *)((int)this + 0x10) = 0;
  *(undefined4 *)((int)this + 0xc) = 0;
  *(undefined4 *)((int)this + 8) = 0;
  *(undefined4 *)((int)this + 4) = 0;
  if (in_stack_00000018 == 0) {
    *(undefined4 *)((int)this + 0x18) = 0;
  }
  else {
    *(int *)((int)this + 0x18) = *(int *)(in_stack_00000018 + 0x18) + 1;
  }
  FUN_00401555(&local_68);
  uVar2 = DAT_00478940;
  uVar1 = DAT_0047893c;
  if (iVar7 == 0) {
    local_68 = DAT_00478938;
    uStack_64 = DAT_0047893c;
    uStack_60 = DAT_00478940;
    *(float *)((int)this + 0x28) = DAT_00478938;
    *(undefined4 *)((int)this + 0x2c) = uVar1;
    *(undefined4 *)((int)this + 0x30) = uVar2;
    *(float *)((int)this + 0x1c) = DAT_00478938;
    *(undefined4 *)((int)this + 0x20) = DAT_0047893c;
    *(undefined4 *)((int)this + 0x24) = DAT_00478940;
    *(undefined4 *)((int)this + 0x34) = 0x3f800000;
  }
  else {
    local_68 = *(float *)(iVar7 + 0x28);
    uStack_64 = *(undefined4 *)(iVar7 + 0x2c);
    uStack_60 = *(undefined4 *)(iVar7 + 0x30);
    *(float *)((int)this + 0x28) = local_68;
    *(undefined4 *)((int)this + 0x2c) = uStack_64;
    *(undefined4 *)((int)this + 0x30) = uStack_60;
    *(undefined4 *)((int)this + 0x34) = *(undefined4 *)(in_stack_00000018 + 0x34);
    *(undefined4 *)((int)this + 0x1c) = *(undefined4 *)(in_stack_00000018 + 0x1c);
    *(undefined4 *)((int)this + 0x20) = *(undefined4 *)(in_stack_00000018 + 0x20);
    *(undefined4 *)((int)this + 0x24) = *(undefined4 *)(in_stack_00000018 + 0x24);
    pfVar3 = FUN_0040523d(local_5c,(float *)((int)this + 0x28),(float *)&DAT_00478950);
    *(float *)((int)this + 0x28) = *pfVar3;
    *(float *)((int)this + 0x2c) = pfVar3[1];
    *(float *)((int)this + 0x30) = pfVar3[2];
    puVar4 = FUN_0040523d(local_5c,(float *)((int)this + 0x28),(float *)&stack0x0000000c);
    *(undefined4 *)((int)this + 0x28) = *puVar4;
    *(undefined4 *)((int)this + 0x2c) = puVar4[1];
    *(undefined4 *)((int)this + 0x30) = puVar4[2];
    *(float *)((int)this + 0x34) = _DAT_00478948 * *(float *)((int)this + 0x34);
    FUN_0040190f(local_bc);
    FUN_00402280(local_bc,(float *)(in_stack_00000018 + 0x28));
    iVar7 = in_stack_00000018;
    uVar1 = *(undefined4 *)(in_stack_00000018 + 0x34);
    pfVar3 = (float *)FUN_00401558(local_5c,uVar1,uVar1,uVar1);
    FUN_004022bb(local_bc,pfVar3);
    pfVar3 = local_bc;
    pfVar5 = (float *)FUN_00401558(local_5c,0,_DAT_00418ef4,0);
    pfVar3 = FUN_00402a6f(&local_50,pfVar5,pfVar3);
    puVar4 = FUN_0040523d(&local_44,(float *)(iVar7 + 0x1c),pfVar3);
    *(undefined4 *)((int)this + 0x1c) = *puVar4;
    *(undefined4 *)((int)this + 0x20) = puVar4[1];
    *(undefined4 *)((int)this + 0x24) = puVar4[2];
  }
  local_38 = (float *)(*(int *)(param_1 + 0xac) * 0x2c + *(int *)(param_1 + 0xb0));
  local_c = 0;
  do {
    FUN_0040190f(local_fc);
    local_18 = (float)local_c;
    local_24 = (float)local_c * _DAT_004170d4;
    local_8 = 1.0 - local_24;
    pfVar3 = (float *)FUN_00401558(local_15c,local_24,local_24,local_24);
    pfVar3 = FUN_00405271(local_144,(float *)((int)this + 0x28),pfVar3);
    pfVar5 = (float *)FUN_00401558(local_150,local_8,local_8,local_8);
    pfVar5 = FUN_00405271(local_168,&local_68,pfVar5);
    FUN_0040523d(local_5c,pfVar5,pfVar3);
    FUN_00402280(local_fc,local_5c);
    if (local_c == 0) {
      if (in_stack_00000018 != 0) {
        iVar7 = *(int *)(in_stack_00000018 + 0x34);
        this_00 = local_1a4;
        goto LAB_0040a3ce;
      }
    }
    else {
      iVar7 = *(int *)((int)this + 0x34);
      this_00 = local_198;
LAB_0040a3ce:
      pfVar3 = (float *)FUN_00401558(this_00,iVar7,iVar7,iVar7);
      FUN_004022bb(local_fc,pfVar3);
    }
    FUN_004022ff(local_fc,(int *)((int)this + 0x1c));
    local_8 = 0.0;
    local_10 = local_24 + local_24;
    do {
      FUN_0040190f(local_1e4);
      local_14 = (float)(int)local_8 * _DAT_00418f20;
      pfVar3 = (float *)FUN_00401558(local_138,0,local_14 * (float)_DAT_00418f18,0);
      FUN_00402280(local_1e4,pfVar3);
      pfVar3 = (float *)FUN_004024c5(local_224,local_1e4,local_fc);
      pfVar5 = local_1e4;
      for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
        *pfVar5 = *pfVar3;
        pfVar3 = pfVar3 + 1;
        pfVar5 = pfVar5 + 1;
      }
      FUN_00401555(&local_30);
      local_30 = _DAT_00478934;
      if (*(int *)((int)this + 0x18) == 4) {
        local_30 = (_DAT_004170c4 - local_24 * _DAT_00418f10) * _DAT_00478934;
      }
      local_2c = _DAT_00418ef4 * _DAT_004170d4 * local_18;
      local_28 = 0.0;
      pfVar3 = FUN_00402a6f(local_180,&local_30,local_1e4);
      local_30 = *pfVar3;
      local_2c = pfVar3[1];
      local_28 = pfVar3[2];
      *local_38 = local_30;
      local_38[1] = local_2c;
      local_38[2] = local_28;
      local_38[7] = local_14;
      local_38[8] = local_10;
      local_38 = local_38 + 0xb;
      local_8 = (float)((int)local_8 + 1);
    } while ((int)local_8 < 8);
    if ((local_c != 0) && (*(int *)((int)this + 0x18) != 0)) {
      local_18 = 2.24208e-44;
      do {
        uVar6 = FUN_00404258();
        if ((int)uVar6 < 4000) {
          FUN_00401555(&local_50);
          local_50 = _DAT_00418e5c;
          if (*(int *)((int)this + 0x18) == 4) {
            local_50 = (_DAT_004170c4 - local_24 * _DAT_00418f10) * _DAT_00418e5c;
          }
          local_14 = _DAT_00418ef4 * _DAT_004170d4;
          fVar8 = FUN_00401341();
          local_10 = (float)(local_c + -1);
          local_4c = (float)((float10)(int)local_10 * (float10)local_14 + fVar8 * (float10)local_14)
          ;
          local_48 = 0;
          fVar8 = FUN_00401341();
          local_14 = (float)(fVar8 * (float10)_DAT_00418f0c - (float10)_DAT_00418e7c);
          fVar8 = FUN_00401341();
          local_10 = (float)((fVar8 + fVar8) * (float10)_DAT_00418220);
          FUN_0040190f(local_bc);
          pfVar3 = (float *)FUN_00401558(local_174,0,local_10,0);
          FUN_00402280(local_bc,pfVar3);
          pfVar3 = (float *)FUN_004024c5(local_264,local_bc,local_fc);
          pfVar5 = local_bc;
          for (iVar7 = 0x10; iVar7 != 0; iVar7 = iVar7 + -1) {
            *pfVar5 = *pfVar3;
            pfVar3 = pfVar3 + 1;
            pfVar5 = pfVar5 + 1;
          }
          pfVar3 = (float *)(*(int *)(param_2 + 0xac) * 0x2c + *(int *)(param_2 + 0xb0));
          local_34 = *(int *)(param_2 + 0xb8) + *(int *)(param_2 + 0xb4) * 6;
          FUN_00401555(&local_44);
          FUN_00401558(local_12c,0,0,-_DAT_00478930);
          FUN_00401558(local_120,_DAT_00478944 + _DAT_00478944,local_14,-_DAT_00478930);
          FUN_00401558(local_114,_DAT_00478944 + _DAT_00478944,local_14,_DAT_00478930);
          FUN_00401558(local_108,0,0,_DAT_00478930);
          local_20[4] = 0;
          local_20[5] = 0;
          local_20[1] = 0;
          local_20[2] = 0;
          local_8 = 0.0;
          local_20[6] = 1;
          local_20[7] = 1;
          local_20[0] = 1;
          local_20[3] = 1;
          do {
            local_10 = (float)((uint)local_8 & 3);
            pfVar5 = FUN_0040523d(local_18c,&local_50,local_12c + (int)local_10 * 3);
            local_44 = *pfVar5;
            local_40 = pfVar5[1];
            local_3c = pfVar5[2];
            pfVar5 = FUN_00402a6f(local_7c,&local_44,local_bc);
            iVar7 = (int)local_10 + 4;
            local_10 = (float)(uint)local_20[(int)local_10];
            local_44 = *pfVar5;
            local_40 = pfVar5[1];
            local_3c = pfVar5[2];
            pfVar3[7] = (float)local_20[iVar7];
            pfVar3[8] = (float)(int)local_10;
            *pfVar3 = local_44;
            pfVar3[1] = local_40;
            pfVar3[2] = local_3c;
            pfVar3 = pfVar3 + 0xb;
            local_8 = (float)((int)local_8 + 1);
          } while ((int)local_8 < 8);
          FUN_00409ca6(&local_34,(short)*(undefined4 *)(param_2 + 0xac),0x418edc);
          FUN_00409ca6(&local_34,(short)*(undefined4 *)(param_2 + 0xac) + 4,0x418ee4);
          *(int *)(param_2 + 0xac) = *(int *)(param_2 + 0xac) + 8;
          *(int *)(param_2 + 0xb4) = *(int *)(param_2 + 0xb4) + 4;
          this = local_70;
        }
        local_18 = (float)((int)local_18 + -1);
      } while (local_18 != 0.0);
    }
    local_c = local_c + 1;
    if (2 < local_c) {
      local_c = 0;
      local_6c = *(int *)(param_1 + 0xb8) + *(int *)(param_1 + 0xb4) * 6;
      do {
        iVar7 = 0;
        do {
          FUN_00409ccd(&local_6c,(short)*(undefined4 *)(param_1 + 0xac),iVar7,8,(short)local_c);
          iVar7 = iVar7 + 1;
        } while (iVar7 < 8);
        local_c = local_c + 1;
      } while (local_c < 2);
      *(int *)(param_1 + 0xac) = *(int *)(param_1 + 0xac) + 0x18;
      *(int *)(param_1 + 0xb4) = *(int *)(param_1 + 0xb4) + 0x20;
      if (*(int *)((int)this + 0x18) < 4) {
        fVar8 = FUN_00401341();
        puVar4 = (undefined4 *)
                 FUN_00401558(local_7c,0,0,
                              (float)((fVar8 * (float10)_DAT_00418f08 - (float10)_DAT_00418f04) -
                                     (float10)_DAT_00418f00));
        iVar7 = FUN_0040a952(this,param_1,param_2,*puVar4,puVar4[1],puVar4[2]);
        *(int *)((int)this + 4) = iVar7;
        fVar8 = FUN_00401341();
        puVar4 = (undefined4 *)
                 FUN_00401558(local_7c,0,0,
                              (float)((fVar8 * (float10)_DAT_00418f08 - (float10)_DAT_00418f04) +
                                     (float10)_DAT_00418f00));
        iVar7 = FUN_0040a952(this,param_1,param_2,*puVar4,puVar4[1],puVar4[2]);
        *(int *)((int)this + 8) = iVar7;
        fVar8 = FUN_00401341();
        puVar4 = (undefined4 *)
                 FUN_00401558(local_7c,(float)((fVar8 * (float10)_DAT_00418f08 -
                                               (float10)_DAT_00418f04) - (float10)_DAT_00418f00),0,0
                             );
        iVar7 = FUN_0040a952(this,param_1,param_2,*puVar4,puVar4[1],puVar4[2]);
        *(int *)((int)this + 0xc) = iVar7;
        fVar8 = FUN_00401341();
        puVar4 = (undefined4 *)
                 FUN_00401558(local_7c,(float)((fVar8 * (float10)_DAT_00418f08 -
                                               (float10)_DAT_00418f04) + (float10)_DAT_00418f00),0,0
                             );
        iVar7 = FUN_0040a952(this,param_1,param_2,*puVar4,puVar4[1],puVar4[2]);
        *(int *)((int)this + 0x10) = iVar7;
      }
      return this;
    }
  } while( true );
}


// ==== FUN_0040a952 @ 0040a952 ====

int * __thiscall
FUN_0040a952(void *this,int param_1,int param_2,undefined4 param_3,undefined4 param_4,
            undefined4 param_5)

{
  void *this_00;
  int *piVar1;
  
  this_00 = (void *)FUN_004042e0(0x38);
  if (this_00 == (void *)0x0) {
    piVar1 = (int *)0x0;
  }
  else {
    piVar1 = FUN_0040a186(this_00,param_1,param_2);
  }
  return piVar1;
}


// ==== FUN_0040a9ad @ 0040a9ad ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040a9ad(void *this,float param_1)

{
  float fVar1;
  float fVar2;
  float *pfVar3;
  float *pfVar4;
  int iVar5;
  float *pfVar6;
  float10 fVar7;
  undefined1 local_6c [12];
  undefined1 local_60 [12];
  undefined1 local_54 [12];
  undefined1 local_48 [12];
  undefined1 local_3c [12];
  float local_30 [3];
  float local_24;
  float local_20;
  float local_1c;
  byte local_18 [8];
  float *local_10;
  float local_c;
  float *local_8;
  
  *(float *)((int)this + 0x1c) = param_1 + *(float *)((int)this + 0x1c);
  if (*(char *)((int)this + 0x25) != '\0') {
    local_c = param_1 * _DAT_00418e60;
    local_8 = this;
    FUN_00401555(&local_24);
    FUN_00401558(local_30,0,_DAT_00418f28,0);
    param_1 = 0.0;
    pfVar6 = *(float **)((int)this + 0x18);
    local_10 = *(float **)(*(int *)((int)this + 0x14) + 0xb0);
    if (0 < (int)(*(uint *)(*(int *)((int)this + 0x14) + 0xac) & 0xfffffff8)) {
      local_18[0] = 0;
      local_18[3] = 0;
      local_18[4] = 0;
      local_18[7] = 0;
      local_18[1] = 1;
      local_18[2] = 1;
      local_18[5] = 1;
      local_18[6] = 1;
      do {
        if (*(char *)(pfVar6 + 0x1e) == '\0') {
          local_1c = 0.0;
          local_20 = 0.0;
          local_24 = 0.0;
        }
        else {
          if (_DAT_004170c8 <= pfVar6[0x1f]) {
            if (*(char *)((int)this + 0x24) != '\0') {
              pfVar6[0x1f] = pfVar6[0x1f] - local_c * _DAT_00418260;
            }
          }
          else {
            pfVar3 = FUN_0040268c(local_3c,pfVar6 + 0x1b,&local_c);
            pfVar3 = FUN_0040523d(local_48,pfVar6 + 0x18,pfVar3);
            pfVar6[0x18] = *pfVar3;
            pfVar6[0x19] = pfVar3[1];
            pfVar6[0x1a] = pfVar3[2];
            pfVar3 = FUN_0040268c(local_54,local_30,&local_c);
            pfVar3 = FUN_0040523d(local_60,pfVar6 + 0x1b,pfVar3);
            pfVar6[0x1b] = *pfVar3;
            pfVar6[0x1c] = pfVar3[1];
            pfVar6[0x1d] = pfVar3[2];
            this = local_8;
          }
          fVar7 = FUN_004041dd(((float)(int)param_1 + *(float *)((int)this + 0x1c)) * _DAT_00418f24)
          ;
          fVar7 = fVar7 * (float10)_DAT_004170bc;
          pfVar4 = (float *)FUN_00401558(local_6c,(float)fVar7,(float)fVar7,(float)fVar7);
          pfVar3 = local_8;
          local_24 = *pfVar4;
          fVar7 = (float10)0;
          local_20 = pfVar4[1];
          local_1c = pfVar4[2];
          if ((void *)local_8[3] != (void *)0x0) {
            fVar7 = FUN_0040e8d2((void *)local_8[3],
                                 (pfVar6[0x18] + *local_8 + *pfVar6) *
                                 *(float *)((int)local_8[5] + 0x94),
                                 (pfVar6[0x1a] + pfVar6[2] + local_8[2]) *
                                 *(float *)((int)local_8[5] + 0x9c));
            fVar7 = (fVar7 - (float10)pfVar3[1]) / (float10)*(float *)((int)pfVar3[5] + 0x98);
          }
          this = local_8;
          if ((float10)pfVar6[0x19] + (float10)pfVar6[1] < fVar7) {
            *(undefined1 *)(pfVar6 + 0x1e) = 0;
          }
        }
        iVar5 = 0;
        pfVar3 = pfVar6 + 2;
        pfVar4 = local_10;
        do {
          fVar2 = (float)local_18[iVar5];
          *pfVar4 = fVar2 * local_24 + pfVar3[-2] + pfVar6[0x18];
          local_10 = pfVar4 + 0xb;
          pfVar4[1] = fVar2 * local_20 + pfVar3[-1] + pfVar6[0x19];
          fVar1 = *pfVar3;
          pfVar3 = pfVar3 + 3;
          iVar5 = iVar5 + 1;
          pfVar4[2] = fVar2 * local_1c + fVar1 + pfVar6[0x1a];
          pfVar4 = local_10;
        } while (iVar5 < 8);
        pfVar6 = pfVar6 + 0x20;
        param_1 = (float)((int)param_1 + 1);
      } while ((int)param_1 < *(int *)((int)*(float *)((int)this + 0x14) + 0xac) >> 3);
    }
  }
  return;
}


// ==== FUN_0040abcd @ 0040abcd ====

void __thiscall FUN_0040abcd(void *this,int param_1,char param_2)

{
  if (param_1 == 0) {
    if (param_2 == '\0') {
      *(undefined1 *)((int)this + 0x18) = 0;
    }
    else {
      *(undefined1 *)((int)this + 0x18) = 1;
    }
  }
  else {
    *(undefined1 *)((int)this + 0x18) = 2;
  }
  return;
}


// ==== FUN_0040abed @ 0040abed ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040abed(void *this,int param_1,undefined4 param_2,char param_3)

{
  byte *pbVar1;
  void *pvVar2;
  undefined4 *puVar3;
  undefined4 uVar4;
  float *pfVar5;
  undefined4 *puVar6;
  int iVar7;
  int iVar8;
  float *pfVar9;
  uint uVar10;
  int iVar11;
  float10 fVar12;
  longlong lVar13;
  int *piVar14;
  float local_b4 [16];
  undefined1 local_74 [12];
  undefined1 local_68 [12];
  undefined1 local_5c [12];
  undefined1 local_50 [12];
  undefined1 local_44 [12];
  undefined1 local_38 [12];
  undefined1 local_2c [12];
  float local_20;
  float local_1c;
  int local_18;
  void *local_14;
  undefined4 *local_10;
  void *local_c;
  undefined4 *local_8;
  
  iVar11 = 0;
  local_c = (void *)0x0;
  local_14 = (void *)0x0;
  FUN_0040abcd(this,param_1,param_3);
  local_10 = (undefined4 *)FUN_004042e0(*(int *)((int)this + 0x10) << 2);
  puVar3 = local_10;
  if (0 < *(int *)((int)this + 0x10)) {
    do {
      local_8 = puVar3;
      pvVar2 = (void *)FUN_004042e0(0xc);
      if (pvVar2 == (void *)0x0) {
        puVar3 = (undefined4 *)0x0;
      }
      else {
        uVar10 = (uint)(ushort)((-(ushort)(param_1 != 0) & 0xfe80) + 0x200);
        puVar3 = FUN_00402b16(pvVar2,uVar10,uVar10,'\x01');
      }
      iVar11 = iVar11 + 1;
      *local_8 = puVar3;
      puVar3 = local_8 + 1;
      local_8 = local_8 + 1;
    } while (iVar11 < *(int *)((int)this + 0x10));
  }
  *(undefined4 **)(&DAT_0047896c + (uint)*(byte *)((int)this + 0x18) * 4) = local_10;
  puVar3 = (undefined4 *)FUN_004042e0(0x18);
  if (puVar3 == (undefined4 *)0x0) {
    uVar4 = 0;
  }
  else {
    uVar4 = FUN_00405ec9(puVar3);
  }
  *(undefined4 *)((int)this + 0x1c) = uVar4;
  puVar3 = (undefined4 *)FUN_004042e0(0x134);
  if (puVar3 == (undefined4 *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004052a5(puVar3);
  }
  *(undefined4 **)((int)this + 0x20) = puVar3;
  FUN_00405f0e(*(void **)((int)this + 0x1c),(int)puVar3);
  *(undefined4 *)(*(int *)((int)this + 0x1c) + 0x14) = 0x3f3f3f3f;
  if (param_1 == 0) {
    iVar11 = FUN_004042e0(0x28);
    if (iVar11 == 0) {
      local_c = (void *)0x0;
    }
    else {
      local_c = (void *)FUN_00408d5f(iVar11);
    }
    FUN_00409d45(local_c,*(void **)((int)this + 0x1c),(void *)0x0,DAT_00478938,DAT_0047893c,
                 DAT_00478940,DAT_00478938,DAT_0047893c,DAT_00478940,(uint *)0x3f800000,
                 _DAT_00418e5c,_DAT_00418eb0,param_3 == '\0',_DAT_00418200);
  }
  if (param_1 == 1) {
    local_14 = (void *)FUN_004042e0(0x20);
    piVar14 = (int *)0x3f800000;
    pfVar5 = (float *)FUN_00401558(local_2c,0,_DAT_00418f34,0);
    FUN_0040c721(local_14,*(void **)((int)this + 0x1c),(void *)0x0,*pfVar5,pfVar5[1],pfVar5[2],
                 piVar14);
  }
  puVar3 = (undefined4 *)FUN_004042e0(0x128);
  if (puVar3 == (undefined4 *)0x0) {
    local_8 = (undefined4 *)0x0;
  }
  else {
    local_8 = FUN_00405d13(puVar3);
  }
  puVar6 = (undefined4 *)FUN_00401558(local_2c,0,_DAT_00418e78,0);
  puVar3 = local_8;
  local_8[0x22] = *puVar6;
  local_8[0x23] = puVar6[1];
  local_8[0x24] = puVar6[2];
  local_8[0x46] = 0x447a0000;
  local_8[0x47] = 0x3b03126f;
  FUN_00405f0e(*(void **)((int)this + 0x1c),(int)local_8);
  if (param_3 != '\0') {
    puVar3[0x45] = 0;
  }
  local_18 = 1;
  if ((param_1 == 0) && (param_3 == '\0')) {
    local_18 = 10;
  }
  local_8 = (undefined4 *)0x0;
  if (0 < *(int *)((int)this + 0x10)) {
    do {
      FUN_00402b4f((undefined4 *)*local_10);
      _param_3 = 0;
      if (0 < local_18) {
        local_1c = (float)(int)local_8;
        do {
          local_20 = (local_1c / (float)*(int *)((int)this + 0x10)) * (float)_DAT_00418220;
          FUN_0040190f(local_b4);
          pfVar5 = (float *)FUN_00401558(local_2c,0,local_20,0);
          FUN_00402280(local_b4,pfVar5);
          pvVar2 = local_c;
          *(undefined4 *)(*(int *)((int)this + 0x20) + 0xbc) = 0x42b40000;
          *(undefined4 *)(*(int *)((int)this + 0x20) + 200) = 0x3f800000;
          if (param_1 == 0) {
            if (1 < local_18) {
              if (_param_3 == 0) {
                pbVar1 = (byte *)(*(int *)((int)local_c + 0x10) + 200);
                *pbVar1 = *pbVar1 | 2;
              }
              else {
                *(undefined4 *)(*(int *)((int)this + 0x1c) + 0x14) = 0xffffffff;
                pbVar1 = (byte *)(*(int *)((int)local_c + 0x10) + 200);
                *pbVar1 = *pbVar1 & 0xfd;
                uVar4 = 0;
                fVar12 = FUN_00401341();
                pfVar5 = (float *)FUN_00401558(local_44,0,
                                               (float)((fVar12 + fVar12) * (float10)_DAT_00418220),
                                               uVar4);
                FUN_00402280((void *)(*(int *)((int)pvVar2 + 0x14) + 8),pfVar5);
                pbVar1 = (byte *)(*(int *)(*(int *)((int)pvVar2 + 0x14) + 0xc4) + 0xd);
                *pbVar1 = *pbVar1 | 0x10;
                iVar11 = *(int *)(*(int *)((int)pvVar2 + 0x14) + 0xb0);
                iVar7 = *(int *)(*(int *)((int)pvVar2 + 0x14) + 0xac) >> 2;
                if (0 < iVar7) {
                  do {
                    FUN_00401341();
                    lVar13 = FUN_00404224();
                    uVar10 = (uint)lVar13;
                    iVar8 = 4;
                    do {
                      *(uint *)(iVar11 + 0x18) = ((uVar10 | 0xffffff00) << 8 | uVar10) << 8 | uVar10
                      ;
                      iVar11 = iVar11 + 0x2c;
                      iVar8 = iVar8 + -1;
                    } while (iVar8 != 0);
                    iVar7 = iVar7 + -1;
                  } while (iVar7 != 0);
                }
              }
            }
            pfVar5 = local_b4;
            pfVar9 = (float *)FUN_00401558(local_74,0,_DAT_00418e30,_DAT_00418f30);
            puVar3 = FUN_00402a6f(local_5c,pfVar9,pfVar5);
            uVar4 = _DAT_00418e30;
            iVar11 = *(int *)((int)this + 0x20);
            *(undefined4 *)(iVar11 + 0x88) = *puVar3;
            *(undefined4 *)(iVar11 + 0x8c) = puVar3[1];
            *(undefined4 *)(iVar11 + 0x90) = puVar3[2];
            puVar3 = (undefined4 *)FUN_00401558(local_38,0,uVar4,0);
            iVar11 = *(int *)((int)this + 0x20);
            *(undefined4 *)(iVar11 + 0xac) = *puVar3;
            *(undefined4 *)(iVar11 + 0xb0) = puVar3[1];
            *(undefined4 *)(iVar11 + 0xb4) = puVar3[2];
          }
          uVar4 = _DAT_00418f2c;
          if (param_1 == 1) {
            iVar11 = *(int *)((int)this + 0x20);
            pfVar5 = local_b4;
            *(float *)(iVar11 + 0xac) = DAT_00478938;
            *(float *)(iVar11 + 0xb0) = DAT_0047893c;
            *(float *)(iVar11 + 0xb4) = DAT_00478940;
            pfVar9 = (float *)FUN_00401558(local_50,0,0,uVar4);
            puVar3 = FUN_00402a6f(local_68,pfVar9,pfVar5);
            iVar11 = *(int *)((int)this + 0x20);
            *(undefined4 *)(iVar11 + 0x88) = *puVar3;
            *(undefined4 *)(iVar11 + 0x8c) = puVar3[1];
            *(undefined4 *)(iVar11 + 0x90) = puVar3[2];
          }
          FUN_00406004(*(void **)((int)this + 0x1c),0.0);
          _param_3 = _param_3 + 1;
        } while (_param_3 < local_18);
      }
      local_8 = (undefined4 *)((int)local_8 + 1);
      local_10 = local_10 + 1;
    } while ((int)local_8 < *(int *)((int)this + 0x10));
  }
  FUN_00402c72('\x01');
  if (*(void **)((int)this + 0x1c) != (void *)0x0) {
    FUN_0040b094(*(void **)((int)this + 0x1c),1);
  }
  if (local_c != (void *)0x0) {
    FUN_004042eb((int)local_c);
  }
  if (local_14 != (void *)0x0) {
    FUN_004042eb((int)local_14);
  }
  return;
}


// ==== FUN_0040b094 @ 0040b094 ====

int * __thiscall FUN_0040b094(void *this,byte param_1)

{
  FUN_00405edd(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_0040b0b0 @ 0040b0b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040b0b0(void *this,void *param_1,int param_2,void *param_3,int param_4,int param_5,
            float *param_6,float param_7,undefined4 param_8,char param_9)

{
  void *pvVar1;
  undefined4 uVar2;
  float *pfVar3;
  undefined4 *puVar4;
  undefined1 *puVar5;
  float *pfVar6;
  float *pfVar7;
  undefined4 *puVar8;
  int iVar9;
  float10 fVar10;
  longlong lVar11;
  longlong lVar12;
  short sVar13;
  undefined1 local_25c [12];
  undefined1 local_250 [12];
  undefined1 local_244 [12];
  undefined1 local_238 [12];
  undefined1 local_22c [12];
  undefined1 local_220 [12];
  undefined1 local_214 [12];
  undefined1 local_208 [12];
  undefined1 local_1fc [12];
  undefined1 local_1f0 [12];
  undefined1 local_1e4 [12];
  undefined1 local_1d8 [12];
  undefined1 local_1cc [12];
  undefined1 local_1c0 [12];
  undefined1 local_1b4 [12];
  undefined1 local_1a8 [12];
  undefined1 local_19c [12];
  undefined1 local_190 [12];
  undefined1 local_184 [12];
  undefined1 local_178 [12];
  undefined1 local_16c [12];
  undefined1 local_160 [12];
  undefined1 local_154 [12];
  undefined1 local_148 [12];
  undefined1 local_13c [12];
  undefined1 local_130 [12];
  undefined1 local_124 [12];
  undefined1 local_118 [12];
  undefined1 local_10c [12];
  undefined1 local_100 [12];
  undefined1 local_f4 [12];
  undefined1 local_e8 [12];
  undefined1 local_dc [12];
  undefined1 local_d0 [12];
  undefined1 local_c4 [12];
  undefined1 local_b8 [12];
  undefined1 local_ac [12];
  float local_a0 [16];
  float local_60;
  float local_5c;
  int local_58;
  float local_54;
  float local_50;
  int local_4c;
  float *local_48;
  void *local_44;
  float local_40;
  int local_3c;
  float *local_38;
  int local_34;
  int local_30;
  int local_2c;
  float local_28;
  float local_24;
  float local_20;
  float local_1c;
  uint local_18;
  float local_14;
  undefined4 local_10;
  undefined4 local_c;
  undefined4 local_8;
  
  local_44 = this;
  FUN_004010dc();
  *(float *)((int)this + 4) = param_7;
  *(int *)((int)this + 8) = param_4;
  *(int *)this = param_2;
  *(int *)((int)this + 0x10) = param_5;
  if (DAT_00478968 == '\0') {
    DAT_00478968 = '\x01';
    FUN_0040abed(this,0,_DAT_00418e5c,'\0');
    FUN_0040abed(this,0,_DAT_00418e5c,'\x01');
    FUN_0040abed(this,1,_DAT_00418e5c,'\0');
  }
  FUN_0040abcd(this,param_2,param_9);
  if (param_2 == 1) {
    pvVar1 = (void *)FUN_004042e0(param_4 * param_5 * 0x60);
    if (pvVar1 == (void *)0x0) {
      pvVar1 = (void *)0x0;
    }
    else {
      _vector_constructor_iterator_(pvVar1,0xc,param_4 * param_5 * 8,FUN_00401555);
    }
    *(void **)((int)this + 0x24) = pvVar1;
    uVar2 = FUN_004042e0(param_4 << 5);
    *(undefined4 *)((int)this + 0x28) = uVar2;
    pvVar1 = (void *)FUN_004042e0(param_4 * 0x60);
    if (pvVar1 == (void *)0x0) {
      pvVar1 = (void *)0x0;
    }
    else {
      _vector_constructor_iterator_(pvVar1,0xc,param_4 * 8,FUN_00401555);
    }
    iVar9 = 0;
    *(void **)((int)this + 0x2c) = pvVar1;
    if (0 < param_4) {
      do {
        fVar10 = FUN_00401341();
        *(float *)(*(int *)((int)this + 0x28) + iVar9 * 4) =
             (float)(fVar10 * (float10)_DAT_00418f18);
        iVar9 = iVar9 + 1;
      } while (iVar9 < param_4);
    }
  }
  _param_9 = *(undefined4 **)((int)this + 0x24);
  *(undefined4 *)((int)this + 0xc) = 0;
  uVar2 = FUN_004042e0(param_5 << 2);
  *(undefined4 *)((int)this + 0x14) = uVar2;
  pfVar3 = (float *)FUN_004042e0(param_4 << 2);
  local_48 = pfVar3;
  if (0 < param_4) {
    local_2c = param_4;
    do {
      fVar10 = FUN_00401341();
      *pfVar3 = (float)(fVar10 * (float10)_DAT_00418f18);
      pfVar3 = pfVar3 + 1;
      local_2c = local_2c + -1;
    } while (local_2c != 0);
  }
  local_58 = *(int *)(&DAT_0047896c + (uint)*(byte *)((int)this + 0x18) * 4);
  local_30 = 0;
  if (0 < param_5) {
    local_5c = (float)param_5;
    do {
      iVar9 = local_30;
      if (param_2 == 0) {
        pvVar1 = (void *)FUN_004042e0(0xcc);
        if (pvVar1 == (void *)0x0) {
          puVar4 = (undefined4 *)0x0;
        }
        else {
          puVar4 = FUN_004042f6(pvVar1,param_4 << 2,param_4 * 2,0);
        }
        *(undefined4 **)(*(int *)((int)this + 0x14) + iVar9 * 4) = puVar4;
        pvVar1 = (void *)FUN_004042e0(0x2c);
        if (pvVar1 == (void *)0x0) {
          puVar5 = (undefined1 *)0x0;
        }
        else {
          puVar5 = FUN_00401ca8(pvVar1,*(int *)(local_58 + iVar9 * 4),0,0x1310);
        }
        FUN_004045dd(*(void **)(*(int *)((int)this + 0x14) + iVar9 * 4),(int)puVar5);
      }
      if (param_2 == 1) {
        pvVar1 = (void *)FUN_004042e0(0xcc);
        if (pvVar1 == (void *)0x0) {
          puVar4 = (undefined4 *)0x0;
        }
        else {
          puVar4 = FUN_004042f6(pvVar1,param_4 << 3,param_4 << 2,0);
        }
        iVar9 = iVar9 * 4;
        *(undefined4 **)(iVar9 + *(int *)((int)this + 0x14)) = puVar4;
        pvVar1 = (void *)FUN_004042e0(0x2c);
        if (pvVar1 == (void *)0x0) {
          puVar5 = (undefined1 *)0x0;
        }
        else {
          puVar5 = FUN_00401ca8(pvVar1,*(int *)(iVar9 + local_58),0,0x1310);
        }
        FUN_004045dd(*(void **)(iVar9 + *(int *)((int)this + 0x14)),(int)puVar5);
        *(undefined1 *)(*(int *)(*(int *)(iVar9 + *(int *)((int)this + 0x14)) + 0xc4) + 0x14) = 0x20
        ;
        iVar9 = local_30;
      }
      iVar9 = *(int *)(*(int *)((int)this + 0x14) + iVar9 * 4);
      puVar4 = *(undefined4 **)(iVar9 + 0xb0);
      local_3c = *(int *)(iVar9 + 0xb8);
      local_60 = ((float)local_30 / local_5c) * (float)_DAT_00418220;
      FUN_00401555(&local_10);
      FUN_00401555(&local_28);
      local_18 = 0xffffffff;
      local_28 = DAT_00478938;
      local_24 = DAT_0047893c;
      local_20 = DAT_00478940;
      if (0 < param_4) {
        local_2c = 0;
        local_34 = 0;
        local_38 = param_6;
        local_4c = param_4;
        do {
          FUN_0040190f(local_a0);
          pfVar3 = (float *)FUN_00401558(local_118,0,local_60 + *(float *)(local_34 + (int)local_48)
                                         ,0);
          FUN_00402280(local_a0,pfVar3);
          if (param_6 != (float *)0x0) {
            local_28 = *local_38;
            local_24 = local_38[1];
            local_20 = local_38[2];
          }
          if (param_3 == (void *)0x0) {
LAB_0040b474:
            if (param_2 == 0) {
              local_14 = param_7 + param_7;
              pfVar3 = &local_28;
              pfVar7 = local_a0;
              local_1c = -param_7;
              pfVar6 = (float *)FUN_00401558(local_25c,local_1c,local_14,0);
              pfVar7 = FUN_00402a6f(local_190,pfVar6,pfVar7);
              puVar8 = FUN_0040523d(local_d0,pfVar7,pfVar3);
              local_10 = *puVar8;
              local_c = puVar8[1];
              local_8 = puVar8[2];
              *puVar4 = local_10;
              puVar4[1] = local_c;
              puVar4[7] = 0;
              puVar4[2] = local_8;
              pfVar3 = &local_28;
              pfVar7 = local_a0;
              puVar4[8] = 0;
              puVar4[6] = 0xffffffff;
              pfVar6 = (float *)FUN_00401558(local_250,param_7,local_14,0);
              pfVar7 = FUN_00402a6f(local_e8,pfVar6,pfVar7);
              puVar8 = FUN_0040523d(local_1a8,pfVar7,pfVar3);
              local_10 = *puVar8;
              local_c = puVar8[1];
              local_8 = puVar8[2];
              puVar4[0xb] = local_10;
              puVar4[0xc] = local_c;
              puVar4[0xd] = local_8;
              puVar4[0x12] = 0x3f800000;
              pfVar3 = &local_28;
              puVar4[0x11] = 0xffffffff;
              pfVar7 = local_a0;
              puVar4[0x13] = 0;
              pfVar6 = (float *)FUN_00401558(local_100,param_7,0,0);
              pfVar7 = FUN_00402a6f(local_208,pfVar6,pfVar7);
              puVar8 = FUN_0040523d(local_ac,pfVar7,pfVar3);
              local_10 = *puVar8;
              local_c = puVar8[1];
              local_8 = puVar8[2];
              puVar4[0x16] = local_10;
              puVar4[0x17] = local_c;
              puVar4[0x18] = local_8;
              puVar4[0x1d] = 0x3f800000;
              puVar4[0x1c] = local_18;
              pfVar3 = &local_28;
              pfVar7 = local_a0;
              puVar4[0x1e] = 0x3f666666;
              pfVar6 = (float *)FUN_00401558(local_1c0,local_1c,0,0);
              pfVar7 = FUN_00402a6f(local_130,pfVar6,pfVar7);
              puVar8 = FUN_0040523d(local_238,pfVar7,pfVar3);
              local_10 = *puVar8;
              local_c = puVar8[1];
              local_8 = puVar8[2];
              puVar4[0x21] = local_10;
              puVar4[0x22] = local_c;
              puVar4[0x28] = 0;
              puVar4[0x23] = local_8;
              puVar4[0x27] = local_18;
              puVar4[0x29] = 0x3f666666;
              puVar4 = puVar4 + 0x2c;
              FUN_00409ca6(&local_3c,(short)local_34,0x418edc);
            }
          }
          else {
            fVar10 = FUN_0040e8d2(param_3,local_28,local_20);
            local_24 = (float)(fVar10 + (float10)local_24);
            FUN_0040e8fb(param_3,local_28,local_20);
            lVar11 = FUN_00404224();
            local_18 = (uint)lVar11;
            local_18 = ((local_18 | 0xffffff00) << 8 | local_18) << 8 | local_18;
            if (param_2 == 0) {
              local_40 = local_28;
              local_54 = local_20;
              FUN_0040e842(param_3,&local_40,&local_54);
              lVar11 = FUN_00404224();
              lVar12 = FUN_00404224();
              *(undefined4 *)
               (*(int *)((int)param_3 + 0x44) + ((int)lVar11 * 0x200 + (int)lVar12) * 4) = 0;
              goto LAB_0040b474;
            }
          }
          if (param_2 == 1) {
            local_14 = param_7 * _DAT_00418f3c;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            local_1c = -param_7;
            pfVar6 = (float *)FUN_00401558(local_148,local_1c,local_14,0);
            pfVar7 = FUN_00402a6f(local_1d8,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_160,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            *_param_9 = local_10;
            _param_9[1] = local_c;
            _param_9[2] = local_8;
            *puVar4 = local_10;
            puVar4[1] = local_c;
            puVar4[7] = 0;
            puVar4[2] = local_8;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            puVar4[8] = 0;
            puVar4[6] = 0xffffffff;
            pfVar6 = (float *)FUN_00401558(local_220,param_7,local_14,0);
            pfVar7 = FUN_00402a6f(local_178,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_1f0,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[3] = local_10;
            _param_9[4] = local_c;
            _param_9[5] = local_8;
            puVar4[0xb] = local_10;
            puVar4[0xc] = local_c;
            puVar4[0x12] = 0x3f800000;
            puVar4[0xd] = local_8;
            pfVar3 = &local_28;
            puVar4[0x13] = 0;
            local_14 = param_7 + param_7;
            pfVar7 = local_a0;
            puVar4[0x11] = 0xffffffff;
            pfVar6 = (float *)FUN_00401558(local_b8,param_7,local_14,0);
            pfVar7 = FUN_00402a6f(local_c4,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_dc,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[6] = local_10;
            _param_9[7] = local_c;
            _param_9[8] = local_8;
            puVar4[0x16] = local_10;
            puVar4[0x17] = local_c;
            puVar4[0x18] = local_8;
            puVar4[0x1d] = 0x3f800000;
            puVar4[0x1c] = local_18;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            puVar4[0x1e] = 0x3f4ccccd;
            pfVar6 = (float *)FUN_00401558(local_f4,local_1c,local_14,0);
            pfVar7 = FUN_00402a6f(local_10c,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_124,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[9] = local_10;
            _param_9[10] = local_c;
            _param_9[0xb] = local_8;
            puVar4[0x21] = local_10;
            puVar4[0x22] = local_c;
            puVar4[0x28] = 0;
            local_50 = param_7 * _DAT_00418f38;
            puVar4[0x23] = local_8;
            puVar4[0x27] = local_18;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            puVar4[0x29] = 0x3f4ccccd;
            pfVar6 = (float *)FUN_00401558(local_13c,local_50,local_14,0);
            pfVar7 = FUN_00402a6f(local_154,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_16c,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_1c = param_7 * _DAT_00418ea4;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[0xc] = local_10;
            _param_9[0xd] = local_c;
            _param_9[0xe] = local_8;
            puVar4[0x2c] = local_10;
            puVar4[0x2d] = local_c;
            puVar4[0x2e] = local_8;
            puVar4[0x33] = 0x3ef0a3d7;
            puVar4[0x34] = 0x3f59999a;
            puVar4[0x32] = local_18;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            pfVar6 = (float *)FUN_00401558(local_184,local_1c,local_14,0);
            pfVar7 = FUN_00402a6f(local_19c,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_1b4,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[0xf] = local_10;
            _param_9[0x10] = local_c;
            _param_9[0x11] = local_8;
            puVar4[0x37] = local_10;
            puVar4[0x38] = local_c;
            puVar4[0x39] = local_8;
            puVar4[0x3d] = local_18;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            puVar4[0x3e] = 0x3f07ae14;
            puVar4[0x3f] = 0x3f59999a;
            pfVar6 = (float *)FUN_00401558(local_1cc,local_1c,0,0);
            pfVar7 = FUN_00402a6f(local_1e4,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_1fc,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[0x12] = local_10;
            _param_9[0x13] = local_c;
            _param_9[0x14] = local_8;
            puVar4[0x42] = local_10;
            puVar4[0x43] = local_c;
            puVar4[0x44] = local_8;
            puVar4[0x48] = local_18;
            pfVar3 = &local_28;
            pfVar7 = local_a0;
            puVar4[0x4a] = 0x3f800000;
            puVar4[0x49] = 0x3f07ae14;
            pfVar6 = (float *)FUN_00401558(local_214,local_50,0,0);
            pfVar7 = FUN_00402a6f(local_22c,pfVar6,pfVar7);
            puVar8 = FUN_0040523d(local_244,pfVar7,pfVar3);
            local_10 = *puVar8;
            local_c = puVar8[1];
            local_8 = puVar8[2];
            _param_9[0x15] = local_10;
            _param_9[0x16] = local_c;
            _param_9[0x17] = local_8;
            puVar4[0x4d] = local_10;
            puVar4[0x4e] = local_c;
            puVar4[0x55] = 0x3f800000;
            puVar4[0x4f] = local_8;
            puVar4[0x53] = local_18;
            puVar4[0x54] = 0x3ef0a3d7;
            puVar4 = puVar4 + 0x58;
            sVar13 = (short)local_2c;
            FUN_00409ca6(&local_3c,sVar13,0x418edc);
            FUN_00409ca6(&local_3c,sVar13 + 4,0x418edc);
            _param_9 = _param_9 + 0x18;
          }
          local_38 = local_38 + 3;
          local_34 = local_34 + 4;
          local_2c = local_2c + 8;
          local_4c = local_4c + -1;
        } while (local_4c != 0);
      }
      iVar9 = local_30;
      pvVar1 = local_44;
      FUN_004045f1(*(int *)(*(int *)((int)local_44 + 0x14) + local_30 * 4));
      FUN_00405f0e(param_1,*(int *)(*(int *)((int)pvVar1 + 0x14) + iVar9 * 4));
      local_30 = iVar9 + 1;
      this = local_44;
    } while (local_30 < param_5);
  }
  if ((param_2 == 0) && (param_3 != (void *)0x0)) {
    FUN_00403e48(*(uint **)((int)param_3 + 0x38));
  }
  FUN_004042eb((int)local_48);
  return;
}


// ==== FUN_0040bb14 @ 0040bb14 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040bb14(void *this,float *param_1)

{
  float *pfVar1;
  undefined4 *puVar2;
  int iVar3;
  undefined4 *puVar4;
  float10 fVar5;
  undefined4 uVar6;
  float fVar7;
  undefined1 local_30 [12];
  undefined4 local_24;
  undefined4 local_20;
  undefined4 local_1c;
  int local_18;
  float local_14;
  float *local_10;
  undefined4 *local_c;
  int local_8;
  
  *(float *)((int)this + 0xc) = (float)param_1 + *(float *)((int)this + 0xc);
  if (*(int *)this == 1) {
    local_14 = *(float *)((int)this + 4) * _DAT_004170d4;
    local_8 = 0;
    if (0 < *(int *)((int)this + 8)) {
      local_c = (undefined4 *)0x0;
      do {
        iVar3 = local_8 * 4;
        pfVar1 = (float *)(*(int *)((int)this + 0x28) + iVar3);
        *pfVar1 = (float)param_1 + *pfVar1;
        fVar5 = FUN_004041ee(*(float *)(iVar3 + *(int *)((int)this + 0x28)) * _DAT_00418f40);
        fVar7 = (float)(fVar5 * (float10)local_14);
        uVar6 = 0;
        fVar5 = FUN_004041dd(*(float *)(iVar3 + *(int *)((int)this + 0x28)));
        puVar2 = (undefined4 *)FUN_00401558(local_30,(float)(fVar5 * (float10)local_14),uVar6,fVar7)
        ;
        puVar4 = (undefined4 *)(*(int *)((int)this + 0x2c) + (int)local_c);
        local_8 = local_8 + 1;
        local_c = (undefined4 *)((int)local_c + 0xc);
        *puVar4 = *puVar2;
        puVar4[1] = puVar2[1];
        puVar4[2] = puVar2[2];
      } while (local_8 < *(int *)((int)this + 8));
    }
    param_1 = *(float **)((int)this + 0x24);
    FUN_00401555(&local_24);
    local_8 = 0;
    if (0 < *(int *)((int)this + 0x10)) {
      do {
        local_14 = 0.0;
        local_c = *(undefined4 **)(*(int *)(*(int *)((int)this + 0x14) + local_8 * 4) + 0xb0);
        local_10 = *(float **)((int)this + 0x2c);
        if (0 < *(int *)((int)this + 8)) {
          do {
            local_18 = 6;
            pfVar1 = param_1;
            puVar2 = local_c;
            do {
              local_c = puVar2;
              param_1 = pfVar1;
              puVar2 = FUN_0040523d(local_30,param_1,local_10);
              local_24 = *puVar2;
              local_20 = puVar2[1];
              local_1c = puVar2[2];
              *local_c = local_24;
              local_c[1] = local_20;
              local_c[2] = local_1c;
              local_18 = local_18 + -1;
              pfVar1 = param_1 + 3;
              puVar2 = local_c + 0xb;
            } while (local_18 != 0);
            local_c = local_c + 0x21;
            param_1 = param_1 + 9;
            local_10 = local_10 + 3;
            local_14 = (float)((int)local_14 + 1);
          } while ((int)local_14 < *(int *)((int)this + 8));
        }
        local_8 = local_8 + 1;
      } while (local_8 < *(int *)((int)this + 0x10));
    }
  }
  return;
}


// ==== FUN_0040bc63 @ 0040bc63 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040bc63(void *this,void *param_1,float param_2,float param_3,int param_4,undefined4 *param_5,
            int param_6,undefined4 *param_7)

{
  int *piVar1;
  float fVar2;
  void *pvVar3;
  uint *puVar4;
  undefined4 *puVar5;
  undefined4 uVar6;
  undefined1 *puVar7;
  float *pfVar8;
  float *pfVar9;
  int iVar10;
  float10 fVar11;
  undefined1 local_34 [12];
  int local_28;
  float local_24;
  float local_20;
  float local_1c;
  float local_18;
  int local_14;
  float local_10;
  float local_c;
  int *local_8;
  
  FUN_004010dc();
  *(undefined4 *)((int)this + 0x1c) = 0;
  local_8 = (int *)FUN_004042e0(0x40000);
  FUN_00416036(2,0x100,0x100,local_8);
  pvVar3 = (void *)FUN_004042e0(0x18);
  if (pvVar3 == (void *)0x0) {
    puVar4 = (uint *)0x0;
  }
  else {
    puVar4 = FUN_00403dd3(pvVar3,(uint)local_8,0x100,0x100,'\0','\0');
  }
  *(uint **)((int)this + 0xc) = puVar4;
  FUN_004042eb((int)local_8);
  local_1c = (param_2 * param_3) / (float)(int)param_5;
  *(int *)this = param_4;
  *(undefined4 **)((int)this + 4) = param_5;
  *(int *)((int)this + 8) = param_6;
  pvVar3 = (void *)FUN_004042e0(0xcc);
  if (pvVar3 == (void *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    puVar5 = FUN_004042f6(pvVar3,0x8000,0x8000,0);
  }
  *(undefined4 **)((int)this + 0x18) = puVar5;
  puVar5[0x2b] = 0;
  local_8 = (int *)0x0;
  *(undefined4 *)(*(int *)((int)this + 0x18) + 0xb4) = 0;
  pfVar9 = *(float **)(*(int *)((int)this + 0x18) + 0xb0);
  local_28 = *(int *)(*(int *)((int)this + 0x18) + 0xb8);
  if (0 < (int)param_5) {
    local_14 = (int)param_5 + -1;
    local_18 = (float)local_14;
    do {
      param_3 = 0.0;
      fVar2 = (float)(int)local_8 / local_18;
      local_10 = (_DAT_00418f44 - fVar2 * fVar2 * fVar2) * _DAT_00418ef8 * param_2;
      if (0 < param_6) {
        local_20 = (float)param_6;
        local_24 = (float)(int)local_8 * local_1c;
        pfVar8 = pfVar9;
        do {
          local_c = ((float)(int)param_3 / local_20) * (float)_DAT_00418f18;
          fVar11 = FUN_004041dd(local_c);
          *pfVar8 = (float)(fVar11 * (float10)local_10);
          fVar11 = FUN_004041ee(local_c);
          pfVar8[1] = local_24;
          pfVar9 = pfVar8 + 0xb;
          pfVar8[2] = (float)(fVar11 * (float10)local_10);
          piVar1 = (int *)(*(int *)((int)this + 0x18) + 0xac);
          *piVar1 = *piVar1 + 1;
          if ((int)local_8 < local_14) {
            FUN_00409ccd(&local_28,0,(int)param_3,param_6,(short)local_8);
            piVar1 = (int *)(*(int *)((int)this + 0x18) + 0xb4);
            *piVar1 = *piVar1 + 2;
          }
          param_3 = (float)((int)param_3 + 1);
          pfVar8 = pfVar9;
        } while ((int)param_3 < param_6);
      }
      local_8 = (int *)((int)local_8 + 1);
    } while ((int)local_8 < (int)param_5);
  }
  FUN_0040449f(*(int *)((int)this + 0x18));
  FUN_004045f1(*(int *)((int)this + 0x18));
  uVar6 = FUN_004042e0(param_4 << 2);
  *(undefined4 *)((int)this + 0x14) = uVar6;
  uVar6 = FUN_004042e0(param_4 << 3);
  *(undefined4 *)((int)this + 0x10) = uVar6;
  param_6 = 0;
  if (0 < param_4) {
    param_5 = param_7;
    do {
      pvVar3 = (void *)FUN_004042e0(0xcc);
      if (pvVar3 == (void *)0x0) {
        puVar5 = (undefined4 *)0x0;
      }
      else {
        puVar5 = FUN_004042f6(pvVar3,*(int *)(*(int *)((int)this + 0x18) + 0xac),
                              *(int *)(*(int *)((int)this + 0x18) + 0xb4),0);
      }
      *(undefined4 **)(*(int *)((int)this + 0x14) + param_6 * 4) = puVar5;
      FUN_004042b5(*(int *)(*(int *)(*(int *)((int)this + 0x14) + param_6 * 4) + 0xb0),
                   *(int *)(*(int *)((int)this + 0x18) + 0xb0),
                   *(int *)(*(int *)((int)this + 0x18) + 0xac) * 0x2c);
      FUN_004042b5(*(int *)(*(int *)(*(int *)((int)this + 0x14) + param_6 * 4) + 0xbc),
                   *(int *)(*(int *)((int)this + 0x18) + 0xbc),
                   *(int *)(*(int *)((int)this + 0x18) + 0xac) << 2);
      FUN_004042b5(*(int *)(*(int *)(*(int *)((int)this + 0x14) + param_6 * 4) + 0xb8),
                   *(int *)(*(int *)((int)this + 0x18) + 0xb8),
                   *(int *)(*(int *)((int)this + 0x18) + 0xb4) * 6);
      FUN_004042b5(*(int *)(*(int *)(*(int *)((int)this + 0x14) + param_6 * 4) + 0xc0),
                   *(int *)(*(int *)((int)this + 0x18) + 0xc0),
                   *(int *)(*(int *)((int)this + 0x18) + 0xb4) * 0xc);
      pvVar3 = (void *)FUN_004042e0(0x2c);
      if (pvVar3 == (void *)0x0) {
        puVar7 = (undefined1 *)0x0;
      }
      else {
        puVar7 = FUN_00401c67(pvVar3,*(int *)((int)this + 0xc),0,0x20);
      }
      FUN_004045dd(*(void **)(*(int *)((int)this + 0x14) + param_6 * 4),(int)puVar7);
      FUN_00405f0e(param_1,*(int *)(*(int *)((int)this + 0x14) + param_6 * 4));
      uVar6 = _DAT_00418e28;
      iVar10 = *(int *)(*(int *)((int)this + 0x14) + param_6 * 4);
      *(undefined4 *)(iVar10 + 0x88) = *param_5;
      *(undefined4 *)(iVar10 + 0x8c) = param_5[1];
      *(undefined4 *)(iVar10 + 0x90) = param_5[2];
      puVar5 = (undefined4 *)FUN_00401558(local_34,0x3f800000,uVar6,0x3f800000);
      iVar10 = *(int *)(*(int *)((int)this + 0x14) + param_6 * 4);
      *(undefined4 *)(iVar10 + 0x94) = *puVar5;
      *(undefined4 *)(iVar10 + 0x98) = puVar5[1];
      *(undefined4 *)(iVar10 + 0x9c) = puVar5[2];
      iVar10 = param_6 * 8;
      fVar11 = FUN_00401341();
      param_6 = param_6 + 1;
      param_5 = param_5 + 3;
      *(float *)(iVar10 + *(int *)((int)this + 0x10)) = (float)(fVar11 * (float10)_DAT_00418268);
      *(undefined4 *)(iVar10 + 4 + *(int *)((int)this + 0x10)) = 0;
    } while (param_6 < param_4);
  }
  *(undefined1 *)((int)this + 0x20) = 0;
  return;
}


// ==== FUN_0040bfc1 @ 0040bfc1 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040bfc1(void *this,float param_1)

{
  int iVar1;
  float fVar2;
  undefined4 *puVar3;
  undefined4 *puVar4;
  float *pfVar5;
  float10 fVar6;
  undefined1 local_4c [12];
  undefined1 local_40 [12];
  float local_34 [4];
  undefined4 local_24;
  undefined4 local_20;
  float local_1c;
  undefined4 *local_18;
  float local_14;
  float *local_10;
  undefined4 *local_c;
  int local_8;
  
  fVar2 = param_1;
  param_1 = 0.0;
  pfVar5 = *(float **)((int)this + 0x10);
  *(float *)((int)this + 0x1c) = fVar2 + *(float *)((int)this + 0x1c);
  if (0 < *(int *)this) {
    do {
      if (*(char *)((int)this + 0x20) != '\0') {
        *pfVar5 = *pfVar5 - *(float *)((int)this + 0x1c);
      }
      local_10 = pfVar5;
      if (*pfVar5 < _DAT_004170c8) {
        fVar2 = *(float *)((int)this + 0x1c) * _DAT_00418260 + pfVar5[1];
        pfVar5[1] = fVar2;
        if (fVar2 <= _DAT_004170c4) {
          puVar4 = *(undefined4 **)(*(int *)((int)this + 0x18) + 0xb0);
          local_18 = *(undefined4 **)
                      (*(int *)(*(int *)((int)this + 0x14) + (int)param_1 * 4) + 0xb0);
          local_c = puVar4;
          FUN_00401555(local_34 + 3);
          FUN_00401555(local_34);
          local_8 = 0;
          local_34[1] = 0.0;
          if (0 < *(int *)((int)this + 4)) {
            local_1c = (float)(int)param_1;
            do {
              local_14 = local_1c +
                         *(float *)((int)this + 0x1c) * _DAT_00418e5c +
                         (float)local_8 * _DAT_004170d4;
              fVar6 = FUN_004041dd(local_14);
              local_34[0] = (float)(fVar6 * (float10)_DAT_00418ef8 * (float10)_DAT_00418f4c);
              fVar6 = FUN_004041ee(local_14 * _DAT_00418f48);
              local_34[2] = (float)(fVar6 * (float10)_DAT_00418ef8 * (float10)_DAT_00418f4c);
              if (local_8 == 0) {
                local_34[2] = 0.0;
                local_34[0] = 0.0;
              }
              local_14 = 0.0;
              if (0 < *(int *)((int)this + 8)) {
                do {
                  local_34[3] = (float)*puVar4;
                  local_24 = puVar4[1];
                  local_20 = puVar4[2];
                  puVar3 = FUN_0040523d(local_40,local_34 + 3,local_34);
                  local_34[3] = (float)*puVar3;
                  puVar4 = local_c + 0xb;
                  local_24 = puVar3[1];
                  local_20 = puVar3[2];
                  *local_18 = local_34[3];
                  local_18[1] = local_24;
                  local_18[2] = local_20;
                  local_18 = local_18 + 0xb;
                  local_14 = (float)((int)local_14 + 1);
                  pfVar5 = local_10;
                  local_c = puVar4;
                } while ((int)local_14 < *(int *)((int)this + 8));
              }
              local_8 = local_8 + 1;
            } while (local_8 < *(int *)((int)this + 4));
          }
          FUN_004045f1(*(int *)(*(int *)((int)this + 0x14) + (int)param_1 * 4));
        }
        else {
          pfVar5[1] = 1.0;
        }
        puVar4 = (undefined4 *)FUN_00401558(local_4c,0x3f800000,pfVar5[1],0x3f800000);
        iVar1 = *(int *)(*(int *)((int)this + 0x14) + (int)param_1 * 4);
        *(undefined4 *)(iVar1 + 0x94) = *puVar4;
        *(undefined4 *)(iVar1 + 0x98) = puVar4[1];
        *(undefined4 *)(iVar1 + 0x9c) = puVar4[2];
        *local_10 = 0.0;
      }
      pfVar5 = local_10 + 2;
      param_1 = (float)((int)param_1 + 1);
    } while ((int)param_1 < *(int *)this);
  }
  return;
}


// ==== FUN_0040c1b2 @ 0040c1b2 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040c1b2(void *this,undefined4 param_1,void *param_2,undefined4 param_3,float param_4,
            undefined4 param_5,void *param_6,float param_7,float param_8,float param_9,
            uint *param_10)

{
  short sVar1;
  void *pvVar2;
  undefined4 *puVar3;
  float *pfVar4;
  float *pfVar5;
  float *pfVar6;
  int iVar7;
  uint *puVar8;
  uint *puVar9;
  undefined1 *puVar10;
  uint uVar11;
  short *psVar12;
  float fVar13;
  float10 fVar14;
  longlong lVar15;
  longlong lVar16;
  float fVar17;
  float fVar18;
  undefined1 local_108 [12];
  undefined1 local_fc [12];
  undefined1 local_f0 [12];
  undefined1 local_e4 [12];
  undefined1 local_d8 [12];
  undefined1 local_cc [12];
  undefined1 local_c0 [12];
  undefined1 local_b4 [12];
  undefined1 local_a8 [12];
  float local_9c [16];
  float local_5c;
  float fStack_58;
  float fStack_54;
  float local_50;
  float fStack_4c;
  float fStack_48;
  float local_44;
  float local_40;
  float local_3c;
  float local_38;
  int local_34;
  void *local_30;
  float local_2c [2];
  float local_24;
  float local_20;
  int local_1c;
  float *local_18;
  int local_14;
  int local_10;
  float local_c;
  float local_8;
  
  local_30 = this;
  FUN_004010dc();
  puVar8 = param_10;
  fVar17 = param_9;
  *(void **)this = param_6;
  *(uint **)((int)this + 4) = param_10;
  *(undefined4 *)((int)this + 0x10) = 0;
  *(float *)((int)this + 8) = param_9;
  pvVar2 = (void *)FUN_004042e0(0xcc);
  if (pvVar2 == (void *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004042f6(pvVar2,(int)fVar17 * (int)puVar8 * 8,((int)puVar8 + -1) * (int)fVar17 * 4,
                          0);
  }
  local_14 = 0;
  *(undefined4 **)((int)this + 0xc) = puVar3;
  local_18 = (float *)puVar3[0x2c];
  psVar12 = (short *)puVar3[0x2e];
  if (0 < (int)fVar17) {
    local_34 = (int)fVar17 >> 1;
    local_20 = -(float)param_6;
    local_10 = local_34 + -1;
    local_1c = 0;
    local_38 = (float)local_10;
    do {
      iVar7 = local_34;
      FUN_00401558(&local_5c,0,0,local_20);
      FUN_00401558(&local_50,0,0,param_6);
      FUN_0040190f(local_9c);
      local_10 = local_14 % iVar7;
      local_c = (float)local_10 / local_38;
      if (local_14 < iVar7) {
        FUN_00402280(local_9c,(float *)&DAT_00478938);
        fVar18 = 0.0;
        puVar10 = local_108;
        fVar17 = local_c * (float)param_6 + local_c * (float)param_6 + local_20;
      }
      else {
        pfVar4 = (float *)FUN_00401558(local_a8,0,_DAT_00418f58,0);
        FUN_00402280(local_9c,pfVar4);
        fVar18 = local_c * (float)param_6 + local_c * (float)param_6 + local_20;
        puVar10 = local_e4;
        fVar17 = 0.0;
      }
      puVar3 = (undefined4 *)FUN_00401558(puVar10,fVar17,0,fVar18);
      FUN_004022ff(local_9c,puVar3);
      pfVar4 = FUN_00402a6f(local_cc,&local_5c,local_9c);
      local_5c = *pfVar4;
      fStack_58 = pfVar4[1];
      fStack_54 = pfVar4[2];
      pfVar4 = FUN_00402a6f(local_fc,&local_50,local_9c);
      local_50 = *pfVar4;
      fStack_4c = pfVar4[1];
      fStack_48 = pfVar4[2];
      local_8 = 0.0;
      if (0 < (int)param_10) {
        local_10 = (int)param_10 + -1;
        local_40 = (float)local_10;
        local_3c = param_7 * _DAT_00418f54;
        do {
          fVar17 = local_8;
          pfVar4 = (float *)&param_3;
          local_c = (float)(int)local_8 / local_40;
          local_8 = 1.0 - local_c;
          pfVar5 = FUN_0040268c(local_b4,&local_50,&local_c);
          pfVar6 = FUN_0040268c(local_c0,&local_5c,&local_8);
          pfVar5 = FUN_0040523d(local_d8,pfVar6,pfVar5);
          FUN_0040523d(local_2c,pfVar5,pfVar4);
          fVar14 = FUN_0040e8d2(param_2,local_2c[0],local_24);
          local_8 = (float)(fVar14 + (float10)param_4);
          fVar14 = FUN_00401341();
          local_44 = (float)((float10)local_8 + (float10)param_7 + fVar14 * (float10)local_3c);
          FUN_0040e8fb(param_2,local_2c[0],local_24);
          lVar15 = FUN_00404224();
          uVar11 = (uint)lVar15;
          pfVar4 = (float *)FUN_00401558(local_f0,local_2c[0],0,local_24);
          FUN_00408c11(&param_3,pfVar4);
          lVar15 = FUN_00404224();
          iVar7 = (int)lVar15;
          if (iVar7 < 0) {
            iVar7 = 0;
          }
          fVar18 = local_c * param_8;
          fVar13 = (float)(uVar11 | (uVar11 << 8 | uVar11) << 8 | iVar7 << 0x18);
          local_c = 2.8026e-45;
          do {
            local_18[7] = fVar18;
            local_18[2] = local_24;
            local_18[1] = local_8;
            *local_18 = local_2c[0];
            local_18[6] = fVar13;
            local_18[8] = 1.0;
            local_18 = local_18 + 0xb;
            local_c = (float)((int)local_c + -1);
          } while (local_c != 0.0);
          local_8 = 2.8026e-45;
          do {
            local_18[7] = fVar18;
            local_18[2] = local_24;
            local_18[1] = local_44;
            *local_18 = local_2c[0];
            local_18[8] = 0.01;
            local_18[6] = fVar13;
            local_18 = local_18 + 0xb;
            local_8 = (float)((int)local_8 + -1);
          } while (local_8 != 0.0);
          if ((int)fVar17 < local_10) {
            sVar1 = ((short)local_1c + SUB42(fVar17,0)) * 4;
            *psVar12 = sVar1;
            psVar12[1] = sVar1 + 2;
            psVar12[2] = sVar1 + 6;
            psVar12[3] = sVar1 + 6;
            psVar12[4] = sVar1 + 4;
            psVar12[5] = sVar1;
            psVar12[6] = sVar1 + 1;
            psVar12[7] = sVar1 + 5;
            psVar12[8] = sVar1 + 7;
            psVar12[9] = sVar1 + 7;
            psVar12[10] = sVar1 + 3;
            psVar12[0xb] = sVar1 + 1;
            psVar12 = psVar12 + 0xc;
          }
          local_8 = (float)((int)fVar17 + 1);
          local_c = 0.0;
        } while ((int)local_8 < (int)param_10);
      }
      local_14 = local_14 + 1;
      local_1c = local_1c + (int)param_10;
      this = local_30;
    } while (local_14 < (int)param_9);
  }
  FUN_004045f1(*(int *)((int)this + 0xc));
  puVar8 = (uint *)FUN_004042e0(0x40000);
  param_10 = puVar8;
  FUN_00404282(puVar8,0,0x10000);
  param_6 = (void *)0x100;
  do {
    FUN_00401341();
    lVar15 = FUN_00404224();
    FUN_00401341();
    lVar16 = FUN_00404224();
    param_7 = (float)lVar16;
    iVar7 = 0;
    puVar9 = puVar8;
    do {
      uVar11 = 0x7f40;
      if ((int)param_7 <= iVar7) {
        uVar11 = (((0x5f < (int)lVar15) - 1 & 0xffffff01) + 0xff) * 0x1000000 | 0x7f40;
      }
      *puVar9 = uVar11;
      iVar7 = iVar7 + 1;
      puVar9 = puVar9 + 0x100;
    } while (iVar7 < 0x100);
    puVar8 = puVar8 + 1;
    param_6 = (void *)((int)param_6 + -1);
  } while (param_6 != (void *)0x0);
  param_6 = (void *)FUN_004042e0(0x2c);
  if (param_6 == (void *)0x0) {
    puVar10 = (undefined1 *)0x0;
  }
  else {
    pvVar2 = (void *)FUN_004042e0(0x18);
    if (pvVar2 == (void *)0x0) {
      puVar8 = (uint *)0x0;
    }
    else {
      puVar8 = FUN_00403dd3(pvVar2,(uint)param_10,0x100,0x100,'\0','\0');
    }
    puVar10 = FUN_00401c67(param_6,(int)puVar8,0,0x1050);
  }
  FUN_004045dd(*(void **)((int)this + 0xc),(int)puVar10);
  *(undefined1 *)(*(int *)(*(int *)((int)this + 0xc) + 0xc4) + 0x14) = 0x20;
  FUN_004042eb((int)param_10);
  return;
}


// ==== FUN_0040c674 @ 0040c674 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040c674(void *this,float param_1)

{
  float fVar1;
  float fVar2;
  float10 fVar3;
  float10 fVar4;
  float *pfVar5;
  float10 fVar6;
  float10 fVar7;
  
  fVar1 = param_1;
  param_1 = 0.0;
  *(float *)((int)this + 0x10) = fVar1 + *(float *)((int)this + 0x10);
  pfVar5 = *(float **)(*(int *)((int)this + 0xc) + 0xb0);
  if (0 < *(int *)((int)this + 4) * *(int *)((int)this + 8)) {
    do {
      fVar6 = FUN_004041dd(((float)(int)param_1 + *(float *)((int)this + 0x10)) * _DAT_00418f60);
      fVar1 = *(float *)this;
      fVar3 = (float10)_DAT_00418260;
      fVar7 = FUN_004041ee(((float)(int)param_1 + *(float *)((int)this + 0x10)) * _DAT_00418f5c);
      fVar2 = *(float *)this;
      fVar4 = (float10)_DAT_00418260;
      fVar1 = *pfVar5 + (float)(fVar6 * (float10)fVar1 * fVar3);
      pfVar5[0x16] = fVar1;
      fVar2 = pfVar5[2] + (float)(fVar7 * (float10)fVar2 * fVar4);
      pfVar5[0x18] = fVar2;
      pfVar5[0x21] = fVar1;
      pfVar5[0x23] = fVar2;
      pfVar5 = pfVar5 + 0x2c;
      param_1 = (float)((int)param_1 + 1);
    } while ((int)param_1 < *(int *)((int)this + 4) * *(int *)((int)this + 8));
  }
  return;
}


// ==== FUN_0040c721 @ 0040c721 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040c721(void *this,void *param_1,void *param_2,float param_3,float param_4,float param_5,
            int *param_6)

{
  int *piVar1;
  ushort uVar2;
  ushort uVar3;
  void *pvVar4;
  undefined4 *puVar5;
  float *pfVar6;
  float *pfVar7;
  uint *puVar8;
  undefined1 *puVar9;
  short sVar10;
  int iVar11;
  int iVar12;
  undefined4 *puVar13;
  float10 fVar14;
  float10 fVar15;
  longlong lVar16;
  undefined4 uVar17;
  float fVar18;
  float local_1a0 [16];
  float local_160 [16];
  float local_120 [16];
  undefined1 local_e0 [12];
  undefined1 local_d4 [12];
  undefined1 local_c8 [12];
  undefined1 local_bc [12];
  undefined1 local_b0 [12];
  undefined1 local_a4 [12];
  undefined1 local_98 [12];
  undefined1 local_8c [12];
  undefined1 local_80 [12];
  undefined4 local_74;
  undefined4 uStack_70;
  undefined4 uStack_6c;
  float local_68;
  float fStack_64;
  float fStack_60;
  float local_5c;
  float local_58;
  float local_54;
  float local_50;
  float local_4c;
  float local_48;
  float local_44;
  float local_40;
  float local_3c;
  int local_38;
  int local_34;
  int local_30;
  int local_2c;
  int local_28;
  float local_24;
  float *local_20;
  float local_1c;
  float local_18;
  float local_14;
  int local_10;
  int local_c;
  short *local_8;
  
  FUN_004010dc();
  *(undefined4 *)((int)this + 0xc) = 0;
  pvVar4 = (void *)FUN_004042e0(0xcc);
  if (pvVar4 == (void *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    puVar5 = FUN_004042f6(pvVar4,0x800,0xc00,0);
  }
  *(undefined4 **)((int)this + 4) = puVar5;
  pvVar4 = (void *)FUN_004042e0(0xcc);
  if (pvVar4 == (void *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    puVar5 = FUN_004042f6(pvVar4,0x4800,0x6000,0);
  }
  *(undefined4 **)((int)this + 8) = puVar5;
  local_28 = 0;
  local_34 = 0;
  local_30 = 0;
  local_38 = 0;
  local_2c = 0;
  do {
    FUN_0040190f(local_120);
    fVar14 = FUN_00401341();
    fVar18 = (float)((fVar14 + fVar14) * (float10)_DAT_00418220);
    uVar17 = 0;
    fVar14 = FUN_00401341();
    pfVar6 = (float *)FUN_00401558(local_d4,(float)((fVar14 + fVar14) * (float10)_DAT_00418220),
                                   uVar17,fVar18);
    FUN_00402280(local_120,pfVar6);
    local_10 = 0;
    local_20 = (float *)(*(int *)(*(int *)((int)this + 4) + 0xb0) + local_2c);
    local_8 = (short *)(*(int *)(*(int *)((int)this + 4) + 0xb8) + local_28);
    do {
      local_c = 0;
      local_24 = (float)local_10 * _DAT_00418f78 * _DAT_00418230;
      do {
        pfVar6 = local_20;
        local_14 = (float)local_c * _DAT_00418f78;
        FUN_00401555(&local_44);
        local_18 = _DAT_00418efc * _DAT_00418230;
        if (local_10 == 0) {
          local_40 = 0.0;
        }
        else if (local_10 == 1) {
          local_40 = 1.0;
        }
        else {
          if (local_10 == 2) {
            local_40 = 2.0;
          }
          else {
            if (local_10 != 3) goto LAB_0040c880;
            local_40 = 5.0;
          }
          local_18 = local_18 * _DAT_00418ddc;
        }
LAB_0040c880:
        local_1c = (local_14 + local_14) * (float)_DAT_00418220;
        fVar14 = FUN_004041dd(local_1c);
        local_44 = (float)(fVar14 * (float10)local_18);
        fVar14 = FUN_004041ee(local_1c);
        pfVar6[7] = local_14;
        pfVar6[8] = local_24;
        local_3c = (float)(fVar14 * (float10)local_18);
        pfVar6 = FUN_00402a6f(local_98,&local_44,local_120);
        local_44 = *pfVar6;
        local_40 = pfVar6[1];
        local_3c = pfVar6[2];
        fVar18 = local_40 + _DAT_00418e60;
        local_20[6] = 3.6893486e+19;
        *local_20 = local_44;
        local_20[1] = fVar18;
        local_20[2] = local_3c;
        local_20 = local_20 + 0xb;
        local_c = local_c + 1;
      } while (local_c < 4);
      local_10 = local_10 + 1;
    } while (local_10 < 4);
    iVar12 = 0;
    lVar16 = FUN_00404224();
    local_24 = (float)lVar16;
    do {
      iVar11 = 0;
      do {
        FUN_00409ccd((int *)&local_8,SUB42(local_24,0),iVar11,4,(short)iVar12);
        iVar11 = iVar11 + 1;
      } while (iVar11 < 4);
      iVar12 = iVar12 + 1;
    } while (iVar12 < 3);
    FUN_0040190f(local_160);
    FUN_0040190f(local_1a0);
    local_24 = 2.24208e-44;
    local_20 = (float *)(*(int *)(*(int *)((int)this + 8) + 0xb0) + local_30);
    local_8 = (short *)(*(int *)(*(int *)((int)this + 8) + 0xb8) + local_34);
    do {
      fVar14 = FUN_00401341();
      local_1c = (float)(fVar14 * (float10)_DAT_00418220 - (float10)_DAT_00418f70);
      fVar14 = FUN_00401341();
      fVar14 = fVar14 * (float10)_DAT_00418220 - (float10)_DAT_00418f70;
      local_14 = (float)fVar14;
      pfVar6 = (float *)FUN_00401558(local_e0,local_1c * _DAT_00418eb0,0,
                                     (float)(fVar14 * (float10)_DAT_00418eb0));
      FUN_00402280(local_1a0,pfVar6);
      pfVar6 = (float *)FUN_00401558(local_b0,local_1c * _DAT_00418f6c,0,local_14 * _DAT_00418f6c);
      FUN_00402280(local_160,pfVar6);
      local_10 = 0;
      do {
        local_c = 0;
        local_18 = (float)local_10 * _DAT_004170d4;
        do {
          local_1c = (float)local_c * _DAT_004170d4;
          FUN_00401555(&local_50);
          FUN_00401555(&local_68);
          local_14 = (local_1c + local_1c) * (float)_DAT_00418220;
          fVar14 = FUN_004041dd(local_14);
          local_50 = (float)(fVar14 * (float10)_DAT_00418efc);
          local_4c = local_18 + local_18;
          fVar14 = FUN_004041ee(local_14);
          fStack_60 = (float)(fVar14 * (float10)_DAT_00418efc);
          local_68 = local_50;
          fStack_64 = local_4c;
          local_48 = fStack_60;
          pfVar6 = FUN_00402a6f(local_80,&local_50,local_160);
          local_50 = *pfVar6;
          local_4c = pfVar6[1];
          local_48 = pfVar6[2];
          pfVar6 = FUN_00402a6f(local_c8,&local_68,local_1a0);
          local_68 = *pfVar6;
          local_14 = 1.0 - local_18;
          fStack_64 = pfVar6[1];
          fStack_60 = pfVar6[2];
          pfVar6 = FUN_0040268c(local_8c,&local_68,&local_14);
          pfVar7 = FUN_0040268c(local_a4,&local_50,&local_18);
          FUN_0040523d(&local_5c,pfVar7,pfVar6);
          local_58 = local_58 + _DAT_00418e54;
          pfVar6 = FUN_00402a6f(local_bc,&local_5c,local_120);
          local_5c = *pfVar6;
          local_58 = pfVar6[1];
          local_54 = pfVar6[2];
          fVar18 = local_58 + _DAT_00418e60;
          local_20[6] = 4.6566126e-10;
          *local_20 = local_5c;
          local_20[1] = fVar18;
          local_20[2] = local_54;
          local_20[7] = local_1c;
          local_20[8] = local_18;
          local_20 = local_20 + 0xb;
          local_c = local_c + 1;
        } while (local_c < 3);
        local_10 = local_10 + 1;
      } while (local_10 < 3);
      iVar12 = 0;
      do {
        iVar11 = 0;
        do {
          FUN_00409ccd((int *)&local_8,(short)local_28,iVar11,3,(short)iVar12);
          iVar11 = iVar11 + 1;
        } while (iVar11 < 3);
        iVar12 = iVar12 + 1;
      } while (iVar12 < 2);
      local_28 = local_28 + 9;
      local_24 = (float)((int)local_24 + -1);
    } while (local_24 != 0.0);
    local_2c = local_2c + 0x2c0;
    local_38 = local_38 + 0x10;
    local_30 = local_30 + 0x18c0;
    local_34 = local_34 + 0x480;
    if (0x15fff < local_2c) {
      pvVar4 = (void *)FUN_004042e0(0xcc);
      if (pvVar4 == (void *)0x0) {
        puVar5 = (undefined4 *)0x0;
      }
      else {
        puVar5 = FUN_004042f6(pvVar4,0x80,0xf0,0);
      }
      local_10 = 0;
      *(undefined4 **)this = puVar5;
      pfVar6 = (float *)puVar5[0x2c];
      local_8 = (short *)puVar5[0x2e];
      do {
        local_c = 0;
        local_1c = (float)local_10 * _DAT_00418f68 * _DAT_00418e60;
        pfVar7 = pfVar6;
        do {
          local_14 = (float)local_c * _DAT_00418f64;
          local_24 = (local_14 + local_14) * (float)_DAT_00418220;
          fVar15 = FUN_004041dd(local_24);
          fVar14 = (float10)_DAT_00418f54;
          pfVar7[1] = local_1c;
          *pfVar7 = (float)(fVar15 * fVar14);
          fVar15 = FUN_004041ee(local_24);
          fVar14 = (float10)_DAT_00418f54;
          pfVar7[6] = NAN;
          pfVar7[7] = local_14;
          pfVar6 = pfVar7 + 0xb;
          pfVar7[2] = (float)(fVar15 * fVar14);
          pfVar7[8] = 0.0;
          if (local_10 < 0xf) {
            uVar2 = (byte)((byte)local_c + 1) & 7;
            sVar10 = uVar2 + 8;
            *local_8 = sVar10;
            uVar3 = (byte)local_c & 7;
            local_8[1] = uVar3 + 8;
            local_8[2] = uVar3;
            local_8[3] = uVar3;
            local_8[4] = uVar2;
            local_8[5] = sVar10;
            local_8 = local_8 + 6;
          }
          local_c = local_c + 1;
          pfVar7 = pfVar6;
          local_20 = pfVar6;
        } while (local_c < 8);
        local_10 = local_10 + 1;
      } while (local_10 < 0x10);
      FUN_004045f1(*(int *)this);
      FUN_004045f1(*(int *)((int)this + 4));
      FUN_004045f1(*(int *)((int)this + 8));
      if (param_2 != (void *)0x0) {
        fVar14 = FUN_0040e8d2(param_2,param_3,param_5);
        param_4 = (float)(fVar14 + (float10)param_4);
      }
      FUN_00401558(&local_74,param_6,param_6,param_6);
      iVar12 = *(int *)this;
      *(float *)(iVar12 + 0x88) = param_3;
      *(float *)(iVar12 + 0x8c) = param_4;
      *(float *)(iVar12 + 0x90) = param_5;
      iVar12 = *(int *)this;
      *(undefined4 *)(iVar12 + 0x94) = local_74;
      *(undefined4 *)(iVar12 + 0x98) = uStack_70;
      *(undefined4 *)(iVar12 + 0x9c) = uStack_6c;
      iVar12 = *(int *)((int)this + 4);
      *(float *)(iVar12 + 0x88) = param_3;
      *(float *)(iVar12 + 0x8c) = param_4;
      *(float *)(iVar12 + 0x90) = param_5;
      iVar12 = *(int *)((int)this + 4);
      *(undefined4 *)(iVar12 + 0x94) = local_74;
      *(undefined4 *)(iVar12 + 0x98) = uStack_70;
      *(undefined4 *)(iVar12 + 0x9c) = uStack_6c;
      iVar12 = *(int *)((int)this + 8);
      *(float *)(iVar12 + 0x88) = param_3;
      *(float *)(iVar12 + 0x8c) = param_4;
      *(float *)(iVar12 + 0x90) = param_5;
      iVar12 = *(int *)((int)this + 8);
      *(undefined4 *)(iVar12 + 0x94) = local_74;
      *(undefined4 *)(iVar12 + 0x98) = uStack_70;
      *(undefined4 *)(iVar12 + 0x9c) = uStack_6c;
      FUN_00405f0e(param_1,*(int *)this);
      FUN_00405f0e(param_1,*(int *)((int)this + 4));
      FUN_00405f0e(param_1,*(int *)((int)this + 8));
      param_6 = (int *)FUN_004042e0(0x40000);
      FUN_00416036(3,0x20,0x20,param_6);
      param_1 = (void *)FUN_004042e0(0x2c);
      if (param_1 == (void *)0x0) {
        puVar9 = (undefined1 *)0x0;
      }
      else {
        pvVar4 = (void *)FUN_004042e0(0x18);
        if (pvVar4 == (void *)0x0) {
          puVar8 = (uint *)0x0;
        }
        else {
          puVar8 = FUN_00403dd3(pvVar4,(uint)param_6,0x20,0x20,'\0','\0');
        }
        puVar9 = FUN_00401c67(param_1,(int)puVar8,0,0x11);
      }
      FUN_004045dd(*(void **)((int)this + 4),(int)puVar9);
      param_1 = (void *)FUN_004042e0(0x2c);
      if (param_1 == (void *)0x0) {
        puVar9 = (undefined1 *)0x0;
      }
      else {
        pvVar4 = (void *)FUN_004042e0(0x18);
        if (pvVar4 == (void *)0x0) {
          puVar8 = (uint *)0x0;
        }
        else {
          puVar8 = FUN_00403dd3(pvVar4,(uint)param_6,0x20,0x20,'\0','\0');
        }
        puVar9 = FUN_00401c67(param_1,(int)puVar8,0,0x10);
      }
      FUN_004045dd(*(void **)this,(int)puVar9);
      FUN_00416036(4,0x20,0x20,param_6);
      param_1 = (void *)FUN_004042e0(0x2c);
      if (param_1 == (void *)0x0) {
        puVar9 = (undefined1 *)0x0;
      }
      else {
        pvVar4 = (void *)FUN_004042e0(0x18);
        if (pvVar4 == (void *)0x0) {
          puVar8 = (uint *)0x0;
        }
        else {
          puVar8 = FUN_00403dd3(pvVar4,(uint)param_6,0x20,0x20,'\0','\0');
        }
        puVar9 = FUN_00401c67(param_1,(int)puVar8,0,0x11);
      }
      FUN_004045dd(*(void **)((int)this + 8),(int)puVar9);
      FUN_004042eb((int)param_6);
      pvVar4 = (void *)FUN_004042e0(0xe00);
      if (pvVar4 == (void *)0x0) {
        pvVar4 = (void *)0x0;
      }
      else {
        _vector_constructor_iterator_(pvVar4,0x1c,0x80,FUN_00408d4b);
      }
      *(void **)((int)this + 0x1c) = pvVar4;
      param_6 = (int *)0x0;
      do {
        piVar1 = param_6;
        fVar14 = FUN_00401341();
        *(float *)(*(int *)((int)this + 0x1c) + (int)piVar1) =
             (float)((fVar14 + fVar14) - (float10)_DAT_004170c4);
        fVar14 = FUN_00401341();
        *(float *)(*(int *)((int)this + 0x1c) + 4 + (int)piVar1) =
             (float)((fVar14 + fVar14) - (float10)_DAT_004170c4);
        fVar14 = FUN_00401341();
        param_1 = (void *)0x41200000;
        *(float *)(*(int *)((int)this + 0x1c) + 8 + (int)piVar1) =
             (float)((fVar14 + fVar14) - (float10)_DAT_004170c4);
        puVar5 = FUN_0040268c(&param_3,(float *)(*(int *)((int)this + 0x1c) + (int)piVar1),
                              (float *)&param_1);
        puVar13 = (undefined4 *)(*(int *)((int)this + 0x1c) + (int)piVar1);
        *puVar13 = *puVar5;
        puVar13[1] = puVar5[1];
        puVar13[2] = puVar5[2];
        puVar5 = (undefined4 *)(*(int *)((int)this + 0x1c) + 0xc + (int)param_6);
        *puVar5 = DAT_00478938;
        puVar5[1] = DAT_0047893c;
        puVar5[2] = DAT_00478940;
        fVar14 = FUN_00401341();
        piVar1 = param_6 + 7;
        *(float *)(*(int *)((int)this + 0x1c) + 0x18 + (int)param_6) =
             (float)(fVar14 * (float10)_DAT_00418e7c);
        param_6 = piVar1;
      } while ((int)piVar1 < 0xe00);
      iVar12 = FUN_004042e0(*(int *)(*(int *)((int)this + 4) + 0xac) * 0x2c);
      *(int *)((int)this + 0x14) = iVar12;
      FUN_004042b5(iVar12,*(int *)(*(int *)((int)this + 4) + 0xb0),
                   *(int *)(*(int *)((int)this + 4) + 0xac) * 0x2c);
      iVar12 = FUN_004042e0(*(int *)(*(int *)((int)this + 8) + 0xac) * 0x2c);
      *(int *)((int)this + 0x18) = iVar12;
      FUN_004042b5(iVar12,*(int *)(*(int *)((int)this + 8) + 0xb0),
                   *(int *)(*(int *)((int)this + 8) + 0xac) * 0x2c);
      *(undefined1 *)((int)this + 0x10) = 0;
      return;
    }
    local_24 = 0.0;
  } while( true );
}


// ==== FUN_0040cfed @ 0040cfed ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040cfed(void *this,float *param_1)

{
  float *pfVar1;
  float *pfVar2;
  int iVar3;
  float10 fVar4;
  float10 fVar5;
  undefined1 local_44 [12];
  undefined1 local_38 [12];
  undefined1 local_2c [12];
  float local_20;
  float local_1c;
  float local_18;
  float local_14;
  float *local_10;
  int local_c;
  int local_8;
  
  local_c = 0;
  *(float *)((int)this + 0xc) = (float)param_1 + *(float *)((int)this + 0xc);
  pfVar1 = *(float **)(*(int *)this + 0xb0);
  do {
    local_1c = (float)local_c * _DAT_00418f68;
    local_10 = (float *)(local_1c * local_1c);
    fVar4 = FUN_004041dd(*(float *)((int)this + 0xc));
    local_18 = (float)(fVar4 * (float10)(float)local_10 * (float10)_DAT_00418e24);
    fVar4 = FUN_004041ee(*(float *)((int)this + 0xc) * _DAT_00418f80);
    local_8 = 0;
    local_14 = (float)(fVar4 * (float10)(float)local_10 * (float10)_DAT_00418e24);
    local_1c = local_1c * _DAT_00418e60;
    pfVar2 = pfVar1;
    do {
      local_10 = (float *)(((float)local_8 * _DAT_00418f64 + (float)local_8 * _DAT_00418f64) *
                          (float)_DAT_00418220);
      fVar5 = FUN_004041dd((float)local_10);
      fVar4 = (float10)_DAT_00418f54;
      pfVar2[1] = local_1c;
      *pfVar2 = (float)(fVar5 * fVar4 + (float10)local_18);
      fVar4 = FUN_004041ee((float)local_10);
      pfVar1 = pfVar2 + 0xb;
      local_8 = local_8 + 1;
      pfVar2[2] = (float)(fVar4 * (float10)_DAT_00418f54 + (float10)local_14);
      pfVar2 = pfVar1;
    } while (local_8 < 8);
    local_c = local_c + 1;
  } while (local_c < 0x10);
  local_10 = *(float **)((int)this + 0x1c);
  local_c = 0;
  local_20 = (float)param_1 * _DAT_00418f7c;
  param_1 = local_10 + 3;
  local_8 = 0;
  do {
    local_1c = local_20;
    pfVar1 = FUN_0040268c(local_2c,local_10,&local_1c);
    pfVar1 = FUN_0040523d(local_38,param_1,pfVar1);
    *param_1 = *pfVar1;
    param_1[1] = pfVar1[1];
    param_1[2] = pfVar1[2];
    if (_DAT_004170c8 <= param_1[3]) {
      pfVar1 = (float *)FUN_00401558(local_44,local_18,0,local_14);
      *param_1 = *pfVar1;
      param_1[1] = pfVar1[1];
      param_1[2] = pfVar1[2];
      if (*(char *)((int)this + 0x10) != '\0') {
        param_1[3] = param_1[3] - local_1c;
      }
    }
    iVar3 = 0x10;
    pfVar1 = (float *)(*(int *)(*(int *)((int)this + 4) + 0xb0) + local_8);
    pfVar2 = (float *)(local_8 + *(int *)((int)this + 0x14));
    do {
      *pfVar1 = *param_1 + *pfVar2;
      iVar3 = iVar3 + -1;
      pfVar1[1] = pfVar2[1] + param_1[1];
      pfVar1[2] = pfVar2[2] + param_1[2];
      pfVar1 = pfVar1 + 0xb;
      pfVar2 = pfVar2 + 0xb;
    } while (iVar3 != 0);
    iVar3 = 0x90;
    pfVar1 = (float *)(*(int *)(*(int *)((int)this + 8) + 0xb0) + local_c);
    pfVar2 = (float *)(*(int *)((int)this + 0x18) + local_c);
    do {
      *pfVar1 = *param_1 + *pfVar2;
      iVar3 = iVar3 + -1;
      pfVar1[1] = pfVar2[1] + param_1[1];
      pfVar1[2] = pfVar2[2] + param_1[2];
      pfVar1 = pfVar1 + 0xb;
      pfVar2 = pfVar2 + 0xb;
    } while (iVar3 != 0);
    local_8 = local_8 + 0x2c0;
    local_10 = local_10 + 7;
    local_c = local_c + 0x18c0;
    param_1 = param_1 + 7;
  } while (local_8 < 0x16000);
  return;
}


// ==== FUN_0040d1f1 @ 0040d1f1 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040d1f1(void *this,undefined4 param_1,int param_2,char param_3,float param_4,float param_5,
            float param_6,undefined4 *param_7,undefined4 param_8,undefined4 param_9,
            undefined4 param_10,int param_11,char param_12)

{
  short sVar1;
  undefined4 uVar2;
  void *pvVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  uint *puVar6;
  uint *puVar7;
  undefined1 *puVar8;
  int iVar9;
  float10 fVar10;
  float fVar11;
  float fVar12;
  undefined1 local_30 [12];
  undefined1 local_24 [12];
  undefined1 local_18 [12];
  undefined4 *local_c;
  int local_8;
  
  FUN_004010dc();
  *(undefined4 *)((int)this + 0x20) = param_8;
  *(undefined4 *)((int)this + 0x24) = param_9;
  *(undefined4 *)((int)this + 0x28) = param_10;
  *(float *)((int)this + 0xc) = param_4;
  *(int *)((int)this + 0x48) = param_2;
  *(char *)this = param_3;
  *(float *)((int)this + 0x10) = param_5;
  *(int *)((int)this + 0x44) = param_11;
  *(float *)((int)this + 0x14) = param_6;
  *(undefined4 **)((int)this + 0x18) = param_7;
  *(undefined4 *)((int)this + 0x5c) = 0x100;
  *(char *)((int)this + 0x58) = param_12;
  *(undefined4 *)((int)this + 0x30) = 0;
  *(undefined4 *)((int)this + 0x2c) = 0;
  uVar2 = FUN_004042e0(0xb000);
  *(undefined4 *)((int)this + 0x34) = uVar2;
  uVar2 = FUN_004042e0(0xc00);
  *(undefined4 *)((int)this + 0x38) = uVar2;
  uVar2 = FUN_004042e0(0x400);
  iVar9 = *(int *)((int)this + 0x34);
  *(undefined4 *)((int)this + 0x3c) = uVar2;
  local_8 = *(int *)((int)this + 0x38);
  param_11 = 0;
  do {
    FUN_00409c71(iVar9);
    *(undefined4 *)(iVar9 + 0x18) = 0x7fffffff;
    *(undefined4 *)(iVar9 + 0x44) = 0x7fffffff;
    *(undefined4 *)(iVar9 + 0x70) = 0x7fffffff;
    *(undefined4 *)(iVar9 + 0x9c) = 0x7fffffff;
    iVar9 = iVar9 + 0xb0;
    FUN_00409ca6(&local_8,(short)param_11,0x418edc);
    param_11 = param_11 + 4;
  } while (param_11 < 0x400);
  pvVar3 = (void *)FUN_004042e0((int)param_7 * 0x18);
  if (pvVar3 == (void *)0x0) {
    pvVar3 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar3,0x18,(int)param_7,FUN_00408d4b);
  }
  *(void **)((int)this + 0x1c) = pvVar3;
  *(undefined4 *)((int)this + 8) = 0;
  pvVar3 = (void *)FUN_004042e0(0xcc);
  if (pvVar3 == (void *)0x0) {
    puVar4 = (undefined4 *)0x0;
  }
  else {
    puVar4 = FUN_004042f6(pvVar3,(int)param_7 << 2,(int)param_7 * 2,0);
  }
  *(undefined4 **)((int)this + 4) = puVar4;
  puVar4[0x28] = param_1;
  puVar4 = *(undefined4 **)((int)this + 0x1c);
  param_11 = *(int *)(*(int *)((int)this + 4) + 0xb0);
  local_8 = *(int *)(*(int *)((int)this + 4) + 0xb8);
  if (0 < (int)param_7) {
    sVar1 = 0;
    local_c = param_7;
    param_7 = puVar4 + 3;
    do {
      fVar10 = FUN_00401341();
      fVar12 = (float)((fVar10 * (float10)param_6 + fVar10 * (float10)param_6) - (float10)param_6);
      fVar10 = FUN_00401341();
      fVar11 = (float)-(fVar10 * (float10)param_5);
      fVar10 = FUN_00401341();
      puVar5 = (undefined4 *)
               FUN_00401558(local_18,(float)((fVar10 * (float10)param_4 + fVar10 * (float10)param_4)
                                            - (float10)param_4),fVar11,fVar12);
      *puVar4 = *puVar5;
      uVar2 = _DAT_004170cc;
      puVar4[1] = puVar5[1];
      puVar4[2] = puVar5[2];
      puVar5 = (undefined4 *)FUN_00401558(local_24,0,uVar2,0);
      *param_7 = *puVar5;
      param_7[1] = puVar5[1];
      param_7[2] = puVar5[2];
      if (param_3 == '\0') {
        fVar10 = FUN_00401341();
        fVar12 = (float)(fVar10 * (float10)_DAT_00418f04 - (float10)_DAT_00418ea4);
        uVar2 = _DAT_00418f38;
        fVar10 = FUN_00401341();
        puVar5 = (undefined4 *)
                 FUN_00401558(local_30,(float)(fVar10 * (float10)_DAT_00418f04 -
                                              (float10)_DAT_00418ea4),uVar2,fVar12);
        *param_7 = *puVar5;
        param_7[1] = puVar5[1];
        param_7[2] = puVar5[2];
      }
      FUN_00409c71(param_11);
      param_11 = param_11 + 0xb0;
      FUN_00409ca6(&local_8,sVar1,0x418edc);
      puVar4 = puVar4 + 6;
      param_7 = param_7 + 6;
      sVar1 = sVar1 + 4;
      local_c = (undefined4 *)((int)local_c + -1);
    } while (local_c != (undefined4 *)0x0);
  }
  puVar6 = (uint *)FUN_004042e0(0x400);
  FUN_00416036(5,0x10,0x10,(int *)puVar6);
  pvVar3 = (void *)FUN_004042e0(0x18);
  if (pvVar3 == (void *)0x0) {
    puVar7 = (uint *)0x0;
  }
  else {
    puVar7 = FUN_00403dd3(pvVar3,(uint)puVar6,0x10,0x10,'\0','\0');
  }
  *(uint **)((int)this + 0x40) = puVar7;
  if (param_3 == '\0') {
    FUN_00416036(0xf,0x10,0x10,(int *)puVar6);
    _param_3 = (void *)0x100;
    puVar7 = puVar6;
    do {
      if ((*puVar7 & 0xff000000) < 0x80000000) {
        *puVar7 = *puVar7 & 0xffffff;
      }
      puVar7 = puVar7 + 1;
      _param_3 = (void *)((int)_param_3 + -1);
    } while (_param_3 != (void *)0x0);
    _param_3 = (void *)FUN_004042e0(0x2c);
    if (_param_3 == (void *)0x0) goto LAB_0040d534;
    pvVar3 = (void *)FUN_004042e0(0x18);
    if (pvVar3 == (void *)0x0) {
      puVar7 = (uint *)0x0;
    }
    else {
      puVar7 = FUN_00403dd3(pvVar3,(uint)puVar6,0x10,0x10,'\0','\0');
    }
  }
  else {
    FUN_00416036(6,8,8,(int *)puVar6);
    _param_3 = (void *)FUN_004042e0(0x2c);
    if (_param_3 == (void *)0x0) {
LAB_0040d534:
      puVar8 = (undefined1 *)0x0;
      goto LAB_0040d536;
    }
    pvVar3 = (void *)FUN_004042e0(0x18);
    if (pvVar3 == (void *)0x0) {
      puVar7 = (uint *)0x0;
    }
    else {
      puVar7 = FUN_00403dd3(pvVar3,(uint)puVar6,8,8,'\0','\0');
    }
  }
  puVar8 = FUN_00401c67(_param_3,(int)puVar7,0,0x1050);
LAB_0040d536:
  FUN_004045dd(*(void **)((int)this + 4),(int)puVar8);
  FUN_004042eb((int)puVar6);
  if ((param_2 != 0) && (param_12 != '\0')) {
    uVar2 = FUN_004042e0(0x40000);
    *(undefined4 *)((int)this + 0x4c) = uVar2;
    iVar9 = 0;
    do {
      *(undefined4 *)(iVar9 + *(int *)((int)this + 0x4c)) = 0xffffff;
      iVar9 = iVar9 + 4;
    } while (iVar9 < 0x40000);
    pvVar3 = (void *)FUN_004042e0(0x18);
    if (pvVar3 == (void *)0x0) {
      puVar6 = (uint *)0x0;
    }
    else {
      puVar6 = FUN_00403dd3(pvVar3,*(uint *)((int)this + 0x4c),0x100,0x100,'\x01','\0');
    }
    *(uint **)((int)this + 0x50) = puVar6;
    pvVar3 = (void *)FUN_004042e0(0x2c);
    if (pvVar3 == (void *)0x0) {
      puVar8 = (undefined1 *)0x0;
    }
    else {
      puVar8 = FUN_00401c67(pvVar3,*(int *)((int)this + 0x50),0,0x50);
    }
    *(undefined1 **)((int)this + 0x54) = puVar8;
  }
  *(undefined4 *)((int)this + 0x60) = 0;
  return;
}


// ==== FUN_0040d5c6 @ 0040d5c6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040d5c6(void *this,float param_1)

{
  float fVar1;
  float fVar2;
  float *pfVar3;
  float *pfVar4;
  uint uVar5;
  int iVar6;
  byte *pbVar7;
  float fVar8;
  float10 fVar9;
  float10 extraout_ST0;
  float10 fVar10;
  longlong lVar11;
  longlong lVar12;
  float fVar13;
  undefined1 local_1a8 [12];
  undefined1 local_19c [12];
  undefined1 local_190 [12];
  undefined1 local_184 [12];
  undefined1 local_178 [12];
  undefined1 local_16c [12];
  undefined1 local_160 [12];
  undefined1 local_154 [12];
  undefined1 local_148 [12];
  undefined1 local_13c [12];
  undefined1 local_130 [12];
  undefined1 local_124 [12];
  undefined1 local_118 [12];
  undefined1 local_10c [12];
  undefined1 local_100 [12];
  undefined1 local_f4 [12];
  undefined1 local_e8 [12];
  undefined1 local_dc [12];
  undefined1 local_d0 [12];
  undefined1 local_c4 [12];
  float local_b8 [3];
  float local_ac [3];
  float local_a0 [4];
  undefined4 local_90;
  undefined4 local_8c;
  undefined4 local_88;
  undefined4 local_70;
  undefined4 local_6c;
  undefined4 local_68;
  float local_60 [3];
  float local_54;
  float local_50;
  float local_4c;
  float local_48;
  float local_44;
  float fStack_40;
  float local_3c;
  int local_38;
  float local_34;
  float local_30;
  float local_2c;
  float local_28;
  float *local_24;
  float *local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  if (*(int *)((int)this + 0x5c) != 0) {
    fVar8 = *(float *)(*(int *)(*(int *)((int)this + 4) + 0xa0) + 8);
    local_2c = fVar8;
    FUN_00401558(local_b8,*(undefined4 *)((int)fVar8 + 0x88),0,*(undefined4 *)((int)fVar8 + 0x90));
    *(int *)((int)this + 0x60) = *(int *)((int)this + 0x60) + 1;
    *(float *)((int)this + 8) = param_1 + *(float *)((int)this + 8);
    if (0x10 < *(int *)((int)this + 0x60)) {
      *(undefined4 *)((int)this + 0x60) = 0x10;
    }
    local_1c = 5.0;
    if (*(char *)this == '\0') {
      local_1c = 1.0;
    }
    FUN_0040dd68((void *)(*(int *)(*(int *)(*(int *)((int)this + 4) + 0xa0) + 8) + 8),local_a0);
    if (*(char *)this != '\0') {
      local_90 = 0;
      local_8c = 0x3f800000;
      local_88 = 0;
    }
    local_70 = 0;
    local_38 = 0;
    local_6c = 0;
    local_68 = 0;
    local_20 = *(float **)(*(int *)((int)this + 4) + 0xb0);
    local_24 = *(float **)((int)this + 0x1c);
    if (0 < *(int *)((int)this + 0x18)) {
      local_34 = param_1 * _DAT_00418f98;
      do {
        local_30 = local_34;
        local_44 = *local_24;
        fStack_40 = local_24[1];
        local_3c = local_24[2];
        pfVar3 = FUN_0040268c(local_dc,local_24 + 3,&local_30);
        pfVar4 = local_24;
        pfVar3 = FUN_0040523d(local_190,local_24,pfVar3);
        *pfVar4 = *pfVar3;
        pfVar4[1] = pfVar3[1];
        pfVar4[2] = pfVar3[2];
        iVar6 = 0xff;
        fVar9 = FUN_0040e8d2(*(void **)((int)this + 0x48),local_44,local_3c);
        pfVar4 = local_24;
        if (fVar9 <= (float10)local_24[1]) {
          if (*(float *)((int)this + 0x10) - _DAT_00418e84 < local_24[1]) {
            lVar11 = FUN_00404224();
            iVar6 = (int)lVar11;
          }
          if (pfVar4[1] < _DAT_00418e7c) {
            lVar11 = FUN_00404224();
            iVar6 = (int)lVar11;
          }
          if (iVar6 < 0) {
            iVar6 = 0;
          }
          if (0xff < iVar6) {
            iVar6 = 0xff;
          }
        }
        else {
          if ((*(char *)((int)this + 0x58) != '\0') && (0xf < *(int *)((int)this + 0x60))) {
            local_28 = local_44;
            param_1 = local_3c;
            FUN_0040e842(*(void **)((int)this + 0x48),&local_28,&param_1);
            if ((_DAT_004170c8 <= local_28) &&
               (((_DAT_004170c8 <= param_1 && (local_28 < _DAT_00418268)) &&
                (param_1 < _DAT_00418268)))) {
              lVar11 = FUN_00404224();
              local_c = (float)((uint)lVar11 & 0xffff);
              lVar11 = FUN_00404224();
              fVar9 = (float10)((uint)lVar11 & 0xffff) * (float10)_DAT_00418f94;
              local_8 = (float)((float10)1 - fVar9);
              local_c = (float)((float10)1 - extraout_ST0);
              fVar10 = (float10)_DAT_00418f50;
              local_54 = (float)((float10)local_c * (float10)local_8 * fVar10);
              local_50 = (float)((float10)local_8 * extraout_ST0 * fVar10);
              local_4c = (float)((float10)local_c * fVar9 * fVar10);
              local_48 = (float)(fVar9 * extraout_ST0 * fVar10);
              lVar11 = FUN_00404224();
              lVar12 = FUN_00404224();
              local_8 = 0.0;
              pbVar7 = (byte *)(*(int *)((int)this + 0x4c) + ((int)lVar11 * 0x100 + (int)lVar12) * 4
                               + 3);
              do {
                local_c = (float)(uint)*pbVar7;
                lVar11 = FUN_00404224();
                iVar6 = (int)lVar11;
                if (0xff < iVar6) {
                  iVar6 = 0xff;
                }
                *pbVar7 = (byte)iVar6;
                if ((local_8 == 0.0) || (local_8 == 2.8026e-45)) {
                  pbVar7 = pbVar7 + 4;
                }
                else {
                  pbVar7 = pbVar7 + 0x400;
                }
                local_8 = (float)((int)local_8 + 1);
                pfVar4 = local_24;
              } while ((int)local_8 < 4);
            }
          }
          fVar9 = FUN_00401341();
          fVar9 = fVar9 * (float10)*(float *)((int)this + 0x14);
          fVar8 = (float)((fVar9 + fVar9) - (float10)*(float *)((int)this + 0x14));
          fVar13 = *(float *)((int)this + 0x10) + pfVar4[1];
          fVar9 = FUN_00401341();
          fVar9 = fVar9 * (float10)*(float *)((int)this + 0xc);
          pfVar3 = (float *)FUN_00401558(local_1a8,
                                         (float)((fVar9 + fVar9) -
                                                (float10)*(float *)((int)this + 0xc)),fVar13,fVar8);
          pfVar3 = FUN_0040523d(local_c4,local_b8,pfVar3);
          *pfVar4 = *pfVar3;
          pfVar4[1] = pfVar3[1];
          pfVar4[2] = pfVar3[2];
          iVar6 = 0;
        }
        if (*(char *)this != '\0') {
          iVar6 = iVar6 >> 1;
        }
        local_8 = (float)((iVar6 * *(int *)((int)this + 0x5c) >> 8) << 0x18 | 0xffffff);
        FUN_00401555(&local_18);
        local_c = -local_1c;
        pfVar4 = (float *)((int)this + 0x20);
        pfVar3 = (float *)FUN_00401558(local_19c,_DAT_004170cc,local_c,0);
        pfVar4 = FUN_00405271(local_f4,pfVar3,pfVar4);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_00402a6f(local_154,&local_18,local_a0);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_0040523d(local_10c,&local_18,&local_44);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        *local_20 = local_18;
        local_20[1] = local_14;
        local_20[2] = local_10;
        local_20[6] = local_8;
        local_20 = local_20 + 0xb;
        pfVar4 = (float *)((int)this + 0x20);
        pfVar3 = (float *)FUN_00401558(local_184,0x3f800000,local_c,0);
        pfVar4 = FUN_00405271(local_124,pfVar3,pfVar4);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_00402a6f(local_16c,&local_18,local_a0);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_0040523d(local_13c,&local_18,&local_44);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        *local_20 = local_18;
        local_20[1] = local_14;
        local_20[2] = local_10;
        local_20[6] = local_8;
        local_20 = local_20 + 0xb;
        pfVar4 = (float *)((int)this + 0x20);
        pfVar3 = (float *)FUN_00401558(local_d0,0x3f800000,local_1c,0);
        pfVar4 = FUN_00405271(local_e8,pfVar3,pfVar4);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_00402a6f(local_100,&local_18,local_a0);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_0040523d(local_118,&local_18,&local_44);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        *local_20 = local_18;
        local_20[1] = local_14;
        local_20[2] = local_10;
        local_20[6] = local_8;
        local_20 = local_20 + 0xb;
        pfVar4 = (float *)((int)this + 0x20);
        pfVar3 = (float *)FUN_00401558(local_130,_DAT_004170cc,local_1c,0);
        pfVar4 = FUN_00405271(local_148,pfVar3,pfVar4);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_00402a6f(local_160,&local_18,local_a0);
        local_18 = *pfVar4;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        pfVar4 = FUN_0040523d(local_178,&local_18,&local_44);
        local_18 = *pfVar4;
        local_24 = local_24 + 6;
        local_14 = pfVar4[1];
        local_10 = pfVar4[2];
        *local_20 = local_18;
        local_20[1] = local_14;
        local_20[2] = local_10;
        local_20[6] = local_8;
        local_20 = local_20 + 0xb;
        local_38 = local_38 + 1;
        fVar8 = local_2c;
      } while (local_38 < *(int *)((int)this + 0x18));
    }
    FUN_00401558(local_ac,0,0x3f800000,0);
    FUN_00402626(local_60,(float *)((int)fVar8 + 0xac),(float *)((int)fVar8 + 0x88));
    FUN_0040de2a(local_60);
    FUN_004025b6(local_ac,local_60);
    lVar11 = FUN_00404224();
    iVar6 = (int)lVar11;
    if (iVar6 < 0) {
      iVar6 = 0;
    }
    uVar5 = FUN_00404258();
    if ((int)uVar5 < iVar6) {
      pfVar4 = (float *)(*(int *)((int)this + 0x2c) * 0xb0 + *(int *)((int)this + 0x34));
      *(undefined4 *)(*(int *)((int)this + 0x3c) + *(int *)((int)this + 0x2c) * 4) =
           *(undefined4 *)((int)this + 8);
      fVar9 = FUN_00401341();
      param_1 = (float)((fVar9 + fVar9) - (float10)_DAT_004170c4);
      fVar9 = FUN_00401341();
      local_1c = (float)((fVar9 + fVar9) - (float10)_DAT_004170c4);
      fVar8 = param_1 - _DAT_00418f90;
      *pfVar4 = fVar8;
      fVar13 = local_1c + _DAT_00418f8c;
      pfVar4[1] = fVar13;
      pfVar4[2] = 0.0;
      fVar2 = _DAT_004170d4;
      local_34 = (param_1 - _DAT_00418f88) * _DAT_004170d4 + _DAT_004170d4;
      pfVar4[9] = local_34;
      fVar1 = (local_1c + _DAT_00418f84) * _DAT_00418e1c + fVar2;
      pfVar4[10] = fVar1;
      local_30 = param_1 + _DAT_00418f90;
      pfVar4[0xc] = fVar13;
      pfVar4[0xb] = local_30;
      pfVar4[0xd] = 0.0;
      fVar13 = (param_1 + _DAT_00418f88) * fVar2 + fVar2;
      pfVar4[0x14] = fVar13;
      pfVar4[0x15] = fVar1;
      local_2c = local_1c - _DAT_00418f8c;
      pfVar4[0x16] = local_30;
      pfVar4[0x1f] = fVar13;
      pfVar4[0x17] = local_2c;
      pfVar4[0x18] = 0.0;
      param_1 = (local_1c - _DAT_00418f84) * _DAT_00418e1c + fVar2;
      pfVar4[0x20] = param_1;
      pfVar4[0x21] = fVar8;
      pfVar4[0x22] = local_2c;
      pfVar4[0x2a] = local_34;
      pfVar4[0x23] = 0.0;
      pfVar4[0x2b] = param_1;
      *(int *)((int)this + 0x2c) = *(int *)((int)this + 0x2c) + 1;
      *(int *)((int)this + 0x30) = *(int *)((int)this + 0x30) + 1;
      if (0xff < *(int *)((int)this + 0x30)) {
        *(undefined4 *)((int)this + 0x30) = 0x100;
      }
      *(int *)((int)this + 0x2c) = *(int *)((int)this + 0x2c) % 0x100;
    }
    if ((*(int *)((int)this + 0x48) != 0) && (*(char *)((int)this + 0x58) != '\0')) {
      FUN_00403e48(*(uint **)((int)this + 0x50));
    }
  }
  return;
}


// ==== FUN_0040dd68 @ 0040dd68 ====

void __thiscall FUN_0040dd68(void *this,float *param_1)

{
  int iVar1;
  float *pfVar2;
  float local_44 [4];
  undefined4 local_34;
  undefined4 local_30;
  undefined4 local_2c;
  undefined4 local_28;
  undefined4 local_24;
  undefined4 local_20;
  undefined4 local_1c;
  undefined4 local_18;
  float local_14;
  float local_10;
  float local_c;
  undefined4 local_8;
  
  FUN_0040190f(local_44);
  local_44[3] = (float)*(undefined4 *)((int)this + 0xc);
  local_28 = *(undefined4 *)((int)this + 0x1c);
  local_18 = *(undefined4 *)((int)this + 0x2c);
  local_8 = *(undefined4 *)((int)this + 0x3c);
  local_44[0] = *(float *)this;
  local_14 = -(*(float *)((int)this + 0x30) * *(float *)this +
              *(float *)((int)this + 0x38) * *(float *)((int)this + 0x20) +
              *(float *)((int)this + 0x34) * *(float *)((int)this + 0x10));
  local_34 = *(undefined4 *)((int)this + 4);
  local_24 = *(undefined4 *)((int)this + 8);
  local_44[1] = (float)*(undefined4 *)((int)this + 0x10);
  local_30 = *(undefined4 *)((int)this + 0x14);
  local_20 = *(undefined4 *)((int)this + 0x18);
  local_44[2] = (float)*(undefined4 *)((int)this + 0x20);
  local_10 = -(*(float *)((int)this + 0x38) * *(float *)((int)this + 0x24) +
              *(float *)((int)this + 0x30) * *(float *)((int)this + 4) +
              *(float *)((int)this + 0x14) * *(float *)((int)this + 0x34));
  local_2c = *(undefined4 *)((int)this + 0x24);
  local_1c = *(undefined4 *)((int)this + 0x28);
  local_c = -(*(float *)((int)this + 0x30) * *(float *)((int)this + 8) +
             *(float *)((int)this + 0x34) * *(float *)((int)this + 0x18) +
             *(float *)((int)this + 0x28) * *(float *)((int)this + 0x38));
  pfVar2 = local_44;
  for (iVar1 = 0x10; iVar1 != 0; iVar1 = iVar1 + -1) {
    *param_1 = *pfVar2;
    pfVar2 = pfVar2 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_0040de2a @ 0040de2a ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_0040de2a(float *param_1)

{
  float10 fVar1;
  
  fVar1 = (float10)FUN_0040258d(param_1);
  fVar1 = (float10)_DAT_004170c4 / fVar1;
  *param_1 = (float)(fVar1 * (float10)*param_1);
  param_1[1] = (float)(fVar1 * (float10)param_1[1]);
  param_1[2] = (float)(fVar1 * (float10)param_1[2]);
  return;
}


// ==== FUN_0040de4e @ 0040de4e ====

void __fastcall FUN_0040de4e(int param_1)

{
  int iVar1;
  uint uVar2;
  int iVar3;
  uint *puVar4;
  longlong lVar5;
  int iStack_bc;
  undefined4 uStack_b8;
  int *piStack_b4;
  undefined4 uStack_b0;
  undefined4 local_80;
  undefined1 auStack_7c [60];
  undefined4 local_40 [16];
  
  if (*(int *)(param_1 + 0x30) != 0) {
    FUN_0040190f(&local_80);
    FUN_0040190f(local_40);
    FUN_00402330(2,&local_80);
    FUN_00402330(3,local_40);
    FUN_00401bd0();
    FUN_004019e6(1);
    FUN_00402349(0x17,8);
    if (*(int *)(param_1 + 0x44) != 0) {
      (**(code **)(*DAT_004747ac + 0xf4))();
      (**(code **)(*DAT_004747ac + 0xf4))();
      FUN_004019a0(2);
      FUN_0040191b(1,'\0');
      iVar3 = 0;
      if (0 < *(int *)(param_1 + 0x30)) {
        puVar4 = (uint *)(*(int *)(param_1 + 0x34) + 0x18);
        do {
          lVar5 = FUN_00404224();
          iVar1 = (int)lVar5;
          if (iVar1 < 0) {
            iVar1 = 0;
          }
          if (0xff < iVar1) {
            iVar1 = 0xff;
          }
          uVar2 = iVar1 << 0x18 | 0xffffff;
          *puVar4 = uVar2;
          puVar4[0xb] = uVar2;
          puVar4[0x16] = uVar2;
          puVar4[0x21] = uVar2;
          puVar4 = puVar4 + 0x2c;
          iVar3 = iVar3 + 1;
        } while (iVar3 < *(int *)(param_1 + 0x30));
      }
      iVar3 = 2;
      do {
        uStack_b0 = 4;
        piStack_b4 = DAT_004747ac;
        uStack_b8 = 0x40df69;
        (**(code **)(*DAT_004747ac + 0x124))();
        iVar3 = iVar3 + -1;
      } while (iVar3 != 0);
    }
    FUN_004019e6(1);
    iVar3 = 0;
    if (0 < *(int *)(param_1 + 0x30)) {
      puVar4 = (uint *)(*(int *)(param_1 + 0x34) + 0x18);
      do {
        lVar5 = FUN_00404224();
        iVar1 = (int)lVar5;
        if (iVar1 < 0) {
          iVar1 = 0;
        }
        if (0xff < iVar1) {
          iVar1 = 0xff;
        }
        uVar2 = iVar1 << 0x18 | 0xffffff;
        *puVar4 = uVar2;
        puVar4[0xb] = uVar2;
        puVar4[0x16] = uVar2;
        puVar4[0x21] = uVar2;
        puVar4 = puVar4 + 0x2c;
        iVar3 = iVar3 + 1;
      } while (iVar3 < *(int *)(param_1 + 0x30));
    }
    (**(code **)(*DAT_004747ac + 0xf4))();
    (**(code **)(*DAT_004747ac + 0xf4))();
    uStack_b0 = 0x40dffe;
    FUN_004019a0(0);
    uStack_b0 = 0x40e005;
    FUN_004019e6(2);
    uStack_b0 = *(undefined4 *)(param_1 + 0x34);
    piStack_b4 = (int *)0x65;
    uStack_b8 = *(undefined4 *)(param_1 + 0x38);
    iStack_bc = *(int *)(param_1 + 0x30) * 2;
    (**(code **)(*DAT_004747ac + 0x124))(DAT_004747ac,4,0,*(int *)(param_1 + 0x30) << 2);
    FUN_00402349(0x17,4);
    FUN_00402317(2,&iStack_bc);
    FUN_00402317(3,auStack_7c);
  }
  return;
}


// ==== FUN_0040e058 @ 0040e058 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040e058(void *this,char param_1,void *param_2,int param_3,int param_4,int param_5,uint param_6,
            float param_7,float param_8,float param_9,undefined4 param_10,undefined4 param_11,
            undefined4 param_12,char param_13,char param_14)

{
  int iVar1;
  undefined4 uVar2;
  int iVar3;
  undefined4 uVar4;
  undefined4 *puVar5;
  void *pvVar6;
  float *pfVar7;
  int *piVar8;
  uint *puVar9;
  undefined1 *puVar10;
  int iVar11;
  int iVar12;
  undefined4 *puVar13;
  int iVar14;
  longlong lVar15;
  float fVar16;
  float fVar17;
  float fVar18;
  float fVar19;
  float fVar20;
  float fVar21;
  float fVar22;
  float fVar23;
  float fVar24;
  undefined2 uVar25;
  undefined1 local_64 [12];
  undefined1 local_58 [12];
  undefined1 local_4c [4];
  uint local_48;
  undefined4 uStack_44;
  int local_40;
  int local_3c;
  uint local_38;
  uint local_34;
  uint local_30;
  int local_2c;
  float local_28;
  int *local_24;
  float local_20;
  uint local_1c;
  uint local_18;
  uint local_14;
  float local_10;
  float local_c;
  int local_8;
  
  FUN_004010dc();
  local_1c = FUN_004042e0(0x40000);
  local_c = 0.0;
  local_18 = 0;
  do {
    local_20 = (float)(int)local_c;
    local_8 = 0;
    do {
      local_14 = 0;
      local_28 = (float)local_8;
      puVar5 = (undefined4 *)(local_1c + (local_18 + local_8) * 8);
      do {
        local_10 = 0.0;
        local_24 = (int *)((float)(int)local_14 * _DAT_004170d4 + local_20);
        puVar13 = puVar5;
        do {
          FUN_0040e6f6(this,param_4,(float)(int)local_10 * _DAT_004170d4 + local_28,(float)local_24,
                       1,0x80);
          lVar15 = FUN_00404224();
          local_10 = (float)((int)local_10 + 1);
          *puVar13 = (int)lVar15;
          puVar13 = puVar13 + 1;
        } while ((int)local_10 < 2);
        local_14 = local_14 + 1;
        puVar5 = puVar5 + 0x100;
      } while ((int)local_14 < 2);
      local_8 = local_8 + 1;
    } while (local_8 < 0x80);
    local_18 = local_18 + 0x100;
    local_c = (float)((int)local_c + 1);
  } while ((int)local_18 < 0x8000);
  FUN_004042eb(param_4);
  *(uint *)((int)this + 0x2c) = local_1c;
  *(undefined4 *)this = param_10;
  *(undefined4 *)((int)this + 4) = param_11;
  *(undefined4 *)((int)this + 8) = param_12;
  *(int *)((int)this + 0x30) = param_5;
  *(int *)((int)this + 0x18) = param_3;
  *(uint *)((int)this + 0x34) = param_6;
  uVar2 = FUN_004042e0(param_3 * param_3 * 4);
  *(undefined4 *)((int)this + 0x28) = uVar2;
  iVar3 = (int)(0x100 / (longlong)param_3);
  local_c = 0.0;
  if (0 < param_3) {
    do {
      local_8 = 0;
      local_28 = (float)(iVar3 * (int)local_c);
      local_2c = ((int)local_c + 1) * iVar3;
      do {
        local_18 = 0;
        local_14 = 0;
        if ((int)local_28 < local_2c) {
          iVar11 = iVar3 * local_8;
          iVar14 = (local_8 + 1) * iVar3;
          iVar12 = (int)local_28 * 0x100;
          local_20 = (float)(local_2c - (int)local_28);
          do {
            if (iVar11 < iVar14) {
              local_24 = (int *)(local_1c + (iVar12 + iVar11) * 4);
              local_10 = (float)(iVar14 - iVar11);
              local_14 = local_14 + (int)local_10;
              piVar8 = local_24;
              do {
                iVar1 = *piVar8;
                piVar8 = piVar8 + 1;
                local_18 = local_18 + iVar1;
                local_10 = (float)((int)local_10 + -1);
              } while (local_10 != 0.0);
            }
            iVar12 = iVar12 + 0x100;
            local_20 = (float)((int)local_20 + -1);
          } while (local_20 != 0.0);
          local_20 = 0.0;
        }
        iVar11 = (int)local_c * param_3 + local_8;
        local_8 = local_8 + 1;
        *(int *)(*(int *)((int)this + 0x28) + iVar11 * 4) = (int)local_18 / (int)local_14;
      } while (local_8 < param_3);
      local_c = (float)((int)local_c + 1);
    } while ((int)local_c < param_3);
  }
  uVar4 = FUN_004042e0(0x40000);
  uVar2 = _DAT_00418e30;
  *(undefined4 *)((int)this + 0x24) = uVar4;
  puVar5 = (undefined4 *)FUN_00401558(local_4c,_DAT_00418e30,_DAT_004182bc,uVar2);
  *(undefined4 *)((int)this + 0xc) = *puVar5;
  *(undefined4 *)((int)this + 0x10) = puVar5[1];
  *(undefined4 *)((int)this + 0x14) = puVar5[2];
  pvVar6 = (void *)FUN_004042e0(0xcc);
  if (pvVar6 == (void *)0x0) {
    puVar5 = (undefined4 *)0x0;
  }
  else {
    puVar5 = FUN_004042f6(pvVar6,0,0,0);
  }
  local_20 = (float)param_3;
  iVar11 = *(int *)((int)this + 0x28);
  *(undefined4 **)((int)this + 0x20) = puVar5;
  pfVar7 = (float *)FUN_00401558(local_4c,_DAT_00418f0c,_DAT_00418f0c,0);
  fVar22 = *pfVar7;
  fVar23 = pfVar7[1];
  fVar24 = pfVar7[2];
  pfVar7 = (float *)FUN_00401558(local_58,0x3f800000,0x3f800000,0);
  fVar19 = *pfVar7;
  fVar20 = pfVar7[1];
  fVar21 = pfVar7[2];
  fVar16 = *(float *)((int)this + 0xc);
  fVar17 = *(float *)((int)this + 0x10);
  fVar18 = *(float *)((int)this + 0x14);
  puVar5 = (undefined4 *)FUN_00401558(local_64,local_20,0,local_20);
  FUN_00404875(*(void **)((int)this + 0x20),*puVar5,(float)puVar5[1],puVar5[2],fVar16,fVar17,fVar18,
               fVar19,fVar20,fVar21,fVar22,fVar23,fVar24,iVar11);
  iVar11 = *(int *)((int)this + 0x20);
  *(undefined4 *)(iVar11 + 0x94) = param_10;
  *(undefined4 *)(iVar11 + 0x98) = param_11;
  *(undefined4 *)(iVar11 + 0x9c) = param_12;
  if (param_14 == '\0') {
    FUN_0040e923(this,param_7,param_8,param_9);
  }
  FUN_0040e923(this,param_7,param_8,param_9);
  piVar8 = (int *)FUN_004042e0(0x100000);
  *(int **)((int)this + 0x44) = piVar8;
  if (DAT_00478978 == (uint *)0x0) {
    FUN_00416036(0x10,0x200,0x200,piVar8);
    pvVar6 = (void *)FUN_004042e0(0x18);
    if (pvVar6 == (void *)0x0) {
      DAT_00478978 = (uint *)0x0;
    }
    else {
      DAT_00478978 = FUN_00403dd3(pvVar6,*(uint *)((int)this + 0x44),0x200,0x200,'\0','\0');
    }
  }
  local_40 = 0;
  local_10 = (float)iVar3;
  do {
    local_8 = 0;
    iVar12 = local_40 / iVar3;
    local_2c = param_5 - param_6;
    local_c = 1.0 - (float)(local_40 % iVar3) / local_10;
    iVar11 = local_40 << 10;
    local_40 = local_40 + 1;
    do {
      if (param_14 == '\0') {
        local_48 = *(uint *)(*(int *)((int)this + 0x24) + iVar11) & 0xff;
        uStack_44 = 0;
      }
      local_14 = *(uint *)(local_2c + (int)(iVar11 + param_6));
      local_38 = *(uint *)(iVar11 + param_6);
      local_1c = local_14 >> 0x10 & 0xff;
      local_18 = local_14 >> 8 & 0xff;
      local_14 = local_14 & 0xff;
      local_30 = local_38 >> 0x10 & 0xff;
      local_34 = local_38 >> 8 & 0xff;
      local_38 = local_38 & 0xff;
      local_24 = *(int **)((local_8 / iVar3 + iVar12 * param_3) * 0x2c + 0x10 +
                          *(int *)(*(int *)((int)this + 0x20) + 0xb0));
      local_3c = local_8 + 1;
      local_28 = (float)(local_8 % iVar3);
      local_20 = 1.0 - (float)(int)local_28 / local_10;
      lVar15 = FUN_00404224();
      local_1c = (uint)lVar15;
      lVar15 = FUN_00404224();
      local_18 = (uint)lVar15;
      lVar15 = FUN_00404224();
      local_14 = (uint)lVar15;
      lVar15 = FUN_00404224();
      local_30 = (int)lVar15 + local_1c;
      lVar15 = FUN_00404224();
      local_1c = (uint)lVar15;
      lVar15 = FUN_00404224();
      local_34 = (int)lVar15 + local_18;
      lVar15 = FUN_00404224();
      local_18 = (uint)lVar15;
      lVar15 = FUN_00404224();
      local_38 = (int)lVar15 + local_14;
      lVar15 = FUN_00404224();
      iVar14 = (int)lVar15;
      if (0xff < (int)local_1c) {
        local_1c = 0xff;
      }
      if (0xff < (int)local_18) {
        local_18 = 0xff;
      }
      if (0xff < iVar14) {
        iVar14 = 0xff;
      }
      *(uint *)(iVar11 + *(int *)((int)this + 0x44)) =
           ((local_1c + 0xff00) * 0x100 + local_18) * 0x100 + iVar14;
      local_8 = local_3c;
      iVar11 = iVar11 + 4;
    } while (local_3c < 0x100);
  } while (local_40 < 0x100);
  pvVar6 = (void *)FUN_004042e0(0x18);
  if (pvVar6 == (void *)0x0) {
    puVar9 = (uint *)0x0;
  }
  else {
    puVar9 = FUN_00403dd3(pvVar6,*(uint *)((int)this + 0x44),0x100,0x100,'\0','\0');
  }
  *(uint **)((int)this + 0x38) = puVar9;
  *(undefined4 *)((int)this + 0x3c) = 0;
  *(undefined4 *)((int)this + 0x40) = 0;
  if (param_13 == '\0') {
    FUN_00416036(0x11,0x100,0x100,*(int **)((int)this + 0x44));
    pvVar6 = (void *)FUN_004042e0(0x18);
    if (pvVar6 == (void *)0x0) {
      puVar9 = (uint *)0x0;
    }
    else {
      puVar9 = FUN_00403dd3(pvVar6,*(uint *)((int)this + 0x44),0x100,0x100,'\0','\0');
    }
    *(uint **)((int)this + 0x3c) = puVar9;
    pvVar6 = (void *)FUN_004042e0(0x2c);
    if (pvVar6 == (void *)0x0) {
      puVar10 = (undefined1 *)0x0;
    }
    else {
      puVar10 = FUN_00401c67(pvVar6,*(int *)((int)this + 0x3c),(int)DAT_00478978,0xc018);
    }
    *(undefined1 **)((int)this + 0x40) = puVar10;
    puVar10[0x14] = 0xff;
  }
  if (param_1 == '\b') {
    pvVar6 = (void *)FUN_004042e0(0x18);
    if (pvVar6 == (void *)0x0) {
      puVar9 = (uint *)0x0;
    }
    else {
      puVar9 = FUN_00403dd3(pvVar6,param_6,0x100,0x100,'\0','\0');
    }
    pvVar6 = (void *)FUN_004042e0(0x2c);
    if (pvVar6 == (void *)0x0) {
LAB_0040e6d9:
      puVar10 = (undefined1 *)0x0;
      goto LAB_0040e6db;
    }
    uVar25 = 0x3a;
  }
  else {
    pvVar6 = (void *)FUN_004042e0(0x2c);
    if (pvVar6 == (void *)0x0) goto LAB_0040e6d9;
    uVar25 = 0x18;
    puVar9 = DAT_00478978;
  }
  puVar10 = FUN_00401c67(pvVar6,*(int *)((int)this + 0x38),(int)puVar9,uVar25);
LAB_0040e6db:
  FUN_004045dd(*(void **)((int)this + 0x20),(int)puVar10);
  FUN_00405f0e(param_2,*(int *)((int)this + 0x20));
  return;
}


// ==== FUN_0040e6f6 @ 0040e6f6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040e6f6(void *this,int param_1,float param_2,float param_3,uint param_4,int param_5)

{
  longlong lVar1;
  
  if ((char)param_4 == '\0') {
    FUN_0040e842(this,&param_2,&param_3);
  }
  if (param_1 == *(int *)((int)this + 0x28)) {
    param_5 = *(int *)((int)this + 0x18);
    param_4 = (uint)(0x100 / (longlong)param_5);
    param_2 = param_2 / (float)(int)param_4;
    param_3 = param_3 / (float)(int)param_4;
  }
  lVar1 = FUN_00404224();
  param_4 = (uint)lVar1 & 0xffff;
  FUN_00404224();
  return;
}


// ==== FUN_0040e842 @ 0040e842 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040e842(void *this,float *param_1,float *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float local_10 [2];
  float local_8;
  
  fVar1 = *param_1;
  fVar2 = *param_2;
  FUN_00405271(local_10,(float *)((int)this + 0xc),this);
  fVar3 = _DAT_004182bc;
  if ((((fVar1 < -local_10[0]) || (fVar2 < -local_8)) || (local_10[0] < fVar1)) || (local_8 < fVar2)
     ) {
    *param_2 = 0.0;
    *param_1 = 0.0;
  }
  else {
    *param_1 = ((local_10[0] + fVar1) / (local_10[0] + local_10[0])) * _DAT_004182bc;
    *param_2 = ((local_8 + fVar2) / (local_8 + local_8)) * fVar3;
  }
  return;
}


// ==== FUN_0040e8d2 @ 0040e8d2 ====

float10 __thiscall FUN_0040e8d2(void *param_1,float param_2,float param_3)

{
  float10 fVar1;
  
  fVar1 = (float10)FUN_0040e6f6(param_1,*(int *)((int)param_1 + 0x28),param_2,param_3,0,0x100);
  return fVar1 * (float10)*(float *)((int)param_1 + 4);
}


// ==== FUN_0040e8fb @ 0040e8fb ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 __thiscall FUN_0040e8fb(void *param_1,float param_2,float param_3)

{
  float10 fVar1;
  
  fVar1 = (float10)FUN_0040e6f6(param_1,*(int *)((int)param_1 + 0x24),param_2,param_3,0,0x100);
  return fVar1 * (float10)_DAT_00418fa0;
}


// ==== FUN_0040e923 @ 0040e923 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040e923(void *this,float param_1,float param_2,float param_3)

{
  byte *pbVar1;
  float fVar2;
  float *pfVar3;
  float *pfVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  float10 fVar8;
  longlong lVar9;
  longlong lVar10;
  undefined1 local_64 [12];
  float local_58;
  float fStack_54;
  float fStack_50;
  float local_4c;
  float local_48;
  float local_44;
  float local_40;
  float local_3c;
  float local_38;
  uint local_34;
  undefined4 uStack_30;
  uint local_2c;
  int local_28;
  int local_24;
  float local_20;
  float local_1c;
  int local_18;
  int local_14;
  int local_10;
  int local_c;
  undefined1 local_5;
  
  pfVar3 = (float *)FUN_00401558(&local_4c,1.0 / *(float *)this,1.0 / *(float *)((int)this + 4),
                                 1.0 / *(float *)((int)this + 8));
  pfVar3 = FUN_00405271(&local_40,&param_1,pfVar3);
  param_1 = *pfVar3;
  fVar2 = *(float *)((int)this + 0xc) + *(float *)((int)this + 0xc);
  param_2 = pfVar3[1];
  param_3 = pfVar3[2];
  pfVar3 = &local_1c;
  local_1c = 256.0;
  pfVar4 = (float *)FUN_00401558(&local_4c,(param_1 + *(float *)((int)this + 0xc)) / fVar2,
                                 param_2 * _DAT_00418284,
                                 (param_3 + *(float *)((int)this + 0x14)) / fVar2);
  pfVar3 = FUN_0040268c(&local_40,pfVar4,pfVar3);
  param_1 = *pfVar3;
  param_2 = pfVar3[1];
  param_3 = pfVar3[2];
  FUN_00404282(*(undefined4 **)((int)this + 0x24),0xff,0x40000);
  local_58 = param_1;
  fStack_54 = param_2;
  fStack_50 = param_3;
  FUN_0040de2a(&local_58);
  local_1c = 2.24208e-44;
  do {
    FUN_004010dc();
    local_18 = 0;
    local_14 = 0;
    do {
      local_20 = (float)local_18;
      local_10 = 0;
      do {
        FUN_00401555(&local_4c);
        FUN_00401555(&local_40);
        fVar8 = FUN_00401341();
        local_4c = (float)((fVar8 - (float10)_DAT_004170d4) + (float10)local_10);
        fVar8 = FUN_00401341();
        local_5 = 0xff;
        local_44 = (float)((fVar8 - (float10)_DAT_004170d4) + (float10)local_20);
        lVar9 = FUN_00404224();
        lVar10 = FUN_00404224();
        uStack_30 = 0;
        local_34 = *(uint *)(*(int *)((int)this + 0x2c) + ((int)lVar9 * 0x100 + (int)lVar10) * 4);
        local_48 = (float)local_34;
        pfVar3 = FUN_00402626(local_64,&param_1,&local_4c);
        local_40 = *pfVar3;
        local_3c = pfVar3[1];
        local_38 = pfVar3[2];
        FUN_0040de2a(&local_40);
        if ((local_40 != _DAT_004170c8) || (local_38 != _DAT_004170c8)) {
          while( true ) {
            fVar8 = FUN_00404136(local_40);
            if ((float10)_DAT_004170c4 <= fVar8) break;
            fVar8 = FUN_00404136(local_38);
            if ((float10)_DAT_004170c4 <= fVar8) break;
            local_40 = local_40 * _DAT_00418200;
            local_3c = local_3c * _DAT_00418200;
            local_38 = local_38 * _DAT_00418200;
          }
          local_40 = local_40 * _DAT_004170d4;
          local_3c = local_3c * _DAT_004170d4;
          local_38 = local_38 * _DAT_004170d4;
        }
        lVar9 = FUN_00404224();
        iVar6 = (int)lVar9;
        lVar9 = FUN_00404224();
        iVar7 = (int)lVar9;
        lVar9 = FUN_00404224();
        local_c = (int)lVar9;
        lVar9 = FUN_00404224();
        local_24 = (int)lVar9;
        lVar9 = FUN_00404224();
        local_28 = (int)lVar9;
        lVar9 = FUN_00404224();
        iVar5 = 0;
        do {
          iVar6 = iVar6 + local_24;
          iVar7 = iVar7 + local_28;
          local_c = local_c + (int)lVar9;
          if ((((iVar6 < 0) || (local_c < 0)) || (0xff0000 < iVar6)) ||
             (((0xff0000 < local_c || (iVar7 < 0)) || (0xff0000 < iVar7)))) {
LAB_0040ebad:
            iVar5 = 0x1000;
          }
          else if (iVar7 < *(int *)(*(int *)((int)this + 0x2c) +
                                   ((local_c >> 0x10) * 0x100 + (iVar6 >> 0x10)) * 4) * 0x10000) {
            local_5 = 0;
            goto LAB_0040ebad;
          }
          iVar5 = iVar5 + 1;
        } while (iVar5 < 0x1000);
        pbVar1 = (byte *)(*(int *)((int)this + 0x24) + (local_14 + local_10) * 4);
        local_2c = (uint)*pbVar1;
        lVar9 = FUN_00404224();
        local_10 = local_10 + 1;
        *(int *)pbVar1 = (int)lVar9;
      } while (local_10 < 0x100);
      local_14 = local_14 + 0x100;
      local_18 = local_18 + 1;
    } while (local_14 < 0x10000);
    local_1c = (float)((int)local_1c + -1);
    if (local_1c == 0.0) {
      return;
    }
  } while( true );
}


// ==== FUN_0040ec28 @ 0040ec28 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall
FUN_0040ec28(void *this,void *param_1,int param_2,undefined4 param_3,undefined1 param_4,uint param_5
            ,char param_6,char param_7,char param_8)

{
  short sVar1;
  uint uVar2;
  uint *puVar3;
  void *pvVar4;
  undefined4 uVar5;
  undefined4 *puVar6;
  undefined1 *puVar7;
  float fVar8;
  float *pfVar9;
  int iVar10;
  uint *puVar11;
  float10 fVar12;
  float10 extraout_ST0;
  float10 extraout_ST1;
  longlong lVar13;
  float fVar14;
  float fVar15;
  float fVar16;
  float fVar17;
  float fVar18;
  float fVar19;
  float fVar20;
  float fVar21;
  undefined1 local_40 [12];
  undefined1 local_34 [12];
  undefined1 local_28 [12];
  undefined1 local_1c [4];
  float local_18;
  uint local_10;
  uint *local_c;
  int local_8;
  
  uVar2 = param_5;
  FUN_004010dc();
  *(undefined1 *)this = param_4;
  *(int *)((int)this + 8) = param_2;
  *(undefined4 *)((int)this + 4) = 0;
  *(char *)((int)this + 0x1c) = param_8;
  puVar3 = (uint *)FUN_004042e0(0x40000);
  FUN_00416036(7,0x100,0x100,(int *)puVar3);
  local_c = (uint *)0x10000;
  puVar11 = puVar3;
  do {
    iVar10 = (*puVar11 >> 0x18) - 0x20;
    if (iVar10 < 0) {
      iVar10 = 0;
    }
    *puVar11 = *puVar11 & 0xffffff | iVar10 << 0x18;
    puVar11 = puVar11 + 1;
    local_c = (uint *)((int)local_c + -1);
  } while (local_c != (uint *)0x0);
  pvVar4 = (void *)FUN_004042e0(0x18);
  if (pvVar4 == (void *)0x0) {
    local_c = (uint *)0x0;
  }
  else {
    local_c = FUN_00403dd3(pvVar4,(uint)puVar3,0x100,0x100,'\0','\0');
  }
  FUN_004042eb((int)puVar3);
  uVar5 = FUN_004042e0(param_2 * 0xc);
  *(undefined4 *)((int)this + 0x18) = uVar5;
  pvVar4 = (void *)FUN_004042e0(0xcc);
  if (pvVar4 == (void *)0x0) {
    puVar6 = (undefined4 *)0x0;
  }
  else {
    puVar6 = FUN_004042f6(pvVar4,param_2 << 2,param_2 * 2,0);
  }
  *(undefined4 **)((int)this + 0xc) = puVar6;
  pvVar4 = (void *)FUN_004042e0(0x2c);
  if (pvVar4 == (void *)0x0) {
    puVar7 = (undefined1 *)0x0;
  }
  else {
    puVar7 = FUN_00401c67(pvVar4,(int)local_c,0,0x1811);
  }
  FUN_004045dd(*(void **)((int)this + 0xc),(int)puVar7);
  puVar6 = *(undefined4 **)(*(int *)((int)this + 0xc) + 0xb0);
  local_8 = *(int *)(*(int *)((int)this + 0xc) + 0xb8);
  if (0 < param_2) {
    sVar1 = 0;
    iVar10 = 0;
    local_c = (uint *)param_2;
    do {
      fVar12 = FUN_00401341();
      *(float *)(iVar10 + *(int *)((int)this + 0x18)) =
           (float)(fVar12 * (float10)_DAT_00418230 + (float10)_DAT_004170c4);
      fVar12 = FUN_00401341();
      *(float *)(iVar10 + 4 + *(int *)((int)this + 0x18)) = (float)fVar12;
      fVar12 = FUN_00401341();
      *(float *)(iVar10 + 8 + *(int *)((int)this + 0x18)) = (float)fVar12;
      uVar5 = _DAT_004170cc;
      *puVar6 = _DAT_004170cc;
      puVar6[1] = 0x3f800000;
      puVar6[2] = 0;
      puVar6[0xb] = 0x3f800000;
      puVar6[0xc] = 0x3f800000;
      puVar6[0xd] = 0;
      puVar6[0x16] = uVar5;
      puVar6[0x17] = uVar5;
      puVar6[0x18] = 0;
      puVar6[0x21] = 0x3f800000;
      puVar6[0x22] = uVar5;
      puVar6[0x23] = 0;
      puVar6 = puVar6 + 0x2c;
      FUN_00409ca6(&local_8,sVar1,0x418eec);
      sVar1 = sVar1 + 4;
      iVar10 = iVar10 + 0xc;
      local_c = (uint *)((int)local_c + -1);
    } while (local_c != (uint *)0x0);
    local_c = (uint *)0x0;
  }
  if (DAT_00478960 == (undefined4 *)0x0) {
    pvVar4 = (void *)FUN_004042e0(0xc);
    if (pvVar4 == (void *)0x0) {
      DAT_00478960 = (undefined4 *)0x0;
    }
    else {
      DAT_00478960 = FUN_00402b16(pvVar4,0x100,0x100,'\x01');
    }
  }
  pvVar4 = (void *)FUN_004042e0(0xcc);
  if (pvVar4 == (void *)0x0) {
    puVar6 = (undefined4 *)0x0;
  }
  else {
    puVar6 = FUN_004042f6(pvVar4,4,2,0);
  }
  *(undefined4 **)((int)this + 0x10) = puVar6;
  pvVar4 = (void *)FUN_004042e0(0x2c);
  if (pvVar4 == (void *)0x0) {
    puVar7 = (undefined1 *)0x0;
  }
  else {
    puVar7 = FUN_00401ca8(pvVar4,(int)DAT_00478960,0,0x1111);
  }
  FUN_004045dd(*(void **)((int)this + 0x10),(int)puVar7);
  uVar5 = _DAT_004170cc;
  puVar6 = *(undefined4 **)(*(int *)((int)this + 0x10) + 0xb0);
  local_8 = *(int *)(*(int *)((int)this + 0x10) + 0xb8);
  *puVar6 = _DAT_004170cc;
  puVar6[1] = 0x3f800000;
  puVar6[2] = 0;
  puVar6[7] = 0;
  puVar6[8] = 0;
  puVar6[0xb] = 0x3f800000;
  puVar6[0xc] = 0x3f800000;
  puVar6[0xd] = 0;
  puVar6[0x12] = 0x3f800000;
  puVar6[0x13] = 0;
  puVar6[0x16] = uVar5;
  puVar6[0x17] = uVar5;
  puVar6[0x18] = 0;
  puVar6[0x1d] = 0;
  puVar6[0x1e] = 0x3f800000;
  puVar6[0x21] = 0x3f800000;
  puVar6[0x22] = uVar5;
  puVar6[0x23] = 0;
  puVar6[0x28] = 0x3f800000;
  puVar6[0x29] = 0x3f800000;
  FUN_00409ca6(&local_8,0,0x418eec);
  if (DAT_00478964 == (undefined4 *)0x0) {
    pvVar4 = (void *)FUN_004042e0(0xc);
    if (pvVar4 == (void *)0x0) {
      DAT_00478964 = (undefined4 *)0x0;
    }
    else {
      DAT_00478964 = FUN_00402b16(pvVar4,0x200,0x200,'\x01');
    }
  }
  if (param_6 != '\0') {
    if (param_7 == '\0') {
      _param_4 = param_2;
      if (param_8 != '\0') {
        _param_4 = 8;
      }
      pvVar4 = (void *)FUN_004042e0(0xcc);
      if (pvVar4 == (void *)0x0) {
        puVar6 = (undefined4 *)0x0;
      }
      else {
        puVar6 = FUN_004042f6(pvVar4,_param_4 << 2,_param_4 * 2,0);
      }
      *(undefined4 **)((int)this + 0x14) = puVar6;
      pfVar9 = (float *)puVar6[0x2c];
      local_8 = puVar6[0x2e];
      _param_6 = 0;
      if (0 < _param_4) {
        param_5 = 0;
        local_10 = uVar2 & 0xffffff;
        local_c = (uint *)(float)_param_4;
        do {
          _param_7 = _DAT_004170c4 - (float)_param_6 * _DAT_00418f04;
          if (param_8 != '\0') {
            _param_7 = 1.0;
          }
          lVar13 = FUN_00404224();
          *pfVar9 = (float)extraout_ST1;
          fVar8 = (float)((int)lVar13 << 0x18 | local_10);
          pfVar9[1] = (float)extraout_ST0;
          pfVar9[6] = fVar8;
          pfVar9[2] = (float)extraout_ST1;
          pfVar9[7] = 0.0;
          pfVar9[8] = 0.0;
          fVar20 = _DAT_00418fb8;
          pfVar9[0xb] = _DAT_00418fb8;
          pfVar9[0x11] = fVar8;
          pfVar9[0xc] = (float)extraout_ST0;
          pfVar9[0xd] = (float)extraout_ST1;
          pfVar9[0x12] = _param_7;
          pfVar9[0x13] = 0.0;
          pfVar9[0x1c] = fVar8;
          pfVar9[0x16] = (float)extraout_ST1;
          pfVar9[0x17] = (float)extraout_ST0;
          pfVar9[0x18] = fVar20;
          pfVar9[0x1d] = 0.0;
          pfVar9[0x1e] = _param_7;
          pfVar9[0x21] = fVar20;
          pfVar9[0x27] = fVar8;
          pfVar9[0x22] = (float)extraout_ST0;
          pfVar9[0x23] = 1500.0;
          pfVar9[0x28] = _param_7;
          pfVar9[0x29] = _param_7;
          pfVar9 = pfVar9 + 0x2c;
          FUN_00409ca6(&local_8,(short)param_5,0x418eec);
          _param_6 = _param_6 + 1;
          param_5 = param_5 + 4;
        } while (_param_6 < _param_4);
      }
    }
    else {
      pvVar4 = (void *)FUN_004042e0(0xcc);
      if (pvVar4 == (void *)0x0) {
        puVar6 = (undefined4 *)0x0;
      }
      else {
        puVar6 = FUN_004042f6(pvVar4,0,0,0);
      }
      iVar10 = 0;
      *(undefined4 **)((int)this + 0x14) = puVar6;
      pfVar9 = (float *)FUN_00401558(local_1c,0x3f800000,0x3f800000,0x3f800000);
      fVar20 = *pfVar9;
      fVar8 = pfVar9[1];
      fVar21 = pfVar9[2];
      pfVar9 = (float *)FUN_00401558(local_28,0x3f800000,0x3f800000,0x3f800000);
      fVar17 = *pfVar9;
      fVar18 = pfVar9[1];
      fVar19 = pfVar9[2];
      pfVar9 = (float *)FUN_00401558(local_34,_DAT_00418e9c,0,_DAT_00418e9c);
      fVar14 = *pfVar9;
      fVar15 = pfVar9[1];
      fVar16 = pfVar9[2];
      puVar6 = (undefined4 *)FUN_00401558(local_40,_DAT_00418f0c,param_3,_DAT_00418f0c);
      FUN_00404875(*(void **)((int)this + 0x14),*puVar6,(float)puVar6[1],puVar6[2],fVar14,fVar15,
                   fVar16,fVar17,fVar18,fVar19,fVar20,fVar8,fVar21,iVar10);
      iVar10 = 0;
      if (0 < *(int *)(*(int *)((int)this + 0x14) + 0xac)) {
        pfVar9 = *(float **)(*(int *)((int)this + 0x14) + 0xb0);
        do {
          fVar20 = pfVar9[2] * _DAT_00418fb4;
          pfVar9[6] = (float)(param_5 | 0xff000000);
          FUN_00401558(local_1c,*pfVar9 * _DAT_00418fb4,pfVar9[1],fVar20);
          fVar12 = (float10)FUN_00408c11(local_1c,(float *)&DAT_00478938);
          iVar10 = iVar10 + 1;
          pfVar9[1] = (float)((float10)local_18 *
                             ((float10)_DAT_00418fac - fVar12 * (float10)_DAT_00418fb0));
          pfVar9 = pfVar9 + 0xb;
        } while (iVar10 < *(int *)(*(int *)((int)this + 0x14) + 0xac));
      }
    }
    if (param_8 == '\0') {
      pvVar4 = (void *)FUN_004042e0(0x2c);
      if (pvVar4 == (void *)0x0) {
        puVar7 = (undefined1 *)0x0;
      }
      else {
        puVar7 = FUN_00401ca8(pvVar4,(int)DAT_00478964,0,0x1050);
      }
      FUN_004045dd(*(void **)((int)this + 0x14),(int)puVar7);
    }
    else {
      pvVar4 = (void *)FUN_004042e0(0x2c);
      if (pvVar4 == (void *)0x0) {
        puVar7 = (undefined1 *)0x0;
      }
      else {
        puVar7 = FUN_00401ca8(pvVar4,(int)DAT_00478964,0,0x3091);
      }
      FUN_004045dd(*(void **)((int)this + 0x14),(int)puVar7);
      *(undefined1 *)(*(int *)(*(int *)((int)this + 0x14) + 0xc4) + 0x14) = 1;
    }
    FUN_00405f0e(param_1,*(int *)((int)this + 0x14));
  }
  return;
}


// ==== FUN_0040f27e @ 0040f27e ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f27e(void *this,float param_1)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  undefined4 uVar8;
  float *pfVar9;
  uint uVar10;
  uint *puVar11;
  float *pfVar12;
  int iVar13;
  float *pfVar14;
  int local_c;
  int local_8;
  
  *(float *)((int)this + 4) = param_1 + *(float *)((int)this + 4);
  fVar7 = _DAT_00418e48;
  fVar6 = _DAT_004170c4;
  if ((*(byte *)(*(int *)((int)this + 0x14) + 200) & 2) == 0) {
    iVar13 = *(int *)(*(int *)((int)this + 0xc) + 0xb0);
    local_8 = 0;
    if (0 < *(int *)((int)this + 8)) {
      pfVar14 = (float *)(iVar13 + 0x20);
      pfVar12 = (float *)(iVar13 + 0x1c);
      puVar11 = (uint *)(iVar13 + 0x18);
      local_c = 0;
      param_1 = 8.82818e-44;
      do {
        pfVar9 = (float *)(*(int *)((int)this + 0x18) + local_c);
        fVar1 = *pfVar9;
        local_c = local_c + 0xc;
        fVar2 = ((float)(local_8 * local_8) * fVar7 + fVar7) * *(float *)((int)this + 4);
        fVar3 = fVar2 + pfVar9[1];
        fVar2 = fVar2 + pfVar9[2];
        fVar5 = fVar3 * fVar1;
        *pfVar12 = fVar5;
        fVar4 = fVar2 * fVar1;
        *pfVar14 = fVar4;
        uVar10 = (((uint)param_1 | 0xffffff00) << 8 | (uint)param_1) << 8 | (uint)param_1;
        *puVar11 = uVar10;
        param_1 = (float)((int)param_1 + 0x3f);
        fVar3 = (fVar3 + fVar6) * fVar1;
        puVar11[0xb] = uVar10;
        pfVar12[0xb] = fVar3;
        pfVar14[0xb] = fVar4;
        puVar11[0x16] = uVar10;
        pfVar12[0x16] = fVar5;
        fVar1 = (fVar2 + fVar6) * fVar1;
        pfVar14[0x16] = fVar1;
        pfVar14[0x21] = fVar1;
        pfVar14 = pfVar14 + 0x2c;
        puVar11[0x21] = uVar10;
        puVar11 = puVar11 + 0x2c;
        pfVar12[0x21] = fVar3;
        pfVar12 = pfVar12 + 0x2c;
        local_8 = local_8 + 1;
      } while (local_8 < *(int *)((int)this + 8));
    }
    *(undefined1 *)(*(int *)(*(int *)((int)this + 0x10) + 0xc4) + 0x14) = *(undefined1 *)this;
    uVar8 = DAT_00474790;
    DAT_00474790 = 0;
    FUN_00401bd0();
    FUN_00402b4f(DAT_00478960);
    (**(code **)(**(int **)((int)this + 0xc) + 4))(0);
    DAT_00474790 = uVar8;
    FUN_00402b4f(DAT_00478964);
    (**(code **)(**(int **)((int)this + 0x10) + 4))(0);
    if (*(char *)((int)this + 0x1c) == '\0') {
      iVar13 = 0;
      if (0 < *(int *)(*(int *)((int)this + 0x14) + 0xac)) {
        puVar11 = (uint *)(*(int *)(*(int *)((int)this + 0x14) + 0xb0) + 0x18);
        do {
          *puVar11 = (*(byte *)this + 1) * -0x1000000 | *puVar11 & 0xffffff;
          puVar11 = puVar11 + 0xb;
          iVar13 = iVar13 + 1;
        } while (iVar13 < *(int *)(*(int *)((int)this + 0x14) + 0xac));
      }
    }
    FUN_00402c72('\x01');
  }
  return;
}


// ==== FUN_0040f42f @ 0040f42f ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f42f(void *this,void *param_1,float param_2)

{
  int *piVar1;
  void *pvVar2;
  undefined4 *puVar3;
  uint *puVar4;
  undefined1 *puVar5;
  float *pfVar6;
  int iVar7;
  float10 fVar8;
  undefined4 uVar9;
  undefined1 local_18 [12];
  int local_c;
  void *local_8;
  
  FUN_004010dc();
  *(float *)((int)this + 8) = param_2;
  *(undefined4 *)((int)this + 0x4c) = 0;
  piVar1 = (int *)FUN_004042e0(0x40000);
  FUN_00416036(8,0x100,0x100,piVar1);
  pvVar2 = (void *)FUN_004042e0(0xcc);
  iVar7 = 0;
  if (pvVar2 == (void *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    puVar3 = FUN_004042f6(pvVar2,0x20,0x1e,0);
  }
  *(undefined4 **)((int)this + 100) = puVar3;
  local_8 = (void *)FUN_004042e0(0x2c);
  if (local_8 == (void *)0x0) {
    puVar5 = (undefined1 *)0x0;
  }
  else {
    pvVar2 = (void *)FUN_004042e0(0x18);
    if (pvVar2 == (void *)0x0) {
      puVar4 = (uint *)0x0;
    }
    else {
      puVar4 = FUN_00403dd3(pvVar2,(uint)piVar1,0x100,0x100,'\0','\0');
    }
    puVar5 = FUN_00401c67(local_8,(int)puVar4,0,0x11);
  }
  FUN_004045dd(*(void **)((int)this + 100),(int)puVar5);
  FUN_004042eb((int)piVar1);
  local_c = *(int *)(*(int *)((int)this + 100) + 0xb8);
  do {
    FUN_00409ca6(&local_c,(short)iVar7,0x418ed4);
    iVar7 = iVar7 + 2;
  } while (iVar7 < 0x1e);
  fVar8 = FUN_00401341();
  *(float *)((int)this + 0x54) = (float)(fVar8 * (float10)_DAT_00418e24 + (float10)_DAT_00418fc4);
  fVar8 = FUN_00401341();
  *(float *)((int)this + 0x4c) = (float)(fVar8 + fVar8 + (float10)_DAT_00418200);
  fVar8 = FUN_00401341();
  *(float *)((int)this + 0x50) = (float)(fVar8 + (float10)_DAT_004170c4);
  fVar8 = FUN_00401341();
  *(float *)this = (float)(fVar8 + (float10)_DAT_004170c4);
  fVar8 = FUN_00401341();
  *(float *)((int)this + 4) = (float)(fVar8 + (float10)_DAT_004170c4);
  uVar9 = 0;
  fVar8 = FUN_00401341();
  pfVar6 = (float *)FUN_00401558(local_18,0,
                                 (float)((fVar8 * (float10)_DAT_00418fc0 + (float10)_DAT_00418ea4) *
                                        (float10)_DAT_00418220),uVar9);
  FUN_00402280((void *)((int)this + 0xc),pfVar6);
  FUN_0040f5a8(this,0.0);
  FUN_004045f1(*(int *)((int)this + 100));
  FUN_00405f0e(param_1,*(int *)((int)this + 100));
  return;
}


// ==== FUN_0040f5a8 @ 0040f5a8 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f5a8(void *this,float param_1)

{
  float fVar1;
  undefined4 *puVar2;
  float *pfVar3;
  float *pfVar4;
  undefined4 *puVar5;
  float10 fVar6;
  float10 fVar7;
  longlong lVar8;
  float *pfVar9;
  undefined1 local_70 [12];
  undefined1 local_64 [12];
  undefined1 local_58 [12];
  undefined1 local_4c [12];
  undefined1 local_40 [12];
  undefined1 local_34 [12];
  undefined4 local_28;
  undefined4 local_24;
  undefined4 local_20;
  float local_1c;
  float local_18;
  float local_14;
  float *local_10;
  float local_c;
  int local_8;
  
  fVar1 = param_1 * *(float *)((int)this + 0x50) + *(float *)((int)this + 0x4c);
  *(float *)((int)this + 0x4c) = fVar1;
  local_10 = this;
  puVar2 = (undefined4 *)
           FUN_00401558(local_34,0,(float)*(int *)((int)this + 8) * _DAT_00418ea4 + _DAT_00418f04,
                        _DAT_00418e78 - fVar1 * *(float *)((int)this + 0x54));
  *(undefined4 *)((int)this + 0x58) = *puVar2;
  *(undefined4 *)((int)this + 0x5c) = puVar2[1];
  *(undefined4 *)((int)this + 0x60) = puVar2[2];
  if (_DAT_00418200 <= *(float *)((int)this + 0x4c)) {
    *(float *)((int)this + 0x4c) = *(float *)((int)this + 0x4c) - _DAT_00418200;
  }
  puVar2 = *(undefined4 **)(*(int *)((int)this + 100) + 0xb0);
  FUN_00401555(&local_28);
  local_8 = 0;
  do {
    pfVar4 = local_10;
    local_c = (float)local_8 * _DAT_00418fcc;
    local_18 = local_c * _DAT_00418eb8 - _DAT_004170c0;
    fVar6 = FUN_004041dd(*local_10 * local_10[0x13] +
                         (local_c * *local_10 + local_c * *local_10) * (float)_DAT_00418220);
    local_1c = (float)fVar6;
    fVar7 = FUN_004041ee(pfVar4[1] * pfVar4[0x13] +
                         (local_c * pfVar4[1] + local_c * pfVar4[1]) * (float)_DAT_00418220);
    fVar6 = (float10)local_1c;
    local_1c = (float)(local_8 + -8);
    local_14 = (float)(fVar7 * fVar6 * (float10)_DAT_00418e5c);
    FUN_00404136((float)(int)local_1c * _DAT_00418f64);
    lVar8 = FUN_00404224();
    local_1c = (float)lVar8;
    lVar8 = FUN_00404224();
    local_1c = (float)((int)lVar8 << 0x18 | 0x6f6f6f);
    pfVar9 = pfVar4 + 3;
    pfVar4 = pfVar4 + 0x16;
    pfVar3 = (float *)FUN_00401558(local_34,local_18,0,local_14 - _DAT_00418fc8);
    pfVar4 = FUN_0040523d(local_40,pfVar3,pfVar4);
    puVar5 = FUN_00402a6f(local_4c,pfVar4,pfVar9);
    local_28 = *puVar5;
    local_24 = puVar5[1];
    local_20 = puVar5[2];
    *puVar2 = local_28;
    puVar2[1] = local_24;
    puVar2[2] = local_20;
    puVar2[8] = 0;
    puVar2[7] = local_c;
    fVar1 = local_14 + _DAT_00418fc8;
    puVar2[6] = local_1c;
    pfVar9 = local_10 + 3;
    pfVar4 = local_10 + 0x16;
    pfVar3 = (float *)FUN_00401558(local_58,local_18,0,fVar1);
    pfVar4 = FUN_0040523d(local_64,pfVar3,pfVar4);
    puVar5 = FUN_00402a6f(local_70,pfVar4,pfVar9);
    local_28 = *puVar5;
    local_24 = puVar5[1];
    local_20 = puVar5[2];
    puVar2[0xb] = local_28;
    puVar2[0xc] = local_24;
    puVar2[0x13] = 0x3f800000;
    puVar2[0xd] = local_20;
    puVar2[0x12] = local_c;
    puVar2[0x11] = local_1c;
    puVar2 = puVar2 + 0x16;
    local_8 = local_8 + 1;
  } while (local_8 < 0x10);
  return;
}


// ==== FUN_0040f803 @ 0040f803 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040f803(void *this,void *param_1,int param_2)

{
  undefined2 *puVar1;
  int *piVar2;
  void *pvVar3;
  uint *puVar4;
  undefined1 *puVar5;
  undefined4 uVar6;
  float *pfVar7;
  uint uVar8;
  uint uVar9;
  uint uVar10;
  int iVar11;
  undefined4 *puVar12;
  float10 fVar13;
  longlong lVar14;
  float in_stack_00000018;
  undefined3 uStack0000001c;
  char in_stack_00000020;
  float fVar15;
  undefined1 local_34 [12];
  undefined1 local_28 [12];
  float local_1c;
  undefined4 *local_18;
  void *local_14;
  void *local_10;
  float local_c;
  int *local_8;
  
  local_14 = this;
  FUN_004010dc();
  *(int *)((int)this + 0xc) = param_2;
  *(undefined4 *)this = 0;
  *(uint *)((int)this + 8) = _uStack0000001c;
  local_8 = (int *)FUN_004042e0(0x40000);
  if (in_stack_00000020 == '\0') {
    FUN_00416036(10,0x100,0x100,local_8);
    _uStack0000001c = CONCAT13(1,uStack0000001c);
  }
  else {
    FUN_00416036(9,0x100,0x100,local_8);
    _uStack0000001c = CONCAT13(3,uStack0000001c);
  }
  local_10 = (void *)FUN_004042e0(0x2c);
  if (local_10 == (void *)0x0) {
    puVar5 = (undefined1 *)0x0;
  }
  else {
    pvVar3 = (void *)FUN_004042e0(0x18);
    if (pvVar3 == (void *)0x0) {
      puVar4 = (uint *)0x0;
    }
    else {
      puVar4 = FUN_00403dd3(pvVar3,(uint)local_8,0x100,0x100,'\0','\0');
    }
    puVar5 = FUN_00401c67(local_10,(int)puVar4,0,0x1310);
  }
  *(undefined1 **)((int)this + 0x10) = puVar5;
  FUN_004042eb((int)local_8);
  uVar6 = FUN_004042e0(param_2 << 2);
  *(undefined4 *)((int)this + 0x14) = uVar6;
  pvVar3 = (void *)FUN_004042e0(param_2 * 0x14);
  if (pvVar3 == (void *)0x0) {
    pvVar3 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar3,0x14,param_2,FUN_00408d5f);
  }
  local_8 = (int *)0x0;
  *(void **)((int)this + 0x18) = pvVar3;
  if (0 < param_2) {
    local_c = in_stack_00000018 * _DAT_004182c8;
    uVar8 = _uStack0000001c >> 0x18;
    _uStack0000001c = 0;
    local_1c = (float)(int)-uVar8 * _DAT_004182cc;
    local_10 = (void *)((float)uVar8 * _DAT_004182cc);
    do {
      puVar12 = (undefined4 *)(*(int *)((int)this + 0x18) + _uStack0000001c);
      puVar12[3] = 0x3f800000;
      local_18 = puVar12;
      fVar13 = FUN_00401341();
      puVar12[3] = (float)((fVar13 + (float10)_DAT_004170d4) * (float10)(float)puVar12[3] *
                           (float10)in_stack_00000018 * (float10)_DAT_00418fd8);
      *puVar12 = DAT_00478938;
      puVar12[1] = DAT_0047893c;
      puVar12[2] = DAT_00478940;
      fVar13 = FUN_00401341();
      local_18[4] = (float)(fVar13 * (float10)_DAT_004170c0);
      pvVar3 = (void *)FUN_004042e0(0xcc);
      if (pvVar3 == (void *)0x0) {
        puVar12 = (undefined4 *)0x0;
      }
      else {
        puVar12 = FUN_004042f6(pvVar3,6,4,0);
      }
      piVar2 = local_8;
      *(undefined4 **)(*(int *)((int)this + 0x14) + (int)local_8 * 4) = puVar12;
      FUN_004045dd(*(void **)(*(int *)((int)this + 0x14) + (int)local_8 * 4),
                   *(int *)((int)this + 0x10));
      fVar13 = FUN_00401341();
      fVar15 = (float)(fVar13 * (float10)in_stack_00000018 + fVar13 * (float10)in_stack_00000018 +
                      (float10)local_c);
      uVar6 = 0;
      fVar13 = FUN_00401341();
      pfVar7 = (float *)FUN_00401558(local_28,(float)(fVar13 * (float10)in_stack_00000018 +
                                                      fVar13 * (float10)in_stack_00000018 +
                                                     (float10)local_c),uVar6,fVar15);
      puVar12 = FUN_0040523d(local_34,(float *)&stack0x0000000c,pfVar7);
      iVar11 = *(int *)(*(int *)((int)this + 0x14) + (int)piVar2 * 4);
      *(undefined4 *)(iVar11 + 0x88) = *puVar12;
      *(undefined4 *)(iVar11 + 0x8c) = puVar12[1];
      *(undefined4 *)(iVar11 + 0x90) = puVar12[2];
      iVar11 = *(int *)(*(int *)((int)this + 0x14) + (int)local_8 * 4);
      puVar12 = *(undefined4 **)(iVar11 + 0xb0);
      puVar1 = *(undefined2 **)(iVar11 + 0xb8);
      uVar8 = FUN_00404258();
      uVar9 = FUN_00404258();
      uVar10 = FUN_00404258();
      piVar2 = local_8;
      pvVar3 = local_14;
      uVar8 = ((int)uVar8 % 100 + 0x9b) * 0x100 | ((int)uVar9 % 100 + 0xff9b) * 0x10000 |
              (int)uVar10 % 100 + 0x9bU | 0xff000000;
      if (in_stack_00000020 != '\0') {
        uVar8 = 0xffffffff;
      }
      puVar12[6] = uVar8;
      *puVar12 = 0;
      puVar12[1] = 0;
      uVar6 = _DAT_00418fd4;
      puVar12[2] = _DAT_00418fd4;
      puVar12[7] = 0;
      puVar12[8] = 0x3f800000;
      puVar12[0x11] = uVar8;
      puVar12[0xb] = 0;
      puVar12[0xc] = 0;
      fVar15 = _DAT_004182cc;
      puVar12[0xd] = _DAT_004182cc;
      puVar12[0x12] = 0;
      puVar12[0x13] = 0;
      puVar12[0x16] = local_1c;
      puVar12[0x1c] = uVar8;
      puVar12[0x17] = 0;
      puVar12[0x18] = uVar6;
      puVar12[0x1d] = 0x3f800000;
      puVar12[0x1e] = 0x3f800000;
      puVar12[0x21] = local_1c;
      puVar12[0x27] = uVar8;
      puVar12[0x22] = 0;
      puVar12[0x23] = fVar15;
      puVar12[0x28] = 0x3f800000;
      puVar12[0x29] = 0;
      puVar12[0x2c] = local_10;
      puVar12[0x32] = uVar8;
      puVar12[0x2d] = 0;
      puVar12[0x2e] = uVar6;
      puVar12[0x33] = 0x3f800000;
      puVar12[0x34] = 0x3f800000;
      puVar12[0x37] = local_10;
      puVar12[0x39] = 0x40400000;
      puVar12[0x38] = 0;
      puVar12[0x3d] = uVar8;
      puVar12[0x3e] = 0x3f800000;
      puVar12[0x3f] = 0;
      *puVar1 = 0;
      puVar1[1] = 2;
      puVar1[2] = 1;
      puVar1[3] = 2;
      puVar1[4] = 3;
      puVar1[5] = 1;
      puVar1[6] = 0;
      puVar1[7] = 1;
      puVar1[8] = 4;
      puVar1[9] = 1;
      puVar1[10] = 5;
      puVar1[0xb] = 4;
      FUN_00405f0e(param_1,*(int *)(*(int *)((int)local_14 + 0x14) + (int)local_8 * 4));
      FUN_00401341();
      lVar14 = FUN_00404224();
      iVar11 = (int)lVar14;
      if (0 < iVar11) {
        do {
          FUN_0040fba1(pvVar3,1.0,(ushort)piVar2);
          iVar11 = iVar11 + -1;
        } while (iVar11 != 0);
      }
      _uStack0000001c = _uStack0000001c + 0x14;
      local_8 = (int *)((int)piVar2 + 1);
      this = local_14;
    } while ((int)local_8 < param_2);
  }
  return;
}


// ==== FUN_0040fba1 @ 0040fba1 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_0040fba1(void *this,float param_1,ushort param_2)

{
  float *pfVar1;
  float *pfVar2;
  float *pfVar3;
  int iVar4;
  float10 fVar5;
  float local_7c [16];
  undefined1 local_3c [12];
  undefined1 local_30 [12];
  undefined1 local_24 [12];
  int local_18;
  float local_14;
  float local_10;
  float *local_c;
  uint local_8;
  
  *(float *)this = param_1 + *(float *)this;
  local_c = this;
  FUN_0040190f(local_7c);
  local_8 = 0;
  if (0 < *(int *)((int)this + 0xc)) {
    local_14 = param_1 * _DAT_00418260;
    do {
      if (param_2 != 0xffff) {
        local_8 = (uint)param_2;
      }
      iVar4 = *(int *)((int)*(float *)((int)this + 0x14) + local_8 * 4);
      local_10 = param_1 * *(float *)((int)*(float *)((int)this + 0x18) + 0xc + local_8 * 0x14);
      pfVar1 = (float *)((int)*(float *)((int)this + 0x18) + local_8 * 0x14);
      local_18 = iVar4;
      fVar5 = FUN_004041dd(*(float *)this * _DAT_00418fdc + pfVar1[4]);
      *pfVar1 = (float)(fVar5 * (float10)*(float *)((int)this + 8));
      pfVar1[1] = local_14 + pfVar1[1];
      FUN_00401950(local_7c);
      FUN_00402280(local_7c,pfVar1);
      pfVar3 = local_7c;
      pfVar2 = (float *)FUN_00401558(local_24,0,0,local_10);
      pfVar3 = FUN_00402a6f(local_30,pfVar2,pfVar3);
      pfVar3 = FUN_0040523d(local_3c,(float *)(iVar4 + 0x88),pfVar3);
      *(float *)(iVar4 + 0x88) = *pfVar3;
      *(float *)(iVar4 + 0x8c) = pfVar3[1];
      *(float *)(iVar4 + 0x90) = pfVar3[2];
      pfVar3 = local_7c;
      pfVar2 = (float *)(local_18 + 8);
      for (iVar4 = 0x10; iVar4 != 0; iVar4 = iVar4 + -1) {
        *pfVar2 = *pfVar3;
        pfVar3 = pfVar3 + 1;
        pfVar2 = pfVar2 + 1;
      }
      if (_DAT_004170c8 <= *pfVar1) {
        *(float *)(local_18 + 0x8c) = *(float *)(local_18 + 0x8c) - local_10 * _DAT_00418260;
      }
      else {
        iVar4 = 4;
        pfVar3 = (float *)(*(int *)(local_18 + 0xb0) + 0x5c);
        do {
          fVar5 = FUN_004041dd(*local_c * _DAT_00418f04);
          *pfVar3 = (float)(fVar5 * (float10)_DAT_004182cc);
          pfVar3 = pfVar3 + 0xb;
          iVar4 = iVar4 + -1;
        } while (iVar4 != 0);
      }
    } while ((param_2 == 0xffff) &&
            (local_8 = local_8 + 1, this = local_c, (int)local_8 < (int)local_c[3]));
  }
  return;
}


// ==== FUN_0040fd01 @ 0040fd01 ====

void FUN_0040fd01(int param_1,undefined4 param_2)

{
  longlong lVar1;
  
  *(undefined4 *)(param_1 + 0x13c) = param_2;
  lVar1 = FUN_00404224();
  *(int *)(param_1 + 0xc) = (int)lVar1;
  return;
}


// ==== FUN_0040fd38 @ 0040fd38 ====

int * FUN_0040fd38(undefined4 param_1,int param_2)

{
  int *piVar1;
  undefined4 *puVar2;
  uint uVar3;
  
  piVar1 = FUN_004040f9(0x164,1);
  puVar2 = FUN_004120f6(param_1,0,0);
  if (puVar2 != (undefined4 *)0x0) {
    piVar1[0x58] = param_2;
    uVar3 = FUN_00411a95(piVar1);
    FUN_00412133((int)puVar2);
    if ((char)uVar3 != '\0') {
      return piVar1;
    }
    FUN_0040fd8d(piVar1);
  }
  return (int *)0x0;
}


// ==== FUN_0040fd8d @ 0040fd8d ====

uint FUN_0040fd8d(int *param_1)

{
  int *piVar1;
  int iVar2;
  int *piVar3;
  int *piVar4;
  uint in_EAX;
  uint uVar5;
  undefined4 uVar6;
  int *piVar7;
  int iVar8;
  int local_c;
  int local_8;
  
  piVar4 = param_1;
  if (param_1 == (int *)0x0) {
    uVar5 = in_EAX & 0xffffff00;
  }
  else {
    do {
    } while (DAT_00478981 != '\0');
    FUN_00410018((int)param_1);
    if ((param_1[1] != 0) && (local_c = 0, 0 < (short)param_1[8])) {
      local_8 = 0;
      do {
        param_1 = (int *)0x0;
        piVar7 = (int *)(local_8 + piVar4[1]);
        piVar3 = piVar7;
        if (0 < *piVar7) {
          do {
            piVar1 = (int *)piVar3[1];
            if (piVar1 != (int *)0x0) {
              FUN_0040411d(*piVar1);
              FUN_0040411d((int)piVar1);
            }
            param_1 = (int *)((int)param_1 + 1);
            piVar3 = piVar3 + 1;
          } while ((int)param_1 < *piVar7);
        }
        local_c = local_c + 1;
        local_8 = local_8 + 0x154;
      } while (local_c < (short)piVar4[8]);
    }
    if (piVar4[1] != 0) {
      FUN_0040411d(piVar4[1]);
    }
    if (*piVar4 != 0) {
      iVar8 = 0;
      if (0 < piVar4[7]) {
        do {
          iVar2 = *(int *)(*piVar4 + 4 + iVar8 * 8);
          if (iVar2 != 0) {
            FUN_0040411d(iVar2);
          }
          iVar8 = iVar8 + 1;
        } while (iVar8 < piVar4[7]);
      }
      if (*piVar4 != 0) {
        FUN_0040411d(*piVar4);
      }
    }
    uVar6 = FUN_0040411d((int)piVar4);
    uVar5 = CONCAT31((int3)((uint)uVar6 >> 8),1);
  }
  return uVar5;
}


// ==== FUN_0040fe5f @ 0040fe5f ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

uint FUN_0040fe5f(int param_1,uint param_2)

{
  uint uVar1;
  undefined4 *puVar2;
  undefined4 uVar3;
  undefined4 *puVar4;
  int iVar5;
  
  uVar1 = DAT_0047ea88 / DAT_0047ea84;
  if (param_1 == 0) {
    uVar1 = uVar1 & 0xffffff00;
  }
  else {
    FUN_00410018(param_1);
    *(uint *)(param_1 + 300) = (uint)*(byte *)(param_1 + 0x128);
    *(undefined4 *)(param_1 + 0x150) = 0xffffffff;
    *(undefined4 *)(param_1 + 0x14c) = 0xffffffff;
    *(int *)(param_1 + 0x138) = (int)*(short *)(param_1 + 0x24);
    *(uint *)(param_1 + 0x144) = param_2 & 0xff;
    *(undefined4 *)(param_1 + 0x140) = 0;
    *(undefined4 *)(param_1 + 8) = 0;
    *(undefined4 *)(param_1 + 0x134) = 0;
    *(undefined4 *)(param_1 + 0x148) = 0;
    *(undefined4 *)(param_1 + 0x154) = 0;
    if (*(code **)(param_1 + 0x158) != (code *)0x0) {
      (**(code **)(param_1 + 0x158))(param_1);
    }
    FUN_0040fd01(param_1,(int)*(short *)(param_1 + 0x26));
    FUN_00404282((undefined4 *)&DAT_0047eaa0,0,*(short *)(param_1 + 0x14) * 0xac);
    param_2 = 0;
    if (0 < *(short *)(param_1 + 0x14)) {
      puVar4 = &DAT_0047eaa4;
      puVar2 = &DAT_00479240;
      do {
        param_2 = param_2 + 1;
        *puVar4 = puVar2;
        puVar2 = puVar2 + 0x16;
        puVar4 = puVar4 + 0x2b;
      } while ((int)param_2 < (int)*(short *)(param_1 + 0x14));
    }
    DAT_0047897c = param_1;
    DAT_00480194 = FUN_004040f9(uVar1 * 6,1);
    iVar5 = DAT_0047ea88 << 2;
    _DAT_0047ea60 = FUN_004040f9(iVar5,1);
    _DAT_0047ea74 = 0xffffffff;
    _DAT_0047ea70 = 0xc;
    _DAT_0047ea68 = 0;
    _DAT_0047ea6c = 0;
    _DAT_0047ea64 = iVar5;
    DAT_0047ea80 = _DAT_0047ea60;
    (*DAT_004170a0)(DAT_00480198,&DAT_0047ea60,0x20);
    DAT_00480020 = FUN_004040f9(DAT_0047ea88 * 8 + 0x100,1);
    DAT_0047ea40 = (int)DAT_00480020 + 0xfU & 0xfffffff0;
    DAT_00478988 = 0;
    do {
      FUN_0041024f();
    } while (DAT_00478988 != 0);
    (*DAT_00417098)(DAT_00480198,&DAT_0047ea60,0x20);
    DAT_00478980 = 0;
    DAT_00478984 = (*DAT_00417044)(0,0,FUN_004103c3,0,0,&param_2);
    uVar3 = (*DAT_00417040)(DAT_00478984,0xf);
    uVar1 = CONCAT31((int3)((uint)uVar3 >> 8),1);
  }
  return uVar1;
}


// ==== FUN_00410018 @ 00410018 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

uint FUN_00410018(int param_1)

{
  uint in_EAX;
  uint uVar1;
  undefined4 uVar2;
  
  if (param_1 == 0) {
    uVar1 = in_EAX & 0xffffff00;
  }
  else {
    DAT_00478980 = 1;
    do {
    } while (DAT_00478981 != '\0');
    if (DAT_00478984 != 0) {
      while (DAT_0041a9d8 == '\0') {
        (*DAT_00417048)(0x32);
      }
      DAT_00478984 = 0;
    }
    if (DAT_00480020 != 0) {
      FUN_0040411d(DAT_00480020);
    }
    (*DAT_0041709c)(DAT_00480198,&DAT_0047ea60,0x20);
    _DAT_0047ea70 = _DAT_0047ea70 & 0xfffffffd;
    DAT_0047897c = 0;
    uVar2 = 0;
    if (DAT_00480194 != 0) {
      uVar2 = FUN_0040411d(DAT_00480194);
    }
    uVar1 = CONCAT31((int3)((uint)uVar2 >> 8),1);
  }
  return uVar1;
}


// ==== FUN_0041009a @ 0041009a ====

undefined1 FUN_0041009a(int param_1)

{
  undefined1 uVar1;
  
  if (param_1 == 0) {
    uVar1 = 0;
  }
  else {
    uVar1 = *(undefined1 *)(DAT_00480194 + DAT_0047898c * 6);
  }
  return uVar1;
}


// ==== FUN_004100ba @ 004100ba ====

undefined1 FUN_004100ba(int param_1)

{
  undefined1 uVar1;
  
  if (param_1 == 0) {
    uVar1 = 0;
  }
  else {
    uVar1 = *(undefined1 *)(DAT_00480194 + 1 + DAT_0047898c * 6);
  }
  return uVar1;
}


// ==== FUN_004100db @ 004100db ====

undefined4 FUN_004100db(int param_1)

{
  undefined4 uVar1;
  
  if (param_1 == 0) {
    uVar1 = 0;
  }
  else {
    uVar1 = *(undefined4 *)(DAT_00480194 + 2 + DAT_0047898c * 6);
  }
  return uVar1;
}


// ==== FUN_004100fb @ 004100fb ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

uint FUN_004100fb(int param_1)

{
  uint in_EAX;
  undefined4 *puVar1;
  int iVar2;
  undefined2 local_20;
  undefined2 local_1e;
  int local_1c;
  int local_18;
  undefined2 local_14;
  undefined2 local_12;
  undefined2 local_10;
  uint local_c;
  undefined4 uStack_8;
  
  iVar2 = 0;
  if ((((DAT_004789ec != 0) && (DAT_004789f0 != 0)) && (DAT_004789f4 != 0)) &&
     ((DAT_004789f8 != 0 && (DAT_004789fc != 0)))) {
    FUN_00410236();
    DAT_0047ea8c = param_1;
    local_1c = param_1;
    local_18 = param_1 << 2;
    local_20 = 1;
    local_1e = 2;
    local_12 = 0x10;
    local_14 = 4;
    local_10 = 0;
    in_EAX = (*DAT_00417088)(&DAT_00480198,0xffffffff,&local_20,0,0,0);
    if (in_EAX == 0) {
      _DAT_004801d4 = _DAT_004170c4 / (float)param_1;
      uStack_8 = 0;
      DAT_0047ea84 = (DAT_0047ea8c * 0x14) / 1000 + 3U & 0xfffffffc;
      DAT_0047ea88 = (DAT_0041a9d4 / 0x14) * DAT_0047ea84 * 2;
      DAT_004789e4 = (DAT_0047ea8c << 7) / 0xac44;
      _DAT_004789e8 = _DAT_004170c4 / (float)DAT_004789e4;
      local_c = DAT_004789e4;
      FUN_00404282(&DAT_00479240,0,0x5800);
      puVar1 = &DAT_00479274;
      do {
        puVar1[-0xd] = iVar2;
        *puVar1 = 1;
        puVar1 = puVar1 + 0x16;
        iVar2 = iVar2 + 1;
      } while ((int)puVar1 < 0x47ea74);
      return CONCAT31((int3)((uint)puVar1 >> 8),1);
    }
  }
  return in_EAX & 0xffffff00;
}


// ==== FUN_00410236 @ 00410236 ====

void FUN_00410236(void)

{
  (*DAT_00417090)(DAT_00480198);
  (*DAT_00417094)(DAT_00480198);
  return;
}


// ==== FUN_0041024f @ 0041024f ====

void FUN_0041024f(void)

{
  float *pfVar1;
  int iVar2;
  int iVar3;
  uint uVar4;
  uint uVar5;
  int iVar6;
  longlong lVar7;
  float *local_c;
  int local_8;
  
  iVar6 = DAT_00478988 * DAT_0047ea84;
  iVar3 = DAT_0047ea88 / (int)DAT_0047ea84;
  pfVar1 = (float *)(DAT_0047ea40 + iVar6 * 8);
  FUN_00404282(pfVar1,0,DAT_0047ea84 << 3);
  local_8 = 0;
  uVar5 = *(uint *)(DAT_0047897c + 8);
  local_c = pfVar1;
  if (0 < (int)DAT_0047ea84) {
    do {
      if (uVar5 == 0) {
        (**(code **)(DAT_0047897c + 0x15c))(DAT_0047897c);
        uVar5 = *(uint *)(DAT_0047897c + 0xc);
      }
      uVar4 = uVar5;
      if ((int)DAT_0047ea84 < (int)(uVar5 + local_8)) {
        uVar4 = DAT_0047ea84 - local_8;
      }
      FUN_004104cc(local_c,uVar4);
      iVar2 = DAT_0047897c;
      local_8 = local_8 + uVar4;
      uVar5 = uVar5 - uVar4;
      local_c = local_c + uVar4 * 2;
      lVar7 = FUN_00404224();
      *(int *)(iVar2 + 0x154) = *(int *)(iVar2 + 0x154) + (int)lVar7;
    } while (local_8 < (int)DAT_0047ea84);
  }
  *(undefined4 *)(DAT_00480194 + 2 + DAT_00478988 * 6) = *(undefined4 *)(DAT_0047897c + 0x154);
  *(undefined1 *)(DAT_00480194 + 1 + DAT_00478988 * 6) = *(undefined1 *)(DAT_0047897c + 0x140);
  *(undefined1 *)(DAT_00480194 + DAT_00478988 * 6) = *(undefined1 *)(DAT_0047897c + 0x144);
  *(uint *)(DAT_0047897c + 8) = uVar5;
  FUN_00410471((float *)(DAT_0047ea80 + iVar6 * 4),pfVar1,DAT_0047ea84 & 0x3fffffff);
  DAT_00478988 = DAT_00478988 + 1;
  if (iVar3 <= DAT_00478988) {
    DAT_00478988 = 0;
  }
  return;
}


// ==== FUN_004103c3 @ 004103c3 ====

undefined4 FUN_004103c3(void)

{
  int iVar1;
  int iVar2;
  undefined4 local_10;
  uint local_c;
  
  DAT_0041a9d8 = 0;
  iVar1 = DAT_0047ea88 / DAT_0047ea84;
  while (DAT_00478980 == '\0') {
    local_10 = 4;
    (*DAT_0041708c)(DAT_00480198,&local_10,0xc);
    local_c = local_c >> 2;
    iVar2 = ((int)local_c % DAT_0047ea88) / DAT_0047ea84;
    while (DAT_00478988 != iVar2) {
      DAT_00478981 = 1;
      FUN_0041024f();
      DAT_0047898c = DAT_0047898c + 1;
      if (iVar1 <= DAT_0047898c) {
        DAT_0047898c = 0;
      }
      DAT_00478981 = 0;
    }
    (*DAT_00417048)(5);
  }
  DAT_0041a9d8 = 1;
  return 0;
}


// ==== FUN_00410471 @ 00410471 ====

void FUN_00410471(float *param_1,float *param_2,int param_3)

{
  float fVar1;
  int iVar2;
  float *pfVar3;
  int iVar4;
  
  pfVar3 = param_1;
  param_1 = param_2;
  if ((((0 < param_3) && (pfVar3 != (float *)0x0)) && (param_2 != (float *)0x0)) &&
     (iVar4 = param_3 * 2, 0 < iVar4)) {
    do {
      fVar1 = *param_1;
      param_1 = param_1 + 1;
      iVar2 = (int)ROUND(fVar1);
      if (iVar2 < -0x8000) {
        iVar2 = -0x8000;
      }
      else if (0x7fff < iVar2) {
        iVar2 = 0x7fff;
      }
      *(short *)pfVar3 = (short)iVar2;
      pfVar3 = (float *)((int)pfVar3 + 2);
      iVar4 = iVar4 + -1;
    } while (iVar4 != 0);
  }
  return;
}


// ==== FUN_004104cc @ 004104cc ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004104cc(float *param_1,uint param_2)

{
  int *piVar1;
  short sVar2;
  short sVar3;
  ulonglong uVar4;
  ulonglong uVar5;
  int iVar6;
  short *psVar7;
  float fVar8;
  float fVar9;
  float fVar10;
  float fVar11;
  float fVar12;
  float fVar13;
  undefined4 *puVar14;
  uint uVar15;
  undefined4 *puVar16;
  uint uVar17;
  uint *puVar18;
  uint uVar19;
  uint uVar20;
  uint uVar21;
  int iVar22;
  int iVar23;
  float *pfVar24;
  float *pfVar25;
  bool bVar26;
  
  if (0 < (int)param_2) {
    DAT_00478998 = 0;
    DAT_0047899c = param_2;
    DAT_004789a0 = param_1;
    DAT_004789a4 = param_1 + param_2 * 2;
    do {
      puVar16 = &DAT_00479240 + DAT_00478998 * 0x16;
      DAT_004789a8 = DAT_004789a0;
      DAT_00478994 = puVar16;
      DAT_004789b4 = puVar16;
      if ((puVar16 != (undefined4 *)0x0) &&
         (puVar18 = *(uint **)(&DAT_0047925c + DAT_00478998 * 0x58), DAT_004789b0 = puVar18,
         puVar18 != (uint *)0x0)) {
        DAT_004789bc = *puVar18;
        uVar20 = DAT_0047899c;
LAB_0041054c:
        do {
          puVar14 = DAT_004789b4;
          DAT_004789ac = 0;
          if (puVar16[0xe] == 1) {
            uVar15 = -puVar16[0xb];
            uVar17 = ((puVar18[2] + puVar18[3]) - puVar16[10]) - (uint)(puVar16[0xb] != 0);
          }
          else {
            uVar15 = puVar16[0xb];
            uVar17 = puVar16[10] - puVar18[2];
          }
          DAT_004789b8 = uVar20;
          if (uVar17 < 0x1000000) {
            uVar4 = (ulonglong)(puVar16[0xd] << 0x18 | (uint)puVar16[0xc] >> 8);
            uVar5 = CONCAT44(uVar17 >> 8,uVar15 >> 8 | uVar17 << 0x18);
            uVar15 = (uint)(uVar5 / uVar4);
            if ((int)(uVar5 % uVar4) != 0) {
              uVar15 = uVar15 + 1;
            }
            if (uVar15 <= uVar20) {
              DAT_004789ac = 1;
              DAT_004789b8 = uVar15;
            }
          }
          DAT_004789dc = 0.0;
          DAT_004789e0 = 0.0;
          DAT_004789cc = DAT_004789b8;
          DAT_004789d8 = 0;
          if (((DAT_004789b4[0x15] == 0) || (DAT_004789b4[8] != DAT_004789b4[0xf])) ||
             (DAT_004789b4[9] != DAT_004789b4[0x10])) {
            piVar1 = DAT_004789b4 + 8;
            puVar18 = DAT_004789b4 + 0x11;
            DAT_004789b4[0xf] = *piVar1;
            iVar22 = *piVar1 - (*puVar18 >> 8);
            if (iVar22 != 0) {
              DAT_004789dc = (float)iVar22 * _DAT_00418ff4 * _DAT_004789e8;
              puVar14[0x13] = DAT_004789dc;
              DAT_004789d8 = DAT_004789e4;
            }
            puVar14[0x10] = puVar14[9];
            iVar22 = puVar14[9] - ((uint)puVar14[0x12] >> 8);
            if (iVar22 != 0) {
              DAT_004789e0 = (float)iVar22 * _DAT_00418ff4 * _DAT_004789e8;
              puVar14[0x14] = DAT_004789e0;
              DAT_004789d8 = DAT_004789e4;
            }
          }
          else {
            DAT_004789d8 = DAT_004789b4[0x15];
            DAT_004789dc = (float)DAT_004789b4[0x13];
            DAT_004789e0 = (float)DAT_004789b4[0x14];
          }
          uVar20 = DAT_004789d8;
          if ((0 < (int)DAT_004789d8) && (puVar14[0x15] = DAT_004789d8, uVar20 < DAT_004789b8)) {
            DAT_004789b8 = uVar20;
          }
          _DAT_004789c4 = (float)(int)DAT_004789b4[9] * _DAT_00418ff4;
          _DAT_004789c0 = (float)(int)DAT_004789b4[8] * _DAT_00418ff4;
          DAT_004789d4 = (float)(int)DAT_004789b4[0x12] * _DAT_00418ff8 * _DAT_00418ff4;
          _DAT_004789c8 = DAT_004789b4[0x11];
          DAT_004789d0 = (float)(int)_DAT_004789c8 * _DAT_00418ff8 * _DAT_00418ff4;
          uVar20 = DAT_004789b4[0xc];
          uVar15 = DAT_004789b4[0xd];
          uVar17 = DAT_004789b4[0xb];
          if (DAT_004789b4[0xe] != 1) {
            uVar19 = uVar20 ^ 0xffffffff;
            uVar20 = uVar19 + 1;
            uVar15 = (uVar15 ^ 0xffffffff) + (uint)(0xfffffffe < uVar19);
          }
          iVar22 = DAT_004789b4[10] + (DAT_004789bc >> 1);
          uVar19 = DAT_004789b8;
          pfVar24 = DAT_004789a8;
          if (DAT_004789d8 == 0) {
            uVar19 = DAT_004789b8 >> 1;
            if (uVar19 != 0) {
              iVar6 = iVar22 * 2;
              psVar7 = (short *)(iVar22 * 2);
              uVar21 = (uVar17 >> 1) * 2;
              iVar23 = iVar22 + uVar15 + (uint)CARRY4(uVar21,uVar20);
              _DAT_004789c8 = uVar21 + uVar20 >> 1;
              uVar21 = _DAT_004789c8 * 2;
              iVar22 = iVar23 + uVar15 + (uint)CARRY4(uVar21,uVar20);
              fVar8 = ((float)*(short *)(iVar6 + 2) - (float)*psVar7) *
                      (float)(uVar17 >> 1) * _DAT_00418ffc + (float)*psVar7;
              fVar9 = fVar8 * _DAT_004789c0;
              fVar11 = ((float)*(short *)(iVar23 * 2 + 2) - (float)*(short *)(iVar23 * 2)) *
                       (float)_DAT_004789c8 * _DAT_00418ffc + (float)*(short *)(iVar23 * 2);
              pfVar25 = DAT_004789a8;
              while( true ) {
                pfVar24 = pfVar25 + 4;
                uVar17 = uVar21 + uVar20;
                fVar12 = fVar11 * _DAT_004789c4;
                fVar10 = fVar8 * _DAT_004789c4 + pfVar25[1];
                fVar11 = fVar11 * _DAT_004789c0 + pfVar25[2];
                *pfVar25 = fVar9 + *pfVar25;
                fVar12 = fVar12 + pfVar25[3];
                uVar19 = uVar19 - 1;
                if (uVar19 == 0) break;
                iVar6 = iVar22 * 2;
                psVar7 = (short *)(iVar22 * 2);
                uVar21 = (uVar17 >> 1) * 2;
                iVar22 = iVar22 + uVar15 + (uint)CARRY4(uVar21,uVar20);
                _DAT_004789c8 = uVar21 + uVar20 >> 1;
                sVar2 = *(short *)(iVar22 * 2 + 2);
                uVar21 = _DAT_004789c8 * 2;
                sVar3 = *(short *)(iVar22 * 2);
                fVar13 = (float)_DAT_004789c8 * _DAT_00418ffc;
                iVar22 = iVar22 + uVar15 + (uint)CARRY4(uVar21,uVar20);
                fVar8 = (float)*psVar7 +
                        ((float)*(short *)(iVar6 + 2) - (float)*psVar7) *
                        (float)(uVar17 >> 1) * _DAT_00418ffc;
                pfVar25[1] = fVar10;
                pfVar25[2] = fVar11;
                fVar9 = fVar8 * _DAT_004789c0;
                fVar11 = ((float)sVar2 - (float)sVar3) * fVar13 + (float)sVar3;
                pfVar25[3] = fVar12;
                pfVar25 = pfVar24;
              }
              pfVar25[1] = fVar10;
              pfVar25[2] = fVar11;
              pfVar25[3] = fVar12;
            }
            uVar19 = DAT_004789b8 & 1;
          }
          pfVar25 = pfVar24;
          if (uVar19 != 0) {
            do {
              _DAT_004789c8 = uVar17 >> 1;
              pfVar25 = pfVar24 + 2;
              iVar6 = iVar22 * 2;
              psVar7 = (short *)(iVar22 * 2);
              uVar17 = _DAT_004789c8 * 2 + uVar20;
              iVar22 = iVar22 + uVar15 + (uint)CARRY4(_DAT_004789c8 * 2,uVar20);
              fVar9 = (float)*psVar7 +
                      ((float)*(short *)(iVar6 + 2) - (float)*psVar7) *
                      (float)_DAT_004789c8 * _DAT_00418ffc;
              fVar8 = fVar9 * DAT_004789d0;
              DAT_004789d0 = DAT_004789d0 + DAT_004789dc;
              fVar9 = fVar9 * DAT_004789d4;
              DAT_004789d4 = DAT_004789d4 + DAT_004789e0;
              *pfVar24 = fVar8 + *pfVar24;
              pfVar24[1] = fVar9 + pfVar24[1];
              uVar19 = uVar19 - 1;
              pfVar24 = pfVar25;
            } while (uVar19 != 0);
            DAT_004789d0 = (float)(int)ROUND(DAT_004789d0 * _DAT_00418fec * _DAT_00418ff0);
            DAT_004789d4 = (float)(int)ROUND(DAT_004789d4 * _DAT_00418fec * _DAT_00418ff0);
          }
          puVar16 = DAT_004789b4;
          puVar18 = DAT_004789b0;
          uVar15 = iVar22 - (DAT_004789bc >> 1);
          if (DAT_004789d8 != 0) {
            DAT_004789b4[0x11] = DAT_004789d0;
            puVar16[0x12] = DAT_004789d4;
            uVar20 = DAT_004789b8;
            uVar19 = DAT_004789d8 - DAT_004789b8;
            DAT_004789dc = 0.0;
            DAT_004789e0 = 0.0;
            DAT_004789d8 = uVar19;
            puVar16[0x15] = uVar19;
            if (uVar19 == 0) {
              puVar16[0x13] = 0;
              puVar16[0x14] = 0;
              puVar16[0x11] = puVar16[8] << 8;
              puVar16[0x12] = puVar16[9] << 8;
              if (DAT_004789cc != uVar20) {
                puVar16[10] = uVar15;
                puVar16[0xb] = uVar17;
                uVar20 = (uint)((int)DAT_004789a4 - (int)pfVar25) >> 3;
                DAT_004789a8 = pfVar25;
                if (uVar20 != 0) goto LAB_0041054c;
              }
            }
          }
          puVar16 = DAT_004789b4;
          puVar18 = DAT_004789b0;
          if (DAT_004789ac == 0) break;
          if ((*(byte *)((int)DAT_004789b0 + 0x1d) & 2) == 0) {
            if ((*(byte *)((int)DAT_004789b0 + 0x1d) & 4) == 0) {
              uVar17 = 0;
              uVar15 = 0;
              DAT_004789b4[7] = 0;
              break;
            }
            if (DAT_004789b4[0xe] == 1) goto LAB_00410ab2;
            do {
              uVar17 = -uVar17 - 1;
              uVar15 = ((puVar18[2] - 1) - uVar15) + puVar18[2];
              puVar16[0xe] = 1;
              if ((int)uVar15 < (int)(puVar18[2] + puVar18[3])) break;
LAB_00410ab2:
              bVar26 = uVar17 != 0;
              iVar22 = -uVar17;
              uVar17 = iVar22 - 1;
              uVar15 = (((puVar18[2] + puVar18[3]) - uVar15) - (uint)bVar26) +
                       puVar18[2] + puVar18[3] + -1 + (uint)(iVar22 != 0);
              puVar16[0xe] = 2;
            } while ((int)uVar15 < (int)puVar18[2]);
            puVar16[10] = uVar15;
            puVar16[0xb] = uVar17;
            uVar20 = (uint)((int)DAT_004789a4 - (int)pfVar25) >> 3;
            DAT_004789a8 = pfVar25;
            if (uVar20 == 0) break;
            goto LAB_0041054c;
          }
          do {
            uVar15 = uVar15 - DAT_004789b0[3];
          } while (DAT_004789b0[2] + DAT_004789b0[3] <= uVar15);
          DAT_004789b4[10] = uVar15;
          puVar16[0xb] = uVar17;
          uVar20 = (uint)((int)DAT_004789a4 - (int)pfVar25) >> 3;
          DAT_004789a8 = pfVar25;
        } while (uVar20 != 0);
        puVar16 = DAT_004789b4;
        DAT_004789b4[0xb] = uVar17;
        puVar16[10] = uVar15;
      }
      DAT_00478998 = DAT_00478998 + 1;
    } while (DAT_00478998 < 0x40);
  }
  return;
}


// ==== FUN_00410b2f @ 00410b2f ====

void FUN_00410b2f(int param_1)

{
  int iVar1;
  int iVar2;
  
  iVar2 = *(int *)(param_1 + 0xc);
  iVar1 = *(int *)(param_1 + 0x80);
  if (iVar2 < iVar1) {
    iVar2 = iVar2 + (uint)*(byte *)(param_1 + 0x84) * 4;
    *(int *)(param_1 + 0xc) = iVar2;
    if (iVar2 <= iVar1) goto LAB_00410b6c;
  }
  else if ((iVar2 <= iVar1) ||
          (iVar2 = iVar2 + (uint)*(byte *)(param_1 + 0x84) * -4, *(int *)(param_1 + 0xc) = iVar2,
          iVar1 <= iVar2)) goto LAB_00410b6c;
  *(int *)(param_1 + 0xc) = iVar1;
LAB_00410b6c:
  *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 1;
  return;
}


// ==== FUN_00410b74 @ 00410b74 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00410b74(uint param_1)

{
  char cVar1;
  byte bVar2;
  uint uVar3;
  float10 fVar4;
  longlong lVar5;
  
  bVar2 = *(byte *)(param_1 + 0xa2);
  if ((bVar2 & 3) == 0) {
    fVar4 = FUN_004041dd(((float)(int)*(char *)(param_1 + 0x85) +
                         (float)(int)*(char *)(param_1 + 0x85)) * (float)_DAT_00419000);
    FUN_00404136((float)(fVar4 * (float10)_DAT_004182bc));
    lVar5 = FUN_00404224();
    uVar3 = (uint)lVar5;
  }
  else if ((bVar2 & 3) == 1) {
    cVar1 = *(char *)(param_1 + 0x85);
    bVar2 = cVar1 * '\b';
    if (cVar1 < '\0') {
      bVar2 = cVar1 * -8 - 1;
    }
    uVar3 = (uint)bVar2;
  }
  else {
    uVar3 = param_1;
    if (((bVar2 & 3) != 0) && ((bVar2 & 3) < 4)) {
      uVar3 = 0xff;
    }
  }
  uVar3 = (int)(*(byte *)(param_1 + 0x87) * uVar3) >> 5 & 0xfffffffc;
  if (-1 < *(char *)(param_1 + 0x85)) {
    uVar3 = -uVar3;
  }
  *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 1;
  *(uint *)(param_1 + 0x1c) = uVar3;
  return;
}


// ==== FUN_00410c12 @ 00410c12 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00410c12(int param_1)

{
  byte bVar1;
  char cVar2;
  int iVar3;
  uint uVar4;
  float10 fVar5;
  longlong lVar6;
  
  cVar2 = *(char *)(param_1 + 0x89);
  uVar4 = (*(byte *)(param_1 + 0xa2) & 0x30) >> 4;
  if (uVar4 == 0) {
    cVar2 = *(char *)(param_1 + 0x85);
LAB_00410c75:
    fVar5 = FUN_004041dd(((float)(int)cVar2 + (float)(int)cVar2) * (float)_DAT_00419000);
    FUN_00404136((float)(fVar5 * (float10)_DAT_004182bc));
    lVar6 = FUN_00404224();
    uVar4 = (uint)lVar6;
LAB_00410c9a:
    *(uint *)(param_1 + 0x18) = uVar4;
  }
  else {
    if (uVar4 == 1) {
      bVar1 = cVar2 * '\b';
      if (cVar2 < '\0') {
        bVar1 = cVar2 * -8 - 1;
      }
      uVar4 = (uint)bVar1;
      goto LAB_00410c9a;
    }
    if (uVar4 == 2) {
      *(undefined4 *)(param_1 + 0x18) = 0xff;
    }
    else if (uVar4 == 3) {
      cVar2 = *(char *)(param_1 + 0x85);
      goto LAB_00410c75;
    }
  }
  iVar3 = (int)((uint)*(byte *)(param_1 + 0x8b) * *(int *)(param_1 + 0x18)) >> 6;
  *(int *)(param_1 + 0x18) = iVar3;
  if (*(char *)(param_1 + 0x89) < '\0') {
    if ((short)(*(short *)(param_1 + 0x10) - *(short *)(param_1 + 0x18)) < 0) {
      *(undefined4 *)(param_1 + 0x18) = *(undefined4 *)(param_1 + 0x10);
    }
    iVar3 = -*(int *)(param_1 + 0x18);
  }
  else {
    if (iVar3 + *(int *)(param_1 + 0x10) < 0x41) goto LAB_00410ce1;
    iVar3 = 0x40 - *(int *)(param_1 + 0x10);
  }
  *(int *)(param_1 + 0x18) = iVar3;
LAB_00410ce1:
  cVar2 = *(char *)(param_1 + 0x8a) + *(char *)(param_1 + 0x89);
  *(char *)(param_1 + 0x89) = cVar2;
  if ('\x1f' < cVar2) {
    *(char *)(param_1 + 0x89) = cVar2 + -0x40;
  }
  *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 2;
  return;
}


// ==== FUN_00410d04 @ 00410d04 ====

void FUN_00410d04(int param_1,uint *param_2,uint *param_3,byte param_4,int param_5,int param_6,
                 byte param_7,byte param_8,byte param_9,uint *param_10,int *param_11,
                 undefined1 *param_12,int *param_13,byte param_14)

{
  ushort *puVar1;
  uint uVar2;
  int iVar3;
  uint uVar4;
  
  uVar2 = *param_2;
  if ((int)uVar2 < param_5) {
    if (*param_3 == (uint)*(ushort *)(param_6 + uVar2 * 4)) {
      if (((param_4 & 4) != 0) && (uVar2 == param_7)) {
        *param_2 = (uint)param_8;
        *param_3 = (uint)*(ushort *)(param_6 + (uint)param_8 * 4);
      }
      uVar2 = *param_2;
      puVar1 = (ushort *)(param_6 + 4 + uVar2 * 4);
      uVar4 = (uint)*(ushort *)(param_6 + uVar2 * 4 + 2);
      if (uVar2 == param_5 - 1U) {
        *param_10 = uVar4;
        *param_12 = 1;
        *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | param_14;
        return;
      }
      if ((((param_4 & 2) != 0) && (uVar2 == param_9)) && (*(char *)(param_1 + 0x65) == '\0')) {
        *param_10 = uVar4;
        goto LAB_00410df2;
      }
      iVar3 = (uint)*puVar1 - (uint)*(ushort *)(param_6 + uVar2 * 4);
      if (iVar3 == 0) {
        *param_13 = 0;
      }
      else {
        *param_13 = (int)((uint)puVar1[1] * 0x10000 + uVar4 * -0x10000) / iVar3;
      }
      *param_11 = uVar4 * 0x10000;
      *param_2 = *param_2 + 1;
    }
    else {
      *param_11 = *param_11 + *param_13;
    }
  }
  *param_10 = *param_11 >> 0x10;
  *param_3 = *param_3 + 1;
LAB_00410df2:
  *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | param_14;
  return;
}


// ==== FUN_00410dff @ 00410dff ====

void FUN_00410dff(int param_1,byte param_2)

{
  int *piVar1;
  uint uVar2;
  
  if ((0xf < param_2) && (param_2 < 0x51)) {
    *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 2;
    *(uint *)(param_1 + 0x10) = param_2 - 0x10;
    return;
  }
  uVar2 = (uint)param_2;
  switch(param_2 >> 4) {
  case 6:
  case 8:
    piVar1 = (int *)(param_1 + 0x10);
    *piVar1 = *piVar1 - (uVar2 & 0xf);
    if (*piVar1 < 0) {
      *(undefined4 *)(param_1 + 0x10) = 0;
    }
    goto LAB_00410e66;
  case 7:
  case 9:
    *(int *)(param_1 + 0x10) = *(int *)(param_1 + 0x10) + (uVar2 & 0xf);
    if (0x40 < *(int *)(param_1 + 0x10)) {
      *(undefined4 *)(param_1 + 0x10) = 0x40;
    }
LAB_00410e66:
    *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 2;
    break;
  case 10:
    *(byte *)(param_1 + 0x86) = param_2 & 0xf;
    break;
  case 0xb:
    *(byte *)(param_1 + 0x87) = param_2 & 0xf;
    break;
  case 0xc:
    *(uint *)(param_1 + 0x14) = (uVar2 & 0xf) << 4;
    goto LAB_00410eaa;
  case 0xd:
    *(int *)(param_1 + 0x14) = *(int *)(param_1 + 0x14) - (uVar2 & 0xf);
    goto LAB_00410eaa;
  case 0xe:
    *(int *)(param_1 + 0x14) = *(int *)(param_1 + 0x14) + (uVar2 & 0xf);
LAB_00410eaa:
    *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 4;
    break;
  case 0xf:
    if ((param_2 & 0xf) != 0) {
      *(byte *)(param_1 + 0x84) = param_2 << 4;
    }
    *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) & 0xf7;
    *(undefined4 *)(param_1 + 0x80) = *(undefined4 *)(param_1 + 0x68);
  }
  return;
}


// ==== FUN_00410efa @ 00410efa ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00410efa(int param_1,int param_2,uint param_3)

{
  uint *puVar1;
  ulonglong uVar2;
  uint uVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  longlong lVar7;
  ulonglong uVar8;
  int *local_8;
  
  iVar4 = param_1;
  local_8 = *(int **)(param_1 + 4);
  if (local_8 != (int *)0x0) {
    param_1 = *local_8;
  }
  if (*(int *)(iVar4 + 0xc) + *(int *)(iVar4 + 0x1c) == 0) {
    *(byte *)(iVar4 + 2) = *(byte *)(iVar4 + 2) & 0xfe;
  }
  if ((*(byte *)(iVar4 + 2) & 8) != 0) {
    iVar6 = param_1 * 0x58;
    iVar5 = param_1 * 0x16;
    local_8 = &DAT_00479240 + iVar5;
    if (*(int *)(&DAT_0047925c + iVar6) != 0) {
      if (param_1 < 0x20) {
        param_1 = param_1 + 0x20;
      }
      else {
        param_1 = param_1 + -0x20;
      }
      local_8 = &DAT_00479240 + param_1 * 0x16;
      FUN_004042b5((int)local_8,(int)(&DAT_00479240 + iVar5),0x58);
      *local_8 = param_1;
      *(undefined4 *)(&DAT_00479250 + iVar6) = 0;
      *(undefined4 *)(&DAT_00479244 + iVar6) = 0;
      *(undefined4 *)(&DAT_00479260 + iVar6) = 0;
      *(undefined4 *)(&DAT_00479264 + iVar6) = 0;
      *(int **)(iVar4 + 4) = local_8;
    }
    puVar1 = (uint *)(local_8 + 6);
    local_8[7] = param_2;
    if ((uint)(*(int *)(param_2 + 0xc) + *(int *)(param_2 + 8)) <= *puVar1) {
      *puVar1 = 0;
    }
    local_8[0xb] = 0;
    local_8[10] = *puVar1;
    local_8[0xe] = 1;
    *puVar1 = 0;
    local_8[0x11] = 0;
    local_8[0x12] = 0;
    local_8[0x15] = 0;
  }
  if ((*(byte *)(iVar4 + 2) & 2) != 0) {
    lVar7 = FUN_00404224();
    iVar5 = (int)lVar7;
    if (local_8 != (int *)0x0) {
      local_8[4] = iVar5;
      local_8[1] = iVar5;
      local_8[8] = (local_8[5] * iVar5) / 0xff;
      local_8[9] = ((0xff - local_8[5]) * iVar5) / 0xff;
    }
  }
  if ((*(byte *)(iVar4 + 2) & 4) != 0) {
    iVar5 = FUN_00404148(*(int *)(iVar4 + 0x14) + -0x80);
    iVar5 = ((0x80 - iVar5) / 0x20) * (*(int *)(iVar4 + 0x4c) + -0x20) + *(int *)(iVar4 + 0x14);
    if (iVar5 < 0) {
      iVar5 = 0;
    }
    if (0xff < iVar5) {
      iVar5 = 0xff;
    }
    if (local_8 != (int *)0x0) {
      local_8[5] = iVar5;
      local_8[3] = iVar5;
      local_8[8] = (local_8[4] * iVar5) / 0xff;
      local_8[9] = ((0xff - iVar5) * local_8[4]) / 0xff;
    }
  }
  if ((*(byte *)(iVar4 + 2) & 1) != 0) {
    if ((*(byte *)(param_3 + 0x22) & 1) == 0) {
      uVar8 = 0xda7600 / (longlong)(*(int *)(iVar4 + 0xc) + *(int *)(iVar4 + 0x1c)) & 0xffffffff;
    }
    else {
      FUN_0040416c(_DAT_00418200,
                   ((_DAT_00419010 - (float)*(int *)(iVar4 + 0xc)) + (float)*(int *)(iVar4 + 0x1c))
                   * _DAT_0041900c);
      uVar8 = FUN_00404224();
    }
    param_3 = (uint)uVar8;
    local_8[2] = param_3;
    uVar3 = DAT_0047ea8c;
    if ((int)param_3 < 100) {
      param_3 = 100;
    }
    uVar8 = (ulonglong)DAT_0047ea8c;
    uVar2 = param_3 / uVar8;
    local_8[0xd] = (int)uVar2;
    local_8[0xc] = (int)(((ulonglong)param_3 % uVar8 << 0x20 | uVar2) / (ulonglong)uVar3);
  }
  if ((*(byte *)(iVar4 + 2) & 0x20) != 0) {
    local_8[0xb] = 0;
    local_8[10] = 0;
    local_8[6] = 0;
  }
  return;
}


// ==== FUN_00411113 @ 00411113 ====

void FUN_00411113(int param_1,int param_2)

{
  *(uint *)(param_1 + 0x10) = (uint)*(byte *)(param_2 + 0x10);
  *(undefined4 *)(param_1 + 0x14) = *(undefined4 *)(param_2 + 0x18);
  *(undefined4 *)(param_1 + 0x34) = 0x40;
  *(undefined4 *)(param_1 + 0x2c) = 0;
  *(undefined4 *)(param_1 + 0x28) = 0;
  *(undefined4 *)(param_1 + 0x38) = 0;
  *(undefined4 *)(param_1 + 0x4c) = 0x20;
  *(undefined4 *)(param_1 + 0x44) = 0;
  *(undefined4 *)(param_1 + 0x40) = 0;
  *(undefined4 *)(param_1 + 0x50) = 0;
  *(undefined1 *)(param_1 + 0x65) = 0;
  *(undefined4 *)(param_1 + 0x58) = 0x10000;
  *(undefined1 *)(param_1 + 0x3c) = 0;
  *(undefined1 *)(param_1 + 0x54) = 0;
  *(undefined4 *)(param_1 + 0x60) = 0;
  *(undefined4 *)(param_1 + 0x5c) = 0;
  if ((*(byte *)(param_1 + 0xa2) & 0xf) < 4) {
    *(undefined1 *)(param_1 + 0x85) = 0;
  }
  if ((*(byte *)(param_1 + 0xa2) & 0xf0) < 0x40) {
    *(undefined1 *)(param_1 + 0x89) = 0;
  }
  *(byte *)(param_1 + 2) = *(byte *)(param_1 + 2) | 6;
  *(undefined1 *)(param_1 + 0x92) = 0;
  return;
}


// ==== FUN_00411196 @ 00411196 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00411196(int *param_1)

{
  int *piVar1;
  char cVar2;
  bool bVar3;
  byte bVar4;
  byte bVar5;
  byte bVar6;
  char *pcVar7;
  int iVar8;
  byte *pbVar9;
  undefined *puVar10;
  int local_10;
  undefined *local_c;
  
  param_1[0x54] = -1;
  param_1[0x53] = -1;
  pcVar7 = (char *)(*(int *)(*param_1 + 4 + (uint)*(byte *)(param_1[0x51] + 0x28 + (int)param_1) * 8
                            ) + param_1[0x50] * (int)(short)param_1[5] * 5);
  if ((pcVar7 != (char *)0x0) && (local_10 = 0, 0 < (short)param_1[5])) {
    do {
      iVar8 = local_10 * 0xac;
      bVar4 = pcVar7[4] & 0xf;
      bVar5 = (byte)pcVar7[4] >> 4;
      pbVar9 = &DAT_0047eaa0 + iVar8;
      if ((pcVar7[3] == '\x03') || (pcVar7[3] == '\x05')) {
        bVar3 = true;
      }
      else {
        bVar3 = false;
      }
      if ((pcVar7[1] != '\0') && (!bVar3)) {
        (&DAT_0047eb06)[iVar8] = pcVar7[1] + -1;
      }
      cVar2 = *pcVar7;
      if (((cVar2 != '\0') && (cVar2 != -1)) && (!bVar3)) {
        *pbVar9 = cVar2 - 1;
      }
      if ((short)(ushort)(byte)(&DAT_0047eb06)[iVar8] < (short)param_1[8]) {
        puVar10 = (undefined *)((uint)(byte)(&DAT_0047eb06)[iVar8] * 0x154 + param_1[1]);
        if ((byte)puVar10[*pbVar9 + 0x44] < 0x10) {
          local_c = *(undefined **)(puVar10 + (uint)(byte)puVar10[*pbVar9 + 0x44] * 4 + 4);
        }
        else {
          local_c = &DAT_004801a0;
        }
        if (!bVar3) {
          *(undefined **)(&DAT_0047eaa8 + iVar8) = local_c;
        }
      }
      else {
        _DAT_004801a0 = 0;
        puVar10 = &DAT_00480040;
        local_c = &DAT_004801a0;
      }
      if (((&DAT_0047eb0c)[iVar8] == '\a') && (pcVar7[3] != '\a')) {
        (&DAT_0047eab0)[local_10 * 0x2b] =
             (&DAT_0047eab0)[local_10 * 0x2b] + (&DAT_0047eab8)[local_10 * 0x2b];
      }
      cVar2 = pcVar7[3];
      (&DAT_0047eab8)[local_10 * 0x2b] = 0;
      (&DAT_0047eaa2)[iVar8] = 0;
      (&DAT_0047eb0c)[iVar8] = cVar2;
      cVar2 = *pcVar7;
      if ((cVar2 != '\0') && (cVar2 != -1)) {
        bVar6 = (local_c[0x1f] + cVar2) - 1;
        (&DAT_0047eb07)[iVar8] = bVar6;
        if ((*(byte *)((int)param_1 + 0x22) & 1) != 0) {
          *(uint *)(&DAT_0047eb08 + iVar8) =
               ((uint)bVar6 * -0x40 - (int)(char)local_c[0x11] / 2) + 0x1e00;
        }
        if (!bVar3) {
          (&DAT_0047eaac)[local_10 * 0x2b] = *(undefined4 *)(&DAT_0047eb08 + iVar8);
        }
        (&DAT_0047eaa2)[iVar8] = 8;
      }
      (&DAT_0047eabc)[local_10 * 0x2b] = 0;
      (&DAT_0047eaa2)[iVar8] = (&DAT_0047eaa2)[iVar8] | 3;
      if (pcVar7[1] != '\0') {
        FUN_00411113((int)pbVar9,(int)local_c);
      }
      if (pcVar7[2] != 0) {
        FUN_00410dff((int)pbVar9,pcVar7[2]);
      }
      if ((*pcVar7 == -1) || (pcVar7[3] == '\x14')) {
        (&DAT_0047eb05)[iVar8] = 1;
      }
      if ((puVar10[0x14c] & 1) == 0) {
        if ((&DAT_0047eb05)[iVar8] != '\0') {
          *(undefined4 *)(&DAT_0047ead4 + iVar8) = 0;
        }
      }
      else if ((&DAT_0047eadc)[iVar8] == '\0') {
        FUN_00410d04((int)pbVar9,(uint *)(&DAT_0047eacc + iVar8),(uint *)(&DAT_0047eac8 + iVar8),
                     puVar10[0x14c],(uint)(byte)puVar10[0x144],(int)(puVar10 + 0xa4),puVar10[0x148],
                     puVar10[0x147],puVar10[0x146],(uint *)(&DAT_0047ead4 + iVar8),
                     (int *)(&DAT_0047ead0 + iVar8),&DAT_0047eadc + iVar8,
                     (int *)(&DAT_0047ead8 + iVar8),2);
      }
      if (((puVar10[0x14d] & 1) != 0) && ((&DAT_0047eaf4)[iVar8] == '\0')) {
        FUN_00410d04((int)pbVar9,(uint *)(&DAT_0047eae4 + iVar8),(uint *)(&DAT_0047eae0 + iVar8),
                     puVar10[0x14d],(uint)(byte)puVar10[0x145],(int)(puVar10 + 0xf4),puVar10[0x14b],
                     puVar10[0x14a],puVar10[0x149],(uint *)(&DAT_0047eaec + iVar8),
                     (int *)(&DAT_0047eae8 + iVar8),&DAT_0047eaf4 + iVar8,
                     (int *)(&DAT_0047eaf0 + iVar8),4);
      }
      if ((&DAT_0047eb05)[iVar8] != '\0') {
        piVar1 = &DAT_0047eaf8 + local_10 * 0x2b;
        *piVar1 = *piVar1 - (uint)*(ushort *)(puVar10 + 0x152);
        if (*piVar1 < 0) {
          (&DAT_0047eaf8)[local_10 * 0x2b] = 0;
        }
        (&DAT_0047eaa2)[iVar8] = (&DAT_0047eaa2)[iVar8] | 2;
      }
      switch(pcVar7[3]) {
      case '\x01':
        if (pcVar7[4] != '\0') {
          (&DAT_0047eb19)[iVar8] = pcVar7[4];
        }
        break;
      case '\x02':
        if (pcVar7[4] != '\0') {
          (&DAT_0047eb18)[iVar8] = pcVar7[4];
        }
        break;
      case '\x03':
        if (pcVar7[4] != '\0') {
          (&DAT_0047eb24)[iVar8] = pcVar7[4];
        }
        *(undefined4 *)(&DAT_0047eb20 + iVar8) = *(undefined4 *)(&DAT_0047eb08 + iVar8);
        goto LAB_0041146d;
      case '\x04':
        if (bVar5 != 0) {
          (&DAT_0047eb26)[iVar8] = bVar5;
        }
        if (bVar4 != 0) {
          (&DAT_0047eb27)[iVar8] = bVar4;
        }
        goto LAB_0041149c;
      case '\x05':
        *(undefined4 *)(&DAT_0047eb20 + iVar8) = *(undefined4 *)(&DAT_0047eb08 + iVar8);
        if (pcVar7[4] != '\0') {
          (&DAT_0047eb1c)[iVar8] = pcVar7[4];
        }
LAB_0041146d:
        (&DAT_0047eaa2)[iVar8] = (&DAT_0047eaa2)[iVar8] & 0xf6;
        break;
      case '\x06':
        if (pcVar7[4] != '\0') {
          (&DAT_0047eb1c)[iVar8] = pcVar7[4];
        }
LAB_0041149c:
        FUN_00410b74((uint)pbVar9);
        break;
      case '\a':
        if (bVar5 != 0) {
          (&DAT_0047eb2a)[iVar8] = bVar5;
        }
        if (bVar4 != 0) {
          (&DAT_0047eb2b)[iVar8] = bVar4;
        }
        break;
      case '\b':
        bVar4 = pcVar7[4];
        (&DAT_0047eaa2)[iVar8] = (&DAT_0047eaa2)[iVar8] | 4;
        (&DAT_0047eab4)[local_10 * 0x2b] = (uint)bVar4;
        break;
      case '\t':
        if (pcVar7[4] != 0) {
          *(uint *)(&DAT_0047eb10 + iVar8) = (uint)(byte)pcVar7[4];
        }
        if ((&DAT_0047eaa4)[local_10 * 0x2b] != 0) {
          if ((uint)(*(int *)(&DAT_0047eb10 + iVar8) << 8) <
              (uint)(*(int *)(local_c + 0xc) + *(int *)(local_c + 8))) {
            *(int *)((&DAT_0047eaa4)[local_10 * 0x2b] + 0x18) = *(int *)(&DAT_0047eb10 + iVar8) << 8
            ;
          }
          else {
            (&DAT_0047eaa2)[iVar8] = (&DAT_0047eaa2)[iVar8] & 0xf7 | 0x20;
          }
        }
        break;
      case '\n':
        if (pcVar7[4] != '\0') {
          (&DAT_0047eb1c)[iVar8] = pcVar7[4];
        }
        break;
      case '\x0e':
        if (bVar5 == 10) {
          if (bVar4 != 0) {
            (&DAT_0047eb47)[iVar8] = bVar4;
          }
          (&DAT_0047eab0)[local_10 * 0x2b] =
               (&DAT_0047eab0)[local_10 * 0x2b] + (uint)(byte)(&DAT_0047eb47)[iVar8];
          if (0x40 < (int)(&DAT_0047eab0)[local_10 * 0x2b]) {
            (&DAT_0047eab0)[local_10 * 0x2b] = 0x40;
          }
        }
        else {
          if (bVar5 != 0xb) break;
          if (bVar4 != 0) {
            (&DAT_0047eb47)[iVar8] = bVar4;
          }
          piVar1 = &DAT_0047eab0 + local_10 * 0x2b;
          *piVar1 = *piVar1 - (uint)(byte)(&DAT_0047eb47)[iVar8];
          if (*piVar1 < 0) {
            (&DAT_0047eab0)[local_10 * 0x2b] = 0;
          }
        }
        (&DAT_0047eaa2)[iVar8] = (&DAT_0047eaa2)[iVar8] | 2;
        break;
      case '\x0f':
        bVar4 = pcVar7[4];
        if (bVar4 < 0x20) {
          param_1[0x4e] = (uint)bVar4;
        }
        else {
          FUN_0040fd01((int)param_1,(uint)bVar4);
        }
      }
      FUN_00410efa((int)pbVar9,(int)local_c,(uint)param_1);
      local_10 = local_10 + 1;
      pcVar7 = pcVar7 + 5;
    } while (local_10 < (short)param_1[5]);
  }
  return;
}


// ==== FUN_004115f9 @ 004115f9 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004115f9(int *param_1)

{
  byte *pbVar1;
  byte bVar2;
  uint uVar3;
  byte bVar4;
  byte bVar5;
  byte bVar6;
  byte bVar7;
  int iVar8;
  byte bVar9;
  byte *pbVar10;
  undefined *puVar11;
  undefined *local_c;
  byte *local_8;
  int local_4;
  
  iVar8 = *(int *)(*param_1 + 4 + (uint)*(byte *)(param_1[0x51] + 0x28 + (int)param_1) * 8) +
          param_1[0x50] * (int)(short)param_1[5] * 5;
  if ((iVar8 != 0) && (local_4 = 0, 0 < (short)param_1[5])) {
    local_8 = (byte *)(iVar8 + 2);
    pbVar10 = &DAT_0047eb06;
    do {
      if ((short)(ushort)*pbVar10 < (short)param_1[8]) {
        puVar11 = (undefined *)((uint)*pbVar10 * 0x154 + param_1[1]);
        if ((byte)puVar11[pbVar10[-0x66] + 0x44] < 0x10) {
          local_c = *(undefined **)(puVar11 + (uint)(byte)puVar11[pbVar10[-0x66] + 0x44] * 4 + 4);
        }
        else {
          local_c = &DAT_004801a0;
        }
        if (local_c == (undefined *)0x0) {
          local_c = &DAT_004801a0;
        }
      }
      else {
        _DAT_004801a0 = 0;
        puVar11 = &DAT_00480040;
        local_c = &DAT_004801a0;
      }
      bVar7 = local_8[1];
      bVar2 = local_8[2];
      pbVar10[-0xffffffff0000004e] = 0;
      pbVar10[-0xffffffff0000004d] = 0;
      pbVar10[-0xffffffff0000004c] = 0;
      pbVar10[-0xffffffff0000004b] = 0;
      pbVar10[-0xffffffff0000004a] = 0;
      pbVar10[-0xffffffff00000049] = 0;
      pbVar10[-0xffffffff00000048] = 0;
      pbVar10[-0xffffffff00000047] = 0;
      pbVar10[-100] = 0;
      bVar5 = bVar2 & 0xf;
      bVar9 = bVar2 >> 4;
      if (((puVar11[0x14c] & 1) != 0) && (pbVar10[-0x2a] == 0)) {
        FUN_00410d04((int)(pbVar10 + -0x66),(uint *)(pbVar10 + -0x3a),(uint *)(pbVar10 + -0x3e),
                     puVar11[0x14c],(uint)(byte)puVar11[0x144],(int)(puVar11 + 0xa4),puVar11[0x148],
                     puVar11[0x147],puVar11[0x146],(uint *)(pbVar10 + -0x32),
                     (int *)(pbVar10 + -0x36),pbVar10 + -0x2a,(int *)(pbVar10 + -0x2e),2);
      }
      if (((puVar11[0x14d] & 1) != 0) && (pbVar10[-0x12] == 0)) {
        FUN_00410d04((int)(pbVar10 + -0x66),(uint *)(pbVar10 + -0x22),(uint *)(pbVar10 + -0x26),
                     puVar11[0x14d],(uint)(byte)puVar11[0x145],(int)(puVar11 + 0xf4),puVar11[0x14b],
                     puVar11[0x14a],puVar11[0x149],(uint *)(pbVar10 + -0x1a),
                     (int *)(pbVar10 + -0x1e),pbVar10 + -0x12,(int *)(pbVar10 + -0x16),4);
      }
      if (pbVar10[-1] != 0) {
        pbVar1 = pbVar10 + -0xe;
        *(uint *)pbVar1 = *(int *)pbVar1 - (uint)*(ushort *)(puVar11 + 0x152);
        if (*(int *)pbVar1 < 0) {
          pbVar10[-0xffffffff0000000e] = 0;
          pbVar10[-0xffffffff0000000d] = 0;
          pbVar10[-0xffffffff0000000c] = 0;
          pbVar10[-0xffffffff0000000b] = 0;
        }
        pbVar10[-100] = pbVar10[-100] | 2;
      }
      bVar6 = *local_8;
      uVar3 = (uint)bVar6;
      bVar4 = bVar6 >> 4;
      if (bVar4 == 6) {
        pbVar1 = pbVar10 + -0x56;
        *(uint *)pbVar1 = *(int *)pbVar1 - (uVar3 & 0xf);
        if (*(int *)pbVar1 < 0) {
          pbVar10[-0xffffffff00000056] = 0;
          pbVar10[-0xffffffff00000055] = 0;
          pbVar10[-0xffffffff00000054] = 0;
          pbVar10[-0xffffffff00000053] = 0;
        }
LAB_0041181b:
        pbVar10[-100] = pbVar10[-100] | 2;
      }
      else {
        if (bVar4 == 7) {
          *(uint *)(pbVar10 + -0x56) = *(int *)(pbVar10 + -0x56) + (uVar3 & 0xf);
          if (0x40 < *(int *)(pbVar10 + -0x56)) {
            pbVar10[-0xffffffff00000056] = 0x40;
            pbVar10[-0xffffffff00000055] = 0;
            pbVar10[-0xffffffff00000054] = 0;
            pbVar10[-0xffffffff00000053] = 0;
          }
          goto LAB_0041181b;
        }
        if (bVar4 == 0xb) {
          pbVar10[0x21] = bVar6 & 0xf;
          FUN_00410b74((uint)(pbVar10 + -0x66));
          bVar6 = pbVar10[0x20] + pbVar10[0x1f];
          pbVar10[0x1f] = bVar6;
          if ('\x1f' < (char)bVar6) {
            pbVar10[0x1f] = bVar6 - 0x40;
          }
        }
        else {
          if (bVar4 == 0xd) {
            *(uint *)(pbVar10 + -0x52) = *(int *)(pbVar10 + -0x52) - (uVar3 & 0xf);
          }
          else {
            if (bVar4 != 0xe) {
              if (bVar4 == 0xf) {
                FUN_00410b2f((int)(pbVar10 + -0x66));
              }
              goto LAB_0041181f;
            }
            *(uint *)(pbVar10 + -0x52) = *(int *)(pbVar10 + -0x52) + (uVar3 & 0xf);
          }
          pbVar10[-100] = pbVar10[-100] | 4;
        }
      }
LAB_0041181f:
      if (bVar7 < 6) {
        if (bVar7 != 5) {
          if (bVar7 == 0) {
            if (local_8[2] == 0) goto LAB_004119a8;
            if (param_1[0x4d] % 3 == 1) {
              bVar7 = *(byte *)((int)param_1 + 0x22);
              bVar5 = bVar9;
            }
            else {
              if (param_1[0x4d] % 3 != 2) goto LAB_0041188b;
              bVar7 = *(byte *)((int)param_1 + 0x22);
            }
            if ((bVar7 & 1) != 0) {
              *(uint *)(pbVar10 + -0x4a) = (uint)bVar5 << 6;
            }
          }
          else if (bVar7 == 1) {
            *(uint *)(pbVar10 + -0x5a) = *(int *)(pbVar10 + -0x5a) + (uint)pbVar10[0x13] * -4;
            pbVar10[-0xffffffff0000004a] = 0;
            pbVar10[-0xffffffff00000049] = 0;
            pbVar10[-0xffffffff00000048] = 0;
            pbVar10[-0xffffffff00000047] = 0;
            if (*(int *)(pbVar10 + -0x5a) < 0x38) {
              pbVar10[-0xffffffff0000005a] = 0x38;
              pbVar10[-0xffffffff00000059] = 0;
              pbVar10[-0xffffffff00000058] = 0;
              pbVar10[-0xffffffff00000057] = 0;
            }
          }
          else {
            if (bVar7 != 2) {
              if (bVar7 == 3) {
                pbVar10[-0xffffffff0000004a] = 0;
                pbVar10[-0xffffffff00000049] = 0;
                pbVar10[-0xffffffff00000048] = 0;
                pbVar10[-0xffffffff00000047] = 0;
                FUN_00410b2f((int)(pbVar10 + -0x66));
              }
              else if (bVar7 == 4) {
                FUN_00410b74((uint)(pbVar10 + -0x66));
                bVar7 = pbVar10[0x20] + pbVar10[0x1f];
                pbVar10[0x1f] = bVar7;
                if ('\x1f' < (char)bVar7) {
                  pbVar10[0x1f] = bVar7 - 0x40;
                }
              }
              goto LAB_004119a8;
            }
            *(uint *)(pbVar10 + -0x5a) = *(int *)(pbVar10 + -0x5a) + (uint)pbVar10[0x12] * 4;
            pbVar10[-0xffffffff0000004a] = 0;
            pbVar10[-0xffffffff00000049] = 0;
            pbVar10[-0xffffffff00000048] = 0;
            pbVar10[-0xffffffff00000047] = 0;
          }
LAB_0041188b:
          pbVar10[-100] = pbVar10[-100] | 1;
          goto LAB_004119a8;
        }
        pbVar10[-0xffffffff0000004a] = 0;
        pbVar10[-0xffffffff00000049] = 0;
        pbVar10[-0xffffffff00000048] = 0;
        pbVar10[-0xffffffff00000047] = 0;
        FUN_00410b2f((int)(pbVar10 + -0x66));
LAB_00411973:
        bVar7 = pbVar10[0x16];
        if (bVar7 >> 4 == 0) {
          if ((bVar7 & 0xf) != 0) {
            pbVar1 = pbVar10 + -0x56;
            *(uint *)pbVar1 = *(int *)pbVar1 - (uint)(bVar7 & 0xf);
            if (*(int *)pbVar1 < 0) {
LAB_004119a0:
              pbVar10[-0xffffffff00000056] = 0;
              pbVar10[-0xffffffff00000055] = 0;
              pbVar10[-0xffffffff00000054] = 0;
              pbVar10[-0xffffffff00000053] = 0;
            }
          }
        }
        else {
          *(uint *)(pbVar10 + -0x56) = *(int *)(pbVar10 + -0x56) + (uint)(bVar7 >> 4);
          if (0x40 < *(int *)(pbVar10 + -0x56)) {
            pbVar10[-0xffffffff00000056] = 0x40;
            pbVar10[-0xffffffff00000055] = 0;
            pbVar10[-0xffffffff00000054] = 0;
            pbVar10[-0xffffffff00000053] = 0;
          }
        }
        pbVar10[-100] = pbVar10[-100] | 2;
      }
      else {
        if (bVar7 == 6) {
          FUN_00410b74((uint)(pbVar10 + -0x66));
          bVar7 = pbVar10[0x20] + pbVar10[0x1f];
          pbVar10[0x1f] = bVar7;
          if ('\x1f' < (char)bVar7) {
            pbVar10[0x1f] = bVar7 - 0x40;
          }
          goto LAB_00411973;
        }
        if (bVar7 == 7) {
          FUN_00410c12((int)(pbVar10 + -0x66));
          goto LAB_004119a8;
        }
        if (bVar7 == 10) goto LAB_00411973;
        if (bVar7 == 0xe) {
          if (bVar9 == 9) {
            if ((bVar5 != 0) && (param_1[0x4d] % (int)(bVar2 & 0xf) == 0)) {
              pbVar10[-100] = pbVar10[-100] | 0xb;
            }
            goto LAB_004119a8;
          }
          if ((bVar9 != 0xc) || (param_1[0x4d] != (bVar2 & 0xf))) goto LAB_004119a8;
          goto LAB_004119a0;
        }
      }
LAB_004119a8:
      FUN_00410efa((int)(pbVar10 + -0x66),(int)local_c,(uint)param_1);
      local_4 = local_4 + 1;
      local_8 = local_8 + 5;
      pbVar10 = pbVar10 + 0xac;
    } while (local_4 < (short)param_1[5]);
  }
  return;
}


// ==== FUN_004119dd @ 004119dd ====

void FUN_004119dd(int *param_1)

{
  int iVar1;
  
  if (param_1[0x4d] == 0) {
    if (-1 < param_1[0x54]) {
      param_1[0x51] = param_1[0x54];
    }
    if (-1 < param_1[0x53]) {
      param_1[0x50] = param_1[0x53];
    }
    FUN_00411196(param_1);
    if (param_1[0x53] == -1) {
      param_1[0x53] = param_1[0x50] + 1;
      if (*(int *)(*param_1 + (uint)*(byte *)(param_1[0x51] + 0x28 + (int)param_1) * 8) <=
          param_1[0x50] + 1) {
        iVar1 = param_1[0x51] + 1;
        param_1[0x54] = iVar1;
        if ((short)param_1[4] <= iVar1) {
          param_1[0x54] = (int)*(short *)((int)param_1 + 0x12);
        }
        param_1[0x53] = 0;
      }
    }
  }
  else {
    FUN_004115f9(param_1);
  }
  param_1[0x4d] = param_1[0x4d] + 1;
  if (param_1[0x4e] + param_1[0x52] <= param_1[0x4d]) {
    param_1[0x52] = 0;
    param_1[0x4d] = 0;
  }
  return;
}


// ==== FUN_00411a95 @ 00411a95 ====

uint FUN_00411a95(int *param_1)

{
  int *piVar1;
  undefined2 *puVar2;
  byte bVar3;
  ushort uVar4;
  uint uVar5;
  ushort uVar6;
  int *piVar7;
  short sVar8;
  int iVar9;
  undefined4 *puVar10;
  byte *pbVar11;
  undefined1 *puVar12;
  short *psVar13;
  uint uVar14;
  int iVar15;
  uint uVar16;
  uint *puVar17;
  ushort *puVar18;
  uint *puVar19;
  uint local_1c;
  int local_18;
  uint *local_14;
  uint local_c;
  uint local_8;
  
  piVar7 = param_1;
  param_1[0x57] = (int)FUN_004119dd;
  *(undefined1 *)(param_1 + 0x4a) = 0x40;
  DAT_00474898 = (ushort *)((int)DAT_00474898 + 4);
  FUN_004042b5((int)(param_1 + 4),(int)DAT_00474898,6);
  iVar9 = (int)DAT_00474898;
  DAT_00474898 = (ushort *)((int)DAT_00474898 + 6);
  uVar4 = *DAT_00474898;
  DAT_00474898 = (ushort *)(iVar9 + 8);
  FUN_004042b5((int)(param_1 + 8),(int)DAT_00474898,0x108);
  DAT_00474898 = (ushort *)((int)DAT_00474898 + 0x108);
  param_1[6] = 0;
  iVar9 = (int)(short)param_1[4];
  if (0 < iVar9) {
    pbVar11 = (byte *)(param_1 + 10);
    do {
      if (param_1[6] <= (int)(uint)*pbVar11) {
        param_1[6] = *pbVar11 + 1;
      }
      pbVar11 = pbVar11 + 1;
    } while ((int)(pbVar11 + (-0x28 - (int)param_1)) < iVar9);
  }
  uVar16 = param_1[6];
  if (param_1[6] <= (int)(uint)uVar4) {
    uVar16 = (uint)uVar4;
  }
  param_1[7] = uVar16;
  puVar10 = FUN_004040f9(uVar16 << 3,1);
  param_1 = (int *)0x0;
  *piVar7 = (int)puVar10;
  puVar18 = (ushort *)(DAT_0047489c + 4);
  if (uVar4 != 0) {
    do {
      puVar17 = (uint *)(*piVar7 + (int)param_1 * 8);
      *puVar17 = (uint)*puVar18;
      puVar18 = puVar18 + 1;
      puVar10 = FUN_004040f9((int)(short)piVar7[5] * *puVar17 * 5,1);
      param_1 = (int *)((int)param_1 + 1);
      puVar17[1] = (uint)puVar10;
    } while ((int)param_1 < (int)(uint)uVar4);
  }
  local_14 = (uint *)0x0;
  if (0 < (short)piVar7[5]) {
    local_c = 0;
    do {
      local_8 = 0;
      do {
        param_1 = (int *)0x0;
        if (uVar4 != 0) {
          do {
            iVar9 = 0;
            piVar1 = (int *)(*piVar7 + (int)param_1 * 8);
            if (local_8 == 0) {
              puVar12 = (undefined1 *)(piVar1[1] + local_c);
              if (0 < *piVar1) {
                do {
                  uVar6 = *puVar18;
                  puVar18 = (ushort *)((int)puVar18 + 1);
                  *puVar12 = (char)uVar6;
                  puVar12 = puVar12 + (short)piVar7[5] * 5;
                  iVar9 = iVar9 + 1;
                } while (iVar9 < *piVar1);
                goto LAB_00411be0;
              }
            }
            else {
LAB_00411be0:
              if (local_8 == 1) {
                iVar15 = 0;
                iVar9 = piVar1[1] + local_c;
                if (*piVar1 < 1) goto LAB_00411c7c;
                do {
                  uVar6 = *puVar18;
                  puVar18 = (ushort *)((int)puVar18 + 1);
                  *(char *)(iVar9 + 1) = (char)uVar6;
                  iVar9 = iVar9 + (short)piVar7[5] * 5;
                  iVar15 = iVar15 + 1;
                } while (iVar15 < *piVar1);
              }
              if (local_8 == 2) {
                iVar15 = 0;
                iVar9 = piVar1[1] + local_c;
                if (*piVar1 < 1) goto LAB_00411c7c;
                do {
                  uVar6 = *puVar18;
                  puVar18 = (ushort *)((int)puVar18 + 1);
                  *(char *)(iVar9 + 2) = (char)uVar6;
                  iVar9 = iVar9 + (short)piVar7[5] * 5;
                  iVar15 = iVar15 + 1;
                } while (iVar15 < *piVar1);
              }
              if (local_8 == 3) {
                iVar15 = 0;
                iVar9 = piVar1[1] + local_c;
                if (*piVar1 < 1) goto LAB_00411c7c;
                do {
                  uVar6 = *puVar18;
                  puVar18 = (ushort *)((int)puVar18 + 1);
                  *(char *)(iVar9 + 3) = (char)uVar6;
                  iVar9 = iVar9 + (short)piVar7[5] * 5;
                  iVar15 = iVar15 + 1;
                } while (iVar15 < *piVar1);
              }
              if (local_8 == 4) {
                iVar15 = 0;
                iVar9 = piVar1[1] + local_c;
                if (0 < *piVar1) {
                  do {
                    uVar6 = *puVar18;
                    puVar18 = (ushort *)((int)puVar18 + 1);
                    *(char *)(iVar9 + 4) = (char)uVar6;
                    iVar9 = iVar9 + (short)piVar7[5] * 5;
                    iVar15 = iVar15 + 1;
                  } while (iVar15 < *piVar1);
                }
              }
            }
LAB_00411c7c:
            param_1 = (int *)((int)param_1 + 1);
          } while ((int)param_1 < (int)(uint)uVar4);
        }
        local_8 = local_8 + 1;
      } while ((int)local_8 < 5);
      local_14 = (uint *)((int)local_14 + 1);
      local_c = local_c + 5;
    } while ((int)local_14 < (int)(short)piVar7[5]);
  }
  uVar16 = (uint)uVar4;
  if ((int)uVar16 < piVar7[6]) {
    do {
      iVar15 = *piVar7;
      *(undefined4 *)(iVar15 + uVar16 * 8) = 0x40;
      iVar9 = uVar16 * 8;
      puVar10 = FUN_004040f9((short)piVar7[5] * 0x140,1);
      uVar16 = uVar16 + 1;
      *(undefined4 **)(iVar15 + iVar9 + 4) = puVar10;
    } while ((int)uVar16 < piVar7[6]);
  }
  puVar10 = FUN_004040f9((short)piVar7[8] * 0x154,1);
  piVar7[1] = (int)puVar10;
  iVar9 = 0;
  param_1 = (int *)0x0;
  if (0 < (short)piVar7[8]) {
    local_18 = 0;
    do {
      puVar17 = (uint *)(piVar7[1] + local_18);
      uVar4 = *DAT_00474890;
      uVar16 = (uint)DAT_00474890 >> 0x10;
      DAT_00474890 = DAT_00474890 + 1;
      if (0x10 < uVar4) {
        return CONCAT22((short)uVar16,uVar4) & 0xffffff00;
      }
      uVar16 = (uint)uVar4;
      *puVar17 = uVar16;
      if (uVar4 == 0) {
        for (iVar9 = 0x10; puVar17 = puVar17 + 1, iVar9 != 0; iVar9 = iVar9 + -1) {
          *puVar17 = (uint)&DAT_004801a0;
        }
      }
      else {
        FUN_004042b5((int)(puVar17 + 0x11),(int)DAT_00474890,0x60);
        DAT_00474890 = DAT_00474890 + 0x30;
        FUN_004042b5((int)(puVar17 + 0x29),(int)DAT_00474890,0x30);
        DAT_00474890 = DAT_00474890 + 0x18;
        FUN_004042b5((int)(puVar17 + 0x3d),(int)DAT_00474890,0x30);
        DAT_00474890 = DAT_00474890 + 0x18;
        FUN_004042b5((int)(puVar17 + 0x51),(int)DAT_00474890,0x10);
        DAT_00474890 = DAT_00474890 + 8;
        if ((byte)puVar17[0x51] < 2) {
          *(undefined1 *)(puVar17 + 0x53) = 0;
        }
        puVar19 = puVar17;
        uVar14 = uVar16;
        if (*(byte *)((int)puVar17 + 0x145) < 2) {
          *(undefined1 *)((int)puVar17 + 0x14d) = 0;
        }
        for (; uVar14 != 0; uVar14 = uVar14 - 1) {
          puVar10 = FUN_004040f9(0x34,1);
          puVar19[1] = (uint)puVar10;
          puVar19 = puVar19 + 1;
        }
        local_c = 0;
        local_14 = puVar17;
        uVar14 = uVar16;
        do {
          for (; uVar14 != 0; uVar14 = uVar14 - 1) {
            local_14 = local_14 + 1;
            uVar5 = *local_14;
            if (local_c == 0) {
              FUN_004042b5(uVar5 + 4,(int)DAT_00474890,0xe);
              DAT_00474890 = DAT_00474890 + 7;
            }
            if (local_c == 1) {
              *(char *)(uVar5 + 0x30) = (char)*DAT_00474890;
              DAT_00474890 = (ushort *)((int)DAT_00474890 + 1);
            }
            if (local_c == 2) {
              *(int *)(uVar5 + 0x18) = (int)(char)*DAT_00474890;
              DAT_00474890 = (ushort *)((int)DAT_00474890 + 1);
            }
            if (local_c == 3) {
              *(char *)(uVar5 + 0x1f) = (char)*DAT_00474890;
              DAT_00474890 = (ushort *)((int)DAT_00474890 + 1);
            }
          }
          local_c = local_c + 1;
          local_14 = puVar17;
          uVar14 = uVar16;
        } while (local_c < 4);
        local_8 = 0;
        local_1c = uVar16;
        if (uVar16 == 0) {
LAB_00411f3e:
          puVar19 = puVar17 + local_8 + 1;
          for (iVar9 = 0x10 - local_8; iVar9 != 0; iVar9 = iVar9 + -1) {
            *puVar19 = (uint)&DAT_004801a0;
            puVar19 = puVar19 + 1;
          }
        }
        else {
          do {
            local_14 = local_14 + 1;
            piVar1 = (int *)*local_14;
            bVar3 = *(byte *)(piVar1 + 0xc);
            *(undefined1 *)((int)piVar1 + 0x1d) = 1;
            *(undefined1 *)(piVar1 + 7) = 8;
            if ((bVar3 & 1) != 0) {
              *(undefined1 *)((int)piVar1 + 0x1d) = 2;
            }
            if ((bVar3 & 2) != 0) {
              *(byte *)((int)piVar1 + 0x1d) = *(byte *)((int)piVar1 + 0x1d) & 0xfc | 4;
            }
            if ((bVar3 & 0x10) != 0) {
              *(undefined1 *)(piVar1 + 7) = 0x10;
            }
            if ((*(byte *)((int)piVar1 + 0x1d) & 1) != 0) {
              piVar1[2] = 0;
              piVar1[3] = piVar1[1];
            }
            if ((char)piVar1[7] == '\x10') {
              piVar1[1] = (uint)piVar1[1] >> 1;
              piVar1[2] = (uint)piVar1[2] >> 1;
              piVar1[3] = (uint)piVar1[3] >> 1;
            }
            if (piVar1[3] == 0) {
              piVar1[2] = 0;
              piVar1[3] = piVar1[1];
              *(undefined1 *)((int)piVar1 + 0x1d) = 1;
            }
            iVar9 = piVar1[1];
            if (*piVar1 != 0) {
              FUN_0040411d(*piVar1);
            }
            if (iVar9 * 2 == 0) {
              *piVar1 = 0;
            }
            else {
              puVar10 = FUN_004040f9(iVar9 * 2 + 0x10,1);
              *piVar1 = (int)puVar10;
            }
            local_1c = local_1c - 1;
          } while (local_1c != 0);
          local_8 = uVar16;
          if (uVar16 < 0x10) goto LAB_00411f3e;
        }
        local_8 = 0;
        if (uVar16 != 0) {
          do {
            puVar17 = puVar17 + 1;
            piVar1 = (int *)*puVar17;
            bVar3 = *(byte *)(piVar1 + 7);
            iVar9 = piVar1[1];
            if (iVar9 != 0) {
              puVar10 = FUN_004040f9(iVar9 * 2 + 0x10,1);
              if ((code *)piVar7[0x58] != (code *)0x0) {
                (*(code *)piVar7[0x58])
                          (puVar10,(uint)bVar3 * iVar9 >> 3,(char)piVar1[7],param_1,local_8);
              }
              if ((char)piVar1[7] == '\b') {
                psVar13 = (short *)*piVar1;
                iVar9 = 0;
                if (0 < piVar1[1]) {
                  do {
                    *psVar13 = (ushort)*(byte *)(iVar9 + (int)puVar10) << 8;
                    psVar13 = psVar13 + 1;
                    iVar9 = iVar9 + 1;
                  } while (iVar9 < piVar1[1]);
                }
                *(undefined1 *)(piVar1 + 7) = 0x10;
                FUN_0040411d((int)puVar10);
              }
              else {
                FUN_0040411d(*piVar1);
                *piVar1 = (int)puVar10;
              }
              uVar14 = 0;
              if (piVar7[0x58] == 0) {
                psVar13 = (short *)*piVar1;
                sVar8 = 0;
                if (piVar1[1] != 0) {
                  do {
                    sVar8 = *psVar13 + sVar8;
                    *psVar13 = sVar8;
                    psVar13 = psVar13 + 1;
                    uVar14 = uVar14 + 1;
                  } while (uVar14 < (uint)piVar1[1]);
                }
              }
              iVar9 = *piVar1;
              if (*(char *)((int)piVar1 + 0x1d) == '\x04') {
                puVar2 = (undefined2 *)(iVar9 + (piVar1[3] + piVar1[2]) * 2);
                *puVar2 = puVar2[-1];
              }
              else if (*(char *)((int)piVar1 + 0x1d) == '\x02') {
                *(undefined2 *)(iVar9 + (piVar1[3] + piVar1[2]) * 2) =
                     *(undefined2 *)(iVar9 + piVar1[2] * 2);
              }
            }
            local_8 = local_8 + 1;
          } while (local_8 < uVar16);
        }
      }
      iVar9 = (int)(short)piVar7[8];
      param_1 = (int *)((int)param_1 + 1);
      local_18 = local_18 + 0x154;
    } while ((int)param_1 < iVar9);
  }
  return CONCAT31((int3)((uint)iVar9 >> 8),1);
}


// ==== FUN_00412087 @ 00412087 ====

void FUN_00412087(int param_1,int param_2,int param_3,int param_4,int param_5)

{
  if ((((param_1 == 0) || (param_2 == 0)) || (param_3 == 0)) || ((param_4 == 0 || (param_5 == 0))))
  {
    DAT_004789ec = 0;
    DAT_004789f0 = 0;
    DAT_004789f4 = 0;
    DAT_004789f8 = 0;
    DAT_004789fc = 0;
  }
  else {
    DAT_004789ec = param_1;
    DAT_004789f0 = param_2;
    DAT_004789f4 = param_3;
    DAT_004789f8 = param_4;
    DAT_004789fc = param_5;
  }
  return;
}


// ==== FUN_004120f6 @ 004120f6 ====

undefined4 * FUN_004120f6(undefined4 param_1,undefined1 param_2,undefined4 param_3)

{
  undefined4 *puVar1;
  int iVar2;
  
  puVar1 = FUN_004040f9(0x18,1);
  *(undefined1 *)puVar1 = param_2;
  puVar1[5] = param_3;
  iVar2 = (*DAT_004789ec)(param_1);
  puVar1[4] = iVar2;
  if (iVar2 == 0) {
    FUN_0040411d((int)puVar1);
    puVar1 = (undefined4 *)0x0;
  }
  return puVar1;
}


// ==== FUN_00412133 @ 00412133 ====

void FUN_00412133(int param_1)

{
  if (param_1 != 0) {
    (*DAT_004789f0)(*(undefined4 *)(param_1 + 0x10));
    FUN_0040411d(param_1);
  }
  return;
}


// ==== FUN_00412150 @ 00412150 ====

undefined4 __fastcall FUN_00412150(undefined4 param_1)

{
  return param_1;
}


// ==== FUN_00412153 @ 00412153 ====

void __fastcall FUN_00412153(int param_1)

{
  void *pvVar1;
  int iVar2;
  
  if (0 < *(int *)(param_1 + 0xc)) {
    iVar2 = 0;
    if (0 < *(int *)(param_1 + 0xc)) {
      do {
        pvVar1 = *(void **)(*(int *)(param_1 + 0x10) + iVar2 * 4);
        if (pvVar1 != (void *)0x0) {
          FUN_004121e8(pvVar1,1);
        }
        iVar2 = iVar2 + 1;
      } while (iVar2 < *(int *)(param_1 + 0xc));
    }
    FUN_004042eb(*(int *)(param_1 + 0x10));
  }
  if (0 < *(int *)(param_1 + 0x14)) {
    iVar2 = 0;
    if (0 < *(int *)(param_1 + 0x14)) {
      do {
        FUN_004042eb(*(int *)(*(int *)(*(int *)(param_1 + 0x18) + iVar2 * 4) + 0x10));
        pvVar1 = *(void **)(*(int *)(param_1 + 0x18) + iVar2 * 4);
        if (pvVar1 != (void *)0x0) {
          FUN_00412204(pvVar1,1);
        }
        iVar2 = iVar2 + 1;
      } while (iVar2 < *(int *)(param_1 + 0x14));
    }
    FUN_004042eb(*(int *)(param_1 + 0x18));
  }
  if (*(void **)(param_1 + 8) != (void *)0x0) {
    FUN_004121e8(*(void **)(param_1 + 8),1);
  }
  FUN_004042eb(*(int *)(param_1 + 0x24));
  if (*(void **)(param_1 + 0x28) != (void *)0x0) {
    FUN_00412220(*(void **)(param_1 + 0x28),1);
  }
  return;
}


// ==== FUN_004121e8 @ 004121e8 ====

undefined4 * __thiscall FUN_004121e8(void *this,byte param_1)

{
  FUN_0041537f(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_00412204 @ 00412204 ====

int __thiscall FUN_00412204(void *this,byte param_1)

{
  FUN_0041254c();
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return (int)this;
}


// ==== FUN_00412220 @ 00412220 ====

int * __thiscall FUN_00412220(void *this,byte param_1)

{
  thunk_FUN_00415a34(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_0041223c @ 0041223c ====

void __thiscall FUN_0041223c(void *this,undefined4 param_1,undefined4 param_2)

{
  *(undefined4 *)((int)this + 0x20) = param_1;
  *(undefined4 *)((int)this + 0x1c) = param_2;
  return;
}


// ==== FUN_0041224d @ 0041224d ====

void __fastcall FUN_0041224d(undefined4 *param_1)

{
  undefined4 uVar1;
  undefined4 *puVar2;
  void *this;
  
  param_1[1] = 0;
  *param_1 = 0;
  param_1[3] = 1;
  uVar1 = FUN_004042e0(4);
  param_1[4] = uVar1;
  puVar2 = (undefined4 *)FUN_004042e0(0x10);
  if (puVar2 == (undefined4 *)0x0) {
    uVar1 = 0;
  }
  else {
    uVar1 = FUN_00415379(puVar2);
  }
  *(undefined4 *)param_1[4] = uVar1;
  FUN_0041538d(*(void **)param_1[4],(ushort)param_1[8],(ushort)param_1[7]);
  param_1[5] = 0;
  param_1[6] = 0;
  puVar2 = (undefined4 *)FUN_004042e0(0x10);
  if (puVar2 == (undefined4 *)0x0) {
    this = (void *)0x0;
  }
  else {
    this = (void *)FUN_00415379(puVar2);
  }
  param_1[2] = this;
  FUN_0041538d(this,(ushort)param_1[8],(ushort)param_1[7]);
  uVar1 = FUN_004042e0(param_1[7] * param_1[8] * 0x10);
  param_1[9] = uVar1;
  puVar2 = (undefined4 *)FUN_004042e0(0x5c);
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    puVar2 = FUN_00415906(puVar2);
  }
  param_1[10] = puVar2;
  FUN_004159e4(puVar2,*(ushort *)(param_1 + 8),*(ushort *)(param_1 + 7));
  return;
}


// ==== FUN_00412305 @ 00412305 ====

void __fastcall FUN_00412305(int param_1)

{
  int iVar1;
  
  FUN_004153c3(*(int **)(param_1 + 8));
  iVar1 = 0;
  if (0 < *(int *)(param_1 + 0xc)) {
    do {
      FUN_00415493(*(void **)(param_1 + 8),*(undefined4 **)(*(int *)(param_1 + 0x10) + iVar1 * 4));
      iVar1 = iVar1 + 1;
    } while (iVar1 < *(int *)(param_1 + 0xc));
  }
  FUN_00415d61(*(void **)(param_1 + 0x28),(int *)**(undefined4 **)(param_1 + 8));
  return;
}


// ==== FUN_0041233c @ 0041233c ====

void __thiscall FUN_0041233c(void *this,undefined4 param_1)

{
  int iVar1;
  
  iVar1 = FUN_004042e0(*(int *)((int)this + 0x14) * 4 + 4);
  if (*(int *)((int)this + 0x14) != 0) {
    FUN_004042b5(iVar1,*(int *)((int)this + 0x18),*(int *)((int)this + 0x14) << 2);
    FUN_004042eb(*(int *)((int)this + 0x18));
  }
  *(undefined4 *)(iVar1 + *(int *)((int)this + 0x14) * 4) = param_1;
  *(int *)((int)this + 0x14) = *(int *)((int)this + 0x14) + 1;
  *(int *)((int)this + 0x18) = iVar1;
  return;
}


// ==== FUN_00412387 @ 00412387 ====

void __thiscall FUN_00412387(void *this,byte param_1)

{
  *(uint *)this = (uint)param_1;
  return;
}


// ==== FUN_00412391 @ 00412391 ====

void __fastcall FUN_00412391(int param_1)

{
  undefined4 *puVar1;
  int iVar2;
  undefined4 *puVar3;
  undefined4 uVar4;
  int iVar5;
  
  iVar5 = 0;
  puVar1 = (undefined4 *)FUN_004042e0(*(int *)(param_1 + 0xc) * 4 + 4);
  *(int *)(param_1 + 4) = *(int *)(param_1 + 4) + 1;
  iVar2 = 0;
  puVar3 = puVar1;
  if (0 < *(int *)(param_1 + 0xc)) {
    do {
      if (iVar5 == *(int *)(param_1 + 4)) {
        iVar5 = iVar5 + 1;
        puVar3 = puVar3 + 1;
      }
      iVar5 = iVar5 + 1;
      *puVar3 = *(undefined4 *)(*(int *)(param_1 + 0x10) + iVar2 * 4);
      iVar2 = iVar2 + 1;
      puVar3 = puVar3 + 1;
    } while (iVar2 < *(int *)(param_1 + 0xc));
  }
  puVar3 = (undefined4 *)FUN_004042e0(0x10);
  if (puVar3 == (undefined4 *)0x0) {
    uVar4 = 0;
  }
  else {
    uVar4 = FUN_00415379(puVar3);
  }
  puVar1[*(int *)(param_1 + 4)] = uVar4;
  FUN_0041538d((void *)puVar1[*(int *)(param_1 + 4)],(ushort)*(undefined4 *)(param_1 + 0x1c),
               (ushort)*(undefined4 *)(param_1 + 0x20));
  FUN_004042eb(*(int *)(param_1 + 0x10));
  *(int *)(param_1 + 0xc) = *(int *)(param_1 + 0xc) + 1;
  *(undefined4 **)(param_1 + 0x10) = puVar1;
  return;
}


// ==== FUN_00412413 @ 00412413 ====

void __fastcall FUN_00412413(int param_1)

{
  int iVar1;
  void *this;
  undefined4 *puVar2;
  int iVar3;
  undefined4 *puVar4;
  int iVar5;
  
  iVar5 = 0;
  this = *(void **)(*(int *)(param_1 + 0x10) + *(int *)(param_1 + 4) * 4);
  if (this != (void *)0x0) {
    FUN_004121e8(this,1);
  }
  puVar2 = (undefined4 *)FUN_004042e0(*(int *)(param_1 + 0xc) * 4 + -4);
  iVar3 = 0;
  puVar4 = puVar2;
  if (0 < *(int *)(param_1 + 0xc)) {
    do {
      if (iVar5 == *(int *)(param_1 + 4)) {
        iVar5 = iVar5 + 1;
      }
      iVar1 = iVar5 * 4;
      iVar5 = iVar5 + 1;
      *puVar4 = *(undefined4 *)(*(int *)(param_1 + 0x10) + iVar1);
      iVar3 = iVar3 + 1;
      puVar4 = puVar4 + 1;
    } while (iVar3 < *(int *)(param_1 + 0xc));
  }
  if (*(int *)(param_1 + 4) == *(int *)(param_1 + 0xc) + -1) {
    *(int *)(param_1 + 4) = *(int *)(param_1 + 4) + -1;
  }
  FUN_004042eb(*(int *)(param_1 + 0x10));
  *(int *)(param_1 + 0xc) = *(int *)(param_1 + 0xc) + -1;
  *(undefined4 **)(param_1 + 0x10) = puVar2;
  return;
}


// ==== FUN_00412484 @ 00412484 ====

void __fastcall FUN_00412484(int param_1)

{
  undefined4 *puVar1;
  undefined4 uVar2;
  
  puVar1 = (undefined4 *)(*(int *)(param_1 + 0x10) + *(int *)(param_1 + 4) * 4);
  uVar2 = *puVar1;
  *puVar1 = *(undefined4 *)(*(int *)(param_1 + 0x10) + -4 + *(int *)(param_1 + 4) * 4);
  *(undefined4 *)(*(int *)(param_1 + 0x10) + -4 + *(int *)(param_1 + 4) * 4) = uVar2;
  *(int *)(param_1 + 4) = *(int *)(param_1 + 4) + -1;
  return;
}


// ==== FUN_004124a5 @ 004124a5 ====

void __fastcall FUN_004124a5(int param_1)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  
  FUN_00412305(param_1);
  iVar3 = *(int *)(param_1 + 0xc);
  iVar2 = 0;
  if (0 < iVar3) {
    piVar1 = *(int **)(param_1 + 0x10);
    do {
      if (*(int *)(*piVar1 + 8) != 0) break;
      iVar2 = iVar2 + 1;
      piVar1 = piVar1 + 1;
    } while (iVar2 < iVar3);
  }
  if (iVar2 == iVar3) {
    return;
  }
  FUN_00415d61((void *)**(undefined4 **)(*(int *)(param_1 + 0x10) + iVar2 * 4),
               *(int **)(param_1 + 0x28));
  iVar3 = iVar2;
  do {
    iVar3 = iVar3 + 1;
    while( true ) {
      if (*(int *)(param_1 + 0xc) <= iVar3) {
        *(int *)(param_1 + 4) = iVar2;
        return;
      }
      if (*(int *)(*(int *)(*(int *)(param_1 + 0x10) + iVar3 * 4) + 8) == 0) break;
      *(int *)(param_1 + 4) = iVar3;
      FUN_00412413(param_1);
    }
  } while( true );
}


// ==== FUN_00412506 @ 00412506 ====

void __fastcall FUN_00412506(int param_1)

{
  FUN_00412305(param_1);
  FUN_00415d61(*(void **)**(undefined4 **)(param_1 + 0x10),*(int **)(param_1 + 0x28));
  while (*(int *)(param_1 + 0xc) != 1) {
    *(undefined4 *)(param_1 + 4) = 1;
    FUN_00412413(param_1);
  }
  *(undefined4 *)(param_1 + 4) = 0;
  return;
}


// ==== FUN_00412539 @ 00412539 ====

void __thiscall FUN_00412539(void *this,undefined1 param_1)

{
  *(undefined1 *)(*(int *)(*(int *)((int)this + 0x10) + *(int *)((int)this + 4) * 4) + 4) = param_1;
  return;
}


// ==== FUN_0041254c @ 0041254c ====

void FUN_0041254c(void)

{
  return;
}


// ==== FUN_0041254d @ 0041254d ====

undefined4 * __thiscall FUN_0041254d(void *this,undefined4 param_1)

{
  undefined4 uVar1;
  int iVar2;
  
  *(undefined4 *)this = param_1;
  uVar1 = FUN_004042e0(0x400);
  *(undefined4 *)((int)this + 4) = uVar1;
  iVar2 = 0;
  do {
    *(undefined4 *)(iVar2 + *(int *)((int)this + 4)) = 0;
    iVar2 = iVar2 + 4;
  } while (iVar2 < 0x400);
  *(code **)(*(int *)((int)this + 4) + 8) = FUN_00412a71;
  *(code **)(*(int *)((int)this + 4) + 0xc) = FUN_00412c59;
  *(undefined1 **)(*(int *)((int)this + 4) + 0x1c) = &LAB_00412f37;
  *(code **)(*(int *)((int)this + 4) + 0x24) = FUN_00412f5c;
  *(code **)(*(int *)((int)this + 4) + 0x28) = FUN_004130b0;
  *(code **)(*(int *)((int)this + 4) + 0x30) = FUN_0041310c;
  *(code **)(*(int *)((int)this + 4) + 0x38) = FUN_00413330;
  *(code **)(*(int *)((int)this + 4) + 0x40) = FUN_0041337e;
  *(code **)(*(int *)((int)this + 4) + 0x44) = FUN_004136a2;
  *(code **)(*(int *)((int)this + 4) + 0x48) = FUN_0041378d;
  *(code **)(*(int *)((int)this + 4) + 0x4c) = FUN_004138f9;
  *(code **)(*(int *)((int)this + 4) + 0x54) = FUN_00413c76;
  *(code **)(*(int *)((int)this + 4) + 0x58) = FUN_00413db6;
  *(undefined1 **)(*(int *)((int)this + 4) + 100) = &LAB_00414195;
  *(code **)(*(int *)((int)this + 4) + 0x68) = FUN_004142eb;
  *(code **)(*(int *)((int)this + 4) + 0x70) = FUN_0041435f;
  *(code **)(*(int *)((int)this + 4) + 0x78) = FUN_0041446a;
  *(code **)(*(int *)((int)this + 4) + 0x7c) = FUN_00414535;
  *(code **)(*(int *)((int)this + 4) + 0x80) = FUN_00414b1e;
  *(code **)(*(int *)((int)this + 4) + 0x84) = FUN_00414dcf;
  *(code **)(*(int *)((int)this + 4) + 0x88) = FUN_00415012;
  return this;
}


// ==== FUN_00412658 @ 00412658 ====

void __fastcall FUN_00412658(int param_1)

{
  FUN_004042eb(*(int *)(param_1 + 4));
  return;
}


// ==== FUN_00412662 @ 00412662 ====

undefined4 * __thiscall FUN_00412662(void *this,uint param_1)

{
  byte bVar1;
  ushort uVar2;
  ushort uVar3;
  int iVar4;
  void *pvVar5;
  uint uVar6;
  undefined4 *puVar7;
  uint *puVar8;
  int *piVar9;
  uint uVar10;
  ushort *puVar11;
  ushort *puVar12;
  uint local_8;
  
  uVar2 = *(ushort *)(param_1 + 1);
  uVar3 = *(ushort *)(param_1 + 3);
  iVar4 = FUN_004042e0(0x2c);
  if (iVar4 == 0) {
    pvVar5 = (void *)0x0;
  }
  else {
    pvVar5 = (void *)FUN_00412150(iVar4);
  }
  *(void **)((int)this + 8) = pvVar5;
  FUN_0041223c(pvVar5,(uint)uVar3,(uint)uVar2);
  FUN_0041224d(*(undefined4 **)((int)this + 8));
  puVar11 = (ushort *)(param_1 + 6);
  if (*(byte *)(param_1 + 5) == 0) {
    uVar2 = *puVar11;
    puVar11 = (ushort *)(param_1 + 8);
    if (uVar2 == 0) goto LAB_004127b5;
    uVar6 = (uint)uVar2;
  }
  else {
    uVar6 = (uint)*(byte *)(param_1 + 5);
  }
  for (; uVar6 != 0; uVar6 = uVar6 - 1) {
    puVar7 = (undefined4 *)FUN_004042e0(0x14);
    if (puVar7 == (undefined4 *)0x0) {
      puVar8 = (uint *)0x0;
    }
    else {
      puVar8 = (uint *)FUN_00412a16(puVar7);
    }
    uVar10 = 0;
    param_1 = 0;
    local_8 = 0;
    uVar2 = puVar11[1];
    if ((uVar2 & 8) != 0) {
      uVar10 = 0xff000000;
    }
    if ((uVar2 & 4) != 0) {
      uVar10 = uVar10 | 0xff0000;
    }
    if ((uVar2 & 2) != 0) {
      uVar10 = CONCAT22((short)(uVar10 >> 0x10),0xff00);
    }
    if ((uVar2 & 1) != 0) {
      uVar10 = uVar10 | 0xff;
    }
    bVar1 = (byte)puVar11[2];
    puVar12 = (ushort *)((int)puVar11 + 5);
    if (bVar1 == 0xff) {
      param_1 = (uint)*puVar12;
      if (*puVar12 == 0xffff) {
        local_8 = *(uint *)((int)puVar11 + 7);
      }
      puVar12 = (ushort *)((int)puVar11 + 0xb);
    }
    *puVar8 = (uint)*puVar11;
    puVar8[3] = uVar10;
    puVar8[2] = (uint)(uVar2 >> 8);
    puVar8[1] = (uint)bVar1;
    if (bVar1 == 0xff) {
      puVar8[1] = param_1;
    }
    if ((short)param_1 == -1) {
      puVar8[1] = local_8;
    }
    uVar10 = FUN_004042e0(puVar8[1]);
    puVar8[4] = uVar10;
    FUN_004042b5(uVar10,(int)puVar12,puVar8[1]);
    puVar11 = (ushort *)((int)puVar12 + puVar8[1]);
    FUN_0041233c(*(void **)((int)this + 8),puVar8);
  }
LAB_004127b5:
  (**(code **)this)();
  FUN_0041281f(this);
  FUN_00412305(*(int *)((int)this + 8));
  piVar9 = (int *)FUN_00412a24(*(int *)((int)this + 8));
  pvVar5 = (void *)FUN_004042e0(0x5c);
  if (pvVar5 == (void *)0x0) {
    puVar7 = (undefined4 *)0x0;
  }
  else {
    puVar7 = FUN_00415944(pvVar5,piVar9);
  }
  if (*(void **)((int)this + 8) != (void *)0x0) {
    FUN_00412803(*(void **)((int)this + 8),1);
  }
  return puVar7;
}


// ==== FUN_00412803 @ 00412803 ====

int __thiscall FUN_00412803(void *this,byte param_1)

{
  FUN_00412153((int)this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return (int)this;
}


// ==== FUN_0041281f @ 0041281f ====

void __fastcall FUN_0041281f(undefined4 *param_1)

{
  undefined1 *puVar1;
  int iVar2;
  uint *puVar3;
  int *piVar4;
  void *pvVar5;
  undefined4 *puVar6;
  undefined4 *puVar7;
  uint uVar8;
  undefined4 uVar9;
  int iVar10;
  int *piVar11;
  uint uVar12;
  int local_c;
  int local_8;
  
  local_c = 0;
  iVar2 = FUN_00412a60(param_1[2]);
  if (0 < iVar2) {
    do {
      (*(code *)*param_1)();
      puVar3 = (uint *)FUN_00412a64((void *)param_1[2],local_c);
      if ((*puVar3 & 0xff00) == 0xff00) {
        FUN_00412a3c((void *)param_1[2],puVar3[2]);
        uVar8 = *puVar3 & 0xff;
        if (uVar8 == 3) {
          FUN_00412484(param_1[2]);
        }
        if (uVar8 == 4) {
          if (*(char *)puVar3[4] == '\0') {
            FUN_004124a5(param_1[2]);
            goto LAB_0041289a;
          }
          FUN_00412506(param_1[2]);
        }
        else {
LAB_0041289a:
          if (uVar8 == 6) {
            FUN_00412413(param_1[2]);
          }
          if (uVar8 == 7) {
            FUN_00412391(param_1[2]);
          }
          if (uVar8 == 8) {
            FUN_00412539((void *)param_1[2],*(undefined1 *)puVar3[4]);
          }
          if (uVar8 == 9) {
            puVar1 = (undefined1 *)puVar3[4];
            iVar2 = FUN_00412a46(param_1[2]);
            *(undefined1 *)(iVar2 + 0xc) = *puVar1;
          }
          if (uVar8 == 10) {
            puVar6 = (undefined4 *)puVar3[4];
            iVar2 = FUN_00412a46(param_1[2]);
            *(undefined4 *)(iVar2 + 8) = *puVar6;
          }
          if (uVar8 == 0xc) {
            FUN_00412387((void *)param_1[2],*(byte *)puVar3[4]);
          }
        }
        FUN_00412305(param_1[2]);
      }
      else {
        iVar2 = FUN_00412a2c((undefined4 *)param_1[2]);
        if (iVar2 == 0) {
          piVar4 = (int *)FUN_00412a2f((void *)param_1[2],puVar3[2]);
          piVar11 = piVar4;
          pvVar5 = (void *)FUN_00412a5c(param_1[2]);
          FUN_0041545c(pvVar5,piVar11);
          uVar8 = *puVar3;
          iVar2 = param_1[1];
          if (*(int *)(iVar2 + uVar8 * 4) != 0) {
            uVar12 = puVar3[4];
            iVar10 = param_1[2];
            uVar9 = 0;
            puVar6 = (undefined4 *)FUN_00412a5c(iVar10);
            (**(code **)(iVar2 + uVar8 * 4))(*puVar6,uVar9,iVar10,uVar12);
          }
          puVar6 = (undefined4 *)puVar3[3];
          puVar7 = (undefined4 *)FUN_00412a5c(param_1[2]);
          FUN_00415e32((void *)*piVar4,(int *)*puVar7,puVar6);
        }
        else {
          local_8 = 0;
          iVar2 = FUN_00412a28(param_1[2]);
          if (0 < iVar2) {
            do {
              piVar4 = (int *)FUN_00412a2f((void *)param_1[2],local_8);
              piVar11 = piVar4;
              pvVar5 = (void *)FUN_00412a5c(param_1[2]);
              FUN_0041545c(pvVar5,piVar11);
              uVar8 = *puVar3;
              iVar2 = param_1[1];
              if (*(int *)(iVar2 + uVar8 * 4) != 0) {
                uVar12 = puVar3[4];
                iVar10 = param_1[2];
                uVar9 = 0;
                puVar6 = (undefined4 *)FUN_00412a5c(iVar10);
                (**(code **)(iVar2 + uVar8 * 4))(*puVar6,uVar9,iVar10,uVar12);
              }
              puVar6 = (undefined4 *)puVar3[3];
              puVar7 = (undefined4 *)FUN_00412a5c(param_1[2]);
              FUN_00415e32((void *)*piVar4,(int *)*puVar7,puVar6);
              local_8 = local_8 + 1;
              iVar2 = FUN_00412a28(param_1[2]);
            } while (local_8 < iVar2);
          }
        }
      }
      local_c = local_c + 1;
      iVar2 = FUN_00412a60(param_1[2]);
    } while (local_c < iVar2);
  }
  return;
}


// ==== FUN_00412a16 @ 00412a16 ====

void __fastcall FUN_00412a16(undefined4 *param_1)

{
  param_1[4] = 0;
  *param_1 = 0xffffffff;
  param_1[1] = 0;
  return;
}


// ==== FUN_00412a24 @ 00412a24 ====

undefined4 __fastcall FUN_00412a24(int param_1)

{
  return *(undefined4 *)(param_1 + 0x28);
}


// ==== FUN_00412a28 @ 00412a28 ====

undefined4 __fastcall FUN_00412a28(int param_1)

{
  return *(undefined4 *)(param_1 + 0xc);
}


// ==== FUN_00412a2c @ 00412a2c ====

undefined4 __fastcall FUN_00412a2c(undefined4 *param_1)

{
  return *param_1;
}


// ==== FUN_00412a2f @ 00412a2f ====

undefined4 __thiscall FUN_00412a2f(void *this,int param_1)

{
  return *(undefined4 *)(*(int *)((int)this + 0x10) + param_1 * 4);
}


// ==== FUN_00412a3c @ 00412a3c ====

void __thiscall FUN_00412a3c(void *this,undefined4 param_1)

{
  *(undefined4 *)((int)this + 4) = param_1;
  return;
}


// ==== FUN_00412a46 @ 00412a46 ====

undefined4 __fastcall FUN_00412a46(int param_1)

{
  int iVar1;
  
  iVar1 = *(int *)(param_1 + 4);
  if ((-1 < iVar1) && (iVar1 < *(int *)(param_1 + 0xc))) {
    return *(undefined4 *)(*(int *)(param_1 + 0x10) + iVar1 * 4);
  }
  return 0;
}


// ==== FUN_00412a5c @ 00412a5c ====

undefined4 __fastcall FUN_00412a5c(int param_1)

{
  return *(undefined4 *)(param_1 + 8);
}


// ==== FUN_00412a60 @ 00412a60 ====

undefined4 __fastcall FUN_00412a60(int param_1)

{
  return *(undefined4 *)(param_1 + 0x14);
}


// ==== FUN_00412a64 @ 00412a64 ====

undefined4 __thiscall FUN_00412a64(void *this,int param_1)

{
  return *(undefined4 *)(*(int *)((int)this + 0x18) + param_1 * 4);
}


// ==== FUN_00412a71 @ 00412a71 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00412a71(int *param_1,undefined4 param_2,undefined4 param_3,ushort *param_4)

{
  float fVar1;
  
  fVar1 = (float)*param_4 * _DAT_00418298;
  if ((float)*param_4 * _DAT_00418298 == _DAT_004170c8) {
    fVar1 = _DAT_00418e28;
  }
  FUN_004141b9(1.0 / fVar1,(float)param_4[1],param_1);
  return;
}


// ==== FUN_00412abd @ 00412abd ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_00412abd(int *param_1,float param_2,float param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  int iVar4;
  ushort uVar5;
  ushort uVar6;
  uint uVar7;
  int iVar8;
  uint uVar9;
  int iVar10;
  int iVar11;
  int iVar12;
  uint uVar13;
  float10 fVar14;
  longlong lVar15;
  longlong lVar16;
  
  uVar5 = FUN_00412c54((int)param_1);
  uVar6 = FUN_00412c4f((int)param_1);
  uVar7 = (uint)uVar6;
  uVar6 = FUN_00412c4f((int)param_1);
  FUN_00415cf8(param_2,(uint)uVar6);
  uVar6 = FUN_00412c54((int)param_1);
  FUN_00415cf8(param_3,(uint)uVar6);
  lVar15 = FUN_00404224();
  iVar8 = (int)lVar15;
  lVar15 = FUN_00404224();
  lVar16 = FUN_00404224();
  FUN_004041ee((float)((uint)lVar16 & 0xff) * _DAT_00418284 * (float)_DAT_00419018);
  lVar16 = FUN_00404224();
  uVar13 = (uint)lVar16 & 0xff;
  lVar16 = FUN_00404224();
  FUN_004041ee((float)((uint)lVar16 & 0xff) * _DAT_00418284 * (float)_DAT_00419018);
  lVar16 = FUN_00404224();
  uVar9 = (uint)lVar16 & 0xff;
  iVar11 = (iVar8 + 1) % (int)uVar7;
  iVar10 = (int)lVar15 * uVar7;
  fVar14 = (float10)_DAT_00418298;
  iVar4 = *param_1;
  fVar1 = (float)((float10)(int)(0xff - uVar9) * fVar14);
  fVar2 = (float)((float10)(int)(0xff - uVar13) * fVar14);
  iVar12 = (((int)lVar15 + 1) % (int)(uint)uVar5) * uVar7;
  fVar3 = (float)((float10)uVar13 * fVar14);
  fVar14 = fVar14 * (float10)uVar9;
  return fVar14 * (float10)fVar2 * (float10)*(float *)((iVar12 + iVar8) * 0x10 + iVar4) +
         fVar14 * (float10)fVar3 * (float10)*(float *)((iVar12 + iVar11) * 0x10 + iVar4) +
         (float10)fVar2 * (float10)fVar1 * (float10)*(float *)((iVar10 + iVar8) * 0x10 + iVar4) +
         (float10)fVar3 * (float10)fVar1 * (float10)*(float *)((iVar10 + iVar11) * 0x10 + iVar4);
}


// ==== FUN_00412c4f @ 00412c4f ====

undefined2 __fastcall FUN_00412c4f(int param_1)

{
  return *(undefined2 *)(param_1 + 6);
}


// ==== FUN_00412c54 @ 00412c54 ====

undefined2 __fastcall FUN_00412c54(int param_1)

{
  return *(undefined2 *)(param_1 + 8);
}


// ==== FUN_00412c59 @ 00412c59 ====

void FUN_00412c59(float *param_1,undefined4 param_2,undefined4 param_3,ushort *param_4)

{
  float *pfVar1;
  int iVar2;
  ushort uVar3;
  int local_70 [23];
  undefined1 local_14 [16];
  
  FUN_0040424e((uint)*param_4);
  FUN_00415a55(param_1);
  FUN_00415906(local_70);
  uVar3 = 1;
  iVar2 = 8;
  do {
    FUN_004159e4(local_70,uVar3,uVar3);
    FUN_00412d4b(local_70,0);
    FUN_00412eb2(local_70);
    FUN_00412d55(param_1,local_70);
    FUN_00415a34(local_70);
    uVar3 = uVar3 * 2;
    iVar2 = iVar2 + -1;
  } while (iVar2 != 0);
  pfVar1 = (float *)FUN_00412cde(local_14,*(uint *)(param_4 + 2));
  FUN_00415f7a(param_1,pfVar1);
  thunk_FUN_00415a34(local_70);
  return;
}


// ==== FUN_00412cde @ 00412cde ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00412cde(void *this,uint param_1)

{
  float fVar1;
  
  fVar1 = _DAT_00418298;
  *(float *)this = (float)(param_1 >> 0x18) * _DAT_00418298;
  *(float *)((int)this + 4) = (float)(param_1 >> 0x10 & 0xff) * fVar1;
  *(float *)((int)this + 8) = (float)(param_1 >> 8 & 0xff) * fVar1;
  *(float *)((int)this + 0xc) = (float)(param_1 & 0xff) * fVar1;
  return;
}


// ==== FUN_00412d4b @ 00412d4b ====

void __thiscall FUN_00412d4b(void *this,undefined1 param_1)

{
  *(undefined1 *)((int)this + 4) = param_1;
  return;
}


// ==== FUN_00412d55 @ 00412d55 ====

void FUN_00412d55(float *param_1,int *param_2)

{
  float *pfVar1;
  float *pfVar2;
  ushort uVar3;
  short sVar4;
  CRect *pCVar5;
  float10 fVar6;
  CRect local_2c [16];
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  int local_c;
  float local_8;
  
  pfVar2 = param_1;
  uVar3 = FUN_00412c4f((int)param_2);
  local_14 = (float)uVar3;
  uVar3 = FUN_00412c4f((int)param_1);
  local_18 = local_14 / (float)uVar3;
  uVar3 = FUN_00412c54((int)param_2);
  local_14 = (float)uVar3;
  uVar3 = FUN_00412c54((int)param_1);
  pfVar1 = (float *)*param_1;
  local_1c = local_14 / (float)uVar3;
  local_14 = 0.0;
  local_10 = 0.0;
  sVar4 = FUN_00412c54((int)param_1);
  param_1 = pfVar1;
  if (sVar4 != 0) {
    do {
      local_c = 0;
      local_8 = 0.0;
      sVar4 = FUN_00412c4f((int)pfVar2);
      if (sVar4 != 0) {
        do {
          fVar6 = FUN_00412abd(param_2,local_8,local_10);
          pCVar5 = FUN_00412e56(local_2c,param_1,(float)fVar6);
          pfVar1 = param_1 + 4;
          *param_1 = *(float *)pCVar5;
          local_8 = local_8 + local_18;
          param_1[1] = *(float *)(pCVar5 + 4);
          local_c = local_c + 1;
          param_1[2] = *(float *)(pCVar5 + 8);
          param_1[3] = *(float *)(pCVar5 + 0xc);
          uVar3 = FUN_00412c4f((int)pfVar2);
          param_1 = pfVar1;
        } while (local_c < (int)(uint)uVar3);
      }
      local_10 = local_10 + local_1c;
      local_14 = (float)((int)local_14 + 1);
      uVar3 = FUN_00412c54((int)pfVar2);
    } while ((int)local_14 < (int)(uint)uVar3);
  }
  return;
}


// ==== FUN_00412e56 @ 00412e56 ====

CRect * FUN_00412e56(CRect *param_1,float *param_2,float param_3)

{
  CRect::CRect(param_1,(int)(param_3 + *param_2),(int)(param_3 + param_2[1]),
               (int)(param_3 + param_2[2]),(int)(param_3 + param_2[3]));
  return param_1;
}


// ==== CRect @ 00412e92 ====

/* Library Function - Single Match
    public: __thiscall CRect::CRect(int,int,int,int)
   
   Libraries: Visual Studio 2003 Release, Visual Studio 2005 Release */

void __thiscall CRect::CRect(CRect *this,int param_1,int param_2,int param_3,int param_4)

{
  *(int *)this = param_1;
  *(int *)(this + 4) = param_2;
  *(int *)(this + 8) = param_3;
  *(int *)(this + 0xc) = param_4;
  return;
}


// ==== FUN_00412eb2 @ 00412eb2 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00412eb2(undefined4 *param_1)

{
  undefined4 *puVar1;
  short sVar2;
  ushort uVar3;
  uint uVar4;
  int iVar5;
  void *this;
  
  puVar1 = param_1;
  param_1 = (undefined4 *)0x0;
  this = (void *)*puVar1;
  sVar2 = FUN_00412c54((int)puVar1);
  if (sVar2 != 0) {
    do {
      iVar5 = 0;
      sVar2 = FUN_00412c4f((int)puVar1);
      if (sVar2 != 0) {
        do {
          uVar4 = FUN_00404258();
          FUN_00412f23(this,(float)(int)uVar4 * _DAT_00419020);
          this = (void *)((int)this + 0x10);
          iVar5 = iVar5 + 1;
          uVar3 = FUN_00412c4f((int)puVar1);
        } while (iVar5 < (int)(uint)uVar3);
      }
      param_1 = (undefined4 *)((int)param_1 + 1);
      uVar3 = FUN_00412c54((int)puVar1);
    } while ((int)param_1 < (int)(uint)uVar3);
  }
  return;
}


// ==== FUN_00412f23 @ 00412f23 ====

void __thiscall FUN_00412f23(void *this,undefined4 param_1)

{
  *(undefined4 *)((int)this + 0xc) = param_1;
  *(undefined4 *)((int)this + 8) = param_1;
  *(undefined4 *)((int)this + 4) = param_1;
  *(undefined4 *)this = param_1;
  return;
}


// ==== FUN_00412f5c @ 00412f5c ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00412f5c(int *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  float fVar1;
  int *piVar2;
  ushort uVar3;
  short sVar4;
  ushort uVar5;
  int iVar6;
  int *piVar7;
  undefined4 *puVar8;
  longlong lVar9;
  undefined4 local_30;
  undefined4 uStack_2c;
  undefined4 uStack_28;
  undefined4 uStack_24;
  float local_20;
  float local_1c;
  float local_18;
  int local_14;
  uint local_10;
  float local_c;
  float local_8;
  
  piVar2 = param_1;
  local_10 = (uint)*param_4;
  FUN_00412cde(&local_30,*(uint *)(param_4 + 4));
  local_c = (float)(uint)param_4[1];
  uVar3 = FUN_00412c4f((int)param_1);
  local_20 = (float)uVar3;
  local_1c = local_20 / (float)(int)local_c;
  local_8 = 0.0;
  if (0.0 < local_20) {
    do {
      param_1 = (int *)0x0;
      sVar4 = FUN_00412c54((int)piVar2);
      if (sVar4 != 0) {
        local_14 = (int)local_10 >> 1;
        local_18 = (float)-local_14;
        local_c = (float)local_14;
        fVar1 = local_18;
        do {
          while (fVar1 < local_c) {
            lVar9 = FUN_00404224();
            for (iVar6 = (int)lVar9; iVar6 < 0; iVar6 = iVar6 + (uint)uVar3) {
              uVar3 = FUN_00412c4f((int)piVar2);
            }
            uVar3 = FUN_00412c4f((int)piVar2);
            local_14 = iVar6 % (int)(uint)uVar3;
            for (piVar7 = param_1; (int)piVar7 < 0; piVar7 = (int *)((int)piVar7 + (uint)uVar3)) {
              uVar3 = FUN_00412c54((int)piVar2);
            }
            uVar3 = FUN_00412c54((int)piVar2);
            uVar5 = FUN_00412c4f((int)piVar2);
            iVar6 = (uint)uVar5 * ((int)piVar7 % (int)(uint)uVar3) + local_14;
            if (iVar6 < 0) {
              iVar6 = 0;
            }
            puVar8 = (undefined4 *)(iVar6 * 0x10 + *piVar2);
            *puVar8 = local_30;
            fVar1 = fVar1 + _DAT_004170c4;
            puVar8[1] = uStack_2c;
            puVar8[2] = uStack_28;
            puVar8[3] = uStack_24;
          }
          param_1 = (int *)((int)param_1 + 1);
          uVar3 = FUN_00412c54((int)piVar2);
          fVar1 = local_18;
        } while ((int)param_1 < (int)(uint)uVar3);
      }
      local_8 = local_8 + local_1c;
    } while (local_8 < local_20);
  }
  return;
}


// ==== FUN_004130b0 @ 004130b0 ====

void FUN_004130b0(int *param_1)

{
  float *pfVar1;
  ushort uVar2;
  ushort uVar3;
  int iVar4;
  int iVar5;
  
  uVar2 = FUN_00412c54((int)param_1);
  uVar3 = FUN_00412c4f((int)param_1);
  iVar5 = (uint)uVar2 * (uint)uVar3;
  if (0 < iVar5) {
    iVar4 = 0;
    do {
      *(float *)(*param_1 + iVar4) = 1.0 - *(float *)(*param_1 + iVar4);
      pfVar1 = (float *)(*param_1 + 4 + iVar4);
      *pfVar1 = 1.0 - *pfVar1;
      pfVar1 = (float *)(*param_1 + 8 + iVar4);
      *pfVar1 = 1.0 - *pfVar1;
      pfVar1 = (float *)(*param_1 + 0xc + iVar4);
      iVar4 = iVar4 + 0x10;
      iVar5 = iVar5 + -1;
      *pfVar1 = 1.0 - *pfVar1;
    } while (iVar5 != 0);
  }
  return;
}


// ==== FUN_0041310c @ 0041310c ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0041310c(undefined4 *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  ushort uVar1;
  CRect *pCVar2;
  undefined4 *this;
  float10 fVar3;
  CRect local_4c [16];
  float local_3c [4];
  float local_2c;
  float local_28;
  float local_24;
  byte *local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  local_10 = (float)param_4[1] * _DAT_00418298;
  local_14 = (float)*param_4 * _DAT_00419030;
  FUN_00412cde(local_3c,*(uint *)(param_4 + 4));
  this = (undefined4 *)*param_1;
  uVar1 = FUN_00412c4f((int)param_1);
  local_c = (float)uVar1 * _DAT_004170d4;
  uVar1 = FUN_00412c54((int)param_1);
  local_8 = (float)uVar1 * _DAT_004170d4;
  param_1 = (undefined4 *)-local_c;
  if ((float)param_1 < local_c) {
    local_20 = (byte *)-local_8;
    do {
      param_4 = local_20;
      if ((float)local_20 < local_8) {
        local_28 = ((float)param_1 * local_14) / local_c;
        local_24 = local_10 * (float)_DAT_00419028;
        local_28 = local_28 * local_28;
        local_2c = local_10 * local_10 + local_10 * local_10;
        do {
          local_18 = ((float)param_4 * local_14) / local_8;
          fVar3 = FUN_00404213(local_24);
          local_1c = (float)fVar3;
          fVar3 = (float10)FUN_00404191(-((local_18 * local_18 + local_28) / local_2c));
          pCVar2 = FUN_004132f4(local_4c,local_3c,
                                (float)(((float10)_DAT_004170c4 /
                                        ((float10)local_1c * (float10)local_1c)) * fVar3));
          *this = *(undefined4 *)pCVar2;
          this[1] = *(undefined4 *)(pCVar2 + 4);
          this[2] = *(undefined4 *)(pCVar2 + 8);
          this[3] = *(undefined4 *)(pCVar2 + 0xc);
          FUN_0041327d(this,0.0,1.0);
          param_4 = (byte *)((float)param_4 + _DAT_004170c4);
          this = this + 4;
        } while ((float)param_4 < local_8);
      }
      param_1 = (undefined4 *)((float)param_1 + _DAT_004170c4);
    } while ((float)param_1 < local_c);
  }
  return;
}


// ==== FUN_0041327d @ 0041327d ====

void __thiscall FUN_0041327d(void *this,float param_1,float param_2)

{
  if (param_2 < *(float *)this) {
    *(float *)this = param_2;
  }
  if (*(float *)this < param_1) {
    *(float *)this = param_1;
  }
  if (param_2 < *(float *)((int)this + 4)) {
    *(float *)((int)this + 4) = param_2;
  }
  if (*(float *)((int)this + 4) < param_1) {
    *(float *)((int)this + 4) = param_1;
  }
  if (param_2 < *(float *)((int)this + 8)) {
    *(float *)((int)this + 8) = param_2;
  }
  if (*(float *)((int)this + 8) < param_1) {
    *(float *)((int)this + 8) = param_1;
  }
  if (param_2 < *(float *)((int)this + 0xc)) {
    *(float *)((int)this + 0xc) = param_2;
  }
  if (*(float *)((int)this + 0xc) < param_1) {
    *(float *)((int)this + 0xc) = param_1;
  }
  return;
}


// ==== FUN_004132f4 @ 004132f4 ====

CRect * FUN_004132f4(CRect *param_1,float *param_2,float param_3)

{
  CRect::CRect(param_1,(int)(param_3 * *param_2),(int)(param_3 * param_2[1]),
               (int)(param_3 * param_2[2]),(int)(param_3 * param_2[3]));
  return param_1;
}


// ==== FUN_00413330 @ 00413330 ====

void FUN_00413330(int *param_1,undefined4 param_2,undefined4 param_3,uint *param_4)

{
  undefined4 *puVar1;
  ushort uVar2;
  ushort uVar3;
  undefined4 *puVar4;
  int iVar5;
  undefined4 local_14;
  undefined4 uStack_10;
  undefined4 uStack_c;
  undefined4 uStack_8;
  
  FUN_00412cde(&local_14,*param_4);
  puVar4 = (undefined4 *)*param_1;
  uVar2 = FUN_00412c54((int)param_1);
  uVar3 = FUN_00412c4f((int)param_1);
  iVar5 = (uint)uVar2 * (uint)uVar3;
  if (0 < iVar5) {
    do {
      *puVar4 = local_14;
      puVar4[1] = uStack_10;
      puVar1 = puVar4 + 3;
      puVar4[2] = uStack_c;
      puVar4 = puVar4 + 4;
      iVar5 = iVar5 + -1;
      *puVar1 = uStack_8;
    } while (iVar5 != 0);
  }
  return;
}


// ==== FUN_0041337e @ 0041337e ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0041337e(undefined4 *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  float *pfVar1;
  float fVar2;
  ushort uVar3;
  ushort uVar4;
  uint uVar5;
  CRect *pCVar6;
  float *pfVar7;
  float10 fVar8;
  CRect local_28 [16];
  CRect local_18 [16];
  float local_8;
  
  local_8 = (float)*param_4 * _DAT_00418298;
  FUN_0040424e((uint)param_4[1]);
  pfVar7 = (float *)*param_1;
  CRect::CRect(local_18,0x3f800000,0,0,0);
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  param_4 = (byte *)((uint)uVar3 * (uint)uVar4);
  if (0 < (int)param_4) {
    do {
      uVar5 = FUN_00404258();
      fVar2 = (float)(int)uVar5 * _DAT_004170d0;
      fVar8 = FUN_00404213(local_8);
      FUN_00412f23(local_18,(float)(fVar8 * (float10)fVar2));
      pCVar6 = FUN_0041343b(local_28,pfVar7,(float *)local_18);
      *pfVar7 = *(float *)pCVar6;
      pfVar7[1] = *(float *)(pCVar6 + 4);
      pfVar1 = pfVar7 + 3;
      pfVar7[2] = *(float *)(pCVar6 + 8);
      pfVar7 = pfVar7 + 4;
      param_4 = param_4 + -1;
      *pfVar1 = *(float *)(pCVar6 + 0xc);
    } while (param_4 != (byte *)0x0);
  }
  return;
}


// ==== FUN_0041343b @ 0041343b ====

CRect * FUN_0041343b(CRect *param_1,float *param_2,float *param_3)

{
  CRect::CRect(param_1,(int)(*param_2 + *param_3),(int)(param_2[1] + param_3[1]),
               (int)(param_2[2] + param_3[2]),(int)(param_2[3] + param_3[3]));
  return param_1;
}


// ==== FUN_00413479 @ 00413479 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00413479(void)

{
  code *pcVar1;
  int iVar2;
  longlong lVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  undefined4 uVar7;
  undefined4 uVar8;
  undefined4 uVar9;
  int iVar10;
  
  lVar3 = FUN_00404224();
  pcVar1 = DAT_00417008;
  (*DAT_00417008)((int)lVar3,0,0,0,100,0,0,0,0,0,0,4,0,s_times_new_roman_0041aa6c);
  iVar10 = 4;
  uVar9 = 0;
  uVar8 = 700;
  uVar7 = 0;
  (*pcVar1)((int)lVar3,0,0,0,700,0,0,0,0,0,0,4,0,s_times_new_roman_0041aa6c);
  FUN_00404282((undefined4 *)&DAT_00478a08,0,0x28);
  _DAT_00478a0c = uVar9;
  _DAT_00478a08 = 0x28;
  _DAT_00478a14 = 1;
  _DAT_00478a16 = 0x20;
  _DAT_00478a18 = 0;
  _DAT_00478a10 = iVar10;
  uVar9 = (*DAT_00417080)(0);
  iVar2 = (*DAT_0041700c)(uVar9);
  (*DAT_00417010)(iVar2,uVar7);
  uVar7 = 1;
  iVar4 = iVar2;
  (*DAT_00417014)(iVar2,1);
  iVar5 = iVar10;
  uVar9 = (*DAT_00417080)(0,uVar8,iVar10);
  uVar9 = (*DAT_00417020)(uVar9);
  (*DAT_00417010)(iVar2,uVar9);
  (*DAT_0041702c)(iVar2,0xffffff);
  (*DAT_00417024)(iVar2,0);
  DAT_00478a00 = 0;
  if (0 < iVar10) {
    do {
      (*DAT_00417028)(iVar2,uVar7,(iVar10 - DAT_00478a00) + -1,1,iVar5 + DAT_00478a00 * iVar4 * 4,
                      &DAT_00478a08,0);
      DAT_00478a00 = DAT_00478a00 + 1;
    } while (DAT_00478a00 < iVar10);
  }
  iVar6 = iVar2;
  (*DAT_00417000)(iVar2,0,0,s_a_b_c_d_e_f_g_h_i_j_k_l_m_n_o_p_q_0041aa1c,0x4f);
  pcVar1 = DAT_00417000;
  uVar9 = 0x3f;
  iVar4 = iVar2;
  (*DAT_00417000)(iVar2,0,iVar10 / 4,s_A_B_C_D_E_F_G_H_I_J_K_L_M_N_O_P_Q_0041a9dc,0x3f);
  iVar5 = iVar2;
  (*DAT_00417010)(iVar2,iVar6);
  (*pcVar1)(iVar2,0,uVar9,s_a_b_c_d_e_f_g_h_i_j_k_l_m_n_o_p_q_0041aa1c);
  (*pcVar1)(iVar2,0,iVar4,s_A_B_C_D_E_F_G_H_I_J_K_L_M_N_O_P_Q_0041a9dc,0x3f);
  DAT_00478a00 = 0;
  if (0 < iVar10) {
    do {
      (*DAT_00417004)(iVar2,iVar6,(iVar10 - DAT_00478a00) + -1,1,DAT_00478a00 * iVar5 * 4 + 0x4f,
                      &DAT_00478a08,0);
      DAT_00478a00 = DAT_00478a00 + 1;
    } while (DAT_00478a00 < iVar10);
  }
  DAT_00478a00 = 0;
  if (0 < iVar5 * iVar10) {
    do {
      *(undefined1 *)(DAT_00478a00 * 4 + 0x52) = 0xff;
      DAT_00478a00 = DAT_00478a00 + 1;
    } while (DAT_00478a00 < iVar5 * iVar10);
  }
  pcVar1 = DAT_0041701c;
  (*DAT_0041701c)(iVar6);
  (*DAT_00417018)(iVar2);
  (*pcVar1)(iVar4);
  return;
}


// ==== FUN_004136a2 @ 004136a2 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004136a2(int *param_1)

{
  uint uVar1;
  float fVar2;
  ushort uVar3;
  ushort uVar4;
  uint *puVar5;
  float *pfVar6;
  int iVar7;
  uint *puVar8;
  int iVar9;
  
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  iVar9 = (uint)uVar3 * (uint)uVar4;
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  puVar5 = (uint *)FUN_004042e0((uint)uVar3 * (uint)uVar4 * 4);
  iVar7 = iVar9;
  puVar8 = puVar5;
  if (0 < iVar9) {
    for (; iVar7 != 0; iVar7 = iVar7 + -1) {
      *puVar8 = 0;
      puVar8 = puVar8 + 1;
    }
  }
  FUN_00415f44(param_1,(int *)puVar5);
  FUN_00412c54((int)param_1);
  FUN_00412c4f((int)param_1);
  FUN_00413479();
  fVar2 = _DAT_00418298;
  if (0 < iVar9) {
    pfVar6 = (float *)(*param_1 + 8);
    puVar8 = puVar5;
    do {
      pfVar6[-1] = (float)(*puVar8 >> 0x10 & 0xff) * fVar2;
      *pfVar6 = (float)(*puVar8 >> 8 & 0xff) * fVar2;
      uVar1 = *puVar8;
      puVar8 = puVar8 + 1;
      iVar9 = iVar9 + -1;
      pfVar6[1] = (float)(uVar1 & 0xff) * fVar2;
      pfVar6 = pfVar6 + 4;
    } while (iVar9 != 0);
  }
  FUN_004042eb((int)puVar5);
  return;
}


// ==== FUN_0041378d @ 0041378d ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0041378d(undefined4 *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  float fVar1;
  ushort uVar2;
  ushort uVar3;
  uint uVar4;
  uint uVar5;
  undefined4 *puVar6;
  undefined4 *puVar7;
  float *pfVar8;
  undefined4 uVar9;
  void *this;
  int iVar10;
  int iVar11;
  undefined4 local_c;
  
  uVar4 = (uint)*param_4;
  uVar5 = uVar4 & 3;
  iVar11 = (int)(uVar4 & 0xf) >> 2;
  uVar2 = FUN_00412c54((int)param_1);
  uVar3 = FUN_00412c4f((int)param_1);
  local_c = (uint)uVar2 * (uint)uVar3;
  this = (void *)*param_1;
  if (0 < local_c) {
    do {
      iVar10 = 0;
      if ((int)uVar4 >> 4 == 0) {
        puVar6 = (undefined4 *)FUN_00413892(this,iVar11);
        uVar9 = *puVar6;
        puVar6 = (undefined4 *)FUN_00413892(this,uVar5);
        puVar7 = (undefined4 *)FUN_00413892(this,iVar11);
        *puVar7 = *puVar6;
        puVar6 = (undefined4 *)FUN_00413892(this,uVar5);
LAB_00413812:
        *puVar6 = uVar9;
      }
      else {
        if ((int)uVar4 >> 4 == 1) {
          puVar7 = (undefined4 *)FUN_00413892(this,iVar11);
          puVar6 = (undefined4 *)FUN_00413892(this,uVar5);
          uVar9 = *puVar7;
          goto LAB_00413812;
        }
        param_1 = (undefined4 *)0x0;
        do {
          if (iVar10 != iVar11) {
            pfVar8 = (float *)FUN_00413892(this,iVar10);
            param_1 = (undefined4 *)((float)param_1 + *pfVar8);
          }
          iVar10 = iVar10 + 1;
        } while (iVar10 < 4);
        fVar1 = (float)param_1 * _DAT_00418f78;
        pfVar8 = (float *)FUN_00413892(this,iVar11);
        *pfVar8 = fVar1;
        FUN_0041327d(this,0.0,1.0);
      }
      this = (void *)((int)this + 0x10);
      local_c = local_c + -1;
    } while (local_c != 0);
  }
  return;
}


// ==== FUN_00413892 @ 00413892 ====

int __thiscall FUN_00413892(void *this,int param_1)

{
  if (param_1 != 0) {
    if (param_1 == 1) {
      this = (void *)((int)this + 4);
    }
    else if (param_1 == 2) {
      this = (void *)((int)this + 8);
    }
    else if (param_1 == 3) {
      this = (void *)((int)this + 0xc);
    }
  }
  return (int)this;
}


// ==== FUN_004138bb @ 004138bb ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_004138bb(float param_1,float param_2)

{
  float10 fVar1;
  
  if (_DAT_004170d4 <= param_1) {
    fVar1 = (float10)param_1 + (float10)param_2;
  }
  else {
    fVar1 = (float10)param_1 - (float10)param_2;
  }
  if ((float10)_DAT_004170c4 < fVar1) {
    fVar1 = (float10)1;
  }
  if (fVar1 < (float10)_DAT_004170c8) {
    fVar1 = (float10)0;
  }
  return fVar1;
}


// ==== FUN_004138f9 @ 004138f9 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004138f9(undefined4 *param_1,undefined4 param_2,undefined4 param_3,ushort *param_4)

{
  float fVar1;
  ushort uVar2;
  ushort uVar3;
  CRect *pCVar4;
  float *pfVar5;
  float10 fVar6;
  CRect local_28 [16];
  float local_18 [4];
  float local_8;
  
  local_8 = (float)*param_4 * _DAT_00418298 - _DAT_004170c4;
  fVar1 = (float)(byte)param_4[1] * _DAT_00418298 - _DAT_004170d4;
  FUN_004139eb(local_18);
  FUN_00412f23(local_18,local_8);
  pfVar5 = (float *)*param_1;
  uVar2 = FUN_00412c54((int)param_1);
  uVar3 = FUN_00412c4f((int)param_1);
  param_1 = (undefined4 *)((uint)uVar2 * (uint)uVar3);
  if (0 < (int)param_1) {
    do {
      pCVar4 = FUN_0041343b(local_28,pfVar5,local_18);
      *pfVar5 = *(float *)pCVar4;
      pfVar5[1] = *(float *)(pCVar4 + 4);
      pfVar5[2] = *(float *)(pCVar4 + 8);
      pfVar5[3] = *(float *)(pCVar4 + 0xc);
      fVar6 = FUN_004138bb(*pfVar5,fVar1);
      *pfVar5 = (float)fVar6;
      fVar6 = FUN_004138bb(pfVar5[1],fVar1);
      pfVar5[1] = (float)fVar6;
      fVar6 = FUN_004138bb(pfVar5[2],fVar1);
      pfVar5[2] = (float)fVar6;
      fVar6 = FUN_004138bb(pfVar5[3],fVar1);
      pfVar5[3] = (float)fVar6;
      pfVar5 = pfVar5 + 4;
      param_1 = (undefined4 *)((int)param_1 + -1);
    } while (param_1 != (undefined4 *)0x0);
  }
  return;
}


// ==== FUN_004139eb @ 004139eb ====

void __fastcall FUN_004139eb(undefined4 *param_1)

{
  *param_1 = 0x3f800000;
  param_1[3] = 0;
  param_1[2] = 0;
  param_1[1] = 0;
  return;
}


// ==== FUN_00413a01 @ 00413a01 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

CRect * FUN_00413a01(CRect *param_1,int *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  
  fVar3 = (float)param_2[1];
  fVar1 = (float)param_2[1];
  fVar4 = (float)param_2[2];
  fVar5 = (float)param_2[3];
  if (fVar1 < (float)param_2[2]) {
    fVar1 = (float)param_2[2];
  }
  if (fVar1 < (float)param_2[3]) {
    fVar1 = (float)param_2[3];
  }
  fVar2 = (float)param_2[1];
  if ((float)param_2[2] < fVar2) {
    fVar2 = (float)param_2[2];
  }
  if ((float)param_2[3] < fVar2) {
    fVar2 = (float)param_2[3];
  }
  if (fVar1 == _DAT_004170c8) {
    fVar6 = 0.0;
  }
  else {
    fVar6 = (fVar1 - fVar2) / fVar1;
  }
  fVar7 = _DAT_00418e88;
  if (fVar6 != _DAT_004170c8) {
    fVar2 = fVar1 - fVar2;
    if (fVar3 == fVar1) {
      fVar5 = (fVar4 - fVar5) / fVar2;
    }
    else if (fVar4 == fVar1) {
      fVar5 = (fVar5 - fVar3) / fVar2 + _DAT_00418200;
    }
    else if (fVar5 == fVar1) {
      fVar5 = (fVar3 - fVar4) / fVar2 + _DAT_00418230;
    }
    fVar7 = fVar5 * _DAT_0041903c;
    if (fVar7 < _DAT_004170c8) {
      fVar7 = fVar7 + _DAT_00419038;
    }
  }
  CRect::CRect(param_1,*param_2,(int)fVar7,(int)fVar6,(int)fVar1);
  return param_1;
}


// ==== FUN_00413b24 @ 00413b24 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

CRect * FUN_00413b24(CRect *param_1,int *param_2)

{
  float fVar1;
  CRect *pCVar2;
  CRect *pCVar3;
  CRect *pCVar4;
  CRect *pCVar5;
  CRect *pCVar6;
  int iVar7;
  longlong lVar8;
  CRect *pCVar9;
  CRect *pCVar10;
  CRect *pCVar11;
  CRect *local_8;
  
  fVar1 = (float)param_2[1];
  pCVar2 = (CRect *)param_2[2];
  pCVar3 = (CRect *)param_2[3];
  pCVar9 = pCVar3;
  if ((float)pCVar2 == _DAT_004170c8) {
    pCVar10 = pCVar3;
    pCVar11 = pCVar3;
    if (fVar1 != _DAT_00418e88) {
      pCVar11 = (CRect *)0x0;
      pCVar10 = (CRect *)0x0;
      pCVar9 = (CRect *)0x0;
      iVar7 = 0;
      goto LAB_00413c62;
    }
  }
  else {
    if (fVar1 == _DAT_00419038) {
      fVar1 = 0.0;
    }
    fVar1 = fVar1 * _DAT_00419040;
    FUN_004041ab(fVar1);
    lVar8 = FUN_00404224();
    iVar7 = (int)lVar8;
    fVar1 = fVar1 - (float)iVar7;
    pCVar4 = (CRect *)((1.0 - (float)pCVar2) * (float)pCVar3);
    pCVar5 = (CRect *)((_DAT_004170c4 - fVar1 * (float)pCVar2) * (float)pCVar3);
    pCVar6 = (CRect *)((_DAT_004170c4 - (1.0 - fVar1) * (float)pCVar2) * (float)pCVar3);
    pCVar10 = pCVar6;
    pCVar11 = pCVar4;
    if ((((iVar7 != 0) && (pCVar9 = pCVar5, pCVar10 = pCVar3, iVar7 != 1)) &&
        (pCVar9 = pCVar4, pCVar11 = pCVar6, iVar7 != 2)) &&
       (((pCVar10 = pCVar5, pCVar11 = pCVar3, iVar7 != 3 &&
         (pCVar9 = pCVar6, pCVar10 = pCVar4, iVar7 != 4)) &&
        (pCVar9 = pCVar2, pCVar10 = local_8, pCVar11 = param_1, iVar7 == 5)))) {
      pCVar9 = pCVar3;
      pCVar10 = pCVar4;
      pCVar11 = pCVar5;
    }
  }
  iVar7 = *param_2;
LAB_00413c62:
  CRect::CRect(param_1,iVar7,(int)pCVar9,(int)pCVar10,(int)pCVar11);
  return param_1;
}


// ==== FUN_00413c76 @ 00413c76 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00413c76(undefined4 *param_1,undefined4 param_2,undefined4 param_3,ushort *param_4)

{
  int *piVar1;
  float fVar2;
  ushort uVar3;
  ushort uVar4;
  CRect *pCVar5;
  int *piVar6;
  float10 fVar7;
  CRect local_40 [16];
  CRect local_30 [16];
  int local_20;
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  local_8 = (float)*param_4;
  fVar2 = (float)(byte)param_4[1] * _DAT_00418298;
  local_c = (fVar2 + fVar2) - _DAT_004170c4;
  fVar2 = (float)*(byte *)((int)param_4 + 3) * _DAT_00418298;
  local_10 = (fVar2 + fVar2) - _DAT_004170c4;
  FUN_004139eb(&local_20);
  piVar6 = (int *)*param_1;
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  param_4 = (ushort *)((uint)uVar3 * (uint)uVar4);
  if (0 < (int)param_4) {
    do {
      pCVar5 = FUN_00413a01(local_30,piVar6);
      local_20 = *(int *)pCVar5;
      local_1c = *(float *)(pCVar5 + 4);
      local_18 = *(float *)(pCVar5 + 8);
      local_14 = *(float *)(pCVar5 + 0xc);
      if (local_1c != _DAT_00418e88) {
        local_1c = local_1c + local_8;
        fVar7 = FUN_00404153(local_1c,_DAT_00419038);
        local_1c = (float)fVar7;
        local_18 = local_18 + local_c;
        if (local_18 < _DAT_004170c8) {
          local_18 = 0.0;
        }
        if (_DAT_004170c4 < local_18) {
          local_18 = 1.0;
        }
      }
      local_14 = local_14 + local_10;
      if (local_14 < _DAT_004170c8) {
        local_14 = 0.0;
      }
      if (_DAT_004170c4 < local_14) {
        local_14 = 1.0;
      }
      pCVar5 = FUN_00413b24(local_40,&local_20);
      *piVar6 = *(int *)pCVar5;
      piVar6[1] = *(int *)(pCVar5 + 4);
      piVar1 = piVar6 + 3;
      piVar6[2] = *(int *)(pCVar5 + 8);
      piVar6 = piVar6 + 4;
      param_4 = (ushort *)((int)param_4 + -1);
      *piVar1 = *(int *)(pCVar5 + 0xc);
    } while (param_4 != (ushort *)0x0);
  }
  return;
}


// ==== FUN_00413db6 @ 00413db6 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00413db6(int *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  int *piVar1;
  undefined1 uVar2;
  ushort uVar3;
  short sVar4;
  void *this;
  undefined4 *puVar5;
  int local_28 [4];
  float local_18;
  float local_14;
  float local_10;
  undefined4 *local_c;
  int local_8;
  
  piVar1 = param_1;
  uVar3 = FUN_00412c4f((int)param_1);
  local_18 = (float)*param_4 * _DAT_00418298 * (float)uVar3;
  uVar3 = FUN_00412c54((int)param_1);
  local_10 = (float)param_4[1] * _DAT_00418298 * (float)uVar3;
  this = (void *)FUN_004042e0(0x5c);
  if (this == (void *)0x0) {
    param_1 = (int *)0x0;
  }
  else {
    param_1 = FUN_00415944(this,param_1);
  }
  FUN_00415d61(param_1,piVar1);
  uVar2 = FUN_00413ed5((int)piVar1);
  FUN_00412d4b(param_1,uVar2);
  local_c = (undefined4 *)*piVar1;
  local_8 = 0;
  sVar4 = FUN_00412c4f((int)piVar1);
  if (sVar4 != 0) {
    do {
      param_4 = (byte *)0x0;
      sVar4 = FUN_00412c4f((int)piVar1);
      if (sVar4 != 0) {
        local_14 = (float)local_8 + local_10;
        do {
          puVar5 = (undefined4 *)
                   FUN_00415a71(param_1,local_28,(float)(int)param_4 + local_18,local_14);
          *local_c = *puVar5;
          local_c[1] = puVar5[1];
          param_4 = param_4 + 1;
          local_c[2] = puVar5[2];
          local_c[3] = puVar5[3];
          local_c = local_c + 4;
          uVar3 = FUN_00412c4f((int)piVar1);
        } while ((int)param_4 < (int)(uint)uVar3);
      }
      local_8 = local_8 + 1;
      uVar3 = FUN_00412c4f((int)piVar1);
    } while (local_8 < (int)(uint)uVar3);
  }
  if (param_1 != (int *)0x0) {
    FUN_00412220(param_1,1);
  }
  return;
}


// ==== FUN_00413ed5 @ 00413ed5 ====

undefined1 __fastcall FUN_00413ed5(int param_1)

{
  return *(undefined1 *)(param_1 + 4);
}


// ==== FUN_00413ed9 @ 00413ed9 ====

void FUN_00413ed9(void *param_1,int param_2,char param_3)

{
  uint uVar1;
  byte bVar2;
  ushort uVar3;
  ushort uVar4;
  float *pfVar5;
  CRect *pCVar6;
  int iVar7;
  undefined4 *puVar8;
  int local_11c [4];
  CRect local_10c [16];
  CRect local_fc [16];
  int local_ec [4];
  int local_dc [4];
  CRect local_cc [16];
  CRect local_bc [16];
  int local_ac [23];
  float local_50;
  undefined4 uStack_4c;
  undefined4 uStack_48;
  undefined4 uStack_44;
  float local_40;
  float local_3c;
  uint local_38;
  float local_34;
  float local_30;
  float local_2c;
  uint local_28;
  float local_24;
  uint local_20;
  float local_1c;
  float local_18;
  uint local_14;
  uint local_10;
  int local_c;
  int local_8;
  
  bVar2 = FUN_00413ed5((int)param_1);
  local_38 = (uint)bVar2;
  FUN_00415906(local_ac);
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  FUN_004159e4(local_ac,uVar4,uVar3);
  FUN_00412d4b(local_ac,0);
  FUN_00412d4b(param_1,0);
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  local_2c = (float)param_2;
  local_34 = 1.0 / local_2c;
  local_28 = (uint)uVar4;
  local_24 = (float)(param_3 == '\0');
  local_30 = (float)(param_3 != '\0');
  local_14 = (uint)uVar3;
  local_20 = local_28;
  if (param_3 != '\0') {
    local_14 = local_28;
    local_20 = (uint)uVar3;
  }
  local_8 = 0;
  local_c = 0;
  uVar1 = (uint)(param_3 != '\0');
  if (local_14 != 0) {
    do {
      CRect::CRect((CRect *)&local_50,0,0,0,0);
      local_10 = 0;
      if (0 < param_2) {
        local_1c = (float)local_c;
        local_18 = (float)local_8;
        do {
          pfVar5 = (float *)FUN_00415a71(param_1,local_11c,
                                         (float)(int)local_10 * local_24 + local_18,
                                         (float)(int)local_10 * local_30 + local_1c);
          pCVar6 = FUN_0041343b(local_bc,&local_50,pfVar5);
          local_50 = *(float *)pCVar6;
          local_10 = local_10 + 1;
          uStack_4c = *(undefined4 *)(pCVar6 + 4);
          uStack_48 = *(undefined4 *)(pCVar6 + 8);
          uStack_44 = *(undefined4 *)(pCVar6 + 0xc);
        } while ((int)local_10 < param_2);
      }
      if (0 < (int)local_20) {
        local_40 = local_2c * local_30;
        local_10 = local_20;
        iVar7 = local_c * local_28;
        local_3c = local_2c * local_24;
        do {
          pCVar6 = FUN_004132f4(local_10c,&local_50,local_34);
          local_1c = (float)local_c;
          puVar8 = (undefined4 *)((iVar7 + local_8) * 0x10 + local_ac[0]);
          local_18 = (float)local_8;
          *puVar8 = *(undefined4 *)pCVar6;
          puVar8[1] = *(undefined4 *)(pCVar6 + 4);
          puVar8[2] = *(undefined4 *)(pCVar6 + 8);
          puVar8[3] = *(undefined4 *)(pCVar6 + 0xc);
          pfVar5 = (float *)FUN_00415a71(param_1,local_ec,local_18,local_1c);
          pCVar6 = FUN_00414157(local_cc,&local_50,pfVar5);
          local_50 = *(float *)pCVar6;
          uStack_4c = *(undefined4 *)(pCVar6 + 4);
          uStack_48 = *(undefined4 *)(pCVar6 + 8);
          uStack_44 = *(undefined4 *)(pCVar6 + 0xc);
          pfVar5 = (float *)FUN_00415a71(param_1,local_dc,local_3c + local_18,local_40 + local_1c);
          pCVar6 = FUN_0041343b(local_fc,&local_50,pfVar5);
          local_50 = *(float *)pCVar6;
          uStack_4c = *(undefined4 *)(pCVar6 + 4);
          uStack_48 = *(undefined4 *)(pCVar6 + 8);
          uStack_44 = *(undefined4 *)(pCVar6 + 0xc);
          if (param_3 == '\0') {
            local_8 = local_8 + 1;
          }
          else {
            local_c = local_c + 1;
            iVar7 = iVar7 + local_28;
          }
          local_10 = local_10 - 1;
        } while (local_10 != 0);
        local_10 = 0;
      }
      if (param_3 == '\0') {
        local_c = local_c + 1;
        local_8 = 0;
      }
      else {
        local_8 = local_8 + 1;
        local_c = 0;
      }
      local_14 = local_14 - 1;
    } while (local_14 != 0);
    uVar1 = 0;
  }
  local_14 = uVar1;
  FUN_00415d61(param_1,local_ac);
  FUN_00412d4b(param_1,(char)local_38);
  thunk_FUN_00415a34(local_ac);
  return;
}


// ==== FUN_00414157 @ 00414157 ====

CRect * FUN_00414157(CRect *param_1,float *param_2,float *param_3)

{
  CRect::CRect(param_1,(int)(*param_2 - *param_3),(int)(param_2[1] - param_3[1]),
               (int)(param_2[2] - param_3[2]),(int)(param_2[3] - param_3[3]));
  return param_1;
}


// ==== FUN_004141b9 @ 004141b9 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004141b9(float param_1,float param_2,int *param_3)

{
  int *piVar1;
  float fVar2;
  ushort uVar3;
  short sVar4;
  void *this;
  undefined4 *this_00;
  int *piVar5;
  float10 fVar6;
  int local_2c [4];
  float local_1c;
  float local_18;
  float local_14;
  float local_10;
  float local_c;
  float local_8;
  
  this = (void *)FUN_004042e0(0x5c);
  if (this == (void *)0x0) {
    this_00 = (undefined4 *)0x0;
  }
  else {
    this_00 = FUN_00415944(this,param_3);
  }
  fVar2 = param_2 * _DAT_00419044;
  piVar1 = (int *)*param_3;
  fVar6 = FUN_004041ee(fVar2);
  local_10 = (float)(fVar6 * (float10)param_1);
  fVar6 = FUN_004041dd(fVar2);
  local_8 = (float)(fVar6 * (float10)param_1);
  uVar3 = FUN_00412c4f((int)param_3);
  local_14 = (float)(uVar3 >> 1);
  uVar3 = FUN_00412c54((int)param_3);
  param_1 = 0.0;
  local_c = (float)(uVar3 >> 1);
  sVar4 = FUN_00412c54((int)this_00);
  param_3 = piVar1;
  if (sVar4 != 0) {
    do {
      param_2 = 0.0;
      sVar4 = FUN_00412c4f((int)this_00);
      if (sVar4 != 0) {
        local_18 = ((float)(int)param_1 - local_c) * local_10;
        local_1c = ((float)(int)param_1 - local_c) * local_8;
        do {
          piVar5 = (int *)FUN_00415a71(this_00,local_2c,
                                       ((float)(int)param_2 - local_14) * local_10 + local_1c +
                                       local_14,(local_18 -
                                                ((float)(int)param_2 - local_14) * local_8) +
                                                local_c);
          *param_3 = *piVar5;
          param_3[1] = piVar5[1];
          piVar1 = param_3 + 4;
          param_2 = (float)((int)param_2 + 1);
          param_3[2] = piVar5[2];
          param_3[3] = piVar5[3];
          uVar3 = FUN_00412c4f((int)this_00);
          param_3 = piVar1;
        } while ((int)param_2 < (int)(uint)uVar3);
      }
      param_1 = (float)((int)param_1 + 1);
      uVar3 = FUN_00412c54((int)this_00);
    } while ((int)param_1 < (int)(uint)uVar3);
  }
  if (this_00 != (undefined4 *)0x0) {
    FUN_00412220(this_00,1);
  }
  return;
}


// ==== FUN_004142eb @ 004142eb ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004142eb(int *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  byte bVar1;
  
  bVar1 = *param_4;
  FUN_004141b9(_DAT_00418200,(float)param_4[1] * _DAT_00418298 * _DAT_00419038,param_1);
  FUN_00413ed9(param_1,(uint)bVar1,'\0');
  FUN_004141b9(_DAT_004170d4,(float)param_4[1] * _DAT_00418298 * _DAT_00419048,param_1);
  return;
}


// ==== FUN_0041435f @ 0041435f ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_0041435f(int *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  byte bVar1;
  float fVar2;
  float fVar3;
  byte bVar4;
  int local_7c [23];
  float *local_20 [2];
  undefined4 local_18;
  int local_c;
  int local_8;
  
  bVar1 = *param_4;
  bVar4 = bVar1 & 7;
  fVar3 = (float)(bVar1 >> 3) * _DAT_004170d4;
  FUN_00415149(local_20,3,3);
  if ((bVar4 == 3) || (bVar4 == 4)) {
    local_c = -1;
    local_8 = -1;
    if (bVar4 == 3) {
      local_c = 1;
      local_8 = 1;
    }
    local_c = -local_c;
    fVar2 = (float)local_c * fVar3;
    *local_20[0] = fVar2;
    local_20[0][3] = fVar2;
    local_20[0][6] = fVar2;
    fVar2 = (float)local_8 * fVar3;
    local_20[0][2] = fVar2;
    local_20[0][5] = fVar2;
    local_20[0][8] = fVar2;
  }
  if ((bVar1 & 7) == 0) {
    *local_20[0] = fVar3;
    local_20[0][8] = fVar3 * _DAT_004170cc;
  }
  if (bVar4 == 5) {
    local_20[0][2] = fVar3;
    local_20[0][8] = fVar3 * _DAT_004170cc;
  }
  local_18 = 0x3f000000;
  FUN_00415944(local_7c,param_1);
  FUN_00412d4b(local_7c,0);
  FUN_004151a2(local_20,local_7c,param_1);
  thunk_FUN_00415a34(local_7c);
  FUN_00415199((int *)local_20);
  return;
}


// ==== FUN_0041446a @ 0041446a ====

void FUN_0041446a(int *param_1)

{
  undefined4 *puVar1;
  undefined1 uVar2;
  ushort uVar3;
  ushort uVar4;
  undefined4 *puVar5;
  uint uVar6;
  uint uVar7;
  int local_84 [23];
  int local_28 [4];
  uint local_18;
  float local_14;
  uint local_10;
  uint local_c;
  undefined4 *local_8;
  
  FUN_00415906(local_84);
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = FUN_00412c4f((int)param_1);
  FUN_004159e4(local_84,uVar4,uVar3);
  uVar2 = FUN_00413ed5((int)param_1);
  FUN_00412d4b(local_84,uVar2);
  FUN_00415d61(local_84,param_1);
  uVar3 = FUN_00412c4f((int)local_84);
  uVar7 = (uint)uVar3;
  local_18 = uVar7;
  uVar3 = FUN_00412c54((int)local_84);
  uVar6 = (uint)uVar3;
  if (uVar7 == uVar6) {
    local_8 = (undefined4 *)*param_1;
    param_1 = (int *)0x0;
    if (uVar6 != 0) {
      do {
        if (0 < (int)uVar7) {
          local_14 = (float)(int)param_1;
          local_10 = uVar7;
          local_c = uVar6;
          do {
            puVar5 = (undefined4 *)FUN_00415a71(local_84,local_28,local_14,(float)(int)local_c);
            *local_8 = *puVar5;
            puVar1 = local_8 + 4;
            local_c = local_c - 1;
            local_8[1] = puVar5[1];
            local_10 = local_10 - 1;
            local_8[2] = puVar5[2];
            local_8[3] = puVar5[3];
            local_8 = puVar1;
          } while (local_10 != 0);
          local_10 = 0;
          uVar7 = local_18;
        }
        param_1 = (int *)((int)param_1 + 1);
      } while ((int)param_1 < (int)uVar6);
    }
  }
  thunk_FUN_00415a34(local_84);
  return;
}


// ==== FUN_00414535 @ 00414535 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00414535(int *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  byte *pbVar1;
  ushort uVar2;
  undefined4 *puVar3;
  int iVar4;
  int iVar5;
  int iVar6;
  uint uVar7;
  float *pfVar8;
  longlong lVar9;
  uint uVar10;
  undefined4 local_58 [4];
  int local_48 [3];
  int local_3c [3];
  undefined4 local_30;
  undefined4 local_2c;
  undefined4 local_28;
  undefined4 local_24;
  undefined4 local_20;
  undefined4 local_1c;
  uint local_18;
  float local_14;
  uint local_10;
  int *local_c;
  float local_8;
  
  pbVar1 = param_4;
  uVar7 = (uint)*param_4;
  FUN_00412cde(local_58,*(uint *)(param_4 + 4));
  local_14 = (float)param_4[1] * _DAT_00418298;
  if (1 < uVar7) {
    param_4 = param_4 + 0xc;
    local_c = (int *)FUN_004042e0(uVar7 * 0xc);
    if (uVar7 != 0) {
      local_8 = 0.0;
      pfVar8 = (float *)(local_c + 2);
      local_10 = uVar7;
      do {
        pfVar8[-2] = local_8;
        uVar2 = FUN_00412c4f((int)param_1);
        local_18 = (uint)*param_4;
        pfVar8[-1] = (float)local_18 * _DAT_00418298 * (float)uVar2;
        uVar2 = FUN_00412c54((int)param_1);
        local_18 = (uint)param_4[1];
        local_8 = (float)((int)local_8 + 10);
        param_4 = param_4 + 2;
        *pfVar8 = (float)local_18 * _DAT_00418298 * (float)uVar2;
        pfVar8 = pfVar8 + 3;
        local_10 = local_10 - 1;
      } while (local_10 != 0);
    }
    uVar2 = FUN_00412c4f((int)param_1);
    param_4 = (byte *)0x0;
    local_18 = (uint)((ulonglong)pbVar1[8] /
                     (ulonglong)(longlong)(int)(0x100 / (ulonglong)(longlong)(int)(uint)uVar2));
    local_10 = uVar7 * 10;
    if (local_10 != 0) {
      do {
        puVar3 = (undefined4 *)FUN_0041499e(local_3c,(int)param_4,local_14,local_c,uVar7);
        param_4 = param_4 + 1;
        local_30 = *puVar3;
        local_2c = puVar3[1];
        local_28 = puVar3[2];
        puVar3 = (undefined4 *)FUN_0041499e(local_48,(int)param_4,local_14,local_c,uVar7);
        local_24 = *puVar3;
        local_20 = puVar3[1];
        local_1c = puVar3[2];
        uVar10 = local_18;
        lVar9 = FUN_00404224();
        iVar4 = (int)lVar9;
        lVar9 = FUN_00404224();
        iVar5 = (int)lVar9;
        lVar9 = FUN_00404224();
        iVar6 = (int)lVar9;
        lVar9 = FUN_00404224();
        FUN_004146bd(param_1,local_58,(int)lVar9,iVar6,iVar5,iVar4,uVar10);
      } while ((int)param_4 < (int)local_10);
    }
    FUN_004042eb((int)local_c);
  }
  return;
}


// ==== FUN_004146bd @ 004146bd ====

void FUN_004146bd(int *param_1,undefined4 *param_2,int param_3,int param_4,int param_5,int param_6,
                 int param_7)

{
  int iVar1;
  int iVar2;
  int iVar3;
  int iVar4;
  int iVar5;
  int local_c;
  int local_8;
  
  iVar3 = param_5 - param_3;
  iVar4 = param_6 - param_4;
  local_8 = 1;
  local_c = 1;
  if (iVar3 < 0) {
    iVar3 = -iVar3;
    local_8 = -1;
  }
  if (iVar4 < 0) {
    iVar4 = -iVar4;
    local_c = -1;
  }
  if (iVar4 < iVar3) {
    iVar5 = iVar4 * 2 - iVar3;
    iVar2 = iVar5 - iVar3;
    FUN_004147ab(param_1,param_2,param_3,param_4,param_7);
    for (; iVar3 != 0; iVar3 = iVar3 + -1) {
      iVar1 = iVar4 * 2;
      if (-1 < iVar5) {
        param_4 = param_4 + local_c;
        iVar1 = iVar2;
      }
      iVar5 = iVar5 + iVar1;
      param_3 = param_3 + local_8;
      FUN_004147ab(param_1,param_2,param_3,param_4,param_7);
    }
  }
  else {
    iVar5 = iVar3 * 2 - iVar4;
    iVar2 = iVar5 - iVar4;
    FUN_004147ab(param_1,param_2,param_3,param_4,param_7);
    for (; iVar4 != 0; iVar4 = iVar4 + -1) {
      iVar1 = iVar3 * 2;
      if (-1 < iVar5) {
        param_3 = param_3 + local_8;
        iVar1 = iVar2;
      }
      iVar5 = iVar5 + iVar1;
      param_4 = param_4 + local_c;
      FUN_004147ab(param_1,param_2,param_3,param_4,param_7);
    }
  }
  return;
}


// ==== FUN_004147ab @ 004147ab ====

void FUN_004147ab(int *param_1,undefined4 *param_2,int param_3,int param_4,int param_5)

{
  int iVar1;
  int iVar2;
  ushort uVar3;
  uint uVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  uint uVar8;
  undefined4 *puVar9;
  int local_c;
  int local_8;
  
  uVar3 = FUN_00412c4f((int)param_1);
  uVar8 = (uint)uVar3;
  uVar3 = FUN_00412c54((int)param_1);
  uVar4 = (uint)uVar3;
  if ((((-1 < param_3) && (param_3 < (int)uVar8)) && (-1 < param_4)) && (param_4 < (int)uVar4)) {
    uVar3 = FUN_00412c4f((int)param_1);
    puVar9 = (undefined4 *)(((uint)uVar3 * param_4 + param_3) * 0x10 + *param_1);
    iVar1 = param_5 + -1;
    *puVar9 = *param_2;
    puVar9[1] = param_2[1];
    puVar9[2] = param_2[2];
    iVar5 = -iVar1;
    puVar9[3] = param_2[3];
    local_8 = iVar5;
    if (-iVar1 == iVar1 || iVar5 < iVar1) {
      do {
        if (iVar5 <= iVar1) {
          iVar6 = param_3 + iVar5;
          iVar7 = iVar1 * 2 + 1;
          local_c = iVar6;
          do {
            for (; iVar2 = local_8 + param_4, iVar6 < 0; iVar6 = iVar6 + uVar8) {
            }
            for (; iVar2 < 0; iVar2 = iVar2 + uVar4) {
            }
            uVar3 = FUN_00412c4f((int)param_1);
            puVar9 = (undefined4 *)
                     (((uint)uVar3 * (iVar2 % (int)uVar4) + iVar6 % (int)uVar8) * 0x10 + *param_1);
            iVar6 = local_c + 1;
            iVar7 = iVar7 + -1;
            *puVar9 = *param_2;
            puVar9[1] = param_2[1];
            puVar9[2] = param_2[2];
            puVar9[3] = param_2[3];
            local_c = iVar6;
          } while (iVar7 != 0);
        }
        local_8 = local_8 + 1;
      } while (local_8 <= iVar1);
    }
  }
  return;
}


// ==== FUN_004148ba @ 004148ba ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_004148ba(float *param_1,int param_2,int param_3)

{
  float10 fVar1;
  float10 fVar2;
  float10 fVar3;
  float10 fVar4;
  float fVar5;
  float10 fVar6;
  float10 fVar7;
  float10 fVar8;
  float10 fVar9;
  float10 fVar10;
  float10 fVar11;
  float10 fVar12;
  float10 fVar13;
  
  fVar5 = (float)param_2 / (float)param_3;
  fVar6 = FUN_00405430(fVar5,3);
  fVar7 = FUN_00405430(fVar5,2);
  fVar2 = (float10)_DAT_004182cc;
  fVar1 = (float10)_DAT_004170c4;
  fVar8 = FUN_00405430(fVar5,3);
  fVar3 = (float10)_DAT_004182c8;
  fVar9 = FUN_00405430(fVar5,2);
  fVar4 = (float10)_DAT_004182cc;
  fVar10 = FUN_00405430(fVar5,3);
  fVar11 = FUN_00405430(fVar5,2);
  fVar12 = FUN_00405430(fVar5,3);
  fVar13 = FUN_00405430(fVar5,2);
  return (float10)(float)(((float10)(float)(fVar6 + fVar6) - fVar7 * fVar2) + fVar1) *
         (float10)*param_1 +
         (float10)(float)(fVar9 * fVar4 + (float10)(float)(fVar8 * fVar3)) * (float10)param_1[1] +
         (float10)(float)(((float10)(float)fVar10 - (fVar11 + fVar11)) + (float10)fVar5) *
         (float10)param_1[2] + ((float10)(float)fVar12 - fVar13) * (float10)param_1[3];
}


// ==== FUN_0041499e @ 0041499e ====

void FUN_0041499e(int *param_1,int param_2,float param_3,int *param_4,int param_5)

{
  int iVar1;
  int *piVar2;
  int *piVar3;
  int *piVar4;
  int *piVar5;
  int iVar6;
  float10 fVar7;
  float local_2c;
  int local_28;
  float local_24;
  float local_20;
  int local_1c;
  float local_18;
  float local_14;
  int local_10;
  int *local_c;
  int *local_8;
  
  piVar2 = param_4;
  local_8 = param_4;
  local_c = param_4;
  iVar1 = param_5;
  piVar5 = param_4;
  piVar4 = param_4;
  if (0 < param_5) {
    do {
      if ((*piVar4 <= param_2) && (*piVar5 < *piVar4)) {
        piVar5 = piVar4;
      }
      iVar1 = iVar1 + -1;
      piVar4 = piVar4 + 3;
    } while (iVar1 != 0);
  }
  piVar4 = param_4;
  if (0 < param_5) {
    local_10 = param_5;
    piVar3 = param_4;
    do {
      if ((*piVar3 < *piVar5) && (*local_c <= *piVar3)) {
        local_c = piVar3;
      }
      piVar3 = piVar3 + 3;
      local_10 = local_10 + -1;
    } while (local_10 != 0);
    iVar1 = param_5;
    if (0 < param_5) {
      do {
        if (*piVar4 < *param_4) {
          piVar4 = param_4;
        }
        param_4 = param_4 + 3;
        iVar1 = iVar1 + -1;
      } while (iVar1 != 0);
      if (0 < param_5) {
        param_4 = (int *)param_5;
        piVar3 = piVar2;
        do {
          if ((*piVar5 < *piVar3) && (*piVar3 < *piVar4)) {
            piVar4 = piVar3;
          }
          piVar3 = piVar3 + 3;
          param_4 = (int *)((int)param_4 + -1);
        } while (param_4 != (int *)0x0);
        if (0 < param_5) {
          param_4 = (int *)param_5;
          piVar3 = piVar2;
          do {
            if (*local_8 < *piVar3) {
              local_8 = piVar3;
            }
            piVar3 = piVar3 + 3;
            param_4 = (int *)((int)param_4 + -1);
          } while (param_4 != (int *)0x0);
          if (0 < param_5) {
            do {
              if ((*piVar4 < *piVar2) && (*piVar2 < *local_8)) {
                local_8 = piVar2;
              }
              piVar2 = piVar2 + 3;
              param_5 = param_5 + -1;
            } while (param_5 != 0);
          }
        }
      }
    }
  }
  iVar1 = param_2 - *piVar5;
  iVar6 = *piVar4 - *piVar5;
  if (iVar6 != 0) {
    local_2c = (float)piVar5[1];
    local_28 = piVar4[1];
    local_24 = ((float)piVar4[1] - (float)local_c[1]) * param_3;
    local_20 = ((float)local_8[1] - (float)piVar5[1]) * param_3;
    fVar7 = FUN_004148ba(&local_2c,iVar1,iVar6);
    local_2c = (float)piVar5[2];
    local_28 = piVar4[2];
    local_24 = ((float)piVar4[2] - (float)local_c[2]) * param_3;
    local_20 = ((float)local_8[2] - (float)piVar5[2]) * param_3;
    local_18 = (float)fVar7;
    fVar7 = FUN_004148ba(&local_2c,iVar1,iVar6);
    local_14 = (float)fVar7;
    piVar5 = &local_1c;
  }
  *param_1 = *piVar5;
  param_1[1] = piVar5[1];
  param_1[2] = piVar5[2];
  return;
}


// ==== FUN_00414b1e @ 00414b1e ====

void FUN_00414b1e(int *param_1,undefined4 param_2,undefined4 param_3,int param_4)

{
  char cVar1;
  ushort uVar2;
  ushort uVar3;
  ushort *puVar4;
  int iVar5;
  int iVar6;
  uint uVar7;
  int iVar8;
  uint uVar9;
  float *pfVar10;
  undefined4 *puVar11;
  longlong lVar12;
  undefined4 local_3c;
  undefined4 uStack_38;
  undefined4 uStack_34;
  undefined4 uStack_30;
  float local_2c;
  float fStack_28;
  float fStack_24;
  float fStack_20;
  uint local_1c;
  ushort *local_18;
  undefined4 *local_14;
  uint local_10;
  ushort *local_c;
  int local_8;
  
  iVar5 = param_4;
  uVar2 = FUN_00412c4f((int)param_1);
  local_10 = (uint)uVar2;
  uVar3 = FUN_00412c54((int)param_1);
  local_1c = (uint)uVar3;
  uVar9 = local_1c * uVar2;
  local_14 = (undefined4 *)FUN_004042e0(uVar9);
  if (0 < (int)uVar9) {
    puVar11 = local_14;
    for (uVar7 = uVar9 >> 2; uVar7 != 0; uVar7 = uVar7 - 1) {
      *puVar11 = 0x4040404;
      puVar11 = puVar11 + 1;
    }
    for (uVar7 = uVar9 & 3; uVar7 != 0; uVar7 = uVar7 - 1) {
      *(undefined1 *)puVar11 = 4;
      puVar11 = (undefined4 *)((int)puVar11 + 1);
    }
  }
  puVar4 = (ushort *)FUN_004042e0(uVar9 * 0x10);
  local_8 = 0;
  local_18 = puVar4;
  uVar2 = FUN_00412c4f((int)param_1);
  local_c = (ushort *)(uint)uVar2;
  lVar12 = FUN_00404224();
  uVar2 = (ushort)lVar12;
  FUN_00412c54((int)param_1);
  local_c = (ushort *)(uint)*(byte *)(param_4 + 1);
  lVar12 = FUN_00404224();
  *puVar4 = uVar2;
  uVar3 = (ushort)lVar12;
  puVar4[1] = uVar3;
  param_4 = CONCAT22(uVar3,uVar2);
  pfVar10 = (float *)((uVar3 * local_10 + (uint)uVar2) * 0x10 + *param_1);
  local_2c = *pfVar10;
  fStack_28 = pfVar10[1];
  fStack_24 = pfVar10[2];
  fStack_20 = pfVar10[3];
  FUN_00412cde(&local_3c,*(uint *)(iVar5 + 4));
  local_c = local_18;
  do {
    iVar8 = (int)((longlong)(ulonglong)param_4._2_2_ % (longlong)(int)local_1c) * local_10 +
            (int)((longlong)(ulonglong)(ushort)param_4 % (longlong)(int)local_10);
    iVar5 = FUN_00414cf7((float *)(*param_1 + iVar8 * 0x10));
    iVar6 = FUN_00414cf7(&local_2c);
    if ((iVar5 == iVar6) || (*(char *)((int)local_14 + iVar8) != '\x04')) {
      puVar11 = (undefined4 *)(*param_1 + iVar8 * 0x10);
      *puVar11 = local_3c;
      puVar11[1] = uStack_38;
      puVar11[2] = uStack_34;
      puVar11[3] = uStack_30;
      cVar1 = *(char *)(iVar8 + (int)local_14);
      if (cVar1 == '\0') goto LAB_00414c52;
      local_8 = local_8 + 1;
      *(char *)(iVar8 + (int)local_14) = cVar1 + -1;
      puVar4 = local_c + 2;
      *puVar4 = (ushort)param_4;
      local_c[3] = param_4._2_2_;
      if (cVar1 == '\x01') {
        param_4 = CONCAT22(param_4._2_2_,(ushort)param_4 - 1);
      }
      if (cVar1 == '\x02') {
        param_4 = CONCAT22(param_4._2_2_,(ushort)param_4 + 1);
      }
      if (cVar1 == '\x03') {
        param_4 = CONCAT22(param_4._2_2_ + -1,(ushort)param_4);
      }
      local_c = puVar4;
      if (cVar1 == '\x04') {
        param_4 = CONCAT22(param_4._2_2_ + 1,(ushort)param_4);
      }
    }
    else {
      *(char *)((int)local_14 + iVar8) = '\0';
LAB_00414c52:
      local_8 = local_8 + -1;
      local_c = local_c + -2;
      if (local_8 == 0) break;
      param_4 = *(int *)local_c;
    }
  } while (local_8 != -1);
  FUN_004042eb((int)local_14);
  FUN_004042eb((int)local_18);
  return;
}


// ==== FUN_00414cf7 @ 00414cf7 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

int __fastcall FUN_00414cf7(float *param_1)

{
  int local_14;
  int local_10;
  int local_c;
  int local_8;
  
  FUN_00414dbe(&local_8,*param_1 * _DAT_00418268);
  if (local_8 < 1) {
    local_8 = 0;
  }
  if (0xfe < local_8) {
    local_8 = 0xff;
  }
  FUN_00414dbe(&local_c,param_1[1] * _DAT_00418268);
  if (local_c < 1) {
    local_c = 0;
  }
  if (0xfe < local_c) {
    local_c = 0xff;
  }
  FUN_00414dbe(&local_10,param_1[2] * _DAT_00418268);
  if (local_10 < 1) {
    local_10 = 0;
  }
  if (0xfe < local_10) {
    local_10 = 0xff;
  }
  FUN_00414dbe(&local_14,param_1[3] * _DAT_00418268);
  if (local_14 < 1) {
    local_14 = 0;
  }
  if (0xfe < local_14) {
    local_14 = 0xff;
  }
  return ((local_8 * 0x100 + local_c) * 0x100 + local_10) * 0x100 + local_14;
}


// ==== FUN_00414dbe @ 00414dbe ====

void FUN_00414dbe(int *param_1,float param_2)

{
  *param_1 = (int)ROUND(ROUND(param_2));
  return;
}


// ==== FUN_00414dcf @ 00414dcf ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00414dcf(undefined4 *param_1,undefined4 param_2,undefined4 param_3,int param_4)

{
  float fVar1;
  ushort uVar2;
  ushort uVar3;
  int iVar4;
  int iVar5;
  CRect *pCVar6;
  CRect *pCVar7;
  uint uVar8;
  int iVar9;
  uint uVar10;
  byte *pbVar11;
  undefined4 *puVar12;
  int iVar13;
  float10 fVar14;
  longlong lVar15;
  CRect local_8c [16];
  CRect local_7c [16];
  CRect local_6c [16];
  float local_5c [4];
  float local_4c [4];
  int local_3c;
  int local_38;
  int local_34;
  int local_30;
  float local_2c;
  float local_28;
  uint local_24;
  int local_20;
  undefined4 *local_1c;
  uint local_18;
  uint local_14;
  uint local_10;
  int local_c;
  float local_8;
  
  uVar2 = FUN_00412c4f((int)param_1);
  local_10 = (uint)uVar2;
  uVar3 = FUN_00412c54((int)param_1);
  local_28 = (float)(int)local_10;
  local_24 = (uint)uVar3;
  uVar10 = local_24 * uVar2;
  local_18 = uVar10;
  lVar15 = FUN_00404224();
  iVar9 = (int)lVar15;
  local_14 = (uint)*(byte *)(param_4 + 1);
  FUN_0040424e((uint)*(byte *)(param_4 + 0xc));
  local_1c = (undefined4 *)FUN_004042e0(uVar10);
  if (0 < (int)uVar10) {
    puVar12 = local_1c;
    for (uVar8 = uVar10 >> 2; uVar8 != 0; uVar8 = uVar8 - 1) {
      *puVar12 = 0xffffffff;
      puVar12 = puVar12 + 1;
    }
    for (uVar8 = uVar10 & 3; uVar8 != 0; uVar8 = uVar8 - 1) {
      *(undefined1 *)puVar12 = 0xff;
      puVar12 = (undefined4 *)((int)puVar12 + 1);
    }
  }
  if (0 < (int)local_14) {
    local_2c = (float)(int)local_24;
    local_20 = -iVar9;
    do {
      local_8 = (float)FUN_00404258();
      lVar15 = FUN_00404224();
      local_34 = (int)lVar15;
      local_8 = (float)FUN_00404258();
      lVar15 = FUN_00404224();
      local_3c = (int)lVar15;
      if (local_20 < iVar9) {
        iVar13 = local_20;
        local_20 = -iVar9;
        do {
          local_c = local_20;
          if (local_20 < iVar9) {
            local_8 = (float)iVar9;
            local_38 = iVar13 * iVar13;
            do {
              local_30 = local_c * local_c + local_38;
              fVar14 = FUN_00404213((float)local_30);
              if (fVar14 <= (float10)local_8) {
                for (iVar4 = local_c + local_34; iVar4 < 0; iVar4 = iVar4 + local_10) {
                }
                iVar4 = iVar4 % (int)local_10;
                for (iVar5 = local_3c + iVar13; iVar5 < 0; iVar5 = iVar5 + local_24) {
                }
                iVar5 = (iVar5 % (int)local_24) * local_10;
                lVar15 = FUN_00404224();
                pbVar11 = (byte *)(iVar5 + iVar4 + (int)local_1c);
                uVar10 = local_18;
                if ((byte)lVar15 < *pbVar11) {
                  *pbVar11 = (byte)lVar15;
                }
              }
              local_c = local_c + 1;
            } while (local_c < iVar9);
          }
          iVar13 = iVar13 + 1;
        } while (iVar13 < iVar9);
      }
      local_14 = local_14 - 1;
    } while (local_14 != 0);
  }
  FUN_00412cde(local_4c,*(uint *)(param_4 + 4));
  FUN_00412cde(local_5c,*(uint *)(param_4 + 8));
  iVar9 = 0;
  param_1 = (undefined4 *)*param_1;
  if (0 < (int)uVar10) {
    do {
      fVar1 = (float)*(byte *)(iVar9 + (int)local_1c) * _DAT_00418298;
      pCVar6 = FUN_004132f4(local_6c,local_4c,1.0 - fVar1);
      pCVar7 = FUN_004132f4(local_7c,local_5c,fVar1);
      pCVar6 = FUN_0041343b(local_8c,(float *)pCVar7,(float *)pCVar6);
      *param_1 = *(undefined4 *)pCVar6;
      iVar9 = iVar9 + 1;
      param_1[1] = *(undefined4 *)(pCVar6 + 4);
      param_1[2] = *(undefined4 *)(pCVar6 + 8);
      param_1[3] = *(undefined4 *)(pCVar6 + 0xc);
      param_1 = param_1 + 4;
    } while (iVar9 < (int)local_18);
  }
  FUN_004042eb((int)local_1c);
  return;
}


// ==== FUN_00415012 @ 00415012 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00415012(int *param_1,undefined4 param_2,undefined4 param_3,byte *param_4)

{
  int *piVar1;
  byte *pbVar2;
  ushort uVar3;
  CRect *pCVar4;
  uint uVar5;
  CRect local_6c [16];
  CRect local_5c [16];
  float local_4c [4];
  float local_3c [4];
  float local_2c;
  undefined4 uStack_28;
  undefined4 uStack_24;
  undefined4 uStack_20;
  int local_1c;
  float local_18;
  uint local_14;
  uint local_10;
  uint local_c;
  byte *local_8;
  
  pbVar2 = param_4;
  piVar1 = param_1;
  uVar3 = FUN_00412c4f((int)param_1);
  local_c = (uint)uVar3;
  uVar3 = FUN_00412c54((int)param_1);
  local_14 = (uint)uVar3;
  FUN_004139eb(&local_2c);
  FUN_00412cde(local_3c,*(uint *)(param_4 + 8));
  FUN_00412cde(local_4c,*(uint *)(param_4 + 0xc));
  pCVar4 = FUN_00414157(local_5c,local_4c,local_3c);
  local_2c = *(float *)pCVar4;
  uStack_28 = *(undefined4 *)(pCVar4 + 4);
  uStack_24 = *(undefined4 *)(pCVar4 + 8);
  uStack_20 = *(undefined4 *)(pCVar4 + 0xc);
  pCVar4 = FUN_004132f4(local_5c,&local_2c,_DAT_004170c4 / ((float)param_4[2] - (float)*param_4));
  local_2c = *(float *)pCVar4;
  param_1 = (int *)0x0;
  uStack_28 = *(undefined4 *)(pCVar4 + 4);
  local_8 = (byte *)*piVar1;
  uStack_24 = *(undefined4 *)(pCVar4 + 8);
  uStack_20 = *(undefined4 *)(pCVar4 + 0xc);
  if (0 < (int)local_c) {
    do {
      uVar5 = (uint)*pbVar2;
      if ((int)param_1 < (int)uVar5) {
        param_4 = (byte *)0x0;
      }
      else {
        param_4 = (byte *)(uint)pbVar2[2];
        if ((int)param_1 <= (int)param_4) {
          param_4 = (byte *)((int)param_1 - uVar5);
        }
      }
      if (0 < (int)local_14) {
        local_10 = local_14;
        local_18 = (float)(int)param_4;
        local_1c = local_c << 4;
        param_4 = local_8;
        do {
          pCVar4 = FUN_004132f4(local_5c,&local_2c,local_18);
          pCVar4 = FUN_0041343b(local_6c,local_3c,(float *)pCVar4);
          *(undefined4 *)param_4 = *(undefined4 *)pCVar4;
          *(undefined4 *)(param_4 + 4) = *(undefined4 *)(pCVar4 + 4);
          local_10 = local_10 - 1;
          *(undefined4 *)(param_4 + 8) = *(undefined4 *)(pCVar4 + 8);
          *(undefined4 *)(param_4 + 0xc) = *(undefined4 *)(pCVar4 + 0xc);
          param_4 = param_4 + local_1c;
        } while (local_10 != 0);
      }
      param_1 = (int *)((int)param_1 + 1);
      local_8 = local_8 + 0x10;
    } while ((int)param_1 < (int)local_c);
  }
  return;
}


// ==== FUN_00415149 @ 00415149 ====

int * __thiscall FUN_00415149(void *this,int param_1,int param_2)

{
  undefined4 uVar1;
  int iVar2;
  
  *(int *)((int)this + 0xc) = param_1;
  *(int *)((int)this + 0x10) = param_2;
  uVar1 = FUN_004042e0(param_1 * param_2 * 4);
  *(undefined4 *)this = uVar1;
  iVar2 = 0;
  *(undefined4 *)((int)this + 8) = 0;
  *(undefined4 *)((int)this + 4) = 0x3f800000;
  if (0 < *(int *)((int)this + 0x10) * *(int *)((int)this + 0xc)) {
    do {
      *(undefined4 *)(*(int *)this + iVar2 * 4) = 0;
      iVar2 = iVar2 + 1;
    } while (iVar2 < *(int *)((int)this + 0x10) * *(int *)((int)this + 0xc));
  }
  return this;
}


// ==== FUN_00415199 @ 00415199 ====

void __fastcall FUN_00415199(int *param_1)

{
  FUN_004042eb(*param_1);
  return;
}


// ==== FUN_004151a2 @ 004151a2 ====

void __thiscall FUN_004151a2(void *this,void *param_1,int *param_2)

{
  ushort uVar1;
  float *pfVar2;
  CRect *pCVar3;
  float fVar4;
  CRect local_ac [16];
  CRect local_9c [16];
  CRect local_8c [16];
  int local_7c [4];
  CRect local_6c [16];
  float local_5c;
  undefined4 uStack_58;
  undefined4 uStack_54;
  undefined4 uStack_50;
  int local_4c;
  int *local_48;
  uint local_44;
  float local_40;
  int local_3c;
  float local_38;
  float fStack_34;
  float fStack_30;
  float fStack_2c;
  int local_28;
  int local_24;
  uint local_20;
  int local_1c;
  float *local_18;
  float *local_14;
  float local_10;
  int local_c;
  int local_8;
  
  FUN_004139eb(&local_38);
  CRect::CRect((CRect *)&local_5c,0,0,0,0);
  uVar1 = FUN_00412c4f((int)param_1);
  local_20 = (uint)uVar1;
  uVar1 = FUN_00412c54((int)param_1);
  local_44 = (uint)uVar1;
  local_c = 0;
  local_24 = *(int *)((int)this + 0xc) + -1;
  local_40 = 1.0 / *(float *)((int)this + 4);
  local_48 = (int *)(local_24 / -2);
  local_24 = local_24 / 2;
  local_1c = *(int *)((int)this + 0x10) + -1;
  local_4c = local_1c / -2;
  local_1c = local_1c / 2;
  local_14 = (float *)*param_2;
  if (local_44 != 0) {
    do {
      local_8 = 0;
      if (0 < (int)local_20) {
        do {
          local_38 = local_5c;
          fStack_34 = (float)uStack_58;
          local_18 = *(float **)this;
          fStack_30 = (float)uStack_54;
          fStack_2c = (float)uStack_50;
          for (local_28 = local_4c; local_28 <= local_1c; local_28 = local_28 + 1) {
            param_2 = local_48;
            if ((int)local_48 <= local_24) {
              local_10 = (float)(local_28 + local_c);
              do {
                fVar4 = *local_18;
                local_3c = (int)param_2 + local_8;
                pfVar2 = (float *)FUN_00415a71(param_1,local_7c,(float)local_3c,local_10);
                pCVar3 = FUN_004132f4(local_9c,pfVar2,fVar4);
                pCVar3 = FUN_0041343b(local_6c,&local_38,(float *)pCVar3);
                local_38 = *(float *)pCVar3;
                local_18 = local_18 + 1;
                param_2 = (int *)((int)param_2 + 1);
                fStack_34 = *(float *)(pCVar3 + 4);
                fStack_30 = *(float *)(pCVar3 + 8);
                fStack_2c = *(float *)(pCVar3 + 0xc);
              } while ((int)param_2 <= local_24);
            }
          }
          pCVar3 = FUN_004132f4(local_8c,&local_38,local_40);
          local_38 = *(float *)pCVar3;
          fStack_34 = *(float *)(pCVar3 + 4);
          fStack_30 = *(float *)(pCVar3 + 8);
          fStack_2c = *(float *)(pCVar3 + 0xc);
          pCVar3 = FUN_00412e56(local_ac,&local_38,*(float *)((int)this + 8));
          local_38 = *(float *)pCVar3;
          fStack_34 = *(float *)(pCVar3 + 4);
          fStack_30 = *(float *)(pCVar3 + 8);
          fStack_2c = *(float *)(pCVar3 + 0xc);
          FUN_0041327d(&local_38,0.0,1.0);
          *local_14 = local_38;
          pfVar2 = local_14 + 4;
          local_8 = local_8 + 1;
          local_14[1] = fStack_34;
          local_14[2] = fStack_30;
          local_14[3] = fStack_2c;
          local_14 = pfVar2;
        } while (local_8 < (int)local_20);
      }
      local_c = local_c + 1;
    } while (local_c < (int)local_44);
  }
  return;
}


// ==== FUN_00415379 @ 00415379 ====

void __fastcall FUN_00415379(undefined4 *param_1)

{
  *param_1 = 0;
  return;
}


// ==== FUN_0041537f @ 0041537f ====

void __fastcall FUN_0041537f(undefined4 *param_1)

{
  if ((void *)*param_1 != (void *)0x0) {
    FUN_00412220((void *)*param_1,1);
  }
  return;
}


// ==== FUN_0041538d @ 0041538d ====

void __thiscall FUN_0041538d(void *this,ushort param_1,ushort param_2)

{
  undefined4 *puVar1;
  
  puVar1 = (undefined4 *)FUN_004042e0(0x5c);
  if (puVar1 == (undefined4 *)0x0) {
    puVar1 = (undefined4 *)0x0;
  }
  else {
    puVar1 = FUN_00415906(puVar1);
  }
  *(undefined4 **)this = puVar1;
  FUN_004159e4(puVar1,param_1,param_2);
  FUN_0041544c((int)this);
  return;
}


// ==== FUN_004153c3 @ 004153c3 ====

void __fastcall FUN_004153c3(int *param_1)

{
  short sVar1;
  ushort uVar2;
  undefined4 local_20;
  undefined4 uStack_1c;
  undefined4 uStack_18;
  undefined4 uStack_14;
  int local_10;
  int local_c;
  undefined4 *local_8;
  
  local_8 = *(undefined4 **)*param_1;
  CRect::CRect((CRect *)&local_20,0x3f800000,0x3f800000,0x3f800000,0x3f800000);
  local_10 = 0;
  sVar1 = FUN_00412c54(*param_1);
  if (sVar1 != 0) {
    do {
      local_c = 0;
      sVar1 = FUN_00412c4f(*param_1);
      if (sVar1 != 0) {
        do {
          *local_8 = local_20;
          local_8[1] = uStack_1c;
          local_c = local_c + 1;
          local_8[2] = uStack_18;
          local_8[3] = uStack_14;
          local_8 = local_8 + 4;
          uVar2 = FUN_00412c4f(*param_1);
        } while (local_c < (int)(uint)uVar2);
      }
      local_10 = local_10 + 1;
      uVar2 = FUN_00412c54(*param_1);
    } while (local_10 < (int)(uint)uVar2);
  }
  return;
}


// ==== FUN_0041544c @ 0041544c ====

void __fastcall FUN_0041544c(int param_1)

{
  *(undefined1 *)(param_1 + 0xc) = 0;
  *(undefined1 *)(param_1 + 4) = 100;
  *(undefined4 *)(param_1 + 8) = 0xffffff;
  return;
}


// ==== FUN_0041545c @ 0041545c ====

void __thiscall FUN_0041545c(void *this,int *param_1)

{
  undefined1 uVar1;
  
  *(int *)((int)this + 8) = param_1[2];
  *(char *)((int)this + 0xc) = (char)param_1[3];
  *(char *)((int)this + 4) = (char)param_1[1];
  FUN_00415d61(*(void **)this,(int *)*param_1);
  uVar1 = FUN_00413ed5(*param_1);
  FUN_00412d4b(*(void **)this,uVar1);
  return;
}


// ==== FUN_00415493 @ 00415493 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00415493(void *this,undefined4 *param_1)

{
  ushort uVar1;
  uint uVar2;
  float *pfVar3;
  float *pfVar4;
  uint uVar5;
  float fVar6;
  char cVar7;
  
  cVar7 = *(char *)(param_1 + 3);
  pfVar4 = *(float **)*param_1;
  pfVar3 = (float *)**(undefined4 **)this;
  fVar6 = (float)*(byte *)(param_1 + 1) * _DAT_00418fd8;
  uVar5 = param_1[2];
  uVar1 = FUN_00412c54((int)*(undefined4 **)this);
  uVar2 = (uint)uVar1;
  uVar1 = FUN_00412c4f(*(int *)this);
  FUN_004154e5((uint)uVar1,uVar2,pfVar3,pfVar4,uVar5,fVar6,cVar7);
  return;
}


// ==== FUN_004154e5 @ 004154e5 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004154e5(int param_1,int param_2,float *param_3,float *param_4,uint param_5,float param_6,
                 char param_7)

{
  float fVar1;
  float fVar2;
  float fVar3;
  uint uVar4;
  int local_8;
  
  uVar4 = param_5;
  fVar3 = _DAT_0041904c;
  fVar1 = _DAT_004170c8;
  if (param_7 == '\0') {
    if (0 < param_2) {
      local_8 = param_2;
      do {
        if (0 < param_1) {
          param_5 = param_1;
          do {
            fVar1 = param_6;
            if ((uVar4 & 0xff000000) != 0) {
              fVar1 = param_6 * *param_4;
              *param_3 = (1.0 - param_6) * *param_3 + fVar1;
            }
            if ((uVar4 & 0xff0000) != 0) {
              param_3[1] = fVar1 * param_4[1] + (1.0 - fVar1) * param_3[1];
            }
            if ((uVar4 & 0xff00) != 0) {
              param_3[2] = fVar1 * param_4[2] + (1.0 - fVar1) * param_3[2];
            }
            if ((uVar4 & 0xff) != 0) {
              param_3[3] = fVar1 * param_4[3] + (1.0 - fVar1) * param_3[3];
            }
            param_3 = param_3 + 4;
            param_4 = param_4 + 4;
            param_5 = param_5 - 1;
          } while (param_5 != 0);
        }
        local_8 = local_8 + -1;
      } while (local_8 != 0);
    }
  }
  else if (param_7 == '\x01') {
    if (0 < param_2) {
      local_8 = param_2;
      do {
        if (0 < param_1) {
          param_5 = param_1;
          do {
            fVar1 = param_6;
            if ((uVar4 & 0xff000000) != 0) {
              fVar1 = param_6 * *param_4;
              *param_3 = fVar1 + *param_3;
            }
            if ((uVar4 & 0xff0000) != 0) {
              param_3[1] = param_3[1] + fVar1 * param_4[1];
            }
            if ((uVar4 & 0xff00) != 0) {
              param_3[2] = param_3[2] + fVar1 * param_4[2];
            }
            if ((uVar4 & 0xff) != 0) {
              param_3[3] = param_3[3] + fVar1 * param_4[3];
            }
            param_3 = param_3 + 4;
            param_4 = param_4 + 4;
            param_5 = param_5 - 1;
          } while (param_5 != 0);
        }
        local_8 = local_8 + -1;
      } while (local_8 != 0);
    }
  }
  else if (param_7 == '\x02') {
    if (0 < param_2) {
      local_8 = param_2;
      do {
        if (0 < param_1) {
          param_5 = param_1;
          do {
            fVar1 = param_6;
            if ((uVar4 & 0xff000000) != 0) {
              fVar1 = param_6 * *param_4;
              *param_3 = *param_3 - fVar1;
            }
            if ((uVar4 & 0xff0000) != 0) {
              param_3[1] = param_3[1] - fVar1 * param_4[1];
            }
            if ((uVar4 & 0xff00) != 0) {
              param_3[2] = param_3[2] - fVar1 * param_4[2];
            }
            if ((uVar4 & 0xff) != 0) {
              param_3[3] = param_3[3] - fVar1 * param_4[3];
            }
            param_3 = param_3 + 4;
            param_4 = param_4 + 4;
            param_5 = param_5 - 1;
          } while (param_5 != 0);
        }
        local_8 = local_8 + -1;
      } while (local_8 != 0);
    }
  }
  else if (param_7 == '\x03') {
    if (0 < param_2) {
      local_8 = param_2;
      do {
        if (0 < param_1) {
          param_2 = param_1;
          do {
            fVar1 = param_6;
            if ((param_5 & 0xff000000) != 0) {
              fVar1 = param_6 * *param_4;
              *param_3 = *param_3 * *param_4 * param_6;
            }
            if ((param_5 & 0xff0000) != 0) {
              param_3[1] = param_3[1] * fVar1 * param_4[1];
            }
            if ((param_5 & 0xff00) != 0) {
              param_3[2] = param_3[2] * fVar1 * param_4[2];
            }
            if ((param_5 & 0xff) != 0) {
              param_3[3] = param_3[3] * fVar1 * param_4[3];
            }
            param_3 = param_3 + 4;
            param_4 = param_4 + 4;
            param_2 = param_2 + -1;
          } while (param_2 != 0);
        }
        local_8 = local_8 + -1;
      } while (local_8 != 0);
    }
  }
  else if ((param_7 == '\x04') && (0 < param_2)) {
    local_8 = param_2;
    do {
      if (0 < param_1) {
        param_2 = param_1;
        do {
          fVar2 = param_6;
          if ((param_5 & 0xff000000) != 0) {
            fVar2 = param_6 * *param_4;
            *param_3 = (*param_3 / *param_4) * param_6;
          }
          if ((param_5 & 0xff0000) != 0) {
            if (fVar2 * param_4[1] <= fVar1) {
              param_3[1] = param_3[1] * fVar3;
            }
            else {
              param_3[1] = param_3[1] / (fVar2 * param_4[1]);
            }
          }
          if ((param_5 & 0xff00) != 0) {
            if (fVar2 * param_4[2] <= fVar1) {
              param_3[2] = param_3[2] * fVar3;
            }
            else {
              param_3[2] = param_3[2] / (fVar2 * param_4[2]);
            }
          }
          if ((param_5 & 0xff) != 0) {
            if (fVar1 < fVar2 * param_4[3]) {
              param_3[3] = param_3[3] / (fVar2 * param_4[3]);
            }
            else {
              param_3[3] = param_3[3] * fVar3;
            }
          }
          param_4 = param_4 + 4;
          param_3 = param_3 + 4;
          param_2 = param_2 + -1;
        } while (param_2 != 0);
      }
      local_8 = local_8 + -1;
    } while (local_8 != 0);
  }
  return;
}


// ==== FUN_00415906 @ 00415906 ====

undefined4 * __fastcall FUN_00415906(undefined4 *param_1)

{
  FUN_004139eb(param_1 + 3);
  FUN_004139eb(param_1 + 7);
  FUN_004139eb(param_1 + 0xb);
  FUN_004139eb(param_1 + 0xf);
  FUN_004139eb(param_1 + 0x13);
  *(undefined2 *)((int)param_1 + 6) = 0xffff;
  *(undefined2 *)(param_1 + 2) = 0xffff;
  *param_1 = 0;
  return param_1;
}


// ==== FUN_00415944 @ 00415944 ====

undefined4 * __thiscall FUN_00415944(void *this,int *param_1)

{
  ushort uVar1;
  void *pvVar2;
  int iVar3;
  
  FUN_004139eb((undefined4 *)((int)this + 0xc));
  FUN_004139eb((undefined4 *)((int)this + 0x1c));
  FUN_004139eb((undefined4 *)((int)this + 0x2c));
  FUN_004139eb((undefined4 *)((int)this + 0x3c));
  FUN_004139eb((undefined4 *)((int)this + 0x4c));
  *(char *)((int)this + 4) = (char)param_1[1];
  *(undefined2 *)((int)this + 6) = *(undefined2 *)((int)param_1 + 6);
  uVar1 = *(ushort *)(param_1 + 2);
  *(ushort *)((int)this + 8) = uVar1;
  iVar3 = (uint)*(ushort *)((int)this + 6) * (uint)uVar1;
  pvVar2 = (void *)FUN_004042e0(iVar3 * 0x10);
  if (pvVar2 == (void *)0x0) {
    pvVar2 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar2,0x10,iVar3,FUN_004139eb);
  }
  *(void **)this = pvVar2;
  FUN_004042b5((int)pvVar2,*param_1,
               (uint)*(ushort *)((int)this + 6) * (uint)*(ushort *)((int)this + 8) * 0x10);
  return this;
}


// ==== FUN_004159e4 @ 004159e4 ====

void __thiscall FUN_004159e4(void *this,ushort param_1,ushort param_2)

{
  void *pvVar1;
  
  *(ushort *)((int)this + 6) = param_1;
  *(undefined1 *)((int)this + 4) = 1;
  *(ushort *)((int)this + 8) = param_2;
  pvVar1 = (void *)FUN_004042e0((uint)param_1 * (uint)param_2 * 0x10);
  if (pvVar1 == (void *)0x0) {
    pvVar1 = (void *)0x0;
  }
  else {
    _vector_constructor_iterator_(pvVar1,0x10,(uint)param_1 * (uint)param_2,FUN_004139eb);
  }
  *(void **)this = pvVar1;
  return;
}


// ==== FUN_00415a34 @ 00415a34 ====

void __fastcall FUN_00415a34(int *param_1)

{
  if (*param_1 != 0) {
    FUN_004042eb(*param_1);
  }
  *param_1 = 0;
  *(undefined2 *)((int)param_1 + 6) = 0xffff;
  *(undefined2 *)(param_1 + 2) = 0xffff;
  return;
}


// ==== FUN_00415a55 @ 00415a55 ====

void __fastcall FUN_00415a55(undefined4 *param_1)

{
  FUN_00404282((undefined4 *)*param_1,0,
               (uint)*(ushort *)(param_1 + 2) * (uint)*(ushort *)((int)param_1 + 6) * 0x10);
  return;
}


// ==== FUN_00415a71 @ 00415a71 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall FUN_00415a71(void *this,int *param_1,float param_2,float param_3)

{
  float fVar1;
  float fVar2;
  uint uVar3;
  CRect *pCVar4;
  int iVar5;
  int iVar6;
  longlong lVar7;
  longlong lVar8;
  float *pfVar9;
  float *pfVar10;
  CRect local_8c [16];
  CRect local_7c [16];
  CRect local_6c [16];
  CRect local_5c [16];
  CRect local_4c [16];
  CRect local_3c [16];
  CRect local_2c [16];
  int local_1c;
  uint local_18;
  int local_14;
  int local_10;
  int local_c;
  float local_8;
  
  FUN_00415cf8(param_2,(uint)*(ushort *)((int)this + 6));
  FUN_00415cf8(param_3,(uint)*(ushort *)((int)this + 8));
  if (*(char *)((int)this + 4) == '\0') {
    lVar7 = FUN_00404224();
    iVar6 = (int)lVar7;
    lVar7 = FUN_00404224();
    iVar5 = (int)lVar7;
    if (iVar5 < 0) {
      do {
        iVar5 = iVar5 + (uint)*(ushort *)((int)this + 8);
      } while (iVar5 < 0);
    }
    if (iVar6 < 0) {
      do {
        iVar6 = iVar6 + (uint)*(ushort *)((int)this + 6);
      } while (iVar6 < 0);
    }
    pCVar4 = (CRect *)(((iVar5 % (int)(uint)*(ushort *)((int)this + 8)) *
                        (uint)*(ushort *)((int)this + 6) +
                       iVar6 % (int)(uint)*(ushort *)((int)this + 6)) * 0x10 + *(int *)this);
  }
  else {
    if (*(char *)((int)this + 4) != '\x01') goto LAB_00415ce5;
    lVar7 = FUN_00404224();
    local_1c = (int)lVar7;
    lVar8 = FUN_00404224();
    local_c = (int)lVar8;
    lVar8 = FUN_00404224();
    FUN_004041ee((float)((uint)lVar8 & 0xff) * _DAT_00418284 * (float)_DAT_00419018);
    lVar8 = FUN_00404224();
    uVar3 = (uint)lVar8 & 0xff;
    lVar8 = FUN_00404224();
    FUN_004041ee((float)((uint)lVar8 & 0xff) * _DAT_00418284 * (float)_DAT_00419018);
    lVar8 = FUN_00404224();
    local_18 = (uint)lVar8 & 0xff;
    local_10 = ((int)lVar7 + 1) % (int)(uint)*(ushort *)((int)this + 6);
    local_14 = (local_c + 1) % (int)(uint)*(ushort *)((int)this + 8);
    fVar1 = (float)(int)(0xff - local_18) * _DAT_00418298;
    local_8 = (float)(int)(0xff - uVar3) * _DAT_00418298;
    pCVar4 = FUN_004132f4(local_2c,(float *)(((uint)*(ushort *)((int)this + 6) * local_c + local_1c)
                                             * 0x10 + *(int *)this),local_8 * fVar1);
    fVar2 = (float)uVar3 * _DAT_00418298;
    *(undefined4 *)((int)this + 0x1c) = *(undefined4 *)pCVar4;
    *(undefined4 *)((int)this + 0x20) = *(undefined4 *)(pCVar4 + 4);
    *(undefined4 *)((int)this + 0x24) = *(undefined4 *)(pCVar4 + 8);
    *(undefined4 *)((int)this + 0x28) = *(undefined4 *)(pCVar4 + 0xc);
    pCVar4 = FUN_004132f4(local_7c,(float *)(((uint)*(ushort *)((int)this + 6) * local_c + local_10)
                                             * 0x10 + *(int *)this),fVar2 * fVar1);
    fVar1 = (float)(int)local_18 * _DAT_00418298;
    *(undefined4 *)((int)this + 0x2c) = *(undefined4 *)pCVar4;
    *(undefined4 *)((int)this + 0x30) = *(undefined4 *)(pCVar4 + 4);
    *(undefined4 *)((int)this + 0x34) = *(undefined4 *)(pCVar4 + 8);
    *(undefined4 *)((int)this + 0x38) = *(undefined4 *)(pCVar4 + 0xc);
    pCVar4 = FUN_004132f4(local_5c,(float *)(((uint)*(ushort *)((int)this + 6) * local_14 + local_10
                                             ) * 0x10 + *(int *)this),fVar1 * fVar2);
    *(undefined4 *)((int)this + 0x3c) = *(undefined4 *)pCVar4;
    *(undefined4 *)((int)this + 0x40) = *(undefined4 *)(pCVar4 + 4);
    *(undefined4 *)((int)this + 0x44) = *(undefined4 *)(pCVar4 + 8);
    *(undefined4 *)((int)this + 0x48) = *(undefined4 *)(pCVar4 + 0xc);
    pCVar4 = FUN_004132f4(local_3c,(float *)(((uint)*(ushort *)((int)this + 6) * local_14 + local_1c
                                             ) * 0x10 + *(int *)this),fVar1 * local_8);
    pfVar10 = (float *)((int)this + 0x4c);
    *(undefined4 *)((int)this + 0x4c) = *(undefined4 *)pCVar4;
    *(undefined4 *)((int)this + 0x50) = *(undefined4 *)(pCVar4 + 4);
    pfVar9 = (float *)((int)this + 0x3c);
    *(undefined4 *)((int)this + 0x54) = *(undefined4 *)(pCVar4 + 8);
    *(undefined4 *)((int)this + 0x58) = *(undefined4 *)(pCVar4 + 0xc);
    pCVar4 = FUN_0041343b(local_4c,(float *)((int)this + 0x1c),(float *)((int)this + 0x2c));
    pCVar4 = FUN_0041343b(local_6c,(float *)pCVar4,pfVar9);
    pCVar4 = FUN_0041343b(local_8c,(float *)pCVar4,pfVar10);
  }
  *(undefined4 *)((int)this + 0xc) = *(undefined4 *)pCVar4;
  *(undefined4 *)((int)this + 0x10) = *(undefined4 *)(pCVar4 + 4);
  *(undefined4 *)((int)this + 0x14) = *(undefined4 *)(pCVar4 + 8);
  *(undefined4 *)((int)this + 0x18) = *(undefined4 *)(pCVar4 + 0xc);
LAB_00415ce5:
  *param_1 = *(int *)((int)this + 0xc);
  param_1[1] = *(int *)((int)this + 0x10);
  param_1[2] = *(int *)((int)this + 0x14);
  param_1[3] = *(int *)((int)this + 0x18);
  return;
}


// ==== FUN_00415cf8 @ 00415cf8 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

float10 FUN_00415cf8(float param_1,int param_2)

{
  float10 fVar1;
  ulonglong uVar2;
  
  if (param_2 < 2) {
    fVar1 = (float10)param_1;
  }
  else {
    fVar1 = (float10)param_1;
    if (fVar1 < (float10)_DAT_004170c8) {
      do {
        fVar1 = fVar1 + (float10)_DAT_00418270;
      } while (fVar1 < (float10)_DAT_004170c8);
      param_1 = (float)fVar1;
    }
    else if (fVar1 < (float10)param_2) {
      return fVar1;
    }
    FUN_004041ab((float)fVar1);
    uVar2 = FUN_00404224();
    fVar1 = ((float10)param_1 - (float10)(int)uVar2) +
            (float10)(int)((longlong)
                           ((ulonglong)(uint)((int)uVar2 >> 0x1f) << 0x20 | uVar2 & 0xffffffff) %
                          (longlong)param_2);
  }
  return fVar1;
}


// ==== FUN_00415d61 @ 00415d61 ====

void __thiscall FUN_00415d61(void *this,int *param_1)

{
  undefined4 *puVar1;
  ushort uVar2;
  undefined4 *puVar3;
  int local_2c [4];
  float local_1c;
  uint local_18;
  uint local_14;
  undefined4 *local_10;
  int local_c;
  int local_8;
  
  uVar2 = *(ushort *)((int)this + 6);
  if ((*(ushort *)((int)param_1 + 6) == uVar2) &&
     (*(ushort *)(param_1 + 2) == *(ushort *)((int)this + 8))) {
    FUN_004042b5(*(int *)this,*param_1,(uint)*(ushort *)((int)this + 8) * (uint)uVar2 * 0x10);
  }
  else {
    local_10 = *(undefined4 **)this;
    local_c = 0;
    if (*(short *)((int)this + 8) != 0) {
      do {
        local_8 = 0;
        local_14 = (uint)uVar2;
        if (local_14 != 0) {
          local_1c = (float)local_c;
          do {
            local_18 = (uint)*(ushort *)((int)param_1 + 6);
            puVar3 = (undefined4 *)
                     FUN_00415a71(param_1,local_2c,
                                  ((float)local_8 / (float)local_14) * (float)local_18,
                                  (local_1c / (float)*(ushort *)((int)this + 8)) *
                                  (float)*(ushort *)(param_1 + 2));
            *local_10 = *puVar3;
            local_10[1] = puVar3[1];
            puVar1 = local_10 + 3;
            local_10[2] = puVar3[2];
            local_10 = local_10 + 4;
            local_8 = local_8 + 1;
            *puVar1 = puVar3[3];
            uVar2 = *(ushort *)((int)this + 6);
            local_14 = (uint)uVar2;
          } while (local_8 < (int)local_14);
        }
        local_c = local_c + 1;
      } while (local_c < (int)(uint)*(ushort *)((int)this + 8));
    }
  }
  return;
}


// ==== FUN_00415e32 @ 00415e32 ====

void __thiscall FUN_00415e32(void *this,int *param_1,undefined4 *param_2)

{
  undefined4 *puVar1;
  ushort uVar2;
  undefined4 *puVar3;
  int local_28 [4];
  float local_18;
  uint local_14;
  undefined4 *local_10;
  int local_c;
  int local_8;
  
  uVar2 = *(ushort *)((int)this + 6);
  if ((*(ushort *)((int)param_1 + 6) == uVar2) && ((short)param_1[2] == *(short *)((int)this + 8)))
  {
    local_10 = (undefined4 *)*param_1;
    local_c = 0;
    param_1 = *(int **)this;
    if (*(short *)((int)this + 8) != 0) {
      do {
        local_8 = 0;
        if (uVar2 != 0) {
          do {
            FUN_00415fbb(param_1,*local_10,local_10[1],local_10[2],local_10[3],(uint)param_2);
            uVar2 = *(ushort *)((int)this + 6);
            param_1 = param_1 + 4;
            local_10 = local_10 + 4;
            local_8 = local_8 + 1;
          } while (local_8 < (int)(uint)uVar2);
        }
        local_c = local_c + 1;
      } while (local_c < (int)(uint)*(ushort *)((int)this + 8));
    }
  }
  else {
    param_2 = *(undefined4 **)this;
    local_c = 0;
    if (*(short *)((int)this + 8) != 0) {
      do {
        local_8 = 0;
        local_10 = (undefined4 *)(uint)uVar2;
        if (local_10 != (undefined4 *)0x0) {
          local_18 = (float)local_c;
          do {
            local_14 = (uint)*(ushort *)((int)param_1 + 6);
            puVar3 = (undefined4 *)
                     FUN_00415a71(param_1,local_28,
                                  ((float)local_8 / (float)(int)local_10) * (float)local_14,
                                  (local_18 / (float)*(ushort *)((int)this + 8)) *
                                  (float)*(ushort *)(param_1 + 2));
            *param_2 = *puVar3;
            param_2[1] = puVar3[1];
            puVar1 = param_2 + 3;
            param_2[2] = puVar3[2];
            param_2 = param_2 + 4;
            local_8 = local_8 + 1;
            *puVar1 = puVar3[3];
            uVar2 = *(ushort *)((int)this + 6);
            local_10 = (undefined4 *)(uint)uVar2;
          } while (local_8 < (int)local_10);
        }
        local_c = local_c + 1;
      } while (local_c < (int)(uint)*(ushort *)((int)this + 8));
    }
  }
  return;
}


// ==== FUN_00415f44 @ 00415f44 ====

void __thiscall FUN_00415f44(void *this,int *param_1)

{
  int iVar1;
  int iVar2;
  float *pfVar3;
  
  if (param_1 != (int *)0x0) {
    iVar1 = (uint)*(ushort *)((int)this + 8) * (uint)*(ushort *)((int)this + 6);
    pfVar3 = *(float **)this;
    if (0 < iVar1) {
      do {
        iVar2 = FUN_00414cf7(pfVar3);
        *param_1 = iVar2;
        pfVar3 = pfVar3 + 4;
        param_1 = param_1 + 1;
        iVar1 = iVar1 + -1;
      } while (iVar1 != 0);
    }
  }
  return;
}


// ==== FUN_00415f7a @ 00415f7a ====

void __thiscall FUN_00415f7a(void *this,float *param_1)

{
  float *pfVar1;
  CRect *pCVar2;
  float *pfVar3;
  CRect local_18 [16];
  int local_8;
  
  local_8 = (uint)*(ushort *)((int)this + 8) * (uint)*(ushort *)((int)this + 6);
  pfVar3 = *(float **)this;
  if (0 < local_8) {
    do {
      pCVar2 = FUN_00415ff3(local_18,pfVar3,param_1);
      *pfVar3 = *(float *)pCVar2;
      pfVar3[1] = *(float *)(pCVar2 + 4);
      pfVar1 = pfVar3 + 3;
      pfVar3[2] = *(float *)(pCVar2 + 8);
      pfVar3 = pfVar3 + 4;
      local_8 = local_8 + -1;
      *pfVar1 = *(float *)(pCVar2 + 0xc);
    } while (local_8 != 0);
  }
  return;
}


// ==== FUN_00415fbb @ 00415fbb ====

void __thiscall
FUN_00415fbb(void *this,undefined4 param_1,undefined4 param_2,undefined4 param_3,undefined4 param_4,
            uint param_5)

{
  if ((param_5 & 0xff000000) != 0) {
    *(undefined4 *)this = param_1;
  }
  if ((param_5 & 0xff0000) != 0) {
    *(undefined4 *)((int)this + 4) = param_2;
  }
  if ((char)(param_5 >> 8) != '\0') {
    *(undefined4 *)((int)this + 8) = param_3;
  }
  if ((char)param_5 != '\0') {
    *(undefined4 *)((int)this + 0xc) = param_4;
  }
  return;
}


// ==== FUN_00415ff3 @ 00415ff3 ====

CRect * FUN_00415ff3(CRect *param_1,float *param_2,float *param_3)

{
  CRect::CRect(param_1,(int)(*param_2 * *param_3),(int)(param_2[1] * param_3[1]),
               (int)(param_2[2] * param_3[2]),(int)(param_2[3] * param_3[3]));
  return param_1;
}


// ==== FUN_00416036 @ 00416036 ====

void FUN_00416036(byte param_1,int param_2,int param_3,int *param_4)

{
  undefined1 *puVar1;
  int *piVar2;
  undefined4 *this;
  int iVar3;
  uint uVar4;
  int iVar5;
  undefined1 local_10 [12];
  
  if (DAT_00479238 == '\0') {
    puVar1 = &DAT_00478a38;
    do {
      *puVar1 = 0;
      puVar1 = puVar1 + 8;
    } while ((int)puVar1 < 0x479238);
    DAT_00479238 = '\x01';
  }
  iVar5 = (uint)param_1 * 8;
  if ((&DAT_00478a38)[iVar5] == '\0') {
    FUN_0041254d(local_10,&LAB_00416031);
    piVar2 = FUN_00401c3b(param_1,(int *)0x0);
    this = FUN_00412662(local_10,(uint)piVar2);
    FUN_00415f44(this,param_4);
    if (this != (undefined4 *)0x0) {
      FUN_00412220(this,1);
    }
    uVar4 = param_2 * param_3 * 4;
    iVar3 = FUN_004042e0(uVar4);
    *(int *)(&DAT_00478a3c + iVar5) = iVar3;
    FUN_004042b5(iVar3,(int)param_4,uVar4);
    (&DAT_00478a38)[iVar5] = 1;
    FUN_00412658((int)local_10);
  }
  else {
    FUN_004042b5((int)param_4,*(int *)(&DAT_00478a3c + iVar5),param_2 * param_3 * 4);
  }
  return;
}


// ==== FUN_004160ff @ 004160ff ====

undefined4 FUN_004160ff(void)

{
  ushort uVar1;
  undefined4 uVar2;
  undefined4 *puVar3;
  int *this;
  
  uVar2 = FUN_004014ef(0x280,0x1e0);
  if ((char)uVar2 == '\0') {
    FUN_0040153c();
    return 0;
  }
  puVar3 = (undefined4 *)FUN_004042e0(0x10);
  if (puVar3 == (undefined4 *)0x0) {
    this = (int *)0x0;
  }
  else {
    this = (int *)FUN_00402d46(puVar3);
  }
  FUN_00402e4e(this);
  FUN_00402d87(this,0xffff);
  this[2] = 0;
  FUN_00403039();
  FUN_004030ba(0);
  while (DAT_00474620 == '\0') {
    FUN_00402d87(this,0);
    FUN_0040149b();
    uVar1 = FUN_004030ef();
    if (0x2c0f < uVar1) {
      DAT_00474620 = '\x01';
    }
  }
  if (this != (int *)0x0) {
    FUN_0041619f(this,1);
  }
  FUN_0040153c();
  return 0;
}


// ==== FUN_0041619f @ 0041619f ====

int * __thiscall FUN_0041619f(void *this,byte param_1)

{
  FUN_00402d56(this);
  if ((param_1 & 1) != 0) {
    FUN_004042eb((int)this);
  }
  return this;
}


// ==== FUN_004161bc @ 004161bc ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_004161bc(void)

{
                    /* WARNING: Could not recover jumptable at 0x004161bc. Too many branches */
                    /* WARNING: Treating indirect jump as call */
  (*_DAT_004170a8)();
  return;
}


