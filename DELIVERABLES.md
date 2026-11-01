# Deliverables – CarrySelect-4 (Nhóm 7, CE2032)

Bảng ánh xạ sản phẩm theo đề cương và guideline (mục *Goal* và *Global Constraints* của
`docs/superpowers/plans/2026-10-20-carryselect4.md`) sang file trong repository. File guideline
gốc (`CSLA_VLSI_Project_Report.md`, mục VI) không nằm trong repo; bảng dưới theo đúng danh sách
sản phẩm mà plan rút ra từ file đó.

| Deliverable | File | Tạo lại bằng |
|---|---|---|
| RTL SystemVerilog | `rtl/*.sv` | – |
| Testbench, mô hình tham chiếu, vector | `verif/tb/`, `verif/golden/`, `verif/vectors/` | `make golden`, `make sim-all` |
| Netlist tổng hợp, SDC, báo cáo STA | `syn/`, `results/logs/t6_sta.txt` | `make synth sta` |
| So sánh CSLA-4 / RCA-4 | `results/cmp.csv`, `results/logs/t7.txt` | `make compare` |
| GDSII và kết quả sign-off | `pnr/final/carryselect4_top.gds`, `pnr/final/ol_metrics.json`, `pnr/final/{def,nl,spef,sdf,lef,lib}/` | `make pnr` |
| Ảnh layout chip | `docs/figures/layout_top.png`, `docs/figures/layout_top_zoom.png` | `scripts/gds2png.py` |
| FA full-custom: netlist, layout, Euler path | `custom/fa/fa_cell.spice`, `custom/fa/fa_cell.mag`, `custom/fa/euler.md` | `make fa-layout` |
| FA: DRC, LVS, PEX | `results/logs/t13_lvs.txt`, `results/logs/t13_pex.txt` | `make fa-drc fa-lvs fa-pex` |
| Logical Effort và so sánh SPICE | `analysis/le/`, `results/le_compare.csv` | `make tau`, `make fa-pex` |
| Số liệu tổng hợp | `results/metrics.json` | các lệnh trên |
| Hình vẽ | `docs/figures/*.png` | `make figures` |
| Bài báo IEEE (tiếng Anh, ≤ 4 trang) | `paper/CarrySelect4_IEEE.pdf` | `make paper` |
| Báo cáo tiếng Việt (.docx) | `report/baocao_CarrySelect4.docx` | `make report` |
| Slide bảo vệ (.pptx) | `slides/CarrySelect4_BaoVe.pptx` | `node slides/build_slides.mjs` |
| Sai khác so với đề cương | `docs/DEVIATIONS.md` | – |
| Gói nộp | `CarrySelect4_Nhom7.zip` | `make package` |

## GDSII

- File: `pnr/final/carryselect4_top.gds`
- sha256: `8bac1eeeec848bfc267a56ba33648defed09c47926ea3519f53379e6b1dd428b`

`make verify-all` không chạy lại PnR; nó so sha256 của GDS với giá trị trên.
