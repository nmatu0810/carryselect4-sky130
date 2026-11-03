# Full Adder full-custom và Logical Effort

## Mạch mirror adder 28T

Nhóm thiết kế Full Adder ở mức transistor theo cấu trúc mirror adder 28 transistor. Mạch gồm bốn khối. Carry gate (10T) tạo `COb` = NOT MAJ(A, B, CI): mạng kéo xuống (PDN) có nhánh `CI` nối tiếp với (`A` song song `B`) và nhánh `A` nối tiếp `B`, còn mạng kéo lên (PUN) có đúng cùng topology ("gương") vì hàm đa số tự đối ngẫu. Sum gate (14T) tạo `Sb` = NOT (A ⊕ B ⊕ CI) và dùng lại `COb`: PDN dẫn khi (A + B + CI)·COb hoặc A·B·CI. Hai inverter còn lại tạo `CO` từ `COb` và `S` từ `Sb`.

Netlist dùng `sky130_fd_pr__nfet_01v8` và `sky130_fd_pr__pfet_01v8` với chiều dài kênh nhỏ nhất của PDK, subckt `fa_cell A B CI S CO VPWR VGND`. Mô phỏng chức năng (`custom/fa/sim/fa_func.sp`) quét đủ 8 tổ hợp vào và so với bảng chân trị ngay trong ngspice, kết quả 8/8 đúng.

## Đặc trưng hóa τ

Inverter đơn vị có Wn = {{le.wn_unit_um}} µm. Nhóm quét Wp trong ba giá trị và chọn Wp = {{le.wp_unit_um}} µm vì cho trễ lên và xuống cân bằng nhất ở FO4. Mạch đo là chuỗi inverter: tầng trước tạo sườn thật, tầng đo mang đúng 4 inverter giống nó. Kết quả ở corner tt, 1.8 V, 27 °C:

Bảng: Kết quả đặc trưng hóa inverter
| Đại lượng | Giá trị |
|---|---|
| FO4 (ps) | {{le.fo4_ps}} |
| τ = FO4 / 5 (ps) | {{le.tau_ps}} |
| p_inv (trễ không tải / τ) | {{le.pinv}} |
| C chân S của `mux2_1` (fF, liberty tt) | {{le.c_mux_s_ff}} |

## Kích thước theo Logical Effort

Đường phân tích theo quyết định D-9 là `a0` → carry gate FA0 → inverter → `c1` → carry gate FA1 → inverter → `c2`, tức *N* = {{le.N}} tầng. Tải tại `c2` là 3 chân chọn MUX, *C_load* = 3 × {{le.c_mux_s_ff}} fF.

Nhóm tính lần lượt từng thành phần của *F*. Logical effort có *g_carry* = 2 và *g_inv* = 1, nên *G* = 2 × 1 × 2 × 1 = {{le.G}}. Branching effort tính từ tổng độ rộng cổng (*C = W·C_g*, với *C_g* lấy từ điện dung chân A và độ rộng transistor của `sky130_fd_sc_hd__inv_1`). Tại `COb`, tín hiệu đi vào inverter `CO` và rẽ sang chân `COb` của sum gate. Tại `CO` của FA0, tín hiệu đi vào chân `CI` của carry gate FA1 và rẽ sang chân `CI` của sum gate FA1. Kết quả là *B* = {{le.B}}. Electrical effort *H = C_load / C_in(A)* = {{le.H}}, với *C_in(A)* là điện dung chân A của carry gate FA0.

Từ đó path effort *F = G·B·H* = {{le.F}} và effort mỗi tầng *f̂ = F^(1/4)* = {{le.fhat}}. Ký sinh *p_carry* = {{le.p_carry}} lấy từ mô phỏng carry gate không tải chia cho τ, và *P* = 2·*p_carry* + 2·*p_inv*. Độ trễ ước lượng là *D = N·f̂ + P* = {{le.D_est_tau}} τ, tức {{le.D_est_ps}} ps.

Nhóm thử hai phương án kích thước. Ở S1, mỗi transistor có *W = k × W_unit*, với *k* là số transistor nối tiếp trên nhánh của nó (k = 2 cho carry gate và nhánh 2 tầng của sum gate, k = 3 cho nhánh A–B–CI nối tiếp); inverter đầu ra dùng kích thước đơn vị. S2 giống S1, nhưng inverter `CO` lấy kích thước tầng cuối từ `optimal_sizes`, tức tính ngược từ tải.

Bảng: So sánh hai phương án kích thước (SPICE trước layout, đường D-9)
| Phương án | Trễ (ps) |
|---|---|
| S1 | {{fa.s1.delay_pre_ps}} |
| S2 | {{fa.s2.delay_pre_ps}} |
| Được chọn | {{fa.sizing_chosen}} |

S2 nhanh hơn S1 khoảng 14% ({{fa.s2.delay_pre_ps}} so với {{fa.s1.delay_pre_ps}} ps), nên nhóm chọn S2, copy thành `custom/fa/fa_cell.spice`, và layout cùng LVS đều dùng đúng file này.

## Layout và Euler path

Layout được sinh bằng script `custom/fa/gen_layout.py` từ chính netlist đã chọn, rồi lưu thành `fa_cell.mag` cho Magic (chi tiết trong `custom/fa/euler.md`).

Phần quyết định diện tích là thứ tự diffusion. Carry gate có hai nút bậc lẻ nên có Euler path. Sum gate có mọi nút bậc chẵn nên có Euler circuit đi từ VPWR về VPWR. Nhóm ghép sum gate rồi carry gate tại nút VPWR chung, và hai inverter dùng chung một tiếp xúc VPWR. Kết quả là mỗi hàng chỉ có một chỗ ngắt diffusion, nằm giữa dải inverter và dải sum+carry. Vì PDN là ảnh gương của PUN, cùng một thứ tự cổng dùng cho cả hàng p và hàng n, nên mỗi cột poly đi thẳng từ pMOS xuống nMOS.

Về đi dây, li chạy dọc từ tiếp xúc diffusion. Giữa hai hàng có 9 track met1 ngang cho A, B, CI, COb, Sb và các nút trong, còn rail VPWR/VGND cũng bằng met1. Một dải n-tap (nối VPWR, trong nwell) và một dải p-tap (nối VGND) chạy hết chiều rộng dưới hai rail để chống latch-up. Luật latch-up của sky130 trong deck Magic là LU.2 / LU.3, yêu cầu mọi điểm diffusion cách tap loại ngược dưới 15 µm. Khoảng cách xa nhất đo được chỉ vài µm.

Bảng: Kết quả layout Full Adder
| Chỉ số | Giá trị |
|---|---|
| Kích thước (µm) | {{fa.width_um}} × {{fa.height_um}} |
| Diện tích (µm²) | {{fa.area_um2}} |
| Số transistor sau trích | {{fa.ntrans}} |
| Số dải tap | {{fa.taps}} |
| Lỗi DRC (`drc(full)`) | {{fa.drc_errors}} |
| LVS khớp (Netgen) | {{fa.lvs_match}} |
| Số tụ ký sinh khác 0 (PEX) | {{fa.pex_cap_count}} |

![Hình: Layout Full Adder 28T trên Magic (DRC và LVS sạch)](../../docs/figures/fa_layout.png)

Để so sánh, cell `sky130_fd_sc_hd__fa_1` của thư viện chiếm 20.02 µm² theo file liberty tt, nên cell vẽ tay lớn gấp khoảng mười lần. Nhóm không tối ưu diện tích ở bản này.

DRC chạy với `drc style drc(full)` của sky130A. Lỗi duy nhất gặp khi vẽ là li.5 (li phải phủ tiếp xúc diffusion ít nhất 0.08 µm ở hai phía đối diện). Nhóm sửa trong script sinh layout thì DRC về 0. LVS so netlist trích từ Magic (`ext2spice lvs`) với `fa_cell.spice` bằng Netgen và setup `sky130A_setup.tcl`, cho kết quả "Circuits match uniquely": 28 thiết bị, 19 net, không có lỗi thuộc tính W/L. PEX dùng `ext2spice cthresh 0 rthresh 0` ở định dạng ngspice, giữ tên subckt và thứ tự chân.

## So sánh Logical Effort và SPICE

Mạch đo trước và sau layout giống hệt nhau (`path_pre.sp` và `path_post.sp`), chỉ khác netlist được include. Hai `fa_cell` nối thành RCA 2 bit, với B0 = 1, CI0 = 0, A1 = 1, B1 = 0 để nhớ lan qua cả hai tầng, và tải là 3 chân chọn MUX tại `CO1`. Độ trễ là trung bình hai sườn từ `A0` tới `CO1`, đo ở mức 50%.

Bảng: Độ trễ đường D-9 theo ba phương pháp
| Phương pháp | Trễ (ps) | Sai số của LE |
|---|---|---|
| Logical Effort | {{le.D_est_ps}} | – |
| SPICE trước layout | {{spice.D_pre_ps}} | {{le.err_pre_pct}} % |
| SPICE sau layout (PEX) | {{spice.D_post_ps}} | {{le.err_post_pct}} % |

![Hình: Ước lượng Logical Effort so với SPICE trước và sau layout](../../docs/figures/le_vs_spice.png)

![Hình: Dạng sóng A0 và CO1 sau layout](../../docs/figures/fa_transient.png)

## Phân tích nguồn sai số

Trước layout, LE cho số chậm hơn SPICE. Mô hình LE dùng một giá trị *g* và *p* cố định cho mỗi loại cổng và giả định sườn vào "chuẩn", còn đường đo chỉ có 4 tầng nên sai số của *p_carry* chiếm tỷ trọng lớn. Nhóm cho rằng pMOS của sky130 khá mạnh ở độ rộng nhỏ (Wp/Wn = 2 đã cân bằng) cũng góp phần, nhưng chưa tách riêng ảnh hưởng này.

Sau layout, SPICE chậm hơn LE nhiều. Netlist schematic không có diện tích và chu vi source/drain (`ad`, `as`, `pd`, `ps`), nên mô phỏng trước layout bỏ qua toàn bộ điện dung tiếp giáp. Netlist PEX có các tham số này cho cả 28 transistor, cộng thêm điện dung dây: mỗi chân A, B, CI cỡ 4 fF do 9 track met1 chạy dọc cell, và nút `COb` cỡ 3.9 fF. Hai phần này làm trễ tăng từ {{spice.D_pre_ps}} lên {{spice.D_post_ps}} ps. Vì mô phỏng trước layout thiếu hẳn điện dung khuếch tán, khoảng cách giữa hai kết quả SPICE có phần phóng đại so với phần mà riêng layout gây ra. Nhóm chưa chạy lại bản trước layout với `ad/as/pd/ps` ước lượng để tách hai phần.

Để cải thiện, có thể đưa điện dung tiếp giáp và điện dung dây vào *p* của từng tầng (layout-aware parasitic), hoặc thu gọn layout (bớt track, dùng diffusion chung nhiều hơn) để giảm điện dung dây.

Kết luận của chương: Logical Effort chọn đúng phương án kích thước nhanh hơn (S2) và cho ước lượng nằm giữa kết quả trước và sau layout. Muốn dự đoán chính xác độ trễ tuyệt đối thì phải tính thêm ký sinh của layout.
