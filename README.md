# CarrySelect-4 (CSLA 4-bit RTL→GDSII + Logical Effort)

Đồ án cuối kỳ môn CE2032 – Thiết kế VLSI (VKU).
Nhóm 7: Nguyễn Minh Anh Tú (23CE085) & Ngụy Quốc Trung (23CE.B026).

Lõi cộng carry-select 4 bit (chia 2+2) có thanh ghi vào/ra và FSM Moore điều khiển giao tiếp
valid/ready, đi hết luồng mã nguồn mở trên SkyWater SKY130 (Verilator → Yosys/OpenSTA →
OpenLane 2 / LibreLane → GDSII), kèm Full Adder 28T vẽ full-custom trên Magic và phân tích
Logical Effort đối chiếu với SPICE. Mọi số liệu nằm trong `results/metrics.json`; bài báo,
báo cáo và slide đọc số từ file này. Danh sách sản phẩm: [`DELIVERABLES.md`](DELIVERABLES.md).
Các sai khác so với đề cương: [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md).

## Cài đặt

Làm theo [`docs/SETUP.md`](docs/SETUP.md): Verilator, Yosys, KLayout, Magic, Netgen, Ngspice,
tectonic (hoặc TeX Live có `IEEEtran`), Node.js, jq, Docker với image LibreLane, PDK sky130A
qua ciel, và `.venv` có `librelane`, `matplotlib`, `vcdvcd`, `pytest`. Mọi lệnh đọc
`scripts/env.sh` (đặt `PDK_ROOT`, `LIB_TT`, `FLOW_CLI`, `OL_IMAGE`).

Không có image Docker? `scripts/run_pnr.sh` và `scripts/olsh` tự chạy native nếu các tool
(OpenROAD, `sta`, Magic, Netgen, KLayout) có trên `PATH` (xem D4).

## Chạy từng bước

| Bước | Lệnh |
|---|---|
| Vector tham chiếu | `make golden` |
| Lint RTL | `make lint-comb`, `make lint` |
| Kiểm tra khối `csla4` | `make sim-unit` |
| Mô phỏng | `make sim TEST=case2`, `make sim-all`, `make wave TEST=case2` |
| Tổng hợp + STA | `make synth sta` |
| So sánh CSLA / RCA | `make compare` |
| RTL→GDSII | `make pnr` (10 ns), `make pnr5` (5 ns) |
| Số liệu sau PnR | `python3 scripts/parse_ol_metrics.py` |
| τ và Logical Effort | `make le-test`, `make tau`, `python3 analysis/le/fa_path.py` |
| FA full-custom | `make fa-layout`, `make fa-drc`, `make fa-lvs`, `make fa-pex` |
| Hình | `make figures` |
| Tài liệu | `make paper`, `make report`, `make slides` |
| Kiểm tra tổng + đóng gói | `make verify-all`, `make package` |

## Cây thư mục

```
rtl/            RTL SystemVerilog (fa, rca2, mux2, csla4, rca4, csla4_ctrl, carryselect4_top)
verif/          golden model Python, vector, testbench SystemVerilog
syn/            Yosys, SDC dùng chung, OpenSTA
pnr/            config LibreLane; final/ = GDS, DEF, netlist, SPEF, SDF, ol_metrics.json
custom/fa/      FA 28T: netlist S1/S2, gen_layout.py, fa_cell.mag, euler.md, DRC/LVS/PEX, sim/
analysis/le/    le_calc.py (+test), đặc trưng hóa τ, fa_path.py, compare.py
scripts/        env, metrics, parser, run_pnr, gds2png, fa_stats, figs/, verify_all, consistency
results/        metrics.json, cmp.csv, le_compare.csv, logs/ (tóm tắt từng task)
docs/           plan, SETUP, DEVIATIONS, figures/
paper/          bài báo IEEE (main.tex, refs.bib, CarrySelect4_IEEE.pdf)
report/         bộ dựng .docx và chương tiếng Việt (vi/*.md)
slides/         bộ dựng .pptx và CarrySelect4_BaoVe.pptx
```
