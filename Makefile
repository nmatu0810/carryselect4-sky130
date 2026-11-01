SHELL := /bin/bash

.PHONY: verify-all package slides report paper figures pnr pnr5 tau le-test fa-layout fa-drc fa-lvs fa-pex all tools golden lint-comb sim-unit lint synth-check sim sim-all wave synth sta compare help

all: tools

TEST ?= case1
SEED ?= 1

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

synth:
	@source scripts/env.sh && \
	mkdir -p syn/out && \
	sed -e "s|@LIB@|$$LIB_TT|g" -e "s|@ROOT@|$$REPO_DIR|g" syn/synth.ys > syn/out/synth.gen.ys && \
	cd syn/out && yosys -q -l yosys.log synth.gen.ys > /dev/null && cd ../.. && \
	python3 scripts/parse_synth.py synth

sta:
	@source scripts/env.sh && \
	mkdir -p syn/out results/logs && \
	scripts/olsh "LIB_TT=$$LIB_TT sta -no_splash -exit syn/sta.tcl" > syn/out/sta.log 2>&1; \
	rc=$$?; if [ $$rc -ne 0 ]; then tail -n 20 syn/out/sta.log; exit $$rc; fi; \
	python3 scripts/parse_synth.py sta

compare:
	@scripts/run_cmp.sh

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
	if ./verif/out/top/sim_top +TEST=$(TEST) +SEED=$(SEED) | tee verif/out/$(TEST).log \
	   && grep -qE '^RESULT $(TEST) PASS checked=[0-9]+ errors=0$$' verif/out/$(TEST).log; then \
		python3 scripts/metrics.py set sim.$(TEST).status PASS; \
		if [ "$(TEST)" = "case5" ]; then \
			python3 scripts/metrics.py set sim.exhaustive.checked \
				$$(sed -nE 's/^RESULT case5 PASS checked=([0-9]+) errors=0$$/\1/p' verif/out/case5.log) && \
			python3 scripts/metrics.py set sim.exhaustive.errors 0; \
		fi; \
		if [ "$(TEST)" = "case2" ]; then \
			python3 scripts/metrics.py set sim.latency_cycles \
				$$(sed -nE 's/^INFO case2 latency_cycles=([0-9]+) .*/\1/p' verif/out/case2.log) && \
			python3 scripts/metrics.py set sim.cycles_per_result \
				$$(sed -nE 's/^INFO case2 .* cycles_per_result=([0-9.]+) .*/\1/p' verif/out/case2.log); \
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
	@echo "  synth       - Yosys sky130 synthesis of carryselect4_top (syn/out), writes synth.* metrics"
	@echo "  sta         - OpenSTA (Docker) on the synthesized netlist, writes sta.synth.* metrics"
	@echo "  compare     - CSLA-4 vs RCA-4 area-delay (hier + flat), writes cmp.* metrics and results/cmp.csv"
	@echo "  sim         - Run simulation for TEST=<name> (default: case1)"
	@echo "  sim-all     - Run all simulation testcases"
	@echo "  wave        - Open waveform in GTKWave for TEST=<name>"

pnr:
	@scripts/run_pnr.sh 10 run_10ns

pnr5:
	@scripts/run_pnr.sh 5 run_5ns

le-test:
	@python3 -m pytest analysis/le/test_le_calc.py -q

tau:
	@source scripts/env.sh && python3 analysis/le/run_tau.py

MAGIC_BATCH = magic -dnull -noconsole -rcfile $$PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc

fa-layout:
	@source scripts/env.sh && python3 custom/fa/gen_layout.py && \
	$(MAGIC_BATCH) custom/fa/out/fa_cell_gen.tcl > custom/fa/out/gen.log 2>&1 && \
	$(MAGIC_BATCH) custom/fa/drc.tcl | grep DRC_ && python3 scripts/fa_stats.py && \
	QT_QPA_PLATFORM=offscreen klayout -zz -r scripts/gds2png.py -rd gds=custom/fa/out/fa_cell.gds \
		-rd out=docs/figures/fa_layout.png -rd w=1600 -rd zoom=0

fa-drc:
	@source scripts/env.sh && $(MAGIC_BATCH) custom/fa/drc.tcl | grep DRC_

fa-lvs:
	@custom/fa/lvs.sh

fa-pex:
	@source scripts/env.sh && $(MAGIC_BATCH) custom/fa/pex.tcl > custom/fa/out/pex.log 2>&1 && \
	python3 analysis/le/compare.py

PY ?= .venv/bin/python

# all report/paper figures (needs matplotlib + vcdvcd in .venv)
figures:
	@$(MAKE) -s sim TEST=case2 > /dev/null && $(MAKE) -s sim TEST=case4 > /dev/null && \
	source scripts/env.sh && ngspice -b custom/fa/sim/path_post.sp > custom/fa/out/path_post.log 2>&1 && \
	for s in block_diagram csla_struct fsm waves area_delay le_vs_spice fa_transient; do \
		$(PY) scripts/figs/make_$$s.py || exit 1; done

# IEEE paper; tectonic if installed, else a TeX Live with IEEEtran (see DEVIATIONS D5)
paper:
	@source scripts/env.sh && python3 scripts/metrics_to_tex.py > paper/metrics.tex && cd paper && \
	if command -v tectonic > /dev/null; then tectonic -c minimal main.tex; \
	else latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex > build.log 2>&1 || { tail -n 30 build.log; exit 1; }; fi && \
	cp main.pdf CarrySelect4_IEEE.pdf && echo "paper/CarrySelect4_IEEE.pdf"

# Vietnamese report (.docx) from report/vi/*.md
report:
	@cd report && { [ -d node_modules/docx ] || npm install --no-audit --no-fund > /dev/null; } && node build_docx.mjs

slides:
	@cd slides && { [ -d node_modules/pptxgenjs ] || npm install --no-audit --no-fund > /dev/null; } && node build_slides.mjs

# re-run everything reproducible (not PnR) and every metrics gate of Tasks 5-13
verify-all:
	@scripts/verify_all.sh

# submission archive (no venv, node_modules, PnR run directories or out/ folders)
package:
	@rm -f CarrySelect4_Nhom7.zip && \
	git ls-files -z | xargs -0 zip -q CarrySelect4_Nhom7.zip && \
	unzip -l CarrySelect4_Nhom7.zip | tail -1 && ls -la CarrySelect4_Nhom7.zip
