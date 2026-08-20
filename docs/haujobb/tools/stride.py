import struct,sys
f=sys.argv[1]
d=open(f,'rb').read()
n=len(d)//4
W=struct.unpack('<%dI'%n, d[:n*4])
# find chains: increasing smallish ints at fixed byte stride
for stride_b in (36,40,20,16,28,32,44,48):
    s=stride_b//4
    best=[]
    i=0
    covered=set()
    for start in range(n-2*s):
        if start in covered: continue
        a,b,c=W[start],W[start+s],W[start+2*s]
        if a<b<c and c<5000 and b-a<200 and c-b<200:
            L=2; j=start+2*s
            while j+s<n and W[j+s]>W[j] and W[j+s]<5000 and W[j+s]-W[j]<200:
                j+=s; L+=1
            if L>=20:
                best.append((start*4,L,W[start],W[j]))
                for k in range(start,j+1,s): covered.add(k)
    if best:
        print(f"stride {stride_b}: {len(best)} chains, e.g. {best[:6]}")
