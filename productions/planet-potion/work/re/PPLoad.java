// Post-import script: add the remaining hunks as memory blocks, apply the
// recovered symbol table, disassemble every function symbol, then decompile a
// short list of interesting ones to stdout.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.symbol.SourceType;
import ghidra.program.model.listing.Function;
import ghidra.app.decompiler.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class PPLoad extends GhidraScript {
    public void run() throws Exception {
        // pass the loader output directory as the script argument:
//   -postScript PPLoad.java /path/to/flat
        String dir = getScriptArgs().length > 0 ? getScriptArgs()[0] : "flat";

        // --- extra segments as blocks
        for (String line : Files.readAllLines(Paths.get(dir + "/layout.txt"))) {
            String[] f = line.split(",");
            if (f[0].equals("seg0")) continue;
            long base = Long.decode(f[2]); long size = Long.decode(f[3]);
            Address a = toAddr(base);
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
            println("block " + f[0] + " @ " + a);
        }

        // --- symbols
        List<String[]> fns = new ArrayList<>();
        int n = 0;
        for (String line : Files.readAllLines(Paths.get(dir + "/symbols.csv"))) {
            String[] f = line.split(",");
            Address a = toAddr(Long.decode(f[0]));
            createLabel(a, f[1], true, SourceType.IMPORTED);
            n++;
            // code-hunk symbols below the data area, not compiler float literals
            if (Long.decode(f[0]) < 0x10007000L && !f[1].startsWith("__0_") && !f[1].startsWith("__1_"))
                fns.add(new String[]{f[0], f[1]});
        }
        println("applied " + n + " symbols; " + fns.size() + " look like functions");

        // --- disassemble + create functions
        int made = 0;
        for (String[] f : fns) {
            Address a = toAddr(Long.decode(f[0]));
            if (f[1].equals("_W3D_ContextTag")) continue;   // data table
            try {
                disassemble(a);
                Function fn = createFunction(a, f[1]);
                if (fn != null) made++;
            } catch (Exception e) { }
        }
        println("created " + made + " functions");

        // --- decompile the interesting ones
        DecompInterface di = new DecompInterface();
        di.openProgram(currentProgram);
        String[] want = {"_main", "_play_scene_dalej", "_run_w3d", "_run_w3d_setstate",
                         "_play_scene", "_generate_obj", "_lock", "_run68k"};
        StringBuilder out = new StringBuilder();
        for (String w : want) {
            for (String[] f : fns) {
                if (!f[1].equals(w)) continue;
                Function fn = getFunctionAt(toAddr(Long.decode(f[0])));
                if (fn == null) { out.append("// " + w + ": no function\n"); continue; }
                DecompileResults r = di.decompileFunction(fn, 90, monitor);
                out.append("\n/* ===== " + w + " @ " + f[0] + " ===== */\n");
                out.append(r.decompileCompleted() ? r.getDecompiledFunction().getC()
                                                  : "// decompile failed: " + r.getErrorMessage());
            }
        }
        Files.write(Paths.get(dir + "/decomp.c"), out.toString().getBytes());
        println("wrote decomp.c (" + out.length() + " bytes)");
    }
}
