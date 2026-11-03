# Kết luận

## Đối chiếu với mục tiêu

Bảng: Mục tiêu trong đề cương và kết quả đạt được
| Mục tiêu | Đạt được | Đánh giá |
|---|---|---|
| Kiểm chứng 512/512 khớp mô hình tham chiếu | {{sim.exhaustive.checked}} tổ hợp, {{sim.exhaustive.errors}} lỗi; case 1–5 và case_illegal PASS | Đạt |
| Độ trễ 2 chu kỳ, 1 kết quả / 2 chu kỳ | {{sim.latency_cycles}} chu kỳ; {{sim.cycles_per_result}} chu kỳ / kết quả | Đạt |
| Diện tích ≤ 500 NAND2 tương đương | {{synth.top.nand2_eq}} NAND2 tđ | Đạt |
| Setup và hold ≥ 0 sau route ở 10 ns | worst setup {{pnr.wns_setup_worst_corner_ns}} ns, worst hold {{pnr.wns_hold_worst_corner_ns}} ns, 9 corner | Đạt |
| Mục tiêu mở rộng 5 ns | {{pnr5.status}}: {{pnr5.summary_vi}} | {{pnr5.grade_vi}} |
| DRC = 0, LVS khớp, có GDSII | DRC {{pnr.drc_magic}} / {{pnr.drc_klayout}}, LVS {{pnr.lvs_errors}} lỗi, có GDS | Đạt |
| Floorplan util 55%, tỷ lệ 1.0 | đặt đúng khi floorplan; util cuối {{pnr.core_util_pct}}% do buffer sửa timing | Đạt (có giải thích) |
| So sánh Area–Delay với RCA-4 | CSLA nhanh hơn, ADP kém hơn khi giữ phân cấp | Đạt |
| FA 28T full-custom, DRC = 0, LVS khớp, có tap | {{fa.ntrans}} transistor, DRC {{fa.drc_errors}}, LVS {{fa.lvs_match}}, {{fa.taps}} dải tap | Đạt |
| PEX, SPICE, đối chiếu LE | LE {{le.D_est_ps}} ps; SPICE {{spice.D_pre_ps}} / {{spice.D_post_ps}} ps | Đạt |

## Hạn chế

Ở độ rộng 4 bit, CSLA chỉ nhanh hơn RCA khoảng một phần tư nhưng tốn diện tích gần gấp đôi. Lợi ích của carry-select chưa thể hiện rõ ở quy mô này, và nhóm chưa thử độ rộng lớn hơn để xác nhận điểm hòa vốn.

Kết quả so sánh bản flatten phụ thuộc phiên bản công cụ (D6). Trong một môi trường khác (Yosys 0.70, liberty `open_pdks` 1.0.471) các số flatten của Task 7 lệch và thứ tự CSLA/RCA đảo ngược; trên máy nhóm với Yosys 0.66 và PDK ciel thì `make verify-all` không còn số nào lệch. Vì vậy chỉ so sánh giữa hai bản giữ phân cấp là kết luận chắc chắn.

Full Adder full-custom có diện tích lớn hơn nhiều so với cell `fa_1` của thư viện: 20.02 µm² cho `fa_1`, trong khi cell vẽ tay lớn gấp khoảng mười lần. Nhóm chưa tối ưu diện tích, và 9 track met1 chạy ngang làm tăng điện dung dây cùng độ trễ sau layout. Cell này cũng chưa được ghép vào luồng OpenLane (D-8).

Mô phỏng SPICE trước layout không có điện dung khuếch tán, vì netlist schematic thiếu `ad`, `as`, `pd`, `ps`. Do đó khoảng cách giữa kết quả trước và sau layout, và sai số của Logical Effort so với từng kết quả, có phần bị phóng đại. Nhóm chưa chạy lại bản trước layout với các tham số này để tách phần do điện dung khuếch tán khỏi phần do dây.

{{pnr5.limit_vi}}

Cuối cùng, đầu ra không có backpressure (D-3), nên lõi chỉ dùng được khi phía nhận luôn sẵn sàng.

## Hướng phát triển

Việc nên làm trước là đưa điện dung khuếch tán vào mô phỏng trước layout, để biết sai số của Logical Effort đến từ đâu. Sau đó nhóm muốn thu gọn layout Full Adder (bớt track, chia sẻ diffusion nhiều hơn) và đưa ký sinh của layout vào mô hình Logical Effort.

Hai hướng lớn hơn là ghép Full Adder full-custom vào luồng OpenLane dưới dạng macro, với LEF/LIB sinh từ layout và kết quả đặc trưng hóa, để so trực tiếp với FA standard cell; và mở rộng lên 8, 16 hoặc 32 bit với CSLA nhiều tầng hoặc khối có kích thước không đều (square-root CSLA), nơi lợi thế so với RCA sẽ rõ hơn. Nếu cần dùng lõi trong hệ thống thật, nhóm sẽ thêm `ready_in` ở đầu ra để hỗ trợ backpressure.

## Phân công công việc

Bảng: Phân công công việc (theo đề cương; A = Nguyễn Minh Anh Tú, B = Ngụy Quốc Trung)
| Hạng mục | Thành viên |
|---|---|
| RTL, FSM, testbench và kiểm chứng | [cần xác nhận] |
| Tổng hợp, STA, so sánh CSLA–RCA | [cần xác nhận] |
| OpenLane / LibreLane, sign-off | [cần xác nhận] |
| FA full-custom, Logical Effort, SPICE | [cần xác nhận] |
| Bài báo, báo cáo, slide | [cần xác nhận] |
