# CarrySelect-4 (CSLA 4-bit RTL→GDSII + Logical Effort)

Đồ án cuối kỳ môn CE2032 – Thiết kế VLSI (VKU).
Nhóm 7: Nguyễn Minh Anh Tú (23CE085) & Ngụy Quốc Trung (23CE.B026).

Repo này chứa lõi cộng carry-select 4 bit (chia 2+2) có thanh ghi vào/ra và FSM Moore điều khiển
giao tiếp valid/ready. Nhóm đưa lõi này đi hết luồng mã nguồn mở trên SkyWater SKY130: Verilator
để kiểm chứng, Yosys và OpenSTA để tổng hợp, OpenLane 2 / LibreLane để ra GDSII. Song song đó nhóm
vẽ tay một Full Adder 28T trên Magic và so ước lượng Logical Effort của nó với SPICE.

Mọi con số nằm trong `results/metrics.json`; bài báo, báo cáo và slide đọc số từ file này nên
không có số nào gõ tay. Danh sách sản phẩm ở [`DELIVERABLES.md`](DELIVERABLES.md), các chỗ nhóm
làm khác đề cương ở [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md).

## Cài đặt

Làm theo [`docs/SETUP.md`](docs/SETUP.md): Verilator, Yosys, KLayout, Magic, Netgen, Ngspice,
tectonic (hoặc TeX Live có `IEEEtran`), Node.js, jq, Docker với image LibreLane, PDK sky130A
qua ciel, và `.venv` có `librelane`, `matplotlib`, `vcdvcd`, `pytest`. Mọi lệnh đọc
`scripts/env.sh` (đặt `PDK_ROOT`, `LIB_TT`, `FLOW_CLI`, `OL_IMAGE`).

Máy không có image Docker vẫn chạy được: `scripts/run_pnr.sh` và `scripts/olsh` chuyển sang tool
native nếu OpenROAD, `sta`, Magic, Netgen và KLayout có trên `PATH` (xem D4). Số liệu trong tài
liệu đều đo ở chế độ Docker. `librelane --dockerized` cần một TTY, nên khi chạy từ script không có
terminal thì `run_pnr.sh` tự bọc lệnh bằng `script`.

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
| Số liệu sau PnR | `python3 scripts/parse_ol_metrics.py` (10 ns, ghi `pnr.*`) và `--run 5ns` (ghi `pnr5.*`); cũng sinh `results/logs/t8.txt` |
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
