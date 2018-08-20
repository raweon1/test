import csv


def import_csv(path):
    with open(path, "r", encoding="utf-8", newline="") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=";")
        json = "data = [%s]" % ",\n".join(["{%s, misc: %d}" % (",".join(["%s: \"%s\"" % (key, value) for key, value in row.items()]), i) for i, row in enumerate(reader)])
        with open("src/test_data.js", "w", encoding="utf-8", newline="") as dest:
            dest.write("export function getTestData(){return data;} const %s;" % json)


import_csv("events_running_plc_corr.csv")
