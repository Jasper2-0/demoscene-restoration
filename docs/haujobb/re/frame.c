// ==== FUN_00407190 @ 00407190 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00407190(int param_1)

{
  DWORD DVar1;
  DWORD DVar2;
  DWORD DVar3;
  DWORD DVar4;
  int iVar5;
  longlong lVar6;
  DWORD DStack_1c;
  
  iVar5 = 0;
  FUN_00406df0();
  if (DAT_00488a78 == 0) {
    if (DAT_00444158 == 0) {
      lVar6 = __ftol();
      BASS_ChannelSetPosition(DAT_00488654,(int)lVar6);
      BASS_StreamPlay(DAT_00488654,0,0);
    }
    else if (DAT_00444158 == 1) {
      BASS_MusicPlayEx(DAT_00488650,0,0xffffffff,1);
    }
  }
  if (DAT_00444158 == 0) {
    GetTickCount();
    BASS_ChannelGetPosition(DAT_00488654);
    lVar6 = __ftol();
    DVar4 = (DWORD)lVar6;
  }
  else {
    DVar4 = GetTickCount();
    DVar4 = DVar4 + DAT_00488a74 * -1000;
  }
  DStack_1c = 0;
  DVar1 = GetTickCount();
  while ((DAT_004886dc == 0 && (iVar5 < DAT_00480520))) {
    FUN_00402130();
    FUN_00406df0();
    SwapBuffers(DAT_00488668);
    do {
      DVar2 = GetTickCount();
      DVar2 = DVar2 - DVar4;
    } while (DVar2 == DStack_1c);
    DStack_1c = DVar2;
    if (*(int *)(DAT_0048051c + iVar5 * 0x28) < (int)DVar2) {
      do {
        if ((DAT_00444158 == 0) && (DVar3 = GetTickCount(), DVar1 + 10000 < DVar3)) {
          GetTickCount();
          BASS_ChannelGetPosition(DAT_00488654);
          lVar6 = __ftol();
          DVar4 = (DWORD)lVar6;
          DVar1 = GetTickCount();
        }
        iVar5 = iVar5 + 1;
        if ((DAT_00480520 <= iVar5) && (param_1 != 0)) {
          iVar5 = 0;
          if (DAT_00488a78 == 0) {
            DVar2 = 0;
          }
          else {
            DVar4 = GetTickCount();
            DStack_1c = DVar4;
          }
        }
      } while (*(int *)(DAT_0048051c + iVar5 * 0x28) < (int)DVar2);
    }
  }
  BASS_Free();
  return;
}


// ==== FUN_004043f0 @ 004043f0 ====

void __cdecl FUN_004043f0(undefined4 param_1,undefined4 param_2)

{
  void *this;
  int iVar1;
  undefined *local_14;
  undefined4 local_10;
  void *local_c;
  undefined1 *puStack_8;
  int local_4;
  
  puStack_8 = &LAB_0043a8a0;
  local_c = ExceptionList;
  local_14 = PTR_DAT_00447090;
  local_4._0_1_ = 1;
  local_4._1_3_ = 0;
  ExceptionList = &local_c;
  FUN_00433710(&local_14,&param_1);
  iVar1 = DAT_0044a8d8;
  local_10 = param_2;
  FUN_00407c10(&DAT_0044a8d0,DAT_0044a8d8 + 1,0xffffffff);
  this = (void *)(DAT_0044a8d4 + iVar1 * 8);
  FUN_00433710(this,(int *)&local_14);
  *(undefined4 *)((int)this + 4) = local_10;
  local_4 = (uint)local_4._1_3_ << 8;
  FUN_00433623((int *)&local_14);
  local_4 = 0xffffffff;
  FUN_00433623(&param_1);
  ExceptionList = local_c;
  return;
}


// ==== FUN_00406c20 @ 00406c20 ====

void __fastcall FUN_00406c20(int param_1)

{
  *(undefined **)(param_1 + 8) = PTR_DAT_00447090;
  *(undefined **)(param_1 + 0xc) = PTR_DAT_00447090;
  *(undefined **)(param_1 + 0x10) = PTR_DAT_00447090;
  *(undefined **)(param_1 + 0x14) = PTR_DAT_00447090;
  return;
}


// ==== FUN_00402540 @ 00402540 ====

void __cdecl FUN_00402540(int param_1,undefined4 *param_2)

{
  int iVar1;
  int iVar2;
  int *piVar3;
  void *pvVar4;
  int iVar5;
  int iVar6;
  int iVar7;
  int iVar8;
  char unaff_BP;
  int iVar9;
  undefined *puVar10;
  undefined4 uVar11;
  int local_8;
  
  piVar3 = FUN_00432916(0xc);
  FUN_004019e0(param_1);
  pvVar4 = _malloc(*piVar3 * piVar3[1] * 3);
  piVar3[2] = (int)pvVar4;
  iVar5 = piVar3[1];
  param_1 = 0;
  if (0 < iVar5) {
    do {
      iVar1 = *piVar3;
      iVar9 = 0;
      iVar2 = iVar1 * param_1 * 3;
      if (0 < iVar1) {
        iVar6 = 0;
        do {
          iVar7 = ((iVar5 - param_1) + -1) * iVar1 * 3 + iVar6;
          *(undefined1 *)(piVar3[2] + iVar6 + 2 + iVar2) = *(undefined1 *)(iVar7 + local_8);
          *(undefined1 *)(piVar3[2] + iVar6 + 1 + iVar2) = *(undefined1 *)(iVar7 + 1 + local_8);
          iVar8 = piVar3[2] + iVar6;
          iVar9 = iVar9 + 1;
          iVar6 = iVar6 + 3;
          *(undefined1 *)(iVar8 + iVar2) = *(undefined1 *)(iVar7 + 2 + local_8);
        } while (iVar9 < *piVar3);
      }
      iVar5 = piVar3[1];
      param_1 = param_1 + 1;
    } while (param_1 < iVar5);
  }
  glGenTextures(1,param_2);
  glBindTexture(0xde1,*param_2);
  glTexParameteri(0xde1,0x2800,0x2601);
  if (unaff_BP == '\0') {
    uVar11 = 0x2601;
  }
  else {
    uVar11 = 0x2701;
  }
  glTexParameteri(0xde1,0x2801,uVar11);
  puVar10 = (undefined *)piVar3[1];
  glTexImage2D(0xde1,0,3,*piVar3,puVar10,0,0x1907,0x1401,piVar3[2]);
  if (unaff_BP != '\0') {
    gluBuild2DMipmaps(0xde1,0x1907,*piVar3,piVar3[1],0x1907,0x1401,piVar3[2]);
  }
  FUN_004229f7(puVar10);
  return;
}


// ==== FUN_00406df0 @ 00406df0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void FUN_00406df0(void)

{
  bool bVar1;
  bool bVar2;
  int iVar3;
  undefined3 extraout_var;
  int iVar4;
  undefined4 *puVar5;
  undefined4 *puVar6;
  byte *pbStack_90;
  undefined4 uStack_8c;
  undefined1 auStack_58 [16];
  undefined4 uStack_48;
  undefined4 uStack_44;
  int iStack_40;
  int iStack_3c;
  int iStack_38;
  byte *pbStack_34;
  float fStack_30;
  undefined1 uStack_2c;
  undefined1 uStack_2b;
  undefined4 uStack_28;
  undefined4 uStack_24;
  void *pvStack_20;
  undefined4 uStack_18;
  int iStack_10;
  void *pvStack_c;
  undefined1 *puStack_8;
  undefined4 uStack_4;
  
  uStack_4 = 0xffffffff;
  puStack_8 = &LAB_0043ab40;
  pvStack_c = ExceptionList;
  iVar4 = 0;
  bVar1 = false;
  ExceptionList = &pvStack_c;
  FUN_00401d40(DAT_00488664,DAT_00488660);
  glClearColor();
  glClear();
  uStack_48 = *(undefined4 *)(DAT_0048051c + iStack_10 * 0x28);
  iVar3 = DAT_0048051c + iStack_10 * 0x28;
  uStack_44 = *(undefined4 *)(iVar3 + 4);
  FUN_004333b6(&iStack_40,(int *)(iVar3 + 8));
  uStack_18 = 0;
  FUN_004333b6(&iStack_3c,(int *)(iVar3 + 0xc));
  uStack_18._0_1_ = 1;
  FUN_004333b6(&iStack_38,(int *)(iVar3 + 0x10));
  uStack_18 = CONCAT31(uStack_18._1_3_,2);
  FUN_004333b6(&pbStack_34,(int *)(iVar3 + 0x14));
  fStack_30 = *(float *)(iVar3 + 0x18);
  uStack_2c = *(undefined1 *)(iVar3 + 0x1c);
  uStack_2b = *(undefined1 *)(iVar3 + 0x1d);
  uStack_28 = *(undefined4 *)(iVar3 + 0x20);
  uStack_24 = *(undefined4 *)(iVar3 + 0x24);
  uStack_18 = 3;
  puVar5 = &uStack_48;
  if (&stack0x00000000 != (undefined1 *)0x48) {
    do {
      if ((bVar1) && (*(char *)((int)puVar5 + 0x1d) == '\0')) {
        bVar1 = false;
      }
      if (*(char *)((int)puVar5 + 0x1d) == '\x01') {
        bVar1 = true;
      }
      if (puVar5[6] == -1) {
        puVar5 = (undefined4 *)0x0;
      }
      else {
        puVar5 = (undefined4 *)(DAT_00480504 + puVar5[6] * 0x28);
      }
    } while (puVar5 != (undefined4 *)0x0);
  }
  puVar5 = &uStack_48;
  if (&stack0x00000000 != (undefined1 *)0x48) {
    do {
      uStack_8c = 0;
      pbStack_90 = (byte *)0x0;
      glViewport();
      if (iVar4 == 0x4000) {
        FUN_00406cc0((int)auStack_58);
      }
      iVar4 = iVar4 + 1;
      glPushMatrix();
      glClearColor(0);
      glClear(0x100);
      if (*(char *)(puVar5 + 7) == '\x01') {
        FUN_00405440((int)puVar5,fStack_30);
      }
      else {
        iVar3 = FUN_00431d4b(puVar5 + 2,s_standard_00444414);
        if (iVar3 == -1) {
          FUN_004333b6(&pbStack_90,puVar5 + 2);
          iStack_3c._0_1_ = 4;
          FUN_004323e0(&DAT_00488550,pbStack_90,&pbStack_34);
          iVar3 = FUN_00412b60(pbStack_34,puVar5 + 3);
          if (iVar3 != 0) {
            *(int *)(pbStack_34 + 0x10c) = iVar3;
          }
          FUN_00412980(pbStack_34,(float)(int)puVar5[1] + fStack_30,(undefined4 *)0x0);
          iStack_3c._0_1_ = 3;
          FUN_00433623((int *)&pbStack_90);
        }
      }
      if (puVar5[6] == -1) {
        puVar5 = (undefined4 *)0x0;
      }
      else {
        puVar5 = (undefined4 *)(DAT_00480504 + puVar5[6] * 0x28);
      }
      glPopMatrix();
    } while (puVar5 != (undefined4 *)0x0);
  }
  uStack_8c = 0x407044;
  iVar3 = FUN_004232b6(pbStack_34,(byte *)s_standard_00444414);
  if (iVar3 != 0) {
    bVar1 = false;
    uStack_8c = 0x407065;
    bVar2 = FUN_004323e0(&DAT_00488530,pbStack_34,&pvStack_c);
    if (CONCAT31(extraout_var,bVar2) == 0) {
      uStack_8c = 0x407099;
      FUN_004323e0(&DAT_00488570,pbStack_34,&iStack_10);
    }
    else {
      puVar5 = (undefined4 *)(&DAT_00480530 + (int)pvStack_c * 0x20);
      puVar6 = (undefined4 *)&stack0xffffff98;
      for (iVar3 = 8; iVar3 != 0; iVar3 = iVar3 + -1) {
        *puVar6 = *puVar5;
        puVar5 = puVar5 + 1;
        puVar6 = puVar6 + 1;
      }
      bVar1 = true;
    }
    glMatrixMode();
    glPushMatrix();
    glLoadIdentity();
    uStack_8c = 0;
    pbStack_90 = (byte *)0xbff00000;
    glOrtho(0,0,(double)DAT_00488664,0,0);
    if (bVar1) {
      FUN_00403140();
    }
    else {
      FUN_0040cb30();
    }
    glPopMatrix();
  }
  uStack_18 = 7;
  FUN_00433623((int *)&pbStack_34);
  uStack_18._0_1_ = 6;
  FUN_00433623(&iStack_38);
  uStack_18 = CONCAT31(uStack_18._1_3_,5);
  FUN_00433623(&iStack_3c);
  uStack_18 = 0xffffffff;
  FUN_00433623(&iStack_40);
  ExceptionList = pvStack_20;
  return;
}


