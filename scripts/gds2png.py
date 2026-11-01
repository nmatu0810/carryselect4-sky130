# KLayout batch script: render a GDS to PNG (headless).
#
#   klayout -zz -r scripts/gds2png.py -rd gds=<path> -rd out=<png> [-rd w=1600] \
#           [-rd zoom=0.3] [-rd lyp=<layer props>]
#
# out    : full-die image.
# zoom   : if > 0, also writes <out stem>_zoom.png showing a window of
#          `zoom` x die width/height centred on the die centre.
# lyp    : layer properties; defaults to $PDK_ROOT/sky130A/libs.tech/klayout/tech/sky130A.lyp.
import os

import pya

gds = globals().get("gds")
out = globals().get("out")
if not gds or not out:
    raise RuntimeError("usage: -rd gds=<path> -rd out=<png> [-rd w=1600] [-rd zoom=0.3]")
w = int(globals().get("w", 1600))
zoom = float(globals().get("zoom", 0.3))
lyp = globals().get("lyp") or os.path.join(
    os.environ.get("PDK_ROOT", ""), "sky130A", "libs.tech", "klayout", "tech", "sky130A.lyp"
)

view = pya.LayoutView()
view.set_config("background-color", "#ffffff")
view.set_config("grid-visible", "false")
view.set_config("text-visible", "false")
cv = view.load_layout(gds, True)
if os.path.isfile(lyp):
    view.load_layer_props(lyp)
view.max_hier()
view.zoom_fit()

bbox = view.cellview(cv).cell.dbbox()


def save(path, box):
    view.zoom_box(box)
    view.save_image(path, w, max(1, int(round(w * box.height() / box.width()))))
    print(f"wrote {path}")


save(out, bbox.enlarged(bbox.width() * 0.02, bbox.height() * 0.02))
if zoom > 0:
    c = bbox.center()
    hw, hh = bbox.width() * zoom / 2, bbox.height() * zoom / 2
    stem, ext = os.path.splitext(out)
    save(f"{stem}_zoom{ext}", pya.DBox(c.x - hw, c.y - hh, c.x + hw, c.y + hh))
