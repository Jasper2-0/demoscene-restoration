// ==== forced_0x4072b0 @ 004072b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x4072b0(int param_1,int *param_2,float param_3)

{
  float fVar1;
  undefined4 uVar2;
  undefined4 uVar3;
  float fVar4;
  int iVar5;
  float10 fVar6;
  float10 fVar7;
  float10 fVar8;
  longlong lVar9;
  
  fVar6 = FUN_00430aef((double)((float)param_2 * (float)_DAT_0045a4f8));
  fVar8 = (float10)_DAT_0045a4f0;
  fVar7 = (float10)FUN_00430bc0();
  if ((float)(fVar6 * fVar8) < (float)_DAT_0045a4f0) {
    fVar7 = fVar7 * (float10)_DAT_0045a32c;
  }
  iVar5 = *(int *)(param_1 + 8);
  fVar8 = (float10)fsin((float10)((float)param_2 - (float)(fVar6 * fVar8)) * (float10)_DAT_0045a4d8)
  ;
  lVar9 = __ftol();
  *(int *)(iVar5 + 0x14) = (int)lVar9;
  lVar9 = __ftol();
  *(int *)(iVar5 + 0x18) = (int)lVar9;
  FUN_0040b790();
  FUN_004150b0(*(void **)(param_1 + 4),param_2,param_3);
  fVar4 = (float)(fVar7 * fVar8) * _DAT_0045a330;
  iVar5 = FUN_004150a0(*(void **)(param_1 + 4),0);
  fVar1 = *(float *)(iVar5 + 0x4c);
  uVar2 = *(undefined4 *)(iVar5 + 0x50);
  uVar3 = *(undefined4 *)(iVar5 + 0x54);
  iVar5 = FUN_004150a0(*(void **)(param_1 + 4),0);
  *(float *)(iVar5 + 0x4c) = fVar4 + fVar1;
  *(undefined4 *)(iVar5 + 0x50) = uVar2;
  *(undefined4 *)(iVar5 + 0x54) = uVar3;
  *(undefined1 *)(iVar5 + 0xbc) = 0;
  iVar5 = FUN_004150a0(*(void **)(param_1 + 4),0);
  FUN_004151e0(*(void **)(param_1 + 4),iVar5);
  FUN_0040ab50(*(int *)(param_1 + 8));
  return;
}


// ==== forced_0x407800 @ 00407800 ====

void __thiscall forced_0x407800(int param_1,float param_2)

{
  int *piVar1;
  int iVar2;
  int iVar3;
  int *piVar4;
  undefined4 uVar5;
  int iVar6;
  int iVar7;
  int *unaff_retaddr;
  int iVar8;
  int iVar9;
  int iStack_c;
  
  DAT_004a900c = 1;
  (**(code **)(**(int **)(param_1 + 0x20) + 4))(0x3f733333);
  FUN_004150b0(*(void **)(param_1 + 4),unaff_retaddr,param_2);
  iVar2 = FUN_004150a0(*(void **)(param_1 + 4),0);
  FUN_004151e0(*(void **)(param_1 + 4),iVar2);
  piVar1 = *(int **)(*(int *)(param_1 + 4) + 0x68);
  if ((piVar1 != (int *)0x0) &&
     (0 < (int)(*(int *)(*(int *)(param_1 + 4) + 0x6c) - (int)piVar1 & 0xfffffffcU))) {
    iVar2 = *piVar1;
    iVar9 = 0;
    while( true ) {
      if (*(int *)(iVar2 + 0xd8) == 0) {
        iVar3 = 0;
      }
      else {
        iVar3 = *(int *)(iVar2 + 0xdc) - *(int *)(iVar2 + 0xd8) >> 2;
      }
      if (iVar3 <= iVar9) break;
      iVar3 = *(int *)(*(int *)(iVar2 + 0xd8) + iVar9 * 4);
      iVar7 = 0;
      iVar8 = 0;
      while( true ) {
        if (*(int *)(iVar3 + 0x18) == 0) {
          iVar6 = 0;
        }
        else {
          iVar6 = (*(int *)(iVar3 + 0x1c) - *(int *)(iVar3 + 0x18)) / 0x14;
        }
        if (iVar6 <= iVar7) break;
        iVar6 = 0;
        if (*(int *)(iVar3 + 0x18) != 0) {
          iVar6 = (*(int *)(iVar3 + 0x1c) - *(int *)(iVar3 + 0x18)) / 0x14;
        }
        piVar1 = *(int **)(*(int *)(param_1 + 0x14) + (iVar6 * iVar9 + iVar7) * 4);
        piVar4 = (int *)(*(int *)(iVar3 + 0x18) + iVar8);
        piVar1[0x13] = *piVar4;
        piVar1[0x14] = piVar4[1];
        piVar1[0x15] = piVar4[2];
        *(undefined1 *)(piVar1 + 0x2f) = 0;
        FUN_0040d440(piVar1,param_2);
        iVar6 = *piVar1;
        uVar5 = FUN_004150a0(*(void **)(param_1 + 4),0);
        (**(code **)(iVar6 + 4))(uVar5);
        iVar7 = iVar7 + 1;
        iVar8 = iVar8 + 0x14;
        param_1 = iStack_c;
      }
      iVar9 = iVar9 + 1;
    }
    DAT_004a900c = 0;
    return;
  }
  DAT_004a900c = 0;
  return;
}


// ==== forced_0x408460 @ 00408460 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x408460(int param_1,int *param_2,float param_3)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  int iVar8;
  
  FUN_0040b790();
  FUN_004150b0(*(void **)(param_1 + 4),param_2,param_3);
  fVar1 = -*(float *)(param_1 + 0xc) / param_3 + *(float *)(param_1 + 0x10);
  *(float *)(param_1 + 0x10) = fVar1;
  *(float *)(param_1 + 0xc) = fVar1 * param_3 + *(float *)(param_1 + 0xc);
  *(float *)(param_1 + 0x10) =
       *(float *)(param_1 + 0x10) - param_3 * *(float *)(param_1 + 0x10) * _DAT_0045a580;
  param_3 = param_3 + *(float *)(param_1 + 8);
  fVar1 = (float)_DAT_0045a578;
  *(float *)(param_1 + 8) = param_3;
  if (fVar1 <= param_3) {
    fVar1 = (float)_DAT_0045a578;
    *(undefined4 *)(param_1 + 0x10) = 0x42480000;
    *(undefined4 *)(param_1 + 0xc) = 0x40000000;
    *(float *)(param_1 + 8) = param_3 - fVar1;
  }
  fVar1 = *(float *)(param_1 + 0xc);
  fVar2 = *(float *)(param_1 + 0x14);
  fVar3 = *(float *)(param_1 + 0x18);
  fVar4 = *(float *)(param_1 + 0x1c);
  fVar6 = fVar1 * *(float *)(param_1 + 0x20) * _DAT_0045a390;
  fVar7 = fVar1 * *(float *)(param_1 + 0x24) * _DAT_0045a390;
  fVar5 = fVar1 * *(float *)(param_1 + 0x28) * _DAT_0045a390;
  fVar1 = *(float *)(param_1 + 0xc);
  iVar8 = FUN_004150a0(*(void **)(param_1 + 4),0);
  *(float *)(iVar8 + 0x4c) = fVar6 + fVar2;
  *(float *)(iVar8 + 0x50) = fVar3 + fVar7;
  *(float *)(iVar8 + 0x54) = fVar5 + fVar4 + fVar1;
  *(undefined1 *)(iVar8 + 0xbc) = 0;
  iVar8 = FUN_004150a0(*(void **)(param_1 + 4),0);
  FUN_004151e0(*(void **)(param_1 + 4),iVar8);
  return;
}


// ==== forced_0x4087a0 @ 004087a0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x4087a0(int param_1,int *param_2,float param_3)

{
  int iVar1;
  float *pfVar2;
  float10 fVar3;
  
  fVar3 = (float10)FUN_00430dea(param_1);
  pfVar2 = (float *)&DAT_00463c2c;
  do {
    if (((*pfVar2 <= (float)fVar3) && ((float)fVar3 < *pfVar2 + (float)_DAT_0045a598)) &&
       (DAT_00468f24 == '\0')) {
      DAT_00468f24 = '\x01';
      _DAT_00463c64 = _DAT_0045a30c;
    }
    pfVar2 = pfVar2 + 1;
  } while ((int)pfVar2 < 0x463c64);
  if ((float)_DAT_0045a598 < _DAT_00463c64) {
    DAT_00468f24 = '\0';
  }
  FUN_004150b0(*(void **)(param_1 + 4),param_2,param_3);
  if (DAT_00468f24 == '\0') {
    FUN_0040b790();
  }
  iVar1 = FUN_004150a0(*(void **)(param_1 + 4),0);
  FUN_004151e0(*(void **)(param_1 + 4),iVar1);
  _DAT_00463c64 = _DAT_00463c64 + param_3;
  return;
}


// ==== forced_0x407270 @ 00407270 ====

void __fastcall forced_0x407270(int param_1)

{
  if (*(undefined4 **)(param_1 + 4) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 4))(1);
  }
  if (*(undefined4 **)(param_1 + 8) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 8))(1);
  }
  *(undefined4 *)(param_1 + 4) = 0;
  *(undefined4 *)(param_1 + 8) = 0;
  *(undefined4 *)(param_1 + 0xc) = 0;
  *(undefined4 *)(param_1 + 0x10) = 0;
  *(undefined4 *)(param_1 + 0x14) = 0x41f00000;
  return;
}


// ==== forced_0x407740 @ 00407740 ====

/* WARNING: Removing unreachable block (ram,0x00407774) */
/* WARNING: Removing unreachable block (ram,0x004077d5) */

void __fastcall forced_0x407740(int param_1)

{
  int *piVar1;
  
  piVar1 = *(int **)(param_1 + 0x14);
  if (piVar1 != *(int **)(param_1 + 0x18)) {
    do {
      if ((undefined4 *)*piVar1 != (undefined4 *)0x0) {
        (*(code *)**(undefined4 **)*piVar1)(1);
      }
      piVar1 = piVar1 + 1;
    } while (piVar1 != *(int **)(param_1 + 0x18));
  }
  *(undefined4 *)(param_1 + 0x18) = *(undefined4 *)(param_1 + 0x14);
  if (*(undefined4 **)(param_1 + 0xc) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 0xc))(1);
  }
  if (*(undefined4 **)(param_1 + 0x20) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 0x20))(1);
  }
  if (*(undefined4 **)(param_1 + 8) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 8))(1);
  }
  if (*(undefined4 **)(param_1 + 4) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 4))(1);
  }
  *(undefined4 *)(param_1 + 4) = 0;
  *(undefined4 *)(param_1 + 8) = 0;
  *(undefined4 *)(param_1 + 0xc) = 0;
  *(undefined4 *)(param_1 + 0x18) = *(undefined4 *)(param_1 + 0x14);
  *(undefined4 *)(param_1 + 0x20) = 0;
  return;
}


// ==== FUN_00408430 @ 00408430 ====

void __fastcall FUN_00408430(int param_1)

{
  if (*(undefined4 **)(param_1 + 4) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 4))(1);
  }
  *(undefined4 *)(param_1 + 4) = 0;
  *(undefined4 *)(param_1 + 8) = 0;
  *(undefined4 *)(param_1 + 0xc) = 0;
  *(undefined4 *)(param_1 + 0x10) = 0;
  return;
}


// ==== FUN_00408750 @ 00408750 ====

void __fastcall FUN_00408750(int param_1)

{
  if (*(undefined4 **)(param_1 + 4) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 4))(1);
  }
  if (*(undefined4 **)(param_1 + 8) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 8))(1);
  }
  if (*(undefined4 **)(param_1 + 0xc) != (undefined4 *)0x0) {
    (**(code **)**(undefined4 **)(param_1 + 0xc))(1);
  }
  *(undefined4 *)(param_1 + 4) = 0;
  *(undefined4 *)(param_1 + 8) = 0;
  *(undefined4 *)(param_1 + 0xc) = 0;
  return;
}


// ==== FUN_00407490 @ 00407490 ====

void FUN_00407490(void)

{
  char cVar1;
  void *this;
  undefined4 *puVar2;
  undefined4 uVar3;
  int iVar4;
  uint uVar5;
  uint uVar6;
  int iVar7;
  char *pcVar8;
  int iVar9;
  undefined4 local_3c;
  char *local_38;
  undefined4 *local_2c;
  void *local_28;
  undefined4 *local_24;
  int local_20;
  uint local_1c;
  undefined1 local_15;
  undefined1 *local_14;
  void *local_10;
  undefined1 *puStack_c;
  int local_8;
  
  puStack_c = &LAB_004579ca;
  local_10 = ExceptionList;
  local_14 = &stack0xffffffb8;
  local_1c = 0;
  local_8 = 0;
  ExceptionList = &local_10;
  this = operator_new(0x100);
  local_8._0_1_ = 1;
  local_28 = this;
  if (this == (void *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    local_3c._0_1_ = local_15;
    FUN_004034d0(&local_3c,'\0');
    uVar5 = 0xffffffff;
    pcVar8 = &DAT_00463af4;
    do {
      if (uVar5 == 0) break;
      uVar5 = uVar5 - 1;
      cVar1 = *pcVar8;
      pcVar8 = pcVar8 + 1;
    } while (cVar1 != '\0');
    FUN_00403aa0(&local_3c,(undefined4 *)&DAT_00463af4,~uVar5 - 1);
    local_1c = 1;
    local_8 = CONCAT31(local_8._1_3_,2);
    puVar2 = FUN_00414880(this,(undefined1 *)&local_3c);
  }
  *(undefined4 **)(local_20 + 4) = puVar2;
  local_8 = 0;
  if ((local_1c & 1) != 0) {
    local_1c = local_1c & 0xfffffffe;
    FUN_004034d0(&local_3c,'\x01');
  }
  puVar2 = operator_new(0x180);
  local_8 = CONCAT31(local_8._1_3_,4);
  local_24 = puVar2;
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    local_3c._0_1_ = local_15;
    FUN_004034d0(&local_3c,'\0');
    uVar5 = 0xffffffff;
    pcVar8 = s_data_particles_tauno_tauno_txt_00463ad4;
    do {
      if (uVar5 == 0) break;
      uVar5 = uVar5 - 1;
      cVar1 = *pcVar8;
      pcVar8 = pcVar8 + 1;
    } while (cVar1 != '\0');
    uVar5 = ~uVar5 - 1;
    uVar3 = FUN_004033b0(&local_3c,uVar5,'\x01');
    if ((char)uVar3 != '\0') {
      pcVar8 = s_data_particles_tauno_tauno_txt_00463ad4;
      for (uVar6 = uVar5 >> 2; uVar6 != 0; uVar6 = uVar6 - 1) {
        *(undefined4 *)local_38 = *(undefined4 *)pcVar8;
        pcVar8 = pcVar8 + 4;
        local_38 = local_38 + 4;
      }
      for (uVar6 = uVar5 & 3; uVar6 != 0; uVar6 = uVar6 - 1) {
        *local_38 = *pcVar8;
        pcVar8 = pcVar8 + 1;
        local_38 = local_38 + 1;
      }
      FUN_00403390(&local_3c,uVar5);
      puVar2 = local_24;
    }
    local_1c = local_1c | 2;
    local_8 = CONCAT31(local_8._1_3_,5);
    puVar2 = FUN_0040c620(puVar2,&local_3c);
  }
  *(undefined4 **)(local_20 + 0xc) = puVar2;
  local_8 = 0;
  if ((local_1c & 2) != 0) {
    FUN_004034d0(&local_3c,'\x01');
  }
  puVar2 = *(undefined4 **)(*(int *)(local_20 + 4) + 0x68);
  if ((puVar2 != (undefined4 *)0x0) &&
     (0 < (int)(*(int *)(*(int *)(local_20 + 4) + 0x6c) - (int)puVar2 & 0xfffffffcU))) {
    local_28 = (void *)*puVar2;
    local_1c = 0;
    while( true ) {
      if (*(int *)((int)local_28 + 0xd8) == 0) {
        iVar4 = 0;
      }
      else {
        iVar4 = *(int *)((int)local_28 + 0xdc) - *(int *)((int)local_28 + 0xd8) >> 2;
      }
      if (iVar4 <= (int)local_1c) break;
      iVar4 = *(int *)(*(int *)((int)local_28 + 0xd8) + local_1c * 4);
      iVar9 = 0;
      while( true ) {
        iVar7 = *(int *)(iVar4 + 0x18);
        if (iVar7 == 0) {
          iVar7 = 0;
        }
        else {
          iVar7 = (*(int *)(iVar4 + 0x1c) - iVar7) / 0x14;
        }
        if (iVar7 <= iVar9) break;
        local_2c = operator_new(0x180);
        local_8._0_1_ = 7;
        if (local_2c == (void *)0x0) {
          local_24 = (undefined4 *)0x0;
        }
        else {
          local_24 = FUN_0040cdc0(local_2c,*(uint *)(local_20 + 0xc));
        }
        local_8 = (uint)local_8._1_3_ << 8;
        FUN_0041c5b0((void *)(local_20 + 0x10),*(undefined4 **)(local_20 + 0x18),1,&local_24);
        iVar9 = iVar9 + 1;
      }
      local_1c = local_1c + 1;
    }
  }
  puVar2 = operator_new(0x14);
  local_8 = CONCAT31(local_8._1_3_,8);
  if (puVar2 == (undefined4 *)0x0) {
    puVar2 = (undefined4 *)0x0;
  }
  else {
    local_2c = puVar2;
    FUN_00404840(puVar2);
    *puVar2 = &PTR_FUN_0045a2d0;
  }
  *(undefined4 **)(local_20 + 0x20) = puVar2;
  *(undefined4 *)(puVar2[1] + 0x58) = 3;
  iVar4 = *(int *)(local_20 + 0x20);
  iVar9 = *(int *)(iVar4 + 4);
  *(undefined4 *)(iVar9 + 0x1c) = 0;
  *(undefined4 *)(iVar9 + 0x20) = 0;
  *(undefined4 *)(iVar9 + 0x24) = 0;
  *(undefined4 *)(iVar4 + 8) = 0;
  *(undefined4 *)(iVar4 + 0xc) = 0;
  *(undefined4 *)(iVar4 + 0x10) = 0;
  ExceptionList = local_10;
  return;
}


// ==== FUN_00407b30 @ 00407b30 ====

void FUN_00407b30(void)

{
  char cVar1;
  void *this;
  undefined4 uVar2;
  undefined4 *puVar3;
  uint uVar4;
  uint uVar5;
  bool bVar6;
  char *pcVar7;
  char *pcVar8;
  undefined1 local_34 [4];
  char *local_30;
  uint local_2c;
  undefined4 local_28;
  undefined4 local_24;
  void *local_20;
  int local_1c;
  undefined1 local_15;
  undefined1 *local_14;
  void *local_10;
  undefined1 *puStack_c;
  undefined4 local_8;
  
  puStack_c = &LAB_00457a32;
  local_10 = ExceptionList;
  local_14 = &stack0xffffffc0;
  bVar6 = false;
  local_24 = 0;
  local_8 = 0;
  ExceptionList = &local_10;
  this = operator_new(0x100);
  local_8._0_1_ = 1;
  local_20 = this;
  if (this == (void *)0x0) {
    puVar3 = (undefined4 *)0x0;
  }
  else {
    uVar4 = 0xffffffff;
    local_30 = (char *)0x0;
    local_2c = 0;
    local_28 = 0;
    local_34[0] = local_15;
    pcVar7 = s_data_rad_out_lws_00463b50;
    do {
      if (uVar4 == 0) break;
      uVar4 = uVar4 - 1;
      cVar1 = *pcVar7;
      pcVar7 = pcVar7 + 1;
    } while (cVar1 != '\0');
    uVar4 = ~uVar4 - 1;
    uVar2 = FUN_004033b0(local_34,uVar4,'\x01');
    if ((char)uVar2 != '\0') {
      pcVar7 = s_data_rad_out_lws_00463b50;
      pcVar8 = local_30;
      for (uVar5 = uVar4 >> 2; uVar5 != 0; uVar5 = uVar5 - 1) {
        *(undefined4 *)pcVar8 = *(undefined4 *)pcVar7;
        pcVar7 = pcVar7 + 4;
        pcVar8 = pcVar8 + 4;
      }
      for (uVar5 = uVar4 & 3; uVar5 != 0; uVar5 = uVar5 - 1) {
        *pcVar8 = *pcVar7;
        pcVar7 = pcVar7 + 1;
        pcVar8 = pcVar8 + 1;
      }
      local_30[uVar4] = '\0';
      this = local_20;
      local_2c = uVar4;
    }
    bVar6 = true;
    local_24 = 1;
    local_8._0_1_ = 2;
    puVar3 = FUN_00414880(this,local_34);
  }
  *(undefined4 **)(local_1c + 4) = puVar3;
  if ((bVar6) && (local_30 != (char *)0x0)) {
    pcVar7 = local_30 + -1;
    cVar1 = *pcVar7;
    if ((cVar1 == '\0') || (cVar1 == -1)) {
      FUN_0042d95a(pcVar7);
      ExceptionList = local_10;
      return;
    }
    *pcVar7 = cVar1 + -1;
  }
  ExceptionList = local_10;
  return;
}


