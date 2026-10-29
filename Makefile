SHELL := /bin/bash

.PHONY: all tools golden lint-comb sim-unit help

all: tools

golden:
	@source scripts/env.sh && python3 verif/golden/golden.py --outdir verif/vectors

lint-comb:
	@source scripts/env.sh && \
	verilator --lint-only -Wall --timescale 1ns/1ps --top-module csla4 rtl/fa.sv rtl/rca2.sv rtl/mux2.sv rtl/csla4.sv && \
	verilator --lint-only -Wall --timescale 1ns/1ps --top-module rca4 rtl/fa.sv rtl/rca4.sv

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

help:
	@echo "CarrySelect-4 Makefile"
	@echo "Targets:"
	@echo "  tools     - Check toolchain versions and record env metrics"
	@echo "  golden    - Generate test vectors using golden model"
	@echo "  lint-comb - Lint combinational RTL modules"
	@echo "  sim-unit  - Run unit simulation for csla4 and rca4"
