// Decompile the scene VM's five build ops and four distinct eval ops, with r2
// pinned to the small-data base so r2-relative globals resolve to their names.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.symbol.SourceType;
import ghidra.program.model.listing.Function;
import ghidra.program.model.lang.Register;
import ghidra.app.decompiler.*;
import java.io.*;
import java.math.BigInteger;
import java.nio.file.*;
import java.util.*;

public class PPVm extends GhidraScript {
    public void run() throws Exception {
        // pass the loader output directory as the script argument:
//   -postScript PPVm.java /path/to/flat
        String dir = getScriptArgs().length > 0 ? getScriptArgs()[0] : "flat";

        for (String line : Files.readAllLines(Paths.get(dir + "/layout.txt"))) {
            String[] f = line.split(",");
            if (f[0].equals("seg0")) continue;
            Address a = toAddr(Long.decode(f[2]));
            long size = Long.decode(f[3]);
            if (f[1].equals("BSS")) {
                MemoryBlock b = currentProgram.getMemory().createUninitializedBlock(f[0], a, size, false);
                b.setRead(true); b.setWrite(true);
            } else {
                File bin = null;
                for (File c : new File(dir).listFiles())
                    if (c.getName().startsWith(f[0] + "_")) bin = c;
                byte[] d = Files.readAllBytes(bin.toPath());
                MemoryBlock b = currentProgram.getMemory().createInitializedBlock(
                        f[0], a, new ByteArrayInputStream(d), d.length, monitor, false);
                b.setRead(true); b.setWrite(true);
            }
        }
        for (String line : Files.readAllLines(Paths.get(dir + "/symbols.csv"))) {
            String[] f = line.split(",");
            createLabel(toAddr(Long.decode(f[0])), f[1], true, SourceType.IMPORTED);
        }

        // pin r2 = small-data base across the whole code region
        Register r2 = currentProgram.getRegister("r2");
        currentProgram.getProgramContext().setValue(r2, toAddr(0x10000404L), toAddr(0x10007100L),
                BigInteger.valueOf(0x10007FFEL));
        println("pinned r2 = 0x10007FFE over the PPC code");

        long[] build = {0x100048b8L, 0x10004b5cL, 0x10004c24L, 0x10004c64L, 0x10004cecL};
        long[] eval  = {0x10004d8cL, 0x10004d90L, 0x10004de0L, 0x10004e64L};
        Map<Long,String> names = new LinkedHashMap<>();
        for (int i = 0; i < build.length; i++) names.put(build[i], "vm_build_op" + i);
        for (int i = 0; i < eval.length;  i++) names.putIfAbsent(eval[i], "vm_eval_" + Long.toHexString(eval[i]));
        // also the two named anchors, for context
        names.put(0x10003018L, "_generate_obj");
        names.put(0x100021a0L, "_generate_scene");

        for (Map.Entry<Long,String> e : names.entrySet()) {
            Address a = toAddr(e.getKey());
            try { disassemble(a); createFunction(a, e.getValue()); } catch (Exception ex) {}
        }
        analyzeChanges(currentProgram);

        DecompInterface di = new DecompInterface();
        DecompileOptions opt = new DecompileOptions();
        di.setOptions(opt);
        di.openProgram(currentProgram);
        StringBuilder out = new StringBuilder();
        for (Map.Entry<Long,String> e : names.entrySet()) {
            Function fn = getFunctionAt(toAddr(e.getKey()));
            if (fn == null) { out.append("// " + e.getValue() + ": no function\n"); continue; }
            DecompileResults r = di.decompileFunction(fn, 120, monitor);
            out.append("\n/* ===== " + e.getValue() + " @ " + Long.toHexString(e.getKey())
                       + "  (" + fn.getBody().getNumAddresses() + " bytes) ===== */\n");
            out.append(r.decompileCompleted() ? r.getDecompiledFunction().getC()
                                              : "// FAILED: " + r.getErrorMessage());
        }
        Files.write(Paths.get(dir + "/vm.c"), out.toString().getBytes());
        println("wrote vm.c (" + out.length() + " bytes)");
    }
}
