// Headless Ghidra script: discover Energia callbacks referenced through
// vtables or stored executable addresses, then export the structural oracle
// used to connect browser layers to their native render paths.
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
import java.util.Set;
import java.util.TreeSet;

public class EnergiaOracleAudit extends GhidraScript {
    private String symbolName(Address address) {
        Symbol symbol = currentProgram.getSymbolTable().getPrimarySymbol(address);
        return symbol == null ? "" : symbol.getName();
    }

    private Function ensureFunction(Address target) throws Exception {
        Function function = currentProgram.getFunctionManager().getFunctionAt(target);
        if (function != null) return function;
        if (currentProgram.getFunctionManager().getFunctionContaining(target) != null) return null;
        MemoryBlock block = currentProgram.getMemory().getBlock(target);
        if (block == null || !block.isExecute()) return null;
        if (currentProgram.getListing().getInstructionAt(target) == null && !disassemble(target)) {
            return null;
        }
        return createFunction(target, null);
    }

    private int discoverExecutableReferences() throws Exception {
        Memory memory = currentProgram.getMemory();
        Set<Address> candidates = new TreeSet<>();
        ReferenceIterator references = currentProgram.getReferenceManager()
            .getReferenceIterator(currentProgram.getMinAddress());
        while (references.hasNext()) {
            Reference reference = references.next();
            Address from = reference.getFromAddress();
            Address target = reference.getToAddress();
            MemoryBlock fromBlock = memory.getBlock(from);
            MemoryBlock targetBlock = memory.getBlock(target);
            if (fromBlock != null && targetBlock != null && targetBlock.isExecute()) {
                candidates.add(target);
            }
        }

        int discovered = 0;
        for (Address target : candidates) {
            if (currentProgram.getFunctionManager().getFunctionAt(target) != null ||
                currentProgram.getFunctionManager().getFunctionContaining(target) != null) continue;
            if (ensureFunction(target) != null) discovered++;
        }
        return discovered;
    }

    private int discoverCodePointerTable(Address start, Address end) throws Exception {
        Memory memory = currentProgram.getMemory();
        int discovered = 0;
        for (Address slot = start; slot.compareTo(end) < 0; slot = slot.add(4)) {
            Address target = toAddr(Integer.toUnsignedLong(memory.getInt(slot)));
            if (currentProgram.getFunctionManager().getFunctionAt(target) != null ||
                currentProgram.getFunctionManager().getFunctionContaining(target) != null) continue;
            if (ensureFunction(target) != null) discovered++;
        }
        return discovered;
    }

    private void dumpCodePointerTable(PrintWriter out, Address start, Address end) throws Exception {
        Memory memory = currentProgram.getMemory();
        int resolved = 0;
        out.println("# Code pointers in " + start + ".." + end);
        for (Address slot = start; slot.compareTo(end) < 0; slot = slot.add(4)) {
            Address target = toAddr(Integer.toUnsignedLong(memory.getInt(slot)));
            Function function = currentProgram.getFunctionManager().getFunctionAt(target);
            if (function == null) continue;
            resolved++;
            out.printf("%s %-32s -> %s %s%n",
                slot, symbolName(slot), target, function.getName());
        }
        out.println("# Resolved executable code-pointer slots: " + resolved);
        out.println();
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
        Address tableStart = toAddr("00437000");
        Address tableEnd = toAddr("00437800");
        int pointerFunctions = discoverCodePointerTable(tableStart, tableEnd);
        int referencedFunctions = discoverExecutableReferences();

        try (PrintWriter out = new PrintWriter(new FileWriter(outPath))) {
            dumpCodePointerTable(out, tableStart, tableEnd);
            dumpReferences(out, "0055a1ac"); // current show seconds
            dumpReferences(out, "004031a0"); // managed effect dispatcher
            dumpReferences(out, "00406dc0"); // compositor mode dispatcher
            dumpReferences(out, "00410f90"); // reused triangle layer
        }
        println("Discovered " + pointerFunctions + " pointer-table and " +
            referencedFunctions + " referenced code targets");
        println("Exported Energia oracle audit to " + outPath);
    }
}
