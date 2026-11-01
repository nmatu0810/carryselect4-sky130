# Giới thiệu

## Bối cảnh

Bộ cộng là khối số học được dùng nhiều nhất trong một bộ xử lý. Nó nằm trong ALU, trong khối tính địa chỉ, trong bộ đếm chương trình và trong các bộ tăng tốc xử lý tín hiệu. Với các SoC biên (edge SoC) chạy bằng pin hoặc năng lượng thu hoạch, bộ cộng còn phải nhỏ và ít tiêu thụ, vì nó được nhân bản ở nhiều nơi trên chip. Do đó việc chọn cấu trúc bộ cộng luôn là một bài toán cân bằng giữa tốc độ, diện tích và công suất.

Đề tài này thiết kế một lõi cộng 4 bit theo cấu trúc **carry-select** (CSLA), có giao tiếp bắt tay valid/ready và các thanh ghi vào/ra, rồi đưa lõi đó qua toàn bộ luồng thiết kế mã nguồn mở trên công nghệ SkyWater SKY130: từ RTL, kiểm chứng, tổng hợp, phân tích thời gian tĩnh, đến đặt–đi dây và xuất file GDSII. Song song với luồng standard cell, nhóm vẽ tay (full-custom) tế bào Full Adder 28 transistor là phần tử cơ bản của bộ cộng, và dùng phương pháp Logical Effort để ước lượng độ trễ, sau đó đối chiếu với mô phỏng SPICE trước và sau layout.

## Vấn đề trễ của chuỗi nhớ

Trong bộ cộng nối tiếp nhớ (Ripple-Carry Adder, RCA), bit nhớ phải lan lần lượt qua từng Full Adder. Bit thứ *i* chỉ tính được tổng khi đã có nhớ từ bit *i − 1*, nên độ trễ tăng tuyến tính theo số bit, tức là O(*n*). Đây là đường tới hạn của bộ cộng.

Bộ cộng carry-select giải quyết vấn đề này bằng cách **tính trước** phần bit cao cho cả hai trường hợp nhớ vào bằng 0 và bằng 1, rồi dùng nhớ thật từ phần bit thấp để **chọn** kết quả qua bộ dồn kênh (MUX). Như vậy phần bit cao không phải chờ nhớ lan tới mà chạy song song với phần bit thấp; đổi lại, phần bit cao phải được nhân đôi nên diện tích tăng.

## Mục tiêu

Các mục tiêu đặt ra trong đề cương:

- Thiết kế lõi `carryselect4_top`: CSLA 4 bit chia 2+2, thanh ghi vào 9 bit, thanh ghi ra 5 bit và FSM Moore 3 trạng thái điều khiển giao tiếp valid/ready.
- Kiểm chứng chức năng tự động, đạt 512/512 tổ hợp vào khớp với mô hình tham chiếu, cùng các kịch bản giao thức (bong bóng `valid_in`, reset bất đồng bộ, trạng thái không hợp lệ).
- Tổng hợp với thư viện `sky130_fd_sc_hd`, diện tích không quá 500 cổng NAND2 tương đương.
- Đóng timing ở chu kỳ 10 ns (100 MHz) sau đi dây, ở mọi corner; mục tiêu mở rộng là 5 ns.
- Sign-off sạch: DRC (Magic và KLayout) bằng 0, LVS khớp, có file GDSII.
- So sánh diện tích–độ trễ giữa CSLA-4 và RCA-4.
- Vẽ layout full-custom cho Full Adder 28T với luật DRC sky130, có tap chống latch-up, DRC = 0, LVS khớp; trích ký sinh, mô phỏng và đối chiếu với Logical Effort.

## Phạm vi và giả định

- **Không có backpressure ở đầu ra** (quyết định D-3): giao tiếp không có tín hiệu `ready_in` từ phía nhận, nên giả định phía nhận luôn sẵn sàng lấy kết quả khi `valid_out = 1`.
- **FA full-custom là bài nghiên cứu leaf cell** (quyết định D-8): tế bào này không được ghép vào luồng OpenLane. Luồng đặt–đi dây chỉ dùng standard cell của thư viện `sky130_fd_sc_hd`.
- Mọi số liệu trong báo cáo được đọc tự động từ file `results/metrics.json` do các script của dự án sinh ra, để báo cáo, bài báo và slide luôn dùng cùng một bộ số.

## Cấu trúc báo cáo

Chương 2 trình bày cơ sở lý thuyết: RCA, CSLA, giao tiếp valid/ready, FSM Moore, Logical Effort và luồng RTL→GDSII. Chương 3 mô tả thiết kế RTL. Chương 4 trình bày kiểm chứng chức năng. Chương 5 là tổng hợp, phân tích thời gian tĩnh và so sánh CSLA với RCA. Chương 6 là thiết kế vật lý bằng OpenLane 2 / LibreLane. Chương 7 trình bày Full Adder full-custom và Logical Effort. Chương 8 kết luận, Chương 9 là tài liệu tham khảo và phụ lục.
