import csv
fundraised_company_uuids = set()
with open('../data/bulk_export/organizations.csv', 'r') as o_file:
    with open('../data/bulk_export/organizations_categories.csv', 'w') as oc_file:
        # fr_reader
        o_reader = csv.DictReader(o_file)
        oc_writer = csv.DictWriter(oc_file, ['uuid', 'category_groups_list'])
        oc_writer.writeheader()
        for line in o_reader:
            uuid = line['uuid']
            category_groups_list = line['category_groups_list']
            oc_writer.writerow({'uuid': uuid, 'category_groups_list': category_groups_list})
