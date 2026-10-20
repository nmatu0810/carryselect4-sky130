# Cài đặt toolchain cho CarrySelect-4 (Arch Linux)

Chạy lần lượt từng bước. Cuối mỗi bước có lệnh kiểm tra và kết quả mong đợi.

## Đã có sẵn trên máy (không cần cài)

`iverilog`, `gtkwave`, `magic` 8.3.685, `netgen`, `ngspice-47`, `docker` (user đã trong group `docker`), `tectonic`, `node`/`npm`, `uv`. PDK sky130A đã có tại `/usr/local/share/pdk` và `~/.ciel`.

## Bước 1: Gói native qua pacman

```bash
sudo pacman -S --needed verilator yosys klayout jq python-pytest
```

Kiểm tra:
```bash
verilator --version   # Verilator 5.0xx (phải >= 5.0)
yosys -V              # Yosys 0.66 ...
klayout -v            # KLayout 0.30.x
jq --version
```

## Bước 2: LibreLane (bản kế tục OpenLane 2) + môi trường Python của project

> OpenLane 2 đã được đổi tên và phát triển tiếp dưới tên **LibreLane**. Định dạng `config.json` và các biến cấu hình gần như giữ nguyên. Python hệ thống là 3.14, mới hơn mức flow hỗ trợ ổn định, nên tạo venv bằng Python 3.12 qua `uv`.

```bash
cd ~/workspace/VKU/VLSI/CarrySelect4
uv venv -p 3.12 .venv
uv pip install -p .venv librelane vcdvcd matplotlib pytest
.venv/bin/librelane --version
```

Chạy smoke test. Lệnh này tự pull image Docker (vài GB) và tải đúng phiên bản PDK mà flow cần vào `~/.ciel`:
```bash
.venv/bin/librelane --dockerized --smoke-test
```
Mong đợi: dòng cuối báo smoke test **passed**.

Lấy tên image để dùng ở bước 3:
```bash
docker images | grep -i librelane     # ghi lại REPOSITORY:TAG
ls ~/.ciel/ciel/sky130/versions/       # hash PDK của LibreLane (máy này: 8afc8346…)
export PDK_ROOT=$HOME/.ciel/ciel/sky130/versions/8afc8346a57fe1ab7934ba5a6056ea8b43078e71   # bắt buộc trước khi chạy magic/ngspice
```

> Nếu `pip install librelane` lỗi hoặc không tìm thấy gói: cài `openlane` thay thế (`uv pip install -p .venv openlane`), rồi dùng lệnh `.venv/bin/openlane` thay cho `librelane` ở mọi chỗ. Báo lại để mình sửa plan.

## Bước 3: OpenSTA (chạy trong image Docker của LibreLane)

OpenSTA không có trên pacman và AUR. Image LibreLane đã có `sta`, nên chỉ cần kiểm tra là chạy được:

```bash
IMG=<REPOSITORY:TAG từ bước 2>
docker run --rm -v "$HOME:$HOME" -w "$PWD" "$IMG" sta -version
```
Mong đợi: in ra một số phiên bản, ví dụ `2.x.x`.

Trong project, agent sẽ tạo wrapper `scripts/olsh` (Task 0) để gọi lệnh này cho gọn. Bạn không cần tự viết.

## Bước 4: Ngspice đọc được model sky130

```bash
grep -q ngbehavior ~/.spiceinit 2>/dev/null || echo "set ngbehavior=hsa" >> ~/.spiceinit
cat > /tmp/inv_test.sp <<EOF
* sky130 smoke test
.lib $PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice tt
XM1 out in 0 0 sky130_fd_pr__nfet_01v8 W=0.42 L=0.15
XM2 out in vdd vdd sky130_fd_pr__pfet_01v8 W=0.84 L=0.15
V1 vdd 0 1.8
V2 in 0 PULSE(0 1.8 0 20p 20p 1n 2n)
.tran 1p 4n
.control
run
meas tran tpd TRIG v(in) VAL=0.9 RISE=1 TARG v(out) VAL=0.9 FALL=1
quit
.endc
.end
EOF
ngspice -b /tmp/inv_test.sp 2>&1 | grep -iE 'tpd|error'
```
Mong đợi: có dòng `tpd = ...` cỡ vài đến vài chục ps (máy này đo được 9.17e-12) và **không có** `Error`.

## Bước 5: Magic đọc được tech file sky130

```bash
echo quit | magic -dnull -noconsole -rcfile $PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc 2>&1 | grep -iE 'error|sky130A'
```
Mong đợi: có dòng nhắc tới tech `sky130A` và không có `error`.

## Bước 6: Kiểm tra tổng

```bash
cd ~/workspace/VKU/VLSI/CarrySelect4
for t in verilator yosys klayout magic netgen ngspice iverilog gtkwave tectonic node jq docker; do
  printf '%-10s ' $t; command -v $t >/dev/null && echo OK || echo MISSING; done
.venv/bin/librelane --version
docker run --rm "$IMG" sta -version
```
Tất cả phải báo `OK`. Gửi output của bước này cho mình để mình kiểm tra trước khi giao Task 0 cho agent.
