SHELL := /bin/bash

.PHONY: all tools golden lint-comb sim-unit lint synth-check sim sim-all wave help

all: tools

TEST ?= case1

golden:
	@source scripts/env.sh && python3 verif/golden/golden.py --outdir verif/vectors

lint-comb:
	@source scripts/env.sh && \
	verilator --lint-only -Wall --timescale 1ns/1ps --top-module csla4 rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv && \
	verilator --lint-only -Wall --timescale 1ns/1ps --top-module rca4 rtl/fa.sv rtl/rca4.sv

lint:
	@source scripts/env.sh && \
	verilator --lint-only -Wall --timescale 1ns/1ps --top-module carryselect4_top \
		rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv rtl/csla4_ctrl.sv rtl/carryselect4_top.sv

synth-check:
	@source scripts/env.sh && \
	mkdir -p syn/out && \
	cd syn/out && \
	yosys -p 'read_verilog -sv ../../rtl/fa.sv ../../rtl/rca2.sv ../../rtl/mux2.sv ../../rtl/csla4.sv ../../rtl/csla4_ctrl.sv ../../rtl/carryselect4_top.sv; synth -top carryselect4_top -flatten; select -assert-none t:$$_DLATCH*; select -assert-count 16 t:$$_DFF*; stat'

sim-unit:
	@source scripts/env.sh && \
	mkdir -p verif/out/unit && \
	verilator --binary --timing --timescale 1ns/1ps -Wno-fatal -Mdir verif/out/unit --top-module tb_csla4 \
		rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv rtl/rca4.sv verif/tb/tb_csla4.sv \
		-o sim_csla4 && \
	./verif/out/unit/sim_csla4 && \
	python3 scripts/metrics.py set sim.unit_csla4.checked 512 && \
	python3 scripts/metrics.py set sim.unit_csla4.errors 0

tools:
	@source scripts/env.sh && \
	VERILATOR_VER=$$(verilator --version | head -1) && \
	YOSYS_VER=$$(yosys -V | head -1) && \
	OPENLANE_VER=$$($$FLOW_CLI --version | head -1) && \
	MAGIC_VER=$$(magic --version | head -1) && \
	NGSPICE_VER=$$(ngspice -v </dev/null 2>&1 | grep -i 'ngspice-' | head -1 | sed 's/^[ *]*//') && \
	PDK_HASH=$$(basename "$$PDK_ROOT") && \
	echo "Verilator : $$VERILATOR_VER" && \
	echo "Yosys     : $$YOSYS_VER" && \
	echo "OpenLane  : $$OPENLANE_VER" && \
	echo "Magic     : $$MAGIC_VER" && \
	echo "Ngspice   : $$NGSPICE_VER" && \
	echo "PDK hash  : $$PDK_HASH" && \
	python3 scripts/metrics.py set env.verilator_version "$$VERILATOR_VER" && \
	python3 scripts/metrics.py set env.yosys_version "$$YOSYS_VER" && \
	python3 scripts/metrics.py set env.openlane_version "$$OPENLANE_VER" && \
	python3 scripts/metrics.py set env.magic_version "$$MAGIC_VER" && \
	python3 scripts/metrics.py set env.ngspice_version "$$NGSPICE_VER" && \
	python3 scripts/metrics.py set env.pdk_hash "$$PDK_HASH"

sim:
	@source scripts/env.sh && \
	mkdir -p verif/out/top && \
	mkdir -p verif/out && \
	verilator --binary --timing --trace --timescale 1ns/1ps -Wno-fatal \
		-Mdir verif/out/top --top-module tb_top \
		rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv rtl/csla4_ctrl.sv rtl/carryselect4_top.sv \
		verif/tb/tb_top.sv \
		-o sim_top && \
	set -o pipefail; \
	if ./verif/out/top/sim_top +TEST=$(TEST) | tee verif/out/$(TEST).log \
	   && grep -qE '^RESULT $(TEST) PASS checked=[0-9]+ errors=0$$' verif/out/$(TEST).log; then \
		python3 scripts/metrics.py set sim.$(TEST).status PASS; \
		if [ "$(TEST)" = "case5" ]; then \
			python3 scripts/metrics.py set sim.exhaustive.checked \
				$$(sed -nE 's/^RESULT case5 PASS checked=([0-9]+) errors=0$$/\1/p' verif/out/case5.log) && \
			python3 scripts/metrics.py set sim.exhaustive.errors 0; \
		fi; \
	else \
		python3 scripts/metrics.py set sim.$(TEST).status FAIL; \
		exit 1; \
	fi

sim-all:
	@for t in case1 case2 case3 case4 case5 case_illegal; do \
		$(MAKE) sim TEST=$$t || exit 1; \
	done

wave:
	gtkwave verif/out/$(TEST).vcd

help:
	@echo "CarrySelect-4 Makefile"
	@echo "Targets:"
	@echo "  tools       - Check toolchain versions and record env metrics"
	@echo "  golden      - Generate test vectors using golden model"
	@echo "  lint-comb   - Lint combinational RTL modules"
	@echo "  sim-unit    - Run unit simulation for csla4 and rca4"
	@echo "  lint        - Lint carryselect4_top RTL"
	@echo "  synth-check - Synthesis sanity check with Yosys (assert 16 DFFs, 0 latches)"
	@echo "  sim         - Run simulation for TEST=<name> (default: case1)"
	@echo "  sim-all     - Run all simulation testcases"
	@echo "  wave        - Open waveform in GTKWave for TEST=<name>"
