SHELL := /bin/bash

.PHONY: all tools help

all: tools

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
	@echo "  tools    - Check toolchain versions and record env metrics"
