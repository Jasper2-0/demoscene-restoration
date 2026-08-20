// ==== FUN_00405830 @ 00405830 ====

undefined4 FUN_00405830(void)

{
  bool bVar1;
  undefined4 *puVar2;
  int *piVar3;
  undefined3 extraout_var;
  uint uVar4;
  void *pvVar5;
  LPCSTR pCVar6;
  int iVar7;
  undefined4 *puVar8;
  undefined4 *puVar9;
  int iVar10;
  int iVar11;
  void *this;
  void *this_00;
  void *this_01;
  void *this_02;
  void *this_03;
  undefined1 uVar12;
  undefined4 unaff_EBX;
  undefined4 *puVar13;
  undefined4 *puVar14;
  undefined4 unaff_EDI;
  undefined4 uVar15;
  undefined4 uVar16;
  char *pcVar17;
  byte *pbStack_27c;
  undefined3 uStack_278;
  undefined1 uStack_275;
  undefined8 uStack_274;
  undefined4 *puStack_26c;
  int iStack_268;
  undefined4 uStack_264;
  undefined4 uStack_260;
  undefined4 uStack_25c;
  undefined4 uStack_258;
  undefined4 uStack_254;
  char *pcVar18;
  int iStack_23c;
  undefined1 *puStack_230;
  undefined4 uStack_22c;
  undefined4 uStack_228;
  undefined *puStack_224;
  undefined *local_220;
  undefined *puStack_21c;
  undefined *puStack_218;
  undefined4 uStack_214;
  undefined1 uStack_210;
  undefined1 uStack_20f;
  undefined4 uStack_20c;
  undefined4 uStack_208;
  undefined4 uStack_204;
  undefined4 uStack_200;
  undefined *puStack_1fc;
  undefined *puStack_1f8;
  undefined *puStack_1f4;
  undefined *puStack_1f0;
  undefined4 uStack_1ec;
  undefined1 uStack_1e8;
  undefined1 uStack_1e7;
  undefined4 uStack_1e4;
  undefined4 uStack_1e0;
  undefined4 uStack_1dc;
  undefined4 uStack_1d8;
  undefined *puStack_1d4;
  undefined *puStack_1d0;
  undefined *puStack_1cc;
  undefined *puStack_1c8;
  undefined4 uStack_1c4;
  undefined1 uStack_1c0;
  undefined1 uStack_1bf;
  undefined4 uStack_1bc;
  undefined4 uStack_1b8;
  undefined4 auStack_1b0 [2];
  undefined4 auStack_1a8 [2];
  undefined4 auStack_1a0 [2];
  undefined4 auStack_198 [2];
  undefined4 auStack_190 [2];
  undefined4 auStack_188 [2];
  undefined4 auStack_180 [2];
  undefined4 auStack_178 [2];
  undefined4 uStack_170;
  int local_16c;
  undefined4 auStack_168 [2];
  undefined4 auStack_160 [2];
  undefined4 auStack_158 [2];
  undefined4 auStack_150 [2];
  undefined4 auStack_148 [2];
  undefined4 auStack_140 [2];
  undefined4 auStack_138 [2];
  undefined4 auStack_130 [2];
  undefined4 auStack_128 [2];
  undefined4 auStack_120 [2];
  undefined4 *puStack_118;
  undefined4 auStack_114 [2];
  undefined4 auStack_10c [2];
  undefined4 auStack_104 [2];
  undefined4 auStack_fc [8];
  undefined4 auStack_dc [10];
  undefined4 local_b4 [6];
  undefined4 auStack_9c [2];
  undefined4 local_94 [6];
  undefined4 auStack_7c [2];
  undefined4 local_74 [6];
  void *pvStack_5c;
  int iStack_54;
  void *pvStack_14;
  undefined1 *puStack_10;
  undefined4 uStack_c;
  
  uStack_c = 0xffffffff;
  puStack_10 = &LAB_0043aab8;
  pvStack_14 = ExceptionList;
  local_220 = (undefined *)0xffffffff;
  puStack_230 = (undefined1 *)(uint)(uint3)puStack_230;
  uStack_254 = 0x405876;
  ExceptionList = &pvStack_14;
  puVar2 = (undefined4 *)FUN_00402b70(local_94,s_data_Loading_jpg_00444400,0);
  iVar11 = DAT_00488a7c;
  puVar8 = local_b4;
  for (iVar10 = 8; iVar10 != 0; iVar10 = iVar10 + -1) {
    *puVar8 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar8 = puVar8 + 1;
  }
  puVar2 = local_b4;
  puVar8 = (undefined4 *)(&DAT_00480530 + DAT_00488a7c * 0x20);
  for (iVar10 = 8; iVar10 != 0; iVar10 = iVar10 + -1) {
    *puVar8 = *puVar2;
    puVar2 = puVar2 + 1;
    puVar8 = puVar8 + 1;
  }
  piVar3 = FUN_00432402(&DAT_00488530,(byte *)s_loading_004443f8);
  *piVar3 = iVar11;
  DAT_00488a7c = DAT_00488a7c + 1;
  bVar1 = FUN_004323e0(&DAT_00488530,(byte *)s_loading_004443f8,&local_16c);
  if (CONCAT31(extraout_var,bVar1) != 0) {
    puVar2 = (undefined4 *)(&DAT_00480530 + local_16c * 0x20);
    puVar8 = local_74;
    for (iVar11 = 8; iVar11 != 0; iVar11 = iVar11 + -1) {
      *puVar8 = *puVar2;
      puVar2 = puVar2 + 1;
      puVar8 = puVar8 + 1;
    }
  }
  iVar11 = 0x3f800000;
  pcVar18 = (char *)0x0;
  uStack_254 = 0;
  uStack_258 = 0x405911;
  glClearColor();
  uStack_258 = 0x4100;
  uStack_25c = 0x40591c;
  glClear();
  uStack_25c = 0x1701;
  uStack_260 = 0x405927;
  glMatrixMode();
  uStack_260 = 0x40592d;
  glPushMatrix();
  uStack_260 = 0x405933;
  glLoadIdentity();
  uStack_274 = (double)DAT_00488660;
  uStack_260 = 0x3ff00000;
  uStack_264 = 0;
  iStack_268 = -0x40100000;
  puStack_26c = (undefined4 *)0x0;
  uStack_278 = 0;
  uStack_275 = 0;
  pbStack_27c = (byte *)0x0;
  glOrtho();
  uVar15 = 0x405979;
  FUN_00403090();
  glPopMatrix();
  FUN_00405270();
  uVar16 = 0x405993;
  SwapBuffers(DAT_00488668);
  pcVar17 = &DAT_00444118;
  puStack_230 = &stack0xfffffd68;
  FUN_00416680(&stack0xfffffd68,s_script_txt_004443ec,-1);
  FUN_00416120(&uStack_264,uVar15,uVar16,pcVar17);
  pbStack_27c = PTR_DAT_00447090;
  iStack_54._0_1_ = 1;
  iStack_54._1_3_ = 0;
  uVar4 = FUN_004162c0((int)&uStack_264);
  if ((char)uVar4 == '\0') {
    iVar10 = -0x28;
    uStack_274 = (double)CONCAT44(0xffffffd8,(byte *)uStack_274);
    iStack_23c = -0x28;
    uVar12 = 0;
    do {
      pvVar5 = FUN_004164c0(&uStack_264,auStack_158);
      iStack_54._0_1_ = 2;
      pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
      FUN_00433760(&pbStack_27c,pCVar6);
      iStack_54._0_1_ = 1;
      FUN_004166d0(auStack_158);
      FUN_00431d84((int *)&pbStack_27c);
      FUN_00433914((int *)&pbStack_27c);
      iVar7 = FUN_004232b6(pbStack_27c,&DAT_00488a80);
      if (iVar7 != 0) {
        iVar7 = FUN_00431d4b(&pbStack_27c,s__module__004443e0);
        if (iVar7 == -1) {
          iVar7 = FUN_00431d4b(&pbStack_27c,s__mp3__004443c8);
          if (iVar7 == -1) {
            iVar7 = FUN_00431d4b(&pbStack_27c,s__textures__004443bc);
            if (iVar7 == -1) {
              iVar7 = FUN_00431d4b(&pbStack_27c,s__scenes__00444384);
              if (iVar7 == -1) {
                iVar7 = FUN_00431d4b(&pbStack_27c,s__parameter__00444378);
                if (iVar7 == -1) {
                  iVar7 = FUN_00431d4b(&pbStack_27c,s__part__00444348);
                  if (iVar7 == -1) {
                    iVar7 = FUN_00431d4b(&pbStack_27c,s__addpart__0044433c);
                    if (iVar7 == -1) {
                      iVar7 = FUN_00431d4b(&pbStack_27c,s__addeffect__00444330);
                      if (iVar7 != -1) {
                        puStack_224 = PTR_DAT_00447090;
                        local_220 = PTR_DAT_00447090;
                        puStack_21c = PTR_DAT_00447090;
                        puStack_218 = PTR_DAT_00447090;
                        iStack_54._0_1_ = 0x21;
                        pvVar5 = FUN_004164c0(&uStack_264,auStack_1a8);
                        iStack_54._0_1_ = 0x22;
                        pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                        FUN_00433760(&pbStack_27c,pCVar6);
                        iStack_54._0_1_ = 0x21;
                        FUN_004166d0(auStack_1a8);
                        FUN_00433914((int *)&pbStack_27c);
                        FUN_00433710(&puStack_224,(int *)&pbStack_27c);
                        pvVar5 = FUN_004164c0(&uStack_264,auStack_198);
                        iStack_54._0_1_ = 0x23;
                        pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                        FUN_00433760(&pbStack_27c,pCVar6);
                        iStack_54._0_1_ = 0x21;
                        FUN_004166d0(auStack_198);
                        FUN_00433914((int *)&pbStack_27c);
                        FUN_00433710(&puStack_21c,(int *)&pbStack_27c);
                        uStack_22c = *(undefined4 *)(iVar10 + DAT_0048051c);
                        pvVar5 = FUN_004164c0(&uStack_264,auStack_188);
                        iStack_54._0_1_ = 0x24;
                        pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                        FUN_00433760(&pbStack_27c,pCVar6);
                        iStack_54._0_1_ = 0x21;
                        FUN_004166d0(auStack_188);
                        uStack_228 = FUN_004232ab(pbStack_27c,pbStack_27c);
                        pvVar5 = FUN_004164c0(&uStack_264,auStack_178);
                        iStack_54._0_1_ = 0x25;
                        pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                        FUN_00433760(&pbStack_27c,pCVar6);
                        iStack_54._0_1_ = 0x21;
                        FUN_004166d0(auStack_178);
                        uStack_20c = FUN_004232ab(this_02,pbStack_27c);
                        pvVar5 = FUN_004164c0(&uStack_264,auStack_168);
                        iStack_54._0_1_ = 0x26;
                        pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                        FUN_00433760(&pbStack_27c,pCVar6);
                        iStack_54._0_1_ = 0x21;
                        FUN_004166d0(auStack_168);
                        uStack_208 = FUN_004232ab(this_03,pbStack_27c);
                        puVar8 = DAT_00480508;
                        uStack_214 = 0xffffffff;
                        uStack_210 = 1;
                        puVar2 = DAT_00480508;
                        puVar14 = DAT_0048050c;
                        uStack_20f = uVar12;
                        if (!SBORROW4((int)DAT_00480508,(int)DAT_00480508)) {
                          puVar2 = (undefined4 *)((int)DAT_00480508 + 1);
                          if (puVar2 == (undefined4 *)0x0) {
                            puVar2 = DAT_00480504;
                            puVar14 = DAT_00480508;
                            if (DAT_00480504 != (undefined4 *)0x0) {
                              for (; puVar14 != (undefined4 *)0x0;
                                  puVar14 = (undefined4 *)((int)puVar14 + -1)) {
                                FUN_00407d90(puVar2,0);
                                puVar2 = puVar2 + 10;
                              }
                              FUN_0043293f((undefined *)DAT_00480504);
                              DAT_00480504 = (undefined4 *)0x0;
                            }
                            DAT_0048050c = (undefined4 *)0x0;
                            DAT_00480508 = (undefined4 *)0x0;
                            puVar2 = DAT_00480508;
                            puVar14 = DAT_0048050c;
                          }
                          else if (DAT_00480504 == (undefined4 *)0x0) {
                            puVar9 = FUN_00432916((int)puVar2 * 0x28);
                            puVar14 = puVar9;
                            DAT_00480504 = puVar9;
                            for (iVar10 = ((int)puVar2 * 5 & 0x1fffffffU) << 1; iVar10 != 0;
                                iVar10 = iVar10 + -1) {
                              *puVar14 = 0;
                              puVar14 = puVar14 + 1;
                            }
                            for (iVar10 = 0; puVar13 = puVar2, iVar10 != 0; iVar10 = iVar10 + -1) {
                              *(undefined1 *)puVar14 = 0;
                              puVar14 = (undefined4 *)((int)puVar14 + 1);
                            }
                            do {
                              iStack_54._0_1_ = 0x27;
                              puStack_118 = puVar9;
                              if (puVar9 != (undefined4 *)0x0) {
                                puStack_26c = puVar9;
                                FUN_00406c20((int)puVar9);
                              }
                              puVar9 = puVar9 + 10;
                              puVar13 = (undefined4 *)((int)puVar13 + -1);
                              iStack_54._0_1_ = 0x21;
                              puVar14 = puVar2;
                              puStack_26c = puVar9;
                            } while (puVar13 != (undefined4 *)0x0);
                          }
                          else if ((int)DAT_0048050c < (int)puVar2) {
                            iVar10 = DAT_00480510;
                            if (DAT_00480510 == 0) {
                              iVar10 = (int)((int)DAT_00480508 + ((int)DAT_00480508 >> 0x1f & 7U))
                                       >> 3;
                              if (iVar10 < 4) {
                                iVar10 = 4;
                              }
                              else if (0x400 < iVar10) {
                                iVar10 = 0x400;
                              }
                            }
                            puStack_26c = (undefined4 *)(iVar10 + (int)DAT_0048050c);
                            if (iVar10 + (int)DAT_0048050c <= (int)puVar2) {
                              puStack_26c = puVar2;
                            }
                            puVar13 = FUN_00432916((int)puStack_26c * 0x28);
                            puVar14 = DAT_00480504;
                            puVar9 = puVar13;
                            for (iVar10 = ((int)DAT_00480508 * 5 & 0x1fffffffU) << 1; iVar10 != 0;
                                iVar10 = iVar10 + -1) {
                              *puVar9 = *puVar14;
                              puVar14 = puVar14 + 1;
                              puVar9 = puVar9 + 1;
                            }
                            for (iVar10 = 0; iVar10 != 0; iVar10 = iVar10 + -1) {
                              *(undefined1 *)puVar9 = *(undefined1 *)puVar14;
                              puVar14 = (undefined4 *)((int)puVar14 + 1);
                              puVar9 = (undefined4 *)((int)puVar9 + 1);
                            }
                            FUN_00407db0(puVar13 + (int)DAT_00480508 * 10,
                                         (int)puVar2 - (int)DAT_00480508);
                            FUN_0043293f((undefined *)DAT_00480504);
                            DAT_0048050c = puStack_26c;
                            DAT_00480504 = puVar13;
                            puVar14 = DAT_0048050c;
                          }
                          else if ((int)DAT_00480508 < (int)puVar2) {
                            FUN_00407db0(DAT_00480504 + (int)DAT_00480508 * 10,
                                         (int)puVar2 - (int)DAT_00480508);
                            puVar14 = DAT_0048050c;
                          }
                          else if ((int)puVar2 < (int)DAT_00480508) {
                            puVar9 = DAT_00480504 + (int)puVar2 * 10;
                            for (iVar10 = (int)DAT_00480508 - (int)puVar2; puVar14 = DAT_0048050c,
                                iVar10 != 0; iVar10 = iVar10 + -1) {
                              FUN_00407d90(puVar9,0);
                              puVar9 = puVar9 + 10;
                            }
                          }
                        }
                        DAT_0048050c = puVar14;
                        DAT_00480508 = puVar2;
                        puVar2 = DAT_00480504 + (int)puVar8 * 10;
                        *puVar2 = uStack_22c;
                        puVar2[1] = uStack_228;
                        FUN_00433710(puVar2 + 2,(int *)&puStack_224);
                        FUN_00433710(puVar2 + 3,(int *)&local_220);
                        FUN_00433710(puVar2 + 4,(int *)&puStack_21c);
                        FUN_00433710(puVar2 + 5,(int *)&puStack_218);
                        puVar2[6] = uStack_214;
                        *(undefined1 *)(puVar2 + 7) = uStack_210;
                        *(undefined1 *)((int)puVar2 + 0x1d) = uStack_20f;
                        puVar2[8] = uStack_20c;
                        puVar2[9] = uStack_208;
                        iVar10 = uStack_274._4_4_;
                        iStack_268 = iStack_268 + 1;
                        uStack_274 = (double)CONCAT44(uStack_274._4_4_ + 0x28,(byte *)uStack_274);
                        if (*(int *)(iStack_23c + 0x18 + DAT_0048051c) == -1) {
                          *(int *)(iStack_23c + 0x18 + DAT_0048051c) = iStack_268;
                        }
                        else {
                          *(int *)(iVar10 + 0x18 + (int)DAT_00480504) = iStack_268;
                        }
                        iStack_54._0_1_ = 0x2a;
                        FUN_00433623((int *)&puStack_218);
                        iStack_54._0_1_ = 0x29;
                        FUN_00433623((int *)&puStack_21c);
                        iStack_54._0_1_ = 0x28;
                        FUN_00433623((int *)&local_220);
                        iStack_54._0_1_ = 1;
                        FUN_00433623((int *)&puStack_224);
                        iVar10 = iStack_23c;
                      }
                    }
                    else {
                      puStack_1d4 = PTR_DAT_00447090;
                      puStack_1d0 = PTR_DAT_00447090;
                      puStack_1cc = PTR_DAT_00447090;
                      puStack_1c8 = PTR_DAT_00447090;
                      iStack_54._0_1_ = 0x1a;
                      pvVar5 = FUN_004164c0(&uStack_264,auStack_150);
                      iStack_54._0_1_ = 0x1b;
                      pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                      FUN_00433760(&pbStack_27c,pCVar6);
                      iStack_54._0_1_ = 0x1a;
                      FUN_004166d0(auStack_150);
                      FUN_00433914((int *)&pbStack_27c);
                      FUN_00433710(&puStack_1d4,(int *)&pbStack_27c);
                      uStack_1dc = *(undefined4 *)(iVar10 + DAT_0048051c);
                      pvVar5 = FUN_004164c0(&uStack_264,auStack_130);
                      iStack_54._0_1_ = 0x1c;
                      pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                      FUN_00433760(&pbStack_27c,pCVar6);
                      iStack_54._0_1_ = 0x1a;
                      FUN_004166d0(auStack_130);
                      uStack_1d8 = FUN_004232ab(pbStack_27c,pbStack_27c);
                      pvVar5 = FUN_004164c0(&uStack_264,auStack_120);
                      iStack_54._0_1_ = 0x1d;
                      pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                      FUN_00433760(&pbStack_27c,pCVar6);
                      iStack_54._0_1_ = 0x1a;
                      FUN_004166d0(auStack_120);
                      FUN_00433914((int *)&pbStack_27c);
                      FUN_00433710(&puStack_1d0,(int *)&pbStack_27c);
                      puVar2 = DAT_00480508;
                      uStack_1c4 = 0xffffffff;
                      uStack_1c0 = 0;
                      uStack_1bf = uVar12;
                      FUN_00407a90(&DAT_00480500,(int)((int)DAT_00480508 + 1),-1);
                      puVar2 = DAT_00480504 + (int)puVar2 * 10;
                      *puVar2 = uStack_1dc;
                      puVar2[1] = uStack_1d8;
                      FUN_00433710(puVar2 + 2,(int *)&puStack_1d4);
                      FUN_00433710(puVar2 + 3,(int *)&puStack_1d0);
                      FUN_00433710(puVar2 + 4,(int *)&puStack_1cc);
                      FUN_00433710(puVar2 + 5,(int *)&puStack_1c8);
                      puVar2[6] = uStack_1c4;
                      *(undefined1 *)(puVar2 + 7) = uStack_1c0;
                      *(undefined1 *)((int)puVar2 + 0x1d) = uStack_1bf;
                      puVar2[8] = uStack_1bc;
                      puVar2[9] = uStack_1b8;
                      iVar7 = uStack_274._4_4_;
                      iStack_268 = iStack_268 + 1;
                      uStack_274 = (double)CONCAT44(uStack_274._4_4_ + 0x28,(byte *)uStack_274);
                      if (*(int *)(iVar10 + 0x18 + DAT_0048051c) == -1) {
                        *(int *)(iVar10 + 0x18 + DAT_0048051c) = iStack_268;
                      }
                      else {
                        *(int *)(iVar7 + 0x18 + (int)DAT_00480504) = iStack_268;
                      }
                      iStack_54._0_1_ = 0x20;
                      FUN_00433623((int *)&puStack_1c8);
                      iStack_54._0_1_ = 0x1f;
                      FUN_00433623((int *)&puStack_1cc);
                      iStack_54._0_1_ = 0x1e;
                      FUN_00433623((int *)&puStack_1d0);
                      iStack_54._0_1_ = 1;
                      FUN_00433623((int *)&puStack_1d4);
                    }
                  }
                  else {
                    puStack_1fc = PTR_DAT_00447090;
                    puStack_1f8 = PTR_DAT_00447090;
                    puStack_1f4 = PTR_DAT_00447090;
                    puStack_1f0 = PTR_DAT_00447090;
                    iStack_54._0_1_ = 0x10;
                    pvVar5 = FUN_004164c0(&uStack_264,auStack_180);
                    iStack_54._0_1_ = 0x11;
                    pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                    FUN_00433760(&pbStack_27c,pCVar6);
                    iStack_54._0_1_ = 0x10;
                    FUN_004166d0(auStack_180);
                    FUN_00433914((int *)&pbStack_27c);
                    FUN_00433710(&puStack_1fc,(int *)&pbStack_27c);
                    pvVar5 = FUN_004164c0(&uStack_264,auStack_128);
                    iStack_54._0_1_ = 0x12;
                    pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                    FUN_00433760(&pbStack_27c,pCVar6);
                    iStack_54._0_1_ = 0x10;
                    FUN_004166d0(auStack_128);
                    uStack_204 = FUN_004232ab(this_00,pbStack_27c);
                    pvVar5 = FUN_004164c0(&uStack_264,&uStack_170);
                    iStack_54._0_1_ = 0x13;
                    pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                    FUN_00433760(&pbStack_27c,pCVar6);
                    iStack_54._0_1_ = 0x10;
                    FUN_004166d0(&uStack_170);
                    uStack_200 = FUN_004232ab(this_01,pbStack_27c);
                    pvVar5 = FUN_004164c0(&uStack_264,auStack_148);
                    iStack_54._0_1_ = 0x14;
                    pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                    FUN_00433760(&pbStack_27c,pCVar6);
                    iStack_54._0_1_ = 0x10;
                    FUN_004166d0(auStack_148);
                    FUN_00433914((int *)&pbStack_27c);
                    FUN_00433710(&puStack_1f8,(int *)&pbStack_27c);
                    pvVar5 = FUN_004164c0(&uStack_264,auStack_160);
                    iStack_54._0_1_ = 0x15;
                    pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                    FUN_00433760(&pbStack_27c,pCVar6);
                    iStack_54._0_1_ = 0x10;
                    FUN_004166d0(auStack_160);
                    FUN_00433914((int *)&pbStack_27c);
                    FUN_00433710(&puStack_1f4,(int *)&pbStack_27c);
                    pvVar5 = FUN_004164c0(&uStack_264,auStack_140);
                    iStack_54._0_1_ = 0x16;
                    pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                    FUN_00433760(&pbStack_27c,pCVar6);
                    iStack_54._0_1_ = 0x10;
                    FUN_004166d0(auStack_140);
                    FUN_00433914((int *)&pbStack_27c);
                    FUN_00433710(&puStack_1f0,(int *)&pbStack_27c);
                    iVar7 = DAT_00480520;
                    uStack_1ec = 0xffffffff;
                    uStack_1e8 = 0;
                    uStack_1e7 = uVar12;
                    FUN_00407a90(&DAT_00480518,DAT_00480520 + 1,-1);
                    puVar2 = (undefined4 *)(DAT_0048051c + iVar7 * 0x28);
                    *puVar2 = uStack_204;
                    puVar2[1] = uStack_200;
                    FUN_00433710(puVar2 + 2,(int *)&puStack_1fc);
                    FUN_00433710(puVar2 + 3,(int *)&puStack_1f8);
                    FUN_00433710(puVar2 + 4,(int *)&puStack_1f4);
                    FUN_00433710(puVar2 + 5,(int *)&puStack_1f0);
                    iStack_23c = iVar10 + 0x28;
                    puVar2[6] = uStack_1ec;
                    *(undefined1 *)(puVar2 + 7) = uStack_1e8;
                    *(undefined1 *)((int)puVar2 + 0x1d) = uStack_1e7;
                    puVar2[8] = uStack_1e4;
                    puVar2[9] = uStack_1e0;
                    iStack_54._0_1_ = 0x19;
                    FUN_00433623((int *)&puStack_1f0);
                    iStack_54._0_1_ = 0x18;
                    FUN_00433623((int *)&puStack_1f4);
                    iStack_54._0_1_ = 0x17;
                    FUN_00433623((int *)&puStack_1f8);
                    iStack_54._0_1_ = 1;
                    FUN_00433623((int *)&puStack_1fc);
                    iVar10 = iStack_23c;
                  }
                }
                else {
                  pvVar5 = FUN_004164c0(&uStack_264,auStack_1b0);
                  iStack_54._0_1_ = 0xf;
                  pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                  FUN_00433760(&pbStack_27c,pCVar6);
                  iStack_54._0_1_ = 1;
                  FUN_004166d0(auStack_1b0);
                  FUN_00433914((int *)&pbStack_27c);
                  iVar7 = FUN_00431d4b(&pbStack_27c,s_rendertexturesize_00444364);
                  if (iVar7 != -1) {
                    uStack_275 = 1;
                  }
                  iVar7 = FUN_00431d4b(&pbStack_27c,s_renderfullscreen_00444350);
                  if (iVar7 != -1) {
                    uStack_275 = 0;
                  }
                }
              }
              else {
                while( true ) {
                  pvVar5 = FUN_004164c0(&uStack_264,auStack_190);
                  iStack_54._0_1_ = 0xc;
                  pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                  FUN_00433760(&pbStack_27c,pCVar6);
                  iStack_54._0_1_ = 1;
                  FUN_004166d0(auStack_190);
                  FUN_00431d84((int *)&pbStack_27c);
                  iVar7 = FUN_004232b6(pbStack_27c,&DAT_00488a80);
                  if (iVar7 == 0) break;
                  FUN_00433914((int *)&pbStack_27c);
                  FUN_00433691(&stack0xfffffdb4,s_data__004443d0);
                  iStack_54._0_1_ = 0xd;
                  FUN_00433865(&stack0xfffffdb4,&pbStack_27c);
                  puVar2 = FUN_00432916(0x118);
                  iStack_54._0_1_ = 0xe;
                  if (puVar2 == (undefined4 *)0x0) {
                    puVar2 = (undefined4 *)0x0;
                  }
                  else {
                    puVar2 = FUN_00412770(puVar2);
                  }
                  iStack_54._0_1_ = 0xd;
                  FUN_00412fa0(puVar2,pcVar18);
                  puVar8 = FUN_00432402(&DAT_00488550,pbStack_27c);
                  *puVar8 = puVar2;
                  iStack_54._0_1_ = 1;
                  FUN_00433623((int *)&stack0xfffffdb4);
                }
              }
            }
            else {
              while( true ) {
                pvVar5 = FUN_004164c0(&uStack_264,auStack_138);
                iStack_54._0_1_ = 9;
                pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
                FUN_00433760(&pbStack_27c,pCVar6);
                iStack_54._0_1_ = 1;
                FUN_004166d0(auStack_138);
                FUN_00431d84((int *)&pbStack_27c);
                iVar7 = FUN_004232b6(pbStack_27c,&DAT_00488a80);
                iVar10 = iStack_23c;
                if (iVar7 == 0) break;
                iVar10 = FUN_00431d4b(&pbStack_27c,s_fullscreen_004443b0);
                FUN_00431d4b(&pbStack_27c,s_nomipmap_004443a4);
                iVar7 = FUN_00431d4b(&pbStack_27c,&DAT_004443a0);
                if (iVar7 != -1) {
                  FUN_00431d4b(&pbStack_27c,&DAT_004443a0);
                  piVar3 = (int *)FUN_00431cb1();
                  iStack_54._0_1_ = 10;
                  FUN_00433710(&pbStack_27c,piVar3);
                  iStack_54._0_1_ = 1;
                  FUN_00433623((int *)&puStack_230);
                }
                FUN_00433914((int *)&pbStack_27c);
                FUN_00433691(&uStack_274,s_data__004443d0);
                iStack_54 = CONCAT31(iStack_54._1_3_,0xb);
                FUN_00433865(&uStack_274,&pbStack_27c);
                if (iVar10 == -1) {
                  iVar10 = FUN_00431d4b(&pbStack_27c,&DAT_00444398);
                  if (iVar10 != -1) {
                    FUN_00402540((int)(byte *)uStack_274,(undefined4 *)&stack0xfffffdc8);
                    puVar2 = FUN_00432402(&DAT_00488570,pbStack_27c);
                    *puVar2 = unaff_EBX;
                  }
                  iVar10 = FUN_00431d4b(&pbStack_27c,&DAT_00444390);
                  if (iVar10 != -1) {
                    FUN_004026b0((LPCSTR)(byte *)uStack_274,(undefined4 *)&stack0xfffffdc8);
                    puVar2 = FUN_00432402(&DAT_00488570,pbStack_27c);
                    *puVar2 = unaff_EBX;
                  }
                }
                else {
                  iVar10 = FUN_00431d4b(&pbStack_27c,&DAT_00444398);
                  if (iVar10 != -1) {
                    puVar2 = (undefined4 *)FUN_00402b70(auStack_7c,(byte *)uStack_274,0);
                    iVar10 = DAT_00488a7c;
                    puVar8 = auStack_fc;
                    for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
                      *puVar8 = *puVar2;
                      puVar2 = puVar2 + 1;
                      puVar8 = puVar8 + 1;
                    }
                    puVar2 = auStack_fc;
                    puVar8 = (undefined4 *)(&DAT_00480530 + DAT_00488a7c * 0x20);
                    for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
                      *puVar8 = *puVar2;
                      puVar2 = puVar2 + 1;
                      puVar8 = puVar8 + 1;
                    }
                    piVar3 = FUN_00432402(&DAT_00488530,pbStack_27c);
                    *piVar3 = iVar10;
                    DAT_00488a7c = DAT_00488a7c + 1;
                  }
                  iVar10 = FUN_00431d4b(&pbStack_27c,&DAT_00444390);
                  if (iVar10 != -1) {
                    puVar2 = (undefined4 *)FUN_00402bf0(auStack_9c,(byte *)uStack_274,0);
                    iVar10 = DAT_00488a7c;
                    puVar8 = auStack_dc;
                    for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
                      *puVar8 = *puVar2;
                      puVar2 = puVar2 + 1;
                      puVar8 = puVar8 + 1;
                    }
                    puVar2 = auStack_dc;
                    puVar8 = (undefined4 *)(&DAT_00480530 + DAT_00488a7c * 0x20);
                    for (iVar7 = 8; iVar7 != 0; iVar7 = iVar7 + -1) {
                      *puVar8 = *puVar2;
                      puVar2 = puVar2 + 1;
                      puVar8 = puVar8 + 1;
                    }
                    piVar3 = FUN_00432402(&DAT_00488530,pbStack_27c);
                    *piVar3 = iVar10;
                    DAT_00488a7c = DAT_00488a7c + 1;
                  }
                }
                iStack_54._0_1_ = 1;
                FUN_00433623((int *)&uStack_274);
              }
            }
          }
          else {
            pvVar5 = FUN_004164c0(&uStack_264,auStack_10c);
            iStack_54._0_1_ = 6;
            pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
            FUN_00433760(&pbStack_27c,pCVar6);
            iStack_54._0_1_ = 1;
            FUN_004166d0(auStack_10c);
            FUN_00433914((int *)&pbStack_27c);
            iVar7 = FUN_00431d4b(&pbStack_27c,s_nosound_004443d8);
            if (iVar7 == -1) {
              DAT_00444158 = 0;
              FUN_00433691(&stack0xfffffdbc,s_data__004443d0);
              iStack_54 = CONCAT31(iStack_54._1_3_,7);
              FUN_00433865(&stack0xfffffdbc,&pbStack_27c);
              if (DAT_00488a78 == 0) {
                DAT_00488654 = BASS_StreamCreateFile(0,unaff_EDI);
              }
              iStack_54._0_1_ = 1;
              FUN_00433623((int *)&stack0xfffffdbc);
            }
            else {
              DAT_00488a78 = 1;
              DAT_00444158 = 0xffffffff;
            }
            pvVar5 = FUN_004164c0(&uStack_264,auStack_1a0);
            iStack_54._0_1_ = 8;
            pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
            FUN_00433760(&pbStack_27c,pCVar6);
            iStack_54._0_1_ = 1;
            FUN_004166d0(auStack_1a0);
            DAT_00488a74 = FUN_004232ab(pbStack_27c,pbStack_27c);
          }
        }
        else {
          pvVar5 = FUN_004164c0(&uStack_264,auStack_114);
          iStack_54._0_1_ = 3;
          pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
          FUN_00433760(&pbStack_27c,pCVar6);
          iStack_54._0_1_ = 1;
          FUN_004166d0(auStack_114);
          FUN_00433914((int *)&pbStack_27c);
          iVar7 = FUN_00431d4b(&pbStack_27c,s_nosound_004443d8);
          if (iVar7 == -1) {
            FUN_00433691(&stack0xfffffdb8,s_data__004443d0);
            iStack_54 = CONCAT31(iStack_54._1_3_,4);
            FUN_00433865(&stack0xfffffdb8,&pbStack_27c);
            if (DAT_00488a78 == 0) {
              DAT_00444158 = 1;
              DAT_00488650 = BASS_MusicLoad(0,iVar11);
              BASS_MusicSetPositionScaler(DAT_00488650,0x40);
            }
            iStack_54._0_1_ = 1;
            FUN_00433623((int *)&stack0xfffffdb8);
          }
          else {
            DAT_00488a78 = 1;
            DAT_00444158 = 0xffffffff;
          }
          pvVar5 = FUN_004164c0(&uStack_264,auStack_104);
          iStack_54._0_1_ = 5;
          pCVar6 = (LPCSTR)FUN_004167c0((int)pvVar5);
          FUN_00433760(&pbStack_27c,pCVar6);
          iStack_54._0_1_ = 1;
          FUN_004166d0(auStack_104);
          DAT_00488a74 = FUN_004232ab(this,pbStack_27c);
        }
      }
      uVar4 = FUN_004162c0((int)&uStack_264);
      uVar12 = uStack_275;
    } while ((char)uVar4 == '\0');
  }
  iStack_54 = (uint)iStack_54._1_3_ << 8;
  FUN_00433623((int *)&pbStack_27c);
  iStack_54 = 0xffffffff;
  uVar15 = FUN_004160e0(&uStack_264);
  ExceptionList = pvStack_5c;
  return CONCAT31((int3)((uint)uVar15 >> 8),1);
}


// ==== forced_0x40526a @ 0040526a ====

void forced_0x40526a(void)

{
  undefined4 extraout_ECX;
  undefined4 extraout_ECX_00;
  undefined4 extraout_ECX_01;
  undefined4 extraout_ECX_02;
  undefined4 extraout_ECX_03;
  undefined4 extraout_ECX_04;
  undefined4 extraout_ECX_05;
  undefined4 extraout_ECX_06;
  undefined4 extraout_ECX_07;
  undefined4 extraout_ECX_08;
  undefined4 extraout_ECX_09;
  undefined4 extraout_ECX_10;
  undefined4 extraout_ECX_11;
  undefined4 extraout_ECX_12;
  undefined4 extraout_ECX_13;
  undefined4 extraout_ECX_14;
  undefined4 uVar1;
  undefined4 uVar2;
  
  FUN_00404540();
  FUN_00401280(s_data_star_ob3_00444320,1,(int *)&DAT_0044a900,3,1);
  uVar2 = 1;
  uVar1 = extraout_ECX;
  FUN_00433691(&stack0xfffffff4,s_droid1_00444318);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 2;
  uVar1 = extraout_ECX_00;
  FUN_00433691(&stack0xfffffff4,s_droid2_00444310);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 3;
  uVar1 = extraout_ECX_01;
  FUN_00433691(&stack0xfffffff4,s_droid3_00444308);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 4;
  uVar1 = extraout_ECX_02;
  FUN_00433691(&stack0xfffffff4,s_tunnel_00444300);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 5;
  uVar1 = extraout_ECX_03;
  FUN_00433691(&stack0xfffffff4,s_oscope_004442f8);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 6;
  uVar1 = extraout_ECX_04;
  FUN_00433691(&stack0xfffffff4,s_render2texture_004442e8);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 7;
  uVar1 = extraout_ECX_05;
  FUN_00433691(&stack0xfffffff4,s_gridplane_004442dc);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 8;
  uVar1 = extraout_ECX_06;
  FUN_00433691(&stack0xfffffff4,s_gridtunnel2_004442d0);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 9;
  uVar1 = extraout_ECX_07;
  FUN_00433691(&stack0xfffffff4,s_gridtunnel_004442c4);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 10;
  uVar1 = extraout_ECX_08;
  FUN_00433691(&stack0xfffffff4,s_gridinterf_004442b8);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 0xb;
  uVar1 = extraout_ECX_09;
  FUN_00433691(&stack0xfffffff4,s_griddistord1_004442a8);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 0xc;
  uVar1 = extraout_ECX_10;
  FUN_00433691(&stack0xfffffff4,s_griddistord2_00444298);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 0xd;
  uVar1 = extraout_ECX_11;
  FUN_00433691(&stack0xfffffff4,s_griddistord3_00444288);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 0xe;
  uVar1 = extraout_ECX_12;
  FUN_00433691(&stack0xfffffff4,s_griddistord4_00444278);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 0xf;
  uVar1 = extraout_ECX_13;
  FUN_00433691(&stack0xfffffff4,s_griddistord5_00444268);
  FUN_004043f0(uVar1,uVar2);
  uVar2 = 0x14;
  uVar1 = extraout_ECX_14;
  FUN_00433691(&stack0xfffffff4,s_gridvemputus1_00444258);
  FUN_004043f0(uVar1,uVar2);
  return;
}


// ==== FUN_00402b70 @ 00402b70 ====

void __cdecl FUN_00402b70(undefined4 *param_1,undefined *param_2,int param_3)

{
  byte *pbVar1;
  int *piVar2;
  undefined4 *puVar3;
  int iVar4;
  undefined4 *puVar5;
  uint local_24;
  undefined4 local_20 [8];
  
  pbVar1 = FUN_00402a00(param_2,(int *)&local_24,(int *)&param_2);
  piVar2 = _malloc(0x12c000);
  FUN_00402ac0(piVar2,pbVar1,local_24,(uint)param_2,0x18);
  FUN_004229f7(pbVar1);
  puVar3 = (undefined4 *)FUN_00402c90(local_20,(undefined *)piVar2,param_3);
  puVar5 = local_20;
  for (iVar4 = 8; iVar4 != 0; iVar4 = iVar4 + -1) {
    *puVar5 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar5 = puVar5 + 1;
  }
  puVar3 = local_20;
  for (iVar4 = 8; iVar4 != 0; iVar4 = iVar4 + -1) {
    *param_1 = *puVar3;
    puVar3 = puVar3 + 1;
    param_1 = param_1 + 1;
  }
  return;
}


// ==== FUN_00401280 @ 00401280 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00401280(LPCSTR param_1,int param_2,int *param_3,int param_4,int param_5)

{
  char cVar1;
  FILE *pFVar2;
  uint uVar3;
  uint uVar4;
  int iVar5;
  int iVar6;
  char *pcVar7;
  char *pcVar8;
  ushort local_106;
  int local_104;
  char local_100 [256];
  
  pFVar2 = (FILE *)FUN_004228aa(param_1,&DAT_00444118);
  if (pFVar2 != (FILE *)0x0) {
    FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
    *param_3 = (int)(short)((local_106 & 0xff00) + (local_106 & 0xff));
    FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
    param_3[1] = (int)(short)((local_106 & 0xff00) + (local_106 & 0xff));
    FUN_00401610(param_3);
    iVar6 = 0;
    param_3[2] = param_4;
    param_3[3] = param_5;
    if (0 < *param_3) {
      iVar5 = 0;
      do {
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        *(float *)(param_3[0x12] + iVar5) = (float)local_104;
        *(undefined4 *)(param_3[0x14] + iVar5) = *(undefined4 *)(param_3[0x12] + iVar5);
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        *(float *)(param_3[0x12] + 4 + iVar5) = (float)local_104;
        *(undefined4 *)(param_3[0x14] + 4 + iVar5) = *(undefined4 *)(param_3[0x12] + 4 + iVar5);
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        iVar6 = iVar6 + 1;
        *(float *)(param_3[0x12] + 8 + iVar5) = (float)local_104;
        *(undefined4 *)(param_3[0x14] + 8 + iVar5) = *(undefined4 *)(param_3[0x12] + 8 + iVar5);
        iVar5 = iVar5 + 0xc;
      } while (iVar6 < *param_3);
    }
    iVar6 = 0;
    if (0 < param_3[1]) {
      iVar5 = 0;
      do {
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        *(int *)(iVar5 + param_3[0x13]) = (int)(short)local_106;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        *(int *)(iVar5 + 4 + param_3[0x13]) = (int)(short)local_106;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        *(int *)(iVar5 + 8 + param_3[0x13]) = (int)(short)local_106;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        *(int *)(iVar5 + 0xc + param_3[0x13]) = (short)local_106 + param_5;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        *(int *)(iVar5 + 0x10 + param_3[0x13]) = param_4;
        local_104 = (int)(short)local_106;
        *(float *)(iVar5 + 0x14 + param_3[0x13]) = (float)local_104 * (float)_DAT_0043c570;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        *(float *)(iVar5 + 0x18 + param_3[0x13]) =
             (float)_DAT_0043c548 - (float)local_104 * (float)_DAT_0043c570;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        *(float *)(iVar5 + 0x1c + param_3[0x13]) = (float)local_104 * (float)_DAT_0043c570;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        *(float *)(iVar5 + 0x20 + param_3[0x13]) =
             (float)_DAT_0043c548 - (float)local_104 * (float)_DAT_0043c570;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        *(float *)(iVar5 + 0x24 + param_3[0x13]) = (float)local_104 * (float)_DAT_0043c570;
        FUN_004226e5((char *)&local_106,2,1,(int *)pFVar2);
        local_104 = (int)(short)local_106;
        iVar6 = iVar6 + 1;
        *(float *)(iVar5 + 0x28 + param_3[0x13]) =
             (float)_DAT_0043c548 - (float)local_104 * (float)_DAT_0043c570;
        iVar5 = iVar5 + 0x2c;
      } while (iVar6 < param_3[1]);
    }
    FUN_004227fc(pFVar2);
    param_3[0xd] = param_2;
    if (param_2 != 0) {
      FUN_00401720(param_3);
    }
    FUN_00401950(param_3);
    iVar6 = glGenLists(1);
    param_3[0x16] = iVar6;
    glNewList(iVar6,0x1300);
    FUN_00401000();
    glEndList();
    return;
  }
  FUN_004227fc((FILE *)0x0);
  uVar3 = 0xffffffff;
  pcVar7 = s__cannot_load_object__004440ff + 1;
  do {
    pcVar8 = pcVar7;
    if (uVar3 == 0) break;
    uVar3 = uVar3 - 1;
    pcVar8 = pcVar7 + 1;
    cVar1 = *pcVar7;
    pcVar7 = pcVar8;
  } while (cVar1 != '\0');
  uVar3 = ~uVar3;
  pcVar7 = pcVar8 + -uVar3;
  pcVar8 = local_100;
  for (uVar4 = uVar3 >> 2; uVar4 != 0; uVar4 = uVar4 - 1) {
    *(undefined4 *)pcVar8 = *(undefined4 *)pcVar7;
    pcVar7 = pcVar7 + 4;
    pcVar8 = pcVar8 + 4;
  }
  for (uVar3 = uVar3 & 3; uVar3 != 0; uVar3 = uVar3 - 1) {
    *pcVar8 = *pcVar7;
    pcVar7 = pcVar7 + 1;
    pcVar8 = pcVar8 + 1;
  }
  return;
}


