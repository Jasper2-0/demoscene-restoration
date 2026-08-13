// Headless script: export the disassembly listing of every function, with the
// SAME "// ==== name @ address ====" markers as ExportDecomp.java, so the two
// exports cross-reference line-for-line by function.
//
// Why this exists (METHOD.md §3): Ghidra's x86 decompiler silently drops x87
// floating-point expressions — a function's entire math can evaporate from the
// C export while the instructions sit right there in the bytes. The paired
// disassembly is the ground truth the decompilation is audited against; see
// tools/x87-audit.mjs for the automated cross-check.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import java.io.*;

public class ExportDisasm extends GhidraScript {
    @Override
    public void run() throws Exception {
        String outPath = getScriptArgs()[0];
        PrintWriter out = new PrintWriter(new FileWriter(outPath));
        FunctionIterator it = currentProgram.getFunctionManager().getFunctions(true);
        Listing listing = currentProgram.getListing();
        int n = 0;
        while (it.hasNext() && !monitor.isCancelled()) {
            Function f = it.next();
            if (f.isThunk()) continue;
            out.println("// ==== " + f.getName() + " @ " + f.getEntryPoint() + " ====");
            InstructionIterator ins = listing.getInstructions(f.getBody(), true);
            while (ins.hasNext()) {
                Instruction i = ins.next();
                StringBuilder bytes = new StringBuilder();
                try {
                    for (byte b : i.getBytes()) bytes.append(String.format("%02x", b));
                } catch (Exception e) { bytes.append("??"); }
                out.printf("%s  %-20s  %s%n", i.getAddress(), bytes, i.toString());
            }
            out.println();
            n++;
        }
        out.close();
        println("Exported disassembly of " + n + " functions to " + outPath);
    }
}
