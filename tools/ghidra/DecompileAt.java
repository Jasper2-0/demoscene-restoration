// Headless Ghidra script: force function discovery at one or more virtual
// addresses, then decompile those functions. This is useful for callbacks that
// are reached only through vtables and were missed by the bulk analysis pass.
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import java.io.FileWriter;
import java.io.PrintWriter;

public class DecompileAt extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) {
            throw new IllegalArgumentException("usage: DecompileAt.java OUTPUT ADDRESS...");
        }

        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try (PrintWriter out = new PrintWriter(new FileWriter(args[0]))) {
            for (int index = 1; index < args.length; index++) {
                Address entry = toAddr(args[index]);
                Function function = currentProgram.getFunctionManager().getFunctionAt(entry);
                if (function == null) {
                    disassemble(entry);
                    function = createFunction(entry, "forced_" + args[index]);
                }
                out.printf("// ==== %s @ %s ====%n", function.getName(), entry);
                DecompileResults result = decompiler.decompileFunction(function, 120, monitor);
                if (result != null && result.decompileCompleted()) {
                    out.println(result.getDecompiledFunction().getC());
                } else {
                    out.println("// DECOMPILE FAILED");
                }
            }
        }
        println("Exported targeted decompilation to " + args[0]);
    }
}
