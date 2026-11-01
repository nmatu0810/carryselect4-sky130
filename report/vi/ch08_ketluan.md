# Kết luận

## Đối chiếu với mục tiêu

Bảng: Mục tiêu trong đề cương và kết quả đạt được
| Mục tiêu | Đạt được | Đánh giá |
|---|---|---|
| Kiểm chứng 512/512 khớp mô hình tham chiếu | {{sim.exhaustive.checked}} tổ hợp, {{sim.exhaustive.errors}} lỗi; case 1–5 và case_illegal PASS | Đạt |
| Độ trễ 2 chu kỳ, 1 kết quả / 2 chu kỳ | {{sim.latency_cycles}} chu kỳ; {{sim.cycles_per_result}} chu kỳ / kết quả | Đạt |
| Diện tích ≤ 500 NAND2 tương đương | {{synth.top.nand2_eq}} NAND2 tđ | Đạt |
| Setup và hold ≥ 0 sau route ở 10 ns | worst setup {{pnr.wns_setup_worst_corner_ns}} ns, worst hold {{pnr.wns_hold_worst_corner_ns}} ns, 9 corner | Đạt |
| Mục tiêu mở rộng 5 ns | {{pnr5.status}}: setup slack ở corner ss = {{pnr5.wns_setup_worst_corner_ns}} ns | Chưa đạt (chỉ đạt ở tt/ff) |
| DRC = 0, LVS khớp, có GDSII | DRC {{pnr.drc_magic}} / {{pnr.drc_klayout}}, LVS {{pnr.lvs_errors}} lỗi, có GDS | Đạt |
| Floorplan util 55%, tỷ lệ 1.0 | đặt đúng khi floorplan; util cuối {{pnr.core_util_pct}}% do buffer sửa timing | Đạt (có giải thích) |
| So sánh Area–Delay với RCA-4 | CSLA nhanh hơn, ADP kém hơn khi giữ phân cấp | Đạt |
| FA 28T full-custom, DRC = 0, LVS khớp, có tap | {{fa.ntrans}} transistor, DRC {{fa.drc_errors}}, LVS {{fa.lvs_match}}, {{fa.taps}} dải tap | Đạt |
| PEX, SPICE, đối chiếu LE | LE {{le.D_est_ps}} ps; SPICE {{spice.D_pre_ps}} / {{spice.D_post_ps}} ps | Đạt |

## Hạn chế

- Ở độ rộng 4 bit, CSLA chỉ nhanh hơn RCA khoảng một phần tư nhưng tốn diện tích gần gấp đôi; lợi ích của carry-select chưa thể hiện rõ ở quy mô này.
- Thiết kế chưa đóng timing ở 5 ns tại corner chậm ss_100C_1v60.
- Luồng vật lý trong báo cáo chạy bằng tool native và PDK `open_pdks` 1.0.471 thay cho image Docker (D4); số liệu có thể lệch nhẹ so với image chính thức.
- FA full-custom chưa được tối ưu diện tích: cell rộng vì có 9 track met1, làm tăng điện dung dây và độ trễ sau layout.
- Không có backpressure ở đầu ra (D-3), nên lõi chỉ dùng được khi phía nhận luôn sẵn sàng.

## Hướng phát triển

- Ghép FA full-custom vào luồng OpenLane dưới dạng macro (sinh LEF/LIB từ layout và kết quả đặc trưng hóa) để so với FA standard cell.
- Mở rộng lên 8, 16 hoặc 32 bit với CSLA nhiều tầng hoặc kích thước khối không đều (square-root CSLA) để thấy rõ lợi thế so với RCA.
- Thu gọn layout FA (bớt track, chia sẻ diffusion nhiều hơn) và đưa ký sinh layout vào mô hình Logical Effort.
- Thêm `ready_in` cho đầu ra để hỗ trợ backpressure.

## Phân công công việc

Bảng: Phân công công việc (theo đề cương; A = Nguyễn Minh Anh Tú, B = Ngụy Quốc Trung)
| Hạng mục | Thành viên |
|---|---|
| RTL, FSM, testbench và kiểm chứng | [cần xác nhận] |
| Tổng hợp, STA, so sánh CSLA–RCA | [cần xác nhận] |
| OpenLane / LibreLane, sign-off | [cần xác nhận] |
| FA full-custom, Logical Effort, SPICE | [cần xác nhận] |
| Bài báo, báo cáo, slide | [cần xác nhận] |
