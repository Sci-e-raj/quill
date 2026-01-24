def normalize_formats(raw_formats: list):
    formats = []

    for f in raw_formats:
        has_video = f.get("vcodec") != "none"
        has_audio = f.get("acodec") != "none"

        fps = f.get("fps")
        if isinstance(fps, (int, float)):
            fps = round(fps, 2)   # keep it clean
        else:
            fps = None

        formats.append({
            "format_id": f.get("format_id"),
            "ext": f.get("ext"),
            "resolution": f.get("resolution"),
            "fps": fps,
            "vcodec": f.get("vcodec"),
            "acodec": f.get("acodec"),
            "filesize": f.get("filesize"),
            "filesize_approx": f.get("filesize_approx"),
            "has_video": has_video,
            "has_audio": has_audio
        })

    return formats

def build_download_options(raw_formats: list):
    options = {}
    
    for f in raw_formats:
        # we only want VIDEO formats here
        if f.get("vcodec") == "none":
            continue

        resolution = f.get("resolution")
        ext = f.get("ext")
        fps = f.get("fps")

        if not resolution or not ext:
            continue

        key = (resolution, ext)

        # pick the BEST format per resolution+ext
        existing = options.get(key)
        if not existing:
            options[key] = f
        else:
            # prefer higher bitrate
            if (f.get("filesize_approx") or 0) > (existing.get("filesize_approx") or 0):
                options[key] = f

    # build clean output
    results = []
    for (_, _), f in options.items():
        results.append({
            "label": f"{f['resolution']} {f['ext'].upper()}",
            "resolution": f["resolution"],
            "ext": f["ext"],
            "format_id": f["format_id"],
            "fps": f.get("fps"),
            "filesize": f.get("filesize") or f.get("filesize_approx")
        })

    # sort by resolution height
    def res_key(opt):
        try:
            return int(opt["resolution"].split("x")[1])
        except:
            return 0

    return sorted(results, key=res_key)
