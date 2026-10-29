import os
import json
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

WHO_URLS = {
    # Length/Height for Age (HFA)
    "lhfa_boys_0_2": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/lhfa_boys_0-to-2-years_zscores.xlsx?sfvrsn=30e044c_9",
    "lhfa_boys_2_5": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/lhfa_boys_2-to-5-years_zscores.xlsx?sfvrsn=17e5ad91_9",
    "lhfa_girls_0_2": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/lhfa_girls_0-to-2-years_zscores.xlsx?sfvrsn=e9e66a95_11",
    "lhfa_girls_2_5": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/lhfa_girls_2-to-5-years_zscores.xlsx?sfvrsn=2ec187b9_11",
    # Weight for Age (WFA)
    "wfa_boys_0_5": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/wfa_boys_0-to-5-years_zscores.xlsx?sfvrsn=97a05331_9",
    "wfa_girls_0_5": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/wfa_girls_0-to-5-years_zscores.xlsx?sfvrsn=4c03b8db_7",
    # Weight for Length / Height (WFH)
    "wfl_boys_0_2": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length-height/wfl_boys_0-to-2-years_zscores.xlsx?sfvrsn=e27a9da3_7",
    "wfh_boys_2_5": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length-height/wfh_boys_2-to-5-years_zscores.xlsx?sfvrsn=202c0545_7",
    "wfl_girls_0_2": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length-height/wfl_girls_0-to-2-years_zscores.xlsx?sfvrsn=288bc4e4_7",
    "wfh_girls_2_5": "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length-height/wfh_girls_2-to-5-years_zscores.xlsx?sfvrsn=4d66af6a_7",
}

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".who_cache")
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lib", "who-lms.json")

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


def download_file(url, local_path):
    if not os.path.exists(local_path):
        print(f"Mengunduh {os.path.basename(local_path)}...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(local_path, "wb") as f:
            f.write(resp.read())


def parse_xlsx_rows(filepath):
    with zipfile.ZipFile(filepath) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                shared_strings.append(t.text if t is not None else "")

        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")
        data = []
        for r in rows:
            cells = []
            for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                val = v.text if v is not None else ""
                if c.attrib.get("t") == "s" and val != "":
                    val = shared_strings[int(val)]
                cells.append(val)
            if cells:
                data.append(cells)
        return data


def to_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def main():
    print("Memulai pengumpulan data resmi WHO LMS...")
    downloaded = {}
    for key, url in WHO_URLS.items():
        dest = os.path.join(CACHE_DIR, f"{key}.xlsx")
        download_file(url, dest)
        downloaded[key] = dest

    lms_data = {
        "hfa": {"male": {}, "female": {}},
        "wfa": {"male": {}, "female": {}},
        "wfh": {"male": {}, "female": {}}
    }

    # 1. HFA (Height for Age: 0 - 60 bulan)
    for gender, file_0_2, file_2_5 in [
        ("male", downloaded["lhfa_boys_0_2"], downloaded["lhfa_boys_2_5"]),
        ("female", downloaded["lhfa_girls_0_2"], downloaded["lhfa_girls_2_5"])
    ]:
        rows_0_2 = parse_xlsx_rows(file_0_2)
        for row in rows_0_2[1:]:
            if len(row) >= 4 and row[0].isdigit():
                month = int(row[0])
                if 0 <= month <= 24:
                    lms_data["hfa"][gender][str(month)] = {
                        "L": to_float(row[1]),
                        "M": to_float(row[2]),
                        "S": to_float(row[3]),
                        "sd3neg": to_float(row[4]) if len(row) > 4 else 0,
                        "sd2neg": to_float(row[5]) if len(row) > 5 else 0,
                        "sd1neg": to_float(row[6]) if len(row) > 6 else 0,
                        "sd0": to_float(row[7]) if len(row) > 7 else 0,
                        "sd1": to_float(row[8]) if len(row) > 8 else 0,
                        "sd2": to_float(row[9]) if len(row) > 9 else 0,
                        "sd3": to_float(row[10]) if len(row) > 10 else 0,
                    }

        rows_2_5 = parse_xlsx_rows(file_2_5)
        for row in rows_2_5[1:]:
            if len(row) >= 4 and row[0].isdigit():
                month = int(row[0])
                if 24 < month <= 60:
                    lms_data["hfa"][gender][str(month)] = {
                        "L": to_float(row[1]),
                        "M": to_float(row[2]),
                        "S": to_float(row[3]),
                        "sd3neg": to_float(row[4]) if len(row) > 4 else 0,
                        "sd2neg": to_float(row[5]) if len(row) > 5 else 0,
                        "sd1neg": to_float(row[6]) if len(row) > 6 else 0,
                        "sd0": to_float(row[7]) if len(row) > 7 else 0,
                        "sd1": to_float(row[8]) if len(row) > 8 else 0,
                        "sd2": to_float(row[9]) if len(row) > 9 else 0,
                        "sd3": to_float(row[10]) if len(row) > 10 else 0,
                    }

    # 2. WFA (Weight for Age: 0 - 60 bulan)
    for gender, file_wfa in [
        ("male", downloaded["wfa_boys_0_5"]),
        ("female", downloaded["wfa_girls_0_5"])
    ]:
        rows = parse_xlsx_rows(file_wfa)
        for row in rows[1:]:
            if len(row) >= 4 and row[0].isdigit():
                month = int(row[0])
                if 0 <= month <= 60:
                    lms_data["wfa"][gender][str(month)] = {
                        "L": to_float(row[1]),
                        "M": to_float(row[2]),
                        "S": to_float(row[3]),
                        "sd3neg": to_float(row[4]) if len(row) > 4 else 0,
                        "sd2neg": to_float(row[5]) if len(row) > 5 else 0,
                        "sd1neg": to_float(row[6]) if len(row) > 6 else 0,
                        "sd0": to_float(row[7]) if len(row) > 7 else 0,
                        "sd1": to_float(row[8]) if len(row) > 8 else 0,
                        "sd2": to_float(row[9]) if len(row) > 9 else 0,
                        "sd3": to_float(row[10]) if len(row) > 10 else 0,
                    }

    # 3. WFH (Weight for Height: 45.0 - 120.0 cm, kelipatan 0.5 cm)
    for gender, file_wfl, file_wfh in [
        ("male", downloaded["wfl_boys_0_2"], downloaded["wfh_boys_2_5"]),
        ("female", downloaded["wfl_girls_0_2"], downloaded["wfh_girls_2_5"])
    ]:
        # 45.0 s.d. 86.5 cm: gunakan WFL (Length)
        rows_wfl = parse_xlsx_rows(file_wfl)
        for row in rows_wfl[1:]:
            if len(row) >= 4:
                length_val = to_float(row[0], -1)
                if 45.0 <= length_val <= 86.5:
                    key = f"{length_val:.1f}"
                    lms_data["wfh"][gender][key] = {
                        "L": to_float(row[1]),
                        "M": to_float(row[2]),
                        "S": to_float(row[3]),
                        "sd3neg": to_float(row[4]) if len(row) > 4 else 0,
                        "sd2neg": to_float(row[5]) if len(row) > 5 else 0,
                        "sd1neg": to_float(row[6]) if len(row) > 6 else 0,
                        "sd0": to_float(row[7]) if len(row) > 7 else 0,
                        "sd1": to_float(row[8]) if len(row) > 8 else 0,
                        "sd2": to_float(row[9]) if len(row) > 9 else 0,
                        "sd3": to_float(row[10]) if len(row) > 10 else 0,
                    }

        # 87.0 s.d. 120.0 cm: gunakan WFH (Height)
        rows_wfh = parse_xlsx_rows(file_wfh)
        for row in rows_wfh[1:]:
            if len(row) >= 4:
                height_val = to_float(row[0], -1)
                if 87.0 <= height_val <= 120.0:
                    key = f"{height_val:.1f}"
                    lms_data["wfh"][gender][key] = {
                        "L": to_float(row[1]),
                        "M": to_float(row[2]),
                        "S": to_float(row[3]),
                        "sd3neg": to_float(row[4]) if len(row) > 4 else 0,
                        "sd2neg": to_float(row[5]) if len(row) > 5 else 0,
                        "sd1neg": to_float(row[6]) if len(row) > 6 else 0,
                        "sd0": to_float(row[7]) if len(row) > 7 else 0,
                        "sd1": to_float(row[8]) if len(row) > 8 else 0,
                        "sd2": to_float(row[9]) if len(row) > 9 else 0,
                        "sd3": to_float(row[10]) if len(row) > 10 else 0,
                    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(lms_data, f, indent=2)

    print(f"Berhasil membuat {OUTPUT_PATH}")
    print(f"HFA Male count: {len(lms_data['hfa']['male'])}, Female: {len(lms_data['hfa']['female'])}")
    print(f"WFA Male count: {len(lms_data['wfa']['male'])}, Female: {len(lms_data['wfa']['female'])}")
    print(f"WFH Male count: {len(lms_data['wfh']['male'])}, Female: {len(lms_data['wfh']['female'])}")


if __name__ == "__main__":
    main()
