import csv
fundraised_company_uuids = set()
with open('../data/bulk_export/organizations.csv', 'r') as o_file:
    with open('../data/bulk_export/funding_rounds.csv', 'r') as fr_file:
        with open('../data/bulk_export/organizations_cleaned.csv', 'w') as oc_file:
            # fr_reader
            fr_reader = csv.DictReader(fr_file)
            for line in fr_reader:
                fundraised_company_uuids.add(line['org_uuid'])
            
            #org_reader
            o_reader = csv.DictReader(o_file)
            oc_writer = csv.DictWriter(oc_file, o_reader.fieldnames)
            for line in o_reader:
                if line['uuid'] in fundraised_company_uuids:
                    oc_writer.writerow(line)
