# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Agency(Document):
	pass

@frappe.whitelist()
def get_agency_balance(name):
    sql = """
					select 
						COALESCE(sum(company_total_amount),0) as total_receiveable
					from `tabDaily Tour Transaction` a
					where
						a.docstatus = 1 and 
						agency='{}' and
						company_paid_amount=0 and
						voucher is not NULL
                """.format(name)
    data = frappe.db.sql(sql, as_dict=1)
    
    return data[0]
