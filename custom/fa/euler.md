# FA 28T – đồ thị PUN/PDN và Euler path dùng cho layout

Layout `fa_cell.mag` sinh bởi `gen_layout.py` từ `fa_cell.spice` (sizing S2). Mỗi transistor là một
cạnh nối hai nút diffusion; nhãn cạnh là tín hiệu cổng. Một Euler path (đi qua mỗi cạnh đúng một lần)
cho phép đặt các cổng poly liên tiếp trên **một dải diffusion liền** mà không cần ngắt.

Mirror adder có PDN là **ảnh gương** của PUN (cùng topology, chỉ đổi VPWR ↔ VGND và tên nút trong).
Vì vậy cùng một thứ tự cổng dùng được cho cả dải p và dải n: mỗi cột poly đi thẳng từ pMOS xuống nMOS
có cùng tín hiệu cổng.

## 1. Carry gate (10T, `COb = ¬MAJ(A,B,CI)`)

PUN – các cạnh (tên transistor: nút–nút, cổng):

| Cạnh | Nối | Cổng |
|---|---|---|
| XPC1 | VPWR – cpx | A |
| XPC2 | VPWR – cpx | B |
| XPC3 | cpx – COb | CI |
| XPC4 | VPWR – cpy | A |
| XPC5 | cpy – COb | B |

Bậc của nút: VPWR = 3, cpx = 3, cpy = 2, COb = 2. Có đúng hai nút bậc lẻ (VPWR, cpx), nên tồn tại
Euler path đi từ VPWR tới cpx:

`VPWR –B– cpx –A– VPWR –A– cpy –B– COb –CI– cpx`  → thứ tự cổng **B, A, A, B, CI**

PDN (XNC1…XNC5) giống hệt với VGND, ncx, ncy: `VGND –B– ncx –A– VGND –A– ncy –B– COb –CI– ncx`.

## 2. Sum gate (14T: 7 PUN + 7 PDN, `Sb = ¬(A⊕B⊕CI)` dùng `COb`)

PUN:

| Cạnh | Nối | Cổng |
|---|---|---|
| XPS1 | VPWR – spz | A |
| XPS2 | VPWR – spz | B |
| XPS3 | VPWR – spz | CI |
| XPS4 | spz – Sb | COb |
| XPS5 | VPWR – spw1 | A |
| XPS6 | spw1 – spw2 | B |
| XPS7 | spw2 – Sb | CI |

Bậc: VPWR = 4, spz = 4, Sb = 2, spw1 = 2, spw2 = 2 – tất cả chẵn, nên có **Euler circuit** bắt đầu
và kết thúc ở VPWR:

`VPWR –A– spz –COb– Sb –CI– spw2 –B– spw1 –A– VPWR –B– spz –CI– VPWR`
→ thứ tự cổng **A, COb, CI, B, A, B, CI**

PDN (XNS1…XNS7) là ảnh gương với VGND, snz, snw1, snw2.

## 3. Ghép thành dải diffusion

Sum gate kết thúc ở VPWR, carry gate bắt đầu ở VPWR, nên hai Euler path nối liền tại nút VPWR chung.
Hai inverter (`Sb→S`, `COb→CO`) chia chung một tiếp xúc VPWR. Kết quả: 2 dải trên mỗi hàng.

| Dải | Thứ tự (nút \| cổng \| nút …) |
|---|---|
| 1 (inverter) | S \| Sb \| VPWR \| COb \| CO |
| 2 (sum + carry) | VPWR \| A \| spz \| COb \| Sb \| CI \| spw2 \| B \| spw1 \| A \| VPWR \| B \| spz \| CI \| VPWR \| B \| cpx \| A \| VPWR \| A \| cpy \| B \| COb \| CI \| cpx |

Hàng n giống hệt, thay VPWR → VGND, cpx → ncx, cpy → ncy, spz → snz, spw1/2 → snw1/2.

**Chỗ ngắt diffusion – chỉ có 1, giữa dải 1 và dải 2.** Lý do: dải 2 bắt đầu và kết thúc bằng
VPWR … cpx, còn dải inverter có hai đầu là S và CO (đầu ra). Không có nút chung để nối đầu ra của inverter
với đầu của Euler path mà không tạo thêm transistor, nên phải ngắt. Mọi chỗ khác dùng chung diffusion.

**Nút cần nối bằng kim loại:** những nút xuất hiện hai lần trên một dải (cpx hai lần, spz hai lần,
VPWR bốn lần) được nối bằng li + met1. Các nút trong của chuỗi nối tiếp (cpy, spw1, spw2 và bản gương)
không có tiếp xúc – diffusion liền giữa hai cổng chính là nút đó.

## 4. Quy tắc vẽ và tap chống latch-up

- Cột poly dùng chung p/n, pitch 1.0 µm; tiếp xúc diffusion 0.17 µm ở giữa hai cổng, li đè tiếp xúc
  ≥ 0.08 µm hai phía (li.5).
- Độ rộng diffusion đổi (k = 2 → k = 3 ở sum gate, inverter CO 1.58× đơn vị) tại tâm cột tiếp xúc,
  cách poly 0.425 µm (> 0.075 µm poly–diff).
- Routing: li dọc từ tiếp xúc, met1 ngang 9 track ở giữa hai hàng (A, B, CI, COb, Sb, cpx, spz, ncx, snz).
- Tap: một dải **n-tap** (nsd + nsc, nối VPWR) chạy hết chiều rộng dưới rail VPWR trong nwell, và một dải
  **p-tap** (psd + psc, nối VGND) dưới rail VGND.
- Luật latch-up sky130 trong deck Magic: **LU.2** (N-diff tới P-tap < 15.0 µm) và **LU.3** (P-diff tới
  N-tap < 15.0 µm). `scripts/fa_stats.py` đo khoảng cách lớn nhất: ndiff → p-tap 1.77 µm,
  pdiff → n-tap 2.96 µm, đều nhỏ hơn nhiều so với 15 µm.
