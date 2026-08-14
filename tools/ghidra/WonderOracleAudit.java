// Headless Ghidra script: discover and export Wonder's stored code pointers
// plus selected data xrefs used to tie browser effects to native render paths.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.mem.Memory;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;
import ghidra.program.model.symbol.Symbol;
import java.io.FileWriter;
import java.io.PrintWriter;

public class WonderOracleAudit extends GhidraScript {
    private String symbolName(Address address) {
        Symbol symbol = currentProgram.getSymbolTable().getPrimarySymbol(address);
        return symbol == null ? "" : symbol.getName();
    }

    private void dumpCodePointerTables(PrintWriter out, Address start, Address end) throws Exception {
        Memory memory = currentProgram.getMemory();
        out.println("# Code pointers in " + start + ".." + end);
        int discovered = 0;
        int resolved = 0;
        for (Address slot = start; slot.compareTo(end) < 0; slot = slot.add(4)) {
            long raw = Integer.toUnsignedLong(memory.getInt(slot));
            Address target = toAddr(raw);
            Function function = currentProgram.getFunctionManager().getFunctionAt(target);
            if (function == null &&
                currentProgram.getFunctionManager().getFunctionContaining(target) == null) {
                MemoryBlock block = memory.getBlock(target);
                if (block != null && block.isExecute()) {
                    if (currentProgram.getListing().getInstructionAt(target) == null) {
                        disassemble(target);
                    }
                    function = createFunction(target, null);
                    if (function != null) discovered++;
                }
            }
            if (function == null) continue;
            resolved++;
            String owner = symbolName(slot);
            out.printf("%s %-32s -> %s %s%n", slot, owner, target, function.getName());
        }
        out.println("# Resolved executable code-pointer slots: " + resolved);
        out.println();
        println("Discovered " + discovered + " new code-pointer functions");
    }

    private void dumpReferences(PrintWriter out, String addressText) {
        Address target = toAddr(addressText);
        out.println("# References to " + target + " " + symbolName(target));
        ReferenceIterator references = currentProgram.getReferenceManager().getReferencesTo(target);
        for (Reference reference : references) {
            Address from = reference.getFromAddress();
            Function function = currentProgram.getFunctionManager().getFunctionContaining(from);
            out.printf("%s %-24s %s%n", from,
                function == null ? "<no function>" : function.getName(), reference.getReferenceType());
        }
        out.println();
    }

    @Override
    public void run() throws Exception {
        String outPath = getScriptArgs()[0];
        try (PrintWriter out = new PrintWriter(new FileWriter(outPath))) {
            dumpCodePointerTables(out, toAddr("00433000"), toAddr("00433800"));
            dumpReferences(out, "004360c4");
            dumpReferences(out, "00406700");
            dumpReferences(out, "00406760");
            dumpReferences(out, "0040bce0");
        }
        println("Exported Wonder oracle audit to " + outPath);
    }
}
