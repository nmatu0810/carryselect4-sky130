# Danh mục tài liệu tham khảo {-}

1. O. J. Bedrij, "Carry-select adder," *IRE Transactions on Electronic Computers*, vol. EC-11, no. 3, pp. 340–346, 1962.
2. N. H. E. Weste and D. M. Harris, *CMOS VLSI Design: A Circuits and Systems Perspective*, 4th ed. Addison-Wesley, 2010.
3. C. Wolf, "Yosys Open SYnthesis Suite," https://yosyshq.net/yosys/, 2013.
4. Parallax Software, "OpenSTA: Static timing analyzer," https://github.com/The-OpenROAD-Project/OpenSTA, 2019.
5. M. Shalan and T. Edwards, "Building OpenLANE: A 130nm OpenROAD-based tapeout-proven flow," in *Proc. IEEE/ACM International Conference on Computer-Aided Design (ICCAD)*, 2020.
6. LibreLane Contributors, "LibreLane: an RTL-to-GDSII flow (successor of OpenLane 2)," https://github.com/librelane/librelane, 2025.
7. SkyWater Technology and Google, "SkyWater SKY130 open source process design kit," https://github.com/google/skywater-pdk, 2020.
8. I. Sutherland, B. Sproull, and D. Harris, *Logical Effort: Designing Fast CMOS Circuits*. Morgan Kaufmann, 1999.
9. J. K. Ousterhout, G. T. Hamachi, R. N. Mayo, W. S. Scott, and G. S. Taylor, "Magic: A VLSI layout system," in *Proc. 21st Design Automation Conference (DAC)*, 1984, pp. 152–159.

# Phụ lục {-}

## Phụ lục A: Cây thư mục {-}

Bảng: Các thư mục chính của repository
| Thư mục | Nội dung |
|---|---|
| `rtl/` | RTL SystemVerilog: `fa`, `rca2`, `mux2`, `csla4`, `rca4`, `csla4_ctrl`, `carryselect4_top` |
| `verif/` | mô hình tham chiếu Python, file vector, testbench |
| `syn/` | script Yosys, SDC, script OpenSTA |
| `pnr/` | cấu hình LibreLane và kết quả cuối (`pnr/final/`: GDS, DEF, netlist, SPEF, metrics) |
| `custom/fa/` | netlist, layout Magic, Euler path, DRC/LVS/PEX, mạch mô phỏng FA |
| `analysis/le/` | công cụ Logical Effort, đặc trưng hóa τ, so sánh LE–SPICE |
| `scripts/` | script môi trường, ghi số liệu, trích số liệu, vẽ hình |
| `results/` | `metrics.json`, `cmp.csv`, `le_compare.csv`, log tóm tắt từng task |
| `docs/` | đề cương thực hiện, sai khác (`DEVIATIONS.md`), hình vẽ |
| `paper/`, `report/`, `slides/` | bài báo IEEE, báo cáo .docx, slide bảo vệ |

## Phụ lục B: Các lệnh make {-}

Bảng: Lệnh make chính
| Lệnh | Chức năng |
|---|---|
| `make golden` | sinh file vector từ mô hình Python |
| `make lint`, `make lint-comb` | kiểm tra RTL bằng Verilator |
| `make sim-unit` | kiểm tra vét cạn khối `csla4` |
| `make sim TEST=<case>`, `make sim-all` | chạy kịch bản kiểm chứng |
| `make synth`, `make sta` | tổng hợp Yosys và STA OpenSTA |
| `make compare` | so sánh CSLA-4 và RCA-4 |
| `make pnr`, `make pnr5` | LibreLane ở 10 ns và 5 ns |
| `make le-test`, `make tau` | test công cụ LE và đặc trưng hóa τ |
| `make fa-layout`, `make fa-drc`, `make fa-lvs`, `make fa-pex` | layout, DRC, LVS, PEX của FA |
| `make figures` | sinh toàn bộ hình |
| `make paper`, `make report` | dựng bài báo và báo cáo |

## Phụ lục C: Các script chính {-}

- `scripts/env.sh`, `scripts/olsh`, `scripts/metrics.py`
- `scripts/parse_synth.py`, `scripts/run_cmp.sh`, `scripts/run_pnr.sh`, `scripts/parse_ol_metrics.py`, `scripts/gds2png.py`
- `analysis/le/le_calc.py`, `analysis/le/run_tau.py`, `analysis/le/fa_path.py`, `analysis/le/compare.py`
- `custom/fa/gen_layout.py`, `custom/fa/drc.tcl`, `custom/fa/lvs.sh`, `custom/fa/pex.tcl`, `scripts/fa_stats.py`
- `scripts/figs/make_*.py`, `scripts/figs/vcd_plot.py`
- `scripts/metrics_to_tex.py`, `scripts/pnr5_text.py`, `report/build_docx.mjs`, `slides/build_slides.mjs`
