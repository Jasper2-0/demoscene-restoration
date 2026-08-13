// ==== forced_0040d5b0 @ 0040d5b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0040d5b0(int param_1,int param_2)

{
  float fVar1;
  float fVar2;
  int *piVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  int iVar7;
  undefined4 uVar8;
  float fVar9;
  float fVar10;
  float fVar11;
  float fVar12;
  float fVar13;
  float fVar14;
  float fVar15;
  int *piVar16;
  undefined4 unaff_EBP;
  float10 fVar17;
  float10 fVar18;
  float fVar19;
  float fVar20;
  float fVar21;
  undefined4 uVar22;
  float fVar23;
  
  piVar16 = *(int **)(param_1 + 0xf0);
  piVar3 = *(int **)(param_1 + 0xf4);
  if (piVar16 != piVar3) {
    do {
      if (*piVar16 != 0) break;
      piVar16 = piVar16 + 1;
    } while (piVar16 != piVar3);
    if (piVar16 != piVar3) {
      FUN_0040c060(*(int *)(param_1 + 0xd8));
      FUN_0040fff0(param_2);
      fVar23 = 9.80909e-45;
      glBegin(7);
      if (*(char *)(param_2 + 0xbc) == '\0') {
        FUN_0040f9f0(param_2);
      }
      fVar4 = *(float *)(param_2 + 0x74);
      fVar5 = *(float *)(param_2 + 0x78);
      fVar6 = *(float *)(param_2 + 0x7c);
      piVar16 = *(int **)(param_1 + 0xf0);
      if (piVar16 != *(int **)(param_1 + 0xf4)) {
        do {
          iVar7 = *piVar16;
          uVar22 = unaff_EBP;
          fVar21 = fVar23;
          if (iVar7 != 0) {
            fVar17 = (float10)fsin((float10)*(float *)(iVar7 + 0x2c));
            fVar18 = (float10)fcos((float10)*(float *)(iVar7 + 0x2c));
            fVar21 = (float)((float10)fVar6 * fVar18);
            fVar1 = (float)-((float10)fVar6 * fVar17);
            fVar2 = (float)((float10)fVar5 * fVar17 - (float10)fVar4 * fVar18);
            fVar9 = fVar1 * fVar6 - fVar2 * fVar5;
            fVar10 = fVar2 * fVar4 - fVar6 * fVar21;
            fVar11 = fVar5 * fVar21 - fVar1 * fVar4;
            fVar12 = _DAT_0045a310 / SQRT(fVar21 * fVar21 + fVar1 * fVar1 + fVar2 * fVar2);
            fVar14 = _DAT_0045a310 / SQRT(fVar9 * fVar9 + fVar10 * fVar10 + fVar11 * fVar11);
            uVar8 = *(undefined4 *)(iVar7 + 0x14);
            fVar1 = *(float *)(iVar7 + 0x1c);
            fVar13 = *(float *)(iVar7 + 4) * _DAT_0045a330;
            fVar15 = *(float *)(iVar7 + 8) * _DAT_0045a330;
            __ftol();
            if (*(int *)(*(int *)(param_1 + 0xd8) + 0x58) == 1) {
              uVar22 = 0x3f800000;
              fVar21 = *(float *)(iVar7 + 0x3c) * *(float *)(iVar7 + 0x30);
              fVar20 = *(float *)(iVar7 + 0x38) * *(float *)(iVar7 + 0x30);
              fVar19 = *(float *)(iVar7 + 0x34) * *(float *)(iVar7 + 0x30);
            }
            else {
              uVar22 = *(undefined4 *)(iVar7 + 0x30);
              fVar21 = 1.0;
              fVar20 = 1.0;
              fVar19 = 1.0;
            }
            glColor4f(fVar19,fVar20,fVar21,uVar22);
            fVar20 = fVar23;
            uVar22 = unaff_EBP;
            fVar21 = fVar23;
            glTexCoord2f(unaff_EBP,fVar23);
            fVar19 = fVar11;
            glVertex3f(fVar10,fVar11,uVar8);
            fVar20 = fVar20 + ((fVar1 + fVar12 * fVar2 * fVar13) - fVar15 * fVar11 * fVar14);
            glTexCoord2f(fVar20,fVar23);
            glVertex3f(fVar9,fVar10,fVar11);
            glTexCoord2f(fVar20,fVar19 + (float)piVar16);
            glVertex3f(fVar6,fVar9,fVar10);
            glTexCoord2f(unaff_EBP,fVar19 + (float)piVar16);
            glVertex3f(fVar5,fVar6,fVar9);
          }
          piVar16 = piVar16 + 1;
          unaff_EBP = uVar22;
          fVar23 = fVar21;
        } while (piVar16 != *(int **)(param_1 + 0xf4));
      }
      glEnd();
    }
  }
  return;
}


// ==== FUN_0040c060 @ 0040c060 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_0040c060(int param_1)

{
  undefined4 uVar1;
  undefined4 uVar2;
  undefined1 *local_54;
  float local_50;
  float fStack_40;
  float fStack_3c;
  float fStack_38;
  float fStack_34;
  float fStack_30;
  undefined4 uStack_2c;
  
  if (*(char *)(param_1 + 0x68) == '\0') {
    local_50 = _DAT_0045a310 - *(float *)(param_1 + 0x38);
    local_54 = (undefined1 *)(*(float *)(param_1 + 0x24) * _DAT_0045a5d4);
    glColor4f(*(float *)(param_1 + 0x1c) * _DAT_0045a5d4,*(float *)(param_1 + 0x20) * _DAT_0045a5d4)
    ;
    glDisable(0xb50);
  }
  else {
    local_50 = 4.05816e-42;
    local_54 = (undefined1 *)0x40c080;
    glEnable();
    local_54 = &stack0xffffffbc;
    fStack_40 = *(float *)(param_1 + 8) * _DAT_0045a5d4;
    fStack_38 = 1.0;
    fStack_3c = *(float *)(param_1 + 0xc) * _DAT_0045a5d4;
    glMaterialfv(0x408,0x1200);
    fStack_40 = *(float *)(param_1 + 0x10) * _DAT_0045a5d4;
    fStack_34 = 1.0;
    fStack_3c = *(float *)(param_1 + 0x14) * _DAT_0045a5d4;
    fStack_38 = *(float *)(param_1 + 0x18) * _DAT_0045a5d4;
    glMaterialfv(0x408,0x1600,&fStack_40);
    fStack_3c = *(float *)(param_1 + 0x1c) * _DAT_0045a5d4;
    fStack_38 = *(float *)(param_1 + 0x20) * _DAT_0045a5d4;
    fStack_34 = *(float *)(param_1 + 0x24) * _DAT_0045a5d4;
    fStack_30 = _DAT_0045a310 - *(float *)(param_1 + 0x38);
    glMaterialfv(0x408,0x1201,&fStack_3c);
    if (*(char *)(param_1 + 0x69) == '\0') {
      fStack_38 = 0.0;
      fStack_34 = 0.0;
      fStack_30 = 0.0;
      uStack_2c = 0x3f800000;
      glMaterialfv(0x408,0x1202,&fStack_38);
      uVar1 = 0x3f800000;
    }
    else {
      fStack_38 = *(float *)(param_1 + 0x28) * _DAT_0045a5d4;
      uStack_2c = 0x3f800000;
      fStack_34 = *(float *)(param_1 + 0x2c) * _DAT_0045a5d4;
      fStack_30 = *(float *)(param_1 + 0x30) * _DAT_0045a5d4;
      glMaterialfv(0x408,0x1202,&fStack_38);
      uVar1 = *(undefined4 *)(param_1 + 0x34);
    }
    glMaterialf(0x408,0x1601,uVar1);
  }
  if (fStack_3c == 0.0) {
    (*DAT_004a8fe0)(0x84c0);
    uVar1 = 0xde1;
    if (*(int *)(param_1 + 0x3c) < 1) {
LAB_0040c2bd:
      glDisable(uVar1);
    }
    else {
      glEnable(0xde1);
      FUN_0040f090(*(int *)(param_1 + 0x40));
      glTexEnvi(0x2300,0x2200,0x2100);
      if (*(int *)(param_1 + 0x4c) == 0) {
        glDisable(0xc60);
        uVar1 = 0xc61;
        goto LAB_0040c2bd;
      }
      if (*(int *)(param_1 + 0x4c) == 1) {
        glEnable(0xc60);
        glEnable(0xc61);
        glTexGeni(0x2000,0x2500,0x2402);
        glTexGeni(0x2001,0x2500,0x2402);
      }
    }
    (*DAT_004a8fe0)(0x84c1);
    if (*(int *)(param_1 + 0x3c) < 2) {
      glDisable(0xde1);
    }
    else {
      glEnable();
      FUN_0040f090(*(int *)(param_1 + 0x44));
      if (*(int *)(param_1 + 0x5c) == 0) {
LAB_0040c305:
        uVar1 = 0x2100;
LAB_0040c30a:
        glTexEnvi(0x2300,0x2200,uVar1);
      }
      else if (*(int *)(param_1 + 0x5c) == 1) {
        if (*(char *)(DAT_004a8f5c + 0x10) == '\0') goto LAB_0040c305;
        uVar1 = 0x104;
        goto LAB_0040c30a;
      }
      if (*(int *)(param_1 + 0x50) == 0) {
        glDisable(0xc60);
        glDisable(0xc61);
      }
      else if (*(int *)(param_1 + 0x50) == 1) {
        glEnable(0xc60);
        glEnable(0xc61);
        glTexGeni(0x2000,0x2500,0x2402);
        glTexGeni(0x2001,0x2500,0x2402);
      }
    }
    switch(*(undefined4 *)(param_1 + 0x58)) {
    case 0:
      glDisable(0xbe2);
      break;
    case 1:
      glEnable(0xbe2);
      glBlendFunc(1,1);
      break;
    case 2:
      glEnable(0xbe2);
      glBlendFunc(0x306,0);
      break;
    case 3:
      glEnable(0xbe2);
      glBlendFunc(0x302,0x303);
    }
  }
  else if (fStack_3c == 1.4013e-45) {
    (*DAT_004a8fe0)(0x84c1);
    glDisable(0xde1);
    (*DAT_004a8fe0)(0x84c0);
    glEnable(0xde1);
    FUN_0040f090(*(int *)(param_1 + 0x48));
    glEnable(0xbe2);
    if (*(int *)(param_1 + 0x60) == 0) {
      uVar2 = 0;
      uVar1 = 0x306;
LAB_0040c438:
      glBlendFunc(uVar1,uVar2);
    }
    else if (*(int *)(param_1 + 0x60) == 1) {
      uVar2 = 1;
      uVar1 = 1;
      goto LAB_0040c438;
    }
    if (*(int *)(param_1 + 0x54) == 0) {
      glDisable(0xc60);
      glDisable(0xc61);
    }
    else if (*(int *)(param_1 + 0x54) == 1) {
      glEnable(0xc60);
      glEnable(0xc61);
      glTexGeni(0x2000,0x2500,0x2402);
      glTexGeni(0x2001,0x2500,0x2402);
    }
  }
  switch(*(undefined4 *)(param_1 + 100)) {
  case 0:
    glDisable(0xb71);
    goto switchD_0040c497_default;
  case 1:
    glEnable(0xb71);
    glDepthMask(1);
    uVar1 = 0x207;
    goto LAB_0040c4e0;
  case 2:
    glEnable(0xb71);
    uVar1 = 0;
    break;
  case 3:
    glEnable(0xb71);
    uVar1 = 1;
    break;
  default:
    goto switchD_0040c497_default;
  }
  glDepthMask(uVar1);
  uVar1 = 0x203;
LAB_0040c4e0:
  glDepthFunc(uVar1);
switchD_0040c497_default:
  if ((*(char *)(param_1 + 0x6a) == '\0') || (DAT_004a8f74 == 0)) {
    glDisable(0xb60);
  }
  else {
    glEnable(0xb60);
    local_54 = (undefined1 *)(_DAT_004a8f68 * _DAT_0045a5d4);
    local_50 = _DAT_004a8f6c * _DAT_0045a5d4;
    glFogfv(0xb66,&local_54);
    if (DAT_004a8f74 == 1) {
      glFogi(0xb65,0x2601);
      glFogf(0xb63,DAT_004a8f78);
      glFogf(0xb64,DAT_00464330);
    }
  }
  if (*(char *)(param_1 + 0x6b) == '\0') {
    glEnable(0xb44);
    glFrontFace(0x900);
    return;
  }
  glDisable();
  return;
}


