# Tổng hợp và phân tích thời gian tĩnh

## Tổng hợp bằng Yosys

Script `syn/synth.ys` đọc các file RTL, giữ phân cấp của `fa` và `mux2` (quyết định D-6), chạy `synth`, rồi ánh xạ flip-flop bằng `dfflibmap` và logic tổ hợp bằng `abc` với liberty `sky130_fd_sc_hd__tt_025C_1v80.lib`. Nhóm làm khác đề cương ở hai chỗ, đều ghi trong `docs/DEVIATIONS.md`.

Chỗ thứ nhất là D2. Lúc đầu các flip-flop trong netlist chỉ có tên kiểu `_28_`, nên report STA không cho biết đường đi qua thanh ghi nào. Nhóm thêm `rename -wire` để cell mang tên wire nó điều khiển, ví dụ `a_q[0]`. Logic và diện tích không đổi. Chỗ thứ hai là D3. ABC đã chọn 3 cell `lpflow_isobufsrc_1` (cell cách ly dùng cho power gating) làm logic thường trong `csla4_ctrl`, nên nhóm loại các cell `lpflow_*` khỏi ánh xạ, giống cách LibreLane làm. ABC chuyển sang `nor2b_1`, số cell và diện tích giữ nguyên.

## Ràng buộc thời gian (SDC)

File `syn/constraints.sdc` dùng chung cho tổng hợp, STA và LibreLane (quyết định D-7). Clock `clk` có chu kỳ 10 ns, `set_clock_uncertainty` 0.25 ns và `set_clock_transition` 0.15 ns. Mọi ngõ vào trừ `clk` có `set_input_delay` 2 ns, kể cả `rst_n`, và mọi ngõ ra có `set_output_delay` 2 ns. Ngõ vào được lái bởi `sky130_fd_sc_hd__inv_2`, ngõ ra mang tải `set_load` 0.0334 pF.

## Diện tích

Bảng: Kết quả tổng hợp `carryselect4_top`
| Chỉ số | Giá trị |
|---|---|
| Số cell | {{synth.top.cell_count}} |
| Số flip-flop / latch | {{synth.top.ff_count}} / {{synth.top.latch_count}} |
| Diện tích cell (µm²) | {{synth.top.area_um2}} |
| Diện tích NAND2 (µm²) | {{synth.nand2_area_um2}} |
| NAND2 tương đương | {{synth.top.nand2_eq}} |
| Ngân sách đề cương | 500 |

NAND2 tương đương được tính theo quyết định D-5: tổng diện tích cell chia cho diện tích `sky130_fd_sc_hd__nand2_1` đọc từ liberty. Thiết kế dùng chưa tới một nửa ngân sách 500 cổng.

## Phân tích thời gian tĩnh (OpenSTA)

Nhóm chạy OpenSTA ở corner tt (25 °C, 1.8 V) với clock lý tưởng.

Bảng: Kết quả STA sau tổng hợp (corner tt, chu kỳ 10 ns)
| Kiểm tra | Đường | Slack (ns) |
|---|---|---|
| Setup xấu nhất (toàn thiết kế) | `{{sta.synth.worst_path}}` | {{sta.synth.wns_setup_ns}} |
| Hold xấu nhất | trạng thái FSM | {{sta.synth.wns_hold_ns}} |
| Đường tới hạn thanh ghi–thanh ghi | `{{sta.synth.crit_path}}` | thời điểm đến {{sta.synth.crit_arrival_ns}} ns |

Theo D1, các key `wns_*` lưu worst slack (dương khi đạt timing) chứ không phải WNS của OpenSTA, vì WNS luôn bằng 0 khi không có vi phạm và không cho biết còn dư bao nhiêu. Đường setup xấu nhất toàn thiết kế bắt đầu từ cổng vào `valid_in`, do input delay 2 ns đã chiếm sẵn một phần chu kỳ. Đường adder thật sự chỉ hiện ra trong report thanh ghi–thanh ghi riêng. Nó đi đúng qua cấu trúc CSLA: hai cổng `maj3` của khối low tạo `c2`, rồi tới chân chọn của MUX.

Bảng: Đường tới hạn `a_q[0] → cout_q` (trích `results/logs/t6_sta.txt`)
| Chân | Cell | Trễ (ns) | Thời điểm (ns) |
|---|---|---|---|
| `a_q[0]/Q` | `dfrtp_1` | 0.418 | 0.418 |
| `u_low/u_fa0/cout` | `maj3_1` | 0.367 | 0.785 |
| `u_low/u_fa1/cout` (= `c2`) | `maj3_1` | 0.401 | 1.187 |
| `u_mux_co/y` (chân S → X) | `mux2_1` | 0.316 | 1.503 |
| MUX ngõ ra (`out_en`) | `mux2_1` | 0.281 | 1.784 |
| `cout_q/D` | `dfrtp_1` | – | 1.784 |

## So sánh Area–Delay giữa CSLA-4 và RCA-4

Để so sánh công bằng, nhóm tổng hợp riêng hai bộ cộng tổ hợp `csla4` và `rca4`, mỗi bộ hai biến thể: giữ phân cấp như thiết kế cuối, và cho phép flatten. Cả bốn biến thể dùng đúng flow của chương này, kể cả `-dont_use` cho `lpflow_*`. Độ trễ là thời điểm đến dài nhất từ ngõ vào tới ngõ ra, đo với clock ảo, input/output delay bằng 0 ở corner tt.

Bảng: So sánh diện tích và độ trễ (Task 7)
| Biến thể | Diện tích (µm²) | NAND2 tđ | Số cell | Trễ (ns) | ADP (µm²·ns) |
|---|---|---|---|---|---|
| CSLA-4 (phân cấp) | {{cmp.csla4.area_um2}} | {{cmp.csla4.nand2_eq}} | {{cmp.csla4.cell_count}} | {{cmp.csla4.delay_ns}} | {{cmp.csla4.adp}} |
| RCA-4 (phân cấp) | {{cmp.rca4.area_um2}} | {{cmp.rca4.nand2_eq}} | {{cmp.rca4.cell_count}} | {{cmp.rca4.delay_ns}} | {{cmp.rca4.adp}} |
| CSLA-4 (flatten) | {{cmp.csla4_flat.area_um2}} | {{cmp.csla4_flat.nand2_eq}} | {{cmp.csla4_flat.cell_count}} | {{cmp.csla4_flat.delay_ns}} | {{cmp.csla4_flat.adp}} |
| RCA-4 (flatten) | {{cmp.rca4_flat.area_um2}} | {{cmp.rca4_flat.nand2_eq}} | {{cmp.rca4_flat.cell_count}} | {{cmp.rca4_flat.delay_ns}} | {{cmp.rca4_flat.adp}} |

![Hình: So sánh diện tích, độ trễ và tích diện tích–độ trễ của 4 biến thể](../../docs/figures/area_delay.png)

Khi giữ phân cấp, CSLA nhanh hơn RCA ({{cmp.csla4.delay_ns}} so với {{cmp.rca4.delay_ns}} ns) nhưng diện tích lớn gần gấp đôi, nên tích diện tích–độ trễ (ADP) của nó kém hơn RCA.

Khi cho flatten, ABC thu nhỏ diện tích mạnh (CSLA giảm khoảng một nửa) nhưng cả hai bộ cộng đều chậm đi. CSLA flatten vẫn nhanh hơn RCA flatten và có ADP tốt nhất trong bốn biến thể. Đường dài nhất của bản flatten kết thúc bằng các cổng nhỏ như `o21ai_0` sau hai tầng `maj3`, còn bản phân cấp giữ nguyên `fa` là `maj3_1` cộng `xor3_1`.

Thiết kế cuối dùng bản giữ phân cấp (D-6), nên ưu thế tốc độ của CSLA là thật nhưng phải trả bằng diện tích. Nhóm chưa kiểm chứng nguyên nhân. Hai giả thuyết là ABC ưu tiên diện tích hơn tốc độ khi ánh xạ, và 4 bit quá ngắn để carry-select phát huy hết lợi thế.

Thứ hạng của hai bản flatten còn phụ thuộc phiên bản công cụ (D6). Khi chạy thử trong một môi trường khác (Yosys 0.70, liberty `open_pdks` 1.0.471), các bản flatten ra số khác và thứ tự CSLA/RCA đảo ngược; chạy lại trên máy nhóm với Yosys 0.66 và PDK ciel thì ra đúng các số trong bảng. Vì vậy nhóm chỉ rút kết luận chắc chắn từ so sánh giữa hai bản giữ phân cấp.
