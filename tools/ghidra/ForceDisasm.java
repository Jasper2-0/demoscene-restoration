// Headless script: disassemble executable bytes Ghidra's auto-analysis left
// undefined, and promote what it finds into functions.
//
// WHY THIS EXISTS. ExportDisasm.java iterates FUNCTIONS, so any code the
// analyser never turned into one is absent from the export — not wrong, just
// missing, which is worse, because a grep over the export then reports a clean
// "not found" for code that is sitting right there in the bytes.
//
// That is not hypothetical. In wONDEr.exe the per-triangle handler selection at
// 0x408140-0x4081bf is reached only through a jump table, was never made a
// function, and did not appear in disasm.asm at all; it had to be disassembled
// out-of-band with capstone before the material's two draw handlers (+0xcc per
// triangle, +0xd0 per batch) could be read. Searching that same export for the
// write to vertex+0x4c then returned "absent" — a result that cannot be trusted
// until the gaps are closed.
//
// Jump tables are the usual cause: the analyser resolves the switch dispatch but
// not every target, so the targets stay undefined bytes inside a code section.
//
// Usage (see productions/wonder/work/tools/run-oracle-audit.zsh for the pattern):
//   -postScript ForceDisasm.java [report.txt]
//
// Run it BEFORE ExportDisasm/ExportDecomp in the same headless invocation. Use
// -readOnly if the project should not be mutated: the scripts downstream still
// see this pass's results within the session.
import ghidra.app.script.GhidraScript;
import ghidra.app.cmd.disassemble.DisassembleCommand;
import ghidra.app.cmd.function.CreateFunctionCmd;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.MemoryBlock;
import java.io.*;

public class ForceDisasm extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        PrintWriter out = args.length > 0
            ? new PrintWriter(new FileWriter(args[0]))
            : new PrintWriter(System.out);

        Listing listing = currentProgram.getListing();
        int before = countInstructions(listing);
        int fnBefore = currentProgram.getFunctionManager().getFunctionCount();

        // Collect undefined bytes inside executable blocks. Gathered FIRST and
        // disassembled after, because disassembling while iterating the same
        // address space would walk over ranges the previous command just filled.
        AddressSet todo = new AddressSet();
        for (MemoryBlock b : currentProgram.getMemory().getBlocks()) {
            if (!b.isExecute() || !b.isInitialized()) continue;
            Address a = b.getStart();
            while (a != null && a.compareTo(b.getEnd()) <= 0) {
                if (listing.getInstructionAt(a) == null && listing.getDefinedDataAt(a) == null) {
                    todo.add(a);
                }
                a = a.next();
                if (monitor.isCancelled()) break;
            }
            out.println("block " + b.getName() + " " + b.getStart() + "-" + b.getEnd()
                        + " execute=" + b.isExecute());
        }
        out.println("undefined bytes in executable blocks: " + todo.getNumAddresses());

        // Disassemble each undefined run from its start, following flow. Ranges
        // already covered by an earlier command are skipped rather than redone.
        int attempted = 0, produced = 0;
        AddressRangeIterator ranges = todo.getAddressRanges();
        while (ranges.hasNext() && !monitor.isCancelled()) {
            AddressRange r = ranges.next();
            Address a = r.getMinAddress();
            while (a != null && a.compareTo(r.getMaxAddress()) <= 0) {
                if (listing.getInstructionAt(a) != null) { a = a.next(); continue; }
                attempted++;
                DisassembleCommand cmd = new DisassembleCommand(a, null, true);
                if (cmd.applyTo(currentProgram, monitor)) {
                    AddressSetView got = cmd.getDisassembledAddressSet();
                    if (got != null && !got.isEmpty()) {
                        produced++;
                        a = got.getMaxAddress().next();
                        continue;
                    }
                }
                a = a.next();
            }
        }
        out.println("disassembly attempted at " + attempted + " addresses, " + produced + " produced code");

        // Promote to functions so ExportDisasm/ExportDecomp can see them at all.
        // Only where nothing claims the address already; a body that belongs to an
        // existing function is left alone rather than split.
        int made = 0;
        InstructionIterator it = listing.getInstructions(true);
        while (it.hasNext() && !monitor.isCancelled()) {
            Instruction i = it.next();
            Address a = i.getAddress();
            if (currentProgram.getFunctionManager().getFunctionContaining(a) != null) continue;
            if (currentProgram.getReferenceManager().getReferenceCountTo(a) == 0) continue;
            CreateFunctionCmd fc = new CreateFunctionCmd(a);
            if (fc.applyTo(currentProgram, monitor)) made++;
        }

        int after = countInstructions(listing);
        int fnAfter = currentProgram.getFunctionManager().getFunctionCount();
        out.println("instructions " + before + " -> " + after + "  (+" + (after - before) + ")");
        out.println("functions    " + fnBefore + " -> " + fnAfter + "  (+" + (fnAfter - fnBefore)
                    + ", " + made + " created here)");
        out.flush();
        if (args.length > 0) out.close();
    }

    private int countInstructions(Listing l) {
        int n = 0;
        InstructionIterator it = l.getInstructions(true);
        while (it.hasNext()) { it.next(); n++; }
        return n;
    }
}
