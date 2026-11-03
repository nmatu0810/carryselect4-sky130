# Cơ sở lý thuyết

## Full Adder và bộ cộng nối tiếp nhớ (RCA)

Full Adder (FA) cộng ba bit *a*, *b*, *c*. Ngõ ra tổng là *s = a ⊕ b ⊕ c*, ngõ ra nhớ là *c_o = ab + c(a + b)*, chính là hàm đa số (majority) của ba bit vào.

RCA *n* bit ghép *n* FA nối tiếp, ngõ nhớ ra của FA thứ *i* đi vào ngõ nhớ vào của FA thứ *i + 1*. Gọi *t_c* là trễ từ nhớ vào tới nhớ ra của một FA và *t_s* là trễ tới ngõ tổng, thì trường hợp xấu nhất của RCA xấp xỉ:

*t_RCA ≈ (n − 1)·t_c + t_s*

Trễ tăng tuyến tính theo *n*. Đổi lại RCA rất nhỏ, chỉ cần đúng *n* Full Adder.

## Bộ cộng carry-select (CSLA)

CSLA chia toán hạng thành nhiều khối. Khối thấp nhất là một RCA bình thường, nhận nhớ vào thật. Mỗi khối cao hơn được làm hai bản: một bản tính với nhớ vào bằng 0, một bản với nhớ vào bằng 1. Khi nhớ thật của khối thấp tới nơi, một hàng MUX chọn bản đúng.

Với cách chia 2+2 của đề tài, độ trễ xấp xỉ:

*t_CSLA ≈ t_RCA2 + t_MUX*

*t_RCA2* là trễ của RCA 2 bit ở khối thấp, *t_MUX* là trễ từ chân chọn tới ngõ ra của MUX. Hai khối cao chạy song song với khối thấp nên không nằm trên đường tới hạn. So với RCA 4 bit, CSLA bớt được hai tầng lan nhớ nhưng thêm một tầng MUX, và phải trả thêm một RCA 2 bit cùng 3 MUX.

## Giao tiếp bắt tay valid/ready

Với valid/ready, hai khối truyền dữ liệu cho nhau mà không cần biết trước tốc độ của nhau. Bên gửi đặt dữ liệu lên `data_in` và bật `valid_in`. Bên nhận báo sẵn sàng bằng `ready_out`. Một giao dịch xảy ra ở cạnh lên clock mà tại đó cả hai tín hiệu cùng bằng 1.

Ở đầu ra, `valid_out = 1` cho biết `data_out` đang hợp lệ. Thiết kế không có `ready_in` từ phía nhận, nên nhóm coi kết quả đã được nhận ngay trong chu kỳ `valid_out = 1` (quyết định D-3).

## Máy trạng thái Moore

Trong máy Moore, ngõ ra chỉ phụ thuộc trạng thái hiện tại. Vì vậy ngõ ra ổn định suốt chu kỳ và không có đường tổ hợp từ ngõ vào sang ngõ ra, nối với các khối khác dễ hơn và ít glitch hơn. Bộ điều khiển của đề tài là FSM Moore 3 trạng thái, mã hóa bằng 2 bit.

## Cổng CMOS tĩnh và mirror adder

Một cổng CMOS tĩnh gồm hai mạng transistor bổ sung nhau. Mạng kéo lên (PUN) dùng pMOS, nối từ VDD tới ngõ ra. Mạng kéo xuống (PDN) dùng nMOS, nối từ ngõ ra xuống GND. Hai mạng là đối ngẫu: nhánh nối tiếp trong PDN tương ứng với nhánh song song trong PUN và ngược lại. Nhờ vậy với mọi tổ hợp vào, đúng một mạng dẫn. Ngõ ra luôn được kéo về VDD hoặc GND và không có đường dòng tĩnh giữa hai nguồn [2]. Vì cổng đảo nên ngõ ra là phủ định của hàm mà PDN thực hiện.

Hàm đa số *MAJ(A, B, C) = AB + C(A + B)* có một tính chất làm mirror adder gọn hơn: nó tự đối ngẫu, tức *MAJ(Ā, B̄, C̄) = ¬MAJ(A, B, C)*. Do đó PUN của carry gate không cần topology khác PDN. Nhóm chỉ việc lấy topology của PDN, đổi nMOS thành pMOS, và được đúng PUN cần dùng, nên mới gọi là mạch "gương". Carry gate chỉ có 10 transistor (5 nMOS và 5 pMOS) và tạo ra *C̄o*. Sum gate dùng lại *C̄o* để tạo *S̄ = ¬(ABC + (A + B + C)·C̄o)*, nên không phải tính lại hàm đa số. Hai inverter ở ngõ ra đưa cực tính về lại *S* và *Co*, và tổng cộng mạch có 28 transistor.

Kích thước transistor phụ thuộc số transistor nối tiếp. Muốn một nhánh có *k* transistor nối tiếp dẫn được dòng bằng một inverter đơn vị, mỗi transistor phải rộng gấp *k* lần: *W = k·W_unit*. Nhánh nối tiếp càng dài thì điện dung cổng càng lớn, và đó là một nguyên nhân khiến logical effort của carry gate lớn hơn 1 (bằng 2 trong đề tài). Nhóm dùng quy tắc này làm phương án S1 ở chương 4.

## Phân tích thời gian tĩnh

Phân tích thời gian tĩnh (STA) kiểm tra mọi đường tín hiệu mà không cần vector kích thích. Với đường từ thanh ghi phát (launch) tới thanh ghi nhận (capture) cách nhau một chu kỳ *T*, hai ràng buộc cần thỏa. Ràng buộc setup yêu cầu dữ liệu tới kịp trước cạnh nhận:

*t_clk-q + t_logic,max + t_setup ≤ T − t_unc*

Ràng buộc hold yêu cầu dữ liệu mới không đến quá sớm, làm hỏng giá trị mà thanh ghi nhận đang giữ:

*t_clk-q + t_logic,min ≥ t_hold + t_unc*

Ở đây *t_clk-q* là trễ từ cạnh clock tới ngõ Q của flip-flop phát, *t_logic* là trễ logic tổ hợp ở giữa (cực đại cho setup, cực tiểu cho hold), *t_setup* và *t_hold* là thời gian thiết lập và giữ của flip-flop nhận, còn *t_unc* là clock uncertainty (0.25 ns trong SDC của nhóm). Với clock lý tưởng, skew bằng 0. Slack là phần dư của mỗi bất đẳng thức: slack setup là *T − t_unc − (t_clk-q + t_logic,max + t_setup)*, slack hold là *t_clk-q + t_logic,min − t_hold − t_unc*. Slack dương nghĩa là đạt. Ngõ `rst_n` bất đồng bộ cũng được kiểm tra bằng hai ràng buộc tương tự, gọi là recovery (giống setup) và removal (giống hold), tính cho cạnh nhả reset.

Đường không bắt đầu hoặc kết thúc ở flip-flop thì cần SDC mô tả phần còn lại của hệ thống. `set_input_delay` cho biết ngõ vào đến muộn bao lâu sau cạnh clock, nên đường từ ngõ vào tới flip-flop chỉ còn *T − t_unc − t_in* cho logic và *t_setup*. `set_output_delay` cho biết phía nhận cần bao nhiêu thời gian trước cạnh clock kế tiếp, nên đường từ flip-flop ra ngõ ra chỉ còn *T − t_unc − t_out*. Nhóm đặt cả hai bằng 2 ns trên chu kỳ 10 ns. Đó là lý do đường setup xấu nhất toàn thiết kế ở chương 3 là `{{sta.synth.worst_path}}` với slack {{sta.synth.wns_setup_ns}} ns: 2 ns của chu kỳ đã bị input delay chiếm trước khi dữ liệu vào tới logic. Đường adder thật sự, `{{sta.synth.crit_path}}`, chỉ tốn *t_clk-q* và logic, đến sau {{sta.synth.crit_arrival_ns}} ns, nên còn nhiều dư hơn. Slack hold xấu nhất là {{sta.synth.wns_hold_ns}} ns. Theo D1, các số này là worst slack chứ không phải WNS của OpenSTA.

## Corner PVT

Trễ của một cổng thay đổi theo ba yếu tố: quá trình chế tạo (process), điện áp nguồn (voltage) và nhiệt độ (temperature). Thư viện `sky130_fd_sc_hd` đặc trưng hóa cell ở các tổ hợp gọi là corner PVT. Nhóm dùng ba corner:

Bảng: Ba corner PVT của thư viện `sky130_fd_sc_hd` mà nhóm dùng
| Corner | Transistor | Điện áp | Nhiệt độ | Dùng để kiểm tra |
|---|---|---|---|---|
| `ss_100C_1v60` | chậm | 1.60 V | 100 °C | setup |
| `tt_025C_1v80` | điển hình | 1.80 V | 25 °C | tham chiếu |
| `ff_n40C_1v95` | nhanh | 1.95 V | −40 °C | hold |

Setup bị giới hạn bởi trễ lớn nhất của đường dữ liệu, nên điều kiện khắt khe nhất là khi mọi thứ chậm: transistor chậm, điện áp thấp, nhiệt độ cao (corner ss). Hold bị giới hạn bởi trễ nhỏ nhất, nên điều kiện khắt khe nhất là khi mọi thứ nhanh và dữ liệu có thể chạy vượt qua cạnh clock (corner ff). Vì vậy một thiết kế chỉ kiểm ở tt có thể vẫn trượt timing ở hai corner còn lại [2].

Sau khi đi dây, ký sinh của dây cũng có ba mức trích xuất (min, nom, max) cho điện trở và điện dung. Kết hợp với ba corner PVT ta được 9 corner sign-off. Dây có điện dung lớn (max) làm đường chậm hơn nên bất lợi cho setup, dây có điện dung nhỏ (min) làm đường nhanh hơn nên bất lợi cho hold. Ở chu kỳ 10 ns, setup slack ở tt là {{pnr.wns_setup_ns}} ns còn ở corner xấu nhất `max_ss_100C_1v60` là {{pnr.wns_setup_worst_corner_ns}} ns. Hold slack ở tt là {{pnr.wns_hold_ns}} ns còn ở corner xấu nhất `min_ff_n40C_1v95` là {{pnr.wns_hold_worst_corner_ns}} ns. Hai corner xấu nhất đúng là ss với trích xuất max và ff với trích xuất min. Ở 5 ns, setup slack xấu nhất là {{pnr5.wns_setup_worst_corner_ns}} ns, cũng nằm ở corner ss.

## Logical Effort

Logical Effort (Sutherland, Sproull và Harris [8]) tính độ trễ của một cổng theo đơn vị *τ*, là trễ của một inverter lý tưởng không có ký sinh khi tải bằng chính nó:

*d = g·h + p*

*g* (logical effort) là tỷ số giữa điện dung vào của cổng và điện dung vào của inverter cho cùng dòng ra. Inverter có *g = 1*, còn cổng đa số (carry gate) của mirror adder có *g = 2*. *h = C_out / C_in* (electrical effort) là tỷ số giữa tải và điện dung vào. *p* (parasitic delay) là trễ do điện dung ký sinh của chính cổng; inverter có *p_inv* xấp xỉ 1.

Với đường *N* tầng, ta có *G = ∏ gᵢ*, *B = ∏ bᵢ* (branching effort, *bᵢ = (C_trên đường + C_rẽ nhánh) / C_trên đường*), *H = C_load / C_in* và path effort *F = G·B·H*. Độ trễ nhỏ nhất đạt được khi mọi tầng có cùng effort *f̂ = F^(1/N)*:

*D = N·F^(1/N) + P*, với *P = Σ pᵢ*.

Kích thước tối ưu tính ngược từ tải: *C_in,i = gᵢ·bᵢ·C_in,i+1 / f̂*. Trong đề tài, *τ* được đo bằng mô phỏng inverter FO4 (fanout 4). Theo giáo trình Weste–Harris [2], inverter FO4 có *g = 1*, *h = 4* và *p_inv* xấp xỉ 1, nên *d* = 4 + 1 = 5*τ*, tức FO4 ≈ 5*τ*. Vì vậy nhóm đo FO4 trước rồi đặt *τ = FO4/5*, và đo *p_inv* là trễ không tải chia cho *τ*. Giá trị đo được là {{le.pinv}}, hơi lớn hơn 1 của mô hình lý thuyết.

## Euler path và thứ tự cổng trong layout

Khi vẽ một cổng, ta xem mạng nMOS (hoặc pMOS) như một đồ thị: mỗi transistor là một cạnh, mỗi nút source/drain là một đỉnh. Hai transistor kề nhau có thể dùng chung một vùng diffusion, không cần ngắt, nếu chúng nối vào cùng một nút. Đi hết các cạnh mà mỗi cạnh đúng một lần, tức một Euler path, chính là sắp xếp mọi transistor thành một dải diffusion liên tục. Đồ thị liên thông có Euler path khi số đỉnh bậc lẻ bằng 0 hoặc 2. Nếu bằng 0, đường đi là một Euler circuit, xuất phát và kết thúc tại cùng một nút.

Điều kiện còn thêm một ràng buộc khi vẽ cả hai hàng. Mỗi cột poly đi thẳng từ pMOS xuống nMOS, nên thứ tự cổng phải giống nhau ở PUN và PDN. Không phải cổng nào cũng có một thứ tự chung như vậy. Với mirror adder thì PUN là ảnh gương của PDN, nên cùng một thứ tự dùng được cho cả hai hàng. Lợi ích của diffusion liên tục là diện tích nhỏ hơn, ít điện dung tiếp giáp source/drain hơn (chính là các tham số `ad`, `as`, `pd`, `ps` mà ta gặp ở chương 4), và dây ngắn hơn. Với cell của nhóm, carry gate có đúng hai nút bậc lẻ nên có Euler path, sum gate có mọi nút bậc chẵn nên có Euler circuit, và mỗi hàng chỉ còn một chỗ ngắt diffusion.

## Sign-off vật lý

Trước khi nộp GDSII, phần sign-off của nhóm xoay quanh bốn vấn đề. DRC (design rule check) kiểm hình học theo luật của nhà máy: độ rộng và khoảng cách tối thiểu, phần phủ giữa các lớp. Nhóm chạy hai bộ luật độc lập, Magic và KLayout, và cả hai báo {{pnr.drc_magic}} và {{pnr.drc_klayout}} lỗi. LVS (layout versus schematic) trích netlist từ layout rồi so với netlist tổng hợp xem số thiết bị và cách nối có khớp không. Netgen báo {{pnr.lvs_errors}} lỗi.

Kiểm tra antenna xử lý một hiệu ứng của quá trình chế tạo: khi khắc plasma, dây kim loại dài nối vào cổng transistor tích điện và có thể đánh thủng lớp oxide cổng. Công cụ so diện tích kim loại với diện tích cổng mà nó nối tới và chèn diode hoặc đổi lớp dây khi tỷ số vượt ngưỡng. Thiết kế có {{pnr.antenna_violations}} vi phạm antenna sau đi dây.

Latch-up là hiệu ứng thyristor ký sinh giữa pMOS, n-well, đế p và nMOS. Nếu bị kích hoạt, nó tạo đường dòng lớn giữa VDD và GND. Cách phòng là đặt tap, tức tiếp xúc n-well vào VDD và tiếp xúc đế vào GND, đủ gần mọi transistor. Luật sky130 trong deck Magic (LU.2, LU.3) yêu cầu mọi điểm diffusion cách tap loại ngược dưới 15 µm. Luồng standard cell tự rải tap cell theo cột đều khi floorplan. Ở Full Adder vẽ tay, nhóm dùng {{fa.taps}} dải tap chạy hết chiều rộng cell.

## Luồng RTL→GDSII trên SKY130

Cả luồng dùng công cụ mã nguồn mở. Nhóm viết RTL bằng SystemVerilog, mô phỏng bằng Verilator và dùng mô hình tham chiếu bằng Python để kiểm tra. Yosys tổng hợp RTL sang cell của thư viện `sky130_fd_sc_hd`, trong đó ABC lo phần logic tổ hợp. OpenSTA phân tích thời gian tĩnh với một file SDC dùng chung cho tổng hợp và đặt–đi dây. OpenLane 2 / LibreLane làm phần vật lý: floorplan, mạng cấp nguồn (PDN), đặt cell, cây clock (CTS), sửa timing, đi dây, trích ký sinh, STA nhiều corner, DRC (Magic, KLayout), LVS (Netgen) và xuất GDSII. Nhánh full-custom dùng Magic để vẽ layout và trích netlist, Netgen để so LVS, và Ngspice với mô hình transistor của PDK để mô phỏng.
