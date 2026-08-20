// ==== FUN_00405440 @ 00405440 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __cdecl FUN_00405440(int param_1,float param_2)

{
  float fVar1;
  undefined4 uVar2;
  float10 fVar3;
  char *extraout_var;
  undefined4 local_4;
  
  FUN_004333b6(&stack0xfffffff0,(int *)(param_1 + 8));
  uVar2 = FUN_004044a0(extraout_var);
  fVar1 = ((float)*(int *)(param_1 + 4) + param_2) * (float)*(int *)(param_1 + 0x20) * _DAT_0043ca44
  ;
  FUN_004323e0(&DAT_00488570,*(byte **)(param_1 + 0x10),&local_4);
  switch(uVar2) {
  case 1:
    FUN_00404650(0.0);
    return;
  case 2:
    _rand();
    _rand();
    FUN_00404650(0.0);
    return;
  case 3:
    FUN_00404df0();
    return;
  case 4:
    FUN_00404650(1.4013e-45);
    return;
  case 5:
    __ftol();
    FUN_00405000();
    return;
  case 6:
    glBindTexture(0xde1);
    glCopyTexSubImage2D(0xde1,0,0,0,0,0,0x200,0x100);
    glClear(0x4000);
    return;
  case 7:
    FUN_00403880(fVar1 * (float)_DAT_0043c670,6.522114e-39);
    break;
  case 8:
    FUN_00403d90(fVar1 * (float)_DAT_0043c670,0x470500,0x460500);
    FUN_00403fe0();
    return;
  case 9:
    FUN_00403d90(fVar1 * (float)_DAT_0043c670,0x470500,0x460500);
    FUN_00403fe0();
    return;
  case 10:
    FUN_00403b40(fVar1 * (float)_DAT_0043c670,0x470500);
    break;
  case 0xb:
    FUN_00403540(fVar1 * (float)_DAT_0043c670,0x470500);
    break;
  case 0xc:
    FUN_004035e0(fVar1 * (float)_DAT_0043c670,0x470500);
    break;
  case 0xd:
    FUN_00403680(fVar1 * (float)_DAT_0043c670,0x470500);
    break;
  case 0xe:
    FUN_00403780(fVar1 * (float)_DAT_0043c670,0x470500);
    break;
  case 0xf:
    FUN_00403780(fVar1 * (float)_DAT_0043c670,0x470500);
    FUN_00403780(-fVar1 * (float)_DAT_0043ca38,0x460500);
    fVar3 = (float10)fsin((float10)fVar1 * (float10)_DAT_0043c788);
    FUN_00404240((float)(fVar3 * (float10)_DAT_0043c780),0x470500,(float *)&DAT_00460500,0x450500);
    FUN_00403fe0();
  case 0x14:
    FUN_00403780(fVar1 * (float)_DAT_0043c670,0x470500);
    FUN_00403780(-fVar1 * (float)_DAT_0043ca38,0x460500);
    fVar3 = (float10)fsin((float10)fVar1 * (float10)_DAT_0043c788);
    FUN_00404240((float)(fVar3 * (float10)_DAT_0043c780),0x470500,(float *)&DAT_00460500,0x450500);
    FUN_00403fe0();
    return;
  default:
    return;
  }
  FUN_00403fe0();
  return;
}


// ==== FUN_00412fa0 @ 00412fa0 ====

undefined4 __thiscall FUN_00412fa0(void *this,char *param_1)

{
  void *this_00;
  int *piVar1;
  undefined4 in_stack_ffffffd8;
  undefined4 uVar2;
  char *pcVar3;
  void *local_c;
  undefined1 *puStack_8;
  undefined4 local_4;
  
  local_4 = 0xffffffff;
  puStack_8 = &LAB_0043b15b;
  local_c = ExceptionList;
  uVar2 = 0x412fc3;
  ExceptionList = &local_c;
  this_00 = FUN_00432916(0x18);
  piVar1 = (int *)0x0;
  local_4 = 0;
  if (this_00 != (void *)0x0) {
    pcVar3 = &DAT_00444118;
    FUN_00416680(&stack0xffffffd8,param_1,-1);
    piVar1 = FUN_00416120(this_00,in_stack_ffffffd8,uVar2,pcVar3);
  }
  local_4 = 0xffffffff;
  *(int **)((int)this + 0xb8) = piVar1;
  piVar1 = FUN_00416360(piVar1);
  *(int **)((int)this + 0x100) = piVar1;
  piVar1 = FUN_00416360(*(int **)((int)this + 0xb8));
  *(int **)((int)this + 0x104) = piVar1;
  FUN_00413060(this,this);
  FUN_00413250((int)this);
  FUN_00413e50(this,(int)this);
  FUN_00413ea0(this,(int)this);
  FUN_00413ff0((int)this);
  ExceptionList = local_c;
  return 0;
}


// ==== FUN_00412b60 @ 00412b60 ====

void __thiscall FUN_00412b60(void *this,undefined4 *param_1)

{
  FUN_00412b70((int)this,param_1);
  return;
}


// ==== FUN_00412980 @ 00412980 ====

void __thiscall FUN_00412980(void *this,undefined4 param_1,undefined4 *param_2)

{
  float unaff_EDI;
  int iVar1;
  undefined4 uVar2;
  undefined4 local_10;
  undefined4 local_c;
  undefined4 local_8;
  undefined4 local_4;
  
  if (param_2 == (undefined4 *)0x0) {
    local_10 = 0x3f4ccccd;
    local_c = 0x3f4ccccd;
    local_8 = 0x3f4ccccd;
    local_4 = 0x3f800000;
    glMaterialfv(0x404,0x1201,&local_10);
    uVar2 = 0x3f800000;
  }
  else {
    local_4 = param_2[4];
    local_10 = 0x3f4ccccd;
    local_c = 0x3f4ccccd;
    local_8 = 0x3f4ccccd;
    glMaterialfv(0x404,0x1201,&local_10);
    uVar2 = param_2[4];
  }
  glColor4f(0x3f800000,0x3f800000,0x3f800000,uVar2);
  if (*(int *)((int)this + 0x110) < 1) {
    glDisable(0xb50);
    uVar2 = 0x1d00;
  }
  else {
    glEnable();
    uVar2 = 0x1d01;
  }
  glShadeModel(uVar2);
  *(undefined4 *)((int)this + 0x114) = 0;
  FUN_00410e90(*(void **)((int)this + 0x10c),unaff_EDI);
  FUN_00412c30((int)this,unaff_EDI,*(undefined4 *)((int)this + 0x10c),1);
  glMatrixMode(0x1700);
  glLoadIdentity();
  FUN_00412c90(this,(int)this);
  glEnable(0xb71);
  glDepthMask(1);
  if (param_2 != (undefined4 *)0x0) {
    glEnable(0xbe2);
    glBlendFunc(*param_2,param_2[1]);
  }
  FUN_00412e20((int)this);
  glDepthMask(0);
  if (param_2 != (undefined4 *)0x0) {
    glBlendFunc(param_2[2],param_2[3]);
  }
  FUN_00412eb0((int)this);
  glDepthMask(1);
  if (param_2 != (undefined4 *)0x0) {
    glDisable(0xbe2);
  }
  iVar1 = 0;
  if (0 < *(int *)((int)this + 0x114)) {
    do {
      uVar2 = FUN_00411740(iVar1);
      glDisable(uVar2);
      iVar1 = iVar1 + 1;
    } while (iVar1 < *(int *)((int)this + 0x114));
  }
  FUN_00412f50((int)this);
  return;
}


