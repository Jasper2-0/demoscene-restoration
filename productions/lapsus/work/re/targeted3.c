// ==== forced_0x444760 @ 00444760 ====

void __thiscall forced_0x444760(void *param_1,int param_2)

{
  float fVar1;
  float fStack_34;
  float fStack_30;
  float fStack_2c;
  float fStack_28;
  undefined4 uStack_24;
  
  uStack_24 = 0x444772;
  FUN_004445b0(param_1,param_2);
  uStack_24 = 0x1207;
  fVar1 = (float)(param_2 + 0x4000);
  fStack_2c = 6.270479e-39;
  fStack_28 = fVar1;
  glLightf();
  fStack_2c = 0.0;
  fStack_30 = 6.46839e-42;
  fStack_34 = fVar1;
  glLightf();
  glLightf(fVar1,0x1209,0);
  if (*(char *)((int)param_1 + 0xbc) == '\0') {
    FUN_0040f9f0((int)param_1);
  }
  fStack_34 = -*(float *)((int)param_1 + 0x74);
  fStack_30 = -*(float *)((int)param_1 + 0x78);
  fStack_28 = 0.0;
  fStack_2c = -*(float *)((int)param_1 + 0x7c);
  glLightfv(fVar1,0x1203,&fStack_34);
  return;
}


// ==== forced_0x4447f0 @ 004447f0 ====

float10 __fastcall forced_0x4447f0(int param_1)

{
  return SQRT((float10)*(float *)(param_1 + 0xd8) * (float10)*(float *)(param_1 + 0xd8) +
              (float10)*(float *)(param_1 + 0xd4) * (float10)*(float *)(param_1 + 0xd4) +
              (float10)*(float *)(param_1 + 0xd0) * (float10)*(float *)(param_1 + 0xd0));
}


// ==== forced_0x4448b0 @ 004448b0 ====

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __thiscall forced_0x4448b0(void *param_1,int param_2)

{
  int iStack_34;
  undefined4 uStack_30;
  
  uStack_30 = 0x4448c2;
  FUN_004445b0(param_1,param_2);
  uStack_30 = 0x1207;
  param_2 = param_2 + 0x4000;
  iStack_34 = param_2;
  glLightf();
  glLightf(param_2,0x1208,_DAT_0045b790 / (*(float *)((int)param_1 + 0xe8) * _DAT_0045a330));
  glLightf(param_2,0x1209,0x3d23d70a);
  if (*(char *)((int)param_1 + 0xbc) == '\0') {
    FUN_0040f9f0((int)param_1);
  }
  uStack_30 = *(undefined4 *)((int)param_1 + 0x84);
  iStack_34 = *(int *)((int)param_1 + 0x80);
  glLightfv(param_2,0x1203,&iStack_34);
  return;
}


// ==== forced_0x444970 @ 00444970 ====

float10 __thiscall forced_0x444970(int param_1,float *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float10 fVar5;
  float10 fVar6;
  float10 fVar7;
  
  fVar1 = *(float *)(param_1 + 0xd8);
  fVar4 = *(float *)(param_1 + 0xe8);
  fVar2 = *(float *)(param_1 + 0xd4);
  fVar3 = *(float *)(param_1 + 0xd0);
  if (*(char *)(param_1 + 0xbc) == '\0') {
    FUN_0040f9f0(param_1);
  }
  fVar5 = (float10)*param_2 - (float10)*(float *)(param_1 + 0x80);
  fVar6 = (float10)param_2[1] - (float10)*(float *)(param_1 + 0x84);
  fVar7 = (float10)param_2[2] - (float10)*(float *)(param_1 + 0x88);
  return (float10)fVar4 * (float10)SQRT(fVar1 * fVar1 + fVar2 * fVar2 + fVar3 * fVar3) -
         SQRT(fVar5 * fVar5 + fVar6 * fVar6 + fVar7 * fVar7);
}


// ==== FUN_0042d780 @ 0042d780 ====

int __fastcall FUN_0042d780(int param_1)

{
  if (*(char *)(param_1 + 0xbc) == '\0') {
    FUN_0040f9f0(param_1);
  }
  return param_1 + 0x5c;
}


// ==== FUN_0040fd00 @ 0040fd00 ====

void __thiscall FUN_0040fd00(void *this,float *param_1,float *param_2)

{
  float fVar1;
  float fVar2;
  float fVar3;
  float fVar4;
  float fVar5;
  float fVar6;
  float fVar7;
  float fVar8;
  float fVar9;
  float fVar10;
  float fVar11;
  
  fVar9 = *(float *)this;
  fVar10 = *(float *)((int)this + 4);
  fVar11 = *(float *)((int)this + 8);
  fVar1 = param_2[7];
  fVar2 = param_2[4];
  fVar3 = param_2[1];
  fVar4 = param_2[10];
  fVar5 = param_2[8];
  fVar6 = param_2[5];
  fVar7 = param_2[2];
  fVar8 = param_2[0xb];
  *param_1 = fVar9 * *param_2 + fVar10 * param_2[3] + fVar11 * param_2[6] + param_2[9];
  param_1[1] = fVar9 * fVar3 + fVar10 * fVar2 + fVar11 * fVar1 + fVar4;
  param_1[2] = fVar9 * fVar7 + fVar10 * fVar6 + fVar11 * fVar5 + fVar8;
  return;
}


